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
  CalendarCheck2,
  X,
  Copy,
  Check,
  Loader2,
  Truck
} from "lucide-react";
import { jsPDF } from "jspdf";
import { Invoice, Client, ProductService, BillingItem, PaymentRecord, CompanySettings } from "../types";
import { generateEmailDraft } from "../services/geminiService";
import { apiRequest } from "../services/apiClient";
import { buildInvoiceWhatsAppMessage, openWhatsApp } from "../utils/whatsapp";
import { buildInvoiceEmailContent, openMailClient } from "../utils/email";

const WhatsAppIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414-.074-.124-.272-.198-.57-.347m-5.421 7.461c-1.926 0-3.72-.519-5.263-1.423l-.377-.222-3.913 1.026 1.044-3.815-.247-.393A9.873 9.873 0 012.1 11.92c0-5.461 4.444-9.905 9.907-9.905 5.46 0 9.904 4.444 9.904 9.905 0 5.46-4.444 9.907-9.904 9.907m0-21.782c-6.559 0-11.896 5.335-11.896 11.875 0 2.096.547 4.14 1.587 5.945L0 24l6.335-1.662a11.87 11.87 0 005.672 1.449h.005c6.557 0 11.894-5.337 11.894-11.876 0-3.174-1.236-6.158-3.483-8.406A11.798 11.798 0 0012.051.061z"/>
  </svg>
);

