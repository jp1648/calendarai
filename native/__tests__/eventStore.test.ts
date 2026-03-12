/**
 * Tests for the Zustand event store.
 */
import { useEventStore, CalendarEvent } from "../stores/eventStore";

jest.mock("../lib/api", () => ({
  api: {
    events: {
      list: jest.fn(),
      get: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  },
}));

const { api } = require("../lib/api");

function makeEvent(overrides: Partial<CalendarEvent> = {}): CalendarEvent {
  return {
    id: "evt-001",
    user_id: "user-123",
    title: "Lunch",
    description: "",
    location: "",
    start_time: "2026-03-10T12:00:00",
    end_time: "2026-03-10T13:00:00",
    all_day: false,
    source: "manual",
    source_ref: null,
    confidence: 1.0,
    undo_available: false,
    undo_expires_at: null,
    metadata: null,
    created_at: "2026-03-06T00:00:00Z",
    ...overrides,
  };
}

beforeEach(() => {
  useEventStore.setState({
    events: [],
    loading: false,
    error: null,
    currentRange: null,
  });
  jest.clearAllMocks();
});

describe("eventStore", () => {
  describe("addEvent", () => {
    it("adds an event to the list", () => {
      const event = makeEvent();
      useEventStore.getState().addEvent(event);
      expect(useEventStore.getState().events).toHaveLength(1);
      expect(useEventStore.getState().events[0].id).toBe("evt-001");
    });

    it("deduplicates by id", () => {
      const event = makeEvent();
      useEventStore.getState().addEvent(event);
      useEventStore.getState().addEvent(event);
      expect(useEventStore.getState().events).toHaveLength(1);
    });

    it("rejects events outside current range", () => {
      useEventStore.setState({
        currentRange: {
          start: new Date("2026-03-01"),
          end: new Date("2026-03-31T23:59:59"),
        },
      });
      const event = makeEvent({ start_time: "2026-07-10T12:00:00" });
      useEventStore.getState().addEvent(event);
      expect(useEventStore.getState().events).toHaveLength(0);
    });

    it("accepts events within current range", () => {
      useEventStore.setState({
        currentRange: {
          start: new Date("2026-03-01"),
          end: new Date("2026-03-31T23:59:59"),
        },
      });
      const event = makeEvent({ start_time: "2026-03-15T12:00:00" });
      useEventStore.getState().addEvent(event);
      expect(useEventStore.getState().events).toHaveLength(1);
    });

    it("accepts any event when no range is set", () => {
      const event = makeEvent({ start_time: "2026-12-25T12:00:00" });
      useEventStore.getState().addEvent(event);
      expect(useEventStore.getState().events).toHaveLength(1);
    });

    it("accepts event at range boundary (start)", () => {
      useEventStore.setState({
        currentRange: {
          start: new Date("2026-03-01T00:00:00"),
          end: new Date("2026-03-31T23:59:59"),
        },
      });
      const event = makeEvent({ start_time: "2026-03-01T00:00:00" });
      useEventStore.getState().addEvent(event);
      expect(useEventStore.getState().events).toHaveLength(1);
    });

    it("accepts event at range boundary (end)", () => {
      useEventStore.setState({
        currentRange: {
          start: new Date("2026-03-01T00:00:00"),
          end: new Date("2026-03-31T23:59:59"),
        },
      });
      const event = makeEvent({ start_time: "2026-03-31T23:00:00" });
      useEventStore.getState().addEvent(event);
      expect(useEventStore.getState().events).toHaveLength(1);
    });
  });

  describe("removeEvent", () => {
    it("removes an event by id", () => {
      useEventStore.setState({ events: [makeEvent()] });
      useEventStore.getState().removeEvent("evt-001");
      expect(useEventStore.getState().events).toHaveLength(0);
    });

    it("no-op for non-existent id", () => {
      useEventStore.setState({ events: [makeEvent()] });
      useEventStore.getState().removeEvent("nonexistent");
      expect(useEventStore.getState().events).toHaveLength(1);
    });
  });

  describe("updateEvent", () => {
    it("updates matching event in place", () => {
      useEventStore.setState({ events: [makeEvent()] });
      const updated = makeEvent({ title: "Updated Lunch" });
      useEventStore.getState().updateEvent(updated);
      expect(useEventStore.getState().events[0].title).toBe("Updated Lunch");
    });

    it("preserves other events", () => {
      useEventStore.setState({
        events: [makeEvent(), makeEvent({ id: "evt-002", title: "Dinner" })],
      });
      useEventStore.getState().updateEvent(makeEvent({ title: "Brunch" }));
      expect(useEventStore.getState().events[0].title).toBe("Brunch");
      expect(useEventStore.getState().events[1].title).toBe("Dinner");
    });

    it("no-op for non-existent id", () => {
      useEventStore.setState({ events: [makeEvent()] });
      useEventStore.getState().updateEvent(makeEvent({ id: "nope", title: "X" }));
      expect(useEventStore.getState().events[0].title).toBe("Lunch");
    });
  });

  describe("fetchEvents", () => {
    it("sets loading, fetches, and stores events", async () => {
      const events = [makeEvent()];
      api.events.list.mockResolvedValue(events);

      await useEventStore.getState().fetchEvents("2026-03-01", "2026-03-31");

      expect(api.events.list).toHaveBeenCalledWith("2026-03-01", "2026-03-31");
      expect(useEventStore.getState().events).toEqual(events);
      expect(useEventStore.getState().loading).toBe(false);
    });

    it("sets currentRange when dates provided", async () => {
      api.events.list.mockResolvedValue([]);
      await useEventStore.getState().fetchEvents("2026-03-01", "2026-03-31T23:59:59");
      const range = useEventStore.getState().currentRange;
      expect(range).not.toBeNull();
      expect(range!.start.getMonth()).toBe(2);
    });

    it("handles API errors", async () => {
      api.events.list.mockRejectedValue(new Error("Network error"));
      await useEventStore.getState().fetchEvents();
      expect(useEventStore.getState().error).toBe("Network error");
      expect(useEventStore.getState().loading).toBe(false);
    });

    it("clears currentRange when no dates provided", async () => {
      useEventStore.setState({
        currentRange: { start: new Date(), end: new Date() },
      });
      api.events.list.mockResolvedValue([]);
      await useEventStore.getState().fetchEvents();
      expect(useEventStore.getState().currentRange).toBeNull();
    });
  });
});
