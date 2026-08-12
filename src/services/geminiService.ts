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
  // Delegate request to Render Backend Service (uses server process.env.GEMINI_API_KEY)
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

    if (res.ok) {
      const data = await res.json();
      if (data.reply || data.analysis || data.message || data.text) {
        return data.reply || data.analysis || data.message || data.text;
      }
    }
  } catch (backendErr) {
    console.warn("Backend /api/ai/chat call failed, providing fallback response...", backendErr);
  }

  // Intelligent fallback responder if backend is initializing or endpoint format differs
  return getLocalIntelligentFallback(prompt, saasContext);
}

/**
 * High-quality fallback response generator when backend service is initializing.
 */
function getLocalIntelligentFallback(prompt: string, context?: SaaSContext): string {
  const p = prompt.toLowerCase();

  if (p.includes("convert") && (p.includes("quote") || p.includes("quotation"))) {
    return `To convert a Quotation into a Tax Invoice:
1. Navigate to the **Quotes Module** from the left sidebar.
2. Locate the target proposal in your list.
3. Click the **Actions** dropdown or row options and select **"Convert to Invoice"**.
4. Review the generated Tax Invoice with pre-filled line items, tax rates, and client details, then click **Save & Issue**.`;
  }

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

  if (p.includes("payment") || p.includes("term") || p.includes("deposit")) {
    return `**Recommended Standard Terms for Event Bookings:**
1. **Deposit**: 50% commitment deposit required upon booking to secure date and inventory.
2. **Final Balance**: Remaining 50% balance due 7 days prior to event installation day.
3. **Cancellation**: Cancellations within 14 days of event date forfeit the deposit.
4. **Site Access**: Client must ensure ground clearance and power access within 30 metres.`;
  }

  return `I am **Binti**, your assistant for **${context?.companyName || "Binti Events"}**.

Here is a quick summary of your current platform status:
• **Active Clients:** ${context?.clientCount ?? 0}
• **Total Proposals Issued:** ${context?.totalQuotes ?? 0}
• **Tax Invoices Generated:** ${context?.totalInvoices ?? 0}
• **Realized Revenue:** ${context?.currency || "$"}${(context?.totalRevenue || 0).toLocaleString()}
• **Outstanding Receivables:** ${context?.currency || "$"}${(context?.pendingBalance || 0).toLocaleString()}

How can I assist you further with quotes, invoices, or client records today?`;
}
