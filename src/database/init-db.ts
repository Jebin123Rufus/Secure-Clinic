import * as fs from 'fs';
import * as path from 'path';
import { Pool } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

/**
 * Migration & Database Initialization Script
 *
 * Implements:
 * - SOC 2 Type II: Logical Separation of Duties.
 *   This script runs with migration/admin privileges to apply DDL schema,
 *   Row-Level Security policies, and seed tenant clinics.
 */
async function runMigrations() {
  const host = process.env.DB_HOST || 'localhost';
  const port = parseInt(process.env.DB_PORT || '5432', 10);
  const user = process.env.DB_ADMIN_USER || process.env.DB_USER || 'postgres';
  const password = process.env.DB_ADMIN_PASSWORD || process.env.DB_PASSWORD || 'postgres';
  const database = process.env.DB_NAME || 'secure_clinic_db';

  console.log(`Connecting to PostgreSQL at ${host}:${port}/${database} as ${user}...`);

  const pool = new Pool({
    host,
    port,
    user,
    password,
    database,
  });

  try {
    const schemaPath = path.join(__dirname, 'schema.sql');
    const ddl = fs.readFileSync(schemaPath, 'utf8');

    console.log('Executing database schema DDL & RLS Policies...');
    await pool.query(ddl);

    console.log('✅ Database schema and RLS policies successfully applied.');
  } catch (err: any) {
    console.error('❌ Migration failed:', err.message);
  } finally {
    await pool.end();
  }
}

runMigrations();
