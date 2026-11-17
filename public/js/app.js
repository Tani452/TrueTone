/**
 * =============================================================================
 * TrueTone Core Application Orchestrator
 * Manages active user permissions, role-based sidebar rendering, and tab dispatch.
 * =============================================================================
 */

// Define Demo Personas matching PostgreSQL users table
const DEMO_PERSONAS = [
    {
        user_id: 1,
        user_name: 'Sarah Jenkins',
        designation: 'Senior Content Creator',
        department: 'Content & Creative Marketing',
        can_post: 'Y',
        can_approve: 'N',
        can_take_action: 'N',
        role_label: 'Content Creator (can_post=Y, can_approve=N, can_take_action=N)'
    },
    {
        user_id: 2,
        user_name: 'Michael Chen',
        designation: 'Brand Governance Lead',
        department: 'Brand Strategy & Standards',
        can_post: 'Y',
        can_approve: 'Y',
        can_take_action: 'N',
        role_label: 'Brand Approver (can_post=Y, can_approve=Y, can_take_action=N)'
    },
    {
        user_id: 3,
        user_name: 'Elena Rostova',
        designation: 'Compliance Officer & Auditor',
        department: 'Legal & Brand Safety',
        can_post: 'N',
        can_approve: 'Y',
        can_take_action: 'Y',
        role_label: 'Compliance Admin (can_post=N, can_approve=Y, can_take_action=Y)'
    },
    {
        user_id: 4,
        user_name: 'David Miller',
        designation: 'VP of Corporate Communications',
        department: 'Executive Leadership',
        can_post: 'Y',
        can_approve: 'Y',
        can_take_action: 'Y',
        role_label: 'Executive Super-Admin (All Permissions Y)'
    },
    {
        user_id: 5,
        user_name: 'Alex Rivera',
        designation: 'Junior Compliance Trainee',
        department: 'Brand Quality Assurance',
        can_post: 'N',
        can_approve: 'N',
        can_take_action: 'N',
        role_label: 'View-Only Trainee (All Permissions N)'
    }
];

