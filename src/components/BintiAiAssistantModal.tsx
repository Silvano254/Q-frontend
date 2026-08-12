import React, { useState, useEffect, useRef } from "react";
import { 
  Sparkles, 
  X, 
  Send, 
  Bot, 
  User, 
  Copy, 
  Check, 
  RefreshCw, 
  Zap, 
  ShieldCheck, 
  FileText, 
  DollarSign, 
  Users, 
  AlertCircle
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
}

const DEFAULT_SUGGESTIONS = [
  "How do I convert a quotation into a tax invoice?",
  "Draft a professional payment reminder email for a client.",
  "What recommended payment terms should we use for event bookings?",
  "Summarize our current billing and revenue status.",
  "How do I record a partial payment on an invoice?"
];

export default function BintiAiAssistantModal({
  isOpen,
  onClose,
  saasContext
}: BintiAiAssistantModalProps) {
  const [inputMessage, setInputMessage] = useState<string>("");
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "model",
      content: `Hello! I'm **Binti**, your assistant for Binti Events. ✨\n\nHow can I help you manage your quotations, billing, clients, or system settings today?`,
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
    navigator.clipboard.writeText(content);
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

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex justify-end bg-black/40 backdrop-blur-sm transition-opacity duration-300">
      {/* Slide-over Container */}
      <div className="w-full max-w-lg bg-white h-full shadow-2xl flex flex-col justify-between transform transition-transform duration-300 ease-in-out border-l border-gray-100">
        
        {/* Drawer Header */}
        <div className="p-4 md:p-5 bg-gradient-to-r from-[#1F2937] via-[#2D1B4E] to-[#80237E] text-white flex items-center justify-between relative overflow-hidden border-b border-[#80237E]/30">
          <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
            <Sparkles className="w-32 h-32 text-purple-300" />
          </div>

          <div className="flex items-center space-x-3 relative z-10">
            <div className="w-10 h-10 rounded-2xl bg-white p-1 border-2 border-[#D4AF37]/50 flex items-center justify-center shadow-lg">
              <img src="/logo.jpeg" alt="Binti" className="w-full h-full object-contain rounded-xl" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="font-bold text-base text-white tracking-wide">Binti</h2>
                <span className="bg-[#D4AF37]/20 border border-[#D4AF37]/40 text-[#D4AF37] text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                  AI
                </span>
              </div>
              <p className="text-xs text-gray-300 mt-0.5">
                <span>Assistant</span>
              </p>
            </div>
          </div>

          {/* Action Tools */}
          <div className="flex items-center space-x-2 relative z-10">
            <button
              onClick={handleClearChat}
              title="Clear Conversation"
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
            <span className="flex items-center space-x-1 font-medium text-gray-700 whitespace-nowrap">
              <Users className="w-3 h-3 text-[#80237E]" />
              <span>Clients: {saasContext.clientCount ?? 0}</span>
            </span>
            <span className="flex items-center space-x-1 font-medium text-gray-700 whitespace-nowrap">
              <FileText className="w-3 h-3 text-blue-600" />
              <span>Quotes: {saasContext.totalQuotes ?? 0}</span>
            </span>
            <span className="flex items-center space-x-1 font-medium text-gray-700 whitespace-nowrap">
              <DollarSign className="w-3 h-3 text-green-600" />
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
          {messages.map((msg, idx) => (
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
                    : "bg-gradient-to-tr from-[#1F2937] to-[#2D1B4E] text-[#D4AF37] border border-[#D4AF37]/30"
                }`}
              >
                {msg.role === "user" ? (
                  <User className="w-4 h-4" />
                ) : (
                  <Bot className="w-4 h-4" />
                )}
              </div>

              {/* Message Bubble */}
              <div className="max-w-[82%] group relative">
                <div
                  className={`p-3.5 rounded-2xl text-xs leading-relaxed shadow-sm ${
                    msg.role === "user"
                      ? "bg-[#80237E] text-white rounded-tr-none"
                      : "bg-white border border-gray-100 text-gray-800 rounded-tl-none shadow-gray-100/50"
                  }`}
                >
                  <div className="whitespace-pre-wrap font-sans space-y-1">
                    {msg.content}
                  </div>
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
                    title="Copy response"
                  >
                    {copiedIndex === idx ? (
                      <Check className="w-3 h-3 text-green-500" />
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
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#1F2937] to-[#2D1B4E] text-[#D4AF37] flex items-center justify-center shrink-0 border border-[#D4AF37]/30">
                <Bot className="w-4 h-4 animate-bounce" />
              </div>
              <div className="p-3 bg-white border border-gray-100 rounded-2xl rounded-tl-none text-xs text-gray-500 flex items-center space-x-2">
                <div className="w-2 h-2 bg-[#80237E] rounded-full animate-ping" />
                <span>Binti is processing...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Quick Suggestion Chips */}
        <div className="p-3 bg-gray-50/80 border-t border-gray-100 overflow-x-auto whitespace-nowrap">
          <div className="flex items-center space-x-2">
            <span className="text-[10px] uppercase font-bold text-gray-400 flex items-center space-x-1 shrink-0">
              <Zap className="w-3 h-3 text-[#D4AF37]" />
              <span>Suggested:</span>
            </span>
            {DEFAULT_SUGGESTIONS.map((suggestion, sIdx) => (
              <button
                key={sIdx}
                onClick={() => handleSendMessage(suggestion)}
                className="px-2.5 py-1 bg-white hover:bg-purple-50 border border-gray-200 hover:border-[#80237E]/40 text-gray-700 hover:text-[#80237E] rounded-full text-[11px] font-medium transition-all shadow-xs shrink-0"
              >
                {suggestion}
              </button>
            ))}
          </div>
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
              placeholder="Ask Binti about quotes, invoices, clients..."
              disabled={loading}
              className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#80237E]/20 focus:border-[#80237E] bg-gray-50/50 disabled:opacity-60 transition-all"
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
            <span>Powered by Gemini</span>
            <span className="flex items-center space-x-1 text-green-600 font-medium">
              <ShieldCheck className="w-3 h-3" />
              <span>Active Context</span>
            </span>
          </div>
        </div>

      </div>
    </div>
  );
}
