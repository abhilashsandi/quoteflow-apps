import Link from 'next/link';
import {
  AppShell,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from 'ui-components';

// Server-rendered for fast first paint — no quoteId exists yet, so there's nothing here that
// needs client-side session state. See the README for the SSR/CSR boundary this app follows.
export default function HomePage() {
  return (
    <AppShell
      brand="QuoteFlow"
      footer="© Acme Insurance — a fictional carrier, portfolio sample only"
    >
      <Card className="mx-auto max-w-md">
        <CardHeader>
          <CardTitle>Auto Insurance</CardTitle>
          <CardDescription>
            Get a personalized quote from Acme Insurance in a few minutes.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild>
            <Link href="/quote">Get a quote</Link>
          </Button>
        </CardContent>
      </Card>
    </AppShell>
  );
}
