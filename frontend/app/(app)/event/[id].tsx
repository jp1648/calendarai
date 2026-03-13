import { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Pressable,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../../../lib/api";
import { CalendarEvent } from "../../../stores/eventStore";
import { parseISO, format } from "../../../lib/dates";
import DatePickerModal from "../../../components/input/DatePickerModal";
import TimePickerModal from "../../../components/input/TimePickerModal";
import ScreenContainer from "../../../components/ui/ScreenContainer";
import ScreenHeader from "../../../components/ui/ScreenHeader";
import { s, fontSize } from "../../../lib/responsive";
import { EARTHY, ACCENT, FONTS } from "../../../lib/theme";

export default function EditEventScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();

  const {
    data: existing,
    isLoading: fetching,
    error: fetchError,
  } = useQuery<CalendarEvent>({
    queryKey: ["event", id],
    queryFn: () => api.events.get(id),
    staleTime: 1000 * 60,
  });

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

  useEffect(() => {
    if (!existing) return;
    setTitle(existing.title);
    setDescription(existing.description || "");
    setLocation(existing.location || "");
    const start = parseISO(existing.start_time);
    const end = parseISO(existing.end_time);
    setDate(format(start, "yyyy-MM-dd"));
    setStartTime(format(start, "HH:mm"));
    setEndTime(format(end, "HH:mm"));
  }, [existing?.id]);

  if (fetching) {
    return (
      <ScreenContainer>
        <ScreenHeader left="back" title="Edit Event" />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={EARTHY.bark} />
        </View>
      </ScreenContainer>
    );
  }

  if (fetchError || !existing) {
    return (
      <ScreenContainer>
        <ScreenHeader left="back" title="Edit Event" />
        <View style={styles.centered}>
          <Text style={styles.notFoundText}>Event not found</Text>
        </View>
      </ScreenContainer>
    );
  }

  const handleSave = async () => {
    if (!title || !date || !startTime || !endTime) {
      Alert.alert("Error", "Title, date, start time, and end time are required");
      return;
    }
    setLoading(true);
    try {
      await api.events.update(id, {
        title,
        description,
        location,
        start_time: `${date}T${startTime}:00`,
        end_time: `${date}T${endTime}:00`,
      });
      queryClient.invalidateQueries({ queryKey: ["events"] });
      queryClient.invalidateQueries({ queryKey: ["event", id] });
      router.back();
    } catch (e: any) {
      Alert.alert("Error", e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = () => {
    Alert.alert("Delete Event", `Delete "${title}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          setLoading(true);
          try {
            await api.events.delete(id);
            queryClient.invalidateQueries({ queryKey: ["events"] });
            router.back();
          } catch (e: any) {
            Alert.alert("Error", e.message);
          } finally {
            setLoading(false);
          }
        },
      },
    ]);
  };

  const formatDisplayTime = (time: string) => {
    if (!time) return "";
    const [h, m] = time.split(":").map(Number);
    const ampm = h >= 12 ? "PM" : "AM";
    const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
    return `${h12}:${String(m).padStart(2, "0")} ${ampm}`;
  };

  return (
    <ScreenContainer>
      <ScreenHeader
        left="back"
        title="Edit Event"
        right={
          <TouchableOpacity onPress={handleDelete} activeOpacity={0.7}>
            <Text style={styles.deleteText}>Delete</Text>
          </TouchableOpacity>
        }
      />
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
          onPress={handleSave}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading ? "Saving..." : "Save Changes"}
          </Text>
        </TouchableOpacity>
      </ScrollView>

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
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: EARTHY.cream,
  },
  content: {
    padding: s(24),
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: EARTHY.cream,
  },
  notFoundText: {
    fontSize: fontSize(15),
    color: EARTHY.stone,
    fontFamily: FONTS.body,
  },
  deleteText: {
    color: "#EF4444",
    fontSize: fontSize(15),
    fontFamily: FONTS.bodyMedium,
  },
  label: {
    fontSize: fontSize(13),
    fontFamily: FONTS.bodyMedium,
    color: EARTHY.stone,
    marginBottom: s(6),
    marginTop: s(16),
  },
  input: {
    borderWidth: 1,
    borderColor: EARTHY.sand,
    borderRadius: s(14),
    padding: s(16),
    fontSize: fontSize(16),
    backgroundColor: EARTHY.white,
    color: EARTHY.bark,
    fontFamily: FONTS.body,
  },
  multiline: {
    minHeight: s(80),
    textAlignVertical: "top",
  },
  pickerField: {
    borderWidth: 1,
    borderColor: EARTHY.sand,
    borderRadius: s(14),
    padding: s(16),
    backgroundColor: EARTHY.white,
  },
  pickerText: {
    fontSize: fontSize(16),
    color: EARTHY.bark,
    fontFamily: FONTS.body,
  },
  placeholderText: {
    color: EARTHY.stoneLight,
  },
  row: {
    flexDirection: "row",
    gap: s(12),
  },
  halfField: {
    flex: 1,
  },
  button: {
    backgroundColor: ACCENT,
    borderRadius: s(14),
    padding: s(16),
    alignItems: "center",
    marginTop: s(28),
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: EARTHY.white,
    fontSize: fontSize(16),
    fontFamily: FONTS.bodyMedium,
  },
});
