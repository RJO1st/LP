
import './globals.css'
import Script from 'next/script';
import DarkModeProvider from '@/components/theme/DarkModeProvider';
import PWAProvider from '@/components/pwa/PWAProvider';



export const metadata = {
  title: 'LaunchPard — One Platform, Every Scholar',
  description: 'The AI-powered learning engine that adapts to your child. Personalized learning journeys, real-time feedback, and engaging quests. Empower your child to reach their full potential with LaunchPard.',
  icons: {
    icon: '/favicon.svg',
    apple: '/logo192.png',

  },
}

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet" />
        <link href="https://fonts.googleapis.com/css2?family=Fredoka:wght@400;500;600;700&family=Nunito:wght@600;700;800&family=DM+Sans:wght@400;500;700&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Inter:wght@400;500;600&display=swap" rel="stylesheet" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#6366f1" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
      </head>
      <body>
        {/* Prevent flash of wrong theme — runs before React hydrates */}
        {/* SECURITY: Hardcoded static script — no user/DB input, safe to use dangerouslySetInnerHTML */}
        {/* beforeInteractive inside <body> lets Next.js hoist it to <head> at build time */}
        <Script
          id="dark-mode-init"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var d=localStorage.getItem('lp-dark-mode');if(d==='true'||(d===null&&window.matchMedia('(prefers-color-scheme:dark)').matches)){document.documentElement.classList.add('dark')}}catch(e){}})();`,
          }}
        />
        <Script src="https://www.googletagmanager.com/gtag/js?id=G-ZFZN7XZ36Y" strategy="afterInteractive" />
        <Script id="gtag-init" strategy="afterInteractive">
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