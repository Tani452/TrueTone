# TrueTone DOM Contract & Frozen Selectors

> **CRITICAL ARCHITECTURAL CONTRACT (FROZEN)**  
> **RULE:** Every element ID, selector, class name manipulated via `classList` or `className`, inline `onclick` handler, and `window.*` global documented below is strictly **FROZEN**.  
> You may **ADD** wrapper elements and CSS classes. You may **NOT** rename, delete, or alter anything referenced by JavaScript.

---

## 1. Summary of Global Invariants

### 1.1 Global `window.*` Contract
| Global Property | Source File | Purpose |
| :--- | :--- | :--- |
| `window.TrueTone` | `public/js/app.js` | Core application orchestrator, user state, navigation, modals, toasts |
| `window.publish_tab` | `public/js/tabs/publish.tab.js` | Tab entrypoint for Publish / Ingestion Hub |
| `window.guidelines_tab` | `public/js/tabs/guidelines.tab.js` | Tab entrypoint for Guidelines Directory |
| `window.reviews_tab` | `public/js/tabs/reviews.tab.js` | Tab entrypoint for Review & Voting Queue |
| `window.action_tab` | `public/js/tabs/action.tab.js` | Tab entrypoint for User Performance & Actions |
| `window.ttReviewsPollTimer` | `public/js/app.js`, `public/js/tabs/reviews.tab.js` | 10s queue sync poller interval handle |
| `window.ttCurrentDetailTextIssues` | `public/js/tabs/reviews.tab.js` | Scoped cache for review issue popovers |
| `window.viewGuidelineDocument` | `public/js/tabs/guidelines.tab.js` | Global helper to preview guideline document |
| `window.open_review_detail` | `public/js/tabs/reviews.tab.js` | Navigation helper into submission detail view |
| `window.open_action_detail` | `public/js/tabs/action.tab.js` | Navigation helper into user action report card |
| `window.PublishTab` | `public/js/publish.tab.js` | Legacy module export |
| `window.ReviewTab` | `public/js/review.tab.js` | Legacy module export |
| `window.LogsTab` | `public/js/logs.tab.js` | Legacy module export |
| `window.ActionsTab` | `public/js/actions.tab.js` | Legacy module export |
| `window.UsersTab` | `public/js/users.tab.js` | Legacy module export |

### 1.2 Dynamic Classes Written at Runtime
- `perm-pill active` / `perm-pill inactive` (Written by `app.js` to reflect live user permissions)
- `pulse-dot` / `pulse-dot error` (Written by `app.js` to reflect PostgreSQL connectivity)
- `nav-btn active` (Written by `app.js` to mark active navigation tab)
- `toast` / `toast info` / `toast success` / `toast error` (Created dynamically by `app.js` toast utility)
- `modal-overlay active` (Toggled on `#generic-modal` by `openModal` / `closeModal`)
- `banner-notice success` / `banner-notice warning` / `banner-notice error` / `banner-notice read-only` (Status banners)
- `tt-text-issue` / `tt-text-resolved` (Publish tab inline issue spans)
- `tt-file-badge-issue` / `tt-file-badge-good` (Publish tab attachment state badges)
- `review-pending-card card-pop-in` (Reviews queue incoming live items)

---

## 2. Per-File Contract Specification

### `public/index.html` (Static Base Markup)
- **Container IDs:**
  - `#app-sidebar`
  - `#role-switcher-select`
  - `#user-profile-card`
  - `#user-avatar-initials`
  - `#user-profile-name`
  - `#user-profile-designation`
  - `#user-profile-dept`
  - `#perm-pill-post`
  - `#perm-pill-approve`
  - `#perm-pill-action`
  - `#sidebar-nav-container`
  - `#sidebar-nav-list`
  - `#db-health-dot`
  - `#db-health-status`
  - `#db-health-meta`
  - `#page-title-text`
  - `#top-bar-user-badge`
  - `#global-refresh-btn`
  - `#main-workspace`
  - `#generic-modal`
  - `#modal-title`
  - `#modal-close-btn`
  - `#modal-content`
  - `#toast-container`
- **Classes Expected in Index / Sidebar:**
  - `app-container`, `sidebar`, `brand`, `brand-icon`, `brand-text`
  - `persona-switcher-box`, `sidebar-section-label`, `persona-select`
  - `user-profile-badge`, `user-profile-header`, `user-avatar`, `user-info`, `user-name`, `user-designation`, `user-dept`, `user-permissions-strip`, `perm-pill`, `active`, `inactive`
  - `sidebar-nav`, `nav-menu`, `sidebar-footer`, `db-status-pill`, `pulse-dot`
  - `main-wrapper`, `top-bar`, `top-bar-title`, `top-bar-meta`, `role-tag-pill`, `btn-refresh`, `workspace-viewport`
  - `modal-overlay`, `modal-box`, `modal-header`, `btn-close`

