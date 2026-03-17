# CalendarAI Palette Revamp Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the warm earthy color palette with a dark neutral blue palette across the entire CalendarAI app (frontend + native).

**Architecture:** All colors flow from `lib/theme.ts` via exported constants (`EARTHY`, `ACCENT`, `CATEGORIES`). Most components reference these tokens. ~15 files have hardcoded color values that bypass the theme and must be updated individually. Both `frontend/` and `native/` have identical `theme.ts` files that must stay in sync.

**Tech Stack:** React Native (Expo), TypeScript, React Native StyleSheets (no Tailwind/CSS)

---

## Color Mapping Reference

### EARTHY Token Mapping (old -> new)

| Token | Old (Earthy) | New (Nautical) | New Name |
|-------|-------------|----------------|----------|
| cream | #F5F0EA | #F2F5F7 | frost |
| sand | #E8DFD4 | #C5D5D9 | grayBlue |
| sandLight | #EFE8DF | #E4EAED | mist |
| bark | #3B2F26 | #012340 | navy |
| barkSoft | #5C4D40 | #024059 | teal |
| stone | #8A7D70 | #97A4A6 | warmGray |
| stoneLight | #B5AA9E | #B8C4C9 | grayLight |
| fog | #D6CEC5 | #D4DDE0 | fog |
| white | #FDFBF9 | #FAFCFD | white |

### ACCENT: #C0785A -> #024059

### Category Colors (old -> new)

| Category | New border | New text | New dot | New bg |
|----------|-----------|---------|---------|--------|
| fun | #B8855C | #8C6046 | #B8855C | rgba(184,133,92,0.14) |
| appointments | #024059 | #012340 | #024059 | rgba(2,64,89,0.12) |
| personal | #5B8199 | #3D6478 | #5B8199 | rgba(91,129,153,0.12) |
| wellness | #3A7D6E | #2B5E52 | #3A7D6E | rgba(58,125,110,0.10) |
| work | #3E6B8A | #2A4F6B | #3E6B8A | rgba(62,107,138,0.12) |
| errands | #7A6054 | #5C4840 | #7A6054 | rgba(122,96,84,0.12) |

### Error Colors (Terra family)

| Role | Old | New |
|------|-----|-----|
| Error text | #991B1B | #7A3D3D |
| Error bg | #FEF2F2 | rgba(140,70,70,0.08) |
| Error border | #FECACA | #8C4646 |
| Destructive | #EF4444 | #944B43 |

### Other Mappings

| Usage | Old | New |
|-------|-----|-----|
| Modal overlay (light) | rgba(59,47,38,0.18) | rgba(1,35,64,0.18) |
| Modal overlay (dark) | rgba(59,47,38,0.4) | rgba(1,35,64,0.4) |
| Status indicator dot | #86C3B9 | #3A7D6E |
| Status indicator text | #5A9E92 | #2B5E52 |
| Agent badge (email) | #C07A4E / rgba(232,168,124,...) | #8C6046 / rgba(140,96,70,0.12) |
| Agent badge (schedule) | #8A7BA0 / rgba(184,169,201,...) | #012340 / rgba(2,64,89,0.10) |
| Resy button | #C0935A | #8C6046 |
| Android icon bg | #E6F4FE | #F2F5F7 |

---

### Task 1: Update theme.ts (frontend)

**Files:**
- Modify: `frontend/lib/theme.ts:1-16` (EARTHY + ACCENT)
- Modify: `frontend/lib/theme.ts:29-72` (CATEGORIES)

- [ ] **Step 1: Replace EARTHY palette and ACCENT**

Replace lines 3-16 in `frontend/lib/theme.ts`:

```typescript
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
} as const;

export const ACCENT = "#024059";
```

- [ ] **Step 2: Replace CATEGORIES palette**

Replace lines 29-72 in `frontend/lib/theme.ts`:

```typescript
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
```

- [ ] **Step 3: Verify no TypeScript errors**

Run: `cd /Users/jay/Repos/calendarai/frontend && npx tsc --noEmit`
Expected: No errors (types unchanged, only values changed)

- [ ] **Step 4: Commit**

```bash
git add frontend/lib/theme.ts
git commit -m "feat: replace earthy palette with nautical blue in frontend theme"
```

---

### Task 2: Update theme.ts (native)

