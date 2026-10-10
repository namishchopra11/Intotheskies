// Absolute-minute time helpers. A time is minutes since the UTC epoch; each airport has a fixed
// tz offset used only to read and display local times. Nothing here touches the device timezone.

const MS = 60000;
export const DAY = 1440;

export const dateToDays = (d: string) => {
  const [y, m, day] = d.split("-").map(Number);
  return Math.floor(Date.UTC(y, m - 1, day) / MS / DAY);
};
export const daysToDate = (n: number) => new Date(n * DAY * MS).toISOString().slice(0, 10);
export const addDays = (d: string, n: number) => daysToDate(dateToDays(d) + n);
export const dowOf = (d: string) => new Date(dateToDays(d) * DAY * MS).getUTCDay();

/** First date on/after `from` (or strictly after when `strict`) that falls on weekday `dow`. */
export const nextDow = (from: string, dow: number, strict = false) => {
  let n = (dow - dowOf(from) + 7) % 7;
  if (strict && n === 0) n = 7;
  return addDays(from, n);
};

export const toAbs = (date: string, hhmm: string, tz: number) => {
  const [h, m] = hhmm.split(":").map(Number);
  return dateToDays(date) * DAY + h * 60 + m - tz * 60;
};
export const dayStart = (date: string, tz: number) => toAbs(date, "00:00", tz);
export const dayEnd = (date: string, tz: number) => toAbs(date, "23:59", tz);

const local = (abs: number, tz: number) => new Date((abs + tz * 60) * MS);
export const localDate = (abs: number, tz: number) => local(abs, tz).toISOString().slice(0, 10);
export const localHHmm = (abs: number, tz: number) => local(abs, tz).toISOString().slice(11, 16);

export const fmtHHmm = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
};
export const fmtTime = (abs: number, tz: number) => fmtHHmm(localHHmm(abs, tz));

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DOWS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
export const fmtDate = (d: string) => {
  const [, m, day] = d.split("-").map(Number);
  return `${DOWS[dowOf(d)]}, ${MONTHS[m - 1]} ${day}`;
};
export const fmtDay = (abs: number, tz: number) => fmtDate(localDate(abs, tz));

export const fmtDur = (min: number) => {
  const m = Math.round(Math.abs(min));
  const h = Math.floor(m / 60);
  return h ? `${h}h${m % 60 ? ` ${String(m % 60).padStart(2, "0")}m` : ""}` : `${m}m`;
};

export const usd = (n: number) => `${n < 0 ? "−" : ""}$${Math.abs(Math.round(n)).toLocaleString("en-US")}`;
