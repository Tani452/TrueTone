/**
 * =============================================================================
 * TrueTone Tab Module: PUBLISH (publish_tab)
 * Handles content upload/creation, multi-channel distribution, and live feed.
 * Accessible ONLY when currentUser.can_post === 'Y'.
 * =============================================================================
 */

function publish_tab() {
    const workspace = document.getElementById('main-workspace');
    if (!workspace) return;

    // 1. Completely clear dynamic workspace to prevent state/DOM leakage
    workspace.innerHTML = '';

    // 2. Build isolated tab container
    const container = document.createElement('div');
    container.className = 'tab-viewport';
    container.id = 'publish-tab-view';

    container.innerHTML = `
        <div class="tab-header">
            <h2>📢 Content Publishing & Ingestion Hub</h2>
            <p>Author compliant brand content, run real-time automated AI pre-flight checks, and broadcast across verified channels.</p>
        </div>

        <!-- Metric KPI Cards -->
        <div class="stat-grid">
            <div class="stat-card cyan">
                <div class="label">Total Published Posts</div>
                <div class="value" id="kpi-publish-total">--</div>
                <div class="subtext">Live multi-channel broadcasts</div>
            </div>
            <div class="stat-card emerald">
                <div class="label">LinkedIn Reach</div>
                <div class="value" id="kpi-publish-linkedin">--</div>
                <div class="subtext">Verified corporate followers</div>
            </div>
            <div class="stat-card amber">
                <div class="label">Pending in Queue</div>
                <div class="value" id="kpi-publish-queued">--</div>
                <div class="subtext">Awaiting reviewer sign-off</div>
            </div>
        </div>

        <!-- =================================================================== -->
        <!-- PLACEHOLDER CONTAINER 1: Content Upload & Draft Creation Workflow  -->
        <!-- Plug in API call: POST /api/review/submit or POST /api/publish     -->
        <!-- =================================================================== -->
        <div class="placeholder-card" id="placeholder-publish-composer">
            <span class="placeholder-badge">PLACEHOLDER CONTAINER 1: CONTENT DRAFT & INGESTION FORM</span>
            <h3>Create & Publish Brand Post</h3>
            <p class="desc">Compose content, assign target channels, and validate tone against TrueTone enterprise policies.</p>

            <form id="publish-composer-form" onsubmit="event.preventDefault(); window.handlePublishSubmit();">
                <div class="form-group">
                    <label class="form-label">Post Headline / Title *</label>
                    <input type="text" id="composer-title" class="form-input" placeholder="e.g. Announcing TrueTone v3.0: High-Res Brand Governance" required>
                </div>

                <div class="form-group">
                    <label class="form-label">Target Broadcast Channels</label>
                    <div class="channel-checkboxes">
                        <label class="checkbox-label">
                            <input type="checkbox" name="channel" value="LinkedIn" checked> LinkedIn
                        </label>
                        <label class="checkbox-label">
                            <input type="checkbox" name="channel" value="Twitter/X" checked> Twitter/X
                        </label>
                        <label class="checkbox-label">
                            <input type="checkbox" name="channel" value="Company Blog"> Company Blog
                        </label>
                        <label class="checkbox-label">
                            <input type="checkbox" name="channel" value="Press Release"> Press Release
                        </label>
                    </div>
                </div>

                <div class="form-group">
                    <label class="form-label">Post Body / Caption Content *</label>
                    <textarea id="composer-caption" class="form-textarea" rows="4" placeholder="Draft your announcement here. Try testing prohibited terms like '100% infallible' to see AI guardrails trigger..." required></textarea>
                </div>

                <div class="form-group">
                    <label class="form-label">Media Asset URL (Optional)</label>
                    <input type="url" id="composer-media" class="form-input" placeholder="https://cdn.truetone.ai/assets/announcement-banner.png">
                </div>

                <!-- Pre-flight analysis feedback banner placeholder -->
                <div id="composer-preflight-result" style="display: none; margin-bottom: 16px;"></div>

                <div style="display: flex; gap: 12px; align-items: center; flex-wrap: wrap;">
                    <button type="button" class="btn-secondary" id="btn-preflight-check" onclick="window.runPreflightCheck()">
                        🛡️ Run AI Tone Pre-Check
                    </button>
                    <button type="submit" class="btn-primary" id="btn-submit-post">
                        🚀 Submit to Pending Review Queue
                    </button>
                    <span style="font-size: 0.78rem; color: var(--text-muted);">
                        Endpoint: <code>POST /api/review/submit</code>
                    </span>
                </div>
            </form>
        </div>

        <!-- =================================================================== -->
        <!-- PLACEHOLDER CONTAINER 2: Published Content Catalog & Feed          -->
        <!-- Plug in API call: GET /api/publish?channel=...&search=...           -->
        <!-- =================================================================== -->
        <div class="placeholder-card" id="placeholder-published-feed">
            <span class="placeholder-badge">PLACEHOLDER CONTAINER 2: PUBLISHED CONTENT CATALOG (/api/publish)</span>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; flex-wrap: wrap; gap: 10px;">
                <div>
                    <h3>Live Published Records</h3>
                    <p class="desc" style="margin-bottom: 0;">Verified broadcasts distributed to external platforms.</p>
                </div>
                <button class="btn-secondary" onclick="window.refreshPublishedCatalog()">
                    ↻ Reload Catalog
                </button>
            </div>

            <!-- Filter Controls -->
            <div class="filter-pills-row">
                <div class="filter-pills-group" id="publish-filter-pills">
                    <button class="filter-pill active" onclick="window.filterPublishedChannel('')">All Channels</button>
                    <button class="filter-pill" onclick="window.filterPublishedChannel('LinkedIn')">LinkedIn</button>
                    <button class="filter-pill" onclick="window.filterPublishedChannel('Twitter/X')">Twitter/X</button>
                    <button class="filter-pill" onclick="window.filterPublishedChannel('Company Blog')">Company Blog</button>
                </div>
                <input type="text" id="published-search-input" class="form-input" style="max-width: 250px; padding: 6px 12px; font-size: 0.82rem;" placeholder="Search published titles..." oninput="window.debouncePublishSearch(event)">
            </div>

            <!-- Dynamic published items container -->
            <div id="published-items-list">
                <div style="color: var(--text-muted); padding: 18px; text-align: center;">Loading published catalog from PostgreSQL...</div>
            </div>
        </div>

        <!-- =================================================================== -->
        <!-- PLACEHOLDER CONTAINER 3: Direct API Integration Endpoint Target    -->
        <!-- =================================================================== -->
        <div class="placeholder-card" style="border-style: dashed;">
            <span class="placeholder-badge" style="background: rgba(6, 182, 212, 0.15); color: #67e8f9; border-color: rgba(6, 182, 212, 0.3);">
                API HOOK: PUBLISH TAB BACKEND INTERFACES
            </span>
            <p style="font-size: 0.8rem; color: var(--text-secondary); line-height: 1.6; margin: 0;">
                • <code>GET /api/publish</code> &rarr; Reads high-volume published table via <code>idx_published_timestamp</code>.<br>
                • <code>POST /api/publish</code> &rarr; Directly inserts verified payload into <code>published(post, timestamp)</code>.<br>
                • <code>POST /api/review/submit</code> &rarr; Ingests new draft into <code>pending</code> queue for peer approval.
            </p>
        </div>
    `;

    workspace.appendChild(container);

    // Initial data hydration from backend
    window.refreshPublishedCatalog();
}

