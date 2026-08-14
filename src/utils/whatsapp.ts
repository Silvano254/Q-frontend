import { Invoice, Quote, Client, CompanySettings } from "../types";

/**
 * Normalizes phone numbers to international format (e.g. 0712345678 -> 254712345678)
 */
export function formatWhatsAppPhone(phone?: string): string {
  if (!phone) return "";
  let cleaned = phone.replace(/[^\d+]/g, "");
  if (cleaned.startsWith("+")) {
    cleaned = cleaned.substring(1);
  } else if (cleaned.startsWith("0")) {
    cleaned = "254" + cleaned.substring(1); // Default Kenya international prefix for local numbers
  }
  return cleaned;
}

/**
 * Constructs a concise WhatsApp message for an Invoice
 */
export function buildInvoiceWhatsAppMessage(
  invoice: Invoice,
  client?: Client | null,
  companySettings?: CompanySettings,
  pdfTemplateStyle: string = "corporate"
): string {
  const companyName = companySettings?.companyName || "Binti Events";
  const clientName = client?.name || invoice.clientName || "Valued Client";
  const currency = companySettings?.currency || "KES";
  const dateFormatted = invoice.issueDate ? invoice.issueDate.split("T")[0] : "N/A";
  const dueDateFormatted = invoice.dueDate ? invoice.dueDate.split("T")[0] : "N/A";
  const balanceText = invoice.balanceRemaining !== undefined 
    ? `${currency} ${invoice.balanceRemaining.toLocaleString()}` 
    : `${currency} ${invoice.grandTotal.toLocaleString()}`;
  const templateName = pdfTemplateStyle === 'binti' ? 'Binti Signature' : 'Classic Corporate';

  return `📄 *INVOICE: #${invoice.invoiceNumber}*

Dear *${clientName}*,

Please find attached your Tax Invoice (*#${invoice.invoiceNumber}*) from *${companyName}*.

• *Issue Date:* ${dateFormatted}
• *Due Date:* ${dueDateFormatted}
• *Total Billed:* ${currency} ${invoice.grandTotal.toLocaleString()}
• *Balance Due:* ${balanceText}
• *PDF Document Template:* ${templateName}

The official itemized PDF invoice document has been generated for your record.

Thank you for choosing *${companyName}*!`;
}

/**
 * Constructs a concise WhatsApp message for a Quote
 */
export function buildQuoteWhatsAppMessage(
  quote: Quote,
  client?: Client | null,
  companySettings?: CompanySettings,
  pdfTemplateStyle: string = "corporate"
): string {
  const companyName = companySettings?.companyName || "Binti Events";
  const clientName = client?.name || quote.clientName || "Valued Client";
  const currency = companySettings?.currency || "KES";
  const quoteDateFormatted = quote.quoteDate ? quote.quoteDate.split("T")[0] : "N/A";
  const expiryDateFormatted = quote.expiryDate ? quote.expiryDate.split("T")[0] : "N/A";
  const templateName = pdfTemplateStyle === 'binti' ? 'Binti Signature' : 'Classic Corporate';

  return `📋 *QUOTATION: #${quote.quoteNumber}*

Dear *${clientName}*,

Please find attached your customized Quotation (*#${quote.quoteNumber}*) from *${companyName}*.

• *Quote Date:* ${quoteDateFormatted}
• *Valid Until:* ${expiryDateFormatted}
• *Estimated Total:* ${currency} ${quote.grandTotal.toLocaleString()}
• *PDF Document Template:* ${templateName}

The complete itemized PDF proposal document is attached for your review. Feel free to reply directly if you have any questions!

Warm regards,
*${companyName}*`;
}

/**
 * Launches WhatsApp Web / Mobile app directly with pre-populated phone number and text
 */
export function openWhatsApp(phone: string, text: string): void {
  const cleanPhone = formatWhatsAppPhone(phone);
  const encodedText = encodeURIComponent(text);
  const url = cleanPhone
    ? `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodedText}`
    : `https://api.whatsapp.com/send?text=${encodedText}`;
  window.open(url, "_blank");
}
