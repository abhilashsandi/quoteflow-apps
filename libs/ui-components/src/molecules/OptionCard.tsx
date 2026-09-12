import { Check } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '../lib/utils.js';

export interface OptionCardProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  badge?: string;
  selected?: boolean;
  onSelect?: () => void;
  className?: string;
}

/** A big selectable card (icon + title + description, a checkbox in the corner) — for
 * "pick one of these options" choices, like a product/coverage picker. */
export function OptionCard({
  icon,
  title,
  description,
  badge,
  selected,
  onSelect,
  className,
}: OptionCardProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={cn(
        'relative flex flex-col items-center gap-2 rounded-2xl border-2 bg-card p-6 text-center transition-colors',
        selected
          ? 'border-primary shadow-sm'
          : 'border-border hover:border-primary/40',
        className,
      )}
    >
      {badge ? (
        <span className="absolute top-4 left-4 rounded-full bg-accent px-2 py-0.5 text-[10px] font-semibold tracking-wide text-accent-foreground uppercase">
          {badge}
        </span>
      ) : null}
      <span
        className={cn(
          'absolute top-4 right-4 flex size-5 items-center justify-center rounded-md border-2',
          selected
            ? 'border-primary bg-primary text-primary-foreground'
            : 'border-input',
        )}
      >
        {selected ? <Check className="size-3.5" /> : null}
      </span>
      {icon ? (
        <span className="text-primary [&_svg]:size-8">{icon}</span>
      ) : null}
      <span className="text-lg font-semibold">{title}</span>
      {description ? (
        <span className="text-sm text-muted-foreground">{description}</span>
      ) : null}
    </button>
  );
}
