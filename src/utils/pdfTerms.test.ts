import assert from "node:assert/strict";
import test from "node:test";
import { renderPdfClauses } from "./pdfTerms.ts";

type DrawCall = { line: string; x: number; y: number };

/** Minimal jsPDF stand-in that records every draw call. */
function createFakeDoc() {
  const calls: DrawCall[] = [];
  const charWidth = 1.5;
  return {
    calls,
    getTextWidth: (s: string) => s.length * charWidth,
    splitTextToSize: (text: string, width: number): string[] => {
      const maxChars = Math.max(1, Math.floor(width / charWidth));
      const words = String(text).split(/\s+/);
      const lines: string[] = [];
      let current = "";
      for (const word of words) {
        const candidate = current ? `${current} ${word}` : word;
        if (candidate.length > maxChars && current) {
          lines.push(current);
          current = word;
        } else {
          current = candidate;
        }
      }
      if (current) lines.push(current);
      return lines;
    },
    text: (line: string | string[], x: number, y: number) => {
      const arr = Array.isArray(line) ? line : [line];
      arr.forEach(l => calls.push({ line: l, x, y }));
    },
  } as any;
}

test("numbered clauses render with a hanging indent for wrapped lines", () => {
  const doc = createFakeDoc();
  const x = 20;
  const clauses = [
    "1. A very long clause that is guaranteed to wrap across several lines so the continuation lines must align under the clause text rather than under the number",
    "2. Short clause",
  ];

  renderPdfClauses(doc, 10, clauses, { x, width: 60, autoNumber: false });

  const prefixIndent = doc.getTextWidth("1. ");
  const numberedLines = doc.calls.filter((c: DrawCall) => c.line !== "2. Short clause");
  assert.ok(numberedLines.length >= 2, "long clause should wrap");
  assert.equal(numberedLines[0].x, x, "first line starts at margin");
  for (const call of numberedLines.slice(1)) {
    assert.equal(call.x, x + prefixIndent, "continuation lines hang-indent under the text");
  }

  const shortClause = doc.calls.find((c: DrawCall) => c.line === "2. Short clause");
  assert.ok(shortClause, "short clause rendered");
  assert.equal(shortClause.x, x, "every clause number sits in the margin column");
});

test("autoNumber renumbers clauses sequentially and keeps lines aligned", () => {
  const doc = createFakeDoc();
  const x = 15;

  renderPdfClauses(doc, 10, ["Unnumbered clause", "7. Old numbering", ""], {
    x,
    width: 60,
    autoNumber: true,
  });

  const numbered = doc.calls.map((c: DrawCall) => c.line).filter((l: string) => /^\d+\./.test(l));
  assert.equal(numbered[0], "1. Unnumbered clause");
  assert.equal(numbered[1], "2. Old numbering");
  const allX = doc.calls.map((c: DrawCall) => c.x);
  assert.deepEqual([...new Set(allX)].length, 1, "single-line clauses all align at the same x");
});
