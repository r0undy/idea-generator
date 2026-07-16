import type { Metadata } from "next";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

import FantasyBackground from "@/components/background/FantasyBackground";
import SignOutButton from "@/components/auth/SignOutButton";
import { createClient } from "@/lib/supabase/server";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Kiro Idea Vault",
  description: "Pull for your next project idea, Kiro-style.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased dark`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <FantasyBackground />
        <header className="flex items-center justify-between gap-4 px-4 pt-6 sm:px-6 sm:pt-8">
          <Link href="/" className="flex items-center gap-2.5 text-left">
            <span
              aria-hidden="true"
              className="flex h-7 w-7 flex-none items-center justify-center rounded-md bg-brand/15 ring-1 ring-brand/40"
            >
              <span className="h-2.5 w-2.5 rounded-sm bg-brand" />
            </span>
            <span className="flex flex-col leading-none">
              <span className="font-display text-base font-semibold tracking-tight text-foreground sm:text-lg">
                Kiro Idea Vault
              </span>
              <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-brand/80">
                Gacha Edition
              </span>
            </span>
          </Link>
          {user ? (
            <nav className="flex items-center gap-3">
              <Link
                href="/history"
                className="text-xs font-semibold uppercase tracking-wide text-foreground/70 hover:text-foreground"
              >
                History
              </Link>
              <SignOutButton />
            </nav>
          ) : null}
        </header>
        <main className="flex flex-1 flex-col">{children}</main>
      </body>
    </html>
  );
}
