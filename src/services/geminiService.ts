/**
 * Gemini Service for Binti AI Executive Assistant
 * Handles API key retrieval, prompt construction, system context injection, and generation requests.
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
 * Build Binti AI System Instruction Context.
 */
function buildSystemInstruction(context?: SaaSContext): string {
  return `You are Binti, the intelligent, highly capable, professional, and friendly assistant and SaaS Specialist for "Binti Events Corporate Suite".

YOUR ROLE & PERSONA:
- You assist company admins, finance directors, and event managers with using the Binti Events platform.
- You provide concise, actionable guidance, financial analytics, quote/invoice drafting advice, and navigation help.
- You maintain a warm, polished, professional tone.
- When asked about features in Binti Events SaaS, reference the relevant modules:
  * Dashboard: Business insights, key revenue KPIs, client analytics.
  * Quotes Module: Create & issue formal event quotations, convert quotes directly to invoices, export PDFs, recommend contract terms, generate client follow-up emails.
  * Invoices & Ledger Module: Issue tax invoices, record partial & full payments, track overdue balances, view billing history, generate payment reminders.
  * Clients Directory: Maintain client profiles, communication timeline, address book, corporate contact details.
  * Products & Services Catalog: Manage event service packages, pricing, tax rates, standard descriptions.
  * Reports & Analytics: Visual charts, revenue distribution, quote acceptance rates, exportable audit ledgers.
  * Settings Module: Company details, banking instructions, currency formatting, tax configurations, security & biometric settings.

CURRENT LIVE SAAS METRICS:
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
- Keep answers concise and direct. If giving step-by-step instructions for using the SaaS, use clear numbered bullet points.
- If asked to draft an email or terms, output clean copy ready for sending.`;
}

/**
 * Send a chat message or prompt to Google Gemini API (gemini-2.5-flash / gemini-1.5-flash).
 */
export async function askGeminiAssistant(
  prompt: string,
  chatHistory: ChatMessage[] = [],
  saasContext?: SaaSContext
): Promise<string> {
  const apiKey = getGeminiApiKey();

  if (!apiKey) {
    throw new Error(
      "No Gemini API key found. Please enter your API key in Binti settings or configure VITE_GEMINI_API_KEY."
    );
  }

  const systemInstruction = buildSystemInstruction(saasContext);

  // Use REST API for universal browser runtime support & fast response times
  const model = "gemini-2.5-flash";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;

  // Construct contents array with history
  const contents = [
    {
      role: "user",
      parts: [{ text: systemInstruction }]
    },
    {
      role: "model",
      parts: [{ text: "Understood. I am Binti, your assistant for Binti Events Corporate Suite. How may I assist you today?" }]
    }
  ];

  // Append recent history (excluding system)
  chatHistory.slice(-8).forEach(msg => {
    if (msg.role !== "system") {
      contents.push({
        role: msg.role === "model" ? "model" : "user",
        parts: [{ text: msg.content }]
      });
    }
  });

  // Append current user prompt
  contents.push({
    role: "user",
    parts: [{ text: prompt }]
  });

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
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

  if (!response.ok) {
    const errJson = await response.json().catch(() => ({}));
    const errMsg = errJson?.error?.message || `API HTTP Error ${response.status}: ${response.statusText}`;
    
    // Fallback to gemini-1.5-flash if model endpoint version differs
    if (response.status === 404) {
      return askGeminiFallbackModel(prompt, chatHistory, saasContext, apiKey, systemInstruction);
    }
    
    throw new Error(errMsg);
  }

  const data = await response.json();
  const candidateText = data?.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!candidateText) {
    throw new Error("Received an empty response from Gemini API.");
  }

  return candidateText;
}

/**
 * Fallback generator using gemini-1.5-flash model endpoint.
 */
async function askGeminiFallbackModel(
  prompt: string,
  chatHistory: ChatMessage[],
  saasContext: SaaSContext | undefined,
  apiKey: string,
  systemInstruction: string
): Promise<string> {
  const model = "gemini-1.5-flash";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;

  const contents = [
    {
      role: "user",
      parts: [{ text: systemInstruction }]
    },
    {
      role: "model",
      parts: [{ text: "Understood. I am Binti, your assistant for Binti Events Corporate Suite. How may I assist you today?" }]
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
    body: JSON.stringify({ contents })
  });

  if (!response.ok) {
    const errJson = await response.json().catch(() => ({}));
    throw new Error(errJson?.error?.message || `Fallback API Error ${response.status}`);
  }

  const data = await response.json();
  return data?.candidates?.[0]?.content?.parts?.[0]?.text || "No output generated.";
}
