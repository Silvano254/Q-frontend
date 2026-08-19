/**
 * Enhanced Document Processing & Financial Extraction Utilities for Binti AI
 * Stage 1: Extraction & Parsing (CSV RFC-4180, JSON Structure, Multimodal Images, Binary PDF/Excel, File Size Guards)
 * Stage 2: Financial Document Interpretation (Normalizes receipts, invoices, and quotations)
 * Stage 3: Mathematical Reconciliation & Business Validation
 */

export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB limit for AI document processing

export interface ExtractedFinancialDocument {
  documentType:
    | "receipt"
    | "supplier_invoice"
    | "customer_invoice"
    | "bank_statement"
    | "quote"
    | "payment_proof"
    | "client_list"
    | "product_catalog"
    | "other";
  supplierName?: string;
  customerName?: string;
  documentNumber?: string;
  transactionDate?: string;
  subtotal?: number;
  taxAmount?: number;
  totalAmount?: number;
  currency?: string;
  category?: string;
  paymentReference?: string;
  items?: Array<{
    description: string;
    quantity?: number;
    unitPrice?: number;
    amount?: number;
  }>;
}

export interface FinancialReconciliationResult {
  isValid: boolean;
  isReconciled: boolean;
  calculatedSubtotal: number;
  calculatedTotal: number;
  statedTotal: number;
  discrepancies: string[];
  message: string;
}

export interface ParsedDocument {
  fileName: string;
  fileType: string;
  fileSize: number;
  mimeType: string;
  textContent?: string;
  extractedData?: {
    tables?: Array<{
      headers: string[];
      rows: string[][];
    }>;
    pages?: Array<{
      pageNumber: number;
      text: string;
    }>;
    images?: Array<{
      data: string;
      mimeType: string;
    }>;
    binaryData?: {
      data: string;
      mimeType: string;
    };
    financialDoc?: ExtractedFinancialDocument;
  };
  parseStatus: "success" | "partial" | "failed";
  parseError?: string;
}

/**
 * Robust RFC-4180 compliant CSV parser.
 * Handles commas inside double quotes, escaped quotes (""), newlines, and varied delimiters (, or ; or \t).
 */
export function parseRFC4180CSV(input: string): string[][] {
  const result: string[][] = [];
  let row: string[] = [];
  let currentVal = '';
  let inQuotes = false;
  let i = 0;

  // Auto-detect delimiter
  const firstLines = input.split(/\r?\n/).slice(0, 5).join('\n');
  let delimiter = ',';
  if (firstLines.includes('\t') && (firstLines.split('\t').length > firstLines.split(',').length)) {
    delimiter = '\t';
  } else if (firstLines.includes(';') && (firstLines.split(';').length > firstLines.split(',').length)) {
    delimiter = ';';
  }

  while (i < input.length) {
    const char = input[i];
    const nextChar = input[i + 1];

    if (inQuotes) {
      if (char === '"') {
        if (nextChar === '"') {
          currentVal += '"';
          i += 2;
          continue;
        } else {
          inQuotes = false;
          i++;
          continue;
        }
      } else {
        currentVal += char;
        i++;
        continue;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
        i++;
        continue;
      } else if (char === delimiter) {
        row.push(currentVal.trim());
        currentVal = '';
        i++;
        continue;
      } else if (char === '\r' || char === '\n') {
        if (char === '\r' && nextChar === '\n') {
          i++;
        }
        row.push(currentVal.trim());
        if (row.some(cell => cell.length > 0)) {
          result.push(row);
        }
        row = [];
        currentVal = '';
        i++;
        continue;
      } else {
        currentVal += char;
        i++;
        continue;
      }
    }
  }

  if (currentVal.length > 0 || row.length > 0) {
    row.push(currentVal.trim());
    if (row.some(cell => cell.length > 0)) {
      result.push(row);
    }
  }

  return result;
}

/**
 * Converts RFC-4180 CSV rows to key-value objects
 */
