import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { addDays, anchorDay, cycleMonth, cycleRange, flowBuckets, monthGrid, periodRange, previousRange, rangePresets, shiftMonth, shiftPeriod, todayISO } from "../src/index";

/** Every day from 2023-01-01 to 2028-12-31, which includes the leap years 2024 and 2028. */
const days: string[] = [];
for (let d = "2023-01-01"; d <= "2028-12-31"; d = addDays(d, 1)) days.push(d);
const START_DAYS = Array.from({ length: 28 }, (_, i) => i + 1);

describe("pay cycle (the month people see)", () => {
  it("every day belongs to exactly one cycle, and that cycle contains it", () => {
    for (const startDay of START_DAYS) {
      for (const day of days) {
        const month = cycleMonth(day, startDay);
        const { from, to } = cycleRange(month, startDay);
        assert.ok(from <= day && day <= to, `${day} start ${startDay}: ${month} is ${from}..${to}`);
        assert.equal(periodRange("month", day, startDay).from, from);
        assert.equal(periodRange("month", day, startDay).to, to);
      }
    }
  });

  it("cycles follow each other with no gap and no overlap", () => {
    for (const startDay of START_DAYS) {
      let month = "2023-01";
      for (let i = 0; i < 72; i += 1) {
        const a = cycleRange(month, startDay);
        const b = cycleRange(shiftMonth(month, 1), startDay);
        assert.equal(addDays(a.to, 1), b.from, `start ${startDay}, ${month}`);
        month = shiftMonth(month, 1);
      }
    }
  });

  it("with start day 1 a month is exactly the calendar month, first and last day included", () => {
    for (let y = 2023; y <= 2028; y += 1) {
      for (let m = 1; m <= 12; m += 1) {
        const month = `${y}-${String(m).padStart(2, "0")}`;
        const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
        assert.deepEqual(cycleRange(month, 1), { from: `${month}-01`, to: `${month}-${String(last).padStart(2, "0")}` });
        assert.equal(cycleMonth(`${month}-01`, 1), month, "first day");
        assert.equal(cycleMonth(`${month}-${String(last).padStart(2, "0")}`, 1), month, "last day");
      }
    }
  });

  it("October never leaks into November", () => {
    assert.deepEqual(periodRange("month", "2026-11-01", 1), { from: "2026-11-01", to: "2026-11-30" });
    assert.deepEqual(periodRange("month", "2026-10-31", 1), { from: "2026-10-01", to: "2026-10-31" });
    assert.equal(cycleMonth("2026-10-31", 1), "2026-10");
    assert.equal(cycleMonth("2026-11-01", 1), "2026-11");
    // With the 20th, 19 Nov is still the October cycle and 20 Nov starts the November one.
    assert.deepEqual(periodRange("month", "2026-11-19", 20), { from: "2026-10-20", to: "2026-11-19" });
    assert.deepEqual(periodRange("month", "2026-11-20", 20), { from: "2026-11-20", to: "2026-12-19" });
  });

  it("December flows into January and the year changes", () => {
    assert.deepEqual(periodRange("month", "2026-12-31", 1), { from: "2026-12-01", to: "2026-12-31" });
    assert.deepEqual(periodRange("month", "2027-01-01", 1), { from: "2027-01-01", to: "2027-01-31" });
    assert.deepEqual(cycleRange("2026-12", 25), { from: "2026-12-25", to: "2027-01-24" });
    assert.equal(cycleMonth("2027-01-10", 25), "2026-12");
    assert.deepEqual(previousRange("month", "2027-01-10", 1), { from: "2026-12-01", to: "2026-12-10" });
    assert.deepEqual(previousRange("year", "2027-03-05", 1), { from: "2026-01-01", to: "2026-03-05" });
  });

  it("February has 28 or 29 days depending on the year", () => {
    assert.equal(periodRange("month", "2024-02-10", 1).to, "2024-02-29");
    assert.equal(periodRange("month", "2026-02-10", 1).to, "2026-02-28");
    assert.equal(periodRange("month", "2028-02-29", 1).to, "2028-02-29");
    assert.deepEqual(cycleRange("2024-02", 28), { from: "2024-02-28", to: "2024-03-27" });
    assert.deepEqual(cycleRange("2026-02", 28), { from: "2026-02-28", to: "2026-03-27" });
    // The same stretch of last year when today is 29 February.
    assert.deepEqual(previousRange("year", "2028-02-29", 1), { from: "2027-01-01", to: "2027-02-28" });
  });
});

describe("weeks and years", () => {
  it("a week is Monday to Sunday and contains the day", () => {
    for (const day of days) {
      const { from, to } = periodRange("week", day);
      assert.ok(from <= day && day <= to);
      assert.equal(new Date(`${from}T00:00:00Z`).getUTCDay(), 1);
      assert.equal(addDays(from, 6), to);
    }
  });

  it("a year is January to December", () => {
    for (const day of ["2024-02-29", "2026-12-31", "2027-01-01"]) {
      const y = day.slice(0, 4);
      assert.deepEqual(periodRange("year", day), { from: `${y}-01-01`, to: `${y}-12-31` });
    }
  });
});

