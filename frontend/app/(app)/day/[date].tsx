import { useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { useLocalSearchParams, useRouter, Stack } from "expo-router";
import { parseISO, format, isSameDay } from "../../../lib/dates";
import { useEventStore, CalendarEvent } from "../../../stores/eventStore";
import DayView from "../../../components/calendar/DayView";

export default function DayScreen() {
  const { date } = useLocalSearchParams<{ date: string }>();
  const router = useRouter();
  const events = useEventStore((s) => s.events);
  const parsedDate = parseISO(date);

  const dayEvents = useMemo(
    () =>
      events.filter((e) => isSameDay(parseISO(e.start_time), parsedDate)),
    [events, date]
  );

  return (
    <>
      <Stack.Screen
        options={{
          title: format(parsedDate, "EEEE, MMM d"),
          headerRight: () => (
            <TouchableOpacity onPress={() => router.push("/(app)/event/new")} style={{ marginRight: 16 }}>
              <Text style={{ color: "#007AFF", fontSize: 16 }}>+ New</Text>
            </TouchableOpacity>
          ),
        }}
      />
      <View style={styles.container}>
        <DayView date={parsedDate} events={dayEvents} />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
});
