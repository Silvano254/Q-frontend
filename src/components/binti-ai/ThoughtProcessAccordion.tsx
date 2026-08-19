import React, { useState, useEffect, memo } from "react";
import { Sparkles, CheckCircle2, ChevronDown, ChevronUp, AlertCircle } from "lucide-react";
import { AgentThoughtStep } from "../../services/geminiService";

export interface ThoughtProcessAccordionProps {
  steps: AgentThoughtStep[];
  durationMs?: number;
  isLoading?: boolean;
  isDefaultExpanded?: boolean;
}

export const ThoughtProcessAccordion = memo(function ThoughtProcessAccordion({
  steps,
  durationMs,
  isLoading,
  isDefaultExpanded
}: ThoughtProcessAccordionProps) {
  const [isExpanded, setIsExpanded] = useState<boolean>(isDefaultExpanded ?? (isLoading ?? false));

  useEffect(() => {
    if (isLoading) {
      setIsExpanded(true);
    }
  }, [isLoading]);

  if (!steps || steps.length === 0) return null;

  const seconds = ((durationMs || 0) / 1000).toFixed(1);
  const hasFailedStep = steps.some(s => s.status === 'failed');

  return (
    <div className="mb-2.5 rounded-xl border border-gray-200/80 bg-gray-50/70 overflow-hidden shadow-2xs text-left transition-all font-mono">
      {/* Header Bar */}
      <button
        type="button"
        onClick={() => setIsExpanded(prev => !prev)}
        aria-expanded={isExpanded}
        aria-label="Toggle agent thought and execution trace"
        className="w-full flex items-center justify-between px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100/70 transition-colors cursor-pointer select-none"
      >
        <div className="flex items-center space-x-2">
          {isLoading ? (
            <Sparkles className="w-3.5 h-3.5 text-[#80237E] animate-spin" />
          ) : hasFailedStep ? (
            <AlertCircle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
          ) : (
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          )}
          <span className="text-[11px] font-semibold text-gray-800 tracking-tight font-sans">
            {isLoading ? "Reasoning & execution trace" : `Thought for ${seconds}s`}
          </span>
          <span className="text-[10px] font-mono text-gray-500 px-1.5 py-0.2 bg-gray-200/70 rounded">
            {steps.length} {steps.length === 1 ? 'step' : 'steps'}
          </span>
        </div>

        <div className="flex items-center space-x-2 text-gray-400">
          {isLoading && (
            <span className="text-[10px] font-mono font-bold text-[#80237E] animate-pulse">
              {seconds}s
            </span>
          )}
          {isExpanded ? (
            <ChevronUp className="w-3.5 h-3.5 text-gray-400" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
          )}
        </div>
      </button>

      {/* Steps List */}
      {isExpanded && (
        <div className="px-3 pb-2.5 pt-1 space-y-1.5 border-t border-gray-200/60 bg-white/90">
          {steps.map((step, sIdx) => {
            return (
              <div key={step.id || sIdx} className="flex items-start space-x-2 text-left text-[11px] font-mono">
                {/* Status Indicator */}
                <div className="mt-0.5 shrink-0">
                  {step.status === 'complete' && (
                    <span className="text-emerald-600 font-bold text-[10px]">✓</span>
                  )}
                  {step.status === 'in_progress' && (
                    <div className="w-2.5 h-2.5 mt-0.5 rounded-full border-2 border-[#80237E] border-t-transparent animate-spin" />
                  )}
                  {step.status === 'pending' && (
                    <span className="text-gray-300 text-[10px]">○</span>
                  )}
                  {step.status === 'failed' && (
                    <span className="text-rose-600 font-bold text-[10px]">✕</span>
                  )}
                </div>

                {/* Step Details */}
                <div className="flex-1 min-w-0">
                  <p className={`leading-tight ${step.status === 'in_progress' ? 'text-[#80237E] font-semibold' : step.status === 'failed' ? 'text-rose-700 font-semibold' : 'text-gray-800'}`}>
                    {step.title}
                  </p>
                  {step.detail && (
                    <p className="text-[10px] text-gray-500 mt-0.5 leading-snug break-words">
                      {step.detail}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
});
