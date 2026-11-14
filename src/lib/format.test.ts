import { describe, expect, it } from "vitest";
import { longDate, daysBetween, formatBRL, localToday, longMonth, weekdayDate, shortDate, badgeDate } from "./format";

describe("format", () => {
  it("shows reais without cents when there are no cents", () => {
    expect(formatBRL(3600)).toBe("R$ 36");
    expect(formatBRL(29200)).toBe("R$ 292");
    expect(formatBRL(1250)).toBe("R$ 12,50");
    expect(formatBRL(0)).toBe("R$ 0");
    expect(formatBRL(123456)).toBe("R$ 1.234,56");
  });

  it("formats sale day dates without depending on the time zone", () => {
    expect(shortDate("2026-11-01")).toBe("01 nov");
    expect(longMonth("2026-10-18")).toBe("Outubro de 2026");
    expect(longMonth("2026-03-01")).toBe("Março de 2026");
    expect(longDate("2026-11-15")).toBe("Domingo, 15 de novembro");
    expect(longDate("2026-10-18")).toBe("Domingo, 18 de outubro");
    expect(weekdayDate("2026-11-15")).toBe("Dom, 15 nov");
    expect(weekdayDate("2026-11-07")).toBe("Sáb, 7 nov");
    expect(weekdayDate("2027-01-01")).toBe("Sex, 1 jan");
    expect(badgeDate("2026-11-15")).toEqual({ day: "15", month: "nov" });
  });

  it("counts days between dates", () => {
    expect(daysBetween("2026-10-18", "2026-11-04")).toBe(17);
    expect(daysBetween("2026-11-04", "2026-11-04")).toBe(0);
  });

  it("uses the device's local date for today", () => {
    expect(localToday(new Date(2026, 0, 5, 23, 30))).toBe("2026-01-05");
  });
});
