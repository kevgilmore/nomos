"use client";

import { useEffect, useState } from "react";
import { completeGoogleRedirect, signInWithGoogleRedirect, signOutFirebaseUser } from "@nomos/auth/client";
import { isLocalDevelopmentHost } from "@nomos/auth";

export function GoogleSignInButton({ returnTo }: { returnTo: string }) {
  const [error, setError] = useState<string | null>(null);
  const [working, setWorking] = useState(false);
  async function finishFirebaseSignIn(idToken: string) {
    const response = await fetch("/api/auth/session", { method: "POST", headers: { "content-type": "application/json" }, credentials: "include", body: JSON.stringify({ idToken, returnTo }) });
    const responseBody = await response.clone().json().catch(() => null) as { error?: string } | null;
    if (!response.ok) {
      throw new Error(responseBody?.error ?? `Sign-in was not accepted (${response.status})`);
    }
    const result = await response.json() as { redirectTo?: string };
    const redirectTo = result.redirectTo ?? returnTo;
    const handoff = new URL(redirectTo).searchParams.has("nomosAuthHandoff");
    if (!handoff) {
      const session = await fetch("/api/auth/session", { credentials: "include", cache: "no-store" });
      if (!session.ok) throw new Error("Sign-in succeeded, but the session cookie was not stored. Please retry from id.nomos.codes.");
    }
    window.location.assign(redirectTo);
  }

  useEffect(() => {
    if (isLocalDevelopmentHost(window.location.hostname)) return;
    setWorking(true);
    completeGoogleRedirect().then((idToken) => idToken ? finishFirebaseSignIn(idToken) : undefined)
      .catch((cause) => setError(cause instanceof Error ? cause.message : "Sign-in failed"))
      .finally(() => setWorking(false));
  }, [returnTo]);

  async function signIn() {
    try {
      // Local development uses the shared Nomos dev identity. Firebase's
      // session endpoint is a Firebase Hosting rewrite and is not available
      // from the local Next server.
      if (isLocalDevelopmentHost(window.location.hostname)) {
        for (const name of ["nomos_home_session", "nomos_fitness_session", "nomos_base_session", "nomos_template_session", "nomos_finance_session", "nomos_goals_session", "nomos_time_session", "nomos_local_session"]) {
          document.cookie = `${name}=local-development; Path=/; Max-Age=604800; SameSite=Lax`;
        }
        window.location.assign(returnTo);
        return;
      }
      setWorking(true);
      await signInWithGoogleRedirect();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Sign-in failed");
    } finally {
      setWorking(false);
    }
  }
  async function useAnotherAccount() {
    setWorking(true);
    try {
      await signOutFirebaseUser();
      setError(null);
      await signInWithGoogleRedirect(true);
    } finally {
      setWorking(false);
    }
  }
  const accountNotApproved = error === "Account is not approved";
  return <div className="space-y-3"><button type="button" onClick={signIn} disabled={working} className="h-11 w-full cursor-pointer rounded-full bg-[var(--primary)] px-5 text-sm font-semibold text-[var(--primary-foreground)] disabled:cursor-wait disabled:opacity-60">{working ? "Signing in…" : "Continue with Google"}</button>{error && <div role="alert" className="space-y-2 text-sm text-red-200"><p>{error}</p>{accountNotApproved && <button type="button" onClick={() => void useAnotherAccount()} disabled={working} className="cursor-pointer text-white/70 underline underline-offset-4 hover:text-white disabled:cursor-wait disabled:opacity-60">Log out and use another account</button>}</div>}</div>;
}