interface InvoicesModuleProps {
  invoices: Invoice[];
  clients: Client[];
  products: ProductService[];
  currency: string;
  companySettings: CompanySettings;
  onCreateInvoice: (invoice: Partial<Invoice>) => Promise<void>;
  onUpdateInvoice: (id: string, invoice: Partial<Invoice>) => Promise<void>;
  onRecordPayment: (id: string, payment: Partial<PaymentRecord>) => Promise<void>;
  onDeleteInvoice: (id: string) => Promise<void>;
  selectedInvoice: Invoice | null;
  setSelectedInvoice: (invoice: Invoice | null) => void;
  showToast: (message: string, type?: "success" | "warning") => void;
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
  setSelectedInvoice,
  showToast
}: InvoicesModuleProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  
  // Form States
  const [clientId, setClientId] = useState("");
  const [issueDate, setIssueDate] = useState(new Date().toISOString().split("T")[0]);
  const [dueDate, setDueDate] = useState("");
  const [applyTax, setApplyTax] = useState(true);
  const [includeTransport, setIncludeTransport] = useState(false);
  const [transportCost, setTransportCost] = useState<number | string>("");
  const [transportDescription, setTransportDescription] = useState("Transport & Logistics / Site Rigging Transit");
  const [items, setItems] = useState<Partial<BillingItem>[]>([
    { id: "ii_1", description: "", quantity: 1, unitPrice: 0, discount: 0, tax: 16, amount: 0 }
  ]);
  const [notes, setNotes] = useState("");
  const [terms, setTerms] = useState("");

  // Recalculate item amounts when tax settings toggle
  React.useEffect(() => {
    const updated = items.map(item => {
      const qty = Number(item.quantity) || 0;
      const price = Number(item.unitPrice) || 0;
      const disc = Number(item.discount) || 0;

      const baseSubtotal = qty * price;
      const discounted = baseSubtotal * (1 - disc / 100);

      return {
        ...item,
        amount: Math.round(discounted * 100) / 100
      };
    });
    setItems(updated);
  }, [applyTax]);

  // Record Payment form modal state
  const [isLoggingPayment, setIsLoggingPayment] = useState(false);
  const [pDate, setPDate] = useState(new Date().toISOString().split("T")[0]);
  const [pMethod, setPMethod] = useState<'cash' | 'bank_transfer' | 'cheque' | 'mobile_transfer' | 'other'>("bank_transfer");
  const [pRef, setPRef] = useState("");
  const [pAmount, setPAmount] = useState("");
  const [pNotes, setPNotes] = useState("");

  const [pdfTemplate, setPdfTemplate] = useState<'corporate' | 'binti'>(() => {
    return (localStorage.getItem('pdf_template_preference') as 'corporate' | 'binti') || 'corporate';
  });

  // Action states for button transitions
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [savingStatus, setSavingStatus] = useState<'draft' | 'pending' | null>(null);
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);
  const [copiedWhatsApp, setCopiedWhatsApp] = useState(false);
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [copiedAiDraft, setCopiedAiDraft] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // AI Email
  const [aiEmailDraft, setAiEmailDraft] = useState<string | null>(null);
  const [draftingEmail, setDraftingEmail] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);

  // WhatsApp Dispatch States
  const [whatsAppModalOpen, setWhatsAppModalOpen] = useState(false);
  const [whatsAppPhone, setWhatsAppPhone] = useState("");
  const [whatsAppMessage, setWhatsAppMessage] = useState("");
  const [whatsAppInvoice, setWhatsAppInvoice] = useState<Invoice | null>(null);

  const handleOpenWhatsAppModal = (invoice: Invoice) => {
    const client = clients.find(c => c.id === invoice.clientId);
    const msg = buildInvoiceWhatsAppMessage(invoice, client, companySettings as any, pdfTemplate);
    setWhatsAppInvoice(invoice);
    setWhatsAppPhone(client?.phone || "");
    setWhatsAppMessage(msg);
    setWhatsAppModalOpen(true);
  };

  const handleDispatchWhatsApp = () => {
    if (!whatsAppMessage) {
      showToast("Please provide message text.", "warning");
      return;
    }
    if (whatsAppInvoice) {
      generatePDF(whatsAppInvoice); // Auto-generate & download PDF in admin's chosen template style
    }
    openWhatsApp(whatsAppPhone, whatsAppMessage);
    showToast("WhatsApp message & PDF download initiated!");
    setWhatsAppModalOpen(false);
  };

  // Email Dispatch States & Modal
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [emailTo, setEmailTo] = useState("");
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [emailInvoice, setEmailInvoice] = useState<Invoice | null>(null);

  const handleOpenEmailModal = (invoice: Invoice) => {
    const client = clients.find(c => c.id === invoice.clientId);
    const content = buildInvoiceEmailContent(invoice, client, companySettings as any, pdfTemplate);
    setEmailInvoice(invoice);
    setEmailTo(client?.email || "");
    setEmailSubject(content.subject);
    setEmailBody(content.body);
    setEmailModalOpen(true);
  };

  const handleSendModalEmail = async () => {
    if (!emailTo) {
      showToast("Recipient email address is required.", "warning");
      return;
    }
    if (!emailBody) {
      showToast("Email body content cannot be empty.", "warning");
      return;
    }

    setIsSendingEmail(true);
    try {
      const data = await apiRequest<{ success: boolean; simulated?: boolean; message?: string }>("/api/email/send", {
        method: "POST",
        body: JSON.stringify({
          to: emailTo,
          subject: emailSubject,
          body: emailBody
        })
      });
      if (data.success) {
        showToast(data.simulated ? "Email dispatch simulated! Check server console logs." : "Email sent successfully to " + emailTo);
        setEmailModalOpen(false);
      } else {
        showToast("Failed to send email: " + (data.message || "Unknown error"), "warning");
      }
    } catch (err) {
      // Offline / fallback open mail client
      openMailClient(emailTo, emailSubject, emailBody);
      showToast("Opened in desktop Mail client!");
      setEmailModalOpen(false);
    } finally {
      setIsSendingEmail(false);
    }
  };

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

    const baseSubtotal = qty * price;
    const discounted = baseSubtotal * (1 - disc / 100);

    item.amount = Math.round(discounted * 100) / 100;
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

  // On selecting standard product preset
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

      const baseSubtotal = qty * price;
      const discounted = baseSubtotal * (1 - disc / 100);

      item.amount = Math.round(discounted * 100) / 100;
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
      const taxRate = applyTax ? (Number(item.tax) || 0) : 0;

      const base = qty * price;
      const discAmount = base * (disc / 100);
      const afterDisc = base - discAmount;
      const taxAmount = afterDisc * (taxRate / 100);

      subtotal += base;
      discountTotal += discAmount;
      taxTotal += taxAmount;
    });

    // Add transport cost if included
    const tCost = includeTransport ? (Number(transportCost) || 0) : 0;
    if (tCost > 0) {
      subtotal += tCost;
      if (applyTax) {
        taxTotal += tCost * 0.16;
      }
    }

    const netSubtotal = subtotal - discountTotal;
    const grandTotal = Math.round(netSubtotal + taxTotal);
    return {
      subtotal: Math.round(subtotal),
      discountTotal: Math.round(discountTotal),
      taxTotal: Math.round(taxTotal),
      grandTotal,
      balanceRemaining: grandTotal
    };
  };

  // Save Invoice
  const handleSaveInvoice = async (status: 'draft' | 'pending') => {
    if (!clientId) {
      showToast("Please select a client before saving.", "warning");
      return;
    }
    setSavingStatus(status);
    try {
      const totals = getTotals();
      const selectedCli = clients.find(c => c.id === clientId);
      
      const baseItems: BillingItem[] = items.map(i => ({
        id: i.id || "ii_" + Math.random().toString(),
        description: i.description || "Custom Event Asset Setup",
        quantity: Number(i.quantity) || 1,
        unitPrice: Number(i.unitPrice) || 0,
        discount: Number(i.discount) || 0,
        tax: Number(i.tax) || (applyTax ? 16 : 0),
        amount: Number(i.amount) || 0
      }));

      // Append transport as a dedicated line item if enabled
      const finalItems = [...baseItems];
      const tCost = includeTransport ? (Number(transportCost) || 0) : 0;
      if (includeTransport && tCost > 0) {
        finalItems.push({
          id: "transport_line_" + Date.now().toString(),
          description: transportDescription.trim() || "Logistics & Transport / Crew Transit",
          quantity: 1,
          unitPrice: tCost,
          discount: 0,
          tax: applyTax ? 16 : 0,
          amount: tCost
        });
      }

      const invoicePayload: Partial<Invoice> = {
        clientId,
        clientName: selectedCli ? selectedCli.name : "Unknown",
        issueDate,
        dueDate,
        items: finalItems,
        ...totals,
        notes,
        terms,
        status,
        payments: []
      };

      await onCreateInvoice(invoicePayload);
      setIsCreating(false);
      resetForm();
    } catch (err) {
      console.error("Save invoice error:", err);
    } finally {
      setSavingStatus(null);
    }
  };

  const resetForm = () => {
    setClientId("");
    setIssueDate(new Date().toISOString().split("T")[0]);
    setItems([{ id: "ii_1", description: "", quantity: 1, unitPrice: 0, discount: 0, tax: 16, amount: 0 }]);
    setIncludeTransport(false);
    setTransportCost("");
    setTransportDescription("Transport & Logistics / Site Rigging Transit");
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
      showToast("Please enter a valid payment amount.", "warning");
      return;
    }

    if (amount > selectedInvoice.balanceRemaining) {
      if (!confirm(`Warning: The amount KES ${amount} is greater than the remaining balance of KES ${selectedInvoice.balanceRemaining}. Save anyway?`)) {
        return;
      }
    }

    setIsSubmittingPayment(true);
    try {
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
      showToast("Payment recorded successfully!");
    } catch (err) {
      console.error("Payment logging error:", err);
      showToast("Failed to record payment.", "warning");
    } finally {
      setIsSubmittingPayment(false);
    }
  };

  const loadImgBase64 = (url: string): Promise<string> => {
    return new Promise((resolve) => {
      const timer = setTimeout(() => resolve(""), 2000);
      const img = new Image();
      img.crossOrigin = "Anonymous";
      img.onload = () => {
        clearTimeout(timer);
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          try {
            ctx.drawImage(img, 0, 0);
            resolve(canvas.toDataURL("image/png"));
          } catch (e) {
            resolve("");
          }
        } else {
          resolve("");
        }
      };
      img.onerror = () => {
        clearTimeout(timer);
        resolve("");
      };
      img.src = url;
    });
  };

  // Generate TAX INVOICE PDF (jsPDF) with visual active state
  const generatePDF = async (invoice: Invoice) => {
    if (!invoice) return;
    setDownloadingPdf(true);
    showToast("Generating and preparing Tax Invoice PDF...");
    try {
      await new Promise(r => setTimeout(r, 60));
      if (pdfTemplate === 'binti') {
        await generatePDFBinti(invoice);
      } else {
        generatePDFCorporate(invoice);
      }
      showToast("Tax Invoice PDF downloaded successfully!");
    } catch (err) {
      console.error("PDF generation failed:", err);
      showToast("Failed to generate Tax Invoice PDF.", "warning");
    } finally {
      setDownloadingPdf(false);
    }
  };

  const generatePDFCorporate = (invoice: Invoice) => {
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const pageWidth = 210;
    const pageHeight = 297;
    const margin = 16;
    const contentWidth = pageWidth - margin * 2;
    const bottomLimit = pageHeight - margin - 12;

    // Elegant Corporate Color Palette
    const purple = [107, 70, 193];  // #6B46C1
    const gold = [212, 175, 55];    // #D4AF37
    const charcoal = [31, 41, 55];  // #1F2937
    const lightGray = [229, 231, 235];
    const offWhite = [249, 250, 251];

    let y = margin;

    const colWidths = invoice.taxTotal > 0 
      ? [contentWidth * 0.44, contentWidth * 0.12, contentWidth * 0.16, contentWidth * 0.12, contentWidth * 0.16]
      : [contentWidth * 0.54, contentWidth * 0.12, contentWidth * 0.17, contentWidth * 0.17];

    const colX: number[] = [];
    let currentX = margin;
    colWidths.forEach(w => {
      colX.push(currentX);
      currentX += w;
    });

    const drawCorpTableHeader = () => {
      doc.setFillColor(purple[0], purple[1], purple[2]);
      doc.rect(margin, y, contentWidth, 8.5, "F");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(255, 255, 255);
      doc.text("SERVICE DESCRIPTION / HIRE ASSET", colX[0] + 3, y + 5.5);
      doc.text("QTY", colX[1] + colWidths[1] / 2, y + 5.5, { align: "center" });
      doc.text("UNIT PRICE", colX[2] + colWidths[2] - 3, y + 5.5, { align: "right" });
      if (invoice.taxTotal > 0) {
        doc.text("TAX", colX[3] + colWidths[3] / 2, y + 5.5, { align: "center" });
        doc.text("AMOUNT", colX[4] + colWidths[4] - 3, y + 5.5, { align: "right" });
      } else {
        doc.text("AMOUNT", colX[3] + colWidths[3] - 3, y + 5.5, { align: "right" });
      }
    };

    const ensurePageSpace = (requiredHeight: number, options = { repeatTableHeader: false }) => {
      if (y + requiredHeight <= bottomLimit) {
        return;
      }
      doc.addPage();
      y = margin;
      if (options.repeatTableHeader) {
        drawCorpTableHeader();
        y += 8.5;
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8.5);
        doc.setTextColor(charcoal[0], charcoal[1], charcoal[2]);
      }
    };

    // Header Background Top Accent
    doc.setFillColor(purple[0], purple[1], purple[2]);
    doc.rect(0, 0, pageWidth, 8, "F");

    // Title & Branding Block
    y = 18;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.setTextColor(purple[0], purple[1], purple[2]);
    doc.text(companySettings.companyName || "BINTI EVENTS", margin, y);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(110, 110, 110);
    doc.text("Luxury Tents, Draping & Bespoke Styling", margin, y + 5.5);

    // Document Identifier (Right aligned)
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(charcoal[0], charcoal[1], charcoal[2]);
    const documentTitle = invoice.taxTotal > 0 ? `TAX INVOICE: ${invoice.invoiceNumber}` : `INVOICE: ${invoice.invoiceNumber}`;
    doc.text(documentTitle, pageWidth - margin, y, { align: "right" });

    // Invoice Meta Details
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(90, 90, 90);
    doc.text(`Issue Date: ${invoice.issueDate || 'N/A'}`, pageWidth - margin, y + 5.5, { align: "right" });
    doc.text(`Due Date: ${invoice.dueDate || 'N/A'}`, pageWidth - margin, y + 10.5, { align: "right" });
    doc.text(`Status: ${(invoice.status || 'Pending').toUpperCase()}`, pageWidth - margin, y + 15.5, { align: "right" });

    y += 20;

    // Decorative Separator
    doc.setDrawColor(gold[0], gold[1], gold[2]);
    doc.setLineWidth(0.75);
    doc.line(margin, y, pageWidth - margin, y);

    y += 6;

    // Party Details (FROM & TO)
    const partyColWidth = (contentWidth - 10) / 2;
    const col2X = margin + partyColWidth + 10;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(purple[0], purple[1], purple[2]);
    doc.text("FROM (SERVICE PROVIDER):", margin, y);
    doc.text("PREPARED FOR (CLIENT):", col2X, y);
    
    y += 5.5;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(charcoal[0], charcoal[1], charcoal[2]);

    doc.text(companySettings.companyName || "Binti Events", margin, y);
    const clientDetails = clients.find(c => c.id === invoice.clientId);
    doc.text(invoice.clientName || "Valued Client", col2X, y);

    y += 4.5;
    if (invoice.taxTotal > 0 && companySettings.taxNumber) {
      doc.text(`Tax PIN: ${companySettings.taxNumber}`, margin, y);
    } else {
      doc.text(`Phone: ${companySettings.phone || "+254 700 111 222"}`, margin, y);
    }
    if (clientDetails?.company) {
      doc.text(clientDetails.company, col2X, y);
      y += 4.5;
    }

    doc.text(`Email: ${companySettings.email || "info@bintievents.co.ke"}`, margin, y);
    if (clientDetails?.phone) {
      doc.text(`Phone: ${clientDetails.phone}`, col2X, y);
      y += 4.5;
    } else if (clientDetails?.email) {
      doc.text(`Email: ${clientDetails.email}`, col2X, y);
      y += 4.5;
    }

    doc.text(`Address: ${companySettings.address || "Nairobi, Kenya"}`, margin, y);
    if (clientDetails?.address) {
      doc.text(`Address: ${clientDetails.address}`, col2X, y);
    }

    y += 10;

    drawCorpTableHeader();
    y += 8.5;

    // Render Items
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(charcoal[0], charcoal[1], charcoal[2]);
    
    invoice.items.forEach((item, index) => {
      const splitDesc = doc.splitTextToSize(item.description, colWidths[0] - 6);
      const rowHeight = Math.max(9, splitDesc.length * 4.2 + 4);

      ensurePageSpace(rowHeight + 2, { repeatTableHeader: true });

      if (index % 2 === 1) {
        doc.setFillColor(offWhite[0], offWhite[1], offWhite[2]);
        doc.rect(margin, y, contentWidth, rowHeight, "F");
      }

      doc.setDrawColor(lightGray[0], lightGray[1], lightGray[2]);
      doc.line(margin, y + rowHeight, margin + contentWidth, y + rowHeight);

      const textY = y + 5;
      const valueY = y + rowHeight / 2 + 1;

      doc.text(splitDesc, colX[0] + 3, textY);
      doc.text(item.quantity.toString(), colX[1] + colWidths[1] / 2, valueY, { align: "center" });
      doc.text(item.unitPrice.toLocaleString(), colX[2] + colWidths[2] - 3, valueY, { align: "right" });
      
      const lineNet = Math.round((item.quantity * item.unitPrice * (1 - (item.discount || 0) / 100)) * 100) / 100;
      if (invoice.taxTotal > 0) {
        doc.text(`${item.tax}%`, colX[3] + colWidths[3] / 2, valueY, { align: "center" });
        doc.text(lineNet.toLocaleString(), colX[4] + colWidths[4] - 3, valueY, { align: "right" });
      } else {
        doc.text(lineNet.toLocaleString(), colX[3] + colWidths[3] - 3, valueY, { align: "right" });
      }
      
      y += rowHeight;
    });

    y += 5;
    ensurePageSpace(45);

    // Financial Totals Box
    const totalsBoxWidth = 85;
    const totalsLeftX = pageWidth - margin - totalsBoxWidth;
    const totalsValX = pageWidth - margin - 4;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(charcoal[0], charcoal[1], charcoal[2]);

    doc.text("Subtotal (excl. VAT):", totalsLeftX + 3, y + 4);
    doc.text(`${currency} ${invoice.subtotal.toLocaleString()}`, totalsValX, y + 4, { align: "right" });
    
    y += 6;
    if (invoice.discountTotal > 0) {
      doc.text("Discount Deducted:", totalsLeftX + 3, y + 4);
      doc.text(`-${currency} ${invoice.discountTotal.toLocaleString()}`, totalsValX, y + 4, { align: "right" });
      y += 6;
    }
    
    if (invoice.taxTotal > 0) {
      doc.text("Tax Amount (VAT 16%):", totalsLeftX + 3, y + 4);
      doc.text(`${currency} ${invoice.taxTotal.toLocaleString()}`, totalsValX, y + 4, { align: "right" });
      y += 6;
    }

    const totalPayments = (invoice.payments || []).reduce((sum, p) => sum + p.amountPaid, 0);
    if (totalPayments > 0) {
      doc.text("Payments Paid:", totalsLeftX + 3, y + 4);
      doc.setTextColor(16, 185, 129);
      doc.text(`-${currency} ${totalPayments.toLocaleString()}`, totalsValX, y + 4, { align: "right" });
      doc.setTextColor(charcoal[0], charcoal[1], charcoal[2]);
      y += 6;
    }

    y += 2;
    doc.setFillColor(purple[0], purple[1], purple[2]);
    doc.rect(totalsLeftX, y, totalsBoxWidth, 9, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(255, 255, 255);
    doc.text("BALANCE DUE:", totalsLeftX + 4, y + 6);
    doc.text(`${currency} ${(invoice.balanceRemaining ?? invoice.grandTotal).toLocaleString()}`, totalsValX, y + 6, { align: "right" });

    y += 15;

    // Terms & Conditions Block
    const termsSource = invoice.terms || companySettings.termsTemplate || (companySettings as any).terms_template;
    if (termsSource) {
      ensurePageSpace(30);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(purple[0], purple[1], purple[2]);
      doc.text("PAYMENT TERMS & EVENT CLAUSES", margin, y);

      y += 5;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(100, 100, 100);

      const termsLines = termsSource.split(/\r?\n/).filter(Boolean);
      termsLines.forEach((term: string) => {
        const splitLine = doc.splitTextToSize(term, contentWidth);
        ensurePageSpace(splitLine.length * 4.0 + 2);
        doc.text(splitLine, margin, y);
        y += splitLine.length * 4.0 + 1.5;
      });
    }

    // Official Payment Instructions & Bank Details Block (Only displayed if invoice has an outstanding balance)
    const paidTotal = (invoice.payments || []).reduce((sum, p) => sum + (Number(p.amountPaid) || 0), 0);
    const balanceRemaining = invoice.balanceRemaining !== undefined ? Number(invoice.balanceRemaining) : Math.max(0, (Number(invoice.grandTotal) || 0) - paidTotal);
    const hasDueBalance = invoice.status !== 'paid' && balanceRemaining > 0;

    if (hasDueBalance && companySettings.bankDetails && companySettings.bankDetails.trim()) {
      y += 6;
      ensurePageSpace(26);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(purple[0], purple[1], purple[2]);
      doc.text("OFFICIAL PAYMENT INSTRUCTIONS & BANK DETAILS:", margin, y);

      y += 5;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(charcoal[0], charcoal[1], charcoal[2]);
      const bankLines = companySettings.bankDetails.split(/\r?\n/);
      bankLines.forEach(line => {
        if (line.trim()) {
          doc.text(line.trim(), margin, y);
          y += 4.0;
        }
      });
    }

    // Payment History receipts in PDF
    if (invoice.payments && invoice.payments.length > 0) {
      y += 6;
      ensurePageSpace(20);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(charcoal[0], charcoal[1], charcoal[2]);
      doc.text("MANUAL PAYMENT RECEIPT SLIPS:", margin, y);
      y += 4.5;
      invoice.payments.forEach(p => {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7.5);
        doc.text(`* ${p.paymentDate || ''} - ${(p.paymentMethod || 'other').replace(/_/g, " ")} (${p.referenceNumber || 'N/A'}): ${currency} ${(Number(p.amountPaid) || 0).toLocaleString()} paid.`, margin, y);
        y += 4.0;
      });
    }

    // Dynamic Signature Area
    y += 6;
    ensurePageSpace(28);

    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.5);
    const sigColWidth = 60;
    const sig2X = pageWidth - margin - sigColWidth;

    doc.line(margin, y + 14, margin + sigColWidth, y + 14);
    doc.line(sig2X, y + 14, sig2X + sigColWidth, y + 14);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(charcoal[0], charcoal[1], charcoal[2]);
    doc.text("Approved & Issued: Binti Events", margin, y + 19);
    doc.text("Client Officer Acceptance", sig2X, y + 19);

    // PDF footer
    doc.setFontSize(7.5);
    doc.setTextColor(150, 150, 150);
    doc.text("Thank you for your valuable corporate event business with Binti Events.", margin, pageHeight - 10);
    
    doc.save(`${invoice.invoiceNumber || 'INV'}-${(invoice.clientName || 'Client').replace(/\s+/g, "_")}.pdf`);
  };

  const generatePDFBinti = async (invoice: Invoice) => {
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const pageWidth = 210;
    const pageHeight = 297;
    const margin = 16;
    const contentWidth = pageWidth - margin * 2;
    const bottomLimit = pageHeight - margin - 12;

    // Colors
    const pink = [255, 192, 250];      // #FFC0FA - table header
    const black = [51, 51, 51];        // #333333
    const gray = [102, 102, 102];      // #666666
    const lightGray = [220, 220, 220]; // borders

    const invoiceDate = invoice.issueDate || new Date().toISOString().split("T")[0];
    const dueDate = invoice.dueDate || '';
    const invoiceNo = invoice.invoiceNumber || '';
    
    let y = margin;

    const colWidths = invoice.taxTotal > 0 
      ? [contentWidth * 0.44, contentWidth * 0.12, contentWidth * 0.16, contentWidth * 0.12, contentWidth * 0.16]
      : [contentWidth * 0.54, contentWidth * 0.12, contentWidth * 0.17, contentWidth * 0.17];

    const colX: number[] = [];
    let currentX = margin;
    colWidths.forEach(w => {
      colX.push(currentX);
      currentX += w;
    });

    const drawTableHeader = () => {
      doc.setFillColor(pink[0], pink[1], pink[2]);
      doc.rect(margin, y, contentWidth, 8.5, 'F');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(black[0], black[1], black[2]);
      doc.text('DESCRIPTION', colX[0] + 3, y + 5.5);
      doc.text('QTY', colX[1] + colWidths[1] / 2, y + 5.5, { align: 'center' });
      doc.text('UNIT PRICE', colX[2] + colWidths[2] - 3, y + 5.5, { align: 'right' });
      if (invoice.taxTotal > 0) {
        doc.text('TAX', colX[3] + colWidths[3] / 2, y + 5.5, { align: 'center' });
        doc.text('AMOUNT', colX[4] + colWidths[4] - 3, y + 5.5, { align: 'right' });
      } else {
        doc.text('AMOUNT', colX[3] + colWidths[3] - 3, y + 5.5, { align: 'right' });
      }
    };

    const ensurePageSpace = (requiredHeight: number, options = { repeatTableHeader: false }) => {
      if (y + requiredHeight <= bottomLimit) {
        return;
      }
      doc.addPage();
      y = margin;
      if (options.repeatTableHeader) {
        drawTableHeader();
        y += 8.5;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.5);
        doc.setTextColor(black[0], black[1], black[2]);
      }
    };

    // Load logo & thank you notes
    const logoBase64 = await loadImgBase64('https://bintievents.vercel.app/images/invoicelogo.jpg');
    const thankYouBase64 = await loadImgBase64('https://bintievents.vercel.app/images/thankyounote.PNG');

    if (logoBase64) {
      try {
        doc.addImage(logoBase64, 'PNG', margin, y, 44, 20);
      } catch (err) {
        doc.setFont('helvetica', 'bolditalic');
        doc.setFontSize(22);
        doc.setTextColor(150, 50, 120);
        doc.text('Binti Events', margin, y + 14);
      }
    } else {
      doc.setFont('helvetica', 'bolditalic');
      doc.setFontSize(22);
      doc.setTextColor(150, 50, 120);
      doc.text('Binti Events', margin, y + 14);
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(24);
    doc.setTextColor(black[0], black[1], black[2]);
    const documentTitle = invoice.taxTotal > 0 ? 'TAX INVOICE' : 'INVOICE';
    doc.text(documentTitle, pageWidth - margin, y + 6, { align: 'right' });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(black[0], black[1], black[2]);
    doc.text(companySettings.companyName || 'Binti Events', pageWidth - margin, y + 13, { align: 'right' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(gray[0], gray[1], gray[2]);
    doc.text(companySettings.address || '', pageWidth - margin, y + 18, { align: 'right' });
    
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(7.5);
    doc.text('Customer Care', pageWidth - margin, y + 24, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(companySettings.phone || '', pageWidth - margin, y + 28.5, { align: 'right' });
    doc.text(companySettings.email || '', pageWidth - margin, y + 33, { align: 'right' });

    y += 42;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(black[0], black[1], black[2]);
    doc.text('FOR', margin, y);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.text(invoice.clientName || '', margin, y + 5.5);
    const clientDetails = clients.find(c => c.id === invoice.clientId);
    let clientOffset = 10;
    if (clientDetails) {
      if (clientDetails.company) {
        doc.text(clientDetails.company, margin, y + clientOffset);
        clientOffset += 4.5;
      }
      doc.text(clientDetails.address || 'Kenya', margin, y + clientOffset);
    }

    const labelX = pageWidth - margin - 60;
    const valueX = pageWidth - margin;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(gray[0], gray[1], gray[2]);
    doc.text('Invoice No.:', labelX, y, { align: 'right' });
    doc.text('Issue date:', labelX, y + 5.5, { align: 'right' });
    doc.text('Due date:', labelX, y + 11, { align: 'right' });
    doc.text('Payment:', labelX, y + 16.5, { align: 'right' });

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(black[0], black[1], black[2]);
    doc.text(invoiceNo, valueX, y, { align: 'right' });
    doc.text(invoiceDate, valueX, y + 5.5, { align: 'right' });
    doc.text(dueDate, valueX, y + 11, { align: 'right' });

    doc.setTextColor(76, 175, 80);
    doc.text((invoice.status || 'pending').toUpperCase(), valueX, y + 16.5, { align: 'right' });

    y += Math.max(clientOffset + 6, 26);

    drawTableHeader();
    y += 8.5;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(black[0], black[1], black[2]);

    invoice.items.forEach(item => {
      const descriptionLines = doc.splitTextToSize(item.description, colWidths[0] - 6);
      const rowHeight = Math.max(9, descriptionLines.length * 4.2 + 3);
      const textY = y + 4.8;
      const valueY = y + rowHeight / 2 + 1;

      ensurePageSpace(rowHeight + 2, { repeatTableHeader: true });

      doc.setDrawColor(lightGray[0], lightGray[1], lightGray[2]);
      doc.line(margin, y + rowHeight, margin + contentWidth, y + rowHeight);

      doc.text(descriptionLines, colX[0] + 3, textY);
      doc.text(String(item.quantity), colX[1] + colWidths[1] / 2, valueY, { align: 'center' });
      doc.text(item.unitPrice.toLocaleString(), colX[2] + colWidths[2] - 3, valueY, { align: 'right' });
      const lineNet = Math.round((item.quantity * item.unitPrice * (1 - (item.discount || 0) / 100)) * 100) / 100;
      if (invoice.taxTotal > 0) {
        doc.text(`${item.tax}%`, colX[3] + colWidths[3] / 2, valueY, { align: 'center' });
        doc.text(lineNet.toLocaleString(), colX[4] + colWidths[4] - 3, valueY, { align: 'right' });
      } else {
        doc.text(lineNet.toLocaleString(), colX[3] + colWidths[3] - 2, valueY, { align: 'right' });
      }

      y += rowHeight;
    });

    doc.setDrawColor(lightGray[0], lightGray[1], lightGray[2]);
    doc.line(margin, y, margin + contentWidth, y);

    y += 6;
    ensurePageSpace(35);

    const totalAlignX = invoice.taxTotal > 0 ? colX[4] + colWidths[4] - 3 : colX[3] + colWidths[3] - 3;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(black[0], black[1], black[2]);
    doc.text('TOTAL:', totalAlignX - 45, y + 2, { align: 'right' });
    doc.text(`${currency} ${invoice.grandTotal.toLocaleString()}`, totalAlignX, y + 2, { align: 'right' });

    y += 6;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(gray[0], gray[1], gray[2]);
    const paidSum = invoice.payments ? invoice.payments.reduce((sum, p) => sum + p.amountPaid, 0) : 0;
    const balanceRemaining = invoice.balanceRemaining;
    const depositLines = doc.splitTextToSize(
      `Paid Amount: ${currency} ${paidSum.toLocaleString()}   |   Remaining Balance: ${currency} ${balanceRemaining.toLocaleString()}`,
      contentWidth
    );
    doc.text(depositLines, margin, y + 4);

    y += 8 + depositLines.length * 4.0;

    ensurePageSpace(20);
    doc.setFont('helvetica', 'bolditalic');
    doc.setFontSize(8);
    doc.setTextColor(black[0], black[1], black[2]);
    doc.text('Terms & conditions apply:', margin, y);

    y += 5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(gray[0], gray[1], gray[2]);

    const termsSourceBinti = invoice.terms || companySettings.termsTemplate || (companySettings as any).terms_template;
    const termsLines = termsSourceBinti ? termsSourceBinti.split(/\r?\n/).filter(Boolean) : [
      'Client by making payment authorizes Binti Tents & Events to supply the above facilities',
      'Payment of at least 80% confirms your booking upon signing below; balance to be upon set up',
      'Cancellation policy: Cancellation must be in writing. A month before event: 50% refund, 2 weeks before: 25% refund; Less than a week: non refundable',
      'Client agrees to safeguard the equipment and be solely responsible for any loss or damage of the same that may occur during period of hire',
      'Quote valid for 30 days',
    ];
    termsLines.forEach((term: string, i: number) => {
      const lineText = term.match(/^\d+\./) ? term : `${i + 1}. ${term}`;
      const lines = doc.splitTextToSize(lineText, contentWidth);
      ensurePageSpace(lines.length * 4.0 + 2);
      doc.text(lines, margin, y);
      y += lines.length * 4.0 + 1.5;
    });

    y += 6;

    // Registered Bank / Billing Details Block (Only for invoices with an active due balance)
    const paidTotalBinti = (invoice.payments || []).reduce((sum, p) => sum + (Number(p.amountPaid) || 0), 0);
    const balanceRemainingBinti = invoice.balanceRemaining !== undefined ? Number(invoice.balanceRemaining) : Math.max(0, (Number(invoice.grandTotal) || 0) - paidTotalBinti);
    const hasDueBalanceBinti = invoice.status !== 'paid' && balanceRemainingBinti > 0;

    if (hasDueBalanceBinti && companySettings.bankDetails && companySettings.bankDetails.trim()) {
      ensurePageSpace(25);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(black[0], black[1], black[2]);
      doc.text('OFFICIAL PAYMENT INSTRUCTIONS & BANK DETAILS:', margin, y);
      y += 4.5;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(gray[0], gray[1], gray[2]);
      const bankLines = companySettings.bankDetails.split(/\r?\n/);
      bankLines.forEach(line => {
        if (line.trim()) {
          doc.text(line.trim(), margin, y);
          y += 4.0;
        }
      });
      y += 4;
    }

    ensurePageSpace(28);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(black[0], black[1], black[2]);
    doc.text('Issued by:', pageWidth - margin, y, { align: 'right' });
    y += 5;
    doc.setFont('helvetica', 'bold');
    doc.text(companySettings.companyName || 'Binti Events', pageWidth - margin, y, { align: 'right' });
    y += 7;

    // Check remaining space for thank you note image to prevent extra page creation
    if (thankYouBase64 && (y + 25 <= bottomLimit)) {
      try {
        const imageProps = doc.getImageProperties(thankYouBase64);
        const baseScale = Math.min(90 / imageProps.width, 35 / imageProps.height);
        const width = imageProps.width * baseScale;
        const height = imageProps.height * baseScale;
        doc.addImage(thankYouBase64, 'PNG', (pageWidth - width) / 2, y, width, height);
      } catch (e) {
        y += 4;
        doc.setTextColor(255, 130, 171);
        doc.setFont('helvetica', 'bolditalic');
        doc.setFontSize(15);
        doc.text('thank you', pageWidth / 2, y, { align: 'center' });
      }
    } else {
      y += 2;
      doc.setTextColor(255, 130, 171);
      doc.setFont('helvetica', 'bolditalic');
      doc.setFontSize(15);
      doc.text('thank you', pageWidth / 2, y, { align: 'center' });
    }

    doc.save(`${invoice.invoiceNumber}-${(invoice.clientName || 'Client').replace(/\s+/g, "_")}.pdf`);
  };

  // Generate AI Email draft
  const handleDraftEmail = async (invoice: Invoice) => {
    setDraftingEmail(true);
    setAiEmailDraft(null);
    try {
      const draft = await generateEmailDraft({
        type: "Invoice",
        number: invoice.invoiceNumber,
        clientName: invoice.clientName,
        amount: invoice.balanceRemaining ?? invoice.grandTotal,
        dueDate: invoice.dueDate,
        notes: invoice.notes,
        companyName: companySettings.companyName,
        currency
      });
      setAiEmailDraft(draft);
    } catch (err) {
      setAiEmailDraft("Failed to generate AI email draft. Please try again.");
    } finally {
      setDraftingEmail(false);
    }
  };

  const handleSendEmail = async (invoice: Invoice) => {
    const clientDetails = clients.find(c => c.id === invoice.clientId);
    const clientEmail = clientDetails?.email;
    
    if (!clientEmail) {
      showToast("This client does not have an email address configured.", "warning");
      return;
    }
    
    if (!aiEmailDraft) {
      showToast("No email draft generated yet.", "warning");
      return;
    }
    
    setIsSendingEmail(true);
    try {
      const data = await apiRequest<{ success: boolean; simulated?: boolean; message?: string }>("/api/email/send", {
        method: "POST",
        body: JSON.stringify({
          to: clientEmail,
          subject: `Invoice ${invoice.invoiceNumber} - ${companySettings.companyName || 'Binti Events'}`,
          body: aiEmailDraft
        })
      });
      if (data.success) {
        showToast(data.simulated ? "Email simulation success: check server console logs." : "Email sent successfully to " + clientEmail);
      } else {
        showToast("Failed to send email: " + (data.message || "Unknown error"), "warning");
      }
    } catch (err) {
      showToast("Error sending email: " + err, "warning");
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
 
          {/* Options: Tax & Transport Settings */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Tax Settings Toggle */}
            <div className="flex items-center space-x-3 bg-purple-50/30 border border-purple-100/50 rounded-xl p-3.5">
              <input
                type="checkbox"
                id="applyTax"
                checked={applyTax}
                onChange={(e) => setApplyTax(e.target.checked)}
                className="w-4 h-4 text-[#6B46C1] border-gray-300 rounded focus:ring-[#6B46C1]"
              />
              <label htmlFor="applyTax" className="text-xs font-semibold text-gray-700 select-none cursor-pointer">
                Apply VAT (16%) and generate Tax Invoice
              </label>
            </div>

            {/* Transport Cost Toggle & Input */}
            <div className={`border rounded-xl p-3.5 transition-all ${
              includeTransport ? "bg-amber-50/40 border-amber-200" : "bg-gray-50/50 border-gray-100"
            }`}>
              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  id="includeTransport"
                  checked={includeTransport}
                  onChange={(e) => {
                    setIncludeTransport(e.target.checked);
                    if (!e.target.checked) setTransportCost("");
                  }}
                  className="w-4 h-4 text-[#D4AF37] border-gray-300 rounded focus:ring-[#D4AF37]"
                />
                <label htmlFor="includeTransport" className="text-xs font-bold text-gray-800 select-none cursor-pointer flex items-center space-x-1.5">
                  <Truck className="w-4 h-4 text-[#D4AF37]" />
                  <span>Include Transport & Logistics Cost</span>
                </label>
              </div>

              {includeTransport && (
                <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-amber-200/60 animate-fade-in">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Transport Amount ({currency})</label>
                    <input
                      type="number"
                      min="0"
                      placeholder="e.g. 15000"
                      value={transportCost}
                      onChange={(e) => setTransportCost(e.target.value === "" ? "" : Number(e.target.value))}
                      className="w-full px-3 py-1.5 border border-amber-300 bg-white rounded-lg text-xs font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/30"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Line Item Description</label>
                    <input
                      type="text"
                      value={transportDescription}
                      onChange={(e) => setTransportDescription(e.target.value)}
                      placeholder="e.g. Transport & Logistics / Site Transit"
                      className="w-full px-3 py-1.5 border border-amber-300 bg-white rounded-lg text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/30"
                    />
                  </div>
                </div>
              )}
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
                  <div className={applyTax ? "lg:col-span-4" : "lg:col-span-5"}>
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
                  {applyTax && (
                    <div className="lg:col-span-1">
                      <label className="block text-[10px] text-gray-400 font-semibold mb-1 uppercase">Tax %</label>
                      <input
                        type="number"
                        value={item.tax || 16}
                        onChange={(e) => handleItemChange(idx, "tax", Number(e.target.value))}
                        className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-xs text-center"
                      />
                    </div>
                  )}

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
                {includeTransport && (Number(transportCost) || 0) > 0 && (
                  <div className="flex justify-between py-2 text-amber-700 font-semibold bg-amber-50/50 px-2 rounded-lg">
                    <span className="flex items-center space-x-1.5">
                      <Truck className="w-3.5 h-3.5 text-[#D4AF37]" />
                      <span>Transport & Logistics</span>
                    </span>
                    <span>+{currency} {(Number(transportCost) || 0).toLocaleString()}</span>
                  </div>
                )}
                {applyTax && (
                  <div className="flex justify-between py-2">
                    <span className="text-gray-500">VAT Payable (16%)</span>
                    <span className="font-semibold text-gray-800">{currency} {getTotals().taxTotal.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between py-3 text-base font-bold text-gray-800 border-t-2 border-gray-300">
                  <span className="text-[#6B46C1]">TOTAL BALANCE DUE</span>
                  <span className="text-lg text-gray-900">{currency} {getTotals().grandTotal.toLocaleString()}</span>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center space-x-4 pt-4 border-t border-gray-200/60">
                <button
                  type="button"
                  disabled={savingStatus !== null}
                  onClick={() => handleSaveInvoice("draft")}
                  className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold transition-all disabled:opacity-50 flex items-center justify-center space-x-1.5"
                >
                  {savingStatus === 'draft' ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving Draft...</span>
                    </>
                  ) : (
                    <span>Save Draft</span>
                  )}
                </button>
                <button
                  type="button"
                  disabled={savingStatus !== null}
                  onClick={() => handleSaveInvoice("pending")}
                  className="flex-1 py-2.5 bg-[#6B46C1] hover:bg-purple-800 text-white rounded-xl text-xs font-bold shadow-md shadow-[#6B46C1]/20 transition-all flex items-center justify-center space-x-1.5 disabled:opacity-50"
                >
                  {savingStatus === 'pending' ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Issuing Invoice...</span>
                    </>
                  ) : (
                    <>
                      <CalendarCheck2 className="w-4 h-4 text-[#D4AF37]" />
                      <span>Issue Live Invoice</span>
                    </>
                  )}
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
                  <h4 className="font-bold text-base text-gray-800">Binti Events Official {selectedInvoice.taxTotal > 0 ? "Tax Invoice" : "Invoice"}</h4>
                  <p className="text-xs text-gray-400 mt-0.5">Invoice ID: {selectedInvoice.id}</p>
                </div>
                <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                  selectedInvoice.status === "paid" ? "bg-green-100 text-green-700 border border-green-200" :
                  selectedInvoice.status === "partially_paid" ? "bg-amber-100 text-amber-700 border border-amber-200" :
                  selectedInvoice.status === "overdue" ? "bg-red-100 text-red-700 border border-red-200" :
                  selectedInvoice.status === "pending" ? "bg-blue-100 text-blue-700 border border-blue-200" :
                  "bg-gray-100 text-gray-600 border border-gray-200"
                }`}>
                  {(selectedInvoice.status || 'draft').replace(/_/g, " ")}
                </span>
              </div>

              {/* Sub-party details block */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-50 rounded-2xl">
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase">Billed Client</p>
                  <p className="text-sm font-semibold text-gray-800 mt-1">{selectedInvoice.clientName || 'Unknown'}</p>
                  <p className="text-xs text-gray-500 mt-1">Client ID: {selectedInvoice.clientId}</p>
                </div>
                <div className="md:border-l md:border-gray-200 md:pl-4">
                  <p className="text-[10px] font-bold text-gray-400 uppercase">Billing Timeline</p>
                  <p className="text-xs text-gray-700 mt-1">Issue Date: <span className="font-semibold">{selectedInvoice.issueDate || ''}</span></p>
                  <p className="text-xs text-gray-700 mt-0.5">Due Date: <span className="font-semibold">{selectedInvoice.dueDate || ''}</span></p>
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
                        {selectedInvoice.taxTotal > 0 && <th className="p-3 text-center">Tax</th>}
                        <th className="p-3 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50 text-gray-700">
                      {(selectedInvoice.items || []).map((item) => (
                        <tr key={item.id} className="hover:bg-gray-50/50">
                          <td className="p-3 font-medium text-gray-800">{item.description}</td>
                          <td className="p-3 text-center font-bold text-gray-500">{item.quantity}</td>
                          <td className="p-3 text-right font-medium">{(Number(item.unitPrice) || 0).toLocaleString()}</td>
                          <td className="p-3 text-center text-emerald-600 font-bold">{item.discount || 0}%</td>
                          {selectedInvoice.taxTotal > 0 && <td className="p-3 text-center text-gray-500">{item.tax || 0}%</td>}
                          <td className="p-3 text-right font-bold text-gray-800">{(Number(item.amount) || 0).toLocaleString()}</td>
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
                        setPAmount((selectedInvoice.balanceRemaining || 0).toString());
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
                            <td className="py-2.5 font-medium">{p.paymentDate || ''}</td>
                            <td className="py-2.5 capitalize">{(p.paymentMethod || "other").replace(/_/g, " ")}</td>
                            <td className="py-2.5 font-mono text-[10px] text-[#6B46C1]">{p.referenceNumber || "N/A"}</td>
                            <td className="py-2.5 text-gray-500 truncate max-w-[150px]">{p.notes || "-"}</td>
                            <td className="py-2.5 text-right font-bold text-emerald-600">+{currency} {(Number(p.amountPaid) || 0).toLocaleString()}</td>
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

              {/* Official Bank Account & Payment Instructions Preview (Only for Invoices with active due balance) */}
              {selectedInvoice.status !== 'paid' && (Number(selectedInvoice.balanceRemaining) > 0) && companySettings.bankDetails && companySettings.bankDetails.trim() && (
                <div className="bg-emerald-50/20 p-4 border border-emerald-100 rounded-2xl space-y-1.5">
                  <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider flex items-center space-x-1.5">
                    <CreditCard className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Official Payment Instructions & Bank Details (On Due Invoices)</span>
                  </span>
                  <p className="text-xs text-gray-700 leading-relaxed font-mono whitespace-pre-wrap pl-5">{companySettings.bankDetails}</p>
                </div>
              )}
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
                  {selectedInvoice.taxTotal > 0 && (
                    <div className="flex justify-between py-1.5">
                      <span className="text-gray-400">Tax Payable (VAT 16%)</span>
                      <span className="font-semibold text-gray-200">{currency} {selectedInvoice.taxTotal.toLocaleString()}</span>
                    </div>
                  )}
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
                <div className="pt-4 border-t border-gray-800 space-y-3">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">PDF Template Style</label>
                    <select
                      value={pdfTemplate}
                      onChange={(e) => {
                        const val = e.target.value as 'corporate' | 'binti';
                        setPdfTemplate(val);
                        localStorage.setItem('pdf_template_preference', val);
                      }}
                      className="w-full px-2.5 py-1.5 bg-gray-800 border border-gray-700 rounded-lg text-xs text-white focus:outline-none focus:border-[#6B46C1]"
                    >
                      <option value="corporate">Classic Corporate (Purple/Gold)</option>
                      <option value="binti">Binti Signature (Pink Header/Logo/ThankYou)</option>
                    </select>
                  </div>

                  <button
                    disabled={downloadingPdf}
                    onClick={() => generatePDF(selectedInvoice)}
                    className="w-full py-2.5 bg-[#6B46C1] hover:bg-purple-800 text-white rounded-xl text-xs font-semibold flex items-center justify-center space-x-2 transition-all shadow-md shadow-[#6B46C1]/10 disabled:opacity-75"
                  >
                    {downloadingPdf ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Generating Tax Invoice PDF...</span>
                      </>
                    ) : (
                      <>
                        <Download className="w-3.5 h-3.5" />
                        <span>Download PDF Invoice</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => handleOpenWhatsAppModal(selectedInvoice)}
                    className="w-full py-2.5 bg-[#25D366] hover:bg-[#20bd5a] text-white rounded-xl text-xs font-bold flex items-center justify-center space-x-2 transition-all shadow-md shadow-[#25D366]/20"
                  >
                    <WhatsAppIcon className="w-4 h-4" />
                    <span>Send Invoice via WhatsApp</span>
                  </button>

                  <button
                    onClick={() => handleOpenEmailModal(selectedInvoice)}
                    className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center justify-center space-x-2 transition-all shadow-md shadow-blue-600/20"
                  >
                    <Mail className="w-4 h-4 text-blue-200" />
                    <span>Send Invoice via Email</span>
                  </button>

                  <button
                    onClick={() => handleDraftEmail(selectedInvoice)}
                    disabled={draftingEmail}
                    className="w-full py-2.5 bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-xl text-xs font-semibold flex items-center justify-center space-x-2 transition-all disabled:opacity-50"
                  >
                    {draftingEmail ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-[#D4AF37]" />
                        <span>Drafting AI Email...</span>
                      </>
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
                      disabled={isSubmittingPayment}
                      className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold transition-all shadow disabled:opacity-50 flex items-center justify-center space-x-1.5"
                    >
                      {isSubmittingPayment ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Processing Payment Receipt...</span>
                        </>
                      ) : (
                        <span>Confirm Manual Receipt</span>
                      )}
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
                        className="text-[10px] text-[#6B46C1] hover:underline font-bold disabled:opacity-50 flex items-center space-x-1"
                      >
                        {isSendingEmail && <Loader2 className="w-3 h-3 animate-spin" />}
                        <span>{isSendingEmail ? "Sending..." : "Send via Resend"}</span>
                      </button>
                      <button 
                        onClick={() => {
                          navigator.clipboard.writeText(aiEmailDraft);
                          setCopiedAiDraft(true);
                          showToast("Email text copied!");
                          setTimeout(() => setCopiedAiDraft(false), 2000);
                        }}
                        className="text-[10px] text-[#6B46C1] hover:underline font-bold flex items-center space-x-1"
                      >
                        {copiedAiDraft ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedAiDraft ? "Copied!" : "Copy"}</span>
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
                  {(status || '').replace(/_/g, " ")}
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
                          {inv.invoiceNumber || 'INV'}
                        </button>
                      </td>
                      <td className="p-4 font-semibold text-gray-800">{inv.clientName || 'Unknown'}</td>
                      <td className="p-4 text-gray-500">{inv.issueDate || '-'}</td>
                      <td className="p-4 text-gray-500">{inv.dueDate || '-'}</td>
                      <td className="p-4 font-bold text-gray-900 text-right">{currency} {(Number(inv.grandTotal) || 0).toLocaleString()}</td>
                      <td className="p-4 text-right">
                        <span className={`font-semibold ${(Number(inv.balanceRemaining) || 0) > 0 ? "text-amber-600" : "text-green-600"}`}>
                          {currency} {(Number(inv.balanceRemaining) || 0).toLocaleString()}
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
                          {(inv.status || 'draft').replace(/_/g, " ")}
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

                          <button
                            onClick={() => handleOpenWhatsAppModal(inv)}
                            className="p-1.5 text-gray-400 hover:text-[#25D366] hover:bg-emerald-50 rounded-lg transition-all"
                            title="Send Invoice via WhatsApp"
                          >
                            <WhatsAppIcon className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => handleOpenEmailModal(inv)}
                            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                            title="Send Invoice via Email"
                          >
                            <Mail className="w-4 h-4" />
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
                            disabled={deletingId === inv.id}
                            onClick={async () => {
                              if (confirm("Are you sure you want to delete this invoice?")) {
                                setDeletingId(inv.id);
                                try {
                                  await onDeleteInvoice(inv.id);
                                } finally {
                                  setDeletingId(null);
                                }
                              }
                            }}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all disabled:opacity-50"
                            title="Delete Invoice"
                          >
                            {deletingId === inv.id ? (
                              <Loader2 className="w-4 h-4 animate-spin text-red-600" />
                            ) : (
                              <Trash2 className="w-4 h-4" />
                            )}
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

      {/* WhatsApp Modal Overlay */}
      {whatsAppModalOpen && whatsAppInvoice && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white dark:bg-gray-900 rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-gray-100 dark:border-gray-800 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-800">
              <div className="flex items-center space-x-2.5">
                <div className="w-10 h-10 rounded-xl bg-[#25D366]/10 text-[#25D366] flex items-center justify-center">
                  <WhatsAppIcon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-gray-900 dark:text-white">Send Invoice via WhatsApp</h3>
                  <p className="text-[11px] text-gray-500 font-mono">Invoice #{whatsAppInvoice.invoiceNumber}</p>
                </div>
              </div>
              <button 
                onClick={() => setWhatsAppModalOpen(false)}
                className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="p-3 bg-purple-50 dark:bg-purple-900/20 border border-purple-100 dark:border-purple-800/40 rounded-xl flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold text-purple-600 dark:text-purple-300 uppercase">Selected PDF Template</p>
                  <p className="text-xs font-semibold text-gray-800 dark:text-white capitalize">
                    {pdfTemplate === 'binti' ? 'Binti Signature (Pink Header/Logo)' : 'Classic Corporate (Purple/Gold)'}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={downloadingPdf}
                  onClick={() => generatePDF(whatsAppInvoice)}
                  className="px-3 py-1.5 bg-[#6B46C1] hover:bg-purple-700 text-white rounded-lg text-[10px] font-bold flex items-center space-x-1.5 disabled:opacity-75 transition-all"
                >
                  {downloadingPdf ? (
                    <>
                      <Loader2 className="w-3 h-3 animate-spin" />
                      <span>Generating...</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-3 h-3" />
                      <span>Get PDF</span>
                    </>
                  )}
                </button>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Client WhatsApp Number</label>
                <input
                  type="text"
                  value={whatsAppPhone}
                  onChange={(e) => setWhatsAppPhone(e.target.value)}
                  placeholder="e.g. +254 712 345 678"
                  className="w-full px-3.5 py-2.5 border border-gray-200 dark:border-gray-700 dark:bg-gray-800 rounded-xl text-xs font-semibold text-gray-800 dark:text-white focus:outline-none focus:border-[#25D366]"
                />
                <p className="text-[10px] text-gray-400 mt-1">Accepts local (07...) or international format (+254...)</p>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">WhatsApp Short Message Preview</label>
                <textarea
                  value={whatsAppMessage}
                  onChange={(e) => setWhatsAppMessage(e.target.value)}
                  rows={6}
                  className="w-full p-3.5 border border-gray-200 dark:border-gray-700 dark:bg-gray-800 rounded-xl text-xs font-mono text-gray-800 dark:text-gray-200 leading-relaxed focus:outline-none focus:border-[#25D366]"
                />
              </div>
            </div>

            <div className="flex items-center space-x-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(whatsAppMessage);
                  setCopiedWhatsApp(true);
                  showToast("WhatsApp text copied to clipboard!");
                  setTimeout(() => setCopiedWhatsApp(false), 2000);
                }}
                className="w-1/3 py-3 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-1.5"
              >
                {copiedWhatsApp ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-emerald-600">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Text</span>
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={handleDispatchWhatsApp}
                className="w-2/3 py-3 bg-[#25D366] hover:bg-[#20bd5a] text-white rounded-xl text-xs font-bold shadow-lg shadow-[#25D366]/20 transition-all flex items-center justify-center space-x-2"
              >
                <WhatsAppIcon className="w-4 h-4" />
                <span>Open in WhatsApp</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Email Modal Overlay */}
      {emailModalOpen && emailInvoice && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white dark:bg-gray-900 rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-gray-100 dark:border-gray-800 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-800">
              <div className="flex items-center space-x-2.5">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center">
                  <Mail className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-gray-900 dark:text-white">Send Invoice via Email</h3>
                  <p className="text-[11px] text-gray-500 font-mono">Invoice #{emailInvoice.invoiceNumber}</p>
                </div>
              </div>
              <button 
                onClick={() => setEmailModalOpen(false)}
                className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="p-3 bg-purple-50 dark:bg-purple-900/20 border border-purple-100 dark:border-purple-800/40 rounded-xl flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold text-purple-600 dark:text-purple-300 uppercase">Selected PDF Template</p>
                  <p className="text-xs font-semibold text-gray-800 dark:text-white capitalize">
                    {pdfTemplate === 'binti' ? 'Binti Signature (Pink Header/Logo)' : 'Classic Corporate (Purple/Gold)'}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={downloadingPdf}
                  onClick={() => generatePDF(emailInvoice)}
                  className="px-3 py-1.5 bg-[#6B46C1] hover:bg-purple-700 text-white rounded-lg text-[10px] font-bold flex items-center space-x-1.5 disabled:opacity-75 transition-all"
                >
                  {downloadingPdf ? (
                    <>
                      <Loader2 className="w-3 h-3 animate-spin" />
                      <span>Generating...</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-3 h-3" />
                      <span>Get PDF</span>
                    </>
                  )}
                </button>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Recipient Email Address</label>
                <input
                  type="email"
                  value={emailTo}
                  onChange={(e) => setEmailTo(e.target.value)}
                  placeholder="e.g. client@company.com"
                  className="w-full px-3.5 py-2.5 border border-gray-200 dark:border-gray-700 dark:bg-gray-800 rounded-xl text-xs font-semibold text-gray-800 dark:text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Email Subject Line</label>
                <input
                  type="text"
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  placeholder="Subject line"
                  className="w-full px-3.5 py-2.5 border border-gray-200 dark:border-gray-700 dark:bg-gray-800 rounded-xl text-xs font-semibold text-gray-800 dark:text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[10px] font-bold text-gray-400 uppercase">Email Content Body</label>
                  <button
                    type="button"
                    onClick={() => handleDraftEmail(emailInvoice)}
                    disabled={draftingEmail}
                    className="text-[10px] font-bold text-[#6B46C1] hover:underline flex items-center space-x-1 disabled:opacity-50"
                  >
                    {draftingEmail ? (
                      <>
                        <Loader2 className="w-3 h-3 animate-spin text-[#D4AF37]" />
                        <span>Drafting...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3 h-3 text-[#D4AF37]" />
                        <span>Generate AI Copy</span>
                      </>
                    )}
                  </button>
                </div>
                <textarea
                  value={emailBody}
                  onChange={(e) => setEmailBody(e.target.value)}
                  rows={8}
                  className="w-full p-3.5 border border-gray-200 dark:border-gray-700 dark:bg-gray-800 rounded-xl text-xs font-mono text-gray-800 dark:text-gray-200 leading-relaxed focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div className="flex items-center space-x-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(`Subject: ${emailSubject}\n\n${emailBody}`);
                  setCopiedEmail(true);
                  showToast("Email text copied to clipboard!");
                  setTimeout(() => setCopiedEmail(false), 2000);
                }}
                className="w-1/3 py-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-1"
              >
                {copiedEmail ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-emerald-600">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => openMailClient(emailTo, emailSubject, emailBody)}
                className="w-1/3 py-2.5 bg-gray-800 hover:bg-gray-900 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-1"
              >
                <Mail className="w-3.5 h-3.5 text-blue-300" />
                <span>Mail App</span>
              </button>

              <button
                type="button"
                onClick={handleSendModalEmail}
                disabled={isSendingEmail}
                className="w-1/3 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-lg shadow-blue-600/20 transition-all flex items-center justify-center space-x-1 disabled:opacity-50"
              >
                {isSendingEmail ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Sending...</span>
                  </>
                ) : (
                  <>
                    <Mail className="w-3.5 h-3.5" />
                    <span>Send API</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
