import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  accountPatchInput,
  formatRupiah,
  addDays,
  balanceBreakdown,
  buildInsights,
  collectAllowed,
  csvCell,
  extractFigures,
  toCsv,
  ungroundedFigures,
  changePct,
  flowBuckets,
  groupByDate,
  isISODate,
  ledgerQuery,
  monthRange,
  parseAmount,
  parseUserAmounts,
  monthGrid,
  periodRange,
  rangePresets,
  shiftMonth,
  previousRange,
  rowSubtitle,
  rowTitle,
  summarize,
  transferInput,
  transferPatchInput,
  type LedgerRow,
} from "../src/index";

describe("parseAmount", () => {
  const cases: [string, number | null][] = [
    ["25000", 25000], ["25.000", 25000], ["Rp 25.000", 25000], ["rp1.250.000", 1250000],
    ["25k", 25000], ["1.5m", 1500000], ["2M", 2000000], ["25rb", 25000], ["1.5jt", 1500000], ["1,5jt", 1500000], ["2 juta", 2000000],
    ["15000+3000", 18000], ["50k-2k", 48000], ["1.250", 1250], ["12.50", null], ["abc", null], ["", null],
    ["1..5jt", null], ["5+", null], ["0", 0], ["999999999999", 999999999999], ["1000000000000", null],
    ["2,25jt", 2250000], ["10ribu", 10000],
  ];
  for (const [input, want] of cases) {
    it(`${JSON.stringify(input)} -> ${want}`, () => assert.equal(parseAmount(input), want));
  }
});

describe("isISODate", () => {
  it("accepts real days", () => assert.ok(isISODate("2026-11-19") && isISODate("2028-02-29")));
  it("rejects days that do not exist", () => {
    for (const bad of ["2026-02-31", "2026-13-01", "2027-02-29", "2026-11-00", "26-11-19", "2026-1-9", ""]) assert.equal(isISODate(bad), false, bad);
  });
});

describe("periodRange", () => {
  it("week runs Monday to Sunday", () => {
    assert.deepEqual(periodRange("week", "2026-11-19"), { from: "2026-11-16", to: "2026-11-22" }); // Thursday
    assert.deepEqual(periodRange("week", "2026-11-16"), { from: "2026-11-16", to: "2026-11-22" }); // Monday
    assert.deepEqual(periodRange("week", "2026-11-22"), { from: "2026-11-16", to: "2026-11-22" }); // Sunday
  });
  it("week crosses a month and a year boundary", () => {
    assert.deepEqual(periodRange("week", "2026-12-31"), { from: "2026-12-28", to: "2027-01-03" });
    assert.deepEqual(periodRange("week", "2027-03-02"), { from: "2027-03-01", to: "2027-03-07" });
  });
  it("month handles 28, 29, 30 and 31 day months", () => {
    assert.deepEqual(periodRange("month", "2027-02-10"), { from: "2027-02-01", to: "2027-02-28" });
    assert.deepEqual(periodRange("month", "2028-02-10"), { from: "2028-02-01", to: "2028-02-29" });
    assert.deepEqual(periodRange("month", "2026-11-19"), { from: "2026-11-01", to: "2026-11-30" });
    assert.deepEqual(periodRange("month", "2026-12-01"), { from: "2026-12-01", to: "2026-12-31" });
  });
  it("year", () => assert.deepEqual(periodRange("year", "2026-11-19"), { from: "2026-01-01", to: "2026-12-31" }));
  it("monthRange matches periodRange", () => assert.deepEqual(monthRange("2026-02"), { from: "2026-02-01", to: "2026-02-28" }));
});

