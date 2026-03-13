import { useState, useMemo, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { parseISO, format, isSameDay, addDays, subDays } from "../../../lib/dates";
import { CalendarEvent } from "../../../stores/eventStore";
import { useEventsQuery } from "../../../hooks/useEventsQuery";
import DayView from "../../../components/calendar/DayView";
import ChatPanel from "../../../components/chat/ChatPanel";
import NaturalLanguageBar from "../../../components/input/NaturalLanguageBar";
import ScreenContainer from "../../../components/ui/ScreenContainer";
import ScreenHeader from "../../../components/ui/ScreenHeader";
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
      router.replace("/(app)");
    }
  }, [router]);

  return (
    <ScreenContainer>
      <ScreenHeader
        left="back"
        title={format(currentDate, "EEEE, MMM d")}
        right={
          <TouchableOpacity
            onPress={() => router.push("/(app)/event/new")}
            activeOpacity={0.7}
          >
            <Text style={styles.newButtonText}>+ New</Text>
          </TouchableOpacity>
        }
      />
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
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  sheetContainer: {
    flex: 1,
  },
  newButtonText: {
    color: ACCENT,
    fontSize: fontSize(13),
    fontFamily: FONTS.bodyMedium,
  },
});
