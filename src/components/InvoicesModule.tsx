import React, { useState } from "react";
import { 
  Receipt, 
  Plus, 
  Trash2, 
  Sparkles, 
  Download, 
  Mail, 
  ChevronLeft, 
  Search, 
  Eye, 
  PlusCircle, 
  CheckCircle,
  CreditCard,
  DollarSign,
  Clock,
  Calendar,
  DollarSign as USD,
  FileCheck2,
  CalendarCheck2
} from "lucide-react";
import { jsPDF } from "jspdf";
import { Invoice, Client, ProductService, BillingItem, PaymentRecord } from "../../../shared/types.js";

interface InvoicesModuleProps {
  invoices: Invoice[];
  clients: Client[];
  products: ProductService[];
  currency: string;
  companySettings: {
    companyName: string;
    email: string;
    phone: string;
    address: string;
    taxNumber: string;
    termsTemplate: string;
  };
  onCreateInvoice: (invoice: Partial<Invoice>) => Promise<void>;
  onUpdateInvoice: (id: string, invoice: Partial<Invoice>) => Promise<void>;
  onRecordPayment: (id: string, payment: Partial<PaymentRecord>) => Promise<void>;
  onDeleteInvoice: (id: string) => Promise<void>;
  selectedInvoice: Invoice | null;
  setSelectedInvoice: (invoice: Invoice | null) => void;
}

