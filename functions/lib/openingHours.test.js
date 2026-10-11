"use strict";

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { parseOpeningHours, isOpenAtHours } = require("./openingHours");

/** Build a UTC instant that is `local` wall time in Europe/Nicosia (approx via known offsets). */
function atNicosia(isoLocal) {
  // isoLocal: '2026-03-09T10:00:00' meaning Nicosia local; use explicit offset.
  // Winter EET = +02:00, summer EEST = +03:00. Tests use fixed offsets.
  return isoLocal;
}

describe("parseOpeningHours", () => {
  it("parses empty / null", () => {
    assert.equal(parseOpeningHours(null).alwaysOpen, false);
    assert.deepEqual(parseOpeningHours("").groups, []);
  });

  it("parses 24/7", () => {
    const p = parseOpeningHours("24/7");
    assert.equal(p.ok, true);
    assert.equal(p.alwaysOpen, true);
  });

  it("parses Mo-Fr ranges and comma times", () => {
    const p = parseOpeningHours("Mo-Fr 09:00-17:00,18:00-20:00");
    assert.equal(p.ok, true);
    assert.equal(p.groups.length, 1);
    assert.equal(p.groups[0][0].days.length, 5);
    assert.equal(p.groups[0][0].times.length, 2);
    assert.equal(p.groups[0][0].times[0].start, 9 * 60);
    assert.equal(p.groups[0][0].times[1].end, 20 * 60);
  });

  it("parses day lists and overnight", () => {
    const p = parseOpeningHours("Mo,Tu,Th-Sa 22:00-01:00");
    const t = p.groups[0][0].times[0];
    assert.equal(t.overnight, true);
    assert.equal(t.start, 22 * 60);
    assert.equal(t.end, 60);
    // Mo,Tu,Th,Fr,Sa = 5 days
    assert.equal(p.groups[0][0].days.length, 5);
  });

  it("parses off/closed and additive clauses", () => {
    const p = parseOpeningHours("Mo-Sa 08:00-21:00; Su off");
    assert.equal(p.groups.length, 2);
    assert.equal(p.groups[1][0].off, true);
    assert.deepEqual(p.groups[1][0].days, [0]);

    const p2 = parseOpeningHours(
      "Mo-Sa 08:00-13:30, Mo-Tu Th-Fr 15:00-18:30"
    );
    assert.equal(p2.groups[0].length, 2);
  });
});

describe("isOpenAtHours", () => {
  it("24/7 always open", () => {
    assert.equal(isOpenAtHours("24/7", "2026-01-01T00:00:00+02:00"), true);
  });

  it("weekday range in Europe/Nicosia", () => {
    // Monday 2026-03-09 10:00 Nicosia (EET +02)
    assert.equal(
      isOpenAtHours("Mo-Fr 09:00-17:00", atNicosia("2026-03-09T10:00:00+02:00")),
      true
    );
    assert.equal(
      isOpenAtHours("Mo-Fr 09:00-17:00", atNicosia("2026-03-09T08:00:00+02:00")),
      false
    );
    // Sunday
    assert.equal(
      isOpenAtHours("Mo-Fr 09:00-17:00", atNicosia("2026-03-08T12:00:00+02:00")),
      false
    );
  });

  it("comma times and closed", () => {
    const oh = "Mo,Tu,Th-Sa 08:30-13:00,15:00-18:30";
    assert.equal(isOpenAtHours(oh, "2026-03-09T10:00:00+02:00"), true); // Mo
    assert.equal(isOpenAtHours(oh, "2026-03-09T14:00:00+02:00"), false);
    assert.equal(isOpenAtHours(oh, "2026-03-09T16:00:00+02:00"), true);
    assert.equal(isOpenAtHours("Su closed", "2026-03-08T12:00:00+02:00"), false);
  });

  it("overnight 22:00-01:00", () => {
    const oh = "Mo 22:00-01:00";
    // Monday 23:00 open
    assert.equal(isOpenAtHours(oh, "2026-03-09T23:00:00+02:00"), true);
    // Tuesday 00:30 still open (from Mon overnight)
    assert.equal(isOpenAtHours(oh, "2026-03-10T00:30:00+02:00"), true);
    // Tuesday 01:30 closed
    assert.equal(isOpenAtHours(oh, "2026-03-10T01:30:00+02:00"), false);
    // Sunday night closed
    assert.equal(isOpenAtHours(oh, "2026-03-08T23:00:00+02:00"), false);
  });

  it("semicolon override Su off", () => {
    const oh = "Mo-Su 08:00-20:00; Su off";
    assert.equal(isOpenAtHours(oh, "2026-03-09T12:00:00+02:00"), true);
    assert.equal(isOpenAtHours(oh, "2026-03-08T12:00:00+02:00"), false);
  });

  it("accepts Date object", () => {
    const d = new Date("2026-03-09T10:00:00+02:00");
    assert.equal(isOpenAtHours("Mo-Fr 09:00-17:00", d), true);
  });
});
