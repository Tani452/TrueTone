/**
 * Logs Tab Frontend Module
 * Controls AI Brand Guideline Violations, error inspection, and audit history.
 */

window.LogsTab = {
    selectedSeverity: '',

    async load() {
        const container = document.getElementById('logs-list-container');
        container.innerHTML = '<div style="color: #94a3b8; padding: 20px;">Fetching AI audit logs...</div>';

        // Load stats
        this.loadAuditStats();

        try {
            const params = new URLSearchParams();
            if (this.selectedSeverity) params.append('severity', this.selectedSeverity);

            const res = await fetch(`/api/logs?${params.toString()}`);
            const json = await res.json();

            if (!json.success) throw new Error(json.error);

            const logs = json.data || [];
            document.getElementById('badge-logs-count').textContent = json.total || logs.length;

            if (logs.length === 0) {
                container.innerHTML = `
                    <div style="background: #1a2234; padding: 40px; border-radius: 10px; text-align: center; color: #94a3b8;">
                        <h3>No Audit Logs Found</h3>
                        <p style="margin-top: 8px;">No brand guideline violations match the selected severity.</p>
                    </div>`;
                return;
            }

            container.innerHTML = logs.map(item => this.renderLogCard(item)).join('');
            this.bindEvents();
        } catch (err) {
            container.innerHTML = `<div style="color: #ef4444; padding: 20px;">Failed to load audit logs: ${err.message}</div>`;
        }
    },

    async loadAuditStats() {
        try {
            const res = await fetch('/api/logs/stats');
            const data = await res.json();
            if (data.success && data.overview) {
                const o = data.overview;
                if (document.getElementById('stat-logs-critical')) {
                    document.getElementById('stat-logs-critical').textContent = o.critical_count || 0;
                }
                if (document.getElementById('stat-logs-tone')) {
                    document.getElementById('stat-logs-tone').textContent = o.high_count || 0;
                }
                if (document.getElementById('stat-logs-a11y')) {
                    document.getElementById('stat-logs-a11y').textContent = o.medium_count || 0;
                }
            }
        } catch (e) {
            // Non-critical
        }
    },

    renderLogCard(item) {
        const issue = item.issue || {};
        const post = item.post || {};
        const severity = (issue.severity || 'LOW').toUpperCase();
        const dateStr = new Date(item.created_at).toLocaleString();
        const details = issue.violation_details || {};

        const severityTagClass = severity === 'CRITICAL' ? 'critical' : severity === 'HIGH' ? 'high' : severity === 'MEDIUM' ? 'medium' : 'low';

        return `
            <div class="card-item" data-id="${item.id}">
                <div class="card-item-header">
                    <div>
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <span class="badge-tag ${severityTagClass}">${severity}</span>
                            <span class="card-title">${(issue.error_type || 'Brand Violation').replace(/_/g, ' ')}</span>
                        </div>
                        <div class="card-meta">
                            <span>Author: <strong>${item.author_name}</strong> (${item.author_department || 'Unknown Dept'})</span>
                            <span>•</span>
                            <span>Logged: ${dateStr}</span>
                            <span>•</span>
                            <span>AI Confidence: ${(Number(issue.ai_confidence || 0.95) * 100).toFixed(0)}%</span>
                        </div>
                    </div>
                </div>

                <div class="card-body">
                    <div style="font-size: 0.85rem; color: #cbd5e1; margin-bottom: 8px;">
                        <strong>Associated Post/Draft:</strong> "${post.headline || post.title || post.caption || JSON.stringify(post)}"
                    </div>

                    ${details.flagged_phrases ? `
                        <div style="background: rgba(239, 68, 68, 0.08); border-left: 3px solid #ef4444; padding: 8px 12px; border-radius: 4px; margin-bottom: 8px;">
                            <span style="color: #f87171; font-size: 0.82rem; font-weight: 600;">Flagged Content:</span>
                            <span style="color: #fca5a5; font-size: 0.82rem;"> "${Array.isArray(details.flagged_phrases) ? details.flagged_phrases.join(', ') : details.flagged_phrases}"</span>
                        </div>
                    ` : ''}

                    ${details.guideline_reference ? `
                        <div style="font-size: 0.8rem; color: #94a3b8; margin-bottom: 4px;">
                            <strong>Guideline:</strong> ${details.guideline_reference}
                        </div>
                    ` : ''}

                    ${details.required_remedy ? `
                        <div style="font-size: 0.82rem; color: #34d399; margin-top: 6px;">
                            <strong>Remedy / Correction:</strong> ${details.required_remedy}
                        </div>
                    ` : ''}
                </div>

                <div class="card-footer" style="margin-top: 10px; padding-top: 10px;">
                    <span style="font-size: 0.78rem; color: #64748b;">PostgreSQL Foreign Key: published_by &rarr; users(user_id: ${item.published_by})</span>
                    <button class="btn-vote" onclick="LogsTab.inspectPayload('${item.id}')">
                        Inspect Raw Issue JSON
                    </button>
                </div>
            </div>
        `;
    },

    bindEvents() {
        document.querySelectorAll('#logs-severity-pills .filter-pill').forEach(pill => {
            pill.onclick = () => {
                document.querySelectorAll('#logs-severity-pills .filter-pill').forEach(p => p.classList.remove('active'));
                pill.classList.add('active');
                this.selectedSeverity = pill.dataset.severity;
                this.load();
            };
        });
    },

    async inspectPayload(id) {
        try {
            const res = await fetch(`/api/logs?limit=50`);
            const data = await res.json();
            const logItem = (data.data || []).find(l => String(l.id) === String(id));

            if (!logItem) return;

            const html = `
                <div>
                    <p style="font-size: 0.82rem; color: #94a3b8; margin-bottom: 8px;">
                        Structured AI Issue JSON payload:
                    </p>
                    <pre class="code-json">${JSON.stringify(logItem.issue, null, 2)}</pre>
                </div>
            `;
            TrueTone.openModal(`AI Issue Log #${id}`, html);
        } catch (err) {
            TrueTone.showToast(`Error: ${err.message}`, 'error');
        }
    }
};
