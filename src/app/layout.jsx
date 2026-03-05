import './globals.css'

export const metadata = {
  title: 'LaunchPard — Where Education Becomes Adventure',
  description: 'AI-powered learning for exam preparation. Adaptive learning, instant feedback, and space-themed missions.',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
