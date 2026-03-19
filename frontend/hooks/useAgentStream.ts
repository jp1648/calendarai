import { useCallback, useRef } from "react";
import { useChatStore } from "../stores/chatStore";
import { getAuthHeaders } from "../lib/api";
import { CalendarEvent } from "../stores/eventStore";

const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:8000";

const TOOL_STATUS: Record<string, string> = {
  // Calendar
  create_event: "Creating event",
  list_events: "Checking your calendar",
  delete_event: "Removing event",
  update_event: "Updating event",
  // Gmail
  search_gmail: "Searching your email",
  get_email_content: "Reading email",
  // Web / search
  web_search: "Searching the web",
  // Browser
  browser_navigate: "Opening website",
  browser_act: "Interacting with page",
  browser_extract: "Reading page content",
  browser_observe: "Looking at page",
  // Booking
  create_booking_event: "Creating booking",
  mindbody_search_studios: "Finding studios",
  mindbody_get_classes: "Loading classes",
  mindbody_book_class: "Booking class",
  // Social
  send_booking_invite: "Sending invite",
};

export interface StreamResult {
  eventsCreated: CalendarEvent[];
  runId: string | null;
  hadToolCalls: boolean;
}

/**
 * Parse SSE lines from a raw text chunk.
 * Returns remaining unparsed buffer.
 */
function processSSEBuffer(
  buffer: string,
  currentEvent: { value: string },
  handler: (event: string, data: Record<string, unknown>) => void,
): string {
  const lines = buffer.split("\n");
  const remaining = lines.pop()!; // last incomplete line

  for (const line of lines) {
    if (line.startsWith("event: ")) {
      currentEvent.value = line.slice(7).trim();
    } else if (line.startsWith("data: ")) {
      const raw = line.slice(6);
      let data: Record<string, unknown>;
      try {
        data = JSON.parse(raw);
      } catch {
        continue;
      }
      handler(currentEvent.value, data);
      currentEvent.value = "";
    }
  }

  return remaining;
}

function finalizeStreamingBubble() {
  const state = useChatStore.getState();
  const lastMsg = state.messages[state.messages.length - 1];
  if (lastMsg?.role === "assistant" && lastMsg.streaming) {
    useChatStore.setState({
      messages: [
        ...state.messages.slice(0, -1),
        { ...lastMsg, streaming: false },
      ],
    });
  }
}

