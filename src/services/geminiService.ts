/**
 * Gemini Service for Binti Assistant
 * Communicates with zero-cold-start Supabase Edge Function & Backend REST Endpoints.
 * Equipped with Level 1 (Ask), Level 2 (Assist), and Level 3 (Execute) agentic capabilities.
 */

import { apiRequest } from './apiClient';
import { BillingItem } from '../types';

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

export interface ChatMessage {
  role: "user" | "model" | "system";
  content: string;
  timestamp?: string;
  actions?: AgentAction[];
}

export type UIActionType = "navigate" | "filter_invoices" | "open_client" | "open_settings";
export type MutationActionType = "create_quote" | "create_invoice" | "record_payment" | "create_expense" | "update_client" | "update_invoice";
export type AgentActionType = UIActionType | MutationActionType;

export interface RecordPaymentPayload {
  invoiceId: string;
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

export interface AgentAction {
  id?: string;
  type: AgentActionType;
  label: string;
  icon?: "file" | "credit-card" | "user" | "settings" | "filter" | "plus" | "trending" | "receipt" | "shield";
  isMutation?: boolean;
  riskLevel?: "low" | "medium" | "high";
  summary?: string;
  payload?: Record<string, any> & (
    | RecordPaymentPayload
    | CreateQuotePayload
    | CreateInvoicePayload
    | CreateExpensePayload
    | UpdateClientPayload
  );
}

export interface AssistantResponse {
  reply: string;
  actions?: AgentAction[];
}

/**
 * Sanitizes output formatting and aligns system branding
 */
export function cleanAiResponse(text: string): string {
  if (!text) return "";
  return text
    .replace(/Binti Events Corporate Suite/gi, 'Binti Events Management System')
    .replace(/Binti Events Suite/gi, 'Binti Events Management System')
    .replace(/Corporate Suite/gi, 'Management System')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .trim();
}

/**
 * Send a chat prompt to Binti via backend AI endpoint or deterministic local fallback.
 */
export async function askGeminiAssistant(
  prompt: string,
  chatHistory: ChatMessage[] = [],
  saasContext?: SaaSContext,
  signal?: AbortSignal
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
    const data = await apiRequest<{ success: boolean; reply?: string; actions?: AgentAction[] }>('/api/ai/chat', {
      method: "POST",
      signal,
      body: JSON.stringify({
        prompt: cleanPrompt,
        history: cleanHistory,
        context: saasContext,
        systemInstruction: `You are Binti, the intelligent single-user business operating assistant for Binti Events Management System.
You assist the sole business owner in running event management, rentals, quotations, invoicing, payments, expenses, and client records.
Always refer to the system as Binti Events Management System or Binti Events.
Never claim a database write has been completed before the user confirms the action. When proposing an action, explain the details and generate a structured AgentAction with appropriate riskLevel.`
      })
    });

    if (signal?.aborted) {
      throw new DOMException('Aborted', 'AbortError');
    }

    if (data.success && data.reply) {
      const sanitizedReply = cleanAiResponse(data.reply);
      const actions = data.actions || extractActionsFromPrompt(cleanPrompt, saasContext);
      return { reply: sanitizedReply, actions };
    }
  } catch (error: any) {
    if (error?.name === 'AbortError' || signal?.aborted) {
      throw error;
    }
    console.warn('AI API unavailable, using local fallback:', error);
  }

  if (signal?.aborted) {
    throw new DOMException('Aborted', 'AbortError');
  }

  // Deterministic local intelligent fallback
  const localRes = getLocalIntelligentFallback(cleanPrompt, saasContext);
  return {
    reply: cleanAiResponse(localRes.reply),
    actions: localRes.actions
  };
}

/**
 * Extrapolates UI and mutation actions from natural language prompts and live context
 */
