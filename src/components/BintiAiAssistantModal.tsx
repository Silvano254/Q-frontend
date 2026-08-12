import React, { useState, useEffect, useRef } from "react";
import { 
  Sparkles, 
  X, 
  Send, 
  User, 
  Copy, 
  Check, 
  RefreshCw, 
  ShieldCheck, 
  FileText, 
  DollarSign, 
  Users, 
  AlertCircle,
  TrendingUp,
  CreditCard,
  HelpCircle,
  ChevronRight
} from "lucide-react";
import { 
  askGeminiAssistant, 
  ChatMessage, 
  SaaSContext 
} from "../services/geminiService";

interface BintiAiAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  saasContext?: SaaSContext;
  initialPrompt?: string;
}

const QUICK_CARDS = [
  {
    icon: TrendingUp,
    title: "Analyze my business",
    subtitle: "Cash flow, booking trends & revenue recovery",
    prompt: "Provide an analysis of our current business performance, quote conversions, and outstanding receivables."
  },
  {
    icon: FileText,
    title: "Create or convert a quote",
    subtitle: "Step-by-step guidance & drafting help",
    prompt: "How do I create a quotation and convert it into a tax invoice?"
  },
  {
    icon: CreditCard,
    title: "Payment & invoice helper",
    subtitle: "Track balances & draft payment reminders",
    prompt: "Draft a polite follow-up payment reminder email for a client with an unpaid invoice."
  },
  {
    icon: HelpCircle,
    title: "Ask me anything",
    subtitle: "System navigation, terms & corporate setup",
    prompt: "What standard payment terms and deposit policies should we use for event bookings?"
  }
];

/**
 * Clean Formatter: Executive-grade renderer without horizontal lines or markdown clutter
 */
