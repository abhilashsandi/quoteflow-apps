import type { ReactNode } from 'react';
import './global.css';

export const metadata = {
  title: 'QuoteFlow — Auto Insurance',
  description: 'Get an auto insurance quote from Acme Insurance in minutes.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
