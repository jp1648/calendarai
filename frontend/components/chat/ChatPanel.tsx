import { useRef, useEffect, useMemo, useCallback } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Pressable } from "react-native";
import BottomSheet, { BottomSheetFlatList } from "@gorhom/bottom-sheet";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from "react-native-reanimated";
import { useChatStore, type ChatMessage } from "../../stores/chatStore";
import ChatBubble from "./ChatBubble";
import { s, fontSize } from "../../lib/responsive";
import { EARTHY, FONTS } from "../../lib/theme";

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
      <Text style={styles.statusText}>{statusText || "Thinking"}</Text>
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
  const sheetRef = useRef<BottomSheet>(null);
  const listRef = useRef<any>(null);
  const hasMessages = messages.length > 0;

  // Handle-only peek, half screen, near-full screen
  const snapPoints = useMemo(() => [s(20), "50%", "88%"], []);

  // Sync store state → sheet position
  useEffect(() => {
    if (!hasMessages) {
      sheetRef.current?.close();
      return;
    }
    sheetRef.current?.snapToIndex(isOpen ? 1 : 0);
  }, [isOpen, hasMessages]);

  // Auto-scroll when new messages arrive
  useEffect(() => {
    if (messages.length > 0 && isOpen) {
      setTimeout(() => {
        listRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages.length, isOpen]);

  // Sync sheet position → store state
  const handleSheetChange = useCallback(
    (index: number) => {
      if (index < 0) return;
      setOpen(index > 0);
    },
    [setOpen],
  );

  // Tap handle to toggle collapsed ↔ half
  const handleToggle = useCallback(() => {
    if (isOpen) {
      sheetRef.current?.snapToIndex(0);
    } else {
      sheetRef.current?.snapToIndex(1);
    }
  }, [isOpen]);

  const renderHandle = useCallback(
    () => (
      <Pressable onPress={handleToggle} style={styles.handleContainer}>
        <View style={styles.handleBar} />
      </Pressable>
    ),
    [handleToggle],
  );

  if (!hasMessages) return null;

  return (
    <BottomSheet
      ref={sheetRef}
      index={isOpen ? 1 : 0}
      snapPoints={snapPoints}
      onChange={handleSheetChange}
      enablePanDownToClose={false}
      handleComponent={renderHandle}
      backgroundStyle={styles.background}
      style={styles.sheet}
      animateOnMount
    >
      {/* Header */}
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
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

      {/* Messages — BottomSheetFlatList handles scroll↔drag handoff natively */}
      <BottomSheetFlatList<ChatMessage>
        ref={listRef}
        data={messages}
        keyExtractor={(_: ChatMessage, i: number) => String(i)}
        renderItem={({ item }: { item: ChatMessage }) => <ChatBubble message={item} />}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListFooterComponent={
          thinking ? <ThinkingIndicator statusText={statusText} /> : null
        }
      />
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  sheet: {
    borderTopLeftRadius: s(20),
    borderTopRightRadius: s(20),
    shadowColor: EARTHY.bark,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 8,
  },
  background: {
    backgroundColor: EARTHY.white,
    borderTopLeftRadius: s(20),
    borderTopRightRadius: s(20),
  },
  handleContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: s(6),
    paddingBottom: s(4),
  },
  handleBar: {
    width: s(36),
    height: s(4),
    borderRadius: s(2),
    backgroundColor: EARTHY.fog,
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
  headerLeft: {
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
    paddingHorizontal: s(10),
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