export default function InvoicesModule({
  invoices,
  clients,
  products,
  currency,
  companySettings,
  onCreateInvoice,
  onUpdateInvoice,
  onRecordPayment,
  onDeleteInvoice,
  selectedInvoice,
  setSelectedInvoice
}: InvoicesModuleProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  
  // Form States
  const [clientId, setClientId] = useState("");
  const [issueDate, setIssueDate] = useState(new Date().toISOString().split("T")[0]);
  const [dueDate, setDueDate] = useState("");
  const [items, setItems] = useState<Partial<BillingItem>[]>([
    { id: "ii_1", description: "", quantity: 1, unitPrice: 0, discount: 0, tax: 16, amount: 0 }
  ]);
  const [notes, setNotes] = useState("");
  const [terms, setTerms] = useState("");

  // Record Payment form modal state
  const [isLoggingPayment, setIsLoggingPayment] = useState(false);
  const [pDate, setPDate] = useState(new Date().toISOString().split("T")[0]);
  const [pMethod, setPMethod] = useState<'cash' | 'bank_transfer' | 'cheque' | 'mobile_transfer' | 'other'>("bank_transfer");
  const [pRef, setPRef] = useState("");
  const [pAmount, setPAmount] = useState("");
  const [pNotes, setPNotes] = useState("");

  // AI Email
  const [aiEmailDraft, setAiEmailDraft] = useState<string | null>(null);
  const [draftingEmail, setDraftingEmail] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);

  // Auto-set due date to 14 days by default
  React.useEffect(() => {
    if (issueDate) {
      const d = new Date(issueDate);
      d.setDate(d.getDate() + 14); // 14 days default payment term
      setDueDate(d.toISOString().split("T")[0]);
    }
  }, [issueDate]);

  // Handle item change
  const handleItemChange = (index: number, field: keyof BillingItem, value: any) => {
    const updated = [...items];
    const item = { ...updated[index], [field]: value };

    const qty = Number(item.quantity) || 0;
    const price = Number(item.unitPrice) || 0;
    const disc = Number(item.discount) || 0;
    const taxRate = Number(item.tax) || 0;

    const baseSubtotal = qty * price;
    const discounted = baseSubtotal * (1 - disc / 100);
    const withTax = discounted * (1 + taxRate / 100);

    item.amount = Math.round(withTax * 100) / 100;
    updated[index] = item;
    setItems(updated);
  };

  // Add Item line
  const handleAddItemLine = () => {
    setItems([
      ...items,
      { id: "ii_" + Date.now().toString(), description: "", quantity: 1, unitPrice: 0, discount: 0, tax: 16, amount: 0 }
    ]);
  };

  // Remove Item line
  const handleRemoveItemLine = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  // On selecting standard product preset (FIXED: updates multiple fields at once to avoid stale closure)
  const handleProductPresetSelect = (index: number, prodId: string) => {
    const prod = products.find(p => p.id === prodId);
    if (prod) {
      const updated = [...items];
      const item = { 
        ...updated[index], 
        description: prod.name,
        unitPrice: prod.unitPrice,
        tax: prod.taxRate 
      };

      const qty = Number(item.quantity) || 0;
      const price = Number(item.unitPrice) || 0;
      const disc = Number(item.discount) || 0;
      const taxRate = Number(item.tax) || 0;

      const baseSubtotal = qty * price;
      const discounted = baseSubtotal * (1 - disc / 100);
      const withTax = discounted * (1 + taxRate / 100);

      item.amount = Math.round(withTax * 100) / 100;
      updated[index] = item;
      setItems(updated);
    }
  };

  // Calculate overall totals
  const getTotals = () => {
    let subtotal = 0;
    let discountTotal = 0;
    let taxTotal = 0;

    items.forEach(item => {
      const qty = Number(item.quantity) || 0;
      const price = Number(item.unitPrice) || 0;
      const disc = Number(item.discount) || 0;
      const taxRate = Number(item.tax) || 0;

      const base = qty * price;
      const discAmount = base * (disc / 100);
      const afterDisc = base - discAmount;
      const taxAmount = afterDisc * (taxRate / 100);

      subtotal += base;
      discountTotal += discAmount;
      taxTotal += taxAmount;
    });

    const grandTotal = subtotal - discountTotal + taxTotal;
    return {
      subtotal: Math.round(subtotal),
      discountTotal: Math.round(discountTotal),
      taxTotal: Math.round(taxTotal),
      grandTotal: Math.round(grandTotal)
    };
  };

  // Save Invoice
  const handleSaveInvoice = async (status: 'draft' | 'pending') => {
    if (!clientId) {
      alert("Please select a client before saving.");
      return;
    }
    const totals = getTotals();
    const selectedCli = clients.find(c => c.id === clientId);
    
    const invoicePayload: Partial<Invoice> = {
      clientId,
      clientName: selectedCli ? selectedCli.name : "Unknown",
      issueDate,
      dueDate,
      items: items.map(i => ({
        id: i.id || "ii_" + Math.random().toString(),
        description: i.description || "Custom Event Asset Setup",
        quantity: Number(i.quantity) || 1,
        unitPrice: Number(i.unitPrice) || 0,
        discount: Number(i.discount) || 0,
        tax: Number(i.tax) || 16,
        amount: Number(i.amount) || 0
      })),
      ...totals,
      notes,
      terms,
      status,
      payments: []
    };

    await onCreateInvoice(invoicePayload);
    setIsCreating(false);
    resetForm();
  };

  const resetForm = () => {
    setClientId("");
    setIssueDate(new Date().toISOString().split("T")[0]);
    setItems([{ id: "ii_1", description: "", quantity: 1, unitPrice: 0, discount: 0, tax: 16, amount: 0 }]);
    setNotes("");
    setTerms("");
    setAiEmailDraft(null);
  };

  // Record a Manual Payment
  const handleLogManualPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvoice) return;

    const amount = Number(pAmount);
    if (isNaN(amount) || amount <= 0) {
      alert("Please enter a valid payment amount.");
      return;
    }

    if (amount > selectedInvoice.balanceRemaining) {
      if (!confirm(`Warning: The amount KES ${amount} is greater than the remaining balance of KES ${selectedInvoice.balanceRemaining}. Save anyway?`)) {
        return;
      }
    }

    const paymentPayload: Partial<PaymentRecord> = {
      paymentDate: pDate,
      paymentMethod: pMethod,
      referenceNumber: pRef,
      amountPaid: amount,
      notes: pNotes
    };

    await onRecordPayment(selectedInvoice.id, paymentPayload);
    setIsLoggingPayment(false);
    
    // Reset payment fields
    setPRef("");
    setPAmount("");
    setPNotes("");
  };

  // Generate TAX INVOICE PDF (jsPDF)
  const generatePDF = (invoice: Invoice) => {
    const doc = new jsPDF();

    // Elegant Corporate Color Palette
    const purple = [107, 70, 193];  // #6B46C1
    const gold = [212, 175, 55];    // #D4AF37
    const charcoal = [31, 41, 55];  // #1F2937
    const lightGray = [240, 240, 240];

    // Header Background Accent
    doc.setFillColor(purple[0], purple[1], purple[2]);
    doc.rect(0, 0, 220, 15, "F");

    // Title Block
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.setTextColor(purple[0], purple[1], purple[2]);
    doc.text("BINTI EVENTS", 20, 35);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(110, 110, 110);
    doc.text("Luxury Tents, Draping & Bespoke Styling", 20, 41);

    // Document Identifier
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(charcoal[0], charcoal[1], charcoal[2]);
    doc.text(`TAX INVOICE: ${invoice.invoiceNumber}`, 130, 35);

    // Invoice Meta Details
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(`Issue Date: ${invoice.issueDate}`, 130, 42);
    doc.text(`Due Date: ${invoice.dueDate}`, 130, 48);
    doc.text(`Payment Status: ${invoice.status.toUpperCase()}`, 130, 54);

    // Decorative Separator
    doc.setDrawColor(gold[0], gold[1], gold[2]);
    doc.setLineWidth(0.75);
    doc.line(20, 60, 190, 60);

    // Party Details
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(purple[0], purple[1], purple[2]);
    doc.text("FROM (SERVICE PROVIDER):", 20, 70);
    
    doc.setFont("helvetica", "normal");
    doc.setTextColor(charcoal[0], charcoal[1], charcoal[2]);
    doc.text(companySettings.companyName, 20, 76);
    doc.text(`PIN: ${companySettings.taxNumber}`, 20, 82);
    doc.text(`Email: ${companySettings.email}`, 20, 88);
    doc.text(`Address: ${companySettings.address}`, 20, 94);

    // Client Details
    doc.setFont("helvetica", "bold");
    doc.setTextColor(purple[0], purple[1], purple[2]);
    doc.text("PREPARED FOR (CLIENT):", 110, 70);
    
    doc.setFont("helvetica", "normal");
    doc.setTextColor(charcoal[0], charcoal[1], charcoal[2]);
    const clientDetails = clients.find(c => c.id === invoice.clientId);
    doc.text(invoice.clientName, 110, 76);
    if (clientDetails) {
      if (clientDetails.company) doc.text(clientDetails.company, 110, 82);
      if (clientDetails.taxNumber) doc.text(`Tax PIN: ${clientDetails.taxNumber}`, 110, 88);
      doc.text(`Email: ${clientDetails.email}`, 110, 94);
      doc.text(`Phone: ${clientDetails.phone}`, 110, 100);
    }

    // Items Table Setup
    doc.setFillColor(purple[0], purple[1], purple[2]);
    doc.rect(20, 110, 170, 8, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(255, 255, 255);
    doc.text("Service Description / Hire Asset", 22, 115);
    doc.text("Qty", 115, 115);
    doc.text("Unit Price", 130, 115);
    doc.text("Tax", 155, 115);
    doc.text("Amount", 175, 115);

    // Render Items
    let currentY = 124;
    doc.setFont("helvetica", "normal");
    doc.setTextColor(charcoal[0], charcoal[1], charcoal[2]);
    
    invoice.items.forEach((item, index) => {
      if (index % 2 === 1) {
        doc.setFillColor(lightGray[0], lightGray[1], lightGray[2]);
        doc.rect(20, currentY - 5, 170, 7, "F");
      }

      const splitDesc = doc.splitTextToSize(item.description, 85);
      doc.text(splitDesc, 22, currentY);
      doc.text(item.quantity.toString(), 115, currentY);
      doc.text(item.unitPrice.toLocaleString(), 130, currentY);
      doc.text(`${item.tax}%`, 155, currentY);
      doc.text(item.amount.toLocaleString(), 175, currentY);
      
      currentY += (splitDesc.length * 5) + 3;
    });

    // Subtotal section line
    doc.setDrawColor(lightGray[0], lightGray[1], lightGray[2]);
    doc.line(20, currentY, 190, currentY);
    currentY += 8;

    // Financial Totals
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text("Subtotal (excl. VAT & Discount):", 110, currentY);
    doc.text(`${currency} ${invoice.subtotal.toLocaleString()}`, 165, currentY);
    
    currentY += 6;
    doc.text("Discount Deducted:", 110, currentY);
    doc.text(`${currency} ${invoice.discountTotal.toLocaleString()}`, 165, currentY);
    
    currentY += 6;
    doc.text("Tax Amount (VAT 16%):", 110, currentY);
    doc.text(`${currency} ${invoice.taxTotal.toLocaleString()}`, 165, currentY);

    // Total payments recorded
    currentY += 6;
    const totalPayments = (invoice.payments || []).reduce((sum, p) => sum + p.amountPaid, 0);
    doc.text("Payments Paid Manually:", 110, currentY);
    doc.setTextColor(16, 185, 129); // emerald green
    doc.text(`-${currency} ${totalPayments.toLocaleString()}`, 165, currentY);
    doc.setTextColor(charcoal[0], charcoal[1], charcoal[2]);
    
    currentY += 8;
    doc.setFillColor(purple[0], purple[1], purple[2]);
    doc.rect(108, currentY - 5, 82, 8, "F");
    doc.setFont("helvetica", "bold");
    doc.setTextColor(255, 255, 255);
    doc.text("BALANCE REMAINING:", 110, currentY);
    doc.text(`${currency} ${invoice.balanceRemaining.toLocaleString()}`, 165, currentY);

    // Terms and notes
    currentY += 15;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(purple[0], purple[1], purple[2]);
    doc.text("TERMS & PAYMENT INSTRUCTIONS", 20, currentY);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(110, 110, 110);
    const splitTerms = doc.splitTextToSize(invoice.terms || companySettings.termsTemplate, 170);
    doc.text(splitTerms, 20, currentY + 5);

    // Payment History log table in PDF
    if (invoice.payments && invoice.payments.length > 0) {
      currentY += (splitTerms.length * 4) + 15;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(charcoal[0], charcoal[1], charcoal[2]);
      doc.text("MANUAL PAYMENT RECEIPT SLIPS:", 20, currentY);
      currentY += 4;
      invoice.payments.forEach(p => {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7.5);
        doc.text(`* ${p.paymentDate} - ${p.paymentMethod.replace("_", " ")} (${p.referenceNumber}): ${currency} ${p.amountPaid.toLocaleString()} paid.`, 20, currentY);
        currentY += 4;
      });
    }

    // Signature Area
    const sigY = 252;
    doc.setDrawColor(200, 200, 200);
    doc.line(20, sigY, 70, sigY);
    doc.line(130, sigY, 180, sigY);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text("Approved & Issued: Binti Events", 20, sigY + 5);
    doc.text("Client Officer Acceptance", 130, sigY + 5);

    // PDF footer
    doc.setFontSize(7);
    doc.setTextColor(150, 150, 150);
    doc.text("Thank you for your valuable corporate event business with Binti Events.", 20, 275);
    
    doc.save(`${invoice.invoiceNumber}-${invoice.clientName.replace(/\s+/g, "_")}.pdf`);
  };

  // Generate AI Email draft (calls local template engine backend)
  const handleDraftEmail = async (invoice: Invoice) => {
    setDraftingEmail(true);
    setAiEmailDraft(null);
    try {
      const response = await fetch("/api/ai/draft-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "Invoice",
          number: invoice.invoiceNumber,
          clientName: invoice.clientName,
          amount: invoice.balanceRemaining,
          dueDate: invoice.dueDate,
          notes: invoice.notes
        })
      });
      const data = await response.json();
      if (data.success) {
        setAiEmailDraft(data.email);
      } else {
        setAiEmailDraft("AI drafting failed: " + data.message);
      }
    } catch (err) {
      setAiEmailDraft("Failed to connect to AI writing assistant.");
    } finally {
      setDraftingEmail(false);
    }
  };

  const handleSendEmail = async (invoice: Invoice) => {
    const clientDetails = clients.find(c => c.id === invoice.clientId);
    const clientEmail = clientDetails?.email;
    
    if (!clientEmail) {
      alert("This client does not have an email address configured.");
      return;
    }
    
    if (!aiEmailDraft) {
      alert("No email draft generated yet.");
      return;
    }
    
    setIsSendingEmail(true);
    try {
      const response = await fetch("/api/email/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: clientEmail,
          subject: `Invoice ${invoice.invoiceNumber} - ${companySettings.companyName || 'Binti Events'}`,
          body: aiEmailDraft
        })
      });
      const data = await response.json();
      if (data.success) {
        alert(data.simulated ? "Email simulation success: check server console logs." : "Email sent successfully to " + clientEmail);
      } else {
        alert("Failed to send email: " + (data.message || "Unknown error"));
      }
    } catch (err) {
      alert("Error sending email: " + err);
    } finally {
      setIsSendingEmail(false);
    }
  };

  // Filter & Search invoices
  const filteredInvoices = invoices.filter(inv => {
    const matchesSearch = inv.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          inv.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (inv.notes && inv.notes.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesStatus = statusFilter === "all" || inv.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Module Title Banner */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-800 flex items-center space-x-2">
            <Receipt className="w-5 h-5 text-[#6B46C1]" />
            <span>Tax Invoices</span>
          </h2>
          <p className="text-xs text-gray-500 mt-1">Manage active corporate bills, record payments, and export PDFs.</p>
        </div>
        {!isCreating && !selectedInvoice && (
          <button
            onClick={() => {
              setIsCreating(true);
              resetForm();
            }}
            className="px-4 py-2 bg-[#6B46C1] hover:bg-purple-800 text-white rounded-xl text-xs font-semibold shadow-md flex items-center space-x-2 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Create Custom Invoice</span>
          </button>
        )}
      </div>

      {/* VIEW 1: CREATION FORM */}
      {isCreating && (
        <div className="glass-card p-6 space-y-6 animate-fade-in">
          <div className="flex items-center justify-between border-b border-gray-100 pb-4">
            <h3 className="font-bold text-sm text-gray-800">New Corporate Invoice Builder</h3>
            <button 
              onClick={() => setIsCreating(false)}
              className="text-gray-400 hover:text-gray-600 text-xs flex items-center space-x-1"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Back to Listing</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Client Picker */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-2">Select Binti Client</label>
              <select
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#6B46C1]/20 focus:border-[#6B46C1] bg-white text-gray-700"
              >
                <option value="">-- Choose client representative --</option>
                {clients.map(c => (
                  <option key={c.id} value={c.id}>{c.name} {c.company ? `(${c.company})` : ""}</option>
                ))}
              </select>
            </div>

            {/* Issue Date */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-2">Issue Date</label>
              <input
                type="date"
                value={issueDate}
                onChange={(e) => setIssueDate(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#6B46C1]/20 focus:border-[#6B46C1]"
              />
            </div>

            {/* Due Date */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-2">Due Date (Net 14 Days)</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#6B46C1]/20 focus:border-[#6B46C1]"
              />
            </div>
          </div>

          {/* Items Table Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-gray-50 pb-2">
              <span className="text-xs font-bold text-[#6B46C1] uppercase tracking-wider">Invoice Lines & Event Hire Assets</span>
              <button
                type="button"
                onClick={handleAddItemLine}
                className="text-xs text-[#6B46C1] hover:text-purple-800 font-semibold flex items-center space-x-1 bg-purple-50 px-2.5 py-1 rounded-lg border border-purple-100"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>Add Item Line</span>
              </button>
            </div>

            <div className="space-y-3">
              {items.map((item, idx) => (
                <div key={item.id || idx} className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-end p-4 bg-gray-50/70 border border-gray-100 rounded-xl">
                  {/* Preset Selector */}
                  <div className="lg:col-span-3">
                    <label className="block text-[10px] text-gray-400 font-semibold mb-1 uppercase">Inventory Preset</label>
                    <select
                      onChange={(e) => handleProductPresetSelect(idx, e.target.value)}
                      defaultValue=""
                      className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-xs bg-white"
                    >
                      <option value="">-- Use Standard Asset --</option>
                      {products.map(p => (
                        <option key={p.id} value={p.id}>{p.name} (KES {p.unitPrice})</option>
                      ))}
                    </select>
                  </div>

                  {/* Manual description */}
                  <div className="lg:col-span-4">
                    <label className="block text-[10px] text-gray-400 font-semibold mb-1 uppercase">Custom Description</label>
                    <input
                      type="text"
                      value={item.description || ""}
                      onChange={(e) => handleItemChange(idx, "description", e.target.value)}
                      placeholder="e.g. 15m x 30m Desert Gold Stretch Tent"
                      className="w-full px-2.5 py-1.5 border border-gray-200 rounded-lg text-xs focus:ring-1 focus:ring-[#6B46C1]"
                    />
                  </div>

                  {/* Qty */}
                  <div className="lg:col-span-1">
                    <label className="block text-[10px] text-gray-400 font-semibold mb-1 uppercase">Qty</label>
                    <input
                      type="number"
                      min="1"
                      value={item.quantity || 1}
                      onChange={(e) => handleItemChange(idx, "quantity", Number(e.target.value))}
                      className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-xs text-center"
                    />
                  </div>

                  {/* Unit price */}
                  <div className="lg:col-span-1.5">
                    <label className="block text-[10px] text-gray-400 font-semibold mb-1 uppercase">Price</label>
                    <input
                      type="number"
                      value={item.unitPrice || 0}
                      onChange={(e) => handleItemChange(idx, "unitPrice", Number(e.target.value))}
                      className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-xs text-right"
                    />
                  </div>

                  {/* Discount */}
                  <div className="lg:col-span-1">
                    <label className="block text-[10px] text-gray-400 font-semibold mb-1 uppercase">Disc %</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={item.discount || 0}
                      onChange={(e) => handleItemChange(idx, "discount", Number(e.target.value))}
                      className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-xs text-center"
                    />
                  </div>

                  {/* Tax */}
                  <div className="lg:col-span-1">
                    <label className="block text-[10px] text-gray-400 font-semibold mb-1 uppercase">Tax %</label>
                    <input
                      type="number"
                      value={item.tax || 16}
                      onChange={(e) => handleItemChange(idx, "tax", Number(e.target.value))}
                      className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-xs text-center"
                    />
                  </div>

                  {/* Total amount calculated */}
                  <div className="lg:col-span-1 flex items-center justify-between space-x-2 pb-1.5">
                    <div className="text-right flex-1 min-w-0">
                      <span className="text-[9px] text-gray-400 block font-semibold uppercase">Total</span>
                      <span className="text-xs font-bold text-gray-700 truncate block">{(item.amount || 0).toLocaleString()}</span>
                    </div>
                    {items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveItemLine(idx)}
                        className="text-red-400 hover:text-red-600 transition-colors shrink-0"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Calculations & Invoice Notes */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 border-t border-gray-100 pt-6">
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-2">Invoice Notes</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Additional logistics notes or billing instructions for the client."
                  rows={3}
                  className="w-full p-3 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#6B46C1]/20 focus:border-[#6B46C1]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-2">Invoice Specific Contract Terms</label>
                <textarea
                  value={terms}
                  onChange={(e) => setTerms(e.target.value)}
                  placeholder="Terms of payment, penalty clauses, or logistics setups details."
                  rows={4}
                  className="w-full p-3 border border-gray-200 rounded-xl text-xs font-mono text-gray-600 focus:outline-none focus:ring-2 focus:ring-[#6B46C1]/20 focus:border-[#6B46C1]"
                />
              </div>
            </div>

            {/* Totals Box */}
            <div className="bg-[#F8F9FA] rounded-2xl p-6 border border-gray-200 flex flex-col justify-between space-y-4">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider block">Billing Breakdown</span>
              
              <div className="space-y-2 text-sm divide-y divide-gray-200/50">
                <div className="flex justify-between py-2">
                  <span className="text-gray-500">Subtotal (excl. VAT & Discounts)</span>
                  <span className="font-semibold text-gray-800">{currency} {getTotals().subtotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-gray-500">Discount Amount Deducted</span>
                  <span className="font-semibold text-emerald-600">({currency} {getTotals().discountTotal.toLocaleString()})</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-gray-500">VAT Payable (16%)</span>
                  <span className="font-semibold text-gray-800">{currency} {getTotals().taxTotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between py-3 text-base font-bold text-gray-800 border-t-2 border-gray-300">
                  <span className="text-[#6B46C1]">TOTAL BALANCE DUE</span>
                  <span className="text-lg text-gray-900">{currency} {getTotals().grandTotal.toLocaleString()}</span>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center space-x-4 pt-4 border-t border-gray-200/60">
                <button
                  type="button"
                  onClick={() => handleSaveInvoice("draft")}
                  className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold transition-all"
                >
                  Save Draft
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveInvoice("pending")}
                  className="flex-1 py-2.5 bg-[#6B46C1] hover:bg-purple-800 text-white rounded-xl text-xs font-bold shadow-md shadow-[#6B46C1]/20 transition-all flex items-center justify-center space-x-1"
                >
                  <CalendarCheck2 className="w-4 h-4 text-[#D4AF37]" />
                  <span>Issue Live Invoice</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 2: INVOICE PREVIEW MODE */}
      {selectedInvoice && (
        <div className="glass-card p-6 space-y-6 animate-fade-in">
          <div className="flex items-center justify-between border-b border-gray-100 pb-4">
            <div className="flex items-center space-x-2">
              <span className="text-xs font-bold uppercase tracking-widest text-[#6B46C1]">Billing Desk</span>
              <span className="text-xs text-gray-400">|</span>
              <span className="text-xs font-bold text-gray-800">{selectedInvoice.invoiceNumber}</span>
            </div>
            <button 
              onClick={() => {
                setSelectedInvoice(null);
                setAiEmailDraft(null);
              }}
              className="text-gray-400 hover:text-gray-600 text-xs flex items-center space-x-1"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Back to Listing</span>
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Col: Core Details */}
            <div className="lg:col-span-2 space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-base text-gray-800">Binti Events Official Tax Invoice</h4>
                  <p className="text-xs text-gray-400 mt-0.5">Invoice ID: {selectedInvoice.id}</p>
                </div>
                <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                  selectedInvoice.status === "paid" ? "bg-green-100 text-green-700 border border-green-200" :
                  selectedInvoice.status === "partially_paid" ? "bg-amber-100 text-amber-700 border border-amber-200" :
                  selectedInvoice.status === "overdue" ? "bg-red-100 text-red-700 border border-red-200" :
                  selectedInvoice.status === "pending" ? "bg-blue-100 text-blue-700 border border-blue-200" :
                  "bg-gray-100 text-gray-600 border border-gray-200"
                }`}>
                  {selectedInvoice.status.replace("_", " ")}
                </span>
              </div>

              {/* Sub-party details block */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-50 rounded-2xl">
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase">Billed Client</p>
                  <p className="text-sm font-semibold text-gray-800 mt-1">{selectedInvoice.clientName}</p>
                  <p className="text-xs text-gray-500 mt-1">Client ID: {selectedInvoice.clientId}</p>
                </div>
                <div className="md:border-l md:border-gray-200 md:pl-4">
                  <p className="text-[10px] font-bold text-gray-400 uppercase">Billing Timeline</p>
                  <p className="text-xs text-gray-700 mt-1">Issue Date: <span className="font-semibold">{selectedInvoice.issueDate}</span></p>
                  <p className="text-xs text-gray-700 mt-0.5">Due Date: <span className="font-semibold">{selectedInvoice.dueDate}</span></p>
                </div>
              </div>

              {/* Items Table Display */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Invoiced Items & Asset Hire List</span>
                <div className="overflow-x-auto border border-gray-100 rounded-xl">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-100 text-gray-400 font-bold uppercase tracking-wider">
                        <th className="p-3">Description</th>
                        <th className="p-3 text-center">Qty</th>
                        <th className="p-3 text-right">Price</th>
                        <th className="p-3 text-center">Disc</th>
                        <th className="p-3 text-center">Tax</th>
                        <th className="p-3 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50 text-gray-700">
                      {selectedInvoice.items.map((item) => (
                        <tr key={item.id} className="hover:bg-gray-50/50">
                          <td className="p-3 font-medium text-gray-800">{item.description}</td>
                          <td className="p-3 text-center font-bold text-gray-500">{item.quantity}</td>
                          <td className="p-3 text-right font-medium">{item.unitPrice.toLocaleString()}</td>
                          <td className="p-3 text-center text-emerald-600 font-bold">{item.discount}%</td>
                          <td className="p-3 text-center text-gray-500">{item.tax}%</td>
                          <td className="p-3 text-right font-bold text-gray-800">{item.amount.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Recorded Manual Payment Receipts Table */}
              <div className="space-y-3.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center space-x-1.5">
                    <CreditCard className="w-4 h-4 text-emerald-500" />
                    <span>Manual Payment Receipts ({selectedInvoice.payments?.length || 0})</span>
                  </span>
                  {selectedInvoice.status !== "paid" && (
                    <button
                      onClick={() => {
                        setPAmount(selectedInvoice.balanceRemaining.toString());
                        setIsLoggingPayment(true);
                      }}
                      className="text-[10px] text-emerald-600 hover:text-emerald-700 font-bold bg-emerald-50 border border-emerald-100 px-2 py-1 rounded-lg"
                    >
                      Record New Receipt
                    </button>
                  )}
                </div>

                {selectedInvoice.payments && selectedInvoice.payments.length > 0 ? (
                  <div className="overflow-x-auto border border-emerald-100/50 rounded-xl bg-emerald-50/10 p-3">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-emerald-100/40 text-gray-400 font-semibold uppercase tracking-wider text-[9px]">
                          <th className="pb-2">Receipt Date</th>
                          <th className="pb-2">Method</th>
                          <th className="pb-2">Ref / TX ID</th>
                          <th className="pb-2">Notes</th>
                          <th className="pb-2 text-right">Paid Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-emerald-50/30 text-gray-700">
                        {selectedInvoice.payments.map((p) => (
                          <tr key={p.id}>
                            <td className="py-2.5 font-medium">{p.paymentDate}</td>
                            <td className="py-2.5 capitalize">{p.paymentMethod.replace("_", " ")}</td>
                            <td className="py-2.5 font-mono text-[10px] text-[#6B46C1]">{p.referenceNumber || "N/A"}</td>
                            <td className="py-2.5 text-gray-500 truncate max-w-[150px]">{p.notes || "-"}</td>
                            <td className="py-2.5 text-right font-bold text-emerald-600">+{currency} {p.amountPaid.toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="p-6 bg-gray-50 border border-gray-100 rounded-xl text-center text-gray-400 text-xs">
                    No manual payments have been recorded against this invoice yet.
                  </div>
                )}
              </div>
            </div>

            {/* Right Col: Totals + Actions */}
            <div className="space-y-6">
              {/* Financial Summary Box */}
              <div className="bg-[#1F2937] text-white p-6 rounded-2xl border border-[#6B46C1]/20 space-y-4 shadow-lg">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Ledger Status</span>
                
                <div className="space-y-2 text-xs divide-y divide-gray-800">
                  <div className="flex justify-between py-1.5">
                    <span className="text-gray-400">Invoiced Subtotal</span>
                    <span className="font-semibold text-gray-200">{currency} {selectedInvoice.subtotal.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between py-1.5">
                    <span className="text-gray-400">Total Discount</span>
                    <span className="font-semibold text-emerald-400">({currency} {selectedInvoice.discountTotal.toLocaleString()})</span>
                  </div>
                  <div className="flex justify-between py-1.5">
                    <span className="text-gray-400">Tax Payable (VAT 16%)</span>
                    <span className="font-semibold text-gray-200">{currency} {selectedInvoice.taxTotal.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between py-2 border-t border-gray-800 text-emerald-400">
                    <span>Total Paid to Date</span>
                    <span className="font-semibold">-{currency} {(selectedInvoice.grandTotal - selectedInvoice.balanceRemaining).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between py-3 text-sm font-bold border-t border-gray-800">
                    <span className="text-[#D4AF37]">BALANCE DUE:</span>
                    <span className="text-base text-white">{currency} {selectedInvoice.balanceRemaining.toLocaleString()}</span>
                  </div>
                </div>

                {/* Operations */}
                <div className="pt-4 border-t border-gray-800 space-y-2">
                  <button
                    onClick={() => generatePDF(selectedInvoice)}
                    className="w-full py-2.5 bg-[#6B46C1] hover:bg-purple-800 text-white rounded-xl text-xs font-semibold flex items-center justify-center space-x-2 transition-all shadow-md shadow-[#6B46C1]/10"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download PDF Invoice</span>
                  </button>

                  <button
                    onClick={() => handleDraftEmail(selectedInvoice)}
                    disabled={draftingEmail}
                    className="w-full py-2.5 bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-xl text-xs font-semibold flex items-center justify-center space-x-2 transition-all"
                  >
                    {draftingEmail ? (
                      <span>Drafting email...</span>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5 text-[#D4AF37]" />
                        <span>AI Draft Follow-up Email</span>
                      </>
                    )}
                  </button>

                  {selectedInvoice.status !== "paid" && (
                    <button
                      onClick={() => {
                        setPAmount(selectedInvoice.balanceRemaining.toString());
                        setIsLoggingPayment(true);
                      }}
                      className="w-full py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-teal-500 hover:to-emerald-500 text-white rounded-xl text-xs font-bold flex items-center justify-center space-x-2 transition-all shadow-lg shadow-emerald-500/10"
                    >
                      <DollarSign className="w-3.5 h-3.5" />
                      <span>Record Manual Payment</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Record manual payment form popover modal overlay */}
              {isLoggingPayment && (
                <div className="bg-emerald-50/20 border border-emerald-100 rounded-2xl p-5 space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b border-emerald-100">
                    <span className="text-xs font-bold text-emerald-800 uppercase flex items-center space-x-1.5">
                      <DollarSign className="w-4 h-4 text-emerald-600" />
                      <span>Record Client Payment</span>
                    </span>
                    <button 
                      onClick={() => setIsLoggingPayment(false)}
                      className="text-gray-400 hover:text-gray-600 text-xs font-semibold"
                    >
                      Cancel
                    </button>
                  </div>

                  <form onSubmit={handleLogManualPayment} className="space-y-3.5">
                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Payment Date</label>
                      <input
                        type="date"
                        required
                        value={pDate}
                        onChange={(e) => setPDate(e.target.value)}
                        className="w-full px-2.5 py-1.5 border border-gray-200 rounded-lg text-xs"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Payment Method</label>
                      <select
                        value={pMethod}
                        onChange={(e: any) => setPMethod(e.target.value)}
                        className="w-full px-2.5 py-1.5 border border-gray-200 rounded-lg text-xs bg-white text-gray-700"
                      >
                        <option value="bank_transfer">Bank Transfer</option>
                        <option value="mobile_transfer">M-Pesa / Mobile Transfer</option>
                        <option value="cash">Cash Payment</option>
                        <option value="cheque">Cheque Settlement</option>
                        <option value="other">Other Manual Settlement</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Reference Number / Transaction ID</label>
                      <input
                        type="text"
                        required
                        value={pRef}
                        onChange={(e) => setPRef(e.target.value)}
                        placeholder="e.g. KCB-TX-10928X"
                        className="w-full px-2.5 py-1.5 border border-gray-200 rounded-lg text-xs"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Receipt Amount</label>
                      <input
                        type="number"
                        required
                        min="1"
                        value={pAmount}
                        onChange={(e) => setPAmount(e.target.value)}
                        className="w-full px-2.5 py-1.5 border border-gray-200 rounded-lg text-xs font-semibold text-emerald-600"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Payment Note</label>
                      <input
                        type="text"
                        value={pNotes}
                        onChange={(e) => setPNotes(e.target.value)}
                        placeholder="Received by director / cash check cleared."
                        className="w-full px-2.5 py-1.5 border border-gray-200 rounded-lg text-xs text-gray-600"
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold transition-all shadow"
                    >
                      Confirm Manual Receipt
                    </button>
                  </form>
                </div>
              )}

              {/* AI Draft Email display */}
              {aiEmailDraft && (
                <div className="bg-purple-50/30 border border-purple-100 rounded-2xl p-4 space-y-3.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-[#6B46C1] uppercase tracking-wider flex items-center space-x-1">
                      <Sparkles className="w-3.5 h-3.5 text-[#D4AF37]" />
                      <span>Luxury Email Draft</span>
                    </span>
                    <div className="flex items-center space-x-3">
                      <button 
                        onClick={() => handleSendEmail(selectedInvoice!)}
                        disabled={isSendingEmail}
                        className="text-[10px] text-[#6B46C1] hover:underline font-bold disabled:opacity-50"
                      >
                        {isSendingEmail ? "Sending..." : "Send via Resend"}
                      </button>
                      <button 
                        onClick={() => {
                          navigator.clipboard.writeText(aiEmailDraft);
                          alert("Email text copied!");
                        }}
                        className="text-[10px] text-[#6B46C1] hover:underline font-bold"
                      >
                        Copy
                      </button>
                    </div>
                  </div>
                  <p className="text-xs text-gray-700 font-mono whitespace-pre-wrap leading-relaxed max-h-60 overflow-y-auto p-3 bg-white border border-purple-50 rounded-xl">
                    {aiEmailDraft}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* VIEW 3: INVOICES LISTING TABLE */}
      {!isCreating && !selectedInvoice && (
        <div className="glass-card p-6 space-y-4">
          {/* Filtering row */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <span className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-gray-400" />
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search invoices by number, client name..."
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#6B46C1]/10 focus:border-[#6B46C1]"
              />
            </div>

            {/* Status filters */}
            <div className="flex items-center space-x-2 overflow-x-auto pb-1 md:pb-0">
              {["all", "draft", "pending", "partially_paid", "paid", "overdue"].map((status) => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors uppercase tracking-wider text-[9px] shrink-0 ${
                    statusFilter === status
                      ? "bg-[#6B46C1] text-white"
                      : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                  }`}
                >
                  {status.replace("_", " ")}
                </button>
              ))}
            </div>
          </div>

          {/* Invoices Listing table */}
          <div className="overflow-x-auto border border-gray-50 rounded-xl">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-gray-50/80 border-b border-gray-100 text-gray-400 font-bold uppercase tracking-wider">
                  <th className="p-4">Invoice Number</th>
                  <th className="p-4">Client representative</th>
                  <th className="p-4">Issue Date</th>
                  <th className="p-4">Due Date</th>
                  <th className="p-4 text-right">Invoiced Amount</th>
                  <th className="p-4 text-right">Balance Due</th>
                  <th className="p-4 text-center">Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 text-gray-700">
                {filteredInvoices.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-gray-400">
                      No active Binti tax invoices found.
                    </td>
                  </tr>
                ) : (
                  filteredInvoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="p-4 font-bold text-[#6B46C1]">
                        <button
                          onClick={() => setSelectedInvoice(inv)}
                          className="hover:underline text-left text-xs"
                        >
                          {inv.invoiceNumber}
                        </button>
                      </td>
                      <td className="p-4 font-semibold text-gray-800">{inv.clientName}</td>
                      <td className="p-4 text-gray-500">{inv.issueDate}</td>
                      <td className="p-4 text-gray-500">{inv.dueDate}</td>
                      <td className="p-4 font-bold text-gray-900 text-right">{currency} {inv.grandTotal.toLocaleString()}</td>
                      <td className="p-4 text-right">
                        <span className={`font-semibold ${inv.balanceRemaining > 0 ? "text-amber-600" : "text-green-600"}`}>
                          {currency} {inv.balanceRemaining.toLocaleString()}
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                          inv.status === "paid" ? "bg-green-100 text-green-700 animate-pulse" :
                          inv.status === "partially_paid" ? "bg-amber-100 text-amber-700" :
                          inv.status === "overdue" ? "bg-red-100 text-red-700" :
                          inv.status === "pending" ? "bg-blue-100 text-blue-700" :
                          "bg-gray-100 text-gray-600"
                        }`}>
                          {inv.status.replace("_", " ")}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={() => setSelectedInvoice(inv)}
                            className="p-1.5 text-gray-400 hover:text-[#6B46C1] hover:bg-purple-50 rounded-lg transition-all"
                            title="Preview Invoice Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {inv.status !== "paid" && (
                            <button
                              onClick={() => {
                                setSelectedInvoice(inv);
                                setPAmount(inv.balanceRemaining.toString());
                                setIsLoggingPayment(true);
                              }}
                              className="p-1.5 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"
                              title="Record Manual Receipt Payment"
                            >
                              <DollarSign className="w-4 h-4" />
                            </button>
                          )}
                          
                          <button
                            onClick={() => {
                              if (confirm("Are you sure you want to delete this invoice?")) {
                                onDeleteInvoice(inv.id);
                              }
                            }}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                            title="Delete Invoice"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
