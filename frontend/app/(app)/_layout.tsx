import { Stack, router } from "expo-router";
import { TouchableOpacity, Text, Platform } from "react-native";
import ErrorBoundary from "../../components/ui/ErrorBoundary";
import { fontSize } from "../../lib/responsive";
import { EARTHY, FONTS } from "../../lib/theme";

function BackButton() {
  return (
    <TouchableOpacity
      onPress={() => {
        try {
          if (router.canGoBack()) {
            router.back();
          } else {
            router.replace("/(app)");
          }
        } catch {
          router.replace("/(app)");
        }
      }}
      style={{ paddingRight: 16 }}
    >
      <Text style={{ color: EARTHY.bark, fontSize: fontSize(16) }}>
        {Platform.OS === "web" ? "\u2190 Back" : "\u2039"}
      </Text>
    </TouchableOpacity>
  );
}

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
          options={{
            title: "Day",
            headerShown: true,
            headerLeft: () => <BackButton />,
          }}
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
          options={{
            title: "Settings",
            headerLeft: () => <BackButton />,
          }}
        />
      </Stack>
    </ErrorBoundary>
  );
}
