import { supabase } from "./supabase";

const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:8000";

export class ApiError extends Error {
  status: number;
  constructor(status: number, body: string) {
    super(`API error ${status}: ${body}`);
    this.name = "ApiError";
    this.status = status;
  }
}

async function getAuthHeaders(): Promise<Record<string, string>> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error("Not authenticated");
  return {
    Authorization: `Bearer ${session.access_token}`,
    "Content-Type": "application/json",
    "ngrok-skip-browser-warning": "1",
  };
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

export const api = {
  events: {
    list: (start?: string, end?: string) => {
      const params = new URLSearchParams();
      if (start) params.set("start", start);
      if (end) params.set("end", end);
      const qs = params.toString();
      return request<any[]>(`/api/events${qs ? `?${qs}` : ""}`);
    },
    get: (id: string) => request<any>(`/api/events/${id}`),
    create: (data: any) =>
      request<any>("/api/events", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    update: (id: string, data: any) =>
      request<any>(`/api/events/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
    delete: (id: string) =>
      request<void>(`/api/events/${id}`, { method: "DELETE" }),
  },
  agents: {
    run: (agent_name: string, input: string) =>
      request<any>("/api/agents/run", {
        method: "POST",
        body: JSON.stringify({ agent_name, input }),
      }),
    schedule: (input: string) =>
      request<any>("/api/agents/schedule", {
        method: "POST",
        body: JSON.stringify({ input }),
      }),
    scheduleStream: async (input: string, thread_id?: string | null) => {
      const headers = await getAuthHeaders();
      return fetch(`${API_URL}/api/agents/schedule/stream`, {
        method: "POST",
        headers,
        body: JSON.stringify({ input, thread_id }),
      });
    },
    available: () => request<any>("/api/agents/available"),
  },
  gmail: {
    getAuthUrl: () => request<{ url: string }>("/api/gmail/auth-url"),
  },
  eventbrite: {
    search: (params: {
      query?: string;
      lat?: number;
      lng?: number;
      radius?: string;
      start_date?: string;
      end_date?: string;
    }) => {
      const qs = new URLSearchParams();
      if (params.query) qs.set("query", params.query);
      if (params.lat != null) qs.set("lat", String(params.lat));
      if (params.lng != null) qs.set("lng", String(params.lng));
      if (params.radius) qs.set("radius", params.radius);
      if (params.start_date) qs.set("start_date", params.start_date);
      if (params.end_date) qs.set("end_date", params.end_date);
      const q = qs.toString();
      return request<any>(`/api/eventbrite/search${q ? `?${q}` : ""}`);
    },
    eventDetails: (eventId: string) =>
      request<any>(`/api/eventbrite/events/${eventId}`),
    importEvent: (eventId: string) =>
      request<any>(`/api/eventbrite/import/${eventId}`, { method: "POST" }),
    getAuthUrl: () =>
      request<{ url: string }>("/api/eventbrite/auth-url"),
    unlink: () =>
      request<{ status: string }>("/api/eventbrite/unlink", { method: "POST" }),
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
    get: () =>
      request<{
        full_name: string;
        phone: string;
        timezone: string;
        default_location: string;
        email: string;
        gmail_connected: boolean;
        resy_connected: boolean;
        ical_feed_token: string;
      }>("/api/profile"),
    update: (data: {
      full_name?: string;
      phone?: string;
      timezone?: string;
      default_location?: string;
    }) =>
      request<any>("/api/profile", {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
  },
};