describe("summarize", () => {
  const accounts = [
    { id: "a", name: "myBCA", type: "bank" as const, balance: 9_000_000, includeInTotal: true },
    { id: "b", name: "GoPay", type: "ewallet" as const, balance: 1_000_000, includeInTotal: true },
    { id: "c", name: "SPayLater", type: "paylater" as const, balance: -500_000, includeInTotal: true },
    { id: "d", name: "Bibit", type: "investment" as const, balance: 3_000_000, includeInTotal: false },
    { id: "e", name: "DANA", type: "ewallet" as const, balance: 0, includeInTotal: true },
  ];
  const s = summarize(accounts);
  it("total counts debts and skips excluded accounts", () => {
    assert.equal(s.total, 9_500_000);
    assert.equal(s.assets, 10_000_000);
    assert.equal(s.debts, 500_000);
    assert.equal(s.countedCount, 4);
    assert.equal(s.allCount, 5);
  });
  it("ring has only positive counted accounts, largest first, shares sum to 1", () => {
    assert.deepEqual(s.segments.map((x) => x.id), ["a", "b"]);
    assert.equal(s.segments.reduce((sum, x) => sum + x.share, 0), 1);
  });
  it("byType groups by type", () => assert.deepEqual(s.byType.map((t) => [t.type, t.amount]), [["bank", 9_000_000], ["ewallet", 1_000_000]]));
  it("handles no accounts without dividing by zero", () => {
    const e = summarize([]);
    assert.deepEqual([e.total, e.segments.length, e.byType.length], [0, 0, 0]);
  });
});

describe("ledger helpers", () => {
  const base: LedgerRow = {
    id: "1", kind: "expense", amount: -1, date: "2026-11-19", description: null, note: null, categoryId: null, categoryName: null, categoryIcon: null,
    accountId: "a", accountName: "BCA", transferId: null, counterpartName: null, isTransferFee: false, runningBalance: null, createdAt: "",
  };
  it("titles", () => {
    assert.equal(rowTitle({ ...base, kind: "transfer_out", counterpartName: "GoPay" }), "Transfer to GoPay");
    assert.equal(rowTitle({ ...base, kind: "transfer_in", counterpartName: "BCA" }), "Transfer from BCA");
    assert.equal(rowTitle({ ...base, isTransferFee: true }), "Transfer fee");
    assert.equal(rowTitle({ ...base, description: "Kopi", categoryName: "Makan" }), "Kopi");
    assert.equal(rowTitle({ ...base, categoryName: "Makan" }), "Makan");
    assert.equal(rowTitle(base), "Expense");
  });
  it("subtitles", () => {
    assert.equal(rowSubtitle({ ...base, kind: "adjustment" }), "From balance update");
    assert.equal(rowSubtitle({ ...base, description: "Kopi", categoryName: "Makan" }), "Expense · Makan");
  });
  it("groups consecutive rows by date", () => {
    const g = groupByDate([{ date: "b" }, { date: "b" }, { date: "a" }]);
    assert.deepEqual(g.map((x) => [x.date, x.rows.length]), [["b", 2], ["a", 1]]);
  });
});

describe("request schemas", () => {
  it("transfer defaults fee to 0 and rejects same account", () => {
    const ok = transferInput.parse({ fromAccountId: "00000000-0000-4000-8000-000000000001", toAccountId: "00000000-0000-4000-8000-000000000002", amount: 100, date: "2026-11-19" });
    assert.equal(ok.fee, 0);
    assert.equal(transferInput.safeParse({ ...ok, toAccountId: ok.fromAccountId }).success, false);
  });
  it("transfer patch adds no defaults and needs one field", () => {
    const amountOnly = transferPatchInput.parse({ amount: 500 });
    assert.deepEqual(amountOnly, { amount: 500 });
    assert.equal("fee" in amountOnly, false);
    assert.equal("note" in amountOnly, false);
    assert.equal(transferPatchInput.safeParse({}).success, false);
    assert.equal(transferPatchInput.parse({ note: null }).note, null);
    assert.equal(transferPatchInput.parse({ fee: 0 }).fee, 0);
  });
  it("transfer create still rejects the same account on both sides", () => {
    const a = "00000000-0000-4000-8000-000000000001";
    assert.equal(transferInput.safeParse({ fromAccountId: a, toAccountId: a, amount: 1, date: "2026-11-19" }).success, false);
  });
  it("account patch needs at least one field", () => {
    assert.equal(accountPatchInput.safeParse({}).success, false);
    assert.equal(accountPatchInput.safeParse({ name: "BCA" }).success, true);
  });
  it("ledger query defaults and bounds", () => {
    assert.equal(ledgerQuery.parse({}).limit, 100);
    assert.equal(ledgerQuery.safeParse({ limit: "0" }).success, false);
    assert.equal(ledgerQuery.safeParse({ limit: "201" }).success, false);
    assert.equal(ledgerQuery.safeParse({ month: "2026-13" }).success, false);
    assert.equal(ledgerQuery.parse({ limit: "5", month: "2026-11" }).limit, 5);
  });
});

