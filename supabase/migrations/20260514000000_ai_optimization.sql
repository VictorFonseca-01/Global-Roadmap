-- 20260514000000_ai_optimization.sql

-- Update lifecycle_catalog with AI optimization fields
ALTER TABLE lifecycle_catalog ADD COLUMN IF NOT EXISTS expires_at timestamp with time zone;
ALTER TABLE lifecycle_catalog ADD COLUMN IF NOT EXISTS prompt_hash text;
ALTER TABLE lifecycle_catalog ADD COLUMN IF NOT EXISTS model_name text;
ALTER TABLE lifecycle_catalog ADD COLUMN IF NOT EXISTS raw_response jsonb;

-- Update ai_usage_logs with more detail
ALTER TABLE ai_usage_logs ADD COLUMN IF NOT EXISTS prompt_hash text;
ALTER TABLE ai_usage_logs ADD COLUMN IF NOT EXISTS tokens_input integer DEFAULT 0;
ALTER TABLE ai_usage_logs ADD COLUMN IF NOT EXISTS tokens_output integer DEFAULT 0;
ALTER TABLE ai_usage_logs ADD COLUMN IF NOT EXISTS status text DEFAULT 'success';

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_lifecycle_catalog_lookup ON lifecycle_catalog (vendor, product_name, version);
CREATE INDEX IF NOT EXISTS idx_lifecycle_catalog_prompt_hash ON lifecycle_catalog (prompt_hash);
