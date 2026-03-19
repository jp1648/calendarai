import { QueryClient } from "@tanstack/react-query";

/**
 * Poll for profile updates after an OAuth redirect.
 * Invalidates the profile query after 5s and 15s to pick up connection status changes.
 */
export function pollForProfileUpdate(queryClient: QueryClient) {
  setTimeout(() => queryClient.invalidateQueries({ queryKey: ["profile"] }), 5000);
  setTimeout(() => queryClient.invalidateQueries({ queryKey: ["profile"] }), 15000);
}
