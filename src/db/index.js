/**
 * TrueTone Database Setup and Connection Pool Module
 * Production-ready PostgreSQL connection pool using `pg` (node-postgres)
 * Configured for high-volume reads/writes, connection health monitoring, and transactions.
 */

const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

// Construct pool configuration
const poolConfig = process.env.DATABASE_URL
    ? {
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
    }
    : {
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT, 10) || 5432,
        database: process.env.DB_NAME || 'TrueTone',
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || 'postgres',
        max: parseInt(process.env.DB_POOL_MAX, 10) || 20,
        idleTimeoutMillis: parseInt(process.env.DB_POOL_IDLE_TIMEOUT_MS, 10) || 30000,
        connectionTimeoutMillis: parseInt(process.env.DB_POOL_CONNECTION_TIMEOUT_MS, 10) || 5000,
        ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
    };

const pool = new Pool(poolConfig);

// Pool diagnostic event listeners
pool.on('connect', () => {
    if (process.env.NODE_ENV === 'development') {
        // console.log('[DB] New connection client checked out from pool');
    }
});

pool.on('error', (err) => {
    console.error('[DB] Unexpected error on idle client in pool:', err.message);
});

/**
 * Execute a parameterized SQL query with execution profiling
 * @param {string} text - SQL statement with $1, $2 placeholders
 * @param {Array} params - Array of parameters
 * @returns {Promise<pg.QueryResult>}
 */
const query = async (text, params = []) => {
    const start = Date.now();
    try {
        const res = await pool.query(text, params);
        const duration = Date.now() - start;
        if (process.env.NODE_ENV === 'development' && duration > 100) {
            console.warn(`[DB-SLOW-QUERY] ${duration}ms | ${text.trim().substring(0, 100)}...`);
        }
        return res;
    } catch (error) {
        console.error('[DB-QUERY-ERROR]', {
            message: error.message,
            query: text.trim().substring(0, 120),
            params,
        });
        throw error;
    }
};

/**
 * Check out a dedicated client from the pool
 * Remember to always call `client.release()` when finished!
 * @returns {Promise<pg.PoolClient>}
 */
const getClient = async () => {
    const client = await pool.connect();
    return client;
};

/**
 * Helper to run multiple queries inside an ACID transaction block
 * Automatically rolls back if an exception is thrown.
 * @param {Function} callback - async (client) => { ... }
 */
const withTransaction = async (callback) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const result = await callback(client);
        await client.query('COMMIT');
        return result;
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('[DB-TX-ROLLBACK] Transaction rolled back due to error:', error.message);
        throw error;
    } finally {
        client.release();
    }
};

/**
 * Database health check routine
 * Returns response latency and connection state
 */
const checkHealth = async () => {
    const start = Date.now();
    try {
        const res = await pool.query(`
            SELECT 
                current_database() AS database,
                current_user AS user,
                version() AS version,
                (SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public') AS table_count
        `);
        const latencyMs = Date.now() - start;

        // Ensure schema upgrades (e.g. logs.timestamp column) are non-destructively present
        try {
            await pool.query('ALTER TABLE logs ADD COLUMN IF NOT EXISTS timestamp TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP');
        } catch (_) {}

        return {
            status: 'healthy',
            latencyMs,
            database: res.rows[0].database,
            user: res.rows[0].user,
            tableCount: parseInt(res.rows[0].table_count, 10),
            pool: {
                totalCount: pool.totalCount,
                idleCount: pool.idleCount,
                waitingCount: pool.waitingCount,
            },
        };
    } catch (error) {
        return {
            status: 'unhealthy',
            latencyMs: Date.now() - start,
            error: error.message,
        };
    }
};

/**
 * Graceful shutdown for pool connections
 */
const close = async () => {
    await pool.end();
    console.log('[DB] Connection pool successfully closed.');
};

module.exports = {
    pool,
    query,
    getClient,
    withTransaction,
    checkHealth,
    close,
};
