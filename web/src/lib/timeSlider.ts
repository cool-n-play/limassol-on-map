const STEP_MS = 15 * 60 * 1000;
const MAX_AHEAD_MS = 7 * 24 * 60 * 60 * 1000;

export function snapToStep(d: Date): Date {
  const t = d.getTime();
  return new Date(Math.round(t / STEP_MS) * STEP_MS);
}

export function maxSliderDate(from = new Date()): Date {
  return new Date(from.getTime() + MAX_AHEAD_MS);
}

export function sliderIndex(at: Date, now = new Date()): number {
  const start = snapToStep(now).getTime();
  const cur = snapToStep(at).getTime();
  return Math.max(0, Math.round((cur - start) / STEP_MS));
}

export function dateFromSliderIndex(index: number, now = new Date()): Date {
  const start = snapToStep(now).getTime();
  return new Date(start + index * STEP_MS);
}

export function maxSliderIndex(now = new Date()): number {
  return Math.round(MAX_AHEAD_MS / STEP_MS);
}

export function formatNicosia(d: Date, lang: string): string {
  return new Intl.DateTimeFormat(lang === "el" ? "el-CY" : lang === "ru" ? "ru-RU" : "en-GB", {
    timeZone: "Europe/Nicosia",
    weekday: "short",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}
