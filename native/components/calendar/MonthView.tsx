import { useMemo } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import {
  getCalendarDays,
  isSameDay,
  isSameMonth,
  format,
  parseISO,
} from "../../lib/dates";
import { s, fontSize } from "../../lib/responsive";
import { CalendarEvent } from "../../stores/eventStore";
import { EARTHY, ACCENT, FONTS, CATEGORIES, categorizeEvent } from "../../lib/theme";

const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];
const SWIPE_THRESHOLD = 50;

interface Props {
  currentMonth: Date;
  events: CalendarEvent[];
  onDayPress: (date: Date) => void;
  onNextMonth?: () => void;
  onPrevMonth?: () => void;
}

function chunkWeeks(days: Date[]): Date[][] {
  const weeks: Date[][] = [];
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7));
  }
  return weeks;
}

export default function MonthView({
  currentMonth,
  events,
  onDayPress,
  onNextMonth,
  onPrevMonth,
}: Props) {
  const days = useMemo(() => getCalendarDays(currentMonth), [currentMonth]);
  const weeks = useMemo(() => chunkWeeks(days), [days]);
  const today = new Date();
  const translateX = useSharedValue(0);
  const hasTriggeredHaptic = useSharedValue(false);

  const panGesture = Gesture.Pan()
    .activeOffsetX([-20, 20])
    .onUpdate((e) => {
      translateX.value = e.translationX * 0.4;
      if (Math.abs(e.translationX) > SWIPE_THRESHOLD && !hasTriggeredHaptic.value) {
        hasTriggeredHaptic.value = true;
        runOnJS(Haptics.impactAsync)(Haptics.ImpactFeedbackStyle.Light);
      }
    })
    .onEnd((e) => {
      hasTriggeredHaptic.value = false;
      if (e.translationX < -SWIPE_THRESHOLD && onNextMonth) {
        runOnJS(onNextMonth)();
      } else if (e.translationX > SWIPE_THRESHOLD && onPrevMonth) {
        runOnJS(onPrevMonth)();
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

  const handleDayPress = (day: Date) => {
    Haptics.selectionAsync();
    onDayPress(day);
  };

  return (
    <GestureDetector gesture={panGesture}>
      <Animated.View style={[styles.container, animatedStyle]}>
        <View style={styles.weekdayRow}>
          {WEEKDAYS.map((d, i) => (
            <View key={i} style={styles.weekdayCell}>
              <Text style={styles.weekdayText}>{d}</Text>
            </View>
          ))}
        </View>

        {weeks.map((week, wi) => (
          <View key={wi} style={styles.weekRow}>
            {week.map((day, di) => {
              const key = format(day, "yyyy-MM-dd");
              const dayEvents = eventsByDay.get(key) || [];
              const isToday = isSameDay(day, today);
              const isCurrentMonth = isSameMonth(day, currentMonth);

              const dotColors = [
                ...new Set(
                  dayEvents.map((e) => CATEGORIES[categorizeEvent(e)].dot),
                ),
              ].slice(0, 3);

              return (
                <TouchableOpacity
                  key={di}
                  style={styles.dayCell}
                  onPress={() => handleDayPress(day)}
                  activeOpacity={0.5}
                >
                  <View
                    style={[styles.dayNumber, isToday && styles.todayCircle]}
                  >
                    <Text
                      style={[
                        styles.dayText,
                        !isCurrentMonth && styles.dimText,
                        isToday && styles.todayText,
                      ]}
                    >
                      {format(day, "d")}
                    </Text>
                  </View>
                  <View style={styles.dotRow}>
                    {dotColors.map((color, ci) => (
                      <View
                        key={ci}
                        style={[styles.dot, { backgroundColor: color }]}
                      />
                    ))}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: s(4),
  },
  weekdayRow: {
    flexDirection: "row",
    marginBottom: s(2),
  },
  weekdayCell: {
    flex: 1,
    alignItems: "center",
    paddingVertical: s(4),
  },
  weekdayText: {
    fontSize: fontSize(11),
    fontWeight: "500",
    color: EARTHY.stone,
    fontFamily: FONTS.bodyMedium,
    letterSpacing: 0.5,
  },
  weekRow: {
    flexDirection: "row",
  },
  dayCell: {
    flex: 1,
    alignItems: "center",
    paddingVertical: s(3),
    minHeight: s(40),
  },
  dayNumber: {
    width: s(30),
    height: s(30),
    alignItems: "center",
    justifyContent: "center",
    borderRadius: s(15),
  },
  dayText: {
    fontSize: fontSize(13),
    color: EARTHY.bark,
    fontFamily: FONTS.body,
  },
  dimText: {
    color: EARTHY.stoneLight,
  },
  todayCircle: {
    backgroundColor: ACCENT,
  },
  todayText: {
    color: EARTHY.white,
    fontFamily: FONTS.bodyMedium,
  },
  dotRow: {
    flexDirection: "row",
    gap: s(2),
    marginTop: s(2),
    height: s(4),
  },
  dot: {
    width: s(4),
    height: s(4),
    borderRadius: s(2),
  },
});
