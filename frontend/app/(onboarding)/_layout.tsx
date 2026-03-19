import { Stack } from "expo-router";
import { EARTHY } from "../../lib/theme";

export default function OnboardingLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: EARTHY.cream } }} />
  );
}
