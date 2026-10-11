import type { LatLng, PharmaciesResponse } from "./types";

export async function fetchPharmacies(
  at: Date,
  here?: LatLng | null
): Promise<PharmaciesResponse> {
  const q = new URLSearchParams({ at: at.toISOString() });
  if (here) {
    q.set("lat", String(here.lat));
    q.set("lng", String(here.lng));
  }
  const res = await fetch(`/api/pharmacies?${q.toString()}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

/** OSRM public demo — fine for MVP; replace with a private instance or GraphHopper later */
export async function fetchOsrmRoute(
  from: LatLng,
  to: LatLng,
  mode: "foot" | "car"
): Promise<[number, number][]> {
  const profile = mode === "foot" ? "foot" : "driving";
  const url =
    `https://router.project-osrm.org/route/v1/${profile}/` +
    `${from.lng},${from.lat};${to.lng},${to.lat}?overview=full&geometries=geojson`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`OSRM ${res.status}`);
  const data = await res.json();
  const coords: [number, number][] = data?.routes?.[0]?.geometry?.coordinates ?? [];
  // GeoJSON = [lng, lat] → Leaflet [lat, lng]
  return coords.map(([lng, lat]) => [lat, lng]);
}
