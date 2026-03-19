import { supabase } from "./supabase";
import { CalendarEvent } from "../stores/eventStore";

const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:8000";

export class ApiError extends Error {
  status: number;
  constructor(status: number, body: string) {
    super(`API error ${status}: ${body}`);
    this.name = "ApiError";
    this.status = status;
  }
}

export async function getAuthHeaders(): Promise<Record<string, string>> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error("Not authenticated");
  const headers: Record<string, string> = {
    Authorization: `Bearer ${session.access_token}`,
    "Content-Type": "application/json",
  };
  if (__DEV__) {
    headers["ngrok-skip-browser-warning"] = "1";
  }
  return headers;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: { ...headers, ...options.headers },
  });
  if (!res.ok) {
    const body = await res.text();
    if (res.status === 401 && !path.startsWith("/api/resy")) {
      setTimeout(() => supabase.auth.signOut(), 0);
    }
    throw new ApiError(res.status, body);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export interface CreateEventInput {
  title: string;
  description?: string;
  location?: string;
  start_time: string;
  end_time: string;
  all_day?: boolean;
  source?: string;
  source_ref?: string;
  metadata?: Record<string, unknown>;
}

export interface UpdateEventInput {
  title?: string;
  description?: string;
  location?: string;
  start_time?: string;
  end_time?: string;
  all_day?: boolean;
}

export interface AgentResponse {
  run_id: string;
  agent_name: string;
  status: string;
  message: string;
  events_created: CalendarEvent[];
  tokens_used: number | null;
  model_used: string;
}

export interface Profile {
  full_name: string;
  phone: string;
  timezone: string;
  default_location: string;
  email: string;
  gmail_connected: boolean;
  resy_connected: boolean;
  ical_feed_token: string;
  onboarding_completed: boolean;
}

export const api = {
  events: {
    list: (start?: string, end?: string) => {
      const params = new URLSearchParams();
      if (start) params.set("start", start);
      if (end) params.set("end", end);
      const qs = params.toString();
      return request<CalendarEvent[]>(`/api/events${qs ? `?${qs}` : ""}`);
    },
    get: (id: string) => request<CalendarEvent>(`/api/events/${id}`),
    create: (data: CreateEventInput) =>
      request<CalendarEvent>("/api/events", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    update: (id: string, data: UpdateEventInput) =>
      request<CalendarEvent>(`/api/events/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
    delete: (id: string) =>
      request<void>(`/api/events/${id}`, { method: "DELETE" }),
  },
  agents: {
    run: (agent_name: string, input: string) =>
      request<AgentResponse>("/api/agents/run", {
        method: "POST",
        body: JSON.stringify({ agent_name, input }),
      }),
    schedule: (input: string) =>
      request<AgentResponse>("/api/agents/schedule", {
        method: "POST",
        body: JSON.stringify({ input }),
      }),
    available: () => request<{ name: string; model: string; tools: string[] }[]>("/api/agents/available"),
  },
  gmail: {
    getAuthUrl: () => request<{ url: string }>("/api/gmail/auth-url"),
  },
  googleCalendar: {
    calendars: () =>
      request<
        { id: string; summary: string; primary: boolean; backgroundColor: string }[]
      >("/api/google-calendar/calendars"),
    events: (calendarId?: string, start?: string, end?: string) => {
      const params = new URLSearchParams();
      if (calendarId) params.set("calendar_id", calendarId);
      if (start) params.set("start", start);
      if (end) params.set("end", end);
      const qs = params.toString();
      return request<CalendarEvent[]>(`/api/google-calendar/events${qs ? `?${qs}` : ""}`);
    },
    sync: (calendarId?: string, daysBack?: number, daysForward?: number) =>
      request<{ created: number; updated: number; skipped: number }>(
        "/api/google-calendar/sync",
        {
          method: "POST",
          body: JSON.stringify({
            calendar_id: calendarId || "primary",
            days_back: daysBack ?? 30,
            days_forward: daysForward ?? 90,
          }),
        }
      ),
    pushEvent: (eventId: string, calendarId?: string) => {
      const params = new URLSearchParams();
      if (calendarId) params.set("calendar_id", calendarId);
      const qs = params.toString();
      return request<{ status: string; gcal_event_id: string }>(
        `/api/google-calendar/push/${eventId}${qs ? `?${qs}` : ""}`,
        { method: "POST" }
      );
    },
    pushAll: (calendarId?: string) => {
      const params = new URLSearchParams();
      if (calendarId) params.set("calendar_id", calendarId);
      const qs = params.toString();
      return request<{ pushed: number; skipped: number }>(
        `/api/google-calendar/push-all${qs ? `?${qs}` : ""}`,
        { method: "POST" }
      );
    },
  },
  resy: {
    connect: (email: string, password: string) =>
      request<{ status: string }>("/api/resy/connect", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      }),
    unlink: () => request<{ status: string }>("/api/resy/unlink", { method: "POST" }),
  },
  profile: {
    get: () => request<Profile>("/api/profile"),
    update: (data: {
      full_name?: string;
      phone?: string;
      timezone?: string;
      default_location?: string;
      onboarding_completed?: boolean;
    }) =>
      request<Profile>("/api/profile", {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
  },
};
