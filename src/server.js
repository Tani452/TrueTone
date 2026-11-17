/**
 * TrueTone Server Bootstrap
 * Handles server lifecycle, graceful shutdown, and connection pool draining.
 */

const http = require('http');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const app = require('./app');
const db = require('./db');

const PORT = process.env.PORT || 3000;
const server = http.createServer(app);

server.listen(PORT, async () => {
    console.log('==============================================================');
    console.log(`  TrueTone High-Performance Governance Engine Started`);
    console.log(`  Local URL:        http://localhost:${PORT}`);
    console.log(`  API Healthcheck:  http://localhost:${PORT}/api/health`);
    console.log(`  Database Target:  ${process.env.DB_NAME || 'TrueTone'} @ ${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || 5432}`);
    console.log('==============================================================');

    // Perform an initial health check
    const health = await db.checkHealth();
    if (health.status === 'healthy') {
        console.log(`[DB-READY] Connected successfully (${health.latencyMs}ms latency). ${health.tableCount} tables found.`);
    } else {
        console.warn(`[DB-NOTICE] Database unreachable or not yet initialized: ${health.error}`);
        console.warn(`[DB-NOTICE] Run 'npm run db:setup' or 'docker compose up -d' to start PostgreSQL.`);
    }
});

// Graceful process shutdown handler
const gracefulShutdown = async (signal) => {
    console.log(`\n[SHUTDOWN] Received ${signal}. Draining connection pool and closing server...`);
    server.close(async () => {
        try {
            await db.close();
            console.log('[SHUTDOWN] Clean exit completed.');
            process.exit(0);
        } catch (err) {
            console.error('[SHUTDOWN-ERROR] Error during shutdown:', err);
            process.exit(1);
        }
    });

    // Force exit if taking too long
    setTimeout(() => {
        console.error('[SHUTDOWN] Force terminating after timeout.');
        process.exit(1);
    }, 10000);
};

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
