/**
 * Guidelines Routes & Controllers
 * Provides brand guideline management, file directory inspection, AI validation,
 * staged persistence, and past publish pattern extraction.
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const {
    loadGuidelinesContext,
    listGuidelinesFiles,
    getGuidelineFile,
    stageCandidateFiles,
    commitStagedFiles,
    discardStagedFiles,
    appendPastPublishesData,
} = require('../services/guidelines.service');
const {
    validateCandidateGuidelinesWithGemini,
    extractPastPublishesWithGemini,
} = require('../services/gemini.service');

// Memory storage for incoming uploads during validation and extraction
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 30 * 1024 * 1024 } // 30MB
});

/**
 * GET /api/guidelines/list
 * Returns array of all active files inside ./guidelines
 */
router.get('/list', async (req, res) => {
    try {
        const files = await listGuidelinesFiles();
        res.json({
            success: true,
            files,
        });
    } catch (err) {
        console.error('[GUIDELINES-LIST-ERROR]', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

/**
 * GET /api/guidelines/file/:filename
 * Inspect specific guideline file content safely
 */
router.get('/file/:filename', async (req, res) => {
    try {
        const fileData = await getGuidelineFile(req.params.filename);
        res.json({
            success: true,
            file: fileData,
        });
    } catch (err) {
        console.error('[GUIDELINE-READ-ERROR]', err);
        res.status(404).json({ success: false, error: err.message });
    }
});

/**
 * POST /api/guidelines/validate
 * Evaluates candidate guideline files against existing baseline using Gemini AI
 * Stages candidate files on disk if valid so they can be committed without re-upload
 */
router.post('/validate', upload.array('files'), async (req, res) => {
    try {
        const files = req.files || [];

        if (files.length === 0) {
            return res.status(400).json({
                success: false,
                is_valid: false,
                summary: "",
                incompatible_reason: "No files were uploaded for validation.",
                incompatible_files: [],
            });
        }

        // Technical sanity check
        const unreadable = [];
        for (const f of files) {
            if (!f.buffer || f.size === 0) {
                unreadable.push(f.originalname);
            }
        }
        if (unreadable.length > 0) {
            return res.json({
                success: true,
                is_valid: false,
                summary: "",
                incompatible_reason: `File(s) are empty or unreadable: ${unreadable.join(', ')}`,
                incompatible_files: unreadable,
            });
        }

        // Load existing guidelines context
        const { consolidatedText } = await loadGuidelinesContext();

        // Perform AI compatibility check
        const report = await validateCandidateGuidelinesWithGemini(files, consolidatedText);

        let stagingId = null;
        if (report.is_valid) {
            const staged = await stageCandidateFiles(files);
            stagingId = staged.stagingId;
        }

        res.json({
            success: true,
            is_valid: Boolean(report.is_valid),
            summary: report.summary || "Files validated and ready for inclusion.",
            incompatible_reason: report.incompatible_reason || "",
            incompatible_files: report.incompatible_files || [],
            staging_id: stagingId,
        });
    } catch (err) {
        console.error('[GUIDELINE-VALIDATE-ERROR]', err);
        res.status(500).json({
            success: false,
            is_valid: false,
            summary: "",
            incompatible_reason: `Validation error: ${err.message}`,
            incompatible_files: [],
        });
    }
});

/**
 * POST /api/guidelines/save
 * Commits previously validated and staged files into ./guidelines
 */
router.post('/save', async (req, res) => {
    try {
        const { staging_id } = req.body;

        if (!staging_id) {
            return res.status(400).json({
                success: false,
                error: "Field 'staging_id' is required to commit guidelines.",
            });
        }

        const savedFiles = await commitStagedFiles(staging_id);

        res.json({
            success: true,
            message: `Successfully activated ${savedFiles.length} guideline file(s) into ./guidelines`,
            saved_files: savedFiles,
        });
    } catch (err) {
        console.error('[GUIDELINE-SAVE-ERROR]', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

/**
 * DELETE /api/guidelines/stage/:stagingId
 * Discards temporary staged files when user cancels the upload modal
 */
router.delete('/stage/:stagingId', async (req, res) => {
    try {
        await discardStagedFiles(req.params.stagingId);
        res.json({
            success: true,
            message: "Temporary staged files discarded.",
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

/**
 * POST /api/guidelines/extract-past-publishes
 * Analyzes historical publications, reverse-engineers implicit brand rules,
 * and appends the markdown insights into ./guidelines/past_data_from_reviews.md
 */
router.post('/extract-past-publishes', upload.array('files'), async (req, res) => {
    try {
        const files = req.files || [];

        if (files.length === 0) {
            return res.status(400).json({
                success: false,
                error: "Please upload at least one historical publication file.",
            });
        }

        // Run Gemini pattern extraction
        const extractedMarkdown = await extractPastPublishesWithGemini(files);

        // Append to ./guidelines/past_data_from_reviews.md
        const filenames = files.map(f => f.originalname);
        const result = await appendPastPublishesData(extractedMarkdown, filenames);

        res.json({
            success: true,
            target_file: result.target_file,
            extracted_summary: extractedMarkdown,
            message: `Successfully analyzed ${files.length} past publication(s) and appended insights into ${result.target_file}.`,
        });
    } catch (err) {
        console.error('[PAST-PUBLISHES-EXTRACT-ERROR]', err);
        res.status(500).json({
            success: false,
            error: err.message || "Failed to extract past publish insights",
        });
    }
});

// Legacy / Quick Testing Endpoints
router.get('/', async (req, res) => {
    try {
        const { structuredRules } = await loadGuidelinesContext();
        res.json({
            success: true,
            brand_name: "TrueTone",
            version: "2026.4",
            rules_count: structuredRules.length,
            documents: structuredRules.map(r => r.filename),
        });
    } catch (e) {
        res.json({ success: true, brand_name: "TrueTone", version: "2026.4" });
    }
});

router.post('/check', (req, res) => {
    const { text = "" } = req.body;
    const lower = text.toLowerCase();
    const violations = [];

    const prohibitedTerms = [
        { term: "100% infallible", reason: "Overpromising claim; violates probabilistic mandate", remedy: "Engineered for 99.9% consistency" },
        { term: "crazy lifetime deals", reason: "Hyperbolic urgency; damages enterprise trust", remedy: "Standard multi-year enterprise volume pricing" },
        { term: "never make a single mistake", reason: "Unverified absolute statement", remedy: "Validated by automated brand guardrails" },
        { term: "world best", reason: "Grammatical syntax error and subjective claim", remedy: "World-leading or industry-benchmarked" }
    ];

    prohibitedTerms.forEach(item => {
        if (lower.includes(item.term.toLowerCase())) {
            violations.push({
                term: item.term,
                reason: item.reason,
                remedy: item.remedy,
                severity: "HIGH"
            });
        }
    });

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
