export { nomosViewport as viewport } from "@nomos/ui/viewport";
import type { Metadata } from "next";
import { Figtree } from "next/font/google";
import { appConfig } from "@/lib/app-config";
import "./globals.css";

const figtree = Figtree({ subsets: ["latin"], variable: "--font-figtree", display: "swap" });

export const metadata: Metadata = {
  title: appConfig.name,
  description: appConfig.description,
  icons: { icon: "/nomos-mark.png", apple: "/nomos-mark.png" },
};



export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en" className={figtree.variable} suppressHydrationWarning><body>{children}</body></html>;
}
