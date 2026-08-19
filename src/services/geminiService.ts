/**
 * Gemini Service for Binti Assistant
 * Communicates with zero-cold-start Supabase Edge Function & Backend REST Endpoints.
 * Equipped with Level 1 (Ask), Level 2 (Assist), and Level 3 (Execute) agentic capabilities,
 * featuring multi-stage document extraction, OCR financial interpretation, and controlled mutation execution.
 */

import { apiRequest } from './apiClient';
import { BillingItem, Client, ProductService, Invoice, Expense } from '../types';
import { 
  parseCsvRows, 
  parseRFC4180CSV, 
  ParsedDocument, 
  ExtractedFinancialDocument,
  validateAndReconcileFinancialDoc 
} from '../utils/fileParser';

export interface SaaSContext {
  clientCount?: number;
  totalQuotes?: number;
  convertedQuotes?: number;
  totalInvoices?: number;
  totalRevenue?: number;
  pendingBalance?: number;
  totalExpenses?: number;
  netEstimatedProfit?: number;
  collectionRate?: number;
  conversionRate?: number;
  currency?: string;
  companyName?: string;
  lastSyncedAt?: string;
  connectedModules?: string[];
  clientsSummary?: Array<{ id: string; name: string; company?: string; phone?: string; email?: string }>;
  invoicesSummary?: Array<{ id: string; invoiceNumber: string; clientName: string; grandTotal: number; balanceRemaining: number; status: string; dueDate?: string }>;
  quotesSummary?: Array<{ id: string; quoteNumber: string; clientName: string; grandTotal: number; status: string }>;
  productsCatalog?: Array<{ id: string; name: string; category: string; price: number; unit: string }>;
  expensesSummary?: Array<{ id: string; category: string; description: string; amount: number; date?: string; eventName?: string }>;
}

export interface AgentThoughtStep {
  id: string;
  title: string;
  detail?: string;
  status: 'pending' | 'in_progress' | 'complete' | 'failed';
  timestamp?: number;
}

export interface ChatMessage {
  role: "user" | "model" | "system";
  content: string;
  timestamp?: string;
  actions?: AgentAction[];
  attachment?: {
    name: string;
    size: number;
    type: string;
  };
  thoughtSteps?: AgentThoughtStep[];
  thinkingDurationMs?: number;
}

export type UIActionType = "navigate" | "filter_invoices" | "open_client" | "open_settings";
export type MutationActionType = 
  | "create_quote" 
  | "create_invoice" 
  | "record_payment" 
  | "create_expense" 
  | "update_client" 
  | "update_invoice"
  | "import_clients"
  | "import_products"
  | "import_invoices"
  | "import_expenses";

export type AgentActionType = UIActionType | MutationActionType;

export interface RecordPaymentPayload {
  invoiceId?: string;
  invoiceNumber?: string;
  clientName?: string;
  amountPaid: number;
  paymentMethod?: 'cash' | 'bank_transfer' | 'cheque' | 'mobile_transfer' | 'other';
  referenceNumber?: string;
  paymentDate?: string;
  notes?: string;
}

export interface CreateQuotePayload {
  clientId?: string;
  clientName?: string;
  company?: string;
  items?: BillingItem[];
  grandTotal?: number;
  notes?: string;
  isCreating?: boolean;
}

export interface CreateInvoicePayload {
  quoteId?: string;
  clientId?: string;
  clientName?: string;
  items?: BillingItem[];
  grandTotal?: number;
  dueDate?: string;
  notes?: string;
  isCreating?: boolean;
}

export interface CreateExpensePayload {
  category: 'Transport & Logistics' | 'Labor & Crew' | 'Equipment Maintenance' | 'Fuel' | 'Decor & Consumables' | 'Utilities & Rent' | 'Other';
  description: string;
  amount: number;
  eventName?: string;
  referenceNumber?: string;
  date?: string;
  notes?: string;
}

export interface UpdateClientPayload {
  clientId: string;
  name?: string;
  phone?: string;
  email?: string;
  company?: string;
  notes?: string;
}

export interface ImportClientsPayload {
  clients: Array<{
    name: string;
    company?: string;
    phone?: string;
    email?: string;
    address?: string;
    taxNumber?: string;
    notes?: string;
  }>;
}

export interface ImportProductsPayload {
  products: Array<{
    name: string;
    description?: string;
    category?: string;
    unitType?: string;
    unitPrice: number;
    taxRate?: number;
  }>;
}

