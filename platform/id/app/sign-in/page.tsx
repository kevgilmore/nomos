"use client";

import { useEffect, useState } from "react";
import { isLocalDevelopmentHost, validateLocalReturnTo, validateProductionReturnTo } from "@nomos/auth";
import { GoogleSignInButton } from "./google-sign-in-button";

function ActiveSessionControls() {
  const [active, setActive] = useState(false);
  const [working, setWorking] = useState(false);
  useEffect(() => {
    fetch("/api/auth/session", { credentials: "include", cache: "no-store" }).then((response) => setActive(response.ok)).catch(() => setActive(false));
  }, []);
  if (!active) return null;
  async function signOut() {
    setWorking(true);
    await fetch("/api/auth/sign-out", { method: "POST", credentials: "include" });
    window.location.reload();
  }
  return <button type="button" onClick={() => void signOut()} disabled={working} className="mt-4 cursor-pointer text-xs text-white/60 underline underline-offset-4 disabled:cursor-wait">{working ? "Signing out…" : "Sign out"}</button>;
}

export default function SignInPage() {
  const [returnTo, setReturnTo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const value = params.get("returnTo");
    const local = isLocalDevelopmentHost(window.location.hostname);
    const fallback = local ? "http://localhost:3000/" : "https://nomos.codes/";
    setReturnTo((local ? validateLocalReturnTo(value) : validateProductionReturnTo(value)) ?? fallback);
    if (params.get("error")) setError("Sign-in failed.");
  }, []);

  return <main className="relative flex min-h-dvh flex-col px-6 py-8 sm:px-10 sm:py-10">
    <a href="/sign-in" className="flex w-fit items-center gap-2 text-[17px] font-medium tracking-[0.04em] text-white/90" aria-label="Nomos sign in"><img src="/nomos-mark.png" alt="" className="size-5 object-contain" />Nomos</a>
    <section className="flex flex-1 items-center justify-center py-16"><div className="w-full max-w-[400px] text-center">
      <img src="/nomos-mark.png" alt="" className="mx-auto mb-6 size-10 object-contain" aria-hidden="true" />
      <h1 className="text-[32px] font-medium tracking-[-0.035em] text-white sm:text-[38px]">Welcome to Nomos</h1>
      <div className="mt-6">{returnTo ? <GoogleSignInButton returnTo={returnTo} /> : <p className="text-sm text-[var(--muted-foreground)]">Open this page from a Nomos app to sign in.</p>}</div>
      {error && <p role="alert" className="mt-5 rounded-lg border border-red-300/30 bg-red-300/10 px-3 py-2 text-sm text-red-100">{error}</p>}
      <ActiveSessionControls />
      <div className="mt-5 rounded-lg border border-white/10 bg-white/[0.035] px-4 py-3 text-left text-xs leading-5 text-white/60"><p className="mb-1 font-semibold uppercase tracking-[0.12em] text-white/75">DISCLAIMER</p><p>Private website. Access is restricted to authorised users. Do not attempt to access, probe, bypass, or disrupt this service. Use of this site is limited to approved users and activity may be recorded for security purposes.</p></div>
    </div></section>
  </main>;
}