window.TrueTone = {
    // Current logged-in user state
    currentUser: { ...DEMO_PERSONAS[0] },

    // Track active tab name
    activeTabId: null,

    // Initialize application
    init() {
        this.populatePersonaSwitcher();
        this.renderSidebarNavigation();
        this.checkDatabaseHealth();

        // 2. Set default landing tab:
        // publish_tab() if can_post === 'Y', otherwise guidelines_tab()
        if (this.currentUser.can_post === 'Y') {
            this.navigate('publish');
        } else {
            this.navigate('guidelines');
        }

        // Periodic health check
        setInterval(() => this.checkDatabaseHealth(), 30000);
    },

    // Populate Hackathon Persona Switcher Dropdown
    populatePersonaSwitcher() {
        const select = document.getElementById('role-switcher-select');
        if (!select) return;

        select.innerHTML = DEMO_PERSONAS.map(p => `
            <option value="${p.user_id}" ${p.user_id === this.currentUser.user_id ? 'selected' : ''}>
                ${p.user_name} - ${p.designation}
            </option>
        `).join('');

        select.onchange = (e) => {
            const selectedId = parseInt(e.target.value, 10);
            const found = DEMO_PERSONAS.find(p => p.user_id === selectedId);
            if (found) {
                this.switchPersona(found);
            }
        };
    },

    // Persona switch handler
    switchPersona(newPersona) {
        this.currentUser = { ...newPersona };

        // Re-render sidebar to reflect updated permissions
        this.renderSidebarNavigation();

        // If currently active tab is no longer permitted, navigate to allowed tab
        const isPublishPermitted = this.currentUser.can_post === 'Y';
        const isActionPermitted = this.currentUser.can_take_action === 'Y';

        if (this.activeTabId === 'publish' && !isPublishPermitted) {
            this.navigate('guidelines');
        } else if (this.activeTabId === 'action' && !isActionPermitted) {
            this.navigate('guidelines');
        } else if (this.activeTabId) {
            // Re-render current tab with new persona context
            this.navigate(this.activeTabId);
        }

        this.showToast(
            `Persona switched: ${this.currentUser.user_name} (can_post:${this.currentUser.can_post}, can_approve:${this.currentUser.can_approve}, can_take_action:${this.currentUser.can_take_action})`,
            'info'
        );
    },

    /**
     * =========================================================================
     * 1. SIDEBAR NAVIGATION & ROLE-BASED VISIBILITY
     * Conditionally renders buttons based on can_post, can_approve, can_take_action
     * =========================================================================
     */
    renderSidebarNavigation() {
        const navList = document.getElementById('sidebar-nav-list');
        if (!navList) return;

        // Update User Profile Badge
        this.updateUserProfileBadge();

        navList.innerHTML = '';
        const user = this.currentUser;

        // 1. PUBLISH BUTTON: ONLY render if currentUser.can_post === 'Y'
        if (user.can_post === 'Y') {
            const li = document.createElement('li');
            li.className = 'nav-item';
            li.innerHTML = `
                <button class="nav-btn ${this.activeTabId === 'publish' ? 'active' : ''}" id="nav-btn-publish" onclick="window.TrueTone.navigate('publish')">
                    <span class="icon">📢</span>
                    <span>Publish</span>
                    <span class="badge-pill">Creator</span>
                </button>
            `;
            navList.appendChild(li);
        }

        // 2. GUIDELINES BUTTON: Always visible to all authenticated users
        const liGuidelines = document.createElement('li');
        liGuidelines.className = 'nav-item';
        liGuidelines.innerHTML = `
            <button class="nav-btn ${this.activeTabId === 'guidelines' ? 'active' : ''}" id="nav-btn-guidelines" onclick="window.TrueTone.navigate('guidelines')">
                <span class="icon">📖</span>
                <span>Guidelines</span>
                <span class="badge-pill">All</span>
            </button>
        `;
        navList.appendChild(liGuidelines);

        // 3. REVIEW BUTTON: Render if can_approve === 'Y' (or allow read-only queue viewing if 'N')
        const liReview = document.createElement('li');
        liReview.className = 'nav-item';
        const isApprover = user.can_approve === 'Y';
        liReview.innerHTML = `
            <button class="nav-btn ${this.activeTabId === 'reviews' ? 'active' : ''}" id="nav-btn-reviews" onclick="window.TrueTone.navigate('reviews')">
                <span class="icon">📝</span>
                <span>Review</span>
                <span class="badge-pill">${isApprover ? 'Approver' : 'Read-Only'}</span>
            </button>
        `;
        navList.appendChild(liReview);

        // 4. ACTIONS BUTTON: ONLY render if currentUser.can_take_action === 'Y'
        if (user.can_take_action === 'Y') {
            const liActions = document.createElement('li');
            liActions.className = 'nav-item';
            liActions.innerHTML = `
                <button class="nav-btn ${this.activeTabId === 'action' ? 'active' : ''}" id="nav-btn-actions" onclick="window.TrueTone.navigate('action')">
                    <span class="icon">🛡️</span>
                    <span>Actions</span>
                    <span class="badge-pill">Admin</span>
                </button>
            `;
            navList.appendChild(liActions);
        }
    },

    // Update compact user profile badge
    updateUserProfileBadge() {
        const u = this.currentUser;
        const initials = u.user_name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

        const avatarEl = document.getElementById('user-avatar-initials');
        if (avatarEl) avatarEl.textContent = initials;

        const nameEl = document.getElementById('user-profile-name');
        if (nameEl) nameEl.textContent = u.user_name;

        const desigEl = document.getElementById('user-profile-designation');
        if (desigEl) desigEl.textContent = u.designation;

        const deptEl = document.getElementById('user-profile-dept');
        if (deptEl) deptEl.textContent = u.department;

        // Permission Pills
        const pillPost = document.getElementById('perm-pill-post');
        if (pillPost) {
            pillPost.className = `perm-pill ${u.can_post === 'Y' ? 'active' : 'inactive'}`;
            pillPost.textContent = `POST: ${u.can_post}`;
        }

        const pillApprove = document.getElementById('perm-pill-approve');
        if (pillApprove) {
            pillApprove.className = `perm-pill ${u.can_approve === 'Y' ? 'active' : 'inactive'}`;
            pillApprove.textContent = `APPROVE: ${u.can_approve}`;
        }

        const pillAction = document.getElementById('perm-pill-action');
        if (pillAction) {
            pillAction.className = `perm-pill ${u.can_take_action === 'Y' ? 'active' : 'inactive'}`;
            pillAction.textContent = `ACT: ${u.can_take_action}`;
        }

        // Top bar meta persona pill
        const topPersona = document.getElementById('top-bar-user-badge');
        if (topPersona) {
            topPersona.textContent = `${u.user_name} (${u.designation})`;
        }
    },

    /**
     * =========================================================================
     * 2. MODULAR TAB NAVIGATION DISPATCHER
     * Calls exact functions: publish_tab(), guidelines_tab(), reviews_tab(), action_tab()
     * =========================================================================
     */
    navigate(tabId) {
        // Clear active review poller and floating popovers if navigating away from reviews tab
        if (tabId !== 'reviews' && window.ttReviewsPollTimer) {
            clearInterval(window.ttReviewsPollTimer);
            window.ttReviewsPollTimer = null;
        }
        const danglingPopover = document.getElementById('tt-review-issue-popover');
        if (danglingPopover) danglingPopover.remove();

        this.activeTabId = tabId;

        // Update active class on sidebar buttons
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        const activeBtn = document.getElementById(`nav-btn-${tabId}`);
        if (activeBtn) activeBtn.classList.add('active');

        // Update top-bar title
        const titles = {
            publish: 'Publishing & Ingestion Hub',
            guidelines: 'Brand Compliance Guidelines',
            reviews: 'Review & Verification Queue',
            action: 'User Performance & Corrective Actions'
        };
        const titleEl = document.getElementById('page-title-text');
        if (titleEl) titleEl.textContent = titles[tabId] || 'Workspace';

        // Dispatch to the exact self-contained tab functions
        switch (tabId) {
            case 'publish':
                if (typeof window.publish_tab === 'function') {
                    window.publish_tab();
                } else {
                    console.error('publish_tab is not defined');
                }
                break;

            case 'guidelines':
                if (typeof window.guidelines_tab === 'function') {
                    window.guidelines_tab();
                } else {
                    console.error('guidelines_tab is not defined');
                }
                break;

            case 'reviews':
                if (typeof window.reviews_tab === 'function') {
                    const isReadOnly = (this.currentUser.can_approve !== 'Y');
                    window.reviews_tab(isReadOnly);
                } else {
                    console.error('reviews_tab is not defined');
                }
                break;

            case 'action':
                if (typeof window.action_tab === 'function') {
                    window.action_tab();
                } else {
                    console.error('action_tab is not defined');
                }
                break;

            default:
                if (typeof window.guidelines_tab === 'function') {
                    window.guidelines_tab();
                }
                break;
        }
    },

    // Check PostgreSQL connection health
    async checkDatabaseHealth() {
        const dot = document.getElementById('db-health-dot');
        const statusEl = document.getElementById('db-health-status');
        const metaEl = document.getElementById('db-health-meta');

        try {
            const res = await fetch('/api/health');
            const data = await res.json();

            if (data.status === 'healthy') {
                if (dot) dot.className = 'pulse-dot';
                if (statusEl) {
                    statusEl.textContent = `Online (${data.latencyMs}ms)`;
                    statusEl.style.color = '#10b981';
                }
                if (metaEl) metaEl.textContent = `${data.database} | ${data.tableCount} tables`;
            } else {
                if (dot) dot.className = 'pulse-dot error';
                if (statusEl) {
                    statusEl.textContent = 'Disconnected';
                    statusEl.style.color = '#ef4444';
                }
                if (metaEl) metaEl.textContent = data.error || 'Check DB';
            }
        } catch (err) {
            if (dot) dot.className = 'pulse-dot error';
            if (statusEl) {
                statusEl.textContent = 'Unreachable';
                statusEl.style.color = '#ef4444';
            }
            if (metaEl) metaEl.textContent = 'Check backend';
        }
    },

    // Toast alert utility
    showToast(message, type = 'info') {
        const container = document.getElementById('toast-container');
        if (!container) return;

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        container.appendChild(toast);

        setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => toast.remove(), 250);
        }, 3500);
    },

    // Modal dialog utilities
    openModal(title, htmlContent) {
        const titleEl = document.getElementById('modal-title');
        const contentEl = document.getElementById('modal-content');
        const overlay = document.getElementById('generic-modal');

        if (titleEl) titleEl.textContent = title;
        if (contentEl) contentEl.innerHTML = htmlContent;
        if (overlay) overlay.classList.add('active');
    },

    closeModal() {
        const overlay = document.getElementById('generic-modal');
        if (overlay) overlay.classList.remove('active');
    }
};

// Document ready bootstrap
document.addEventListener('DOMContentLoaded', () => {
    // Modal close listeners
    const modalCloseBtn = document.getElementById('modal-close-btn');
    if (modalCloseBtn) {
        modalCloseBtn.addEventListener('click', () => window.TrueTone.closeModal());
    }

    const modalOverlay = document.getElementById('generic-modal');
    if (modalOverlay) {
        modalOverlay.addEventListener('click', (e) => {
            if (e.target.id === 'generic-modal') window.TrueTone.closeModal();
        });
    }

    // Global refresh button
    const refreshBtn = document.getElementById('global-refresh-btn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => {
            window.TrueTone.checkDatabaseHealth();
            if (window.TrueTone.activeTabId) {
                window.TrueTone.navigate(window.TrueTone.activeTabId);
            }
            window.TrueTone.showToast('Workspace refreshed from PostgreSQL', 'info');
        });
    }

    // Initialize application
    window.TrueTone.init();
});
