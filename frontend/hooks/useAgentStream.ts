import { useCallback } from "react";
import { useChatStore } from "../stores/chatStore";
import { supabase } from "../lib/supabase";

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

async function getAuthHeaders(): Promise<Record<string, string>> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error("Not authenticated");
  return {
    Authorization: `Bearer ${session.access_token}`,
    "Content-Type": "application/json",
  };
}

export interface StreamResult {
  eventsCreated: any[];
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
  handler: (event: string, data: any) => void,
): string {
  const lines = buffer.split("\n");
  const remaining = lines.pop()!; // last incomplete line

  for (const line of lines) {
    if (line.startsWith("event: ")) {
      currentEvent.value = line.slice(7).trim();
    } else if (line.startsWith("data: ")) {
      const raw = line.slice(6);
      let data: any;
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

export function useAgentStream() {
  const store = useChatStore();

  const sendMessage = useCallback(
    async (
      input: string,
      location?: { latitude: number; longitude: number; displayName: string } | null,
    ): Promise<StreamResult | null> => {
      const threadId = useChatStore.getState().threadId;
      store.setStreaming(true);
      store.addUserMessage(input);
      store.setThinking(true);

      let eventsCreated: any[] = [];
      let runId: string | null = null;
      let hadToolCalls = false;

      try {
        const headers = await getAuthHeaders();
        const body: Record<string, any> = {
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

          const handleEvent = (eventName: string, data: any) => {
            switch (eventName) {
              case "thread":
                store.setThreadId(data.thread_id);
                break;
              case "text_delta":
                store.setStatusText("");
                store.appendAgentDelta(data.delta);
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
                store.setThinking(true);
                store.setStatusText(
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
                  store.addEventCard({
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
                store.setDone(eventsCreated);
                break;
              case "error":
                store.appendAgentDelta(data.error || "Something went wrong");
                store.setStreaming(false);
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
            store.setStreaming(false);
            resolve();
          };

          xhr.onerror = () => {
            store.appendAgentDelta("Connection error");
            store.setStreaming(false);
            reject(new Error("XHR failed"));
          };

          xhr.ontimeout = () => {
            store.appendAgentDelta("Request timed out");
            store.setStreaming(false);
            reject(new Error("XHR timeout"));
          };

          xhr.timeout = 120000; // 2 min timeout for long agent runs
          xhr.send(JSON.stringify(body));
        });

        return { eventsCreated, runId, hadToolCalls };
      } catch (e: any) {
        if (!e.message?.includes("XHR")) {
          store.appendAgentDelta(e.message || "Connection error");
          store.setStreaming(false);
        }
        return null;
      }
    },
    [store]
  );

  const reset = useCallback(() => {
    store.reset();
  }, [store]);

  return { sendMessage, reset };
}