function extractActionsFromPrompt(prompt: string, context?: SaaSContext): AgentAction[] {
  const p = prompt.toLowerCase();
  const actions: AgentAction[] = [];

  // Overdue / Unpaid invoices
  if (p.includes("overdue") || p.includes("unpaid") || p.includes("debt") || p.includes("debtor") || p.includes("owing")) {
    actions.push({
      type: "filter_invoices",
      label: "Filter Overdue Invoices",
      icon: "filter",
      isMutation: false,
      riskLevel: "low",
      payload: { status: "overdue" }
    });
    actions.push({
      type: "navigate",
      label: "View Invoices & Ledger",
      icon: "file",
      isMutation: false,
      riskLevel: "low",
      payload: { tab: "invoices" }
    });
  }

  // Create Quote
  if (p.includes("create quote") || p.includes("draft quote") || p.includes("new quote") || p.includes("new proposal")) {
    actions.push({
      type: "create_quote",
      label: "Open Quote Builder",
      icon: "plus",
      isMutation: false,
      riskLevel: "low",
      payload: { tab: "quotes", isCreating: true }
    });
  }

  // Create Invoice
  if (p.includes("create invoice") || p.includes("draft invoice") || p.includes("new invoice") || p.includes("issue invoice")) {
    actions.push({
      type: "create_invoice",
      label: "Open Invoice Builder",
      icon: "plus",
      isMutation: false,
      riskLevel: "low",
      payload: { tab: "invoices", isCreating: true }
    });
  }

  // Record Payment
  if (p.includes("record payment") || p.includes("add payment") || p.includes("paid")) {
    actions.push({
      type: "navigate",
      label: "Record Payment in Ledger",
      icon: "credit-card",
      isMutation: false,
      riskLevel: "low",
      payload: { tab: "invoices" }
    });
  }

  // Add Expense
  if (p.includes("expense") || p.includes("fuel") || p.includes("transport cost") || p.includes("labor cost")) {
    actions.push({
      type: "navigate",
      label: "View Financial Reports",
      icon: "trending",
      isMutation: false,
      riskLevel: "low",
      payload: { tab: "reports" }
    });
  }

  // Client lookup
  if (p.includes("client") && context?.clientsSummary) {
    const matchedClient = context.clientsSummary.find(c => 
      p.includes(c.name.toLowerCase()) || (c.company && p.includes(c.company.toLowerCase()))
    );
    if (matchedClient) {
      actions.push({
        type: "open_client",
        label: `Open Profile: ${matchedClient.name}`,
        icon: "user",
        isMutation: false,
        riskLevel: "low",
        payload: { clientId: matchedClient.id }
      });
      actions.push({
        type: "create_quote",
        label: `Draft Quote for ${matchedClient.name}`,
        icon: "plus",
        isMutation: false,
        riskLevel: "low",
        payload: { clientId: matchedClient.id, clientName: matchedClient.name, isCreating: true }
      });
    }
  }

  // Settings
  if (p.includes("setting") || p.includes("kra") || p.includes("bank") || p.includes("tax pin") || p.includes("terms")) {
    actions.push({
      type: "open_settings",
      label: "Open Billing Settings",
      icon: "settings",
      isMutation: false,
      riskLevel: "low",
      payload: { tab: "settings" }
    });
  }

  return actions;
}

/**
 * Deterministic, offline-capable business operating assistant engine.
 */
