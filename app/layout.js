import './globals.css'

export const metadata = {
  title: '家計簿',
  description: 'ふたりの家計簿アプリ',
}

export default function RootLayout({ children }) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  )
}
