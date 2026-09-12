import * as React from 'react';
import { cn } from '../lib/utils.js';

export interface AppShellProps {
  /** e.g. "QuoteFlow · Agent Portal" */
  brand: React.ReactNode;
  /** Right side of the header — nav links, a user menu, whatever the portal needs. */
  headerActions?: React.ReactNode;
  /** Typically a <StepIndicator>, rendered as a second header row when present. */
  progress?: React.ReactNode;
  footer?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

/**
 * The one persistent shell (header, step progress, footer) both customer-portal and
 * agent-portal wrap every page in — see quoteflow-apps' README for the SSR/CSR boundary this
 * sits above.
 */
export function AppShell({
  brand,
  headerActions,
  progress,
  footer,
  children,
  className,
}: AppShellProps) {
  return (
    <div
      className={cn(
        'flex min-h-screen flex-col bg-background text-foreground',
        className,
      )}
    >
      <header className="border-b">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <div className="text-lg font-semibold">{brand}</div>
          {headerActions}
        </div>
        {progress ? (
          <div className="mx-auto max-w-5xl px-6 pb-4">{progress}</div>
        ) : null}
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-8">
        {children}
      </main>

      {footer ? (
        <footer className="border-t px-6 py-4 text-sm text-muted-foreground">
          {footer}
        </footer>
      ) : null}
    </div>
  );
}
