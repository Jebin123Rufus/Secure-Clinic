"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs");
const path = require("path");
const pg_1 = require("pg");
const dotenv = require("dotenv");
dotenv.config();
async function runMigrations() {
    const host = process.env.DB_HOST || 'localhost';
    const port = parseInt(process.env.DB_PORT || '5432', 10);
    const adminUser = process.env.DB_ADMIN_USER || 'postgres';
    const adminPassword = process.env.DB_ADMIN_PASSWORD ||
        process.env.DB_PASSWORD ||
        'postgres';
    const database = process.env.DB_NAME || 'secure_clinic_db';
    const appUser = process.env.DB_USER || 'secure_clinic_app';
    const appPassword = process.env.DB_PASSWORD || 'SecureClinicAppP@ssw0rd2024!';
    console.log(`Connecting to PostgreSQL as admin '${adminUser}' at ${host}:${port}...`);
    const adminClient = new pg_1.Client({
        host,
        port,
        user: adminUser,
        password: adminPassword,
        database: 'postgres',
    });
    try {
        await adminClient.connect();
        console.log(`Connected to administrative database 'postgres'.`);
        const checkDb = await adminClient.query('SELECT 1 FROM pg_database WHERE datname = $1', [database]);
        if (checkDb.rowCount === 0) {
            console.log(`Database '${database}' does not exist. Creating it now...`);
            await adminClient.query(`CREATE DATABASE "${database}"`);
            console.log(`Database '${database}' created successfully.`);
        }
        else {
            console.log(`Database '${database}' already exists.`);
        }
    }
    catch (err) {
        console.error(`Failed during administrative database connection/creation:`, err.message);
        throw err;
    }
    finally {
        await adminClient.end();
    }
    console.log(`Connecting to '${database}' to apply schema and security policies...`);
    const pool = new pg_1.Pool({
        host,
        port,
        user: adminUser,
        password: adminPassword,
        database,
    });
    try {
        const schemaPath = path.join(__dirname, 'schema.sql');
        let ddl = fs.readFileSync(schemaPath, 'utf8');
        if (appPassword) {
            ddl += `\nALTER ROLE "${appUser}" WITH PASSWORD '${appPassword.replace(/'/g, "''")}';\n`;
        }
        console.log('Executing database schema DDL & RLS Policies...');
        await pool.query(ddl);
        console.log('Database schema and RLS policies successfully applied.');
        console.log(`Application runtime role '${appUser}' is configured.`);
    }
    catch (err) {
        console.error('Migration failed:', err.message);
        throw err;
    }
    finally {
        await pool.end();
    }
}
runMigrations().catch(() => {
    process.exit(1);
});
//# sourceMappingURL=init-db.js.map