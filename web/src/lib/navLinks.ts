import type { LatLng } from "./types";

export type NavLink = { id: string; label: string; href: string };

export function navigatorLinks(point: LatLng, label: string): NavLink[] {
  const { lat, lng } = point;
  const q = encodeURIComponent(label || `${lat},${lng}`);
  return [
    {
      id: "google",
      label: "Google",
      href: `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`,
    },
    {
      id: "waze",
      label: "Waze",
      href: `https://waze.com/ul?ll=${lat},${lng}&navigate=yes`,
    },
    {
      id: "apple",
      label: "Apple",
      href: `https://maps.apple.com/?ll=${lat},${lng}&q=${q}`,
    },
    {
      id: "yandex",
      label: "Yandex",
      href: `https://yandex.com/maps/?pt=${lng},${lat}&z=17&l=map`,
    },
    {
      id: "2gis",
      label: "2GIS",
      href: `https://2gis.com/geo/${lng}%2C${lat}`,
    },
    {
      id: "petal",
      label: "Petal",
      href: `https://www.petalmaps.com/place/?coordinate=${lng},${lat}`,
    },
  ];
}
