"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { Blocks, LogOut, Moon, PanelRightOpen, Search, Sparkles, Sun } from "lucide-react";
import { Avatar, AvatarFallback, Button, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "./index";
import { AssistantPanel } from "./assistant-panel";
import { signOutFirebaseUser } from "@nomos/auth/client";
import { getLocalSessionCookie, isLocalDevelopmentHost, LOCAL_DEV_USER, NOMOS_URLS } from "@nomos/auth";
import { NomosToastViewport, showNomosToast } from "./nomos-toast";

export type ShellNavItem = { slug: string; label: string; href: string; icon: React.ElementType };
export type ShellApp = { slug: string; label: string; href: string; icon?: React.ElementType };
export type ShellUser = { name: string; email: string; avatarUrl?: string };

let clientSessionUser: ShellUser | null = null;
let clientSessionPromise: Promise<ShellUser | null> | null = null;
const SESSION_STORAGE_KEY = "nomos.session.user";

function readStoredSessionUser(): ShellUser | null {
  if (typeof window === "undefined") return null;
  try {
    const value = JSON.parse(window.sessionStorage.getItem(SESSION_STORAGE_KEY) ?? "null") as Partial<ShellUser> | null;
    if (!value || typeof value.name !== "string" || typeof value.email !== "string") return null;
    return { name: value.name, email: value.email, ...(typeof value.avatarUrl === "string" ? { avatarUrl: value.avatarUrl } : {}) };
  } catch {
    return null;
  }
}

function storeSessionUser(user: ShellUser | null) {
  if (typeof window === "undefined") return;
  if (user) window.sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(user));
  else window.sessionStorage.removeItem(SESSION_STORAGE_KEY);
}

function WaffleIcon() {
  return <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">{[2, 9, 16].flatMap((y) => [2, 9, 16].map((x) => <rect key={`${x}-${y}`} x={x} y={y} width="6" height="6" rx="1.25" />))}</svg>;
}

function ThemeToggle() {
  const [dark, setDark] = React.useState(true);
  React.useEffect(() => {
    const nextDark = document.documentElement.classList.contains("dark");
    setDark(nextDark);
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", nextDark ? "#19171f" : "#ffffff");
  }, []);
  function toggle() {
    const nextDark = !dark;
    setDark(nextDark);
    document.documentElement.classList.toggle("dark", nextDark);
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", nextDark ? "#19171f" : "#ffffff");
    window.localStorage.setItem("nomos-theme", nextDark ? "dark" : "light");
    document.cookie = `nomos-theme=${nextDark ? "dark" : "light"}; Path=/; Max-Age=31536000; SameSite=Lax`;
  }
  const Icon = dark ? Sun : Moon;
  return <Button variant="ghost" size="icon" onClick={toggle} aria-label={`Switch to ${dark ? "light" : "dark"} mode`} title={`Switch to ${dark ? "light" : "dark"} mode`} className="topnav-icon grid size-10 min-h-10 place-items-center rounded-full border-0 bg-transparent transition-none shadow-none hover:bg-[var(--accent)] focus-visible:!outline-none focus-visible:!ring-0"><Icon /></Button>;
}