**Files:**
- Modify: `native/lib/theme.ts` (entire file — mirror of frontend)

- [ ] **Step 1: Copy frontend theme to native**

Copy the exact contents of `frontend/lib/theme.ts` to `native/lib/theme.ts` (they should be identical).

- [ ] **Step 2: Verify no TypeScript errors**

Run: `cd /Users/jay/Repos/calendarai/native && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add native/lib/theme.ts
git commit -m "feat: sync nautical palette to native theme"
```

---

### Task 3: Update app config files

**Files:**
- Modify: `frontend/app.json:13` — splash backgroundColor
- Modify: `frontend/app.json:21` — android adaptiveIcon backgroundColor
- Modify: `native/app.json:14` — splash backgroundColor
- Modify: `native/app.json:22` — android adaptiveIcon backgroundColor

- [ ] **Step 1: Update frontend/app.json**

Change splash backgroundColor `#F5F0EA` -> `#F2F5F7`
Change android adaptiveIcon backgroundColor `#E6F4FE` -> `#F2F5F7`

- [ ] **Step 2: Update native/app.json**

Change splash backgroundColor `#F5F0EA` -> `#F2F5F7`
Change android adaptiveIcon backgroundColor `#F5F0EA` -> `#F2F5F7`

- [ ] **Step 3: Commit**

```bash
git add frontend/app.json native/app.json
git commit -m "feat: update splash and icon backgrounds to frost"
```

---

### Task 4: Update HTML and layout hardcoded backgrounds

**Files:**
- Modify: `frontend/app/+html.tsx:14,19` — meta theme-color and body background
- Modify: `frontend/app/(onboarding)/_layout.tsx:5` — screen background

All instances of `#F5F0EA` -> `#F2F5F7`

- [ ] **Step 1: Update +html.tsx**

Replace all `#F5F0EA` with `#F2F5F7` in `frontend/app/+html.tsx`

- [ ] **Step 2: Update onboarding layout**

Replace `#F5F0EA` with `#F2F5F7` in `frontend/app/(onboarding)/_layout.tsx`

- [ ] **Step 3: Commit**

```bash
git add frontend/app/+html.tsx frontend/app/\(onboarding\)/_layout.tsx
git commit -m "feat: update hardcoded cream backgrounds to frost"
```

---

### Task 5: Update Agent Badge colors (frontend + native)

**Files:**
- Modify: `frontend/components/calendar/AgentBadge.tsx:10-11`
- Modify: `native/components/calendar/AgentBadge.tsx:10-11`

- [ ] **Step 1: Update frontend AgentBadge.tsx**

Line 10 (email_agent): Replace color `#C07A4E` -> `#8C6046`, bg rgba `rgba(232,168,124,...)` -> `rgba(140,96,70,0.12)`
Line 11 (schedule_agent): Replace color `#8A7BA0` -> `#012340`, bg rgba `rgba(184,169,201,...)` -> `rgba(2,64,89,0.10)`

- [ ] **Step 2: Update native AgentBadge.tsx**

Same changes as Step 1 in `native/components/calendar/AgentBadge.tsx`

- [ ] **Step 3: Commit**

```bash
git add frontend/components/calendar/AgentBadge.tsx native/components/calendar/AgentBadge.tsx
git commit -m "feat: update agent badge colors to nautical palette"
```

---

### Task 6: Update Chat components (frontend + native)

**Files:**
- Modify: `frontend/components/chat/ChatBubble.tsx:144,176,183,194,218,220,223,233`
- Modify: `frontend/components/chat/ChatPanel.tsx:209,233`
- Modify: `frontend/components/chat/RestaurantCard.tsx:92`
- Modify: `native/components/chat/ChatBubble.tsx:131`
- Modify: `native/components/chat/ChatPanel.tsx:174,209`
- Modify: `native/components/chat/RestaurantCard.tsx:92`

Color replacements:
- `#86C3B9` -> `#3A7D6E` (wellness indicator dot)
- `#5A9E92` -> `#2B5E52` (wellness indicator text)
- `rgba(163,188,140,0.15)` -> `rgba(91,129,153,0.12)` (personal category bg in chat)
- `#A3BC8C` -> `#5B8199` (personal category border in chat)
- `#6E8A56` -> `#3D6478` (personal category text in chat)
- `#E8A87C` -> `#B8855C` (fun/restaurant accent)
- `#991B1B` -> `#7A3D3D` (error text)
- `#FEF2F2` -> `rgba(140,70,70,0.08)` (error bg)
- `#FECACA` -> `#8C4646` (error border)

