/**
 * Minimal OSM opening_hours parser for pharmacy schedules.
 * Supports: Mo–Su, HH:MM-HH:MM, comma lists, closed/off, overnight, 24/7.
 * Semicolon groups: later group overrides days it mentions.
 */

"use strict";

const DEFAULT_TZ = "Europe/Nicosia";

const DAY_INDEX = {
  Su: 0,
  Mo: 1,
  Tu: 2,
  We: 3,
  Th: 4,
  Fr: 5,
  Sa: 6,
};

const WEEKDAY_SHORT = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

const DAY_TOKEN =
  "(?:PH|Mo|Tu|We|Th|Fr|Sa|Su)(?:\\s*-\\s*(?:Mo|Tu|We|Th|Fr|Sa|Su))?";
const DAYS_PREFIX_RE = new RegExp(
  `^((?:${DAY_TOKEN})(?:[\\s,]+(?:${DAY_TOKEN}))*)\\s+`,
  "i"
);
const TIME_RE = /^(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})/;
const OFF_RE = /^(off|closed)\b/i;

function parseTimeToMinutes(hhmm) {
  const [hs, ms] = String(hhmm).split(":");
  const h = Number(hs);
  const m = Number(ms);
  if (!Number.isFinite(h) || !Number.isFinite(m) || m < 0 || m > 59) {
    return null;
  }
  if (h === 24 && m === 0) return 24 * 60;
  if (h < 0 || h > 23) return null;
  return h * 60 + m;
}

function expandDayRange(startName, endName) {
  if (startName.toUpperCase() === "PH") return [];
  const start = DAY_INDEX[startName];
  if (start == null) return [];
  if (!endName) return [start];
  if (endName.toUpperCase() === "PH") return [start];
  const end = DAY_INDEX[endName];
  if (end == null) return [start];
  const out = [];
  let d = start;
  for (let i = 0; i < 7; i += 1) {
    out.push(d);
    if (d === end) break;
    d = (d + 1) % 7;
  }
  return out;
}

function parseDaySelector(selector) {
  const days = new Set();
  const tokenRe =
    /(PH|Mo|Tu|We|Th|Fr|Sa|Su)(?:\s*-\s*(Mo|Tu|We|Th|Fr|Sa|Su))?/gi;
  let m;
  while ((m = tokenRe.exec(selector)) !== null) {
    for (const d of expandDayRange(m[1], m[2] || null)) {
      days.add(d);
    }
  }
  return [...days].sort((a, b) => a - b);
}

function parseTimes(rest) {
  const trimmed = rest.trim();
  if (OFF_RE.test(trimmed)) {
    return {
      off: true,
      times: [],
      rest: trimmed.replace(OFF_RE, "").trim(),
    };
  }

  const times = [];
  let cursor = trimmed;
  while (cursor) {
    const m = cursor.match(TIME_RE);
    if (!m) break;
    const start = parseTimeToMinutes(m[1]);
    const end = parseTimeToMinutes(m[2]);
    if (start == null || end == null) break;
    const overnight = end < start;
    times.push({ start, end, overnight });
    cursor = cursor.slice(m[0].length).trimStart();
    if (!cursor.startsWith(",")) break;
    const after = cursor.slice(1).trimStart();
    if (TIME_RE.test(after)) {
      cursor = after;
      continue;
    }
    // comma followed by day selectors → next clause
    break;
  }

  return { off: false, times, rest: cursor };
}

function parseRuleGroup(groupStr) {
  const clauses = [];
  let rest = String(groupStr || "").trim();

  while (rest) {
    rest = rest.replace(/^,\s*/, "").trim();
    if (!rest) break;

    const dayMatch = rest.match(DAYS_PREFIX_RE);
    if (!dayMatch) {
      // bare off / closed
      if (OFF_RE.test(rest)) {
        clauses.push({
          days: [0, 1, 2, 3, 4, 5, 6],
          off: true,
          times: [],
        });
        break;
      }
      break;
    }

    const days = parseDaySelector(dayMatch[1]);
    rest = rest.slice(dayMatch[0].length).trimStart();
    const parsedTimes = parseTimes(rest);
    rest = parsedTimes.rest;

    if (!days.length && !parsedTimes.off && !parsedTimes.times.length) {
      continue;
    }

    clauses.push({
      days: days.length ? days : [],
      off: parsedTimes.off,
      times: parsedTimes.times,
    });

    if (!parsedTimes.off && !parsedTimes.times.length) {
      // days without times — skip junk
      clauses.pop();
      break;
    }
  }

  return clauses.filter((c) => c.days.length > 0 || c.off);
}

