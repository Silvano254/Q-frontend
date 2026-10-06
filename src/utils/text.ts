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

/**
 * Normalizes terms for display and PDF use, removing stray Markdown delimiters,
 * repairing squashed numbering, and excluding quote-only validity wording from
 * invoice content.
 */
export function normalizeDocumentTerms(text?: string, options: { invoice?: boolean } = {}): string[] {
  const normalized = normalizeMultilineText(text)
    .replace(/`+/g, "")
    .replace(/\s*Quote valid for \d+ days\s*/gi, " ")
    .trim();

  if (!normalized) return [];

  return normalized
    .split(/\n+/)
    .map(line => line.replace(/`+/g, "").trim())
    .filter(Boolean)
    .filter(line => !options.invoice || !/^\s*Quote valid for \d+ days\s*$/i.test(line));
}

/**
 * Prepares terms for PDF output, repairing legacy clauses that were stored with
 * spaces between every character while leaving normally spaced text untouched.
 */
export function normalizePdfTerms(text?: string): string[] {
  return normalizeMultilineText(text)
    .replace(/`+/g, "")
    .replace(/\s*Quote valid for \d+ days\s*/gi, " ")
    .split("\n")
    .map(line => {
      const tokens = line.trim().split(/\s+/);
      const singleLetterTokens = tokens.filter(token => /^[A-Za-z]$/.test(token)).length;
      if (singleLetterTokens < 5 || singleLetterTokens / tokens.length < 0.55) return line.trim();

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
    })
    .filter(Boolean);
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
