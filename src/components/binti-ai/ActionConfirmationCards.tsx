import React, { useState, memo } from "react";
import { Zap, CheckCircle2, RefreshCw, Check, ArrowRight } from "lucide-react";
import { AgentAction } from "../../services/geminiService";

export interface ActionConfirmationCardsProps {
  actions: AgentAction[];
  messageIndex: number;
  executedActionIds: Set<string>;
  onExecuteAction?: (action: AgentAction) => Promise<boolean | void> | boolean | void;
  onActionSuccess?: (actionId: string) => void;
}

export const ActionConfirmationCards = memo(function ActionConfirmationCards({
  actions,
  messageIndex,
  executedActionIds,
  onExecuteAction,
  onActionSuccess
}: ActionConfirmationCardsProps) {
  const [executingActionId, setExecutingActionId] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState<string>("");

  if (!actions || actions.length === 0) return null;

  const handleActionExecution = async (action: AgentAction, actionId: string) => {
    if (executingActionId || executedActionIds.has(actionId)) return;
    if (!onExecuteAction) return;

    setExecutingActionId(actionId);
    setAnnouncement(`Executing ${action.label}...`);

    try {
      await onExecuteAction(action);
      onActionSuccess?.(actionId);
      setAnnouncement(`Successfully executed ${action.label}.`);
    } catch (err: any) {
      console.error("Action execution failed:", err);
      setAnnouncement(`Execution failed for ${action.label}.`);
    } finally {
      setExecutingActionId(null);
    }
  };

  return (
    <div className="mt-2.5 space-y-2 animate-fade-in">
      {/* Screen Reader Live Region */}
      <div className="sr-only" aria-live="polite" role="status">
        {announcement}
      </div>

      {actions.map((act, actIdx) => {
        const actionId = act.id || `act-${messageIndex}-${actIdx}`;
        const isExecuted = executedActionIds.has(actionId);
        const isBusy = executingActionId === actionId;

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
                    type="button"
                    disabled={isBusy}
                    onClick={() => handleActionExecution(act, actionId)}
                    className="px-3.5 py-1.5 bg-[#80237E] hover:bg-[#6b1e6a] text-white font-bold rounded-xl text-[11px] transition-all shadow-xs flex items-center space-x-1.5 disabled:opacity-50 active:scale-95"
                  >
                    {isBusy ? (
                      <>
                        <RefreshCw className="w-3 h-3 animate-spin" />
                        <span>Executing...</span>
                      </>
                    ) : (
                      <>
                        <span>Approve & Execute</span>
                        <Check className="w-3 h-3" />
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          );
        }

        return (
          <button
            key={actIdx}
            type="button"
            disabled={isBusy}
            onClick={() => handleActionExecution(act, actionId)}
            aria-label={`Execute action: ${act.label}`}
            className="px-3 py-1.5 bg-gradient-to-r from-[#80237E]/10 to-[#6B46C1]/10 hover:from-[#80237E] hover:to-[#6B46C1] text-[#80237E] hover:text-white border border-[#80237E]/20 rounded-xl text-[11px] font-bold transition-all shadow-xs flex items-center space-x-1.5 group/btn active:scale-95 disabled:opacity-50"
          >
            {isBusy ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#80237E]" />
            ) : (
              <Zap className="w-3.5 h-3.5 text-[#D4AF37] group-hover/btn:text-white group-hover/btn:scale-110 transition-transform shrink-0" />
            )}
            <span>{act.label}</span>
            <ArrowRight className="w-3 h-3 text-purple-400 group-hover/btn:text-white group-hover/btn:translate-x-0.5 transition-transform shrink-0" />
          </button>
        );
      })}
    </div>
  );
});
