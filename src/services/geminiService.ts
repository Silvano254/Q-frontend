/**
 * Gemini Service for Binti Assistant
 * Communicates with zero-cold-start Supabase Edge Function & Backend REST Endpoints.
 */


export interface SaaSContext {
  clientCount?: number;
  totalQuotes?: number;
  totalInvoices?: number;
  totalRevenue?: number;
  pendingBalance?: number;
  currency?: string;
  companyName?: string;
}

export interface ChatMessage {
  role: "user" | "model" | "system";
  content: string;
  timestamp?: string;
}

import { apiRequest } from './apiClient';

/**
 * Send a chat message or prompt to Binti via Supabase Edge Function (Instant) or Backend API fallback.
 */
export async function askGeminiAssistant(
  prompt: string,
  chatHistory: ChatMessage[] = [],
  saasContext?: SaaSContext
): Promise<string> {
  try {
    const data = await apiRequest<{ success: boolean; reply?: string }>('/api/ai/chat', {
      method: "POST",
      body: JSON.stringify({
        prompt,
        history: chatHistory,
        context: saasContext
      })
    });
    if (data.success && data.reply) return data.reply;
  } catch (error) {
    console.warn('AI API unavailable, using local fallback:', error);
  }

  // 2. Instant local fallback (no dead backend calls)
  return getLocalIntelligentFallback(prompt, saasContext);
}

/**
 * High-quality fallback response generator when API endpoints are initializing.
 */
function getLocalIntelligentFallback(prompt: string, context?: SaaSContext): string {
  const p = prompt.toLowerCase();

  // Activity summary
  if (p.includes("summary") || p.includes("summarize") || p.includes("today") || p.includes("activity")) {
    return `Here is a summary of your platform status:
• **Active Clients:** ${context?.clientCount ?? 0}
• **Total Quotes Issued:** ${context?.totalQuotes ?? 0}
• **Tax Invoices Generated:** ${context?.totalInvoices ?? 0}
• **Revenue Collected:** ${context?.currency || 'KES'} ${(context?.totalRevenue || 0).toLocaleString()}
• **Outstanding Receivables:** ${context?.currency || 'KES'} ${(context?.pendingBalance || 0).toLocaleString()}

All system operations and billing ledgers are currently up to date.`;
  }

  // Searching / Finding Invoices
  if (p.includes("invoice") && (p.includes("find") || p.includes("search") || p.includes("cant") || p.includes("can't") || p.includes("look") || p.includes("where") || p.includes("missing"))) {
    return `To locate or search for an invoice:
1. **Global Search Bar**: Use the search input at the top header (*"Global search by client, inv #, quote #, email..."*) to search across all invoices instantly.
2. **Invoices Module**: Click **Invoices & Ledger** in the left sidebar menu to view your full list of invoices, filter by status (*Paid, Unpaid, Overdue*), or export PDF copies.`;
  }

  // Searching / Finding Quotes
  if ((p.includes("quote") || p.includes("proposal") || p.includes("quotation")) && (p.includes("find") || p.includes("search") || p.includes("cant") || p.includes("can't") || p.includes("look") || p.includes("where") || p.includes("missing"))) {
    return `To locate a quote or proposal:
1. **Global Search Bar**: Type the quote number (e.g. \`QT-2026-001\`) or client name in the top search bar.
2. **Quotes Module**: Click **Quotes** in the left sidebar menu to view all active, draft, sent, or converted proposals.`;
  }

  // Searching / Finding Clients
  if (p.includes("client") && (p.includes("find") || p.includes("search") || p.includes("cant") || p.includes("can't") || p.includes("look") || p.includes("where") || p.includes("missing"))) {
    return `To locate a client profile:
1. Use the **Global Search Bar** at the top header.
2. Or click **Clients** in the left sidebar menu to view your full address directory, corporate profiles, and billing timelines.`;
  }

  // Terms & Policies
  if (p.includes("payment") || p.includes("term") || p.includes("deposit") || p.includes("policy")) {
    return `**Recommended Standard Terms & Deposit Policies for Event Bookings:**

1. **50% Commitment Deposit**: Required at booking to lock in your event date, tents, gear, and crew.
2. **50% Final Settlement**: Due 7 days prior to installation and setup day.
3. **Cancellation Policy**: Cancellations within 14 days of the event date forfeit the deposit.
4. **Ground Access**: Client must guarantee site access and 15A power within 30 metres.`;
  }

  return `I am **Binti**, your assistant for **${context?.companyName || "Binti Events"}**.

How can I assist you further with quotes, invoices, client records, or system settings today?`;
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
    if (data.success) return data.email;
  } catch (error) {
    console.warn('Email drafting API unavailable:', error);
  }
  const comp = params.companyName || "Binti Tents & Events";
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
    if (data.success) return data.terms;
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
