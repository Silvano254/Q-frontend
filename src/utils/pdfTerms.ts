import type { jsPDF } from "jspdf";

/**
 * Shared PDF renderer for numbered clauses (Terms & Conditions, payment
 * instructions) with a proper hanging indent.
 *
 * The old inline loops wrapped "1. clause text…" with splitTextToSize across
 * the full width, so continuation lines started under the number instead of
 * under the clause text — the left edge looked crooked/misaligned once any
 * clause wrapped. This renderer:
 *  - keeps every clause number in the margin column,
 *  - wraps the clause TEXT into (width - numberWidth),
 *  - draws continuation lines at x + numberWidth (aligned under the text),
 *  - optionally renumbers clauses sequentially (autoNumber) so filtered or
 *    legacy lines can never drift out of order.
 *
 * `ensureSpace(needed, currentY)` is called before each clause and must return
 * the y to draw from — callers pass a wrapper around their closure-scoped
 * ensurePageSpace() so page breaks stay in sync with the shared `y` variable.
 */
export interface PdfClauseOptions {
  /** Left x position (margin). */
  x: number;
  /** Total available width in document units. */
  width: number;
  /** Line height inside a clause (default 4.0). */
  lineHeight?: number;
  /** Extra spacing after each clause (default 1.5). */
  gap?: number;
  /** When true every clause is renumbered sequentially (1..n). */
  autoNumber?: boolean;
  /** Page-break hook; returns the y to continue drawing from. */
  ensureSpace?: (needed: number, currentY: number) => number;
}

export function renderPdfClauses(
  doc: jsPDF,
  startY: number,
  clauses: string[],
  options: PdfClauseOptions
): number {
  const lineHeight = options.lineHeight ?? 4.0;
  const gap = options.gap ?? 1.5;
  let y = startY;
  let counter = 0;

  for (const raw of clauses) {
    const clause = String(raw ?? "").trim();
    if (!clause) continue;

    const numbered = clause.match(/^(\d+)\.\s+([\s\S]*)$/);
    let prefix = "";
    let text = clause;
    if (options.autoNumber) {
      counter += 1;
      prefix = `${counter}. `;
      text = numbered ? numbered[2] : clause;
    } else if (numbered) {
      prefix = `${numbered[1]}. `;
      text = numbered[2];
    }

    const indent = prefix ? doc.getTextWidth(prefix) : 0;
    const wrapWidth = Math.max(options.width - indent, 30);
    const wrapped = doc.splitTextToSize(text || " ", wrapWidth);
    const lines: string[] = Array.isArray(wrapped) ? wrapped : [wrapped];
    if (lines.length === 0) continue;

    if (options.ensureSpace) {
      y = options.ensureSpace(lines.length * lineHeight + gap + 2, y);
    }

    doc.text(prefix + lines[0], options.x, y);
    for (let i = 1; i < lines.length; i += 1) {
      y += lineHeight;
      doc.text(lines[i], options.x + indent, y);
    }
    y += lineHeight + gap;
  }

  return y;
}
