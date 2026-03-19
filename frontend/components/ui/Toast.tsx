import { Text, TouchableOpacity, StyleSheet } from "react-native";
import Animated, {
  SlideInDown,
  SlideOutDown,
} from "react-native-reanimated";
import { s, fontSize } from "../../lib/responsive";
import { EARTHY, ACCENT, FONTS } from "../../lib/theme";

export interface ToastAction {
  label: string;
  onPress: () => void;
}

export type ToastVariant = "success" | "error";

interface Props {
  message: string;
  action?: ToastAction;
  variant?: ToastVariant;
  onDismiss: () => void;
}

export default function Toast({ message, action, variant, onDismiss }: Props) {
  return (
    <Animated.View
      entering={SlideInDown.springify().damping(20).stiffness(200)}
      exiting={SlideOutDown.duration(200)}
      style={[styles.container, variant === "error" && styles.containerError]}
    >
      <Text style={styles.message} numberOfLines={2}>
        {message}
      </Text>
      {action && (
        <TouchableOpacity
          onPress={() => {
            action.onPress();
            onDismiss();
          }}
          style={styles.actionButton}
          hitSlop={8}
        >
          <Text style={styles.actionText}>{action.label}</Text>
        </TouchableOpacity>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: s(100),
    left: s(20),
    right: s(20),
    backgroundColor: EARTHY.bark,
    borderRadius: s(16),
    paddingVertical: s(14),
    paddingHorizontal: s(20),
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    shadowColor: EARTHY.bark,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius: 24,
    elevation: 8,
  },
  message: {
    color: EARTHY.white,
    fontSize: fontSize(14),
    fontFamily: FONTS.bodyMedium,
    flex: 1,
    marginRight: s(12),
  },
  actionButton: {
    paddingVertical: s(4),
    paddingHorizontal: s(8),
  },
  actionText: {
    color: ACCENT,
    fontSize: fontSize(14),
    fontFamily: FONTS.bodyMedium,
  },
  containerError: {
    backgroundColor: EARTHY.errorDark,
  },
});
