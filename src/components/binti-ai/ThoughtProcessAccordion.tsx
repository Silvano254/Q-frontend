import React, { useState, useEffect, memo } from "react";
import { Sparkles, Check, ChevronDown, ChevronRight, AlertCircle } from "lucide-react";
import { ProcessingStep } from "../../services/geminiService";

export interface ThoughtProcessAccordionProps {
  steps: ProcessingStep[];
  durationMs?: number;
  isLoading?: boolean;
  isDefaultExpanded?: boolean;
}

export const ThoughtProcessAccordion = memo(function ThoughtProcessAccordion({
  steps,
  durationMs,
  isLoading,
  isDefaultExpanded = false
}: ThoughtProcessAccordionProps) {
  const [isExpanded, setIsExpanded] = useState<boolean>(isDefaultExpanded);
  const [activeStepIndex, setActiveStepIndex] = useState<number>(0);

  // Cycle / track the latest in-progress or newest step during loading
  useEffect(() => {
    if (isLoading && steps.length > 0) {
      let activeIdx = steps.length - 1;
      for (let i = steps.length - 1; i >= 0; i--) {
        if (steps[i].status === 'in_progress') {
          activeIdx = i;
          break;
        }
      }
      setActiveStepIndex(activeIdx);
    }
  }, [isLoading, steps]);

  if (!steps || steps.length === 0) return null;

  const seconds = ((durationMs || 0) / 1000).toFixed(1);
  const hasFailedStep = steps.some(s => s.status === 'failed');
  const currentStep = steps[activeStepIndex] || steps[steps.length - 1];

  // LIVE LOADING STATE: Transient Appearing & Disappearing Faded Grey Indicator
  if (isLoading) {
    return (
      <div 
        role="status"
        aria-live="polite"
        className="py-1 px-1 flex items-center space-x-2 text-[11px] font-mono text-gray-400 select-none animate-pulse transition-all duration-700 ease-in-out"
      >
        <Sparkles className="w-3 h-3 text-gray-400 animate-spin shrink-0 opacity-70" />
        
        {/* Dynamic Appearing/Disappearing Step Title */}
        <div className="flex-1 min-w-0 overflow-hidden">
          <span 
            key={currentStep?.id || activeStepIndex}
            className="inline-block truncate text-gray-400 font-medium tracking-tight animate-fade-in"
          >
            {currentStep?.title || "Thinking..."}
            {currentStep?.detail && (
              <span className="text-gray-400/70 font-normal ml-1.5 hidden sm:inline">
                ({currentStep.detail})
              </span>
            )}
          </span>
        </div>

        <span className="text-[10px] font-mono text-gray-400 shrink-0 opacity-60">
          {seconds}s
        </span>
      </div>
    );
  }

  // COMPLETED STATE: Minimal Faded Grey Trace with Expandable Details
  return (
    <div className="mb-2 text-left font-mono select-none">
      <button
        type="button"
        onClick={() => setIsExpanded(prev => !prev)}
        aria-expanded={isExpanded}
        aria-label="Toggle completed reasoning steps"
        className="inline-flex items-center space-x-1.5 py-0.5 px-1.5 -ml-1 text-[11px] text-gray-400 hover:text-gray-600 rounded hover:bg-gray-100/60 transition-colors cursor-pointer"
      >
        {isExpanded ? (
          <ChevronDown className="w-3 h-3 text-gray-400 shrink-0" />
        ) : (
          <ChevronRight className="w-3 h-3 text-gray-400 shrink-0" />
        )}
        
        <span className="text-gray-400 font-normal">
          {hasFailedStep ? "Completed with notices" : `Thought for ${seconds}s`}
        </span>
        
        <span className="text-[10px] text-gray-400/80">
          ({steps.length} {steps.length === 1 ? 'step' : 'steps'})
        </span>
      </button>

      {/* Expanded Faded Grey Detail Timeline */}
      {isExpanded && (
        <div className="mt-1 ml-1 pl-2.5 border-l border-gray-200/60 space-y-1 py-1 animate-fade-in">
          {steps.map((step, sIdx) => (
            <div key={step.id || sIdx} className="flex items-start space-x-2 text-[11px] font-mono text-gray-400">
              <span className="mt-0.5 text-[9px] text-gray-400 shrink-0">
                {step.status === 'complete' ? '✓' : step.status === 'failed' ? '✕' : '•'}
              </span>
              <div className="flex-1 min-w-0">
                <span className={`text-gray-500 font-medium ${step.status === 'failed' ? 'text-rose-500' : ''}`}>
                  {step.title}
                </span>
                {step.detail && (
                  <p className="text-[10px] text-gray-400 leading-snug mt-0.5">
                    {step.detail}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
});
