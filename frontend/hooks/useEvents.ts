import { useEffect, useCallback } from "react";
import { useEventStore, CalendarEvent } from "../stores/eventStore";
import { supabase } from "../lib/supabase";
import { startOfMonth, endOfMonth, format } from "../lib/dates";

export function useEvents(currentMonth: Date) {
  const { events, loading, fetchEvents, addEvent, removeEvent, updateEvent } =
    useEventStore();

  const start = format(startOfMonth(currentMonth), "yyyy-MM-dd");
  const end = format(endOfMonth(currentMonth), "yyyy-MM-dd'T'23:59:59");

  const refresh = useCallback(() => {
    fetchEvents(start, end);
  }, [start, end]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Supabase Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel("events-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "events" },
        (payload) => {
          addEvent(payload.new as CalendarEvent);
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "events" },
        (payload) => {
          updateEvent(payload.new as CalendarEvent);
        }
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "events" },
        (payload) => {
          removeEvent(payload.old.id);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return { events, loading, refresh };
}
