
import './globals.css'
import Script from 'next/script';
import { headers } from 'next/headers';
import DarkModeProvider from '@/components/theme/DarkModeProvider';
import PWAProvider from '@/components/pwa/PWAProvider';

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://launchpard.com';

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'EducationalOrganization',
  name: 'LaunchPard',
  url: BASE_URL,
  logo: `${BASE_URL}/logo.svg`,
  description: 'AI-powered adaptive learning platform for children aged 5–17. Covers UK (KS1–KS4) and Nigerian (Primary, JSS, SSS) curricula with personalised quests and real-time AI feedback.',
  sameAs: [],
  offers: [
    {
      '@type': 'Offer',
      name: 'Free Plan',
      price: '0',
      priceCurrency: 'GBP',
      description: '10 questions per day, AI tutor access, progress tracking',
    },
    {
      '@type': 'Offer',
      name: 'Scholar Plan',
      price: '9.99',
      priceCurrency: 'GBP',
      billingPeriod: 'P1M',
      description: 'Unlimited questions, exam mode, full AI tutor access',
    },
  ],
};



export const metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: 'LaunchPard — AI-Powered Learning for Every Scholar',
    template: '%s | LaunchPard',
  },
  description: 'AI-powered adaptive learning for children aged 5–17. Covers UK (KS1–KS4), Nigerian (Primary, JSS, SSS) and 10 other curricula. Personalised quests, real-time Tara AI feedback, and exam readiness tracking. Start free today.',
  keywords: [
    'AI learning platform', 'adaptive learning', 'KS2 maths', 'GCSE revision', '11 plus preparation',
    'WAEC revision', 'NECO preparation', 'Nigerian curriculum', 'online tutoring', 'educational games',
    'children learning app', 'primary school revision', 'secondary school revision',
  ],
  authors: [{ name: 'LaunchPard', url: BASE_URL }],
  creator: 'LaunchPard',
  publisher: 'LaunchPard',
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large' },
  },
  alternates: {
    canonical: BASE_URL,
  },
  openGraph: {
    type: 'website',
    locale: 'en_GB',
    url: BASE_URL,
    siteName: 'LaunchPard',
    title: 'LaunchPard — AI-Powered Learning for Every Scholar',
    description: 'Adaptive AI learning platform for ages 5–17. UK, Nigeria and 10+ curricula. Personalised quests, instant feedback, exam readiness. Start free.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'LaunchPard — AI-Powered Learning Platform',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'LaunchPard — AI-Powered Learning for Every Scholar',
    description: 'Adaptive AI learning for ages 5–17. UK, Nigeria and 10+ curricula. Start free.',
    images: ['/og-image.png'],
    creator: '@launchpard',
  },
  icons: {
    icon: '/favicon.svg',
    apple: '/logo192.png',
    shortcut: '/favicon.ico',
  },
  manifest: '/manifest.json',
}

export default async function RootLayout({ children }) {
  // Per-request CSP nonce injected by proxy.ts. Attaching it here lets Next.js
  // propagate the same nonce to its framework <script> tags automatically, and
  // satisfies the nonce-based CSP for our own inline scripts. Falls back to
  // undefined during static rendering, where no inline scripts execute.
  const nonce = (await headers()).get('x-nonce') || undefined;

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet" />
        <link href="https://fonts.googleapis.com/css2?family=Fredoka:wght@400;500;600;700&family=Nunito:wght@600;700;800&family=DM+Sans:wght@400;500;700&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Inter:wght@400;500;600&display=swap" rel="stylesheet" />
        <link rel="manifest" href="/manifest.json" />
        <script
          type="application/ld+json"
          nonce={nonce}
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <meta name="theme-color" content="#6366f1" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
      </head>
      <body>
        {/* Dark mode detection — must run before React hydrates to avoid FOUC.
            strategy="beforeInteractive" injects a blocking script in <head> via Next.js,
            which is the correct pattern for Next.js 16 + React 19. */}
        <Script
          id="dark-mode-init"
          strategy="beforeInteractive"
          nonce={nonce}
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var d=localStorage.getItem('lp-dark-mode');if(d==='true'||(d===null&&window.matchMedia('(prefers-color-scheme:dark)').matches)){document.documentElement.classList.add('dark')}}catch(e){}})();`,
          }}
        />
        <Script src="https://www.googletagmanager.com/gtag/js?id=G-ZFZN7XZ36Y" strategy="afterInteractive" nonce={nonce} />
        <Script id="gtag-init" strategy="afterInteractive" nonce={nonce}>
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-ZFZN7XZ36Y');
          `}
        </Script>
        <DarkModeProvider>
          <PWAProvider>
            {children}
          </PWAProvider>
        </DarkModeProvider>
      </body>
    </html>
  )
}