describe("formatRupiah", () => {
  it("uses English grouping with an Rp prefix", () => {
    assert.equal(formatRupiah(1_250_000), "Rp\u00a01,250,000");
    assert.equal(formatRupiah(-5_000), "-Rp\u00a05,000");
    assert.equal(formatRupiah(0), "Rp\u00a00");
  });
});

describe("previousRange", () => {
  it("compares the days so far, never a whole period with a part of one", () => {
    assert.deepEqual(previousRange("week", "2026-11-19"), { from: "2026-11-09", to: "2026-11-12" }); // Thursday vs Thursday
    assert.deepEqual(previousRange("week", "2026-11-16"), { from: "2026-11-09", to: "2026-11-09" }); // Monday vs Monday
    assert.deepEqual(previousRange("month", "2026-11-19"), { from: "2026-10-01", to: "2026-10-19" });
    assert.deepEqual(previousRange("year", "2026-11-19"), { from: "2025-01-01", to: "2025-11-19" });
  });
  it("clamps to the shorter previous month and crosses the year", () => {
    assert.deepEqual(previousRange("month", "2026-03-31"), { from: "2026-02-01", to: "2026-02-28" });
    assert.deepEqual(previousRange("month", "2024-03-30"), { from: "2024-02-01", to: "2024-02-29" });
    assert.deepEqual(previousRange("month", "2026-01-10"), { from: "2025-12-01", to: "2025-12-10" });
    assert.deepEqual(previousRange("week", "2026-01-01"), { from: "2025-12-22", to: "2025-12-25" });
    assert.deepEqual(previousRange("year", "2024-02-29"), { from: "2023-01-01", to: "2023-02-28" });
  });
});

describe("changePct and flowBuckets", () => {
  it("rounds, and gives null with nothing to compare", () => {
    assert.equal(changePct(150, 100), 50);
    assert.equal(changePct(50, 100), -50);
    assert.equal(changePct(1, 3), -67);
    assert.equal(changePct(10, 0), null);
  });
  it("cuts a week into days, a month into clipped weeks, a year into months", () => {
    const week = flowBuckets("week", "2026-11-19");
    assert.deepEqual([week.length, week[0].from, week[6].to, week.filter((b) => b.current).map((b) => b.label)], [7, "2026-11-16", "2026-11-22", ["Thu"]]);
    const month = flowBuckets("month", "2026-11-19");
    assert.deepEqual(month.map((b) => [b.from, b.to]), [["2026-11-01", "2026-11-01"], ["2026-11-02", "2026-11-08"], ["2026-11-09", "2026-11-15"], ["2026-11-16", "2026-11-22"], ["2026-11-23", "2026-11-29"], ["2026-11-30", "2026-11-30"]]);
    const feb = flowBuckets("month", "2026-02-10"); // starts on a Sunday, 28 days
    assert.deepEqual([feb[0].to, feb.at(-1)!.to, feb.length], ["2026-02-01", "2026-02-28", 5]);
    const year = flowBuckets("year", "2026-11-19");
    assert.deepEqual([year.length, year[10].label, year[10].current, year[1].to], [12, "Nov", true, "2026-02-28"]);
  });
});

