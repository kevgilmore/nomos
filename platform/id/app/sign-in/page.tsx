"use client";

import { useEffect, useState } from "react";
import { isLocalDevelopmentHost, validateIdentityReturnTo, validateLocalReturnTo, type SessionUser } from "@nomos/auth";
import { GoogleSignInButton } from "./google-sign-in-button";

function ReturningUserButton({ user, returnTo }: { user: SessionUser; returnTo: string }) {
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function continueAsUser() {
    setWorking(true);
    setError(null);
    try {
      const response = await fetch("/api/auth/continue", { method: "POST", headers: { "content-type": "application/json" }, credentials: "include", body: JSON.stringify({ returnTo }) });
      const result = await response.json().catch(() => null) as { redirectTo?: string; error?: string } | null;
      if (!response.ok || !result?.redirectTo) throw new Error(result?.error ?? "Could not continue");
      window.location.assign(result.redirectTo);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not continue");
      setWorking(false);
    }
  }
  return <div className="space-y-3"><button type="button" onClick={() => void continueAsUser()} disabled={working} className="flex min-h-11 w-full cursor-pointer items-center gap-2.5 rounded-full border border-white/10 bg-white/[0.08] px-2.5 py-1 text-left transition-colors hover:bg-white/[0.12] disabled:cursor-wait disabled:opacity-60"><img src="/api/auth/profile-image" alt="" className="size-8 shrink-0 rounded-full object-cover" /><span className="min-w-0 flex-1"><span className="block truncate text-xs font-semibold text-white">{working ? "Continuing…" : `Continue as ${user.name}`}</span><span className="block truncate text-xs text-white/65">{user.email}</span></span><svg viewBox="0 0 24 24" aria-hidden="true" className="mr-1.5 size-6 shrink-0"><path fill="#4285F4" d="M21.6 12.2c0-.7-.1-1.4-.2-2H12v3.9h5.4a4.6 4.6 0 0 1-2 3v2.6h3.3c1.9-1.8 2.9-4.4 2.9-7.5Z"/><path fill="#34A853" d="M12 22c2.7 0 5-.9 6.7-2.3l-3.3-2.6c-.9.6-2.1 1-3.4 1a5.9 5.9 0 0 1-5.5-4.1H3.1v2.7A10 10 0 0 0 12 22Z"/><path fill="#FBBC05" d="M6.5 14a6 6 0 0 1 0-3.9V7.4H3.1a10 10 0 0 0 0 9.3L6.5 14Z"/><path fill="#EA4335" d="M12 6.1c1.5 0 2.8.5 3.9 1.5l2.9-2.9A9.7 9.7 0 0 0 3.1 7.4l3.4 2.7A5.9 5.9 0 0 1 12 6.1Z"/></svg></button>{error && <p role="alert" className="text-sm text-red-200">{error}</p>}</div>;
}

export default function SignInPage() {
  const [returnTo, setReturnTo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sessionUser, setSessionUser] = useState<SessionUser | null>(null);
  const [sessionChecked, setSessionChecked] = useState(false);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const value = params.get("returnTo");
    const local = isLocalDevelopmentHost(window.location.hostname);
    const fallback = local ? "http://localhost:3000/" : "https://nomos.codes/";
    setReturnTo((local ? validateLocalReturnTo(value) : validateIdentityReturnTo(value)) ?? fallback);
    if (params.get("error")) setError("Sign-in failed.");
    fetch("/api/auth/session", { credentials: "include", cache: "no-store" })
      .then(async (response) => response.ok ? (await response.json() as { user?: SessionUser }).user ?? null : null)
      .then(setSessionUser)
      .catch(() => setSessionUser(null))
      .finally(() => setSessionChecked(true));
  }, []);

  return <main className="relative flex min-h-dvh flex-col px-6 py-8 sm:px-10 sm:py-10">
    <a href="/sign-in" className="flex w-fit items-center gap-2 text-[17px] font-medium tracking-[0.04em] text-white/90" aria-label="Nomos sign in"><img src="/nomos-mark.png" alt="" className="size-5 object-contain" />Nomos</a>
    <section className="flex flex-1 items-center justify-center py-16"><div className="w-full max-w-[400px] text-center">
      <img src="/nomos-mark.png" alt="" className="mx-auto mb-6 size-10 object-contain" aria-hidden="true" />
      <h1 className="text-[32px] font-medium tracking-[-0.035em] text-white sm:text-[38px]">Welcome to Nomos</h1>
      <div className="mt-6">{returnTo && sessionChecked ? (sessionUser ? <ReturningUserButton user={sessionUser} returnTo={returnTo} /> : <GoogleSignInButton returnTo={returnTo} />) : <p className="text-sm text-[var(--muted-foreground)]">Checking your session…</p>}</div>
      {error && <p role="alert" className="mt-5 rounded-lg border border-red-300/30 bg-red-300/10 px-3 py-2 text-sm text-red-100">{error}</p>}
      <div className="mt-5 rounded-lg border border-white/10 bg-white/[0.035] px-4 py-3 text-left text-xs leading-5 text-white/60"><p className="mb-1 font-semibold uppercase tracking-[0.12em] text-white/75">DISCLAIMER</p><p>Private website. Access is restricted to authorised users. Do not attempt to access, probe, bypass, or disrupt this service. Use of this site is limited to approved users and activity may be recorded for security purposes.</p></div>
    </div></section>
  </main>;
}
