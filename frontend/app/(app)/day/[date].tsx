import { useMemo, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
} from "react-native";
import { useLocalSearchParams, useRouter, Stack } from "expo-router";
import { parseISO, format, isSameDay, addDays, subDays } from "../../../lib/dates";
import { CalendarEvent } from "../../../stores/eventStore";
import { useEventsQuery } from "../../../hooks/useEventsQuery";
import DayView from "../../../components/calendar/DayView";
import ChatPanel from "../../../components/chat/ChatPanel";
import NaturalLanguageBar from "../../../components/input/NaturalLanguageBar";
import { s, fontSize } from "../../../lib/responsive";
import { EARTHY, ACCENT, FONTS } from "../../../lib/theme";

export default function DayScreen() {
  const { date } = useLocalSearchParams<{ date: string }>();
  const router = useRouter();
  const parsedDate = parseISO(date);
  const { events, loading, refresh } = useEventsQuery(parsedDate);

  const dayEvents = useMemo(
    () =>
      events.filter((e) => isSameDay(parseISO(e.start_time), parsedDate)),
    [events, date]
  );

  const onEventPress = useCallback(
    (event: CalendarEvent) => {
      router.push(`/(app)/event/${event.id}` as any);
    },
    [router]
  );

  const goToNextDay = useCallback(() => {
    const next = addDays(parsedDate, 1);
    router.replace(`/(app)/day/${format(next, "yyyy-MM-dd")}`);
  }, [parsedDate, router]);

  const goToPrevDay = useCallback(() => {
    const prev = subDays(parsedDate, 1);
    router.replace(`/(app)/day/${format(prev, "yyyy-MM-dd")}`);
  }, [parsedDate, router]);

  return (
    <>
      <Stack.Screen
        options={{
          title: format(parsedDate, "EEEE, MMM d"),
          headerRight: () => (
            <TouchableOpacity
              onPress={() => router.push("/(app)/event/new")}
              style={styles.headerButton}
            >
              <Text style={styles.headerButtonText}>+ New</Text>
            </TouchableOpacity>
          ),
        }}
      />
      <SafeAreaView style={styles.container}>
        <DayView
          date={parsedDate}
          events={dayEvents}
          onEventPress={onEventPress}
          onNextDay={goToNextDay}
          onPrevDay={goToPrevDay}
          onDoubleTap={() => router.navigate("/(app)")}
          refreshing={loading}
          onRefresh={refresh}
        />
        <ChatPanel />
        <NaturalLanguageBar onEventCreated={refresh} />
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: EARTHY.cream,
  },
  headerButton: {
    marginRight: s(4),
  },
  headerButtonText: {
    color: ACCENT,
    fontSize: fontSize(15),
    fontFamily: FONTS.bodyMedium,
  },
});
