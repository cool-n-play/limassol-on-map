import { useCallback, useEffect, useMemo, useState } from "react";
import MapView from "./components/MapView";
import { t, type Lang } from "./i18n";
import { fetchOsrmRoute, fetchPharmacies } from "./lib/api";
import {
  dateFromSliderIndex,
  formatNicosia,
  maxSliderIndex,
  sliderIndex,
} from "./lib/timeSlider";
import type { LatLng, Pharmacy, RouteMode } from "./lib/types";

type Filter = "all" | "open";

export default function App() {
  const [lang, setLang] = useState<Lang>("ru");
  const [filter, setFilter] = useState<Filter>("all");
  const [at, setAt] = useState(() => new Date());
  const [here, setHere] = useState<LatLng | null>(null);
  const [pinMode, setPinMode] = useState(false);
  const [routeMode, setRouteMode] = useState<RouteMode>("foot");
  const [items, setItems] = useState<Pharmacy[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [routeLine, setRouteLine] = useState<[number, number][] | null>(null);
  const [nearest, setNearest] = useState<Pharmacy | null>(null);

  const maxIdx = maxSliderIndex();
  const idx = sliderIndex(at);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchPharmacies(at, here);
      if (!data.ok) throw new Error(data.error || "api");
      setItems(data.pharmacies);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, [at, here]);

  useEffect(() => {
    void load();
  }, [load]);

  const visible = useMemo(() => {
    if (filter === "open") return items.filter((p) => p.open);
    return items;
  }, [items, filter]);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      if (!here || visible.length === 0) {
        setRouteLine(null);
        setNearest(null);
        return;
      }
      const n =
        [...visible]
          .filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng))
          .sort((a, b) => (a.distance_km ?? 1e9) - (b.distance_km ?? 1e9))[0] ?? null;
      setNearest(n);
      if (!n) {
        setRouteLine(null);
        return;
      }
      try {
        const line = await fetchOsrmRoute(here, { lat: n.lat, lng: n.lng }, routeMode);
        if (!cancelled) setRouteLine(line.length ? line : [[here.lat, here.lng], [n.lat, n.lng]]);
      } catch {
        if (!cancelled) setRouteLine([[here.lat, here.lng], [n.lat, n.lng]]);
      }
    }
    void run();
    return () => {
      cancelled = true;
    };
  }, [here, visible, routeMode]);

  const locate = () => {
    if (!navigator.geolocation) {
      setPinMode(true);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setHere({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setPinMode(false);
      },
      () => setPinMode(true),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          {t(lang, "title")}
          <small>{t(lang, "subtitle")}</small>
        </div>
        <div className="lang">
          {(["ru", "en", "el"] as Lang[]).map((code) => (
            <button
              key={code}
              type="button"
              className={lang === code ? "active" : ""}
              onClick={() => setLang(code)}
            >
              {code.toUpperCase()}
            </button>
          ))}
        </div>
        <div className="controls">
          <button
            type="button"
            className={filter === "all" ? "active" : ""}
            onClick={() => setFilter("all")}
          >
            {t(lang, "filterAll")}
          </button>
          <button
            type="button"
            className={filter === "open" ? "active" : ""}
            onClick={() => setFilter("open")}
          >
            {t(lang, "filterOpen")}
          </button>
          <label className="slider-row">
            <span>
              {t(lang, "at")}: {formatNicosia(at, lang)}
            </span>
            <input
              type="range"
              min={0}
              max={maxIdx}
              value={idx}
              onChange={(e) => setAt(dateFromSliderIndex(Number(e.target.value)))}
            />
          </label>
          <button type="button" onClick={locate}>
            {t(lang, "meHere")}
          </button>
          <button
            type="button"
            className={pinMode ? "active" : ""}
            onClick={() => setPinMode((v) => !v)}
          >
            {t(lang, "pinMode")}
          </button>
          <button
            type="button"
            className={routeMode === "foot" ? "active" : ""}
            onClick={() => setRouteMode("foot")}
          >
            {t(lang, "routeFoot")}
          </button>
          <button
            type="button"
            className={routeMode === "car" ? "active" : ""}
            onClick={() => setRouteMode("car")}
          >
            {t(lang, "routeCar")}
          </button>
        </div>
        <div className="status">
          {loading
            ? t(lang, "loading")
            : error
              ? `${t(lang, "error")}: ${error}`
              : filter === "open" && visible.length === 0
                ? t(lang, "emptyOpen")
                : `${visible.length} · ${nearest ? `${t(lang, "nearest")}: ${nearest.name}` : ""}`}
        </div>
      </header>
      <div className="map-wrap">
        <MapView
          lang={lang}
          pharmacies={visible}
          here={here}
          pinMode={pinMode}
          onPickHere={(p) => {
            setHere(p);
            setPinMode(false);
          }}
          routeLine={routeLine}
          focus={nearest ? { lat: nearest.lat, lng: nearest.lng } : null}
        />
        {!loading && !error && filter === "open" && visible.length === 0 && (
          <div className="empty-open" role="status">
            {t(lang, "emptyOpen")}
          </div>
        )}
        {pinMode && <div className="hint">{t(lang, "pinHint")}</div>}
      </div>
    </div>
  );
}
