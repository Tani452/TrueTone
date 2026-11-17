# TrueTone — Enterprise Brand Governance & High-Performance Database Engine

A production-ready PostgreSQL database and Node.js/Express platform designed for **high-volume records, sub-millisecond indexing, and scalable read/write performance** in enterprise brand governance.

---

## 🏗️ Architecture Overview

TrueTone implements a strict separation of concerns where each functional tab (Review, Publish, AI Logs, Actions, and Team Directory) has dedicated backend route/controller files and decoupled frontend modules:

```
TrueTone/
├── schema.sql                      # Production PostgreSQL DDL (5 tables, indexes, triggers)
├── seed.sql                        # Realistic seed records for immediate testing
├── docker-compose.yml              # Instant PostgreSQL 16 container setup
├── .env.example                    # Environment and connection pool configuration
├── package.json                    # NPM scripts, dependencies, dev tooling
├── README.md                       # Comprehensive documentation & API reference
├── src/
│   ├── app.js                      # Express application & tab router mounting
│   ├── server.js                   # Server bootstrap & graceful pool shutdown
│   ├── db/
│   │   ├── index.js                # High-performance `pg` connection pool & transactions
│   │   └── init.js                 # Database setup, migration, and seeding CLI
│   ├── routes/
│   │   ├── review.routes.js        # [Tab 1 Backend] Review queue & voting endpoints
│   │   ├── publish.routes.js       # [Tab 2 Backend] Published content endpoints
│   │   ├── logs.routes.js          # [Tab 3 Backend] AI compliance audit logs
│   │   ├── actions.routes.js       # [Tab 4 Backend] User action reports & metrics
│   │   └── users.routes.js         # [Tab 5 Backend] User directory & role permissions
│   └── controllers/
│       ├── review.controller.js    # Review business logic & atomic publish transactions
│       ├── publish.controller.js   # Publishing catalog & channel filters
│       ├── logs.controller.js      # Brand violation analysis & severity stats
│       ├── actions.controller.js   # User cumulative trends & corrective logs
│       └── users.controller.js     # User management & department filtering
└── public/
    ├── index.html                  # Single-page dashboard UI
    ├── css/
    │   └── style.css               # Clean enterprise dark-mode theme
    └── js/
        ├── app.js                  # UI orchestrator, tabs, modal dialogs, health check
        ├── review.tab.js           # [Tab 1 Frontend] Review queue, voting, approval modal
        ├── publish.tab.js          # [Tab 2 Frontend] Live published feed & channel filter
        ├── logs.tab.js             # [Tab 3 Frontend] AI brand violation audit inspector
        ├── actions.tab.js          # [Tab 4 Frontend] User risk cards & activity history
        └── users.tab.js            # [Tab 5 Frontend] Team table & permission toggles
```

---

## 🗄️ Database Tables & Indexing Design

The database `TrueTone` defines 5 core tables with constraints and indexes engineered for multi-million record workloads:

### 1. `users`
Stores authorized staff, department assignments, and permission flags.
- **Columns**: `user_id` (BIGINT PRIMARY KEY IDENTITY), `user_name` (VARCHAR NOT NULL), `designation` (VARCHAR), `department` (VARCHAR), `contact_no` (VARCHAR), `can_post` (CHAR(1) CHECK IN ('Y', 'N')), `can_approve` (CHAR(1) CHECK IN ('Y', 'N')), `can_take_action` (CHAR(1) CHECK IN ('Y', 'N')).
- **Indexes**:
  - `idx_users_department`: B-Tree for department filtering.
  - `idx_users_permissions`: Composite B-Tree `(can_approve, can_take_action, can_post)` for rapid RBAC gate checks.
  - `idx_users_user_name`: B-Tree for name searches.