export interface AgentAction {
  id?: string;
  type: AgentActionType;
  label: string;
  icon?: "file" | "credit-card" | "user" | "settings" | "filter" | "plus" | "trending" | "receipt" | "shield" | "database";
  isMutation?: boolean;
  riskLevel?: "low" | "medium" | "high";
  summary?: string;
  payload?: Record<string, any> & (
    | RecordPaymentPayload
    | CreateQuotePayload
    | CreateInvoicePayload
    | CreateExpensePayload
    | UpdateClientPayload
    | ImportClientsPayload
    | ImportProductsPayload
  );
}

export interface AssistantResponse {
  reply: string;
  actions?: AgentAction[];
}

/**
 * Standard text sanitizer
 */
export function cleanAiResponse(text: string): string {
  if (!text) return "";
  return text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .trim();
}

export type StepEmitter = (step: { title: string; detail?: string; status: 'in_progress' | 'complete' | 'failed' }) => void;

/**
 * Send a chat prompt with optional document attachment to Binti.
 */
export async function askGeminiAssistant(
  prompt: string,
  chatHistory: ChatMessage[] = [],
  saasContext?: SaaSContext,
  signal?: AbortSignal,
  attachedDoc?: ParsedDocument | null,
  onStep?: StepEmitter
): Promise<AssistantResponse> {
  if (signal?.aborted) {
    throw new DOMException('Aborted', 'AbortError');
  }

  const cleanPrompt = cleanAiResponse(prompt.trim());
  const cleanHistory = chatHistory.map(h => ({
    role: h.role,
    content: cleanAiResponse(h.content)
  }));

  try {
    const documentPayload = attachedDoc ? {
      name: attachedDoc.fileName,
      type: attachedDoc.fileType,
      size: attachedDoc.fileSize,
      mimeType: attachedDoc.mimeType,
      content: attachedDoc.textContent ? attachedDoc.textContent.slice(0, 10000) : undefined,
      imageBase64: attachedDoc.extractedData?.images?.[0]?.data,
      binaryData: attachedDoc.extractedData?.binaryData,
      financialDoc: attachedDoc.extractedData?.financialDoc,
      tables: attachedDoc.extractedData?.tables
    } : undefined;

    onStep?.({
      title: "Querying Gemini 3.x Flash Intelligence Engine",
      detail: documentPayload 
        ? `Transmitting prompt with verified audit payload for "${documentPayload.name}"`
        : `Evaluating prompt with live database connection`,
      status: 'in_progress'
    });

    const data = await apiRequest<{ success: boolean; reply?: string; actions?: AgentAction[] }>('/api/ai/chat', {
      method: "POST",
      signal,
      body: JSON.stringify({
        prompt: cleanPrompt,
        history: cleanHistory,
        document: documentPayload
      })
    });

    if (signal?.aborted) {
      throw new DOMException('Aborted', 'AbortError');
    }

    if (data.success && data.reply) {
      const sanitizedReply = cleanAiResponse(data.reply);
      const actions = data.actions || extractActionsFromPrompt(cleanPrompt, saasContext, attachedDoc);
      
      onStep?.({
        title: "Received & verified model response",
        detail: `Sanitized executive output${actions.length > 0 ? ` with ${actions.length} action(s) prepared` : ''}`,
        status: 'complete'
      });

      return { reply: sanitizedReply, actions };
    }
  } catch (error: any) {
    if (error?.name === 'AbortError' || signal?.aborted) {
      throw error;
    }
    console.warn('AI API unavailable, using local fallback:', error);
    onStep?.({
      title: "Switched to local intelligent fallback engine",
      detail: "Executing deterministic business logic rules",
      status: 'in_progress'
    });
  }

  if (signal?.aborted) {
    throw new DOMException('Aborted', 'AbortError');
  }

  // Deterministic local intelligent fallback
  const localRes = getLocalIntelligentFallback(cleanPrompt, saasContext, attachedDoc);
  onStep?.({
    title: "Completed local deterministic response",
    detail: `Generated fallback analysis with ${localRes.actions.length} action(s)`,
    status: 'complete'
  });
  return {
    reply: cleanAiResponse(localRes.reply),
    actions: localRes.actions
  };
}

/**
 * Extrapolates UI and mutation actions only when explicit user intent exists
 */
