import { TouchableOpacity, Text, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { s, fontSize } from "../../lib/responsive";
import { EARTHY, FONTS } from "../../lib/theme";

interface BackButtonProps {
  /** Override default back navigation */
  onPress?: () => void;
}

export default function BackButton({ onPress }: BackButtonProps) {
  const router = useRouter();

  const handlePress = () => {
    if (onPress) {
      onPress();
      return;
    }
    try {
      if (router.canGoBack()) {
        router.back();
      }
    } catch {}
  };

  return (
    <TouchableOpacity onPress={handlePress} activeOpacity={0.6} style={styles.button}>
      <Text style={styles.text}>{"\u276E"}  Back</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    alignSelf: "flex-start",
    paddingVertical: s(8),
    paddingRight: s(16),
  },
  text: {
    color: EARTHY.barkSoft,
    fontSize: fontSize(13),
    fontFamily: FONTS.bodyMedium,
  },
});
