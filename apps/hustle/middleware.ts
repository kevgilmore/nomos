import { NextRequest, NextResponse } from "next/server";
import { buildLocalSignInUrlForRequest, getLocalSessionCookie } from "@nomos/auth";
export function middleware(request: NextRequest) { if (request.cookies.has(getLocalSessionCookie("hustle")) || request.cookies.has("nomos_local_session")) return NextResponse.next(); return NextResponse.redirect(buildLocalSignInUrlForRequest(request.nextUrl.pathname, request.nextUrl.search, Number(process.env.NOMOS_APP_PORT) || 3009)); }
export const config = { matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico).*)"] };
