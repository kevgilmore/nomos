"use client";

import * as React from "react";
import { cn } from "./utils";

type TabsContextValue = { value: string; setValue: (value: string) => void; baseId: string };
const TabsContext = React.createContext<TabsContextValue | null>(null);

export function Tabs({ defaultValue, value, onValueChange, children, className }: { defaultValue: string; value?: string; onValueChange?: (value: string) => void; children: React.ReactNode; className?: string }) {
  const [internalValue, setInternalValue] = React.useState(defaultValue);
  const currentValue = value ?? internalValue;
  const baseId = React.useId();
  const setValue = (nextValue: string) => {
    if (value === undefined) setInternalValue(nextValue);
    onValueChange?.(nextValue);
  };
  return <TabsContext.Provider value={{ value: currentValue, setValue, baseId }}><div className={className}>{children}</div></TabsContext.Provider>;
}

export function TabsList({ children, className, label = "Tabs" }: { children: React.ReactNode; className?: string; label?: string }) {
  return <div role="tablist" aria-label={label} className={cn("flex min-h-12 gap-6 overflow-x-auto border-b border-[var(--border)] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden", className)}>{children}</div>;
}

export function TabsTrigger({ value, children, className }: { value: string; children: React.ReactNode; className?: string }) {
  const context = React.useContext(TabsContext);
  if (!context) throw new Error("TabsTrigger must be used inside Tabs");
  const selected = context.value === value;
  const triggerId = `${context.baseId}-trigger-${value}`;
  const panelId = `${context.baseId}-panel-${value}`;
  return <button id={triggerId} type="button" role="tab" aria-selected={selected} aria-controls={panelId} tabIndex={selected ? 0 : -1} onClick={() => context.setValue(value)} onKeyDown={(event) => { if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return; const tabs = Array.from(event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>("[role=tab]") ?? []); const index = tabs.indexOf(event.currentTarget); const next = tabs[(index + (event.key === "ArrowRight" ? 1 : tabs.length - 1)) % tabs.length]; next?.focus(); next?.click(); }} className={cn("relative flex min-h-12 shrink-0 items-center whitespace-nowrap px-0.5 text-sm font-medium text-[var(--muted-foreground)] transition-colors hover:text-[var(--foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2", selected && "text-[var(--foreground)] after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:bg-[var(--primary)]", className)}>{children}</button>;
}

export function TabsContent({ value, children, className }: { value: string; children: React.ReactNode; className?: string }) {
  const context = React.useContext(TabsContext);
  if (!context) throw new Error("TabsContent must be used inside Tabs");
  const triggerId = `${context.baseId}-trigger-${value}`;
  const panelId = `${context.baseId}-panel-${value}`;
  return <div id={panelId} role="tabpanel" aria-labelledby={triggerId} hidden={context.value !== value} className={className}>{children}</div>;
}
