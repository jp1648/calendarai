/**
 * Responsive scaling system.
 *
 * Design base: 390 x 844 (iPhone 14/15 logical points).
 * All hardcoded sizes in the app should go through `s()` so they
 * scale proportionally on smaller phones, tablets, and desktop web.
 *
 * Usage:
 *   import { s, fontSize } from '../lib/responsive';
 *   { padding: s(16), fontSize: fontSize(14) }
 *
 * For layout-reactive components, use the hook:
 *   const { s, fontSize, isTablet } = useResponsive();
 */

import { Dimensions, useWindowDimensions } from "react-native";

const BASE_WIDTH = 390;

// Static version — uses initial dimensions (fast, no re-render)
const initialWidth = Dimensions.get("window").width;
const initialScale = Math.min(Math.max(initialWidth / BASE_WIDTH, 0.75), 1.3);

/** Scale a size value proportionally to screen width. */
export function s(size: number): number {
  return Math.round(size * initialScale);
}

/** Scale a font size (slightly less aggressive to keep readability). */
export function fontSize(size: number): number {
  // Dampen scaling: blend between 1:1 and full scale
  const dampened = 1 + (initialScale - 1) * 0.6;
  return Math.round(size * dampened);
}

/** Hook version — re-renders on dimension change (rotation, resize). */
export function useResponsive() {
  const { width, height } = useWindowDimensions();
  const scale = Math.min(Math.max(width / BASE_WIDTH, 0.75), 1.3);
  const fontScale = 1 + (scale - 1) * 0.6;

  return {
    /** Scale spacing/sizes */
    s: (size: number) => Math.round(size * scale),
    /** Scale font sizes (dampened) */
    fontSize: (size: number) => Math.round(size * fontScale),
    width,
    height,
    scale,
    isSmallPhone: width < 375,
    isTablet: width >= 768,
    isDesktop: width >= 1024,
  };
}