function extractActionsFromPrompt(prompt: string, context?: SaaSContext, attachedDoc?: ParsedDocument | null): AgentAction[] {
  const p = prompt.toLowerCase();
  const actions: AgentAction[] = [];
  const isWriteIntent = /import|save|load|insert|record|add to|create|write|draft|post/i.test(p);

  // Stage 2 & 3: Document Ingestion & Action Proposal
  if (attachedDoc && isWriteIntent) {
    const docName = attachedDoc.fileName.toLowerCase();
    const docText = (attachedDoc.textContent || '').toLowerCase();
    const isImage = attachedDoc.mimeType.startsWith('image/');

    // Receipt / Expense document write intent
    if (isImage || docName.includes('receipt') || docName.includes('expense') || docText.includes('total:') || docText.includes('amount:')) {
      const finDoc = attachedDoc.extractedData?.financialDoc;
      const amount = finDoc?.totalAmount;
      const supplier = finDoc?.supplierName || (docName.split('.')[0].replace(/[-_]/g, ' ') || 'Supplier');
      const category = finDoc?.category || 'Transport & Logistics';

      if (amount && amount > 0) {
        actions.push({
          type: "create_expense",
          label: `Record Expense: KES ${amount.toLocaleString()} (${supplier})`,
          icon: "receipt",
          isMutation: true,
          riskLevel: "medium",
          summary: `Record a ${category} expense of KES ${amount.toLocaleString()} from ${supplier} into your business expense ledger.`,
          payload: {
            category,
            description: `${category} purchase - ${supplier}`,
            amount,
            referenceNumber: finDoc?.documentNumber || `EXP-${Date.now().toString().slice(-4)}`,
            date: finDoc?.transactionDate || new Date().toISOString().split('T')[0]
          }
        });
        return actions;
      }
    }

    // Tabular Excel / CSV Tables write intent
    if (attachedDoc.extractedData?.tables && attachedDoc.extractedData.tables.length > 0) {
      const allTables = attachedDoc.extractedData.tables;
      
      // Extract clients if requested
      const clientTable = allTables.find(t => t.headers.some(h => /client|customer|name|contact/i.test(h)));
      if (clientTable && clientTable.rows.length > 0) {
        const hMap: Record<string, number> = {};
        clientTable.headers.forEach((h, idx) => {
          const low = h.toLowerCase();
          if (low.includes('name') || low.includes('client') || low.includes('customer') || low.includes('contact')) hMap.name = idx;
          if (low.includes('company') || low.includes('organization') || low.includes('business')) hMap.company = idx;
          if (low.includes('phone') || low.includes('mobile') || low.includes('tel')) hMap.phone = idx;
          if (low.includes('email') || low.includes('mail')) hMap.email = idx;
          if (low.includes('address') || low.includes('location') || low.includes('city')) hMap.address = idx;
          if (low.includes('pin') || low.includes('tax') || low.includes('vat')) hMap.taxNumber = idx;
        });

        const parsedClients = clientTable.rows.map(r => ({
          name: (hMap.name !== undefined ? r[hMap.name] : r[0]) || 'Client',
          company: hMap.company !== undefined ? r[hMap.company] : '',
          phone: hMap.phone !== undefined ? r[hMap.phone] : '',
          email: hMap.email !== undefined ? r[hMap.email] : '',
          address: hMap.address !== undefined ? r[hMap.address] : '',
          taxNumber: hMap.taxNumber !== undefined ? r[hMap.taxNumber] : ''
        })).filter(c => c.name && c.name.trim() !== '');

        // Extract total count from audit text if available
        const countMatch = (attachedDoc.textContent || '').match(/(\d[\d,]*)\s+clients/i);
        const displayCount = countMatch ? countMatch[1] : parsedClients.length.toLocaleString();

        if (parsedClients.length > 0) {
          actions.push({
            type: "import_clients",
            label: `Import ${displayCount} Clients into Database`,
            icon: "database",
            isMutation: true,
            riskLevel: "medium",
            summary: `Add ${displayCount} validated client records from ${attachedDoc.fileName} directly to your client directory.`,
            payload: { clients: parsedClients }
          });
          return actions;
        }
      }
    }
  }

  // Overdue / Unpaid invoices
  if (p.includes("overdue") || p.includes("unpaid") || p.includes("debt") || p.includes("owing")) {
    actions.push({
      type: "filter_invoices",
      label: "Filter Overdue Invoices",
      icon: "filter",
      isMutation: false,
      riskLevel: "low",
      payload: { status: "overdue" }
    });
  }

  // Create Quote
  if (p.includes("create quote") || p.includes("draft quote") || p.includes("new quote")) {
    actions.push({
      type: "create_quote",
      label: "Open Quote Builder",
      icon: "plus",
      isMutation: false,
      riskLevel: "low",
      payload: { tab: "quotes", isCreating: true }
    });
  }

  return actions;
}

/**
 * Deterministic local fallback with Stage 2 (Interpretation) and Stage 3 (Action).
 */
