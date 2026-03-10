-- Agent threads for multi-turn conversations
CREATE TABLE public.agent_threads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    messages JSONB NOT NULL DEFAULT '[]',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.agent_threads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_threads" ON public.agent_threads FOR ALL USING (auth.uid() = user_id);

-- Rate limits
CREATE TABLE public.rate_limits (
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    window_key TEXT NOT NULL,
    request_count INT NOT NULL DEFAULT 0,
    tokens_used INT NOT NULL DEFAULT 0,
    PRIMARY KEY (user_id, window_key)
);

ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;
-- No user-facing policy — accessed via service role only

-- Atomic rate limit increment (returns new counts)
CREATE OR REPLACE FUNCTION increment_rate_limits(
    p_user_id UUID,
    p_keys TEXT[]
) RETURNS TABLE(window_key TEXT, request_count INT) AS $$
BEGIN
    RETURN QUERY
    INSERT INTO rate_limits (user_id, window_key, request_count)
    SELECT p_user_id, unnest(p_keys), 1
    ON CONFLICT (user_id, window_key)
    DO UPDATE SET request_count = rate_limits.request_count + 1
    RETURNING rate_limits.window_key, rate_limits.request_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update daily token usage after agent run
CREATE OR REPLACE FUNCTION update_token_usage(
    p_user_id UUID,
    p_day_key TEXT,
    p_tokens INT
) RETURNS VOID AS $$
BEGIN
    INSERT INTO rate_limits (user_id, window_key, tokens_used)
    VALUES (p_user_id, p_day_key, p_tokens)
    ON CONFLICT (user_id, window_key)
    DO UPDATE SET tokens_used = rate_limits.tokens_used + p_tokens;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
