import { Invoice, Quote, Client, CompanySettings } from "../../../shared/types.js";

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
 * Constructs a structured WhatsApp message for an Invoice
 */
export function buildInvoiceWhatsAppMessage(
  invoice: Invoice,
  client?: Client | null,
  companySettings?: CompanySettings
): string {
  const companyName = companySettings?.companyName || "Binti Events";
  const clientName = client?.name || invoice.clientName || "Valued Client";
  const currency = companySettings?.currency || "KES";

  let itemsText = (invoice.items || [])
    .map((item, idx) => `  ${idx + 1}. *${item.description}* (x${item.quantity}) - ${currency} ${item.amount.toLocaleString()}`)
    .join("\n");

  if (!itemsText) {
    itemsText = `  • Total Invoice Amount: ${currency} ${invoice.grandTotal.toLocaleString()}`;
  }

  const dateFormatted = invoice.issueDate ? invoice.issueDate.split("T")[0] : "N/A";
  const dueDateFormatted = invoice.dueDate ? invoice.dueDate.split("T")[0] : "N/A";
  const balanceText = invoice.balanceRemaining !== undefined 
    ? `${currency} ${invoice.balanceRemaining.toLocaleString()}` 
    : `${currency} ${invoice.grandTotal.toLocaleString()}`;

  return `📄 *INVOICE: #${invoice.invoiceNumber}*
----------------------------------------
Dear *${clientName}*,

Here is your invoice summary from *${companyName}*:

• *Invoice Date:* ${dateFormatted}
• *Due Date:* ${dueDateFormatted}
• *Status:* ${invoice.status.toUpperCase()}

*Billed Services / Equipment:*
${itemsText}

----------------------------------------
*Grand Total:* ${currency} ${invoice.grandTotal.toLocaleString()}
*Balance Due:* ${balanceText}
----------------------------------------

*Payment Info & Inquiries:*
Please let us know once payment has been initiated.

Thank you for partnering with *${companyName}*!`;
}

/**
 * Constructs a structured WhatsApp message for a Quote
 */
export function buildQuoteWhatsAppMessage(
  quote: Quote,
  client?: Client | null,
  companySettings?: CompanySettings
): string {
  const companyName = companySettings?.companyName || "Binti Events";
  const clientName = client?.name || quote.clientName || "Valued Client";
  const currency = companySettings?.currency || "KES";

  let itemsText = (quote.items || [])
    .map((item, idx) => `  ${idx + 1}. *${item.description}* (x${item.quantity}) - ${currency} ${item.amount.toLocaleString()}`)
    .join("\n");

  if (!itemsText) {
    itemsText = `  • Total Quote Amount: ${currency} ${quote.grandTotal.toLocaleString()}`;
  }

  const quoteDateFormatted = quote.quoteDate ? quote.quoteDate.split("T")[0] : "N/A";
  const expiryDateFormatted = quote.expiryDate ? quote.expiryDate.split("T")[0] : "N/A";

  return `📋 *QUOTATION: #${quote.quoteNumber}*
----------------------------------------
Dear *${clientName}*,

Thank you for reaching out to *${companyName}*! Please review your custom quotation below:

• *Quote Date:* ${quoteDateFormatted}
• *Valid Until:* ${expiryDateFormatted}
• *Status:* ${quote.status.toUpperCase()}

*Proposed Services & Event Logistics:*
${itemsText}

----------------------------------------
*Estimated Total:* ${currency} ${quote.grandTotal.toLocaleString()}
----------------------------------------

Please review and confirm to reserve your event setup dates. Feel free to reply directly here if you have any questions or custom modifications!

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
