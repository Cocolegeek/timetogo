import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { errorRedirectUrl, safeRedirectPath } from "@/lib/auth/redirect";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const redirectTo = safeRedirectPath(searchParams.get("redirect_to"));
  const errorCode = searchParams.get("error_code") ?? searchParams.get("error");

  // OAuth / identity-linking errors (e.g. identity_already_exists when a guest
  // links a Google account that already has its own Voyou account).
  if (errorCode) {
    return NextResponse.redirect(errorRedirectUrl(origin, redirectTo, errorCode));
  }

  if (code) {
    const supabase = await createClient();
    await supabase.auth.exchangeCodeForSession(code);
  }

  return NextResponse.redirect(`${origin}${redirectTo}`);
}
