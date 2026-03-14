import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { s, fontSize } from "../../lib/responsive";
import { EARTHY, ACCENT, FONTS } from "../../lib/theme";

interface EmptyStateProps {
  title: string;
  subtitle: string;
  actionLabel?: string;
  onAction?: () => void;
}

export default function EmptyState({ title, subtitle, actionLabel, onAction }: EmptyStateProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
      {actionLabel && onAction && (
        <TouchableOpacity style={styles.button} onPress={onAction} activeOpacity={0.7}>
          <Text style={styles.buttonText}>{actionLabel}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: s(32),
  },
  title: {
    fontSize: fontSize(18),
    fontFamily: FONTS.heading,
    color: EARTHY.bark,
    marginBottom: s(6),
    textAlign: "center",
  },
  subtitle: {
    fontSize: fontSize(14),
    fontFamily: FONTS.bodyLight,
    color: EARTHY.stone,
    textAlign: "center",
    lineHeight: fontSize(20),
    marginBottom: s(20),
  },
  button: {
    backgroundColor: ACCENT,
    borderRadius: s(12),
    paddingVertical: s(10),
    paddingHorizontal: s(24),
  },
  buttonText: {
    color: EARTHY.white,
    fontSize: fontSize(14),
    fontFamily: FONTS.bodyMedium,
  },
});
