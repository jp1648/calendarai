import { useEffect, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { supabase } from "../lib/supabase";
import { startOfMonth, endOfMonth, format } from "../lib/dates";
import type { CalendarEvent } from "../stores/eventStore";

export function useEventsQuery(currentMonth: Date) {
  const queryClient = useQueryClient();
  const start = format(startOfMonth(currentMonth), "yyyy-MM-dd");
  const end = format(endOfMonth(currentMonth), "yyyy-MM-dd'T'23:59:59");

  const { data: events = [], isLoading: loading, refetch } = useQuery<CalendarEvent[]>({
    queryKey: ["events", start, end],
    queryFn: () => api.events.list(start, end),
    staleTime: 1000 * 60 * 5,
  });

  // Supabase Realtime — invalidate query cache on changes
  useEffect(() => {
    const channel = supabase
      .channel("events-realtime-query")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "events" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["events"] });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const refresh = useCallback(() => {
    refetch();
  }, [refetch]);

  return { events, loading, refresh };
}
