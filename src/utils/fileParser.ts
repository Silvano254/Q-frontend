/**
 * Enhanced Document Processing & Financial Extraction Utilities for Binti AI
 * Stage 1: Extraction & Parsing (Excel XLSX/XLS with SheetJS, PapaParse CSV, Day.js dates, JSON, Multimodal Images, Binary PDF, File Size Guards)
 * Stage 2: Financial Document Interpretation (Normalizes receipts, invoices, and quotations)
 * Stage 3: Mathematical Reconciliation & Business Validation
 */

import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import dayjs from 'dayjs';

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
      name?: string;
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
 * Normalizes varied date formats into ISO YYYY-MM-DD using Day.js
 */
export function normalizeDate(rawDate?: string | number | Date): string | undefined {
  if (!rawDate) return undefined;
  const d = dayjs(rawDate);
  return d.isValid() ? d.format('YYYY-MM-DD') : undefined;
}

/**
 * High-performance RFC-4180 compliant CSV parser powered by PapaParse.
 * Handles quoted commas, escaped quotes, multiline values, and auto-detects delimiters.
 */
export function parseRFC4180CSV(input: string): string[][] {
  const parsed = Papa.parse<string[]>(input, {
    skipEmptyLines: 'greedy',
    delimiter: '' // Auto-detect delimiter
  });
  return (parsed.data || []).filter(row => Array.isArray(row) && row.some(cell => String(cell).trim() !== ''));
}

/**
 * Converts CSV rows to key-value objects using PapaParse
 */
