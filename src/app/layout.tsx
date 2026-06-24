import type { Metadata } from "next";
import { Fraunces, Hanken_Grotesk, Geist_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/ThemeProvider";
import { BalanceVisibilityProvider } from "@/components/BalanceVisibilityProvider";
import { TimezoneSync } from "@/components/TimezoneSync";
import { AssistantWidget } from "@/components/assistant/AssistantWidget";
import { BottomNav } from "@/components/BottomNav";
import { createClient } from "@/lib/supabase/server";
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

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <html
      lang="en"
      className={`${frauncesDisplay.variable} ${hankenGrotesk.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className={`min-h-full flex flex-col${user ? ' pb-16 md:pb-0' : ''}`}>
        <ThemeProvider>
          <BalanceVisibilityProvider>
            <TimezoneSync />
            {children}
            {user && <BottomNav />}
            {user && <AssistantWidget />}
            <Toaster richColors position="top-right" />
          </BalanceVisibilityProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
