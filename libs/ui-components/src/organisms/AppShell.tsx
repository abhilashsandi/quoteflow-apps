import * as React from 'react';
import { cn } from '../lib/utils.js';

export interface AppShellProps {
  /** e.g. "QuoteFlow · Agent Portal" */
  brand: React.ReactNode;
  /** Right side of the header — nav links, a user menu, whatever the portal needs. */
  headerActions?: React.ReactNode;
  /** Typically a <StepIndicator>, rendered as a second header row when present. */
  progress?: React.ReactNode;
  /** Typically a <SidebarSteps> — when present, lays out sidebar + children side by side. */
  sidebar?: React.ReactNode;
  footer?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  /** Soft two-tone page background instead of a flat one — for the pre-quote / quote-flow pages. */
  gradient?: boolean;
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
  sidebar,
  footer,
  children,
  className,
  gradient,
}: AppShellProps) {
  return (
    <div
      className={cn(
        'flex min-h-screen flex-col text-foreground',
        gradient ? 'bg-app-gradient' : 'bg-background',
        className,
      )}
    >
      <header className="border-b border-border/60">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="text-lg font-semibold">{brand}</div>
          {headerActions}
        </div>
        {progress ? (
          <div className="mx-auto max-w-6xl px-6 pb-4">{progress}</div>
        ) : null}
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-6 py-8 sm:flex-row">
        {sidebar}
        <div className="min-w-0 flex-1">{children}</div>
      </main>

      {footer ? (
        <footer className="border-t border-border/60 px-6 py-4 text-sm text-muted-foreground">
          {footer}
        </footer>
      ) : null}
    </div>
  );
}
