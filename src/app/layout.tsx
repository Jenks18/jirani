import type { Metadata, Viewport } from "next";
import { Bebas_Neue, Roboto } from "next/font/google";
import "./globals.css";
import CookieNotice from "./CookieNotice";
import { org } from "@/config/org";

const bebas = Bebas_Neue({ variable: "--font-bebas", subsets: ["latin"], weight: "400", display: "swap" });
const roboto = Roboto({ variable: "--font-roboto", subsets: ["latin"], weight: ["400", "500", "700"], display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(org.mainUrl),
  title: {
    default: `${org.product} — community safety, by neighbors`,
    template: `%s · ${org.product}`,
  },
  description:
    "Jirani lets neighbors report safety incidents over WhatsApp and see them on a live community map. A Majirani Wetu program of The 6.25 Movement.",
  applicationName: org.product,
  authors: [{ name: org.legalName, url: org.parentUrl }],
  openGraph: {
    type: "website",
    siteName: `${org.product} · ${org.program}`,
    locale: "en_KE",
    url: org.mainUrl,
  },
  twitter: { card: "summary_large_image", site: "@625movement" },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#0c643a",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${bebas.variable} ${roboto.variable}`}>
      <body className="antialiased">
        {children}
        <CookieNotice />
      </body>
    </html>
  );
}
