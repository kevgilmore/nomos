export function GoalsSectionPlaceholder({ title, description }: { title: string; description: string }) {
  return <section className="mx-auto max-w-[1400px] pb-6"><h2 className="text-3xl font-semibold tracking-tight">{title}</h2><p className="mt-4 text-sm text-[var(--muted-foreground)]">{description}</p></section>;
}
