-- Add status_colors column to clients table
-- This allows customizing the display colors for each delivery status

ALTER TABLE app.clients 
ADD COLUMN IF NOT EXISTS status_colors JSONB DEFAULT '{}'::jsonb;

-- Add comment to explain the column
COMMENT ON COLUMN app.clients.status_colors IS 'Custom colors for delivery statuses. Format: {"SENT": "#3B82F6", "DELIVERED": "#10B981", ...}';

