import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Allow only internal absolute paths: must start with "/" but not "//".
 * Anything else falls back to "/trips" to prevent open-redirect.
 */
function safeRedirectPath(raw: string | null): string {
  if (!raw) return "/trips";
  if (!raw.startsWith("/") || raw.startsWith("//") || raw.startsWith("/\\")) {
    return "/trips";
  }
  return raw;
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const redirectTo = safeRedirectPath(searchParams.get("redirect_to"));
  const errorCode = searchParams.get("error_code") ?? searchParams.get("error");

  // OAuth / identity-linking errors (e.g. identity_already_exists when a guest
  // links a Google account that already has its own Voyou account).
  if (errorCode) {
    const target = redirectTo.startsWith("/auth/link") ? "/auth/link" : "/login";
    return NextResponse.redirect(`${origin}${target}?error_code=${encodeURIComponent(errorCode)}`);
  }

  if (code) {
    const supabase = await createClient();
    await supabase.auth.exchangeCodeForSession(code);
  }

  return NextResponse.redirect(`${origin}${redirectTo}`);
}
