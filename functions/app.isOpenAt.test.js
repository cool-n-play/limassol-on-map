"use strict";

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { isOpenAt } = require("./app");

describe("isOpenAt", () => {
  it("duty → open (even on holiday / without OH)", () => {
    const pharmacy = {
      opening_hours: "Mo-Fr 09:00-17:00",
      on_duty_dates: ["2026-01-01"],
    };
    // New Year (holiday) 12:00 Nicosia
    assert.deepEqual(isOpenAt(pharmacy, "2026-01-01T12:00:00+02:00"), {
      open: true,
      reason: "duty",
    });
  });

  it("holiday without duty → closed", () => {
    const pharmacy = {
      opening_hours: "Mo-Su 09:00-17:00",
      on_duty_dates: [],
    };
    assert.deepEqual(isOpenAt(pharmacy, "2026-01-01T12:00:00+02:00"), {
      open: false,
      reason: "holiday",
    });
  });

  it("hours → open when within OSM opening_hours", () => {
    const pharmacy = {
      opening_hours: "Mo-Fr 09:00-17:00",
      on_duty_dates: [],
    };
    // Monday 2026-03-09 10:00 Nicosia (not a holiday)
    assert.deepEqual(isOpenAt(pharmacy, "2026-03-09T10:00:00+02:00"), {
      open: true,
      reason: "hours",
    });
  });

  it("closed → outside hours or no OH", () => {
    const withOh = {
      opening_hours: "Mo-Fr 09:00-17:00",
      on_duty_dates: [],
    };
    // Monday before open
    assert.deepEqual(isOpenAt(withOh, "2026-03-09T08:00:00+02:00"), {
      open: false,
      reason: "closed",
    });
    // Sunday
    assert.deepEqual(isOpenAt(withOh, "2026-03-08T12:00:00+02:00"), {
      open: false,
      reason: "closed",
    });

    const noOh = { on_duty_dates: [] };
    assert.deepEqual(isOpenAt(noOh, "2026-03-09T12:00:00+02:00"), {
      open: false,
      reason: "closed",
    });
  });
});
