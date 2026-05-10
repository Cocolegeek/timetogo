import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

const PUBLIC_ROUTES = ["/login", "/auth/callback"];
const CONSENT_COOKIE = "gdpr_ok";

export default async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Allow join page without auth — user gets redirected to login with redirect_to param
  const isPublic =
    PUBLIC_ROUTES.some((r) => pathname.startsWith(r)) ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.match(/\.(ico|png|jpg|svg|webp|json|txt)$/);

  let response = NextResponse.next({ request: req });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => req.cookies.set(name, value));
          response = NextResponse.next({ request: req });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  if (!isPublic && !user) {
    const loginUrl = req.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("redirect_to", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Redirect logged-in users away from /login
  if (pathname === "/login" && user) {
    const redirectTo = req.nextUrl.searchParams.get("redirect_to") ?? "/trips";
    return NextResponse.redirect(new URL(redirectTo, req.nextUrl));
  }

  // RGPD: redirect authenticated users without consent to /consent
  if (user && pathname !== "/consent") {
    const hasConsent = req.cookies.get(CONSENT_COOKIE)?.value === "1";
    if (!hasConsent) {
      return NextResponse.redirect(new URL("/consent", req.nextUrl));
    }
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