export function parseCsvRows(csvText: string): Array<Record<string, string>> {
  const parsed = Papa.parse<Record<string, string>>(csvText, {
    header: true,
    skipEmptyLines: 'greedy',
    transformHeader: (h) => h.trim().replace(/^["']|["']$/g, '')
  });
  return parsed.data || [];
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

export type StepCallback = (step: { title: string; detail?: string; status: 'in_progress' | 'complete' | 'failed' }) => void;

/**
 * Stage 1: Reads and extracts real structured data from a user-uploaded File
 */
export async function parseUploadedDocument(file: File, onStep?: StepCallback): Promise<ParsedDocument> {
  const fileName = file.name;
  const fileType = file.name.split('.').pop()?.toLowerCase() || 'unknown';
  const fileSize = file.size;
  const mimeType = file.type || 'application/octet-stream';

  onStep?.({
    title: `Reading uploaded file "${fileName}"`,
    detail: `Validating format (${fileType.toUpperCase()}) and size (${(fileSize / 1024).toFixed(1)} KB)`,
    status: 'in_progress'
  });

  // Guard: File Size Limit
  if (fileSize > MAX_FILE_SIZE) {
    onStep?.({
      title: `File size limit exceeded`,
      detail: `${(fileSize / (1024 * 1024)).toFixed(1)} MB exceeds 10 MB limit`,
      status: 'failed'
    });
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
    // 1. Excel Spreadsheets (XLSX, XLS, ODS)
    if (
      fileType === 'xlsx' || 
      fileType === 'xls' || 
      fileType === 'ods' ||
      mimeType.includes('spreadsheet') ||
      mimeType.includes('excel')
    ) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const buffer = e.target?.result as ArrayBuffer;
          const workbook = XLSX.read(buffer, { type: 'array' });
          const allTables: Array<{ name?: string; headers: string[]; rows: string[][] }> = [];
          
          onStep?.({
            title: `Unpacked Excel workbook with SheetJS`,
            detail: `Found ${workbook.SheetNames.length} worksheets: ${workbook.SheetNames.join(', ')}`,
            status: 'complete'
          });
          
          interface SheetMetric {
            name: string;
            rowCount: number;
            columns: string[];
            numericMetrics: Record<string, { sum: number; count: number; avg: number }>;
            sampleRows: string[][];
          }

          const sheetMetrics: SheetMetric[] = [];
          let totalRowsCount = 0;

          workbook.SheetNames.forEach((sheetName) => {
            const worksheet = workbook.Sheets[sheetName];
            const rawGrid: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
            if (rawGrid.length === 0) return;

            const headers = rawGrid[0].map(h => String(h || '').trim()).filter(Boolean);
            const dataRows = rawGrid.slice(1).filter(r => r.some((c: any) => String(c).trim() !== ''));
            totalRowsCount += dataRows.length;

            // Compute column-by-column metrics for every numeric / financial column
            const numericMetrics: Record<string, { sum: number; count: number; avg: number }> = {};
            
            headers.forEach((header, colIdx) => {
              const lower = header.toLowerCase();
              const isFinancialOrNumeric = /amount|total|paid|balance|price|revenue|turnover|subtotal|vat|grand_total|fee|cost|rate|discount|qty|quantity|count/i.test(lower);
              
              if (isFinancialOrNumeric) {
                let colSum = 0;
                let colCount = 0;
                dataRows.forEach(row => {
                  const rawVal = row[colIdx];
                  if (rawVal !== undefined && rawVal !== null && String(rawVal).trim() !== '') {
                    const parsedNum = typeof rawVal === 'number' ? rawVal : parseFloat(String(rawVal).replace(/[^0-9.-]+/g, ''));
                    if (!isNaN(parsedNum)) {
                      colSum += parsedNum;
                      colCount++;
                    }
                  }
                });
                if (colCount > 0) {
                  numericMetrics[header] = {
                    sum: colSum,
                    count: colCount,
                    avg: Math.round(colSum / colCount)
                  };
                }
              }
            });

            // Store preview rows (first 25 rows) to conserve memory
            const sampleRows = dataRows.slice(0, 25).map(r => 
              headers.map((_, idx) => String(r[idx] !== undefined ? r[idx] : '').trim())
            );

            sheetMetrics.push({
              name: sheetName,
              rowCount: dataRows.length,
              columns: headers,
              numericMetrics,
              sampleRows
            });

            allTables.push({
              name: sheetName,
              headers,
              rows: sampleRows
            });

            onStep?.({
              title: `Audited worksheet "${sheetName}" (${dataRows.length.toLocaleString()} rows)`,
              detail: Object.keys(numericMetrics).length > 0 
                ? `Calculated sums: ${Object.entries(numericMetrics).map(([k, v]) => `${k} (KES ${v.sum.toLocaleString()})`).join(', ')}`
                : `${headers.length} columns detected`,
              status: 'complete'
            });
          });

          // Detect Key Business Entities per sheet
          const clientsSheet = sheetMetrics.find(s => /client|customer|member|user|lead|contact/i.test(s.name));
          const invoicesSheet = sheetMetrics.find(s => /invoice|billing|bill/i.test(s.name));
          const quotesSheet = sheetMetrics.find(s => /quote|proposal|estimate/i.test(s.name));
          const paymentsSheet = sheetMetrics.find(s => /payment|receipt|transaction/i.test(s.name));
          const inventorySheet = sheetMetrics.find(s => /inventory|product|service|equipment|stock|item|package/i.test(s.name));

          const detectedSummaries: string[] = [];
          if (clientsSheet) detectedSummaries.push(`${clientsSheet.rowCount.toLocaleString()} clients`);
          if (invoicesSheet) detectedSummaries.push(`${invoicesSheet.rowCount.toLocaleString()} invoices`);
          if (quotesSheet) detectedSummaries.push(`${quotesSheet.rowCount.toLocaleString()} quotes`);
          if (inventorySheet) detectedSummaries.push(`${inventorySheet.rowCount.toLocaleString()} catalog items`);

          if (detectedSummaries.length > 0) {
            onStep?.({
              title: `Identified business entities in "${fileName}"`,
              detail: `Extracted: ${detectedSummaries.join(' • ')}`,
              status: 'complete'
            });
          }

          // Build a crystal-clear, structured Factual Digest for the AI model
          let textDigest = `### 📊 SPREADSHEET ANALYSIS & AUDIT REPORT\n`;
          textDigest += `**File Name:** ${fileName}\n`;
          textDigest += `**Total Worksheets:** ${workbook.SheetNames.length} (${workbook.SheetNames.join(', ')})\n`;
          textDigest += `**Total Across All Sheets:** ${totalRowsCount.toLocaleString()} data rows\n\n`;

          textDigest += `### 🏢 DETECTED BUSINESS ENTITIES & EXACT COUNTS\n`;
          if (clientsSheet) {
            textDigest += `• **Client Records:** **${clientsSheet.rowCount.toLocaleString()} clients** in sheet "${clientsSheet.name}"\n`;
          }
          if (invoicesSheet) {
            const invTotal = Object.entries(invoicesSheet.numericMetrics).find(([k]) => /total|amount|grand/i.test(k));
            const invPaid = Object.entries(invoicesSheet.numericMetrics).find(([k]) => /paid|received/i.test(k));
            const invBal = Object.entries(invoicesSheet.numericMetrics).find(([k]) => /balance|due|outstanding/i.test(k));

            textDigest += `• **Invoices Issued:** **${invoicesSheet.rowCount.toLocaleString()} invoices** in sheet "${invoicesSheet.name}"\n`;
            if (invTotal) textDigest += `    – Total Invoiced Turnover: **KES ${invTotal[1].sum.toLocaleString()}**\n`;
            if (invPaid) textDigest += `    – Total Cash Collected/Paid: **KES ${invPaid[1].sum.toLocaleString()}**\n`;
            if (invBal) textDigest += `    – Total Outstanding Receivables: **KES ${invBal[1].sum.toLocaleString()}**\n`;
          }
          if (quotesSheet) {
            const qTotal = Object.entries(quotesSheet.numericMetrics).find(([k]) => /total|amount/i.test(k));
            textDigest += `• **Quotations:** **${quotesSheet.rowCount.toLocaleString()} quotes** in sheet "${quotesSheet.name}"${qTotal ? ` (Total Quoted Value: KES ${qTotal[1].sum.toLocaleString()})` : ''}\n`;
          }
          if (paymentsSheet) {
            const pTotal = Object.entries(paymentsSheet.numericMetrics).find(([k]) => /amount|total/i.test(k));
            textDigest += `• **Payment Logs:** **${paymentsSheet.rowCount.toLocaleString()} payments** in sheet "${paymentsSheet.name}"${pTotal ? ` (Total Volume: KES ${pTotal[1].sum.toLocaleString()})` : ''}\n`;
          }
          if (inventorySheet) {
            textDigest += `• **Products / Inventory Items:** **${inventorySheet.rowCount.toLocaleString()} items** in sheet "${inventorySheet.name}"\n`;
          }

          textDigest += `\n### 📑 DETAILED SHEET-BY-SHEET BREAKDOWN\n`;
          sheetMetrics.forEach(s => {
            textDigest += `\n#### Sheet: "${s.name}" (${s.rowCount.toLocaleString()} rows)\n`;
            textDigest += `• **Columns (${s.columns.length}):** ${s.columns.join(', ')}\n`;
            if (Object.keys(s.numericMetrics).length > 0) {
              textDigest += `• **Computed Column Totals:**\n`;
              Object.entries(s.numericMetrics).forEach(([col, val]) => {
                textDigest += `    – **${col}:** KES ${val.sum.toLocaleString()} (across ${val.count.toLocaleString()} entries, avg KES ${val.avg.toLocaleString()})\n`;
              });
            }
          });

          // Sample preview
          if (sheetMetrics.length > 0 && sheetMetrics[0].sampleRows.length > 0) {
            const s0 = sheetMetrics[0];
            textDigest += `\n### 📋 DATA PREVIEW (First ${s0.sampleRows.length} of ${s0.rowCount.toLocaleString()} rows in "${s0.name}")\n`;
            textDigest += `| ${s0.columns.join(' | ')} |\n`;
            textDigest += `| ${s0.columns.map(() => '---').join(' | ')} |\n`;
            s0.sampleRows.forEach(r => {
              textDigest += `| ${r.join(' | ')} |\n`;
            });
          }

          // Assign financialDoc only if it is a single-sheet financial invoice/statement
          let financialDoc: ExtractedFinancialDocument | undefined;
          if (invoicesSheet && sheetMetrics.length === 1) {
            const invTotal = Object.entries(invoicesSheet.numericMetrics).find(([k]) => /total|amount|grand/i.test(k));
            financialDoc = {
              documentType: 'customer_invoice',
              totalAmount: invTotal ? invTotal[1].sum : undefined,
              currency: 'KES'
            };
          } else if (clientsSheet && sheetMetrics.length === 1) {
            financialDoc = {
              documentType: 'client_list',
              currency: 'KES'
            };
          }

          resolve({
            fileName,
            fileType,
            fileSize,
            mimeType,
            textContent: textDigest,
            extractedData: {
              tables: allTables,
              financialDoc
            },
            parseStatus: 'success'
          });
        } catch (err: any) {
          resolve({
            fileName,
            fileType,
            fileSize,
            mimeType,
            parseStatus: 'failed',
            parseError: `Failed to parse Excel spreadsheet: ${err?.message || 'Invalid format'}`
          });
        }
      };
      reader.onerror = () => {
        resolve({
          fileName,
          fileType,
          fileSize,
          mimeType,
          parseStatus: 'failed',
          parseError: 'Could not read spreadsheet file.'
        });
      };
      reader.readAsArrayBuffer(file);
      return;
    }

    // 2. Text, JSON, and CSV Formats
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
                  transactionDate: normalizeDate(parsedJson.transactionDate),
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

        // CSV & TSV Parsing with PapaParse
        if (fileType === 'csv' || fileType === 'tsv' || (fileType !== 'json' && textContent.includes(','))) {
          const rawTable = parseRFC4180CSV(textContent);
          if (rawTable.length > 0) {
            tables = [{
              headers: rawTable[0] || [],
              rows: rawTable.slice(1, 26) // Store top 25 preview rows
            }];
            onStep?.({
              title: `Parsed table with PapaParse (${(rawTable.length - 1).toLocaleString()} rows)`,
              detail: `Headers: ${rawTable[0]?.slice(0, 4).join(', ')}...`,
              status: 'complete'
            });
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

    // 3. Images (Receipts, Photos, Slips)
    if (mimeType.startsWith('image/') || ['jpg', 'jpeg', 'png', 'webp', 'heic'].includes(fileType)) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = (e.target?.result as string) || '';
        const base64Data = dataUrl.split(',')[1] || '';

        onStep?.({
          title: `Encoded image "${fileName}" for Multimodal Vision`,
          detail: `${(fileSize / 1024).toFixed(1)} KB base64 payload ready for Gemini Vision analysis`,
          status: 'complete'
        });

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

    // 4. Binary Documents (PDF, Word, etc.)
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = (e.target?.result as string) || '';
      const base64Data = dataUrl.split(',')[1] || '';

      onStep?.({
        title: `Prepared binary document "${fileName}"`,
        detail: `${(fileSize / 1024).toFixed(1)} KB ${fileType.toUpperCase()} document`,
        status: 'complete'
      });

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
