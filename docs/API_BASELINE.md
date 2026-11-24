# TrueTone API Baseline & Network Interactions

> **BASELINE SPECIFICATION**  
> Documents the exact method, path, payload, and interaction triggers for every `/api` request fired by the frontend application.  
> Hard Rule 2 & 7: Visual redesign must preserve exact HTTP requests, headers, query parameters, payloads, and response handling.

---

## 1. Global & Orchestration Endpoints

| Trigger | Method | Path | Request Body / Params | Expected Response |
| :--- | :--- | :--- | :--- | :--- |
| **App Startup (`init()`)** | `GET` | `/api/health` | None | `{ status: "healthy", latencyMs: 2, database: "TrueTone", tableCount: 5 }` |
| **Periodic Poller (every 30s)** | `GET` | `/api/health` | None | `{ status: "healthy", latencyMs: 2, ... }` |
| **Global Refresh Button Click (`#global-refresh-btn`)** | `GET` | `/api/health` | None | Checks pool health, re-triggers active tab load |

---

## 2. Publish Tab (`public/js/tabs/publish.tab.js`)

| User Interaction | Method | Path | Request Format | Key Payload Fields | Response Body |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Tab Initial Load** | *None* | — | — | — | Initial blank draft editor (`#compose-box`) rendered purely in DOM |
| **Click "Review with AI" (`#review-btn`)** | `POST` | `/api/review` | `multipart/form-data` | `post`: JSON string (`caption`, `author_id`, `author_name`, `department`)<br>`files`: Array of attached files (doc/img/video/audio) | `{ success: true, review: { status, overall_score, summary, text_issues: [...], file_issues: [...] } }` |
| **Click "Submit for Verification" / "Publish" (`#final-upload-btn`)** | `POST` | `/api/publish-submission` | `multipart/form-data` | `post`: JSON string (`title`, `caption`, `channels`, `tags`, `author_id`, `author_name`, `department`, `resolved_issues`)<br>`files`: Array of verified attached files | `{ success: true, mode: "direct_published" \| "queued_for_approval", data: {...} }` |

---

## 3. Guidelines Tab (`public/js/tabs/guidelines.tab.js`)

| User Interaction | Method | Path | Request Format | Key Payload Fields | Response Body |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Tab Initial Load** | `GET` | `/api/guidelines/list` | JSON Query | None | `{ success: true, files: [{ filename, title, size, modified }, ...] }` |
| **Click Refresh Guidelines (`#btn-refresh-guidelines-list`)** | `GET` | `/api/guidelines/list` | JSON Query | None | Reloads active guideline files list |
| **Click on Guideline Card / Preview** | `GET` | `/api/guidelines/file/:filename` | URL Param | `:filename` (encoded) | `{ success: true, file: { filename, content, size, modified } }` |
| **Select file via "Upload Guideline Document"** | `POST` | `/api/guidelines/validate` | `multipart/form-data` | `file`: candidate `.md` document | `{ success: true, staging_id: "stage_...", validation: { status: "COMPATIBLE" \| "CONTRADICTION", summary, violations } }` |
| **Click "Confirm & Save" in Candidate Modal** | `POST` | `/api/guidelines/save` | `application/json` | `{ staging_id }` | `{ success: true, message: "Guideline committed successfully" }` |
| **Click "Cancel" / Close Candidate Modal** | `DELETE` | `/api/guidelines/stage/:stagingId` | URL Param | `:stagingId` | `{ success: true, message: "Staged file discarded" }` |
| **Select file via "Extract Past Publishes"** | `POST` | `/api/guidelines/extract-past-publishes` | `multipart/form-data` | `file`: `.txt` or `.md` historical posts corpus | `{ success: true, summary: "...", appended_chars: 1240, filename: "past_data_from_reviews.md" }` |

---

## 4. Reviews Tab (`public/js/tabs/reviews.tab.js`)

