"use client";

import Link from "next/link";

export function TabLink({ href, label, selected }: { href: string; label: string; selected: boolean }) {
  return <Link href={href} prefetch aria-current={selected ? "page" : undefined} className={`relative min-h-11 whitespace-nowrap px-0.5 py-3 text-sm font-medium ${selected ? "text-[var(--foreground)] after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:bg-[var(--primary)]" : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"}`}>{label}</Link>;
}
