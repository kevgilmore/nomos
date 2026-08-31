export default function Loading() {
  return <div aria-label="Loading Fitness" className="animate-pulse space-y-7"><div className="h-11 w-64 rounded-lg bg-[var(--muted)]"/><div className="h-64 rounded-3xl bg-[var(--card)]"/><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5"><div className="h-40 rounded-2xl bg-[var(--card)]"/><div className="h-40 rounded-2xl bg-[var(--card)]"/><div className="h-40 rounded-2xl bg-[var(--card)]"/></div></div>;
}
