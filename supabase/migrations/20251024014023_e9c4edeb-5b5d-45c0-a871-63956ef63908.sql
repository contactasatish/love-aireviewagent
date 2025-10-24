-- Add external_review_id and source_id to reviews table
ALTER TABLE reviews 
ADD COLUMN IF NOT EXISTS external_review_id TEXT,
ADD COLUMN IF NOT EXISTS source_id UUID REFERENCES sources(id);

-- Add location_id to enabled_sources table
ALTER TABLE enabled_sources 
ADD COLUMN IF NOT EXISTS location_id TEXT;