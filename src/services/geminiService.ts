/**
 * Gemini Service for Binti Assistant
 * Communicates with zero-cold-start Supabase Edge Function & Backend REST Endpoints.
 * Equipped with full agentic action capabilities and client-side execution engine.
 */

import { apiRequest } from './apiClient';

export interface SaaSContext {
  clientCount?: number;
  totalQuotes?: number;
  totalInvoices?: number;
  totalRevenue?: number;
  pendingBalance?: number;
  currency?: string;
  companyName?: string;
  clientsSummary?: Array<{ id: string; name: string; company?: string; phone?: string; email?: string }>;
  invoicesSummary?: Array<{ id: string; invoiceNumber: string; clientName: string; grandTotal: number; balanceRemaining: number; status: string; dueDate?: string }>;
  quotesSummary?: Array<{ id: string; quoteNumber: string; clientName: string; grandTotal: number; status: string }>;
  productsCatalog?: Array<{ id: string; name: string; category: string; price: number; unit: string }>;
}

export interface ChatMessage {
  role: "user" | "model" | "system";
  content: string;
  timestamp?: string;
  actions?: AgentAction[];
}

export interface AgentAction {
  id?: string;
  type: "navigate" | "filter_invoices" | "create_quote" | "create_invoice" | "record_payment" | "open_client" | "open_settings";
  label: string;
  icon?: "file" | "credit-card" | "user" | "settings" | "filter" | "plus" | "trending";
  payload?: Record<string, any>;
}

export interface AssistantResponse {
  reply: string;
  actions?: AgentAction[];
}

/**
 * Sanitizes any raw LLM text to ensure strict adherence to "Binti Events Management System" branding
 */
export function cleanAiResponse(text: string): string {
  if (!text) return "";
  return text
    .replace(/Binti Events Corporate Suite/gi, 'Binti Events Management System')
    .replace(/Binti Events Suite/gi, 'Binti Events Management System')
    .replace(/Corporate Suite/gi, 'Management System')
    .replace(/\bSuite\b/g, 'Management System')
    .replace(/corporate event clients/gi, 'event clients')
    .replace(/corporate clients/gi, 'clients')
    .replace(/corporate client/gi, 'client')
    .replace(/corporate entities/gi, 'companies / organizations')
    .replace(/corporate entity/gi, 'company / organization')
    .replace(/corporate packages/gi, 'event packages')
    .replace(/corporate package/gi, 'event package')
    .replace(/corporate proposal/gi, 'proposal')
    .replace(/corporate billing/gi, 'billing')
    .replace(/corporate profile/gi, 'business profile')
    .replace(/corporate profiles/gi, 'client profiles')
    .replace(/corporate guidelines/gi, 'company guidelines')
    .replace(/corporate setup/gi, 'company setup')
    .replace(/corporate business/gi, 'event business')
    .replace(/corporate operations/gi, 'event operations')
    .replace(/corporate affairs/gi, 'business affairs')
    .replace(/corporate sector/gi, 'event sector')
    .replace(/corporate/gi, 'business');
}

/**
 * Send a chat message or prompt to Binti via Supabase Edge Function (Instant) or Backend API fallback.
 */
export async function askGeminiAssistant(
  prompt: string,
  chatHistory: ChatMessage[] = [],
  saasContext?: SaaSContext
): Promise<AssistantResponse> {
  const cleanPrompt = cleanAiResponse(prompt.trim());
  const cleanHistory = chatHistory.map(h => ({
    role: h.role,
    content: cleanAiResponse(h.content)
  }));

  try {
    const data = await apiRequest<{ success: boolean; reply?: string; actions?: AgentAction[] }>('/api/ai/chat', {
      method: "POST",
      body: JSON.stringify({
        prompt: cleanPrompt,
        history: cleanHistory,
        context: saasContext,
        systemInstruction: "You are Binti, the intelligent assistant for Binti Events Management System. Always refer to the system as Binti Events Management System or Binti Events. Strictly NEVER use the words 'Corporate Suite', 'Suite', or 'corporate'. Refer to clients as clients or organizations, and services as event management or event hire."
      })
    });
    if (data.success && data.reply) {
      const sanitizedReply = cleanAiResponse(data.reply);
      const actions = data.actions || extractActionsFromPrompt(cleanPrompt, saasContext);
      return { reply: sanitizedReply, actions };
    }
  } catch (error) {
    console.warn('AI API unavailable, using local fallback:', error);
  }

  // Instant local intelligent agentic fallback (works 100% offline at no cost)
  const localRes = getLocalIntelligentFallback(cleanPrompt, saasContext);
  return {
    reply: cleanAiResponse(localRes.reply),
    actions: localRes.actions
  };
}

