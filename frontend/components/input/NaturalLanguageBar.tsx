import { useState } from "react";
import {
  View,
  TextInput,
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { useAgentStream } from "../../hooks/useAgentStream";
import { useChatStore } from "../../stores/chatStore";
import { useLocation } from "../../hooks/useLocation";
import { api } from "../../lib/api";
import { useEventStore } from "../../stores/eventStore";
import { useToast } from "../ui/ToastProvider";
import { useNotifications } from "../../hooks/useNotifications";
import { formatTime } from "../../lib/dates";
import { s, fontSize } from "../../lib/responsive";

interface Props {
  onEventCreated?: () => void;
}

export default function NaturalLanguageBar({ onEventCreated }: Props) {
  const [input, setInput] = useState("");
  const { sendMessage } = useAgentStream();
  const { location } = useLocation();
  const streaming = useChatStore((s) => s.streaming);
  const isOpen = useChatStore((s) => s.isOpen);
  const setOpen = useChatStore((s) => s.setOpen);
  const removeEvent = useEventStore((s) => s.removeEvent);
  const { showToast } = useToast();
  const { notifyEventCreated } = useNotifications();

  const handleSubmit = async () => {
    const text = input.trim();
    if (!text) return;
    setInput("");

    const result = await sendMessage(text, location);

    if (!result) return;

    const { eventsCreated, hadToolCalls } = result;

    if (eventsCreated.length > 0) {
      onEventCreated?.();
      const event = eventsCreated[0];
      notifyEventCreated(event.title, formatTime(event.start_time));

      if (!isOpen && !hadToolCalls) {
        showToast({
          message: `"${event.title}" added`,
          action: {
            label: "Undo",
            onPress: async () => {
              try {
                await api.events.delete(event.id);
                removeEvent(event.id);
              } catch {}
            },
          },
        });
      }
    } else if (!isOpen) {
      setOpen(true);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={input}
          onChangeText={setInput}
          placeholder={
            isOpen
              ? "Reply..."
              : "What would you like to schedule?"
          }
          placeholderTextColor="#9CA3AF"
          onSubmitEditing={handleSubmit}
          returnKeyType="send"
          editable={!streaming}
        />
        {streaming ? (
          <ActivityIndicator style={styles.sendButton} color="#9CA3AF" />
        ) : (
          <TouchableOpacity
            style={[
              styles.sendButton,
              styles.sendCircle,
              !input.trim() && styles.sendCircleDisabled,
            ]}
            onPress={handleSubmit}
            disabled={!input.trim()}
          >
            <Text
              style={[
                styles.sendArrow,
                !input.trim() && styles.sendArrowDisabled,
              ]}
            >
              ↑
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#E5E7EB",
    backgroundColor: "#FAFAFA",
    paddingHorizontal: s(12),
    paddingVertical: s(6),
    paddingBottom: s(16),
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: s(22),
    borderWidth: 1,
    borderColor: "#E5E7EB",
    paddingLeft: s(14),
    paddingRight: s(4),
  },
  input: {
    flex: 1,
    fontSize: fontSize(14),
    paddingVertical: s(10),
    color: "#1A1A1A",
    outlineStyle: "none" as any,
  },
  sendButton: {
    paddingHorizontal: s(8),
    paddingVertical: s(8),
  },
  sendCircle: {
    width: s(28),
    height: s(28),
    borderRadius: s(14),
    backgroundColor: "#1A1A1A",
    alignItems: "center",
    justifyContent: "center",
    marginRight: s(2),
  },
  sendCircleDisabled: {
    backgroundColor: "#E5E7EB",
  },
  sendArrow: {
    color: "#fff",
    fontSize: fontSize(16),
    fontWeight: "700",
    marginTop: -1,
  },
  sendArrowDisabled: {
    color: "#9CA3AF",
  },
});
