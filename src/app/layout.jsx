import './globals.css'

export const metadata = {
  title: 'LaunchPard — Where Education Becomes Adventure',
  description: 'AI-powered learning that adapts to your child. Adaptive learning, instant feedback, and space-themed missions.',
  icons: {
    icon: '/favicon.svg',
    apple: '/logo192.png',
  },
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}