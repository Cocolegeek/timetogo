import { createHmac } from "crypto";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const CONSENT_VERSION = "1.0";

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const secret = process.env.CONSENT_HMAC_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
  }

  const now = new Date().toISOString();
  const proof = createHmac("sha256", secret)
    .update(`${user.id}:${now}:${CONSENT_VERSION}`)
    .digest("hex");

  const { error } = await supabase
    .from("profiles")
    .update({
      gdpr_consented_at: now,
      gdpr_consent_version: CONSENT_VERSION,
      gdpr_consent_proof: proof,
    })
    .eq("id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set("gdpr_ok", "1", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365 * 10,
    path: "/",
  });
  return response;
}
