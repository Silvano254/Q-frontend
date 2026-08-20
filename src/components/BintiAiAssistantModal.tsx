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

  const messagesRef = useRef<ChatMessage[]>(messages);
  messagesRef.current = messages;
  const activeThoughtStepsRef = useRef<AgentThoughtStep[]>([]);

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

    // Pre-parse File Size Guard
    if (fileToProcess && fileToProcess.size > 20 * 1024 * 1024) {
      setErrorMsg(`File "${fileToProcess.name}" (${(fileToProcess.size / (1024 * 1024)).toFixed(1)} MB) exceeds the 20 MB size limit.`);
      return;
    }

    const startTime = Date.now();
    setElapsedTimeMs(0);
    activeThoughtStepsRef.current = [];
    setActiveThoughtSteps([]);
    if (stopwatchRef.current) clearInterval(stopwatchRef.current);
    stopwatchRef.current = setInterval(() => {
      setElapsedTimeMs(Date.now() - startTime);
    }, 100);

    const handleDynamicStep = (step: { title: string; detail?: string; status: 'in_progress' | 'complete' | 'failed' }) => {
      const stepId = typeof crypto !== 'undefined' && crypto.randomUUID 
        ? crypto.randomUUID() 
        : `step-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

      const newStep: AgentThoughtStep = {
        id: stepId,
        title: step.title,
        detail: step.detail,
        status: step.status,
        timestamp: Date.now()
      };
      
      activeThoughtStepsRef.current.push(newStep);
      setActiveThoughtSteps([...activeThoughtStepsRef.current]);
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
        title: "Evaluating query against verified business metrics",
        detail: "Connected to operational database",
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
    const currentMessages = messagesRef.current;

    if (isAffirmative && currentMessages.length > 0 && !fileToProcess) {
      const lastModelMsg = [...currentMessages].reverse().find(m => m.role === "model" && m.actions && m.actions.length > 0);
      const pendingAction = lastModelMsg?.actions?.find(a => a.isMutation && a.id && !executedActionIds.has(a.id));
      
      if (pendingAction && onExecuteAction) {
        try {
          handleDynamicStep({
            title: `Executing database action: ${pendingAction.label}`,
            detail: "Committing records to active database tables",
            status: 'in_progress'
          });
          await (onExecuteAction as any)(pendingAction, (msg: string) => {
            handleDynamicStep({
              title: `Writing to database: ${pendingAction.label}`,
              detail: msg,
              status: 'in_progress'
            });
          });
          if (pendingAction.id) {
            setExecutedActionIds(prev => new Set(prev).add(pendingAction.id!));
          }
          if (stopwatchRef.current) clearInterval(stopwatchRef.current);
          const confirmMsg: ChatMessage = {
            role: "model",
            content: `**Database Operation Completed**: ${pendingAction.label}.\n\nThe records have been written and committed to your active database tables.`,
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
        currentMessages,
        saasContext,
        currentController.signal,
        parsedDoc,
        handleDynamicStep
      );

      if (currentController.signal.aborted) return;

      const duration = Date.now() - startTime;
      if (stopwatchRef.current) clearInterval(stopwatchRef.current);

      const finalizedSteps = activeThoughtStepsRef.current.map(s => ({
        ...s,
        status: s.status === 'failed' ? 'failed' as const : 'complete' as const
      }));

      const assistantMsg: ChatMessage = {
        role: "model",
        content: result.reply,
        actions: result.actions?.map((act, i) => ({
          ...act,
          id: act.id || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `action-${Date.now()}-${i}`)
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
  }, [executedActionIds, inputMessage, loading, onExecuteAction, saasContext, selectedFile]);

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
      className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-xs font-sans transition-opacity animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div className="bg-white w-full sm:w-[520px] md:w-[600px] lg:w-[660px] xl:w-[720px] h-[100dvh] sm:h-screen shadow-2xl border-l border-gray-100 flex flex-col overflow-hidden relative animate-slide-in-right sm:rounded-l-3xl">
        
        {/* MODAL HEADER */}
        <div className="px-3.5 sm:px-6 py-3 sm:py-4 border-b border-gray-100 flex items-center justify-between bg-white shrink-0">
          <div className="flex items-center space-x-2.5 sm:space-x-3 min-w-0">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-2xl bg-gradient-to-tr from-[#1F2937] to-[#80237E] p-0.5 shadow-md flex items-center justify-center border border-[#D4AF37]/30 shrink-0">
              <div className="w-full h-full bg-white rounded-[14px] flex items-center justify-center p-1 sm:p-1.5">
                <img src="/logo.jpeg" alt="Binti" className="w-full h-full object-contain" />
              </div>
            </div>
            <div className="min-w-0">
              <div className="flex items-center space-x-1.5 sm:space-x-2">
                <h2 className="font-extrabold text-sm sm:text-base text-gray-900 tracking-tight">Binti AI</h2>
                <span className="text-[9px] sm:text-[10px] bg-purple-100 text-[#80237E] font-bold px-1.5 sm:px-2 py-0.5 rounded-full uppercase tracking-wider truncate max-w-[130px] sm:max-w-none">
                  Operations & Import
                </span>
              </div>
              <p className="hidden sm:block text-xs text-gray-500 truncate">Grounded in your business records & document parser</p>
            </div>
          </div>

          <div className="flex items-center space-x-1 sm:space-x-2 shrink-0">
            <button
              onClick={() => setShowContextModal(true)}
              aria-label="View connected business data transparency details"
              className="px-2 sm:px-2.5 py-1 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100/80 border border-emerald-200/60 rounded-xl transition-all flex items-center space-x-1.5"
            >
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
              <span className="font-mono text-[10px] sm:text-[11px]">
                <span className="hidden sm:inline">{saasContext?.clientCount ?? 0} clients connected</span>
                <span className="sm:hidden">{saasContext?.clientCount ?? 0} clients</span>
              </span>
            </button>

            {messages.length > 0 && (
              <button
                onClick={() => {
                  setMessages([]);
                  setErrorMsg(null);
                }}
                aria-label="Start new conversation"
                title="New Chat"
                className="p-1.5 sm:p-2 hover:bg-gray-100 text-gray-400 hover:text-gray-600 rounded-xl transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </button>
            )}

            <button
              onClick={handleClose}
              aria-label="Close assistant modal"
              className="p-1.5 sm:p-2 hover:bg-gray-100 text-gray-400 hover:text-gray-600 rounded-xl transition-colors"
            >
              <X className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>
        </div>

        {/* ERROR BANNER */}
        {errorMsg && (
          <div 
            role="alert"
            className="mx-3.5 sm:mx-6 mt-2.5 sm:mt-3 p-2.5 sm:p-3 bg-rose-50 border border-rose-200 rounded-2xl flex items-center justify-between text-xs text-rose-700 shrink-0 animate-fade-in"
          >
            <div className="flex items-center space-x-2 min-w-0">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
              <span className="truncate">{errorMsg}</span>
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
        <div className="flex-1 overflow-y-auto p-3.5 sm:p-6 space-y-3.5 sm:space-y-4 [scrollbar-width:thin] bg-gray-50/40">
          
          {/* FRESH CHAT STATE: Welcome & Quick Prompts */}
          {isFreshChat && (
            <div className="max-w-xl mx-auto py-3 sm:py-6 space-y-4 sm:space-y-6 animate-fade-in">
              <div className="text-center space-y-1.5 sm:space-y-2">
                <div className="w-12 h-12 sm:w-16 sm:h-16 mx-auto rounded-2xl sm:rounded-3xl bg-gradient-to-tr from-[#1F2937] via-[#2D1B4E] to-[#80237E] p-0.5 shadow-xl flex items-center justify-center border border-[#D4AF37]/40">
                  <div className="w-full h-full bg-white rounded-[14px] sm:rounded-[22px] flex items-center justify-center p-1.5 sm:p-2.5">
                    <img src="/logo.jpeg" alt="Binti" className="w-full h-full object-contain" />
                  </div>
                </div>
                <h3 className="text-lg sm:text-xl font-extrabold text-gray-900 tracking-tight">
                  How can I assist your business today?
                </h3>
                <p className="text-xs text-gray-500 max-w-xs mx-auto leading-relaxed px-2">
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
                      className="p-2.5 sm:p-3 bg-white hover:bg-purple-50/50 border border-gray-100 hover:border-[#80237E]/30 rounded-2xl text-left transition-all shadow-2xs hover:shadow-sm flex items-center justify-between group active:scale-[0.99]"
                    >
                      <div className="flex items-center space-x-2.5 sm:space-x-3 min-w-0">
                        <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-purple-50 text-[#80237E] group-hover:bg-[#80237E] group-hover:text-white flex items-center justify-center shrink-0 transition-colors">
                          <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-xs font-bold text-gray-800 group-hover:text-[#80237E] transition-colors truncate">
                            {card.title}
                          </h4>
                          <p className="text-[10px] sm:text-[11px] text-gray-500 mt-0.5 truncate">{card.subtitle}</p>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-[#80237E] group-hover:translate-x-0.5 transition-all shrink-0 ml-2" />
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* ACTIVE CONVERSATION STREAM */}
          {!isFreshChat && (
            <div className="space-y-3.5 sm:space-y-4">
              {messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex items-start space-x-2.5 sm:space-x-3 ${
                    msg.role === "user" ? "flex-row-reverse space-x-reverse" : ""
                  }`}
                >
                  <div
                    className={`w-7 h-7 sm:w-8 sm:h-8 rounded-xl flex items-center justify-center shrink-0 shadow-sm ${
                      msg.role === "user"
                        ? "bg-[#80237E] text-white"
                        : "bg-[#1F2937] text-[#D4AF37] border border-[#D4AF37]/30"
                    }`}
                  >
                    {msg.role === "user" ? <User className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> : <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#D4AF37]" />}
                  </div>

                  <div className="max-w-[90%] sm:max-w-[85%] group relative space-y-1.5">
                    {msg.attachment && (
                      <div className="flex items-center space-x-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 bg-purple-100 text-[#80237E] rounded-xl text-[10px] sm:text-[11px] font-bold self-end border border-purple-200 shadow-xs">
                        <FileSpreadsheet className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-[#80237E]" />
                        <span className="truncate max-w-[160px] sm:max-w-xs">{msg.attachment.name}</span>
                        <span className="text-[9px] sm:text-[10px] text-purple-600 font-normal">({(msg.attachment.size / 1024).toFixed(1)} KB)</span>
                      </div>
                    )}

                    <div
                      className={`p-3 sm:p-4 rounded-2xl text-xs leading-relaxed shadow-sm ${
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
                <div className="flex items-center space-x-2 pl-1 py-1 animate-fade-in">
                  <div className="flex-1">
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
