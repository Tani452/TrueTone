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
     * Render the status pill badge (low/medium/high mapped to pass/caution/violation)
     */
    function renderStatusPill(status, riskCls, riskLabel) {
        const isGoodPerf = status === 'GOOD_PERFORMANCE' || riskCls === 'risk-low';
        const pillClass = isGoodPerf ? 'action-status-pill good ' + (riskCls || 'risk-low') : 'action-status-pill flagged ' + (riskCls || 'risk-medium');
        const text = riskLabel || (isGoodPerf ? 'Low Risk' : 'Medium Risk');
        return `<span class="${pillClass}">${escapeHtml(text)}</span>`;
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
        card.setAttribute('tabindex', '0');
        card.setAttribute('role', 'button');
        card.setAttribute('aria-label', `View compliance scorecard for ${record.user_name || 'Staff'}`);

        card.innerHTML = `
            <div>
                <div class="action-card-top">
                    <div class="action-card-profile-header">
                        <div class="action-card-avatar">${authorInitials}</div>
                        <div class="action-card-user-info">
                            <div class="action-card-user-name">${escapeHtml(record.user_name)}</div>
                            <div class="action-card-user-role">
                                ${escapeHtml(record.designation || 'Staff')} ${record.department ? `&bull; ${escapeHtml(record.department)}` : ''}
                            </div>
                        </div>
                    </div>
                    ${(() => {
                        const r = rep.summary && rep.summary.current_risk_level ? String(rep.summary.current_risk_level).toLowerCase() : '';
                        const isHigh = r === 'high' || r === 'critical' || rep.status === 'CRITICAL_REVIEW';
                        const isMed = r === 'medium' || r === 'moderate' || rep.status === 'NEEDS_ATTENTION' || stats.flagged_submissions > 0;
                        const cls = isHigh ? 'risk-high' : (isMed ? 'risk-medium' : 'risk-low');
                        const label = isHigh ? 'High Risk' : (isMed ? 'Medium Risk' : 'Low Risk');
                        return renderStatusPill(rep.status, cls, label);
                    })()}
                </div>

                <div class="action-card-passrate-section">
                    <div class="action-card-passrate-header">
                        <span class="action-passrate-label">First-Time Pass Rate</span>
                        <span class="action-passrate-number">${(() => {
                            if (rep.summary && typeof rep.summary.first_time_pass_rate === 'number') {
                                return Math.round(rep.summary.first_time_pass_rate * 100);
                            }
                            const total = stats.total_submissions || (rep.summary && rep.summary.total_submitted) || 0;
                            const clean = stats.clean_submissions || (rep.summary && rep.summary.approved_count) || 0;
                            if (total > 0) return Math.min(100, Math.max(0, Math.round((clean / total) * 100)));
                            return isGood ? 100 : 85;
                        })()}%</span>
                    </div>
                    <div class="action-passrate-track" role="progressbar" aria-valuenow="${(() => {
                        if (rep.summary && typeof rep.summary.first_time_pass_rate === 'number') {
                            return Math.round(rep.summary.first_time_pass_rate * 100);
                        }
                        const total = stats.total_submissions || (rep.summary && rep.summary.total_submitted) || 0;
                        const clean = stats.clean_submissions || (rep.summary && rep.summary.approved_count) || 0;
                        if (total > 0) return Math.min(100, Math.max(0, Math.round((clean / total) * 100)));
                        return isGood ? 100 : 85;
                    })()}" aria-valuemin="0" aria-valuemax="100">
                        <div class="action-passrate-fill" style="width: ${(() => {
                            if (rep.summary && typeof rep.summary.first_time_pass_rate === 'number') {
                                return Math.round(rep.summary.first_time_pass_rate * 100);
                            }
                            const total = stats.total_submissions || (rep.summary && rep.summary.total_submitted) || 0;
                            const clean = stats.clean_submissions || (rep.summary && rep.summary.approved_count) || 0;
                            if (total > 0) return Math.min(100, Math.max(0, Math.round((clean / total) * 100)));
                            return isGood ? 100 : 85;
                        })()}%;"></div>
                    </div>
                </div>

                <div class="action-card-headline ${isGood ? 'good' : 'flagged'}">
                    ${escapeHtml(rep.summary_headline || 'Performance evaluation completed.')}
                </div>

                <div class="action-card-metrics">
                    <span class="action-metric-pill">Total: <strong>${stats.total_submissions || (rep.summary && rep.summary.total_submitted) || 0}</strong></span>
                    <span class="action-metric-pill flagged">Flagged: <strong class="flagged-count">${stats.flagged_submissions || 0}</strong></span>
                    <span class="action-metric-pill clean">Clean: <strong class="clean-count">${stats.clean_submissions || (rep.summary && rep.summary.approved_count) || 0}</strong></span>
                </div>

                ${recurring.length > 0 ? `
                    <div class="action-violation-pills">
                        ${recurring.slice(0, 2).map(issue => `
                            <span class="violation-tag">${escapeHtml(issue)}</span>
                        `).join('')}
                        ${recurring.length > 2 ? `<span class="action-violation-more">+${recurring.length - 2} more</span>` : ''}
                    </div>
                ` : ''}

                <div class="action-card-intervention-row">
                    <span class="action-intervention-label">Last Intervention:</span>
                    <span class="action-intervention-text">${escapeHtml((() => {
                        if (Array.isArray(rep.historical_activity) && rep.historical_activity.length > 0) {
                            const item = rep.historical_activity[rep.historical_activity.length - 1];
                            return (item.date ? item.date + ': ' : '') + item.action;
                        }
                        if (Array.isArray(rep.manager_comments) && rep.manager_comments.length > 0) {
                            return 'Manager Note: ' + rep.manager_comments[rep.manager_comments.length - 1].text;
                        }
                        if (Array.isArray(rep.recommended_actions) && rep.recommended_actions.length > 0) {
                            return rep.recommended_actions[0];
                        }
                        if (rep.action_recommendation) {
                            return rep.action_recommendation;
                        }
                        return rep.summary_headline || 'Standard workflow active; no corrective interventions needed.';
                    })())}</span>
                </div>
            </div>

            <div class="action-card-footer">
                <span class="action-footer-notes">
                    <svg class="action-footer-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                    <span>${comments.length} manager note${comments.length === 1 ? '' : 's'}</span>
                </span>
                <span class="action-footer-link">View Full Report &rarr;</span>
            </div>
        `;

        card.onclick = () => {
            window.open_action_detail(record.id);
        };
        card.onkeydown = (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                window.open_action_detail(record.id);
            }
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
                        <h2>Governance Actions &amp; Employee Compliance Reports</h2>
                        <p class="actions-header-subtitle">
                            Weekly AI synthesis of content logs, recurring brand violations, and employee performance.
                        </p>
                    </div>
                    <button class="actions-sync-btn" id="run-weekly-analysis-btn">
                        <svg class="actions-sync-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                            <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
                            <path d="M3 3v5h5"/>
                            <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/>
                            <path d="M21 21v-5h-5"/>
                        </svg>
                        <span>Run Weekly AI Analysis</span>
                    </button>
                </div>

                <!-- Filter Bar -->
                <div class="actions-filter-bar">
                    <div class="actions-filter-group" role="tablist" aria-label="Employee filters">
                        <button class="actions-filter-btn ${currentActionFilter === 'all' ? 'active' : ''}" data-filter="all" role="tab" aria-selected="${currentActionFilter === 'all'}">All Employees</button>
                        <button class="actions-filter-btn ${currentActionFilter === 'flagged' ? 'active' : ''}" data-filter="flagged" role="tab" aria-selected="${currentActionFilter === 'flagged'}">Flagged / Needs Attention</button>
                        <button class="actions-filter-btn ${currentActionFilter === 'good' ? 'active' : ''}" data-filter="good" role="tab" aria-selected="${currentActionFilter === 'good'}">Good Performance</button>
                    </div>
                    <div class="actions-count-display" id="actions-count-display">
                        Loading employee reports...
                    </div>
                </div>

                <!-- Cards Grid -->
                <div class="actions-cards-grid" id="actions-cards-grid">
                    <div class="actions-grid-loading">
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
                    <div class="actions-error-notice">
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
                <div class="actions-empty-state">
                    <div class="actions-empty-icon">
                        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M12 8v4"/><path d="M12 16h.01"/></svg>
                    </div>
                    <h3 class="actions-empty-title">No Records Found</h3>
                    <p class="actions-empty-desc">No employee scorecards match current filter "${escapeHtml(currentActionFilter)}".</p>
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
            btn.innerHTML = `<svg class="actions-sync-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M21 21v-5h-5"/></svg><span>Synthesizing Weekly Logs...</span>`;
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
                btn.innerHTML = `<svg class="actions-sync-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M21 21v-5h-5"/></svg><span>Run Weekly AI Analysis</span>`;
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
                <div class="actions-grid-loading">
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
                    <div class="actions-error-notice action-detail-error">Failed to load detail report: ${escapeHtml(err.message)}</div>
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
            <div class="action-detail-topbar">
                <button class="btn-back-queue" id="btn-back-to-actions">
                    &larr; Back to All Reports
                </button>
            </div>

            <!-- Employee Profile Banner -->
            <div class="action-detail-profile-banner">
                <div class="action-banner-left">
                    <div class="action-card-avatar action-banner-avatar">
                        ${authorInitials}
                    </div>
                    <div class="action-banner-identity">
                        <div class="action-banner-name">${escapeHtml(record.user_name)}</div>
                        <div class="action-banner-meta">
                            ${escapeHtml(record.designation || 'Staff')} &bull; Department: <strong>${escapeHtml(record.department || 'Content & Marketing')}</strong>
                        </div>
                    </div>
                </div>
                <div class="action-banner-right">
                    <div class="action-metric-pill action-banner-metric-pill">
                        Total: <strong>${stats.total_submissions || (rep.summary && rep.summary.total_submitted) || 0}</strong> &bull;
                        Flagged: <strong class="flagged-count">${stats.flagged_submissions || 0}</strong> &bull;
                        Clean: <strong class="clean-count">${stats.clean_submissions || (rep.summary && rep.summary.approved_count) || 0}</strong>
                    </div>
                    ${(() => {
                        const r = rep.summary && rep.summary.current_risk_level ? String(rep.summary.current_risk_level).toLowerCase() : '';
                        const isHigh = r === 'high' || r === 'critical' || rep.status === 'CRITICAL_REVIEW';
                        const isMed = r === 'medium' || r === 'moderate' || rep.status === 'NEEDS_ATTENTION' || stats.flagged_submissions > 0;
                        const cls = isHigh ? 'risk-high' : (isMed ? 'risk-medium' : 'risk-low');
                        const label = isHigh ? 'High Risk' : (isMed ? 'Medium Risk' : 'Low Risk');
                        return renderStatusPill(rep.status, cls, label);
                    })()}
                </div>
            </div>

            <!-- Executive Summary & Detailed AI Analysis Card -->
            <div class="action-section-card">
                <div class="action-section-title">
                    <svg class="action-section-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 2a8 8 0 0 0-8 8c0 3.3 2 6 5 7.4V20a1 1 0 0 0 1 1h4a1 1 0 0 0 1-1v-2.6c3-1.4 5-4.1 5-7.4a8 8 0 0 0-8-8z"/><path d="M9 22h6"/></svg>
                    <span>Executive Summary &amp; Detailed AI Analysis</span>
                </div>
                <div class="action-analysis-headline ${isGood ? 'good' : 'flagged'}">
                    ${escapeHtml(rep.summary_headline || 'Performance Assessment')}
                </div>
                <div class="action-analysis-body">
                    ${escapeHtml(rep.detailed_analysis || 'No detailed analysis text available.')}
                </div>
            </div>

            <!-- Violation Categories as Flat Horizontal Bars in Azure Scale -->
            <div class="action-section-card">
                <div class="action-section-title">
                    <svg class="action-section-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 20V10"/><path d="M12 20V4"/><path d="M6 20v-6"/></svg>
                    <span>Violation Categories &amp; Frequency</span>
                </div>
                <p class="action-section-subtitle">
                    Distribution of recurring brand guidelines and compliance deviations across past content cycles.
                </p>
                ${(() => {
                    let catEntries = [];
                    if (rep.error_trends && typeof rep.error_trends === 'object' && Object.keys(rep.error_trends).length > 0) {
                        catEntries = Object.entries(rep.error_trends).map(([name, count]) => ({
                            name: name.replace(/_/g, ' '),
                            count: Number(count) || 1
                        }));
                    } else if (Array.isArray(logs) && logs.length > 0) {
                        const counts = {};
                        logs.forEach(l => {
                            if (l.issue) {
                                const iss = l.issue;
                                const name = (iss.error_type || iss.category || (Array.isArray(iss.text) && iss.text[0] ? iss.text[0].problem : '') || (iss.violation_details && iss.violation_details.guideline_reference) || 'Brand Guideline Deviation').replace(/_/g, ' ');
                                counts[name] = (counts[name] || 0) + 1;
                            }
                        });
                        if (Object.keys(counts).length > 0) {
                            catEntries = Object.entries(counts).map(([name, count]) => ({ name, count }));
                        }
                    } else if (recurring.length > 0) {
                        catEntries = recurring.map((issue, idx) => ({
                            name: issue,
                            count: Math.max(1, recurring.length - idx)
                        }));
                    }

                    if (catEntries.length === 0) {
                        return `
                            <div class="action-clean-slate">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                                <span>Zero guideline violations recorded across recent audit cycles.</span>
                            </div>
                        `;
                    }

                    const maxCount = Math.max(...catEntries.map(c => c.count), 1);
                    return `
                        <div class="action-chart-container">
                            ${catEntries.map((cat, idx) => `
                                <div class="action-chart-row">
                                    <div class="action-chart-label-col">
                                        <span class="action-chart-category-name">${escapeHtml(cat.name)}</span>
                                        <span class="action-chart-category-count">${cat.count} occurrence${cat.count === 1 ? '' : 's'}</span>
                                    </div>
                                    <div class="action-chart-bar-col">
                                        <div class="action-chart-bar-track">
                                            <div class="action-chart-bar-fill shade-${idx % 5}" style="width: ${Math.round((cat.count / maxCount) * 100)}%;"></div>
                                        </div>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    `;
                })()}
            </div>

            <!-- Intervention & Coaching Timeline (Vertical Hairline with Dots) -->
            <div class="action-section-card">
                <div class="action-section-title">
                    <svg class="action-section-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                    <span>Intervention &amp; Coaching Timeline</span>
                </div>
                <p class="action-section-subtitle">
                    Chronological governance record and prescribed corrective coaching milestones.
                </p>
                <div class="action-timeline">
                    ${(() => {
                        const events = [];
                        if (Array.isArray(rep.historical_activity) && rep.historical_activity.length > 0) {
                            rep.historical_activity.forEach(act => {
                                events.push({
                                    date: act.date || 'Past Milestone',
                                    title: act.action,
                                    status: act.status || 'LOGGED',
                                    type: 'history'
                                });
                            });
                        }
                        if (actionsList.length > 0) {
                            actionsList.forEach((actionItem, idx) => {
                                events.push({
                                    date: 'Coaching Plan',
                                    title: actionItem,
                                    status: 'STEP #' + (idx + 1),
                                    type: 'recommendation'
                                });
                            });
                        }
                        if (events.length === 0 && rep.action_recommendation) {
                            events.push({
                                date: 'Standing Status',
                                title: rep.action_recommendation,
                                status: 'ACTIVE',
                                type: 'recommendation'
                            });
                        }
                        if (events.length === 0) {
                            return `<div class="action-empty-timeline">No intervention records or corrective milestones logged for this creator.</div>`;
                        }
                        return events.map(ev => `
                            <div class="action-timeline-item">
                                <div class="action-timeline-dot ${ev.type}"></div>
                                <div class="action-timeline-content">
                                    <div class="action-timeline-header">
                                        <span class="action-timeline-date">${escapeHtml(ev.date)}</span>
                                        <span class="action-timeline-badge ${escapeHtml(ev.status.toLowerCase().replace(/[^a-z0-9]/g, '-'))}">${escapeHtml(ev.status)}</span>
                                    </div>
                                    <div class="action-timeline-body">${escapeHtml(ev.title)}</div>
                                </div>
                            </div>
                        `).join('');
                    })()}
                </div>
            </div>

            <!-- Recent Content Logs (Audit Evidence) -->
            <div class="action-section-card">
                <div class="action-section-title">
                    <svg class="action-section-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                    <span>Audit Evidence: Recent Content Logs (${logs.length})</span>
                </div>
                <p class="action-section-subtitle">
                    Recent log entries from the <code>logs</code> table evaluated in this cumulative report.
                </p>

                ${logs.length === 0 ? `
                    <div class="action-empty-logs">No past log entries recorded for this creator.</div>
                ` : `
                    <div class="action-logs-list">
                        ${logs.map(log => {
                            const post = log.post || {};
                            const iss = log.issue;
                            const isFlagged = Boolean(iss && (typeof iss === 'object' ? Object.keys(iss).length > 0 : iss));
                            const textSnippet = post.text || post.headline || post.caption || (post.files && post.files.length ? '[File Attachment]' : 'Post content');
                            const errorDesc = iss ? (iss.error_type || iss.category || (Array.isArray(iss.text) && iss.text[0] ? iss.text[0].problem : '') || (iss.violation_details && iss.violation_details.guideline_reference ? iss.violation_details.guideline_reference : 'Flagged Brand Guideline Issue')) : '';

                            return `
                                <div class="audit-evidence-item ${isFlagged ? 'flagged' : 'clean'}">
                                    <div class="audit-evidence-header">
                                        <div class="audit-evidence-tags">
                                            <span class="tag-badge ${isFlagged ? 'violation' : 'pass'}">
                                                ${isFlagged ? 'Violation Logged' : 'Clean Post'}
                                            </span>
                                            <span class="audit-evidence-logid">Log #${log.id}</span>
                                        </div>
                                        <span class="audit-evidence-timestamp">${new Date(log.timestamp).toLocaleString()}</span>
                                    </div>
                                    <div class="audit-evidence-snippet">
                                        ${escapeHtml(textSnippet)}
                                    </div>
                                    ${isFlagged ? `
                                        <div class="audit-evidence-violation">
                                            <strong>Violation:</strong> ${escapeHtml(errorDesc)}
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
                    <svg class="action-section-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                    <span>Official Manager Review &amp; Follow-Up Notes</span>
                    <span class="comment-count-pill">
                        ${comments.length}
                    </span>
                </div>

                <!-- Existing Comments Feed -->
                <div class="action-comments-list">
                    ${comments.length === 0 ? `
                        <div class="action-empty-comments" id="empty-comments-notice">
                            No managerial review notes logged yet.
                        </div>
                    ` : comments.map(c => `
                        <div class="manager-comment-item">
                            <div class="comment-header">
                                <div class="comment-author-badge">
                                    <div class="comment-avatar">
                                        ${escapeHtml((c.user_name || 'M').charAt(0).toUpperCase())}
                                    </div>
                                    <div class="comment-author-text">
                                        <span class="comment-author-name">${escapeHtml(c.user_name || 'Manager')}</span>
                                        <span class="comment-author-designation">${escapeHtml(c.designation || 'Reviewer')}</span>
                                    </div>
                                </div>
                                <span class="comment-timestamp">${new Date(c.timestamp).toLocaleString()}</span>
                            </div>
                            <div class="comment-body">
                                ${escapeHtml(c.text)}
                            </div>
                        </div>
                    `).join('')}
                </div>

                <!-- Role-Gated Input -->
                <div class="top-comment-composer">
                    ${canApprove ? `
                        <div class="composer-title">
                            Post an Official Governance Review Note:
                        </div>
                        <textarea id="action-comment-input" class="form-textarea" rows="3" placeholder="Write an official governance review, coaching note, or follow-up action..."></textarea>
                        <div class="composer-submit-row">
                            <button class="btn-primary" id="btn-submit-action-comment">
                                Post Review Note
                            </button>
                        </div>
                    ` : `
                        <div class="readonly-explanatory-note">
                            <strong>READ-ONLY:</strong> Only authorized approvers (<code>can_approve = 'Y'</code>) can post review notes on employee governance reports.
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
                <div class="banner-notice read-only action-access-denied">
                    <svg class="banner-status-icon" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                        <circle cx="12" cy="12" r="10"/>
                        <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>
                    </svg>
                    <div>
                        <strong>ACCESS DENIED:</strong>
                        <p class="banner-status-msg">You do not possess compliance authority (<code>can_take_action = 'N'</code>). This tab requires administrative action credentials.</p>
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
