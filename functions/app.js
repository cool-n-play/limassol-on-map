const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const { isOpenAtHours } = require("./lib/openingHours");
const { isCyprusPublicHoliday } = require("./lib/cyprusHolidays");

const DATA_CANDIDATES = [
  path.join(__dirname, "data", "pharmacies.json"),
  path.join(__dirname, "..", "data", "pharmacies.json"),
];

function loadDataset() {
  for (const p of DATA_CANDIDATES) {
    if (fs.existsSync(p)) {
      return JSON.parse(fs.readFileSync(p, "utf8"));
    }
  }
  throw new Error("pharmacies.json not found");
}

function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

function dateInNicosia(iso) {
  const d = iso ? new Date(iso) : new Date();
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Nicosia",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

/**
 * Openness at a moment (Europe/Nicosia calendar day).
 * Priority: on duty → open; public holiday without duty → closed;
 * else OSM opening_hours; no OH and no duty → closed.
 */
function isOpenAt(pharmacy, atIso) {
  const day = dateInNicosia(atIso);
  const duty = Array.isArray(pharmacy.on_duty_dates)
    ? pharmacy.on_duty_dates.includes(day)
    : false;
  if (duty) return { open: true, reason: "duty" };
  if (isCyprusPublicHoliday(day)) return { open: false, reason: "holiday" };
  const oh = pharmacy.opening_hours;
  if (oh) {
    const open = isOpenAtHours(oh, atIso || new Date());
    return { open, reason: open ? "hours" : "closed" };
  }
  return { open: false, reason: "closed" };
}

function createApp() {
  const app = express();
  app.use(cors({ origin: true }));
  app.use(express.json());

  let cache = null;
  const getData = () => {
    if (!cache) cache = loadDataset();
    return cache;
  };

  app.get("/api/pharmacies", (req, res) => {
    try {
      const data = getData();
      const at = typeof req.query.at === "string" ? req.query.at : new Date().toISOString();
      const lat = req.query.lat != null ? Number(req.query.lat) : null;
      const lng = req.query.lng != null ? Number(req.query.lng) : null;
      const hasPoint = Number.isFinite(lat) && Number.isFinite(lng);

      const pharmacies = (data.pharmacies || []).map((p) => {
        const openInfo = isOpenAt(p, at);
        const item = {
          ...p,
          open: openInfo.open,
          open_reason: openInfo.reason,
        };
        if (hasPoint && Number.isFinite(p.lat) && Number.isFinite(p.lng)) {
          item.distance_km = Math.round(haversineKm(lat, lng, p.lat, p.lng) * 1000) / 1000;
        }
        return item;
      });

      if (hasPoint) {
        pharmacies.sort((a, b) => (a.distance_km ?? 1e9) - (b.distance_km ?? 1e9));
      }

      res.json({
        ok: true,
        at,
        timezone: data.timezone || "Europe/Nicosia",
        bbox: data.bbox || null,
        counts: {
          total: pharmacies.length,
          open: pharmacies.filter((p) => p.open).length,
        },
        pharmacies,
      });
    } catch (err) {
      res.status(500).json({ ok: false, error: String(err.message || err) });
    }
  });

  app.get("/api/health", (_req, res) => {
    res.json({ ok: true, service: "limassol-on-map" });
  });

  app.get("/health", (_req, res) => {
    res.json({ ok: true, service: "limassol-on-map" });
  });

  return app;
}

module.exports = { createApp, loadDataset, isOpenAt };
