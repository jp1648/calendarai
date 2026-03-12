import { CalendarEvent } from "../stores/eventStore";

/* ── Earthy palette ── */
export const EARTHY = {
  cream: "#F5F0EA",
  sand: "#E8DFD4",
  sandLight: "#EFE8DF",
  bark: "#3B2F26",
  barkSoft: "#5C4D40",
  stone: "#8A7D70",
  stoneLight: "#B5AA9E",
  fog: "#D6CEC5",
  white: "#FDFBF9",
} as const;

export const ACCENT = "#C0785A";

/* ── Font family strings (loaded via useFonts in _layout) ── */
export const FONTS = {
  bodyLight: "DMSans_300Light",
  body: "DMSans_400Regular",
  bodyMedium: "DMSans_500Medium",
  heading: "Fraunces_500Medium",
  headingLight: "Fraunces_300Light",
  headingBold: "Fraunces_700Bold",
} as const;

/* ── Category palette ── */
export const CATEGORIES = {
  fun: {
    label: "Fun",
    bg: "rgba(232,168,124,0.14)",
    border: "#E8A87C",
    text: "#C07A4E",
    dot: "#E8A87C",
  },
  appointments: {
    label: "Appointments",
    bg: "rgba(184,169,201,0.16)",
    border: "#B8A9C9",
    text: "#8A7BA0",
    dot: "#B8A9C9",
  },
  personal: {
    label: "Personal",
    bg: "rgba(163,188,140,0.15)",
    border: "#A3BC8C",
    text: "#6E8A56",
    dot: "#A3BC8C",
  },
  wellness: {
    label: "Wellness",
    bg: "rgba(134,195,185,0.14)",
    border: "#86C3B9",
    text: "#5A9E92",
    dot: "#86C3B9",
  },
  work: {
    label: "Work",
    bg: "rgba(154,180,214,0.14)",
    border: "#9AB4D6",
    text: "#6586AE",
    dot: "#9AB4D6",
  },
  errands: {
    label: "Errands",
    bg: "rgba(210,186,145,0.16)",
    border: "#D2BA91",
    text: "#A08A5C",
    dot: "#D2BA91",
  },
} as const;

export type CategoryKey = keyof typeof CATEGORIES;

/* ── Keyword → category mapping ── */
const KEYWORD_MAP: Record<CategoryKey, string[]> = {
  wellness: ["yoga", "gym", "walk", "run", "workout", "meditation", "stretch", "pilates", "hike"],
  work: ["meeting", "sync", "review", "standup", "sprint", "demo", "interview", "1:1", "retro", "planning"],
  appointments: ["dentist", "doctor", "haircut", "vet", "therapist", "checkup", "appointment"],
  fun: ["lunch", "dinner", "drinks", "brunch", "coffee", "happy hour", "party", "movie", "concert", "game"],
  errands: ["grocery", "pickup", "pharmacy", "dry clean", "bank", "post office", "laundry", "errand"],
  personal: [],
};

export function categorizeEvent(event: { title: string }): CategoryKey {
  const title = event.title.toLowerCase();
  for (const [cat, keywords] of Object.entries(KEYWORD_MAP)) {
    if (keywords.some((kw) => title.includes(kw))) {
      return cat as CategoryKey;
    }
  }
  return "personal";
}

export function getCategoryColors(event: { title: string }) {
  return CATEGORIES[categorizeEvent(event)];
}
