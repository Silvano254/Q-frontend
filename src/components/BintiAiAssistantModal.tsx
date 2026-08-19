import React, { useState, useEffect, useRef, memo, useCallback } from "react";
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
  ChevronRight,
  Zap,
  ArrowRight,
  RotateCcw,
  CheckCircle2,
  Database,
  Info,
  Plus,
  Paperclip,
  FileSpreadsheet,
  FileCheck
} from "lucide-react";
import { 
  askGeminiAssistant, 
  ChatMessage, 
  SaaSContext,
  AgentAction,
  cleanAiResponse 
} from "../services/geminiService";
import { parseUploadedDocument, ParsedDocument } from "../utils/fileParser";

interface BintiAiAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  saasContext?: SaaSContext;
  initialPrompt?: string;
  onExecuteAction?: (action: AgentAction) => Promise<boolean | void> | boolean | void;
}

const QUICK_CARDS = [
  {
    icon: TrendingUp,
    title: "Binti Business Brief",
    subtitle: "Money, open proposals & attention items",
    prompt: "Provide a complete business brief covering money collected, open quotes, and items needing attention."
  },
  {
    icon: FileSpreadsheet,
    title: "Upload & restructure business data",
    subtitle: "Import CSV client lists, sales & inventory",
    prompt: "I want to upload a document to import clients and data into Binti Events."
  },
  {
    icon: FileText,
    title: "Create or convert a quote",
    subtitle: "Draft proposal & convert to invoice",
    prompt: "How do I create a quotation and convert it into a tax invoice?"
  },
  {
    icon: CreditCard,
    title: "Payment & debt recovery",
    subtitle: "Track unpaid balances & reminder drafts",
    prompt: "Show me all overdue invoices and draft a follow-up reminder for overdue clients."
  }
];

