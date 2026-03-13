import { useEffect } from "react";
import { LogBox } from "react-native";
import { Stack, useRouter, useSegments } from "expo-router";

LogBox.ignoreLogs([
  "expo-notifications",
]);
import { StatusBar } from "expo-status-bar";
import { QueryClientProvider } from "@tanstack/react-query";
import { useAuth } from "../hooks/useAuth";
import { api } from "../lib/api";
import { ActivityIndicator, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import ToastProvider from "../components/ui/ToastProvider";
import ErrorBoundary from "../components/ui/ErrorBoundary";
import { queryClient } from "../lib/queryClient";
import { useFonts as useDMSans } from "@expo-google-fonts/dm-sans";
import { useFonts as useFraunces } from "@expo-google-fonts/fraunces";
import {
  DMSans_300Light,
  DMSans_400Regular,
  DMSans_500Medium,
} from "@expo-google-fonts/dm-sans";
import {
  Fraunces_300Light,
  Fraunces_500Medium,
  Fraunces_700Bold,
} from "@expo-google-fonts/fraunces";
import * as SplashScreen from "expo-splash-screen";
import { EARTHY } from "../lib/theme";

SplashScreen.preventAutoHideAsync();

function AuthGate({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  // Prefetch profile as soon as user is authenticated
  useEffect(() => {
    if (session) {
      queryClient.prefetchQuery({
        queryKey: ["profile"],
        queryFn: () => api.profile.get(),
        staleTime: 1000 * 60 * 10,
      });
    }
  }, [session]);

  useEffect(() => {
    if (loading) return;
    const inAuthGroup = segments[0] === "(auth)";
    if (!session && !inAuthGroup) {
      router.replace("/(auth)/login");
    } else if (session && inAuthGroup) {
      router.replace("/(app)");
    }
  }, [session, loading, segments]);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: EARTHY.cream }}>
        <ActivityIndicator size="large" color={EARTHY.bark} />
      </View>
    );
  }

  return <>{children}</>;
}

export default function RootLayout() {
  const [dmLoaded] = useDMSans({
    DMSans_300Light,
    DMSans_400Regular,
    DMSans_500Medium,
  });
  const [frauncesLoaded] = useFraunces({
    Fraunces_300Light,
    Fraunces_500Medium,
    Fraunces_700Bold,
  });

  const fontsLoaded = dmLoaded && frauncesLoaded;

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, backgroundColor: EARTHY.cream }}>
        <ActivityIndicator size="large" color={EARTHY.bark} style={{ flex: 1 }} />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <ErrorBoundary>
          <ToastProvider>
            <AuthGate>
              <StatusBar style="dark" />
              <Stack screenOptions={{ headerShown: false }}>
                <Stack.Screen name="(auth)" />
                <Stack.Screen name="(app)" />
              </Stack>
            </AuthGate>
          </ToastProvider>
        </ErrorBoundary>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
