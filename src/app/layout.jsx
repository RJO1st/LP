import './globals.css'

export const metadata = {
  title: 'LaunchPard — 11+ Rocket Science',
  description: 'AI-powered 11+ exam preparation for Years 3–6. Adaptive learning, instant feedback, and space-themed missions.',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}