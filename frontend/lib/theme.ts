import { CalendarEvent } from "../stores/eventStore";

/* ── Nautical palette ── */
export const EARTHY = {
  cream: "#F2F5F7",
  sand: "#C5D5D9",
  sandLight: "#E4EAED",
  bark: "#012340",
  barkSoft: "#024059",
  stone: "#97A4A6",
  stoneLight: "#B8C4C9",
  fog: "#D4DDE0",
  white: "#FAFCFD",
  success: "#3A7D6E",
  successText: "#2B5E52",
  error: "#B44040",
  errorSoft: "#944B43",
  errorDark: "#7A3D3D",
  overlay: "rgba(1,35,64,0.18)",
} as const;

export const ACCENT = "#024059";

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
    bg: "rgba(184,133,92,0.14)",
    border: "#B8855C",
    text: "#8C6046",
    dot: "#B8855C",
  },
  appointments: {
    label: "Appointments",
    bg: "rgba(2,64,89,0.12)",
    border: "#024059",
    text: "#012340",
    dot: "#024059",
  },
  personal: {
    label: "Personal",
    bg: "rgba(91,129,153,0.12)",
    border: "#5B8199",
    text: "#3D6478",
    dot: "#5B8199",
  },
  wellness: {
    label: "Wellness",
    bg: "rgba(58,125,110,0.10)",
    border: "#3A7D6E",
    text: "#2B5E52",
    dot: "#3A7D6E",
  },
  work: {
    label: "Work",
    bg: "rgba(62,107,138,0.12)",
    border: "#3E6B8A",
    text: "#2A4F6B",
    dot: "#3E6B8A",
  },
  errands: {
    label: "Errands",
    bg: "rgba(122,96,84,0.12)",
    border: "#7A6054",
    text: "#5C4840",
    dot: "#7A6054",
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
