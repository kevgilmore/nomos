import { getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { defineSecret } from "firebase-functions/params";

export const approvedEmails = defineSecret("NOMOS_APPROVED_EMAILS");

function adminAuth() {
  if (!getApps().length) initializeApp();
  return getAuth();
}

export async function isApprovedRequest(req: { headers: { cookie?: string } }) {
  const session = req.headers.cookie?.split(";").map((part) => part.trim()).find((part) => part.startsWith("__session="))?.slice("__session=".length);
  if (!session) return false;
  try {
    const decoded = await adminAuth().verifySessionCookie(session, true);
    const allowed = approvedEmails.value().split(",").map((value) => value.trim().toLowerCase()).filter(Boolean);
    return decoded.email_verified === true && !!decoded.email && allowed.includes(decoded.email.toLowerCase());
  } catch {
    return false;
  }
}
