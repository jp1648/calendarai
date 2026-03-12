import { Stack } from "expo-router";
import ErrorBoundary from "../../components/ui/ErrorBoundary";
import { fontSize } from "../../lib/responsive";
import { EARTHY, FONTS } from "../../lib/theme";

export default function AppLayout() {
  return (
    <ErrorBoundary>
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: EARTHY.cream },
          headerTintColor: EARTHY.bark,
          headerShadowVisible: false,
          headerTitleStyle: {
            fontFamily: FONTS.heading,
            fontWeight: "500",
            fontSize: fontSize(17),
          },
          contentStyle: { backgroundColor: EARTHY.cream },
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
