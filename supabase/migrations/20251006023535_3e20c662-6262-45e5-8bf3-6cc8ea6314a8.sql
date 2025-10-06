-- Create sources table (master list of review platforms)
CREATE TABLE public.sources (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  icon TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on sources
ALTER TABLE public.sources ENABLE ROW LEVEL SECURITY;

-- Policy: Everyone can view sources
CREATE POLICY "Sources are viewable by everyone"
ON public.sources
FOR SELECT
USING (true);

-- Create enabled_sources table (tracks which sources are enabled for each business)
CREATE TABLE public.enabled_sources (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  source_id UUID NOT NULL REFERENCES public.sources(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(business_id, source_id)
);

-- Enable RLS on enabled_sources
ALTER TABLE public.enabled_sources ENABLE ROW LEVEL SECURITY;

-- Policies for enabled_sources
CREATE POLICY "Users can view their own enabled sources"
ON public.enabled_sources
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own enabled sources"
ON public.enabled_sources
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own enabled sources"
ON public.enabled_sources
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own enabled sources"
ON public.enabled_sources
FOR DELETE
USING (auth.uid() = user_id);

-- Add triggers for updated_at
CREATE TRIGGER update_sources_updated_at
BEFORE UPDATE ON public.sources
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_enabled_sources_updated_at
BEFORE UPDATE ON public.enabled_sources
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Pre-populate sources table with common platforms
INSERT INTO public.sources (name, display_name, icon) VALUES
  ('google', 'Google Business', 'building-2'),
  ('facebook', 'Facebook', 'facebook'),
  ('yelp', 'Yelp', 'star'),
  ('tripadvisor', 'TripAdvisor', 'plane'),
  ('trustpilot', 'Trustpilot', 'shield-check'),
  ('amazon', 'Amazon', 'shopping-cart');