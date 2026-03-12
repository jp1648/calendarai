import { useState } from "react";
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
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const schedule = async (input: string): Promise<AgentResponse | null> => {
    setProcessing(true);
    setError(null);
    try {
      const result = await api.agents.schedule(input);
      return result;
    } catch (e: any) {
      setError(e.message);
      return null;
    } finally {
      setProcessing(false);
    }
  };

  const run = async (agentName: string, input: string): Promise<AgentResponse | null> => {
    setProcessing(true);
    setError(null);
    try {
      const result = await api.agents.run(agentName, input);
      return result;
    } catch (e: any) {
      setError(e.message);
      return null;
    } finally {
      setProcessing(false);
    }
  };

  return { schedule, run, processing, error };
}
