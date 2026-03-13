import { useState, useMemo, useCallback } from "react";
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
  const initialDate = parseISO(date);
  const [currentDate, setCurrentDate] = useState(initialDate);
  const { events, loading, refresh } = useEventsQuery(currentDate);

  const dayEvents = useMemo(
    () =>
      events.filter((e) => isSameDay(parseISO(e.start_time), currentDate)),
    [events, currentDate]
  );

  const onEventPress = useCallback(
    (event: CalendarEvent) => {
      router.push(`/(app)/event/${event.id}` as any);
    },
    [router]
  );

  const goToNextDay = useCallback(() => {
    setCurrentDate((prev) => addDays(prev, 1));
  }, []);

  const goToPrevDay = useCallback(() => {
    setCurrentDate((prev) => subDays(prev, 1));
  }, []);

  const goBack = useCallback(() => {
    try {
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace("/(app)");
      }
    } catch {
      // Fallback if router state is stale
      router.replace("/(app)");
    }
  }, [router]);

  return (
    <>
      <Stack.Screen
        options={{
          title: format(currentDate, "EEEE, MMM d"),
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
        <View style={styles.sheetContainer}>
          <DayView
            date={currentDate}
            events={dayEvents}
            onEventPress={onEventPress}
            onNextDay={goToNextDay}
            onPrevDay={goToPrevDay}
            onDoubleTap={goBack}
            refreshing={loading}
            onRefresh={refresh}
          />
          <ChatPanel />
        </View>
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
  sheetContainer: {
    flex: 1,
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
