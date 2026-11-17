/**
 * Publish Submission Route
 * Handles Step 4: Final upload, file persistence to ./uploads, audit logging,
 * and conditional PostgreSQL routing (pending queue vs direct published).
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('../db');

const UPLOADS_DIR = path.resolve(__dirname, '../../uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Disk storage for finalized post attachments
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, UPLOADS_DIR);
    },
    filename: (req, file, cb) => {
        const uniquePrefix = `${Date.now()}-${Math.round(Math.random() * 1E6)}`;
        // Sanitize original filename
        const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
        cb(null, `${uniquePrefix}-${safeName}`);
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 50 * 1024 * 1024 } // 50MB
});

/**
 * POST /api/publish-submission
 * Final post submission with transaction-safe PostgreSQL routing
 */
router.post('/', upload.array('files'), async (req, res) => {
    try {
        const userId = parseInt(req.body.user_id, 10) || 1;
        const finalText = req.body.final_text || '';
        let remainingProblems = null;

        if (req.body.remaining_problems && req.body.remaining_problems !== 'null') {
            try {
                remainingProblems = typeof req.body.remaining_problems === 'string'
                    ? JSON.parse(req.body.remaining_problems)
                    : req.body.remaining_problems;
            } catch (e) {
                console.warn('[SUBMISSION] Error parsing remaining_problems JSON:', e.message);
            }
        }

        const files = req.files || [];
        const savedFiles = files.map(f => ({
            original_name: f.originalname,
            stored_name: f.filename,
            url: `/uploads/${f.filename}`,
            mime_type: f.mimetype,
            size: f.size,
        }));

        // Determine if there are unresolved AI flags
        const hasTextIssues = remainingProblems && Array.isArray(remainingProblems.text) && remainingProblems.text.length > 0;
        const hasBadFiles = remainingProblems && Array.isArray(remainingProblems.bad_files) && remainingProblems.bad_files.length > 0;
        const hasRemainingIssues = Boolean(hasTextIssues || hasBadFiles);

        // Fetch user metadata for author attribution
        let authorName = 'Author';
        let authorDept = 'Marketing';
        let authorDesig = 'Content Creator';

        try {
            const userRes = await db.query(
                'SELECT user_name, department, designation FROM users WHERE user_id = $1',
                [userId]
            );
            if (userRes.rowCount > 0) {
                authorName = userRes.rows[0].user_name;
                authorDept = userRes.rows[0].department || 'Marketing';
                authorDesig = userRes.rows[0].designation || 'Staff';
            }
        } catch (uErr) {
            console.warn('[SUBMISSION] Notice on user fetch:', uErr.message);
        }

        // Construct standardized postPayload
        const postPayload = {
            submitted_by: userId,
            author_name: authorName,
            department: authorDept,
            designation: authorDesig,
            text: finalText,
            files: savedFiles,
        };

        // Execute PostgreSQL transaction
        const txResult = await db.withTransaction(async (client) => {
            // Step A: Always insert into logs table
            const logIssueValue = hasRemainingIssues ? remainingProblems : null;
            const logRes = await client.query(
                `INSERT INTO logs (post, published_by, issue)
                 VALUES ($1::jsonb, $2, $3::jsonb)
                 RETURNING id`,
                [
                    JSON.stringify(postPayload),
                    userId,
                    logIssueValue ? JSON.stringify(logIssueValue) : null,
                ]
            );
            const logId = logRes.rows[0].id;

            // Step B: Conditional routing based on issues
            if (hasRemainingIssues) {
                // Route to pending table
                const overallReview = {
                    status: "UNAPPROVED",
                    flagged_by_ai: true,
                    unresolved_issues: remainingProblems,
                    votes: [],
                    reviewer_comments: []
                };

                const pendingRes = await client.query(
                    `INSERT INTO pending (post, timestamp, vote_approve, vote_not_approve, overall_review)
                     VALUES ($1::jsonb, NOW(), 0, 0, $2::jsonb)
                     RETURNING id`,
                    [
                        JSON.stringify(postPayload),
                        JSON.stringify(overallReview),
                    ]
                );

                return {
                    route: "pending",
                    id: pendingRes.rows[0].id,
                    log_id: logId,
                    message: "Submission logged and sent to the Pending Approval queue due to unresolved brand guideline issues."
                };
            } else {
                // Route to published table
                const pubRes = await client.query(
                    `INSERT INTO published (post, timestamp)
                     VALUES ($1::jsonb, NOW())
                     RETURNING id`,
                    [JSON.stringify(postPayload)]
                );

                return {
                    route: "published",
                    id: pubRes.rows[0].id,
                    log_id: logId,
                    message: "Content verified against all brand guidelines and published!"
                };
            }
        });

        res.json({
            success: true,
            ...txResult,
            post: postPayload,
        });
    } catch (error) {
        console.error('[PUBLISH-SUBMISSION-ERROR]', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Error processing publish submission',
        });
    }
});

module.exports = router;
