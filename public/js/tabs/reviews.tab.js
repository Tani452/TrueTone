/**
 * =============================================================================
 * TrueTone Tab Module: REVIEW (reviews_tab)
 * Collaborative Brand Governance Review Queue, 5-Day Peer Voting Engine,
 * Problematic Text / File Highlighting with Floating Popovers, and Threaded Discussions.
 * =============================================================================
 */

(function () {
    // Scoped state for Reviews workspace
    let knownPendingIds = new Set();
    let currentFilter = 'all'; // 'all' | 'open' | 'approved' | 'rejected'
    let activeDetailPendingId = null;
    let isInitialLoad = true;

    // Helper: Escape HTML to avoid XSS
    function escapeHtml(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    // Helper: Format countdown badge string
    function formatCountdown(record) {
        if (!record.is_voting_open) {
            return `<span class="tt-countdown-badge closed">Voting Concluded</span>`;
        }

        const remainingMs = record.time_remaining_ms || 0;
        const totalHours = Math.floor(remainingMs / (1000 * 60 * 60));
        const days = Math.floor(totalHours / 24);
        const hours = totalHours % 24;

        if (days > 0) {
            return `<span class="tt-countdown-badge open">${days}d ${hours}h remaining</span>`;
        } else if (hours > 0) {
            return `<span class="tt-countdown-badge open">${hours}h remaining</span>`;
        } else {
            const minutes = Math.floor(remainingMs / (1000 * 60));
            return `<span class="tt-countdown-badge open">${minutes}m remaining</span>`;
        }
    }

    // Helper: Render status pill
    function formatStatusPill(status) {
        const s = (status || 'UNAPPROVED').toUpperCase();
        if (s === 'APPROVED') {
            return `<span class="review-status-pill approved">Approved & Published</span>`;
        } else if (s === 'REJECTED') {
            return `<span class="review-status-pill rejected">Rejected & Blocked</span>`;
        } else {
            return `<span class="review-status-pill unapproved">Pending Review</span>`;
        }
    }

    // Helper: Calculate split consensus percentages
    function renderConsensusBar(yesCount = 0, noCount = 0) {
        const total = yesCount + noCount;
        let yesPercent = 0;
        let noPercent = 0;

        if (total === 0) {
            yesPercent = 0;
            noPercent = 0;
        } else {
            yesPercent = Math.round((yesCount / total) * 100);
            noPercent = 100 - yesPercent;
        }

        return `
            <div class="consensus-bar-wrapper">
                <div class="consensus-bar-labels">
                    <span class="consensus-label-yes">${yesCount} Yes</span>
                    <span class="consensus-label-no">${noCount} No</span>
                </div>
                <div class="consensus-bar-track">
                    <div class="consensus-bar-fill-yes" style="width: ${yesPercent}%;"></div>
                    <div class="consensus-bar-fill-no" style="width: ${noPercent}%;"></div>
                </div>
            </div>
        `;
    }

    // Helper: Safely wrap unresolved text issues into interactive spans
    function highlightProblematicText(fullText, textIssues) {
        if (!fullText) return '<span class="review-empty-text">(No text content provided)</span>';
        if (!Array.isArray(textIssues) || textIssues.length === 0) {
            return escapeHtml(fullText);
        }

        // Store issues globally on window for popover access
        window.ttCurrentDetailTextIssues = textIssues;

        // Sort issues by length of matched_text descending to avoid nested partial overwrites
        const sortedIssues = textIssues
            .map((issue, idx) => ({ ...issue, origIdx: idx }))
            .filter(issue => issue.matched_text && issue.matched_text.trim())
            .sort((a, b) => b.matched_text.length - a.matched_text.length);

        let result = escapeHtml(fullText);

        for (const item of sortedIssues) {
            const escapedPattern = escapeHtml(item.matched_text);
            // Replace first occurrence of exact matched string with data marker
            const marker = `__TT_ISSUE_MARKER_${item.origIdx}__`;
            result = result.replace(escapedPattern, marker);
        }

        // Replace markers with final spans
        for (const item of sortedIssues) {
            const marker = `__TT_ISSUE_MARKER_${item.origIdx}__`;
            const span = `<span class="tt-review-text-issue" data-issue-idx="${item.origIdx}">${escapeHtml(item.matched_text)}</span>`;
            result = result.split(marker).join(span);
        }

        return result;
    }

    // Ensure popover singleton exists on body
    function getOrCreatePopover() {
        let popover = document.getElementById('tt-review-issue-popover');
        if (!popover) {
            popover = document.createElement('div');
            popover.id = 'tt-review-issue-popover';
            document.body.appendChild(popover);
        }
        return popover;
    }

    // Attach hover/click handlers to issue spans inside container
    function setupIssuePopovers(container) {
        const popover = getOrCreatePopover();
        const spans = container.querySelectorAll('.tt-review-text-issue');

        spans.forEach(span => {
            span.addEventListener('mouseenter', (e) => {
                const idx = parseInt(span.getAttribute('data-issue-idx'), 10);
                const issue = window.ttCurrentDetailTextIssues && window.ttCurrentDetailTextIssues[idx];
                if (!issue) return;

                const severity = (issue.severity || 'WARNING').toUpperCase();

                popover.innerHTML = `
                    <div class="tt-popover-title">
                        <span class="popover-sev-tag ${severity.toLowerCase()}">[${severity}]</span>
                        <span>Brand Guideline Issue</span>
                    </div>
                    <div class="tt-popover-rule">${escapeHtml(issue.issue || issue.rule || 'Deviation from approved tone/brand standard')}</div>
                    ${issue.recommendation ? `
                        <div class="tt-popover-rec">
                            <strong>Recommended:</strong> "${escapeHtml(issue.recommendation)}"
                        </div>
                    ` : ''}
                `;

                const rect = span.getBoundingClientRect();
                const popoverWidth = 320;
                let left = rect.left;
                if (left + popoverWidth > window.innerWidth - 20) {
                    left = window.innerWidth - popoverWidth - 20;
                }
                if (left < 10) left = 10;

                popover.style.left = `${left}px`;
                popover.style.top = `${rect.bottom + 8 + window.scrollY}px`;
                popover.style.display = 'block';
            });

            span.addEventListener('mouseleave', () => {
                popover.style.display = 'none';
            });
        });
    }

    /**
     * Build Pending Card DOM element
     */
    function createPendingCardElement(record, isNew = false) {
        const card = document.createElement('div');
        card.className = `review-pending-card ${isNew ? 'card-pop-in' : ''}`;
        card.id = `pending-card-${record.id}`;
        card.setAttribute('data-id', record.id);

        const post = record.post || {};
        const authorName = post.author_name || `User #${post.submitted_by || record.id}`;
        const department = post.department || 'Content';
        const designation = post.designation || 'Staff';
        const authorInitials = authorName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

        const rawSnippet = post.text ? post.text.trim() : (post.files && post.files.length > 0 ? '[Media Attachment Announcement]' : 'No description provided.');
        const snippet = rawSnippet.length > 150 ? rawSnippet.substring(0, 150) + '...' : rawSnippet;

        const rev = record.overall_review || {};
        const issues = rev.unresolved_issues || {};
        const textIssuesCount = Array.isArray(issues.text) ? issues.text.length : 0;
        const badFilesCount = Array.isArray(issues.bad_files) ? issues.bad_files.length : 0;

        card.innerHTML = `
            <div class="review-card-top">
                <div class="review-author-info">
                    <div class="review-author-avatar">${authorInitials}</div>
                    <div class="review-author-text">
                        <div class="review-author-name">${escapeHtml(authorName)}</div>
                        <div class="review-author-meta">${escapeHtml(department)} • ${escapeHtml(designation)} • ${new Date(record.timestamp).toLocaleDateString()}</div>
                    </div>
                </div>
                <div class="review-card-badges">
                    ${formatStatusPill(record.status)}
                    ${formatCountdown(record)}
                </div>
            </div>

            <div class="review-card-snippet">${escapeHtml(snippet)}</div>

            ${(textIssuesCount > 0 || badFilesCount > 0) ? `
                <div class="review-flag-summary">
                    <span class="review-flag-label">AI Detected Issues:</span>
                    ${textIssuesCount > 0 ? `<strong>${textIssuesCount} Text Issue${textIssuesCount > 1 ? 's' : ''}</strong>` : ''}
                    ${(textIssuesCount > 0 && badFilesCount > 0) ? `<span class="review-flag-dot">•</span>` : ''}
                    ${badFilesCount > 0 ? `<strong>${badFilesCount} Flagged File${badFilesCount > 1 ? 's' : ''}</strong>` : ''}
                </div>
            ` : `
                <div class="review-flag-summary clean">
                    Standard review queue submission
                </div>
            `}

            <div class="review-card-footer">
                ${renderConsensusBar(record.vote_approve, record.vote_not_approve)}
                <div class="review-card-footer-right">
                    <span class="review-comments-pill">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                        <span>${record.total_comments || 0}</span>
                    </span>
                    <button class="btn-secondary" onclick="window.open_review_detail('${record.id}')">
                        Inspect & Vote &rarr;
                    </button>
                </div>
            </div>
        `;

        card.onclick = (e) => {
            // Prevent double triggers if clicking button directly
            if (e.target.tagName !== 'BUTTON') {
                window.open_review_detail(record.id);
            }
        };

        return card;
    }

    /**
     * Render Queue View
     */
    async function renderQueueView() {
        activeDetailPendingId = null;
        const workspace = document.getElementById('main-workspace');
        if (!workspace) return;

        workspace.innerHTML = `
            <div class="tab-viewport" id="reviews-tab-container">
                <!-- Header -->
                <div class="tab-header review-queue-header-area">
                    <div>
                        <h2>Brand Governance Review Queue</h2>
                        <p>Collaborative peer review for content flagged with unresolved brand guideline issues.</p>
                    </div>
                    <div class="queue-live-status-pill">
                        <span class="pulse-dot"></span>
                        <span>Live Queue Synced</span>
                    </div>
                </div>

                <!-- Filter Controls -->
                <div class="reviews-queue-header">
                    <div class="reviews-filter-group" role="tablist" aria-label="Review Queue Filter">
                        <button class="reviews-filter-btn ${currentFilter === 'all' ? 'active' : ''}" data-filter="all" role="tab" aria-selected="${currentFilter === 'all'}">All Submissions</button>
                        <button class="reviews-filter-btn ${currentFilter === 'open' ? 'active' : ''}" data-filter="open" role="tab" aria-selected="${currentFilter === 'open'}">Under Review</button>
                        <button class="reviews-filter-btn ${currentFilter === 'approved' ? 'active' : ''}" data-filter="approved" role="tab" aria-selected="${currentFilter === 'approved'}">Approved</button>
                        <button class="reviews-filter-btn ${currentFilter === 'rejected' ? 'active' : ''}" data-filter="rejected" role="tab" aria-selected="${currentFilter === 'rejected'}">Blocked</button>
                    </div>
                    <div class="queue-count-display" id="queue-count-display">
                        Loading pending queue...
                    </div>
                </div>

                <!-- Queue Cards List -->
                <div class="reviews-queue-grid" id="reviews-queue-grid">
                    <div class="queue-loading-state">
                        Fetching queue records from PostgreSQL...
                    </div>
                </div>
            </div>
        `;

        // Bind filter tab buttons
        const filterBtns = workspace.querySelectorAll('.reviews-filter-btn');
        filterBtns.forEach(btn => {
            btn.addEventListener('click', async () => {
                const targetFilter = btn.getAttribute('data-filter');
                filterBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                currentFilter = targetFilter;
                await fetchAndDisplayQueue(true);
            });
        });

        // Initial fetch
        await fetchAndDisplayQueue(true);
    }

    /**
     * Fetch and render queue items (used initially, upon filter changes, and during background poll)
     * @param {boolean} isReset - When true, cleanly clears grid and rebuilds DOM for initial load or filter switch
     */
    async function fetchAndDisplayQueue(isReset = false) {
        if (activeDetailPendingId !== null) return; // Do not overwrite if user is inspecting detail

        const grid = document.getElementById('reviews-queue-grid');
        const countDisplay = document.getElementById('queue-count-display');
        if (!grid) return;

        try {
            const res = await fetch(`/api/pending?filter=${encodeURIComponent(currentFilter)}`);
            const json = await res.json();
            if (!json.success) throw new Error(json.error || 'Failed to fetch queue');

            const items = json.data || [];
            if (countDisplay) {
                countDisplay.textContent = `Showing ${items.length} item${items.length === 1 ? '' : 's'}`;
            }

            if (items.length === 0) {
                const filterLabels = {
                    all: 'All Submissions',
                    open: 'Under Review',
                    approved: 'Approved',
                    rejected: 'Blocked'
                };
                const activeLabel = filterLabels[currentFilter] || currentFilter;

                grid.innerHTML = `
                    <div class="tt-queue-empty-state">
                        <div class="empty-state-icon" aria-hidden="true">
                            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></svg>
                        </div>
                        <h3>Queue is Clean</h3>
                        <p class="empty-state-desc">
                            No submissions matching filter: <strong>"${escapeHtml(activeLabel)}"</strong>.
                        </p>
                        ${currentFilter !== 'all' ? `
                            <button type="button" class="btn-reset-queue-filter btn-secondary" id="btn-reset-queue-filter">
                                &larr; View All Submissions
                            </button>
                        ` : ''}
                    </div>
                `;

                const resetBtn = grid.querySelector('#btn-reset-queue-filter');
                if (resetBtn) {
                    resetBtn.addEventListener('click', () => {
                        const allBtn = document.querySelector('.reviews-filter-btn[data-filter="all"]');
                        if (allBtn) {
                            allBtn.click();
                        } else {
                            currentFilter = 'all';
                            fetchAndDisplayQueue(true);
                        }
                    });
                }
                return;
            }

            // Check if grid is currently empty or showing the placeholder
            const hasExistingCards = grid.querySelector('.review-pending-card') !== null;

            if (isReset || !hasExistingCards) {
                grid.innerHTML = '';
                knownPendingIds.clear();
                items.forEach(record => {
                    const idStr = String(record.id);
                    knownPendingIds.add(idStr);
                    const card = createPendingCardElement(record, false);
                    grid.appendChild(card);
                });
            } else {
                // Background polling sync: check for brand-new items vs existing updates
                const fetchedIds = new Set(items.map(it => String(it.id)));

                // 1. Remove cards that are no longer part of this filtered view
                const currentCards = grid.querySelectorAll('.review-pending-card');
                currentCards.forEach(card => {
                    const cardId = card.getAttribute('data-id');
                    if (cardId && !fetchedIds.has(String(cardId))) {
                        card.remove();
                        knownPendingIds.delete(String(cardId));
                    }
                });

                // 2. Re-check if removal left grid empty
                if (grid.querySelectorAll('.review-pending-card').length === 0 && items.length === 0) {
                    return;
                }

                // 3. Update existing cards or prepend brand-new records
                for (let i = 0; i < items.length; i++) {
                    const record = items[i];
                    const idStr = String(record.id);
                    const existingCard = document.getElementById(`pending-card-${record.id}`);

                    if (!existingCard) {
                        // Brand-new record
                        knownPendingIds.add(idStr);
                        const newCard = createPendingCardElement(record, true);
                        if (i === 0) {
                            grid.insertBefore(newCard, grid.firstChild);
                        } else {
                            const prevRecord = items[i - 1];
                            const prevCard = prevRecord ? document.getElementById(`pending-card-${prevRecord.id}`) : null;
                            if (prevCard && prevCard.nextSibling) {
                                grid.insertBefore(newCard, prevCard.nextSibling);
                            } else {
                                grid.appendChild(newCard);
                            }
                        }

                        const author = (record.post && record.post.author_name) || 'Author';
                        if (window.TrueTone && typeof window.TrueTone.showToast === 'function') {
                            window.TrueTone.showToast(`New flagged post submitted for governance review by ${author}`, 'info');
                        }
                    } else {
                        // In-place update of vote counts and status without losing scroll
                        const updatedCard = createPendingCardElement(record, false);
                        existingCard.replaceWith(updatedCard);
                        knownPendingIds.add(idStr);
                    }
                }
            }
        } catch (err) {
            console.error('[REVIEWS-QUEUE-FETCH-ERROR]', err);
            if (isReset && grid) {
                grid.innerHTML = `<div class="review-error-banner">Error loading queue: ${escapeHtml(err.message)}</div>`;
            }
        }
    }

    /**
     * PART 2: DETAILED POST INSPECTION VIEW
     */
    async function open_review_detail(pendingId) {
        activeDetailPendingId = pendingId;
        const workspace = document.getElementById('main-workspace');
        if (!workspace) return;

        workspace.innerHTML = `
            <div class="tab-viewport">
                <div class="queue-loading-state">
                    Loading detailed submission #${pendingId}...
                </div>
            </div>
        `;

        try {
            const res = await fetch(`/api/pending/${pendingId}`);
            const json = await res.json();
            if (!json.success) throw new Error(json.error || `Failed to fetch post #${pendingId}`);

            const record = json.data;
            renderDetailWorkspace(record);
        } catch (err) {
            workspace.innerHTML = `
                <div class="tab-viewport">
                    <button class="btn-back-queue btn-secondary" onclick="window.reviews_tab()">&larr; Back to Queue</button>
                    <div class="review-error-banner">Failed to load inspection view: ${escapeHtml(err.message)}</div>
                </div>
            `;
        }
    }

    /**
     * Render Detail Workspace
     */
    function renderDetailWorkspace(record) {
        const workspace = document.getElementById('main-workspace');
        if (!workspace) return;

        const post = record.post || {};
        const rev = record.overall_review || {};
        const issues = rev.unresolved_issues || {};
        const textIssues = issues.text || [];
        const badFiles = issues.bad_files || [];
        const goodFiles = issues.good_files || [];

        const currentUser = window.TrueTone ? window.TrueTone.currentUser : { user_id: 1, can_approve: 'N' };
        const canApprove = currentUser.can_approve === 'Y';
        const voters = rev.voters || {};
        const userVote = voters[currentUser.user_id] || null;
        const isVotingOpen = record.is_voting_open;

        const container = document.createElement('div');
        container.className = 'tab-viewport review-detail-view';

        container.innerHTML = `
            <!-- Navigation & Actions Header -->
            <div class="review-detail-header">
                <div class="review-detail-header-left">
                    <button class="btn-back-queue" id="btn-back-to-queue">
                        &larr; Back to Review Queue
                    </button>
                    <div class="review-detail-header-meta">
                        <h2>Submission #${record.id} Review</h2>
                        <div class="review-detail-submeta">
                            Author: <strong>${escapeHtml(post.author_name || 'Staff')}</strong> (${escapeHtml(post.department || 'General')} • ${escapeHtml(post.designation || 'Staff')}) • Submitted: ${new Date(record.timestamp).toLocaleString()}
                        </div>
                    </div>
                </div>

                <div class="review-detail-header-right">
                    ${formatStatusPill(record.status)}
                    ${formatCountdown(record)}
                </div>
            </div>

            <!-- Two-Column Workspace Layout (>=1100px) -->
            <div class="review-detail-workspace-layout">
                <!-- LEFT COLUMN: Reading surface, Attachments, Comments -->
                <div class="review-detail-primary-col">
                    <!-- Content Inspection Card: Text with Highlighted Issues -->
                    <div class="card review-reading-surface-card">
                        <div class="review-reading-surface-header">
                            <h3 class="review-section-title">
                                <span>Post Content Inspection</span>
                                ${textIssues.length > 0 ? `<span class="review-issues-flag-badge">${textIssues.length} Violation${textIssues.length > 1 ? 's' : ''} Flagged</span>` : ''}
                            </h3>
                            <span class="review-surface-caption">Hover highlighted phrases to inspect AI recommendation</span>
                        </div>

                        <div id="detail-highlighted-content" class="review-reading-surface">
                            ${highlightProblematicText(post.text, textIssues)}
                        </div>
                    </div>

                    <!-- Attachments Inspection: Clean vs Flagged Files -->
                    ${Array.isArray(post.files) && post.files.length > 0 ? `
                        <div class="card review-attachments-card">
                            <h3 class="review-section-title">
                                <span>Attached Media & Visuals (${post.files.length})</span>
                            </h3>
                            <div class="review-attachments-grid">
                                ${post.files.map(f => {
                                    // Check if file is flagged in bad_files
                                    const badMatch = badFiles.find(bf => {
                                        const bName = (bf.file_name || bf.filename || '').toLowerCase().trim();
                                        const oName = (f.original_name || '').toLowerCase().trim();
                                        const sName = (f.stored_name || '').toLowerCase().trim();
                                        return bName === oName || bName === sName || (f.url && f.url.toLowerCase().includes(bName));
                                    });
                                    const isImage = f.mime_type && f.mime_type.startsWith('image/');
                                    const isVideo = (f.media_type === 'video') || (f.mime_type && f.mime_type.startsWith('video/')) ||
                                        ['.mp4', '.mov', '.webm', '.mpeg', '.avi'].some(ext => (f.original_name || '').toLowerCase().endsWith(ext));
                                    const isAudio = (f.media_type === 'audio') || (f.mime_type && f.mime_type.startsWith('audio/')) ||
                                        ['.mp3', '.wav', '.m4a', '.aac', '.ogg', '.flac'].some(ext => (f.original_name || '').toLowerCase().endsWith(ext));

                                    if (badMatch) {
                                        const findings = Array.isArray(badMatch.findings) ? badMatch.findings : [];
                                        const ruleId = badMatch.rule_id || (isVideo ? 'VID-01' : (isAudio ? 'AUD-01' : 'VIS-01'));

                                        return `
                                            <div class="review-attachment-card flagged">
                                                <div class="attachment-header-row">
                                                    <span class="review-attachment-badge bad">${isVideo ? 'Video Guideline Issue' : isAudio ? 'Audio Guideline Issue' : 'Guideline Issue'}</span>
                                                    <span class="attachment-rule-tag">[${escapeHtml(ruleId)}]</span>
                                                </div>
                                                ${isVideo ? `
                                                    <div class="attachment-media-frame video">
                                                        <video controls src="${f.url}" preload="metadata"></video>
                                                    </div>
                                                ` : isAudio ? `
                                                    <div class="attachment-media-frame audio">
                                                        <audio controls src="${f.url}" preload="metadata"></audio>
                                                    </div>
                                                ` : isImage ? `
                                                    <div class="attachment-media-frame image">
                                                        <img src="${f.url}" alt="${escapeHtml(f.original_name)}">
                                                    </div>
                                                ` : `
                                                    <div class="attachment-media-frame doc">
                                                        📄 ${escapeHtml(f.original_name)}
                                                    </div>
                                                `}
                                                <div class="attachment-file-name">
                                                    ${escapeHtml(f.original_name)}
                                                </div>
                                                <div class="attachment-issue-desc">
                                                    ${escapeHtml(badMatch.problem || badMatch.issue || badMatch.rule || 'Brand rule violation detected')}
                                                </div>
                                                ${badMatch.transcript ? `
                                                    <details class="attachment-transcript-box">
                                                        <summary>Transcript</summary>
                                                        <div class="transcript-content">${escapeHtml(badMatch.transcript)}</div>
                                                    </details>
                                                ` : ''}
                                                ${findings.length > 0 ? `
                                                    <div class="attachment-findings-box">
                                                        <div class="findings-heading">Findings (${findings.length})</div>
                                                        ${findings.map(finding => `
                                                            <div class="finding-item">
                                                                <strong>[${escapeHtml(finding.timestamp_start)}-${escapeHtml(finding.timestamp_end)}] ${escapeHtml(finding.category)}:</strong> ${escapeHtml(finding.description)}
                                                            </div>
                                                        `).join('')}
                                                    </div>
                                                ` : ''}
                                                <div class="attachment-card-footer">
                                                    <a href="${f.url}" target="_blank" class="attachment-view-link">View Full Attachment &nearr;</a>
                                                </div>
                                            </div>
                                        `;
                                    } else {
                                        return `
                                            <div class="review-attachment-card clean">
                                                <div class="attachment-header-row">
                                                    <span class="review-attachment-badge good">${isVideo ? '✓ Passed Video Standards' : isAudio ? '✓ Passed Audio Standards' : '✓ Passed AI Check'}</span>
                                                </div>
                                                ${isVideo ? `
                                                    <div class="attachment-media-frame video">
                                                        <video controls src="${f.url}" preload="metadata"></video>
                                                    </div>
                                                ` : isAudio ? `
                                                    <div class="attachment-media-frame audio">
                                                        <audio controls src="${f.url}" preload="metadata"></audio>
                                                    </div>
                                                ` : isImage ? `
                                                    <div class="attachment-media-frame image">
                                                        <img src="${f.url}" alt="${escapeHtml(f.original_name)}">
                                                    </div>
                                                ` : `
                                                    <div class="attachment-media-frame doc">
                                                        📄 ${escapeHtml(f.original_name)}
                                                    </div>
                                                `}
                                                <div class="attachment-file-name">
                                                    ${escapeHtml(f.original_name)}
                                                </div>
                                                <div class="attachment-card-footer">
                                                    <a href="${f.url}" target="_blank" class="attachment-view-link">View Full Attachment &nearr;</a>
                                                </div>
                                            </div>
                                        `;
                                    }
                                }).join('')}
                            </div>
                        </div>
                    ` : ''}

                    <!-- Threaded Discussion Section -->
                    <div class="discussion-section">
                        <div class="discussion-section-header">
                            <h3 class="review-section-title">
                                <span>Governance Discussion Thread</span>
                                <span class="comment-count-pill" id="comment-count-badge">
                                    ${record.total_comments || 0}
                                </span>
                            </h3>
                        </div>

                        <!-- Comment Tree List -->
                        <div class="comment-tree" id="comment-tree-container">
                            ${renderCommentTreeHtml(rev.reviewer_comments || [], voters, currentUser)}
                        </div>

                        <!-- Top-Level Comment Composer -->
                        <div class="top-comment-composer">
                            <div class="composer-title">
                                Leave a Reviewer Comment:
                            </div>
                            <textarea id="top-comment-input" class="form-textarea" rows="3" placeholder="Share peer feedback, brand justification, or remediation advice..."></textarea>
                            <div class="composer-submit-row">
                                <button class="btn-primary" id="btn-submit-top-comment">
                                    Post Comment
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- RIGHT COLUMN: Sticky Rail with Vote buttons, Consensus summary, Approver controls, AI overall review -->
                <aside class="review-sticky-rail">
                    <!-- Governance Voting & Consensus Panel -->
                    <div class="review-voting-box">
                        <div class="rail-header-group">
                            <h4>Peer Review & Voting Consensus</h4>
                            <p class="rail-subtext">
                                Submissions are open for 5 days of peer review. If <strong>Yes votes &gt; No votes</strong> upon expiration, the post automatically publishes.
                            </p>
                        </div>

                        <div class="rail-consensus-bar-box">
                            ${renderConsensusBar(record.vote_approve, record.vote_not_approve)}
                        </div>

                        ${!isVotingOpen ? `
                            <div class="voting-concluded-banner ${record.status === 'APPROVED' ? 'approved' : 'rejected'}">
                                ${record.status === 'APPROVED' ? `
                                    <div class="concluded-title">Consensus Reached &mdash; Approved</div>
                                    <p class="concluded-desc">Post approved (${record.vote_approve} Yes vs ${record.vote_not_approve} No) and automatically dispatched to organization published channels.</p>
                                ` : `
                                    <div class="concluded-title">Consensus Blocked &mdash; Rejected</div>
                                    <p class="concluded-desc">Post rejected (${record.vote_approve} Yes vs ${record.vote_not_approve} No) due to unaddressed brand deviations.</p>
                                `}
                            </div>
                        ` : `
                            <div class="voting-actions-bar">
                                ${canApprove ? `
                                    <div class="vote-buttons-stack">
                                        <button class="btn-vote btn-vote-yes ${userVote === 'yes' ? 'active' : ''}" id="btn-vote-yes" data-id="${record.id}">
                                            <span>Approve (Yes)</span>
                                            <span class="vote-count-number">${record.vote_approve}</span>
                                        </button>
                                        <button class="btn-vote btn-vote-no ${userVote === 'no' ? 'active' : ''}" id="btn-vote-no" data-id="${record.id}">
                                            <span>Not approve (No)</span>
                                            <span class="vote-count-number">${record.vote_not_approve}</span>
                                        </button>
                                    </div>
                                    <div class="vote-revoke-hint">
                                        (Click your vote again to revoke or switch)
                                    </div>
                                ` : `
                                    <div class="readonly-explanatory-note">
                                        <span class="readonly-title">Read-Only</span>
                                        <p>Your account (${escapeHtml(currentUser.user_name)}) does not possess voting authority (<code>can_approve = 'N'</code>). You may review issues and leave comments, but cannot cast votes.</p>
                                    </div>
                                `}
                            </div>
                        `}
                    </div>

                    <!-- Approver Controls (Demo Simulation) -->
                    <div class="card rail-card approver-controls-card">
                        <div class="rail-card-heading">
                            <span class="rail-card-eyebrow">Governance Action</span>
                            <h4>Approver Controls</h4>
                        </div>
                        <p class="rail-card-info">Simulate the 5-day expiration window to tally consensus immediately.</p>
                        <button class="btn-secondary btn-demo-finalize" id="btn-demo-finalize-top">
                            <span>Simulate 5 Days Elapsed (Close Vote)</span>
                        </button>
                    </div>

                    <!-- AI Overall Review Card -->
                    <div class="card rail-card ai-review-card">
                        <div class="rail-card-heading">
                            <span class="rail-card-eyebrow">Automated Audit</span>
                            <h4>AI Overall Review</h4>
                        </div>
                        <div class="ai-review-rows">
                            <div class="ai-review-row">
                                <span class="ai-row-label">Status</span>
                                <span class="ai-row-status ${rev.flagged_by_ai ? 'flagged' : 'clean'}">
                                    ${rev.flagged_by_ai ? 'Flagged Deviations' : 'Passed Inspection'}
                                </span>
                            </div>
                            <div class="ai-review-row">
                                <span class="ai-row-label">Text Issues</span>
                                <span class="ai-row-count">${textIssues.length}</span>
                            </div>
                            <div class="ai-review-row">
                                <span class="ai-row-label">Media Flags</span>
                                <span class="ai-row-count">${badFiles.length}</span>
                            </div>
                            ${goodFiles.length > 0 ? `
                                <div class="ai-review-row">
                                    <span class="ai-row-label">Passed Media</span>
                                    <span class="ai-row-count">${goodFiles.length}</span>
                                </div>
                            ` : ''}
                        </div>
                        <div class="ai-review-footer-note">
                            Automated governance audit completed via multimodal brand guidelines model.
                        </div>
                    </div>
                </aside>
            </div>
        `;

        workspace.innerHTML = '';
        workspace.appendChild(container);

        // Bind Back Button
        document.getElementById('btn-back-to-queue').onclick = () => {
            activeDetailPendingId = null;
            renderQueueView();
        };

        // Bind Demo Finalize Button
        document.getElementById('btn-demo-finalize-top').onclick = async () => {
            await handleDemoFinalize(record.id);
        };

        // Bind Voting Buttons
        if (canApprove && isVotingOpen) {
            const btnYes = document.getElementById('btn-vote-yes');
            const btnNo = document.getElementById('btn-vote-no');

            if (btnYes) {
                btnYes.onclick = async () => {
                    await handleVote(record.id, 'yes');
                };
            }
            if (btnNo) {
                btnNo.onclick = async () => {
                    await handleVote(record.id, 'no');
                };
            }
        }

        // Bind Top-level Comment submit
        document.getElementById('btn-submit-top-comment').onclick = async () => {
            await handleSubmitTopComment(record.id);
        };

        // Setup Popovers for highlighted text
        setupIssuePopovers(container);

        // Bind threaded reactions & inline replies
        bindCommentInteractionHandlers(record.id, voters);
    }

    /**
     * Recursively generate HTML for comments and nested replies
     */
    function renderCommentTreeHtml(comments, voters, currentUser, depth = 0) {
        if (!Array.isArray(comments) || comments.length === 0) {
            if (depth === 0) {
                return `<div class="review-empty-text" style="padding: 12px 0;">No comments yet. Start the conversation above.</div>`;
            }
            return '';
        }

        return comments.map(comment => {
            const voterChoice = voters[comment.user_id];
            const liked = Array.isArray(comment.liked_by) && comment.liked_by.includes(currentUser.user_id);
            const disliked = Array.isArray(comment.disliked_by) && comment.disliked_by.includes(currentUser.user_id);
            const authorInitials = (comment.user_name || 'R').split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

            return `
                <div class="comment-node ${depth > 0 ? 'nested-reply' : ''}" id="comment-node-${comment.comment_id}">
                    <div class="comment-header">
                        <div class="comment-author-badge">
                            <div class="comment-avatar">${authorInitials}</div>
                            <div class="comment-author-text">
                                <strong class="comment-author-name">${escapeHtml(comment.user_name || 'Reviewer')}</strong>
                                <span class="comment-author-designation">${escapeHtml(comment.designation || 'Staff')}</span>
                            </div>
                            ${voterChoice === 'yes' ? `<span class="voter-tag yes">✓ Voted Yes</span>` : voterChoice === 'no' ? `<span class="voter-tag no">✕ Voted No</span>` : ''}
                        </div>
                        <div class="comment-timestamp">
                            ${new Date(comment.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                    </div>

                    <div class="comment-body">${escapeHtml(comment.text)}</div>

                    <div class="comment-actions">
                        <button class="btn-react btn-react-like ${liked ? 'active' : ''}" data-cid="${comment.comment_id}">
                            <span>👍</span>
                            <span class="react-count">${comment.likes || 0}</span>
                        </button>
                        <button class="btn-react btn-react-dislike ${disliked ? 'active' : ''}" data-cid="${comment.comment_id}">
                            <span>👎</span>
                            <span class="react-count">${comment.dislikes || 0}</span>
                        </button>
                        <button class="btn-reply-toggle" data-cid="${comment.comment_id}">
                            Reply
                        </button>
                    </div>

                    <!-- Inline Reply Composer (Hidden by default) -->
                    <div class="inline-reply-composer" id="reply-composer-${comment.comment_id}" style="display: none;">
                        <textarea class="form-textarea" rows="2" placeholder="Write a reply..."></textarea>
                        <div class="reply-composer-actions">
                            <button class="btn-secondary btn-cancel-reply" data-cid="${comment.comment_id}">Cancel</button>
                            <button class="btn-primary btn-submit-reply" data-cid="${comment.comment_id}">Submit Reply</button>
                        </div>
                    </div>

                    <!-- Nested Replies -->
                    ${Array.isArray(comment.replies) && comment.replies.length > 0 ? `
                        <div class="nested-replies-list">
                            ${renderCommentTreeHtml(comment.replies, voters, currentUser, depth + 1)}
                        </div>
                    ` : ''}
                </div>
            `;
        }).join('');
    }

    /**
     * Bind Comment Likes/Dislikes, Reply toggles, and Reply submissions
     */
    function bindCommentInteractionHandlers(pendingId, voters) {
        const currentUser = window.TrueTone ? window.TrueTone.currentUser : { user_id: 1, user_name: 'User' };

        // Like buttons
        document.querySelectorAll('.btn-react-like').forEach(btn => {
            btn.onclick = async () => {
                const commentId = btn.getAttribute('data-cid');
                await handleReaction(pendingId, commentId, 'like');
            };
        });

        // Dislike buttons
        document.querySelectorAll('.btn-react-dislike').forEach(btn => {
            btn.onclick = async () => {
                const commentId = btn.getAttribute('data-cid');
                await handleReaction(pendingId, commentId, 'dislike');
            };
        });

        // Reply toggles
        document.querySelectorAll('.btn-reply-toggle').forEach(btn => {
            btn.onclick = () => {
                const commentId = btn.getAttribute('data-cid');
                const composer = document.getElementById(`reply-composer-${commentId}`);
                if (composer) {
                    composer.style.display = composer.style.display === 'none' ? 'flex' : 'none';
                    if (composer.style.display === 'flex') {
                        const ta = composer.querySelector('textarea');
                        if (ta) ta.focus();
                    }
                }
            };
        });

        // Cancel reply
        document.querySelectorAll('.btn-cancel-reply').forEach(btn => {
            btn.onclick = () => {
                const commentId = btn.getAttribute('data-cid');
                const composer = document.getElementById(`reply-composer-${commentId}`);
                if (composer) composer.style.display = 'none';
            };
        });

        // Submit reply
        document.querySelectorAll('.btn-submit-reply').forEach(btn => {
            btn.onclick = async () => {
                const commentId = btn.getAttribute('data-cid');
                const composer = document.getElementById(`reply-composer-${commentId}`);
                const ta = composer ? composer.querySelector('textarea') : null;
                const text = ta ? ta.value.trim() : '';

                if (!text) {
                    if (window.TrueTone) window.TrueTone.showToast('Reply text cannot be empty', 'error');
                    return;
                }

                try {
                    const res = await fetch(`/api/pending/${pendingId}/comments/${commentId}/reply`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            user_id: currentUser.user_id,
                            user_name: currentUser.user_name,
                            designation: currentUser.designation,
                            text,
                        }),
                    });

                    const json = await res.json();
                    if (!json.success) throw new Error(json.error);

                    if (window.TrueTone) window.TrueTone.showToast('Reply posted', 'success');
                    // Refresh detail view
                    open_review_detail(pendingId);
                } catch (err) {
                    if (window.TrueTone) window.TrueTone.showToast(`Reply failed: ${err.message}`, 'error');
                }
            };
        });
    }

    /**
     * API Handler: Vote casting / toggling
     */
    async function handleVote(pendingId, voteType) {
        const currentUser = window.TrueTone ? window.TrueTone.currentUser : { user_id: 1 };
        try {
            const res = await fetch(`/api/pending/${pendingId}/vote`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    user_id: currentUser.user_id,
                    vote: voteType,
                }),
            });

            const json = await res.json();
            if (!json.success) throw new Error(json.error);

            if (window.TrueTone) {
                const msg = json.user_vote 
                    ? `Vote registered: ${json.user_vote.toUpperCase()}`
                    : `Vote revoked`;
                window.TrueTone.showToast(msg, 'success');
            }

            // Reload post details in-place
            open_review_detail(pendingId);
        } catch (err) {
            if (window.TrueTone) window.TrueTone.showToast(`Vote error: ${err.message}`, 'error');
        }
    }

    /**
     * API Handler: Top level comment submission
     */
    async function handleSubmitTopComment(pendingId) {
        const input = document.getElementById('top-comment-input');
        const text = input ? input.value.trim() : '';
        if (!text) {
            if (window.TrueTone) window.TrueTone.showToast('Please enter a comment', 'error');
            return;
        }

        const currentUser = window.TrueTone ? window.TrueTone.currentUser : { user_id: 1, user_name: 'Reviewer' };

        try {
            const res = await fetch(`/api/pending/${pendingId}/comments`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    user_id: currentUser.user_id,
                    user_name: currentUser.user_name,
                    designation: currentUser.designation,
                    text,
                }),
            });

            const json = await res.json();
            if (!json.success) throw new Error(json.error);

            if (input) input.value = '';
            if (window.TrueTone) window.TrueTone.showToast('Comment posted', 'success');

            open_review_detail(pendingId);
        } catch (err) {
            if (window.TrueTone) window.TrueTone.showToast(`Comment error: ${err.message}`, 'error');
        }
    }

    /**
     * API Handler: Reaction (like / dislike)
     */
    async function handleReaction(pendingId, commentId, reaction) {
        const currentUser = window.TrueTone ? window.TrueTone.currentUser : { user_id: 1 };

        try {
            const res = await fetch(`/api/pending/${pendingId}/comments/${commentId}/react`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    user_id: currentUser.user_id,
                    reaction,
                }),
            });

            const json = await res.json();
            if (!json.success) throw new Error(json.error);

            open_review_detail(pendingId);
        } catch (err) {
            if (window.TrueTone) window.TrueTone.showToast(`Reaction error: ${err.message}`, 'error');
        }
    }

    /**
     * API Handler: Simulate 5 Days Elapsed Demo Finalization
     */
    async function handleDemoFinalize(pendingId) {
        try {
            const res = await fetch(`/api/pending/${pendingId}/finalize-demo`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
            });

            const json = await res.json();
            if (!json.success) throw new Error(json.error);

            if (window.TrueTone) {
                window.TrueTone.showToast(json.message, json.status === 'APPROVED' ? 'success' : 'info');
            }

            open_review_detail(pendingId);
        } catch (err) {
            if (window.TrueTone) window.TrueTone.showToast(`Simulation error: ${err.message}`, 'error');
        }
    }

    /**
     * Main Tab Dispatcher: reviews_tab()
     */
    function reviews_tab() {
        // 1. Cleanup dangling popovers or intervals
        if (window.ttReviewsPollTimer) {
            clearInterval(window.ttReviewsPollTimer);
            window.ttReviewsPollTimer = null;
        }
        const danglingPopover = document.getElementById('tt-review-issue-popover');
        if (danglingPopover) danglingPopover.remove();

        knownPendingIds = new Set();
        currentFilter = 'all';
        activeDetailPendingId = null;

        // 2. Render initial queue dashboard
        renderQueueView();

        // 3. Start 4000ms real-time queue synchronization poller
        window.ttReviewsPollTimer = setInterval(() => {
            fetchAndDisplayQueue(false);
        }, 4000);
    }

    // Export globally
    window.reviews_tab = reviews_tab;
    window.open_review_detail = open_review_detail;
})();
