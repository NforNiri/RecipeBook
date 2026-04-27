import type { Metadata } from "next";
import { Fraunces, Source_Serif_4, Inter } from "next/font/google";
import Script from "next/script";
import "./globals.css";

// Variable fonts — do not specify `weight` alongside `axes`.
const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
  axes: ["opsz", "SOFT", "WONK"],
});

const sourceSerif4 = Source_Serif_4({
  subsets: ["latin"],
  variable: "--font-source-serif",
  display: "swap",
  axes: ["opsz"],
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Cookbook",
    template: "%s | Cookbook",
  },
  description: "A personal digital cookbook — recipes, ratings, and cook history.",
  openGraph: {
    siteName: "Cookbook",
    title: "Cookbook",
    description: "A personal digital cookbook — recipes, ratings, and cook history.",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Cookbook",
    description: "A personal digital cookbook — recipes, ratings, and cook history.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      data-scroll-behavior="smooth"
      className={`${fraunces.variable} ${sourceSerif4.variable} ${inter.variable} h-full`}
    >
      <head>
        {/* Anti-FOUC: load from public/ so React never renders a <script> node.
            beforeInteractive injects the file into the HTML before hydration. */}
        <Script src="/theme-init.js" strategy="beforeInteractive" />
      </head>
      <body className="min-h-full antialiased" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