### 2. `pending`
High-throughput queue of submitted drafts awaiting peer votes and manager sign-off.
- **Columns**: `id` (BIGINT PRIMARY KEY IDENTITY), `post` (JSONB NOT NULL), `timestamp` (TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP), `vote_approve` (INT DEFAULT 0), `vote_not_approve` (INT DEFAULT 0), `approved` (CHAR(1) CHECK IN ('Y', 'N')), `overall_review` (JSONB).
- **High-Scale Indexes**:
  - `idx_pending_timestamp`: B-Tree on `timestamp DESC`.
  - `idx_pending_approved`: B-Tree on `approved`.
  - **`idx_pending_unapproved_queue` (Partial Index)**: `CREATE INDEX ... ON pending (timestamp ASC) WHERE approved = 'N'`.
    > *Why this matters in production:* In high-volume setups, 99.9% of posts will eventually be approved. A partial index indexes **only unapproved items**, keeping the active queue index tiny, cacheable in RAM, and executing queries in <1ms.
  - `idx_pending_votes`: Composite index on `(approved, vote_approve DESC, vote_not_approve ASC)`.
  - `idx_pending_post_gin`: GIN index on `post` with `jsonb_path_ops` for fast JSON path lookups.
  - `idx_pending_overall_review_gin`: GIN index on `overall_review` with `jsonb_path_ops`.

### 3. `logs`
Audit log of structured AI-detected brand violations, error categories, and remediation advice.
- **Columns**: `id` (BIGINT PRIMARY KEY IDENTITY), `post` (JSONB NOT NULL), `published_by` (BIGINT NOT NULL REFERENCES users(user_id) ON DELETE RESTRICT), `issue` (JSONB NOT NULL), `created_at` (TIMESTAMPTZ).
- **Indexes**:
  - `idx_logs_published_by`: B-Tree on foreign key.
  - `idx_logs_created_at`: B-Tree on `created_at DESC`.
  - `idx_logs_user_created`: Composite B-Tree `(published_by, created_at DESC)` for auditing an author's violation trajectory over time.
  - `idx_logs_issue_gin`: GIN index using `jsonb_path_ops` on `issue` (e.g. searching `{ "severity": "CRITICAL" }` or `{ "category": "Tone_and_Voice" }`).
  - `idx_logs_post_gin`: GIN index on `post`.

### 4. `actions`
User-level performance scorecards, error rates, and corrective intervention history.
- **Columns**: `id` (BIGINT PRIMARY KEY IDENTITY), `user_id` (BIGINT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE), `user_name` (VARCHAR), `designation` (VARCHAR), `cumulative_report` (JSONB NOT NULL), `updated_at` (TIMESTAMPTZ).
- **Indexes**:
  - `idx_actions_user_id`: B-Tree on `user_id`.
  - `idx_actions_updated_at`: B-Tree on `updated_at DESC`.
  - `idx_actions_report_gin`: GIN index using `jsonb_path_ops` on `cumulative_report`.

### 5. `published`
High-volume catalog of live, verified content distributed across enterprise channels.
- **Columns**: `id` (BIGINT PRIMARY KEY IDENTITY), `post` (JSONB NOT NULL), `timestamp` (TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP).
- **Indexes**:
  - `idx_published_timestamp`: B-Tree on `timestamp DESC` for chronological feed pagination.
  - `idx_published_post_gin`: GIN index using `jsonb_path_ops` on `post` (accelerates `@>` queries for channels, authors, and hashtags).

---

## ⚡ Quickstart & Setup Instructions

### Option A: Using Docker Compose (Recommended for instant setup)
To launch PostgreSQL 16 with the `TrueTone` database, schema, and sample seeds preloaded:

```bash
docker compose up -d
```

Verify that PostgreSQL is healthy on `localhost:5432`:
```bash
docker compose ps
```

### Option B: Local PostgreSQL Installation
If you already have PostgreSQL running locally:

1. **Configure Environment**:
   Edit `.env` (copied from `.env.example`):
   ```env
   PORT=3000
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=TrueTone
   DB_USER=postgres
   DB_PASSWORD=your_password
   ```

