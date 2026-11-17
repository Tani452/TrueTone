/**
 * =============================================================================
 * TrueTone Tab Module: REVIEW (reviews_tab)
 * Handles unapproved pending queue, peer voting, AI score review, and approval sign-off.
 * Accepts boolean flag `isReadOnly` (defaulting to currentUser.can_approve !== 'Y').
 * =============================================================================
 */

function reviews_tab(isReadOnly = false) {
    const workspace = document.getElementById('main-workspace');
    if (!workspace) return;

    // Detect role permission from active user if not explicitly passed
    const currentUser = window.TrueTone ? window.TrueTone.currentUser : { can_approve: 'Y' };
    const readOnlyMode = isReadOnly || (currentUser.can_approve !== 'Y');

    // 1. Completely clear dynamic workspace
    workspace.innerHTML = '';

    // 2. Build isolated tab container
    const container = document.createElement('div');
    container.className = 'tab-viewport';
    container.id = 'reviews-tab-view';

    container.innerHTML = `
        <div class="tab-header">
            <h2>📝 Pending Review & Verification Queue</h2>
            <p>Inspect incoming broadcasts, evaluate AI violation flags, register peer votes, and approve production dispatches.</p>
        </div>

        ${readOnlyMode ? `
            <div class="banner-notice read-only" id="review-readonly-banner">
                <span style="font-size: 1.2rem;">🔒</span>
                <div>
                    <strong>READ-ONLY AUDIT MODE:</strong>
                    <span>Your account (${currentUser.user_name || 'Staff'}) does not possess approval authority (<code>can_approve = 'N'</code>). You can inspect draft queues and AI audit scores, but vote and sign-off actions are disabled.</span>
                </div>
            </div>
        ` : `
            <div class="banner-notice success" id="review-active-banner">
                <span style="font-size: 1.2rem;">✓</span>
                <div>
                    <strong>GOVERNANCE APPROVER MODE:</strong>
                    <span>You possess approval authority (<code>can_approve = 'Y'</code>). You can cast peer votes and execute final atomic publish transactions.</span>
                </div>
            </div>
        `}

        <!-- Metric KPI Cards -->
        <div class="stat-grid">
            <div class="stat-card cyan">
                <div class="label">Pending Queue (approved = 'N')</div>
                <div class="value" id="kpi-review-pending">--</div>
                <div class="subtext">Hits partial index in RAM</div>
            </div>
            <div class="stat-card amber">
                <div class="label">Flagged by AI</div>
                <div class="value" id="kpi-review-flagged">--</div>
                <div class="subtext">Requires human remediation</div>
            </div>
            <div class="stat-card emerald">
                <div class="label">Average Review Score</div>
                <div class="value" id="kpi-review-avg-score">--</div>
                <div class="subtext">Based on compliance heuristics</div>
            </div>
        </div>

        <!-- =================================================================== -->
        <!-- PLACEHOLDER CONTAINER 1: Pending Queue Controls & Filter           -->
        <!-- Plug in API call: GET /api/review/pending?status=N                 -->
        <!-- =================================================================== -->
        <div class="placeholder-card" id="placeholder-review-queue">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; flex-wrap: wrap; gap: 10px;">
                <div>
                    <span class="placeholder-badge">PLACEHOLDER CONTAINER 1: PENDING QUEUE (/api/review/pending)</span>
                    <h3>Active Review Queue Items</h3>
                    <p class="desc" style="margin-bottom: 0;">Ordered chronologically using PostgreSQL partial B-Tree index <code>idx_pending_unapproved_queue</code>.</p>
                </div>
                <div style="display: flex; gap: 8px;">
                    <button class="btn-secondary" onclick="window.loadReviewQueue('N')">
                        ↻ Refresh Queue
                    </button>
                    <button class="filter-pill ${window.reviewStatusFilter === 'Y' ? 'active' : ''}" onclick="window.toggleReviewApprovedFilter()">
                        Show Approved Records (Y)
                    </button>
                </div>
            </div>

            <!-- Pending list container -->
            <div id="reviews-items-container">
                <div style="color: var(--text-muted); padding: 24px; text-align: center;">Querying PostgreSQL pending queue...</div>
            </div>
        </div>

        <!-- =================================================================== -->
        <!-- PLACEHOLDER CONTAINER 2: Voting & Approval Controls Target         -->
        <!-- Plug in API calls: POST /api/review/:id/vote and :id/approve       -->
        <!-- =================================================================== -->
        <div class="placeholder-card" id="placeholder-review-actions">
            <span class="placeholder-badge">PLACEHOLDER CONTAINER 2: VOTING & TRANSACTIONAL APPROVAL WORKFLOW</span>
            <h3>Decision Engine & Multi-Peer Consensus</h3>
            <p class="desc">
                Posts require consensus before final release. Approving executes an ACID transaction transferring record from <code>pending</code> to <code>published</code>.
            </p>
            <div style="font-size: 0.82rem; color: var(--text-secondary); line-height: 1.6;">
                Status: <strong>${readOnlyMode ? '<span style="color: #f59e0b;">DISABLED (Read-Only User)</span>' : '<span style="color: #10b981;">ENABLED (Approver Authority)</span>'}</strong>
            </div>
        </div>

        <!-- =================================================================== -->
        <!-- PLACEHOLDER CONTAINER 3: Direct API Integration Endpoint Target    -->
        <!-- =================================================================== -->
        <div class="placeholder-card" style="border-style: dashed;">
            <span class="placeholder-badge" style="background: rgba(6, 182, 212, 0.15); color: #67e8f9; border-color: rgba(6, 182, 212, 0.3);">
                API HOOK: REVIEW TAB BACKEND INTERFACES
            </span>
            <p style="font-size: 0.8rem; color: var(--text-secondary); line-height: 1.6; margin: 0;">
                • <code>GET /api/review/pending?status=N</code> &rarr; Reads active queue with partial index.<br>
                • <code>POST /api/review/:id/vote</code> &rarr; Increments vote tallies (<code>vote_approve</code> / <code>vote_not_approve</code>).<br>
                • <code>POST /api/review/:id/approve</code> &rarr; Executes <code>withTransaction()</code> to mark approved and insert into <code>published</code>.
            </p>
        </div>
    `;

    workspace.appendChild(container);

    // Initial load of queue records
    window.loadReviewQueue('N', readOnlyMode);
}

