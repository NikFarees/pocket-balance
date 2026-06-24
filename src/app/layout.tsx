import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import { Fraunces, Hanken_Grotesk, Geist_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/ThemeProvider";
import { BalanceVisibilityProvider } from "@/components/BalanceVisibilityProvider";
import { TimezoneSync } from "@/components/TimezoneSync";
import { AuthShell } from "@/components/AuthShell";
import "./globals.css";

const frauncesDisplay = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const hankenGrotesk = Hanken_Grotesk({
  variable: "--font-hanken",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
const description =
  "Free personal daily finance tracker for Malaysia. Track income, EPF/SOCSO/EIS, bills, daily budget with carry-forward, debts, investments and an emergency fund — all in Ringgit (RM), with a voice & text AI assistant.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "PennyWise — Daily Personal Finance Tracker for Malaysia",
    template: "%s · PennyWise",
  },
  description,
  applicationName: "PennyWise",
  category: "finance",
  keywords: [
    "personal finance tracker",
    "budget app Malaysia",
    "daily budget",
    "expense tracker",
    "EPF SOCSO EIS calculator",
    "Ringgit budgeting",
    "money tracker Malaysia",
  ],
  alternates: { canonical: "/" },
  robots: { index: true, follow: true },
  openGraph: {
    type: "website",
    siteName: "PennyWise",
    title: "PennyWise — Daily Personal Finance Tracker for Malaysia",
    description,
    url: siteUrl,
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "PennyWise" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "PennyWise — Daily Personal Finance Tracker for Malaysia",
    description,
    images: ["/og.png"],
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#2f7d54" },
    { media: "(prefers-color-scheme: dark)", color: "#d9b067" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${frauncesDisplay.variable} ${hankenGrotesk.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col pb-16 md:pb-0">
        <ThemeProvider>
          <BalanceVisibilityProvider>
            <TimezoneSync />
            {children}
            <Suspense fallback={null}>
              <AuthShell />
            </Suspense>
            <Toaster richColors position="top-right" />
          </BalanceVisibilityProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
