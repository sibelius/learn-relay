import type { Metadata, Viewport } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

const siteUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : 'http://localhost:3100';

const description =
  'Learn Relay by solving hands-on exercises right in your browser: useLazyLoadQuery, fragments, pagination, mutations, subscriptions, testing and more. Powered by the real Relay compiler compiled to WebAssembly.';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'Learn Relay · interactive Relay workshop in your browser',
    template: '%s | Learn Relay',
  },
  description,
  keywords: ['Relay', 'GraphQL', 'React', 'workshop', 'useFragment', 'usePaginationFragment', 'tutorial'],
  authors: [{ name: 'Sibelius Seraphini', url: 'https://github.com/sibelius' }],
  openGraph: {
    title: 'Learn Relay',
    description,
    type: 'website',
    siteName: 'Learn Relay',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Learn Relay',
    description,
    creator: '@sseraphini',
  },
};

export const viewport: Viewport = {
  themeColor: '#0b0d12',
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang='en' className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className='min-h-full'>{children}</body>
    </html>
  );
}