---

### `public/js/app.js`
- **`getElementById` lookups:**
  - `role-switcher-select`
  - `sidebar-nav-list`
  - `user-avatar-initials`
  - `user-profile-name`
  - `user-profile-designation`
  - `user-profile-dept`
  - `perm-pill-post`
  - `perm-pill-approve`
  - `perm-pill-action`
  - `top-bar-user-badge`
  - `tt-review-issue-popover`
  - `nav-btn-${tabId}` (e.g. `nav-btn-publish`, `nav-btn-guidelines`, `nav-btn-reviews`, `nav-btn-action`)
  - `page-title-text`
  - `db-health-dot`
  - `db-health-status`
  - `db-health-meta`
  - `toast-container`
  - `modal-title`
  - `modal-content`
  - `generic-modal`
  - `modal-close-btn`
  - `global-refresh-btn`
- **`querySelector` / `querySelectorAll`:**
  - `.nav-btn`
- **`classList` operations:**
  - `remove('active')` on `.nav-btn`
  - `add('active')` on `#nav-btn-${tabId}`
  - `add('active')` on `#generic-modal`
  - `remove('active')` on `#generic-modal`
- **`className` assignments:**
  - `li.className = 'nav-item'`
  - `pillPost.className = 'perm-pill ' + (active ? 'active' : 'inactive')`
  - `pillApprove.className = 'perm-pill ' + (active ? 'active' : 'inactive')`
  - `pillAction.className = 'perm-pill ' + (active ? 'active' : 'inactive')`
  - `dot.className = 'pulse-dot'` / `'pulse-dot error'`
  - `toast.className = 'toast ' + type`
- **Inline `onclick` emitted:**
  - `window.TrueTone.navigate('publish')`
  - `window.TrueTone.navigate('guidelines')`
  - `window.TrueTone.navigate('reviews')`
  - `window.TrueTone.navigate('action')`
- **`window.*` references:**
  - `window.TrueTone`
  - `window.ttReviewsPollTimer`
  - `window.publish_tab`
  - `window.guidelines_tab`
  - `window.reviews_tab`
  - `window.action_tab`

---

### `public/js/tabs/publish.tab.js`
- **`getElementById` lookups:**
  - `main-workspace`
  - `publish-composer-viewport`
  - `publish-status-banner`
  - `compose-card`
  - `compose-box`
  - `attachment-preview`
  - `compose-toolbar`
  - `add-attachment-btn`
  - `attachment-dropdown`
  - `btn-attach-doc`
  - `btn-attach-img`
  - `btn-attach-vid`
  - `btn-attach-aud`
  - `review-btn`
  - `final-upload-btn`
  - `tt-issue-popover`
  - `tt-file-preview-modal`
  - `tt-modal-close-btn`
  - `tt-modal-file-title`
  - `tt-modal-external-link`
  - `tt-modal-file-body`
  - `btn-popover-accept`
  - `btn-popover-keep`
  - `btn-popover-preview-file`
  - `btn-popover-remove-file`
  - `btn-popover-keep-file`
- **`querySelector` / `querySelectorAll`:**
  - `.btn-remove-bad-file`
  - `.btn-timestamp-seek`
  - `.tt-text-issue, .tt-text-resolved`
  - `.tt-text-issue`
  - `.tt-attachment-chip`
  - `.tt-file-badge-issue, .tt-file-badge-good`
- **`classList` operations:**
  - `toggle('show')` on `#attachment-dropdown`
  - `remove('show')` on `#attachment-dropdown`
  - `add('active')` on `#tt-file-preview-modal`
  - `remove('active')` on `#tt-file-preview-modal`
  - `add('tt-file-issue')` on attachment chip
  - `remove('tt-file-issue')` on attachment chip
- **Dynamic classes in template literals:**
  - `composer-wrapper`, `tab-viewport`, `composer-header`, `composer-header-title`, `ai-disclosure-badge`
  - `attachment-trigger-wrapper`, `dropdown-item`, `btn-primary`, `btn-secondary`
  - `tt-attachment-chip`, `tt-thumb-box`, `tt-chip-info`, `tt-chip-name`, `tt-chip-size`, `tt-chip-remove`
  - `tt-file-badge-issue`, `tt-file-badge-good`, `banner-notice`, `success`, `read-only`
  - `asset-violation-card`, `tag-badge`, `critical`, `btn-remove-bad-file`, `btn-timestamp-seek`
  - `tt-text-issue`, `tt-text-resolved`
  - `popover-header`, `popover-badge`, `popover-problem`, `popover-suggestion-box`, `popover-actions`, `btn-popover-dismiss`, `btn-popover-accept`
  - `file-preview-content`, `file-preview-header`, `btn-close`, `file-preview-body`, `doc-type-icon`
