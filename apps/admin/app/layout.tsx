import type { Metadata } from "next";
import { Figtree } from "next/font/google";
import { AppShell } from "@/components/app-shell";
import "./globals.css";

export const metadata: Metadata = { title: "Admin", description: "Admin · Nomos", icons: { icon: "/nomos-mark.png", apple: "/nomos-mark.png" } };
export { nomosViewport as viewport } from "@nomos/ui/viewport";

const figtree = Figtree({ subsets: ["latin"], variable: "--font-figtree", display: "swap" });
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en" className={figtree.variable + " dark"} suppressHydrationWarning><body style={{ fontFamily: "Figtree, sans-serif" }}><AppShell>{children}</AppShell></body></html>; }
