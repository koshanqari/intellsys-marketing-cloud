-- Add status_mappings column to clients table
-- This allows mapping incoming status values from different platforms (Gallabox, Gupshup, etc.)
-- to standardized database values (e.g., "read" -> "READ", "Read" -> "READ")

ALTER TABLE app.clients 
ADD COLUMN IF NOT EXISTS status_mappings JSONB DEFAULT '{}'::jsonb;

-- Add comment to explain the column
COMMENT ON COLUMN app.clients.status_mappings IS 'Maps incoming status values from different platforms to standardized database values. Format: {"incoming_status": "normalized_status"}';

