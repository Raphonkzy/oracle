import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { averageDaily, daySeries, daysElapsed, daysIn, periodRange, projectSpending } from "../src/index";

describe("daySeries", () => {
  it("lists every day of the range, with zeros where nothing happened", () => {
    const s = daySeries({ from: "2026-11-28", to: "2026-12-02" }, [{ date: "2026-11-29", income: 0, expense: 5_000 }, { date: "2026-12-01", income: 100, expense: 0 }]);
    assert.deepEqual(s.map((d) => d.date), ["2026-11-28", "2026-11-29", "2026-11-30", "2026-12-01", "2026-12-02"]);
    assert.deepEqual(s.map((d) => d.expense), [0, 5_000, 0, 0, 0]);
    assert.equal(s[3].income, 100);
  });
  it("adds up several rows of the same day and has 366 days in a leap year", () => {
    const s = daySeries(periodRange("year", "2028-06-01"), [{ date: "2028-03-01", income: 0, expense: 1 }, { date: "2028-03-01", income: 0, expense: 2 }]);
    assert.equal(s.length, 366);
    assert.equal(s.find((d) => d.date === "2028-03-01")?.expense, 3);
    assert.equal(daySeries(periodRange("year", "2026-06-01"), []).length, 365);
  });
});

describe("pace and projection", () => {
  const nov = { from: "2026-11-01", to: "2026-11-30" };
  it("counts the days so far, today included, and all days once the period is over", () => {
    assert.equal(daysElapsed(nov, "2026-11-10"), 10);
    assert.equal(daysElapsed(nov, "2026-12-20"), 30);
    assert.equal(daysElapsed(nov, "2026-10-31"), 0);
    assert.equal(daysIn({ from: "2028-02-01", to: "2028-02-29" }), 29);
  });
  it("averages over the days so far for a running period and over all days for a finished one", () => {
    assert.equal(averageDaily(300_000, nov, "2026-11-10"), 30_000);
    assert.equal(averageDaily(300_000, nov, "2027-01-05"), 10_000);
    assert.equal(averageDaily(300_000, nov, "2026-10-31"), 0);
  });
  it("projects a running month at the same pace", () => {
    assert.deepEqual(projectSpending(300_000, "month", nov, "2026-11-10"), { expense: 900_000, daysLeft: 20 });
  });
  it("says nothing when it would be a guess", () => {
    assert.equal(projectSpending(10, "month", nov, "2026-11-02"), null, "only 2 days");
    assert.notEqual(projectSpending(10, "month", nov, "2026-11-03"), null);
    assert.equal(projectSpending(10, "month", nov, "2026-12-02"), null, "finished");
    assert.equal(projectSpending(10, "month", nov, "2026-10-20"), null, "not started");
    assert.equal(projectSpending(10, "year", periodRange("year", "2026-06-01"), "2026-06-01"), null);
    const week = periodRange("week", "2026-11-19");
    assert.equal(projectSpending(10, "week", week, week.from), null, "1 day of a week");
    assert.deepEqual(projectSpending(20, "week", week, "2026-11-17"), { expense: 70, daysLeft: 5 });
  });
  it("follows a pay cycle that starts on the 20th and the leap February", () => {
    const cycle = periodRange("month", "2026-11-25", 20);
    assert.deepEqual(projectSpending(60_000, "month", cycle, "2026-11-25"), { expense: 300_000, daysLeft: 24 });
    const feb = periodRange("month", "2028-02-10");
    assert.deepEqual(projectSpending(100, "month", feb, "2028-02-10"), { expense: 290, daysLeft: 19 });
  });
});
