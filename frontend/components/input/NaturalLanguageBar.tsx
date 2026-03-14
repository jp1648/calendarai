import { useState } from "react";
import {
  View,
  TextInput,
  TouchableOpacity,
  Text,
  StyleSheet,
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
import { EARTHY, ACCENT, FONTS } from "../../lib/theme";

interface Props {
  onEventCreated?: () => void;
}

export default function NaturalLanguageBar({ onEventCreated }: Props) {
  const [input, setInput] = useState("");
  const { sendMessage, abort } = useAgentStream();
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

    if (!result) {
      showToast({ message: "Couldn't reach the server. Try again.", variant: "error" });
      return;
    }

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
        <View style={styles.aiIcon}>
          <View style={styles.aiDot} />
        </View>
        <TextInput
          style={styles.input}
          value={input}
          onChangeText={setInput}
          placeholder={
            isOpen
              ? "Reply..."
              : "Ask AI about your schedule..."
          }
          placeholderTextColor={EARTHY.stoneLight}
          onSubmitEditing={handleSubmit}
          returnKeyType="send"
          editable={!streaming}
        />
        {streaming ? (
          <TouchableOpacity
            style={[styles.sendButton, styles.stopCircle]}
            onPress={abort}
            activeOpacity={0.7}
          >
            <View style={styles.stopIcon} />
          </TouchableOpacity>
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
              {"\u2191"}
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
    borderTopColor: EARTHY.sand,
    backgroundColor: EARTHY.cream,
    paddingHorizontal: s(12),
    paddingVertical: s(6),
    paddingBottom: s(16),
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: EARTHY.white,
    borderRadius: s(16),
    borderWidth: 1,
    borderColor: EARTHY.sand,
    paddingLeft: s(10),
    paddingRight: s(4),
    shadowColor: EARTHY.bark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 16,
    elevation: 3,
  },
  aiIcon: {
    width: s(30),
    height: s(30),
    borderRadius: s(10),
    backgroundColor: ACCENT + "1F",
    alignItems: "center",
    justifyContent: "center",
  },
  aiDot: {
    width: s(8),
    height: s(8),
    borderRadius: s(4),
    backgroundColor: ACCENT,
  },
  input: {
    flex: 1,
    fontSize: fontSize(13),
    paddingVertical: s(10),
    paddingHorizontal: s(10),
    color: EARTHY.bark,
    fontFamily: FONTS.bodyLight,
    outlineStyle: "none" as any,
  },
  sendButton: {
    paddingHorizontal: s(8),
    paddingVertical: s(8),
  },
  sendCircle: {
    width: s(30),
    height: s(30),
    borderRadius: s(10),
    backgroundColor: ACCENT,
    alignItems: "center",
    justifyContent: "center",
    marginRight: s(2),
  },
  sendCircleDisabled: {
    backgroundColor: EARTHY.sand,
    opacity: 0.5,
  },
  sendArrow: {
    color: EARTHY.white,
    fontSize: fontSize(16),
    fontWeight: "700",
    marginTop: -1,
  },
  sendArrowDisabled: {
    color: EARTHY.stoneLight,
  },
  stopCircle: {
    width: s(30),
    height: s(30),
    borderRadius: s(10),
    backgroundColor: EARTHY.stone,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    marginRight: s(2),
  },
  stopIcon: {
    width: s(10),
    height: s(10),
    borderRadius: s(2),
    backgroundColor: EARTHY.white,
  },
});