describe("buildInsights", () => {
  const base = { period: "week" as const, expenseCount: 3, categories: [], budgets: [], biggest: null, staleAccounts: [], fees: { amount: 0, count: 0 } };
  const cat = (name: string, amount: number, previousAmount: number) => ({ categoryId: name, name, amount, share: 0, previousAmount, changePct: changePct(amount, previousAmount) });
  it("reports an empty state instead of guessing", () => {
    const out = buildInsights({ ...base, expenseCount: 0 });
    assert.deepEqual(out.map((i) => i.kind), ["empty"]);
  });
  it("ignores small moves and picks the biggest rise in rupiah", () => {
    const out = buildInsights({ ...base, categories: [cat("Tiny", 5_000, 1_000), cat("Flat", 105_000, 100_000), cat("Big", 300_000, 200_000), cat("Bigger", 150_000, 40_000)] });
    assert.deepEqual(out.map((i) => i.id), ["trend-Bigger"]);
  });
  it("flags budgets at 80% and over, worst first", () => {
    const b = (n: string, budget: number, spent: number) => ({ categoryId: n, name: n, budget, spent });
    const out = buildInsights({ ...base, budgets: [b("Ok", 100, 79), b("Near", 100, 80), b("Over", 100, 101), b("Exact", 100, 100)] });
    assert.deepEqual(out.map((i) => [i.id, i.tone]), [["budget-over-Over", "alert"], ["budget-near-Near", "warn"], ["budget-near-Exact", "warn"]]);
  });
  it("uses the right wording per period and singular for one transfer", () => {
    const out = buildInsights({ ...base, period: "year", fees: { amount: 5_000, count: 1 } });
    assert.match(out.find((i) => i.kind === "fees")!.text, /this year: Rp.5,000 across 1 transfer\.$/);
  });
  it("shows at most six notes", () => {
    const stale = Array.from({ length: 10 }, (_, i) => ({ name: `A${i}`, days: 20 }));
    assert.equal(buildInsights({ ...base, staleAccounts: stale }).length, 6);
  });
});

describe("csv", () => {
  it("quotes only what needs quotes and doubles quotes", () => {
    assert.equal(csvCell("plain"), "plain");
    assert.equal(csvCell("a,b"), '"a,b"');
    assert.equal(csvCell('say "hi"'), '"say ""hi"""');
    assert.equal(csvCell("two\nlines"), '"two\nlines"');
    assert.equal(csvCell("cr\rhere"), '"cr\rhere"');
    assert.equal(csvCell(null), "");
  });
  it("writes numbers as they are, including negatives", () => {
    assert.equal(csvCell(-25000), "-25000");
    assert.equal(csvCell(0), "0");
  });
  it("defuses text that a spreadsheet would run as a formula", () => {
    assert.equal(csvCell("=SUM(A1:A9)"), "'=SUM(A1:A9)");
    assert.equal(csvCell("+62812"), "'+62812");
    assert.equal(csvCell("-5 off"), "'-5 off");
    assert.equal(csvCell("@cmd"), "'@cmd");
    assert.equal(csvCell("=1,2"), `"'=1,2"`);
    assert.equal(csvCell("ok = fine"), "ok = fine");
  });
  it("starts with a byte order mark and ends every line with CRLF", () => {
    const out = toCsv(["A", "B"], [["x", 1], ["y,z", -2]]);
    assert.equal(out, '\uFEFFA,B\r\nx,1\r\n"y,z",-2\r\n');
  });
});

