import React, { useState } from "react";
import { 
  FileText, 
  Plus, 
  Trash2, 
  Sparkles, 
  Download, 
  Mail, 
  ArrowRightLeft, 
  ChevronLeft, 
  Search, 
  Eye, 
  PlusCircle, 
  CheckCircle,
  FileCheck2,
  ListRestart,
  X,
  Copy,
  Check,
  Loader2,
  CreditCard,
  Truck
} from "lucide-react";
import { jsPDF } from "jspdf";
import { Quote, Client, ProductService, BillingItem, CompanySettings } from "../types";
import { generateEmailDraft, recommendTerms } from "../services/geminiService";
import { apiRequest } from "../services/apiClient";
import { buildQuoteWhatsAppMessage, openWhatsApp } from "../utils/whatsapp";
import { buildQuoteEmailContent, openMailClient } from "../utils/email";

const WhatsAppIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414-.074-.124-.272-.198-.57-.347m-5.421 7.461c-1.926 0-3.72-.519-5.263-1.423l-.377-.222-3.913 1.026 1.044-3.815-.247-.393A9.873 9.873 0 012.1 11.92c0-5.461 4.444-9.905 9.907-9.905 5.46 0 9.904 4.444 9.904 9.905 0 5.46-4.444 9.907-9.904 9.907m0-21.782c-6.559 0-11.896 5.335-11.896 11.875 0 2.096.547 4.14 1.587 5.945L0 24l6.335-1.662a11.87 11.87 0 005.672 1.449h.005c6.557 0 11.894-5.337 11.894-11.876 0-3.174-1.236-6.158-3.483-8.406A11.798 11.798 0 0012.051.061z"/>
  </svg>
);

interface QuotesModuleProps {
  quotes: Quote[];
  clients: Client[];
  products: ProductService[];
  currency: string;
  companySettings: CompanySettings;
  onCreateQuote: (quote: Partial<Quote>) => Promise<void>;
  onUpdateQuote: (id: string, quote: Partial<Quote>) => Promise<void>;
  onDeleteQuote: (id: string) => Promise<void>;
  onConvertToInvoice: (quote: Quote) => Promise<void>;
  selectedQuote: Quote | null;
  setSelectedQuote: (quote: Quote | null) => void;
  showToast: (message: string, type?: "success" | "warning") => void;
}