/**
 * @param {string|null|undefined} str
 * @returns {{
 *   ok: boolean,
 *   raw: string,
 *   alwaysOpen: boolean,
 *   groups: Array<Array<{days:number[], off:boolean, times:Array<{start:number,end:number,overnight:boolean}>}>>,
 *   error?: string
 * }}
 */
function parseOpeningHours(str) {
  if (str == null) {
    return { ok: true, raw: "", alwaysOpen: false, groups: [] };
  }
  const raw = String(str).trim();
  if (!raw) {
    return { ok: true, raw: "", alwaysOpen: false, groups: [] };
  }
  if (/^24\s*\/\s*7$/i.test(raw) || /^24\s*hours$/i.test(raw)) {
    return { ok: true, raw, alwaysOpen: true, groups: [] };
  }

  try {
    const groups = [];
    for (const part of raw.split(";")) {
      const trimmed = part.trim();
      if (!trimmed) continue;
      const clauses = parseRuleGroup(trimmed);
      if (clauses.length) groups.push(clauses);
    }
    return { ok: true, raw, alwaysOpen: false, groups };
  } catch (err) {
    return {
      ok: false,
      raw,
      alwaysOpen: false,
      groups: [],
      error: String(err && err.message ? err.message : err),
    };
  }
}

function buildDaySchedule(parsed) {
  /** @type {Array<null|{off:boolean, times:Array<{start:number,end:number,overnight:boolean}>}>} */
  const schedule = [null, null, null, null, null, null, null];
  for (const group of parsed.groups) {
    /** @type {Map<number,{off:boolean, times:Array}>} */
    const dayMap = new Map();
    for (const clause of group) {
      for (const d of clause.days) {
        if (!dayMap.has(d)) dayMap.set(d, { off: false, times: [] });
        const slot = dayMap.get(d);
        if (clause.off) {
          slot.off = true;
          slot.times = [];
        } else {
          slot.off = false;
          slot.times.push(...clause.times);
        }
      }
    }
    for (const [d, slot] of dayMap) {
      schedule[d] = slot;
    }
  }
  return schedule;
}

function zonedWeekdayAndMinutes(at, tz) {
  const date = at instanceof Date ? at : new Date(at);
  if (Number.isNaN(date.getTime())) return null;

  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
  const parts = {};
  for (const p of fmt.formatToParts(date)) {
    if (p.type !== "literal") parts[p.type] = p.value;
  }
  const weekday = WEEKDAY_SHORT[parts.weekday];
  const hour = Number(parts.hour);
  const minute = Number(parts.minute);
  if (weekday == null || !Number.isFinite(hour) || !Number.isFinite(minute)) {
    return null;
  }
  return { weekday, minutes: hour * 60 + minute };
}

function minutesOpenInSlot(slot, minutes) {
  if (!slot || slot.off) return false;
  for (const t of slot.times) {
    if (t.overnight) {
      if (minutes >= t.start) return true;
    } else if (minutes >= t.start && minutes < t.end) {
      return true;
    }
  }
  return false;
}

function minutesOpenFromPrevOvernight(slot, minutes) {
  if (!slot || slot.off) return false;
  for (const t of slot.times) {
    if (t.overnight && minutes < t.end) return true;
  }
  return false;
}

/**
 * @param {string|null|undefined} str
 * @param {Date|string} at Date or ISO string
 * @param {string} [tz]
 * @returns {boolean}
 */
function isOpenAtHours(str, at, tz = DEFAULT_TZ) {
  const parsed = parseOpeningHours(str);
  if (!parsed.ok) return false;
  if (parsed.alwaysOpen) return true;
  if (!parsed.groups.length) return false;

  const zoned = zonedWeekdayAndMinutes(at, tz || DEFAULT_TZ);
  if (!zoned) return false;

  const schedule = buildDaySchedule(parsed);
  const today = schedule[zoned.weekday];
  if (minutesOpenInSlot(today, zoned.minutes)) return true;

  const prev = schedule[(zoned.weekday + 6) % 7];
  if (minutesOpenFromPrevOvernight(prev, zoned.minutes)) return true;

  return false;
}

module.exports = {
  parseOpeningHours,
  isOpenAtHours,
  DEFAULT_TZ,
};
