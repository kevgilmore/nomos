export { nomosViewport as viewport } from "@nomos/ui/viewport";
import type { Metadata } from "next";
import { Figtree } from "next/font/google";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sign in · Nomos ID",
  description: "Local Nomos identity proof of concept.",
  icons: { icon: "/nomos-mark.png", apple: "/nomos-mark.png" },
};



const figtree = Figtree({ subsets: ["latin"], variable: "--font-figtree", display: "swap" });

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en" className={`${figtree.variable} dark`} suppressHydrationWarning><body>{children}</body></html>;
}
