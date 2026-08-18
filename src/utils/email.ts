import { Invoice, Quote, Client, CompanySettings } from "../types";

/**
 * Builds concise email subject and body for an Invoice
 */
export function buildInvoiceEmailContent(
  invoice: Invoice,
  client?: Client | null,
  companySettings?: CompanySettings,
  pdfTemplateStyle: string = "corporate"
): { subject: string; body: string } {
  const companyName = companySettings?.companyName || "Binti Events";
  const clientName = client?.name || invoice.clientName || "Valued Client";
  const currency = companySettings?.currency || "KES";
  const templateName = pdfTemplateStyle === 'binti' ? 'Binti Signature' : 'Classic Formal';

  const subject = `Invoice #${invoice.invoiceNumber} - ${companyName}`;

  const dateFormatted = invoice.issueDate ? invoice.issueDate.split("T")[0] : "N/A";
  const dueDateFormatted = invoice.dueDate ? invoice.dueDate.split("T")[0] : "N/A";
  const isPaid = invoice.status === 'paid' || (invoice.balanceRemaining !== undefined && invoice.balanceRemaining <= 0);
  const balanceText = isPaid 
    ? `${currency} 0 (Fully Paid)` 
    : (invoice.balanceRemaining !== undefined ? `${currency} ${invoice.balanceRemaining.toLocaleString()}` : `${currency} ${invoice.grandTotal.toLocaleString()}`);

  const body = `Dear ${clientName},

Please find attached your Tax Invoice (${invoice.invoiceNumber}) for recent event services from ${companyName}.

Invoice Summary:
----------------------------------------
• Invoice Number: #${invoice.invoiceNumber}
• Issue Date: ${dateFormatted}
• Payment Due Date: ${dueDateFormatted}
• Total Billed: ${currency} ${invoice.grandTotal.toLocaleString()}
• Balance Due: ${balanceText}
• Payment Status: ${isPaid ? 'Fully Paid / Settled' : (invoice.status || 'Pending').toUpperCase()}
• Document Style: ${templateName}
----------------------------------------

The official itemized PDF invoice document formatted using our ${templateName} template is attached to this dispatch for your accounting records.

If you have any questions or require custom payment terms, please feel free to reply directly to this email.

Thank you for choosing ${companyName}!

Warm regards,
${companyName} Logistics & Finance Desk`;

  return { subject, body };
}

/**
 * Builds concise email subject and body for a Quote
 */
export function buildQuoteEmailContent(
  quote: Quote,
  client?: Client | null,
  companySettings?: CompanySettings,
  pdfTemplateStyle: string = "corporate"
): { subject: string; body: string } {
  const companyName = companySettings?.companyName || "Binti Events";
  const clientName = client?.name || quote.clientName || "Valued Client";
  const currency = companySettings?.currency || "KES";
  const templateName = pdfTemplateStyle === 'binti' ? 'Binti Signature' : 'Classic Formal';

  const subject = `Quotation #${quote.quoteNumber} - ${companyName}`;

  const quoteDateFormatted = quote.quoteDate ? quote.quoteDate.split("T")[0] : "N/A";
  const expiryDateFormatted = quote.expiryDate ? quote.expiryDate.split("T")[0] : "N/A";

  const body = `Dear ${clientName},

Thank you for contacting ${companyName}! Please find attached your customized event quotation (${quote.quoteNumber}).

Quotation Summary:
----------------------------------------
• Quote Number: #${quote.quoteNumber}
• Quote Date: ${quoteDateFormatted}
• Valid Until: ${expiryDateFormatted}
• Estimated Total: ${currency} ${quote.grandTotal.toLocaleString()}
• Document Style: ${templateName}
----------------------------------------

The complete itemized PDF proposal document formatted with our ${templateName} design template is attached for your review.

Please let us know if you would like to confirm your reservation or adjust any logistics details.

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
