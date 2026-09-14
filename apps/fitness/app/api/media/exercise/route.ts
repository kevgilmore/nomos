import { NextRequest, NextResponse } from "next/server";
import { isAllowedExerciseMediaUrl } from "@/lib/media";

export const dynamic = "force-dynamic";
const forwardedRequestHeaders = ["range", "if-range", "if-none-match"];
const forwardedResponseHeaders = ["accept-ranges", "cache-control", "content-length", "content-range", "content-type", "etag", "last-modified"];

async function proxy(request: NextRequest) {
  const url = request.nextUrl.searchParams.get("url");
  if (!isAllowedExerciseMediaUrl(url)) return NextResponse.json({ error: "Invalid exercise media URL" }, { status: 400 });

  const headers = new Headers();
  for (const name of forwardedRequestHeaders) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }
  try {
    const upstream = await fetch(url, { method: request.method, headers, redirect: "error", cache: "no-store" });
    const responseHeaders = new Headers();
    for (const name of forwardedResponseHeaders) {
      const value = upstream.headers.get(name);
      if (value) responseHeaders.set(name, value);
    }
    responseHeaders.set("content-disposition", "inline");
    responseHeaders.set("cache-control", "public, max-age=3600, s-maxage=86400");
    return new NextResponse(request.method === "HEAD" ? null : upstream.body, { status: upstream.status, headers: responseHeaders });
  } catch {
    return NextResponse.json({ error: "Exercise media is unavailable" }, { status: 502 });
  }
}

export const GET = proxy;
export const HEAD = proxy;
