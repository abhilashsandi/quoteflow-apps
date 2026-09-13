'use client';

import { ConfigDrivenPage, useCarrierRouteConfig } from 'form-renderer';
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

// Client-rendered: once a quoteId exists, this page depends on client-only session state
// (sessionStorage) and the dynamically-fetched config/validator bundles — see the README's
// SSR/CSR boundary.
//
// The only difference from customer-portal's /quote page: it resolves its page config via
// useCarrierRouteConfig with portal: 'agent' instead of reading the customer/no-state baseline
// off session.schema. That one prop is what applies quoteflow-rating-service's agent override
// (e.g. hiding the phone field) — there is no agent-specific page code here.
export default function QuotePage() {
  const session = useQuoteSession({ bffGatewayBaseUrl: BFF_GATEWAY_URL });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [actionPending, setActionPending] = useState(false);
  const [bindPoll, setBindPoll] = useState<BindPollState | null>(null);

  const routeConfig = useCarrierRouteConfig({
    ratingServiceBaseUrl: RATING_SERVICE_URL,
    bundle: session.bundle,
    portal: 'agent',
  });

  useEffect(() => {
    if (session.status === 'idle') void session.startQuote(CARRIER_CODE);
  }, [session.status]);

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
    routeConfig.config?.pages.find(
      (page) => page.key === session.currentPageKey,
    ) ??
    routeConfig.config?.pages[0] ??
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

  if (
    session.status === 'idle' ||
    session.status === 'loading' ||
    routeConfig.status === 'idle' ||
    routeConfig.status === 'loading'
  ) {
    return (
      <AppShell brand="QuoteFlow for Agents" gradient>
        <p className="text-muted-foreground">Setting up the quote…</p>
      </AppShell>
    );
  }

  if (session.status === 'error' || routeConfig.status === 'error') {
    return (
      <AppShell brand="QuoteFlow for Agents" gradient>
        <p className="text-destructive">
          Something went wrong: {session.error ?? routeConfig.error}
        </p>
      </AppShell>
    );
  }

  const currentStepKey = session.funnelStage ?? 'schema';
  const completedStepKeys = FUNNEL_ORDER.slice(
    0,
    FUNNEL_ORDER.indexOf(currentStepKey as (typeof FUNNEL_ORDER)[number]),
  );

  return (
    <AppShell
      brand="QuoteFlow for Agents"
      gradient
      sidebar={
        <SidebarSteps
          groups={SIDEBAR_STEP_GROUPS}
          currentStepKey={currentStepKey}
          completedStepKeys={completedStepKeys}
        />
      }
    >
      <div className="grid gap-8 lg:grid-cols-[2fr_1fr]">
        <div>
          {session.funnelStage === 'bind' ? (
            <Card>
              <CardHeader>
                <CardTitle>Finalizing the policy…</CardTitle>
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
          ) : currentPage ? (
            <Card className="p-6">
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
            <CardTitle>Quote summary</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {session.rate ? (
              <p className="text-2xl font-semibold">
                ${session.rate.premium.toFixed(2)} / mo
              </p>
            ) : (
              <p className="text-muted-foreground text-sm">
                Fill in the customer's info to see a price.
              </p>
            )}
            {session.funnelStage !== 'bind' ? (
              <Button
                onClick={() => void handleContinue()}
                disabled={actionPending}
              >
                {session.funnelStage === 'rc2' ? 'Bind policy' : 'Continue'}
              </Button>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
