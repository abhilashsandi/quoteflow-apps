import { QuoteClient } from './QuoteClient';

interface QuotePageProps {
  searchParams: Promise<{ resume?: string }>;
}

// Server Component wrapper: unwraps `searchParams` here (the framework already resolves it
// before this renders) and hands the client component a plain string prop instead of a
// Promise, so QuoteClient needs no Suspense boundary of its own.
export default async function QuotePage({ searchParams }: QuotePageProps) {
  const { resume } = await searchParams;
  return <QuoteClient resumeQuoteId={resume} />;
}
