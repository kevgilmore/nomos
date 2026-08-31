import type { Metadata } from "next";
import { Figtree } from "next/font/google";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sign in · Nomos ID",
  description: "Local Nomos identity proof of concept.",
};

const figtree = Figtree({ subsets: ["latin"], variable: "--font-figtree", display: "swap" });

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en" className={`${figtree.variable} dark`} suppressHydrationWarning><body>{children}</body></html>;
}
