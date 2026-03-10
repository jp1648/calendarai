/**
 * Tests for TimePickerModal helper functions.
 * Extracted pure logic tests for parseTime and to24.
 */

// Re-implement the functions here since they're not exported from the component.
// This tests the same logic used in TimePickerModal.tsx.

function parseTime(time: string) {
  const [hStr, mStr] = (time || "12:00").split(":");
  const h = parseInt(hStr, 10);
  const hour = Number.isNaN(h) ? 12 : h;
  const ampm: "AM" | "PM" = hour >= 12 ? "PM" : "AM";
  const hour12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return { hour12, ampm };
}

function to24(hour12: number, ampm: "AM" | "PM"): number {
  if (ampm === "AM") return hour12 === 12 ? 0 : hour12;
  return hour12 === 12 ? 12 : hour12 + 12;
}

describe("parseTime", () => {
  it("parses morning time", () => {
    expect(parseTime("09:30")).toEqual({ hour12: 9, ampm: "AM" });
  });

  it("parses afternoon time", () => {
    expect(parseTime("14:00")).toEqual({ hour12: 2, ampm: "PM" });
  });

  it("parses midnight (00:00)", () => {
    expect(parseTime("00:00")).toEqual({ hour12: 12, ampm: "AM" });
  });

  it("parses noon (12:00)", () => {
    expect(parseTime("12:00")).toEqual({ hour12: 12, ampm: "PM" });
  });

  it("parses 11pm (23:00)", () => {
    expect(parseTime("23:00")).toEqual({ hour12: 11, ampm: "PM" });
  });

  it("parses 1am (01:00)", () => {
    expect(parseTime("01:00")).toEqual({ hour12: 1, ampm: "AM" });
  });

  it("defaults empty string to 12:00 PM", () => {
    expect(parseTime("")).toEqual({ hour12: 12, ampm: "PM" });
  });

  it("handles edge case 12:30 PM", () => {
    expect(parseTime("12:30")).toEqual({ hour12: 12, ampm: "PM" });
  });
});

describe("to24", () => {
  it("converts 12 AM to 0", () => {
    expect(to24(12, "AM")).toBe(0);
  });

  it("converts 12 PM to 12", () => {
    expect(to24(12, "PM")).toBe(12);
  });

  it("converts 1 AM to 1", () => {
    expect(to24(1, "AM")).toBe(1);
  });

  it("converts 1 PM to 13", () => {
    expect(to24(1, "PM")).toBe(13);
  });

  it("converts 11 AM to 11", () => {
    expect(to24(11, "AM")).toBe(11);
  });

  it("converts 11 PM to 23", () => {
    expect(to24(11, "PM")).toBe(23);
  });

  it("roundtrip: parseTime → to24 for all hours", () => {
    for (let h = 0; h < 24; h++) {
      const timeStr = `${String(h).padStart(2, "0")}:00`;
      const { hour12, ampm } = parseTime(timeStr);
      expect(to24(hour12, ampm)).toBe(h);
    }
  });
});

describe("formatDisplayTime (inline logic)", () => {
  // Same logic as in event/new.tsx and event/[id].tsx
  function formatDisplayTime(time: string): string {
    if (!time) return "";
    const [h, m] = time.split(":").map(Number);
    const ampm = h >= 12 ? "PM" : "AM";
    const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
    return `${h12}:${String(m).padStart(2, "0")} ${ampm}`;
  }

  it("formats 09:00 → 9:00 AM", () => {
    expect(formatDisplayTime("09:00")).toBe("9:00 AM");
  });

  it("formats 14:30 → 2:30 PM", () => {
    expect(formatDisplayTime("14:30")).toBe("2:30 PM");
  });

  it("formats 00:00 → 12:00 AM", () => {
    expect(formatDisplayTime("00:00")).toBe("12:00 AM");
  });

  it("formats 12:00 → 12:00 PM", () => {
    expect(formatDisplayTime("12:00")).toBe("12:00 PM");
  });

  it("returns empty for empty string", () => {
    expect(formatDisplayTime("")).toBe("");
  });
});