2. **Initialize Database and Seed Sample Records**:
   Run the all-in-one setup runner (creates database `TrueTone` if missing, applies `schema.sql`, and populates `seed.sql`):
   ```bash
   npm run db:setup
   ```

   Or run them individually:
   ```bash
   # Run schema migration only
   npm run db:migrate

   # Run sample seed script only
   npm run db:seed
   ```

3. **Start the Node.js Application**:
   ```bash
   npm start
   # or development mode with file watching:
   npm run dev
   ```

4. **Access the Dashboard**:
   Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🧪 Testing Endpoints & Database Verification

You can verify the entire setup and schema constraints by running:
```bash
npm test
```

### Sample Seed Records Available Out of the Box:
- **Users**:
  - Sarah Jenkins (`user_id = 1`) — Senior Content Creator (`can_post = 'Y'`)
  - Michael Chen (`user_id = 2`) — Brand Governance Lead (`can_approve = 'Y'`)
  - Elena Rostova (`user_id = 3`) — Compliance Officer & Auditor (`can_approve = 'Y'`, `can_take_action = 'Y'`)
  - David Miller (`user_id = 4`) — VP Corporate Communications (`can_post = 'Y'`, `can_approve = 'Y'`, `can_take_action = 'Y'`)
- **Pending Posts**: 4 realistic items including AI tone violations, sustainability posts, and developer announcements.
- **AI Audit Logs**: 4 violation records covering *Overpromising Claims*, *Grammar & Syntax Standards*, *Forward-Looking SEC Safe Harbor Disclaimers*, and *WCAG Accessibility Contrast Warnings*.
- **Actions**: Cumulative user reports with pass rates, risk levels, and intervention histories.
- **Published**: 4 multi-channel broadcasts with impression and resonance metrics.

---

## 📡 REST API Reference

### Review Tab (`/api/review`)
- `GET /api/review/pending?status=N` — Retrieves pending review queue (uses partial index `idx_pending_unapproved_queue`).
- `POST /api/review/:id/vote` — Registers approval or rejection vote (`{ "type": "approve" | "not_approve" }`).
- `POST /api/review/:id/approve` — Validates approver authority and atomically moves pending item to `published` inside a database transaction.
- `POST /api/review/submit` — Submits a new post draft into the review queue.

### Publish Tab (`/api/publish`)
- `GET /api/publish` — Lists published posts ordered by `timestamp DESC` (supports `?channel=LinkedIn` and `?search=term`).
- `GET /api/publish/:id` — Retrieves published post by ID.
- `GET /api/publish/metrics/summary` — Returns high-level publishing statistics across channels.
- `POST /api/publish` — Directly creates a published record.

### Logs Tab (`/api/logs`)
- `GET /api/logs` — Retrieves AI brand audit logs joined with author metadata (supports `?severity=CRITICAL` and `?userId=1`).
- `GET /api/logs/stats` — Returns count breakdown by severity and top 5 violation categories.
- `POST /api/logs` — Inserts a new compliance violation log.

### Actions Tab (`/api/actions`)
- `GET /api/actions` — Retrieves cumulative reports for all tracked users.
- `GET /api/actions/user/:userId` — Retrieves action profile for a specific user.
- `POST /api/actions/record` — Records a corrective coaching action or adjusts risk level.

### Users Tab (`/api/users`)
- `GET /api/users` — Lists users with optional `?department=` and permission filters.
- `GET /api/users/departments` — Returns department names with employee and approver counts.
- `GET /api/users/:id` — Retrieves user by ID.
- `POST /api/users` — Creates a new team member.
- `PATCH /api/users/:id/permissions` — Updates `can_post`, `can_approve`, and `can_take_action` flags.

### System Health
- `GET /api/health` — Checks database connectivity, pool latency in milliseconds, table count, and active connections.
