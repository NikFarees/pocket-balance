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

export const metadata: Metadata = {
  title: "PennyWise",
  description: "Personal daily financial tracker",
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
