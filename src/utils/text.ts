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

  // 2. Expand squashed numbered clauses (e.g. "...crew.2. 20% final..." -> "...crew.\n2. 20% final...")
  cleaned = cleaned.replace(/([^\n])\s*(\b\d+\.\s+)/g, "$1\n$2");

  // 3. Trim extra blank lines and normalize line endings
  return cleaned
    .split("\n")
    .map(line => line.trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
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
  if (formatTemplate.includes("{SEQ}")) {
    return formatTemplate.replace("{SEQ}", nextSeq);
  }
  return `${formatTemplate}-${nextSeq}`;
}
