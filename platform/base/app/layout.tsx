import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Figtree } from "next/font/google";
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
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const dark = (await cookies()).get("nomos-theme")?.value !== "light";
  return <html lang="en" className={`${figtree.variable}${dark ? " dark" : ""}`} suppressHydrationWarning><body>{children}</body></html>;
}
