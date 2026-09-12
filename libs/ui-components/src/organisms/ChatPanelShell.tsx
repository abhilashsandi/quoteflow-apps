import * as React from 'react';
import { cn } from '../lib/utils.js';

export interface ChatPanelShellProps {
  title: React.ReactNode;
  onClose?: () => void;
  /** The rendered message thread — libs/ai-assistant owns what goes here. */
  children: React.ReactNode;
  /** The input row (text field + send button) — also owned by libs/ai-assistant. */
  inputRow: React.ReactNode;
  className?: string;
}

/**
 * Presentational shell only — no chat state, no SSE, no network calls. libs/ai-assistant's
 * useChatStream() hook and message components fill the slots; this just lays them out
 * (header, scrollable thread, pinned input row) consistently with the rest of the design
 * system.
 */
export function ChatPanelShell({
  title,
  onClose,
  children,
  inputRow,
  className,
}: ChatPanelShellProps) {
  return (
    <div
      className={cn(
        'flex h-full flex-col rounded-lg border bg-card text-card-foreground shadow-sm',
        className,
      )}
    >
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div className="text-sm font-semibold">{title}</div>
        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close assistant"
            className="text-muted-foreground hover:text-foreground text-sm"
          >
            ✕
          </button>
        ) : null}
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
        {children}
      </div>

      <div className="border-t p-3">{inputRow}</div>
    </div>
  );
}
