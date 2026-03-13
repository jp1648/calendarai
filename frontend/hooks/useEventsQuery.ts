import { useEffect, useCallback, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { supabase } from "../lib/supabase";
import { format, startOfMonth, endOfMonth, addMonths, subMonths, parseISO, isBefore, isAfter } from "../lib/dates";
import type { CalendarEvent } from "../stores/eventStore";

/**
 * Prefetch window: 3 months back, 3 months forward from today.
 * This single query is cached and all week/day views filter from it.
 */
const PREFETCH_MONTHS_BACK = 3;
const PREFETCH_MONTHS_FORWARD = 3;

function getPrefetchRange() {
  const now = new Date();
  const start = startOfMonth(subMonths(now, PREFETCH_MONTHS_BACK));
  const end = endOfMonth(addMonths(now, PREFETCH_MONTHS_FORWARD));
  return {
    start: format(start, "yyyy-MM-dd"),
    end: format(end, "yyyy-MM-dd'T'23:59:59"),
  };
}

const PREFETCH_RANGE = getPrefetchRange();

export function useEventsQuery(filterDate: Date) {
  const queryClient = useQueryClient();

  // Single cached query for the full 6-month window
  const { data: allEvents = [], isLoading: loading, refetch } = useQuery<CalendarEvent[]>({
    queryKey: ["events", PREFETCH_RANGE.start, PREFETCH_RANGE.end],
    queryFn: () => api.events.list(PREFETCH_RANGE.start, PREFETCH_RANGE.end),
    staleTime: 1000 * 60 * 10, // 10 minutes
    gcTime: 1000 * 60 * 30, // keep in cache 30 minutes
  });

  // Filter to the relevant month client-side
  const events = useMemo(() => {
    const monthStart = startOfMonth(filterDate);
    const monthEnd = endOfMonth(filterDate);
    return allEvents.filter((e) => {
      const eventDate = parseISO(e.start_time);
      return !isBefore(eventDate, monthStart) && !isAfter(eventDate, monthEnd);
    });
  }, [allEvents, filterDate]);

  // Supabase Realtime — invalidate the single cache on any change
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
