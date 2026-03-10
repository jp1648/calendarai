import { View, Text, StyleSheet, Linking } from "react-native";
import type { ChatMessage } from "../../stores/chatStore";
import { formatTime } from "../../lib/dates";
import { s, fontSize as fs } from "../../lib/responsive";

const URL_REGEX = /(https?:\/\/[^\s,)]+)/g;

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
    const urlParts = text.split(URL_REGEX);
    return urlParts.map((part, j) => {
      if (URL_REGEX.test(part)) {
        URL_REGEX.lastIndex = 0;
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
        <Text style={styles.eventCheck}>✓</Text>
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

export default function ChatBubble({ message }: { message: ChatMessage }) {
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
        <RichText style={styles.assistantText} streaming={message.streaming}>
          {message.content}
        </RichText>
      </View>
    );
  }

  if (message.role === "event_card") {
    return <EventCardBubble event={message.event} />;
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
    backgroundColor: "#1A1A1A",
  },
  assistantBubble: {
    alignSelf: "flex-start",
    backgroundColor: "#F3F4F6",
  },
  userText: {
    color: "#fff",
    fontSize: fs(13),
    lineHeight: fs(18),
  },
  assistantText: {
    color: "#1A1A1A",
    fontSize: fs(13),
    lineHeight: fs(18),
  },
  bold: {
    fontWeight: "700",
  },
  link: {
    color: "#6366F1",
    textDecorationLine: "underline",
  },
  cursor: {
    color: "#6366F1",
    fontWeight: "300",
  },
  eventCard: {
    alignSelf: "flex-start",
    maxWidth: "82%" as any,
    flexDirection: "row",
    backgroundColor: "#F0FDF4",
    borderRadius: s(12),
    marginVertical: s(3),
    overflow: "hidden",
  },
  eventAccent: {
    width: s(3),
    backgroundColor: "#22C55E",
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
    color: "#22C55E",
    fontSize: fs(12),
    fontWeight: "700",
    marginTop: 1,
  },
  eventTitle: {
    fontSize: fs(13),
    fontWeight: "600",
    color: "#1A1A1A",
  },
  eventTime: {
    fontSize: fs(11),
    color: "#6B7280",
    marginTop: s(1),
  },
  eventLocation: {
    fontSize: fs(11),
    color: "#9CA3AF",
    marginTop: s(1),
  },
});
