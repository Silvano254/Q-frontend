import assert from "node:assert/strict";
import test from "node:test";
import { normalizeMultilineText } from "./text.ts";

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
