import { useRef, useEffect } from "react";
import {
  View,
  FlatList,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Pressable,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";
import { useChatStore, type ChatMessage } from "../../stores/chatStore";
import ChatBubble from "./ChatBubble";
import { s, fontSize } from "../../lib/responsive";

const SCREEN_HEIGHT = Dimensions.get("window").height;
const HANDLE_HEIGHT = s(28);
const MAX_HEIGHT = SCREEN_HEIGHT * 0.55;
const SPRING_CONFIG = { damping: 20, stiffness: 150 };

export default function ChatPanel() {
  const messages = useChatStore((s) => s.messages);
  const isOpen = useChatStore((s) => s.isOpen);
  const setOpen = useChatStore((s) => s.setOpen);
  const reset = useChatStore((s) => s.reset);
  const thinking = useChatStore((s) => s.thinking);
  const listRef = useRef<FlatList<ChatMessage>>(null);
  const panelHeight = useSharedValue(0);
  const hasMessages = messages.length > 0;

  useEffect(() => {
    if (!hasMessages) {
      panelHeight.value = withSpring(0, SPRING_CONFIG);
      return;
    }
    panelHeight.value = withSpring(
      isOpen ? MAX_HEIGHT : HANDLE_HEIGHT,
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

  const toggleOpen = () => {
    setOpen(!isOpen);
  };

  const animatedStyle = useAnimatedStyle(() => ({
    height: panelHeight.value,
  }));

  if (!hasMessages) return null;

  return (
    <Animated.View style={[styles.container, animatedStyle]}>
      <Pressable style={styles.handleRow} onPress={toggleOpen}>
        <View style={styles.handle}>
          <View style={styles.handleBar} />
        </View>
        {isOpen && (
          <TouchableOpacity
            style={styles.newChatButton}
            onPress={(e) => {
              e.stopPropagation();
              reset();
            }}
            hitSlop={8}
          >
            <Text style={styles.newChatText}>New chat</Text>
          </TouchableOpacity>
        )}
      </Pressable>
      <View style={styles.content}>
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(_, i) => String(i)}
          renderItem={({ item }) => <ChatBubble message={item} />}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListFooterComponent={
            thinking ? (
              <View style={styles.thinkingRow}>
                <View style={styles.thinkingDot} />
                <View style={[styles.thinkingDot, styles.thinkingDot2]} />
                <View style={[styles.thinkingDot, styles.thinkingDot3]} />
              </View>
            ) : null
          }
        />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#FAFAFA",
    borderTopLeftRadius: s(20),
    borderTopRightRadius: s(20),
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#E5E7EB",
    overflow: "hidden",
  },
  handleRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  handle: {
    flex: 1,
    alignItems: "center",
    paddingTop: s(8),
    paddingBottom: s(4),
  },
  handleBar: {
    width: s(36),
    height: s(4),
    borderRadius: s(2),
    backgroundColor: "#D1D5DB",
  },
  newChatButton: {
    paddingHorizontal: s(10),
    paddingVertical: s(4),
    marginRight: s(8),
    borderRadius: s(6),
    backgroundColor: "#F3F4F6",
  },
  newChatText: {
    color: "#6B7280",
    fontSize: fontSize(12),
    fontWeight: "600",
  },
  content: {
    flex: 1,
  },
  list: {
    paddingHorizontal: s(10),
    paddingBottom: s(6),
  },
  thinkingRow: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingHorizontal: s(14),
    paddingVertical: s(10),
    marginVertical: s(2),
    backgroundColor: "#F3F4F6",
    borderRadius: s(18),
    gap: s(4),
  },
  thinkingDot: {
    width: s(6),
    height: s(6),
    borderRadius: s(3),
    backgroundColor: "#9CA3AF",
    opacity: 0.6,
  },
  thinkingDot2: {
    opacity: 0.4,
  },
  thinkingDot3: {
    opacity: 0.2,
  },
});
