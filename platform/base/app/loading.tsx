export default function Loading() {
  return <div aria-label="Loading Base" className="animate-pulse space-y-5"><div className="h-11 w-64 rounded-lg bg-[var(--muted)]"/><div className="grid gap-4 sm:grid-cols-3"><div className="h-28 rounded-2xl bg-[var(--card)]"/><div className="h-28 rounded-2xl bg-[var(--card)]"/><div className="h-28 rounded-2xl bg-[var(--card)]"/></div><div className="h-56 rounded-2xl bg-[var(--card)]"/></div>;
}