const CleanResponseRenderer = memo(function CleanResponseRenderer({ 
  content, 
  isUser 
}: { 
  content: string; 
  isUser: boolean; 
}) {
  const sanitized = cleanAiResponse(content);
  if (isUser) {
    return <div className="whitespace-pre-wrap">{sanitized}</div>;
  }

  const cleanContent = sanitized
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

    if (/^([-*_]){3,}$/.test(trimmed)) {
      elements.push(<div key={index} className="h-2" />);
      return;
    }

    if (trimmed.startsWith("#")) {
      const headingText = trimmed.replace(/^#+\s*/, '').replace(/\*\*/g, '');
      elements.push(
        <h4 key={index} className="font-bold text-[#80237E] text-xs uppercase tracking-wide mt-4 mb-1.5">
          {headingText}
        </h4>
      );
      return;
    }

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

    if (!trimmed) {
      elements.push(<div key={index} className="h-2" />);
      return;
    }

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
});

/**
 * Reusable Chat Input Bar with Document Attachment (+) Support
 */
interface ChatInputBarProps {
  value: string;
  onChange: (val: string) => void;
  onSubmit: () => void;
  loading: boolean;
  variant: "centered" | "docked";
  inputRef?: React.RefObject<HTMLTextAreaElement>;
  selectedFile: File | null;
  onSelectFile: (file: File | null) => void;
}

const ChatInputBar = memo(function ChatInputBar({
  value,
  onChange,
  onSubmit,
  loading,
  variant,
  inputRef,
  selectedFile,
  onSelectFile
}: ChatInputBarProps) {
  const localRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const activeRef = inputRef || localRef;

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value);
    const textarea = e.target;
    textarea.style.height = "auto";
    const newHeight = Math.min(textarea.scrollHeight, 120);
    textarea.style.height = `${Math.max(newHeight, variant === "centered" ? 44 : 38)}px`;
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!loading && (value.trim() || selectedFile)) {
        onSubmit();
        if (activeRef.current) {
          activeRef.current.style.height = variant === "centered" ? "44px" : "38px";
        }
      }
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onSelectFile(e.target.files[0]);
    }
  };

  if (variant === "centered") {
    return (
      <div className="space-y-2">
        {selectedFile && (
          <div className="flex items-center justify-between p-2.5 bg-purple-50/90 border border-purple-200 rounded-2xl text-xs text-purple-900 animate-fade-in shadow-xs">
            <div className="flex items-center space-x-2 truncate">
              <FileSpreadsheet className="w-4 h-4 text-[#80237E] shrink-0" />
              <span className="font-bold truncate">{selectedFile.name}</span>
              <span className="text-[10px] text-purple-600 shrink-0">({(selectedFile.size / 1024).toFixed(1)} KB)</span>
            </div>
            <button
              type="button"
              onClick={() => onSelectFile(null)}
              aria-label="Remove attached document"
              className="p-1 text-purple-400 hover:text-purple-700 rounded-lg"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!loading && (value.trim() || selectedFile)) onSubmit();
          }}
          className="relative bg-white border-2 border-[#80237E]/20 hover:border-[#80237E]/40 focus-within:border-[#80237E] rounded-2xl shadow-lg shadow-purple-900/5 p-2 flex items-end space-x-2 transition-all"
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileInputChange}
            accept=".csv,.xlsx,.xls,.txt,.pdf,.json,image/*"
            className="hidden"
          />

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            aria-label="Attach document or spreadsheet"
            title="Upload CSV, spreadsheet, or business documents"
            disabled={loading}
            className="p-2 text-gray-500 hover:text-[#80237E] hover:bg-purple-50 rounded-xl transition-all shrink-0 mb-0.5 flex items-center justify-center"
          >
            <Plus className="w-4 h-4" />
          </button>

          <textarea
            ref={activeRef}
            rows={1}
            value={value}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            placeholder="Ask Binti anything..."
            disabled={loading}
            aria-label="Message prompt for Binti AI Assistant"
            className="flex-1 p-2 bg-transparent text-xs text-gray-900 placeholder:text-gray-400 focus:outline-none disabled:opacity-60 font-medium resize-none leading-relaxed overflow-y-auto max-h-[120px]"
            style={{ minHeight: "44px" }}
          />

          <button
            type="submit"
            disabled={loading || (!value.trim() && !selectedFile)}
            aria-label="Send message"
            className="px-4 py-2.5 bg-gradient-to-r from-[#1F2937] to-[#80237E] hover:opacity-95 text-white font-bold rounded-xl text-xs shadow-md shadow-purple-900/15 flex items-center space-x-1.5 disabled:opacity-40 transition-all active:scale-95 shrink-0 mb-0.5"
          >
            <span>Send</span>
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="p-4 bg-white border-t border-gray-100 animate-slide-up space-y-2">
      {selectedFile && (
        <div className="flex items-center justify-between p-2 bg-purple-50/90 border border-purple-200 rounded-xl text-xs text-purple-900 animate-fade-in shadow-xs">
          <div className="flex items-center space-x-2 truncate">
            <FileSpreadsheet className="w-3.5 h-3.5 text-[#80237E] shrink-0" />
            <span className="font-bold truncate text-[11px]">{selectedFile.name}</span>
            <span className="text-[10px] text-purple-600 shrink-0">({(selectedFile.size / 1024).toFixed(1)} KB)</span>
          </div>
          <button
            type="button"
            onClick={() => onSelectFile(null)}
            aria-label="Remove attached document"
            className="p-1 text-purple-400 hover:text-purple-700 rounded"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!loading && (value.trim() || selectedFile)) onSubmit();
        }}
        className="flex items-end space-x-2"
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileInputChange}
          accept=".csv,.xlsx,.xls,.txt,.pdf,.json,image/*"
          className="hidden"
        />

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          aria-label="Attach document or spreadsheet"
          title="Upload CSV, spreadsheet, or business documents"
          disabled={loading}
          className="p-2 text-gray-500 hover:text-[#80237E] hover:bg-purple-50 rounded-xl transition-all shrink-0 mb-0.5 flex items-center justify-center border border-gray-200"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>

        <textarea
          ref={activeRef}
          rows={1}
          value={value}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          placeholder="Ask a follow-up or command... (Shift+Enter for newline)"
          disabled={loading}
          aria-label="Follow-up message prompt"
          className="flex-1 px-3.5 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#80237E]/20 focus:border-[#80237E] bg-gray-50/50 disabled:opacity-60 transition-all font-medium resize-none leading-relaxed overflow-y-auto max-h-[120px]"
          style={{ minHeight: "38px" }}
        />
        <button
          type="submit"
          disabled={loading || (!value.trim() && !selectedFile)}
          aria-label="Send follow-up message"
          className="px-4 py-2 bg-gradient-to-r from-[#1F2937] to-[#80237E] hover:opacity-90 text-white font-semibold rounded-xl text-xs shadow-md shadow-purple-900/10 flex items-center space-x-1.5 disabled:opacity-50 transition-all active:scale-95 shrink-0 mb-0.5"
        >
          <span>Send</span>
          <Send className="w-3.5 h-3.5" />
        </button>
      </form>
    </div>
  );
});

