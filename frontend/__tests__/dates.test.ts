/**
 * Tests for date utility functions.
 */
import {
  format,
  getCalendarDays,
  formatTime,
  formatDateRange,
  startOfMonth,
  endOfMonth,
  isSameDay,
  isSameMonth,
  addMonths,
  subMonths,
  addDays,
  subDays,
  parseISO,
  isWithinInterval,
} from "../lib/dates";

describe("getCalendarDays", () => {
  it("returns 35 or 42 days covering the full calendar grid", () => {
    const days = getCalendarDays(new Date(2026, 2, 1)); // March 2026
    // Should start on Sunday and end on Saturday
    expect(days.length % 7).toBe(0);
    expect(days.length).toBeGreaterThanOrEqual(28);
    expect(days.length).toBeLessThanOrEqual(42);
  });

  it("starts on a Sunday", () => {
    const days = getCalendarDays(new Date(2026, 2, 1));
    expect(days[0].getDay()).toBe(0); // Sunday
  });

  it("ends on a Saturday", () => {
    const days = getCalendarDays(new Date(2026, 2, 1));
    expect(days[days.length - 1].getDay()).toBe(6); // Saturday
  });

  it("includes all days of the target month", () => {
    const march2026 = new Date(2026, 2, 1);
    const days = getCalendarDays(march2026);
    const marchDays = days.filter((d) => d.getMonth() === 2);
    expect(marchDays.length).toBe(31); // March has 31 days
  });

  it("handles February in a leap year", () => {
    const feb2028 = new Date(2028, 1, 1); // 2028 is a leap year
    const days = getCalendarDays(feb2028);
    const febDays = days.filter((d) => d.getMonth() === 1);
    expect(febDays.length).toBe(29);
  });

  it("handles February in a non-leap year", () => {
    const feb2026 = new Date(2026, 1, 1);
    const days = getCalendarDays(feb2026);
    const febDays = days.filter((d) => d.getMonth() === 1);
    expect(febDays.length).toBe(28);
  });
});

describe("formatTime", () => {
  it("formats morning time", () => {
    expect(formatTime("2026-03-10T09:30:00")).toBe("9:30 AM");
  });

  it("formats afternoon time", () => {
    expect(formatTime("2026-03-10T14:00:00")).toBe("2:00 PM");
  });

  it("formats midnight", () => {
    expect(formatTime("2026-03-10T00:00:00")).toBe("12:00 AM");
  });

  it("formats noon", () => {
    expect(formatTime("2026-03-10T12:00:00")).toBe("12:00 PM");
  });

  it("accepts Date objects", () => {
    const d = new Date(2026, 2, 10, 15, 45);
    expect(formatTime(d)).toBe("3:45 PM");
  });
});

describe("formatDateRange", () => {
  it("shows time only for same-day events", () => {
    const result = formatDateRange(
      "2026-03-10T09:00:00",
      "2026-03-10T10:00:00"
    );
    expect(result).toContain("9:00 AM");
    expect(result).toContain("10:00 AM");
    expect(result).toContain("-");
  });

  it("shows date and time for multi-day events", () => {
    const result = formatDateRange(
      "2026-03-10T09:00:00",
      "2026-03-11T17:00:00"
    );
    expect(result).toContain("Mar 10");
    expect(result).toContain("Mar 11");
  });
});

describe("date-fns re-exports", () => {
  it("format works", () => {
    expect(format(new Date(2026, 2, 6), "yyyy-MM-dd")).toBe("2026-03-06");
  });

  it("isSameDay works", () => {
    expect(isSameDay(new Date(2026, 2, 6), new Date(2026, 2, 6))).toBe(true);
    expect(isSameDay(new Date(2026, 2, 6), new Date(2026, 2, 7))).toBe(false);
  });

  it("isSameMonth works", () => {
    expect(isSameMonth(new Date(2026, 2, 1), new Date(2026, 2, 31))).toBe(true);
    expect(isSameMonth(new Date(2026, 2, 1), new Date(2026, 3, 1))).toBe(false);
  });

  it("addMonths / subMonths work", () => {
    const march = new Date(2026, 2, 15);
    expect(addMonths(march, 1).getMonth()).toBe(3); // April
    expect(subMonths(march, 1).getMonth()).toBe(1); // February
  });

  it("addDays / subDays work", () => {
    const d = new Date(2026, 2, 10);
    expect(addDays(d, 1).getDate()).toBe(11);
    expect(subDays(d, 1).getDate()).toBe(9);
  });

  it("addDays crosses month boundary", () => {
    const lastMarch = new Date(2026, 2, 31);
    const next = addDays(lastMarch, 1);
    expect(next.getMonth()).toBe(3); // April
    expect(next.getDate()).toBe(1);
  });

  it("parseISO works", () => {
    const d = parseISO("2026-03-10T12:00:00");
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(2); // March (0-indexed)
    expect(d.getDate()).toBe(10);
  });

  it("isWithinInterval works", () => {
    const d = new Date(2026, 2, 15);
    expect(
      isWithinInterval(d, {
        start: new Date(2026, 2, 1),
        end: new Date(2026, 2, 31),
      })
    ).toBe(true);
    expect(
      isWithinInterval(d, {
        start: new Date(2026, 3, 1),
        end: new Date(2026, 3, 30),
      })
    ).toBe(false);
  });
});
