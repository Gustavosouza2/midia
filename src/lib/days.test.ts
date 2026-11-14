import { describe, expect, it } from "vitest";
import type { SaleDay } from "@/local-db";
import { groupByMonth, newDayDate, initialDay, activeDays, dayTag, neighbors } from "./days";

function day(date: string, canceledAt: string | null = null): SaleDay {
  return {
    id: date,
    canteenId: "c",
    date,
    name: null,
    closedAt: null,
    canceledAt,
    updatedAt: "2026-11-01T00:00:00.000Z",
    seq: 1,
  };
}

const ids = (days: (SaleDay | null)[]) => days.map((d) => d?.date ?? null);

describe("activeDays", () => {
  it("drops removed days and sorts newest first", () => {
    const days = [day("2026-10-18"), day("2026-11-15"), day("2026-11-08", "2026-11-02T10:00:00Z"), day("2026-11-01")];
    expect(ids(activeDays(days))).toEqual(["2026-11-15", "2026-11-01", "2026-10-18"]);
  });
});

describe("initialDay", () => {
  const days = activeDays([day("2026-11-01"), day("2026-11-15"), day("2026-11-22"), day("2026-11-08")]);

  it("opens today when today has a day", () => {
    expect(initialDay(days, "2026-11-08")?.date).toBe("2026-11-08");
  });

  it("else opens the upcoming day", () => {
    expect(initialDay(days, "2026-11-12")?.date).toBe("2026-11-15");
  });

  it("else opens the most recent", () => {
    expect(initialDay(days, "2026-12-01")?.date).toBe("2026-11-22");
  });

  it("opens nothing when there are no days", () => {
    expect(initialDay([], "2026-11-12")).toBeNull();
  });
});

describe("newDayDate", () => {
  it("suggests the next Sunday", () => {
    // 12/11/2026 is a Thursday.
    expect(newDayDate([], "2026-11-12")).toBe("2026-11-15");
  });

  it("suggests today when today is Sunday and free", () => {
    expect(newDayDate([], "2026-11-15")).toBe("2026-11-15");
  });

  it("skips Sundays that already have a day", () => {
    expect(newDayDate([day("2026-11-15"), day("2026-11-22")], "2026-11-15")).toBe("2026-11-29");
  });

  it("crosses the year boundary", () => {
    expect(newDayDate([], "2026-12-28")).toBe("2027-01-03");
  });
});

describe("dayTag", () => {
  const days = activeDays([day("2026-11-22"), day("2026-11-15"), day("2026-11-12"), day("2026-11-08")]);
  const tag = (date: string, today: string) => dayTag(days.find((d) => d.date === date)!, days, today);

  it("tags today when the day is today, and does not tag upcoming", () => {
    expect(tag("2026-11-12", "2026-11-12")).toBe("hoje");
    expect(tag("2026-11-15", "2026-11-12")).toBeNull();
  });

  it("tags the upcoming day when today has no day", () => {
    expect(tag("2026-11-15", "2026-11-13")).toBe("próximo");
    expect(tag("2026-11-22", "2026-11-13")).toBeNull();
    expect(tag("2026-11-12", "2026-11-13")).toBeNull();
  });
});

describe("neighbors", () => {
  const days = activeDays([day("2026-11-15"), day("2026-11-08"), day("2026-11-01")]);
  const dates = (v: ReturnType<typeof neighbors>) => [v.previous?.date ?? null, v.next?.date ?? null];

  it("previous is the older one and next the newer one", () => {
    expect(dates(neighbors(days, "2026-11-08"))).toEqual(["2026-11-01", "2026-11-15"]);
  });

  it("has no neighbor past the ends", () => {
    expect(dates(neighbors(days, "2026-11-15"))).toEqual(["2026-11-08", null]);
    expect(dates(neighbors(days, "2026-11-01"))).toEqual([null, "2026-11-08"]);
  });

  it("with no selected day (Todos os dias), has no neighbors", () => {
    expect(dates(neighbors(days, "all"))).toEqual([null, null]);
  });
});

describe("groupByMonth", () => {
  it("groups by month in list order", () => {
    const days = activeDays(["2026-11-08", "2026-10-25", "2026-10-11", "2026-09-27"].map((d) => day(d)));
    expect(groupByMonth(days).map(([month, inMonth]) => [month, ids(inMonth)])).toEqual([
      ["Novembro de 2026", ["2026-11-08"]],
      ["Outubro de 2026", ["2026-10-25", "2026-10-11"]],
      ["Setembro de 2026", ["2026-09-27"]],
    ]);
  });
});
