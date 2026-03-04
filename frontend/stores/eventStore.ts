import { create } from "zustand";
import { api } from "../lib/api";

export interface CalendarEvent {
  id: string;
  user_id: string;
  title: string;
  description: string;
  location: string;
  start_time: string;
  end_time: string;
  all_day: boolean;
  source: "manual" | "email_agent" | "schedule_agent";
  source_ref: string | null;
  confidence: number;
  undo_available: boolean;
  undo_expires_at: string | null;
  metadata: any;
  created_at: string;
}

interface EventStore {
  events: CalendarEvent[];
  loading: boolean;
  error: string | null;
  fetchEvents: (start?: string, end?: string) => Promise<void>;
  addEvent: (event: CalendarEvent) => void;
  removeEvent: (id: string) => void;
  updateEvent: (event: CalendarEvent) => void;
}

export const useEventStore = create<EventStore>((set, get) => ({
  events: [],
  loading: false,
  error: null,

  fetchEvents: async (start?: string, end?: string) => {
    set({ loading: true, error: null });
    try {
      const events = await api.events.list(start, end);
      set({ events, loading: false });
    } catch (e: any) {
      set({ error: e.message, loading: false });
    }
  },

  addEvent: (event) => {
    set((state) => {
      if (state.events.find((e) => e.id === event.id)) return state;
      return { events: [...state.events, event] };
    });
  },

  removeEvent: (id) => {
    set((state) => ({
      events: state.events.filter((e) => e.id !== id),
    }));
  },

  updateEvent: (event) => {
    set((state) => ({
      events: state.events.map((e) => (e.id === event.id ? event : e)),
    }));
  },
}));
