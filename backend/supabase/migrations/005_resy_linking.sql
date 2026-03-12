-- Add Resy account linking columns to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS resy_connected BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS resy_auth_token TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS resy_payment_method_id TEXT;
