/**
 * =============================================================================
 * TrueTone Tab Module: PUBLISH (publish_tab)
 * Complete End-to-End Implementation:
 * Part 1: Tab Initialization & Modern Chatbot Composer
 * Part 2: Step 1 - Isolated Input Collection Module (files, show_files, text, upload)
 * Part 3: Step 2 - AI Brand-Guideline Scanning & Interactive Issue Resolution (review)
 * Part 4: Final Upload, Audit Logging & Database Routing (/api/publish-submission)
 * =============================================================================
 */

// Global export of publish_tab
function publish_tab() {
    const workspace = document.getElementById('main-workspace');
    if (!workspace) return;

    // 1. Isolation & Reset on Activation: Clean workspace & remove dangling modals
    workspace.innerHTML = '';
    const oldPopover = document.getElementById('tt-issue-popover');
    if (oldPopover) oldPopover.remove();
    const oldModal = document.getElementById('tt-file-preview-modal');
    if (oldModal) oldModal.remove();

    // 2. Initialize fresh, scoped session state variables
    let file_array = [];
    let currentReviewResult = null;
    let isReviewCompleted = false;
    let issueUidCounter = 1;

    const currentUser = (window.TrueTone && window.TrueTone.currentUser) ? window.TrueTone.currentUser : {
        user_id: 1,
        user_name: 'Content Creator',
        department: 'Marketing',
        designation: 'Staff'
    };

    // 3. Render Compose Workspace DOM Structure1
    const composerWrapper = document.createElement('div');
    composerWrapper.className = 'composer-wrapper tab-viewport';
    composerWrapper.id = 'publish-composer-viewport';

    composerWrapper.innerHTML = `
        <div class="composer-header wash">
            <div class="composer-header-content">
                <div class="composer-header-title">
                    <h2>What are you publishing today, ${escapeHtml(currentUser.user_name ? currentUser.user_name.split(' ')[0] : 'Creator')}?</h2>
                    <p>Author official communications, inspect tone deviations against guidelines, and submit for verification.</p>
                </div>
                <div class="composer-header-meta">
                    <span class="ai-disclosure-badge">
                        <svg class="disclosure-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                            <circle cx="12" cy="12" r="10"></circle>
                            <line x1="12" y1="16" x2="12" y2="12"></line>
                            <line x1="12" y1="8" x2="12.01" y2="8"></line>
                        </svg>
                        <span>Powered by Gemini &bull; Checked against approved guidelines</span>
                    </span>
                    <span class="composer-author-tag">
                        Author: <strong>${escapeHtml(currentUser.user_name)}</strong> (${escapeHtml(currentUser.department)})
                    </span>
                </div>
            </div>
        </div>

        <!-- Dynamic Verification Status Banner -->
        <div id="publish-status-banner" style="display: none;"></div>

        <!-- Compose Card Container -->
        <div id="compose-card">
            <!-- Rich Text Input Area (contenteditable="true") -->
            <div id="compose-box" contenteditable="true" role="textbox" aria-multiline="true" data-placeholder="Draft your post, campaign copy, or announcement here..."></div>

            <!-- Attachment Preview Strip (Hidden when file_array is empty) -->
            <div id="attachment-preview"></div>

            <!-- Bottom Action Toolbar -->
            <div id="compose-toolbar">
                <!-- Left Side: + Attachment Trigger & Dropdown -->
                <div class="attachment-trigger-wrapper">
                    <button type="button" id="add-attachment-btn" title="Attach files" aria-label="Attach files">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                            <line x1="12" y1="5" x2="12" y2="19"></line>
                            <line x1="5" y1="12" x2="19" y2="12"></line>
                        </svg>
                    </button>
                    <div id="attachment-dropdown">
                        <button type="button" class="dropdown-item" id="btn-attach-doc">
                            <svg class="dropdown-item-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                                <polyline points="14 2 14 8 20 8"></polyline>
                                <line x1="16" y1="13" x2="8" y2="13"></line>
                                <line x1="16" y1="17" x2="8" y2="17"></line>
                                <polyline points="10 9 9 9 8 9"></polyline>
                            </svg>
                            <span>Document</span>
                        </button>
                        <button type="button" class="dropdown-item" id="btn-attach-img">
                            <svg class="dropdown-item-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                                <circle cx="8.5" cy="8.5" r="1.5"></circle>
                                <polyline points="21 15 16 10 5 21"></polyline>
                            </svg>
                            <span>Image</span>
                        </button>
                        <button type="button" class="dropdown-item" id="btn-attach-vid">
                            <svg class="dropdown-item-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                                <polygon points="23 7 16 12 23 17 23 7"></polygon>
                                <rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect>
                            </svg>
                            <span>Video</span>
                        </button>
                        <button type="button" class="dropdown-item" id="btn-attach-aud">
                            <svg class="dropdown-item-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                                <path d="M9 18V5l12-2v13"></path>
                                <circle cx="6" cy="18" r="3"></circle>
                                <circle cx="18" cy="16" r="3"></circle>
                            </svg>
                            <span>Audio</span>
                        </button>
                    </div>
                </div>

                <!-- Right Side: Workflow Buttons -->
                <div class="compose-toolbar-actions">
                    <button type="button" class="btn-primary" id="review-btn">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                        </svg>
                        <span>Review with AI</span>
                    </button>
                    <button type="button" class="btn-primary btn-publish-submit" id="final-upload-btn" style="display: none;">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                            <polyline points="20 6 9 17 4 12"/>
                        </svg>
                        <span>Upload & Submit</span>
                    </button>
                </div>
            </div>
        </div>

        <!-- Live Guideline Reference Footnote & AI Disclosure -->
        <div class="publish-footer-guidelines">
            <!-- <div class="publish-guideline-strip">
                <div class="publish-guideline-group">
                    <span class="publish-guideline-label">Enforcing:</span>
                    <div class="publish-guideline-chips">
                        <span class="publish-file-chip">
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>
                            <code>brand_voice_and_tone.md</code>
                        </span>
                        <span class="publish-file-chip">
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>
                            <code>approved_facts_and_claims.txt</code>
                        </span>
                        <span class="publish-file-chip">
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>
                            <code>visual_and_accessibility_standards.md</code>
                        </span>
                        <span class="publish-file-chip">
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>
                            <code>video_and_motion_standards.md</code>
                        </span>
                        <span class="publish-file-chip">
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>
                            <code>audio_and_voice_standards.md</code>
                        </span>
                    </div>
                </div>
                <span class="publish-target-engine">Target Engine: <code>POST /api/publish-submission</code></span>
            </div> -->
            <div class="publish-ai-disclosure">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="16" x2="12" y2="12"></line>
                    <line x1="12" y1="8" x2="12.01" y2="8"></line>
                </svg>
                <span>AI-Reviewed Disclosure: Media and attachments are sent to Google Gemini for multimodal compliance audit (max 100MB video, 50MB audio). Files are never stored by TrueTone beyond the review.</span>
            </div>
        </div>
    `;

    workspace.appendChild(composerWrapper);

    // Create persistent floating popover and modal on document.body
    const popover = document.createElement('div');
    popover.id = 'tt-issue-popover';
    document.body.appendChild(popover);

    const previewModal = document.createElement('div');
    previewModal.id = 'tt-file-preview-modal';
    previewModal.setAttribute('role', 'dialog');
    previewModal.setAttribute('aria-modal', 'true');
    previewModal.setAttribute('aria-labelledby', 'tt-modal-file-title');
    previewModal.innerHTML = `
        <div class="file-preview-content">
            <div class="file-preview-header">
                <span id="tt-modal-file-title" class="file-preview-title">File Preview</span>
                <div class="file-preview-header-actions">
                    <a id="tt-modal-external-link" class="file-preview-ext-link" href="#" target="_blank">Open in New Tab &nearr;</a>
                    <button type="button" class="btn-close" id="tt-modal-close-btn" aria-label="Close dialog">&times;</button>
                </div>
            </div>
            <div class="file-preview-body" id="tt-modal-file-body"></div>
        </div>
    `;
    document.body.appendChild(previewModal);

    let activeBlobUrl = null;
    const closeModal = () => {
        previewModal.classList.remove('active');
        if (activeBlobUrl) {
            URL.revokeObjectURL(activeBlobUrl);
            activeBlobUrl = null;
        }
    };
    document.getElementById('tt-modal-close-btn').onclick = closeModal;
    previewModal.onclick = (e) => {
        if (e.target.id === 'tt-file-preview-modal') closeModal();
    };

    // Close attachment dropdown on click outside
    const addAttachmentBtn = document.getElementById('add-attachment-btn');
    const attachmentDropdown = document.getElementById('attachment-dropdown');

    addAttachmentBtn.onclick = (e) => {
        e.stopPropagation();
        attachmentDropdown.classList.toggle('show');
    };

    document.addEventListener('click', (e) => {
        if (attachmentDropdown && !attachmentDropdown.contains(e.target) && e.target !== addAttachmentBtn) {
            attachmentDropdown.classList.remove('show');
        }
        if (popover && !popover.contains(e.target) && !e.target.closest('.tt-text-issue') && !e.target.closest('.tt-attachment-chip')) {
            popover.style.display = 'none';
        }
    });

    // =========================================================================
    // PART 2: STEP 1 — ISOLATED INPUT COLLECTION MODULE
    // =========================================================================

    // files(filetype)
    function files(filetype) {
        attachmentDropdown.classList.remove('show');
        const input = document.createElement('input');
        input.type = 'file';
        input.multiple = true;
        input.style.display = 'none';

        let validator = null;

        if (filetype === 'document') {
            input.accept = '.pdf,.doc,.docx,.txt,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain';
            validator = (file) => {
                const mime = (file.type || '').toLowerCase();
                const name = (file.name || '').toLowerCase();
                const validMimes = [
                    'application/pdf',
                    'application/msword',
                    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                    'text/plain'
                ];
                const validExts = ['.pdf', '.doc', '.docx', '.txt'];
                return validMimes.includes(mime) || validExts.some(ext => name.endsWith(ext));
            };
        } else if (filetype === 'image') {
            input.accept = 'image/png,image/jpeg,image/jpg,image/webp,image/gif,image/svg+xml';
            validator = (file) => {
                const mime = (file.type || '').toLowerCase();
                const name = (file.name || '').toLowerCase();
                const validExts = ['.png', '.jpg', '.jpeg', '.webp', '.gif', '.svg'];
                return (mime.startsWith('image/') || validExts.some(ext => name.endsWith(ext)));
            };
        } else if (filetype === 'video') {
            input.accept = 'video/mp4,video/quicktime,video/webm,video/mpeg,video/x-msvideo,.mp4,.mov,.webm,.mpeg,.avi';
            validator = (file) => {
                const mime = (file.type || '').toLowerCase();
                const name = (file.name || '').toLowerCase();
                const validExts = ['.mp4', '.mov', '.webm', '.mpeg', '.avi'];
                const validMimes = ['video/mp4', 'video/quicktime', 'video/webm', 'video/mpeg', 'video/x-msvideo', 'video/avi'];
                const isVid = (mime.startsWith('video/') || validMimes.includes(mime) || validExts.some(ext => name.endsWith(ext)));
                if (!isVid) return false;
                const maxMB = 100;
                if (file.size > maxMB * 1024 * 1024) {
                    if (window.TrueTone) window.TrueTone.showToast(`Video "${file.name}" exceeds ${maxMB}MB limit (${formatBytes(file.size)})`, 'error');
                    return false;
                }
                return true;
            };
        } else if (filetype === 'audio') {
            input.accept = 'audio/mpeg,audio/wav,audio/x-wav,audio/mp4,audio/x-m4a,audio/aac,audio/ogg,audio/flac,audio/webm,.mp3,.wav,.m4a,.aac,.ogg,.flac';
            validator = (file) => {
                const mime = (file.type || '').toLowerCase();
                const name = (file.name || '').toLowerCase();
                const validExts = ['.mp3', '.wav', '.m4a', '.aac', '.ogg', '.flac'];
                const validMimes = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/x-wav', 'audio/mp4', 'audio/x-m4a', 'audio/aac', 'audio/ogg', 'audio/flac', 'audio/webm'];
                const isAud = (mime.startsWith('audio/') || validMimes.includes(mime) || validExts.some(ext => name.endsWith(ext)));
                if (!isAud) return false;
                const maxMB = 50;
                if (file.size > maxMB * 1024 * 1024) {
                    if (window.TrueTone) window.TrueTone.showToast(`Audio "${file.name}" exceeds ${maxMB}MB limit (${formatBytes(file.size)})`, 'error');
                    return false;
                }
                return true;
            };
        } else {
            console.warn('[FILES] Unknown filetype:', filetype);
            return;
        }

        input.onchange = () => {
            const selectedFiles = Array.from(input.files || []);
            const rejected = [];

            selectedFiles.forEach(file => {
                if (validator(file)) {
                    // Check duplicate
                    const duplicate = file_array.some(f => f.name === file.name && f.size === file.size);
                    if (!duplicate) {
                        file_array.push(file);
                    }
                } else {
                    rejected.push(file.name);
                }
            });

            if (rejected.length > 0 && window.TrueTone) {
                window.TrueTone.showToast(`Skipped ${rejected.length} invalid file(s): ${rejected.join(', ')}`, 'warn');
            }

            show_files();
        };

        document.body.appendChild(input);
        input.click();
        setTimeout(() => input.remove(), 1000);
    }

    // Attach click listeners to dropdown items
    document.getElementById('btn-attach-doc').onclick = () => files('document');
    document.getElementById('btn-attach-img').onclick = () => files('image');
    document.getElementById('btn-attach-vid').onclick = () => files('video');
    document.getElementById('btn-attach-aud').onclick = () => files('audio');

    // show_files()
    function show_files() {
        const previewStrip = document.getElementById('attachment-preview');
        if (!previewStrip) return;

        previewStrip.innerHTML = '';

        if (file_array.length === 0) {
            previewStrip.style.display = 'none';
            return;
        }

        previewStrip.style.display = 'flex';

        file_array.forEach((file, index) => {
            const chip = document.createElement('div');
            chip.className = 'tt-attachment-chip';
            chip.dataset.fileIndex = String(index);
            chip.dataset.fileName = file.name;

            // Thumbnail / Icon
            const thumbBox = document.createElement('div');
            thumbBox.className = 'tt-thumb-box';

            const isVideo = (file.type && file.type.startsWith('video/')) ||
                ['.mp4', '.mov', '.webm', '.mpeg', '.avi'].some(ext => file.name.toLowerCase().endsWith(ext));
            const isAudio = (file.type && file.type.startsWith('audio/')) ||
                ['.mp3', '.wav', '.m4a', '.aac', '.ogg', '.flac'].some(ext => file.name.toLowerCase().endsWith(ext));

            if (file.type && file.type.startsWith('image/')) {
                const thumbImg = document.createElement('img');
                thumbImg.src = URL.createObjectURL(file);
                thumbImg.onload = () => URL.revokeObjectURL(thumbImg.src);
                thumbBox.appendChild(thumbImg);
            } else if (isVideo) {
                const videoThumb = document.createElement('video');
                videoThumb.src = URL.createObjectURL(file);
                videoThumb.muted = true;
                videoThumb.controls = true;
                videoThumb.preload = 'metadata';
                videoThumb.style.cssText = 'width: 100%; height: 100%; object-fit: cover; border-radius: 4px;';
                thumbBox.appendChild(videoThumb);
            } else if (isAudio) {
                thumbBox.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>`;
            } else {
                const ext = file.name.split('.').pop().toUpperCase();
                thumbBox.innerHTML = `<span class="doc-type-icon">${escapeHtml(ext.substring(0, 4))}</span>`;
            }

            // Info
            const infoBox = document.createElement('div');
            infoBox.className = 'tt-chip-info';
            infoBox.innerHTML = `
                <span class="tt-chip-name" title="${escapeHtml(file.name)}">${escapeHtml(file.name)}</span>
                <span class="tt-chip-size">${formatBytes(file.size)}</span>
                ${isAudio ? `<audio controls preload="metadata" src="${URL.createObjectURL(file)}" class="tt-chip-audio-player" onclick="event.stopPropagation();"></audio>` : ''}
            `;

            // Remove button
            const removeBtn = document.createElement('div');
            removeBtn.className = 'tt-chip-remove';
            removeBtn.innerHTML = '&times;';
            removeBtn.title = 'Remove attachment';
            removeBtn.onclick = (e) => {
                e.stopPropagation();
                file_array.splice(index, 1);
                // Also update currentReviewResult bad_files if review was already run
                if (currentReviewResult && Array.isArray(currentReviewResult.bad_files)) {
                    currentReviewResult.bad_files = currentReviewResult.bad_files.filter(b => b.file_name !== file.name);
                }
                show_files();
                if (isReviewCompleted && currentReviewResult) {
                    display_problematic_files(currentReviewResult);
                    checkIfAllIssuesResolved();
                }
            };

            chip.appendChild(thumbBox);
            chip.appendChild(infoBox);
            chip.appendChild(removeBtn);

            // Click-to-open preview modal
            chip.onclick = () => {
                openFilePreviewModal(file);
            };

            previewStrip.appendChild(chip);
        });

        // Re-apply issue highlighting badges if review completed
        if (isReviewCompleted && currentReviewResult) {
            display_problematic_files(currentReviewResult);
        }
    }

    function openFilePreviewModal(file, seekSeconds = 0) {
        if (activeBlobUrl) {
            URL.revokeObjectURL(activeBlobUrl);
        }
        activeBlobUrl = URL.createObjectURL(file);

        const titleEl = document.getElementById('tt-modal-file-title');
        const extLink = document.getElementById('tt-modal-external-link');
        const bodyEl = document.getElementById('tt-modal-file-body');

        titleEl.textContent = `${file.name} (${formatBytes(file.size)})`;
        extLink.href = activeBlobUrl;

        bodyEl.innerHTML = '';
        const isVideo = (file.type && file.type.startsWith('video/')) ||
            ['.mp4', '.mov', '.webm', '.mpeg', '.avi'].some(ext => file.name.toLowerCase().endsWith(ext));
        const isAudio = (file.type && file.type.startsWith('audio/')) ||
            ['.mp3', '.wav', '.m4a', '.aac', '.ogg', '.flac'].some(ext => file.name.toLowerCase().endsWith(ext));

        if (file.type && file.type.startsWith('image/')) {
            const img = document.createElement('img');
            img.src = activeBlobUrl;
            bodyEl.appendChild(img);
        } else if (isVideo) {
            const vid = document.createElement('video');
            vid.id = 'tt-modal-active-video';
            vid.src = activeBlobUrl;
            vid.controls = true;
            vid.autoplay = true;
            vid.muted = false;
            vid.style.cssText = 'max-width: 100%; max-height: 65vh; border-radius: 6px; box-shadow: 0 4px 16px rgba(0,0,0,0.6);';
            bodyEl.appendChild(vid);

            const applySeek = () => {
                if (seekSeconds > 0) {
                    vid.currentTime = seekSeconds;
                    vid.play().catch(() => { });
                }
            };

            vid.onloadedmetadata = applySeek;
            if (vid.readyState >= 1) {
                applySeek();
            }
        } else if (isAudio) {
            const aud = document.createElement('audio');
            aud.id = 'tt-modal-active-audio';
            aud.src = activeBlobUrl;
            aud.controls = true;
            aud.autoplay = true;
            aud.style.cssText = 'width: 100%; max-width: 500px; margin: 30px auto; display: block;';
            bodyEl.appendChild(aud);

            const applySeek = () => {
                if (seekSeconds > 0) {
                    aud.currentTime = seekSeconds;
                    aud.play().catch(() => { });
                }
            };

            aud.onloadedmetadata = applySeek;
            if (aud.readyState >= 1) {
                applySeek();
            }
        } else if (file.type === 'application/pdf') {
            const iframe = document.createElement('iframe');
            iframe.src = activeBlobUrl;
            bodyEl.appendChild(iframe);
        } else {
            // Text or doc preview
            const reader = new FileReader();
            reader.onload = (e) => {
                const pre = document.createElement('pre');
                pre.style.cssText = 'color: #f8fafc; font-family: monospace; font-size: 0.85rem; padding: 20px; max-height: 60vh; overflow: auto; width: 100%; white-space: pre-wrap;';
                pre.textContent = e.target.result;
                bodyEl.appendChild(pre);
            };
            reader.readAsText(file);
        }

        previewModal.classList.add('active');
    }

    // text()
    function text() {
        const composeBox = document.getElementById('compose-box');
        const content = composeBox ? composeBox.innerText.trim() : '';
        return content;
    }

    // upload()
    function upload() {
        const currentText = text();
        if (!currentText && file_array.length === 0) {
            if (window.TrueTone) {
                window.TrueTone.showToast("Please enter text or attach at least one file before reviewing", "warn");
            }
            return null;
        }
        return {
            text: currentText,
            files: [...file_array]
        };
    }

    // Hook #review-btn
    const reviewBtn = document.getElementById('review-btn');
    reviewBtn.onclick = () => {
        const stepOnePayload = upload();
        if (stepOnePayload) {
            review(stepOnePayload);
        }
    };

    // =========================================================================
    // PART 3: STEP 2 — AI BRAND-GUIDELINE SCANNING & ISSUE RESOLUTION
    // =========================================================================

    async function review(object) {
        const hasVideo = (object.files || []).some(f => (f.type && f.type.startsWith('video/')) || ['.mp4', '.mov', '.webm', '.mpeg', '.avi'].some(ext => (f.name || '').toLowerCase().endsWith(ext)));
        const hasAudio = (object.files || []).some(f => (f.type && f.type.startsWith('audio/')) || ['.mp3', '.wav', '.m4a', '.aac', '.ogg', '.flac'].some(ext => (f.name || '').toLowerCase().endsWith(ext)));

        reviewBtn.disabled = true;
        if (hasAudio) {
            reviewBtn.innerHTML = '⏳ Analysing audio voice, pronunciation & acoustics... (this can take a little longer)';
        } else if (hasVideo) {
            reviewBtn.innerHTML = '⏳ Analysing video frames, audio & motion... (this can take a little longer)';
        } else {
            reviewBtn.innerHTML = '⏳ Scanning against brand guidelines...';
        }

        const statusBanner = document.getElementById('publish-status-banner');
        statusBanner.style.display = 'none';

        try {
            const formData = new FormData();
            formData.append('text', object.text || '');

            object.files.forEach(file => {
                formData.append('files', file);
            });

            const res = await fetch('/api/review', {
                method: 'POST',
                body: formData,
            });

            const data = await res.json();
            if (!data.success) throw new Error(data.error || 'Failed to scan with AI');

            // Store in currentReviewResult and assign unique _uid
            currentReviewResult = {
                text: (data.text || []).map(item => ({
                    ...item,
                    _uid: `tt_issue_${issueUidCounter++}`
                })),
                bad_files: (data.bad_files || []).map(b => {
                    const matchedFileObj = file_array.find(f => {
                        const fName = (f.name || '').toLowerCase().trim();
                        const bName = (b.file_name || '').toLowerCase().trim();
                        return fName === bName || fName.includes(bName) || bName.includes(fName);
                    }) || (file_array.length === 1 ? file_array[0] : null);

                    return {
                        ...b,
                        file_name: matchedFileObj ? matchedFileObj.name : b.file_name,
                        _uid: `tt_bad_file_${issueUidCounter++}`,
                        file_obj: matchedFileObj || null
                    };
                }),
                good_files: Array.isArray(data.good_files) ? data.good_files : []
            };

            // Call UI handlers
            display_text_issues(currentReviewResult);
            display_problematic_files(currentReviewResult);

            isReviewCompleted = true;
            reviewBtn.disabled = false;
            reviewBtn.innerHTML = '🛡️ Re-Review';

            const finalUploadBtn = document.getElementById('final-upload-btn');
            finalUploadBtn.style.display = 'inline-flex';

            checkIfAllIssuesResolved();
        } catch (err) {
            console.error('[REVIEW-EXECUTION-ERROR]', err);
            reviewBtn.disabled = false;
            reviewBtn.innerHTML = '🛡️ Review with AI';
            if (window.TrueTone) {
                window.TrueTone.showToast(`AI Scan failed: ${err.message}`, 'error');
            }
        }
    }

    function checkIfAllIssuesResolved() {
        const statusBanner = document.getElementById('publish-status-banner');
        if (!statusBanner || !currentReviewResult) return;

        const unresolvedText = currentReviewResult.text.length;
        const unresolvedFiles = currentReviewResult.bad_files.length;
        const totalUnresolved = unresolvedText + unresolvedFiles;

        statusBanner.style.display = 'block';

        if (totalUnresolved === 0) {
            statusBanner.className = 'banner-notice success';
            statusBanner.innerHTML = `
                <div class="banner-status-content">
                    <svg class="banner-status-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                        <polyline points="22 4 12 14.01 9 11.01"></polyline>
                    </svg>
                    <span><strong>Zero brand guideline issues detected!</strong> Ready to publish directly to official channels.</span>
                </div>
            `;
            const uploadBtn = document.getElementById('final-upload-btn');
            if (uploadBtn) {
                uploadBtn.innerHTML = '🚀 Publish Verified Content';
            }
        } else {
            statusBanner.className = 'banner-notice read-only';
            const instructions = [];
            if (unresolvedText > 0) {
                instructions.push('Click highlighted text in red to accept fixes (✓) or dismiss (✕)');
            }
            if (unresolvedFiles > 0) {
                instructions.push('Review the asset violation(s) detailed below');
            }

            let fileIssuesHtml = '';
            if (unresolvedFiles > 0) {
                fileIssuesHtml = `
                    <div class="asset-violations-wrapper">
                        <div class="asset-violations-header">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                                <circle cx="12" cy="12" r="10"></circle>
                                <line x1="12" y1="8" x2="12" y2="12"></line>
                                <line x1="12" y1="16" x2="12.01" y2="16"></line>
                            </svg>
                            <span>Detected Violation(s) in Uploaded Files (${unresolvedFiles})</span>
                        </div>
                        ${currentReviewResult.bad_files.map(b => {
                    const isVid = (b.media_type === 'video') ||
                        (b.file_name && ['.mp4', '.mov', '.webm', '.mpeg', '.avi'].some(ext => b.file_name.toLowerCase().endsWith(ext)));
                    const isAud = (b.media_type === 'audio') ||
                        (b.file_name && ['.mp3', '.wav', '.m4a', '.aac', '.ogg', '.flac'].some(ext => b.file_name.toLowerCase().endsWith(ext)));
                    const mediaBadge = isVid ? 'VIDEO' : (isAud ? 'AUDIO' : ((b.media_type === 'image') ? 'IMAGE' : 'DOCUMENT'));
                    const ruleId = b.rule_id || (isVid ? 'VID-01' : (isAud ? 'AUD-01' : 'VIS-01'));
                    const guideSource = b.guideline_source || (isVid ? 'guidelines/video_and_motion_standards.md' : (isAud ? 'guidelines/audio_and_voice_standards.md' : 'guidelines/visual_and_accessibility_standards.md'));
                    const findings = Array.isArray(b.findings) ? b.findings : [];

                    return `
                            <div class="asset-violation-card">
                                <div class="asset-violation-top">
                                    <div class="asset-violation-meta">
                                        <span class="asset-type-badge">${mediaBadge}</span>
                                        <span class="asset-rule-tag">${escapeHtml(ruleId)}</span>
                                        <span class="asset-file-name">${escapeHtml(b.file_name)}</span>
                                    </div>
                                    <div class="asset-violation-controls">
                                        <span class="asset-flag-badge">Flagged Violation</span>
                                        <button type="button" class="btn-remove-bad-file" data-filename="${escapeHtml(b.file_name)}">
                                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                                                <polyline points="3 6 5 6 21 6"></polyline>
                                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                            </svg>
                                            <span>Remove File</span>
                                        </button>
                                    </div>
                                </div>
                                <div class="asset-guide-source">
                                    <span>Guideline Source:</span> <code>${escapeHtml(guideSource)}</code>
                                </div>
                                <div class="asset-violation-problem">
                                    <strong>Violation:</strong> ${escapeHtml(b.problem)}
                                </div>
                                <div class="asset-violation-remedy">
                                    <div class="asset-remedy-heading">Recommended Remedy</div>
                                    <span class="asset-remedy-text">${escapeHtml(b.suggestion)}</span>
                                </div>
                                ${b.transcript ? `
                                    <details class="asset-transcript-details">
                                        <summary class="asset-transcript-summary">
                                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>
                                            <span>Spoken Transcript</span>
                                        </summary>
                                        <div class="asset-transcript-body">${escapeHtml(b.transcript)}</div>
                                    </details>
                                ` : ''}
                                ${findings.length > 0 ? `
                                    <div class="asset-findings-section">
                                        <div class="asset-findings-heading">
                                            <span>Timestamped Findings (${findings.length})</span>
                                        </div>
                                        <div class="asset-findings-list">
                                            ${findings.map(f => `
                                                <div class="asset-finding-item">
                                                    <div class="asset-finding-top">
                                                        <button type="button" class="btn-timestamp-seek" data-filename="${escapeHtml(b.file_name)}" data-seek="${escapeHtml(f.timestamp_start)}" title="Click to seek ${isAud ? 'audio' : 'video'} to ${escapeHtml(f.timestamp_start)}">
                                                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                                                                <circle cx="12" cy="12" r="10"></circle>
                                                                <polyline points="12 6 12 12 16 14"></polyline>
                                                            </svg>
                                                            <span>${escapeHtml(f.timestamp_start)} - ${escapeHtml(f.timestamp_end)} (${isAud ? 'Seek Audio' : 'Seek Video'})</span>
                                                        </button>
                                                        <span class="asset-finding-category">${escapeHtml(f.category || 'tone')}</span>
                                                    </div>
                                                    <div class="asset-finding-desc">${escapeHtml(f.description)}</div>
                                                    ${f.evidence ? `<div class="asset-finding-evidence">&ldquo;${escapeHtml(f.evidence)}&rdquo;</div>` : ''}
                                                    <div class="asset-finding-fix"><strong>Fix:</strong> ${escapeHtml(f.suggested_fix)}</div>
                                                </div>
                                            `).join('')}
                                        </div>
                                    </div>
                                ` : ''}
                            </div>
                            `;
                }).join('')}
                    </div>
                `;
            }

            statusBanner.innerHTML = `
                <div class="banner-notice-inner">
                    <div class="banner-notice-header">
                        <div class="banner-notice-title">
                            <svg class="banner-notice-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                                <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"></path>
                                <line x1="12" y1="9" x2="12" y2="13"></line>
                                <line x1="12" y1="17" x2="12.01" y2="17"></line>
                            </svg>
                            <div>
                                <strong>${totalUnresolved} Brand Guideline Deviation(s) Detected:</strong>
                                <span class="banner-notice-instructions">${instructions.join(' • ')}</span>
                            </div>
                        </div>
                        <span class="tag-badge critical">${totalUnresolved} Unresolved</span>
                    </div>
                    ${fileIssuesHtml}
                </div>
            `;

            // Attach listeners to remove bad file buttons
            statusBanner.querySelectorAll('.btn-remove-bad-file').forEach(btn => {
                btn.onclick = () => {
                    const fn = btn.dataset.filename;
                    file_array = file_array.filter(f => f.name !== fn);
                    currentReviewResult.bad_files = currentReviewResult.bad_files.filter(b => b.file_name !== fn);
                    show_files();
                    display_problematic_files(currentReviewResult);
                    checkIfAllIssuesResolved();
                    if (window.TrueTone) window.TrueTone.showToast(`Removed flagged file: ${fn}`, "success");
                };
            });

            // Attach click listeners to timestamp seek buttons
            statusBanner.querySelectorAll('.btn-timestamp-seek').forEach(seekBtn => {
                seekBtn.onclick = (e) => {
                    e.stopPropagation();
                    const filename = seekBtn.dataset.filename;
                    const timeStr = seekBtn.dataset.seek;
                    const matchedFile = file_array.find(f => f.name === filename);
                    if (!matchedFile) return;

                    let seconds = 0;
                    if (timeStr && timeStr.includes(':')) {
                        const [m, s] = timeStr.split(':').map(Number);
                        seconds = (m || 0) * 60 + (s || 0);
                    } else {
                        seconds = parseFloat(timeStr) || 0;
                    }

                    openFilePreviewModal(matchedFile, seconds);
                };
            });

            const uploadBtn = document.getElementById('final-upload-btn');
            if (uploadBtn) {
                uploadBtn.innerHTML = '📤 Submit to Pending Review Queue';
            }
        }
    }

    // display_text_issues(reviewObj)
    function display_text_issues(reviewObj) {
        const composeBox = document.getElementById('compose-box');
        if (!composeBox) return;

        let plainText = composeBox.innerText;

        // Strip previous spans if any, preserving raw text
        if (composeBox.querySelector('.tt-text-issue, .tt-text-resolved')) {
            plainText = composeBox.innerText;
        }

        // We wrap problem_in substrings safely
        let htmlBuffer = escapeHtml(plainText);

        reviewObj.text.forEach(issue => {
            const escapedSubstr = escapeHtml(issue.problem_in);
            if (htmlBuffer.includes(escapedSubstr)) {
                const replacementSpan = `<span class="tt-text-issue" data-issue-uid="${issue._uid}">${escapedSubstr}</span>`;
                // Replace first occurrence
                htmlBuffer = htmlBuffer.replace(escapedSubstr, replacementSpan);
            }
        });

        composeBox.innerHTML = htmlBuffer;

        // Attach click listeners to all .tt-text-issue spans
        composeBox.querySelectorAll('.tt-text-issue').forEach(span => {
            span.onclick = (e) => {
                e.stopPropagation();
                const uid = span.dataset.issueUid;
                const issue = currentReviewResult.text.find(t => t._uid === uid);
                if (issue) {
                    showTextIssuePopover(span, issue);
                }
            };
        });
    }

    function showTextIssuePopover(anchorSpan, issue) {
        popover.innerHTML = `
            <div class="popover-header">
                <div style="display: flex; align-items: center; gap: 8px;">
                    <span class="popover-badge">Guideline Issue</span>
                    <span class="popover-rule-id">${escapeHtml(issue.rule_id || 'RULE-TONE')}</span>
                </div>
                <span class="popover-auditor-label">TrueTone Auditor</span>
            </div>
            <div class="popover-problem">
                ${escapeHtml(issue.problem)}
            </div>
            <div class="popover-suggestion-box">
                <div class="popover-suggestion-label">Suggested Replacement</div>
                <strong>${escapeHtml(issue.suggestion)}</strong>
            </div>
            <div class="popover-actions">
                <button type="button" class="btn-popover-dismiss" id="btn-popover-keep" title="Dismiss suggestion and keep original">
                    ✕ Keep Original
                </button>
                <button type="button" class="btn-popover-accept" id="btn-popover-accept" title="Accept AI replacement">
                    ✓ Accept Fix
                </button>
            </div>
        `;

        popover.style.display = 'flex';
        positionElementNearAnchor(popover, anchorSpan);

        // Accept Suggestion
        document.getElementById('btn-popover-accept').onclick = () => {
            // Replace span with green resolved span
            const resolvedSpan = document.createElement('span');
            resolvedSpan.className = 'tt-text-resolved';
            resolvedSpan.textContent = issue.suggestion;
            anchorSpan.replaceWith(resolvedSpan);

            // Remove issue from currentReviewResult.text
            currentReviewResult.text = currentReviewResult.text.filter(t => t._uid !== issue._uid);

            popover.style.display = 'none';
            checkIfAllIssuesResolved();
            if (window.TrueTone) window.TrueTone.showToast("Accepted brand correction", "success");
        };

        // Dismiss / Keep Original
        document.getElementById('btn-popover-keep').onclick = () => {
            popover.style.display = 'none';
            // Leaves issue untouched in currentReviewResult.text and span stays red
            if (window.TrueTone) window.TrueTone.showToast("Kept original phrasing (unresolved issue)", "warn");
        };
    }

    // display_problematic_files(reviewObj)
    function display_problematic_files(reviewObj) {
        const previewStrip = document.getElementById('attachment-preview');
        if (!previewStrip) return;

        const chips = previewStrip.querySelectorAll('.tt-attachment-chip');
        const badFiles = reviewObj.bad_files || [];
        const goodFiles = reviewObj.good_files || [];

        chips.forEach(chip => {
            const fileName = chip.dataset.fileName;

            // Remove previous badges
            const oldBadge = chip.querySelector('.tt-file-badge-issue, .tt-file-badge-good');
            if (oldBadge) oldBadge.remove();
            chip.classList.remove('tt-file-issue');

            // Find matching bad file (exact or normalized)
            const badFile = badFiles.find(b => {
                const bName = (b.file_name || '').toLowerCase().trim();
                const fName = (fileName || '').toLowerCase().trim();
                return bName === fName || bName.includes(fName) || fName.includes(bName);
            }) || (badFiles.length === 1 && chips.length === 1 ? badFiles[0] : null);

            if (badFile) {
                chip.classList.add('tt-file-issue');

                const badge = document.createElement('span');
                badge.className = 'tt-file-badge-issue';
                badge.innerHTML = '⚠ Issue';
                chip.appendChild(badge);

                // Clicking chip triggers file issue popover
                chip.onclick = (e) => {
                    // If remove button was clicked, stop
                    if (e.target.closest('.tt-chip-remove')) return;
                    e.stopPropagation();
                    showFileIssuePopover(chip, badFile);
                };
            } else if (goodFiles.some(g => (g || '').toLowerCase().trim() === (fileName || '').toLowerCase().trim())) {
                const badge = document.createElement('span');
                badge.className = 'tt-file-badge-good';
                badge.innerHTML = '✓ Verified';
                chip.appendChild(badge);

                chip.onclick = (e) => {
                    if (e.target.closest('.tt-chip-remove')) return;
                    const f = file_array.find(item => item.name === fileName);
                    if (f) openFilePreviewModal(f);
                };
            }
        });
    }

    function showFileIssuePopover(anchorChip, badFile) {
        popover.innerHTML = `
            <div class="popover-header">
                <div style="display: flex; align-items: center; gap: 8px;">
                    <span class="popover-badge">Asset Violation</span>
                    <span class="popover-rule-id">${escapeHtml(badFile.rule_id || 'ASSET-01')}</span>
                </div>
                <span class="popover-auditor-label">${escapeHtml(badFile.file_name)}</span>
            </div>
            <div class="popover-problem">
                ${escapeHtml(badFile.problem)}
            </div>
            <div class="popover-suggestion-box">
                <div class="popover-suggestion-label">Remedy</div>
                <strong>${escapeHtml(badFile.suggestion)}</strong>
            </div>
            <div class="popover-file-footer">
                <a href="#" id="btn-popover-preview-file" class="popover-preview-link">🔍 Preview Asset</a>
                <div class="popover-actions">
                    <button type="button" class="btn-popover-dismiss" id="btn-popover-keep-file">
                        ✕ Keep File
                    </button>
                    <button type="button" class="btn-popover-accept" id="btn-popover-remove-file">
                        ✓ Remove File
                    </button>
                </div>
            </div>
        `;

        popover.style.display = 'flex';
        positionElementNearAnchor(popover, anchorChip);

        // Preview file link
        document.getElementById('btn-popover-preview-file').onclick = (e) => {
            e.preventDefault();
            const f = file_array.find(item => item.name === badFile.file_name);
            if (f) openFilePreviewModal(f);
        };

        // Accept / Remove problematic file
        document.getElementById('btn-popover-remove-file').onclick = () => {
            // Remove from file_array
            file_array = file_array.filter(f => f.name !== badFile.file_name);
            // Remove from bad_files
            currentReviewResult.bad_files = currentReviewResult.bad_files.filter(b => b._uid !== badFile._uid);

            show_files();
            display_problematic_files(currentReviewResult);
            popover.style.display = 'none';
            checkIfAllIssuesResolved();
            if (window.TrueTone) window.TrueTone.showToast(`Removed problematic file: ${badFile.file_name}`, "success");
        };

        // Dismiss / Keep File As-Is
        document.getElementById('btn-popover-keep-file').onclick = () => {
            popover.style.display = 'none';
            if (window.TrueTone) window.TrueTone.showToast("Kept flagged file (unresolved issue)", "warn");
        };
    }

    function positionElementNearAnchor(targetEl, anchorEl) {
        const rect = anchorEl.getBoundingClientRect();
        const popoverWidth = 340;
        const popoverHeight = 220;

        let left = rect.left + window.scrollX;
        let top = rect.bottom + window.scrollY + 8;

        // Viewport boundaries
        if (left + popoverWidth > window.innerWidth - 16) {
            left = window.innerWidth - popoverWidth - 20;
        }
        if (left < 16) left = 16;

        if (top + popoverHeight > window.innerHeight + window.scrollY - 16) {
            // Flip above
            top = rect.top + window.scrollY - popoverHeight - 8;
        }

        targetEl.style.left = `${Math.max(10, left)}px`;
        targetEl.style.top = `${Math.max(10, top)}px`;
    }

    // =========================================================================
    // PART 4: FINAL UPLOAD, AUDIT LOGGING & DATABASE ROUTING
    // =========================================================================

    const finalUploadBtn = document.getElementById('final-upload-btn');
    finalUploadBtn.onclick = async () => {
        if (!isReviewCompleted || !currentReviewResult) {
            if (window.TrueTone) window.TrueTone.showToast("Please run review before submitting", "warn");
            return;
        }

        const finalText = text();
        if (!finalText && file_array.length === 0) {
            if (window.TrueTone) window.TrueTone.showToast("Post is empty", "error");
            return;
        }

        finalUploadBtn.disabled = true;
        finalUploadBtn.innerHTML = '⏳ Submitting to TrueTone...';

        try {
            // Clean serializable remaining problems
            const cleanRemainingProblems = {
                text: currentReviewResult.text.map(({ problem_in, problem, suggestion }) => ({
                    problem_in,
                    problem,
                    suggestion
                })),
                bad_files: currentReviewResult.bad_files.map(({ file_name, problem, suggestion, media_type, rule_id, guideline_source, findings }) => ({
                    file_name,
                    problem,
                    suggestion,
                    media_type,
                    rule_id,
                    guideline_source,
                    findings
                })),
                good_files: currentReviewResult.good_files
            };

            const hasRemainingIssues = (cleanRemainingProblems.text.length > 0 || cleanRemainingProblems.bad_files.length > 0);

            const formData = new FormData();
            formData.append('user_id', String(currentUser.user_id || 1));
            formData.append('final_text', finalText);
            formData.append('remaining_problems', JSON.stringify(hasRemainingIssues ? cleanRemainingProblems : null));

            file_array.forEach(file => {
                formData.append('files', file);
            });

            const res = await fetch('/api/publish-submission', {
                method: 'POST',
                body: formData,
            });

            const result = await res.json();
            if (!result.success) throw new Error(result.error || 'Submission failed');

            // Post-Submission UI Reset & Confirmation
            finalUploadBtn.disabled = false;
            finalUploadBtn.innerHTML = '🚀 Upload & Submit';

            const statusBanner = document.getElementById('publish-status-banner');
            statusBanner.style.display = 'block';

            if (result.route === 'published') {
                statusBanner.className = 'banner-notice success';
                statusBanner.innerHTML = `
                    <div class="banner-status-content">
                        <svg class="banner-status-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                            <polyline points="22 4 12 14.01 9 11.01"></polyline>
                        </svg>
                        <div>
                            <strong>Verified & Published!</strong>
                            <p class="banner-status-msg">${result.message}</p>
                        </div>
                    </div>
                `;
                if (window.TrueTone) {
                    window.TrueTone.showToast("Post verified and published to live catalog!", "success");
                }
            } else {
                statusBanner.className = 'banner-notice read-only';
                statusBanner.innerHTML = `
                    <div class="banner-status-content">
                        <svg class="banner-status-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                            <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"></path>
                            <line x1="12" y1="9" x2="12" y2="13"></line>
                            <line x1="12" y1="17" x2="12.01" y2="17"></line>
                        </svg>
                        <div>
                            <strong>Routed to Pending Approval Queue</strong>
                            <p class="banner-status-msg">${result.message}</p>
                            <span class="banner-status-meta">Pending Queue ID: #${result.id} &bull; Log ID: #${result.log_id}</span>
                        </div>
                    </div>
                `;
                if (window.TrueTone) {
                    window.TrueTone.showToast("Sent to Pending Approval queue due to unresolved flags.", "warn");
                }
            }

            // Reset compose box & attachments after delay
            setTimeout(() => {
                const composeBox = document.getElementById('compose-box');
                if (composeBox) composeBox.innerHTML = '';
                file_array = [];
                currentReviewResult = null;
                isReviewCompleted = false;
                show_files();
                finalUploadBtn.style.display = 'none';
            }, 3000);

        } catch (err) {
            console.error('[PUBLISH-SUBMISSION-ERROR]', err);
            finalUploadBtn.disabled = false;
            finalUploadBtn.innerHTML = '🚀 Upload & Submit';
            if (window.TrueTone) {
                window.TrueTone.showToast(`Submission error: ${err.message}`, "error");
            }
        }
    };
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

// Expose globally
window.publish_tab = publish_tab;
