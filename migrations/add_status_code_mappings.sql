-- Add status_code_mappings column to clients table
-- This allows mapping HTTP status codes from different platforms (Gallabox, Gupshup, etc.)
-- to standardized categories (SUCCESS, CLIENT_ERROR, SERVER_ERROR)

ALTER TABLE app.clients 
ADD COLUMN IF NOT EXISTS status_code_mappings JSONB DEFAULT '{}'::jsonb;

-- Add comment to explain the column
COMMENT ON COLUMN app.clients.status_code_mappings IS 'Maps HTTP status codes from different platforms to standardized categories. Format: {"SUCCESS": "200,201,202", "CLIENT_ERROR": "400,401,403,404"}';

