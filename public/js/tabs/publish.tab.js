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
        <div class="composer-header">
            <div class="composer-header-title">
                <h2>Create & Verify Content</h2>
                <p>Author official communications, inspect tone deviations against guidelines, and submit for verification.</p>
            </div>
            <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 6px;">
                <span class="ai-disclosure-badge">
                    <span>✨</span>
                    <span>Powered by Gemini &bull; Checked against approved guidelines</span>
                </span>
                <span style="font-size: 0.74rem; color: var(--text-muted);">
                    Author: <strong style="color: var(--text-primary);">${escapeHtml(currentUser.user_name)}</strong> (${escapeHtml(currentUser.department)})
                </span>
            </div>
        </div>

        <!-- Dynamic Verification Status Banner -->
        <div id="publish-status-banner" style="display: none; margin-bottom: 16px;"></div>

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
                    <button type="button" id="add-attachment-btn" title="Attach files">
                        +
                    </button>
                    <div id="attachment-dropdown">
                        <button type="button" class="dropdown-item" id="btn-attach-doc">
                            <span>📄</span>
                            <span>Document</span>
                        </button>
                        <button type="button" class="dropdown-item" id="btn-attach-img">
                            <span>🖼️</span>
                            <span>Image</span>
                        </button>
                        <button type="button" class="dropdown-item" id="btn-attach-vid">
                            <span>🎥</span>
                            <span>Video</span>
                        </button>
                        <button type="button" class="dropdown-item" id="btn-attach-aud">
                            <span>🎵</span>
                            <span>Audio</span>
                        </button>
                    </div>
                </div>

                <!-- Right Side: Workflow Buttons -->
                <div style="display: flex; gap: 12px; align-items: center;">
                    <button type="button" class="btn-primary" id="review-btn">
                        🛡️ Review with AI
                    </button>
                    <button type="button" class="btn-primary" id="final-upload-btn" style="display: none; background: linear-gradient(135deg, #10b981, #059669);">
                        🚀 Upload & Submit
                    </button>
                </div>
            </div>
        </div>

        <!-- Live Guideline Reference Footnote & AI Disclosure -->
        <div style="margin-top: 14px; display: flex; flex-direction: column; gap: 6px; font-size: 0.76rem; color: var(--text-muted);">
            <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">
                <span>Enforcing: <code>brand_voice_and_tone.md</code> &bull; <code>approved_facts_and_claims.txt</code> &bull; <code>visual_and_accessibility_standards.md</code> &bull; <code>video_and_motion_standards.md</code> &bull; <code>audio_and_voice_standards.md</code></span>
                <span>Target Engine: <code>POST /api/publish-submission</code></span>
            </div>
            <div style="color: #64748b; font-size: 0.72rem; display: flex; align-items: center; gap: 6px;">
                <span>🛡️ AI-Reviewed Disclosure:</span>
                <span>Media and attachments are sent to Google Gemini for multimodal compliance audit (max 100MB video, 50MB audio). Files are never stored by TrueTone beyond the review.</span>
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
    previewModal.innerHTML = `
        <div class="file-preview-content">
            <div class="file-preview-header">
                <span id="tt-modal-file-title" style="font-weight: 600; font-size: 0.9rem; color: #fff;">File Preview</span>
                <div style="display: flex; gap: 12px; align-items: center;">
                    <a id="tt-modal-external-link" href="#" target="_blank" style="color: #38bdf8; font-size: 0.8rem; text-decoration: none;">Open in New Tab &nearr;</a>
                    <button type="button" class="btn-close" id="tt-modal-close-btn">&times;</button>
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
                thumbBox.innerHTML = `<span style="font-size: 1.4rem;">🎵</span>`;
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
                ${isAudio ? `<audio controls preload="metadata" src="${URL.createObjectURL(file)}" style="height: 24px; width: 100%; max-width: 140px; margin-top: 3px;" onclick="event.stopPropagation();"></audio>` : ''}
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
                    vid.play().catch(() => {});
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
                    aud.play().catch(() => {});
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
                <div style="display: flex; align-items: center; gap: 8px;">
                    <span style="font-size: 1.1rem;">✓</span>
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
                    <div style="margin-top: 14px; border-top: 1px solid rgba(255, 132, 0, 0.3); padding-top: 12px; display: flex; flex-direction: column; gap: 10px; width: 100%;">
                        <div style="display: flex; align-items: center; gap: 8px; font-weight: 700; color: #ff5277; font-size: 0.85rem; text-transform: uppercase; letter-spacing: 0.05em;">
                            <span>🚨</span>
                            <span>Detected Violation(s) in Uploaded Files (${unresolvedFiles})</span>
                        </div>
                        ${currentReviewResult.bad_files.map(b => {
                            const isVid = (b.media_type === 'video') ||
                                (b.file_name && ['.mp4', '.mov', '.webm', '.mpeg', '.avi'].some(ext => b.file_name.toLowerCase().endsWith(ext)));
                            const isAud = (b.media_type === 'audio') ||
                                (b.file_name && ['.mp3', '.wav', '.m4a', '.aac', '.ogg', '.flac'].some(ext => b.file_name.toLowerCase().endsWith(ext)));
                            const mediaBadge = isVid ? '🎥 VIDEO' : (isAud ? '🎵 AUDIO' : ((b.media_type === 'image') ? '🖼️ IMAGE' : '📄 DOCUMENT'));
                            const ruleId = b.rule_id || (isVid ? 'VID-01' : (isAud ? 'AUD-01' : 'VIS-01'));
                            const guideSource = b.guideline_source || (isVid ? 'guidelines/video_and_motion_standards.md' : (isAud ? 'guidelines/audio_and_voice_standards.md' : 'guidelines/visual_and_accessibility_standards.md'));
                            const findings = Array.isArray(b.findings) ? b.findings : [];

                            return `
                            <div class="asset-violation-card" style="background: rgba(8, 14, 28, 0.85); border: 1px solid rgba(255, 82, 119, 0.4); border-radius: 6px; padding: 12px 14px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);">
                                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; flex-wrap: wrap; gap: 6px;">
                                    <div style="font-weight: 700; color: #f8fafc; font-size: 0.9rem; display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                                        <span style="font-size: 0.72rem; color: #38bdf8; background: rgba(56, 189, 248, 0.15); border: 1px solid #38bdf8; padding: 2px 7px; border-radius: 4px; font-weight: 700;">${mediaBadge}</span>
                                        <span style="font-size: 0.72rem; color: #f59e0b; background: rgba(245, 158, 11, 0.15); border: 1px solid #f59e0b; padding: 2px 7px; border-radius: 4px; font-weight: 700; font-family: monospace;">${escapeHtml(ruleId)}</span>
                                        <span>${escapeHtml(b.file_name)}</span>
                                    </div>
                                    <div style="display: flex; gap: 8px; align-items: center;">
                                        <span style="font-size: 0.72rem; color: #ff5277; background: rgba(255, 82, 119, 0.15); border: 1px solid #ff5277; padding: 2px 8px; border-radius: 4px; font-weight: 700; text-transform: uppercase;">Flagged Violation</span>
                                        <button type="button" class="btn-remove-bad-file" data-filename="${escapeHtml(b.file_name)}" style="background: rgba(255, 82, 119, 0.2); border: 1px solid #ff5277; color: #ff8fa3; padding: 3px 10px; border-radius: 4px; font-size: 0.76rem; cursor: pointer; font-weight: 600;">🗑️ Remove File</button>
                                    </div>
                                </div>
                                <div style="font-size: 0.74rem; color: var(--text-muted); margin-bottom: 8px;">
                                    Guideline Source: <code style="color: #93c5fd;">${escapeHtml(guideSource)}</code>
                                </div>
                                <div style="margin-bottom: 8px; font-size: 0.86rem; line-height: 1.4; color: #fca5a5;">
                                    <strong style="color: #ff6b81;">Violation:</strong> ${escapeHtml(b.problem)}
                                </div>
                                <div style="background: rgba(6, 182, 212, 0.09); border-left: 3px solid #06b6d4; padding: 8px 12px; border-radius: 4px; font-size: 0.83rem; line-height: 1.4; color: #e2e8f0; margin-bottom: 8px;">
                                    <div style="font-size: 0.7rem; color: #38bdf8; font-weight: 700; text-transform: uppercase; margin-bottom: 2px; letter-spacing: 0.05em;">Recommended Remedy</div>
                                    <span>${escapeHtml(b.suggestion)}</span>
                                </div>
                                ${b.transcript ? `
                                    <details style="margin-top: 8px; margin-bottom: 8px; border-top: 1px dashed rgba(255,255,255,0.1); padding-top: 6px;">
                                        <summary style="cursor: pointer; font-size: 0.76rem; color: #38bdf8; font-weight: 600;">📝 Spoken Transcript</summary>
                                        <div style="font-size: 0.78rem; color: #cbd5e1; margin-top: 4px; padding: 6px 10px; background: rgba(0,0,0,0.35); border-radius: 4px; white-space: pre-wrap; font-family: inherit;">${escapeHtml(b.transcript)}</div>
                                    </details>
                                ` : ''}
                                ${findings.length > 0 ? `
                                    <div style="margin-top: 10px; border-top: 1px solid rgba(255, 255, 255, 0.1); padding-top: 8px;">
                                        <div style="font-size: 0.74rem; color: #94a3b8; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 6px;">
                                            ⏱️ Timestamped Findings (${findings.length})
                                        </div>
                                        <div style="display: flex; flex-direction: column; gap: 6px;">
                                            ${findings.map(f => `
                                                <div style="background: rgba(0, 0, 0, 0.45); border-left: 3px solid #f59e0b; padding: 6px 10px; border-radius: 3px; font-size: 0.8rem;">
                                                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 3px; flex-wrap: wrap; gap: 4px;">
                                                        <button type="button" class="btn-timestamp-seek" data-filename="${escapeHtml(b.file_name)}" data-seek="${escapeHtml(f.timestamp_start)}" title="Click to seek ${isAud ? 'audio' : 'video'} to ${escapeHtml(f.timestamp_start)}" style="background: rgba(56, 189, 248, 0.2); border: 1px solid #38bdf8; color: #38bdf8; font-family: monospace; font-size: 0.75rem; font-weight: 700; padding: 2px 7px; border-radius: 4px; cursor: pointer;">
                                                            ⏱️ ${escapeHtml(f.timestamp_start)} - ${escapeHtml(f.timestamp_end)} (${isAud ? 'Seek Audio' : 'Seek Video'})
                                                        </button>
                                                        <span style="font-size: 0.68rem; color: #fde68a; text-transform: uppercase; font-weight: 700;">${escapeHtml(f.category || 'tone')}</span>
                                                    </div>
                                                    <div style="color: #fca5a5; margin-bottom: 2px;">${escapeHtml(f.description)}</div>
                                                    ${f.evidence ? `<div style="font-size: 0.74rem; color: #94a3b8; font-style: italic; margin-bottom: 2px;">&ldquo;${escapeHtml(f.evidence)}&rdquo;</div>` : ''}
                                                    <div style="font-size: 0.76rem; color: #6ee7b7;"><strong>Fix:</strong> ${escapeHtml(f.suggested_fix)}</div>
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
                <div style="display: flex; flex-direction: column; width: 100%;">
                    <div style="display: flex; align-items: center; justify-content: space-between; width: 100%; flex-wrap: wrap; gap: 8px;">
                        <div>
                            <strong>⚠️ ${totalUnresolved} Brand Guideline Deviation(s) Detected:</strong>
                            <span style="margin-left: 6px;">${instructions.join(' • ')}</span>
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
                <span class="popover-badge">Guideline Issue</span>
                <span style="font-size: 0.72rem; color: #94a3b8;">TrueTone Auditor</span>
            </div>
            <div class="popover-problem">
                ${escapeHtml(issue.problem)}
            </div>
            <div class="popover-suggestion-box">
                <div style="font-size: 0.7rem; color: #6ee7b7; text-transform: uppercase; margin-bottom: 2px;">Suggested Replacement</div>
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
                <span class="popover-badge">Flagged File: ${escapeHtml(badFile.file_name)}</span>
                <span style="font-size: 0.72rem; color: #94a3b8;">Asset Violation</span>
            </div>
            <div class="popover-problem">
                ${escapeHtml(badFile.problem)}
            </div>
            <div class="popover-suggestion-box">
                <div style="font-size: 0.7rem; color: #6ee7b7; text-transform: uppercase; margin-bottom: 2px;">Remedy</div>
                <strong>${escapeHtml(badFile.suggestion)}</strong>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 4px;">
                <a href="#" id="btn-popover-preview-file" style="color: #38bdf8; font-size: 0.8rem; text-decoration: none;">🔍 Preview Asset</a>
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
                    <div style="font-size: 0.95rem;">
                        <strong>🎉 Verified & Published!</strong>
                        <p style="margin-top: 4px; font-size: 0.84rem;">${result.message}</p>
                    </div>
                `;
                if (window.TrueTone) {
                    window.TrueTone.showToast("Post verified and published to live catalog!", "success");
                }
            } else {
                statusBanner.className = 'banner-notice read-only';
                statusBanner.innerHTML = `
                    <div style="font-size: 0.95rem;">
                        <strong>⚠️ Routed to Pending Approval Queue</strong>
                        <p style="margin-top: 4px; font-size: 0.84rem;">${result.message}</p>
                        <span style="font-size: 0.78rem; color: #fde68a;">Pending Queue ID: #${result.id} &bull; Log ID: #${result.log_id}</span>
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
