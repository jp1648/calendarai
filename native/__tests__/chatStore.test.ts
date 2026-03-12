/**
 * Tests for the chat store.
 */
import { useChatStore } from "../stores/chatStore";

beforeEach(() => {
  useChatStore.setState({
    messages: [],
    threadId: null,
    isOpen: false,
    streaming: false,
    thinking: false,
    statusText: "",
  });
});

describe("chatStore", () => {
  describe("addUserMessage", () => {
    it("adds a user message", () => {
      useChatStore.getState().addUserMessage("Hello");
      const msgs = useChatStore.getState().messages;
      expect(msgs).toHaveLength(1);
      expect(msgs[0]).toEqual({ role: "user", content: "Hello" });
    });

    it("appends multiple messages", () => {
      useChatStore.getState().addUserMessage("First");
      useChatStore.getState().addUserMessage("Second");
      expect(useChatStore.getState().messages).toHaveLength(2);
    });
  });

  describe("appendAgentDelta", () => {
    it("creates a new assistant message if none streaming", () => {
      useChatStore.getState().appendAgentDelta("Hi");
      const msgs = useChatStore.getState().messages;
      expect(msgs).toHaveLength(1);
      expect(msgs[0]).toEqual({ role: "assistant", content: "Hi", streaming: true });
    });

    it("appends to existing streaming message", () => {
      useChatStore.getState().appendAgentDelta("Hi");
      useChatStore.getState().appendAgentDelta(" there");
      const msgs = useChatStore.getState().messages;
      expect(msgs).toHaveLength(1);
      expect(msgs[0]).toEqual({ role: "assistant", content: "Hi there", streaming: true });
    });

    it("sets isOpen to true", () => {
      useChatStore.getState().appendAgentDelta("Hi");
      expect(useChatStore.getState().isOpen).toBe(true);
    });

    it("clears thinking state", () => {
      useChatStore.setState({ thinking: true });
      useChatStore.getState().appendAgentDelta("Response");
      expect(useChatStore.getState().thinking).toBe(false);
    });
  });

  describe("setDone", () => {
    it("marks streaming message as done", () => {
      useChatStore.getState().appendAgentDelta("Complete response");
      useChatStore.getState().setDone([]);
      const msgs = useChatStore.getState().messages;
      expect(msgs[0]).toMatchObject({ role: "assistant", streaming: false });
    });

    it("sets streaming to false", () => {
      useChatStore.setState({ streaming: true });
      useChatStore.getState().setDone([]);
      expect(useChatStore.getState().streaming).toBe(false);
    });
  });

  describe("addEventCard", () => {
    it("adds an event card message", () => {
      useChatStore.getState().addEventCard({
        role: "event_card",
        event: {
          id: "e1",
          title: "Lunch",
          start_time: "2026-03-10T12:00:00",
          end_time: "2026-03-10T13:00:00",
        },
      });
      const msgs = useChatStore.getState().messages;
      expect(msgs).toHaveLength(1);
      expect(msgs[0].role).toBe("event_card");
    });
  });

  describe("reset", () => {
    it("clears all state", () => {
      useChatStore.getState().addUserMessage("Test");
      useChatStore.setState({ threadId: "t1", isOpen: true, streaming: true, thinking: true });
      useChatStore.getState().reset();

      const state = useChatStore.getState();
      expect(state.messages).toHaveLength(0);
      expect(state.threadId).toBeNull();
      expect(state.isOpen).toBe(false);
      expect(state.streaming).toBe(false);
      expect(state.thinking).toBe(false);
    });
  });

  describe("setThinking", () => {
    it("sets thinking and opens panel", () => {
      useChatStore.getState().setThinking(true);
      expect(useChatStore.getState().thinking).toBe(true);
      expect(useChatStore.getState().isOpen).toBe(true);
    });
  });

  describe("setStatusText", () => {
    it("updates status text", () => {
      useChatStore.getState().setStatusText("Searching...");
      expect(useChatStore.getState().statusText).toBe("Searching...");
    });
  });
});
