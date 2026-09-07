import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Cormorant_Garamond, Figtree } from "next/font/google";
import { SiteHeader } from "@/components/site-header";
import { isEditor } from "@/lib/auth";
import { ensureDefaultSet } from "@/lib/ensure-test-set";
import { dueCount } from "@/lib/queue";
import { DEFAULT_SET_SLUG } from "@/lib/seed-data";
import { getSetBySlug } from "@/lib/sets";
import "./globals.css";

const serif = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const sans = Figtree({
  variable: "--font-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Flashcards",
  description: "Learn names and faces.",
};

export const dynamic = "force-dynamic";

export default async function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  let editor = false;
  let due = 0;
  try {
    editor = await isEditor();
    const deck =
      (await getSetBySlug(DEFAULT_SET_SLUG).catch(() => null)) ??
      (await ensureDefaultSet());
    due = await dueCount({ setId: deck?.id });
  } catch {
    editor = await isEditor().catch(() => false);
  }

  return (
    <html
      lang="en"
      className={`${serif.variable} ${sans.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-background text-foreground">
        <SiteHeader isEditor={editor} dueCount={due} />
        <div className="flex-1">{children}</div>
      </body>
    </html>
  );
}
