import { ThumbsDown, ThumbsUp } from 'lucide-react';
import { cn } from '../lib/utils.js';

export type Feedback = 'up' | 'down' | null;

export interface FeedbackButtonsProps {
  value: Feedback;
  onChange: (value: Feedback) => void;
  className?: string;
}

/** Thumbs-up/down on an AI assistant message. Toggling the active choice clears it. */
export function FeedbackButtons({
  value,
  onChange,
  className,
}: FeedbackButtonsProps) {
  return (
    <div className={cn('flex items-center gap-1', className)}>
      <button
        type="button"
        aria-label="Good response"
        aria-pressed={value === 'up'}
        onClick={() => onChange(value === 'up' ? null : 'up')}
        className={cn(
          'rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-accent-foreground',
          value === 'up' && 'text-primary bg-accent',
        )}
      >
        <ThumbsUp className="size-3.5" />
      </button>
      <button
        type="button"
        aria-label="Bad response"
        aria-pressed={value === 'down'}
        onClick={() => onChange(value === 'down' ? null : 'down')}
        className={cn(
          'rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-accent-foreground',
          value === 'down' && 'text-destructive bg-accent',
        )}
      >
        <ThumbsDown className="size-3.5" />
      </button>
    </div>
  );
}