describe("calendar helpers", () => {
  it("moves days and months across month and year edges", () => {
    assert.equal(addDays("2026-11-30", 1), "2026-12-01");
    assert.equal(addDays("2026-03-01", -1), "2026-02-28");
    assert.equal(addDays("2024-03-01", -1), "2024-02-29");
    assert.equal(shiftMonth("2026-12", 1), "2027-01");
    assert.equal(shiftMonth("2026-01", -1), "2025-12");
    assert.equal(shiftMonth("2026-05", -17), "2024-12");
  });
  it("builds Monday-first weeks that always hold whole weeks of 7 days", () => {
    const nov = monthGrid("2026-11"); // 1 Nov 2026 is a Sunday
    assert.deepEqual([nov.length, nov[0][0].date, nov[0][6].date, nov.at(-1)![6].date], [6, "2026-10-26", "2026-11-01", "2026-12-06"]);
    assert.deepEqual(nov[0].map((d) => d.inMonth), [false, false, false, false, false, false, true]);
    const feb = monthGrid("2026-02"); // 1 Feb 2026 is a Sunday
    assert.deepEqual([feb.length, feb[0][6].date, feb.at(-1)![6].date], [5, "2026-02-01", "2026-03-01"]);
    const mon = monthGrid("2026-06"); // 1 Jun 2026 is a Monday and the month has 30 days
    assert.deepEqual([mon[0][0].date, mon[0][0].inMonth, mon.length], ["2026-06-01", true, 5]);
    for (const month of ["2024-02", "2026-01", "2026-09", "2027-02"]) {
      const g = monthGrid(month);
      assert.ok(g.every((w) => w.length === 7), month);
      const days = g.flat().filter((d) => d.inMonth).map((d) => d.day);
      assert.deepEqual([days[0], days.at(-1), new Set(days).size], [1, days.length, days.length], month);
    }
  });
  it("works out the common ranges from today", () => {
    const p = Object.fromEntries(rangePresets("2026-11-19").map((r) => [r.key, [r.from, r.to]]));
    assert.deepEqual(p.today, ["2026-11-19", "2026-11-19"]);
    assert.deepEqual(p.yesterday, ["2026-11-18", "2026-11-18"]);
    assert.deepEqual(p["this-week"], ["2026-11-16", "2026-11-22"]);
    assert.deepEqual(p["last-week"], ["2026-11-09", "2026-11-15"]);
    assert.deepEqual(p["this-month"], ["2026-11-01", "2026-11-30"]);
    assert.deepEqual(p["last-month"], ["2026-10-01", "2026-10-31"]);
    assert.deepEqual(p["last-30"], ["2026-10-21", "2026-11-19"]);
    assert.deepEqual(p["this-year"], ["2026-01-01", "2026-12-31"]);
    assert.equal(rangePresets("2026-03-05").find((r) => r.key === "last-month")!.to, "2026-02-28");
    assert.equal(rangePresets("2024-03-05").find((r) => r.key === "last-month")!.to, "2024-02-29");
    assert.deepEqual(rangePresets("2026-01-03").find((r) => r.key === "last-month"), { key: "last-month", label: "Last month", from: "2025-12-01", to: "2025-12-31" });
  });
});

describe("balanceBreakdown", () => {
  const a = (type: string, balance: number, includeInTotal = true) => ({ type: type as never, balance, includeInTotal });
  it("keeps paylater and credit cards apart as bills", () => {
    const r = balanceBreakdown([a("bank", 9_000_000), a("ewallet", 300_000), a("paylater", -450_000), a("credit_card", -50_000), a("cash", 100_000)]);
    assert.deepEqual([r.holdings.length, r.bills.length], [3, 2]);
    assert.deepEqual([r.assets, r.owed, r.total], [9_400_000, 500_000, 8_900_000]);
  });
  it("matches the plain sum of every counted balance", () => {
    const list = [a("bank", 1_000), a("paylater", -300), a("ewallet", 50, false), a("credit_card", -20, false)];
    const r = balanceBreakdown(list);
    assert.equal(r.total, list.filter((x) => x.includeInTotal).reduce((s, x) => s + x.balance, 0));
    assert.deepEqual([r.assets, r.owed], [1_000, 300], "accounts switched off add nothing");
  });
  it("handles no bills, no accounts, and an overpaid bill", () => {
    const one = balanceBreakdown([a("bank", 5)]);
    assert.deepEqual([one.owed, one.total], [0, 5]);
    assert.deepEqual(balanceBreakdown([]), { holdings: [], bills: [], assets: 0, owed: 0, total: 0 });
    const over = balanceBreakdown([a("bank", 1_000), a("paylater", 200)]);
    assert.deepEqual([over.owed, over.total], [-200, 1_200], "an overpaid bill counts in your favour");
  });
});