/**
 * Extrapolates client-side execution actions from natural language prompts and live context
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
      payload: { status: "overdue" }
    });
    actions.push({
      type: "navigate",
      label: "View Invoices & Ledger",
      icon: "file",
      payload: { tab: "invoices" }
    });
  }

  // Create Quote
  if (p.includes("create quote") || p.includes("draft quote") || p.includes("new quote") || p.includes("new proposal")) {
    actions.push({
      type: "create_quote",
      label: "Open Quote Builder",
      icon: "plus",
      payload: { tab: "quotes", isCreating: true }
    });
  }

  // Create Invoice
  if (p.includes("create invoice") || p.includes("draft invoice") || p.includes("new invoice") || p.includes("issue invoice")) {
    actions.push({
      type: "create_invoice",
      label: "Open Invoice Builder",
      icon: "plus",
      payload: { tab: "invoices", isCreating: true }
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
        payload: { clientId: matchedClient.id }
      });
      actions.push({
        type: "create_quote",
        label: `Draft Quote for ${matchedClient.name}`,
        icon: "plus",
        payload: { clientId: matchedClient.id, clientName: matchedClient.name }
      });
    }
  }

  // Settings
  if (p.includes("setting") || p.includes("kra") || p.includes("bank") || p.includes("tax pin") || p.includes("terms")) {
    actions.push({
      type: "open_settings",
      label: "Open Billing Settings",
      icon: "settings",
      payload: { tab: "settings" }
    });
  }

  return actions;
}

/**
 * High-quality agentic response generator with live context awareness and action dispatching.
 */
