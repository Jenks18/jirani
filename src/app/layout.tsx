import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Jirani - Community Safety Platform",
  description: "Real-time incident reporting and community safety platform",
  // Add Mapbox CSS globally via metadata
  icons: [],
  openGraph: {},
  twitter: {},
  other: {},
  // Next.js 13+ supports 'link' for global <head> tags
  // See: https://nextjs.org/docs/app/api-reference/file-conventions/metadata/app-icons
  // and https://nextjs.org/docs/app/api-reference/functions/generate-metadata#link
  // This ensures the CSS is present before any JS runs
  // @ts-expect-error: Next.js app directory metadata 'link' is not yet typed but is supported at runtime
  link: [
    {
      rel: "stylesheet",
      href: "https://api.mapbox.com/mapbox-gl-js/v3.0.1/mapbox-gl.css",
      key: "mapbox-gl-css"
    }
  ]
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
