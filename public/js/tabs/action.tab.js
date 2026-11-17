/**
 * =============================================================================
 * TrueTone Tab Module: ACTIONS (action_tab)
 * Governance Actions & Employee Compliance Reports.
 * Weekly AI synthesis of content logs, recurring brand violations, and employee performance.
 * Accessible ONLY when currentUser.can_take_action === 'Y'.
 * =============================================================================
 */

(function () {
    let currentActionFilter = 'all'; // 'all' | 'flagged' | 'good'
    let activeActionDetailId = null;
    let cachedActionRecords = [];

    // Helper: Escape HTML to prevent XSS
    function escapeHtml(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    /**
     * Render the status pill badge
     */
    function renderStatusPill(status) {
        if (status === 'GOOD_PERFORMANCE') {
            return `<span class="action-status-pill good">✓ Good Performance</span>`;
        } else {
            return `<span class="action-status-pill flagged">⚠ Action / Review Needed</span>`;
        }
    }

    /**
     * Build single Employee Report Card
     */
    function createActionCard(record) {
        const rep = record.cumulative_report || {};
        const isGood = rep.status === 'GOOD_PERFORMANCE';
        const stats = rep.stats || { total_submissions: 0, flagged_submissions: 0, clean_submissions: 0 };
        const recurring = Array.isArray(rep.recurring_issues) ? rep.recurring_issues : [];
        const comments = Array.isArray(rep.manager_comments) ? rep.manager_comments : [];

        const authorInitials = (record.user_name || 'U')
            .split(' ')
            .map(n => n[0])
            .join('')
            .substring(0, 2)
            .toUpperCase();

        const card = document.createElement('div');
        card.className = 'action-report-card';
        card.setAttribute('data-action-id', record.id);

        card.innerHTML = `
            <div>
                <div class="action-card-top">
                    <div style="display: flex; align-items: center; gap: 12px;">
                        <div class="action-card-avatar">${authorInitials}</div>
                        <div>
                            <div style="font-weight: 700; font-size: 1rem; color: var(--text-primary);">${escapeHtml(record.user_name)}</div>
                            <div style="font-size: 0.78rem; color: var(--text-muted);">
                                ${escapeHtml(record.designation || 'Staff')} ${record.department ? `• ${escapeHtml(record.department)}` : ''}
                            </div>
                        </div>
                    </div>
                    ${renderStatusPill(rep.status)}
                </div>

                <div class="action-card-headline" style="${isGood ? 'color: #34d399; font-weight: 600;' : ''}">
                    ${escapeHtml(rep.summary_headline || 'Performance evaluation completed.')}
                </div>

                <div class="action-card-metrics">
                    <span class="action-metric-pill">Total: <strong>${stats.total_submissions || 0}</strong></span>
                    <span class="action-metric-pill">Flagged: <strong style="${stats.flagged_submissions > 0 ? 'color: #f87171;' : ''}">${stats.flagged_submissions || 0}</strong></span>
                    <span class="action-metric-pill">Clean: <strong style="color: #34d399;">${stats.clean_submissions || 0}</strong></span>
                </div>

                ${recurring.length > 0 ? `
                    <div class="action-violation-pills">
                        ${recurring.slice(0, 2).map(issue => `
                            <span class="violation-tag">${escapeHtml(issue)}</span>
                        `).join('')}
                        ${recurring.length > 2 ? `<span style="font-size: 0.72rem; color: var(--text-muted); align-self: center;">+${recurring.length - 2} more</span>` : ''}
                    </div>
                ` : ''}
            </div>

            <div class="action-card-footer">
                <span>💬 ${comments.length} manager note${comments.length === 1 ? '' : 's'}</span>
                <span style="color: var(--accent-cyan); font-weight: 600;">View Full Report &amp; Comment &rarr;</span>
            </div>
        `;

        card.onclick = () => {
            window.open_action_detail(record.id);
        };

        return card;
    }

    /**
     * Render main Action Tab Grid View
     */
    async function renderActionsGridView() {
        activeActionDetailId = null;
        const workspace = document.getElementById('main-workspace');
        if (!workspace) return;

        workspace.innerHTML = `
            <div class="tab-viewport" id="actions-tab-container">
                <!-- Dashboard Header -->
                <div class="actions-header-bar">
                    <div>
                        <h2>🛡️ Governance Actions &amp; Employee Compliance Reports</h2>
                        <p style="color: var(--text-secondary); font-size: 0.88rem; margin-top: 4px;">
                            Weekly AI synthesis of content logs, recurring brand violations, and employee performance.
                        </p>
                    </div>
                    <button class="actions-sync-btn" id="run-weekly-analysis-btn">
                        <span>🔄</span>
                        <span>Sync Weekly Logs (Run AI Analysis)</span>
                    </button>
                </div>

                <!-- Filter Bar -->
                <div class="actions-header-bar" style="margin-bottom: 24px;">
                    <div class="actions-filter-group">
                        <button class="actions-filter-btn ${currentActionFilter === 'all' ? 'active' : ''}" data-filter="all">All Employees</button>
                        <button class="actions-filter-btn ${currentActionFilter === 'flagged' ? 'active' : ''}" data-filter="flagged">Flagged / Needs Attention</button>
                        <button class="actions-filter-btn ${currentActionFilter === 'good' ? 'active' : ''}" data-filter="good">Good Performance</button>
                    </div>
                    <div style="font-size: 0.82rem; color: var(--text-muted);" id="actions-count-display">
                        Loading employee reports...
                    </div>
                </div>

                <!-- Cards Grid -->
                <div class="actions-cards-grid" id="actions-cards-grid">
                    <div style="text-align: center; padding: 48px; color: var(--text-muted); grid-column: 1 / -1;">
                        Querying cumulative employee scorecards from PostgreSQL...
                    </div>
                </div>
            </div>
        `;

        // Bind filter buttons
        const filterBtns = workspace.querySelectorAll('.actions-filter-btn');
        filterBtns.forEach(btn => {
            btn.onclick = () => {
                filterBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                currentActionFilter = btn.getAttribute('data-filter');
                filterAndRenderCards();
            };
        });

        // Bind Sync button
        const syncBtn = document.getElementById('run-weekly-analysis-btn');
        if (syncBtn) {
            syncBtn.onclick = async () => {
                await handleRunWeeklyAnalysis();
            };
        }

        // Initial fetch
        await fetchActionReports();
    }

    /**
     * Fetch reports from GET /api/actions
     */
    async function fetchActionReports() {
        try {
            const res = await fetch('/api/actions');
            const data = await res.json();
            if (!data.success) throw new Error(data.error || 'Failed to fetch action reports');

            cachedActionRecords = data.records || data.data || [];
            filterAndRenderCards();
        } catch (err) {
            const grid = document.getElementById('actions-cards-grid');
            if (grid) {
                grid.innerHTML = `
                    <div style="color: var(--accent-rose); padding: 24px; text-align: center; grid-column: 1 / -1;">
                        Error loading employee compliance reports: ${escapeHtml(err.message)}
                    </div>
                `;
            }
        }
    }

    /**
     * Filter and render cards in grid
     */
    function filterAndRenderCards() {
        const grid = document.getElementById('actions-cards-grid');
        const countDisplay = document.getElementById('actions-count-display');
        if (!grid) return;

        let filtered = cachedActionRecords;
        if (currentActionFilter === 'flagged') {
            filtered = cachedActionRecords.filter(r => {
                const status = (r.cumulative_report || {}).status;
                return status !== 'GOOD_PERFORMANCE';
            });
        } else if (currentActionFilter === 'good') {
            filtered = cachedActionRecords.filter(r => {
                const status = (r.cumulative_report || {}).status;
                return status === 'GOOD_PERFORMANCE';
            });
        }

        if (countDisplay) {
            countDisplay.textContent = `Showing ${filtered.length} of ${cachedActionRecords.length} employee report${cachedActionRecords.length === 1 ? '' : 's'}`;
        }

        grid.innerHTML = '';

        if (filtered.length === 0) {
            grid.innerHTML = `
                <div style="background: var(--bg-surface); border: 1px solid var(--border-subtle); border-radius: var(--radius-md); padding: 48px; text-align: center; color: var(--text-muted); grid-column: 1 / -1;">
                    <div style="font-size: 2.2rem; margin-bottom: 12px;">🛡️</div>
                    <h3 style="color: var(--text-primary); margin-bottom: 6px;">No Records Found</h3>
                    <p style="font-size: 0.88rem;">No employee scorecards match current filter "${currentActionFilter}".</p>
                </div>
            `;
            return;
        }

        filtered.forEach(record => {
            const cardEl = createActionCard(record);
            grid.appendChild(cardEl);
        });
    }

    /**
     * Trigger Live Weekly AI Synthesis
     */
    async function handleRunWeeklyAnalysis() {
        const btn = document.getElementById('run-weekly-analysis-btn');
        if (btn) {
            btn.disabled = true;
            btn.innerHTML = `<span>🔄</span><span>Synthesizing Weekly Logs...</span>`;
        }

        try {
            const res = await fetch('/api/actions/run-weekly-analysis', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ days: 7 }),
            });

            const data = await res.json();
            if (!data.success) throw new Error(data.error);

            if (window.TrueTone && typeof window.TrueTone.showToast === 'function') {
                window.TrueTone.showToast(data.message || `Weekly AI synthesis complete. ${data.processed_users} profile(s) updated.`, 'success');
            }

            await fetchActionReports();
        } catch (err) {
            if (window.TrueTone && typeof window.TrueTone.showToast === 'function') {
                window.TrueTone.showToast(`AI analysis failed: ${err.message}`, 'error');
            }
        } finally {
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = `<span>🔄</span><span>Sync Weekly Logs (Run AI Analysis)</span>`;
            }
        }
    }

    /**
     * Detailed Report View
     */
    async function open_action_detail(actionId) {
        activeActionDetailId = actionId;
        const workspace = document.getElementById('main-workspace');
        if (!workspace) return;

        workspace.innerHTML = `
            <div class="tab-viewport">
                <div style="padding: 48px; text-align: center; color: var(--text-muted);">
                    Loading detailed employee governance scorecard...
                </div>
            </div>
        `;

        try {
            const res = await fetch(`/api/actions/${actionId}`);
            const data = await res.json();
            if (!data.success) throw new Error(data.error || 'Failed to fetch action detail');

            renderActionDetailView(data.record, data.logs || []);
        } catch (err) {
            workspace.innerHTML = `
                <div class="tab-viewport">
                    <button class="btn-back-queue" onclick="window.action_tab()">&larr; Back to All Reports</button>
                    <div style="color: var(--accent-rose); margin-top: 24px;">Failed to load detail report: ${escapeHtml(err.message)}</div>
                </div>
            `;
        }
    }

    /**
     * Render the Detailed View DOM
     */
    function renderActionDetailView(record, logs) {
        const workspace = document.getElementById('main-workspace');
        if (!workspace) return;

        const rep = record.cumulative_report || {};
        const isGood = rep.status === 'GOOD_PERFORMANCE';
        const stats = rep.stats || { total_submissions: 0, flagged_submissions: 0, clean_submissions: 0 };
        const recurring = Array.isArray(rep.recurring_issues) ? rep.recurring_issues : [];
        const actionsList = Array.isArray(rep.recommended_actions) ? rep.recommended_actions : [];
        const comments = Array.isArray(rep.manager_comments) ? rep.manager_comments : [];

        const currentUser = window.TrueTone ? window.TrueTone.currentUser : { user_id: 1, can_approve: 'N' };
        const canApprove = currentUser.can_approve === 'Y';

        const authorInitials = (record.user_name || 'U')
            .split(' ')
            .map(n => n[0])
            .join('')
            .substring(0, 2)
            .toUpperCase();

        const container = document.createElement('div');
        container.className = 'tab-viewport action-detail-view';

        container.innerHTML = `
            <!-- Top Back Bar -->
            <div>
                <button class="btn-back-queue" id="btn-back-to-actions">
                    &larr; Back to All Reports
                </button>
            </div>

            <!-- Employee Profile Banner -->
            <div class="action-detail-profile-banner">
                <div style="display: flex; align-items: center; gap: 16px;">
                    <div class="action-card-avatar" style="width: 52px; height: 52px; font-size: 1.25rem;">
                        ${authorInitials}
                    </div>
                    <div>
                        <div style="font-size: 1.35rem; font-weight: 700; color: var(--text-primary);">${escapeHtml(record.user_name)}</div>
                        <div style="font-size: 0.85rem; color: var(--text-muted); margin-top: 2px;">
                            ${escapeHtml(record.designation || 'Staff')} • Department: <strong>${escapeHtml(record.department || 'Content & Marketing')}</strong>
                        </div>
                    </div>
                </div>
                <div style="display: flex; align-items: center; gap: 12px; flex-wrap: wrap;">
                    <div class="action-metric-pill" style="padding: 6px 12px; font-size: 0.8rem;">
                        Total: <strong>${stats.total_submissions || 0}</strong> | Flagged: <strong style="${stats.flagged_submissions > 0 ? 'color: #f87171;' : ''}">${stats.flagged_submissions || 0}</strong> | Clean: <strong style="color: #34d399;">${stats.clean_submissions || 0}</strong>
                    </div>
                    ${renderStatusPill(rep.status)}
                </div>
            </div>

            <!-- Executive Summary & Detailed AI Analysis Card -->
            <div class="action-section-card">
                <div class="action-section-title">
                    <span>🧠 Executive Summary &amp; Detailed AI Analysis</span>
                </div>
                <div style="font-size: 1.05rem; font-weight: 600; margin-bottom: 12px; ${isGood ? 'color: #34d399;' : 'color: #fda4af;'}">
                    ${escapeHtml(rep.summary_headline || 'Performance Assessment')}
                </div>
                <div style="font-size: 0.92rem; color: #cbd5e1; line-height: 1.7; background: #090d16; border: 1px solid var(--border-subtle); border-radius: var(--radius-sm); padding: 18px; white-space: pre-wrap;">
                    ${escapeHtml(rep.detailed_analysis || 'No detailed analysis text available.')}
                </div>
            </div>

            <!-- Recurring Guideline Violations List (when present) -->
            ${recurring.length > 0 ? `
                <div class="action-section-card">
                    <div class="action-section-title">
                        <span>⚠️ Recurring Brand Guideline Violations</span>
                    </div>
                    <p style="font-size: 0.82rem; color: var(--text-muted); margin-bottom: 14px;">
                        Frequent patterns identified during automated log audits.
                    </p>
                    <div style="display: flex; flex-direction: column; gap: 8px;">
                        ${recurring.map(issue => `
                            <div style="background: rgba(239, 68, 68, 0.08); border-left: 3px solid #ef4444; border-radius: 4px; padding: 10px 14px; font-size: 0.88rem; color: #fecdd3;">
                                <strong>Violation:</strong> ${escapeHtml(issue)}
                            </div>
                        `).join('')}
                    </div>
                </div>
            ` : ''}

            <!-- Recommended Corrective / Coaching Actions -->
            <div class="action-section-card">
                <div class="action-section-title">
                    <span>📋 Recommended Corrective &amp; Coaching Actions</span>
                </div>
                <p style="font-size: 0.82rem; color: var(--text-muted); margin-bottom: 14px;">
                    Actionable next steps for leadership and the creator.
                </p>
                <div style="display: flex; flex-direction: column; gap: 8px;">
                    ${actionsList.map((actionItem, idx) => `
                        <div style="display: flex; align-items: flex-start; gap: 10px; background: #090d16; border: 1px solid var(--border-subtle); border-radius: 4px; padding: 10px 14px; font-size: 0.88rem; color: #e2e8f0;">
                            <span style="color: var(--accent-cyan); font-weight: 700;">#${idx + 1}</span>
                            <span>${escapeHtml(actionItem)}</span>
                        </div>
                    `).join('')}
                </div>
            </div>

            <!-- Recent Flagged Log Snippets (Audit Evidence) -->
            <div class="action-section-card">
                <div class="action-section-title">
                    <span>🔍 Audit Evidence: Recent Content Logs (${logs.length})</span>
                </div>
                <p style="font-size: 0.82rem; color: var(--text-muted); margin-bottom: 14px;">
                    Recent log entries from the <code>logs</code> table evaluated in this cumulative report.
                </p>

                ${logs.length === 0 ? `
                    <div style="color: var(--text-muted); font-size: 0.85rem; padding: 12px 0;">No past log entries recorded for this creator.</div>
                ` : `
                    <div style="display: flex; flex-direction: column; gap: 10px;">
                        ${logs.map(log => {
                            const post = log.post || {};
                            const iss = log.issue;
                            const isFlagged = Boolean(iss && (typeof iss === 'object' ? Object.keys(iss).length > 0 : iss));
                            const textSnippet = post.text || post.headline || post.caption || (post.files && post.files.length ? '[File Attachment]' : 'Post content');

                            return `
                                <div class="audit-evidence-item">
                                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                                        <div style="display: flex; align-items: center; gap: 8px;">
                                            <span style="font-size: 0.76rem; font-weight: 700; color: ${isFlagged ? '#f87171' : '#34d399'};">
                                                ${isFlagged ? '⚠️ VIOLATION LOGGED' : '✓ CLEAN POST'}
                                            </span>
                                            <span style="font-size: 0.74rem; color: var(--text-muted);">
                                                Log #${log.id} • ${new Date(log.timestamp).toLocaleString()}
                                            </span>
                                        </div>
                                    </div>
                                    <div style="font-size: 0.86rem; color: #cbd5e1; margin-bottom: 6px;">
                                        ${escapeHtml(textSnippet)}
                                    </div>
                                    ${isFlagged ? `
                                        <div style="background: rgba(220, 38, 38, 0.12); border-left: 2px solid #dc2626; padding: 6px 10px; border-radius: 2px; font-size: 0.78rem; color: #fca5a5;">
                                            ${escapeHtml(iss.error_type || iss.category || (Array.isArray(iss.text) && iss.text[0] ? iss.text[0].problem : '') || (iss.violation_details && iss.violation_details.guideline_reference ? iss.violation_details.guideline_reference : 'Flagged Brand Guideline Issue'))}
                                        </div>
                                    ` : ''}
                                </div>
                            `;
                        }).join('')}
                    </div>
                `}
            </div>

            <!-- Role-Gated Manager Review & Comments Section -->
            <div class="action-section-card" id="action-comments-section">
                <div class="action-section-title">
                    <span>💬 Official Manager Review &amp; Follow-Up Notes</span>
                    <span style="font-size: 0.76rem; background: var(--bg-surface-elevated); color: var(--text-secondary); padding: 2px 8px; border-radius: 12px;">
                        ${comments.length}
                    </span>
                </div>

                <!-- Existing Comments Feed -->
                <div style="display: flex; flex-direction: column; gap: 10px; margin-top: 14px;">
                    ${comments.length === 0 ? `
                        <div style="color: var(--text-muted); font-size: 0.85rem; padding: 8px 0;" id="empty-comments-notice">
                            No managerial review notes logged yet.
                        </div>
                    ` : comments.map(c => `
                        <div class="manager-comment-item">
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                                <div style="display: flex; align-items: center; gap: 8px;">
                                    <strong style="font-size: 0.86rem; color: var(--text-primary);">${escapeHtml(c.user_name || 'Manager')}</strong>
                                    <span style="font-size: 0.74rem; color: var(--text-muted);">${escapeHtml(c.designation || 'Reviewer')}</span>
                                </div>
                                <span style="font-size: 0.72rem; color: var(--text-muted);">${new Date(c.timestamp).toLocaleString()}</span>
                            </div>
                            <div style="font-size: 0.88rem; color: #cbd5e1; line-height: 1.5; white-space: pre-wrap;">
                                ${escapeHtml(c.text)}
                            </div>
                        </div>
                    `).join('')}
                </div>

                <!-- Role-Gated Input -->
                <div style="margin-top: 24px; padding-top: 18px; border-top: 1px solid var(--border-subtle);">
                    ${canApprove ? `
                        <div style="font-size: 0.86rem; font-weight: 600; color: var(--text-primary); margin-bottom: 8px;">
                            Post an Official Governance Review Note:
                        </div>
                        <textarea id="action-comment-input" class="form-textarea" rows="3" placeholder="Write an official governance review, coaching note, or follow-up action..." style="background: #090d16;"></textarea>
                        <div style="display: flex; justify-content: flex-end; margin-top: 10px;">
                            <button class="btn-primary" id="btn-submit-action-comment" style="font-size: 0.84rem; padding: 8px 18px;">
                                Post Review Note
                            </button>
                        </div>
                    ` : `
                        <div style="background: rgba(245, 158, 11, 0.1); border: 1px solid rgba(245, 158, 11, 0.25); border-radius: var(--radius-sm); padding: 12px 16px; font-size: 0.84rem; color: #fbbf24;">
                            🔒 <strong>READ-ONLY:</strong> Only authorized approvers (<code>can_approve = 'Y'</code>) can post review notes on employee governance reports.
                        </div>
                    `}
                </div>
            </div>
        `;

        workspace.innerHTML = '';
        workspace.appendChild(container);

        // Bind Back button
        document.getElementById('btn-back-to-actions').onclick = () => {
            activeActionDetailId = null;
            renderActionsGridView();
        };

        // Bind Submit comment button if authorized
        if (canApprove) {
            const commentBtn = document.getElementById('btn-submit-action-comment');
            if (commentBtn) {
                commentBtn.onclick = async () => {
                    await handleAddActionComment(record.id);
                };
            }
        }
    }

    /**
     * Submit manager review note
     */
    async function handleAddActionComment(actionId) {
        const input = document.getElementById('action-comment-input');
        const text = input ? input.value.trim() : '';

        if (!text) {
            if (window.TrueTone && typeof window.TrueTone.showToast === 'function') {
                window.TrueTone.showToast('Please enter review note text', 'error');
            }
            return;
        }

        const currentUser = window.TrueTone ? window.TrueTone.currentUser : { user_id: 2 };

        try {
            const res = await fetch(`/api/actions/${actionId}/comments`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    user_id: currentUser.user_id,
                    text,
                }),
            });

            const data = await res.json();
            if (!data.success) throw new Error(data.error);

            if (window.TrueTone && typeof window.TrueTone.showToast === 'function') {
                window.TrueTone.showToast('Governance review note recorded', 'success');
            }

            open_action_detail(actionId);
        } catch (err) {
            if (window.TrueTone && typeof window.TrueTone.showToast === 'function') {
                window.TrueTone.showToast(`Comment failed: ${err.message}`, 'error');
            }
        }
    }

    /**
     * Main Tab Dispatcher: action_tab()
     */
    function action_tab() {
        const workspace = document.getElementById('main-workspace');
        if (!workspace) return;

        const currentUser = window.TrueTone ? window.TrueTone.currentUser : { can_take_action: 'Y' };

        // Guard: Prevent rendering if user does not possess action privileges
        if (currentUser.can_take_action !== 'Y') {
            workspace.innerHTML = `
                <div class="banner-notice read-only" style="margin-top: 40px;">
                    <span style="font-size: 1.5rem;">🚫</span>
                    <div>
                        <strong>ACCESS DENIED:</strong>
                        <p style="margin-top: 4px;">You do not possess compliance authority (<code>can_take_action = 'N'</code>). This tab requires administrative action credentials.</p>
                    </div>
                </div>
            `;
            return;
        }

        // 1. Completely clear dynamic workspace & floating popovers
        workspace.innerHTML = '';
        const danglingPopover = document.getElementById('tt-review-issue-popover');
        if (danglingPopover) danglingPopover.remove();

        // 2. Reset scoped state
        currentActionFilter = 'all';
        activeActionDetailId = null;

        // 3. Render grid view
        renderActionsGridView();
    }

    // Global exports
    window.action_tab = action_tab;
    window.open_action_detail = open_action_detail;
})();
