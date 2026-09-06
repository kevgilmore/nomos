import { NextRequest, NextResponse } from "next/server";
import { buildLocalSignInUrlForRequest, LOCAL_SESSION_COOKIES } from "@nomos/auth";
export function middleware(request: NextRequest) { if (request.cookies.has(LOCAL_SESSION_COOKIES.finance)) return NextResponse.next(); return NextResponse.redirect(buildLocalSignInUrlForRequest(request.nextUrl.pathname, request.nextUrl.search, Number(process.env.NOMOS_APP_PORT) || 3005)); }
export const config = { matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico).*)"] };