export function parseCsvRows(csvText: string): Array<Record<string, string>> {
  const table = parseRFC4180CSV(csvText);
  if (table.length < 2) return [];

  const headers = table[0].map(h => h.trim().replace(/^["']|["']$/g, ''));
  const records: Array<Record<string, string>> = [];

  for (let r = 1; r < table.length; r++) {
    const row = table[r];
    const obj: Record<string, string> = {};
    headers.forEach((header, idx) => {
      obj[header] = row[idx] !== undefined ? row[idx] : '';
    });
    records.push(obj);
  }

  return records;
}

/**
 * Stage 3: Mathematical Reconciliation & Business Validation for Financial Documents
 * Verifies that items sum to subtotal, and subtotal + tax reconcile with stated total amount.
 */
export function validateAndReconcileFinancialDoc(
  doc: ExtractedFinancialDocument
): FinancialReconciliationResult {
  const discrepancies: string[] = [];
  const curr = doc.currency || 'KES';

  // 1. Calculate sum of line items if present
  let itemsSum = 0;
  if (doc.items && doc.items.length > 0) {
    itemsSum = doc.items.reduce((sum, item) => {
      const itemAmt = item.amount !== undefined && item.amount !== null
        ? Number(item.amount)
        : (Number(item.quantity || 1) * Number(item.unitPrice || 0));
      return sum + itemAmt;
    }, 0);
  }

  const statedSubtotal = doc.subtotal !== undefined && doc.subtotal !== null ? Number(doc.subtotal) : (itemsSum > 0 ? itemsSum : 0);
  const statedTax = doc.taxAmount !== undefined && doc.taxAmount !== null ? Number(doc.taxAmount) : 0;
  const statedTotal = doc.totalAmount !== undefined && doc.totalAmount !== null ? Number(doc.totalAmount) : (statedSubtotal + statedTax);

  const calculatedSubtotal = itemsSum > 0 ? itemsSum : statedSubtotal;
  const calculatedTotal = calculatedSubtotal + statedTax;

  // Check line items against subtotal
  if (itemsSum > 0 && Math.abs(itemsSum - statedSubtotal) > 1) {
    discrepancies.push(`Line items sum (${curr} ${itemsSum.toLocaleString()}) does not match stated subtotal (${curr} ${statedSubtotal.toLocaleString()}).`);
  }

  // Check subtotal + tax against stated total
  if (Math.abs(calculatedTotal - statedTotal) > 1) {
    discrepancies.push(`Subtotal + Tax (${curr} ${calculatedTotal.toLocaleString()}) does not match stated total (${curr} ${statedTotal.toLocaleString()}).`);
  }

  const isReconciled = discrepancies.length === 0;
  const message = isReconciled
    ? `The extracted figures reconcile correctly (${curr} ${statedTotal.toLocaleString()}).`
    : `Figure discrepancy detected: ${discrepancies.join(' ')}`;

  return {
    isValid: statedTotal > 0,
    isReconciled,
    calculatedSubtotal,
    calculatedTotal,
    statedTotal,
    discrepancies,
    message
  };
}

/**
 * Stage 1: Reads and extracts raw/structured data from a user-uploaded File
 */
export async function parseUploadedDocument(file: File): Promise<ParsedDocument> {
  const fileName = file.name;
  const fileType = file.name.split('.').pop()?.toLowerCase() || 'unknown';
  const fileSize = file.size;
  const mimeType = file.type || 'application/octet-stream';

  // Guard: File Size Limit
  if (fileSize > MAX_FILE_SIZE) {
    return {
      fileName,
      fileType,
      fileSize,
      mimeType,
      parseStatus: 'failed',
      parseError: `File size (${(fileSize / (1024 * 1024)).toFixed(1)} MB) exceeds the 10 MB limit for Binti AI document processing.`
    };
  }

  return new Promise((resolve) => {
    // 1. Text, JSON, and CSV Formats
    if (
      fileType === 'csv' || 
      fileType === 'txt' || 
      fileType === 'json' || 
      fileType === 'tsv' ||
      fileType === 'md' ||
      mimeType.startsWith('text/') ||
      mimeType === 'application/json'
    ) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const textContent = (e.target?.result as string) || '';
        let tables: Array<{ headers: string[]; rows: string[][] }> | undefined;
        let financialDoc: ExtractedFinancialDocument | undefined;

        // JSON Parsing & Structured Normalization
        if (fileType === 'json' || mimeType === 'application/json') {
          try {
            const parsedJson = JSON.parse(textContent);
            if (Array.isArray(parsedJson) && parsedJson.length > 0 && typeof parsedJson[0] === 'object' && parsedJson[0] !== null) {
              const headers = Object.keys(parsedJson[0]);
              tables = [{
                headers,
                rows: parsedJson.map(item => headers.map(h => (item[h] !== undefined ? String(item[h]) : '')))
              }];
            } else if (typeof parsedJson === 'object' && parsedJson !== null) {
              if (parsedJson.documentType || parsedJson.totalAmount || parsedJson.supplierName || parsedJson.items) {
                financialDoc = {
                  documentType: parsedJson.documentType || 'other',
                  supplierName: parsedJson.supplierName,
                  customerName: parsedJson.customerName,
                  documentNumber: parsedJson.documentNumber,
                  transactionDate: parsedJson.transactionDate,
                  subtotal:
                    parsedJson.subtotal !== undefined && parsedJson.subtotal !== null
                      ? Number(parsedJson.subtotal)
                      : undefined,
                  taxAmount:
                    parsedJson.taxAmount !== undefined && parsedJson.taxAmount !== null
                      ? Number(parsedJson.taxAmount)
                      : undefined,
                  totalAmount:
                    parsedJson.totalAmount !== undefined && parsedJson.totalAmount !== null
                      ? Number(parsedJson.totalAmount)
                      : undefined,
                  currency: parsedJson.currency || 'KES',
                  category: parsedJson.category,
                  paymentReference: parsedJson.paymentReference,
                  items: parsedJson.items
                };
              }
            }
          } catch {
            // Keep textContent, continue as text
          }
        }

        // CSV & TSV Parsing
        if (fileType === 'csv' || fileType === 'tsv' || (fileType !== 'json' && textContent.includes(','))) {
          const rawTable = parseRFC4180CSV(textContent);
          if (rawTable.length > 0) {
            tables = [{
              headers: rawTable[0] || [],
              rows: rawTable.slice(1)
            }];
          }
        }

        resolve({
          fileName,
          fileType,
          fileSize,
          mimeType,
          textContent,
          extractedData: {
            tables,
            financialDoc
          },
          parseStatus: 'success'
        });
      };
      reader.onerror = () => {
        resolve({
          fileName,
          fileType,
          fileSize,
          mimeType,
          parseStatus: 'failed',
          parseError: 'Could not read text from document.'
        });
      };
      reader.readAsText(file);
      return;
    }

    // 2. Images (Receipts, Photos, Slips)
    if (mimeType.startsWith('image/') || ['jpg', 'jpeg', 'png', 'webp', 'heic'].includes(fileType)) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = (e.target?.result as string) || '';
        const base64Data = dataUrl.split(',')[1] || '';

        resolve({
          fileName,
          fileType,
          fileSize,
          mimeType: mimeType || 'image/jpeg',
          textContent: `[Image Document: ${fileName}, Type: ${fileType.toUpperCase()}, Size: ${(fileSize / 1024).toFixed(1)} KB]`,
          extractedData: {
            images: [{
              data: base64Data,
              mimeType: mimeType || 'image/jpeg'
            }]
          },
          parseStatus: 'success'
        });
      };
      reader.onerror = () => {
        resolve({
          fileName,
          fileType,
          fileSize,
          mimeType,
          parseStatus: 'failed',
          parseError: 'Failed to process receipt image.'
        });
      };
      reader.readAsDataURL(file);
      return;
    }

    // 3. Binary Documents (PDF, Excel, Word, etc.)
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = (e.target?.result as string) || '';
      const base64Data = dataUrl.split(',')[1] || '';

      resolve({
        fileName,
        fileType,
        fileSize,
        mimeType,
        textContent: `[Binary Document: ${fileName} (${fileType.toUpperCase()}), Size: ${(fileSize / 1024).toFixed(1)} KB]`,
        extractedData: {
          binaryData: {
            data: base64Data,
            mimeType: mimeType || 'application/pdf'
          }
        },
        parseStatus: 'success'
      });
    };
    reader.onerror = () => {
      resolve({
        fileName,
        fileType,
        fileSize,
        mimeType,
        parseStatus: 'failed',
        parseError: 'Failed to load binary document.'
      });
    };
    reader.readAsDataURL(file);
  });
}
