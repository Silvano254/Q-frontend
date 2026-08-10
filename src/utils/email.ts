import { Invoice, Quote, Client, CompanySettings } from "../../../shared/types.js";

/**
 * Builds structured email subject and body for an Invoice
 */
export function buildInvoiceEmailContent(
  invoice: Invoice,
  client?: Client | null,
  companySettings?: CompanySettings
): { subject: string; body: string } {
  const companyName = companySettings?.companyName || "Binti Events";
  const clientName = client?.name || invoice.clientName || "Valued Client";
  const currency = companySettings?.currency || "KES";

  const subject = `Invoice #${invoice.invoiceNumber} from ${companyName}`;

  let itemsText = (invoice.items || [])
    .map((item, idx) => `  ${idx + 1}. ${item.description} (Qty: ${item.quantity}) - ${currency} ${item.amount.toLocaleString()}`)
    .join("\n");

  if (!itemsText) {
    itemsText = `  • Total Invoice Amount: ${currency} ${invoice.grandTotal.toLocaleString()}`;
  }

  const dateFormatted = invoice.issueDate ? invoice.issueDate.split("T")[0] : "N/A";
  const dueDateFormatted = invoice.dueDate ? invoice.dueDate.split("T")[0] : "N/A";
  const balanceText = invoice.balanceRemaining !== undefined 
    ? `${currency} ${invoice.balanceRemaining.toLocaleString()}` 
    : `${currency} ${invoice.grandTotal.toLocaleString()}`;

  const body = `Dear ${clientName},

Please find below your invoice summary for recent event services from ${companyName}.

Invoice Details:
----------------------------------------
• Invoice Number: #${invoice.invoiceNumber}
• Issue Date: ${dateFormatted}
• Payment Due Date: ${dueDateFormatted}
• Status: ${invoice.status.toUpperCase()}

Billed Services / Equipment:
${itemsText}

----------------------------------------
Grand Total: ${currency} ${invoice.grandTotal.toLocaleString()}
Balance Remaining: ${balanceText}
----------------------------------------

Payment Instructions & Logistics:
Please initiate payment on or before the due date. Once payment has been completed, kindly notify us so we can issue your official payment receipt.

If you have any questions or require custom corporate billing split options, please feel free to reply directly to this email.

Thank you for choosing ${companyName}!

Warm regards,
${companyName} Logistics & Finance Desk`;

  return { subject, body };
}

/**
 * Builds structured email subject and body for a Quote
 */
export function buildQuoteEmailContent(
  quote: Quote,
  client?: Client | null,
  companySettings?: CompanySettings
): { subject: string; body: string } {
  const companyName = companySettings?.companyName || "Binti Events";
  const clientName = client?.name || quote.clientName || "Valued Client";
  const currency = companySettings?.currency || "KES";

  const subject = `Quotation #${quote.quoteNumber} from ${companyName}`;

  let itemsText = (quote.items || [])
    .map((item, idx) => `  ${idx + 1}. ${item.description} (Qty: ${item.quantity}) - ${currency} ${item.amount.toLocaleString()}`)
    .join("\n");

  if (!itemsText) {
    itemsText = `  • Total Quote Amount: ${currency} ${quote.grandTotal.toLocaleString()}`;
  }

  const quoteDateFormatted = quote.quoteDate ? quote.quoteDate.split("T")[0] : "N/A";
  const expiryDateFormatted = quote.expiryDate ? quote.expiryDate.split("T")[0] : "N/A";

  const body = `Dear ${clientName},

Thank you for contacting ${companyName}! We are pleased to provide you with your customized event quotation below:

Quotation Summary:
----------------------------------------
• Quote Number: #${quote.quoteNumber}
• Quote Date: ${quoteDateFormatted}
• Valid Until: ${expiryDateFormatted}
• Status: ${quote.status.toUpperCase()}

Proposed Services & Logistics breakdown:
${itemsText}

----------------------------------------
Estimated Total: ${currency} ${quote.grandTotal.toLocaleString()}
----------------------------------------

Next Steps:
Please review the proposed breakdown. To confirm booking and reserve your event setup dates, reply directly to this email or contact our event coordinator desk.

Warm regards,
${companyName} Consulting Team`;

  return { subject, body };
}

/**
 * Opens desktop/mobile default mail client with mailto URL
 */
export function openMailClient(to: string, subject: string, body: string): void {
  const mailtoUrl = `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  window.open(mailtoUrl, "_blank");
}
