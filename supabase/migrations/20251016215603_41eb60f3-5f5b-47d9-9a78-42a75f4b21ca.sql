-- Create table for secure OAuth state management
CREATE TABLE public.oauth_states (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  business_id uuid NOT NULL,
  source_id uuid NOT NULL,
  state_token text NOT NULL UNIQUE,
  expires_at timestamp with time zone NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  used boolean NOT NULL DEFAULT false
);

-- Enable RLS
ALTER TABLE public.oauth_states ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own OAuth states"
ON public.oauth_states
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own OAuth states"
ON public.oauth_states
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "System can update OAuth states"
ON public.oauth_states
FOR UPDATE
USING (true);

-- Create index for fast lookups
CREATE INDEX idx_oauth_states_token ON public.oauth_states(state_token);
CREATE INDEX idx_oauth_states_expires ON public.oauth_states(expires_at);

-- Add function to clean up expired states
CREATE OR REPLACE FUNCTION public.cleanup_expired_oauth_states()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.oauth_states
  WHERE expires_at < NOW() OR (used = true AND created_at < NOW() - INTERVAL '1 hour');
END;
$$;