import { Car } from 'lucide-react';
import Link from 'next/link';
import { AppShell, Button, OptionCard } from 'ui-components';

// Server-rendered for fast first paint — no quoteId exists yet, so there's nothing here that
// needs client-side session state. See the README for the SSR/CSR boundary this app follows.
export default function HomePage() {
  return (
    <AppShell
      brand="QuoteFlow for Agents"
      gradient
      footer="© Acme Insurance — a fictional carrier, portfolio sample only"
    >
      <div className="mx-auto flex max-w-md flex-col items-center gap-8 py-8 text-center">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold">
            Start a quote for your customer
          </h1>
          <p className="text-muted-foreground text-sm">
            Run an Acme Insurance auto quote on your customer's behalf — the
            same rating engine, tuned for how agents work.
          </p>
        </div>

        <OptionCard
          icon={<Car />}
          title="Auto"
          description="Quote a customer's vehicle(s)."
          selected
          className="w-full"
        />

        <Button size="lg" asChild>
          <Link href="/quote">Start quote</Link>
        </Button>
      </div>
    </AppShell>
  );
}
