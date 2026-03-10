import { Text, TouchableOpacity, StyleSheet } from "react-native";
import Animated, {
  SlideInDown,
  SlideOutDown,
} from "react-native-reanimated";
import { s, fontSize } from "../../lib/responsive";

export interface ToastAction {
  label: string;
  onPress: () => void;
}

interface Props {
  message: string;
  action?: ToastAction;
  onDismiss: () => void;
}

export default function Toast({ message, action, onDismiss }: Props) {
  return (
    <Animated.View
      entering={SlideInDown.springify().damping(20).stiffness(200)}
      exiting={SlideOutDown.duration(200)}
      style={styles.container}
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
    backgroundColor: "#1A1A1A",
    borderRadius: s(16),
    paddingVertical: s(14),
    paddingHorizontal: s(20),
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    boxShadow: "0 8px 24px rgba(0,0,0,0.16)",
    elevation: 8,
  } as any,
  message: {
    color: "#fff",
    fontSize: fontSize(14),
    fontWeight: "500",
    flex: 1,
    marginRight: s(12),
  },
  actionButton: {
    paddingVertical: s(4),
    paddingHorizontal: s(8),
  },
  actionText: {
    color: "#8B5CF6",
    fontSize: fontSize(14),
    fontWeight: "700",
  },
});