window.reviewStatusFilter = 'N';
window.toggleReviewApprovedFilter = function () {
    window.reviewStatusFilter = window.reviewStatusFilter === 'N' ? 'Y' : 'N';
    const currentUser = window.TrueTone ? window.TrueTone.currentUser : { can_approve: 'Y' };
    const readOnlyMode = currentUser.can_approve !== 'Y';
    window.loadReviewQueue(window.reviewStatusFilter, readOnlyMode);
};

window.loadReviewQueue = async function (status = 'N', isReadOnly = false) {
    const container = document.getElementById('reviews-items-container');
    if (!container) return;

    try {
        const res = await fetch(`/api/review/pending?status=${status}`);
        const data = await res.json();

        if (!data.success) throw new Error(data.error);

        const items = data.data || [];
        const pendingKpi = document.getElementById('kpi-review-pending');
        if (pendingKpi) pendingKpi.textContent = data.total || items.length;

        let flaggedCount = 0;
        let scoreSum = 0;

        items.forEach(it => {
            const rev = it.overall_review || {};
            if (rev.ai_flags && rev.ai_flags.length > 0) flaggedCount++;
            scoreSum += (rev.ai_brand_score || 90);
        });

        const flaggedKpi = document.getElementById('kpi-review-flagged');
        if (flaggedKpi) flaggedKpi.textContent = flaggedCount;

        const avgScoreKpi = document.getElementById('kpi-review-avg-score');
        if (avgScoreKpi) avgScoreKpi.textContent = items.length > 0 ? `${Math.round(scoreSum / items.length)}%` : '100%';

        if (items.length === 0) {
            container.innerHTML = `
                <div style="background: var(--bg-surface-elevated); padding: 36px; border-radius: 8px; text-align: center; color: var(--text-muted);">
                    <h3>✨ All Clear!</h3>
                    <p style="font-size: 0.85rem; margin-top: 6px;">No posts currently pending review with status = '${status}'.</p>
                </div>
            `;
            return;
        }

        container.innerHTML = items.map(item => {
            const p = item.post || {};
            const rev = item.overall_review || {};
            const score = rev.ai_brand_score !== undefined ? rev.ai_brand_score : 100;
            const scoreColor = score >= 90 ? 'var(--accent-emerald)' : score >= 70 ? 'var(--accent-amber)' : 'var(--accent-rose)';
            const channels = (p.channels || []).map(ch => `<span class="tag-badge channel">${ch}</span>`).join(' ');
            const flags = rev.ai_flags || [];

            return `
                <div class="feed-card" data-id="${item.id}">
                    <div class="feed-card-header">
                        <div>
                            <div class="feed-card-title">${p.title || 'Draft #' + item.id}</div>
                            <div class="feed-card-meta">
                                <span>Author: <strong>${p.author_name || 'User #' + (p.author_id || '')}</strong></span>
                                <span>•</span>
                                <span>Submitted: ${new Date(item.timestamp).toLocaleString()}</span>
                                <span>•</span>
                                <span>${channels}</span>
                            </div>
                        </div>
                        <div style="text-align: right;">
                            <span style="font-size: 1.15rem; font-weight: 700; color: ${scoreColor};">${score}%</span>
                            <div style="font-size: 0.7rem; color: var(--text-muted); text-transform: uppercase;">Tone Score</div>
                        </div>
                    </div>

                    <div style="font-size: 0.9rem; color: #cbd5e1; line-height: 1.5; margin-bottom: 14px;">
                        ${p.caption || p.content || '(No caption provided)'}
                    </div>

                    <!-- AI Review Details Box -->
                    <div style="background: rgba(7, 11, 20, 0.6); border: 1px solid var(--border-subtle); border-radius: 6px; padding: 12px; margin-bottom: 14px;">
                        <div style="display: flex; justify-content: space-between; font-size: 0.82rem; margin-bottom: 6px;">
                            <span>Compliance Status: <strong style="color: #60a5fa;">${rev.compliance_status || 'PENDING'}</strong></span>
                            <span style="font-size: 0.72rem; color: var(--text-muted);">TrueTone AI Engine</span>
                        </div>
                        <div style="font-size: 0.8rem; color: var(--text-secondary);">
                            ${rev.reviewer_notes || 'Automated pre-screening complete. Awaiting peer approvals.'}
                        </div>
                        ${flags.length > 0 ? `
                            <div style="margin-top: 8px; display: flex; flex-direction: column; gap: 4px;">
                                ${flags.map(f => `
                                    <div style="background: rgba(244, 63, 94, 0.08); border-left: 3px solid ${f.severity === 'CRITICAL' ? '#f43f5e' : '#f59e0b'}; padding: 4px 8px; font-size: 0.76rem;">
                                        <strong style="color: #fda4af;">[${f.severity || 'WARN'}] ${f.rule || 'FLAG'}:</strong>
                                        <span style="color: #cbd5e1;"> "${f.matched_text || ''}" &rarr; <em>${f.recommendation || ''}</em></span>
                                    </div>
                                `).join('')}
                            </div>
                        ` : ''}
                    </div>

                    <!-- Decision & Vote Controls -->
                    <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid var(--border-subtle); padding-top: 12px; flex-wrap: wrap; gap: 10px;">
                        <div style="display: flex; gap: 10px;">
                            <button class="btn-secondary" ${isReadOnly ? 'disabled title="Read-only mode"' : ''} onclick="window.castVote('${item.id}', 'approve')">
                                👍 Approve (${item.vote_approve || 0})
                            </button>
                            <button class="btn-secondary" ${isReadOnly ? 'disabled title="Read-only mode"' : ''} onclick="window.castVote('${item.id}', 'not_approve')">
                                👎 Revise (${item.vote_not_approve || 0})
                            </button>
                        </div>

                        ${item.approved === 'N' ? `
                            <button class="btn-primary" ${isReadOnly ? 'disabled title="Approval permissions required"' : ''} onclick="window.triggerApproveModal('${item.id}', '${(p.title || '').replace(/'/g, "\\'")}')">
                                ✓ Sign Off & Publish
                            </button>
                        ` : `
                            <span class="tag-badge low">Already Published</span>
                        `}
                    </div>
                </div>
            `;
        }).join('');
    } catch (err) {
        container.innerHTML = `<div style="color: var(--accent-rose); padding: 16px;">Error loading review queue: ${err.message}</div>`;
    }
};

