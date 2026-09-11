export { nomosViewport as viewport } from "@nomos/ui/viewport";
import type { Metadata } from "next";
import { Figtree } from "next/font/google";
import { AppShell } from "@/components/app-shell";
import { appConfig } from "@/lib/app-config";
import "./globals.css";

const figtree = Figtree({ subsets: ["latin"], variable: "--font-figtree", display: "swap" });

function getDefaultTitle(name: string, brandName: string) {
  return name === brandName ? name : `${name} · ${brandName}`;
}

const defaultTitle = getDefaultTitle(appConfig.name, appConfig.brandName);

export const metadata: Metadata = {
  title: { default: defaultTitle, template: `%s · ${defaultTitle}` },
  description: appConfig.description,
  icons: { icon: "/nomos-mark.png", apple: "/nomos-mark.png" },
};



export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const dark = true;
  return <html lang="en" className={`${figtree.variable}${dark ? " dark" : ""}`} suppressHydrationWarning><body><AppShell>{children}</AppShell></body></html>;
}
