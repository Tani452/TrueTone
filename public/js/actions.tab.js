/**
 * Actions Tab Frontend Module
 * Controls User-level error trends, cumulative reports, and corrective interventions.
 */

window.ActionsTab = {
    cachedData: [],

    async load() {
        const tbody = document.getElementById('actions-table-body');
        tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: #94a3b8;">Loading user activity reports...</td></tr>';

        try {
            const res = await fetch('/api/actions');
            const json = await res.json();

            if (!json.success) throw new Error(json.error);

            this.cachedData = json.data || [];
            document.getElementById('badge-actions-count').textContent = json.total || this.cachedData.length;
            document.getElementById('stat-actions-users').textContent = json.total || this.cachedData.length;

            let lowRiskCount = 0;
            let actionInterventions = 0;

            this.cachedData.forEach(item => {
                const summary = (item.cumulative_report || {}).summary || {};
                if (['NEGLIGIBLE', 'LOW'].includes(summary.current_risk_level)) lowRiskCount++;
                const history = (item.cumulative_report || {}).historical_activity || [];
                actionInterventions += history.length;
            });

            document.getElementById('stat-actions-lowrisk').textContent = lowRiskCount;
            document.getElementById('stat-actions-interventions').textContent = actionInterventions;

            if (this.cachedData.length === 0) {
                tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding: 20px;">No user action profiles found.</td></tr>';
                return;
            }

            tbody.innerHTML = this.cachedData.map(item => this.renderTableRow(item)).join('');
        } catch (err) {
            tbody.innerHTML = `<tr><td colspan="7" style="color: #ef4444; text-align: center; padding: 20px;">Failed to load actions: ${err.message}</td></tr>`;
        }
    },

    renderTableRow(item) {
        const report = item.cumulative_report || {};
        const summary = report.summary || {};
        const errorTrends = report.error_trends || {};
        const passRate = summary.first_time_pass_rate !== undefined 
            ? `${(summary.first_time_pass_rate * 100).toFixed(0)}%` 
            : 'N/A';
        const riskLevel = summary.current_risk_level || 'LOW';
        const riskClass = riskLevel === 'CRITICAL' ? 'critical' : riskLevel === 'HIGH' ? 'high' : riskLevel === 'MEDIUM' ? 'medium' : 'low';

        const errorKeys = Object.keys(errorTrends);
        const errorTrendsHtml = errorKeys.length > 0 
            ? errorKeys.map(k => `<span style="font-size: 0.75rem; background: rgba(255,255,255,0.06); padding: 2px 6px; border-radius: 4px; margin-right: 4px;">${k.replace(/_/g, ' ')} (${errorTrends[k]})</span>`).join('')
            : '<span style="color: #64748b; font-size: 0.8rem;">Clean Track Record</span>';

        return `
            <tr>
                <td><strong>#${item.user_id}</strong></td>
                <td>
                    <div style="font-weight: 600; color: #f8fafc;">${item.user_name}</div>
                </td>
                <td>${item.designation || 'Staff'}</td>
                <td>
                    <strong style="color: #60a5fa;">${passRate}</strong>
                    <div style="font-size: 0.72rem; color: #64748b;">${summary.approved_count || 0} of ${summary.total_submitted || 0} passed</div>
                </td>
                <td>
                    <span class="badge-tag ${riskClass}">${riskLevel}</span>
                </td>
                <td style="max-width: 250px;">
                    ${errorTrendsHtml}
                </td>
                <td>
                    <div style="display: flex; gap: 8px;">
                        <button class="btn-vote" onclick="ActionsTab.viewHistory('${item.user_id}')">
                            Activity History
                        </button>
                        <button class="btn-vote" onclick="ActionsTab.openLogActionModal('${item.user_id}', '${(item.user_name || '').replace(/'/g, "\\'")}')">
                            + Log Action
                        </button>
                    </div>
                </td>
            </tr>
        `;
    },

    viewHistory(userId) {
        const item = this.cachedData.find(d => String(d.user_id) === String(userId));
        if (!item) return;

        const report = item.cumulative_report || {};
        const history = report.historical_activity || [];

        const historyList = history.length > 0 ? history.map(h => `
            <div style="border-left: 3px solid #3b82f6; padding-left: 12px; margin-bottom: 12px;">
                <div style="font-size: 0.82rem; color: #94a3b8;">${h.date || 'Recent'} &bull; Status: <strong style="color: #34d399;">${h.status || 'LOGGED'}</strong></div>
                <div style="color: #f8fafc; font-size: 0.9rem; margin-top: 2px;">${h.action}</div>
            </div>
        `).join('') : '<div style="color: #94a3b8;">No historical actions logged yet.</div>';

        const html = `
            <div>
                <h4 style="margin-bottom: 6px; color: #f8fafc;">${item.user_name} (${item.designation})</h4>
                <p style="color: #94a3b8; font-size: 0.85rem; margin-bottom: 16px;">
                    Recommendations: ${report.action_recommendation || 'Standard publishing privileges active.'}
                </p>
                <div style="margin-bottom: 16px;">
                    <h5 style="color: #60a5fa; font-size: 0.85rem; text-transform: uppercase; margin-bottom: 10px;">Intervention & Remediation Timeline</h5>
                    ${historyList}
                </div>
                <h5 style="color: #60a5fa; font-size: 0.85rem; text-transform: uppercase; margin-bottom: 8px;">Cumulative JSON Payload</h5>
                <pre class="code-json">${JSON.stringify(report, null, 2)}</pre>
            </div>
        `;

        TrueTone.openModal(`User Performance Profile #${userId}`, html);
    },

    openLogActionModal(userId, userName) {
        const html = `
            <div>
                <p style="color: #cbd5e1; margin-bottom: 14px;">
                    Record a managerial action, coaching milestone, or risk adjustment for <strong>${userName}</strong>.
                </p>
                <div style="margin-bottom: 12px;">
                    <label style="font-size: 0.8rem; color: #94a3b8; display: block; margin-bottom: 4px;">Action / Remediation Description</label>
                    <input type="text" id="action-title-input" placeholder="e.g. Completed Q4 Brand Safety Refresher" style="width: 100%; padding: 8px; background: #0f172a; border: 1px solid #334155; color: #fff; border-radius: 6px;">
                </div>
                <div style="margin-bottom: 12px;">
                    <label style="font-size: 0.8rem; color: #94a3b8; display: block; margin-bottom: 4px;">Action Status</label>
                    <select id="action-status-input" style="width: 100%; padding: 8px; background: #0f172a; border: 1px solid #334155; color: #fff; border-radius: 6px;">
                        <option value="COMPLETED">COMPLETED</option>
                        <option value="IN_PROGRESS">IN_PROGRESS</option>
                        <option value="RESOLVED">RESOLVED</option>
                    </select>
                </div>
                <div style="margin-bottom: 16px;">
                    <label style="font-size: 0.8rem; color: #94a3b8; display: block; margin-bottom: 4px;">Adjust Risk Tier (Optional)</label>
                    <select id="action-risk-input" style="width: 100%; padding: 8px; background: #0f172a; border: 1px solid #334155; color: #fff; border-radius: 6px;">
                        <option value="">Keep Existing</option>
                        <option value="NEGLIGIBLE">NEGLIGIBLE</option>
                        <option value="LOW">LOW</option>
                        <option value="MEDIUM">MEDIUM</option>
                        <option value="HIGH">HIGH</option>
                    </select>
                </div>
                <div style="display: flex; justify-content: flex-end; gap: 10px;">
                    <button class="btn-vote" onclick="TrueTone.closeModal()">Cancel</button>
                    <button class="btn-primary" onclick="ActionsTab.submitActionRecord('${userId}')">Save Action to PostgreSQL</button>
                </div>
            </div>
        `;

        TrueTone.openModal(`Log Action for ${userName}`, html);
    },

    async submitActionRecord(userId) {
        const title = document.getElementById('action-title-input').value.trim();
        const status = document.getElementById('action-status-input').value;
        const risk = document.getElementById('action-risk-input').value;

        if (!title) {
            TrueTone.showToast('Please enter an action description', 'error');
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

            TrueTone.closeModal();
            TrueTone.showToast('Action logged successfully in actions table', 'success');
            this.load();
        } catch (err) {
            TrueTone.showToast(`Failed: ${err.message}`, 'error');
        }
    }
};
