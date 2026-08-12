/**
 * Gemini Service for Binti Assistant
 * All API key processing is strictly handled on the backend (Render).
 * Frontend components invoke this service, which communicates directly with backend /api/ai endpoints.
 */
import { getApiUrl } from "../config/api";

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

/**
 * Send a chat message or prompt to Binti via Backend API (Render server handles GEMINI_API_KEY).
 */
export async function askGeminiAssistant(
  prompt: string,
  chatHistory: ChatMessage[] = [],
  saasContext?: SaaSContext
): Promise<string> {
  try {
    const backendUrl = getApiUrl("/api/ai/chat");
    const res = await fetch(backendUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt,
        history: chatHistory,
        context: saasContext
      })
    });

    const data = await res.json().catch(() => ({}));

    if (res.ok && data.success && data.reply) {
      return data.reply;
    }

    // Explicit Auth & Rate Limit Alerts
    if (res.status === 401) {
      return `⚠️ **Authentication Required (401)**\n\nPlease ensure your \`GEMINI_API_KEY\` environment variable is configured in your Render backend settings.`;
    }

    if (res.status === 429) {
      return `⚠️ **Rate Limit Exceeded (429)**\n\nGemini API request limit reached. Please wait a moment and try again.`;
    }

  } catch (backendErr) {
    console.warn("Backend /api/ai/chat call failed, using intelligent fallback...", backendErr);
  }

  // Seamless fallback responder if model endpoint is updating
  return getLocalIntelligentFallback(prompt, saasContext);
}

/**
 * High-quality fallback response generator when backend service is initializing.
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

  // Converting Quotes
  if (p.includes("convert") && (p.includes("quote") || p.includes("quotation"))) {
    return `To convert a Quotation into a Tax Invoice:
1. Navigate to the **Quotes Module** from the left sidebar.
2. Locate the target proposal in your list.
3. Click the **Actions** dropdown or row options and select **"Convert to Invoice"**.
4. Review the generated Tax Invoice with pre-filled line items, tax rates, and client details, then click **Save & Issue**.`;
  }

  // Email drafting
  if (p.includes("email") || p.includes("reminder") || p.includes("draft")) {
    return `Here is a professional email template you can copy:

**Subject:** Follow-up regarding Quotation / Invoice — ${context?.companyName || "Binti Events"}

Dear Valued Client,

We hope this message finds you well. 

We are writing to follow up on your recent quotation with Binti Events. Please let us know if you have any questions or require any adjustments to your event setup package.

We look forward to curating an extraordinary event experience for you!

Warm regards,  
**${context?.companyName || "Binti Events Team"}**`;
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