- **`window.*` references:**
  - `window.TrueTone`
  - `window.publish_tab`
  - `window.scrollX`, `window.scrollY`, `window.innerWidth`, `window.innerHeight`

---

### `public/js/tabs/guidelines.tab.js`
- **`getElementById` lookups:**
  - `main-workspace`
  - `guidelines-status-banner`
  - `upload-guidelines-btn`
  - `guidelines-upload-dropdown`
  - `opt-upload-guidelines`
  - `opt-upload-past-publishes`
  - `incompatible-warning-box`
  - `btn-close-warning`
  - `warning-box-message`
  - `warning-box-files-list`
  - `past-publishes-result-container`
  - `active-guidelines-list`
  - `btn-refresh-guidelines-list`
  - `guideline-confirm-modal`
  - `guideline-confirm-body`
  - `modal-btn-confirm-save`
  - `modal-btn-cancel-upload`
  - `modal-cancel-x-btn`
  - `guideline-preview-modal`
  - `doc-modal-title`
  - `doc-modal-meta`
  - `doc-modal-content`
  - `doc-modal-close-btn`
- **`querySelector` / `querySelectorAll`:**
  - `#guideline-confirm-modal, #guideline-preview-modal`
- **`classList` operations:**
  - `toggle('show')` on `#guidelines-upload-dropdown`
  - `remove('show')` on `#guidelines-upload-dropdown`
  - `add('active')` on `#guideline-confirm-modal` / `#guideline-preview-modal`
  - `remove('active')` on `#guideline-confirm-modal` / `#guideline-preview-modal`
- **Inline `onclick` emitted:**
  - `document.getElementById('opt-upload-guidelines').click()`
  - `document.getElementById('opt-upload-past-publishes').click()`
  - `window.viewGuidelineDocument('${file.filename}')`
- **Dynamic classes in template literals:**
  - `tab-viewport`, `guidelines-header-bar`, `guidelines-header-text`, `upload-dropdown-container`
  - `btn-primary`, `btn-secondary`, `btn-close`, `guidelines-dropdown-option`, `guidelines-dropdown-icon`, `guidelines-dropdown-label`, `guidelines-dropdown-subtext`
  - `warning-box-header`, `warning-box-title`, `warning-box-body`, `warning-box-files`
  - `guidelines-directory-section`, `section-title-row`, `guidelines-cards-grid`, `placeholder-card`, `placeholder-badge`
  - `guideline-file-card`, `guideline-file-top`, `guideline-file-badge`, `guideline-file-name`, `guideline-file-meta`, `guideline-file-bottom`
  - `modal-overlay`, `modal-box`, `modal-header`, `status-loading-spinner`, `extracted-preview-card`, `extracted-markdown-viewport`
  - `banner-notice ${type}`
- **`window.*` references:**
  - `window.TrueTone`
  - `window.guidelines_tab`
  - `window.viewGuidelineDocument`

---

### `public/js/tabs/reviews.tab.js`
- **`getElementById` lookups:**
  - `main-workspace`
  - `tt-review-issue-popover`
  - `reviews-queue-grid`
  - `queue-count-display`
  - `pending-card-${record.id}` (dynamic ID per queue card)
  - `pending-card-${prevRecord.id}`
  - `btn-back-to-queue`
  - `btn-demo-finalize-top`
  - `btn-vote-yes`
  - `btn-vote-no`
  - `btn-submit-top-comment`
  - `top-comment-input`
  - `reply-composer-${commentId}` (dynamic reply box ID)
- **`querySelector` / `querySelectorAll`:**
  - `.reviews-filter-btn`
  - `#btn-reset-queue-filter`
  - `.review-pending-card`
  - `.tt-review-text-issue`
  - `.btn-react-like`
  - `.btn-react-dislike`
  - `.btn-reply-toggle`
  - `textarea`
  - `.btn-cancel-reply`
  - `.btn-submit-reply`
- **`classList` operations:**
  - `remove('active')` on `.reviews-filter-btn`
  - `add('active')` on target filter button
- **Inline `onclick` emitted:**
  - `window.open_review_detail(${record.id})`
  - `window.reviews_tab()`