window.castVote = async function (id, type) {
    try {
        const res = await fetch(`/api/review/${id}/vote`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type }),
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.error);

        if (window.TrueTone) window.TrueTone.showToast(data.message, 'success');
        window.loadReviewQueue(window.reviewStatusFilter);
    } catch (err) {
        if (window.TrueTone) window.TrueTone.showToast(`Vote failed: ${err.message}`, 'error');
    }
};

window.triggerApproveModal = function (id, title) {
    const currentUser = window.TrueTone ? window.TrueTone.currentUser : { user_id: 2, user_name: 'Approver' };

    const modalHtml = `
        <div>
            <p style="color: #cbd5e1; font-size: 0.88rem; margin-bottom: 14px;">
                Executing sign-off will atomically mark pending item <strong>#${id}</strong> as approved and transfer its payload into the <code>published</code> catalog.
            </p>
            <div class="form-group">
                <label class="form-label">Approving Official</label>
                <input type="text" class="form-input" value="${currentUser.user_name} (ID: ${currentUser.user_id})" disabled>
            </div>
            <div class="form-group">
                <label class="form-label">Sign-Off Audit Comments</label>
                <textarea id="modal-approve-notes" class="form-textarea" rows="3" placeholder="e.g. Tone verified against 2026 enterprise standard. Approved for broadcast."></textarea>
            </div>
            <div style="display: flex; justify-content: flex-end; gap: 10px; margin-top: 18px;">
                <button class="btn-secondary" onclick="window.TrueTone.closeModal()">Cancel</button>
                <button class="btn-primary" onclick="window.submitFinalApproval('${id}')">Execute Atomic Publish</button>
            </div>
        </div>
    `;

    if (window.TrueTone) {
        window.TrueTone.openModal(`Approve Post: ${title || '#' + id}`, modalHtml);
    }
};

window.submitFinalApproval = async function (id) {
    const notes = document.getElementById('modal-approve-notes').value.trim();
    const currentUser = window.TrueTone ? window.TrueTone.currentUser : { user_id: 2 };

    try {
        const res = await fetch(`/api/review/${id}/approve`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                approvedByUserId: currentUser.user_id,
                reviewerNotes: notes || 'Approved via Review Hub',
            }),
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.error);

        if (window.TrueTone) {
            window.TrueTone.closeModal();
            window.TrueTone.showToast(data.message, 'success');
        }
        window.loadReviewQueue('N');
    } catch (err) {
        if (window.TrueTone) window.TrueTone.showToast(`Approval failed: ${err.message}`, 'error');
    }
};

// Global export
window.reviews_tab = reviews_tab;
