import { Stack } from "expo-router";
import ErrorBoundary from "../../components/ui/ErrorBoundary";
import { fontSize } from "../../lib/responsive";

export default function AppLayout() {
  return (
    <ErrorBoundary>
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: "#FAFAFA" },
          headerTintColor: "#1A1A1A",
          headerShadowVisible: false,
          headerTitleStyle: {
            fontWeight: "600",
            fontSize: fontSize(17),
          },
          contentStyle: { backgroundColor: "#FAFAFA" },
        }}
      >
        <Stack.Screen
          name="index"
          options={{ headerShown: true }}
        />
        <Stack.Screen
          name="day/[date]"
          options={{ title: "Day", headerShown: true }}
        />
        <Stack.Screen
          name="event/new"
          options={{ title: "New Event", presentation: "modal" }}
        />
        <Stack.Screen
          name="event/[id]"
          options={{ title: "Edit Event", presentation: "modal" }}
        />
        <Stack.Screen
          name="settings"
          options={{ title: "Settings", presentation: "modal" }}
        />
      </Stack>
    </ErrorBoundary>
  );
}
