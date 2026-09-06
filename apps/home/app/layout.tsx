import type { Metadata, Viewport } from "next";
import { Figtree } from "next/font/google";
import "./globals.css";

export const metadata: Metadata = { title: "Nomos", description: "Your Nomos home.", icons: { icon: "/nomos-mark.png", apple: "/nomos-mark.png" } };

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  colorScheme: "dark",
  themeColor: "#19171f",
};

const figtree = Figtree({ subsets: ["latin"], variable: "--font-figtree", display: "swap" });


export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en" className={`${figtree.variable} dark`} suppressHydrationWarning><body>{children}</body></html>; }
