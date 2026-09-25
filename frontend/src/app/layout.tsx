import type { Metadata } from "next";
import { DM_Sans, Inter } from "next/font/google";

import { AppShell } from "@/components/layout/AppShell";
import { THEME_SCRIPT } from "@/lib/theme";

import "./globals.css";
import { Providers } from "./providers";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const dmSans = DM_Sans({ variable: "--font-dm-sans", subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: "Fireflies", template: "%s · Fireflies" },
  description: "Meeting library, interactive transcripts and AI notes in a Fireflies.ai-style workspace (educational clone).",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // The inline script may change data-theme before React hydrates, so that attribute is allowed to differ.
    <html lang="en" data-theme="light" suppressHydrationWarning className={`${inter.variable} ${dmSans.variable}`}>
      <head>
        {/* A fixed string from lib/theme.ts (no user input): applies the saved theme before first paint. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body>
        <Providers>
          <AppShell>{children}</AppShell>
        </Providers>
      </body>
    </html>
  );
}
