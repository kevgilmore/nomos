export function NomosLogo({ compact = false, src = "/nomos-mark.png" }: { compact?: boolean; src?: string }) {
  return <div className="flex items-center gap-3" aria-label="Nomos home"><span className="relative grid size-11 shrink-0" role="img" aria-label="Nomos N mark"><img src={src} alt="" className="size-full object-contain invert dark:invert-0" /></span>{!compact && <span className="text-lg font-semibold tracking-[-.03em]">Nomos</span>}</div>;
}
