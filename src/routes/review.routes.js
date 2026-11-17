/**
 * Review Tab Routes
 * Handles pending post management, voting, and the Gemini AI Brand Guideline Scanner.
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const reviewController = require('../controllers/review.controller');
const { auditContentWithGemini } = require('../services/gemini.service');

// Memory storage for AI content scanning without writing to disk
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 25 * 1024 * 1024 } // 25MB max file size
});

// POST /api/review - Gemini AI Multimodal Brand-Guideline Review
router.post('/', upload.array('files'), async (req, res) => {
    try {
        const text = req.body.text || '';
        const files = req.files || [];

        const auditResult = await auditContentWithGemini(text, files);

        res.json({
            success: true,
            ...auditResult,
        });
    } catch (error) {
        console.error('[AI-REVIEW-ROUTE-ERROR]', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Error executing AI brand audit',
        });
    }
});

// GET /api/review/pending - Retrieve unapproved queue
router.get('/pending', reviewController.getPendingPosts);

// POST /api/review/:id/vote - Register community / manager vote
router.post('/:id/vote', reviewController.voteOnPost);

// POST /api/review/:id/approve - Approve post and dispatch to published
router.post('/:id/approve', reviewController.approveAndPublish);

// POST /api/review/submit - Create new pending post draft
router.post('/submit', reviewController.submitPostForReview);

module.exports = router;
