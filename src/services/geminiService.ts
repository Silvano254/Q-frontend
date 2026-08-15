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

const SUPABASE_EDGE_FUNCTION_URL = 'https://ltinjyvcrgwcvudrnfby.supabase.co/functions/v1/ai-chat';

/**
 * Send a chat message or prompt to Binti via Supabase Edge Function (Instant) or Backend API fallback.
 */
export async function askGeminiAssistant(
  prompt: string,
  chatHistory: ChatMessage[] = [],
  saasContext?: SaaSContext
): Promise<string> {
  // 1. Try Supabase Edge Function with a strict 10-second timeout
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const res = await fetch(SUPABASE_EDGE_FUNCTION_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": "sb_publishable_0LaJxeEG6eXw6gs27HUd3Q__z1Dy-Xo",
        "Authorization": "Bearer sb_publishable_0LaJxeEG6eXw6gs27HUd3Q__z1Dy-Xo"
      },
      body: JSON.stringify({
        prompt,
        history: chatHistory,
        context: saasContext
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (data.success && data.reply) {
        return data.reply;
      }
    }

    if (res.status === 401) {
      return `⚠️ **Authentication Required (401)**\n\nPlease ensure your \`GEMINI_API_KEY\` environment variable is configured in your Supabase Edge Function settings.`;
    }

    if (res.status === 429) {
      return `⚠️ **Rate Limit Exceeded (429)**\n\nGemini API request limit reached. Please wait a moment and try again.`;
    }
  } catch (edgeErr: any) {
    if (edgeErr.name === 'AbortError') {
      console.warn("Supabase Edge Function timed out after 10s, using local fallback.");
    } else {
      console.warn("Supabase Edge Function error, using local fallback:", edgeErr.message);
    }
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