describe("previous period and chart bars", () => {
  it("the previous range is earlier, the same length or shorter, and never overlaps the current period", () => {
    for (const period of ["week", "month", "year"] as const) {
      for (const startDay of period === "month" ? [1, 15, 20, 28] : [1]) {
        for (const day of days.filter((_, i) => i % 3 === 0)) {
          const cur = periodRange(period, day, startDay);
          const prev = previousRange(period, day, startDay);
          assert.ok(prev.from <= prev.to, `${period} ${day} ${startDay}`);
          assert.ok(prev.to < cur.from, `${period} ${day} ${startDay}: ${prev.to} before ${cur.from}`);
        }
      }
    }
  });

  it("the bars of a month cover the cycle exactly once", () => {
    for (const startDay of [1, 10, 20, 28]) {
      for (const day of days.filter((_, i) => i % 5 === 0)) {
        const { from, to } = periodRange("month", day, startDay);
        const bars = flowBuckets("month", day, startDay);
        assert.equal(bars[0].from, from);
        assert.equal(bars[bars.length - 1].to, to);
        for (let i = 1; i < bars.length; i += 1) assert.equal(addDays(bars[i - 1].to, 1), bars[i].from);
        assert.equal(bars.filter((b) => b.current).length, 1, `${day} ${startDay}`);
      }
    }
  });

  it("the bars of a year are twelve full months", () => {
    const bars = flowBuckets("year", "2028-06-15");
    assert.equal(bars.length, 12);
    assert.equal(bars[1].to, "2028-02-29");
  });
});

describe("looking at an earlier period", () => {
  it("no date, today, or a day in the current period measures from today", () => {
    assert.equal(anchorDay("month", "2026-11-19", 1), "2026-11-19");
    assert.equal(anchorDay("month", "2026-11-19", 1, "2026-11-02"), "2026-11-19");
    assert.equal(anchorDay("month", "2026-11-19", 1, "2026-11-19"), "2026-11-19");
  });
  it("a day in an earlier period measures from that period's last day, so the whole period is shown", () => {
    assert.equal(anchorDay("month", "2026-11-19", 1, "2026-10-05"), "2026-10-31");
    assert.equal(anchorDay("month", "2026-11-19", 20, "2026-10-05"), "2026-10-19");
    assert.equal(anchorDay("week", "2026-11-19", 1, "2026-11-04"), "2026-11-08");
    assert.equal(anchorDay("year", "2026-11-19", 1, "2025-03-01"), "2025-12-31");
  });
  it("a day in the future counts as today", () => {
    assert.equal(anchorDay("month", "2026-11-19", 1, "2027-02-01"), "2026-11-19");
  });
  it("October measured from its last day is exactly October, and never November", () => {
    const day = anchorDay("month", "2026-11-19", 1, "2026-10-15");
    assert.deepEqual(periodRange("month", day, 1), { from: "2026-10-01", to: "2026-10-31" });
    assert.deepEqual(previousRange("month", day, 1), { from: "2026-09-01", to: "2026-09-30" });
  });
  it("shiftPeriod steps back and forward one period at a time, across the year change", () => {
    assert.equal(shiftPeriod("month", "2027-01-10", 1, -1), "2026-12-31");
    assert.equal(shiftPeriod("month", "2026-12-10", 1, 1), "2027-01-01");
    assert.equal(shiftPeriod("month", "2026-11-25", 20, -1), "2026-11-19");
    assert.equal(shiftPeriod("week", "2026-11-19", 1, -1), "2026-11-15");
    assert.equal(shiftPeriod("year", "2026-06-01", 1, -1), "2025-12-31");
  });
});

describe("the calendar picker and quick ranges", () => {
  it("a month grid shows weeks Monday to Sunday and marks which days belong to the month", () => {
    for (const month of ["2026-10", "2026-11", "2027-01", "2024-02", "2026-02"]) {
      const weeks = monthGrid(month);
      const inside = weeks.flat().filter((d) => d.inMonth).map((d) => d.date);
      const [y, m] = month.split("-").map(Number);
      assert.equal(inside.length, new Date(Date.UTC(y, m, 0)).getUTCDate(), month);
      assert.ok(inside.every((d) => d.startsWith(month)));
      assert.ok(weeks.every((w) => w.length === 7));
      assert.equal(inside[0], `${month}-01`);
    }
    // 1 November 2026 is a Sunday, so its week starts with six days of October.
    const first = monthGrid("2026-11")[0];
    assert.deepEqual(first.map((d) => d.inMonth), [false, false, false, false, false, false, true]);
    assert.equal(first[0].date, "2026-10-26");
  });

  it("quick ranges: this month is the cycle, last month the cycle before it", () => {
    const presets = Object.fromEntries(rangePresets("2026-11-19", 1).map((p) => [p.key, p]));
    assert.deepEqual([presets["this-month"].from, presets["this-month"].to], ["2026-11-01", "2026-11-30"]);
    assert.deepEqual([presets["last-month"].from, presets["last-month"].to], ["2026-10-01", "2026-10-31"]);
    const custom = Object.fromEntries(rangePresets("2026-11-19", 20).map((p) => [p.key, p]));
    assert.deepEqual([custom["this-month"].from, custom["this-month"].to], ["2026-10-20", "2026-11-19"]);
    assert.deepEqual([custom["last-month"].from, custom["last-month"].to], ["2026-09-20", "2026-10-19"]);
  });
});

describe("time zone", () => {
  it("today is the day in Jakarta (UTC+7), not in UTC", () => {
    assert.equal(todayISO(new Date("2026-10-31T17:00:00Z")), "2026-11-01");
    assert.equal(todayISO(new Date("2026-10-31T16:59:59Z")), "2026-10-31");
    assert.equal(todayISO(new Date("2026-12-31T17:00:00Z")), "2027-01-01");
    assert.equal(todayISO(new Date("2028-02-28T17:00:00Z")), "2028-02-29");
  });
});
