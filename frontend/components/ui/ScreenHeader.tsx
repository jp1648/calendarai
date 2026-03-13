import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { s, fontSize } from "../../lib/responsive";
import { EARTHY, FONTS } from "../../lib/theme";

interface ScreenHeaderProps {
  /** Left content — set to "back" for a standard back button, or pass custom JSX */
  left?: "back" | React.ReactNode;
  /** Center title */
  title?: string;
  /** Right content — pass custom JSX */
  right?: React.ReactNode;
}

export default function ScreenHeader({ left, title, right }: ScreenHeaderProps) {
  const router = useRouter();

  const goBack = () => {
    try {
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace("/(app)");
      }
    } catch {
      router.replace("/(app)");
    }
  };

  const renderLeft = () => {
    if (left === "back") {
      return (
        <TouchableOpacity onPress={goBack} activeOpacity={0.6} style={styles.side}>
          <Text style={styles.backText}>{"\u276E"}  Back</Text>
        </TouchableOpacity>
      );
    }
    return <View style={styles.side}>{left}</View>;
  };

  return (
    <View style={styles.header}>
      {renderLeft()}
      {title ? <Text style={styles.title}>{title}</Text> : <View style={styles.center} />}
      <View style={[styles.side, styles.rightSide]}>{right}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: s(16),
    paddingTop: s(8),
    paddingBottom: s(8),
  },
  side: {
    minWidth: s(60),
  },
  rightSide: {
    alignItems: "flex-end" as const,
  },
  center: {
    flex: 1,
  },
  title: {
    fontSize: fontSize(17),
    fontFamily: FONTS.heading,
    fontWeight: "500",
    color: EARTHY.bark,
    textAlign: "center",
  },
  backText: {
    color: EARTHY.barkSoft,
    fontSize: fontSize(13),
    fontFamily: FONTS.bodyMedium,
  },
});
