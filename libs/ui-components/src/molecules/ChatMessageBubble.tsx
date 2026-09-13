import type { ReactNode } from 'react';
import { cn } from '../lib/utils.js';

export interface ChatMessageBubbleProps {
  role: 'user' | 'model';
  text: string;
  /** Coverage docs the assistant drew from for this reply (RAG citations) — model role only. */
  citations?: { id: string; title: string }[];
  /** A FeedbackButtons instance, or any other per-message control — model role only. */
  feedback?: ReactNode;
  className?: string;
}

/** One message in the assistant thread — user messages right-aligned and tinted, model
 * messages left-aligned with optional citations and a feedback slot underneath. */
export function ChatMessageBubble({
  role,
  text,
  citations,
  feedback,
  className,
}: ChatMessageBubbleProps) {
  const isUser = role === 'user';
  return (
    <div
      className={cn(
        'flex flex-col gap-1',
        isUser ? 'items-end' : 'items-start',
        className,
      )}
    >
      <div
        className={cn(
          'max-w-[85%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap',
          isUser
            ? 'bg-primary text-primary-foreground'
            : 'bg-muted text-foreground',
        )}
      >
        {text || (isUser ? '' : '…')}
      </div>
      {!isUser && citations && citations.length > 0 ? (
        <div className="text-muted-foreground flex flex-wrap gap-1 px-1 text-xs">
          {citations.map((doc) => (
            <span key={doc.id} className="rounded-full border px-2 py-0.5">
              {doc.title}
            </span>
          ))}
        </div>
      ) : null}
      {!isUser && feedback ? <div className="px-1">{feedback}</div> : null}
    </div>
  );
}
