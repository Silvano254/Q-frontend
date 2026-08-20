import React, { useState, useEffect, useRef, memo } from "react";
import { 
  Send, 
  Plus, 
  Paperclip, 
  FileSpreadsheet, 
  FileCheck, 
  Image, 
  ClipboardList, 
  BarChart3, 
  Camera,
  X,
  AlertCircle
} from "lucide-react";

export interface ChatInputBarProps {
  value: string;
  onChange: (val: string) => void;
  onSubmit: () => void;
  loading: boolean;
  variant: "centered" | "docked";
  inputRef?: React.RefObject<HTMLTextAreaElement>;
  selectedFile: File | null;
  onSelectFile: (file: File | null) => void;
  onError?: (err: string | null) => void;
}

export const ChatInputBar = memo(function ChatInputBar({
  value,
  onChange,
  onSubmit,
  loading,
  variant,
  inputRef,
  selectedFile,
  onSelectFile,
  onError
}: ChatInputBarProps) {
  const [showAttachMenu, setShowAttachMenu] = useState<boolean>(false);
  const localRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const csvInputRef = useRef<HTMLInputElement>(null);
  const draftInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const menuContainerRef = useRef<HTMLDivElement>(null);
  const activeRef = inputRef || localRef;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuContainerRef.current && !menuContainerRef.current.contains(event.target as Node)) {
        setShowAttachMenu(false);
      }
    };
    if (showAttachMenu) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showAttachMenu]);

  useEffect(() => {
    if (activeRef.current) {
      activeRef.current.style.height = "auto";
      const minH = variant === "centered" ? 42 : 36;
      const targetH = Math.min(activeRef.current.scrollHeight, 120);
      activeRef.current.style.height = `${Math.max(targetH, minH)}px`;
    }
  }, [value, variant, activeRef]);

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value);
    const textarea = e.target;
    textarea.style.height = "auto";
    const minH = variant === "centered" ? 42 : 36;
    const targetH = Math.min(textarea.scrollHeight, 120);
    textarea.style.height = `${Math.max(targetH, minH)}px`;
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!loading && (value.trim() || selectedFile)) {
        onSubmit();
      }
    }
  };

  const validateAndSelectFile = (file: File, promptHint?: string) => {
    if (file.size > 20 * 1024 * 1024) {
      onError?.(`File "${file.name}" (${(file.size / (1024 * 1024)).toFixed(1)} MB) exceeds the 20 MB upload limit.`);
      return;
    }
    onError?.(null);
    onSelectFile(file);
    setShowAttachMenu(false);
    if (promptHint && !value.trim()) {
      onChange(promptHint);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>, promptHint?: string) => {
    if (e.target.files && e.target.files[0]) {
      validateAndSelectFile(e.target.files[0], promptHint);
      e.target.value = "";
    }
  };

  return (
    <div className={`w-full ${variant === "centered" ? "max-w-xl mx-auto" : "p-3 sm:p-4 bg-white border-t border-gray-100 shrink-0"}`}>
      {/* Selected File Chip */}
      {selectedFile && (
        <div className="mb-2 flex items-center justify-between px-3 py-1.5 sm:py-2 bg-purple-50 border border-purple-200 rounded-xl text-xs text-[#80237E] font-medium shadow-xs">
          <div className="flex items-center space-x-2 truncate min-w-0">
            <FileSpreadsheet className="w-4 h-4 text-[#80237E] shrink-0" />
            <span className="truncate font-semibold">{selectedFile.name}</span>
            <span className="text-[10px] text-purple-600 font-normal shrink-0">({(selectedFile.size / 1024).toFixed(1)} KB)</span>
          </div>
          <button
            type="button"
            onClick={() => onSelectFile(null)}
            aria-label="Remove attached file"
            className="p-1 hover:bg-purple-200 rounded-lg text-purple-700 transition-colors shrink-0 ml-1.5"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Main Input Container */}
      <div className={`relative flex items-end bg-white border border-gray-200 focus-within:border-[#80237E] focus-within:ring-2 focus-within:ring-[#80237E]/10 rounded-2xl shadow-xs transition-all ${variant === "centered" ? "p-1.5 sm:p-2 min-h-[48px] sm:min-h-[52px]" : "p-1.5"}`}>
        {/* Hidden Inputs */}
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={(e) => handleFileInputChange(e)}
        />
        <input
          ref={csvInputRef}
          type="file"
          accept=".csv,.xlsx,.xls,.json,.txt"
          className="hidden"
          onChange={(e) => handleFileInputChange(e, "Please analyze and structure this data file for Binti Events.")}
        />
        <input
          ref={draftInputRef}
          type="file"
          accept=".pdf,.doc,.docx,.txt"
          className="hidden"
          onChange={(e) => handleFileInputChange(e, "Please extract invoice / quotation line items from this document.")}
        />
        <input
          ref={imageInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => handleFileInputChange(e, "Please extract all expenses, vendor details, and amounts from this receipt image.")}
        />

        {/* Attachment Menu Button */}
        <div ref={menuContainerRef} className="relative shrink-0 mb-0.5 ml-0.5">
          <button
            type="button"
            onClick={() => setShowAttachMenu(prev => !prev)}
            disabled={loading}
            aria-expanded={showAttachMenu}
            aria-label="Add attachment or action"
            title="Attach file, spreadsheet, or receipt"
            className="p-1.5 sm:p-2 text-gray-500 hover:text-[#80237E] hover:bg-purple-50 rounded-xl transition-all disabled:opacity-50"
          >
            <Plus className={`w-4 h-4 transition-transform duration-200 ${showAttachMenu ? "rotate-45 text-[#80237E]" : ""}`} />
          </button>

          {/* Context Menu Dropdown */}
          {showAttachMenu && (
            <div className="absolute bottom-full left-0 mb-2 w-72 max-w-[calc(100vw-32px)] bg-white rounded-2xl shadow-xl border border-gray-100 p-1.5 z-50 animate-fade-in text-left">
              <div className="px-2.5 py-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                Attach & Import
              </div>

              <button
                type="button"
                onClick={() => csvInputRef.current?.click()}
                className="w-full flex items-center space-x-2.5 sm:space-x-3 px-2.5 sm:px-3 py-2 text-xs text-gray-700 hover:bg-purple-50 hover:text-[#80237E] rounded-xl transition-colors text-left"
              >
                <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0">
                  <p className="font-bold truncate">Spreadsheet or CSV List</p>
                  <p className="text-[10px] text-gray-400 truncate">Import clients, invoices, quotes & inventory</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => imageInputRef.current?.click()}
                className="w-full flex items-center space-x-2.5 sm:space-x-3 px-2.5 sm:px-3 py-2 text-xs text-gray-700 hover:bg-purple-50 hover:text-[#80237E] rounded-xl transition-colors text-left"
              >
                <div className="w-7 h-7 rounded-lg bg-purple-50 text-[#80237E] flex items-center justify-center shrink-0">
                  <Camera className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0">
                  <p className="font-bold truncate">Receipt, Fuel Slip or Image</p>
                  <p className="text-[10px] text-gray-400 truncate">Extract expense amounts & vendors via Vision</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => draftInputRef.current?.click()}
                className="w-full flex items-center space-x-2.5 sm:space-x-3 px-2.5 sm:px-3 py-2 text-xs text-gray-700 hover:bg-purple-50 hover:text-[#80237E] rounded-xl transition-colors text-left"
              >
                <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                  <FileCheck className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0">
                  <p className="font-bold truncate">Contract or PDF Proposal</p>
                  <p className="text-[10px] text-gray-400 truncate">Extract scopes of work & client terms</p>
                </div>
              </button>
            </div>
          )}
        </div>

        {/* Input Textarea */}
        <form 
          onSubmit={(e) => { e.preventDefault(); onSubmit(); }} 
          className="flex-1 flex items-end min-w-0"
        >
          <textarea
            ref={activeRef}
            rows={1}
            value={value}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            placeholder={variant === "centered" ? "Ask Binti anything..." : "Ask follow-up or command..."}
            disabled={loading}
            aria-label="Message prompt for Binti AI Assistant"
            className="flex-1 py-2 px-2 bg-transparent text-xs text-gray-900 placeholder:text-gray-400 focus:outline-none disabled:opacity-60 font-medium resize-none leading-relaxed overflow-y-auto max-h-[120px] [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden min-w-0"
          />

          <button
            type="submit"
            disabled={loading || (!value.trim() && !selectedFile)}
            aria-label="Send message"
            className="px-3 sm:px-4 py-2 sm:py-2.5 bg-gradient-to-r from-[#1F2937] to-[#80237E] hover:opacity-95 text-white font-bold rounded-xl text-xs shadow-md shadow-purple-900/15 flex items-center space-x-1.5 disabled:opacity-40 transition-all active:scale-95 shrink-0 mb-0.5 ml-1 cursor-pointer"
          >
            <span className="hidden sm:inline">Send</span>
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>
      </div>

      {/* Center Disclaimer */}
      <div className="flex items-center justify-center pt-1 text-[11px] text-gray-400 font-normal select-none tracking-tight">
        <span>Binti AI can make mistakes. Check important info.</span>
      </div>
    </div>
  );
});