- **Dynamic classes in template literals:**
  - `tab-viewport`, `tab-header`, `pulse-dot`, `reviews-queue-header`, `reviews-filter-group`, `reviews-filter-btn`, `reviews-queue-grid`
  - `review-pending-card`, `card-pop-in`, `tt-queue-empty-state`, `btn-reset-queue-filter`, `btn-back-queue`
  - `tt-countdown-badge`, `open`, `closed`, `review-status-pill`, `approved`, `rejected`, `unapproved`
  - `consensus-bar-wrapper`, `consensus-bar-labels`, `consensus-bar-track`, `consensus-bar-fill-yes`, `consensus-bar-fill-no`
  - `review-card-top`, `review-author-info`, `review-author-avatar`, `review-author-name`, `review-author-meta`
  - `review-card-snippet`, `review-flag-summary`, `review-card-footer`, `btn-secondary`, `btn-primary`
  - `review-detail-header`, `btn-demo-finalize`, `card`, `review-attachments-grid`, `review-attachment-card`, `flagged`, `review-attachment-badge`, `bad`, `clean`, `good`
  - `review-voting-box`, `voting-actions-bar`, `btn-vote`, `btn-vote-yes`, `btn-vote-no`
  - `discussion-section`, `comment-tree`, `form-textarea`, `comment-node`, `comment-header`, `comment-author-badge`, `voter-tag`, `yes`, `no`, `comment-body`, `comment-actions`, `btn-react`, `btn-react-like`, `btn-react-dislike`, `btn-reply-toggle`, `inline-reply-composer`, `btn-cancel-reply`, `btn-submit-reply`, `nested-replies-list`
  - `tt-review-text-issue`, `tt-popover-title`, `tt-popover-rule`, `tt-popover-rec`
- **`window.*` references:**
  - `window.TrueTone`
  - `window.reviews_tab`
  - `window.open_review_detail`
  - `window.ttReviewsPollTimer`
  - `window.ttCurrentDetailTextIssues`
  - `window.innerWidth`, `window.scrollY`

---

### `public/js/tabs/action.tab.js`
- **`getElementById` lookups:**
  - `main-workspace`
  - `actions-header-bar`
  - `run-weekly-analysis-btn`
  - `actions-cards-grid`
  - `actions-count-display`
  - `btn-back-to-actions`
  - `btn-submit-action-comment`
  - `action-comment-input`
  - `tt-review-issue-popover`
- **`querySelector` / `querySelectorAll`:**
  - `.actions-filter-btn`
- **`classList` operations:**
  - `remove('active')` on `.actions-filter-btn`
  - `add('active')` on target filter button
- **Inline `onclick` emitted:**
  - `window.open_action_detail(${item.id})`
  - `window.action_tab()`
- **Dynamic classes in template literals:**
  - `tab-viewport`, `actions-header-bar`, `actions-sync-btn`, `actions-filter-group`, `actions-filter-btn`, `actions-cards-grid`, `action-report-card`
  - `action-status-pill`, `good`, `flagged`, `action-card-top`, `action-card-avatar`, `action-card-headline`, `action-card-metrics`, `action-metric-pill`, `action-violation-pills`, `violation-tag`, `action-card-footer`
  - `action-detail-view`, `btn-back-queue`, `action-detail-profile-banner`, `action-section-card`, `action-section-title`, `audit-evidence-item`, `manager-comment-item`, `form-textarea`, `btn-primary`, `banner-notice`, `read-only`
- **`window.*` references:**
  - `window.TrueTone`
  - `window.action_tab`
  - `window.open_action_detail`

---

### Legacy Files (Loaded by `index.html`, Kept for Test Verification)

#### `public/js/publish.tab.js`
- `getElementById`: `published-posts-container`, `badge-published-count`, `stat-publish-total`, `stat-publish-linkedin`, `stat-publish-twitter`, `publish-search-input`
- `querySelector`: `#publish-channel-pills .filter-pill`
- `windowGlobals`: `window.PublishTab`

#### `public/js/review.tab.js`
- `getElementById`: `review-posts-container`, `badge-pending-count`, `stat-review-pending`, `stat-review-flagged`, `btn-open-submit-modal`, `approve-user-select`, `approve-notes`, `draft-title`, `draft-author`, `draft-channels`, `draft-caption`
- `querySelector`: `#review-filter-pills .filter-pill`
- `windowGlobals`: `window.ReviewTab`

#### `public/js/logs.tab.js`
- `getElementById`: `logs-list-container`, `badge-logs-count`, `stat-logs-critical`, `stat-logs-tone`, `stat-logs-a11y`
- `querySelector`: `#logs-severity-pills .filter-pill`
- `windowGlobals`: `window.LogsTab`

#### `public/js/actions.tab.js`
- `getElementById`: `actions-table-body`, `badge-actions-count`, `stat-actions-users`, `stat-actions-lowrisk`, `stat-actions-interventions`, `action-title-input`, `action-status-input`, `action-risk-input`
- `windowGlobals`: `window.ActionsTab`

#### `public/js/users.tab.js`
- `getElementById`: `users-table-body`, `badge-users-count`, `users-dept-pills`, `btn-open-new-user-modal`, `new-user-name`, `new-user-desig`, `new-user-dept`, `new-user-phone`, `new-user-can-post`, `new-user-can-approve`, `new-user-can-act`
- `querySelector`: `.filter-pill`
- `windowGlobals`: `window.UsersTab`