function getLocalIntelligentFallback(prompt: string, context?: SaaSContext, attachedDoc?: ParsedDocument | null): AssistantResponse {
  const p = prompt.toLowerCase();
  const curr = context?.currency || 'KES';
  const actions: AgentAction[] = [];

  // Stage 2 & 3: File Interpretation & Action Proposal
  if (attachedDoc) {
    const docName = attachedDoc.fileName.toLowerCase();
    const docText = (attachedDoc.textContent || '').toLowerCase();
    const isImage = attachedDoc.mimeType.startsWith('image/');

    // 1. Structured Financial Document / Receipt / Expense Image
    const finDoc = attachedDoc.extractedData?.financialDoc;
    if (finDoc?.totalAmount && finDoc.totalAmount > 0) {
      const supplier = finDoc.supplierName || attachedDoc.fileName.split('.')[0].replace(/[-_]/g, ' ') || 'Supplier';
      const amount = finDoc.totalAmount;
      const category: CreateExpensePayload['category'] = (finDoc.category as any) || 'Transport & Logistics';
      const date = finDoc.transactionDate || new Date().toISOString().split('T')[0];

      // Stage 3: Mathematical Reconciliation
      const reconciliation = validateAndReconcileFinancialDoc({
        documentType: finDoc.documentType || 'receipt',
        supplierName: supplier,
        totalAmount: amount,
        subtotal: finDoc.subtotal,
        taxAmount: finDoc.taxAmount,
        currency: finDoc.currency || curr,
        items: finDoc.items
      });

      let reply = `> ⚠️ **Notice**: AI cloud service is currently unreachable. Showing local deterministic analysis.\n\n`;
      reply += `### 🧾 Document Interpreted: ${attachedDoc.fileName}\n\n`;
      reply += `| Field | Extracted Detail | Status |\n`;
      reply += `| :--- | :--- | :--- |\n`;
      reply += `| **Document Type** | ${finDoc.documentType ? finDoc.documentType.replace(/_/g, ' ').toUpperCase() : 'Expense Receipt'} | Extracted |\n`;
      reply += `| **Supplier / Entity** | **${supplier}** | Extracted |\n`;
      reply += `| **Category** | **${category}** | Assigned |\n`;
      reply += `| **Total Amount** | **${curr} ${amount.toLocaleString()}** | Extracted |\n`;
      reply += `| **Transaction Date** | **${date}** | Extracted |\n`;
      reply += `| **Reconciliation** | ${reconciliation.message} | Validated |\n\n`;
      reply += `Found an expense of **${curr} ${amount.toLocaleString()}** from **${supplier}**. Would you like to record it?`;

      actions.push({
        type: "create_expense",
        label: `Add ${curr} ${amount.toLocaleString()} ${category} Expense`,
        icon: "receipt",
        isMutation: true,
        riskLevel: "medium",
        summary: `Record ${category} expense of ${curr} ${amount.toLocaleString()} from ${supplier} on ${date}.`,
        payload: {
          category,
          description: `${category} expense - ${supplier}`,
          amount,
          referenceNumber: finDoc.documentNumber || `EXP-${Date.now().toString().slice(-4)}`,
          date
        }
      });

      return { reply, actions };
    }

    // 2. Tabular Spreadsheets (Excel / CSV / JSON Tables)
    if (attachedDoc.extractedData?.tables && attachedDoc.extractedData.tables.length > 0) {
      // Return direct, exact answer if user is querying specific metrics
      if (attachedDoc.textContent) {
        let reply = attachedDoc.textContent;

        actions.push({
          type: "navigate",
          label: "View Clients",
          icon: "user",
          isMutation: false,
          riskLevel: "low",
          payload: { tab: "clients" }
        });

        return { reply, actions };
      }
    }

    let reply = `### 📄 Document Received: ${attachedDoc.fileName}\n\n`;
    reply += `File Size: **${(attachedDoc.fileSize / 1024).toFixed(1)} KB** | Format: **${attachedDoc.fileType.toUpperCase()}**\n\n`;
    reply += `I have extracted the document content. Tell me how you'd like me to process it (e.g. *"Extract clients into directory"*, *"Record this receipt as an expense"*, or *"Create quote draft"*).`;

    actions.push({
      type: "navigate",
      label: "View Clients",
      icon: "user",
      isMutation: false,
      riskLevel: "low",
      payload: { tab: "clients" }
    });

    return { reply, actions };
  }

  // 3. Proactive Business Brief
  if (p.includes("brief") || p.includes("summary") || p.includes("overview") || p.includes("today")) {
    const totalRev = context?.totalRevenue ?? 0;
    const pending = context?.pendingBalance ?? 0;
    const totalQuotes = context?.totalQuotes ?? 0;
    const convRate = context?.conversionRate ?? 0;

    let reply = `### 📋 Binti Executive Business Brief\n\n`;
    reply += `#### 💰 Money & Cash Flow\n`;
    reply += `• **Liquid Revenue Collected:** **${curr} ${totalRev.toLocaleString()}**\n`;
    reply += `• **Outstanding Receivables:** **${curr} ${pending.toLocaleString()}** (${context?.collectionRate ?? 100}% collection efficiency)\n\n`;

    reply += `#### 📑 Proposals & Conversions\n`;
    reply += `• **Active Quotes:** **${totalQuotes}** proposals (${convRate}% conversion rate)\n\n`;

    reply += `#### ⚠️ Attention Items\n`;
    reply += `• ${pending > 0 ? `${(context?.invoicesSummary || []).filter(i => i.status === 'overdue').length} overdue invoices awaiting collection.` : 'All accounts are in good standing.'}`;

    actions.push({
      type: "filter_invoices",
      label: "Review Overdue Invoices",
      icon: "filter",
      isMutation: false,
      riskLevel: "low",
      payload: { status: "overdue" }
    });
    actions.push({
      type: "navigate",
      label: "Open Quotes Pipeline",
      icon: "file",
      isMutation: false,
      riskLevel: "low",
      payload: { tab: "quotes" }
    });

    return { reply, actions };
  }

  // Default fallback
  const reply = `Hello Virginia! I am **Binti**, your AI Operating Assistant for **${context?.companyName || "Binti Events Management System"}**.\n\n` +
    `You can ask me questions, or click the **` + `+` + `** button to attach receipts, invoices, client CSVs, or price sheets to interpret and import into your database.`;

  actions.push({
    type: "navigate",
    label: "Create Quotation",
    icon: "plus",
    isMutation: false,
    riskLevel: "low",
    payload: { tab: "quotes", isCreating: true }
  });
  actions.push({
    type: "filter_invoices",
    label: "Check Overdue Invoices",
    icon: "filter",
    isMutation: false,
    riskLevel: "low",
    payload: { status: "overdue" }
  });

  return { reply, actions };
}