describe("grounding of AI answers", () => {
  const allowed = (data: unknown) => collectAllowed(data);
  it("finds amounts in the ways people write them, and skips years, dates and small counts", () => {
    assert.deepEqual(extractFigures("Rp 242,500 and Rp.1.250.000 and 25,000 and 1500000").amounts, [242_500, 1_250_000, 25_000, 1_500_000]);
    assert.deepEqual(extractFigures("On 2026-11-19 in 2026, 3 transactions, Rp 500").amounts, [500]);
    assert.deepEqual(extractFigures("up 35% and 12,5 % less").percents, [35, 12.5]);
    assert.deepEqual(extractFigures("about 50k or 2 juta").abbreviated, ["50k", "2 juta"]);
  });
  it("accepts an answer whose figures all come from the data", () => {
    const data = { total: 242_500, previousTotal: 110_000, changePct: 120, items: [{ name: "Food", amount: 160_000, sharePct: 66 }] };
    assert.deepEqual(ungroundedFigures("You spent Rp 242,500 this week, 120% more than Rp 110.000 last week. Food was Rp 160,000 (66%).", allowed(data)), []);
  });
  it("rejects an amount or a percentage the model made up", () => {
    const data = { total: 242_500, changePct: 120 };
    assert.deepEqual(ungroundedFigures("You spent Rp 250,000 this week.", allowed(data)), ["amount 250000"]);
    assert.deepEqual(ungroundedFigures("That is up 40%.", allowed(data)), ["percentage 40%"]);
  });
  it("rejects shorthand amounts, because they cannot be checked", () => {
    assert.equal(ungroundedFigures("About 50k a day.", allowed({ total: 50_000 })).length, 1);
  });
  it("does not trip over words, dates or counts", () => {
    assert.deepEqual(ungroundedFigures("On 19 November 2026 you made 3 transactions in 2 accounts.", allowed({})), []);
  });
  it("counts figures the person typed themselves as known", () => {
    assert.deepEqual(ungroundedFigures("Added Rp 25,000.", allowed("catat kopi Rp 25.000")), []);
  });
  it("matches percentages that round to the same whole number", () => {
    assert.deepEqual(ungroundedFigures("Up 120% and 66%.", allowed({ a: 119.6, b: 65.7 })), []);
  });
});

describe("parseUserAmounts", () => {
  const has = (text: string, ...wanted: number[]) => { const got = parseUserAmounts(text); for (const w of wanted) assert.ok(got.includes(w), `${text} -> ${got.join(",")} lacks ${w}`); };
  it("reads the ways Indonesians write money", () => {
    has("catat kopi 25000", 25_000);
    has("kopi 25.000 dan makan 40,000", 25_000, 40_000);
    has("kopi 25rb", 25_000);
    has("kopi 25 ribu", 25_000);
    has("bensin 25k", 25_000);
    has("gaji 5 juta", 5_000_000);
    has("gaji 1,5 juta", 1_500_000);
    has("gaji 1.5jt", 1_500_000);
    has("bonus 2m", 2_000_000);
    has("Rp 1.250.000", 1_250_000);
  });
  it("does not turn a year or a date into a different amount", () => {
    assert.ok(!parseUserAmounts("tanggal 19 November 2026").includes(19_000));
    assert.ok(!parseUserAmounts("kopi 25000").includes(25));
  });
  it("finds nothing in a message without numbers", () => {
    assert.deepEqual(parseUserAmounts("catat kopi pakai BCA"), []);
  });
});

describe("pay cycle", async () => {
  const { cycleMonth, cycleRange, periodRange, previousRange, flowBuckets, normalizeCycleDay } = await import("../src/index");
  it("start day 1 is the calendar month", () => {
    assert.deepEqual(cycleRange("2026-02", 1), { from: "2026-02-01", to: "2026-02-28" });
    assert.deepEqual(periodRange("month", "2026-11-19"), { from: "2026-11-01", to: "2026-11-30" });
  });
  it("a cycle starting on the 20th runs to the 19th", () => {
    assert.deepEqual(cycleRange("2026-11", 20), { from: "2026-11-20", to: "2026-12-19" });
    assert.deepEqual(cycleRange("2026-12", 20), { from: "2026-12-20", to: "2027-01-19" });
  });
  it("a day belongs to the cycle that started before it", () => {
    assert.equal(cycleMonth("2026-11-19", 20), "2026-10");
    assert.equal(cycleMonth("2026-11-20", 20), "2026-11");
    assert.equal(cycleMonth("2026-12-05", 20), "2026-11");
    assert.equal(cycleMonth("2026-01-05", 20), "2025-12");
  });
  it("periodRange month follows the cycle and leaves week and year alone", () => {
    assert.deepEqual(periodRange("month", "2026-12-05", 20), { from: "2026-11-20", to: "2026-12-19" });
    assert.deepEqual(periodRange("year", "2026-12-05", 20), { from: "2026-01-01", to: "2026-12-31" });
    assert.deepEqual(periodRange("week", "2026-11-19", 20), periodRange("week", "2026-11-19"));
  });
  it("the previous range is the same stretch of the cycle before", () => {
    // 5 days into the cycle that began on 2026-11-20.
    assert.deepEqual(previousRange("month", "2026-11-25", 20), { from: "2026-10-20", to: "2026-10-25" });
    // The default still compares calendar months.
    assert.deepEqual(previousRange("month", "2026-11-19"), { from: "2026-10-01", to: "2026-10-19" });
    // A longer cycle is clipped to the end of the shorter one before it.
    assert.deepEqual(previousRange("month", "2026-04-18", 20), { from: "2026-02-20", to: "2026-03-19" });
  });
  it("the month chart cuts the cycle into weeks that cover it exactly", () => {
    const range = periodRange("month", "2026-11-25", 20);
    const weeks = flowBuckets("month", "2026-11-25", 20);
    assert.equal(weeks[0].from, range.from);
    assert.equal(weeks.at(-1)?.to, range.to);
  });
  it("a bad start day becomes 1", () => {
    for (const bad of [0, 29, -3, 1.5, "20", null, undefined]) assert.equal(normalizeCycleDay(bad), 1);
    assert.equal(normalizeCycleDay(28), 28);
  });
});

