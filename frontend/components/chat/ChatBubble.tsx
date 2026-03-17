import { View, Text, StyleSheet, Linking, TouchableOpacity } from "react-native";
import type { ChatMessage } from "../../stores/chatStore";
import { formatTime } from "../../lib/dates";
import { s, fontSize as fs } from "../../lib/responsive";
import { EARTHY, ACCENT, FONTS } from "../../lib/theme";

const URL_TEST = /^https?:\/\/[^\s,)]+$/;

function RichText({
  children,
  style,
  streaming,
}: {
  children: string;
  style: object;
  streaming?: boolean;
}) {
  const boldParts = children.split(/\*\*(.*?)\*\*/g);

  const renderSegment = (text: string, bold: boolean, keyPrefix: string) => {
    const urlSplitRegex = /(https?:\/\/[^\s,)]+)/g;
    const urlParts = text.split(urlSplitRegex);
    return urlParts.map((part, j) => {
      if (URL_TEST.test(part)) {
        return (
          <Text
            key={`${keyPrefix}-${j}`}
            style={[bold && styles.bold, styles.link]}
            onPress={() => Linking.openURL(part)}
          >
            {part}
          </Text>
        );
      }
      return bold ? (
        <Text key={`${keyPrefix}-${j}`} style={styles.bold}>
          {part}
        </Text>
      ) : (
        part
      );
    });
  };

  return (
    <Text style={style}>
      {boldParts.map((part, i) =>
        renderSegment(part, i % 2 === 1, `p${i}`),
      )}
      {streaming && <Text style={styles.cursor}>|</Text>}
    </Text>
  );
}

function EventCardBubble({
  event,
}: {
  event: { id: string; title: string; start_time: string; end_time: string; location?: string };
}) {
  return (
    <View style={styles.eventCard}>
      <View style={styles.eventAccent} />
      <View style={styles.eventBody}>
        <Text style={styles.eventCheck}>{"\u2713"}</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.eventTitle}>{event.title}</Text>
          <Text style={styles.eventTime}>
            {formatTime(event.start_time)} – {formatTime(event.end_time)}
          </Text>
          {event.location ? (
            <Text style={styles.eventLocation} numberOfLines={1}>
              {event.location}
            </Text>
          ) : null}
        </View>
      </View>
    </View>
  );
}

export default function ChatBubble({ message, onRetry }: { message: ChatMessage; onRetry?: () => void }) {
  if (message.role === "user") {
    return (
      <View style={[styles.bubble, styles.userBubble]}>
        <Text style={styles.userText}>{message.content}</Text>
      </View>
    );
  }

  if (message.role === "assistant") {
    return (
      <View style={[styles.bubble, styles.assistantBubble]}>
        <View style={styles.aiDot} />
        <RichText style={styles.assistantText} streaming={message.streaming}>
          {message.content}
        </RichText>
      </View>
    );
  }

  if (message.role === "event_card") {
    return <EventCardBubble event={message.event} />;
  }

  if (message.role === "error") {
    return (
      <View style={[styles.bubble, styles.errorBubble]}>
        <Text style={styles.errorText}>{message.content}</Text>
        {onRetry && (
          <TouchableOpacity onPress={onRetry} style={styles.retryButton} activeOpacity={0.7}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  bubble: {
    maxWidth: "82%" as any,
    paddingHorizontal: s(10),
    paddingVertical: s(7),
    borderRadius: s(16),
    marginVertical: s(2),
  },
  userBubble: {
    alignSelf: "flex-end",
    backgroundColor: ACCENT,
  },
  assistantBubble: {
    alignSelf: "flex-start",
    backgroundColor: EARTHY.sandLight,
    flexDirection: "row",
    gap: s(8),
    alignItems: "flex-start",
  },
  aiDot: {
    width: s(6),
    height: s(6),
    borderRadius: s(3),
    backgroundColor: "#3A7D6E",
    marginTop: s(6),
    flexShrink: 0,
  },
  userText: {
    color: EARTHY.white,
    fontSize: fs(13),
    lineHeight: fs(18),
    fontFamily: FONTS.body,
  },
  assistantText: {
    color: EARTHY.bark,
    fontSize: fs(13),
    lineHeight: fs(18),
    fontFamily: FONTS.bodyLight,
    flex: 1,
  },
  bold: {
    fontFamily: FONTS.bodyMedium,
  },
  link: {
    color: ACCENT,
    textDecorationLine: "underline",
  },
  cursor: {
    color: ACCENT,
    fontWeight: "300",
  },
  eventCard: {
    alignSelf: "flex-start",
    maxWidth: "82%" as any,
    flexDirection: "row",
    backgroundColor: "rgba(91,129,153,0.12)",
    borderRadius: s(12),
    marginVertical: s(3),
    overflow: "hidden",
  },
  eventAccent: {
    width: s(3),
    backgroundColor: "#5B8199",
  },
  eventBody: {
    flex: 1,
    flexDirection: "row",
    alignItems: "flex-start",
    paddingHorizontal: s(8),
    paddingVertical: s(6),
    gap: s(5),
  },
  eventCheck: {
    color: "#3D6478",
    fontSize: fs(12),
    fontFamily: FONTS.bodyMedium,
    marginTop: 1,
  },
  eventTitle: {
    fontSize: fs(13),
    fontFamily: FONTS.bodyMedium,
    color: EARTHY.bark,
  },
  eventTime: {
    fontSize: fs(11),
    color: EARTHY.barkSoft,
    fontFamily: FONTS.bodyLight,
    marginTop: s(1),
  },
  eventLocation: {
    fontSize: fs(11),
    color: EARTHY.stone,
    fontFamily: FONTS.bodyLight,
    marginTop: s(1),
  },
  errorBubble: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(140,70,70,0.08)",
    borderWidth: 1,
    borderColor: "#8C4646",
  },
  errorText: {
    color: "#7A3D3D",
    fontSize: fs(13),
    lineHeight: fs(18),
    fontFamily: FONTS.body,
  },
  retryButton: {
    marginTop: s(6),
    alignSelf: "flex-start",
  },
  retryText: {
    color: "#7A3D3D",
    fontSize: fs(13),
    fontFamily: FONTS.bodyMedium,
    textDecorationLine: "underline",
  },
});
