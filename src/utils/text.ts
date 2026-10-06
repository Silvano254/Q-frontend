/**
 * Text utility functions for Binti Events Management System
 */

/**
 * Normalizes multi-line text (e.g. Terms & Conditions, Bank Details, Email Templates),
 * properly preserving explicit newlines and splitting compacted numbered clauses.
 */
export function normalizeMultilineText(text?: string): string {
  if (!text) return "";
  
  // 1. Unescape escaped newlines/returns
  let cleaned = String(text)
    .replace(/\\r\\n/g, "\n")
    .replace(/\\n/g, "\n")
    .replace(/\\r/g, "\n")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n");

  // 2. Expand squashed numbered clauses even when the previous clause has no whitespace
  // before the next number (for example, "facilities2.").
  cleaned = cleaned.replace(/([^\s])(?=\d+\.\s+)/g, "$1\n");

  // 3. Trim extra blank lines and normalize line endings
  return cleaned
    .split("\n")
    .map(line => line.trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Default clauses used only when a quote has no custom terms. */
export const DEFAULT_QUOTE_TERMS = [
  "1. Client by making deposit payment authorizes Binti to supply the above facilities",
  "2. Payment of at least 70% confirms your booking; balance to be paid upon set up",
  "3. Cancellation policy: cancellation must be in writing. A month before the event: 50% refund, 2 weeks before 25% refund; less than a week: non refundable",
  "4. Client agrees to safeguard the equipment and be solely responsible for any loss or damage of the same that may occur during the period of hire",
  "5. Quote valid for 14 days",
  "6. Payment to be made via mpesa Paybill 222111, Account 2760684 to Binti Investments",
].join("\n");

/** Default clauses used only when an invoice has no custom terms. */
export const DEFAULT_INVOICE_TERMS = [
  "1. All amounts are stated in Kshs",
  "2. Payment terms: 70% deposit payable before delivery. Balance upon set up",
  "3. Payments to be made via Mpesa Paybill 222111 Account 2760684",
  "4. E & OE",
].join("\n");

/**
 * Repairs legacy terms that were stored with spaces between every character.
 * The boundary checks avoid joining ordinary prose that happens to contain
 * isolated single-letter tokens.
 */
function normalizeLegacyTermsLine(line: string): string {
  const tokens = line.trim().split(/\s+/);
  const singleLetterTokens = tokens.filter(token => /^[A-Za-z]$/.test(token)).length;
  if (singleLetterTokens < 5 || singleLetterTokens / tokens.length < 0.55) {
    return line.trim();
  }

  return line
    .split(/\s{2,}/)
    .map(segment => {
      const characters = segment.trim().split(/\s+/);
      const spacedCharacters = characters.filter(token => /^[A-Za-z0-9]$/.test(token)).length;
      return characters.length > 1 && spacedCharacters / characters.length >= 0.55
        ? characters.join("")
        : segment.trim();
    })
    .join(" ")
    .replace(/^(\d+)\s*\.\s*/, "$1. ")
    .replace(/\s+([,.;:!?%])/g, "$1")
    .trim();
}

/**
 * Normalizes terms for display, removing stray Markdown delimiters and
 * repairing legacy character spacing. Quote validity wording is omitted by
 * default, but quote documents can opt to retain it.
 */
export function normalizeDocumentTerms(
  text?: string,
  options: { preserveQuoteValidity?: boolean } = {},
): string[] {
  let normalized = normalizeMultilineText(text).replace(/`+/g, "");
  normalized = normalized.trim();

  if (!normalized) return [];

  return normalized
    .split(/\n+/)
    .map(line => {
      const withoutQuoteValidity = options.preserveQuoteValidity
        ? line
        : line.replace(/Quote valid for \d+ days\.?/gi, "");
      return normalizeLegacyTermsLine(withoutQuoteValidity.replace(/`+/g, ""));
    })
    .filter(Boolean)
    .filter(line => options.preserveQuoteValidity || !/^\d+\.$/.test(line));
}

/**
 * Prepares terms for PDF output, repairing legacy clauses that were stored with
 * spaces between every character while leaving normally spaced text untouched.
 */
export function normalizePdfTerms(
  text?: string,
  options: { preserveQuoteValidity?: boolean } = {},
): string[] {
  let normalized = normalizeMultilineText(text).replace(/`+/g, "");

  return normalized
    .split("\n")
    .map(line => {
      const withoutQuoteValidity = options.preserveQuoteValidity
        ? line
        : line.replace(/Quote valid for \d+ days\.?/gi, "");
      return normalizeLegacyTermsLine(withoutQuoteValidity);
    })
    .filter(Boolean)
    .filter(line => options.preserveQuoteValidity || !/^\d+\.$/.test(line));
}

/**
 * Generates next sequential identifier (e.g., INV-2026-001, QT-2026-001) based on pattern and existing records.
 */
export function generateNextDocumentNumber(
  prefixFormat: string, // e.g. "INV-2026-{SEQ}" or "QT-2026-{SEQ}"
  existingNumbers: string[],
  fallbackPrefix: string
): string {
  const currentYear = new Date().getFullYear();
  const formatTemplate = prefixFormat || `${fallbackPrefix}-${currentYear}-{SEQ}`;

  // Find all existing numbers matching sequence pattern
  let maxSeq = 0;
  existingNumbers.forEach(num => {
    if (!num) return;
    const match = num.match(/\d+$/);
    if (match) {
      const parsed = parseInt(match[0], 10);
      if (!isNaN(parsed) && parsed > maxSeq) {
        maxSeq = parsed;
      }
    }
  });

  const nextSeq = (maxSeq + 1).toString().padStart(3, "0");
  // Replace year tokens before {SEQ} — settings templates like "INV-{YYYY}-{SEQ}"
  // previously rendered the literal "{YYYY}" into document numbers/filenames.
  const resolvedTemplate = formatTemplate
    .replace(/\{YYYY\}/g, String(currentYear))
    .replace(/\{YY\}/g, String(currentYear).slice(-2));
  if (resolvedTemplate.includes("{SEQ}")) {
    return resolvedTemplate.replace("{SEQ}", nextSeq);
  }
  return `${resolvedTemplate}-${nextSeq}`;
}