function getLocalIntelligentFallback(prompt: string, context?: SaaSContext): AssistantResponse {
  const p = prompt.toLowerCase();
  const curr = context?.currency || 'KES';
  const actions: AgentAction[] = [];

  // Deterministic metrics calculation
  const totalRev = context?.totalRevenue ?? 0;
  const pending = context?.pendingBalance ?? 0;
  const totalVolume = totalRev + pending;
  const collectionRate = context?.collectionRate ?? (totalVolume > 0 ? Math.round((totalRev / totalVolume) * 100) : 100);
  const totalQuotes = context?.totalQuotes ?? 0;
  const convertedQuotes = context?.convertedQuotes ?? (context?.quotesSummary?.filter(q => q.status === 'converted').length ?? 0);
  const conversionRate = context?.conversionRate ?? (totalQuotes > 0 ? Math.round((convertedQuotes / totalQuotes) * 100) : 0);
  const totalExpenses = context?.totalExpenses ?? (context?.expensesSummary?.reduce((s, e) => s + (e.amount || 0), 0) ?? 0);
  const netEstimatedProfit = totalRev - totalExpenses;

  // 1. Proactive Business Brief
  if (p.includes("brief") || p.includes("daily brief") || p.includes("morning") || p.includes("overview") || p.includes("attention")) {
    const overdueList = (context?.invoicesSummary || []).filter(
      i => i.status === 'overdue' || (i.status !== 'paid' && (i.balanceRemaining ?? i.grandTotal) > 0)
    );
    const draftQuotes = (context?.quotesSummary || []).filter(q => q.status === 'draft' || q.status === 'sent');

    let reply = `### 📋 Binti Executive Business Brief\n\n`;
    reply += `Good day! Here is your current operational snapshot for **${context?.companyName || "Binti Events"}**:\n\n`;
    
    reply += `#### 💰 Money & Cash Flow\n`;
    reply += `• **Collected Liquid Revenue:** **${curr} ${totalRev.toLocaleString()}**\n`;
    reply += `• **Outstanding Receivables:** **${curr} ${pending.toLocaleString()}** (${collectionRate}% collection efficiency)\n`;
    if (totalExpenses > 0) {
      reply += `• **Recorded Expenses:** **${curr} ${totalExpenses.toLocaleString()}** (Net Margin: **${curr} ${netEstimatedProfit.toLocaleString()}**)\n`;
    }
    reply += `\n`;

    reply += `#### 📑 Quotations & Pipeline\n`;
    reply += `• **Active Open Proposals:** **${draftQuotes.length}** quotes awaiting customer confirmation.\n`;
    reply += `• **Quote Conversion Rate:** **${conversionRate}%** (${convertedQuotes} converted of ${totalQuotes} total proposals).\n\n`;

    reply += `#### ⚠️ Attention & Action Items\n`;
    if (overdueList.length > 0) {
      reply += `• **${overdueList.length} Invoices Need Follow-up**: Unsettled balances totaling **${curr} ${pending.toLocaleString()}**.\n`;
    } else {
      reply += `• **Zero Overdue Debt**: All issued invoices are currently settled or in good standing.\n`;
    }
    if (draftQuotes.length > 0) {
      reply += `• **Follow-up on Quotes**: Contact clients for pending proposals to lock booking dates.\n`;
    }

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
    actions.push({
      type: "navigate",
      label: "View Financial Analytics",
      icon: "trending",
      isMutation: false,
      riskLevel: "low",
      payload: { tab: "reports" }
    });

    return { reply, actions };
  }

  // 2. Overdue invoices & Debt Recovery
  if (p.includes("overdue") || p.includes("unpaid") || p.includes("debt") || p.includes("debtor") || p.includes("owing") || p.includes("receivable")) {
    const overdueList = (context?.invoicesSummary || []).filter(
      i => i.status === 'overdue' || (i.status !== 'paid' && (i.balanceRemaining ?? i.grandTotal) > 0)
    );

    let reply = `### ⚠️ Outstanding Invoices & Debt Summary\n\n`;
    reply += `You currently have **${overdueList.length}** invoices with pending balances totaling **${curr} ${pending.toLocaleString()}**.\n\n`;

    if (overdueList.length > 0) {
      reply += `| Invoice # | Client | Total Billed | Balance Due | Status |\n`;
      reply += `| :--- | :--- | :--- | :--- | :--- |\n`;
      overdueList.slice(0, 5).forEach(inv => {
        reply += `| **${inv.invoiceNumber}** | ${inv.clientName} | ${curr} ${(inv.grandTotal || 0).toLocaleString()} | **${curr} ${(inv.balanceRemaining ?? inv.grandTotal).toLocaleString()}** | \`${(inv.status || 'Pending').toUpperCase()}\` |\n`;
      });
      if (overdueList.length > 5) {
        reply += `\n*...and ${overdueList.length - 5} more unpaid invoices.*`;
      }
    } else {
      reply += `✨ **Great news!** There are no overdue invoices at this time. All customer accounts are up to date.`;
    }

    actions.push({
      type: "filter_invoices",
      label: "Filter Overdue Invoices",
      icon: "filter",
      isMutation: false,
      riskLevel: "low",
      payload: { status: "overdue" }
    });
    actions.push({
      type: "navigate",
      label: "View Invoices & Ledger",
      icon: "file",
      isMutation: false,
      riskLevel: "low",
      payload: { tab: "invoices" }
    });

    return { reply, actions };
  }

  // 3. Business Analysis & Performance (Deterministic)
  if (p.includes("analysis") || p.includes("analyze") || p.includes("performance") || p.includes("revenue") || p.includes("financial") || p.includes("profit") || p.includes("summary") || p.includes("today")) {
    let reply = `### 📊 Binti Business & Revenue Intelligence\n\n`;
    reply += `Deterministic metrics calculated for **${context?.companyName || "Binti Events"}**:\n\n`;
    reply += `| Key Financial Metric | Value | Assessment |\n`;
    reply += `| :--- | :--- | :--- |\n`;
    reply += `| **Liquid Revenue Collected** | **${curr} ${totalRev.toLocaleString()}** | Settled in ledger |\n`;
    reply += `| **Outstanding Receivables** | **${curr} ${pending.toLocaleString()}** | ${pending > 0 ? 'Follow-up recommended' : 'Zero debt'} |\n`;
    reply += `| **Cash Collection Rate** | **${collectionRate}%** | ${collectionRate >= 75 ? '🟢 Healthy cash flow' : '🟡 Aging receivables'} |\n`;
    reply += `| **Quote Conversion Rate** | **${conversionRate}%** | Closed bookings (${convertedQuotes}/${totalQuotes}) |\n`;
    if (totalExpenses > 0) {
      reply += `| **Operating Expenses** | **${curr} ${totalExpenses.toLocaleString()}** | Direct & overhead |\n`;
      reply += `| **Estimated Net Margin** | **${curr} ${netEstimatedProfit.toLocaleString()}** | Net operating gain |\n`;
    }
    reply += `| **Active Client Accounts** | **${context?.clientCount ?? 0} Accounts** | Event directory |\n\n`;

    actions.push({
      type: "navigate",
      label: "Open Analytics Reports",
      icon: "trending",
      isMutation: false,
      riskLevel: "low",
      payload: { tab: "reports" }
    });
    actions.push({
      type: "filter_invoices",
      label: "Review Outstanding Invoices",
      icon: "filter",
      isMutation: false,
      riskLevel: "low",
      payload: { status: "pending" }
    });

    return { reply, actions };
  }

  // 4. Create or Draft a Quote
  if (p.includes("quote") && (p.includes("create") || p.includes("draft") || p.includes("new") || p.includes("make") || p.includes("prepare"))) {
    let matchedClient = (context?.clientsSummary || []).find(c => 
      p.includes(c.name.toLowerCase()) || (c.company && p.includes(c.company.toLowerCase()))
    );

    let reply = `I'm ready to launch the Quote Builder.`;
    if (matchedClient) {
      reply += `\n\nClient identified: **${matchedClient.name}**${matchedClient.company ? ` (${matchedClient.company})` : ''}.\nClick below to prepare this quotation.`;
      actions.push({
        type: "create_quote",
        label: `Create Quote for ${matchedClient.name}`,
        icon: "plus",
        isMutation: false,
        riskLevel: "low",
        payload: { clientId: matchedClient.id, clientName: matchedClient.name, isCreating: true }
      });
    } else {
      reply += `\n\nClick below to open the **Quote Builder**, select event items from your catalog (stretch tents, chairs, lighting), and generate a formal proposal.`;
      actions.push({
        type: "create_quote",
        label: "Open Quote Builder",
        icon: "plus",
        isMutation: false,
        riskLevel: "low",
        payload: { tab: "quotes", isCreating: true }
      });
    }

    return { reply, actions };
  }

  // 5. Create or Issue an Invoice
  if (p.includes("invoice") && (p.includes("create") || p.includes("draft") || p.includes("new") || p.includes("issue") || p.includes("bill"))) {
    let matchedClient = (context?.clientsSummary || []).find(c => 
      p.includes(c.name.toLowerCase()) || (c.company && p.includes(c.company.toLowerCase()))
    );

    let reply = `I'm ready to launch the Invoice Builder.`;
    if (matchedClient) {
      reply += `\n\nClient selected: **${matchedClient.name}**.\nClick below to draft an official tax invoice.`;
      actions.push({
        type: "create_invoice",
        label: `Create Invoice for ${matchedClient.name}`,
        icon: "plus",
        isMutation: false,
        riskLevel: "low",
        payload: { clientId: matchedClient.id, clientName: matchedClient.name, isCreating: true }
      });
    } else {
      reply += `\n\nClick below to open the **Invoice Builder**, add billable items, include transport logistics, and issue an official tax invoice.`;
      actions.push({
        type: "create_invoice",
        label: "Open Invoice Builder",
        icon: "plus",
        isMutation: false,
        riskLevel: "low",
        payload: { tab: "invoices", isCreating: true }
      });
    }

    return { reply, actions };
  }

  // 6. Client Lookup
  if (p.includes("client") || p.includes("customer")) {
    const clients = context?.clientsSummary || [];
    const matchedClient = clients.find(c => 
      p.includes(c.name.toLowerCase()) || (c.company && p.includes(c.company.toLowerCase()))
    );

    if (matchedClient) {
      const clientInvoices = (context?.invoicesSummary || []).filter(i => i.clientName === matchedClient.name);
      const totalBalance = clientInvoices.reduce((s, i) => s + (i.balanceRemaining ?? i.grandTotal), 0);

      let reply = `### 👤 Client Record: ${matchedClient.name}\n\n`;
      reply += `• **Company / Org:** ${matchedClient.company || 'Private Client'}\n`;
      reply += `• **Email:** ${matchedClient.email || 'N/A'}\n`;
      reply += `• **Phone:** ${matchedClient.phone || 'N/A'}\n`;
      reply += `• **Invoices Issued:** ${clientInvoices.length}\n`;
      reply += `• **Outstanding Balance:** **${curr} ${totalBalance.toLocaleString()}**\n`;

      actions.push({
        type: "open_client",
        label: `Open ${matchedClient.name}'s Profile`,
        icon: "user",
        isMutation: false,
        riskLevel: "low",
        payload: { clientId: matchedClient.id }
      });
      actions.push({
        type: "create_quote",
        label: `Draft New Quote for ${matchedClient.name}`,
        icon: "plus",
        isMutation: false,
        riskLevel: "low",
        payload: { clientId: matchedClient.id, clientName: matchedClient.name, isCreating: true }
      });

      return { reply, actions };
    }

    let reply = `You have **${context?.clientCount ?? 0}** registered event clients.\n\nBrowse the full client directory:`;
    actions.push({
      type: "navigate",
      label: "Open Clients Directory",
      icon: "user",
      isMutation: false,
      riskLevel: "low",
      payload: { tab: "clients" }
    });
    return { reply, actions };
  }

  // 7. Terms & Policies
  if (p.includes("payment") || p.includes("term") || p.includes("deposit") || p.includes("policy") || p.includes("cancellation")) {
    const reply = `**Standard Terms & Deposit Policies for Event Bookings:**\n\n` +
      `1. **50% Commitment Deposit**: Required upon booking to lock event dates, marquee structures, and logistics crew.\n` +
      `2. **50% Final Settlement**: Due 7 days prior to installation and setup day.\n` +
      `3. **Site & Power Access**: Client must guarantee clear, level ground and 15A electrical supply within 30 metres.\n` +
      `4. **Equipment Safeguard**: Broken or damaged items billed at standard replacement cost.\n` +
      `5. **Cancellation Policy**: Written notice 30+ days = 50% refund; 14-29 days = 25% refund; under 14 days = non-refundable.\n` +
      `6. **Quote Validity**: Valid for 30 calendar days from issue date.`;

    actions.push({
      type: "open_settings",
      label: "Update Default System Terms",
      icon: "settings",
      isMutation: false,
      riskLevel: "low",
      payload: { tab: "settings" }
    });

    return { reply, actions };
  }

  // 8. General Navigation & Default
  const reply = `I am **Binti**, your AI Assistant for **${context?.companyName || "Binti Events Management System"}**.\n\n` +
    `I can give you an executive business brief, analyze receivables, draft quotes, search invoices, and prepare operational records. How can I assist you right now?`;

  actions.push({
    type: "navigate",
    label: "View Executive Brief",
    icon: "trending",
    isMutation: false,
    riskLevel: "low",
    payload: { tab: "dashboard" }
  });
  actions.push({
    type: "create_quote",
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
 * AI Email Drafting Generator for Quotes and Invoices
 */
export async function generateEmailDraft(params: {
  type: "Quote" | "Invoice";
  number: string;
  clientName: string;
  amount: number;
  dueDate?: string;
  notes?: string;
  companyName?: string;
  currency?: string;
}): Promise<string> {
  try {
    const data = await apiRequest<{ success: boolean; email: string }>('/api/ai/draft-email', {
      method: 'POST', body: JSON.stringify(params)
    });
    if (data.success && data.email) return cleanAiResponse(data.email);
  } catch (error) {
    console.warn('Email drafting API unavailable:', error);
  }
  const comp = params.companyName || "Binti Events";
  const curr = params.currency || "KES";
  const amtStr = `${curr} ${(params.amount || 0).toLocaleString()}`;
  const dateStr = params.dueDate || "the agreed date";

  if (params.type === "Quote") {
    return `Dear ${params.clientName},

Thank you for contacting ${comp} regarding your upcoming event.

We are pleased to share your customized proposal (${params.number}) totaling ${amtStr}. Our team is dedicated to providing high-quality tents, decor, and seamless event execution tailored to your vision.

Key Details:
• Proposal Reference: ${params.number}
• Total Investment: ${amtStr}
• Proposal Validity: ${dateStr}

${params.notes ? `Note: ${params.notes}\n\n` : ''}To confirm your booking and secure your event date on our calendar, a 50% commitment deposit is required. 

Should you have any questions or require adjustments to the items quoted, please reply directly to this email or call our hotline.

Warm regards,

Events & Billing Operations
${comp}`;
  } else {
    return `Dear ${params.clientName},

We hope this email finds you well. 

Please find attached your Tax Invoice (${params.number}) for your recent event hire and setup services with ${comp}.

Payment Summary:
• Invoice Reference: ${params.number}
• Balance Due: ${amtStr}
• Due Date: ${dateStr}

${params.notes ? `Logistics Note: ${params.notes}\n\n` : ''}Kindly arrange for settlement on or before ${dateStr} to maintain your account in good standing. You can complete payment via M-Pesa or Direct Bank Transfer as outlined on the invoice.

If you have already processed this payment, please disregard this automated reminder or reply with your M-Pesa/Bank transaction reference code.

Thank you for choosing ${comp}!

Warm regards,

Finance & Accounts Team
${comp}`;
  }
}

/**
 * AI Terms Recommendation Generator for Quotes
 */
export async function recommendTerms(clientName?: string, items?: Array<{ description: string }>): Promise<string> {
  try {
    const data = await apiRequest<{ success: boolean; terms: string }>('/api/ai/recommend-terms', {
      method: 'POST', body: JSON.stringify({ clientName, items })
    });
    if (data.success && data.terms) return cleanAiResponse(data.terms);
  } catch (error) {
    console.warn('Terms recommendation API unavailable:', error);
  }
  return `1. 50% commitment fee required upon booking to lock event dates, equipment, and logistics crew.
2. 50% final balance clearance due 7 days prior to installation and setup day.
3. Client is responsible for site security and providing clear, level ground access with 15A electrical power within 30 metres.
4. Broken, damaged, or unreturned equipment will be billed at standard replacement cost.
5. Cancellation Policy: Written cancellation 30+ days prior receives a 50% deposit refund; 14-29 days receives 25% refund; under 14 days is non-refundable.
6. Quotation valid for 30 calendar days from issue date.`;
}