function getLocalIntelligentFallback(prompt: string, context?: SaaSContext): AssistantResponse {
  const p = prompt.toLowerCase();
  const curr = context?.currency || 'KES';
  const actions: AgentAction[] = [];

  // 1. Overdue invoices & Debt Recovery
  if (p.includes("overdue") || p.includes("unpaid") || p.includes("debt") || p.includes("debtor") || p.includes("owing") || p.includes("receivable")) {
    const overdueList = (context?.invoicesSummary || []).filter(
      i => i.status === 'overdue' || (i.status !== 'paid' && (i.balanceRemaining ?? i.grandTotal) > 0)
    );

    let reply = `### ⚠️ Outstanding Invoices & Debt Summary\n\n`;
    reply += `You currently have **${overdueList.length}** invoices with pending balance totaling **${curr} ${(context?.pendingBalance || 0).toLocaleString()}**.\n\n`;

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
      payload: { status: "overdue" }
    });
    actions.push({
      type: "navigate",
      label: "View Invoices & Ledger",
      icon: "file",
      payload: { tab: "invoices" }
    });

    return { reply, actions };
  }

  // 2. Business Analysis & Performance
  if (p.includes("analysis") || p.includes("analyze") || p.includes("performance") || p.includes("revenue") || p.includes("financial") || p.includes("summary") || p.includes("today")) {
    const totalRev = context?.totalRevenue || 0;
    const pending = context?.pendingBalance || 0;
    const totalVolume = totalRev + pending;
    const collectionRate = totalVolume > 0 ? Math.round((totalRev / totalVolume) * 100) : 100;
    const totalQuotes = context?.totalQuotes || 0;
    const totalInvoices = context?.totalInvoices || 0;
    const conversionRate = (totalQuotes + totalInvoices) > 0 ? Math.round((totalInvoices / (totalQuotes + totalInvoices)) * 100) : 0;

    let reply = `### 📊 Binti Business & Revenue Intelligence\n\n`;
    reply += `Here is your current operational snapshot for **${context?.companyName || "Binti Events"}**:\n\n`;
    reply += `| Key Metric | Status Value | Assessment |\n`;
    reply += `| :--- | :--- | :--- |\n`;
    reply += `| **Liquid Revenue Collected** | **${curr} ${totalRev.toLocaleString()}** | Settled in ledger |\n`;
    reply += `| **Outstanding Receivables** | **${curr} ${pending.toLocaleString()}** | ${pending > 0 ? 'Follow-up recommended' : 'Zero debt'} |\n`;
    reply += `| **Cash Collection Rate** | **${collectionRate}%** | ${collectionRate >= 75 ? '🟢 Healthy cash flow' : '🟡 Action needed on aging'} |\n`;
    reply += `| **Active Client Profiles** | **${context?.clientCount ?? 0} Accounts** | Event directory |\n`;
    reply += `| **Quote-to-Invoice Conversion** | **${conversionRate}%** | Closed bookings |\n\n`;

    reply += `**Executive Recommendations:**\n`;
    if (pending > 0) {
      reply += `1. **Follow-up Reminders**: ${context?.invoicesSummary?.filter(i => i.status === 'overdue').length || 0} overdue invoices can be followed up using AI email drafts.\n`;
    }
    reply += `2. **Proposals**: You have ${totalQuotes} proposal drafts ready for conversion.\n`;

    actions.push({
      type: "navigate",
      label: "Open Analytics Reports",
      icon: "trending",
      payload: { tab: "reports" }
    });
    actions.push({
      type: "filter_invoices",
      label: "Review Outstanding Invoices",
      icon: "filter",
      payload: { status: "pending" }
    });
    actions.push({
      type: "navigate",
      label: "Review Quotes",
      icon: "file",
      payload: { tab: "quotes" }
    });

    return { reply, actions };
  }

  // 3. Create or Draft a Quote / Proposal
  if (p.includes("quote") && (p.includes("create") || p.includes("draft") || p.includes("new") || p.includes("make") || p.includes("prepare"))) {
    // Check if a client was specified
    let matchedClient = (context?.clientsSummary || []).find(c => 
      p.includes(c.name.toLowerCase()) || (c.company && p.includes(c.company.toLowerCase()))
    );

    let reply = `I'm ready to help you create a new quotation!`;
    if (matchedClient) {
      reply += `\n\nIdentified Client: **${matchedClient.name}**${matchedClient.company ? ` (${matchedClient.company})` : ''}.\nClick the action below to open the Quote Builder with this client selected.`;
      actions.push({
        type: "create_quote",
        label: `Create Quote for ${matchedClient.name}`,
        icon: "plus",
        payload: { clientId: matchedClient.id, clientName: matchedClient.name, isCreating: true }
      });
    } else {
      reply += `\n\nClick the button below to launch the **Quote Builder**, select event items from your catalog (stretch tents, chairs, lighting), and generate a formal PDF proposal.`;
      actions.push({
        type: "create_quote",
        label: "Open Quote Builder",
        icon: "plus",
        payload: { tab: "quotes", isCreating: true }
      });
    }

    return { reply, actions };
  }

  // 4. Create or Issue an Invoice
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
        payload: { clientId: matchedClient.id, clientName: matchedClient.name, isCreating: true }
      });
    } else {
      reply += `\n\nClick below to open the **Invoice Builder**, add billable items, include transport logistics if needed, and issue an official tax invoice.`;
      actions.push({
        type: "create_invoice",
        label: "Open Invoice Builder",
        icon: "plus",
        payload: { tab: "invoices", isCreating: true }
      });
    }

    return { reply, actions };
  }

  // 5. Searching / Finding specific client
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
        payload: { clientId: matchedClient.id }
      });
      actions.push({
        type: "create_quote",
        label: `Draft New Quote for ${matchedClient.name}`,
        icon: "plus",
        payload: { clientId: matchedClient.id, clientName: matchedClient.name }
      });

      return { reply, actions };
    }

    let reply = `You have **${context?.clientCount ?? 0}** registered event clients.\n\nUse the search bar at the top or click below to browse the full client directory:`;
    actions.push({
      type: "navigate",
      label: "Open Clients Directory",
      icon: "user",
      payload: { tab: "clients" }
    });
    return { reply, actions };
  }

  // 6. Terms & Policies
  if (p.includes("payment") || p.includes("term") || p.includes("deposit") || p.includes("policy") || p.includes("cancellation")) {
    const reply = `**Recommended Standard Terms & Deposit Policies for Event Bookings:**\n\n` +
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
      payload: { tab: "settings" }
    });

    return { reply, actions };
  }

  // 7. General Navigation & Default
  const reply = `I am **Binti**, your AI Assistant for **${context?.companyName || "Binti Events Management System"}**.\n\n` +
    `I can help you analyze cash flow, create quotes, search invoices, look up client records, and jump directly to any screen. What would you like to do?`;

  actions.push({
    type: "navigate",
    label: "Create Quotation",
    icon: "plus",
    payload: { tab: "quotes", isCreating: true }
  });
  actions.push({
    type: "filter_invoices",
    label: "Check Overdue Invoices",
    icon: "filter",
    payload: { status: "overdue" }
  });
  actions.push({
    type: "navigate",
    label: "Analyze Performance",
    icon: "trending",
    payload: { tab: "reports" }
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

Thank you for contacting ${comp} regarding your upcoming landmark occasion.

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