export function useAgentStream() {
  const xhrRef = useRef<XMLHttpRequest | null>(null);
  const abortedRef = useRef(false);

  const abort = useCallback(() => {
    abortedRef.current = true;
    if (xhrRef.current) {
      xhrRef.current.abort();
      xhrRef.current = null;
    }
    finalizeStreamingBubble();
    useChatStore.getState().setStreaming(false);
    useChatStore.getState().setThinking(false);
    useChatStore.getState().setStatusText("");
  }, []);

  const sendMessage = useCallback(
    async (
      input: string,
      location?: { latitude: number; longitude: number; displayName: string } | null,
    ): Promise<StreamResult | null> => {
      const threadId = useChatStore.getState().threadId;
      abortedRef.current = false;
      useChatStore.getState().setStreaming(true);
      useChatStore.getState().addUserMessage(input);
      useChatStore.getState().setThinking(true);

      let eventsCreated: CalendarEvent[] = [];
      let runId: string | null = null;
      let hadToolCalls = false;

      try {
        const headers = await getAuthHeaders();
        const body: Record<string, unknown> = {
          input,
          thread_id: threadId,
        };
        if (location) {
          body.location = location.displayName;
          body.latitude = location.latitude;
          body.longitude = location.longitude;
        }

        // Use XHR instead of fetch for true streaming on iOS Safari
        await new Promise<void>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open("POST", `${API_URL}/api/agents/schedule/stream`);

          for (const [key, val] of Object.entries(headers)) {
            xhr.setRequestHeader(key, val);
          }

          let buffer = "";
          let lastProcessed = 0;
          const currentEvent = { value: "" };

          const handleEvent = (eventName: string, data: Record<string, unknown>) => {
            switch (eventName) {
              case "thread":
                useChatStore.getState().setThreadId(data.thread_id);
                break;
              case "text_delta":
                useChatStore.getState().setStatusText("");
                useChatStore.getState().appendAgentDelta(data.delta);
                break;
              case "tool_call": {
                hadToolCalls = true;
                // Finalize current assistant bubble so cursor disappears
                const state = useChatStore.getState();
                const lastMsg = state.messages[state.messages.length - 1];
                if (lastMsg?.role === "assistant" && lastMsg.streaming) {
                  useChatStore.setState({
                    messages: [
                      ...state.messages.slice(0, -1),
                      { ...lastMsg, streaming: false },
                    ],
                  });
                }
                useChatStore.getState().setThinking(true);
                useChatStore.getState().setStatusText(
                  TOOL_STATUS[data.tool] || data.tool.replace(/_/g, " ")
                );
                break;
              }
              case "tool_result":
                break;
              case "done":
                eventsCreated = data.events_created || [];
                runId = data.run_id || null;
                for (const ev of eventsCreated) {
                  useChatStore.getState().addEventCard({
                    role: "event_card",
                    event: {
                      id: ev.id,
                      title: ev.title,
                      start_time: ev.start_time,
                      end_time: ev.end_time,
                      location: ev.location,
                    },
                  });
                }
                useChatStore.getState().setDone(eventsCreated);
                break;
              case "error":
                finalizeStreamingBubble();
                useChatStore.setState((state) => ({
                  messages: [...state.messages, { role: "error" as const, content: data.error || "Something went wrong" }],
                }));
                useChatStore.getState().setStreaming(false);
                resolve();
                break;
            }
          };

          xhr.onprogress = () => {
            const newText = xhr.responseText.slice(lastProcessed);
            lastProcessed = xhr.responseText.length;
            buffer += newText;
            buffer = processSSEBuffer(buffer, currentEvent, handleEvent);
          };

          xhr.onload = () => {
            // Process any remaining buffer
            if (buffer.length > 0) {
              processSSEBuffer(buffer + "\n", currentEvent, handleEvent);
            }
            xhrRef.current = null;
            useChatStore.getState().setStreaming(false);
            resolve();
          };

          xhr.onabort = () => {
            // Intentional abort — cleanup already handled by abort()
            xhrRef.current = null;
            resolve();
          };

          xhr.onerror = () => {
            if (abortedRef.current) return; // Don't show error on intentional abort
            finalizeStreamingBubble();
            useChatStore.setState((state) => ({
              messages: [...state.messages, { role: "error" as const, content: "Connection error" }],
            }));
            useChatStore.getState().setStreaming(false);
            resolve();
          };

          xhr.ontimeout = () => {
            finalizeStreamingBubble();
            useChatStore.setState((state) => ({
              messages: [...state.messages, { role: "error" as const, content: "Request timed out" }],
            }));
            useChatStore.getState().setStreaming(false);
            resolve();
          };

          xhr.timeout = 120000; // 2 min timeout for long agent runs
          xhrRef.current = xhr; // Set ref BEFORE send so abort() can always find it
          xhr.send(JSON.stringify(body));
        });

        return { eventsCreated, runId, hadToolCalls };
      } catch (e: unknown) {
        finalizeStreamingBubble();
        const message = e instanceof Error ? e.message : "Connection error";
        useChatStore.setState((state) => ({
          messages: [...state.messages, { role: "error" as const, content: message }],
        }));
        useChatStore.getState().setStreaming(false);
        return null;
      }
    },
    []
  );

  const reset = useCallback(() => {
    useChatStore.getState().reset();
  }, []);

  return { sendMessage, reset, abort };
}
