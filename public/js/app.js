/**
 * TrueTone Core Application Orchestrator
 * Coordinates tab switching, modal dialogs, toast notifications, and database health.
 */

window.TrueTone = {
    activeTab: 'review',

    // Toast notification utility
    showToast(message, type = 'info') {
        const container = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        container.appendChild(toast);

        setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => toast.remove(), 300);
        }, 4000);
    },

    // Modal dialog utilities
    openModal(title, htmlContent) {
        document.getElementById('modal-title').textContent = title;
        document.getElementById('modal-content').innerHTML = htmlContent;
        document.getElementById('generic-modal').classList.add('active');
    },

    closeModal() {
        document.getElementById('generic-modal').classList.remove('active');
    },

    // Check database health and status
    async checkDatabaseHealth() {
        const dot = document.getElementById('db-health-dot');
        const statusEl = document.getElementById('db-health-status');
        const metaEl = document.getElementById('db-health-meta');

        try {
            const res = await fetch('/api/health');
            const data = await res.json();

            if (data.status === 'healthy') {
                dot.className = 'pulse-dot';
                statusEl.textContent = `Online (${data.latencyMs}ms)`;
                statusEl.style.color = '#10b981';
                metaEl.textContent = `${data.database} | ${data.tableCount} tables`;
            } else {
                dot.className = 'pulse-dot error';
                statusEl.textContent = 'Disconnected';
                statusEl.style.color = '#ef4444';
                metaEl.textContent = data.error || 'Check PostgreSQL';
            }
        } catch (err) {
            dot.className = 'pulse-dot error';
            statusEl.textContent = 'Unreachable';
            statusEl.style.color = '#ef4444';
            metaEl.textContent = 'Check backend server';
        }
    },

    // Tab switcher
    switchTab(tabName) {
        this.activeTab = tabName;

        // Update nav styling
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.toggle('active', item.dataset.tab === tabName);
        });

        // Update active pane
        document.querySelectorAll('.tab-pane').forEach(pane => {
            pane.classList.toggle('active', pane.id === `tab-${tabName}`);
        });

        // Update header title
        const titles = {
            review: 'Pending Review Queue',
            publish: 'Published Content Catalog',
            logs: 'AI Compliance & Brand Audit Logs',
            actions: 'User Risk Profiles & Error Trends',
            users: 'Team Directory & Role Permissions',
        };
        document.getElementById('page-title').textContent = titles[tabName] || 'Dashboard';

        // Trigger tab-specific loader
        if (tabName === 'review' && window.ReviewTab) window.ReviewTab.load();
        if (tabName === 'publish' && window.PublishTab) window.PublishTab.load();
        if (tabName === 'logs' && window.LogsTab) window.LogsTab.load();
        if (tabName === 'actions' && window.ActionsTab) window.ActionsTab.load();
        if (tabName === 'users' && window.UsersTab) window.UsersTab.load();
    },

    // Refresh active tab
    refreshCurrentTab() {
        this.checkDatabaseHealth();
        this.switchTab(this.activeTab);
        this.showToast('Data refreshed from PostgreSQL', 'info');
    }
};

// Event Listeners on DOM load
document.addEventListener('DOMContentLoaded', () => {
    // Nav menu click handlers
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', () => {
            TrueTone.switchTab(item.dataset.tab);
        });
    });

    // Refresh button
    document.getElementById('global-refresh-btn').addEventListener('click', () => {
        TrueTone.refreshCurrentTab();
    });

    // Modal close button and backdrop click
    document.getElementById('modal-close-btn').addEventListener('click', () => {
        TrueTone.closeModal();
    });
    document.getElementById('generic-modal').addEventListener('click', (e) => {
        if (e.target.id === 'generic-modal') TrueTone.closeModal();
    });

    // Initial load
    TrueTone.checkDatabaseHealth();
    TrueTone.switchTab('review');

    // Periodic healthcheck every 30 seconds
    setInterval(() => TrueTone.checkDatabaseHealth(), 30000);
});
