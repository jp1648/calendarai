import { useRef, useEffect, useCallback } from "react";
import { View, Text, ScrollView, Pressable, StyleSheet, RefreshControl } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
  FadeInDown,
} from "react-native-reanimated";
import { CalendarEvent } from "../../stores/eventStore";
import EventCard from "./EventCard";
import { parseISO } from "../../lib/dates";
import { s, fontSize } from "../../lib/responsive";
import { EARTHY, FONTS } from "../../lib/theme";

const HOUR_HEIGHT = s(52);
const HOURS = Array.from({ length: 24 }, (_, i) => i);
const SWIPE_THRESHOLD = 50;
const DOUBLE_TAP_DELAY = 300;

interface Props {
  date: Date;
  events: CalendarEvent[];
  onEventPress?: (event: CalendarEvent) => void;
  onNextDay?: () => void;
  onPrevDay?: () => void;
  onDoubleTap?: () => void;
  refreshing?: boolean;
  onRefresh?: () => void;
}

export default function DayView({
  date,
  events,
  onEventPress,
  onNextDay,
  onPrevDay,
  onDoubleTap,
  refreshing,
  onRefresh,
}: Props) {
  const scrollRef = useRef<ScrollView>(null);
  const translateX = useSharedValue(0);
  const lastTapTime = useRef(0);

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

  // JS-based double-tap — works reliably inside ScrollView, no gesture handler conflicts
  const handleTimelinePress = useCallback(() => {
    const now = Date.now();
    if (now - lastTapTime.current < DOUBLE_TAP_DELAY) {
      lastTapTime.current = 0;
      onDoubleTap?.();
    } else {
      lastTapTime.current = now;
    }
  }, [onDoubleTap]);

  // Pan: horizontal swipe for day navigation
  const panGesture = Gesture.Pan()
    .activeOffsetX([-20, 20])
    .failOffsetY([-15, 15])
    .onUpdate((e) => {
      translateX.value = e.translationX * 0.3;
    })
    .onEnd((e) => {
      if (e.translationX < -SWIPE_THRESHOLD && onNextDay) {
        runOnJS(onNextDay)();
      } else if (e.translationX > SWIPE_THRESHOLD && onPrevDay) {
        runOnJS(onPrevDay)();
      }
      translateX.value = withTiming(0, { duration: 180 });
    })
    .onFinalize(() => {
      translateX.value = withTiming(0, { duration: 180 });
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
                tintColor={EARTHY.stone}
              />
            ) : undefined
          }
        >
          <Pressable onPress={handleTimelinePress} style={styles.timeline}>
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
          </Pressable>
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
    color: EARTHY.stone,
    fontFamily: FONTS.bodyMedium,
    width: s(40),
    textAlign: "right",
    top: -7,
  },
  hourLine: {
    flex: 1,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: EARTHY.sand,
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
    color: EARTHY.stone,
    fontFamily: FONTS.bodyMedium,
  },
  emptyHint: {
    fontSize: fontSize(12),
    color: EARTHY.stoneLight,
    fontFamily: FONTS.bodyLight,
    marginTop: s(4),
  },
});