export function NomosShell({ children, title, homeUrl, logo, navigation = [], apps = [], assistantPage, assistantContextStorageKey, assistantProposalStorageKey, profileImage = "/pp.png", appSlug, showNavigation = true }: { children: React.ReactNode; title: string; homeUrl: string; logo: React.ReactNode; navigation?: ShellNavItem[]; apps?: ShellApp[]; assistantPage?: string; assistantContextStorageKey?: string; assistantProposalStorageKey?: string; profileImage?: string; appSlug?: string; showNavigation?: boolean }) {
  const pathname = usePathname() ?? "";
  const [launcherOpen, setLauncherOpen] = React.useState(false);
  const [launcherQuery, setLauncherQuery] = React.useState("");
  const [assistantOpen, setAssistantOpen] = React.useState(false);
  const [user, setUser] = React.useState<ShellUser | null>(() => readStoredSessionUser());
  const [authChecked, setAuthChecked] = React.useState(() => Boolean(readStoredSessionUser()));
  const launcherSearchRef = React.useRef<HTMLInputElement>(null);
  const visibleApps = apps.filter((app) => app.slug !== appSlug && (app.slug !== "template" || launcherQuery.trim().length > 0) && app.label.toLowerCase().includes(launcherQuery.trim().toLowerCase()));

  React.useEffect(() => {
    let clickId = 0;
    let lastInternalClick: { id: number; href: string; at: number } | null = null;
    const originalFetch = window.fetch.bind(window);
    const cookieNames = document.cookie.split(";").map((cookie) => cookie.trim().split("=", 1)[0]).filter(Boolean);

    console.info("[Nomos diagnostics] shell mounted", {
      href: window.location.href,
      navigationType: (performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined)?.type ?? "unknown",
      cookieEnabled: navigator.cookieEnabled,
      visibleCookieNames: cookieNames,
      httpOnlySessionCookieExpected: true,
    });

    window.fetch = async (input, init) => {
      const request = new Request(input, init);
      const sameOrigin = new URL(request.url).origin === window.location.origin;
      const requestUrl = new URL(request.url);
      const isApiRequest = sameOrigin && requestUrl.pathname.startsWith("/api/");
      const isHevyRequest = isApiRequest && requestUrl.pathname.startsWith("/api/hevy/");
      const isNavigationRequest = sameOrigin && (request.url.includes("/index.txt") || request.headers.has("RSC"));
      const isAuthRequest = sameOrigin && request.url.includes("/api/auth/");
      if (isNavigationRequest || isAuthRequest) {
        console.info("[Nomos diagnostics] fetch start", {
          clickId: lastInternalClick?.id ?? null,
          method: request.method,
          url: request.url,
          rsc: request.headers.get("RSC"),
          credentials: request.credentials,
        });
      }
      try {
        const response = await originalFetch(input, init);
        if (isApiRequest && !response.ok) {
          let detail = "";
          try {
            const body = await response.clone().json() as { error?: unknown };
            detail = typeof body.error === "string" ? body.error : "";
          } catch { /* The endpoint may return a non-JSON error page. */ }
          showNomosToast({ tone: "error", message: `${detail || (isHevyRequest ? "Hevy request failed" : "Request failed")} (${response.status})` });
        } else if (isHevyRequest) {
          const action = request.method === "GET" ? "Loaded" : request.method === "POST" ? "Updated" : request.method === "PUT" ? "Updated" : request.method === "DELETE" ? "Deleted" : "Completed";
          const subject = requestUrl.pathname.includes("workouts") ? "Hevy workouts" : requestUrl.pathname.includes("routines") ? "Hevy routines" : "Hevy";
          showNomosToast({ tone: "success", message: `${action} ${subject}` });
        }
        if (isNavigationRequest || isAuthRequest) {
          console.info("[Nomos diagnostics] fetch end", {
            clickId: lastInternalClick?.id ?? null,
            url: request.url,
            status: response.status,
            ok: response.ok,
            redirected: response.redirected,
            contentType: response.headers.get("content-type"),
          });
        }
        return response;
      } catch (error) {
        if (isApiRequest) showNomosToast({ tone: "error", message: `${isHevyRequest ? "Hevy request failed" : "Request failed"}: ${error instanceof Error ? error.message : "Network error"}` });
        if (isNavigationRequest || isAuthRequest) console.error("[Nomos diagnostics] fetch error", { clickId: lastInternalClick?.id ?? null, url: request.url, error });
        throw error;
      }
    };

    function handleInternalClick(event: MouseEvent) {
      const target = event.target instanceof Element ? event.target.closest("a") : null;
      if (!target || target.origin !== window.location.origin) return;
      const id = ++clickId;
      lastInternalClick = { id, href: target.href, at: performance.now() };
      console.info("[Nomos diagnostics] internal link click", { id, href: target.href, defaultPreventedAtCapture: event.defaultPrevented });
      window.setTimeout(() => {
        const resources = performance.getEntriesByType("resource")
          .filter((entry) => entry.startTime >= (lastInternalClick?.at ?? 0) - 10)
          .map((entry) => entry.name)
          .filter((name) => name.includes("/index.txt") || name.includes("/api/"));
        console.info("[Nomos diagnostics] internal link settled", { id, clickedHref: target.href, currentHref: window.location.href, defaultPreventedAfterHandlers: event.defaultPrevented, resources });
      }, 1500);
    }

    function handleBeforeUnload() {
      console.warn("[Nomos diagnostics] beforeunload fired", { href: window.location.href, lastInternalClick });
    }

    document.addEventListener("click", handleInternalClick, true);
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.fetch = originalFetch;
      document.removeEventListener("click", handleInternalClick, true);
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, []);

  React.useEffect(() => { if (launcherOpen) requestAnimationFrame(() => launcherSearchRef.current?.focus()); }, [launcherOpen]);
  React.useEffect(() => {
    function handleShortcut(event: KeyboardEvent) {
      const modifier = event.ctrlKey || event.metaKey;
      if (!modifier || event.altKey || event.shiftKey) return;
      const key = event.key.toLowerCase();
      if (key === "k") {
        event.preventDefault();
        setLauncherOpen((open) => !open);
        if (launcherOpen) setLauncherQuery("");
      } else if (key === "i" && assistantPage) {
        event.preventDefault();
        setAssistantOpen((open) => !open);
      }
    }
    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, [assistantPage, launcherOpen]);
  React.useEffect(() => {
    if (!assistantOpen || window.matchMedia("(min-width: 1280px)").matches) return;
    const body = document.body;
    const documentElement = document.documentElement;
    const scrollY = window.scrollY;
    const scrollbarWidth = window.innerWidth - documentElement.clientWidth;
    const previous = {
      bodyPosition: body.style.position,
      bodyTop: body.style.top,
      bodyLeft: body.style.left,
      bodyRight: body.style.right,
      bodyWidth: body.style.width,
      bodyOverflow: body.style.overflow,
      bodyPaddingRight: body.style.paddingRight,
      bodyOverscrollBehavior: body.style.overscrollBehavior,
      documentOverflow: documentElement.style.overflow,
      documentOverscrollBehavior: documentElement.style.overscrollBehavior,
    };
    body.style.position = "fixed";
    body.style.top = `-${scrollY}px`;
    body.style.left = "0";
    body.style.right = "0";
    body.style.width = "100%";
    body.style.overflow = "hidden";
    body.style.overscrollBehavior = "none";
    if (scrollbarWidth > 0) body.style.paddingRight = `${scrollbarWidth}px`;
    documentElement.style.overflow = "hidden";
    documentElement.style.overscrollBehavior = "none";
    return () => {
      body.style.position = previous.bodyPosition;
      body.style.top = previous.bodyTop;
      body.style.left = previous.bodyLeft;
      body.style.right = previous.bodyRight;
      body.style.width = previous.bodyWidth;
      body.style.overflow = previous.bodyOverflow;
      body.style.paddingRight = previous.bodyPaddingRight;
      body.style.overscrollBehavior = previous.bodyOverscrollBehavior;
      documentElement.style.overflow = previous.documentOverflow;
      documentElement.style.overscrollBehavior = previous.documentOverscrollBehavior;
      window.scrollTo(0, scrollY);
    };
  }, [assistantOpen]);
  React.useEffect(() => {
    const local = isLocalDevelopmentHost(window.location.hostname);
    const localCookieName = appSlug ? getLocalSessionCookie(appSlug) : window.location.port === "3003" ? getLocalSessionCookie("fitness") : window.location.port === "3002" ? getLocalSessionCookie("base") : getLocalSessionCookie("home");
    const localCookie = local ? document.cookie.split(";").some((cookie) => cookie.trim().startsWith(`${localCookieName}=`)) : false;

    console.info("[Nomos diagnostics] auth check start", {
      href: window.location.href,
      local,
      localCookie,
      cookieEnabled: navigator.cookieEnabled,
      visibleCookieNames: document.cookie.split(";").map((cookie) => cookie.trim().split("=", 1)[0]).filter(Boolean),
    });

    const storedUser = readStoredSessionUser();
    if (clientSessionUser || storedUser) {
      const acceptedUser = clientSessionUser ?? storedUser;
      clientSessionUser = acceptedUser;
      console.info("[Nomos diagnostics] auth check cache hit");
      setUser(acceptedUser);
      setAuthChecked(true);
      return;
    }

    if (local && (localCookie || !["localhost", "127.0.0.1"].includes(window.location.hostname))) {
      if (!localCookie) document.cookie = `${localCookieName}=local-development; Path=/; Max-Age=604800; SameSite=Lax`;
      console.info("[Nomos diagnostics] auth check local session accepted", { localCookieName });
      clientSessionUser = LOCAL_DEV_USER;
      storeSessionUser(LOCAL_DEV_USER);
      setUser(LOCAL_DEV_USER);
      setAuthChecked(true);
      return;
    }

    if (!clientSessionPromise) {
      clientSessionPromise = (async () => {
        const handoffCode = new URLSearchParams(window.location.search).get("nomosAuthHandoff");
        if (handoffCode) {
          const response = await fetch("/api/auth/session", {
            method: "POST",
            headers: { "content-type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ handoffCode, returnTo: window.location.href.split("?")[0] }),
          });
          if (!response.ok) throw new Error("Sign-in handoff was not accepted");
          const cleanUrl = new URL(window.location.href);
          cleanUrl.searchParams.delete("nomosAuthHandoff");
          window.history.replaceState({}, "", cleanUrl.toString());
        }
        return fetch("/api/auth/session", { credentials: "include", cache: "no-store" }).then(async (response) => {
        console.info("[Nomos diagnostics] auth check response", { status: response.status, ok: response.ok, url: response.url, contentType: response.headers.get("content-type") });
        if (response.ok) {
          const data = await response.json();
          console.info("[Nomos diagnostics] auth check accepted", { userPresent: Boolean(data?.user), userFields: data?.user ? Object.keys(data.user) : [] });
          return data?.user ?? null;
        }
        const body = await response.clone().json().catch(() => null) as { error?: string } | null;
        console.warn("[Nomos diagnostics] auth check rejected; redirecting to sign-in", { status: response.status, error: body?.error ?? null });
        window.location.assign(`${NOMOS_URLS.id}/sign-in?returnTo=${encodeURIComponent(window.location.href)}`);
        return null;
      }).catch((error) => {
        console.error("[Nomos diagnostics] auth check failed; redirecting to sign-in", { error });
        window.location.assign(`${NOMOS_URLS.id}/sign-in?returnTo=${encodeURIComponent(window.location.href)}`);
        return null;
        });
      })();
    } else {
      console.info("[Nomos diagnostics] auth check already in flight");
    }

    clientSessionPromise.then((sessionUser) => {
      if (sessionUser) {
        clientSessionUser = sessionUser;
        storeSessionUser(sessionUser);
        setUser(sessionUser);
      }
      setAuthChecked(true);
    });
  }, []);

  function selectApp(app: ShellApp) {
    setLauncherOpen(false);
    if (window.matchMedia("(max-width: 1279px)").matches) {
      window.location.assign(app.href);
      return;
    }
    window.open(app.href, "_blank", "noopener,noreferrer");
  }
  async function signOut() {
    try {
      const local = isLocalDevelopmentHost(window.location.hostname);
      const production = !local;
      const endpoint = production ? `${process.env.NEXT_PUBLIC_NOMOS_AUTH_API_URL ?? "/api/auth"}/sign-out` : "/api/auth/sign-out";
      await fetch(endpoint, { method: "POST", credentials: "include" });
      await signOutFirebaseUser();
      if (local) {
        const localCookieName = appSlug ? getLocalSessionCookie(appSlug) : window.location.port === "3003" ? getLocalSessionCookie("fitness") : window.location.port === "3002" ? getLocalSessionCookie("base") : getLocalSessionCookie("home");
        document.cookie = `${localCookieName}=; Path=/; Max-Age=0; SameSite=Lax`;
      }
    } finally {
      clientSessionUser = null;
      clientSessionPromise = null;
      storeSessionUser(null);
      setUser(null);
      window.location.assign(`${NOMOS_URLS.id}/sign-in?returnTo=${encodeURIComponent(window.location.href)}`);
    }
  }

  if (!authChecked || !user) return <div className="grid min-h-dvh place-items-center bg-[var(--background)]" aria-busy="true"><p className="text-sm text-[var(--muted-foreground)]">Checking access…</p><NomosToastViewport /></div>;

  const compactMobileNavigation = navigation.length <= 5;

  return <div className={`min-h-dvh bg-[var(--card)] ${showNavigation ? "lg:grid lg:grid-cols-[96px_1fr]" : ""}`}>
    {showNavigation && <aside className="fixed inset-x-0 bottom-0 z-40 bg-[color-mix(in_srgb,var(--card)_95%,transparent)] px-1 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:inset-y-0 lg:left-0 lg:right-auto lg:w-24 lg:px-2 lg:pb-0">
      <div className="hidden h-18 place-items-center lg:grid"><Link href={homeUrl} aria-label="Nomos home">{logo}</Link></div>
      <nav aria-label="Primary navigation" tabIndex={compactMobileNavigation ? undefined : 0} className={`flex w-full flex-nowrap items-stretch overflow-x-auto overscroll-x-contain px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden lg:block lg:space-y-2 lg:overflow-visible lg:px-0 lg:pt-5 ${compactMobileNavigation ? "gap-0" : "gap-1"}`}>
        {navigation.map((item) => { const active = pathname.startsWith(`/${item.slug}`); const Icon = item.icon; return <Link key={item.slug} href={item.href} aria-current={active ? "page" : undefined} className={`group flex min-h-14 shrink-0 flex-col items-center justify-center gap-2 px-0.5 transition-colors lg:min-h-20 lg:w-full lg:gap-1.5 lg:px-1 lg:text-xs ${compactMobileNavigation ? "min-w-0 flex-1" : "w-16"} ${active ? "text-[var(--foreground)]" : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"}`}><span className={`grid size-9 place-items-center rounded-xl transition-all lg:size-10 ${active ? "bg-[var(--primary)] text-[var(--primary-foreground)]" : "group-hover:bg-[var(--accent)]"}`}><Icon className="size-5 lg:size-[22px]" strokeWidth={active ? 2.25 : 1.8} aria-hidden="true" /></span><span className="hidden max-w-full truncate text-center leading-tight lg:block">{item.label}</span></Link>; })}
      </nav>
    </aside>}
    <div className={`min-w-0 bg-[var(--card)] ${showNavigation ? "lg:col-start-2" : ""}`}>
      <header className="sticky top-0 z-30 flex h-[calc(4.5rem+env(safe-area-inset-top,0px))] items-center bg-[color-mix(in_srgb,var(--card)_90%,transparent)] pl-5 pr-4 pt-[env(safe-area-inset-top,0px)] backdrop-blur md:px-7">
        <h1 className="min-w-0 flex-1 truncate text-2xl font-semibold tracking-[-.02em] md:text-xl">{title}</h1>
        <div className="ml-auto flex shrink-0 items-center gap-2">
          <ThemeToggle />
          <DropdownMenu modal={false} open={launcherOpen} onOpenChange={(open) => { setLauncherOpen(open); if (!open) setLauncherQuery(""); }}><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="topnav-icon grid size-10 min-h-10 place-items-center rounded-full border-0 bg-transparent transition-none shadow-none hover:bg-[var(--accent)] focus-visible:!outline-none focus-visible:!ring-0" aria-label="Open app launcher"><WaffleIcon /></Button></DropdownMenuTrigger><DropdownMenuContent align="end" className="w-72 p-2"><DropdownMenuLabel className="flex items-center justify-between px-2 py-1.5"><span>Apps</span><kbd className="rounded border bg-[var(--background)] px-1.5 py-0.5 text-[10px] text-[var(--muted-foreground)]">Ctrl K</kbd></DropdownMenuLabel><div className="relative my-1"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--muted-foreground)]" /><input ref={launcherSearchRef} aria-label="Search apps" value={launcherQuery} onChange={(event) => setLauncherQuery(event.target.value)} placeholder="Search apps" className="h-10 w-full rounded-lg border bg-[var(--card)] pl-9 pr-3 text-sm outline-none" /></div><DropdownMenuSeparator /><div className="grid grid-cols-3 gap-1">{visibleApps.map((app) => { const Icon = app.icon ?? Blocks; return <DropdownMenuItem key={app.slug} onSelect={() => selectApp(app)} className="flex min-h-20 cursor-pointer flex-col items-center justify-center gap-2 text-xs"><Icon className="size-5" /><span>{app.label}</span></DropdownMenuItem>; })}</div></DropdownMenuContent></DropdownMenu>
          {authChecked && user && <DropdownMenu modal={false}><DropdownMenuTrigger asChild><button className="topnav-icon grid size-7 min-h-7 cursor-pointer place-items-center rounded-full border-0 shadow-none outline-none focus-visible:!outline-none" aria-label="Open profile menu"><Avatar className="size-7"><img src={profileImage || user.avatarUrl || "/pp.png"} alt={user.name} className="size-full object-cover" /><AvatarFallback>{user.name.slice(0, 2).toUpperCase()}</AvatarFallback></Avatar></button></DropdownMenuTrigger><DropdownMenuContent align="end" className="w-60"><DropdownMenuLabel><span className="block">{user.name}</span><span className="block truncate font-normal text-[var(--muted-foreground)]">{user.email}</span></DropdownMenuLabel><DropdownMenuSeparator /><DropdownMenuItem className="cursor-pointer" onSelect={() => void signOut()}><LogOut />Sign out</DropdownMenuItem></DropdownMenuContent></DropdownMenu>}
        </div>
      </header>
      <div className="flex min-w-0 items-start bg-[var(--card)]"><main id="main-content" className="min-h-[calc(100dvh-4.5rem)] min-w-0 flex-1 bg-[var(--background)] px-4 pb-[calc(6rem+env(safe-area-inset-bottom))] pt-7 md:px-7 lg:overflow-hidden lg:rounded-tl-3xl lg:pb-10">{children}</main>{assistantPage && assistantOpen && <><AssistantPanel page={assistantPage} contextStorageKey={assistantContextStorageKey} proposalStorageKey={assistantProposalStorageKey} width={400} onClose={() => setAssistantOpen(false)} /><AssistantPanel page={assistantPage} contextStorageKey={assistantContextStorageKey} proposalStorageKey={assistantProposalStorageKey} mobile onClose={() => setAssistantOpen(false)} /></>}</div>
    </div>
    {assistantPage && !assistantOpen && <><button onClick={() => setAssistantOpen(true)} className="fixed right-4 top-20 z-30 hidden size-10 place-items-center rounded-xl text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)] xl:grid" aria-label="Open AI agent" title="Open AI agent"><PanelRightOpen className="size-5" /></button><button onClick={() => setAssistantOpen(true)} className="fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom))] right-4 z-50 grid size-12 place-items-center rounded-full bg-[var(--primary)] text-[var(--primary-foreground)] shadow-[0_8px_24px_rgba(0,0,0,.28)] ring-4 ring-[color-mix(in_srgb,var(--background)_70%,transparent)] transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--ring)] xl:hidden" aria-label="Open AI agent" title="Open AI agent"><Sparkles className="size-5" /></button></>}
    <NomosToastViewport />
  </div>;
}
