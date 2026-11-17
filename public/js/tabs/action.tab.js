/**
 * =============================================================================
 * TrueTone Tab Module: ACTIONS (action_tab)
 * User compliance scorecards, error trend analytics, and policy enforcement.
 * Accessible ONLY when currentUser.can_take_action === 'Y'.
 * =============================================================================
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

    // 1. Completely clear dynamic workspace
    workspace.innerHTML = '';

    // 2. Build isolated tab container
    const container = document.createElement('div');
    container.className = 'tab-viewport';
    container.id = 'actions-tab-view';

    container.innerHTML = `
        <div class="tab-header">
            <h2>🛡️ User Performance & Corrective Actions</h2>
            <p>Audit employee brand drift, track cumulative violation trends, enforce remedial coaching, and manage compliance governance.</p>
        </div>

        <!-- Metric KPI Cards -->
        <div class="stat-grid">
            <div class="stat-card cyan">
                <div class="label">Monitored Creators</div>
                <div class="value" id="kpi-actions-users">--</div>
                <div class="subtext">Cumulative profiles tracked</div>
            </div>
            <div class="stat-card emerald">
                <div class="label">Negligible Risk Users</div>
                <div class="value" id="kpi-actions-lowrisk">--</div>
                <div class="subtext">Passing 95%+ first-pass audits</div>
            </div>
            <div class="stat-card amber">
                <div class="label">Enforced Interventions</div>
                <div class="value" id="kpi-actions-interventions">--</div>
                <div class="subtext">Coaching modules logged</div>
            </div>
        </div>

        <!-- =================================================================== -->
        <!-- PLACEHOLDER CONTAINER 1: User Performance Scorecard Table          -->
        <!-- Plug in API call: GET /api/actions                                 -->
        <!-- =================================================================== -->
        <div class="placeholder-card" id="placeholder-actions-table">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; flex-wrap: wrap; gap: 10px;">
                <div>
                    <span class="placeholder-badge">PLACEHOLDER CONTAINER 1: USER COMPLIANCE SCORECARDS (/api/actions)</span>
                    <h3>Employee Activity & Risk Directory</h3>
                    <p class="desc" style="margin-bottom: 0;">Aggregated pass rates, current risk tier, and historical action items.</p>
                </div>
                <button class="btn-secondary" onclick="window.loadActionsProfiles()">
                    ↻ Refresh Scorecards
                </button>
            </div>

            <div class="table-responsive">
                <table>
                    <thead>
                        <tr>
                            <th>User ID</th>
                            <th>Employee Name</th>
                            <th>Designation</th>
                            <th>First-Pass Rate</th>
                            <th>Risk Tier</th>
                            <th>Primary Error Trends</th>
                            <th>Enforcement</th>
                        </tr>
                    </thead>
                    <tbody id="actions-table-body">
                        <tr><td colspan="7" style="text-align: center; color: var(--text-muted); padding: 24px;">Querying actions table from PostgreSQL...</td></tr>
                    </tbody>
                </table>
            </div>
        </div>

        <!-- =================================================================== -->
        <!-- PLACEHOLDER CONTAINER 2: Cumulative Error Trends Breakdown         -->
        <!-- =================================================================== -->
        <div class="placeholder-card" id="placeholder-actions-trends">
            <span class="placeholder-badge">PLACEHOLDER CONTAINER 2: CUMULATIVE BRAND DRIFT ANALYTICS</span>
            <h3>Enterprise Violation Breakdown (PostgreSQL GIN Indexed)</h3>
            <p class="desc">Real-time aggregation across all violation events in the <code>logs</code> and <code>actions</code> tables.</p>

            <div class="guidelines-grid" id="actions-trends-grid">
                <div class="guideline-item">
                    <div style="display: flex; justify-content: space-between;">
                        <strong style="color: #f87171;">Tone & Voice Deviation</strong>
                        <span class="tag-badge high">5 Flags</span>
                    </div>
                    <p style="font-size: 0.8rem; color: var(--text-muted); margin-top: 4px;">Frequent usage of unverified superlatives and casual slang.</p>
                </div>
                <div class="guideline-item">
                    <div style="display: flex; justify-content: space-between;">
                        <strong style="color: #fcd34d;">Grammar & Syntax Errors</strong>
                        <span class="tag-badge medium">2 Flags</span>
                    </div>
                    <p style="font-size: 0.8rem; color: var(--text-muted); margin-top: 4px;">Draft headline misspellings and punctuation discrepancies.</p>
                </div>
                <div class="guideline-item">
                    <div style="display: flex; justify-content: space-between;">
                        <strong style="color: #ef4444;">Statutory Safe Harbor</strong>
                        <span class="tag-badge critical">1 Breach</span>
                    </div>
                    <p style="font-size: 0.8rem; color: var(--text-muted); margin-top: 4px;">Financial projections quoted without standard SEC disclaimer.</p>
                </div>
                <div class="guideline-item">
                    <div style="display: flex; justify-content: space-between;">
                        <strong style="color: #6ee7b7;">Accessibility Contrast</strong>
                        <span class="tag-badge low">1 Notice</span>
                    </div>
                    <p style="font-size: 0.8rem; color: var(--text-muted); margin-top: 4px;">Gradient overlay contrast ratio below 4.5:1 threshold.</p>
                </div>
            </div>
        </div>

        <!-- =================================================================== -->
        <!-- PLACEHOLDER CONTAINER 3: Direct API Integration Endpoint Target    -->
        <!-- =================================================================== -->
        <div class="placeholder-card" style="border-style: dashed;">
            <span class="placeholder-badge" style="background: rgba(6, 182, 212, 0.15); color: #67e8f9; border-color: rgba(6, 182, 212, 0.3);">
                API HOOK: ACTIONS TAB BACKEND INTERFACES
            </span>
            <p style="font-size: 0.8rem; color: var(--text-secondary); line-height: 1.6; margin: 0;">
                • <code>GET /api/actions</code> &rarr; Returns user-level cumulative reports and activity arrays.<br>
                • <code>GET /api/actions/user/:userId</code> &rarr; Returns full profile payload for a specific creator.<br>
                • <code>POST /api/actions/record</code> &rarr; Records an administrative intervention, training milestone, or risk tier override.
            </p>
        </div>
    `;

    workspace.appendChild(container);

    // Initial load of profiles
    window.loadActionsProfiles();
}

window.cachedActionsProfiles = [];
window.loadActionsProfiles = async function () {
    const tbody = document.getElementById('actions-table-body');
    if (!tbody) return;

    try {
        const res = await fetch('/api/actions');
        const data = await res.json();

        if (!data.success) throw new Error(data.error);

        window.cachedActionsProfiles = data.data || [];
        const usersKpi = document.getElementById('kpi-actions-users');
        if (usersKpi) usersKpi.textContent = data.total || window.cachedActionsProfiles.length;

        let lowRiskCount = 0;
        let interventionCount = 0;

        window.cachedActionsProfiles.forEach(p => {
            const sum = (p.cumulative_report || {}).summary || {};
            if (['NEGLIGIBLE', 'LOW'].includes(sum.current_risk_level)) lowRiskCount++;
            const hist = (p.cumulative_report || {}).historical_activity || [];
            interventionCount += hist.length;
        });

        const lowRiskKpi = document.getElementById('kpi-actions-lowrisk');
        if (lowRiskKpi) lowRiskKpi.textContent = lowRiskCount;

        const intervKpi = document.getElementById('kpi-actions-interventions');
        if (intervKpi) intervKpi.textContent = interventionCount;

        if (window.cachedActionsProfiles.length === 0) {
            tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--text-muted); padding: 20px;">No user action profiles recorded.</td></tr>`;
            return;
        }

        tbody.innerHTML = window.cachedActionsProfiles.map(item => {
            const report = item.cumulative_report || {};
            const summary = report.summary || {};
            const passRate = summary.first_time_pass_rate !== undefined ? `${(summary.first_time_pass_rate * 100).toFixed(0)}%` : 'N/A';
            const risk = summary.current_risk_level || 'LOW';
            const riskClass = risk === 'CRITICAL' ? 'critical' : risk === 'HIGH' ? 'high' : risk === 'MEDIUM' ? 'medium' : 'low';
            const trends = report.error_trends || {};
            const trendKeys = Object.keys(trends);

            const trendsBadges = trendKeys.length > 0 ? trendKeys.map(k => `
                <span style="font-size: 0.72rem; background: rgba(255,255,255,0.06); padding: 2px 6px; border-radius: 4px; margin-right: 4px;">
                    ${k.replace(/_/g, ' ')} (${trends[k]})
                </span>
            `).join('') : '<span style="color: var(--text-muted); font-size: 0.78rem;">Clean Track Record</span>';

            return `
                <tr>
                    <td><code>#${item.user_id}</code></td>
                    <td><strong>${item.user_name}</strong></td>
                    <td><span style="color: #60a5fa;">${item.designation || 'Staff'}</span></td>
                    <td><strong>${passRate}</strong></td>
                    <td><span class="tag-badge ${riskClass}">${risk}</span></td>
                    <td style="max-width: 240px;">${trendsBadges}</td>
                    <td>
                        <div style="display: flex; gap: 6px;">
                            <button class="btn-secondary" style="padding: 4px 8px; font-size: 0.76rem;" onclick="window.viewUserActionHistory('${item.user_id}')">
                                History
                            </button>
                            <button class="btn-primary" style="padding: 4px 8px; font-size: 0.76rem;" onclick="window.openEnforceActionModal('${item.user_id}', '${(item.user_name || '').replace(/'/g, "\\'")}')">
                                + Enforce Action
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    } catch (err) {
        tbody.innerHTML = `<tr><td colspan="7" style="color: var(--accent-rose); text-align: center; padding: 18px;">Error loading action profiles: ${err.message}</td></tr>`;
    }
};

window.viewUserActionHistory = function (userId) {
    const profile = window.cachedActionsProfiles.find(p => String(p.user_id) === String(userId));
    if (!profile) return;

    const rep = profile.cumulative_report || {};
    const history = rep.historical_activity || [];

    const historyHtml = history.length > 0 ? history.map(h => `
        <div style="border-left: 3px solid var(--accent-blue); padding-left: 12px; margin-bottom: 12px;">
            <div style="font-size: 0.78rem; color: var(--text-muted);">${h.date || 'Recent'} &bull; Status: <strong style="color: var(--accent-emerald);">${h.status || 'LOGGED'}</strong></div>
            <div style="color: #f8fafc; font-size: 0.88rem; margin-top: 2px;">${h.action}</div>
        </div>
    `).join('') : '<div style="color: var(--text-muted);">No recorded interventions for this user.</div>';

    const modalHtml = `
        <div>
            <div style="margin-bottom: 14px;">
                <h4 style="color: #f8fafc;">${profile.user_name} &bull; ${profile.designation}</h4>
                <div style="font-size: 0.82rem; color: var(--accent-cyan); margin-top: 4px;">
                    Governance Recommendation: ${rep.action_recommendation || 'Standard privileges active.'}
                </div>
            </div>

            <div style="margin-bottom: 16px;">
                <label class="form-label">Corrective & Audit Timeline</label>
                ${historyHtml}
            </div>

            <label class="form-label">Full PostgreSQL JSONB Payload</label>
            <pre style="background: #070b14; padding: 10px; border-radius: 6px; font-size: 0.76rem; color: #38bdf8; overflow-x: auto; border: 1px solid var(--border-subtle);">${JSON.stringify(rep, null, 2)}</pre>
        </div>
    `;

    if (window.TrueTone) {
        window.TrueTone.openModal(`User Compliance Record: ${profile.user_name}`, modalHtml);
    }
};

window.openEnforceActionModal = function (userId, userName) {
    const modalHtml = `
        <div>
            <p style="color: #cbd5e1; font-size: 0.86rem; margin-bottom: 14px;">
                Log an administrative intervention or risk tier adjustment for <strong>${userName}</strong>.
            </p>
            <div class="form-group">
                <label class="form-label">Action / Coaching Description *</label>
                <input type="text" id="action-desc-input" class="form-input" placeholder="e.g. Completed Q4 2026 Brand Safe Harbor Refresher" required>
            </div>
            <div class="form-group">
                <label class="form-label">Intervention Status</label>
                <select id="action-status-select" class="form-select">
                    <option value="COMPLETED">COMPLETED</option>
                    <option value="IN_PROGRESS">IN_PROGRESS</option>
                    <option value="RESOLVED">RESOLVED</option>
                </select>
            </div>
            <div class="form-group">
                <label class="form-label">Adjust Risk Tier (Optional)</label>
                <select id="action-tier-select" class="form-select">
                    <option value="">Maintain Existing Tier</option>
                    <option value="NEGLIGIBLE">NEGLIGIBLE (0 violations)</option>
                    <option value="LOW">LOW (Passed remediation)</option>
                    <option value="MEDIUM">MEDIUM (Requires pre-screening)</option>
                    <option value="HIGH">HIGH (Restricted publishing)</option>
                </select>
            </div>
            <div style="display: flex; justify-content: flex-end; gap: 10px; margin-top: 18px;">
                <button class="btn-secondary" onclick="window.TrueTone.closeModal()">Cancel</button>
                <button class="btn-primary" onclick="window.submitActionEnforcement('${userId}')">Record Action to PostgreSQL</button>
            </div>
        </div>
    `;

    if (window.TrueTone) {
        window.TrueTone.openModal(`Enforce Action for ${userName}`, modalHtml);
    }
};

window.submitActionEnforcement = async function (userId) {
    const title = document.getElementById('action-desc-input').value.trim();
    const status = document.getElementById('action-status-select').value;
    const risk = document.getElementById('action-tier-select').value;

    if (!title) {
        if (window.TrueTone) window.TrueTone.showToast('Please enter an action description', 'error');
        return;
    }

    try {
        const res = await fetch('/api/actions/record', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                userId,
                actionTitle: title,
                actionStatus: status,
                updatedRiskLevel: risk || undefined,
            }),
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.error);

        if (window.TrueTone) {
            window.TrueTone.closeModal();
            window.TrueTone.showToast('Action recorded successfully in actions table', 'success');
        }
        window.loadActionsProfiles();
    } catch (err) {
        if (window.TrueTone) window.TrueTone.showToast(`Action enforcement failed: ${err.message}`, 'error');
    }
};

// Global export
window.action_tab = action_tab;
