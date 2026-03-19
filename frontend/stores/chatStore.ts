import { create } from "zustand";
import { CalendarEvent } from "./eventStore";

export type ChatMessage =
  | { role: "user"; content: string }
  | { role: "assistant"; content: string; streaming?: boolean }
  | {
      role: "event_card";
      event: {
        id: string;
        title: string;
        start_time: string;
        end_time: string;
        location?: string;
      };
    }
  | { role: "error"; content: string };

interface ChatStore {
  messages: ChatMessage[];
  threadId: string | null;
  isOpen: boolean;
  streaming: boolean;
  thinking: boolean;
  statusText: string;
  addUserMessage: (text: string) => void;
  appendAgentDelta: (delta: string) => void;
  addEventCard: (event: ChatMessage & { role: "event_card" }) => void;
  setThinking: (t: boolean) => void;
  setStatusText: (text: string) => void;
  setDone: (events: CalendarEvent[]) => void;
  reset: () => void;
  setOpen: (open: boolean) => void;
  setThreadId: (id: string) => void;
  setStreaming: (s: boolean) => void;
}

export const useChatStore = create<ChatStore>((set) => ({
  messages: [],
  threadId: null,
  isOpen: false,
  streaming: false,
  thinking: false,
  statusText: "",

  addUserMessage: (text) =>
    set((state) => ({
      messages: [...state.messages, { role: "user" as const, content: text }],
    })),

  appendAgentDelta: (delta) =>
    set((state) => {
      const last = state.messages[state.messages.length - 1];
      // Only append to an existing assistant bubble if it's still streaming
      if (last?.role === "assistant" && last.streaming) {
        return {
          messages: [
            ...state.messages.slice(0, -1),
            { ...last, content: last.content + delta },
          ],
          thinking: false,
          statusText: "",
        };
      }
      // Start a new assistant bubble
      return {
        messages: [
          ...state.messages,
          { role: "assistant" as const, content: delta, streaming: true },
        ],
        isOpen: true,
        thinking: false,
        statusText: "",
      };
    }),

  addEventCard: (card) =>
    set((state) => ({
      messages: [...state.messages, card],
    })),

  setThinking: (t) => set({ thinking: t, isOpen: true, ...(t ? {} : { statusText: "" }) }),
  setStatusText: (text) => set({ statusText: text }),

  setDone: (_events) =>
    set((state) => {
      const last = state.messages[state.messages.length - 1];
      if (last?.role === "assistant") {
        return {
          messages: [
            ...state.messages.slice(0, -1),
            { ...last, streaming: false },
          ],
          streaming: false,
          thinking: false,
        };
      }
      return { streaming: false, thinking: false };
    }),

  reset: () =>
    set({ messages: [], threadId: null, isOpen: false, streaming: false, thinking: false, statusText: "" }),

  setOpen: (open) => set({ isOpen: open }),
  setThreadId: (id) => set({ threadId: id }),
  setStreaming: (s) => set({ streaming: s }),
}));
