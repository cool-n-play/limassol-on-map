export type Pharmacy = {
  id: string;
  name: string;
  name_el?: string | null;
  name_en?: string | null;
  lat: number;
  lng: number;
  address?: string | null;
  phone?: string | null;
  opening_hours?: string | null;
  on_duty_dates?: string[];
  /** From API isOpenAt — the "open" filter uses this flag only */
  open?: boolean;
  /** duty | hours | holiday | closed */
  open_reason?: "duty" | "hours" | "holiday" | "closed" | string;
  distance_km?: number;
  source?: string;
};

export type PharmaciesResponse = {
  ok: boolean;
  at: string;
  timezone: string;
  bbox?: { south: number; west: number; north: number; east: number };
  counts: { total: number; open: number };
  pharmacies: Pharmacy[];
  error?: string;
};

export type LatLng = { lat: number; lng: number };
export type RouteMode = "foot" | "car";
