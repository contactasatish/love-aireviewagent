-- Create table to store source connections
CREATE TABLE public.source_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  source_id UUID NOT NULL REFERENCES public.sources(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  connection_type TEXT NOT NULL CHECK (connection_type IN ('oauth', 'api_key', 'url')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'connected', 'failed', 'disconnected')),
  encrypted_credentials TEXT,
  oauth_token TEXT,
  oauth_refresh_token TEXT,
  token_expires_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(business_id, source_id)
);

-- Enable RLS
ALTER TABLE public.source_connections ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own source connections"
ON public.source_connections
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own source connections"
ON public.source_connections
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own source connections"
ON public.source_connections
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own source connections"
ON public.source_connections
FOR DELETE
USING (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_source_connections_updated_at
BEFORE UPDATE ON public.source_connections
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();