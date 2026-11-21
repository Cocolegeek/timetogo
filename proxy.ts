import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

const PUBLIC_ROUTES = ["/login", "/auth/callback", "/join", "/consent", "/opengraph-image", "/twitter-image"];
const CONSENT_COOKIE = "gdpr_ok";
const ASSET = /\.(?:ico|png|jpe?g|svg|webp|json|txt|xml|js|css|woff2?|map)$/;
/** Refresh the session through Supabase only when the access token is about to expire. */
const REFRESH_MARGIN_S = 60;

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const AUTH_COOKIE = (() => {
  try {
    return `sb-${new URL(SUPABASE_URL).hostname.split(".")[0]}-auth-token`;
  } catch {
    return null;
  }
})();

function decodeBase64Url(value: string): string {
  const bin = atob(value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "="));
  return new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
}

/**
 * Reads the access token claims from the @supabase/ssr cookie (possibly split
 * into `.0`, `.1`… chunks) without any network call.
 * null = no session cookie; "unknown" = unreadable, let Supabase decide.
 */
function readSessionClaims(req: NextRequest): { sub: string; exp: number } | null | "unknown" {
  if (!AUTH_COOKIE) return "unknown";
  let raw = req.cookies.get(AUTH_COOKIE)?.value;
  if (!raw) {
    const chunks: string[] = [];
    for (let i = 0; ; i++) {
      const part = req.cookies.get(`${AUTH_COOKIE}.${i}`)?.value;
      if (!part) break;
      chunks.push(part);
    }
    if (chunks.length === 0) return null;
    raw = chunks.join("");
  }
  try {
    const session = JSON.parse(raw.startsWith("base64-") ? decodeBase64Url(raw.slice(7)) : raw);
    const claims = JSON.parse(decodeBase64Url(String(session.access_token).split(".")[1]));
    return typeof claims.sub === "string" && typeof claims.exp === "number" ? { sub: claims.sub, exp: claims.exp } : "unknown";
  } catch {
    return "unknown";
  }
}

export default async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Assets and API routes never need a session check here (API routes verify auth themselves).
  if (pathname.startsWith("/api/") || pathname.startsWith("/_next/") || ASSET.test(pathname)) {
    return NextResponse.next();
  }

  const isPublic = PUBLIC_ROUTES.some((r) => pathname.startsWith(r));
  let response = NextResponse.next({ request: req });
  let userId: string | null = null;

  // Routing only needs to know whether someone is signed in: data access is enforced by RLS.
  // A fresh token is trusted as is (no round-trip); an expiring or unreadable one goes through
  // Supabase, which also refreshes the session cookies.
  const local = readSessionClaims(req);
  if (local && local !== "unknown" && local.exp - REFRESH_MARGIN_S > Date.now() / 1000) {
    userId = local.sub;
  } else if (local) {
    const supabase = createServerClient(SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
      cookies: {
        getAll() {
          return req.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => req.cookies.set(name, value));
          response = NextResponse.next({ request: req });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    });
    try {
      const { data } = await supabase.auth.getClaims();
      userId = data?.claims?.sub ?? null;
    } catch {
      // Corrupted session cookie: treat as signed out (login will set a fresh one).
      userId = null;
    }
  }

  if (!isPublic && !userId) {
    const loginUrl = req.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("redirect_to", pathname + req.nextUrl.search);
    return NextResponse.redirect(loginUrl);
  }

  // Redirect logged-in users away from /login
  if (pathname === "/login" && userId) {
    const raw = req.nextUrl.searchParams.get("redirect_to");
    const redirectTo =
      raw && raw.startsWith("/") && !raw.startsWith("//") && !raw.startsWith("/\\")
        ? raw
        : "/trips";
    return NextResponse.redirect(new URL(redirectTo, req.nextUrl));
  }

  // RGPD: redirect authenticated users without consent to /consent
  // Skip /join so the share-link preview stays accessible (it doesn't read user data)
  if (userId && pathname !== "/consent" && pathname !== "/join") {
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
  // Static files and API routes skip the proxy entirely.
  matcher: ["/((?!_next/static|_next/image|api/|favicon.ico|sw\\.js|.*\\.(?:png|jpg|jpeg|svg|webp|ico|json|txt|xml|js|css|woff2?)$).*)"],
};
