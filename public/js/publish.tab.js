/**
 * Publish Tab Frontend Module
 * Controls the catalog of verified, published content and distribution analytics.
 */

window.PublishTab = {
    selectedChannel: '',
    searchQuery: '',

    async load() {
        const container = document.getElementById('published-posts-container');
        container.innerHTML = '<div style="color: #94a3b8; padding: 20px;">Fetching published records...</div>';

        // Load stats
        this.loadMetrics();

        try {
            const params = new URLSearchParams();
            if (this.selectedChannel) params.append('channel', this.selectedChannel);
            if (this.searchQuery) params.append('search', this.searchQuery);

            const res = await fetch(`/api/publish?${params.toString()}`);
            const json = await res.json();

            if (!json.success) throw new Error(json.error);

            const posts = json.data || [];
            document.getElementById('badge-published-count').textContent = json.total || posts.length;
            document.getElementById('stat-publish-total').textContent = json.total || posts.length;

            if (posts.length === 0) {
                container.innerHTML = `
                    <div style="background: #1a2234; padding: 40px; border-radius: 10px; text-align: center; color: #94a3b8;">
                        <h3>No Published Records</h3>
                        <p style="margin-top: 8px;">Approved posts will appear here after passing review.</p>
                    </div>`;
                return;
            }

            container.innerHTML = posts.map(item => this.renderPublishedCard(item)).join('');
            this.bindEvents();
        } catch (err) {
            container.innerHTML = `<div style="color: #ef4444; padding: 20px;">Failed to load published posts: ${err.message}</div>`;
        }
    },

    async loadMetrics() {
        try {
            const res = await fetch('/api/publish/metrics/summary');
            const data = await res.json();
            if (data.success && data.metrics) {
                const m = data.metrics;
                if (document.getElementById('stat-publish-linkedin')) {
                    document.getElementById('stat-publish-linkedin').textContent = m.linkedin_count || 0;
                }
                if (document.getElementById('stat-publish-twitter')) {
                    document.getElementById('stat-publish-twitter').textContent = m.twitter_count || 0;
                }
            }
        } catch (e) {
            // Non-critical
        }
    },

    renderPublishedCard(item) {
        const post = item.post || {};
        const channels = (post.channels || []).map(ch => `<span class="badge-tag channel">${ch}</span>`).join(' ');
        const dateStr = new Date(item.timestamp).toLocaleString();
        const metrics = post.metrics || {};

        return `
            <div class="card-item" data-id="${item.id}">
                <div class="card-item-header">
                    <div>
                        <div class="card-title">${post.title || 'Published Broadcast #' + item.id}</div>
                        <div class="card-meta">
                            <span>Author: <strong>${post.author_name || 'Staff User #' + (post.author_id || '')}</strong></span>
                            <span>•</span>
                            <span>Published: ${dateStr}</span>
                            <span>•</span>
                            <span>${channels}</span>
                        </div>
                    </div>
                    <div>
                        <span class="badge-tag low">LIVE ON CHANNELS</span>
                    </div>
                </div>

                <div class="card-body">
                    ${post.summary || post.caption || post.content || '(No summary text)'}
                </div>

                ${post.live_url ? `
                    <div style="margin-bottom: 12px; font-size: 0.82rem;">
                        <span style="color: #64748b;">Direct Link: </span>
                        <a href="${post.live_url}" target="_blank" style="color: #38bdf8; text-decoration: none;">${post.live_url} &nearr;</a>
                    </div>
                ` : ''}

                <div class="card-footer" style="margin-top: 10px; padding-top: 10px;">
                    <div style="display: flex; gap: 20px; font-size: 0.8rem; color: #94a3b8;">
                        ${metrics.views ? `<span>👁️ Views: <strong style="color: #f8fafc;">${metrics.views.toLocaleString()}</strong></span>` : ''}
                        ${metrics.shares ? `<span>🔁 Shares: <strong style="color: #f8fafc;">${metrics.shares.toLocaleString()}</strong></span>` : ''}
                        ${metrics.brand_resonance_score ? `<span>⭐ Resonance: <strong style="color: #34d399;">${metrics.brand_resonance_score}%</strong></span>` : ''}
                    </div>
                    <button class="btn-vote" onclick="PublishTab.inspectJson('${item.id}')">
                        { } View Raw Payload
                    </button>
                </div>
            </div>
        `;
    },

    bindEvents() {
        // Channel filter pills
        document.querySelectorAll('#publish-channel-pills .filter-pill').forEach(pill => {
            pill.onclick = () => {
                document.querySelectorAll('#publish-channel-pills .filter-pill').forEach(p => p.classList.remove('active'));
                pill.classList.add('active');
                this.selectedChannel = pill.dataset.channel;
                this.load();
            };
        });

        // Search input with debounce
        const searchInput = document.getElementById('publish-search-input');
        if (searchInput) {
            let timeout = null;
            searchInput.oninput = (e) => {
                clearTimeout(timeout);
                timeout = setTimeout(() => {
                    this.searchQuery = e.target.value.trim();
                    this.load();
                }, 300);
            };
        }
    },

    async inspectJson(id) {
        try {
            const res = await fetch(`/api/publish/${id}`);
            const data = await res.json();
            if (!data.success) throw new Error(data.error);

            const jsonStr = JSON.stringify(data.data, null, 2);
            const html = `
                <div>
                    <p style="font-size: 0.82rem; color: #94a3b8; margin-bottom: 8px;">
                        Full PostgreSQL JSONB record stored in <code>published.post</code>:
                    </p>
                    <pre class="code-json">${jsonStr}</pre>
                </div>
            `;
            TrueTone.openModal(`Published Record #${id}`, html);
        } catch (err) {
            TrueTone.showToast(`Error: ${err.message}`, 'error');
        }
    }
};