function CleanResponseRenderer({ content, isUser }: { content: string; isUser: boolean }) {
  if (isUser) {
    return <div className="whitespace-pre-wrap">{content}</div>;
  }

  // Strip any raw horizontal rule markdown syntax (---, ***, ___)
  const cleanContent = content
    .replace(/^[-*_]{3,}$/gm, '')
    .replace(/\n{3,}/g, '\n\n');

  const lines = cleanContent.split("\n");
  const elements: React.ReactNode[] = [];
  let inTable = false;
  let tableRows: string[][] = [];
  let tableHeader: string[] = [];

  const processInlineFormatting = (text: string) => {
    const parts = text.split(/(\*\*.*?\*\*|\*.*?\*|`.*?`)/g);
    return parts.map((part, pIdx) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return <strong key={pIdx} className="font-semibold text-gray-900">{part.slice(2, -2)}</strong>;
      }
      if (part.startsWith("*") && part.endsWith("*")) {
        return <em key={pIdx} className="italic text-gray-800">{part.slice(1, -1)}</em>;
      }
      if (part.startsWith("`") && part.endsWith("`")) {
        return <code key={pIdx} className="bg-purple-50 text-[#80237E] px-1.5 py-0.5 rounded text-[11px] font-mono">{part.slice(1, -1)}</code>;
      }
      return part;
    });
  };

  const renderCurrentTable = (key: number) => {
    if (tableRows.length === 0 && tableHeader.length === 0) return null;
    const header = tableHeader;
    const rows = tableRows;
    tableHeader = [];
    tableRows = [];
    inTable = false;

    return (
      <div key={`table-${key}`} className="my-3 overflow-x-auto rounded-2xl bg-gray-50/70 p-1.5 border border-gray-100/80 shadow-xs">
        <table className="w-full text-[11px] text-left border-collapse font-sans">
          {header.length > 0 && (
            <thead>
              <tr className="text-gray-500 font-bold border-b border-gray-200/60">
                {header.map((col, hIdx) => (
                  <th key={hIdx} className="px-3 py-2 uppercase tracking-wider text-[10px] text-gray-600">
                    {col.replace(/\*\*/g, '').trim()}
                  </th>
                ))}
              </tr>
            </thead>
          )}
          <tbody className="divide-y divide-gray-100/80 bg-white rounded-xl">
            {rows.map((row, rIdx) => (
              <tr key={rIdx} className="hover:bg-purple-50/30 transition-colors">
                {row.map((cell, cIdx) => (
                  <td key={cIdx} className="px-3 py-2 text-gray-800">
                    {processInlineFormatting(cell.trim())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  lines.forEach((line, index) => {
    const trimmed = line.trim();

    // Check for Markdown table line
    if (trimmed.startsWith("|") && trimmed.endsWith("|")) {
      const cells = trimmed.split("|").slice(1, -1);
      if (cells.every(c => c.trim().replace(/:/g, '').replace(/-/g, '') === '')) {
        return;
      }
      if (!inTable) {
        inTable = true;
        tableHeader = cells;
      } else {
        tableRows.push(cells);
      }
      return;
    } else if (inTable) {
      elements.push(renderCurrentTable(index));
    }

    // Ignore horizontal lines completely (replaced by clean spacing)
    if (/^([-*_]){3,}$/.test(trimmed)) {
      elements.push(<div key={index} className="h-2" />);
      return;
    }

    // Headings (### or ## or #)
    if (trimmed.startsWith("#")) {
      const headingText = trimmed.replace(/^#+\s*/, '').replace(/\*\*/g, '');
      elements.push(
        <h4 key={index} className="font-bold text-[#80237E] text-xs uppercase tracking-wide mt-4 mb-1.5">
          {headingText}
        </h4>
      );
      return;
    }

    // Bullet points (* or - or •)
    if (/^[-*•]\s+/.test(trimmed)) {
      const bulletContent = trimmed.replace(/^[-*•]\s+/, '');
      elements.push(
        <div key={index} className="flex items-start space-x-2 my-1 text-gray-800 leading-relaxed">
          <div className="w-1.5 h-1.5 rounded-full bg-[#80237E] mt-1.5 shrink-0" />
          <div className="flex-1">{processInlineFormatting(bulletContent)}</div>
        </div>
      );
      return;
    }

    // Empty lines
    if (!trimmed) {
      elements.push(<div key={index} className="h-2" />);
      return;
    }

    // Regular paragraphs
    elements.push(
      <p key={index} className="my-1 text-gray-800 leading-relaxed">
        {processInlineFormatting(trimmed)}
      </p>
    );
  });

  if (inTable) {
    elements.push(renderCurrentTable(lines.length));
  }

  return <div className="space-y-0.5 font-sans">{elements}</div>;
}

export default function BintiAiAssistantModal({
  isOpen,
  onClose,
  saasContext,
  initialPrompt
}: BintiAiAssistantModalProps) {
  const [inputMessage, setInputMessage] = useState<string>("");
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "model",
      content: `Hi! I'm Binti, your event assistant. How can I help you manage your quotations, billing ledgers, or client records today?`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [loading, setLoading] = useState<boolean>(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      if (initialPrompt && initialPrompt.trim().length > 0) {
        handleSendMessage(initialPrompt);
      }
    }
  }, [isOpen, initialPrompt]);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen]);

  const handleSendMessage = async (textToSend?: string) => {
    const query = textToSend || inputMessage;
    if (!query || query.trim() === "" || loading) return;

    const userTimestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const userMsg: ChatMessage = {
      role: "user",
      content: query.trim(),
      timestamp: userTimestamp
    };

    setMessages(prev => [...prev, userMsg]);
    if (!textToSend) setInputMessage("");
    setLoading(true);
    setErrorMsg(null);

    try {
      const modelReply = await askGeminiAssistant(
        query.trim(),
        messages,
        saasContext
      );

      const assistantMsg: ChatMessage = {
        role: "model",
        content: modelReply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessages(prev => [...prev, assistantMsg]);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to reach assistant service. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (content: string, index: number) => {
    const cleanText = content.replace(/[*#\-_]/g, ' ').replace(/\|/g, ' ').replace(/\s+/g, ' ');
    navigator.clipboard.writeText(cleanText.trim());
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleClearChat = () => {
    setMessages([
      {
        role: "model",
        content: `Conversation reset. How can I assist you in Binti Events today?`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);
    setErrorMsg(null);
  };

  if (!isOpen) return null;

  const isFreshChat = messages.length <= 1;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex justify-end bg-black/40 backdrop-blur-sm transition-opacity duration-300">
      {/* Slide-over Container */}
      <div className="w-full max-w-lg bg-white h-full shadow-2xl flex flex-col justify-between transform transition-transform duration-300 ease-in-out border-l border-gray-100 font-sans">
        
        {/* Drawer Header */}
        <div className="p-4 md:p-5 bg-gradient-to-r from-[#1F2937] via-[#2D1B4E] to-[#80237E] text-white flex items-center justify-between relative overflow-hidden border-b border-[#80237E]/30">
          <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
            <Sparkles className="w-32 h-32 text-purple-300" />
          </div>

          <div className="flex items-center space-x-3 relative z-10">
            <div className="w-10 h-10 rounded-2xl bg-white p-1 border-2 border-[#D4AF37]/60 flex items-center justify-center shadow-lg">
              <img src="/logo.jpeg" alt="Binti" className="w-full h-full object-contain rounded-xl" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="font-bold text-base text-white tracking-wide flex items-center space-x-1.5">
                  <Sparkles className="w-4 h-4 text-[#D4AF37]" />
                  <span>Binti</span>
                </h2>
                <span className="bg-[#D4AF37]/20 border border-[#D4AF37]/40 text-[#D4AF37] text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                  AI
                </span>
              </div>
              <p className="text-xs text-gray-300 mt-0.5 font-medium">Event Assistant</p>
            </div>
          </div>

          {/* Action Tools */}
          <div className="flex items-center space-x-2 relative z-10">
            <button
              onClick={handleClearChat}
              title="Reset Conversation"
              className="p-2 text-gray-300 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
            </button>

            <button
              onClick={onClose}
              className="p-2 text-gray-300 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Live Context Metric Bar */}
        {saasContext && (
          <div className="bg-[#F8F9FA] px-4 py-2 border-b border-gray-100 flex items-center justify-between overflow-x-auto text-[11px] text-gray-600 space-x-3">
            <span className="flex items-center space-x-1.5 font-medium text-gray-700 whitespace-nowrap">
              <Users className="w-3.5 h-3.5 text-[#80237E]" />
              <span>Clients: {saasContext.clientCount ?? 0}</span>
            </span>
            <span className="flex items-center space-x-1.5 font-medium text-gray-700 whitespace-nowrap">
              <FileText className="w-3.5 h-3.5 text-blue-600" />
              <span>Quotes: {saasContext.totalQuotes ?? 0}</span>
            </span>
            <span className="flex items-center space-x-1.5 font-medium text-gray-700 whitespace-nowrap">
              <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
              <span>Revenue: {saasContext.currency || "$"}{(saasContext.totalRevenue || 0).toLocaleString()}</span>
            </span>
          </div>
        )}

        {/* Error Notification Bar */}
        {errorMsg && (
          <div className="p-3 bg-red-50 border-b border-red-100 text-red-700 text-xs flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
              <span>{errorMsg}</span>
            </div>
            <button onClick={() => setErrorMsg(null)} className="text-red-500 hover:text-red-700">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Chat History Area */}
        <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-gradient-to-b from-[#FDFBFD] to-white">
          {/* Welcome Screen & Cards for Fresh Chat */}
          {isFreshChat && (
            <div className="py-4 space-y-5 animate-fade-in">
              <div className="text-center space-y-2 py-2">
                <div className="w-14 h-14 mx-auto rounded-3xl bg-gradient-to-tr from-[#1F2937] via-[#2D1B4E] to-[#80237E] p-0.5 shadow-xl flex items-center justify-center border border-[#D4AF37]/40">
                  <div className="w-full h-full bg-white rounded-[22px] flex items-center justify-center p-2">
                    <img src="/logo.jpeg" alt="Binti" className="w-full h-full object-contain" />
                  </div>
                </div>
                <h3 className="text-base font-bold text-gray-900 tracking-tight flex items-center justify-center space-x-1.5">
                  <span>Hi! I'm Binti</span>
                  <Sparkles className="w-4 h-4 text-[#D4AF37]" />
                </h3>
                <p className="text-xs text-gray-500 max-w-xs mx-auto leading-relaxed">
                  I can help you manage your events, bookings, quotations, tax invoices, and financial reports.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-2.5 pt-1">
                {QUICK_CARDS.map((card, cIdx) => {
                  const Icon = card.icon;
                  return (
                    <button
                      key={cIdx}
                      onClick={() => handleSendMessage(card.prompt)}
                      className="p-3.5 bg-white hover:bg-purple-50/50 border border-gray-100 hover:border-[#80237E]/30 rounded-2xl text-left transition-all shadow-xs hover:shadow-md flex items-center justify-between group"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-9 h-9 rounded-xl bg-purple-50 text-[#80237E] group-hover:bg-[#80237E] group-hover:text-white flex items-center justify-center shrink-0 transition-colors">
                          <Icon className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-gray-800 group-hover:text-[#80237E] transition-colors">
                            {card.title}
                          </h4>
                          <p className="text-[11px] text-gray-500 mt-0.5">{card.subtitle}</p>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-[#80237E] group-hover:translate-x-0.5 transition-all shrink-0" />
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Active Conversation Messages */}
          {!isFreshChat && messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex items-start space-x-3 ${
                msg.role === "user" ? "flex-row-reverse space-x-reverse" : ""
              }`}
            >
              {/* Avatar */}
              <div
                className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 shadow-sm ${
                  msg.role === "user"
                    ? "bg-[#80237E] text-white"
                    : "bg-[#1F2937] text-[#D4AF37] border border-[#D4AF37]/30"
                }`}
              >
                {msg.role === "user" ? (
                  <User className="w-4 h-4" />
                ) : (
                  <Sparkles className="w-4 h-4 text-[#D4AF37]" />
                )}
              </div>

              {/* Message Bubble */}
              <div className="max-w-[85%] group relative">
                <div
                  className={`p-4 rounded-2xl text-xs leading-relaxed shadow-sm ${
                    msg.role === "user"
                      ? "bg-[#80237E] text-white rounded-tr-none font-medium"
                      : "bg-white border border-gray-100 text-gray-800 rounded-tl-none shadow-gray-100/50"
                  }`}
                >
                  <CleanResponseRenderer content={msg.content} isUser={msg.role === "user"} />
                </div>

                {/* Bubble Timestamp & Copy Action */}
                <div
                  className={`flex items-center space-x-2 mt-1 px-1 text-[10px] text-gray-400 ${
                    msg.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  <span>{msg.timestamp}</span>
                  <button
                    onClick={() => handleCopy(msg.content, idx)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity hover:text-gray-600"
                    title="Copy text"
                  >
                    {copiedIndex === idx ? (
                      <Check className="w-3 h-3 text-emerald-500" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          ))}

          {/* Loading Indicator */}
          {loading && (
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-xl bg-[#1F2937] text-[#D4AF37] flex items-center justify-center shrink-0 border border-[#D4AF37]/30">
                <Sparkles className="w-4 h-4 text-[#D4AF37] animate-spin" />
              </div>
              <div className="p-3 bg-white border border-gray-100 rounded-2xl rounded-tl-none text-xs text-gray-500 flex items-center space-x-2">
                <div className="w-2 h-2 bg-[#80237E] rounded-full animate-ping" />
                <span>Binti is processing...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Chat Input Field */}
        <div className="p-4 bg-white border-t border-gray-100">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-center space-x-2"
          >
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder="Ask Binti anything..."
              disabled={loading}
              className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#80237E]/20 focus:border-[#80237E] bg-gray-50/50 disabled:opacity-60 transition-all font-medium"
            />
            <button
              type="submit"
              disabled={loading || !inputMessage.trim()}
              className="px-4 py-2.5 bg-gradient-to-r from-[#1F2937] to-[#80237E] hover:opacity-90 text-white font-semibold rounded-xl text-xs shadow-md shadow-purple-900/10 flex items-center space-x-1.5 disabled:opacity-50 transition-all"
            >
              <span>Send</span>
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
          <div className="mt-2 flex items-center justify-between text-[10px] text-gray-400 px-1">
            <span className="flex items-center space-x-1">
              <Sparkles className="w-3 h-3 text-[#D4AF37]" />
              <span>Powered by Gemini</span>
            </span>
            <span className="flex items-center space-x-1 text-emerald-600 font-medium">
              <ShieldCheck className="w-3 h-3" />
              <span>Active Context</span>
            </span>
          </div>
        </div>

      </div>
    </div>
  );
}
