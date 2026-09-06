import { Readable } from "node:stream";
import { onRequest } from "firebase-functions/v2/https";

const EXERCISE_MEDIA_HOST = "d2l9nsnmtah87f.cloudfront.net";
const forwardedResponseHeaders = ["accept-ranges", "cache-control", "content-length", "content-range", "content-type", "etag", "last-modified"];

function allowedExerciseMediaUrl(value: unknown): value is string {
  if (typeof value !== "string") return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.host === EXERCISE_MEDIA_HOST && url.pathname.startsWith("/exercise-assets/") && url.pathname.endsWith(".mp4");
  } catch {
    return false;
  }
}

/** Same-origin proxy for the public Hevy exercise videos. */
export const mediaApi = onRequest({ region: "europe-west2", cors: false, invoker: "public" }, async (req, res) => {
  if (req.method !== "GET" && req.method !== "HEAD") { res.status(405).send("Method not allowed"); return; }
  const url = typeof req.query.url === "string" ? req.query.url : undefined;
  if (!allowedExerciseMediaUrl(url)) { res.status(400).json({ error: "Invalid exercise media URL" }); return; }
  try {
    const headers: Record<string, string> = {};
    for (const name of ["range", "if-range", "if-none-match"]) {
      const value = req.header(name);
      if (value) headers[name] = value;
    }
    const upstream = await fetch(url, { method: req.method, headers, redirect: "error" });
    res.status(upstream.status);
    for (const name of forwardedResponseHeaders) {
      const value = upstream.headers.get(name);
      if (value) res.setHeader(name, value);
    }
    res.setHeader("content-disposition", "inline");
    res.setHeader("cache-control", "public, max-age=3600, s-maxage=86400");
    if (req.method === "HEAD" || !upstream.body) { res.end(); return; }
    Readable.fromWeb(upstream.body as Parameters<typeof Readable.fromWeb>[0]).pipe(res);
  } catch (error) {
    console.error(error);
    res.status(502).json({ error: "Exercise media is unavailable" });
  }
});
