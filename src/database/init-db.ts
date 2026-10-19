import * as fs from 'fs';
import * as path from 'path';
import { Client, Pool } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

/**
 * Migration & Database Initialization Script
 *
 * Implements:
 * - SOC 2 Type II: Logical Separation of Duties.
 *   This script runs with migration/admin privileges to:
 *   1. Connect to the PostgreSQL maintenance database ('postgres')
 *   2. Automatically create the application database ('secure_clinic_db') if missing
 *   3. Apply DDL schema, Row-Level Security policies, and seed tenant clinics
 *   4. Provision least-privilege runtime role (secure_clinic_app)
 */
async function runMigrations() {
  const host = process.env.DB_HOST || 'localhost';
  const port = parseInt(process.env.DB_PORT || '5432', 10);
  const adminUser = process.env.DB_ADMIN_USER || 'postgres';
  const adminPassword =
    process.env.DB_ADMIN_PASSWORD ||
    process.env.DB_PASSWORD ||
    'postgres';
  const database = process.env.DB_NAME || 'secure_clinic_db';
  const appUser = process.env.DB_USER || 'secure_clinic_app';
  const appPassword = process.env.DB_PASSWORD || 'SecureClinicAppP@ssw0rd2024!';

  console.log(`Connecting to PostgreSQL as admin '${adminUser}' at ${host}:${port}...`);

  // Step 1: Connect to default maintenance database 'postgres' to check/create the target DB
  const adminClient = new Client({
    host,
    port,
    user: adminUser,
    password: adminPassword,
    database: 'postgres',
  });

  try {
    await adminClient.connect();
    console.log(`Connected to administrative database 'postgres'.`);

    const checkDb = await adminClient.query(
      'SELECT 1 FROM pg_database WHERE datname = $1',
      [database],
    );

    if (checkDb.rowCount === 0) {
      console.log(`Database '${database}' does not exist. Creating it now...`);
      await adminClient.query(`CREATE DATABASE "${database}"`);
      console.log(`Database '${database}' created successfully.`);
    } else {
      console.log(`Database '${database}' already exists.`);
    }
  } catch (err: any) {
    console.error(`Failed during administrative database connection/creation:`, err.message);
    throw err;
  } finally {
    await adminClient.end();
  }

  // Step 2: Connect directly to the application database as admin and apply schema & RLS policies
  console.log(`Connecting to '${database}' to apply schema and security policies...`);
  const pool = new Pool({
    host,
    port,
    user: adminUser,
    password: adminPassword,
    database,
  });

  try {
    const schemaPath = path.join(__dirname, 'schema.sql');
    let ddl = fs.readFileSync(schemaPath, 'utf8');

    // Ensure the application user's password matches the .env DB_PASSWORD
    if (appPassword) {
      ddl += `\nALTER ROLE "${appUser}" WITH PASSWORD '${appPassword.replace(/'/g, "''")}';\n`;
    }

    console.log('Executing database schema DDL & RLS Policies...');
    await pool.query(ddl);

    console.log('Database schema and RLS policies successfully applied.');
    console.log(`Application runtime role '${appUser}' is configured.`);
  } catch (err: any) {
    console.error('Migration failed:', err.message);
    throw err;
  } finally {
    await pool.end();
  }
}

runMigrations().catch(() => {
  process.exit(1);
});
