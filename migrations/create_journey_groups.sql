-- Migration: Create journey_groups table and add group_id to journeys
-- Run this migration to enable journey folders/groups

-- Create journey_groups table
CREATE TABLE IF NOT EXISTS app.journey_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES app.clients(id) ON DELETE CASCADE,
    parent_group_id UUID REFERENCES app.journey_groups(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add group_id column to journeys table (nullable - null means root level)
ALTER TABLE app.journeys 
ADD COLUMN IF NOT EXISTS group_id UUID REFERENCES app.journey_groups(id) ON DELETE SET NULL;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_journey_groups_client_id ON app.journey_groups(client_id);
CREATE INDEX IF NOT EXISTS idx_journey_groups_parent_group_id ON app.journey_groups(parent_group_id);
CREATE INDEX IF NOT EXISTS idx_journeys_group_id ON app.journeys(group_id);

-- Create trigger to update updated_at on journey_groups
CREATE OR REPLACE FUNCTION update_journey_groups_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_journey_groups_updated_at ON app.journey_groups;
CREATE TRIGGER trigger_journey_groups_updated_at
    BEFORE UPDATE ON app.journey_groups
    FOR EACH ROW
    EXECUTE FUNCTION update_journey_groups_updated_at();

