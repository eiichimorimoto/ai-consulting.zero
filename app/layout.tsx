import type React from "react"
import type { Metadata, Viewport } from "next"
import { Inter, Orbitron, Montserrat, Noto_Sans_JP, Bebas_Neue } from "next/font/google"
import "./globals.css"
import ConditionalHeader from "@/components/ConditionalHeader"
import ConditionalFooter from "@/components/ConditionalFooter"
import FloatingDiagnosis from "@/components/FloatingDiagnosis"

const inter = Inter({ 
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
})
const orbitron = Orbitron({ subsets: ["latin"], weight: ["400", "500", "600", "700", "800", "900"] })
const montserrat = Montserrat({ subsets: ["latin"], weight: ["400", "500", "600", "700", "800", "900"] })
const notoSansJP = Noto_Sans_JP({ 
  subsets: ["latin"], 
  weight: ["400", "500", "600", "700"],
  variable: "--font-noto",
  display: "swap",
})
const bebasNeue = Bebas_Neue({ 
  subsets: ["latin"], 
  weight: ["400"], 
  variable: "--font-bebas-neue",
  display: "swap",
})

export const metadata: Metadata = {
  title: "SolveWise - AI Powered Consulting",
  description: "AIが伴走する経営支援サービス。24時間休まない分析力で、あなたの経営を次のステージへ。",
  generator: "v0.app",
  icons: {
    icon: [
      {
        url: "/icon-light-32x32.png",
        media: "(prefers-color-scheme: light)",
      },
      {
        url: "/icon-dark-32x32.png",
        media: "(prefers-color-scheme: dark)",
      },
      {
        url: "/icon.svg",
        type: "image/svg+xml",
      },
    ],
    apple: "/apple-icon.png",
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ja" className={`${inter.variable} ${notoSansJP.variable} ${bebasNeue.variable}`}>
      <body className={`${inter.className} ${bebasNeue.variable} antialiased`}>
        <ConditionalHeader />
        {children}
        <ConditionalFooter />
        <FloatingDiagnosis />
      </body>
    </html>
  )
}
