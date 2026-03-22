
import './globals.css'
import Script from 'next/script';



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
    <html lang="en">
      <Script
  src="https://www.googletagmanager.com/gtag/js?id=G-ZFZN7XZ36Y"
  strategy="afterInteractive"
/>
<link rel="manifest" href="/manifest.json" />
<meta name="theme-color" content="#6366f1" />
<meta name="mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
<link rel="apple-touch-icon" href="/icon-192.png" />
<Script id="gtag-init" strategy="afterInteractive">
  {`
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', 'G-ZFZN7XZ36Y');
  `}
</Script>
      <body>{children}</body>
    </html>
  )
}
