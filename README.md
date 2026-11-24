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

---

## 🎥 Video Audit & Motion Standards Governance (Multimodal Gemini AI)

TrueTone supports full multimodal **Video Auditing** alongside documents/PDFs and visual images in the Publish & Verification Hub. When a video is attached to a draft post, Gemini audits video frames, audio narration, and on-screen text/lower-thirds against the official video guideline: [`guidelines/video_and_motion_standards.md`](file:///c:/Users/Tanishq/Downloads/TrueTone/guidelines/video_and_motion_standards.md).

### 🎬 Gemini Files API Architecture
- **Large Videos (> 15MB)**: Automatically uploaded via `@google/genai` Files API (`ai.files.upload`), polled until in `ACTIVE` state, and passed to Gemini via `fileData: { fileUri, mimeType }`. Uploaded server files are automatically deleted from Google servers in the `finally` block to protect enterprise confidentiality.
- **Small Videos (<= 15MB)**: Streamlined via in-memory base64 `inlineData` for rapid verification turnaround.
- **Configurable Size Limits**: Regulated via the `MAX_VIDEO_MB` environment variable (default: `100MB`).
- **Supported Video MIME Types**: `video/mp4`, `video/quicktime` (.mov), `video/webm`, `video/mpeg`, `video/x-msvideo` (.avi).

### 📋 Video Guidelines & Rule Identifiers (`VID-01` to `VID-09`)
All video audits are strictly grounded in [`guidelines/video_and_motion_standards.md`](file:///c:/Users/Tanishq/Downloads/TrueTone/guidelines/video_and_motion_standards.md):
- `VID-01`: **Brand Identity & Logo Safe Zones** — Opening/closing end cards, safe zone margins, no distorted/stretched emblems.
- `VID-02`: **Color & Typography** — On-screen graphics, lower-thirds, and titles must use official palette (#0A0F1D, #06B6D4); no off-palette neon overlays.
- `VID-03`: **Spoken & On-Screen Claims** — Narration and titles must follow approved facts; no absolute claims ("100% infallible").
- `VID-04`: **Tone & Enterprise Dignity** — Voiceover must adhere to brand dignity; no retail clickbait ("Buy now!!", "Crazy deals").
- `VID-05`: **Compliance & Safe Harbor Disclaimers** — Forward-looking statements require on-screen Safe Harbor note for >= 3 seconds.
- `VID-06`: **Accessibility & Motion Safety** — Subtitles required for spoken audio; WCAG 2.2 AA contrast; no flashing > 3 times/sec (WCAG 2.3.1).
- `VID-07`: **Confidentiality & Privacy** — No visible internal dashboards, customer PII, unreleased code, or unconsented faces.
- `VID-08`: **Third-Party Licensing & IP** — No unlicensed stock audio, competitor logos, or copyrighted tracks.
- `VID-09`: **Format & Channel Constraints** — Aspect ratios and durations tailored per channel (16:9, 1:1, 9:16).

### 🧩 Extended Review Schema & Interactive UI
Each flagged video item in `bad_files` produces:
```json
{
  "file_name": "product_demo.mp4",
  "media_type": "video",
  "rule_id": "VID-03",
  "guideline_source": "guidelines/video_and_motion_standards.md",
  "problem": "Narration asserts absolute 100% infallible guarantee at 00:08.",
  "suggestion": "Revise script to reference 99.9% consistency across enterprise corpora.",
  "findings": [
    {
      "timestamp_start": "00:05",
      "timestamp_end": "00:12",
      "category": "claim",
      "description": "Voiceover states 'our engine never makes a single mistake'.",
      "evidence": "Spoken audio: 'never makes a single mistake'",
      "suggested_fix": "State: 'engineered for 99.9% accuracy across enterprise workloads'"
    }
  ]
}
```
- **Clickable Timestamp Seeking**: In the **Asset Violation Card**, clicking any timestamp badge (`⏱️ MM:SS - MM:SS`) immediately seeks the video preview player directly to that frame.
- **Server-Side Publishing Enforcement**: Posts with unresolved video violations or unreviewed videos are strictly prevented from direct publish (`POST /api/publish` returns HTTP 400) and routed to the **Pending Review Queue**.
- **Offline Fallback Guarantee**: If Gemini inference is unreachable, TrueTone marks attached videos as "unverified" (`VID-REVIEW`) and forces human governance review. Unreviewed videos are never silently published.

### ⚠️ Known Limitations & AI Disclosure
1. **Clip Length & Sampling Rate**: Videos longer than 5 minutes or exceeding `MAX_VIDEO_MB` should be segmented. Gemini processes sampled frames; extremely brief single-frame glitches (< 0.1s) may occasionally escape automated detection.
2. **Human Governance Requirement**: TrueTone operates under a "Human-in-the-Loop" architecture. AI warnings and violation cards provide governance guidance, but final dispatches and exceptions require human review and consensus voting.
3. **Disclosure**: Video audits utilize Google Gemini Multimodal APIs assisted by Antigravity-designed code.

---

## 🎵 Audio Audit & Acoustic Voice Standards Governance (Multimodal Gemini AI)

TrueTone supports full multimodal **Audio Auditing** alongside documents/PDFs, visual images, and video assets in the Publish & Verification Hub. When an audio file (podcast, voice memo, announcement, interview) is attached, Gemini listens to narration, acoustic delivery, sound quality, and background tracks against the official audio guideline: [`guidelines/audio_and_voice_standards.md`](file:///c:/Users/Tanishq/Downloads/TrueTone/guidelines/audio_and_voice_standards.md).

### 🎙️ Gemini Files API & Inline Architecture
- **Large Audio (> 15MB)**: Automatically uploaded via `@google/genai` Files API (`ai.files.upload`), polled until `ACTIVE`, and passed to Gemini via `fileData: { fileUri, mimeType }`. Uploaded server files are automatically cleaned up from Google servers in the `finally` block to protect enterprise confidentiality.
- **Small Audio (<= 15MB)**: Streamlined via in-memory base64 `inlineData` for rapid acoustic verification turnaround.
- **Configurable Size Limits**: Regulated via the `MAX_AUDIO_MB` environment variable (default: `50MB`).
- **Supported Audio MIME Types**: `audio/mpeg` (.mp3), `audio/wav`, `audio/x-wav`, `audio/mp4`, `audio/x-m4a`, `audio/aac`, `audio/ogg`, `audio/flac`, `audio/webm`.

### 📋 Audio Guidelines & Rule Identifiers (`AUD-01` to `AUD-10`)
All audio audits are strictly grounded in [`guidelines/audio_and_voice_standards.md`](file:///c:/Users/Tanishq/Downloads/TrueTone/guidelines/audio_and_voice_standards.md):
- `AUD-01`: **Brand Voice & Measured Tone** — Voiceover must maintain dignified enterprise tone; probabilistic framing; no clickbait or retail urgency ("Act now!", "Limited time").
- `AUD-02`: **Claims & Verifiable Benchmarks** — Spoken claims must match approved corporate facts; no absolute claims ("100% guaranteed", "never fails").
- `AUD-03`: **Brand Nomenclature & Pronunciation** — "TrueTone" pronounced clearly in CamelCase; no outdated product or feature names.
- `AUD-04`: **Statutory Safe Harbor Compliance** — Forward-looking statements require a clearly spoken Section 27A Safe Harbor disclaimer at normal conversational pace.
- `AUD-05`: **Confidentiality & Non-Disclosure** — No spoken internal codenames, unreleased metrics, customer PII, or internal credentials.
- `AUD-06`: **Accessibility & Transcription** — Spoken audio must include an accompanying transcription; speech must remain intelligible above background tracks.
- `AUD-07`: **Acoustic Quality & Loudness** — Clean acoustic mastering; no clipping, heavy distortion, abrupt volume spikes, or extended dead air.
- `AUD-08`: **Licensing, Music & Voice Rights** — No unlicensed copyrighted music beds, jingles, or unconsented voice synthesis/cloning.
- `AUD-09`: **Language, Conduct & Non-Discrimination** — Professional delivery free from profanity, bias, harassment, or derogatory remarks.
- `AUD-10`: **Channel Format & Duration** — Audio lengths tailored per medium: Podcasts (up to 45 mins), LinkedIn audio (up to 5 mins), Social/Press (short clips).

### 🧩 Extended Review Schema with Acoustic Findings & Transcript
Each flagged audio item in `bad_files` produces:
```json
{
  "file_name": "executive_podcast_q3.mp3",
  "media_type": "audio",
  "rule_id": "AUD-02",
  "guideline_source": "guidelines/audio_and_voice_standards.md",
  "problem": "Spoken dialogue claims '100% infallible tone protection' at 00:04.",
  "suggestion": "Re-record or edit phrase to state 'engineered for 99.9% consistency'.",
  "transcript": "Welcome to TrueTone. Our platform never makes a single mistake and is 100% infallible.",
  "findings": [
    {
      "timestamp_start": "00:03",
      "timestamp_end": "00:07",
      "category": "claim",
      "description": "Speaker states 'never makes a single mistake and is 100% infallible'.",
      "evidence": "Spoken audio: '100% infallible'",
      "suggested_fix": "State 'engineered for 99.9% consistency'"
    }
  ]
}
```
- **Inline `<audio>` Chips & Interactive Preview**: Attached audio chips include an inline audio player for immediate scrubbing. Clicking the chip opens the expanded modal player.
- **Clickable Timestamp Seeking**: In the **Asset Violation Card**, clicking `⏱️ MM:SS - MM:SS (Seek Audio)` instantly seeks the player to the exact second of violation.
- **Collapsible Transcript**: Creators and reviewers can inspect the full transcribed speech directly within the violation card or the Pending Review drawer.
- **Server-Side Enforcement**: Unresolved audio issues block direct publishing (`POST /api/publish` returns HTTP 400) and automatically route posts to the **Pending Review Queue**.
- **Offline Fallback Guarantee**: If Gemini inference is offline or rate-limited, TrueTone flags attached audio with rule `AUD-REVIEW` ("Audio could not be AI-reviewed; manual review required") and forces human governance review.

### ⚠️ Audio Limitations & Governance
1. **Accents & Background Noise**: Very heavy acoustic background noise or low-quality microphone audio may affect Gemini transcription precision.
2. **Human-in-the-Loop**: AI acoustical audits assist creators and editors; final publishing decisions and policy exemptions remain with designated human governance officers.


#### In the Actions tab the employee data gets updated only after clicking the "Run Weekly AI Analysis" button.
