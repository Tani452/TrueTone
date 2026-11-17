-- =============================================================================
-- TrueTone Database Initialization Schema
-- Target: PostgreSQL 14+ (Production Ready)
-- High-Volume Records, Fast Indexing & Scalable Read/Write Performance
-- =============================================================================

-- Ensure UUID and Performance Extensions are enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "btree_gin";

-- Drop existing tables if re-initializing (in reverse dependency order)
DROP TABLE IF EXISTS published CASCADE;
DROP TABLE IF EXISTS actions CASCADE;
DROP TABLE IF EXISTS logs CASCADE;
DROP TABLE IF EXISTS pending CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- =============================================================================
-- 1. USERS TABLE
-- Stores authorized organizational users, departments, and role permissions.
-- =============================================================================
CREATE TABLE users (
    user_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_name VARCHAR(150) NOT NULL,
    designation VARCHAR(100),
    department VARCHAR(100),
    contact_no VARCHAR(25),
    can_post CHAR(1) DEFAULT 'N' NOT NULL,
    can_approve CHAR(1) DEFAULT 'N' NOT NULL,
    can_take_action CHAR(1) DEFAULT 'N' NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,

    -- Enforce strict Y/N boolean flags
    CONSTRAINT chk_users_can_post CHECK (can_post IN ('Y', 'N')),
    CONSTRAINT chk_users_can_approve CHECK (can_approve IN ('Y', 'N')),
    CONSTRAINT chk_users_can_take_action CHECK (can_take_action IN ('Y', 'N'))
);

-- Indexing for Users:
-- Fast department-level filtering and search
CREATE INDEX idx_users_department ON users (department);
-- Composite index for permission checking and role-based access queries
CREATE INDEX idx_users_permissions ON users (can_approve, can_take_action, can_post);
-- Case-insensitive lookup on username
CREATE INDEX idx_users_user_name ON users (user_name);


-- =============================================================================
-- 2. PENDING TABLE
-- High-volume queue storing unapproved content, review scores, and approval votes.
-- =============================================================================
CREATE TABLE pending (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    post JSONB NOT NULL,
    timestamp TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    vote_approve INT DEFAULT 0 NOT NULL,
    vote_not_approve INT DEFAULT 0 NOT NULL,
    approved CHAR(1) DEFAULT 'N' NOT NULL,
    overall_review JSONB,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,

    -- Enforce approval flag and non-negative vote counts
    CONSTRAINT chk_pending_approved CHECK (approved IN ('Y', 'N')),
    CONSTRAINT chk_pending_vote_approve CHECK (vote_approve >= 0),
    CONSTRAINT chk_pending_vote_not_approve CHECK (vote_not_approve >= 0)
);

-- Indexing for Pending:
-- 1. Standard B-Tree on timestamp for general temporal sorting
CREATE INDEX idx_pending_timestamp ON pending (timestamp DESC);

-- 2. Standard index on approval status
CREATE INDEX idx_pending_approved ON pending (approved);

-- 3. Production Partial Index: Active Queue
-- In high-volume systems, approved posts accumulate into millions while pending is small.
-- This partial index keeps the active queue blazing fast and extremely compact in RAM.
CREATE INDEX idx_pending_unapproved_queue ON pending (timestamp ASC) WHERE approved = 'N';

-- 4. Composite index for vote tallying and decision sorting
CREATE INDEX idx_pending_votes ON pending (approved, vote_approve DESC, vote_not_approve ASC);

-- 5. GIN Index on Post JSONB for key-path querying (e.g. content types, channels, author)
CREATE INDEX idx_pending_post_gin ON pending USING gin (post jsonb_path_ops);

-- 6. GIN Index on Overall Review JSONB (e.g. AI score thresholds, flagged violation codes)
CREATE INDEX idx_pending_overall_review_gin ON pending USING gin (overall_review jsonb_path_ops);


-- =============================================================================
-- 3. LOGS TABLE
-- Audit log storing AI brand compliance violations, error categories, and diagnostics.
-- =============================================================================
CREATE TABLE logs (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    post JSONB NOT NULL,
    published_by BIGINT NOT NULL,
    issue JSONB,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,

    -- Maintain audit integrity: prevent deleting users with logged brand violations
    CONSTRAINT fk_logs_published_by FOREIGN KEY (published_by)
        REFERENCES users (user_id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE
);

-- Indexing for Logs:
-- 1. B-Tree on foreign key for creator audit lookup
CREATE INDEX idx_logs_published_by ON logs (published_by);

-- 2. B-Tree on timestamp for chronologically ordered compliance reviews
CREATE INDEX idx_logs_created_at ON logs (created_at DESC);

-- 3. Composite Index: specific user audit history over time (frequent query pattern)
CREATE INDEX idx_logs_user_created ON logs (published_by, created_at DESC);

-- 4. GIN Index on Issue JSONB: enables fast queries on violation categories, severity, and codes
CREATE INDEX idx_logs_issue_gin ON logs USING gin (issue jsonb_path_ops);

-- 5. GIN Index on Post JSONB: allows searching violation logs by post metadata
CREATE INDEX idx_logs_post_gin ON logs USING gin (post jsonb_path_ops);


-- =============================================================================
-- 4. ACTIONS TABLE
-- Tracks user-level error trends, cumulative activity scores, and corrective measures.
-- =============================================================================
CREATE TABLE actions (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id BIGINT NOT NULL,
    user_name VARCHAR(150) NOT NULL,
    designation VARCHAR(100),
    cumulative_report JSONB NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,

    -- Cascade delete user metrics if a user record is removed
    CONSTRAINT fk_actions_user_id FOREIGN KEY (user_id)
        REFERENCES users (user_id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
);

-- Indexing for Actions:
-- 1. B-Tree on user_id for rapid user metric aggregation
CREATE INDEX idx_actions_user_id ON actions (user_id);

-- 2. B-Tree on updated_at for monitoring latest audit updates
CREATE INDEX idx_actions_updated_at ON actions (updated_at DESC);

-- 3. GIN Index on Cumulative Report JSONB: search by risk levels, pass rates, error trends
CREATE INDEX idx_actions_report_gin ON actions USING gin (cumulative_report jsonb_path_ops);


-- =============================================================================
-- 5. PUBLISHED TABLE
-- High-volume catalog of successfully validated, approved, and dispatched content.
-- =============================================================================
CREATE TABLE published (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    post JSONB NOT NULL,
    timestamp TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Indexing for Published:
-- 1. B-Tree on timestamp for descending chronological feed paging
CREATE INDEX idx_published_timestamp ON published (timestamp DESC);

-- 2. GIN Index on Post JSONB: fast multi-attribute search across tags, authors, platforms
CREATE INDEX idx_published_post_gin ON published USING gin (post jsonb_path_ops);


-- =============================================================================
-- AUTOMATIC TIMESTAMP TRIGGER
-- Automatically updates updated_at column on row modifications.
-- =============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_users_updated_at ON users;
CREATE TRIGGER trg_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_pending_updated_at ON pending;
CREATE TRIGGER trg_pending_updated_at
    BEFORE UPDATE ON pending
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_actions_updated_at ON actions;
CREATE TRIGGER trg_actions_updated_at
    BEFORE UPDATE ON actions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
