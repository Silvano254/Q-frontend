/**
 * Gemini Service for Binti Assistant
 * Handles prompt construction, system context injection, and generation requests via Backend API / Gemini API.
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

const STORAGE_KEY = "binti_gemini_api_key";

/**
 * Retrieve the active Gemini API key from local storage or environment variables.
 */
export function getGeminiApiKey(): string {
  const localKey = typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
  if (localKey && localKey.trim().length > 0) {
    return localKey.trim();
  }
  return import.meta.env.VITE_GEMINI_API_KEY || "";
}

/**
 * Save Gemini API Key to local storage.
 */
export function setGeminiApiKey(key: string): void {
  if (typeof window !== "undefined") {
    if (!key || key.trim() === "") {
      localStorage.removeItem(STORAGE_KEY);
    } else {
      localStorage.setItem(STORAGE_KEY, key.trim());
    }
  }
}

/**
 * Build Binti System Instruction Context.
 */
function buildSystemInstruction(context?: SaaSContext): string {
  return `You are Binti, the intelligent, highly capable, professional, and friendly assistant for Binti Events.

YOUR ROLE & PERSONA:
- You assist company admins, finance directors, and event managers with using the Binti Events platform.
- You provide concise, actionable guidance, financial analytics, quote/invoice drafting advice, and navigation help.
- You maintain a warm, polished, professional tone.
- When asked about features in Binti Events, reference the relevant modules:
  * Dashboard: Business insights, key revenue KPIs, client analytics.
  * Quotes Module: Create & issue formal event quotations, convert quotes directly to invoices, export PDFs, recommend contract terms, generate client follow-up emails.
  * Invoices & Ledger Module: Issue tax invoices, record partial & full payments, track overdue balances, view billing history, generate payment reminders.
  * Clients Directory: Maintain client profiles, communication timeline, address book, corporate contact details.
  * Products & Services Catalog: Manage event service packages, pricing, tax rates, standard descriptions.
  * Reports & Analytics: Visual charts, revenue distribution, quote acceptance rates, exportable audit ledgers.
  * Settings Module: Company details, banking instructions, currency formatting, tax configurations, security & biometric settings.

CURRENT LIVE METRICS:
${context ? `
- Company Name: ${context.companyName || "Binti Events"}
- Standard Currency: ${context.currency || "USD"}
- Active Clients: ${context.clientCount ?? "N/A"}
- Total Quotes Issued: ${context.totalQuotes ?? "N/A"}
- Total Invoices Generated: ${context.totalInvoices ?? "N/A"}
- Total Realized Revenue: ${context.currency || "$"}${context.totalRevenue?.toLocaleString() ?? "0"}
- Pending Unpaid Balances: ${context.currency || "$"}${context.pendingBalance?.toLocaleString() ?? "0"}
` : "- Live context not currently attached."}

GUIDELINES:
- Use clean Markdown with bolding, lists, and code/table formatting when helpful.
- Keep answers concise and direct. If giving step-by-step instructions, use clear numbered bullet points.
- If asked to draft an email or terms, output clean copy ready for sending.`;
}

/**
 * Send a chat message or prompt to Binti (tries Direct Gemini API if key set, else routes to Render Backend).
 */
export async function askGeminiAssistant(
  prompt: string,
  chatHistory: ChatMessage[] = [],
  saasContext?: SaaSContext
): Promise<string> {
  const apiKey = getGeminiApiKey();

  // If a client-side key is provided, attempt direct Gemini API call
  if (apiKey && apiKey.trim().length > 0) {
    try {
      const systemInstruction = buildSystemInstruction(saasContext);
      const model = "gemini-2.5-flash";
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;

      const contents = [
        {
          role: "user",
          parts: [{ text: systemInstruction }]
        },
        {
          role: "model",
          parts: [{ text: "Understood. I am Binti, your assistant for Binti Events. How may I assist you today?" }]
        }
      ];

      chatHistory.slice(-8).forEach(msg => {
        if (msg.role !== "system") {
          contents.push({
            role: msg.role === "model" ? "model" : "user",
            parts: [{ text: msg.content }]
          });
        }
      });

      contents.push({
        role: "user",
        parts: [{ text: prompt }]
      });

      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents,
          generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 1024
          }
        })
      });

      if (response.ok) {
        const data = await response.json();
        const candidateText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (candidateText) return candidateText;
      }
    } catch (directErr) {
      console.warn("Direct Gemini call bypassed, delegating to Render backend...", directErr);
    }
  }

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
      if (data.reply || data.analysis || data.message) {
        return data.reply || data.analysis || data.message;
      }
    }
  } catch (backendErr) {
    console.warn("Backend /api/ai/chat call failed, providing intelligent local response...", backendErr);
  }

  // Intelligent fallback responder if backend is temporarily starting up
  return getLocalIntelligentFallback(prompt, saasContext);
}

/**
 * High-quality fallback response generator when backend is initializing.
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
