import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Cormorant_Garamond, Figtree } from "next/font/google";
import { ProfileProvider } from "@/components/profile-context";
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
  title: "Karen's Flashcards",
  description: "Learn every face.",
};

export const dynamic = "force-dynamic";

export default async function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${serif.variable} ${sans.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-background text-foreground">
        <ProfileProvider>
          <div className="flex-1">{children}</div>
        </ProfileProvider>
      </body>
    </html>
  );
}
