import * as fs from 'fs';

// Load environment variables from .env.local BEFORE importing db
const envFile = fs.readFileSync('.env.local', 'utf-8');
envFile.split('\n').forEach(line => {
  const trimmed = line.trim();
  if (trimmed && !trimmed.startsWith('#')) {
    const match = trimmed.match(/^([^=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      const value = match[2].trim();
      process.env[key] = value;
    }
  }
});

// Now create a direct connection after env vars are set
import { Pool } from 'pg';

async function runMigration() {
  const pool = new Pool({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    ssl: false,
  });

  const client = await pool.connect();
  
  try {
    console.log('Running migration: Adding status_code_mappings column...');
    
    // Add the column
    await client.query(`
      ALTER TABLE app.clients 
      ADD COLUMN IF NOT EXISTS status_code_mappings JSONB DEFAULT '{}'::jsonb;
    `);
    
    console.log('✓ Column added successfully');
    
    // Add comment
    await client.query(`
      COMMENT ON COLUMN app.clients.status_code_mappings IS 'Maps HTTP status codes from different platforms to standardized categories. Format: {"SUCCESS": "200,201,202", "CLIENT_ERROR": "400,401,403,404"}';
    `);
    
    console.log('✓ Comment added successfully');
    console.log('\nMigration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration();