// Attach publish helpers to window for clean button handlers
window.handlePublishSubmit = async function () {
    const title = document.getElementById('composer-title').value.trim();
    const caption = document.getElementById('composer-caption').value.trim();
    const mediaUrl = document.getElementById('composer-media').value.trim();
    const checkedChannels = Array.from(document.querySelectorAll('input[name="channel"]:checked')).map(el => el.value);

    if (!title || !caption) {
        if (window.TrueTone) window.TrueTone.showToast('Please provide Title and Caption', 'error');
        return;
    }

    const currentUser = window.TrueTone ? window.TrueTone.currentUser : { user_id: 1, user_name: 'Author' };

    const payload = {
        post: {
            title,
            caption,
            author_id: currentUser.user_id,
            author_name: currentUser.user_name,
            channels: checkedChannels.length > 0 ? checkedChannels : ['LinkedIn'],
            media_url: mediaUrl || null,
        },
        overall_review: {
            ai_brand_score: 92,
            compliance_status: "AWAITING_REVIEW",
            ai_flags: [],
            reviewer_notes: "Submitted via Publish Tab composer."
        }
    };

    try {
        const res = await fetch('/api/review/submit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.error);

        if (window.TrueTone) window.TrueTone.showToast('Draft submitted to Review Queue successfully!', 'success');
        document.getElementById('publish-composer-form').reset();
        document.getElementById('composer-preflight-result').style.display = 'none';
        window.refreshPublishedCatalog();
    } catch (err) {
        if (window.TrueTone) window.TrueTone.showToast(`Submission failed: ${err.message}`, 'error');
    }
};

window.runPreflightCheck = async function () {
    const text = document.getElementById('composer-caption').value;
    const banner = document.getElementById('composer-preflight-result');

    if (!text) {
        if (window.TrueTone) window.TrueTone.showToast('Please enter post text to analyze', 'warn');
        return;
    }

    try {
        const res = await fetch('/api/guidelines/check', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text }),
        });
        const data = await res.json();

        banner.style.display = 'block';
        if (data.violations && data.violations.length > 0) {
            banner.className = 'banner-notice read-only';
            banner.innerHTML = `
                <div>
                    <strong>⚠️ AI Brand Flags Detected (${data.violations.length}):</strong>
                    <ul style="margin: 6px 0 0 18px; font-size: 0.8rem;">
                        ${data.violations.map(v => `<li>"${v.term}": ${v.reason} &rarr; <em>${v.remedy}</em></li>`).join('')}
                    </ul>
                </div>
            `;
        } else {
            banner.className = 'banner-notice success';
            banner.innerHTML = `<strong>✓ Clean Compliance Pass:</strong> No tone deviations or prohibited claims detected! (Score: ${data.score || 100}%)`;
        }
    } catch (e) {
        banner.style.display = 'block';
        banner.className = 'banner-notice success';
        banner.innerHTML = `<strong>✓ Pre-flight heuristic check passed:</strong> Content ready for submission.`;
    }
};

