/**
 * Reading dates and times the way people type them, into the app's wall-clock strings.
 * Pure string work: no Date objects for trip times, so nothing shifts with the device
 * timezone. `today` is only used to fill in a missing year.
 */

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const pad = (n: number) => String(n).padStart(2, "0");

export type YMD = { y: number; m: number; d: number };

function daysIn(y: number, m: number): number {
  return [31, y % 4 === 0 && (y % 100 !== 0 || y % 400 === 0) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][m - 1];
}

function valid({ y, m, d }: YMD): boolean {
  return y >= 2000 && y <= 2100 && m >= 1 && m <= 12 && d >= 1 && d <= daysIn(y, m);
}

function addDays({ y, m, d }: YMD, n: number): YMD {
  let day = d + n;
  let month = m;
  let year = y;
  while (day > daysIn(year, month)) {
    day -= daysIn(year, month);
    month = month === 12 ? 1 : month + 1;
    if (month === 1) year += 1;
  }
  return { y: year, m: month, d: day };
}

const asNumber = (s: string) => Number(s);
const ord = ({ y, m, d }: YMD) => y * 10000 + m * 100 + d;

/**
 * With no year typed, pick the one that makes the date upcoming: this year, unless that is
 * more than a month ago, then next year. Trips are booked ahead, rarely looked up after.
 */
function withYear(m: number, d: number, today: YMD): YMD {
  const thisYear = { y: today.y, m, d };
  const monthAgo = { ...today, m: today.m === 1 ? 12 : today.m - 1, y: today.m === 1 ? today.y - 1 : today.y };
  return ord(thisYear) < ord(monthAgo) ? { y: today.y + 1, m, d } : thisYear;
}

const fullYear = (s: string) => (s.length === 2 ? 2000 + asNumber(s) : asNumber(s));

/**
 * "17 Oct", "Oct 17, 2026", "Sat 17 October", "17/10/2026", "10/17", "2026-10-17", "today",
 * "tomorrow". Numeric dates are read day-first unless `dayFirst` is false (US style); a
 * number above 12 settles it either way. Returns "YYYY-MM-DD" or null.
 */
export function parseDate(input: string, today: YMD, dayFirst = true): string | null {
  const s = input.trim().toLowerCase().replace(/(\d)(st|nd|rd|th)\b/g, "$1").replace(/[,.]/g, " ");
  if (!s) return null;
  const out = (v: YMD | null) => (v && valid(v) ? `${v.y}-${pad(v.m)}-${pad(v.d)}` : null);

  if (s === "today") return out(today);
  if (s === "tomorrow" || s === "tmrw") return out(addDays(today, 1));

  let m = s.match(/^(\d{4})[-/ ](\d{1,2})[-/ ](\d{1,2})$/);
  if (m) return out({ y: asNumber(m[1]), m: asNumber(m[2]), d: asNumber(m[3]) });

  m = s.match(/^(\d{1,2})[/\-](\d{1,2})(?:[/\-](\d{2}|\d{4}))?$/);
  if (m) {
    const [a, b] = [asNumber(m[1]), asNumber(m[2])];
    const dayFirstHere = a > 12 ? true : b > 12 ? false : dayFirst;
    const [day, month] = dayFirstHere ? [a, b] : [b, a];
    return out(m[3] ? { y: fullYear(m[3]), m: month, d: day } : withYear(month, day, today));
  }

  // Words: drop a weekday, find the month name and the numbers around it.
  const words = s.split(/\s+/).filter((w) => !/^(mon|tue|wed|thu|fri|sat|sun)[a-z]*$/.test(w));
  const monthAt = words.findIndex((w) => /^[a-z]{3,}$/.test(w) && MONTHS.includes(w.slice(0, 3)));
  if (monthAt === -1) return null;
  const month = MONTHS.indexOf(words[monthAt].slice(0, 3)) + 1;
  const numbers = words.filter((_, i) => i !== monthAt);
  if (numbers.length === 0 || numbers.length > 2 || numbers.some((n) => !/^\d{1,4}$/.test(n))) return null;
  const day = numbers.find((n) => n.length <= 2);
  const year = numbers.find((n) => n.length === 4);
  if (!day || (numbers.length === 2 && !year)) return null;
  return out(year ? { y: asNumber(year), m: month, d: asNumber(day) } : withYear(month, asNumber(day), today));
}

/** "14:35", "1435", "2:35pm", "2pm", "14.35", "14h35", "9 05". Returns "HH:mm" or null. */
export function parseTime(input: string): string | null {
  const s = input.trim().toLowerCase().replace(/\s+/g, " ");
  if (!s) return null;
  if (s === "noon") return "12:00";
  if (s === "midnight") return "00:00";
  const m = s.match(/^(\d{1,2})(?:[:.h ]?(\d{2}))?\s*(am|pm|a|p)?$/);
  if (!m) return null;
  let h = Number(m[1]);
  const min = m[2] ? Number(m[2]) : 0;
  const half = m[3]?.[0];
  if (half) {
    if (h < 1 || h > 12) return null;
    if (half === "p" && h !== 12) h += 12;
    if (half === "a" && h === 12) h = 0;
  }
  if (h > 23 || min > 59) return null;
  return `${pad(h)}:${pad(min)}`;
}

/** "2026-10-17" -> "17 Oct 2026", the form the date box shows after reading it. */
export function formatDateInput(ymd: string): string {
  const [y, m, d] = ymd.split("-").map(Number);
  return `${d} ${MONTH_NAMES[m - 1]} ${y}`;
}

/** Today on this device, as numbers. Only used to guess a missing year. */
export function todayYMD(): YMD {
  const now = new Date();
  return { y: now.getFullYear(), m: now.getMonth() + 1, d: now.getDate() };
}
