import React, { memo } from "react";
import { Database, X, ShieldCheck } from "lucide-react";
import { SaaSContext } from "../../services/geminiService";

export interface ContextTransparencyModalProps {
  isOpen: boolean;
  onClose: () => void;
  saasContext?: SaaSContext;
}

export const ContextTransparencyModal = memo(function ContextTransparencyModal({
  isOpen,
  onClose,
  saasContext
}: ContextTransparencyModalProps) {
  if (!isOpen) return null;

  return (
    <div 
      role="dialog"
      aria-modal="true"
      aria-label="Connected Business Data Details"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in font-sans"
    >
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 border border-gray-100 space-y-4 relative">
        <div className="flex items-center justify-between pb-3 border-b border-gray-100">
          <div className="flex items-center space-x-2 text-emerald-700">
            <Database className="w-5 h-5" />
            <h3 className="font-extrabold text-sm text-gray-900">Connected Business Data</h3>
          </div>
          <button
            onClick={onClose}
            aria-label="Close context details"
            className="p-1 hover:bg-gray-100 text-gray-400 hover:text-gray-600 rounded-xl transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs text-gray-600 leading-relaxed">
          Binti AI is connected to your active operational records to provide grounded business answers and auto-fill proposal templates.
        </p>

        <div className="space-y-2.5 text-xs">
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-2xl">
            <span className="text-gray-500 font-medium">Business / Workspace:</span>
            <span className="font-bold text-gray-900">{saasContext?.companyName || 'Binti Events'}</span>
          </div>

          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-2xl">
            <span className="text-gray-500 font-medium">Active Clients Directory:</span>
            <span className="font-bold text-gray-900">{saasContext?.clientCount ?? 0} clients</span>
          </div>

          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-2xl">
            <span className="text-gray-500 font-medium">Quotes & Proposals:</span>
            <span className="font-bold text-gray-900">{saasContext?.totalQuotes ?? 0} quotes</span>
          </div>

          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-2xl">
            <span className="text-gray-500 font-medium">Invoices & Balances:</span>
            <span className="font-bold text-gray-900">{saasContext?.totalInvoices ?? 0} invoices</span>
          </div>
        </div>

        <div className="pt-2 flex items-center justify-between text-[11px] text-gray-400">
          <div className="flex items-center space-x-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>End-to-End Enterprise Encryption</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-900 hover:bg-gray-800 text-white rounded-xl font-bold transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
});
