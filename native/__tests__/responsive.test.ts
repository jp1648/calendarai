/**
 * Tests for responsive scaling functions.
 */
import { s, fontSize } from "../lib/responsive";

describe("responsive scaling", () => {
  describe("s()", () => {
    it("returns a number", () => {
      expect(typeof s(16)).toBe("number");
    });

    it("returns a rounded integer", () => {
      expect(s(16) % 1).toBe(0);
    });

    it("scales proportionally (larger input = larger output)", () => {
      expect(s(32)).toBeGreaterThan(s(16));
    });

    it("handles zero", () => {
      expect(s(0)).toBe(0);
    });

    it("handles negative values", () => {
      expect(s(-10)).toBeLessThan(0);
    });
  });

  describe("fontSize()", () => {
    it("returns a number", () => {
      expect(typeof fontSize(14)).toBe("number");
    });

    it("returns a rounded integer", () => {
      expect(fontSize(14) % 1).toBe(0);
    });

    it("scales less aggressively than s()", () => {
      // fontSize uses dampened scaling, so the ratio should be closer to 1:1
      const sRatio = s(100) / 100;
      const fontRatio = fontSize(100) / 100;
      // fontRatio should be between 1 and sRatio (or equal)
      if (sRatio !== 1) {
        expect(Math.abs(fontRatio - 1)).toBeLessThanOrEqual(Math.abs(sRatio - 1));
      }
    });
  });
});
