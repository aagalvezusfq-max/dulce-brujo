import { getBaseURL } from "@lib/util/env"
import { Cormorant_Garamond, Outfit } from "next/font/google"
import { Metadata } from "next"
import "styles/globals.css"

const display = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
  variable: "--font-display",
})

const sans = Outfit({
  subsets: ["latin"],
  weight: ["300", "400", "500"],
  variable: "--font-sans",
})

export const metadata: Metadata = {
  metadataBase: new URL(getBaseURL()),
  title: "Dulce Brujo",
  description: "Dulces de cacao inventados. Precios en dólares.",
}

export default function RootLayout(props: { children: React.ReactNode }) {
  return (
    <html
      lang="es"
      data-mode="dark"
      className={`dark ${display.variable} ${sans.variable}`}
    >
      <body className="bg-brujo-ink text-brujo-cream antialiased">
        <main className="relative min-h-screen">{props.children}</main>
      </body>
    </html>
  )
}
