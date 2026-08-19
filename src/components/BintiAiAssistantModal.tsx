import React, { useState, useEffect, useRef, useCallback } from "react";
import { 
  Sparkles, 
  X, 
  User, 
  Copy, 
  Check, 
  RotateCcw, 
  FileSpreadsheet, 
  AlertCircle,
  Database,
  ChevronRight
} from "lucide-react";
import { 
  askGeminiAssistant, 
  ChatMessage, 
  SaaSContext, 
  AgentAction, 
  AgentThoughtStep 
} from "../services/geminiService";
import { parseUploadedDocument, ParsedDocument } from "../utils/fileParser";
import { ChatInputBar } from "./binti-ai/ChatInputBar";
import { ThoughtProcessAccordion } from "./binti-ai/ThoughtProcessAccordion";
import { ResponseRenderer } from "./binti-ai/ResponseRenderer";
import { ActionConfirmationCards } from "./binti-ai/ActionConfirmationCards";
import { ContextTransparencyModal } from "./binti-ai/ContextTransparencyModal";
import { QUICK_CARDS } from "./binti-ai/quickCards";

interface BintiAiAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  saasContext?: SaaSContext;
  initialPrompt?: string;
  onExecuteAction?: (action: AgentAction) => Promise<boolean | void> | boolean | void;
}

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
  const [activeThoughtSteps, setActiveThoughtSteps] = useState<AgentThoughtStep[]>([]);
  const [elapsedTimeMs, setElapsedTimeMs] = useState<number>(0);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [lastFailedPrompt, setLastFailedPrompt] = useState<string | null>(null);
  const [executedActionIds, setExecutedActionIds] = useState<Set<string>>(new Set());
  const [showContextModal, setShowContextModal] = useState<boolean>(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const centerInputRef = useRef<HTMLTextAreaElement>(null);
  const bottomInputRef = useRef<HTMLTextAreaElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const initialPromptHandledRef = useRef<boolean>(false);
  const stopwatchRef = useRef<any>(null);

  const handleClose = useCallback(() => {
    abortControllerRef.current?.abort();
    if (stopwatchRef.current) clearInterval(stopwatchRef.current);
    onClose();
  }, [onClose]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        if (showContextModal) {
          setShowContextModal(false);
        } else {
          handleClose();
        }
      }
    };
    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, showContextModal, handleClose]);

  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
      if (stopwatchRef.current) clearInterval(stopwatchRef.current);
    };
  }, []);

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

    const startTime = Date.now();
    setElapsedTimeMs(0);
    setActiveThoughtSteps([]);
    if (stopwatchRef.current) clearInterval(stopwatchRef.current);
    stopwatchRef.current = setInterval(() => {
      setElapsedTimeMs(Date.now() - startTime);
    }, 100);

    const collectedSteps: AgentThoughtStep[] = [];
    const handleDynamicStep = (step: { title: string; detail?: string; status: 'in_progress' | 'complete' | 'failed' }) => {
      const newStep: AgentThoughtStep = {
        id: `step-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        title: step.title,
        detail: step.detail,
        status: step.status,
        timestamp: Date.now()
      };
      collectedSteps.push(newStep);
      setActiveThoughtSteps(prev => {
        const updated = prev.map(s => s.status === 'in_progress' ? { ...s, status: 'complete' as const } : s);
        return [...updated, newStep];
      });
    };

    let parsedDoc: ParsedDocument | null = null;
    if (fileToProcess) {
      try {
        parsedDoc = await parseUploadedDocument(fileToProcess, handleDynamicStep);
        if (parsedDoc.parseStatus === "failed") {
          if (stopwatchRef.current) clearInterval(stopwatchRef.current);
          setErrorMsg(parsedDoc.parseError || "Failed to process the uploaded file.");
          return;
        }
      } catch (err: any) {
        console.error("Failed to parse file:", err);
      }
    } else {
      handleDynamicStep({
        title: "Evaluating query against active business context",
        detail: `Loaded ${saasContext?.clientCount || 0} clients, ${saasContext?.totalQuotes || 0} quotes & ${saasContext?.totalInvoices || 0} invoices`,
        status: 'in_progress'
      });
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

    // Conversational auto-execution on confirmation
    const trimmedQuery = query.trim().toLowerCase();
    const isAffirmative = /^(yes|confirm|proceed|do it|import|write|execute|ok|okay|approve|please do)$/i.test(trimmedQuery);
    
    if (isAffirmative && messages.length > 0 && !fileToProcess) {
      const lastModelMsg = [...messages].reverse().find(m => m.role === "model" && m.actions && m.actions.length > 0);
      const pendingAction = lastModelMsg?.actions?.find(a => a.isMutation && a.id && !executedActionIds.has(a.id));
      
      if (pendingAction && onExecuteAction) {
        try {
          handleDynamicStep({
            title: `Executing database action: ${pendingAction.label}`,
            detail: "Committing records to active database tables",
            status: 'in_progress'
          });
          await onExecuteAction(pendingAction);
          if (pendingAction.id) {
            setExecutedActionIds(prev => new Set(prev).add(pendingAction.id!));
          }
          if (stopwatchRef.current) clearInterval(stopwatchRef.current);
          const confirmMsg: ChatMessage = {
            role: "model",
            content: `**Action Executed Successfully**: ${pendingAction.label}.\n\nThe records have been saved to your active database tables.`,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          };
          setMessages(prev => [...prev, confirmMsg]);
          setLoading(false);
          return;
        } catch (err: any) {
          console.error("Auto-execution failed:", err);
        }
      }
    }

    try {
      const result = await askGeminiAssistant(
        query.trim() || `Please analyze this attached document and extract structured records: ${fileToProcess?.name}`,
        messages,
        saasContext,
        currentController.signal,
        parsedDoc,
        handleDynamicStep
      );

      if (currentController.signal.aborted) return;

      const duration = Date.now() - startTime;
      if (stopwatchRef.current) clearInterval(stopwatchRef.current);

      const finalizedSteps = collectedSteps.map(s => ({
        ...s,
        status: s.status === 'failed' ? 'failed' as const : 'complete' as const
      }));

      const assistantMsg: ChatMessage = {
        role: "model",
        content: result.reply,
        actions: result.actions?.map((act, i) => ({
          ...act,
          id: act.id || `action-${Date.now()}-${i}`
        })),
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        thoughtSteps: finalizedSteps,
        thinkingDurationMs: duration
      };

      setMessages(prev => [...prev, assistantMsg]);
    } catch (err: any) {
      if (stopwatchRef.current) clearInterval(stopwatchRef.current);
      if (err?.name === "AbortError" || currentController.signal.aborted) {
        return;
      }
      console.error("Binti AI error:", err);
      setErrorMsg("Binti couldn't complete your request right now. Please check your connection and try again.");
      setLastFailedPrompt(query.trim());
    } finally {
      if (stopwatchRef.current) clearInterval(stopwatchRef.current);
      if (!currentController.signal.aborted) {
        setLoading(false);
      }
    }
  }, [executedActionIds, inputMessage, loading, messages, onExecuteAction, saasContext, selectedFile]);

  useEffect(() => {
    if (!isOpen) {
      initialPromptHandledRef.current = false;
      return;
    }

    if (initialPrompt && initialPrompt.trim().length > 0 && !initialPromptHandledRef.current) {
      initialPromptHandledRef.current = true;
      handleSendMessage(initialPrompt);
    }
  }, [isOpen, initialPrompt, handleSendMessage]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        if (messages.length === 0) {
          centerInputRef.current?.focus();
        } else {
          bottomInputRef.current?.focus();
        }
      }, 150);
    }
  }, [isOpen, messages.length]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const handleCopy = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleActionSuccess = (actionId: string) => {
    setExecutedActionIds(prev => new Set(prev).add(actionId));
  };

  if (!isOpen) return null;

  const isFreshChat = messages.length === 0;

  return (
    <div 
      role="dialog"
      aria-modal="true"
      aria-label="Binti AI Operations Assistant"
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-xs animate-fade-in font-sans"
    >
      <div className="bg-white rounded-3xl shadow-2xl border border-gray-100 w-full max-w-4xl h-[90vh] max-h-[860px] flex flex-col overflow-hidden relative">
        
        {/* MODAL HEADER */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-white shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#1F2937] to-[#80237E] p-0.5 shadow-md flex items-center justify-center border border-[#D4AF37]/30">
              <div className="w-full h-full bg-white rounded-[14px] flex items-center justify-center p-1.5">
                <img src="/logo.jpeg" alt="Binti" className="w-full h-full object-contain" />
              </div>
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="font-extrabold text-sm text-gray-900 tracking-tight">Binti AI</h2>
                <span className="text-[10px] bg-purple-100 text-[#80237E] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Operations & Import Assistant
                </span>
              </div>
              <p className="text-xs text-gray-500">Grounded in your business records & document parser</p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowContextModal(true)}
              aria-label="View connected business data transparency details"
              className="px-2.5 py-1 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100/80 border border-emerald-200/60 rounded-xl transition-all flex items-center space-x-1.5"
            >
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="font-mono text-[11px]">{saasContext?.clientCount ?? 0} clients connected</span>
            </button>

            {messages.length > 0 && (
              <button
                onClick={() => {
                  setMessages([]);
                  setErrorMsg(null);
                }}
                aria-label="Start new conversation"
                title="New Chat"
                className="p-2 hover:bg-gray-100 text-gray-400 hover:text-gray-600 rounded-xl transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            )}

            <button
              onClick={handleClose}
              aria-label="Close assistant modal"
              className="p-2 hover:bg-gray-100 text-gray-400 hover:text-gray-600 rounded-xl transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ERROR BANNER */}
        {errorMsg && (
          <div 
            role="alert"
            className="mx-6 mt-3 p-3 bg-rose-50 border border-rose-200 rounded-2xl flex items-center justify-between text-xs text-rose-700 shrink-0 animate-fade-in"
          >
            <div className="flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
              <span>{errorMsg}</span>
            </div>
            {lastFailedPrompt && (
              <button
                onClick={() => handleSendMessage(lastFailedPrompt)}
                className="font-bold underline hover:no-underline ml-2 text-rose-800 shrink-0"
              >
                Retry
              </button>
            )}
          </div>
        )}

        {/* CHAT CONTAINER */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 [scrollbar-width:thin] bg-gray-50/40">
          
          {/* FRESH CHAT STATE: Welcome & Quick Prompts */}
          {isFreshChat && (
            <div className="max-w-xl mx-auto py-6 space-y-6 animate-fade-in">
              <div className="text-center space-y-2">
                <div className="w-16 h-16 mx-auto rounded-3xl bg-gradient-to-tr from-[#1F2937] via-[#2D1B4E] to-[#80237E] p-0.5 shadow-xl flex items-center justify-center border border-[#D4AF37]/40">
                  <div className="w-full h-full bg-white rounded-[22px] flex items-center justify-center p-2.5">
                    <img src="/logo.jpeg" alt="Binti" className="w-full h-full object-contain" />
                  </div>
                </div>
                <h3 className="text-xl font-extrabold text-gray-900 tracking-tight">
                  How can I assist your business today?
                </h3>
                <p className="text-xs text-gray-500 max-w-xs mx-auto leading-relaxed">
                  Ask questions or click the <strong className="text-[#80237E] font-bold">+</strong> button to attach spreadsheets, CSVs, or receipt photos.
                </p>
              </div>

              {/* Centered Input Bar */}
              <ChatInputBar
                variant="centered"
                value={inputMessage}
                onChange={setInputMessage}
                onSubmit={handleSendMessage}
                loading={loading}
                inputRef={centerInputRef}
                selectedFile={selectedFile}
                onSelectFile={setSelectedFile}
                onError={setErrorMsg}
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
                      className="p-3 bg-white hover:bg-purple-50/50 border border-gray-100 hover:border-[#80237E]/30 rounded-2xl text-left transition-all shadow-2xs hover:shadow-sm flex items-center justify-between group active:scale-[0.99]"
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

          {/* ACTIVE CONVERSATION STREAM */}
          {!isFreshChat && (
            <div className="space-y-4">
              {messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex items-start space-x-3 ${
                    msg.role === "user" ? "flex-row-reverse space-x-reverse" : ""
                  }`}
                >
                  <div
                    className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 shadow-sm ${
                      msg.role === "user"
                        ? "bg-[#80237E] text-white"
                        : "bg-[#1F2937] text-[#D4AF37] border border-[#D4AF37]/30"
                    }`}
                  >
                    {msg.role === "user" ? <User className="w-4 h-4" /> : <Sparkles className="w-4 h-4 text-[#D4AF37]" />}
                  </div>

                  <div className="max-w-[85%] group relative space-y-1.5">
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
                      {msg.role === "model" && msg.thoughtSteps && msg.thoughtSteps.length > 0 && (
                        <ThoughtProcessAccordion
                          steps={msg.thoughtSteps}
                          durationMs={msg.thinkingDurationMs}
                          isLoading={false}
                          isDefaultExpanded={false}
                        />
                      )}
                      <ResponseRenderer content={msg.content} isUser={msg.role === "user"} />
                    </div>

                    {msg.role === "model" && msg.actions && msg.actions.length > 0 && (
                      <ActionConfirmationCards
                        actions={msg.actions}
                        messageIndex={idx}
                        executedActionIds={executedActionIds}
                        onExecuteAction={onExecuteAction}
                        onActionSuccess={handleActionSuccess}
                      />
                    )}

                    <div className={`flex items-center space-x-2 mt-1 px-1 text-[10px] text-gray-400 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                      <span>{msg.timestamp}</span>
                      <button
                        onClick={() => handleCopy(msg.content, idx)}
                        aria-label="Copy message text"
                        className="opacity-0 group-hover:opacity-100 transition-opacity hover:text-gray-600 p-0.5 rounded"
                        title="Copy text"
                      >
                        {copiedIndex === idx ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              {/* Active Thought Stream */}
              {loading && (
                <div className="flex items-start space-x-3 animate-fade-in">
                  <div className="w-8 h-8 rounded-xl bg-[#1F2937] text-[#D4AF37] flex items-center justify-center shrink-0 border border-[#D4AF37]/30 shadow-xs mt-0.5">
                    <Sparkles className="w-4 h-4 text-[#D4AF37] animate-spin" />
                  </div>
                  <div className="flex-1 max-w-[85%]">
                    <ThoughtProcessAccordion
                      steps={activeThoughtSteps}
                      durationMs={elapsedTimeMs}
                      isLoading={true}
                    />
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* BOTTOM INPUT BAR */}
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
            onError={setErrorMsg}
          />
        )}
      </div>

      <ContextTransparencyModal
        isOpen={showContextModal}
        onClose={() => setShowContextModal(false)}
        saasContext={saasContext}
      />
    </div>
  );
}
