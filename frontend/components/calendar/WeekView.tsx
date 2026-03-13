import { useMemo, useEffect, useRef } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
  FadeInDown,
} from "react-native-reanimated";
import { CalendarEvent } from "../../stores/eventStore";
import { format, parseISO, isSameDay, formatTime as _ft } from "../../lib/dates";

/** Duration in minutes between two ISO timestamps */
function durationMins(startIso: string, endIso: string): number {
  const s = parseISO(startIso);
  const e = parseISO(endIso);
  return Math.max(15, (e.getTime() - s.getTime()) / 60000);
}
import { s, fontSize } from "../../lib/responsive";
import { EARTHY, ACCENT, FONTS, CATEGORIES, categorizeEvent } from "../../lib/theme";
import { formatTime } from "../../lib/dates";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const SWIPE_THRESHOLD = 50;

// Entrance animation plays only on first calendar load, not on back-navigation
let hasPlayedEntrance = false;

interface Props {
  weekOffset: number;
  events: CalendarEvent[];
  onDayPress: (date: Date) => void;
  onEventPress?: (event: CalendarEvent) => void;
  onNextWeek: () => void;
  onPrevWeek: () => void;
}

function getWeekDates(offset: number): Date[] {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((dayOfWeek + 6) % 7) + offset * 7);
  monday.setHours(0, 0, 0, 0);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}

export { getWeekDates };

export default function WeekView({
  weekOffset,
  events,
  onDayPress,
  onEventPress,
  onNextWeek,
  onPrevWeek,
}: Props) {
  const dates = useMemo(() => getWeekDates(weekOffset), [weekOffset]);
  const today = useMemo(() => new Date(), []);
  const translateX = useSharedValue(0);
  const shouldAnimate = useRef(!hasPlayedEntrance);

  useEffect(() => {
    hasPlayedEntrance = true;
  }, []);

  const panGesture = Gesture.Pan()
    .activeOffsetX([-20, 20])
    .onUpdate((e) => {
      translateX.value = e.translationX * 0.4;
    })
    .onEnd((e) => {
      if (e.translationX < -SWIPE_THRESHOLD) {
        runOnJS(onNextWeek)();
      } else if (e.translationX > SWIPE_THRESHOLD) {
        runOnJS(onPrevWeek)();
      }
      translateX.value = withSpring(0, { damping: 20, stiffness: 200 });
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const eventsByDay = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    events.forEach((e) => {
      const key = format(parseISO(e.start_time), "yyyy-MM-dd");
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(e);
    });
    return map;
  }, [events]);

  return (
    <GestureDetector gesture={panGesture}>
      <Animated.View style={[styles.container, animatedStyle]}>
        {dates.map((date, i) => {
          const key = format(date, "yyyy-MM-dd");
          const dayEvents = eventsByDay.get(key) || [];
          const dayIsToday = isSameDay(date, today);

          return (
            <Animated.View
              key={i}
              entering={shouldAnimate.current ? FadeInDown.delay(i * 40).duration(250) : undefined}
              style={[styles.dayColumn, dayIsToday && styles.dayColumnToday]}
            >
              <TouchableOpacity
                style={styles.dayTouchable}
                onPress={() => onDayPress(date)}
                activeOpacity={0.6}
              >
                <View style={styles.dayHeader}>
                  <Text
                    style={[
                      styles.dayLabel,
                      dayIsToday && styles.dayLabelToday,
                    ]}
                  >
                    {DAYS[i]}
                  </Text>
                  <View
                    style={[
                      styles.dateCircle,
                      dayIsToday && styles.dateCircleToday,
                    ]}
                  >
                    <Text
                      style={[
                        styles.dateText,
                        dayIsToday && styles.dateTextToday,
                      ]}
                    >
                      {date.getDate()}
                    </Text>
                  </View>
                </View>

                <View style={styles.eventsContainer}>
                  {dayEvents.map((event, j) => {
                    const cat = CATEGORIES[categorizeEvent(event)];
                    const mins = durationMins(event.start_time, event.end_time);
                    // Scale: 30min → s(28), 60min → s(44), 120min → s(76)
                    const cardHeight = Math.max(s(28), s(12) + (mins / 60) * s(32));
                    return (
                      <View
                        key={event.id || j}
                        style={[
                          styles.eventCard,
                          {
                            backgroundColor: cat.bg,
                            minHeight: cardHeight,
                          },
                        ]}
                      >
                        <Text style={[styles.eventTime, { color: cat.text }]} numberOfLines={1}>
                          {formatTime(event.start_time)}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              </TouchableOpacity>
            </Animated.View>
          );
        })}
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    gap: s(2),
    paddingHorizontal: s(6),
    flex: 1,
  },
  dayColumn: {
    flex: 1,
    borderRadius: s(14),
    paddingTop: s(10),
    paddingBottom: s(14),
    paddingHorizontal: s(3),
  },
  dayColumnToday: {
    backgroundColor: EARTHY.white,
  },
  dayTouchable: {
    flex: 1,
  },
  dayHeader: {
    alignItems: "center",
    gap: s(4),
    marginBottom: s(10),
  },
  dayLabel: {
    fontSize: fontSize(10),
    textTransform: "uppercase",
    letterSpacing: 0.8,
    color: EARTHY.stone,
    fontFamily: FONTS.body,
  },
  dayLabelToday: {
    color: ACCENT,
    fontFamily: FONTS.bodyMedium,
  },
  dateCircle: {
    width: s(30),
    height: s(30),
    borderRadius: s(15),
    alignItems: "center",
    justifyContent: "center",
  },
  dateCircleToday: {
    backgroundColor: ACCENT,
  },
  dateText: {
    fontSize: fontSize(13),
    fontWeight: "500",
    color: EARTHY.bark,
    fontFamily: FONTS.bodyMedium,
  },
  dateTextToday: {
    color: EARTHY.white,
  },
  eventsContainer: {
    flex: 1,
    gap: s(5),
  },
  eventCard: {
    borderRadius: s(9),
    paddingVertical: s(5),
    paddingHorizontal: s(4),
  },
  eventTime: {
    fontSize: fontSize(9),
    fontWeight: "500",
    fontFamily: FONTS.bodyMedium,
  },
});