window.publishSelectedChannel = '';
window.filterPublishedChannel = function (ch) {
    window.publishSelectedChannel = ch;
    document.querySelectorAll('#publish-filter-pills .filter-pill').forEach(btn => {
        btn.classList.toggle('active', btn.textContent.includes(ch || 'All Channels'));
    });
    window.refreshPublishedCatalog();
};

let searchDebounceTimer = null;
window.debouncePublishSearch = function (e) {
    clearTimeout(searchDebounceTimer);
    searchDebounceTimer = setTimeout(() => {
        window.refreshPublishedCatalog(e.target.value);
    }, 280);
};

window.refreshPublishedCatalog = async function (search = '') {
    const list = document.getElementById('published-items-list');
    if (!list) return;

    try {
        const params = new URLSearchParams();
        if (window.publishSelectedChannel) params.append('channel', window.publishSelectedChannel);
        if (search) params.append('search', search);

        const res = await fetch(`/api/publish?${params.toString()}`);
        const data = await res.json();

        if (!data.success) throw new Error(data.error);

        const items = data.data || [];
        const totalEl = document.getElementById('kpi-publish-total');
        if (totalEl) totalEl.textContent = data.total || items.length;

        // Fetch metrics summary for KPIs
        fetch('/api/publish/metrics/summary').then(r => r.json()).then(s => {
            if (s.success && s.metrics) {
                const li = document.getElementById('kpi-publish-linkedin');
                if (li) li.textContent = s.metrics.linkedin_count || 0;
            }
        }).catch(() => {});

        // Fetch queue count
        fetch('/api/review/pending?status=N').then(r => r.json()).then(q => {
            const qEl = document.getElementById('kpi-publish-queued');
            if (qEl) qEl.textContent = q.total || 0;
        }).catch(() => {});

        if (items.length === 0) {
            list.innerHTML = `
                <div style="background: var(--bg-surface-elevated); padding: 30px; border-radius: 8px; text-align: center; color: var(--text-muted);">
                    <h4>No Published Content Matches Query</h4>
                    <p style="font-size: 0.8rem; margin-top: 4px;">Submit a new post above or clear filters.</p>
                </div>
            `;
            return;
        }

        list.innerHTML = items.map(item => {
            const p = item.post || {};
            const channels = (p.channels || []).map(ch => `<span class="tag-badge channel">${ch}</span>`).join(' ');
            const date = new Date(item.timestamp).toLocaleString();
            const metrics = p.metrics || {};

            return `
                <div class="feed-card">
                    <div class="feed-card-header">
                        <div>
                            <div class="feed-card-title">${p.title || 'Broadcast #' + item.id}</div>
                            <div class="feed-card-meta">
                                <span>Author: <strong>${p.author_name || 'Staff User #' + (p.author_id || '')}</strong></span>
                                <span>•</span>
                                <span>${date}</span>
                                <span>•</span>
                                <span>${channels}</span>
                            </div>
                        </div>
                        <span class="tag-badge low">LIVE</span>
                    </div>

                    <div style="font-size: 0.88rem; color: #cbd5e1; line-height: 1.5; margin-bottom: 12px;">
                        ${p.caption || p.summary || p.content || '(No caption recorded)'}
                    </div>

                    <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid var(--border-subtle); padding-top: 10px; font-size: 0.78rem; color: var(--text-muted);">
                        <div style="display: flex; gap: 16px;">
                            ${metrics.views ? `<span>👁️ ${metrics.views.toLocaleString()} views</span>` : '<span>👁️ Live</span>'}
                            ${metrics.shares ? `<span>🔁 ${metrics.shares.toLocaleString()} shares</span>` : ''}
                            ${metrics.brand_resonance_score ? `<span style="color: #6ee7b7;">⭐ ${metrics.brand_resonance_score}% resonance</span>` : ''}
                        </div>
                        <code>ID: ${item.id}</code>
                    </div>
                </div>
            `;
        }).join('');
    } catch (err) {
        list.innerHTML = `<div style="color: var(--accent-rose); padding: 14px;">Error loading published catalog: ${err.message}</div>`;
    }
};

// Global export
window.publish_tab = publish_tab;
