import type { ReactNode } from 'react';
import './global.css';

export const metadata = {
  title: 'QuoteFlow — Agent Portal',
  description:
    'Quote and bind Acme Insurance auto policies on behalf of a customer.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
