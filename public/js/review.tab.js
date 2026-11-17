/**
 * Review Tab Frontend Module
 * Controls the Pending Post Queue, voting, AI review inspection, and approval.
 */

window.ReviewTab = {
    filter: 'unapproved',

    async load() {
        const container = document.getElementById('review-posts-container');
        container.innerHTML = '<div style="color: #94a3b8; padding: 20px;">Fetching pending records...</div>';

        try {
            const statusParam = this.filter === 'unapproved' ? 'N' : 'Y';
            const url = this.filter === 'all' ? '/api/review/pending?status=N' : `/api/review/pending?status=${statusParam}`;

            const res = await fetch(url);
            const json = await res.json();

            if (!json.success) throw new Error(json.error);

            const posts = json.data || [];
            document.getElementById('badge-pending-count').textContent = json.total || posts.length;
            document.getElementById('stat-review-pending').textContent = json.total || posts.length;

            let flaggedCount = 0;
            posts.forEach(p => {
                if (p.overall_review && p.overall_review.ai_flags && p.overall_review.ai_flags.length > 0) {
                    flaggedCount++;
                }
            });
            document.getElementById('stat-review-flagged').textContent = flaggedCount;

            if (posts.length === 0) {
                container.innerHTML = `
                    <div style="background: #1a2234; padding: 40px; border-radius: 10px; text-align: center; color: #94a3b8;">
                        <h3>✨ All Caught Up!</h3>
                        <p style="margin-top: 8px;">No pending posts require review at this time.</p>
                    </div>`;
                return;
            }

            container.innerHTML = posts.map(item => this.renderPostCard(item)).join('');
            this.bindEvents();
        } catch (err) {
            container.innerHTML = `<div style="color: #ef4444; padding: 20px;">Failed to load pending queue: ${err.message}</div>`;
        }
    },

    renderPostCard(item) {
        const post = item.post || {};
        const review = item.overall_review || {};
        const score = review.ai_brand_score !== undefined ? review.ai_brand_score : 100;
        const scoreColor = score >= 90 ? 'var(--accent-green)' : score >= 70 ? 'var(--accent-yellow)' : 'var(--accent-red)';
        const flags = review.ai_flags || [];

        const channels = (post.channels || []).map(ch => `<span class="badge-tag channel">${ch}</span>`).join(' ');
        const dateStr = new Date(item.timestamp).toLocaleString();

        const flagsHtml = flags.length > 0 ? `
            <div style="margin-top: 10px; display: flex; flex-direction: column; gap: 6px;">
                ${flags.map(f => `
                    <div style="background: rgba(239, 68, 68, 0.1); border-left: 3px solid ${f.severity === 'CRITICAL' ? '#ef4444' : '#f59e0b'}; padding: 6px 10px; border-radius: 4px; font-size: 0.8rem;">
                        <strong style="color: #f87171;">[${f.severity || 'ALERT'}] ${f.rule || 'VIOLATION'}:</strong>
                        <span style="color: #cbd5e1;"> "${f.matched_text || ''}" &rarr; <em>${f.recommendation || ''}</em></span>
                    </div>
                `).join('')}
            </div>
        ` : '';

        return `
            <div class="card-item" data-id="${item.id}">
                <div class="card-item-header">
                    <div>
                        <div class="card-title">${post.title || 'Untitled Post'}</div>
                        <div class="card-meta">
                            <span>By <strong>${post.author_name || 'Author #' + (post.author_id || 'Unknown')}</strong></span>
                            <span>•</span>
                            <span>${dateStr}</span>
                            <span>•</span>
                            <span>${channels}</span>
                        </div>
                    </div>
                    <div style="text-align: right;">
                        <span style="font-size: 1.1rem; font-weight: 700; color: ${scoreColor};">${score}%</span>
                        <div style="font-size: 0.72rem; color: #94a3b8; text-transform: uppercase;">Tone Score</div>
                    </div>
                </div>

                <div class="card-body">
                    ${post.caption || post.content || '(No text content)'}
                </div>

                <div class="review-box">
                    <div class="review-box-header">
                        <span>Status: <strong style="color: #60a5fa;">${review.compliance_status || 'PENDING'}</strong></span>
                        <span style="font-size: 0.78rem; color: #94a3b8;">Review Notes</span>
                    </div>
                    <div style="color: #cbd5e1;">${review.reviewer_notes || 'Automated pre-screening complete. Awaiting peer approvals.'}</div>
                    ${flagsHtml}
                </div>

                <div class="card-footer">
                    <div class="vote-actions">
                        <button class="btn-vote approve" onclick="ReviewTab.vote('${item.id}', 'approve')">
                            👍 Approve (${item.vote_approve || 0})
                        </button>
                        <button class="btn-vote reject" onclick="ReviewTab.vote('${item.id}', 'not_approve')">
                            👎 Request Changes (${item.vote_not_approve || 0})
                        </button>
                    </div>

                    ${item.approved === 'N' ? `
                        <button class="btn-primary" onclick="ReviewTab.openApproveDialog('${item.id}', '${(post.title || '').replace(/'/g, "\\'")}')">
                            ✓ Approve & Dispatch to Published
                        </button>
                    ` : `
                        <span class="badge-tag low">Already Approved</span>
                    `}
                </div>
            </div>
        `;
    },

    bindEvents() {
        // Filter pills
        document.querySelectorAll('#review-filter-pills .filter-pill').forEach(pill => {
            pill.onclick = () => {
                document.querySelectorAll('#review-filter-pills .filter-pill').forEach(p => p.classList.remove('active'));
                pill.classList.add('active');
                this.filter = pill.dataset.filter;
                this.load();
            };
        });

        // Submit post draft modal button
        const openBtn = document.getElementById('btn-open-submit-modal');
        if (openBtn) {
            openBtn.onclick = () => this.openSubmitModal();
        }
    },

    async vote(id, type) {
        try {
            const res = await fetch(`/api/review/${id}/vote`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type }),
            });
            const data = await res.json();
            if (!data.success) throw new Error(data.error);

            TrueTone.showToast(data.message, 'success');
            this.load();
        } catch (err) {
            TrueTone.showToast(`Vote failed: ${err.message}`, 'error');
        }
    },

    openApproveDialog(id, title) {
        const html = `
            <div>
                <p style="color: #cbd5e1; margin-bottom: 16px;">
                    Approving will update the pending queue status to <strong>'Y'</strong> and atomically insert this post into the <strong>published</strong> table.
                </p>
                <div style="margin-bottom: 14px;">
                    <label style="font-size: 0.8rem; color: #94a3b8; display: block; margin-bottom: 6px;">Approver User ID</label>
                    <select id="approve-user-select" style="width: 100%; padding: 8px; background: #0f172a; border: 1px solid #334155; color: #f8fafc; border-radius: 6px;">
                        <option value="2">Michael Chen (Brand Governance Lead - can_approve = Y)</option>
                        <option value="4">David Miller (VP Corporate Comms - can_approve = Y)</option>
                        <option value="3">Elena Rostova (Compliance Officer - can_approve = Y)</option>
                    </select>
                </div>
                <div style="margin-bottom: 18px;">
                    <label style="font-size: 0.8rem; color: #94a3b8; display: block; margin-bottom: 6px;">Approval Sign-off Notes</label>
                    <textarea id="approve-notes" rows="3" style="width: 100%; padding: 8px; background: #0f172a; border: 1px solid #334155; color: #f8fafc; border-radius: 6px;" placeholder="Optional sign-off comments..."></textarea>
                </div>
                <div style="display: flex; justify-content: flex-end; gap: 10px;">
                    <button class="btn-vote" onclick="TrueTone.closeModal()">Cancel</button>
                    <button class="btn-primary" onclick="ReviewTab.confirmApprove('${id}')">Confirm & Publish</button>
                </div>
            </div>
        `;
        TrueTone.openModal(`Approve Post: ${title || '#' + id}`, html);
    },

    async confirmApprove(id) {
        const userId = document.getElementById('approve-user-select').value;
        const notes = document.getElementById('approve-notes').value;

        try {
            const res = await fetch(`/api/review/${id}/approve`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    approvedByUserId: userId,
                    reviewerNotes: notes,
                }),
            });
            const data = await res.json();
            if (!data.success) throw new Error(data.error);

            TrueTone.closeModal();
            TrueTone.showToast(data.message, 'success');
            this.load();
            if (window.PublishTab) window.PublishTab.load();
        } catch (err) {
            TrueTone.showToast(`Approval failed: ${err.message}`, 'error');
        }
    },

    openSubmitModal() {
        const html = `
            <div>
                <div style="margin-bottom: 12px;">
                    <label style="font-size: 0.8rem; color: #94a3b8; display: block; margin-bottom: 4px;">Post Title</label>
                    <input type="text" id="draft-title" placeholder="e.g. Q4 Executive Update" style="width: 100%; padding: 8px; background: #0f172a; border: 1px solid #334155; color: #fff; border-radius: 6px;">
                </div>
                <div style="margin-bottom: 12px;">
                    <label style="font-size: 0.8rem; color: #94a3b8; display: block; margin-bottom: 4px;">Author</label>
                    <select id="draft-author" style="width: 100%; padding: 8px; background: #0f172a; border: 1px solid #334155; color: #fff; border-radius: 6px;">
                        <option value="1">Sarah Jenkins (Senior Content Creator)</option>
                        <option value="2">Michael Chen (Brand Governance Lead)</option>
                        <option value="4">David Miller (VP Corporate Comms)</option>
                    </select>
                </div>
                <div style="margin-bottom: 12px;">
                    <label style="font-size: 0.8rem; color: #94a3b8; display: block; margin-bottom: 4px;">Target Channels (comma-separated)</label>
                    <input type="text" id="draft-channels" value="LinkedIn, Twitter/X" style="width: 100%; padding: 8px; background: #0f172a; border: 1px solid #334155; color: #fff; border-radius: 6px;">
                </div>
                <div style="margin-bottom: 16px;">
                    <label style="font-size: 0.8rem; color: #94a3b8; display: block; margin-bottom: 4px;">Content / Caption</label>
                    <textarea id="draft-caption" rows="4" placeholder="Enter post text here..." style="width: 100%; padding: 8px; background: #0f172a; border: 1px solid #334155; color: #fff; border-radius: 6px;"></textarea>
                </div>
                <div style="display: flex; justify-content: flex-end; gap: 10px;">
                    <button class="btn-vote" onclick="TrueTone.closeModal()">Cancel</button>
                    <button class="btn-primary" onclick="ReviewTab.submitNewDraft()">Submit to Pending Queue</button>
                </div>
            </div>
        `;
        TrueTone.openModal('Submit Post to Review Queue', html);
    },

    async submitNewDraft() {
        const title = document.getElementById('draft-title').value.trim();
        const authorId = document.getElementById('draft-author').value;
        const channels = document.getElementById('draft-channels').value.split(',').map(s => s.trim()).filter(Boolean);
        const caption = document.getElementById('draft-caption').value.trim();

        if (!title || !caption) {
            TrueTone.showToast('Please provide both Title and Caption', 'error');
            return;
        }

        const authorNames = {
            '1': 'Sarah Jenkins',
            '2': 'Michael Chen',
            '4': 'David Miller',
        };

        const post = {
            title,
            author_id: parseInt(authorId, 10),
            author_name: authorNames[authorId] || 'User #' + authorId,
            channels,
            caption,
        };

        const overall_review = {
            ai_brand_score: Math.floor(Math.random() * 20) + 80,
            compliance_status: 'AWAITING_REVIEW',
            ai_flags: [],
            reviewer_notes: 'Automated ingestion pipeline initialized.',
        };

        try {
            const res = await fetch('/api/review/submit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ post, overall_review }),
            });
            const data = await res.json();
            if (!data.success) throw new Error(data.error);

            TrueTone.closeModal();
            TrueTone.showToast('Post drafted and submitted to pending queue!', 'success');
            this.load();
        } catch (err) {
            TrueTone.showToast(`Submission failed: ${err.message}`, 'error');
        }
    }
};
