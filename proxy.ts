import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

const PUBLIC_ROUTES = ["/login", "/auth/callback", "/join", "/consent"];
const CONSENT_COOKIE = "gdpr_ok";

export default async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Allow join page without auth — user gets redirected to login with redirect_to param
  const isPublic =
    PUBLIC_ROUTES.some((r) => pathname.startsWith(r)) ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname === "/sw.js" ||
    pathname.match(/\.(ico|png|jpg|svg|webp|json|txt|xml|js)$/);

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
    loginUrl.searchParams.set("redirect_to", pathname + req.nextUrl.search);
    return NextResponse.redirect(loginUrl);
  }

  // Redirect logged-in users away from /login
  if (pathname === "/login" && user) {
    const raw = req.nextUrl.searchParams.get("redirect_to");
    const redirectTo =
      raw && raw.startsWith("/") && !raw.startsWith("//") && !raw.startsWith("/\\")
        ? raw
        : "/trips";
    return NextResponse.redirect(new URL(redirectTo, req.nextUrl));
  }

  // RGPD: redirect authenticated users without consent to /consent
  // Skip /join so the share-link preview stays accessible (it doesn't read user data)
  if (
    user &&
    pathname !== "/consent" &&
    pathname !== "/join" &&
    !pathname.startsWith("/api/")
  ) {
    const hasConsent = req.cookies.get(CONSENT_COOKIE)?.value === "1";
    if (!hasConsent) {
      const consentUrl = new URL("/consent", req.nextUrl);
      consentUrl.searchParams.set("redirect_to", pathname + req.nextUrl.search);
      return NextResponse.redirect(consentUrl);
    }
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|sw\\.js).*)"],
};
