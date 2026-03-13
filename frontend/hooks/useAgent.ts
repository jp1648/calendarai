import { useMutation } from "@tanstack/react-query";
import { api } from "../lib/api";

interface AgentResponse {
  run_id: string;
  agent_name: string;
  status: "running" | "completed" | "failed";
  message: string;
  events_created: any[];
  tokens_used: number | null;
  model_used: string | null;
}

export function useAgent() {
  const scheduleMutation = useMutation<AgentResponse, Error, string>({
    mutationFn: (input: string) => api.agents.schedule(input),
  });

  const runMutation = useMutation<AgentResponse, Error, { agentName: string; input: string }>({
    mutationFn: ({ agentName, input }) => api.agents.run(agentName, input),
  });

  const schedule = async (input: string): Promise<AgentResponse | null> => {
    try {
      return await scheduleMutation.mutateAsync(input);
    } catch {
      return null;
    }
  };

  const run = async (agentName: string, input: string): Promise<AgentResponse | null> => {
    try {
      return await runMutation.mutateAsync({ agentName, input });
    } catch {
      return null;
    }
  };

  return {
    schedule,
    run,
    processing: scheduleMutation.isPending || runMutation.isPending,
    error: scheduleMutation.error?.message ?? runMutation.error?.message ?? null,
  };
}
