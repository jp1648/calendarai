import { Stack } from "expo-router";

export default function AppLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: "#fff" },
        headerTintColor: "#000",
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen
        name="index"
        options={{ title: "CalendarAI", headerShown: true }}
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
        name="settings"
        options={{ title: "Settings", presentation: "modal" }}
      />
    </Stack>
  );
}