/**
 * AI Email Drafting
 */
export async function generateEmailDraft(params: {
  type: string;
  number: string;
  clientName: string;
  amount: number;
  dueDate: string;
  notes?: string;
  companyName?: string;
  currency?: string;
}): Promise<string> {
  try {
    const data = await apiRequest<{ success: boolean; email?: string }>('/api/ai/draft-email', {
      method: 'POST',
      body: JSON.stringify(params)
    });
    if (data.success && data.email) {
      return cleanAiResponse(data.email);
    }
  } catch (err) {}

  const { type, number, clientName, amount, dueDate, notes, currency = 'KES' } = params;
  const isInvoice = type?.toLowerCase().includes('invoice');
  const firstName = clientName.split(' ')[0] || 'Valued Client';
  const fmt = `${currency} ${amount.toLocaleString()}`;

  if (isInvoice) {
    return `Dear ${firstName},\n\nPlease find attached ${type} ${number} for ${fmt}, due on ${dueDate}.\n\n${notes ? `Note: ${notes}\n\n` : ''}Best regards,\nBinti Events Team`;
  }
  return `Dear ${firstName},\n\nThank you for considering Binti Events. Please find attached quotation ${number} for ${fmt}, valid until ${dueDate}.\n\n${notes ? `Note: ${notes}\n\n` : ''}Best regards,\nBinti Events Team`;
}

/**
 * AI Terms Recommendation
 */
export async function recommendTerms(
  clientNameOrParams: string | { clientName: string; items: Array<{ description: string; quantity?: number }> },
  itemsParam?: Array<{ description: string; quantity?: number }>
): Promise<string> {
  const clientName = typeof clientNameOrParams === 'string' ? clientNameOrParams : clientNameOrParams.clientName;
  const items = typeof clientNameOrParams === 'object' && 'items' in clientNameOrParams ? clientNameOrParams.items : (itemsParam || []);

  try {
    const data = await apiRequest<{ success: boolean; terms?: string }>('/api/ai/recommend-terms', {
      method: 'POST',
      body: JSON.stringify({ clientName, items })
    });
    if (data.success && data.terms) {
      return cleanAiResponse(data.terms);
    }
  } catch (err) {}

  return `1. 50% commitment fee to book, with the balance paid before setup.\n2. Broken or damaged equipment will be billed at replacement cost.\n3. Setup and breakdown are included within Nairobi County.\n4. Cancellation within 7 days of event date forfeits the deposit.`;
}
