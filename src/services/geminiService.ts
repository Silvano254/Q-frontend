/**
 * Gemini Service for Binti Assistant
 * Communicates with zero-cold-start Supabase Edge Function & Backend REST Endpoints.
 * Equipped with Level 1 (Ask), Level 2 (Assist), and Level 3 (Execute) agentic capabilities,
 * featuring multi-stage document extraction, OCR financial interpretation, and controlled mutation execution.
 */

import { apiRequest, getAuthToken } from './apiClient';
import { BillingItem } from '../types';
import { ParsedDocument } from '../utils/fileParser';

export interface SaaSContext {
  clientCount?: number;
  totalQuotes?: number;
  convertedQuotes?: number;
  totalInvoices?: number;
  totalRevenue?: number;
  pendingBalance?: number;
  // NOTE: The expense fields below are LOCAL / document-derived estimates only.
  // The canonical database schema has NO expenses table yet — never treat these
  // values as live database metrics (the backend grounding rules enforce this).
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

/**
 * Operational processing/status step emitted by the backend pipeline.
 * These are execution-status events (auth, metrics fetch, model call),
 * NEVER the model's private chain-of-thought reasoning.
 */
export interface ProcessingStep {
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
  processingSteps?: ProcessingStep[];
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
    .replace(/^\[?\s*Approve\s*&\s*Execute(?:\s*Import|\s*Button)?\s*\]?$/gim, '')
    .replace(/\[\s*Approve\s*&\s*Execute[^\]]*\]/gi, '')
    .replace(/Click\s+(?:the\s+)?(?:\[?\s*Approve\s*&\s*Execute\s*\]?|button\s+below)\s+to\s+[^.\n]+[.\n]?/gi, '')
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

  // AUTHENTICATION GATE: AI access requires a signed-in user session.
  // Guests must never reach the AI gateway (matches backend JWT enforcement).
  const userToken = getAuthToken();
  if (!userToken) {
    onStep?.({
      title: "Authentication required",
      detail: "Please sign in to use Binti AI.",
      status: 'failed'
    });
    throw new Error('Authentication required. Please sign in to use Binti AI.');
  }

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

  // SINGLE unified backend path: VITE_API_URL points at the Supabase Edge Functions
  // gateway. No dual-path fallback — one architecture, one auth model, one contract.
  type AiChatResponse = {
    success: boolean;
    reply?: string;
    actions?: AgentAction[];
    thoughtSteps?: Array<{ title: string; detail?: string; status: 'in_progress' | 'complete' | 'failed' }>;
  };

  let data: AiChatResponse | null = null;
  try {
    data = await apiRequest<AiChatResponse>(
      '/api/ai/chat',
      {
        method: "POST",
        signal,
        // Thinking-capable Gemini models can take well over the default 30s
        // to answer. Give the full pipeline (discovery + grounding + model)
        // a generous 90s budget instead of timing out mid-reasoning.
        timeoutMs: 90000,
        body: JSON.stringify({
          prompt: cleanPrompt,
          history: cleanHistory,
          document: documentPayload
        })
      },
      true // Authenticated users only — the backend verifies the user's signed JWT
    );
  } catch (error: any) {
    if (error?.name === 'AbortError' || signal?.aborted) {
      throw error;
    }
    console.warn('AI API unavailable:', error);
    const detail = typeof error?.message === 'string' ? error.message.trim() : '';
    onStep?.({
      title: "AI service unavailable",
      detail: detail || "The backend AI service could not be reached.",
      status: 'failed'
    });
    // Preserve the actionable underlying cause (expired session, HTTP status,
    // configuration problem…) instead of masking every failure with one
    // generic line — masked errors made outages impossible to diagnose.
    if (detail) {
      throw new Error(detail);
    }
    throw new Error('The AI service is temporarily unavailable. Please try again in a moment.');
  }

  if (signal?.aborted) {
    throw new DOMException('Aborted', 'AbortError');
  }

  if (!data?.success || !data.reply) {
    const backendHint = (data as any)?.error || (data as any)?.message;
    onStep?.({
      title: "AI service unavailable",
      detail: backendHint || "The backend did not return a valid response.",
      status: 'failed'
    });
    throw new Error(
      backendHint
        ? `Binti's AI backend reported a problem: ${backendHint}`
        : 'The AI service is temporarily unavailable. Please try again in a moment.'
    );
  }

