-- Create function for updating timestamps (if not exists)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create journeys table for storing journey builder data
CREATE TABLE IF NOT EXISTS app.journeys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES app.clients(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    nodes JSONB NOT NULL DEFAULT '[]'::jsonb,
    connections JSONB NOT NULL DEFAULT '[]'::jsonb,
    canvas_state JSONB DEFAULT '{}'::jsonb, -- For zoom, pan state
    status VARCHAR(50) DEFAULT 'draft', -- draft, active, archived
    created_by UUID REFERENCES app.client_users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add trigger for updated_at
CREATE TRIGGER update_journeys_updated_at
    BEFORE UPDATE ON app.journeys
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_journeys_client_id ON app.journeys(client_id);
CREATE INDEX IF NOT EXISTS idx_journeys_status ON app.journeys(status);

-- Add comments
COMMENT ON TABLE app.journeys IS 'Stores journey builder flows for each client';
COMMENT ON COLUMN app.journeys.nodes IS 'JSON array of nodes with their positions and data';
COMMENT ON COLUMN app.journeys.connections IS 'JSON array of connections between nodes';
COMMENT ON COLUMN app.journeys.canvas_state IS 'Canvas state like zoom level and pan position';

