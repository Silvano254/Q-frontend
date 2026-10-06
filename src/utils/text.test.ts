import assert from "node:assert/strict";
import test from "node:test";
import { DEFAULT_INVOICE_TERMS, DEFAULT_QUOTE_TERMS, normalizeDocumentTerms, normalizeMultilineText, normalizePdfTerms } from "./text.ts";

test("normalizes concatenated numbered clauses into separate lines", () => {
  const input = [
    "1. Client by making deposit payment authorizes Binti to supply the above facilities2.",
    "Payment of at least 70% confirms your booking; balance to be paid upon set up3.",
    "Cancellation policy: cancellation must be in writing. A month before the event: 50% refund, 2 weeks before 25% refund; less than a week: non refundable4.",
    "Client agrees to safeguard the equipment and be solely responsible for any loss or damage of the same that may occur during the period of hire5.",
    "Quote valid for 14 days6.",
    "Payment to be made via mpesa Paybill 222111, Account 2760684 to Binti Investments",
  ].join(" ");

  const output = normalizeMultilineText(input);
  const lines = output.split("\n");

  assert.equal(lines.length, 6);
  assert.match(lines[0], /^1\./);
  assert.match(lines[1], /^2\./);
  assert.match(lines[2], /^3\./);
  assert.match(lines[3], /^4\./);
  assert.match(lines[4], /^5\./);
  assert.match(lines[5], /^6\./);
});

test("repairs character-spaced terms without removing word boundaries", () => {
  const input = "2. P a y m e n t  o f  a t  l e a s t  7 0 %  c o n f i r m s  y o u r  b o o k i n g";

  assert.deepEqual(normalizePdfTerms(input), ["2. Payment of at least 70% confirms your booking"]);
});

test("repairs character-spaced terms in preview output", () => {
  const input = "1. P a y m e n t  o f  a t  l e a s t  7 0 %  c o n f i r m s  y o u r  b o o k i n g";

  assert.deepEqual(normalizeDocumentTerms(input), [
    "1. Payment of at least 70% confirms your booking",
  ]);
});

test("keeps quote-validity wording only when requested", () => {
  const input = "1. Payment confirms the booking.\n2. Quote valid for 14 days\n3. Final payment is due before setup.";

  assert.deepEqual(normalizePdfTerms(input), [
    "1. Payment confirms the booking.",
    "3. Final payment is due before setup.",
  ]);
  assert.deepEqual(normalizePdfTerms(input, { preserveQuoteValidity: true }), [
    "1. Payment confirms the booking.",
    "2. Quote valid for 14 days",
    "3. Final payment is due before setup.",
  ]);
  assert.deepEqual(normalizeDocumentTerms(input, { preserveQuoteValidity: true }), [
    "1. Payment confirms the booking.",
    "2. Quote valid for 14 days",
    "3. Final payment is due before setup.",
  ]);
});

test("removes quote validity without merging the following numbered clause", () => {
  const input = "1. Equipment must be returned in good condition. Quote valid for 14 days6. Payment is due before setup.";

  assert.deepEqual(normalizePdfTerms(input), [
    "1. Equipment must be returned in good condition.",
    "6. Payment is due before setup.",
  ]);
});

test("quote defaults contain all six requested clauses in order", () => {
  assert.deepEqual(normalizePdfTerms(DEFAULT_QUOTE_TERMS, { preserveQuoteValidity: true }), [
    "1. Client by making deposit payment authorizes Binti to supply the above facilities",
    "2. Payment of at least 70% confirms your booking; balance to be paid upon set up",
    "3. Cancellation policy: cancellation must be in writing. A month before the event: 50% refund, 2 weeks before 25% refund; less than a week: non refundable",
    "4. Client agrees to safeguard the equipment and be solely responsible for any loss or damage of the same that may occur during the period of hire",
    "5. Quote valid for 14 days",
    "6. Payment to be made via mpesa Paybill 222111, Account 2760684 to Binti Investments",
  ]);
});

test("invoice defaults contain the four requested clauses in order", () => {
  assert.deepEqual(normalizePdfTerms(DEFAULT_INVOICE_TERMS), [
    "1. All amounts are stated in Kshs",
    "2. Payment terms: 70% deposit payable before delivery. Balance upon set up",
    "3. Payments to be made via Mpesa Paybill 222111 Account 2760684",
    "4. E & OE",
  ]);
});

test("removes stray backticks and creates a structured terms list", () => {
  const input = "1. First term`\n2. Second term `\n3. Third term";

  assert.deepEqual(normalizeDocumentTerms(input), [
    "1. First term",
    "2. Second term",
    "3. Third term",
  ]);
});
