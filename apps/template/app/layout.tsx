export { nomosViewport as viewport } from "@nomos/ui/viewport";
import type { Metadata } from "next";
import { Figtree } from "next/font/google";
import "./globals.css";
import { AppShell } from "@/components/app-shell";

const figtree = Figtree({ subsets: ["latin"], variable: "--font-figtree", display: "swap" });
export const metadata: Metadata = { title: "Template · Nomos", description: "Nomos shared UI reference", icons: { icon: "/nomos-mark.png", apple: "/nomos-mark.png" } };


export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en" className={`${figtree.variable} dark`} suppressHydrationWarning><body><AppShell>{children}</AppShell></body></html>; }