export default function BintiAiAssistantModal({
  isOpen,
  onClose,
  saasContext,
  initialPrompt,
  onExecuteAction
}: BintiAiAssistantModalProps) {
  const [inputMessage, setInputMessage] = useState<string>("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [lastFailedPrompt, setLastFailedPrompt] = useState<string | null>(null);
  const [executedActionIds, setExecutedActionIds] = useState<Set<string>>(new Set());
  const [showContextModal, setShowContextModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const centerInputRef = useRef<HTMLTextAreaElement>(null);
  const bottomInputRef = useRef<HTMLTextAreaElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        if (showContextModal) {
          setShowContextModal(false);
        } else {
          onClose();
        }
      }
    };
    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, showContextModal, onClose]);

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      if (initialPrompt && initialPrompt.trim().length > 0) {
        handleSendMessage(initialPrompt);
      } else {
        setTimeout(() => {
          centerInputRef.current?.focus();
        }, 150);
      }
    }
  }, [isOpen, initialPrompt]);

  useEffect(() => {
    if (isOpen && messages.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      bottomInputRef.current?.focus();
    }
  }, [messages, isOpen]);

  const handleSendMessage = useCallback(async (textToSend?: string) => {
    const query = textToSend || inputMessage;
    if ((!query || query.trim() === "") && !selectedFile) return;
    if (loading) return;

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const currentController = new AbortController();
    abortControllerRef.current = currentController;

    const fileToProcess = selectedFile;
    setSelectedFile(null);

    let parsedDoc: ParsedDocument | null = null;
    if (fileToProcess) {
      try {
        parsedDoc = await parseUploadedDocument(fileToProcess);
      } catch (err) {
        console.error("Failed to parse file:", err);
      }
    }

    const userTimestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const userMsg: ChatMessage = {
      role: "user",
      content: query.trim() || (fileToProcess ? `Analyzed document: ${fileToProcess.name}` : ""),
      timestamp: userTimestamp,
      attachment: fileToProcess ? {
        name: fileToProcess.name,
        size: fileToProcess.size,
        type: fileToProcess.name.split('.').pop() || 'doc'
      } : undefined
    };

    setMessages(prev => [...prev, userMsg]);
    setInputMessage("");
    setLoading(true);
    setErrorMsg(null);
    setLastFailedPrompt(null);

    try {
      const result = await askGeminiAssistant(
        query.trim() || `Please analyze this attached document and extract structured records: ${fileToProcess?.name}`,
        messages,
        saasContext,
        currentController.signal,
        parsedDoc
      );

      if (currentController.signal.aborted) return;

      const assistantMsg: ChatMessage = {
        role: "model",
        content: result.reply,
        actions: result.actions?.map((act, i) => ({
          ...act,
          id: act.id || `action-${Date.now()}-${i}`
        })),
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessages(prev => [...prev, assistantMsg]);
    } catch (err: any) {
      if (err?.name === "AbortError" || currentController.signal.aborted) {
        return;
      }
      console.error("Binti AI error:", err);
      setErrorMsg("Binti couldn't complete your request right now. Please check your connection and try again.");
      setLastFailedPrompt(query.trim());
    } finally {
      if (!currentController.signal.aborted) {
        setLoading(false);
      }
    }
  }, [inputMessage, loading, messages, saasContext, selectedFile]);

  const handleActionExecution = async (act: AgentAction) => {
    const actionId = act.id || `${act.type}-${Date.now()}`;
    if (onExecuteAction) {
      await onExecuteAction(act);
      setExecutedActionIds(prev => new Set(prev).add(actionId));
      if (!act.isMutation) {
        onClose();
      }
    }
  };

  const handleCopy = useCallback((content: string, index: number) => {
    const cleanText = content
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/\*(.*?)\*/g, '$1')
      .replace(/`(.*?)`/g, '$1')
      .replace(/^#+\s+/gm, '')
      .replace(/\|/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    navigator.clipboard.writeText(cleanText);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  }, []);

  const handleClearChat = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setMessages([]);
    setErrorMsg(null);
    setLastFailedPrompt(null);
    setInputMessage("");
    setSelectedFile(null);
    setTimeout(() => {
      centerInputRef.current?.focus();
    }, 100);
  }, []);

  const handleRetry = useCallback(() => {
    if (!lastFailedPrompt) return;
    const retryPrompt = lastFailedPrompt;
    setErrorMsg(null);
    setLastFailedPrompt(null);
    handleSendMessage(retryPrompt);
  }, [lastFailedPrompt, handleSendMessage]);

  if (!isOpen) return null;

  const isFreshChat = messages.length === 0;

  return (
    <div 
      role="dialog"
      aria-modal="true"
      aria-label="Binti AI Operating Assistant"
      className="fixed inset-0 z-50 overflow-hidden flex justify-end bg-black/40 backdrop-blur-sm transition-opacity duration-300"
    >
      <div className="w-full sm:max-w-lg bg-white h-full shadow-2xl flex flex-col justify-between transform transition-transform duration-300 ease-in-out border-l border-gray-100 font-sans">
        
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
                  Operating Assistant
                </span>
              </div>
              <p className="text-xs text-gray-300 mt-0.5 font-medium">Binti Events Management System</p>
            </div>
          </div>

          {/* Action Tools */}
          <div className="flex items-center space-x-2 relative z-10">
            {!isFreshChat && (
              <button
                onClick={handleClearChat}
                title="Reset conversation"
                aria-label="Reset conversation"
                className="p-2 text-gray-300 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            )}

            <button
              onClick={onClose}
              title="Close assistant"
              aria-label="Close assistant"
              className="p-2 text-gray-300 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Live Context & Data Connection Transparency Bar */}
        {saasContext && (
          <div className="bg-[#F8F9FA] px-4 py-2 border-b border-gray-100 flex items-center justify-between overflow-x-auto text-[11px] text-gray-600 space-x-2">
            <button
              onClick={() => setShowContextModal(true)}
              className="flex items-center space-x-1.5 text-emerald-700 bg-emerald-50/80 hover:bg-emerald-100/80 px-2 py-1 rounded-lg border border-emerald-200/60 font-semibold transition-colors"
              title="Click to view connected business data status"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>Business Data Connected</span>
              <Info className="w-3 h-3 text-emerald-600/70 ml-0.5" />
            </button>
            <div className="flex items-center space-x-3 text-gray-700">
              <span className="flex items-center space-x-1 font-medium whitespace-nowrap">
                <Users className="w-3 h-3 text-[#80237E]" />
                <span>{saasContext.clientCount ?? 0}</span>
              </span>
              <span className="flex items-center space-x-1 font-medium whitespace-nowrap">
                <FileText className="w-3 h-3 text-blue-600" />
                <span>{saasContext.totalQuotes ?? 0}</span>
              </span>
              <span className="flex items-center space-x-1 font-medium whitespace-nowrap">
                <DollarSign className="w-3 h-3 text-emerald-600" />
                <span>{(saasContext.currency || "KES")} {(saasContext.totalRevenue || 0).toLocaleString()}</span>
              </span>
            </div>
          </div>
        )}

        {/* Error Notification Bar with Retry Button */}
        {errorMsg && (
          <div className="p-3 bg-red-50 border-b border-red-100 text-red-700 text-xs flex items-center justify-between animate-fade-in">
            <div className="flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
              <span>{errorMsg}</span>
            </div>
            <div className="flex items-center space-x-2 shrink-0">
              {lastFailedPrompt && (
                <button
                  onClick={handleRetry}
                  aria-label="Retry last message"
                  className="px-2 py-1 bg-red-100 hover:bg-red-200 text-red-800 font-bold rounded-lg text-[10px] flex items-center space-x-1 transition-colors"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Retry</span>
                </button>
              )}
              <button 
                onClick={() => setErrorMsg(null)} 
                aria-label="Dismiss error"
                className="text-red-500 hover:text-red-700 p-1"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Main Content Area */}
        <div 
          aria-live="polite"
          aria-atomic="false"
          className="flex-1 p-4 overflow-y-auto space-y-4 bg-gradient-to-b from-[#FDFBFD] to-white flex flex-col justify-between"
        >
          
          {/* FRESH STATE: Centered Greeting + Centered Input with (+) Button + Quick Prompt Buttons */}
          {isFreshChat && (
            <div className="my-auto py-2 space-y-6 animate-fade-in">
              
              {/* Header Greeting */}
              <div className="text-center space-y-2">
                <div className="w-16 h-16 mx-auto rounded-3xl bg-gradient-to-tr from-[#1F2937] via-[#2D1B4E] to-[#80237E] p-0.5 shadow-xl flex items-center justify-center border border-[#D4AF37]/40">
                  <div className="w-full h-full bg-white rounded-[22px] flex items-center justify-center p-2.5">
                    <img src="/logo.jpeg" alt="Binti" className="w-full h-full object-contain" />
                  </div>
                </div>
                <h3 className="text-xl font-extrabold text-gray-900 tracking-tight flex items-center justify-center space-x-2">
                  <span>How can I assist your business today?</span>
                </h3>
                <p className="text-xs text-gray-500 max-w-xs mx-auto leading-relaxed">
                  Ask me questions or click the <strong className="text-[#80237E] font-bold">+</strong> button to upload spreadsheets & client lists to restructure into your database.
                </p>
              </div>

              {/* Centered Multi-line Input Bar with (+) Upload Button */}
              <ChatInputBar
                variant="centered"
                value={inputMessage}
                onChange={setInputMessage}
                onSubmit={handleSendMessage}
                loading={loading}
                inputRef={centerInputRef}
                selectedFile={selectedFile}
                onSelectFile={setSelectedFile}
              />

              {/* Quick Prompt Cards */}
              <div className="grid grid-cols-1 gap-2 pt-1">
                {QUICK_CARDS.map((card, cIdx) => {
                  const Icon = card.icon;
                  return (
                    <button
                      key={cIdx}
                      onClick={() => handleSendMessage(card.prompt)}
                      aria-label={card.title}
                      className="p-3 bg-white hover:bg-purple-50/50 border border-gray-100 hover:border-[#80237E]/30 rounded-2xl text-left transition-all shadow-xs hover:shadow-md flex items-center justify-between group active:scale-[0.99]"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-xl bg-purple-50 text-[#80237E] group-hover:bg-[#80237E] group-hover:text-white flex items-center justify-center shrink-0 transition-colors">
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

          {/* ACTIVE CONVERSATION STATE: Chat Stream */}
          {!isFreshChat && (
            <div className="space-y-4">
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
                  <div className="max-w-[85%] group relative space-y-1.5">
                    {/* Attachment Badge on User Message */}
                    {msg.attachment && (
                      <div className="flex items-center space-x-1.5 px-3 py-1.5 bg-purple-100 text-[#80237E] rounded-xl text-[11px] font-bold self-end border border-purple-200 shadow-xs">
                        <FileSpreadsheet className="w-3.5 h-3.5 text-[#80237E]" />
                        <span className="truncate">{msg.attachment.name}</span>
                        <span className="text-[10px] text-purple-600 font-normal">({(msg.attachment.size / 1024).toFixed(1)} KB)</span>
                      </div>
                    )}

                    <div
                      className={`p-4 rounded-2xl text-xs leading-relaxed shadow-sm ${
                        msg.role === "user"
                          ? "bg-[#80237E] text-white rounded-tr-none font-medium"
                          : "bg-white border border-gray-100 text-gray-800 rounded-tl-none shadow-gray-100/50"
                      }`}
                    >
                      <CleanResponseRenderer content={msg.content} isUser={msg.role === "user"} />
                    </div>

                    {/* Interactive Action Confirmation Cards (Level 3 Execution) */}
                    {msg.role === "model" && msg.actions && msg.actions.length > 0 && (
                      <div className="mt-2.5 space-y-2 animate-fade-in">
                        {msg.actions.map((act, actIdx) => {
                          const actionId = act.id || `act-${idx}-${actIdx}`;
                          const isExecuted = executedActionIds.has(actionId);

                          if (act.isMutation) {
                            return (
                              <div 
                                key={actIdx}
                                className="p-3 bg-purple-50/80 border border-purple-200 rounded-2xl space-y-2 shadow-xs"
                              >
                                <div className="flex items-center justify-between">
                                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#80237E] flex items-center space-x-1">
                                    <Zap className="w-3 h-3 text-[#D4AF37]" />
                                    <span>Database Operation (Confirmation Required)</span>
                                  </span>
                                  {isExecuted && (
                                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full flex items-center space-x-1">
                                      <CheckCircle2 className="w-3 h-3" />
                                      <span>Imported & Logged</span>
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs font-bold text-gray-900">{act.label}</p>
                                {act.summary && (
                                  <p className="text-[11px] text-gray-600">{act.summary}</p>
                                )}
                                {!isExecuted && (
                                  <div className="flex items-center space-x-2 pt-1">
                                    <button
                                      onClick={() => handleActionExecution(act)}
                                      className="px-3.5 py-1.5 bg-[#80237E] hover:bg-[#6b1e6a] text-white font-bold rounded-xl text-[11px] transition-all shadow-xs flex items-center space-x-1.5"
                                    >
                                      <span>Approve & Execute</span>
                                      <Check className="w-3 h-3" />
                                    </button>
                                  </div>
                                )}
                              </div>
                            );
                          }

                          return (
                            <button
                              key={actIdx}
                              onClick={() => handleActionExecution(act)}
                              aria-label={`Execute action: ${act.label}`}
                              className="px-3 py-1.5 bg-gradient-to-r from-[#80237E]/10 to-[#6B46C1]/10 hover:from-[#80237E] hover:to-[#6B46C1] text-[#80237E] hover:text-white border border-[#80237E]/20 rounded-xl text-[11px] font-bold transition-all shadow-xs flex items-center space-x-1.5 group/btn active:scale-95"
                            >
                              <Zap className="w-3.5 h-3.5 text-[#D4AF37] group-hover/btn:text-white group-hover/btn:scale-110 transition-transform shrink-0" />
                              <span>{act.label}</span>
                              <ArrowRight className="w-3 h-3 text-purple-400 group-hover/btn:text-white group-hover/btn:translate-x-0.5 transition-transform shrink-0" />
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {/* Bubble Timestamp & Copy Action */}
                    <div
                      className={`flex items-center space-x-2 mt-1 px-1 text-[10px] text-gray-400 ${
                        msg.role === "user" ? "justify-end" : "justify-start"
                      }`}
                    >
                      <span>{msg.timestamp}</span>
                      <button
                        onClick={() => handleCopy(msg.content, idx)}
                        aria-label="Copy message text"
                        className="opacity-0 group-hover:opacity-100 transition-opacity hover:text-gray-600 p-0.5 rounded"
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
                <div className="flex items-center space-x-3 animate-fade-in">
                  <div className="w-8 h-8 rounded-xl bg-[#1F2937] text-[#D4AF37] flex items-center justify-center shrink-0 border border-[#D4AF37]/30">
                    <Sparkles className="w-4 h-4 text-[#D4AF37] animate-spin" />
                  </div>
                  <div className="p-3 bg-white border border-gray-100 rounded-2xl rounded-tl-none text-xs text-gray-500 flex items-center space-x-2 shadow-xs">
                    <div className="w-2 h-2 bg-[#80237E] rounded-full animate-ping" />
                    <span>Binti is processing document...</span>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}

        </div>

        {/* BOTTOM DOCKED MULTI-LINE INPUT BAR WITH (+) ATTACHMENT */}
        {!isFreshChat && (
          <ChatInputBar
            variant="docked"
            value={inputMessage}
            onChange={setInputMessage}
            onSubmit={handleSendMessage}
            loading={loading}
            inputRef={bottomInputRef}
            selectedFile={selectedFile}
            onSelectFile={setSelectedFile}
          />
        )}

      </div>

      {/* Connected Business Data Transparency Modal */}
      {showContextModal && (
        <div 
          role="dialog"
          aria-modal="true"
          aria-label="Connected Business Data Details"
          className="fixed inset-0 z-60 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in"
        >
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 border border-gray-100 font-sans space-y-4 relative">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center space-x-2 text-emerald-700">
                <Database className="w-5 h-5" />
                <h3 className="font-extrabold text-sm text-gray-900">Connected Business Data</h3>
              </div>
              <button
                onClick={() => setShowContextModal(false)}
                aria-label="Close context details"
                className="p-1.5 text-gray-400 hover:text-gray-600 rounded-xl hover:bg-gray-100 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-gray-600 leading-relaxed">
              <p>
                Binti is synchronized with your live single-user business database and supports direct document ingestion:
              </p>
              
              <div className="p-3 bg-gray-50 rounded-2xl space-y-1.5 border border-gray-100 text-[11px]">
                <div className="flex justify-between py-0.5">
                  <span className="text-gray-500 font-medium">Clients Module:</span>
                  <span className="font-bold text-gray-800">{saasContext?.clientCount ?? 0} active accounts</span>
                </div>
                <div className="flex justify-between py-0.5">
                  <span className="text-gray-500 font-medium">Quotations Ledger:</span>
                  <span className="font-bold text-gray-800">{saasContext?.totalQuotes ?? 0} proposals ({saasContext?.conversionRate ?? 0}% converted)</span>
                </div>
                <div className="flex justify-between py-0.5">
                  <span className="text-gray-500 font-medium">Invoices & Receivables:</span>
                  <span className="font-bold text-gray-800">{saasContext?.totalInvoices ?? 0} invoices ({saasContext?.collectionRate ?? 100}% collection rate)</span>
                </div>
                <div className="flex justify-between py-0.5">
                  <span className="text-gray-500 font-medium">Document Import Engine:</span>
                  <span className="font-bold text-emerald-700">Active (CSV, XLSX, PDF, TXT)</span>
                </div>
                <div className="flex justify-between py-0.5">
                  <span className="text-gray-500 font-medium">Last Synchronized:</span>
                  <span className="font-bold text-gray-800">{saasContext?.lastSyncedAt || "Real-time active"}</span>
                </div>
              </div>

              <p className="text-[11px] text-gray-500">
                🔒 All document imports require your explicit confirmation before records are saved to the database.
              </p>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => setShowContextModal(false)}
                className="w-full py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold rounded-xl text-xs transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
