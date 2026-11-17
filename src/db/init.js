/**
 * TrueTone Database Setup & Migration CLI
 * Runs schema creation and seed scripts with automatic database provisioning.
 * 
 * Usage:
 *   node src/db/init.js --setup    # Provisions database, executes schema.sql, and seeds data
 *   node src/db/init.js --migrate  # Executes schema.sql only
 *   node src/db/init.js --seed     # Executes seed.sql only
 */

const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const SCHEMA_PATH = path.resolve(__dirname, '../../schema.sql');
const SEED_PATH = path.resolve(__dirname, '../../seed.sql');

// Configuration helpers
const getBaseConfig = () => ({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT, 10) || 5432,
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
});

const targetDbName = process.env.DB_NAME || 'TrueTone';

/**
 * Ensures the target database exists, creates it if missing
 */
async function ensureDatabaseExists() {
    console.log(`[INIT] Checking if database "${targetDbName}" exists...`);
    const adminClient = new Client({
        ...getBaseConfig(),
        database: 'postgres', // Connect to default maintenance DB
    });

    try {
        await adminClient.connect();
        const checkRes = await adminClient.query(
            'SELECT 1 FROM pg_database WHERE datname = $1',
            [targetDbName]
        );

        if (checkRes.rowCount === 0) {
            console.log(`[INIT] Database "${targetDbName}" not found. Creating database...`);
            // Identifiers cannot be parameterized with $1
            await adminClient.query(`CREATE DATABASE "${targetDbName}"`);
            console.log(`[INIT] Database "${targetDbName}" created successfully!`);
        } else {
            console.log(`[INIT] Database "${targetDbName}" already exists.`);
        }
    } catch (err) {
        console.warn(`[INIT] Notice on database creation check: ${err.message}`);
        console.log(`[INIT] Proceeding with direct connection...`);
    } finally {
        await adminClient.end().catch(() => {});
    }
}

/**
 * Executes a SQL file on the target database
 */
async function executeSqlFile(filePath, label) {
    if (!fs.existsSync(filePath)) {
        throw new Error(`File not found: ${filePath}`);
    }

    console.log(`\n[INIT] Executing ${label} from: ${filePath}...`);
    const sql = fs.readFileSync(filePath, 'utf8');

    const targetClient = new Client(
        process.env.DATABASE_URL || {
            ...getBaseConfig(),
            database: targetDbName,
        }
    );

    try {
        await targetClient.connect();
        const start = Date.now();
        await targetClient.query(sql);
        const duration = Date.now() - start;
        console.log(`[INIT] SUCCESS: ${label} executed in ${duration}ms.`);
    } finally {
        await targetClient.end().catch(() => {});
    }
}

/**
 * Verify table counts and health
 */
async function printDatabaseSummary() {
    const client = new Client(
        process.env.DATABASE_URL || {
            ...getBaseConfig(),
            database: targetDbName,
        }
    );

    try {
        await client.connect();
        const tables = ['users', 'pending', 'logs', 'actions', 'published'];
        console.log('\n======================================================');
        console.log(`  TrueTone Database Summary (${targetDbName})`);
        console.log('======================================================');
        for (const tbl of tables) {
            try {
                const countRes = await client.query(`SELECT COUNT(*) FROM ${tbl}`);
                console.log(`  - Table [${tbl}]: ${countRes.rows[0].count} records`);
            } catch (e) {
                console.log(`  - Table [${tbl}]: Not found or error (${e.message})`);
            }
        }
        console.log('======================================================\n');
    } finally {
        await client.end().catch(() => {});
    }
}

/**
 * Main CLI runner
 */
async function main() {
    const args = process.argv.slice(2);
    const mode = args[0] || '--setup';

    try {
        if (mode === '--migrate') {
            await executeSqlFile(SCHEMA_PATH, 'Schema Migrations');
            await printDatabaseSummary();
        } else if (mode === '--seed') {
            await executeSqlFile(SEED_PATH, 'Sample Seed Data');
            await printDatabaseSummary();
        } else if (mode === '--setup' || mode === '--all') {
            await ensureDatabaseExists();
            await executeSqlFile(SCHEMA_PATH, 'Schema Migrations');
            await executeSqlFile(SEED_PATH, 'Sample Seed Data');
            await printDatabaseSummary();
        } else {
            console.log('Usage: node src/db/init.js [--setup | --migrate | --seed]');
        }
    } catch (err) {
        console.error('\n[INIT-FATAL-ERROR]', err.message);
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}

module.exports = {
    ensureDatabaseExists,
    executeSqlFile,
    printDatabaseSummary,
};
