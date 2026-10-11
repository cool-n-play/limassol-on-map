import { useEffect, useMemo } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  useMapEvents,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import type { Lang } from "../i18n";
import { t } from "../i18n";
import type { LatLng, Pharmacy } from "../lib/types";
import { navigatorLinks } from "../lib/navLinks";

const pharmacyIcon = new L.Icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const hereIcon = new L.DivIcon({
  className: "",
  html: `<div style="width:16px;height:16px;border-radius:50%;background:#3d8bfd;border:3px solid #fff;box-shadow:0 0 0 2px #3d8bfd88"></div>`,
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

function MapClick({
  enabled,
  onPick,
}: {
  enabled: boolean;
  onPick: (p: LatLng) => void;
}) {
  useMapEvents({
    click(e) {
      if (!enabled) return;
      onPick({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });
  return null;
}

function FitBounds({ points }: { points: LatLng[] }) {
  const map = useMap();
  useEffect(() => {
    if (points.length < 2) return;
    const b = L.latLngBounds(points.map((p) => [p.lat, p.lng] as [number, number]));
    map.fitBounds(b, { padding: [40, 40], maxZoom: 15 });
  }, [map, points]);
  return null;
}

function pharmacyLabel(p: Pharmacy, lang: Lang): string {
  if (lang === "el" && p.name_el) return p.name_el;
  if (lang === "en" && p.name_en) return p.name_en;
  return p.name;
}

/** Brief API open_reason for popup: duty / hours / holiday / closed */
function openReasonLabel(reason: string | undefined, lang: Lang): string {
  switch (reason) {
    case "duty":
      return t(lang, "reasonDuty");
    case "hours":
      return t(lang, "reasonHours");
    case "holiday":
      return t(lang, "reasonHoliday");
    case "closed":
      return t(lang, "reasonClosed");
    default:
      return reason ? reason : t(lang, "reasonClosed");
  }
}

type Props = {
  lang: Lang;
  pharmacies: Pharmacy[];
  here: LatLng | null;
  pinMode: boolean;
  onPickHere: (p: LatLng) => void;
  routeLine: [number, number][] | null;
  focus?: LatLng | null;
};

export default function MapView({
  lang,
  pharmacies,
  here,
  pinMode,
  onPickHere,
  routeLine,
  focus,
}: Props) {
  const center = useMemo<[number, number]>(
    () => [here?.lat ?? 34.685, here?.lng ?? 33.04],
    [here]
  );

  const fitPts = useMemo(() => {
    const pts: LatLng[] = [];
    if (here) pts.push(here);
    if (focus) pts.push(focus);
    return pts;
  }, [here, focus]);

  return (
    <MapContainer center={center} zoom={13} scrollWheelZoom className="map">
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <MapClick enabled={pinMode} onPick={onPickHere} />
      <FitBounds points={fitPts} />
      {here && (
        <Marker position={[here.lat, here.lng]} icon={hereIcon}>
          <Popup>{t(lang, "meHere")}</Popup>
        </Marker>
      )}
      {pharmacies.map((p) => (
        <Marker key={p.id} position={[p.lat, p.lng]} icon={pharmacyIcon}>
          <Popup>
            <div className="popup">
              <h3>{pharmacyLabel(p, lang)}</h3>
              <p>
                {p.open ? t(lang, "open") : t(lang, "closed")}
                {` · ${openReasonLabel(p.open_reason, lang)}`}
                {p.distance_km != null ? ` · ${p.distance_km.toFixed(2)} km` : ""}
              </p>
              {p.address && (
                <p>
                  {t(lang, "address")}: {p.address}
                </p>
              )}
              {p.phone && (
                <p>
                  {t(lang, "phone")}: {p.phone}
                </p>
              )}
              {p.opening_hours && <p>{p.opening_hours}</p>}
              <div className="nav-links" aria-label={t(lang, "navigate")}>
                {navigatorLinks({ lat: p.lat, lng: p.lng }, pharmacyLabel(p, lang)).map(
                  (link) => (
                    <a key={link.id} href={link.href} target="_blank" rel="noreferrer">
                      {link.label}
                    </a>
                  )
                )}
              </div>
            </div>
          </Popup>
        </Marker>
      ))}
      {routeLine && routeLine.length > 1 && (
        <Polyline positions={routeLine} pathOptions={{ color: "#2bb673", weight: 5 }} />
      )}
    </MapContainer>
  );
}
