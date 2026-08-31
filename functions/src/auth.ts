import { getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { defineSecret } from "firebase-functions/params";
import { onRequest } from "firebase-functions/v2/https";

export const approvedEmails = defineSecret("NOMOS_APPROVED_EMAILS");
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

function allowedReturnTo(value: unknown) {
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value);
    const allowed = new Set(["https://nomos.codes", "https://base.nomos.codes", "https://fitness.nomos.codes", "http://localhost:3000", "http://localhost:3002", "http://localhost:3003"]);
    return allowed.has(url.origin) ? url.toString() : null;
  } catch { return null; }
}

export const authApi = onRequest({ region: "europe-west2", secrets: [approvedEmails], cors: false, invoker: "public" }, async (req, res) => {
  const path = req.path.replace(/^\/api\/auth/, "") || "/";
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
  if (!origin || !new Set(["https://id.nomos.codes", "https://nomos-id.web.app", "https://nomos.codes", "https://base.nomos.codes", "https://fitness.nomos.codes"]).has(origin)) { res.status(403).json({ error: "Origin not allowed" }); return; }
  const { idToken, returnTo } = req.body as { idToken?: unknown; returnTo?: unknown };
  const safeReturnTo = allowedReturnTo(returnTo);
  if (typeof idToken !== "string" || !safeReturnTo) { res.status(400).json({ error: "Invalid sign-in request" }); return; }
  try {
    const decoded = await adminAuth().verifyIdToken(idToken, true);
    if (!allowedUser(decoded)) { res.status(403).json({ error: "Account is not approved" }); return; }
    const account = await adminAuth().getUser(decoded.uid);
    await adminAuth().setCustomUserClaims(decoded.uid, { ...account.customClaims, nomosApproved: true });
    const sessionCookie = await adminAuth().createSessionCookie(idToken, { expiresIn: SESSION_DAYS * 24 * 60 * 60 * 1000 });
    res.cookie(SESSION_COOKIE, sessionCookie, { maxAge: SESSION_DAYS * 24 * 60 * 60 * 1000, httpOnly: true, secure: true, sameSite: "none", domain: ".nomos.codes", path: "/" });
    res.json({ redirectTo: safeReturnTo });
  } catch { res.status(401).json({ error: "Invalid identity token" }); }
});
