import { useRef, useEffect } from "react";
import { View, Text, ScrollView, StyleSheet, RefreshControl } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
  FadeInDown,
} from "react-native-reanimated";
import { CalendarEvent } from "../../stores/eventStore";
import EventCard from "./EventCard";
import { parseISO } from "../../lib/dates";
import { s, fontSize } from "../../lib/responsive";

const HOUR_HEIGHT = s(52);
const HOURS = Array.from({ length: 24 }, (_, i) => i);
const SWIPE_THRESHOLD = 50;

interface Props {
  date: Date;
  events: CalendarEvent[];
  onEventPress?: (event: CalendarEvent) => void;
  onNextDay?: () => void;
  onPrevDay?: () => void;
  refreshing?: boolean;
  onRefresh?: () => void;
}

export default function DayView({
  date,
  events,
  onEventPress,
  onNextDay,
  onPrevDay,
  refreshing,
  onRefresh,
}: Props) {
  const scrollRef = useRef<ScrollView>(null);
  const translateX = useSharedValue(0);

  useEffect(() => {
    setTimeout(() => {
      scrollRef.current?.scrollTo({ y: 8 * HOUR_HEIGHT, animated: false });
    }, 100);
  }, []);

  const getEventPosition = (event: CalendarEvent) => {
    const start = parseISO(event.start_time);
    const end = parseISO(event.end_time);
    const startMinutes = start.getHours() * 60 + start.getMinutes();
    const endMinutes = end.getHours() * 60 + end.getMinutes();
    const top = (startMinutes / 60) * HOUR_HEIGHT;
    const height = Math.max(
      ((endMinutes - startMinutes) / 60) * HOUR_HEIGHT,
      s(24)
    );
    return { top, height };
  };

  const panGesture = Gesture.Pan()
    .activeOffsetX([-20, 20])
    .onUpdate((e) => {
      translateX.value = e.translationX * 0.3;
    })
    .onEnd((e) => {
      if (e.translationX < -SWIPE_THRESHOLD && onNextDay) {
        runOnJS(onNextDay)();
      } else if (e.translationX > SWIPE_THRESHOLD && onPrevDay) {
        runOnJS(onPrevDay)();
      }
      translateX.value = withSpring(0, { damping: 20, stiffness: 200 });
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const formatHour = (hour: number) => {
    if (hour === 0) return "12 AM";
    if (hour < 12) return `${hour} AM`;
    if (hour === 12) return "12 PM";
    return `${hour - 12} PM`;
  };

  return (
    <GestureDetector gesture={panGesture}>
      <Animated.View style={[{ flex: 1 }, animatedStyle]}>
        <ScrollView
          ref={scrollRef}
          style={styles.container}
          refreshControl={
            onRefresh ? (
              <RefreshControl
                refreshing={refreshing ?? false}
                onRefresh={onRefresh}
                tintColor="#9CA3AF"
              />
            ) : undefined
          }
        >
          <View style={styles.timeline}>
            {HOURS.map((hour) => (
              <View key={hour} style={styles.hourRow}>
                <Text style={styles.hourLabel}>{formatHour(hour)}</Text>
                <View style={styles.hourLine} />
              </View>
            ))}

            {events.map((event, index) => {
              const { top, height } = getEventPosition(event);
              return (
                <Animated.View
                  key={event.id}
                  entering={FadeInDown.delay(index * 40).duration(250)}
                  style={[styles.eventWrapper, { top, height }]}
                >
                  <EventCard event={event} compact onPress={onEventPress} />
                </Animated.View>
              );
            })}

            {events.length === 0 && (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>No events today</Text>
                <Text style={styles.emptyHint}>Use the input below to add one</Text>
              </View>
            )}
          </View>
        </ScrollView>
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  timeline: {
    position: "relative",
    height: 24 * HOUR_HEIGHT,
    marginLeft: s(48),
    marginRight: s(8),
  },
  hourRow: {
    height: HOUR_HEIGHT,
    flexDirection: "row",
    alignItems: "flex-start",
  },
  hourLabel: {
    position: "absolute",
    left: s(-44),
    fontSize: fontSize(10),
    color: "#9CA3AF",
    fontWeight: "500",
    width: s(40),
    textAlign: "right",
    top: -7,
  },
  hourLine: {
    flex: 1,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#E5E7EB",
  },
  eventWrapper: {
    position: "absolute",
    left: s(4),
    right: s(4),
  },
  emptyState: {
    position: "absolute",
    top: 9 * HOUR_HEIGHT,
    left: 0,
    right: 0,
    alignItems: "center",
  },
  emptyText: {
    fontSize: fontSize(14),
    color: "#9CA3AF",
    fontWeight: "500",
  },
  emptyHint: {
    fontSize: fontSize(12),
    color: "#D1D5DB",
    marginTop: s(4),
  },
});
