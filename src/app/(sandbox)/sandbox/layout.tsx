import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Learn Relay sandbox',
  robots: { index: false },
};

export default function SandboxLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang='en'>
      <body>{children}</body>
    </html>
  );
}
