import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes before refetch
      gcTime: 1000 * 60 * 30, // keep unused cache 30 minutes
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
});
