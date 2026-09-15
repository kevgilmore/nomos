import { NextRequest, NextResponse } from "next/server";
import { buildLocalSignInUrlForRequest, createPreviewSession, LOCAL_SESSION_COOKIES, validateLocalReturnTo, verifyPreviewSession, type SessionUser } from "@nomos/auth";

export async function middleware(request: NextRequest) {
  const cookieName = LOCAL_SESSION_COOKIES.goals;
  const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim() || request.headers.get("host") || request.nextUrl.host;
  const hostname = new URL(`http://${forwardedHost}`).hostname;
  const loopback = ["localhost", "127.0.0.1", "0.0.0.0"].includes(hostname);
  const previewSecret = process.env.NOMOS_PREVIEW_SESSION_SECRET ?? "";
  const configuredPreview = process.env.NEXT_PUBLIC_NOMOS_PREVIEW_ORIGIN;
  const preview = !!previewSecret && !!configuredPreview && new URL(configuredPreview).hostname === hostname;
  const requestPath = request.nextUrl.pathname.replace(/\/+$/, "") || "/";

  if (preview && requestPath === "/api/auth/session") {
    if (request.method === "GET") {
      const user = await verifyPreviewSession(request.cookies.get(cookieName)?.value, previewSecret);
      return user ? NextResponse.json({ user }, { headers: { "cache-control": "no-store" } }) : NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }
    if (request.method === "POST") {
      const body = await request.json().catch(() => null) as { handoffCode?: unknown; returnTo?: unknown } | null;
      if (typeof body?.handoffCode !== "string" || typeof body.returnTo !== "string" || !validateLocalReturnTo(body.returnTo) || new URL(body.returnTo).origin !== new URL(configuredPreview).origin) return NextResponse.json({ error: "Invalid sign-in handoff" }, { status: 400 });
      const identityOrigin = process.env.NEXT_PUBLIC_NOMOS_ID_URL ?? "https://id.nomos.codes";
      const exchange = await fetch(`${identityOrigin}/api/auth/handoff`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body), cache: "no-store" });
      const result = await exchange.json().catch(() => null) as { user?: SessionUser; error?: string } | null;
      if (!exchange.ok || !result?.user) return NextResponse.json({ error: result?.error ?? "Sign-in handoff failed" }, { status: exchange.status || 502 });
      const response = NextResponse.json({ user: result.user }, { headers: { "cache-control": "no-store" } });
      response.cookies.set(cookieName, await createPreviewSession(result.user, previewSecret), { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 604800 });
      return response;
    }
  }
  if (preview && requestPath === "/api/auth/sign-out" && request.method === "POST") {
    const response = new NextResponse(null, { status: 204 });
    response.cookies.set(cookieName, "", { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 0 });
    return response;
  }

  // Preview pages are a client-rendered shell with browser-local data. Let the
  // shell reuse its authenticated user across Next.js route transitions; API
  // requests still pass through the signed preview-session checks below.
  if (preview && !requestPath.startsWith("/api/")) return NextResponse.next();

  if (loopback && request.cookies.has(cookieName)) return NextResponse.next();
  if (preview && await verifyPreviewSession(request.cookies.get(cookieName)?.value, previewSecret)) return NextResponse.next();
  const callbackCode = request.nextUrl.searchParams.get("nomosAuthHandoff");
  if (preview && callbackCode) return NextResponse.next();
  return NextResponse.redirect(buildLocalSignInUrlForRequest(request.nextUrl.pathname, request.nextUrl.search, Number(process.env.NOMOS_APP_PORT) || 3006));
}
export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"] };