- [ ] **Step 1: Update frontend ChatBubble.tsx**

Apply all color replacements listed above.

- [ ] **Step 2: Update frontend ChatPanel.tsx**

Replace `#86C3B9` -> `#3A7D6E` at lines 209 and 233.

- [ ] **Step 3: Update frontend RestaurantCard.tsx**

Replace `#E8A87C` -> `#B8855C` at line 92.

- [ ] **Step 4: Update native ChatBubble.tsx**

Native ChatBubble has NO error styles. Only replace these 4 colors in `native/components/chat/ChatBubble.tsx`:
- Line 131: `#86C3B9` -> `#3A7D6E`
- Line 163: `rgba(163,188,140,0.15)` -> `rgba(91,129,153,0.12)`
- Line 170: `#A3BC8C` -> `#5B8199`
- Line 181: `#6E8A56` -> `#3D6478`

- [ ] **Step 5: Update native ChatPanel.tsx**

Same replacements as Step 2 in `native/components/chat/ChatPanel.tsx`.

- [ ] **Step 6: Update native RestaurantCard.tsx**

Same replacement as Step 3 in `native/components/chat/RestaurantCard.tsx`.

- [ ] **Step 7: Commit**

```bash
git add frontend/components/chat/ native/components/chat/
git commit -m "feat: update chat component colors to nautical palette"
```

---

### Task 7: Update error/destructive colors in screens (frontend + native)

**Files:**
- Modify: `frontend/app/(app)/event/[id].tsx:259` — #EF4444 -> #944B43
- Modify: `frontend/app/(app)/settings.tsx:327,373` — #86C3B9 -> #3A7D6E, #EF4444 -> #944B43
- Modify: `frontend/app/(onboarding)/welcome.tsx:119` — #991B1B -> #7A3D3D
- Modify: `frontend/app/(onboarding)/connect.tsx:135,136` — #86C3B9 -> #3A7D6E, #5A9E92 -> #2B5E52
- Modify: `frontend/app/(onboarding)/permissions.tsx:145,146` — #86C3B9 -> #3A7D6E, #5A9E92 -> #2B5E52
- Modify: `native/app/(app)/event/[id].tsx:187` — #EF4444 -> #944B43
- Modify: `native/app/(app)/settings.tsx:356,365,366,377,378` — status + error + destructive + overlay colors
- Modify: `native/components/calendar/DayView.tsx:228` — #EF4444 -> #944B43

**Note:** Keep `#DA3743` and `#FFFFFF` in native/settings.tsx and native/DayView.tsx — these are Resy brand colors, not ours.

- [ ] **Step 1: Update frontend event/[id].tsx**

Replace `#EF4444` -> `#944B43`

- [ ] **Step 2: Update frontend settings.tsx**

Replace `#86C3B9` -> `#3A7D6E` (status dot)
Replace `#EF4444` -> `#944B43` (sign out / destructive)

- [ ] **Step 3: Update frontend onboarding screens**

In `welcome.tsx`: Replace `#991B1B` -> `#7A3D3D`
In `connect.tsx`: Replace `#86C3B9` -> `#3A7D6E`, `#5A9E92` -> `#2B5E52`
In `permissions.tsx`: Replace `#86C3B9` -> `#3A7D6E`, `#5A9E92` -> `#2B5E52`

- [ ] **Step 4: Update native event/[id].tsx**

Replace `#EF4444` -> `#944B43`

- [ ] **Step 5: Update native settings.tsx**

Replace `#86C3B9` -> `#3A7D6E` (status dot)
Replace `#EF4444` -> `#944B43` (sign out)
Replace `#FEF2F2` -> `rgba(140,70,70,0.08)` (error bg)
Replace `#FECACA` -> `#8C4646` (error border)
Replace `#991B1B` -> `#7A3D3D` (error text)
Replace `#C0935A` -> `#8C6046` (Resy button)
Replace `rgba(59,47,38,0.4)` -> `rgba(1,35,64,0.4)` (modal overlay, line 366)

- [ ] **Step 6: Update native DayView.tsx**

Replace `#EF4444` -> `#944B43`

- [ ] **Step 7: Commit**

