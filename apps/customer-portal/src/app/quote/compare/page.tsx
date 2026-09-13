import {
  createRatingServiceClient,
  type QuoteSchemaResponse,
} from 'api-client';
import Link from 'next/link';
import {
  AppShell,
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from 'ui-components';
import { BFF_GATEWAY_URL } from '../../../lib/config';

interface QuoteComparePageProps {
  searchParams: Promise<{ acme?: string; vantage?: string }>;
}

interface CarrierQuote {
  quoteId: string;
  schema: QuoteSchemaResponse;
}

async function loadQuote(
  quoteId: string | undefined,
): Promise<CarrierQuote | null> {
  if (!quoteId) return null;
  const client = createRatingServiceClient(BFF_GATEWAY_URL);
  const result = await client.getQuoteSchema(quoteId);
  return result.success ? { quoteId, schema: result.data } : null;
}

/**
 * Server-rendered compare page: fetches both carriers' quotes (created by GaQ's Server
 * Action) in parallel and shows their already-computed rc1 price — no client fetch, no
 * loading state. Choosing a carrier is a plain link into the existing PaP flow at
 * `/quote?resume=<quoteId>`, which is untouched by this feature.
 */
export default async function QuoteComparePage({
  searchParams,
}: QuoteComparePageProps) {
  const { acme, vantage } = await searchParams;
  const [acmeQuote, vantageQuote] = await Promise.all([
    loadQuote(acme),
    loadQuote(vantage),
  ]);
  const quotes = [acmeQuote, vantageQuote].filter(
    (q): q is CarrierQuote => q !== null,
  );

  if (quotes.length === 0) {
    return (
      <AppShell brand="QuoteFlow" gradient>
        <div className="mx-auto flex max-w-md flex-col items-center gap-4 py-8 text-center">
          <p className="text-muted-foreground">
            We couldn&apos;t find that quote. Let&apos;s start over.
          </p>
          <Button asChild>
            <Link href="/quote/start">Get a quote</Link>
          </Button>
        </div>
      </AppShell>
    );
  }

  const cheapest = quotes.reduce((min, q) =>
    (q.schema.rate?.premium ?? Infinity) <
    (min.schema.rate?.premium ?? Infinity)
      ? q
      : min,
  );

  return (
    <AppShell
      brand="QuoteFlow"
      gradient
      footer="© Acme Insurance & Vantage Direct — fictional carriers, portfolio sample only"
    >
      <div className="mx-auto flex max-w-3xl flex-col gap-6">
        <div className="flex flex-col gap-2 text-center">
          <h1 className="text-2xl font-semibold">Compare your quotes</h1>
          <p className="text-muted-foreground text-sm">
            Choose a carrier to continue to purchase.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          {quotes.map((q) => (
            <Card key={q.quoteId} className="flex flex-col p-6">
              <CardHeader className="p-0 pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle>{q.schema.carrier.name}</CardTitle>
                  {q.quoteId === cheapest.quoteId && quotes.length > 1 ? (
                    <Badge>Best price</Badge>
                  ) : null}
                </div>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col gap-4 p-0">
                {q.schema.rate ? (
                  <p className="text-3xl font-semibold">
                    ${q.schema.rate.premium.toFixed(2)}
                    <span className="text-muted-foreground text-sm font-normal">
                      {' '}
                      / mo
                    </span>
                  </p>
                ) : (
                  <p className="text-muted-foreground text-sm">
                    Price unavailable.
                  </p>
                )}
                <Button asChild className="mt-auto">
                  <Link href={`/quote?resume=${q.quoteId}`}>
                    Choose {q.schema.carrier.name}
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
