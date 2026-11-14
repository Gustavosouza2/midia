const SHORT_MONTHS = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const MONTHS = [
  "janeiro",
  "fevereiro",
  "março",
  "abril",
  "maio",
  "junho",
  "julho",
  "agosto",
  "setembro",
  "outubro",
  "novembro",
  "dezembro",
];
const SHORT_WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const WEEKDAYS = [
  "Domingo",
  "Segunda-feira",
  "Terça-feira",
  "Quarta-feira",
  "Quinta-feira",
  "Sexta-feira",
  "Sábado",
];

const wholeFormat = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 });
const withCents = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function formatBRL(cents: number): string {
  const reais = cents / 100;
  return "R$ " + (cents % 100 === 0 ? wholeFormat : withCents).format(reais);
}

function parts(date: string) {
  const [year, month, day] = date.split("-").map(Number);
  return { year, month, day, weekday: new Date(Date.UTC(year, month - 1, day)).getUTCDay() };
}

export function shortDate(date: string): string {
  const { month, day } = parts(date);
  return String(day).padStart(2, "0") + " " + SHORT_MONTHS[month - 1];
}

/** "Dom, 15 nov": the day filter label. */
export function weekdayDate(date: string): string {
  const { month, day, weekday } = parts(date);
  return `${SHORT_WEEKDAYS[weekday]}, ${day} ${SHORT_MONTHS[month - 1]}`;
}

export function longDate(date: string): string {
  const { month, day, weekday } = parts(date);
  return `${WEEKDAYS[weekday]}, ${day} de ${MONTHS[month - 1]}`;
}

export function longMonth(date: string): string {
  const { year, month } = parts(date);
  const name = MONTHS[month - 1];
  return `${name[0].toUpperCase()}${name.slice(1)} de ${year}`;
}

export function badgeDate(date: string): { day: string; month: string } {
  const { month, day } = parts(date);
  return { day: String(day), month: SHORT_MONTHS[month - 1] };
}

export function daysBetween(from: string, to: string): number {
  const a = parts(from);
  const b = parts(to);
  return Math.round((Date.UTC(b.year, b.month - 1, b.day) - Date.UTC(a.year, a.month - 1, a.day)) / 86_400_000);
}

export function localToday(now = new Date()): string {
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

export function localDate(iso: string): string {
  return localToday(new Date(iso));
}

export function initials(name: string): string {
  return name.trim().slice(0, 2).toUpperCase() || "?";
}

export function plural(n: number, singular: string, many: string): string {
  return `${n} ${n === 1 ? singular : many}`;
}
