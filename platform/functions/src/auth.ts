import { getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getAdminFirestore } from "./db.js";
import { defineSecret } from "firebase-functions/params";
import { defineString } from "firebase-functions/params";
import { onRequest } from "firebase-functions/v2/https";
import { randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";
import nodePath from "node:path";

export const approvedEmails: ReturnType<typeof defineSecret> = defineSecret("NOMOS_APPROVED_EMAILS");
const previewOrigin = defineString("NOMOS_PREVIEW_ORIGIN", { default: "https://abby-superinclusive-tyesha.ngrok-free.dev" });
// Firebase Hosting forwards only the reserved __session cookie to rewritten
// Cloud Functions. Keep the production session on that cookie name so auth
// survives the ID -> Home/Fitness Hosting transition.
const SESSION_COOKIE = "__session";
const SESSION_DAYS = 5;

function adminAuth() { if (!getApps().length) initializeApp(); return getAuth(); }

function allowedUser(decoded: { uid: string; email?: string; email_verified?: boolean }) {
  const emails = approvedEmails.value().split(",").map((value) => value.trim().toLowerCase()).filter(Boolean);
  return emails.length > 0 && decoded.email_verified === true && !!decoded.email && emails.includes(decoded.email.toLowerCase());
}

export async function isApprovedRequest(req: { headers: { cookie?: string } }) {
  const cookieHeader = req.headers.cookie ?? "";
  const session = cookieHeader.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${SESSION_COOKIE}=`))?.slice(SESSION_COOKIE.length + 1);
  if (!session) return false;
  try { return allowedUser(await adminAuth().verifySessionCookie(session, true)); } catch { return false; }
}

export async function approvedSessionUser(req: { headers: { cookie?: string } }) {
  const cookieHeader = req.headers.cookie ?? "";
  const session = cookieHeader.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${SESSION_COOKIE}=`))?.slice(SESSION_COOKIE.length + 1);
  if (!session) return null;
  try {
    const decoded = await adminAuth().verifySessionCookie(session, true);
    if (!allowedUser(decoded)) return null;
    return { id: decoded.uid, name: decoded.name ?? "Nomos user", email: decoded.email ?? "", avatarUrl: decoded.picture };
  } catch { return null; }
}

function parsedReturnTo(value: unknown) {
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value);
    const allowed = new Set([
      "https://nomos.codes",
      "https://base.nomos.codes",
      "https://fitness.nomos.codes",
      "https://finance.nomos.codes",
      "https://goals.nomos.codes",
      "https://time.nomos.codes",
      "https://template.nomos.codes",
      "http://localhost:3000",
      "http://localhost:3002",
      "http://localhost:3003",
      "http://localhost:3004",
      "http://localhost:3005",
      "http://localhost:3006",
      "http://localhost:3007",
    ]);
    const configuredPreview = previewOrigin.value().replace(/\/$/, "");
    return (allowed.has(url.origin)
      || (url.protocol === "https:" && (url.hostname === "nomos.codes" || url.hostname.endsWith(".nomos.codes")))
      || (!!configuredPreview && url.origin === configuredPreview)) ? url : null;
  } catch { return null; }
}

function allowedReturnTo(value: unknown) { return parsedReturnTo(value)?.toString() ?? null; }

function isPreviewReturnTo(value: string) {
  const configuredPreview = previewOrigin.value().replace(/\/$/, "");
  return !!configuredPreview && new URL(value).origin === configuredPreview;
}

function sessionCookieOptions(req: { hostname?: string }) {
  return { maxAge: SESSION_DAYS * 24 * 60 * 60 * 1000, httpOnly: true, secure: true, sameSite: "none" as const, domain: ".nomos.codes", path: "/" };
}

