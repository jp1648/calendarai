import { useState } from "react";
import {
  View,
  TextInput,
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useAgent } from "../../hooks/useAgent";
import { api } from "../../lib/api";
import { useEventStore } from "../../stores/eventStore";

interface Props {
  onEventCreated?: () => void;
}

export default function NaturalLanguageBar({ onEventCreated }: Props) {
  const [input, setInput] = useState("");
  const { schedule, processing } = useAgent();
  const removeEvent = useEventStore((s) => s.removeEvent);

  const handleSubmit = async () => {
    const text = input.trim();
    if (!text) return;
    setInput("");

    const result = await schedule(text);
    if (result?.events_created?.length > 0) {
      onEventCreated?.();
      showUndoAlert(result.events_created[0]);
    } else if (result?.message) {
      Alert.alert("AI Response", result.message);
    }
  };

  const showUndoAlert = (event: any) => {
    Alert.alert(
      "Event Created",
      `"${event.title}" has been added to your calendar.`,
      [
        { text: "OK", style: "default" },
        {
          text: "Undo",
          style: "destructive",
          onPress: async () => {
            try {
              await api.events.delete(event.id);
              removeEvent(event.id);
            } catch {}
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={input}
          onChangeText={setInput}
          placeholder="Try: lunch with Sarah Thursday noon..."
          placeholderTextColor="#999"
          onSubmitEditing={handleSubmit}
          returnKeyType="send"
          editable={!processing}
        />
        {processing ? (
          <ActivityIndicator style={styles.sendButton} color="#007AFF" />
        ) : (
          <TouchableOpacity
            style={styles.sendButton}
            onPress={handleSubmit}
            disabled={!input.trim()}
          >
            <Text
              style={[
                styles.sendText,
                !input.trim() && styles.sendTextDisabled,
              ]}
            >
              Send
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
    borderTopColor: "#E5E5E5",
    backgroundColor: "#fff",
    paddingHorizontal: 16,
    paddingVertical: 8,
    paddingBottom: 20,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F2F2F7",
    borderRadius: 20,
    paddingLeft: 16,
    paddingRight: 4,
  },
  input: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 10,
    color: "#000",
    outlineStyle: "none" as any,
  },
  sendButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  sendText: {
    color: "#007AFF",
    fontSize: 16,
    fontWeight: "600",
  },
  sendTextDisabled: {
    color: "#CCC",
  },
});
