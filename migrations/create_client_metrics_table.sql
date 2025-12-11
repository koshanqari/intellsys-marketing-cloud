-- Migration: Create client_metrics table for dynamic metric configuration
-- Each client can configure their own metrics for analytics

CREATE TABLE IF NOT EXISTS app.client_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES app.clients(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT 'Circle',
  color TEXT NOT NULL DEFAULT '#0052CC',
  map_to_column TEXT NOT NULL DEFAULT 'message_status',
  keywords TEXT[] NOT NULL DEFAULT '{}',
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Ensure unique name per client
  CONSTRAINT client_metrics_name_unique UNIQUE (client_id, name),
  
  -- Validate map_to_column values
  CONSTRAINT client_metrics_column_check CHECK (
    map_to_column IN ('message_status', 'status_code', 'status_message', 'message_status_detailed', 'template_name', 'name', 'phone', 'message_id')
  )
);

-- Index for faster lookups by client_id
CREATE INDEX IF NOT EXISTS idx_client_metrics_client_id ON app.client_metrics(client_id);

-- Index for sorting
CREATE INDEX IF NOT EXISTS idx_client_metrics_sort ON app.client_metrics(client_id, sort_order);

-- Add trigger for updating updated_at timestamp
CREATE OR REPLACE FUNCTION app.update_client_metrics_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_client_metrics_updated_at ON app.client_metrics;
CREATE TRIGGER trigger_client_metrics_updated_at
  BEFORE UPDATE ON app.client_metrics
  FOR EACH ROW
  EXECUTE FUNCTION app.update_client_metrics_updated_at();

-- Insert default metrics for all existing clients
INSERT INTO app.client_metrics (client_id, name, icon, color, map_to_column, keywords, sort_order)
SELECT 
  c.id,
  m.name,
  m.icon,
  m.color,
  m.map_to_column,
  m.keywords,
  m.sort_order
FROM app.clients c
CROSS JOIN (
  VALUES 
    ('Sent', 'Send', '#0052CC', 'message_status', ARRAY['sent', 'delivered', 'read', 'button', 'text']::TEXT[], 0),
    ('Delivered', 'CheckCircle2', '#0D7C3D', 'message_status', ARRAY['delivered', 'read', 'button', 'text']::TEXT[], 1),
    ('Read', 'Eye', '#0052CC', 'message_status', ARRAY['read']::TEXT[], 2),
    ('Replied', 'MessageSquare', '#6B7280', 'message_status', ARRAY['button', 'text']::TEXT[], 3),
    ('Failed', 'AlertCircle', '#C41E3A', 'status_code', ARRAY['400', '401', '403', '404', '500']::TEXT[], 4)
) AS m(name, icon, color, map_to_column, keywords, sort_order)
ON CONFLICT (client_id, name) DO NOTHING;

COMMENT ON TABLE app.client_metrics IS 'Dynamic metric configurations for client analytics dashboards';
COMMENT ON COLUMN app.client_metrics.map_to_column IS 'Which column to query: message_status, status_code, or status_message';
COMMENT ON COLUMN app.client_metrics.keywords IS 'Array of values to match and aggregate for this metric';
COMMENT ON COLUMN app.client_metrics.sort_order IS 'Display order in the dashboard (lower = first)';

