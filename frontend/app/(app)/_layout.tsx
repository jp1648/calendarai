import { Stack } from "expo-router";
import ErrorBoundary from "../../components/ui/ErrorBoundary";
import { EARTHY } from "../../lib/theme";

export default function AppLayout() {
  return (
    <ErrorBoundary>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: EARTHY.cream },
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="day/[date]" />
        <Stack.Screen name="event/new" options={{ presentation: "modal" }} />
        <Stack.Screen name="event/[id]" options={{ presentation: "modal" }} />
        <Stack.Screen name="settings" />
      </Stack>
    </ErrorBoundary>
  );
}
