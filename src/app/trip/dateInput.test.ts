import { describe, expect, it } from "vitest";
import { formatDateInput, parseDate, parseTime } from "./dateInput";

const today = { y: 2026, m: 10, d: 10 };
const date = (s: string, dayFirst = true) => parseDate(s, today, dayFirst);

describe("parseDate", () => {
  it("reads written-out dates in either order, with or without a weekday", () => {
    expect(date("17 Oct 2026")).toBe("2026-10-17");
    expect(date("Oct 17, 2026")).toBe("2026-10-17");
    expect(date("Sat 17 October")).toBe("2026-10-17");
    expect(date("17th oct")).toBe("2026-10-17");
  });

  it("reads numeric dates day-first, or month-first for US readers", () => {
    expect(date("2026-10-17")).toBe("2026-10-17");
    expect(date("17/10/2026")).toBe("2026-10-17");
    expect(date("05/10/26")).toBe("2026-10-05");
    expect(date("05/10/26", false)).toBe("2026-05-10");
    expect(date("10/17", false)).toBe("2026-10-17");
    expect(date("10/17")).toBe("2026-10-17"); // 17 can't be a month
  });

  it("fills in the year so the date is upcoming", () => {
    expect(date("3 Jan")).toBe("2027-01-03");
    expect(date("20 Sep")).toBe("2026-09-20"); // within the last month: this year
  });

  it("understands today and tomorrow, across a month end", () => {
    expect(date("today")).toBe("2026-10-10");
    expect(parseDate("tomorrow", { y: 2026, m: 12, d: 31 })).toBe("2027-01-01");
  });

  it("rejects what isn't a real date", () => {
    expect(date("31 Feb 2026")).toBeNull();
    expect(date("next week")).toBeNull();
    expect(date("17")).toBeNull();
  });
});

describe("parseTime", () => {
  it("reads 24-hour and 12-hour times", () => {
    expect(parseTime("14:25")).toBe("14:25");
    expect(parseTime("1425")).toBe("14:25");
    expect(parseTime("14.25")).toBe("14:25");
    expect(parseTime("2:25pm")).toBe("14:25");
    expect(parseTime("2 pm")).toBe("14:00");
    expect(parseTime("12am")).toBe("00:00");
    expect(parseTime("9")).toBe("09:00");
  });

  it("rejects impossible times", () => {
    expect(parseTime("25:00")).toBeNull();
    expect(parseTime("13pm")).toBeNull();
    expect(parseTime("soon")).toBeNull();
  });
});

it("formats a date the way the box shows it", () => {
  expect(formatDateInput("2026-10-07")).toBe("7 Oct 2026");
});
