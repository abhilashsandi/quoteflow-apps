import { cn } from '../lib/utils.js';

export interface SidebarStep {
  key: string;
  label: string;
}

export interface SidebarStepGroup {
  heading: string;
  steps: SidebarStep[];
}

export interface SidebarStepsProps {
  groups: SidebarStepGroup[];
  currentStepKey: string;
  completedStepKeys?: string[];
  /** When set, completed steps (and the current one) render as buttons — clicking one lets
   * the caller show that step's content again (e.g. to review or edit it) without changing
   * where the flow actually is. Steps not yet reached stay inert either way. */
  onStepClick?: (stepKey: string) => void;
  className?: string;
}

/**
 * A grouped, vertical step nav (section heading + steps, current one highlighted with a
 * colored left border) — the sidebar-driven equivalent of StepIndicator's horizontal bar, for
 * flows with enough steps that grouping them under section headings actually helps.
 */
export function SidebarSteps({
  groups,
  currentStepKey,
  completedStepKeys = [],
  onStepClick,
  className,
}: SidebarStepsProps) {
  return (
    <nav className={cn('flex w-full flex-col gap-6 sm:w-56', className)}>
      {groups.map((group) => (
        <div key={group.heading} className="flex flex-col gap-1">
          <p className="px-3 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            {group.heading}
          </p>
          <ul className="flex flex-col gap-0.5">
            {group.steps.map((step) => {
              const isCurrent = step.key === currentStepKey;
              const isDone = completedStepKeys.includes(step.key);
              const clickable = Boolean(onStepClick) && (isCurrent || isDone);
              const stepClassName = cn(
                'w-full rounded-r-lg border-l-2 px-4 py-2 text-left text-sm',
                isCurrent &&
                  'border-primary bg-accent font-semibold text-foreground',
                !isCurrent && isDone && 'border-transparent text-foreground',
                !isCurrent &&
                  !isDone &&
                  'border-transparent text-muted-foreground',
                clickable && 'cursor-pointer hover:bg-accent/60',
              );
              return (
                <li key={step.key}>
                  {clickable ? (
                    <button
                      type="button"
                      aria-current={isCurrent ? 'step' : undefined}
                      className={stepClassName}
                      onClick={() => onStepClick?.(step.key)}
                    >
                      {step.label}
                    </button>
                  ) : (
                    <div
                      aria-current={isCurrent ? 'step' : undefined}
                      className={stepClassName}
                    >
                      {step.label}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}
