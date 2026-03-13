import { useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Pressable,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { format, addMonths, subMonths } from "../../lib/dates";
import { s, fontSize } from "../../lib/responsive";
import { useEventsQuery } from "../../hooks/useEventsQuery";
import WeekView, { getWeekDates } from "../../components/calendar/WeekView";
import ChatPanel from "../../components/chat/ChatPanel";
import NaturalLanguageBar from "../../components/input/NaturalLanguageBar";
import ScreenContainer from "../../components/ui/ScreenContainer";
import ScreenHeader from "../../components/ui/ScreenHeader";
import { EARTHY, ACCENT, FONTS, CATEGORIES, categorizeEvent, CategoryKey } from "../../lib/theme";
import { CalendarEvent } from "../../stores/eventStore";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function formatWeekMonth(weekOffset: number): string {
  const dates = getWeekDates(weekOffset);
  const months = [
    ...new Set(dates.map((d) => d.toLocaleDateString("en-US", { month: "long" }))),
  ];
  const year = dates[0].getFullYear();
  return months.length > 1
    ? `${months[0]} \u2013 ${months[1]} ${year}`
    : `${months[0]} ${year}`;
}

function weekLabel(offset: number): string {
  if (offset === 0) return "This week";
  if (offset === 1) return "Next week";
  if (offset === -1) return "Last week";
  return `${Math.abs(offset)} weeks ${offset > 0 ? "ahead" : "ago"}`;
}

export default function CalendarScreen() {
  const [weekOffset, setWeekOffset] = useState(0);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [pickerYear, setPickerYear] = useState(new Date().getFullYear());
  const currentMonth = useMemo(() => {
    const dates = getWeekDates(weekOffset);
    return dates[3]; // midweek date for fetching events
  }, [weekOffset]);
  const { events, loading, refresh } = useEventsQuery(currentMonth);
  const router = useRouter();

  const onDayPress = useCallback(
    (date: Date) => {
      router.push(`/(app)/day/${format(date, "yyyy-MM-dd")}`);
    },
    [router]
  );

  const onEventPress = useCallback(
    (event: CalendarEvent) => {
      router.push(`/(app)/event/${event.id}` as any);
    },
    [router]
  );

  const openPicker = () => {
    setPickerYear(currentMonth.getFullYear());
    setPickerVisible(true);
  };

  const selectMonth = (monthIndex: number) => {
    // Jump to the week containing the 1st of selected month
    const target = new Date(pickerYear, monthIndex, 1);
    const now = new Date();
    const diffDays = Math.round((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    const diffWeeks = Math.round(diffDays / 7);
    setWeekOffset(diffWeeks);
    setPickerVisible(false);
  };

  // Category counts for legend
  const catCounts = useMemo(() => {
    const counts: Partial<Record<CategoryKey, number>> = {};
    events.forEach((e) => {
      const cat = categorizeEvent(e);
      counts[cat] = (counts[cat] || 0) + 1;
    });
    return counts;
  }, [events]);

  return (
    <>
      <ScreenContainer>
        <ScreenHeader
          left={<Text style={styles.headerTitle}>calendar<Text style={styles.headerTitleAi}>ai</Text></Text>}
          right={
            <TouchableOpacity onPress={() => router.push("/(app)/settings")} activeOpacity={0.7}>
              <Text style={styles.headerButtonText}>Settings</Text>
            </TouchableOpacity>
          }
        />

        {/* Week header */}
        <View style={styles.weekHeader}>
          <TouchableOpacity onPress={openPicker}>
            <Text style={styles.monthTitle}>{formatWeekMonth(weekOffset)}</Text>
            <Text style={styles.subtitle}>{weekLabel(weekOffset)}</Text>
          </TouchableOpacity>
          <View style={styles.navRow}>
            <TouchableOpacity
              onPress={() => setWeekOffset((w) => w - 1)}
              style={styles.navButton}
              activeOpacity={0.6}
            >
              <Text style={styles.navArrow}>{"\u2039"}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.todayButton, weekOffset === 0 && styles.todayButtonActive]}
              onPress={() => setWeekOffset(0)}
              activeOpacity={0.7}
            >
              <Text style={[styles.todayText, weekOffset === 0 && styles.todayTextActive]}>Today</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setWeekOffset((w) => w + 1)}
              style={styles.navButton}
              activeOpacity={0.6}
            >
              <Text style={styles.navArrow}>{"\u203A"}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Category summary bar */}
        {Object.keys(catCounts).length > 0 && (
          <View style={styles.summaryBar}>
            {(Object.entries(CATEGORIES) as [CategoryKey, typeof CATEGORIES[CategoryKey]][]).map(
              ([key, cat]) => {
                const count = catCounts[key] || 0;
                if (count === 0) return null;
                return (
                  <View key={key} style={styles.summaryItem}>
                    <View style={[styles.summaryDot, { backgroundColor: cat.dot }]} />
                    <Text style={[styles.summaryText, { color: cat.text }]}>{count} {cat.label}</Text>
                  </View>
                );
              }
            )}
          </View>
        )}

        {/* Week view + chat sheet */}
        <View style={styles.calendarArea}>
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={EARTHY.stone} />
            </View>
          ) : (
            <WeekView
              weekOffset={weekOffset}
              events={events}
              onDayPress={onDayPress}
              onEventPress={onEventPress}
              onNextWeek={() => setWeekOffset((w) => w + 1)}
              onPrevWeek={() => setWeekOffset((w) => w - 1)}
            />
          )}
          <ChatPanel />
        </View>

        <NaturalLanguageBar onEventCreated={refresh} />
      </ScreenContainer>

      {/* Month picker modal */}
      <Modal visible={pickerVisible} transparent animationType="fade">
        <Pressable style={styles.overlay} onPress={() => setPickerVisible(false)}>
          <Pressable style={styles.pickerCard} onPress={(e) => e.stopPropagation()}>
            <View style={styles.yearRow}>
              <TouchableOpacity onPress={() => setPickerYear((y) => y - 1)}>
                <Text style={styles.yearArrow}>{"\u2039"}</Text>
              </TouchableOpacity>
              <Text style={styles.yearText}>{pickerYear}</Text>
              <TouchableOpacity onPress={() => setPickerYear((y) => y + 1)}>
                <Text style={styles.yearArrow}>{"\u203A"}</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.monthGrid}>
              {MONTHS.map((name, i) => {
                const isActive =
                  i === currentMonth.getMonth() &&
                  pickerYear === currentMonth.getFullYear();
                return (
                  <TouchableOpacity
                    key={name}
                    style={[styles.monthCell, isActive && styles.monthCellActive]}
                    onPress={() => selectMonth(i)}
                  >
                    <Text
                      style={[
                        styles.monthCellText,
                        isActive && styles.monthCellTextActive,
                      ]}
                    >
                      {name.slice(0, 3)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  calendarArea: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: fontSize(16),
    fontFamily: FONTS.bodyLight,
    color: EARTHY.bark,
    letterSpacing: 0.5,
  },
  headerTitleAi: {
    color: ACCENT,
    fontFamily: FONTS.bodyMedium,
  },
  headerButtonText: {
    color: EARTHY.stone,
    fontSize: fontSize(13),
    fontFamily: FONTS.bodyMedium,
  },
  weekHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingHorizontal: s(16),
    paddingTop: s(4),
    paddingBottom: s(4),
  },
  monthTitle: {
    fontSize: fontSize(20),
    fontFamily: FONTS.heading,
    color: EARTHY.bark,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: fontSize(12),
    color: EARTHY.stone,
    fontFamily: FONTS.bodyLight,
    marginTop: s(2),
    letterSpacing: 0.2,
  },
  navRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: s(4),
    marginTop: s(4),
  },
  navButton: {
    padding: s(6),
  },
  navArrow: {
    fontSize: fontSize(20),
    color: EARTHY.barkSoft,
    fontWeight: "300",
  },
  todayButton: {
    borderRadius: s(10),
    paddingVertical: s(5),
    paddingHorizontal: s(12),
    backgroundColor: EARTHY.sand,
  },
  todayButtonActive: {
    opacity: 0.4,
  },
  todayText: {
    fontSize: fontSize(12),
    fontFamily: FONTS.bodyMedium,
    color: EARTHY.barkSoft,
  },
  todayTextActive: {
    color: EARTHY.stone,
  },
  summaryBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: s(14),
    paddingHorizontal: s(16),
    paddingVertical: s(6),
  },
  summaryItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: s(5),
  },
  summaryDot: {
    width: s(6),
    height: s(6),
    borderRadius: s(3),
  },
  summaryText: {
    fontSize: fontSize(12),
    fontFamily: FONTS.body,
  },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(59,47,38,0.18)",
    justifyContent: "center",
    alignItems: "center",
  },
  pickerCard: {
    backgroundColor: EARTHY.white,
    borderRadius: s(20),
    padding: s(20),
    width: s(280),
    shadowColor: EARTHY.bark,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 32,
    elevation: 8,
  },
  yearRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: s(16),
  },
  yearArrow: {
    fontSize: fontSize(22),
    color: EARTHY.bark,
    paddingHorizontal: s(12),
  },
  yearText: {
    fontSize: fontSize(17),
    fontFamily: FONTS.headingBold,
    color: EARTHY.bark,
  },
  monthGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  monthCell: {
    width: "25%" as any,
    alignItems: "center" as const,
    paddingVertical: s(10),
    borderRadius: s(10),
  },
  monthCellActive: {
    backgroundColor: ACCENT,
  },
  monthCellText: {
    fontSize: fontSize(13),
    color: EARTHY.barkSoft,
    fontFamily: FONTS.bodyMedium,
  },
  monthCellTextActive: {
    color: EARTHY.white,
    fontWeight: "600",
  },
});
