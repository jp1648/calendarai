# CalendarAI Native App — React Native Clone

**Context:** Create a native React Native version of the existing Expo web app at `native/` in the same repo. Direct clone — same backend, same functionality, same design system. Only native-specific gestures and interactions should differ.

## Architecture: Same Repo, Separate Folder

**`/Users/jay/Repos/calendarai/native/`** — standalone Expo project alongside `frontend/` and `backend/`.

**Why copy, not monorepo?** The shared logic is ~800 lines across 16 files. The native app will diverge quickly (native pickers, bottom sheet lib, haptics, push notifications, streaming implementation). Monorepo tooling (npm workspaces, Metro resolution, shared tsconfig) would add more complexity than copying 800 lines.

## File Classification

### Direct Copy (no changes)
- `lib/theme.ts`, `lib/api.ts`, `lib/queryClient.ts`
- `stores/chatStore.ts`, `stores/onboardingStore.ts`
- `hooks/useAuth.ts`, `hooks/useEventsQuery.ts`, `hooks/useCalendars.ts`, `hooks/useSubscription.ts`, `hooks/useToast.ts`
- `components/calendar/EventCard.tsx`, `components/calendar/AgentBadge.tsx`
- `components/chat/ChatBubble.tsx`, `components/chat/RestaurantCard.tsx`
- `components/ui/Toast.tsx`, `components/ui/ErrorBoundary.tsx`
- All screen files under `app/` (initial copy)

### Copy + Minor Adapt
- `lib/supabase.ts` — remove `typeof window === "undefined"` SSR guard and `noopStorage` fallback
- `lib/responsive.ts` — remove web-specific max-width clamping and `isDesktop` logic
- `hooks/useNotifications.ts` — remove `Platform.OS === "web"` guards, add push token registration
- `components/input/NaturalLanguageBar.tsx` — remove `outlineStyle: "none"` (web CSS)
- `app/(app)/settings.tsx` — replace `window.open()` with `Linking.openURL()`, remove `typeof window` checks

### Rewrite (native-specific)
- **`components/chat/ChatPanel.tsx`** — Replace 282-line hand-rolled `Gesture.Pan()` bottom sheet with `@gorhom/bottom-sheet`. Same three snap points (collapsed/50%/88%), but with native keyboard avoidance, scroll interaction, and backdrop. ~80 lines.
- **`components/input/DatePickerModal.tsx`** — Replace custom calendar grid with `@react-native-community/datetimepicker` (iOS spinning wheel, Android Material picker)
- **`components/input/TimePickerModal.tsx`** — Same: native OS time picker
- **`hooks/useChat.ts`** — Replace `XMLHttpRequest` streaming (Safari workaround) with `fetch` + `ReadableStream` (RN 0.83 supports it) or `react-native-sse`

## Dependency Changes

**Remove** (web-only): `react-dom`, `react-native-web`, `react-native-url-polyfill`

**Add** (native-specific):
- `@gorhom/bottom-sheet` ~5.x — native bottom sheet for ChatPanel
- `@react-native-community/datetimepicker` ~8.x — native date/time pickers
- `expo-haptics` ~14.x — tactile feedback on swipes, taps, confirmations
- `expo-dev-client` — dev builds on physical devices
- `expo-build-properties` — native build config

**Keep**: expo, expo-router, react-native-gesture-handler, react-native-reanimated, @supabase/supabase-js, @tanstack/react-query, zustand, date-fns, expo-google-fonts, expo-notifications, expo-location

## Native Enhancements

1. **Haptic feedback** — `Haptics.impactAsync(Light)` on week/month swipe threshold, `selectionAsync()` on day tap, `notificationAsync(Success)` on AI event creation, `impactAsync(Medium)` on bottom sheet snap
2. **Native bottom sheet** — `@gorhom/bottom-sheet` with keyboard-aware behavior, scroll-to-dismiss, native backdrop
3. **Native date/time pickers** — OS pickers instead of custom grids
4. **Swipe-to-delete** — `Swipeable` from gesture-handler on DayView event cards
5. **Pull-to-refresh** — `RefreshControl` on WeekView (main calendar screen)
6. **Push notifications** — Register Expo push token, send to backend, handle notification taps → deep link to event
7. **Keyboard handling** — `KeyboardAvoidingView` around NaturalLanguageBar
8. **OAuth deep linking** — `expo-web-browser` `openAuthSessionAsync()` with `calendarai://` scheme for Gmail OAuth

## Folder Structure
```
native/
  app/
    _layout.tsx
    (auth)/ login.tsx, signup.tsx
    (app)/  _layout.tsx, index.tsx, settings.tsx
      day/  [date].tsx
      event/ new.tsx, [id].tsx
  components/
    calendar/ WeekView, DayView, MonthView, EventCard, AgentBadge
    chat/     ChatPanel (rewrite), ChatBubble, RestaurantCard
    input/    NaturalLanguageBar, DatePickerModal (rewrite), TimePickerModal (rewrite)
    ui/       Toast, ErrorBoundary
  hooks/      useAuth, useChat (rewrite), useEventsQuery, useCalendars, useNotifications (adapt), useSubscription, useToast
  stores/     chatStore, onboardingStore
  lib/        api, theme, queryClient, supabase (adapt), responsive (adapt)
  assets/     icons, splash
  app.json, package.json, tsconfig.json, eas.json, .env
```

## Execution Phases

### Phase 1 — Scaffold + Copy (everything boots)
1. `npx create-expo-app@latest native` from repo root
2. Configure `app.json`: name, scheme (`calendarai`), splash colors, bundle IDs
3. Copy all lib/, stores/, hooks/, components/, app/ files
4. Install all dependencies (kept + new)
5. Verify `npx expo start` boots without errors on iOS simulator

### Phase 2 — Remove Web Code
1. Remove `react-native-web`, `react-dom` from deps
2. Simplify `supabase.ts` (drop SSR guard), `responsive.ts` (drop web breakpoints)
3. Remove `outlineStyle`, `typeof window`, `Platform.OS === "web"` checks
4. Delete `app/+html.tsx` (web-only)
5. Verify app runs on iOS simulator

### Phase 3 — Native Rewrites
1. Rewrite `ChatPanel.tsx` with `@gorhom/bottom-sheet`
2. Rewrite `DatePickerModal.tsx` and `TimePickerModal.tsx` with native pickers
3. Rewrite `useChat.ts` for native SSE streaming
4. Add haptic feedback to gesture handlers (WeekView, MonthView, DayView)
5. Add swipe-to-delete on DayView event cards
6. Add pull-to-refresh to WeekView
7. Wire deep linking for Gmail OAuth

### Phase 4 — Polish + Build
1. Test on iOS simulator + physical device
2. Test on Android emulator
3. Set up `eas.json` for EAS Build
4. Configure app icons and splash for both platforms
5. First TestFlight / internal test build

## Verification
`cd native && npx tsc --noEmit && npx expo start --ios` — app compiles and runs on iOS simulator with all screens, earthy theme, and native interactions.