export default function QuotesModule({
  quotes,
  clients,
  products,
  currency,
  companySettings,
  onCreateQuote,
  onUpdateQuote,
  onDeleteQuote,
  onConvertToInvoice,
  selectedQuote,
  setSelectedQuote,
  showToast
}: QuotesModuleProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  
  // Form States
  const [clientId, setClientId] = useState("");
  const [quoteDate, setQuoteDate] = useState(new Date().toISOString().split("T")[0]);
  const [expiryDate, setExpiryDate] = useState("");
  const [applyTax, setApplyTax] = useState(true);
  const [includeTransport, setIncludeTransport] = useState(false);
  const [transportCost, setTransportCost] = useState<number | string>("");
  const [transportDescription, setTransportDescription] = useState("Transport & Logistics / Site Rigging Transit");
  const [items, setItems] = useState<Partial<BillingItem>[]>([
    { id: "qi_1", description: "", quantity: 1, unitPrice: 0, discount: 0, tax: 16, amount: 0 }
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
  
  const [pdfTemplate, setPdfTemplate] = useState<'corporate' | 'binti'>(() => {
    return (localStorage.getItem('pdf_template_preference') as 'corporate' | 'binti') || 'corporate';
  });

  // Action states for button transitions
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [savingStatus, setSavingStatus] = useState<'draft' | 'sent' | null>(null);
  const [convertingId, setConvertingId] = useState<string | null>(null);
  const [copiedWhatsApp, setCopiedWhatsApp] = useState(false);
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [copiedAiDraft, setCopiedAiDraft] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // AI Email
  const [aiEmailDraft, setAiEmailDraft] = useState<string | null>(null);
  const [draftingEmail, setDraftingEmail] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [recommendingTerms, setRecommendingTerms] = useState(false);

  // WhatsApp Dispatch States
  const [whatsAppModalOpen, setWhatsAppModalOpen] = useState(false);
  const [whatsAppPhone, setWhatsAppPhone] = useState("");
  const [whatsAppMessage, setWhatsAppMessage] = useState("");
  const [whatsAppQuote, setWhatsAppQuote] = useState<Quote | null>(null);

  const handleOpenWhatsAppModal = (quote: Quote) => {
    const client = clients.find(c => c.id === quote.clientId);
    const msg = buildQuoteWhatsAppMessage(quote, client, companySettings as any, pdfTemplate);
    setWhatsAppQuote(quote);
    setWhatsAppPhone(client?.phone || "");
    setWhatsAppMessage(msg);
    setWhatsAppModalOpen(true);
  };

  const handleDispatchWhatsApp = () => {
    if (!whatsAppMessage) {
      showToast("Please provide message text.", "warning");
      return;
    }
    if (whatsAppQuote) {
      generatePDF(whatsAppQuote); // Auto-generate & download PDF in admin's chosen template style
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
  const [emailQuote, setEmailQuote] = useState<Quote | null>(null);

  const handleOpenEmailModal = (quote: Quote) => {
    const client = clients.find(c => c.id === quote.clientId);
    const content = buildQuoteEmailContent(quote, client, companySettings as any, pdfTemplate);
    setEmailQuote(quote);
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

  // Auto-calculate expiry date
  React.useEffect(() => {
    if (quoteDate) {
      const d = new Date(quoteDate);
      d.setDate(d.getDate() + 30); // 30 days default validity
      setExpiryDate(d.toISOString().split("T")[0]);
    }
  }, [quoteDate]);

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
      { id: "qi_" + Date.now().toString(), description: "", quantity: 1, unitPrice: 0, discount: 0, tax: 16, amount: 0 }
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

  // Calculate overall quote totals
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
      grandTotal
    };
  };

  // Save Quote
  const handleSaveQuote = async (status: 'draft' | 'sent') => {
    if (!clientId) {
      showToast("Please select a client before saving.", "warning");
      return;
    }
    setSavingStatus(status);
    try {
      const totals = getTotals();
      const selectedCli = clients.find(c => c.id === clientId);
      
      const baseItems: BillingItem[] = items.map(i => ({
        id: i.id || "qi_" + Math.random().toString(),
        description: i.description || "Custom Service",
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

      const quotePayload: Partial<Quote> = {
        clientId,
        clientName: selectedCli ? selectedCli.name : "Unknown",
        quoteDate,
        expiryDate,
        items: finalItems,
        ...totals,
        notes,
        terms,
        status
      };

      await onCreateQuote(quotePayload);
      setIsCreating(false);
      resetForm();
    } catch (err) {
      console.error("Save quote error:", err);
    } finally {
      setSavingStatus(null);
    }
  };

  const resetForm = () => {
    setClientId("");
    setQuoteDate(new Date().toISOString().split("T")[0]);
    setItems([{ id: "qi_1", description: "", quantity: 1, unitPrice: 0, discount: 0, tax: 16, amount: 0 }]);
    setIncludeTransport(false);
    setTransportCost("");
    setTransportDescription("Transport & Logistics / Site Rigging Transit");
    setNotes("");
    setTerms("");
    setAiEmailDraft(null);
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

  // Generate PDF (jsPDF) with visual active state
  const generatePDF = async (quote: Quote) => {
    if (!quote) return;
    setDownloadingPdf(true);
    showToast("Generating and preparing PDF quotation...");
    try {
      // Small pause to ensure UI displays the spinner state
      await new Promise(r => setTimeout(r, 60));
      if (pdfTemplate === 'binti') {
        await generatePDFBinti(quote);
      } else {
        generatePDFCorporate(quote);
      }
      showToast("Quotation PDF downloaded successfully!");
    } catch (err) {
      console.error("PDF generation failed:", err);
      showToast("Failed to generate PDF quotation.", "warning");
    } finally {
      setDownloadingPdf(false);
    }
  };

  const generatePDFCorporate = (quote: Quote) => {
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

    const drawCorpTableHeader = () => {
      doc.setFillColor(purple[0], purple[1], purple[2]);
      doc.rect(margin, y, contentWidth, 8.5, "F");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(255, 255, 255);
      doc.text("SERVICE DESCRIPTION / HIRE ASSET", colX[0] + 3, y + 5.5);
      doc.text("QTY", colX[1] + colWidths[1] / 2, y + 5.5, { align: "center" });
      doc.text("UNIT PRICE", colX[2] + colWidths[2] - 3, y + 5.5, { align: "right" });
      if (quote.taxTotal > 0) {
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
    doc.text(`OFFICIAL QUOTE: ${quote.quoteNumber}`, pageWidth - margin, y, { align: "right" });

    // Quote Meta Details
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(90, 90, 90);
    doc.text(`Quote Date: ${quote.quoteDate || 'N/A'}`, pageWidth - margin, y + 5.5, { align: "right" });
    doc.text(`Valid Until: ${quote.expiryDate || 'N/A'}`, pageWidth - margin, y + 10.5, { align: "right" });
    doc.text(`Currency: ${currency}`, pageWidth - margin, y + 15.5, { align: "right" });

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
    const clientDetails = clients.find(c => c.id === quote.clientId);
    doc.text(quote.clientName || "Valued Client", col2X, y);

    y += 4.5;
    if (quote.taxTotal > 0 && companySettings.taxNumber) {
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

    // Column widths & positions
    const colWidths = quote.taxTotal > 0 
      ? [contentWidth * 0.44, contentWidth * 0.12, contentWidth * 0.16, contentWidth * 0.12, contentWidth * 0.16]
      : [contentWidth * 0.54, contentWidth * 0.12, contentWidth * 0.17, contentWidth * 0.17];

    const colX: number[] = [];
    let currentX = margin;
    colWidths.forEach(w => {
      colX.push(currentX);
      currentX += w;
    });

    drawCorpTableHeader();
    y += 8.5;

    // Render Items
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(charcoal[0], charcoal[1], charcoal[2]);
    
    quote.items.forEach((item, index) => {
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
      if (quote.taxTotal > 0) {
        doc.text(`${item.tax}%`, colX[3] + colWidths[3] / 2, valueY, { align: "center" });
        doc.text(lineNet.toLocaleString(), colX[4] + colWidths[4] - 3, valueY, { align: "right" });
      } else {
        doc.text(lineNet.toLocaleString(), colX[3] + colWidths[3] - 3, valueY, { align: "right" });
      }
      
      y += rowHeight;
    });

    y += 5;
    ensurePageSpace(35);

    // Financial Totals Box
    const totalsBoxWidth = 85;
    const totalsLeftX = pageWidth - margin - totalsBoxWidth;
    const totalsValX = pageWidth - margin - 4;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(charcoal[0], charcoal[1], charcoal[2]);

    doc.text("Subtotal (excl. VAT):", totalsLeftX + 3, y + 4);
    doc.text(`${currency} ${quote.subtotal.toLocaleString()}`, totalsValX, y + 4, { align: "right" });
    
    y += 6;
    if (quote.discountTotal > 0) {
      doc.text("Discount Deducted:", totalsLeftX + 3, y + 4);
      doc.text(`-${currency} ${quote.discountTotal.toLocaleString()}`, totalsValX, y + 4, { align: "right" });
      y += 6;
    }
    
    if (quote.taxTotal > 0) {
      doc.text("Tax Amount (VAT 16%):", totalsLeftX + 3, y + 4);
      doc.text(`${currency} ${quote.taxTotal.toLocaleString()}`, totalsValX, y + 4, { align: "right" });
      y += 6;
    }

    y += 2;
    doc.setFillColor(purple[0], purple[1], purple[2]);
    doc.rect(totalsLeftX, y, totalsBoxWidth, 9, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(255, 255, 255);
    doc.text("GRAND TOTAL:", totalsLeftX + 4, y + 6);
    doc.text(`${currency} ${quote.grandTotal.toLocaleString()}`, totalsValX, y + 6, { align: "right" });

    y += 15;

    // Terms & Conditions Block
    const termsSource = quote.terms || companySettings.termsTemplate || (companySettings as any).terms_template;
    if (termsSource) {
      ensurePageSpace(30);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(purple[0], purple[1], purple[2]);
      doc.text("TERMS & CONDITIONS", margin, y);

      y += 5;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(100, 100, 100);

      const splitTermsIntoLines = (val?: string): string[] => {
        if (!val) return [];
        let str = String(val);
        str = str.replace(/\\r\\n/g, '\n').replace(/\\n/g, '\n').replace(/\\r/g, '\n');
        str = str.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
        str = str.replace(/(?<=[^\n])\s*(?=\b\d+\.\s+)/g, '\n');
        return str.split('\n').map(l => l.trim()).filter(Boolean);
      };

      const termsLines = splitTermsIntoLines(termsSource);
      termsLines.forEach((term: string) => {
        const splitLine = doc.splitTextToSize(term, contentWidth);
        ensurePageSpace(splitLine.length * 4.0 + 2);
        doc.text(splitLine, margin, y);
        y += splitLine.length * 4.0 + 1.5;
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
    doc.text("Prepared By: Binti Events", margin, y + 19);
    doc.text("Client Confirmation Sign", sig2X, y + 19);

    // PDF footer
    doc.setFontSize(7.5);
    doc.setTextColor(150, 150, 150);
    doc.text("Thank you for partnering with Binti Events to design your landmark occasions.", margin, pageHeight - 10);
    
    doc.save(`${quote.quoteNumber || 'QT'}-${(quote.clientName || 'Client').replace(/\s+/g, "_")}.pdf`);
  };

  const generatePDFBinti = async (quote: Quote) => {
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

    const quoteDate = quote.quoteDate || new Date().toISOString().split("T")[0];
    const expiryDate = quote.expiryDate || '';
    const quoteNo = quote.quoteNumber || '';
    
    let y = margin;

    const colWidths = quote.taxTotal > 0 
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
      if (quote.taxTotal > 0) {
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
    const documentTitle = quote.taxTotal > 0 ? 'TAX QUOTATION' : 'QUOTATION';
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
    doc.text(quote.clientName || '', margin, y + 5.5);
    const clientDetails = clients.find(c => c.id === quote.clientId);
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
    doc.text('Quote No.:', labelX, y, { align: 'right' });
    doc.text('Issue date:', labelX, y + 5.5, { align: 'right' });
    doc.text('Expiry date:', labelX, y + 11, { align: 'right' });

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(black[0], black[1], black[2]);
    doc.text(quoteNo, valueX, y, { align: 'right' });
    doc.text(quoteDate, valueX, y + 5.5, { align: 'right' });
    doc.text(expiryDate, valueX, y + 11, { align: 'right' });

    y += Math.max(clientOffset + 6, 22);

    drawTableHeader();
    y += 8.5;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(black[0], black[1], black[2]);

    quote.items.forEach(item => {
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
      if (quote.taxTotal > 0) {
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
    ensurePageSpace(30);

    const totalAlignX = quote.taxTotal > 0 ? colX[4] + colWidths[4] - 3 : colX[3] + colWidths[3] - 3;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(black[0], black[1], black[2]);
    doc.text('TOTAL:', totalAlignX - 45, y + 2, { align: 'right' });
    doc.text(`${currency} ${quote.grandTotal.toLocaleString()}`, totalAlignX, y + 2, { align: 'right' });

    y += 8;

    ensurePageSpace(20);
    doc.setFont('helvetica', 'bolditalic');
    doc.setFontSize(8);
    doc.setTextColor(black[0], black[1], black[2]);
    doc.text('Terms & conditions apply:', margin, y);

    y += 5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(gray[0], gray[1], gray[2]);

    const splitTermsIntoLines = (val?: string): string[] => {
      if (!val) return [];
      let str = String(val);
      str = str.replace(/\\r\\n/g, '\n').replace(/\\n/g, '\n').replace(/\\r/g, '\n');
      str = str.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
      str = str.replace(/(?<=[^\n])\s*(?=\b\d+\.\s+)/g, '\n');
      return str.split('\n').map(l => l.trim()).filter(Boolean);
    };

    const termsSourceBinti = quote.terms || companySettings.termsTemplate || (companySettings as any).terms_template;
    const rawTermsLines = splitTermsIntoLines(termsSourceBinti);
    const termsLines = rawTermsLines.length > 0 ? rawTermsLines : [
      '1. Client by making payment authorizes Binti Tents & Events to supply the above facilities',
      '2. Payment of at least 80% confirms your booking upon signing below; balance to be upon set up',
      '3. Cancellation policy: Cancellation must be in writing. A month before event: 50% refund, 2 weeks before: 25% refund; Less than a week: non refundable',
      '4. Client agrees to safeguard the equipment and be solely responsible for any loss or damage of the same that may occur during period of hire',
      '5. Quote valid for 30 days',
    ];
    termsLines.forEach((term: string, i: number) => {
      const lineText = term.match(/^\d+\./) ? term : `${i + 1}. ${term}`;
      const lines = doc.splitTextToSize(lineText, contentWidth);
      ensurePageSpace(lines.length * 4.0 + 2);
      doc.text(lines, margin, y);
      y += lines.length * 4.0 + 1.5;
    });

    y += 8;
    ensurePageSpace(28);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(black[0], black[1], black[2]);
    doc.text('Prepared by:', pageWidth - margin, y, { align: 'right' });
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

    doc.save(`${quote.quoteNumber}-${(quote.clientName || 'Client').replace(/\s+/g, "_")}.pdf`);
  };

  // Generate AI Email draft
  const handleDraftEmail = async (quote: Quote) => {
    setDraftingEmail(true);
    setAiEmailDraft(null);
    try {
      const draft = await generateEmailDraft({
        type: "Quote",
        number: quote.quoteNumber,
        clientName: quote.clientName,
        amount: quote.grandTotal,
        dueDate: quote.expiryDate,
        notes: quote.notes,
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

  const handleSendEmail = async (quote: Quote) => {
    const clientDetails = clients.find(c => c.id === quote.clientId);
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
      openMailClient(
        clientEmail,
        `Quotation ${quote.quoteNumber} - ${companySettings.companyName || 'Binti Events'}`,
        aiEmailDraft
      );
      showToast("Opened draft in email client!");
    } catch (err) {
      showToast("Error opening email client: " + err, "warning");
    } finally {
      setIsSendingEmail(false);
    }
  };

  // Recommend Terms via AI Service
  const handleRecommendTerms = async () => {
    setRecommendingTerms(true);
    try {
      const clientName = clients.find(c => c.id === clientId)?.name || "Valued Client";
      const mappedItems = items
        .filter(item => item.description)
        .map(item => ({ description: item.description || "" }));
      const rec = await recommendTerms(clientName, mappedItems);
      setTerms(rec);
      showToast("AI-recommended terms applied.");
    } catch (err) {
      showToast("Error loading recommended terms.", "warning");
    } finally {
      setRecommendingTerms(false);
    }
  };

  // Filter & Search quotes
  const filteredQuotes = quotes.filter(quote => {
    const matchesSearch = quote.quoteNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          quote.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (quote.notes && quote.notes.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesStatus = statusFilter === "all" || quote.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Module Title Banner */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-800 flex items-center space-x-2">
            <FileText className="w-5 h-5 text-[#6B46C1]" />
            <span>Event Quotations</span>
          </h2>
          <p className="text-xs text-gray-500 mt-1">Configure luxury packages and generate PDF quotations.</p>
        </div>
        {!isCreating && !selectedQuote && (
          <button
            onClick={() => {
              setIsCreating(true);
              resetForm();
            }}
            className="px-4 py-2 bg-[#6B46C1] hover:bg-purple-800 text-white rounded-xl text-xs font-semibold shadow-md flex items-center space-x-2 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Create Event Quote</span>
          </button>
        )}
      </div>

      {/* VIEW 1: CREATION / EDITING FORM */}
      {isCreating && (
        <div className="glass-card p-6 space-y-6 animate-fade-in">
          <div className="flex items-center justify-between border-b border-gray-100 pb-4">
            <h3 className="font-bold text-sm text-gray-800">New Premium Quote Builder</h3>
            <button 
              onClick={() => setIsCreating(false)}
              className="text-gray-400 hover:text-gray-600 text-xs flex items-center space-x-1"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Back to Quotes</span>
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
                <option value="">-- Click to choose client --</option>
                {clients.map(c => (
                  <option key={c.id} value={c.id}>{c.name} {c.company ? `(${c.company})` : ""}</option>
                ))}
              </select>
            </div>

            {/* Quote Date */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-2">Quotation Date</label>
              <input
                type="date"
                value={quoteDate}
                onChange={(e) => setQuoteDate(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#6B46C1]/20 focus:border-[#6B46C1]"
              />
            </div>

            {/* Expiry Date */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-2">Expiry Date (Validity)</label>
              <input
                type="date"
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
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
                id="applyTaxQuote"
                checked={applyTax}
                onChange={(e) => setApplyTax(e.target.checked)}
                className="w-4 h-4 text-[#6B46C1] border-gray-300 rounded focus:ring-[#6B46C1]"
              />
              <label htmlFor="applyTaxQuote" className="text-xs font-semibold text-gray-700 select-none cursor-pointer">
                Apply VAT (16%) and generate Tax-inclusive Quotation
              </label>
            </div>

            {/* Transport Cost Toggle & Input */}
            <div className={`border rounded-xl p-3.5 transition-all ${
              includeTransport ? "bg-amber-50/40 border-amber-200" : "bg-gray-50/50 border-gray-100"
            }`}>
              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  id="includeTransportQuote"
                  checked={includeTransport}
                  onChange={(e) => {
                    setIncludeTransport(e.target.checked);
                    if (!e.target.checked) setTransportCost("");
                  }}
                  className="w-4 h-4 text-[#D4AF37] border-gray-300 rounded focus:ring-[#D4AF37]"
                />
                <label htmlFor="includeTransportQuote" className="text-xs font-bold text-gray-800 select-none cursor-pointer flex items-center space-x-1.5">
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
              <span className="text-xs font-bold text-[#6B46C1] uppercase tracking-wider">Quotable Inventory & Services</span>
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

          {/* Quote Calculations & Summary */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 border-t border-gray-100 pt-6">
            {/* Notes & Terms */}
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-2">Quote Scope & Specific Notes</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Details about site rigging, layout styling, or crew transport details."
                  rows={3}
                  className="w-full p-3 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#6B46C1]/20 focus:border-[#6B46C1]"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-semibold text-gray-500 uppercase">Custom Safety & Setup Terms</label>
                  <button
                    type="button"
                    onClick={handleRecommendTerms}
                    disabled={recommendingTerms}
                    className="text-[10px] text-[#6B46C1] hover:text-purple-800 font-bold flex items-center space-x-1"
                  >
                    {recommendingTerms ? (
                      <span>Analyzing setup...</span>
                    ) : (
                      <>
                        <Sparkles className="w-3 h-3 text-[#D4AF37]" />
                        <span>AI Suggest Terms</span>
                      </>
                    )}
                  </button>
                </div>
                <textarea
                  value={terms}
                  onChange={(e) => setTerms(e.target.value)}
                  placeholder="Terms of payment, logistics liabilities, or damage clauses."
                  rows={4}
                  className="w-full p-3 border border-gray-200 rounded-xl text-xs font-mono text-gray-600 focus:outline-none focus:ring-2 focus:ring-[#6B46C1]/20 focus:border-[#6B46C1]"
                />
              </div>
            </div>

            {/* Totals Box */}
            <div className="bg-[#F8F9FA] rounded-2xl p-6 border border-gray-200 flex flex-col justify-between space-y-4">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider block">Financial Summary</span>
              
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
                    <span className="text-gray-500">Tax Payable (VAT 16%)</span>
                    <span className="font-semibold text-gray-800">{currency} {getTotals().taxTotal.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between py-3 text-base font-bold text-gray-800 border-t-2 border-gray-300">
                  <span className="text-[#6B46C1]">GRAND TOTAL PAYABLE</span>
                  <span className="text-lg text-gray-900">{currency} {getTotals().grandTotal.toLocaleString()}</span>
                </div>
              </div>

              {/* Action Save Buttons */}
              <div className="flex items-center space-x-4 pt-4 border-t border-gray-200/60">
                <button
                  type="button"
                  disabled={savingStatus !== null}
                  onClick={() => handleSaveQuote("draft")}
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
                  onClick={() => handleSaveQuote("sent")}
                  className="flex-1 py-2.5 bg-[#6B46C1] hover:bg-purple-800 text-white rounded-xl text-xs font-bold shadow-md shadow-[#6B46C1]/20 transition-all flex items-center justify-center space-x-1.5 disabled:opacity-50"
                >
                  {savingStatus === 'sent' ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Issuing Quote...</span>
                    </>
                  ) : (
                    <>
                      <FileCheck2 className="w-4 h-4 text-[#D4AF37]" />
                      <span>Finalize & Issue</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 2: QUOTE PREVIEW MODE */}
      {selectedQuote && (
        <div className="glass-card p-6 space-y-6 animate-fade-in">
          <div className="flex items-center justify-between border-b border-gray-100 pb-4">
            <div className="flex items-center space-x-2">
              <span className="text-xs font-bold uppercase tracking-widest text-[#6B46C1]">Preview Mode</span>
              <span className="text-xs text-gray-400">|</span>
              <span className="text-xs font-bold text-gray-800">{selectedQuote.quoteNumber}</span>
            </div>
            <button 
              onClick={() => {
                setSelectedQuote(null);
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
                  <h4 className="font-bold text-base text-gray-800">Binti Events Official Quotation</h4>
                  <p className="text-xs text-gray-400 mt-0.5">Quote ID: {selectedQuote.id}</p>
                </div>
                <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                  selectedQuote.status === "converted" ? "bg-green-50 text-green-600 border border-green-200" :
                  selectedQuote.status === "sent" ? "bg-blue-50 text-blue-600 border border-blue-200" :
                  selectedQuote.status === "draft" ? "bg-gray-100 text-gray-600 border border-gray-200" :
                  "bg-red-50 text-red-600 border border-red-200"
                }`}>
                  {selectedQuote.status}
                </span>
              </div>

              {/* Sub-party details block */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-50 rounded-2xl">
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase">Prepared For Client</p>
                  <p className="text-sm font-semibold text-gray-800 mt-1">{selectedQuote.clientName}</p>
                  <p className="text-xs text-gray-500 mt-1">Client ID: {selectedQuote.clientId}</p>
                </div>
                <div className="md:border-l md:border-gray-200 md:pl-4">
                  <p className="text-[10px] font-bold text-gray-400 uppercase">Quote Timing Details</p>
                  <p className="text-xs text-gray-700 mt-1">Quote Date: <span className="font-semibold">{selectedQuote.quoteDate}</span></p>
                  <p className="text-xs text-gray-700 mt-0.5">Expiry Date: <span className="font-semibold">{selectedQuote.expiryDate}</span></p>
                </div>
              </div>

              {/* Items Table Display */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Quote Items & Pricing List</span>
                <div className="overflow-x-auto border border-gray-100 rounded-xl">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-100 text-gray-400 font-bold uppercase tracking-wider">
                        <th className="p-3">Description</th>
                        <th className="p-3 text-center">Qty</th>
                        <th className="p-3 text-right">Price</th>
                        <th className="p-3 text-center">Disc</th>
                        {selectedQuote.taxTotal > 0 && <th className="p-3 text-center">Tax</th>}
                        <th className="p-3 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50 text-gray-700">
                      {selectedQuote.items.map((item) => (
                        <tr key={item.id} className="hover:bg-gray-50/50">
                          <td className="p-3 font-medium text-gray-800">{item.description}</td>
                          <td className="p-3 text-center font-bold text-gray-500">{item.quantity}</td>
                          <td className="p-3 text-right font-medium">{item.unitPrice.toLocaleString()}</td>
                          <td className="p-3 text-center text-emerald-600 font-bold">{item.discount}%</td>
                          {selectedQuote.taxTotal > 0 && <td className="p-3 text-center text-gray-500">{item.tax}%</td>}
                          <td className="p-3 text-right font-bold text-gray-800">{item.amount.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Notes & Custom safety Terms */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-purple-50/20 p-4 border border-purple-50 rounded-2xl">
                  <span className="text-[10px] font-bold text-[#6B46C1] uppercase tracking-wider block mb-1">Quote Notes</span>
                  <p className="text-xs text-gray-600 leading-relaxed whitespace-pre-wrap">{selectedQuote.notes || "No special scope notes entered."}</p>
                </div>
                <div className="bg-amber-50/20 p-4 border border-amber-50 rounded-2xl">
                  <span className="text-[10px] font-bold text-[#D4AF37] uppercase tracking-wider block mb-1">Contract Safety Terms</span>
                  <p className="text-xs text-gray-600 leading-relaxed font-mono whitespace-pre-wrap">{selectedQuote.terms || companySettings.termsTemplate}</p>
                </div>
              </div>
            </div>

            {/* Right Col: Totals + Actions & AI Mail Draft */}
            <div className="space-y-6">
              {/* Financial Summary card */}
              <div className="bg-[#1F2937] text-white p-6 rounded-2xl border border-[#6B46C1]/20 space-y-4">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Total Quotation Amount</span>
                
                <div className="space-y-2 text-xs divide-y divide-gray-800">
                  <div className="flex justify-between py-1.5">
                    <span className="text-gray-400">Subtotal</span>
                    <span className="font-semibold text-gray-200">{currency} {selectedQuote.subtotal.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between py-1.5">
                    <span className="text-gray-400">Discount Amount</span>
                    <span className="font-semibold text-emerald-400">({currency} {selectedQuote.discountTotal.toLocaleString()})</span>
                  </div>
                  {selectedQuote.taxTotal > 0 && (
                    <div className="flex justify-between py-1.5">
                      <span className="text-gray-400">Tax (VAT 16%)</span>
                      <span className="font-semibold text-gray-200">{currency} {selectedQuote.taxTotal.toLocaleString()}</span>
                    </div>
                  )}
                  <div className="flex justify-between py-3 text-sm font-bold border-t border-gray-800">
                    <span className="text-[#D4AF37]">GRAND TOTAL</span>
                    <span className="text-base text-white">{currency} {selectedQuote.grandTotal.toLocaleString()}</span>
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
                      <option value="corporate">Classic Formal (Purple/Gold)</option>
                      <option value="binti">Binti Signature (Pink Header/Logo/ThankYou)</option>
                    </select>
                  </div>

                  <button
                    disabled={downloadingPdf}
                    onClick={() => generatePDF(selectedQuote)}
                    className="w-full py-2.5 bg-[#6B46C1] hover:bg-purple-800 text-white rounded-xl text-xs font-semibold flex items-center justify-center space-x-2 transition-all shadow-md shadow-[#6B46C1]/10 disabled:opacity-75"
                  >
                    {downloadingPdf ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Generating PDF Document...</span>
                      </>
                    ) : (
                      <>
                        <Download className="w-3.5 h-3.5" />
                        <span>Download PDF Document</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => handleOpenWhatsAppModal(selectedQuote)}
                    className="w-full py-2.5 bg-[#25D366] hover:bg-[#20bd5a] text-white rounded-xl text-xs font-bold flex items-center justify-center space-x-2 transition-all shadow-md shadow-[#25D366]/20"
                  >
                    <WhatsAppIcon className="w-4 h-4" />
                    <span>Send Quote via WhatsApp</span>
                  </button>

                  <button
                    onClick={() => handleOpenEmailModal(selectedQuote)}
                    className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center justify-center space-x-2 transition-all shadow-md shadow-blue-600/20"
                  >
                    <Mail className="w-4 h-4 text-blue-200" />
                    <span>Send Quote via Email</span>
                  </button>

                  <button
                    onClick={() => handleDraftEmail(selectedQuote)}
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

                  {selectedQuote.status !== "converted" && (
                    <button
                      disabled={convertingId === selectedQuote.id}
                      onClick={async () => {
                        setConvertingId(selectedQuote.id);
                        try {
                          await onConvertToInvoice(selectedQuote);
                        } finally {
                          setConvertingId(null);
                        }
                      }}
                      className="w-full py-2.5 bg-gradient-to-r from-[#D4AF37] to-amber-500 hover:from-amber-500 hover:to-[#D4AF37] text-[#1F2937] rounded-xl text-xs font-bold flex items-center justify-center space-x-2 transition-all disabled:opacity-60"
                    >
                      {convertingId === selectedQuote.id ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Converting to Live Invoice...</span>
                        </>
                      ) : (
                        <>
                          <ArrowRightLeft className="w-3.5 h-3.5" />
                          <span>Convert to live Invoice</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>

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
                        onClick={() => handleSendEmail(selectedQuote!)}
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
                          showToast("Draft email copied to clipboard!");
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

      {/* VIEW 3: QUOTE LISTING TABLE */}
      {!isCreating && !selectedQuote && (
        <div className="glass-card p-6 space-y-4">
          {/* Advanced Search & Filtering bar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            {/* Search query input */}
            <div className="relative flex-1 max-w-md">
              <span className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-gray-400" />
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search quotes by number, client name..."
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#6B46C1]/10 focus:border-[#6B46C1]"
              />
            </div>

            {/* Status filters */}
            <div className="flex items-center space-x-2 overflow-x-auto pb-1 md:pb-0">
              {["all", "draft", "sent", "converted", "expired"].map((status) => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors uppercase tracking-wider text-[10px] ${
                    statusFilter === status
                      ? "bg-[#6B46C1] text-white"
                      : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>

          {/* Quotes Listing */}
          <div className="overflow-x-auto border border-gray-50 rounded-xl">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-gray-50/80 border-b border-gray-100 text-gray-400 font-bold uppercase tracking-wider">
                  <th className="p-4">Quote Number</th>
                  <th className="p-4">Client Representative</th>
                  <th className="p-4">Quoted Date</th>
                  <th className="p-4">Expiry Date</th>
                  <th className="p-4">Grand Total</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 text-gray-700">
                {filteredQuotes.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-gray-400">
                      No event quotations match the filter requirements.
                    </td>
                  </tr>
                ) : (
                  filteredQuotes.map((quote) => (
                    <tr key={quote.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="p-4 font-bold text-[#6B46C1]">
                        <button
                          onClick={() => setSelectedQuote(quote)}
                          className="hover:underline text-left text-xs"
                        >
                          {quote.quoteNumber}
                        </button>
                      </td>
                      <td className="p-4 font-semibold text-gray-800">{quote.clientName}</td>
                      <td className="p-4 text-gray-500">{quote.quoteDate}</td>
                      <td className="p-4 text-gray-500">{quote.expiryDate}</td>
                      <td className="p-4 font-bold text-gray-900">{currency} {quote.grandTotal.toLocaleString()}</td>
                      <td className="p-4">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                          quote.status === "converted" ? "bg-green-100 text-green-700" :
                          quote.status === "sent" ? "bg-blue-100 text-blue-700" :
                          quote.status === "draft" ? "bg-gray-100 text-gray-600" :
                          "bg-red-100 text-red-700"
                        }`}>
                          {quote.status}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={() => setSelectedQuote(quote)}
                            className="p-1.5 text-gray-400 hover:text-[#6B46C1] hover:bg-purple-50 rounded-lg transition-all"
                            title="Preview Quote Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => handleOpenWhatsAppModal(quote)}
                            className="p-1.5 text-gray-400 hover:text-[#25D366] hover:bg-emerald-50 rounded-lg transition-all"
                            title="Send Quote via WhatsApp"
                          >
                            <WhatsAppIcon className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => handleOpenEmailModal(quote)}
                            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                            title="Send Quote via Email"
                          >
                            <Mail className="w-4 h-4" />
                          </button>
                          
                          {quote.status !== "converted" && (
                            <button
                              disabled={convertingId === quote.id}
                              onClick={async () => {
                                setConvertingId(quote.id);
                                try {
                                  await onConvertToInvoice(quote);
                                } finally {
                                  setConvertingId(null);
                                }
                              }}
                              className="p-1.5 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-all disabled:opacity-50"
                              title="Convert directly to Invoice"
                            >
                              {convertingId === quote.id ? (
                                <Loader2 className="w-4 h-4 animate-spin text-amber-600" />
                              ) : (
                                <ArrowRightLeft className="w-4 h-4" />
                              )}
                            </button>
                          )}
                          
                          <button
                            disabled={deletingId === quote.id}
                            onClick={async () => {
                              if (confirm("Are you sure you want to delete this quote?")) {
                                setDeletingId(quote.id);
                                try {
                                  await onDeleteQuote(quote.id);
                                } finally {
                                  setDeletingId(null);
                                }
                              }
                            }}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all disabled:opacity-50"
                            title="Delete Quote Permanently"
                          >
                            {deletingId === quote.id ? (
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
      {whatsAppModalOpen && whatsAppQuote && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white dark:bg-gray-900 rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-gray-100 dark:border-gray-800 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-800">
              <div className="flex items-center space-x-2.5">
                <div className="w-10 h-10 rounded-xl bg-[#25D366]/10 text-[#25D366] flex items-center justify-center">
                  <WhatsAppIcon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-gray-900 dark:text-white">Send Quotation via WhatsApp</h3>
                  <p className="text-[11px] text-gray-500 font-mono">Quote #{whatsAppQuote.quoteNumber}</p>
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
                    {pdfTemplate === 'binti' ? 'Binti Signature (Pink Header/Logo)' : 'Classic Formal (Purple/Gold)'}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={downloadingPdf}
                  onClick={() => generatePDF(whatsAppQuote)}
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
      {emailModalOpen && emailQuote && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white dark:bg-gray-900 rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-gray-100 dark:border-gray-800 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-800">
              <div className="flex items-center space-x-2.5">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center">
                  <Mail className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-gray-900 dark:text-white">Send Quotation via Email</h3>
                  <p className="text-[11px] text-gray-500 font-mono">Quote #{emailQuote.quoteNumber}</p>
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
                    {pdfTemplate === 'binti' ? 'Binti Signature (Pink Header/Logo)' : 'Classic Formal (Purple/Gold)'}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={downloadingPdf}
                  onClick={() => generatePDF(emailQuote)}
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
                    onClick={() => handleDraftEmail(emailQuote)}
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
