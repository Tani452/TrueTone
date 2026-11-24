/**
 * Review Tab Routes
 * Handles pending post management, voting, and the Gemini AI Brand Guideline Scanner.
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const reviewController = require('../controllers/review.controller');
const { auditContentWithGemini } = require('../services/gemini.service');

// Configurable media size limits in MB (default 100MB video, 50MB audio)
const MAX_VIDEO_MB = parseInt(process.env.MAX_VIDEO_MB, 10) || 100;
const MAX_AUDIO_MB = parseInt(process.env.MAX_AUDIO_MB, 10) || 50;
const MAX_FILE_SIZE_BYTES = Math.max(MAX_VIDEO_MB, MAX_AUDIO_MB) * 1024 * 1024;

const ALLOWED_MIME_TYPES = new Set([
    // Videos
    'video/mp4', 'video/quicktime', 'video/webm', 'video/mpeg', 'video/x-msvideo', 'video/avi',
    // Audio
    'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/x-wav', 'audio/mp4', 'audio/x-m4a', 'audio/aac', 'audio/ogg', 'audio/flac', 'audio/webm',
    // Images
    'image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp', 'image/svg+xml',
    // Documents
    'application/pdf', 'text/plain', 'text/markdown', 'application/json', 'text/csv',
    'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
]);

const ALLOWED_EXTS = new Set([
    '.mp4', '.mov', '.webm', '.mpeg', '.mpg', '.avi',
    '.mp3', '.wav', '.m4a', '.aac', '.ogg', '.flac',
    '.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg',
    '.pdf', '.txt', '.md', '.json', '.csv', '.doc', '.docx'
]);

function fileFilter(req, file, cb) {
    const ext = path.extname(file.originalname || '').toLowerCase();
    const mime = (file.mimetype || '').toLowerCase();

    if (ALLOWED_MIME_TYPES.has(mime) || ALLOWED_EXTS.has(ext)) {
        cb(null, true);
    } else {
        const err = new Error(`Unsupported file type: ${file.mimetype || ext}. Allowed formats: Videos (MP4, MOV, WebM, MPEG, AVI), Audio (MP3, WAV, M4A, AAC, OGG, FLAC), Images (PNG, JPG, WebP, SVG, GIF), and Documents (PDF, TXT, MD, DOC).`);
        err.statusCode = 400;
        err.code = 'UNSUPPORTED_FILE_TYPE';
        cb(err, false);
    }
}

// Memory storage for AI content scanning without writing to disk
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: MAX_FILE_SIZE_BYTES },
    fileFilter,
});

// Middleware to gracefully handle multer errors (e.g. oversize file, unsupported type)
function handleUpload(req, res, next) {
    upload.array('files')(req, res, (err) => {
        if (err) {
            if (err.code === 'LIMIT_FILE_SIZE') {
                return res.status(400).json({
                    success: false,
                    error: `File exceeds maximum allowed size of ${MAX_VIDEO_MB}MB.`
                });
            }
            if (err.code === 'UNSUPPORTED_FILE_TYPE' || err.statusCode === 400) {
                return res.status(400).json({
                    success: false,
                    error: err.message
                });
            }
            return res.status(400).json({
                success: false,
                error: err.message || 'File upload error'
            });
        }

        // Post-upload per-file size checks
        if (req.files && req.files.length > 0) {
            for (const file of req.files) {
                const ext = path.extname(file.originalname || '').toLowerCase();
                const mime = (file.mimetype || '').toLowerCase();
                const isAudio = mime.startsWith('audio/') || ['.mp3', '.wav', '.m4a', '.aac', '.ogg', '.flac'].includes(ext);
                const isVideo = mime.startsWith('video/') || ['.mp4', '.mov', '.webm', '.mpeg', '.avi'].includes(ext);

                if (isAudio && file.size > MAX_AUDIO_MB * 1024 * 1024) {
                    return res.status(400).json({
                        success: false,
                        error: `Audio file "${file.originalname}" exceeds maximum allowed size of ${MAX_AUDIO_MB}MB.`
                    });
                }
                if (isVideo && file.size > MAX_VIDEO_MB * 1024 * 1024) {
                    return res.status(400).json({
                        success: false,
                        error: `Video file "${file.originalname}" exceeds maximum allowed size of ${MAX_VIDEO_MB}MB.`
                    });
                }
            }
        }

        next();
    });
}

// POST /api/review - Gemini AI Multimodal Brand-Guideline Review
router.post('/', handleUpload, async (req, res) => {
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
