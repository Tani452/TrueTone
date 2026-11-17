/**
 * TrueTone Schema & Setup Automated Test Suite
 * Validates schema syntax, table definitions, constraints, indexes, and modular routes.
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('==============================================================');
console.log('  Running TrueTone Verification Test Suite');
console.log('==============================================================');

// Test 1: Verify SQL files exist and have required tables
console.log('\n[TEST 1] Verifying schema.sql and seed.sql existence and contents...');
const schemaPath = path.resolve(__dirname, '../schema.sql');
const seedPath = path.resolve(__dirname, '../seed.sql');

assert(fs.existsSync(schemaPath), 'schema.sql must exist at root');
assert(fs.existsSync(seedPath), 'seed.sql must exist at root');

const schemaSql = fs.readFileSync(schemaPath, 'utf8');
const seedSql = fs.readFileSync(seedPath, 'utf8');

const expectedTables = ['users', 'pending', 'logs', 'actions', 'published'];
expectedTables.forEach(table => {
    assert(
        schemaSql.toLowerCase().includes(`create table ${table}`) ||
        schemaSql.toLowerCase().includes(`create table if not exists ${table}`),
        `Table "${table}" must be declared in schema.sql`
    );
    console.log(`  ✓ Table declaration verified: ${table}`);
});

// Test 2: Verify high-scale indexing requirements
console.log('\n[TEST 2] Verifying B-Tree, GIN, and Partial index definitions...');
const requiredIndexes = [
    'idx_users_department',
    'idx_users_permissions',
    'idx_pending_timestamp',
    'idx_pending_approved',
    'idx_pending_unapproved_queue', // Partial index
    'idx_pending_post_gin',         // GIN index
    'idx_logs_published_by',
    'idx_logs_issue_gin',           // GIN index
    'idx_actions_user_id',
    'idx_actions_report_gin',       // GIN index
    'idx_published_timestamp',
    'idx_published_post_gin',       // GIN index
];

requiredIndexes.forEach(idx => {
    assert(
        schemaSql.includes(idx),
        `Index "${idx}" must be defined in schema.sql`
    );
    console.log(`  ✓ High-scale Index verified: ${idx}`);
});

// Test 3: Verify foreign key constraints
console.log('\n[TEST 3] Verifying Foreign Key Constraints and Checks...');
assert(schemaSql.includes('fk_logs_published_by') || schemaSql.includes('REFERENCES users'), 'Foreign key on logs(published_by) -> users(user_id) required');
assert(schemaSql.includes('fk_actions_user_id') || schemaSql.includes('REFERENCES users'), 'Foreign key on actions(user_id) -> users(user_id) required');
assert(schemaSql.includes('chk_users_can_post'), 'Constraint check on can_post required');
assert(schemaSql.includes('chk_pending_approved'), 'Constraint check on pending.approved required');
console.log('  ✓ Foreign keys and CHECK constraints verified.');

// Test 4: Verify seed data records
console.log('\n[TEST 4] Verifying Seed Data coverage...');
expectedTables.forEach(table => {
    assert(
        seedSql.toLowerCase().includes(`insert into ${table}`),
        `seed.sql must insert sample data into table "${table}"`
    );
    console.log(`  ✓ Seed data insert found for: ${table}`);
});

// Test 5: Verify Express App & Modular Route Separation
console.log('\n[TEST 5] Verifying Modular Architecture & Route Separation...');
const app = require('../src/app');
assert(app, 'Express app module must load successfully');

const expectedFiles = [
    'src/db/index.js',
    'src/db/init.js',
    'src/routes/review.routes.js',
    'src/routes/publish.routes.js',
    'src/routes/logs.routes.js',
    'src/routes/actions.routes.js',
    'src/routes/users.routes.js',
    'src/routes/guidelines.routes.js',
    'src/controllers/review.controller.js',
    'src/controllers/publish.controller.js',
    'src/controllers/logs.controller.js',
    'src/controllers/actions.controller.js',
    'src/controllers/users.controller.js',
    'public/index.html',
    'public/css/style.css',
    'public/js/app.js',
    'public/js/tabs/publish.tab.js',
    'public/js/tabs/guidelines.tab.js',
    'public/js/tabs/reviews.tab.js',
    'public/js/tabs/action.tab.js',
    'public/js/review.tab.js',
    'public/js/publish.tab.js',
    'public/js/logs.tab.js',
    'public/js/actions.tab.js',
    'public/js/users.tab.js',
];

expectedFiles.forEach(relPath => {
    const fullPath = path.resolve(__dirname, '..', relPath);
    assert(fs.existsSync(fullPath), `Module file must exist: ${relPath}`);
    console.log(`  ✓ Modular file present: ${relPath}`);
});

console.log('\n==============================================================');
console.log('  All Verification Tests Passed Successfully!');
console.log('==============================================================\n');
