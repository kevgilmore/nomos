import { readFile } from "node:fs/promises";
import path from "node:path";
import { onRequest } from "firebase-functions/v2/https";
import { approvedEmails, approvedSessionUser } from "./auth.js";

const contentTypes: Record<string, string> = {
  ".css": "text/css; charset=utf-8", ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg", ".webp": "image/webp", ".ico": "image/x-icon", ".woff2": "font/woff2", ".txt": "text/plain; charset=utf-8",
};

function siteForHost(hostname: string) {
  if (hostname === "fitness.nomos.codes") return "fitness";
  if (["nomos.codes", "www.nomos.codes"].includes(hostname)) return "home";
  return null;
}

function requestedFile(urlPath: string) {
  const decoded = decodeURIComponent(urlPath.split("?")[0] || "/");
  const relative = decoded.replace(/^\/+/, "");
  if (relative.split("/").includes("..")) return null;
  return relative.endsWith("/") || !path.extname(relative) ? path.join(relative, "index.html") : relative;
}

export const authGate = onRequest({ region: "europe-west2", secrets: ["NOMOS_APPROVED_EMAILS"], invoker: "public" }, async (req, res) => {
  const site = siteForHost(req.hostname);
  if (!site) { res.status(404).send("Not found"); return; }
  if (!(await approvedSessionUser(req))) {
    const returnTo = `https://${req.hostname}${req.originalUrl}`;
    res.redirect(302, `https://id.nomos.codes/sign-in?returnTo=${encodeURIComponent(returnTo)}`);
    return;
  }
  const file = requestedFile(req.path);
  if (!file) { res.status(400).send("Bad request"); return; }
  try {
    const body = await readFile(path.join(process.cwd(), "site", site, file));
    res.set("Content-Type", contentTypes[path.extname(file).toLowerCase()] ?? "application/octet-stream");
    res.set("Cache-Control", file.endsWith(".html") ? "no-store" : "public,max-age=31536000,immutable");
    res.status(200).send(body);
  } catch { res.status(404).send("Not found"); }
});
