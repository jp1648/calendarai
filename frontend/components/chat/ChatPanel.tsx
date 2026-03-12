import { useRef, useEffect } from "react";
import {
  View,
  FlatList,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
} from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withRepeat,
  withSequence,
  withTiming,
  runOnJS,
  Easing,
} from "react-native-reanimated";
import { useChatStore, type ChatMessage } from "../../stores/chatStore";
import ChatBubble from "./ChatBubble";
import { s, fontSize } from "../../lib/responsive";
import { EARTHY, ACCENT, FONTS } from "../../lib/theme";

const SCREEN_HEIGHT = Dimensions.get("window").height;
const HANDLE_HEIGHT = s(28);
const SNAP_HALF = SCREEN_HEIGHT * 0.5;
const SNAP_FULL = SCREEN_HEIGHT * 0.88;
const SPRING_CONFIG = { damping: 20, stiffness: 150 };

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
  const panelHeight = useSharedValue(0);
  const startHeight = useSharedValue(0);
  const hasMessages = messages.length > 0;

  const snapToNearest = (currentH: number, velocityY: number) => {
    "worklet";
    // velocityY negative = swiping up, positive = swiping down
    const snaps = [HANDLE_HEIGHT, SNAP_HALF, SNAP_FULL];
    // Bias toward the direction of velocity
    let target = currentH;
    if (Math.abs(velocityY) > 300) {
      target = velocityY < 0
        ? currentH + 150  // swiping up -> favor higher snap
        : currentH - 150; // swiping down -> favor lower snap
    }
    let best = snaps[0];
    let bestDist = Math.abs(target - best);
    for (let i = 1; i < snaps.length; i++) {
      const d = Math.abs(target - snaps[i]);
      if (d < bestDist) {
        bestDist = d;
        best = snaps[i];
      }
    }
    return best;
  };

  useEffect(() => {
    if (!hasMessages) {
      panelHeight.value = withSpring(0, SPRING_CONFIG);
      return;
    }
    panelHeight.value = withSpring(
      isOpen ? SNAP_HALF : HANDLE_HEIGHT,
      SPRING_CONFIG,
    );
  }, [isOpen, hasMessages, panelHeight]);

  useEffect(() => {
    if (messages.length > 0 && isOpen) {
      setTimeout(() => {
        listRef.current?.scrollToEnd({ animated: true });
      }, 50);
    }
  }, [messages.length, isOpen]);

  const syncOpenState = (height: number) => {
    setOpen(height > HANDLE_HEIGHT);
  };

  const panGesture = Gesture.Pan()
    .onBegin(() => {
      startHeight.value = panelHeight.value;
    })
    .onUpdate((e) => {
      // Dragging up = negative translationY = increase height
      const newH = startHeight.value - e.translationY;
      panelHeight.value = Math.max(HANDLE_HEIGHT, Math.min(SNAP_FULL, newH));
    })
    .onEnd((e) => {
      const snapped = snapToNearest(panelHeight.value, e.velocityY);
      panelHeight.value = withSpring(snapped, SPRING_CONFIG);
      runOnJS(syncOpenState)(snapped);
    });

  const tapGesture = Gesture.Tap().onEnd(() => {
    const target = panelHeight.value <= HANDLE_HEIGHT ? SNAP_HALF : HANDLE_HEIGHT;
    panelHeight.value = withSpring(target, SPRING_CONFIG);
    runOnJS(syncOpenState)(target);
  });

  const composedGesture = Gesture.Race(panGesture, tapGesture);

  const animatedStyle = useAnimatedStyle(() => ({
    height: panelHeight.value,
  }));

  const isExpanded = isOpen;

  if (!hasMessages) return null;

  return (
    <Animated.View style={[styles.container, animatedStyle]}>
      <GestureDetector gesture={composedGesture}>
        <Animated.View style={styles.handleRow}>
          <View style={styles.handleBarContainer}>
            <View style={styles.handleBar} />
          </View>
          {isExpanded && (
            <TouchableOpacity
              style={styles.newChatButton}
              onPress={() => reset()}
              hitSlop={8}
            >
              <Text style={styles.newChatText}>New chat</Text>
            </TouchableOpacity>
          )}
        </Animated.View>
      </GestureDetector>
      {isExpanded && (
        <View style={styles.chatHeader}>
          <View style={styles.chatHeaderDot} />
          <Text style={styles.chatHeaderText}>Ask your calendar</Text>
        </View>
      )}
      <View style={styles.content}>
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
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: EARTHY.white,
    borderTopLeftRadius: s(20),
    borderTopRightRadius: s(20),
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: EARTHY.sand,
    overflow: "hidden",
  },
  handleRow: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: s(36),
  },
  handleBarContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  handleBar: {
    width: s(36),
    height: s(4),
    borderRadius: s(2),
    backgroundColor: EARTHY.fog,
  },
  chatHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: s(8),
    paddingHorizontal: s(16),
    paddingBottom: s(10),
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: EARTHY.sand,
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
    marginRight: s(8),
    marginLeft: "auto" as any,
    borderRadius: s(6),
    backgroundColor: EARTHY.sandLight,
    zIndex: 1,
  },
  newChatText: {
    color: EARTHY.barkSoft,
    fontSize: fontSize(12),
    fontFamily: FONTS.bodyMedium,
  },
  content: {
    flex: 1,
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
