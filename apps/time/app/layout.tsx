export { nomosViewport as viewport } from "@nomos/ui/viewport";
import type { Metadata } from "next";
import { Figtree } from "next/font/google";
import "./globals.css";
import { AppShell } from "@/components/app-shell";

export const metadata: Metadata = { title: "Time", icons: { icon: "/nomos-mark.png", apple: "/nomos-mark.png" } };
const figtree = Figtree({ subsets: ["latin"], variable: "--font-figtree", display: "swap" });

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en" className={`${figtree.variable} dark`} suppressHydrationWarning><body><AppShell>{children}</AppShell></body></html>; }
