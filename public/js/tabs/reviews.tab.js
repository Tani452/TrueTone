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
            return `<span class="tt-countdown-badge closed">🔒 Voting Concluded</span>`;
        }

        const remainingMs = record.time_remaining_ms || 0;
        const totalHours = Math.floor(remainingMs / (1000 * 60 * 60));
        const days = Math.floor(totalHours / 24);
        const hours = totalHours % 24;

        if (days > 0) {
            return `<span class="tt-countdown-badge open">⏱ ${days}d ${hours}h remaining</span>`;
        } else if (hours > 0) {
            return `<span class="tt-countdown-badge open">⏱ ${hours}h remaining</span>`;
        } else {
            const minutes = Math.floor(remainingMs / (1000 * 60));
            return `<span class="tt-countdown-badge open">⏱ ${minutes}m remaining</span>`;
        }
    }

    // Helper: Render status pill
    function formatStatusPill(status) {
        const s = (status || 'UNAPPROVED').toUpperCase();
        if (s === 'APPROVED') {
            return `<span class="review-status-pill approved">✓ Approved & Published</span>`;
        } else if (s === 'REJECTED') {
            return `<span class="review-status-pill rejected">✕ Rejected & Blocked</span>`;
        } else {
            return `<span class="review-status-pill unapproved">⏳ Pending Review</span>`;
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
                    <span style="color: #34d399; font-weight: 600;">${yesCount} Yes</span>
                    <span style="color: #f87171; font-weight: 600;">${noCount} No</span>
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
        if (!fullText) return '<span style="color: var(--text-muted); font-style: italic;">(No text content provided)</span>';
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
                const sevColor = severity === 'CRITICAL' ? '#f43f5e' : severity === 'WARNING' ? '#fbbf24' : '#38bdf8';

                popover.innerHTML = `
                    <div class="tt-popover-title">
                        <span style="color: ${sevColor}; font-weight: 700;">[${severity}]</span>
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
                    <div>
                        <div class="review-author-name">${escapeHtml(authorName)}</div>
                        <div class="review-author-meta">${escapeHtml(department)} • ${escapeHtml(designation)} • ${new Date(record.timestamp).toLocaleDateString()}</div>
                    </div>
                </div>
                <div style="display: flex; align-items: center; gap: 8px;">
                    ${formatStatusPill(record.status)}
                    ${formatCountdown(record)}
                </div>
            </div>

            <div class="review-card-snippet">${escapeHtml(snippet)}</div>

            ${(textIssuesCount > 0 || badFilesCount > 0) ? `
                <div class="review-flag-summary">
                    <span>⚠️ AI Detected Issues:</span>
                    ${textIssuesCount > 0 ? `<strong>${textIssuesCount} Text Issue${textIssuesCount > 1 ? 's' : ''}</strong>` : ''}
                    ${(textIssuesCount > 0 && badFilesCount > 0) ? `<span>•</span>` : ''}
                    ${badFilesCount > 0 ? `<strong>${badFilesCount} Flagged File${badFilesCount > 1 ? 's' : ''}</strong>` : ''}
                </div>
            ` : `
                <div class="review-flag-summary" style="color: #6ee7b7; border-color: rgba(16, 185, 129, 0.2);">
                    ✓ Standard review queue submission
                </div>
            `}

            <div class="review-card-footer">
                ${renderConsensusBar(record.vote_approve, record.vote_not_approve)}
                <div style="display: flex; align-items: center; gap: 14px;">
                    <span style="font-size: 0.8rem; color: var(--text-muted); display: inline-flex; align-items: center; gap: 4px;">
                        💬 ${record.total_comments || 0}
                    </span>
                    <button class="btn-secondary" style="font-size: 0.82rem; padding: 6px 14px;" onclick="window.open_review_detail('${record.id}')">
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
                <div class="tab-header" style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 16px;">
                    <div>
                        <h2>Brand Governance Review Queue</h2>
                        <p>Collaborative peer review for content flagged with unresolved brand guideline issues.</p>
                    </div>
                    <div style="display: flex; align-items: center; gap: 8px; font-size: 0.82rem; color: #34d399; background: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.25); padding: 6px 12px; border-radius: 20px;">
                        <span class="pulse-dot"></span>
                        <span>Live Queue Synced (Auto-detecting new submissions)</span>
                    </div>
                </div>

                <!-- Filter Controls -->
                <div class="reviews-queue-header">
                    <div class="reviews-filter-group">
                        <button class="reviews-filter-btn ${currentFilter === 'all' ? 'active' : ''}" data-filter="all">All Submissions</button>
                        <button class="reviews-filter-btn ${currentFilter === 'open' ? 'active' : ''}" data-filter="open">Under Review</button>
                        <button class="reviews-filter-btn ${currentFilter === 'approved' ? 'active' : ''}" data-filter="approved">Approved</button>
                        <button class="reviews-filter-btn ${currentFilter === 'rejected' ? 'active' : ''}" data-filter="rejected">Blocked</button>
                    </div>
                    <div style="font-size: 0.82rem; color: var(--text-muted);" id="queue-count-display">
                        Loading pending queue...
                    </div>
                </div>

                <!-- Queue Cards List -->
                <div class="reviews-queue-grid" id="reviews-queue-grid">
                    <div style="text-align: center; padding: 40px; color: var(--text-muted);">
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
                    <div class="tt-queue-empty-state" style="background: var(--bg-surface); border: 1px solid var(--border-subtle); border-radius: var(--radius-md); padding: 48px; text-align: center; color: var(--text-muted);">
                        <div style="font-size: 2.2rem; margin-bottom: 12px;">🛡️</div>
                        <h3 style="color: var(--text-primary); margin-bottom: 6px;">Queue is Clean</h3>
                        <p style="font-size: 0.88rem; margin-bottom: ${currentFilter === 'all' ? '0' : '16px'};">
                            No submissions matching filter: <strong>"${escapeHtml(activeLabel)}"</strong>.
                        </p>
                        ${currentFilter !== 'all' ? `
                            <button type="button" class="btn-reset-queue-filter" id="btn-reset-queue-filter" style="background: rgba(6, 182, 212, 0.12); border: 1px solid var(--accent-cyan); color: var(--accent-cyan); padding: 8px 18px; border-radius: 6px; cursor: pointer; font-size: 0.82rem; font-weight: 600; font-family: var(--font-mono); transition: all 0.2s ease;">
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
                grid.innerHTML = `<div style="color: var(--accent-rose); padding: 24px; text-align: center;">Error loading queue: ${escapeHtml(err.message)}</div>`;
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
                <div style="padding: 40px; text-align: center; color: var(--text-muted);">
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
                    <button class="btn-back-queue" onclick="window.reviews_tab()">&larr; Back to Queue</button>
                    <div style="color: var(--accent-rose); margin-top: 24px;">Failed to load inspection view: ${escapeHtml(err.message)}</div>
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
                <div style="display: flex; align-items: center; gap: 14px; flex-wrap: wrap;">
                    <button class="btn-back-queue" id="btn-back-to-queue">
                        &larr; Back to Review Queue
                    </button>
                    <div>
                        <h2 style="font-size: 1.25rem; font-weight: 700;">Submission #${record.id} Review</h2>
                        <div style="font-size: 0.8rem; color: var(--text-muted); margin-top: 2px;">
                            Author: <strong>${escapeHtml(post.author_name || 'Staff')}</strong> (${escapeHtml(post.department || 'General')} • ${escapeHtml(post.designation || 'Staff')}) • 
                            Submitted: ${new Date(record.timestamp).toLocaleString()}
                        </div>
                    </div>
                </div>

                <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
                    ${formatStatusPill(record.status)}
                    ${formatCountdown(record)}
                    <button class="btn-demo-finalize" id="btn-demo-finalize-top">
                        ⏱ Simulate 5 Days Elapsed (Close Vote)
                    </button>
                </div>
            </div>

            <!-- Content Inspection Card: Text with Highlighted Issues -->
            <div class="card" style="background: var(--bg-surface); border: 1px solid var(--border-subtle); border-radius: var(--radius-md); padding: 22px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px;">
                    <h3 style="font-size: 1rem; color: var(--text-primary); display: flex; align-items: center; gap: 8px;">
                        <span>📝 Post Content Inspection</span>
                        ${textIssues.length > 0 ? `<span style="font-size: 0.76rem; background: rgba(239, 68, 68, 0.2); color: #fca5a5; padding: 2px 8px; border-radius: 4px; border: 1px solid rgba(239, 68, 68, 0.3);">${textIssues.length} Violation${textIssues.length > 1 ? 's' : ''} Flagged</span>` : ''}
                    </h3>
                    <span style="font-size: 0.76rem; color: var(--text-muted);">Hover highlighted phrases to inspect AI recommendation</span>
                </div>

                <div id="detail-highlighted-content" style="background: #090d16; border: 1px solid var(--border-subtle); border-radius: var(--radius-sm); padding: 18px; font-size: 0.94rem; line-height: 1.7; color: #f8fafc; min-height: 90px; white-space: pre-wrap;">
                    ${highlightProblematicText(post.text, textIssues)}
                </div>
            </div>

            <!-- Attachments Inspection: Clean vs Flagged Files -->
            ${Array.isArray(post.files) && post.files.length > 0 ? `
                <div class="card" style="background: var(--bg-surface); border: 1px solid var(--border-subtle); border-radius: var(--radius-md); padding: 22px;">
                    <h3 style="font-size: 1rem; color: var(--text-primary); margin-bottom: 14px; display: flex; align-items: center; gap: 8px;">
                        <span>📎 Attached Media & Visuals (${post.files.length})</span>
                    </h3>
                    <div class="review-attachments-grid">
                        ${post.files.map(f => {
                            // Check if file is flagged in bad_files
                            const badMatch = badFiles.find(bf => bf.filename === f.original_name || bf.filename === f.stored_name || (f.url && f.url.includes(bf.filename)));
                            const isImage = f.mime_type && f.mime_type.startsWith('image/');

                            if (badMatch) {
                                return `
                                    <div class="review-attachment-card flagged">
                                        <div style="display: flex; justify-content: space-between; align-items: center;">
                                            <span class="review-attachment-badge bad">⚠️ Guideline Issue</span>
                                            <span style="font-size: 0.72rem; color: #f87171;">[${(badMatch.severity || 'CRITICAL').toUpperCase()}]</span>
                                        </div>
                                        ${isImage ? `
                                            <div style="width: 100%; height: 130px; background: #000; border-radius: 4px; overflow: hidden; display: flex; align-items: center; justify-content: center;">
                                                <img src="${f.url}" alt="${escapeHtml(f.original_name)}" style="max-height: 100%; max-width: 100%; object-fit: contain;">
                                            </div>
                                        ` : `
                                            <div style="padding: 16px; background: rgba(0,0,0,0.3); border-radius: 4px; font-size: 0.85rem; color: #fca5a5;">
                                                📄 ${escapeHtml(f.original_name)}
                                            </div>
                                        `}
                                        <div style="font-size: 0.82rem; font-weight: 600; color: #fca5a5; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                                            ${escapeHtml(f.original_name)}
                                        </div>
                                        <div style="font-size: 0.76rem; color: #fca5a5; background: rgba(220, 38, 38, 0.15); border-left: 2px solid #dc2626; padding: 4px 8px; border-radius: 2px;">
                                            ${escapeHtml(badMatch.issue || badMatch.rule || 'Brand rule violation detected')}
                                        </div>
                                        <div style="margin-top: auto; padding-top: 6px;">
                                            <a href="${f.url}" target="_blank" style="font-size: 0.76rem; color: #60a5fa; text-decoration: underline;">View Full Attachment &nearr;</a>
                                        </div>
                                    </div>
                                `;
                            } else {
                                return `
                                    <div class="review-attachment-card clean">
                                        <div style="display: flex; justify-content: space-between; align-items: center;">
                                            <span class="review-attachment-badge good">✓ Passed AI Check</span>
                                        </div>
                                        ${isImage ? `
                                            <div style="width: 100%; height: 130px; background: #000; border-radius: 4px; overflow: hidden; display: flex; align-items: center; justify-content: center;">
                                                <img src="${f.url}" alt="${escapeHtml(f.original_name)}" style="max-height: 100%; max-width: 100%; object-fit: contain;">
                                            </div>
                                        ` : `
                                            <div style="padding: 16px; background: rgba(0,0,0,0.3); border-radius: 4px; font-size: 0.85rem; color: #94a3b8;">
                                                📄 ${escapeHtml(f.original_name)}
                                            </div>
                                        `}
                                        <div style="font-size: 0.82rem; font-weight: 600; color: #e2e8f0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                                            ${escapeHtml(f.original_name)}
                                        </div>
                                        <div style="margin-top: auto; padding-top: 6px;">
                                            <a href="${f.url}" target="_blank" style="font-size: 0.76rem; color: #60a5fa; text-decoration: underline;">View Full Attachment &nearr;</a>
                                        </div>
                                    </div>
                                `;
                            }
                        }).join('')}
                    </div>
                </div>
            ` : ''}

            <!-- Governance Voting & Consensus Panel -->
            <div class="review-voting-box">
                <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
                    <div>
                        <h3 style="font-size: 1.05rem; font-weight: 700; color: var(--text-primary);">🗳️ Peer Review & Voting Consensus</h3>
                        <p style="font-size: 0.82rem; color: var(--text-muted); margin-top: 2px;">
                            Submissions are open for 5 days of peer review. If <strong>Yes votes &gt; No votes</strong> upon expiration, the post automatically publishes.
                        </p>
                    </div>
                    <div style="min-width: 200px;">
                        ${renderConsensusBar(record.vote_approve, record.vote_not_approve)}
                    </div>
                </div>

                ${!isVotingOpen ? `
                    <div style="background: rgba(15, 23, 42, 0.8); border: 1px solid var(--border-subtle); border-radius: var(--radius-sm); padding: 14px; font-size: 0.85rem; color: var(--text-secondary);">
                        ${record.status === 'APPROVED' ? `
                            <strong style="color: #34d399;">✓ Voting Concluded — Consensus Reached:</strong> Post approved (${record.vote_approve} Yes vs ${record.vote_not_approve} No) and automatically dispatched to organization published channels.
                        ` : `
                            <strong style="color: #f87171;">✕ Voting Concluded — Consensus Blocked:</strong> Post rejected (${record.vote_approve} Yes vs ${record.vote_not_approve} No) due to unaddressed brand deviations.
                        `}
                    </div>
                ` : `
                    <div class="voting-actions-bar">
                        ${canApprove ? `
                            <button class="btn-vote btn-vote-yes ${userVote === 'yes' ? 'active' : ''}" id="btn-vote-yes" data-id="${record.id}">
                                👍 Vote to Approve (Yes) • ${record.vote_approve}
                            </button>
                            <button class="btn-vote btn-vote-no ${userVote === 'no' ? 'active' : ''}" id="btn-vote-no" data-id="${record.id}">
                                👎 Vote to Reject (No) • ${record.vote_not_approve}
                            </button>
                            <span style="font-size: 0.78rem; color: var(--text-muted); margin-left: 8px;">
                                (Click your vote again to revoke or switch)
                            </span>
                        ` : `
                            <div style="background: rgba(245, 158, 11, 0.1); border: 1px solid rgba(245, 158, 11, 0.25); border-radius: var(--radius-sm); padding: 10px 14px; font-size: 0.82rem; color: #fbbf24; width: 100%;">
                                🔒 <strong>READ-ONLY:</strong> Your account (${escapeHtml(currentUser.user_name)}) does not possess voting authority (<code>can_approve = 'N'</code>). You may review issues and leave comments, but cannot cast votes.
                            </div>
                        `}
                    </div>
                `}
            </div>

            <!-- Threaded Discussion Section -->
            <div class="discussion-section">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                    <h3 style="font-size: 1rem; font-weight: 700; color: var(--text-primary); display: flex; align-items: center; gap: 8px;">
                        <span>💬 Governance Discussion Thread</span>
                        <span style="font-size: 0.76rem; background: var(--bg-surface-elevated); color: var(--text-secondary); padding: 2px 8px; border-radius: 12px;" id="comment-count-badge">
                            ${record.total_comments || 0}
                        </span>
                    </h3>
                </div>

                <!-- Comment Tree List -->
                <div class="comment-tree" id="comment-tree-container">
                    ${renderCommentTreeHtml(rev.reviewer_comments || [], voters, currentUser)}
                </div>

                <!-- Top-Level Comment Composer -->
                <div style="margin-top: 24px; padding-top: 18px; border-top: 1px solid var(--border-subtle);">
                    <div style="font-size: 0.84rem; font-weight: 600; color: var(--text-primary); margin-bottom: 8px;">
                        Leave a Reviewer Comment:
                    </div>
                    <textarea id="top-comment-input" class="form-textarea" rows="3" placeholder="Share peer feedback, brand justification, or remediation advice..." style="background: #090d16;"></textarea>
                    <div style="display: flex; justify-content: flex-end; margin-top: 8px;">
                        <button class="btn-primary" id="btn-submit-top-comment" style="font-size: 0.82rem; padding: 8px 16px;">
                            Post Comment
                        </button>
                    </div>
                </div>
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
                return `<div style="color: var(--text-muted); font-size: 0.82rem; padding: 12px 0;">No comments yet. Start the conversation above.</div>`;
            }
            return '';
        }

        return comments.map(comment => {
            const voterChoice = voters[comment.user_id];
            const liked = Array.isArray(comment.liked_by) && comment.liked_by.includes(currentUser.user_id);
            const disliked = Array.isArray(comment.disliked_by) && comment.disliked_by.includes(currentUser.user_id);

            return `
                <div class="comment-node ${depth > 0 ? 'nested-reply' : ''}" id="comment-node-${comment.comment_id}">
                    <div class="comment-header">
                        <div class="comment-author-badge">
                            <strong style="color: var(--text-primary);">${escapeHtml(comment.user_name || 'Reviewer')}</strong>
                            <span style="color: var(--text-muted); font-size: 0.74rem;">${escapeHtml(comment.designation || 'Staff')}</span>
                            ${voterChoice === 'yes' ? `<span class="voter-tag yes">✓ Voted Yes</span>` : voterChoice === 'no' ? `<span class="voter-tag no">✕ Voted No</span>` : ''}
                        </div>
                        <div style="color: var(--text-muted); font-size: 0.72rem;">
                            ${new Date(comment.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                    </div>

                    <div class="comment-body">${escapeHtml(comment.text)}</div>

                    <div class="comment-actions">
                        <button class="btn-react btn-react-like ${liked ? 'active' : ''}" data-cid="${comment.comment_id}">
                            👍 ${comment.likes || 0}
                        </button>
                        <button class="btn-react btn-react-dislike ${disliked ? 'active' : ''}" data-cid="${comment.comment_id}">
                            👎 ${comment.dislikes || 0}
                        </button>
                        <button class="btn-reply-toggle" data-cid="${comment.comment_id}">
                            Reply
                        </button>
                    </div>

                    <!-- Inline Reply Composer (Hidden by default) -->
                    <div class="inline-reply-composer" id="reply-composer-${comment.comment_id}" style="display: none;">
                        <textarea class="form-textarea" rows="2" placeholder="Write a reply..." style="background: #060911; font-size: 0.82rem;"></textarea>
                        <div style="display: flex; justify-content: flex-end; gap: 8px;">
                            <button class="btn-secondary btn-cancel-reply" data-cid="${comment.comment_id}" style="font-size: 0.76rem; padding: 4px 10px;">Cancel</button>
                            <button class="btn-primary btn-submit-reply" data-cid="${comment.comment_id}" style="font-size: 0.76rem; padding: 4px 10px;">Submit Reply</button>
                        </div>
                    </div>

                    <!-- Nested Replies -->
                    ${Array.isArray(comment.replies) && comment.replies.length > 0 ? `
                        <div class="nested-replies-list" style="margin-top: 10px;">
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
