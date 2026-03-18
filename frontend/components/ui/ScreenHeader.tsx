import { View, Text, StyleSheet } from "react-native";
import { s, fontSize } from "../../lib/responsive";
import { EARTHY, FONTS } from "../../lib/theme";
import BackButton from "./BackButton";

interface ScreenHeaderProps {
  /** Left content — set to "back" for a standard back button, or pass custom JSX */
  left?: "back" | React.ReactNode;
  /** Center title */
  title?: string;
  /** Right content — pass custom JSX */
  right?: React.ReactNode;
}

export default function ScreenHeader({ left, title, right }: ScreenHeaderProps) {
  const renderLeft = () => {
    if (left === "back") {
      return (
        <View style={styles.side}>
          <BackButton />
        </View>
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
});