```bash
git add frontend/app/ native/app/ native/components/calendar/DayView.tsx
git commit -m "feat: update screen error and status colors to nautical palette"
```

---

### Task 8: Update Resy integration modal and Toast (frontend)

**Files:**
- Modify: `frontend/components/integrations/ResyConnectModal.tsx:139,207,209,215,220`
- Modify: `frontend/components/ui/Toast.tsx:85`

- [ ] **Step 1: Update ResyConnectModal.tsx**

Replace `rgba(59,47,38,0.4)` -> `rgba(1,35,64,0.4)` (overlay, line 139)
Replace `#FEF2F2` -> `rgba(140,70,70,0.08)` (error bg, line 207)
Replace `#FECACA` -> `#8C4646` (error border, line 209)
Replace `#991B1B` -> `#7A3D3D` (error text, line 215)
Replace `#C0935A` -> `#8C6046` (submit button, line 220)
Keep `#DA3743` (Resy brand red — not ours)
Keep `#FFFFFF` (white text on Resy badge — brand element)

- [ ] **Step 2: Update Toast.tsx**

Replace `#991B1B` -> `#7A3D3D` (error toast background, line 85)

- [ ] **Step 3: Commit**

```bash
git add frontend/components/integrations/ResyConnectModal.tsx frontend/components/ui/Toast.tsx
git commit -m "feat: update resy modal and toast colors to nautical palette"
```

---

### Task 9: Update modal overlay colors (frontend + native)

**Files:**
- Modify: `frontend/components/input/DatePickerModal.tsx:96`
- Modify: `frontend/components/input/TimePickerModal.tsx:137`
- Modify: `frontend/app/(app)/index.tsx:385`
- Modify: `native/components/input/DatePickerModal.tsx:87`
- Modify: `native/components/input/TimePickerModal.tsx:98`
- Modify: `native/app/(app)/index.tsx:348`

All instances: `rgba(59,47,38,0.18)` -> `rgba(1,35,64,0.18)`

- [ ] **Step 1: Update frontend modals and index**

Replace `rgba(59,47,38,0.18)` -> `rgba(1,35,64,0.18)` in all 3 frontend files.

- [ ] **Step 2: Update native modals and index**

Replace `rgba(59,47,38,0.18)` -> `rgba(1,35,64,0.18)` in all 3 native files.

- [ ] **Step 3: Commit**

```bash
git add frontend/components/input/ frontend/app/\(app\)/index.tsx native/components/input/ native/app/\(app\)/index.tsx
git commit -m "feat: update modal overlay colors to nautical palette"
```

---

### Task 10: Visual verification and cleanup

- [ ] **Step 1: Start the frontend dev server**

Run: `cd /Users/jay/Repos/calendarai && make dev`

- [ ] **Step 2: Verify web app visually**

Open the web app and check:
- Background is cool frost (#F2F5F7), not warm cream
- Primary text is navy (#012340)
- Buttons/links are teal (#024059)
- Event cards show 6 distinct category colors
- Error states use terra red family
- Modal overlays have a cool blue tint
- Chat panel uses new indicator colors
- Agent badges are brown (email) and teal (schedule)

- [ ] **Step 3: Search for any remaining old color values**

Run: `grep -rn --include="*.tsx" --include="*.ts" --include="*.json" '#F5F0EA\|#E8DFD4\|#EFE8DF\|#3B2F26\|#5C4D40\|#8A7D70\|#B5AA9E\|#D6CEC5\|#FDFBF9\|#C0785A\|#E8A87C\|#C07A4E\|#B8A9C9\|#8A7BA0\|#A3BC8C\|#6E8A56\|#86C3B9\|#5A9E92\|#9AB4D6\|#6586AE\|#D2BA91\|#A08A5C\|#991B1B\|#EF4444\|#FEF2F2\|#FECACA' frontend/ native/ --exclude-dir=node_modules --exclude-dir=.expo`
Expected: No matches (all old colors replaced)

- [ ] **Step 4: Fix any stragglers found in Step 3**

If any old colors remain, update them using the mapping reference at the top of this plan.

- [ ] **Step 5: Delete palette preview file**

Run: `rm /Users/jay/Repos/calendarai/palette-preview.html`

- [ ] **Step 6: Final commit**

```bash
git add -A
git commit -m "chore: cleanup palette preview and fix remaining color references"
```