export const authApi = onRequest({ region: "europe-west2", secrets: ["NOMOS_APPROVED_EMAILS"], cors: false, invoker: "public" }, async (req, res) => {
  const path = req.path.replace(/^\/api\/auth/, "") || "/";
  if (req.method === "GET" && path === "/profile-image") {
    if (!await approvedSessionUser(req)) { res.status(401).send("Authentication required"); return; }
    res.set("Cache-Control", "private, no-store");
    res.type("png").send(readFileSync(nodePath.join(__dirname, "..", "assets", "pp.png")));
    return;
  }
  if (req.method === "POST" && path === "/continue") {
    const user = await approvedSessionUser(req);
    const safeReturnTo = allowedReturnTo((req.body as { returnTo?: unknown }).returnTo);
    if (!user) { res.status(401).json({ error: "Authentication required" }); return; }
    if (!safeReturnTo) { res.status(400).json({ error: "Invalid sign-in request" }); return; }
    if (isPreviewReturnTo(safeReturnTo)) {
      const code = randomBytes(32).toString("base64url");
      await getAdminFirestore().collection("authHandoffs").doc(code).set({ user, returnTo: safeReturnTo, expiresAt: Date.now() + 60_000, consumed: false, createdAt: Date.now() });
      const destination = new URL(safeReturnTo);
      destination.searchParams.set("nomosAuthHandoff", code);
      res.set("Cache-Control", "no-store");
      res.json({ redirectTo: destination.toString() });
      return;
    }
    res.json({ redirectTo: safeReturnTo });
    return;
  }
  if (req.method === "POST" && path === "/handoff") {
    const { handoffCode, returnTo } = req.body as { handoffCode?: unknown; returnTo?: unknown };
    const safeReturnTo = allowedReturnTo(returnTo);
    if (typeof handoffCode !== "string" || !safeReturnTo || !isPreviewReturnTo(safeReturnTo)) {
      res.status(400).json({ error: "Invalid sign-in handoff" }); return;
    }
    try {
      const handoffRef = getAdminFirestore().collection("authHandoffs").doc(handoffCode);
      const handoff = await getAdminFirestore().runTransaction(async (transaction) => {
        const snapshot = await transaction.get(handoffRef);
        const data = snapshot.data() as { user?: unknown; returnTo?: unknown; expiresAt?: unknown; consumed?: unknown } | undefined;
        if (!snapshot.exists || data?.consumed || data?.returnTo !== safeReturnTo || typeof data?.expiresAt !== "number" || data.expiresAt < Date.now() || !data.user) return null;
        transaction.update(handoffRef, { consumed: true, consumedAt: Date.now() });
        return data.user;
      });
      if (!handoff) { res.status(400).json({ error: "Invalid or expired sign-in handoff" }); return; }
      res.set("Cache-Control", "no-store");
      res.json({ user: handoff });
    } catch (error) {
      console.error(error);
      res.status(502).json({ error: "Sign-in handoff failed" });
    }
    return;
  }
  if (req.method === "POST" && path === "/sign-out") {
    res.clearCookie(SESSION_COOKIE, { httpOnly: true, secure: true, sameSite: "none", domain: ".nomos.codes", path: "/" });
    res.status(204).send();
    return;
  }
  if (req.method === "GET" && path === "/session") {
    const user = await approvedSessionUser(req);
    res.set("Cache-Control", "no-store");
    if (!user) { res.status(401).json({ error: "Authentication required" }); return; }
    res.json({ user });
    return;
  }
  if (req.method !== "POST" || path !== "/session") { res.status(404).json({ error: "Not found" }); return; }
  const origin = req.get("origin");
  if (!origin || !(new Set([
    "https://id.nomos.codes",
    "https://nomos.codes",
    "https://base.nomos.codes",
    "https://fitness.nomos.codes",
    "https://finance.nomos.codes",
    "https://goals.nomos.codes",
    "https://time.nomos.codes",
    "https://template.nomos.codes",
  ]).has(origin) || (origin.startsWith("https://") && origin.endsWith(".nomos.codes")))) { res.status(403).json({ error: "Origin not allowed" }); return; }
  const { idToken, returnTo } = req.body as { idToken?: unknown; returnTo?: unknown };
  const safeReturnTo = allowedReturnTo(returnTo);
  const handoffCode = (req.body as { handoffCode?: unknown }).handoffCode;
  if (!safeReturnTo) { res.status(400).json({ error: "Invalid sign-in request" }); return; }
  if (typeof handoffCode === "string") {
    try {
      const handoffRef = getAdminFirestore().collection("authHandoffs").doc(handoffCode);
      const handoff = await getAdminFirestore().runTransaction(async (transaction) => {
        const snapshot = await transaction.get(handoffRef);
        const data = snapshot.data() as { sessionCookie?: unknown; returnTo?: unknown; expiresAt?: unknown; consumed?: unknown } | undefined;
        if (!snapshot.exists || data?.consumed || typeof data?.sessionCookie !== "string" || data?.returnTo !== safeReturnTo || typeof data?.expiresAt !== "number" || (data?.expiresAt ?? 0) < Date.now()) return null;
        transaction.update(handoffRef, { consumed: true, consumedAt: Date.now() });
        return data;
      });
      if (!handoff) { res.status(400).json({ error: "Invalid or expired sign-in handoff" }); return; }
      res.cookie(SESSION_COOKIE, handoff.sessionCookie, sessionCookieOptions(req));
      res.json({ ok: true });
    } catch (error) {
      console.error(error);
      res.status(502).json({ error: "Sign-in handoff failed" });
    }
    return;
  }
  if (typeof idToken !== "string") { res.status(400).json({ error: "Invalid sign-in request" }); return; }
  try {
    const decoded = await adminAuth().verifyIdToken(idToken, true);
    if (!allowedUser(decoded)) { res.status(403).json({ error: "Account is not approved" }); return; }
    const account = await adminAuth().getUser(decoded.uid);
    await adminAuth().setCustomUserClaims(decoded.uid, { ...account.customClaims, nomosApproved: true });
    const sessionCookie = await adminAuth().createSessionCookie(idToken, { expiresIn: SESSION_DAYS * 24 * 60 * 60 * 1000 });
    if (isPreviewReturnTo(safeReturnTo)) {
      const code = randomBytes(32).toString("base64url");
      const user = { id: decoded.uid, name: decoded.name ?? "Nomos user", email: decoded.email ?? "", avatarUrl: decoded.picture };
      await getAdminFirestore().collection("authHandoffs").doc(code).set({ user, returnTo: safeReturnTo, expiresAt: Date.now() + 60_000, consumed: false, createdAt: Date.now() });
      const destination = new URL(safeReturnTo);
      destination.searchParams.set("nomosAuthHandoff", code);
      res.set("Cache-Control", "no-store");
      res.json({ redirectTo: destination.toString() });
      return;
    }
    res.cookie(SESSION_COOKIE, sessionCookie, sessionCookieOptions(req));
    res.json({ redirectTo: safeReturnTo });
  } catch { res.status(401).json({ error: "Invalid identity token" }); }
});