describe("insight wording", async () => {
  const { LANGUAGES, buildInsights } = await import("../src/index");
  const input = {
    period: "month" as const,
    expenseCount: 3,
    categories: [{ categoryId: "a", name: "Food", amount: 300_000, previousAmount: 100_000, changePct: 200, share: 1 }],
    budgets: [{ categoryId: "a", name: "Food", budget: 200_000, spent: 300_000 }, { categoryId: "b", name: "Fun", budget: 100_000, spent: 90_000 }],
    biggest: { amount: 120_000, description: "Dinner", categoryName: "Food" },
    staleAccounts: [{ name: "BCA", days: 20 }],
    fees: { amount: 6_500, count: 2 },
  };
  it("every language words every note, with the same figures as English", () => {
    const english = buildInsights(input, "en");
    assert.ok(english.length >= 5);
    for (const l of LANGUAGES) {
      const notes = buildInsights(input, l.code);
      assert.deepEqual(notes.map((n) => n.id), english.map((n) => n.id), l.code);
      notes.forEach((n, i) => {
        assert.ok(n.text.length > 10, `${l.code} ${n.id}`);
        assert.ok(!/undefined|NaN|\[object/.test(n.text), `${l.code} ${n.id}: ${n.text}`);
        // The same money appears in a note whatever the language (the order may differ).
        const figures = (t: string) => (t.match(/Rp\s?\d{1,3}(?:,\d{3})*/g) ?? []).sort().join("|");
        assert.equal(figures(n.text), figures(english[i].text), `${l.code} ${n.id}`);
        if (l.code !== "en") assert.notEqual(n.text, english[i].text, `${l.code} ${n.id} was not translated`);
      });
    }
  });
  it("says so when there is nothing to analyse, in every language", () => {
    for (const l of LANGUAGES) {
      const [only] = buildInsights({ ...input, expenseCount: 0, categories: [], budgets: [], biggest: null, staleAccounts: [], fees: { amount: 0, count: 0 } }, l.code);
      assert.equal(only.id, "empty");
      assert.ok(only.text.length > 10);
    }
  });
  it("writes a default category in the person's language and leaves their own as typed", () => {
    const named = { ...input, categories: [{ categoryId: "a", name: "Food & Drinks", amount: 300_000, previousAmount: 100_000, changePct: 200, share: 1 }], budgets: [{ categoryId: "a", name: "Food & Drinks", budget: 200_000, spent: 300_000 }, { categoryId: "p", name: "My Pets", budget: 100_000, spent: 150_000 }] };
    const id = buildInsights(named, "id").map((n) => n.text).join(" ");
    assert.match(id, /Makanan & Minuman/);
    assert.ok(!/Food & Drinks/.test(id), "the English name is gone");
    assert.match(id, /My Pets/, "a category the person made stays as typed");
    assert.match(buildInsights(named, "en").map((n) => n.text).join(" "), /Food & Drinks/);
  });
});