  const sanitizedReply = cleanAiResponse(data.reply);
  // Server-proposed actions take precedence. Client-side extraction is UI
  // convenience ONLY — every mutation is independently authorized and
  // validated by the backend endpoints before any database write occurs.
  const actions = (data.actions && data.actions.length > 0)
    ? data.actions
    : extractActionsFromPrompt(cleanPrompt, saasContext, attachedDoc);
  const meta = (data as any).meta;

  // Emit the real processing steps returned by the backend (not hardcoded).
  if (data.thoughtSteps && data.thoughtSteps.length > 0) {
    for (const step of data.thoughtSteps) {
      onStep?.({
        title: step.title,
        detail: step.detail,
        status: step.status
      });
    }
  } else if (meta?.groundedMetrics) {
    onStep?.({
      title: `Grounded via ${meta.model || 'Gemini Cloud'}`,
      detail: `Live database context verified: ${meta.groundedMetrics.clients} clients, ${meta.groundedMetrics.invoices} invoices (${meta.groundedMetrics.currency} ${meta.groundedMetrics.cashCollected.toLocaleString()} collected) in ${meta.latencyMs}ms`,
      status: 'complete'
    });
  } else {
    onStep?.({
      title: "Received & verified cloud model response",
      detail: `Sanitized executive output${actions.length > 0 ? ` with ${actions.length} action proposal(s)` : ''}`,
      status: 'complete'
    });
  }

  return { reply: sanitizedReply, actions };
}

/**
 * Extrapolates UI and mutation actions only when explicit user intent exists
 */
