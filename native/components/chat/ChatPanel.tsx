import { useRef, useEffect, useCallback } from "react";
import {
  View,
  FlatList,
  Text,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
import BottomSheet, { BottomSheetView } from "@gorhom/bottom-sheet";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { useChatStore, type ChatMessage } from "../../stores/chatStore";
import ChatBubble from "./ChatBubble";
import { s, fontSize } from "../../lib/responsive";
import { EARTHY, ACCENT, FONTS } from "../../lib/theme";

const SNAP_POINTS = ["5%", "50%", "88%"];

function ThinkingIndicator({ statusText }: { statusText: string }) {
  const pulse = useSharedValue(1);

  useEffect(() => {
    pulse.value = withRepeat(
      withSequence(
        withTiming(0.3, { duration: 600, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 600, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      false,
    );
  }, [pulse]);

  const dotStyle = useAnimatedStyle(() => ({
    opacity: pulse.value,
  }));

  return (
    <View style={styles.statusRow}>
      <Animated.View style={[styles.statusDot, dotStyle]} />
      <Text style={styles.statusText}>
        {statusText || "Thinking"}
      </Text>
    </View>
  );
}

export default function ChatPanel() {
  const messages = useChatStore((s) => s.messages);
  const isOpen = useChatStore((s) => s.isOpen);
  const setOpen = useChatStore((s) => s.setOpen);
  const reset = useChatStore((s) => s.reset);
  const thinking = useChatStore((s) => s.thinking);
  const statusText = useChatStore((s) => s.statusText);
  const listRef = useRef<FlatList<ChatMessage>>(null);
  const bottomSheetRef = useRef<BottomSheet>(null);
  const hasMessages = messages.length > 0;

  useEffect(() => {
    if (!hasMessages) {
      bottomSheetRef.current?.close();
      return;
    }
    bottomSheetRef.current?.snapToIndex(isOpen ? 1 : 0);
  }, [isOpen, hasMessages]);

  useEffect(() => {
    if (messages.length > 0 && isOpen) {
      setTimeout(() => {
        listRef.current?.scrollToEnd({ animated: true });
      }, 50);
    }
  }, [messages.length, isOpen]);

  const handleSheetChange = useCallback((index: number) => {
    if (index >= 1) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    setOpen(index >= 1);
  }, [setOpen]);

  const isExpanded = isOpen;

  if (!hasMessages) return null;

  return (
    <BottomSheet
      ref={bottomSheetRef}
      index={isOpen ? 1 : 0}
      snapPoints={SNAP_POINTS}
      onChange={handleSheetChange}
      enablePanDownToClose={false}
      backgroundStyle={styles.sheetBackground}
      handleIndicatorStyle={styles.handleBar}
      style={styles.container}
    >
      <BottomSheetView style={styles.sheetContent}>
        {isExpanded && (
          <View style={styles.headerRow}>
            <View style={styles.chatHeader}>
              <View style={styles.chatHeaderDot} />
              <Text style={styles.chatHeaderText}>Ask your calendar</Text>
            </View>
            <TouchableOpacity
              style={styles.newChatButton}
              onPress={() => reset()}
              hitSlop={8}
            >
              <Text style={styles.newChatText}>New chat</Text>
            </TouchableOpacity>
          </View>
        )}
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(_, i) => String(i)}
          renderItem={({ item }) => <ChatBubble message={item} />}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListFooterComponent={
            thinking ? <ThinkingIndicator statusText={statusText} /> : null
          }
        />
      </BottomSheetView>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  container: {
    shadowColor: EARTHY.bark,
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 8,
  },
  sheetBackground: {
    backgroundColor: EARTHY.white,
    borderTopLeftRadius: s(20),
    borderTopRightRadius: s(20),
  },
  sheetContent: {
    flex: 1,
  },
  handleBar: {
    backgroundColor: EARTHY.fog,
    width: s(36),
    height: s(4),
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: s(16),
    paddingBottom: s(10),
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: EARTHY.sand,
  },
  chatHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: s(8),
  },
  chatHeaderDot: {
    width: s(7),
    height: s(7),
    borderRadius: s(4),
    backgroundColor: "#86C3B9",
  },
  chatHeaderText: {
    fontFamily: FONTS.heading,
    fontSize: fontSize(15),
    color: EARTHY.bark,
  },
  newChatButton: {
    paddingHorizontal: s(10),
    paddingVertical: s(4),
    borderRadius: s(6),
    backgroundColor: EARTHY.sandLight,
  },
  newChatText: {
    color: EARTHY.barkSoft,
    fontSize: fontSize(12),
    fontFamily: FONTS.bodyMedium,
  },
  list: {
    paddingHorizontal: s(10),
    paddingBottom: s(6),
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingHorizontal: s(14),
    paddingVertical: s(10),
    marginVertical: s(2),
    gap: s(8),
  },
  statusDot: {
    width: s(7),
    height: s(7),
    borderRadius: s(4),
    backgroundColor: "#86C3B9",
  },
  statusText: {
    fontSize: fontSize(13),
    color: EARTHY.barkSoft,
    fontFamily: FONTS.bodyLight,
    fontStyle: "italic",
  },
});
