import type { Metadata, Viewport } from "next";
import { Figtree } from "next/font/google";
import "./globals.css";
import { AppShell } from "@/components/app-shell";

const figtree = Figtree({ subsets: ["latin"], variable: "--font-figtree", display: "swap" });
export const metadata: Metadata = { title: "Template · Nomos", description: "Nomos shared UI reference", icons: { icon: "/nomos-mark.png", apple: "/nomos-mark.png" } };
export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover", colorScheme: "dark light", themeColor: "#19171f" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en" className={`${figtree.variable} dark`} suppressHydrationWarning><body><AppShell>{children}</AppShell></body></html>; }
