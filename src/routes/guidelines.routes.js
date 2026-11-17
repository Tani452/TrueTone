/**
 * Guidelines Routes & Controllers
 * Provides brand guidelines, voice rules, and simulated/AI tone checking.
 */

const express = require('express');
const router = express.Router();

const BRAND_GUIDELINES = {
    brand_name: "TrueTone",
    version: "2026.4",
    pillars: [
        {
            id: "PILLAR-1",
            name: "Objective & Probabilistic",
            description: "TrueTone models communicate with empirical confidence rather than infallible absolutes.",
            rules: [
                "Never use terms like '100% infallible', 'guaranteed perfection', or 'zero margin of error'.",
                "Frame capabilities probabilistically (e.g. 'Engineered for 99.9% consistency across enterprise corpora')."
            ],
            severity: "HIGH"
        },
        {
            id: "PILLAR-2",
            name: "Enterprise Authority & Restraint",
            description: "Maintain an authoritative, measured, and dignified tone across all customer touchpoints.",
            rules: [
                "Prohibit artificial urgency and clickbait syntax ('HURRY!', 'CRAZY DEALS', 'UNBELIEVABLE').",
                "Do not use casual internet slang in commercial or developer announcements."
            ],
            severity: "CRITICAL"
        },
        {
            id: "PILLAR-3",
            name: "Accessible & Inclusive Design",
            description: "All textual and visual communications must strictly comply with WCAG 2.2 AA standards.",
            rules: [
                "Visual contrast ratios between text overlays and gradients must remain above 4.5:1.",
                "Avoid ableist idioms and culturally exclusionary colloquialisms."
            ],
            severity: "MEDIUM"
        },
        {
            id: "PILLAR-4",
            name: "Safe Harbor & Forward Projections",
            description: "Financial metrics, revenue targets, or forward-looking AI statements require statutory caveats.",
            rules: [
                "Forward projections must include Safe Harbor disclaimer (Section 27A SEC Act 1933).",
                "Do not discuss unreleased feature ship dates without product council approval."
            ],
            severity: "CRITICAL"
        }
    ],
    palette: [
        { name: "Deep Navy Core", hex: "#0a0f1d", usage: "Primary canvas and dark background" },
        { name: "Enterprise Slate", hex: "#1e293b", usage: "Cards, containers, secondary layers" },
        { name: "Electric Cyan", hex: "#06b6d4", usage: "High-priority highlights and interactive accents" },
        { name: "Brand Cobalt", hex: "#3b82f6", usage: "Primary actions and system buttons" },
        { name: "Emerald Verified", hex: "#10b981", usage: "Pass states, 90%+ quality badges" },
        { name: "Warning Amber", hex: "#f59e0b", usage: "Medium severity warnings, tone flags" },
        { name: "Critical Rose", hex: "#ef4444", usage: "Rejection notices, critical rule breaches" }
    ],
    prohibited_terms: [
        { term: "100% infallible", reason: "Overpromising claim; violates probabilistic mandate", remedy: "Engineered for 99.9% consistency" },
        { term: "crazy lifetime deals", reason: "Hyperbolic urgency; damages enterprise trust", remedy: "Standard multi-year enterprise volume pricing" },
        { term: "never make a single mistake", reason: "Unverified absolute statement", remedy: "Validated by automated brand guardrails" },
        { term: "world best", reason: "Grammatical syntax error and subjective claim", remedy: "World-leading or industry-benchmarked" }
    ]
};

// GET /api/guidelines - Return complete guideline specifications
router.get('/', (req, res) => {
    res.json({
        success: true,
        data: BRAND_GUIDELINES
    });
});

// POST /api/guidelines/check - Test content against guideline rules
router.post('/check', (req, res) => {
    const { text = "" } = req.body;
    const lower = text.toLowerCase();
    const violations = [];

    BRAND_GUIDELINES.prohibited_terms.forEach(item => {
        if (lower.includes(item.term.toLowerCase())) {
            violations.push({
                term: item.term,
                reason: item.reason,
                remedy: item.remedy,
                severity: "HIGH"
            });
        }
    });

    if (text.length > 0 && text === text.toUpperCase() && text.length > 15) {
        violations.push({
            term: "ALL CAPS SYNTAX",
            reason: "All-caps text violates calm, authoritative brand guidelines",
            remedy: "Use standard sentence case",
            severity: "MEDIUM"
        });
    }

    const score = Math.max(25, 100 - (violations.length * 28));

    res.json({
        success: true,
        text_analyzed: text,
        score,
        status: violations.length === 0 ? "PASSED_COMPLIANCE" : "FLAGGED_FOR_REVISION",
        violations
    });
});

module.exports = router;