function extractActionsFromPrompt(prompt: string, context?: SaaSContext, attachedDoc?: ParsedDocument | null): AgentAction[] {
  const p = prompt.toLowerCase();
  const actions: AgentAction[] = [];

  // Negative intent check: phrases like "don't save", "do not import", "just analyze", "read only" force write intent off
  const hasNegativeIntent = /\b(don'?t|do not|never|no need to|without|just|only)\s+(import|save|store|record|add|create|write|insert|commit|modifying|changing)\b|\b(read[\s-]only|just analyze|only analyze|don'?t save|do not save|without saving|without importing|no action)\b/i.test(p);
  const hasPositiveWriteIntent = /\b(import|save|load|insert|record|add to|create|write|draft|post|structure|restructure|commit)\b/i.test(p);
  const isWriteIntent = hasPositiveWriteIntent && !hasNegativeIntent;

  // Stage 2 & 3: Document Ingestion & Action Proposal (ONLY if user has positive write/import intent)
  if (attachedDoc && isWriteIntent) {
    const docName = attachedDoc.fileName.toLowerCase();
    const docText = (attachedDoc.textContent || '').toLowerCase();
    const isImage = attachedDoc.mimeType.startsWith('image/');

    // Receipt / Expense document
    if (isImage || docName.includes('receipt') || docName.includes('expense') || docText.includes('total:') || docText.includes('amount:')) {
      const finDoc = attachedDoc.extractedData?.financialDoc;
      const amount = finDoc?.totalAmount;
      const supplier = finDoc?.supplierName || (docName.split('.')[0].replace(/[-_]/g, ' ') || 'Supplier');
      const category = finDoc?.category || 'Transport & Logistics';

      if (amount && amount > 0) {
        actions.push({
          id: `act-exp-${Date.now()}`,
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
      }
    }

    // Tabular Excel / CSV Tables
    if (attachedDoc.extractedData?.tables && attachedDoc.extractedData.tables.length > 0) {
      const allTables = attachedDoc.extractedData.tables;
      
      // Extract clients
      const clientTable = allTables.find(t => 
        (t.name && /client|customer|member|lead|contact/i.test(t.name)) ||
        (t.headers && t.headers.some(h => /client|customer|name|contact/i.test(h)))
      );
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

        const countMatch = (attachedDoc.textContent || '').match(/(\d[\d,]*)\s+clients/i);
        const displayCount = countMatch ? countMatch[1] : parsedClients.length.toLocaleString();

        if (parsedClients.length > 0) {
          actions.push({
            id: `act-imp-clients-${Date.now()}`,
            type: "import_clients",
            label: `Import ${displayCount} Clients into Database`,
            icon: "database",
            isMutation: true,
            riskLevel: "high",
            summary: `Add ${displayCount} validated client records from ${attachedDoc.fileName} directly to your client directory.`,
            payload: { clients: parsedClients }
          });
        }
      }

      // Extract products / inventory — send REAL normalized records, not a count
      const productTable = allTables.find(t => 
        (t.name && /product|service|catalog|item|inventory|equipment/i.test(t.name)) ||
        (t.headers && t.headers.some(h => /service|item|product|price|unit/i.test(h)))
      );
      if (productTable && productTable.rows.length > 0) {
        const pMap: Record<string, number> = {};
        productTable.headers.forEach((h, idx) => {
          const low = h.toLowerCase();
          if (low.includes('name') || low.includes('service') || low.includes('item')) pMap.name = idx;
          if (low.includes('description')) pMap.description = idx;
          if (low.includes('category')) pMap.category = idx;
          if (low.includes('price') || low.includes('rate') || low.includes('cost')) pMap.unitPrice = idx;
          if (low.includes('unit')) pMap.unitType = idx;
        });

        const parsedProducts = productTable.rows.map(r => {
          const priceRaw = pMap.unitPrice !== undefined ? r[pMap.unitPrice] : r[r.length - 1];
          const unitPrice = Number(String(priceRaw ?? '').replace(/[^0-9.]/g, '')) || 0;
          return {
            name: ((pMap.name !== undefined ? r[pMap.name] : r[0]) || 'Product / Service').toString().trim(),
            description: pMap.description !== undefined ? String(r[pMap.description] ?? '').trim() : '',
            category: pMap.category !== undefined ? String(r[pMap.category] ?? '').trim() : 'General',
            unitType: pMap.unitType !== undefined ? String(r[pMap.unitType] ?? '').trim() : 'Day',
            unitPrice,
            taxRate: 16
          };
        }).filter(p => p.name && p.unitPrice > 0);

        if (parsedProducts.length > 0) {
          actions.push({
            id: `act-imp-prods-${Date.now()}`,
            type: "import_products",
            label: `Import ${parsedProducts.length} Catalog Items into Products`,
            icon: "database",
            isMutation: true,
            riskLevel: "medium",
            summary: `Add ${parsedProducts.length} product & service items from ${attachedDoc.fileName} into your active product catalog.`,
            payload: { products: parsedProducts }
          });
        }
      }
    }
  }

  // ── Navigation action cards ──────────────────────────────────────────────
  // Cards must ONLY appear for EXPLICIT imperative commands from the user.
  // Passive mentions ("what does overdue mean?") and questions ("how do I
  // create a quote?") must NEVER spawn action cards — the AI's text answer
  // alone is the appropriate response in those cases.

  const trimmed = prompt.trim();
  const isQuestion =
    /\?\s*$/.test(trimmed) ||
    /^(how|what|why|when|where|who|which|can|could|would|should|is|are|do|does|did|explain|tell me about|give me an overview)\b/i.test(trimmed);

  if (!isQuestion) {
    // Filter/show overdue invoices — requires an explicit navigation verb
    const wantsOverdueView =
      /^(filter|show|open|view|list|display|go to|take me to)\b/i.test(trimmed) &&
      /\b(overdue|unpaid)\b/i.test(p);

    if (wantsOverdueView) {
      actions.push({
        type: "filter_invoices",
        label: "Filter Overdue Invoices",
        icon: "filter",
        isMutation: false,
        riskLevel: "low",
        payload: { status: "overdue" }
      });
    }

    // Open the Quote Builder — requires an explicit creation/opening command
    const wantsQuoteBuilder =
      /^(please\s+)?(create|draft|start|new|open)\b[^.?!]*\b(quotation|quotes?)\b/i.test(trimmed) ||
      /^open\s+(the\s+)?quote\s+builder\b/i.test(trimmed);

    if (wantsQuoteBuilder) {
      actions.push({
        type: "create_quote",
        label: "Open Quote Builder",
        icon: "plus",
        isMutation: false,
        riskLevel: "low",
        payload: { tab: "quotes", isCreating: true }
      });
    }
  }

  return actions;
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
  // No silent template fallback: if the AI service fails, surface the error so
  // callers can inform the user instead of pretending Gemini generated content.
  const data = await apiRequest<{ success: boolean; email?: string }>('/api/ai/draft-email', {
    method: 'POST',
    body: JSON.stringify(params)
  });
  if (!data.success || !data.email) {
    throw new Error('AI email drafting is unavailable right now. Please try again later.');
  }
  return cleanAiResponse(data.email);
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

  // No silent template fallback: if the AI service fails, surface the error so
  // callers can inform the user instead of pretending Gemini generated terms.
  const data = await apiRequest<{ success: boolean; terms?: string }>('/api/ai/recommend-terms', {
    method: 'POST',
    body: JSON.stringify({ clientName, items })
  });
  if (!data.success || !data.terms) {
    throw new Error('AI terms recommendation is unavailable right now. Please try again later.');
  }
  return cleanAiResponse(data.terms);
}
