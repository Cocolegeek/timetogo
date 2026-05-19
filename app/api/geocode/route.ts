import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q");
  if (!q) return NextResponse.json({ error: "Missing q" }, { status: 400 });

  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=1&accept-language=fr`;
  const res = await fetch(url, {
    headers: { "User-Agent": "voyou/1.0 (contact: corentin.nicolas03@gmail.com)" },
  });
  if (!res.ok) return NextResponse.json({ error: "Geocoding failed" }, { status: 502 });

  const data = await res.json();
  if (!data[0]) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({
    lat: parseFloat(data[0].lat),
    lon: parseFloat(data[0].lon),
  });
}
