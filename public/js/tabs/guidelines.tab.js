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
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="upload-btn-icon"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
                    <span>Upload Files</span>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" class="upload-chevron-icon"><polyline points="6 9 12 15 18 9"></polyline></svg>
                </button>

                <!-- Sleek Upload Dropdown Menu -->
                <div id="guidelines-upload-dropdown">
                    <button type="button" class="guidelines-dropdown-option" id="opt-upload-guidelines">
                        <div class="guidelines-dropdown-icon">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                        </div>
                        <div class="guidelines-dropdown-content">
                            <div class="guidelines-dropdown-label">Official Guidelines</div>
                            <div class="guidelines-dropdown-subtext">Upload official brand rules, style guides, or approved fact sheets</div>
                        </div>
                    </button>
                    <button type="button" class="guidelines-dropdown-option" id="opt-upload-past-publishes">
                        <div class="guidelines-dropdown-icon">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"></path></svg>
                        </div>
                        <div class="guidelines-dropdown-content">
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
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="warning-box-icon"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                    <span>Warning: Incompatible Files Detected</span>
                </div>
                <button type="button" class="btn-close" id="btn-close-warning" aria-label="Close warning">&times;</button>
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
                <div class="section-title-meta">
                    <h3>Active Knowledge Base Directory <code class="directory-path-pill">./guidelines</code></h3>
                    <p>
                        Documents currently enforced by Gemini 2.5 Flash during content pre-flight reviews.
                    </p>
                </div>
                <button type="button" class="btn-secondary" id="btn-refresh-guidelines-list">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 4v6h-6"></path><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path></svg>
                    <span>Refresh Directory</span>
                </button>
            </div>

            <!-- Active Guidelines Cards Grid -->
            <div id="active-guidelines-list" class="guidelines-cards-grid">
                <div class="guidelines-loading-state">
                    Loading guidelines directory from server...
                </div>
            </div>
        </div>

        <!-- Baseline Standards Quick Reference Cards -->
        <div class="placeholder-card">
            <span class="placeholder-badge">BASELINE KNOWLEDGE BASE ARCHITECTURE</span>
            <div class="placeholder-cards-grid">
                <div class="placeholder-item-card">
                    <strong class="placeholder-item-title">1. brand_voice_and_tone.md</strong>
                    <p class="placeholder-item-desc">Enforces probabilistic voice, anti-clickbait mandates, TrueTone CamelCase, and inclusive language.</p>
                </div>
                <div class="placeholder-item-card">
                    <strong class="placeholder-item-title">2. approved_facts_and_claims.txt</strong>
                    <p class="placeholder-item-desc">Verified benchmarks (sub-10ms, 99.9% consistency) and mandatory Section 27A SEC Safe Harbor disclaimers.</p>
                </div>
                <div class="placeholder-item-card">
                    <strong class="placeholder-item-title">3. visual_and_accessibility_standards.md</strong>
                    <p class="placeholder-item-desc">Approved hex swatches (#0A0F1D, #06B6D4), 4.5:1 WCAG contrast ratios, and logo safe zones.</p>
                </div>
            </div>
        </div>
    `;

    workspace.appendChild(container);

    // Create Confirmation Modal Dialog on document.body
    const confirmModal = document.createElement('div');
    confirmModal.id = 'guideline-confirm-modal';
    confirmModal.className = 'modal-overlay';
    confirmModal.setAttribute('role', 'dialog');
    confirmModal.setAttribute('aria-modal', 'true');
    confirmModal.innerHTML = `
        <div class="modal-box" style="max-width: 560px;">
            <div class="modal-header">
                <h3 class="modal-header-title">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="modal-title-icon"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
                    <span>Confirm Guideline Upload</span>
                </h3>
                <button type="button" class="btn-close" id="modal-cancel-x-btn" aria-label="Close modal">&times;</button>
            </div>
            <div id="guideline-confirm-body" class="guideline-confirm-body-text">
                <!-- Populated dynamically upon AI validation -->
            </div>
            <div class="modal-footer-actions">
                <button type="button" class="btn-secondary" id="modal-btn-cancel-upload">
                    ✕ Cancel Upload
                </button>
                <button type="button" class="btn-primary" id="modal-btn-confirm-save">
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
    docModal.setAttribute('role', 'dialog');
    docModal.setAttribute('aria-modal', 'true');
    docModal.setAttribute('aria-labelledby', 'doc-modal-title');
    docModal.innerHTML = `
        <div class="modal-box" style="max-width: 780px;">
            <div class="modal-header">
                <h3 id="doc-modal-title">Guideline Document Inspector</h3>
                <button type="button" class="btn-close" id="doc-modal-close-btn" aria-label="Close inspector">&times;</button>
            </div>
            <div id="doc-modal-meta" class="doc-modal-meta-mono"></div>
            <pre id="doc-modal-content"></pre>
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
                `<div class="status-banner-content">
                    <div class="status-loading-spinner"></div>
                    <div class="status-banner-text-group">
                        <strong>Validating ${pendingGuidelineFiles.length} candidate file(s) with Gemini AI...</strong>
                        <div class="status-banner-subtext">Cross-referencing organizational style consistency and policy compatibility.</div>
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
            <li class="confirm-file-item">
                <strong class="confirm-file-name">${escapeHtml(f.name)}</strong>
                <span class="confirm-file-size">(${formatBytes(f.size)})</span>
            </li>
        `).join('');

        body.innerHTML = `
            <div class="confirm-intro-block">
                <p>The following candidate guideline document(s) were analyzed by TrueTone AI and verified compatible with existing standards:</p>
                <ul class="confirm-files-list">${fileItems}</ul>
            </div>

            <div class="confirm-summary-card">
                <div class="confirm-summary-label">AI Knowledge Summary</div>
                <div class="confirm-summary-desc">${escapeHtml(report.summary || 'Adds verified brand rules.')}</div>
            </div>

            <p class="confirm-prompt-question">
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
            filesEl.style.display = 'flex';
            filesEl.innerHTML = badFiles.map(f => `<li class="warning-file-chip"><strong>${escapeHtml(f)}</strong><span class="warning-chip-badge">Flagged</span></li>`).join('');
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
                `<div class="status-banner-content">
                    <div class="status-loading-spinner"></div>
                    <div class="status-banner-text-group">
                        <strong>Scanning ${files.length} past publication(s) for brand tone, consistency, terminology, and verified data patterns...</strong>
                        <div class="status-banner-subtext">Gemini 2.5 Flash is reverse-engineering implicit brand standards.</div>
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
            <div class="extracted-card-header">
                <div class="extracted-header-title-group">
                    <span class="extracted-badge-tag">AI-Synthesized</span>
                    <strong class="extracted-card-heading">Past Publishes Analyzed & Appended to <code>${escapeHtml(result.target_file)}</code></strong>
                </div>
                <button type="button" class="btn-secondary extracted-dismiss-btn" onclick="document.getElementById('past-publishes-result-container').style.display='none'">
                    ✕ Dismiss Preview
                </button>
            </div>
            <p class="extracted-card-subtext">
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
                    <div class="guidelines-empty-state wash">
                        <div class="guidelines-empty-inner">
                            <h4 class="guidelines-empty-title">No Guideline Documents Found</h4>
                            <p class="guidelines-empty-instruction">Upload your first brand document using the button above.</p>
                        </div>
                    </div>
                `;
                return;
            }

            listEl.innerHTML = files.map(file => {
                const ext = (file.extension || '').replace('.', '').toUpperCase() || 'FILE';
                const isExtracted = file.name === 'past_data_from_reviews.md';
                const badgeClass = isExtracted ? 'badge-ai' : (ext.toLowerCase() === 'txt' ? 'badge-txt' : 'badge-md');
                const badgeLabel = isExtracted ? 'AI-LEARNED' : ext;
                const desc = getGuidelineDescription(file.name);
                const updatedIso = file.updated_at ? new Date(file.updated_at).toISOString().split('T')[0] : 'UNKNOWN';

                return `
                    <div class="guideline-file-card" data-filename="${escapeHtml(file.name)}">
                        <div class="guideline-file-top">
                            <span class="guideline-file-badge ${badgeClass}">${badgeLabel}</span>
                            <div class="guideline-file-info">
                                <div class="guideline-file-name" title="${escapeHtml(file.name)}">${escapeHtml(file.name)}</div>
                                <div class="guideline-file-desc">${escapeHtml(desc)}</div>
                            </div>
                        </div>

                        <div class="guideline-file-bottom">
                            <div class="guideline-file-meta">
                                <span class="guideline-status-tag">✓ Active in Prompt</span>
                                <div class="guideline-meta-subline">
                                    <span class="guideline-meta-size">${formatBytes(file.size)}</span>
                                    <span>•</span>
                                    <span class="guideline-meta-updated">UPDATED ${updatedIso}</span>
                                </div>
                            </div>
                            <button type="button" class="btn-secondary guideline-view-btn" onclick="window.viewGuidelineDocument('${escapeHtml(file.name)}')">
                                <span>View</span>
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"></polyline></svg>
                            </button>
                        </div>
                    </div>
                `;
            }).join('');
        } catch (err) {
            listEl.innerHTML = `<div style="color: var(--violation, #D2453D); padding: 18px; grid-column: 1 / -1;">Error loading guidelines: ${err.message}</div>`;
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
        .replace(/### (.*?)\n/g, '<h3 class="extracted-pattern-title">$1</h3>')
        .replace(/## (.*?)\n/g, '<h2 class="extracted-pattern-group">$1</h2>')
        .replace(/\*\*(.*?)\*\*/g, '<strong class="extracted-pattern-bold">$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/`(.*?)`/g, '<code class="extracted-pattern-code">$1</code>')
        .replace(/- (.*?)\n/g, '<li class="extracted-pattern-item">$1</li>');
}

function getGuidelineDescription(filename) {
    const descMap = {
        'brand_voice_and_tone.md': 'Core voice principles, probabilistic style, anti-clickbait rules, and TrueTone CamelCase.',
        'approved_facts_and_claims.txt': 'Verified performance benchmarks (sub-10ms, 99.9% consistency) and Section 27A SEC safe harbor.',
        'visual_and_accessibility_standards.md': 'Approved hex palettes, 4.5:1 WCAG contrast ratios, typography hierarchy, and safe margins.',
        'audio_and_voice_standards.md': 'Voice clarity, acoustic governance standards, pacing, and spoken disclaimer compliance.',
        'video_and_motion_standards.md': 'Motion graphics rules, frame-rate consistency, transition standards, and visual disclaimers.',
        'past_data_from_reviews.md': 'Synthesized historical guidelines and empirical terminology extracted from approved publications.'
    };
    if (descMap[filename]) return descMap[filename];
    if (filename.endsWith('.md')) return 'Markdown guideline policy document ingested for live pre-flight content reviews.';
    if (filename.endsWith('.txt')) return 'Plain text brand knowledge source ingested for live pre-flight content reviews.';
    return 'Approved organizational reference standard enforced during pre-flight content audits.';
}

// Expose globally
window.guidelines_tab = guidelines_tab;
