/**
 * Tests for theme utility functions — categorization and color mapping.
 */
import { categorizeEvent, getCategoryColors, CATEGORIES, CategoryKey } from "../lib/theme";

describe("categorizeEvent", () => {
  it("categorizes yoga as wellness", () => {
    expect(categorizeEvent({ title: "Morning Yoga" })).toBe("wellness");
  });

  it("categorizes gym as wellness", () => {
    expect(categorizeEvent({ title: "Gym Session" })).toBe("wellness");
  });

  it("categorizes meeting as work", () => {
    expect(categorizeEvent({ title: "Team Meeting" })).toBe("work");
  });

  it("categorizes standup as work", () => {
    expect(categorizeEvent({ title: "Daily Standup" })).toBe("work");
  });

  it("categorizes dentist as appointments", () => {
    expect(categorizeEvent({ title: "Dentist Checkup" })).toBe("appointments");
  });

  it("categorizes lunch as fun", () => {
    expect(categorizeEvent({ title: "Lunch with Sarah" })).toBe("fun");
  });

  it("categorizes dinner as fun", () => {
    expect(categorizeEvent({ title: "Dinner at Nobu" })).toBe("fun");
  });

  it("categorizes grocery as errands", () => {
    expect(categorizeEvent({ title: "Grocery shopping" })).toBe("errands");
  });

  it("defaults unknown events to personal", () => {
    expect(categorizeEvent({ title: "Something Random" })).toBe("personal");
  });

  it("is case-insensitive", () => {
    expect(categorizeEvent({ title: "YOGA CLASS" })).toBe("wellness");
  });

  it("handles empty title", () => {
    expect(categorizeEvent({ title: "" })).toBe("personal");
  });
});

describe("getCategoryColors", () => {
  it("returns color object for a categorized event", () => {
    const colors = getCategoryColors({ title: "Yoga" });
    expect(colors).toBeDefined();
    expect(colors.bg).toBeDefined();
    expect(colors.text).toBeDefined();
    expect(colors.border).toBeDefined();
    expect(colors.dot).toBeDefined();
  });

  it("returns personal colors for unknown category", () => {
    const colors = getCategoryColors({ title: "Unknown" });
    expect(colors).toEqual(CATEGORIES.personal);
  });
});

describe("CATEGORIES constant", () => {
  it("has all expected categories", () => {
    const keys: CategoryKey[] = ["fun", "appointments", "personal", "wellness", "work", "errands"];
    keys.forEach((key) => {
      expect(CATEGORIES[key]).toBeDefined();
      expect(CATEGORIES[key].label).toBeDefined();
      expect(CATEGORIES[key].bg).toBeDefined();
      expect(CATEGORIES[key].border).toBeDefined();
      expect(CATEGORIES[key].text).toBeDefined();
      expect(CATEGORIES[key].dot).toBeDefined();
    });
  });
});
