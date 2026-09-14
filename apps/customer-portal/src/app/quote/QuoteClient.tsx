'use client';

import { ConfigDrivenPage } from 'form-renderer';
import { useCallback, useEffect, useState } from 'react';
import { useQuoteSession } from 'state';
import {
  AppShell,
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  SidebarSteps,
} from 'ui-components';
import { AssistantChatWidget } from '../../components/AssistantChatWidget';
import {
  BFF_GATEWAY_URL,
  CARRIER_CODE,
  FUNNEL_ORDER,
  RATING_SERVICE_URL,
  SIDEBAR_STEP_GROUPS,
} from '../../lib/config';

interface BindPollState {
  status: string;
  attemptCount: number;
  lastError: string | null;
}

export interface QuoteClientProps {
  /** Set when arriving from the GaQ compare page (`/quote/compare`) — resumes that carrier's
   * already-rated quote instead of starting a fresh Acme one. See useQuoteSession's
   * resumeQuoteId hydration path, which also writes the resumed quote to sessionStorage.
   * Passed down as a plain prop (already unwrapped from `searchParams` by the Server Component
   * page.tsx) rather than read here via `use()`, so this component needs no Suspense boundary. */
  resumeQuoteId?: string;
}

// Client-rendered: once a quoteId exists, this page depends on client-only session state
// (sessionStorage) and the dynamically-fetched config/validator bundles — see the README's
// SSR/CSR boundary.
export function QuoteClient({ resumeQuoteId }: QuoteClientProps) {
  const session = useQuoteSession({
    bffGatewayBaseUrl: BFF_GATEWAY_URL,
    resumeQuoteId,
  });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [actionPending, setActionPending] = useState(false);
  const [bindPoll, setBindPoll] = useState<BindPollState | null>(null);
  /** Set by clicking a completed sidebar step — lets the user look at (and edit) an earlier
   * step without actually moving the quote backwards. Cleared whenever the real funnelStage
   * changes, so a genuine advance always snaps the view back to the live step. */
  const [viewStepKey, setViewStepKey] = useState<string | null>(null);

  useEffect(() => {
    if (!resumeQuoteId && session.status === 'idle') {
      void session.startQuote(CARRIER_CODE);
    }
  }, [resumeQuoteId, session.status]);

  useEffect(() => {
    setViewStepKey(null);
  }, [session.funnelStage]);

  useEffect(() => {
    if (session.funnelStage !== 'bind') return;
    let cancelled = false;

    const poll = async (): Promise<void> => {
      const status = await session.getBindStatus();
      if (cancelled || !status) return;
      setBindPoll(status);
      if (status.status === 'pending' || status.status === 'running') {
        setTimeout(() => void poll(), 1500);
      }
    };
    void poll();

    return () => {
      cancelled = true;
    };
  }, [session.funnelStage]);

  const currentPage =
    session.schema?.pages.find((page) => page.key === session.currentPageKey) ??
    session.schema?.pages[0] ??
    null;
  const pageValues =
    (currentPage ? session.answers[currentPage.key] : undefined) ?? {};

  const handleContinue = useCallback(async () => {
    if (!currentPage) return;
    setActionPending(true);
    setFieldErrors({});
    try {
      if (session.funnelStage === 'schema') {
        const result = await session.submitPage(currentPage.key);
        if (!result.success && result.error) {
          const details = result.error.details as
            { fieldKey?: string; message?: string } | undefined;
          if (details?.fieldKey) {
            setFieldErrors({
              [details.fieldKey]: details.message ?? result.error.code,
            });
          }
        }
      } else if (session.funnelStage === 'rc1') {
        await session.pullReport();
      } else if (session.funnelStage === 'rc2') {
        await session.requestBind();
      }
    } finally {
      setActionPending(false);
    }
  }, [currentPage, session.funnelStage]);

  /** Re-patches the current page's answers without advancing the funnel — applyAnswerPatch on
   * quoteflow-rating-service's side already re-rates and stays at whatever stage the quote is
   * really at, so this is safe to call from a step the user is only reviewing, not just the
   * live one. Only snaps the view back to the live step on success, so a validation error
   * leaves the form open to fix.
   *
   * If the quote had already reached rc2, that patch's own rate is missing the MVR violation
   * surcharge — applyAnswerPatch only ever rates off the answers, not the report pulled
   * earlier — so this re-pulls the report too, to keep the displayed price consistent with the
   * violations still shown on the Driving Record step. */
  const handleUpdateAnswers = useCallback(async () => {
    if (!currentPage) return;
    setActionPending(true);
    setFieldErrors({});
    try {
      const result = await session.submitPage(currentPage.key);
      if (!result.success && result.error) {
        const details = result.error.details as
          { fieldKey?: string; message?: string } | undefined;
        if (details?.fieldKey) {
          setFieldErrors({
            [details.fieldKey]: details.message ?? result.error.code,
          });
        }
      } else {
        if (session.funnelStage === 'rc2') await session.pullReport();
        setViewStepKey(null);
      }
    } finally {
      setActionPending(false);
    }
  }, [currentPage, session.funnelStage]);

  if (session.status === 'idle' || session.status === 'loading') {
    return (
      <AppShell brand="QuoteFlow" gradient>
        <p className="text-muted-foreground">Setting up your quote…</p>
      </AppShell>
    );
  }

  if (session.status === 'error') {
    return (
      <AppShell brand="QuoteFlow" gradient>
        <p className="text-destructive">
          Something went wrong: {session.error}
        </p>
      </AppShell>
    );
  }

  const currentStepKey = session.funnelStage ?? 'schema';
  const completedStepKeys = FUNNEL_ORDER.slice(
    0,
    FUNNEL_ORDER.indexOf(currentStepKey as (typeof FUNNEL_ORDER)[number]),
  );
  // Which step's content to show — normally the live one, but a completed step stays visible
  // (and editable, for schema/rc1) after clicking it in the sidebar, until the user saves or
  // backs out. session.report is unaffected by which step is being viewed since it's stored
  // once pulled, not derived from the current stage.
  const displayedStepKey = viewStepKey ?? currentStepKey;
  const isViewingPastStep =
    viewStepKey !== null && viewStepKey !== currentStepKey;
  const isEditableStep =
    displayedStepKey === 'schema' || displayedStepKey === 'rc1';

  return (
    <AppShell
      brand="QuoteFlow"
      gradient
      sidebar={
        <SidebarSteps
          groups={SIDEBAR_STEP_GROUPS}
          currentStepKey={currentStepKey}
          completedStepKeys={completedStepKeys}
          // Locked once bind has started — a quote that's already being bound shouldn't be
          // editable, even to just look back at an earlier step.
          onStepClick={
            session.funnelStage === 'bind' ? undefined : setViewStepKey
          }
        />
      }
    >
      <div className="grid gap-8 lg:grid-cols-[2fr_1fr]">
        <div>
          {displayedStepKey === 'bind' ? (
            <Card>
              <CardHeader>
                <CardTitle>Finalizing your policy…</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-2">
                <p>
                  Status:{' '}
                  <Badge
                    variant={
                      bindPoll?.status === 'succeeded'
                        ? 'default'
                        : bindPoll?.status === 'failed' ||
                            bindPoll?.status === 'dead_lettered'
                          ? 'destructive'
                          : 'secondary'
                    }
                  >
                    {bindPoll?.status ?? 'pending'}
                  </Badge>
                </p>
                {bindPoll?.lastError ? (
                  <p className="text-destructive text-sm">
                    {bindPoll.lastError}
                  </p>
                ) : null}
              </CardContent>
            </Card>
          ) : displayedStepKey === 'rc2' ? (
            <Card>
              <CardHeader>
                <CardTitle>Driving record</CardTitle>
              </CardHeader>
              <CardContent>
                {session.report ? (
                  session.report.violations.length > 0 ? (
                    <ul className="list-disc space-y-1 pl-5 text-sm">
                      {session.report.violations.map((violation) => (
                        <li key={violation}>{violation.replace(/_/g, ' ')}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm">
                      No violations found — clean driving record.
                    </p>
                  )
                ) : (
                  <p className="text-muted-foreground text-sm">
                    Pulling your driving record…
                  </p>
                )}
              </CardContent>
            </Card>
          ) : currentPage ? (
            <Card className="p-6">
              {isViewingPastStep ? (
                <p className="text-muted-foreground mb-4 text-sm">
                  Reviewing what you submitted — make changes and click
                  &ldquo;Update quote&rdquo;, or go back without changes.
                </p>
              ) : null}
              <ConfigDrivenPage
                config={currentPage}
                values={pageValues as Record<string, string>}
                errors={fieldErrors}
                onFieldChange={(fieldKey, value) =>
                  session.setFieldValue(currentPage.key, fieldKey, value)
                }
                ratingServiceBaseUrl={RATING_SERVICE_URL}
              />
            </Card>
          ) : null}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>
              {session.carrier
                ? `Your ${session.carrier.name} quote`
                : 'Your quote'}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {session.rate ? (
              <p className="text-2xl font-semibold">
                ${session.rate.premium.toFixed(2)} / mo
              </p>
            ) : (
              <p className="text-muted-foreground text-sm">
                Fill in your info to see a price.
              </p>
            )}
            {isViewingPastStep ? (
              <div className="flex flex-col gap-2">
                {isEditableStep ? (
                  <Button
                    onClick={() => void handleUpdateAnswers()}
                    disabled={actionPending}
                  >
                    Update quote
                  </Button>
                ) : null}
                <Button
                  variant="outline"
                  onClick={() => setViewStepKey(null)}
                  disabled={actionPending}
                >
                  Back to current step
                </Button>
              </div>
            ) : session.funnelStage !== 'bind' ? (
              <Button
                onClick={() => void handleContinue()}
                disabled={actionPending}
              >
                {session.funnelStage === 'rc2' ? 'Purchase policy' : 'Continue'}
              </Button>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <AssistantChatWidget quoteId={session.quoteId ?? undefined} />
    </AppShell>
  );
}
