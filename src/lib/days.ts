import type { SaleDay } from "@/local-db";
import { longMonth } from "./format";

/** Day filter rules (DESIGN.md, "Sale days"). Dates are always "YYYY-MM-DD". */

/** Days not removed, newest first: the order of the day list. */
export function activeDays(days: SaleDay[]): SaleDay[] {
  return days.filter((d) => !d.canceledAt).sort((a, b) => b.date.localeCompare(a.date));
}

/** The first day dated today or later. `days` in activeDays() order. */
export function upcomingDay(days: SaleDay[], today: string): SaleDay | null {
  return days.findLast((d) => d.date >= today) ?? null;
}

/** Day opened when entering the screen: today, else the upcoming day, else the most recent. */
export function initialDay(days: SaleDay[], today: string): SaleDay | null {
  return upcomingDay(days, today) ?? days[0] ?? null;
}

/** Badge next to the date: "hoje" on today's day, "próximo" on the upcoming day when it has not arrived yet. */
export function dayTag(day: SaleDay, days: SaleDay[], today: string): "hoje" | "próximo" | null {
  if (day.date === today) return "hoje";
  return day.id === upcomingDay(days, today)?.id ? "próximo" : null;
}

/** The days behind the ‹ and › arrows: the previous (older) and the next (newer). `days` in activeDays() order. */
export function neighbors(days: SaleDay[], dayId: string): { previous: SaleDay | null; next: SaleDay | null } {
  const i = days.findIndex((d) => d.id === dayId);
  if (i === -1) return { previous: null, next: null };
  return { previous: days[i + 1] ?? null, next: days[i - 1] ?? null };
}

/** Suggested date for a new day: the next Sunday without a day (today, if it is Sunday and free). */
export function newDayDate(days: SaleDay[], today: string): string {
  const taken = new Set(days.map((d) => d.date));
  const [year, month, day] = today.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + ((7 - date.getUTCDay()) % 7));
  while (taken.has(date.toISOString().slice(0, 10))) date.setUTCDate(date.getUTCDate() + 7);
  return date.toISOString().slice(0, 10);
}

/** [["Novembro de 2026", [...]], ["Outubro de 2026", [...]]], keeping the order of the days. */
export function groupByMonth(days: SaleDay[]): [string, SaleDay[]][] {
  const groups = new Map<string, SaleDay[]>();
  for (const day of days) {
    const month = longMonth(day.date);
    groups.set(month, [...(groups.get(month) ?? []), day]);
  }
  return [...groups];
}
