import { Check } from 'lucide-react';
import { cn } from '../lib/utils.js';

export interface Step {
  key: string;
  label: string;
}

export interface StepIndicatorProps {
  steps: Step[];
  currentStepKey: string;
  className?: string;
}

/** The quote flow's funnel-stage progress bar (schema -> rc1 -> rc2 -> bind) in the app shell. */
export function StepIndicator({
  steps,
  currentStepKey,
  className,
}: StepIndicatorProps) {
  const currentIndex = steps.findIndex((step) => step.key === currentStepKey);

  return (
    <ol className={cn('flex items-center gap-2', className)}>
      {steps.map((step, index) => {
        const isComplete = currentIndex >= 0 && index < currentIndex;
        const isCurrent = index === currentIndex;
        return (
          <li key={step.key} className="flex items-center gap-2">
            <span
              className={cn(
                'flex size-6 items-center justify-center rounded-full border text-xs font-medium',
                isComplete &&
                  'bg-primary text-primary-foreground border-primary',
                isCurrent && !isComplete && 'border-primary text-primary',
                !isComplete &&
                  !isCurrent &&
                  'border-muted-foreground/30 text-muted-foreground',
              )}
              aria-current={isCurrent ? 'step' : undefined}
            >
              {isComplete ? <Check className="size-3.5" /> : index + 1}
            </span>
            <span
              className={cn(
                'text-sm',
                isCurrent
                  ? 'text-foreground font-medium'
                  : 'text-muted-foreground',
              )}
            >
              {step.label}
            </span>
            {index < steps.length - 1 ? (
              <span className="mx-1 h-px w-6 bg-border" />
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}
