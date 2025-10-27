import { NextRequest, NextResponse } from "next/server";

// Routes that don't require authentication
const publicRoutes = ["/"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public routes
  if (publicRoutes.includes(pathname)) {
    return NextResponse.next();
  }

  // For protected routes, check if tenant ID exists
  const tenantId = request.cookies.get("tenantId")?.value;

  if (!tenantId && !publicRoutes.includes(pathname)) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
