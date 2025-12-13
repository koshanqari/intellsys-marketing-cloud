-- Migration: Add calculated metrics support to client_metrics table

-- Add columns for calculated metrics
ALTER TABLE app.client_metrics 
ADD COLUMN IF NOT EXISTS is_calculated BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS formula TEXT,
ADD COLUMN IF NOT EXISTS unit TEXT;

-- Allow NULL for map_to_column when is_calculated is true
ALTER TABLE app.client_metrics 
ALTER COLUMN map_to_column DROP NOT NULL;

-- Update constraint to allow NULL map_to_column for calculated metrics
ALTER TABLE app.client_metrics 
DROP CONSTRAINT IF EXISTS client_metrics_column_check;

ALTER TABLE app.client_metrics 
ADD CONSTRAINT client_metrics_column_check CHECK (
  (is_calculated = true AND map_to_column IS NULL) OR
  (is_calculated = false AND map_to_column IS NOT NULL AND map_to_column IN ('message_status', 'status_code', 'status_message', 'message_status_detailed', 'template_name', 'name', 'phone', 'message_id'))
);

-- Update keywords constraint - calculated metrics don't need keywords
ALTER TABLE app.client_metrics
ALTER COLUMN keywords DROP NOT NULL;

COMMENT ON COLUMN app.client_metrics.is_calculated IS 'Whether this metric is calculated from other metrics';
COMMENT ON COLUMN app.client_metrics.formula IS 'Formula for calculated metrics (e.g., Math.round((delivered/sent)*100))';
COMMENT ON COLUMN app.client_metrics.prefix IS 'Prefix to display before calculated metric value (e.g., Rs, $, USD)';
COMMENT ON COLUMN app.client_metrics.unit IS 'Unit/suffix to display after calculated metric value (e.g., %, Rs, $)';


