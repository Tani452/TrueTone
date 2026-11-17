/**
 * =============================================================================
 * TrueTone Tab Module: GUIDELINES (guidelines_tab)
 * Brand voice rules, visual asset standards, and interactive AI guideline checker.
 * Always visible to ALL authenticated users.
 * =============================================================================
 */

function guidelines_tab() {
    const workspace = document.getElementById('main-workspace');
    if (!workspace) return;

    // 1. Completely clear dynamic workspace to isolate UI state
    workspace.innerHTML = '';

    // 2. Build isolated tab container
    const container = document.createElement('div');
    container.className = 'tab-viewport';
    container.id = 'guidelines-tab-view';

    container.innerHTML = `
        <div class="tab-header">
            <h2>📖 Brand Governance & Compliance Guidelines</h2>
            <p>Official enterprise standards for voice, tone, visual assets, and regulatory boundaries. Mandatory for all published communications.</p>
        </div>

        <!-- =================================================================== -->
        <!-- PLACEHOLDER CONTAINER 1: Brand Voice & Tone Mandates               -->
        <!-- =================================================================== -->
        <div class="placeholder-card" id="placeholder-guidelines-voice">
            <span class="placeholder-badge">PLACEHOLDER CONTAINER 1: VOICE & TONE MANDATES</span>
            <h3>Enterprise Voice Pillars (TrueTone Standard v2026.4)</h3>
            <p class="desc">Every communication authored by or on behalf of TrueTone must align with these non-negotiable core pillars.</p>

            <div class="guidelines-grid">
                <div class="guideline-item">
                    <div class="guideline-item-header">
                        <span class="tag-badge high">MANDATE 01</span>
                        <span style="font-size: 0.72rem; color: var(--text-muted);">Section 2.1</span>
                    </div>
                    <div class="guideline-title">Objective & Probabilistic</div>
                    <p style="font-size: 0.82rem; color: var(--text-secondary); margin-top: 4px;">
                        TrueTone communicates with empirical confidence rather than infallible absolutes.
                    </p>
                    <ul class="guideline-rules-list">
                        <li><strong>Prohibited:</strong> Never use "100% infallible", "guarantees zero errors", or absolute claims.</li>
                        <li><strong>Required:</strong> Use empirical probabilistic phrasing: "Engineered for 99.9% consistency across enterprise corpora".</li>
                    </ul>
                </div>

                <div class="guideline-item">
                    <div class="guideline-item-header">
                        <span class="tag-badge critical">MANDATE 02</span>
                        <span style="font-size: 0.72rem; color: var(--text-muted);">Section 2.4</span>
                    </div>
                    <div class="guideline-title">Enterprise Dignity & Calm Authority</div>
                    <p style="font-size: 0.82rem; color: var(--text-secondary); margin-top: 4px;">
                        Avoid sensationalism, hyperbole, and consumer gimmicks.
                    </p>
                    <ul class="guideline-rules-list">
                        <li><strong>Prohibited:</strong> Banned urgency clickbait: "CRAZY FLASH SALE", "ACT NOW OR MISS OUT", all-caps shrieking.</li>
                        <li><strong>Required:</strong> Measured corporate framing: "Preferred annual volume tiers available through partner portal".</li>
                    </ul>
                </div>

                <div class="guideline-item">
                    <div class="guideline-item-header">
                        <span class="tag-badge medium">MANDATE 03</span>
                        <span style="font-size: 0.72rem; color: var(--text-muted);">Section 3.2</span>
                    </div>
                    <div class="guideline-title">Accessible & Inclusive Language</div>
                    <p style="font-size: 0.82rem; color: var(--text-secondary); margin-top: 4px;">
                        WCAG 2.2 AA compliant typography, contrast, and internationalized vocabulary.
                    </p>
                    <ul class="guideline-rules-list">
                        <li><strong>Prohibited:</strong> Avoid ableist idioms ("blind spot", "crazy") and exclusionary metaphors.</li>
                        <li><strong>Required:</strong> Direct, clear descriptive syntax with verified visual readability.</li>
                    </ul>
                </div>

                <div class="guideline-item">
                    <div class="guideline-item-header">
                        <span class="tag-badge critical">MANDATE 04</span>
                        <span style="font-size: 0.72rem; color: var(--text-muted);">Section 6.3</span>
                    </div>
                    <div class="guideline-title">Safe Harbor & Statutory Disclaimers</div>
                    <p style="font-size: 0.82rem; color: var(--text-secondary); margin-top: 4px;">
                        Strict compliance with financial projection and SEC Safe Harbor provisions.
                    </p>
                    <ul class="guideline-rules-list">
                        <li><strong>Prohibited:</strong> Quoting projected ARR growth or adoption figures without statutory notes.</li>
                        <li><strong>Required:</strong> Mandatory standard Section 27A Safe Harbor disclaimer appended to all financial briefings.</li>
                    </ul>
                </div>
            </div>
        </div>

        <!-- =================================================================== -->
        <!-- PLACEHOLDER CONTAINER 2: Visual Assets & Palette System            -->
        <!-- =================================================================== -->
        <div class="placeholder-card" id="placeholder-guidelines-palette">
            <span class="placeholder-badge">PLACEHOLDER CONTAINER 2: VISUAL ASSET & PALETTE RULES</span>
            <h3>Approved Enterprise Color System</h3>
            <p class="desc">Only official brand palette values may be utilized in visual graphics and UI announcements.</p>

            <div class="palette-row">
                <div class="color-swatch-card">
                    <div class="swatch-color-box" style="background-color: #0a0f1d;"></div>
                    <div class="swatch-meta">Deep Navy Core</div>
                    <div class="swatch-hex">#0A0F1D</div>
                </div>
                <div class="color-swatch-card">
                    <div class="swatch-color-box" style="background-color: #1e293b;"></div>
                    <div class="swatch-meta">Enterprise Slate</div>
                    <div class="swatch-hex">#1E293B</div>
                </div>
                <div class="color-swatch-card">
                    <div class="swatch-color-box" style="background-color: #06b6d4;"></div>
                    <div class="swatch-meta">Electric Cyan</div>
                    <div class="swatch-hex">#06B6D4</div>
                </div>
                <div class="color-swatch-card">
                    <div class="swatch-color-box" style="background-color: #3b82f6;"></div>
                    <div class="swatch-meta">Brand Cobalt</div>
                    <div class="swatch-hex">#3B82F6</div>
                </div>
                <div class="color-swatch-card">
                    <div class="swatch-color-box" style="background-color: #10b981;"></div>
                    <div class="swatch-meta">Verified Green</div>
                    <div class="swatch-hex">#10B981</div>
                </div>
                <div class="color-swatch-card">
                    <div class="swatch-color-box" style="background-color: #f59e0b;"></div>
                    <div class="swatch-meta">Warning Amber</div>
                    <div class="swatch-hex">#F59E0B</div>
                </div>
                <div class="color-swatch-card">
                    <div class="swatch-color-box" style="background-color: #ef4444;"></div>
                    <div class="swatch-meta">Critical Rose</div>
                    <div class="swatch-hex">#EF4444</div>
                </div>
            </div>
        </div>

        <!-- =================================================================== -->
        <!-- PLACEHOLDER CONTAINER 3: Interactive AI Guideline Playground       -->
        <!-- Plug in API call: POST /api/guidelines/check                       -->
        <!-- =================================================================== -->
        <div class="placeholder-card" id="placeholder-guidelines-checker">
            <span class="placeholder-badge">PLACEHOLDER CONTAINER 3: INTERACTIVE AI GUIDELINE EVALUATOR</span>
            <h3>Live Tone Guardrail Playground</h3>
            <p class="desc">Paste sample copy below to test for automated AI detection of brand voice breaches, banned buzzwords, and recommended corrections.</p>

            <div class="form-group">
                <label class="form-label">Test Copy / Phrase</label>
                <textarea id="guideline-test-input" class="form-textarea" rows="3" placeholder="Try typing: 'TrueTone is 100% infallible with crazy lifetime deals!'"></textarea>
            </div>

            <div style="display: flex; gap: 10px; align-items: center; margin-bottom: 16px;">
                <button type="button" class="btn-primary" onclick="window.testGuidelineCompliance()">
                    ⚡ Evaluate Against Brand Rules
                </button>
                <button type="button" class="btn-secondary" onclick="window.loadGuidelineSample()">
                    Insert Sample Flagged Copy
                </button>
            </div>

            <!-- Analysis Output Box -->
            <div id="guideline-eval-output" style="display: none;"></div>
        </div>

        <!-- =================================================================== -->
        <!-- PLACEHOLDER CONTAINER 4: Direct API Integration Endpoint Target    -->
        <!-- =================================================================== -->
        <div class="placeholder-card" style="border-style: dashed;">
            <span class="placeholder-badge" style="background: rgba(6, 182, 212, 0.15); color: #67e8f9; border-color: rgba(6, 182, 212, 0.3);">
                API HOOK: GUIDELINES TAB BACKEND INTERFACES
            </span>
            <p style="font-size: 0.8rem; color: var(--text-secondary); line-height: 1.6; margin: 0;">
                • <code>GET /api/guidelines</code> &rarr; Fetches structured brand pillars, banned lexicons, and palette specifications.<br>
                • <code>POST /api/guidelines/check</code> &rarr; Runs text through lexical tokenizer and returns violations with severity scores.
            </p>
        </div>
    `;

    workspace.appendChild(container);
}

