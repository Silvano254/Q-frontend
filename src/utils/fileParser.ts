/**
 * File parsing utilities for Binti AI Document Processing
 */

export interface ParsedDocument {
  fileName: string;
  fileType: string;
  fileSize: number;
  textContent: string;
  mimeType: string;
}

/**
 * Reads a File object from user input and extracts its text or data representation
 */
export async function parseUploadedDocument(file: File): Promise<ParsedDocument> {
  const fileName = file.name;
  const fileType = file.name.split('.').pop()?.toLowerCase() || 'unknown';
  const fileSize = file.size;
  const mimeType = file.type || 'text/plain';

  return new Promise((resolve, reject) => {
    // For text-based formats (CSV, JSON, TXT, MD, LOG)
    if (
      fileType === 'csv' || 
      fileType === 'json' || 
      fileType === 'txt' || 
      fileType === 'md' || 
      mimeType.startsWith('text/') ||
      mimeType === 'application/json'
    ) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const textContent = (e.target?.result as string) || '';
        resolve({
          fileName,
          fileType,
          fileSize,
          textContent,
          mimeType
        });
      };
      reader.onerror = (err) => reject(new Error('Failed to read document text.'));
      reader.readAsText(file);
    } else {
      // For binary or multimodal formats (Images, PDF, Excel)
      const reader = new FileReader();
      reader.onload = (e) => {
        const base64Data = (e.target?.result as string) || '';
        resolve({
          fileName,
          fileType,
          fileSize,
          textContent: `[Binary document: ${fileName} (${fileType.toUpperCase()}), Size: ${(fileSize / 1024).toFixed(1)} KB]`,
          mimeType
        });
      };
      reader.onerror = (err) => reject(new Error('Failed to process document file.'));
      reader.readAsDataURL(file);
    }
  });
}

/**
 * Parses raw CSV text into structured rows & columns
 */
export function parseCsvRows(csvText: string): Array<Record<string, string>> {
  const lines = csvText
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(Boolean);

  if (lines.length < 2) return [];

  // Parse header line
  const headers = lines[0].split(',').map(h => h.trim().replace(/^["']|["']$/g, ''));
  const results: Array<Record<string, string>> = [];

  for (let i = 1; i < lines.length; i++) {
    const rawCols = lines[i].split(',');
    const rowObj: Record<string, string> = {};
    headers.forEach((header, colIdx) => {
      const val = rawCols[colIdx] !== undefined ? rawCols[colIdx].trim().replace(/^["']|["']$/g, '') : '';
      rowObj[header] = val;
    });
    results.push(rowObj);
  }

  return results;
}
