import { NextResponse, type NextRequest } from "next/server";

/**
 * Passes the pathname to server components as a header. payload-totp needs it
 * to avoid redirect loops between its setup/verify views.
 */
export function proxy(request: NextRequest) {
  const response = NextResponse.next();
  response.headers.append("x-pathname", request.nextUrl.pathname);
  return response;
}

export const config = { matcher: ["/admin/:path*"] };
