import { LOCAL_DEV_USER, getLocalSessionCookie } from "@nomos/auth";
import { handleLocalAiRequest } from "@nomos/ai/local";
import { NextRequest, NextResponse } from "next/server";

async function handle(request: NextRequest) {
  if (!request.cookies.get(getLocalSessionCookie("time"))?.value) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  const body = request.method === "GET" || request.method === "DELETE" ? undefined : await request.json().catch(() => undefined);
  const result = await handleLocalAiRequest({ method: request.method, path: request.nextUrl.pathname.replace(/^\/api\/ai/, "") || "/", userId: LOCAL_DEV_USER.id, appId: request.nextUrl.searchParams.get("appId") || (typeof body?.appId === "string" ? body.appId : undefined), body });
  return result.status === 204 ? new NextResponse(null, { status: 204 }) : NextResponse.json(result.body, { status: result.status });
}

export const GET = handle;
export const POST = handle;
export const DELETE = handle;