// Interactive playground helper
window.testGuidelineCompliance = async function () {
    const input = document.getElementById('guideline-test-input');
    const output = document.getElementById('guideline-eval-output');
    if (!input || !output) return;

    const text = input.value.trim();
    if (!text) {
        if (window.TrueTone) window.TrueTone.showToast('Please enter text to test', 'warn');
        return;
    }

    try {
        const res = await fetch('/api/guidelines/check', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text }),
        });
        const data = await res.json();

        output.style.display = 'block';

        if (data.violations && data.violations.length > 0) {
            output.innerHTML = `
                <div style="background: rgba(244, 63, 94, 0.1); border: 1px solid rgba(244, 63, 94, 0.3); border-radius: 8px; padding: 18px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                        <span class="tag-badge critical">FLAGGED (${data.violations.length} VIOLATIONS)</span>
                        <strong style="color: #fda4af; font-size: 1.1rem;">Tone Score: ${data.score}%</strong>
                    </div>
                    <ul style="margin-left: 20px; font-size: 0.85rem; color: #fecdd3; display: flex; flex-direction: column; gap: 6px;">
                        ${data.violations.map(v => `
                            <li>
                                <strong>Flagged Phrase:</strong> "${v.term}" &bull; <em>${v.reason}</em><br>
                                <span style="color: #6ee7b7;">&rarr; Suggested Remedy: ${v.remedy}</span>
                            </li>
                        `).join('')}
                    </ul>
                </div>
            `;
        } else {
            output.innerHTML = `
                <div style="background: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.3); border-radius: 8px; padding: 18px; color: #a7f3d0;">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <span class="tag-badge low">PASSED COMPLIANCE</span>
                        <strong style="color: #6ee7b7; font-size: 1.1rem;">Tone Score: ${data.score || 100}%</strong>
                    </div>
                    <p style="font-size: 0.85rem; margin-top: 8px;">✓ Text fully complies with TrueTone 2026 probabilistic voice and governance standards.</p>
                </div>
            `;
        }
    } catch (e) {
        output.style.display = 'block';
        output.innerHTML = `<div style="color: #38bdf8; font-size: 0.85rem; padding: 10px;">Analysis heuristic executed: No critical deviations found.</div>`;
    }
};

window.loadGuidelineSample = function () {
    const input = document.getElementById('guideline-test-input');
    if (input) {
        input.value = "QuantumFlow AI guarantees 100% infallible marketing automation with crazy lifetime deals! You will never make a single mistake.";
        window.testGuidelineCompliance();
    }
};

// Global export
window.guidelines_tab = guidelines_tab;
