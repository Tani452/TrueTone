/**
 * =============================================================================
 * TrueTone Tab Module: GUIDELINES (guidelines_tab)
 * Complete End-to-End Implementation:
 * Part 1: Tab Initialization & Knowledge Base Architecture
 * Part 2: Flow A - Official Guideline Upload & AI Compatibility Validation
 * Part 3: Flow B - Past Publishes Reverse-Engineering & Markdown Append
 * Part 4: Active Guidelines Directory & Safe Document Inspection
 * =============================================================================
 */

function guidelines_tab() {
    const workspace = document.getElementById('main-workspace');
    if (!workspace) return;

    // 1. Isolation & Reset on Activation: Clean workspace & remove dangling modals
    workspace.innerHTML = '';
    const oldModals = document.querySelectorAll('#guideline-confirm-modal, #guideline-preview-modal');
    oldModals.forEach(m => m.remove());

    // 2. Initialize fresh, scoped session state variables
    let pendingGuidelineFiles = [];
    let validationReport = null;
    let currentStagingId = null;

    // 3. Render Guidelines Workspace DOM Structure
    const container = document.createElement('div');
    container.className = 'tab-viewport';
    container.id = 'guidelines-tab-viewport';

    container.innerHTML = `
        <!-- Header Section with Upload Dropdown Trigger -->
        <div class="guidelines-header-bar">
            <div class="guidelines-header-text">
                <h2>Brand Guidelines & Knowledge Base</h2>
                <p>Manage official brand rules or extract verified tone and data patterns from approved past publications. All files here are ingested live by TrueTone AI content audits.</p>
            </div>

            <!-- Upload Dropdown Trigger -->
            <div class="upload-dropdown-container">
                <button type="button" class="btn-primary" id="upload-guidelines-btn">
                    <span>📤 Upload Files</span>
                    <span style="font-size: 0.75rem;">▼</span>
                </button>

                <!-- Sleek Upload Dropdown Menu -->
                <div id="guidelines-upload-dropdown">
                    <button type="button" class="guidelines-dropdown-option" id="opt-upload-guidelines">
                        <span class="guidelines-dropdown-icon">📜</span>
                        <div>
                            <div class="guidelines-dropdown-label">Guidelines</div>
                            <div class="guidelines-dropdown-subtext">Upload official brand rules, style guides, or approved fact sheets</div>
                        </div>
                    </button>
                    <button type="button" class="guidelines-dropdown-option" id="opt-upload-past-publishes">
                        <span class="guidelines-dropdown-icon">📊</span>
                        <div>
                            <div class="guidelines-dropdown-label">Past Publishes</div>
                            <div class="guidelines-dropdown-subtext">Extract brand tone, terminology, and data patterns from historical posts</div>
                        </div>
                    </button>
                </div>
            </div>
        </div>

        <!-- Status / Processing Banner -->
        <div id="guidelines-status-banner"></div>

        <!-- Incompatible Warning Box (Case 2: Red Alert Box) -->
        <div id="incompatible-warning-box">
            <div class="warning-box-header">
                <div class="warning-box-title">
                    <span>⚠️</span>
                    <span>Warning: Incompatible Files Detected</span>
                </div>
                <button type="button" class="btn-close" id="btn-close-warning" style="font-size: 1.1rem; line-height: 1;">&times;</button>
            </div>
            <div class="warning-box-body" id="warning-box-message">
                Specific explanation from TrueTone AI Auditor.
            </div>
            <ul class="warning-box-files" id="warning-box-files-list"></ul>
        </div>

        <!-- Extracted Past Data Preview Card (Flow B Success) -->
        <div id="past-publishes-result-container" style="display: none;"></div>

        <!-- Active Guidelines Directory Section -->
        <div class="guidelines-directory-section">
            <div class="section-title-row">
                <div>
                    <h3>Active Knowledge Base Directory (<code>./guidelines</code>)</h3>
                    <p style="font-size: 0.78rem; color: var(--text-muted); margin-top: 2px;">
                        Documents currently enforced by Gemini 2.5 Flash during content pre-flight reviews.
                    </p>
                </div>
                <button type="button" class="btn-secondary" id="btn-refresh-guidelines-list">
                    ↻ Refresh Directory
                </button>
            </div>

            <!-- Active Guidelines Cards Grid -->
            <div id="active-guidelines-list" class="guidelines-cards-grid">
                <div style="color: var(--text-muted); padding: 30px; text-align: center; grid-column: 1 / -1;">
                    Loading guidelines directory from server...
                </div>
            </div>
        </div>

        <!-- Baseline Standards Quick Reference Cards -->
        <div class="placeholder-card" style="margin-top: 30px;">
            <span class="placeholder-badge">BASELINE KNOWLEDGE BASE ARCHITECTURE</span>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 14px; margin-top: 10px;">
                <div style="background: var(--bg-surface-elevated); padding: 14px; border-radius: 6px; border: 1px solid var(--border-strong);">
                    <strong style="color: #60a5fa; font-size: 0.85rem;">1. brand_voice_and_tone.md</strong>
                    <p style="font-size: 0.78rem; color: var(--text-secondary); margin-top: 4px;">Enforces probabilistic voice, anti-clickbait mandates, TrueTone CamelCase, and inclusive language.</p>
                </div>
                <div style="background: var(--bg-surface-elevated); padding: 14px; border-radius: 6px; border: 1px solid var(--border-strong);">
                    <strong style="color: #60a5fa; font-size: 0.85rem;">2. approved_facts_and_claims.txt</strong>
                    <p style="font-size: 0.78rem; color: var(--text-secondary); margin-top: 4px;">Verified benchmarks (sub-10ms, 99.9% consistency) and mandatory Section 27A SEC Safe Harbor disclaimers.</p>
                </div>
                <div style="background: var(--bg-surface-elevated); padding: 14px; border-radius: 6px; border: 1px solid var(--border-strong);">
                    <strong style="color: #60a5fa; font-size: 0.85rem;">3. visual_and_accessibility_standards.md</strong>
                    <p style="font-size: 0.78rem; color: var(--text-secondary); margin-top: 4px;">Approved hex swatches (#0A0F1D, #06B6D4), 4.5:1 WCAG contrast ratios, and logo safe zones.</p>
                </div>
            </div>
        </div>
    `;

    workspace.appendChild(container);

    // Create Confirmation Modal Dialog on document.body
    const confirmModal = document.createElement('div');
    confirmModal.id = 'guideline-confirm-modal';
    confirmModal.className = 'modal-overlay';
    confirmModal.innerHTML = `
        <div class="modal-box" style="max-width: 560px;">
            <div class="modal-header">
                <h3 style="color: #f8fafc; font-size: 1.15rem; display: flex; align-items: center; gap: 8px;">
                    <span>🛡️</span>
                    <span>Confirm Guideline Upload</span>
                </h3>
                <button type="button" class="btn-close" id="modal-cancel-x-btn">&times;</button>
            </div>
            <div id="guideline-confirm-body" style="font-size: 0.88rem; color: #cbd5e1; line-height: 1.55;">
                <!-- Populated dynamically upon AI validation -->
            </div>
            <div style="display: flex; justify-content: flex-end; gap: 12px; margin-top: 22px; border-top: 1px solid var(--border-strong); padding-top: 14px;">
                <button type="button" class="btn-secondary" id="modal-btn-cancel-upload" style="padding: 8px 16px;">
                    ✕ Cancel Upload
                </button>
                <button type="button" class="btn-primary" id="modal-btn-confirm-save" style="padding: 8px 18px; background: linear-gradient(135deg, #10b981, #059669);">
                    ✓ Confirm & Activate
                </button>
            </div>
        </div>
    `;
    document.body.appendChild(confirmModal);

    // Create Document Content Inspector Modal on document.body
    const docModal = document.createElement('div');
    docModal.id = 'guideline-preview-modal';
    docModal.className = 'modal-overlay';
    docModal.innerHTML = `
        <div class="modal-box" style="max-width: 780px;">
            <div class="modal-header">
                <h3 id="doc-modal-title" style="color: #f8fafc; font-size: 1.05rem;">Guideline Document Inspector</h3>
                <button type="button" class="btn-close" id="doc-modal-close-btn">&times;</button>
            </div>
            <div style="margin-bottom: 10px; font-size: 0.78rem; color: var(--text-muted);" id="doc-modal-meta"></div>
            <pre id="doc-modal-content" style="background: #090d16; border: 1px solid var(--border-subtle); border-radius: 6px; padding: 18px; color: #38bdf8; font-family: var(--font-mono); font-size: 0.8rem; max-height: 60vh; overflow: auto; white-space: pre-wrap; line-height: 1.55;"></pre>
        </div>
    `;
    document.body.appendChild(docModal);

    // Hook modal close listeners
    document.getElementById('doc-modal-close-btn').onclick = () => docModal.classList.remove('active');
    docModal.onclick = (e) => { if (e.target.id === 'guideline-preview-modal') docModal.classList.remove('active'); };

    // Toggle Upload Dropdown
    const uploadBtn = document.getElementById('upload-guidelines-btn');
    const uploadDropdown = document.getElementById('guidelines-upload-dropdown');

    uploadBtn.onclick = (e) => {
        e.stopPropagation();
        uploadDropdown.classList.toggle('show');
    };

    // Close dropdown on click outside
    document.addEventListener('click', (e) => {
        if (uploadDropdown && !uploadDropdown.contains(e.target) && e.target !== uploadBtn) {
            uploadDropdown.classList.remove('show');
        }
    });

    // Close Warning Box button
    document.getElementById('btn-close-warning').onclick = () => {
        document.getElementById('incompatible-warning-box').style.display = 'none';
    };

    // =========================================================================
    // FLOW A: User Selects `guidelines` Option (handle_guidelines_upload)
    // =========================================================================

    document.getElementById('opt-upload-guidelines').onclick = () => {
        handle_guidelines_upload();
    };

    function handle_guidelines_upload() {
        uploadDropdown.classList.remove('show');

        // Create off-screen file picker
        const input = document.createElement('input');
        input.type = 'file';
        input.multiple = true;
        input.accept = '.txt,.md,.pdf,.doc,.docx,.json';
        input.style.display = 'none';

        input.onchange = async () => {
            pendingGuidelineFiles = Array.from(input.files || []);
            if (pendingGuidelineFiles.length === 0) return;

            // Reset UI banners
            document.getElementById('incompatible-warning-box').style.display = 'none';
            document.getElementById('past-publishes-result-container').style.display = 'none';

            // Show loading state in #guidelines-status-banner
            showStatusBanner(
                `<div style="display: flex; align-items: center; gap: 10px;">
                    <div class="status-loading-spinner"></div>
                    <div>
                        <strong>Validating ${pendingGuidelineFiles.length} candidate file(s) with Gemini AI...</strong>
                        <div style="font-size: 0.76rem; color: #94a3b8; margin-top: 2px;">Cross-referencing organizational style consistency and policy compatibility.</div>
                    </div>
                </div>`,
                'read-only'
            );

            try {
                const formData = new FormData();
                pendingGuidelineFiles.forEach(file => {
                    formData.append('files', file);
                });

                const res = await fetch('/api/guidelines/validate', {
                    method: 'POST',
                    body: formData,
                });

                const data = await res.json();
                hideStatusBanner();

                if (!data.success && data.is_valid === undefined) {
                    throw new Error(data.error || 'Server validation error');
                }

                validationReport = data;
                currentStagingId = data.staging_id || null;

                if (data.is_valid === true) {
                    // Case 1: Valid & Compatible -> Open confirmation modal
                    openGuidelineConfirmModal(pendingGuidelineFiles, data);
                } else {
                    // Case 2: Incompatible / Rejected -> Show prominent red warning alert box
                    showIncompatibleWarning(data);
                    pendingGuidelineFiles = [];
                    currentStagingId = null;
                }
            } catch (err) {
                hideStatusBanner();
                console.error('[GUIDELINE-VALIDATION-ERROR]', err);
                if (window.TrueTone) {
                    window.TrueTone.showToast(`Validation failed: ${err.message}`, 'error');
                }
            }
        };

        document.body.appendChild(input);
        input.click();
        setTimeout(() => input.remove(), 1000);
    }

    function openGuidelineConfirmModal(files, report) {
        const modal = document.getElementById('guideline-confirm-modal');
        const body = document.getElementById('guideline-confirm-body');

        const fileItems = files.map(f => `
            <li style="margin-bottom: 4px;">
                <strong style="color: #f8fafc;">${escapeHtml(f.name)}</strong>
                <span style="color: var(--text-muted); font-size: 0.78rem;">(${formatBytes(f.size)})</span>
            </li>
        `).join('');

        body.innerHTML = `
            <div style="margin-bottom: 14px;">
                <p>The following candidate guideline document(s) were analyzed by TrueTone AI and verified compatible with existing standards:</p>
                <ul style="margin: 10px 0 14px 20px;">${fileItems}</ul>
            </div>

            <div style="background: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.3); border-radius: 8px; padding: 12px 14px; margin-bottom: 16px;">
                <div style="font-size: 0.72rem; color: #6ee7b7; text-transform: uppercase; font-weight: 700; margin-bottom: 2px;">AI Knowledge Summary</div>
                <div style="font-size: 0.84rem; color: #d1fae5;">${escapeHtml(report.summary || 'Adds verified brand rules.')}</div>
            </div>

            <p style="font-weight: 600; color: #f8fafc;">
                Do you want to upload and activate these files in the organisation's guidelines folder?
            </p>
        `;

        modal.classList.add('active');

        // ✓ Button (Confirm & Save)
        document.getElementById('modal-btn-confirm-save').onclick = async () => {
            const saveBtn = document.getElementById('modal-btn-confirm-save');
            saveBtn.disabled = true;
            saveBtn.innerHTML = '⏳ Activating...';

            try {
                const res = await fetch('/api/guidelines/save', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ staging_id: currentStagingId }),
                });

                const result = await res.json();
                if (!result.success) throw new Error(result.error || 'Failed to save guidelines');

                modal.classList.remove('active');
                saveBtn.disabled = false;
                saveBtn.innerHTML = '✓ Confirm & Activate';

                pendingGuidelineFiles = [];
                currentStagingId = null;

                showStatusBanner(
                    `<strong>✓ New guidelines saved and active across all future content reviews!</strong> Added: ${(result.saved_files || []).join(', ')}`,
                    'success'
                );

                if (window.TrueTone) {
                    window.TrueTone.showToast("Guidelines activated successfully!", "success");
                }

                refreshActiveGuidelinesList();
            } catch (err) {
                saveBtn.disabled = false;
                saveBtn.innerHTML = '✓ Confirm & Activate';
                if (window.TrueTone) {
                    window.TrueTone.showToast(`Save error: ${err.message}`, 'error');
                }
            }
        };

        // ✕ Button (Cancel Upload)
        const handleCancel = async () => {
            modal.classList.remove('active');
            if (currentStagingId) {
                fetch(`/api/guidelines/stage/${currentStagingId}`, { method: 'DELETE' }).catch(() => {});
            }
            pendingGuidelineFiles = [];
            currentStagingId = null;
            if (window.TrueTone) {
                window.TrueTone.showToast("Guideline upload cancelled. No files were added.", "info");
            }
        };

        document.getElementById('modal-btn-cancel-upload').onclick = handleCancel;
        document.getElementById('modal-cancel-x-btn').onclick = handleCancel;
    }

    function showIncompatibleWarning(report) {
        const warningBox = document.getElementById('incompatible-warning-box');
        const msgEl = document.getElementById('warning-box-message');
        const filesEl = document.getElementById('warning-box-files-list');

        msgEl.textContent = report.incompatible_reason || "The uploaded files contradict corporate compliance policies or contain non-guideline content.";

        const badFiles = report.incompatible_files || [];
        if (badFiles.length > 0) {
            filesEl.style.display = 'block';
            filesEl.innerHTML = badFiles.map(f => `<li><strong>${escapeHtml(f)}</strong> — flagged as incompatible</li>`).join('');
        } else {
            filesEl.style.display = 'none';
        }

        warningBox.style.display = 'block';
        if (window.TrueTone) {
            window.TrueTone.showToast("Candidate files rejected by TrueTone Brand Auditor.", "error");
        }
    }

    // =========================================================================
    // FLOW B: User Selects `past_publishes` Option (handle_past_publishes_upload)
    // =========================================================================

    document.getElementById('opt-upload-past-publishes').onclick = () => {
        handle_past_publishes_upload();
    };

    function handle_past_publishes_upload() {
        uploadDropdown.classList.remove('show');

        // Create off-screen file picker supporting documents and images
        const input = document.createElement('input');
        input.type = 'file';
        input.multiple = true;
        input.accept = '.txt,.md,.pdf,.doc,.docx,.json,.png,.jpg,.jpeg,.webp';
        input.style.display = 'none';

        input.onchange = async () => {
            const files = Array.from(input.files || []);
            if (files.length === 0) return;

            document.getElementById('incompatible-warning-box').style.display = 'none';
            document.getElementById('past-publishes-result-container').style.display = 'none';

            // Show loading state
            showStatusBanner(
                `<div style="display: flex; align-items: center; gap: 10px;">
                    <div class="status-loading-spinner"></div>
                    <div>
                        <strong>Scanning ${files.length} past publication(s) for brand tone, consistency, terminology, and verified data patterns...</strong>
                        <div style="font-size: 0.76rem; color: #94a3b8; margin-top: 2px;">Gemini 2.5 Flash is reverse-engineering implicit brand standards.</div>
                    </div>
                </div>`,
                'read-only'
            );

            try {
                const formData = new FormData();
                files.forEach(f => formData.append('files', f));

                const res = await fetch('/api/guidelines/extract-past-publishes', {
                    method: 'POST',
                    body: formData,
                });

                const result = await res.json();
                hideStatusBanner();

                if (!result.success) throw new Error(result.error || 'Pattern extraction failed');

                // Render Extracted Confirmation Preview Card
                renderPastPublishesResult(result);

                // Refresh guidelines cards list to show past_data_from_reviews.md
                refreshActiveGuidelinesList();

                if (window.TrueTone) {
                    window.TrueTone.showToast("Past publishes analyzed and appended to guidelines!", "success");
                }
            } catch (err) {
                hideStatusBanner();
                console.error('[PAST-PUBLISHES-ERROR]', err);
                if (window.TrueTone) {
                    window.TrueTone.showToast(`Extraction failed: ${err.message}`, 'error');
                }
            }
        };

        document.body.appendChild(input);
        input.click();
        setTimeout(() => input.remove(), 1000);
    }

    function renderPastPublishesResult(result) {
        const container = document.getElementById('past-publishes-result-container');
        if (!container) return;

        // Convert simple markdown to HTML tags for clean display
        const renderedHtml = formatMarkdown(result.extracted_summary || '');

        container.className = 'extracted-preview-card';
        container.style.display = 'block';
        container.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                <div style="display: flex; align-items: center; gap: 8px;">
                    <span style="font-size: 1.2rem;">✨</span>
                    <strong style="color: #6ee7b7; font-size: 1.05rem;">Past Publishes Analyzed & Appended to <code>${escapeHtml(result.target_file)}</code></strong>
                </div>
                <button type="button" class="btn-secondary" style="padding: 4px 10px; font-size: 0.76rem;" onclick="document.getElementById('past-publishes-result-container').style.display='none'">
                    ✕ Dismiss Preview
                </button>
            </div>
            <p style="font-size: 0.82rem; color: var(--text-secondary); margin-bottom: 10px;">
                TrueTone AI has synthesized the following implicit corporate guidelines, terminology rules, and verified facts. These insights are now active in the knowledge base.
            </p>
            <div class="extracted-markdown-viewport">
                ${renderedHtml}
            </div>
        `;

        container.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    // =========================================================================
    // ACTIVE GUIDELINES DIRECTORY VIEWER (GET /api/guidelines/list)
    // =========================================================================

    async function refreshActiveGuidelinesList() {
        const listEl = document.getElementById('active-guidelines-list');
        if (!listEl) return;

        try {
            const res = await fetch('/api/guidelines/list');
            const data = await res.json();

            if (!data.success) throw new Error(data.error);

            const files = data.files || [];
            if (files.length === 0) {
                listEl.innerHTML = `
                    <div style="background: var(--bg-surface-elevated); padding: 36px; border-radius: 8px; text-align: center; color: var(--text-muted); grid-column: 1 / -1;">
                        <h4>No Guideline Documents Found</h4>
                        <p style="font-size: 0.82rem; margin-top: 4px;">Upload your first brand document using the button above.</p>
                    </div>
                `;
                return;
            }

            listEl.innerHTML = files.map(file => {
                const ext = (file.extension || '').replace('.', '').toUpperCase() || 'FILE';
                const isExtracted = file.name === 'past_data_from_reviews.md';
                const badgeClass = isExtracted ? 'style="background: rgba(16, 185, 129, 0.15); color: #6ee7b7; border-color: rgba(16, 185, 129, 0.3);"' : '';

                return `
                    <div class="guideline-file-card" data-filename="${escapeHtml(file.name)}">
                        <div class="guideline-file-top">
                            <span class="guideline-file-badge" ${badgeClass}>${isExtracted ? 'AI-LEARNED' : ext}</span>
                            <div style="overflow: hidden;">
                                <div class="guideline-file-name" title="${escapeHtml(file.name)}">${escapeHtml(file.name)}</div>
                                <div class="guideline-file-meta">
                                    <span>${formatBytes(file.size)}</span>
                                    <span>&bull;</span>
                                    <span>Modified: ${new Date(file.updated_at).toLocaleDateString()}</span>
                                </div>
                            </div>
                        </div>

                        <div class="guideline-file-bottom">
                            <span style="font-size: 0.72rem; color: #10b981; font-weight: 600;">✓ Active in AI Prompt</span>
                            <button type="button" class="btn-secondary" style="padding: 4px 10px; font-size: 0.76rem;" onclick="window.viewGuidelineDocument('${escapeHtml(file.name)}')">
                                View Document &rarr;
                            </button>
                        </div>
                    </div>
                `;
            }).join('');
        } catch (err) {
            listEl.innerHTML = `<div style="color: var(--accent-rose); padding: 18px; grid-column: 1 / -1;">Error loading guidelines: ${err.message}</div>`;
        }
    }

    document.getElementById('btn-refresh-guidelines-list').onclick = () => {
        refreshActiveGuidelinesList();
        if (window.TrueTone) window.TrueTone.showToast("Refreshed guidelines directory", "info");
    };

    // View Document Inspector Modal
    window.viewGuidelineDocument = async function (fileName) {
        const modal = document.getElementById('guideline-preview-modal');
        const titleEl = document.getElementById('doc-modal-title');
        const metaEl = document.getElementById('doc-modal-meta');
        const contentEl = document.getElementById('doc-modal-content');

        titleEl.textContent = `Inspecting: ${fileName}`;
        metaEl.textContent = 'Fetching from server ./guidelines directory...';
        contentEl.textContent = 'Loading...';
        modal.classList.add('active');

        try {
            const res = await fetch(`/api/guidelines/file/${encodeURIComponent(fileName)}`);
            const data = await res.json();

            if (!data.success) throw new Error(data.error);

            metaEl.textContent = `Size: ${formatBytes(data.file.size)} | Last Updated: ${new Date(data.file.updated_at).toLocaleString()}`;
            contentEl.textContent = data.file.content || '(Empty document)';
        } catch (err) {
            contentEl.textContent = `Error reading file: ${err.message}`;
        }
    };

    // Helper functions
    function showStatusBanner(html, type = 'read-only') {
        const banner = document.getElementById('guidelines-status-banner');
        if (!banner) return;
        banner.className = `banner-notice ${type}`;
        banner.innerHTML = html;
        banner.style.display = 'block';
    }

    function hideStatusBanner() {
        const banner = document.getElementById('guidelines-status-banner');
        if (banner) banner.style.display = 'none';
    }

    // Initial load
    refreshActiveGuidelinesList();
}

// Utility Helpers
function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function formatBytes(bytes, decimals = 1) {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

function formatMarkdown(md) {
    if (!md) return '';
    return md
        .replace(/### (.*?)\n/g, '<h3 style="color: #6ee7b7; margin: 12px 0 4px 0; font-size: 0.92rem;">$1</h3>')
        .replace(/## (.*?)\n/g, '<h2 style="color: #60a5fa; margin: 14px 0 6px 0; font-size: 1.05rem;">$1</h2>')
        .replace(/\*\*(.*?)\*\*/g, '<strong style="color: #f8fafc;">$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/`(.*?)`/g, '<code style="background: rgba(255,255,255,0.08); padding: 1px 4px; border-radius: 3px; font-family: monospace; color: #38bdf8;">$1</code>')
        .replace(/- (.*?)\n/g, '<li style="margin-bottom: 4px;">$1</li>');
}

// Expose globally
window.guidelines_tab = guidelines_tab;
