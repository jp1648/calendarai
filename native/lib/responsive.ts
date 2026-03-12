/**
 * Responsive scaling system for native.
 *
 * Design base: 390 x 844 (iPhone 14/15 logical points).
 */

import { Dimensions, useWindowDimensions } from "react-native";

const BASE_WIDTH = 390;

const initialWidth = Dimensions.get("window").width;
const initialScale = Math.min(Math.max(initialWidth / BASE_WIDTH, 0.75), 1.3);

/** Scale a size value proportionally to screen width. */
export function s(size: number): number {
  return Math.round(size * initialScale);
}

/** Scale a font size (slightly less aggressive to keep readability). */
export function fontSize(size: number): number {
  const dampened = 1 + (initialScale - 1) * 0.6;
  return Math.round(size * dampened);
}

/** Hook version — re-renders on dimension change (rotation). */
export function useResponsive() {
  const { width, height } = useWindowDimensions();
  const scale = Math.min(Math.max(width / BASE_WIDTH, 0.75), 1.3);
  const fontScale = 1 + (scale - 1) * 0.6;

  return {
    s: (size: number) => Math.round(size * scale),
    fontSize: (size: number) => Math.round(size * fontScale),
    width,
    height,
    scale,
    isSmallPhone: width < 375,
    isTablet: width >= 768,
  };
}
