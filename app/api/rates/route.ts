import { NextResponse } from "next/server";

const CODE = /^[A-Z]{3}$/;

/** GET ?from=USD&to=EUR → { rate } (taux de référence BCE, mis en cache 12 h). */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const from = (searchParams.get("from") ?? "").toUpperCase();
  const to = (searchParams.get("to") ?? "").toUpperCase();
  if (!CODE.test(from) || !CODE.test(to)) {
    return NextResponse.json({ error: "Invalid currency" }, { status: 400 });
  }
  if (from === to) return NextResponse.json({ rate: 1 });

  try {
    const res = await fetch(`https://api.frankfurter.dev/v1/latest?base=${from}&symbols=${to}`, {
      next: { revalidate: 60 * 60 * 12 },
    });
    if (!res.ok) return NextResponse.json({ error: "Rate unavailable" }, { status: 502 });
    const data = (await res.json()) as { rates?: Record<string, number> };
    const rate = data.rates?.[to];
    if (typeof rate !== "number" || !(rate > 0)) {
      return NextResponse.json({ error: "Rate unavailable" }, { status: 502 });
    }
    return NextResponse.json({ rate });
  } catch {
    return NextResponse.json({ error: "Rate unavailable" }, { status: 502 });
  }
}
