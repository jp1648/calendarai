import { create } from "zustand";

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
    };

interface ChatStore {
  messages: ChatMessage[];
  threadId: string | null;
  isOpen: boolean;
  streaming: boolean;
  thinking: boolean;
  addUserMessage: (text: string) => void;
  appendAgentDelta: (delta: string) => void;
  addEventCard: (event: ChatMessage & { role: "event_card" }) => void;
  setThinking: (t: boolean) => void;
  setDone: (events: any[]) => void;
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

  addUserMessage: (text) =>
    set((state) => ({
      messages: [...state.messages, { role: "user" as const, content: text }],
    })),

  appendAgentDelta: (delta) =>
    set((state) => {
      const last = state.messages[state.messages.length - 1];
      if (last?.role === "assistant") {
        return {
          messages: [
            ...state.messages.slice(0, -1),
            { ...last, content: last.content + delta },
          ],
          thinking: false,
        };
      }
      return {
        messages: [
          ...state.messages,
          { role: "assistant" as const, content: delta, streaming: true },
        ],
        isOpen: true,
        thinking: false,
      };
    }),

  addEventCard: (card) =>
    set((state) => ({
      messages: [...state.messages, card],
    })),

  setThinking: (t) => set({ thinking: t, isOpen: true }),

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
    set({ messages: [], threadId: null, isOpen: false, streaming: false, thinking: false }),

  setOpen: (open) => set({ isOpen: open }),
  setThreadId: (id) => set({ threadId: id }),
  setStreaming: (s) => set({ streaming: s }),
}));
