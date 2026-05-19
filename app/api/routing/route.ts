import { NextResponse } from "next/server";

const OSRM_PROFILES: Record<string, string> = {
  car: "driving",
  foot: "walking",
  bike: "cycling",
};

async function geocode(address: string): Promise<[number, number] | null> {
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1&accept-language=fr`;
  const res = await fetch(url, {
    headers: { "User-Agent": "time-to-go/1.0" },
  });
  if (!res.ok) return null;
  const data = await res.json();
  if (!data[0]) return null;
  return [parseFloat(data[0].lon), parseFloat(data[0].lat)];
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const mode = searchParams.get("mode") ?? "car";

  if (!from || !to) {
    return NextResponse.json({ error: "Paramètres manquants" }, { status: 400 });
  }

  const osrmProfile = OSRM_PROFILES[mode];
  if (!osrmProfile) {
    return NextResponse.json({ error: "Mode non supporté pour le calcul automatique" }, { status: 400 });
  }

  const [fromCoords, toCoords] = await Promise.all([geocode(from), geocode(to)]);

  if (!fromCoords) {
    return NextResponse.json({ error: `Lieu de départ introuvable : ${from}` }, { status: 404 });
  }
  if (!toCoords) {
    return NextResponse.json({ error: `Lieu d'arrivée introuvable : ${to}` }, { status: 404 });
  }

  const osrmUrl = `https://router.project-osrm.org/route/v1/${osrmProfile}/${fromCoords[0]},${fromCoords[1]};${toCoords[0]},${toCoords[1]}?overview=false`;

  const osrmRes = await fetch(osrmUrl);
  if (!osrmRes.ok) {
    return NextResponse.json({ error: "Erreur du service de routing" }, { status: 502 });
  }

  const data = await osrmRes.json();
  if (data.code !== "Ok" || !data.routes?.[0]) {
    return NextResponse.json({ error: "Trajet introuvable entre ces deux points" }, { status: 404 });
  }

  return NextResponse.json({
    durationMinutes: Math.round(data.routes[0].duration / 60),
    distanceKm: Math.round(data.routes[0].distance / 100) / 10,
  });
}