| User Interaction | Method | Path | Request Format | Key Payload Fields | Response Body |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Tab Initial Load** | `GET` | `/api/pending?filter=all` | URL Query | `filter=all` | `{ success: true, total: 2, data: [{ id, post, vote_approve, vote_not_approve, approved, overall_review, timestamp }, ...] }` |
| **Filter Button Click (`all`, `open`, `approved`, `rejected`)** | `GET` | `/api/pending?filter=:filter` | URL Query | `filter`: string | Filtered queue array |
| **Background Sync Poller (`window.ttReviewsPollTimer`, 10s)** | `GET` | `/api/pending?filter=:currentFilter` | URL Query | Current filter | Live queue array for card diffing & update |
| **Click on Queue Card (`open_review_detail`)** | `GET` | `/api/pending/:id` | URL Param | `:id`: pending submission ID | `{ success: true, post: { id, post, comments, vote_approve, vote_not_approve, ... } }` |
| **Click "Approve" Vote (`#btn-vote-yes`)** | `POST` | `/api/pending/:id/vote` | `application/json` | `{ vote: "yes", user_id, user_name, department }` | `{ success: true, vote_approve, vote_not_approve, consensus_reached }` |
| **Click "Block / Reject" Vote (`#btn-vote-no`)** | `POST` | `/api/pending/:id/vote` | `application/json` | `{ vote: "no", user_id, user_name, department }` | `{ success: true, vote_approve, vote_not_approve, consensus_reached }` |
| **Post Root Comment (`#btn-submit-top-comment`)** | `POST` | `/api/pending/:id/comments` | `application/json` | `{ text, user_id, user_name, department }` | `{ success: true, comments: [...] }` |
| **Post Nested Reply (`.btn-submit-reply`)** | `POST` | `/api/pending/:id/comments/:commentId/reply` | `application/json` | `{ text, user_id, user_name, department }` | `{ success: true, comments: [...] }` |
| **Toggle Reaction on Comment (`.btn-react-*`)** | `POST` | `/api/pending/:id/comments/:commentId/react` | `application/json` | `{ reaction: "like" \| "dislike", user_id }` | `{ success: true, comment: { reactions: { likes, dislikes } } }` |
| **Demo Fast-Forward Finalize (`#btn-demo-finalize-top`)** | `POST` | `/api/pending/:id/finalize-demo` | `application/json` | `{ approved: "Y" \| "N", decision_notes }` | `{ success: true, final_status: "APPROVED" \| "REJECTED" }` |

---

## 5. Actions Tab (`public/js/tabs/action.tab.js`)

| User Interaction | Method | Path | Request Format | Key Payload Fields | Response Body |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Tab Initial Load** | `GET` | `/api/actions` | JSON Query | None | `{ success: true, records: [{ id, user_id, user_name, department, cumulative_report: { summary, error_trends, historical_activity, manager_notes } }, ...] }` |
| **Filter Button Click (`all`, `high-risk`, `clean`)** | *Client filter* | — | — | Filters `cachedData` in DOM | No network request |
| **Click "Run Weekly AI Analysis" (`#run-weekly-analysis-btn`)** | `POST` | `/api/actions/run-weekly-analysis` | `application/json` | `{ days: 7 }` | `{ success: true, analyzed_users: 4, timestamp: "..." }` |
| **Click on User Card (`open_action_detail`)** | `GET` | `/api/actions/:id` | URL Param | `:id`: action report ID | `{ success: true, report: {...}, audit_logs: [{ id, issue, severity, timestamp }, ...] }` |
| **Post Manager Corrective Note (`#btn-submit-action-comment`)** | `POST` | `/api/actions/:id/comments` | `application/json` | `{ comment, author_id, author_name, designation }` | `{ success: true, manager_notes: [...] }` |

---

## 6. Legacy / Compatibility Tab APIs (`public/js/*.tab.js`)

Preserved in repository for backend verification and modular test suite:
- `GET /api/publish`
- `GET /api/publish/metrics/summary`
- `GET /api/publish/:id`
- `GET /api/review/pending`
- `POST /api/review/:id/vote`
- `POST /api/review/:id/approve`
- `POST /api/review/submit`
- `GET /api/logs`
- `GET /api/logs/stats`
- `GET /api/actions`
- `POST /api/actions/record`
- `GET /api/users`
- `GET /api/users/departments`
- `PUT /api/users/:id/permissions`
- `POST /api/users`
