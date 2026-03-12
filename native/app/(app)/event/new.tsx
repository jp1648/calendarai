import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Pressable,
  StyleSheet,
  ScrollView,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { api } from "../../../lib/api";
import { useEventStore } from "../../../stores/eventStore";
import { format, parseISO } from "../../../lib/dates";
import DatePickerModal from "../../../components/input/DatePickerModal";
import TimePickerModal from "../../../components/input/TimePickerModal";
import { s, fontSize } from "../../../lib/responsive";
import { EARTHY, ACCENT, FONTS } from "../../../lib/theme";

export default function NewEventScreen() {
  const router = useRouter();
  const addEvent = useEventStore((s) => s.addEvent);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [loading, setLoading] = useState(false);

  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [startPickerOpen, setStartPickerOpen] = useState(false);
  const [endPickerOpen, setEndPickerOpen] = useState(false);

  const handleCreate = async () => {
    if (!title || !date || !startTime || !endTime) {
      Alert.alert("Error", "Title, date, start time, and end time are required");
      return;
    }
    setLoading(true);
    try {
      const event = await api.events.create({
        title,
        description,
        location,
        start_time: `${date}T${startTime}:00`,
        end_time: `${date}T${endTime}:00`,
      });
      addEvent(event);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch (e: any) {
      Alert.alert("Error", e.message);
    } finally {
      setLoading(false);
    }
  };

  const formatDisplayTime = (time: string) => {
    if (!time) return "";
    const [h, m] = time.split(":").map(Number);
    const ampm = h >= 12 ? "PM" : "AM";
    const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
    return `${h12}:${String(m).padStart(2, "0")} ${ampm}`;
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.label}>Title</Text>
      <TextInput
        style={styles.input}
        value={title}
        onChangeText={setTitle}
        placeholder="Event title"
        placeholderTextColor={EARTHY.stoneLight}
      />

      <Text style={styles.label}>Description</Text>
      <TextInput
        style={[styles.input, styles.multiline]}
        value={description}
        onChangeText={setDescription}
        placeholder="Optional description"
        multiline
        placeholderTextColor={EARTHY.stoneLight}
      />

      <Text style={styles.label}>Location</Text>
      <TextInput
        style={styles.input}
        value={location}
        onChangeText={setLocation}
        placeholder="Optional location"
        placeholderTextColor={EARTHY.stoneLight}
      />

      <Text style={styles.label}>Date</Text>
      <Pressable style={styles.pickerField} onPress={() => setDatePickerOpen(true)}>
        <Text style={[styles.pickerText, !date && styles.placeholderText]}>
          {date ? format(parseISO(date), "EEEE, MMM d, yyyy") : "Select date"}
        </Text>
      </Pressable>

      <View style={styles.row}>
        <View style={styles.halfField}>
          <Text style={styles.label}>Start Time</Text>
          <Pressable style={styles.pickerField} onPress={() => setStartPickerOpen(true)}>
            <Text style={[styles.pickerText, !startTime && styles.placeholderText]}>
              {startTime ? formatDisplayTime(startTime) : "Start"}
            </Text>
          </Pressable>
        </View>
        <View style={styles.halfField}>
          <Text style={styles.label}>End Time</Text>
          <Pressable style={styles.pickerField} onPress={() => setEndPickerOpen(true)}>
            <Text style={[styles.pickerText, !endTime && styles.placeholderText]}>
              {endTime ? formatDisplayTime(endTime) : "End"}
            </Text>
          </Pressable>
        </View>
      </View>

      <TouchableOpacity
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={handleCreate}
        disabled={loading}
      >
        <Text style={styles.buttonText}>
          {loading ? "Creating..." : "Create Event"}
        </Text>
      </TouchableOpacity>

      <DatePickerModal
        visible={datePickerOpen}
        value={date ? parseISO(date) : new Date()}
        onSelect={(d) => setDate(format(d, "yyyy-MM-dd"))}
        onClose={() => setDatePickerOpen(false)}
      />
      <TimePickerModal
        visible={startPickerOpen}
        value={startTime || "09:00"}
        onSelect={setStartTime}
        onClose={() => setStartPickerOpen(false)}
      />
      <TimePickerModal
        visible={endPickerOpen}
        value={endTime || "10:00"}
        onSelect={setEndTime}
        onClose={() => setEndPickerOpen(false)}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: EARTHY.cream },
  content: { padding: s(24) },
  label: { fontSize: fontSize(13), fontFamily: FONTS.bodyMedium, color: EARTHY.stone, marginBottom: s(6), marginTop: s(16) },
  input: { borderWidth: 1, borderColor: EARTHY.sand, borderRadius: s(14), padding: s(16), fontSize: fontSize(16), backgroundColor: EARTHY.white, color: EARTHY.bark, fontFamily: FONTS.body },
  multiline: { minHeight: s(80), textAlignVertical: "top" },
  pickerField: { borderWidth: 1, borderColor: EARTHY.sand, borderRadius: s(14), padding: s(16), backgroundColor: EARTHY.white },
  pickerText: { fontSize: fontSize(16), color: EARTHY.bark, fontFamily: FONTS.body },
  placeholderText: { color: EARTHY.stoneLight },
  row: { flexDirection: "row", gap: s(12) },
  halfField: { flex: 1 },
  button: { backgroundColor: ACCENT, borderRadius: s(14), padding: s(16), alignItems: "center", marginTop: s(28) },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: EARTHY.white, fontSize: fontSize(16), fontFamily: FONTS.bodyMedium },
});
