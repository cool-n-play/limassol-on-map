/**
 * Republic of Cyprus public holidays (2026–2027 focus).
 * Fixed civil/religious dates + Orthodox Easter–based movable days.
 *
 * Sources: official Cyprus holiday lists (New Year, Epiphany, Clean Monday,
 * 25 Mar, 1 Apr, Good Friday, Holy Saturday, Easter Sunday/Monday, Labour Day,
 * Holy Spirit Monday / Kataklysmos, Assumption, Independence Day, Ochi Day,
 * Christmas Eve/Day, Boxing Day).
 */

"use strict";

const FIXED_MMDD = [
  ["01-01", "New Year's Day"],
  ["01-06", "Epiphany"],
  ["03-25", "Greek Independence Day"],
  ["04-01", "Cyprus National Day"],
  ["05-01", "Labour Day"],
  ["08-15", "Assumption of Mary"],
  ["10-01", "Cyprus Independence Day"],
  ["10-28", "Ochi Day"],
  ["12-24", "Christmas Eve"],
  ["12-25", "Christmas Day"],
  ["12-26", "Boxing Day"],
];

/**
 * Orthodox Easter Sunday (Gregorian) for years 1900–2099.
 * Julian computus + 13-day offset to Gregorian.
 */
function orthodoxEasterSunday(year) {
  const y = Number(year);
  const a = y % 4;
  const b = y % 7;
  const c = y % 19;
  const d = (19 * c + 15) % 30;
  const e = (2 * a + 4 * b - d + 34) % 7;
  const month = Math.floor((d + e + 114) / 31); // 3 = March, 4 = April (Julian)
  const day = ((d + e + 114) % 31) + 1;
  // Julian Easter → Gregorian (+13 days in 1900–2099)
  const utc = Date.UTC(y, month - 1, day + 13);
  const g = new Date(utc);
  return {
    year: g.getUTCFullYear(),
    month: g.getUTCMonth() + 1,
    day: g.getUTCDate(),
  };
}

function pad2(n) {
  return String(n).padStart(2, "0");
}

function toDateStr(y, m, d) {
  return `${y}-${pad2(m)}-${pad2(d)}`;
}

function addDays(y, m, d, delta) {
  const dt = new Date(Date.UTC(y, m - 1, d + delta));
  return {
    year: dt.getUTCFullYear(),
    month: dt.getUTCMonth() + 1,
    day: dt.getUTCDate(),
  };
}

function movableForYear(year) {
  const easter = orthodoxEasterSunday(year);
  const { year: ey, month: em, day: ed } = easter;
  const items = [
    [addDays(ey, em, ed, -48), "Green Monday (Clean Monday)"],
    [addDays(ey, em, ed, -2), "Good Friday"],
    [addDays(ey, em, ed, -1), "Holy Saturday"],
    [easter, "Easter Sunday"],
    [addDays(ey, em, ed, 1), "Easter Monday"],
    [addDays(ey, em, ed, 50), "Holy Spirit Monday (Kataklysmos)"],
  ];
  return items
    .filter(([d]) => d.year === year)
    .map(([d, name]) => ({
      date: toDateStr(d.year, d.month, d.day),
      name,
      movable: true,
    }));
}

function fixedForYear(year) {
  return FIXED_MMDD.map(([mmdd, name]) => ({
    date: `${year}-${mmdd}`,
    name,
    movable: false,
  }));
}

/**
 * @param {number} year
 * @returns {{ date: string, name: string, movable: boolean }[]}
 */
function listHolidays(year) {
  const y = Number(year);
  if (!Number.isInteger(y) || y < 1900 || y > 2099) {
    return [];
  }
  const byDate = new Map();
  for (const h of [...fixedForYear(y), ...movableForYear(y)]) {
    const prev = byDate.get(h.date);
    if (!prev) {
      byDate.set(h.date, h);
    } else {
      // Same calendar day (e.g. Holy Saturday + Labour Day 2027-05-01)
      byDate.set(h.date, {
        date: h.date,
        name: `${prev.name}; ${h.name}`,
        movable: prev.movable || h.movable,
      });
    }
  }
  return [...byDate.values()].sort((a, b) => (a.date < b.date ? -1 : 1));
}

/**
 * @param {string} dateStr YYYY-MM-DD
 * @returns {boolean}
 */
function isCyprusPublicHoliday(dateStr) {
  if (typeof dateStr !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return false;
  }
  const year = Number(dateStr.slice(0, 4));
  return listHolidays(year).some((h) => h.date === dateStr);
}

module.exports = {
  isCyprusPublicHoliday,
  listHolidays,
  orthodoxEasterSunday,
};
