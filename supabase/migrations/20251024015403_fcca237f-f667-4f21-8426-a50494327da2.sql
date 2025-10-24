-- Add missing columns to enabled_sources table
ALTER TABLE enabled_sources 
ADD COLUMN IF NOT EXISTS connected BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS account_name TEXT;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_enabled_sources_connected ON enabled_sources(business_id, connected);