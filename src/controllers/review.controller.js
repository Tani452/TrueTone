/**
 * Review Tab Controller
 * Handles pending post retrieval, community/manager voting, and approval workflows.
 */

const db = require('../db');

/**
 * GET /api/review/pending
 * Retrieves pending queue using high-performance partial index
 */
exports.getPendingPosts = async (req, res) => {
    try {
        const { status = 'N', limit = 50, offset = 0 } = req.query;

        // Uses partial index `idx_pending_unapproved_queue` when status = 'N'
        const queryText = `
            SELECT 
                p.id,
                p.post,
                p.timestamp,
                p.vote_approve,
                p.vote_not_approve,
                p.approved,
                p.overall_review,
                p.created_at,
                p.updated_at
            FROM pending p
            WHERE p.approved = $1
            ORDER BY p.timestamp ASC
            LIMIT $2 OFFSET $3
        `;

        const result = await db.query(queryText, [status, limit, offset]);

        const countRes = await db.query(
            'SELECT COUNT(*) as total FROM pending WHERE approved = $1',
            [status]
        );

        res.json({
            success: true,
            total: parseInt(countRes.rows[0].total, 10),
            data: result.rows,
        });
    } catch (error) {
        console.error('[REVIEW-CONTROLLER-ERROR] getPendingPosts:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

/**
 * POST /api/review/:id/vote
 * Register an upvote or downvote for a pending post
 */
exports.voteOnPost = async (req, res) => {
    try {
        const { id } = req.params;
        const { type } = req.body; // 'approve' or 'not_approve'

        if (!['approve', 'not_approve'].includes(type)) {
            return res.status(400).json({
                success: false,
                error: "Invalid vote type. Must be 'approve' or 'not_approve'",
            });
        }

        const columnToIncrement = type === 'approve' ? 'vote_approve' : 'vote_not_approve';
        const queryText = `
            UPDATE pending 
            SET ${columnToIncrement} = ${columnToIncrement} + 1
            WHERE id = $1
            RETURNING *
        `;

        const result = await db.query(queryText, [id]);

        if (result.rowCount === 0) {
            return res.status(404).json({ success: false, error: 'Pending post not found' });
        }

        res.json({
            success: true,
            message: `Vote registered successfully as ${type}`,
            data: result.rows[0],
        });
    } catch (error) {
        console.error('[REVIEW-CONTROLLER-ERROR] voteOnPost:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

/**
 * POST /api/review/:id/approve
 * Approves a pending post and atomically dispatches it to the published table
 */
exports.approveAndPublish = async (req, res) => {
    try {
        const { id } = req.params;
        const { approvedByUserId, reviewerNotes } = req.body;

        // Atomically update pending status and insert into published table
        const result = await db.withTransaction(async (client) => {
            // Check reviewer permissions
            if (approvedByUserId) {
                const userRes = await client.query(
                    'SELECT can_approve FROM users WHERE user_id = $1',
                    [approvedByUserId]
                );
                if (userRes.rowCount === 0 || userRes.rows[0].can_approve !== 'Y') {
                    throw new Error('User does not possess approval authority (can_approve != Y)');
                }
            }

            // Retrieve pending post
            const pendingRes = await client.query(
                'SELECT * FROM pending WHERE id = $1 FOR UPDATE',
                [id]
            );

            if (pendingRes.rowCount === 0) {
                throw new Error('Pending post not found');
            }

            const postRecord = pendingRes.rows[0];

            // Mark as approved in pending
            const updatedReview = {
                ...(postRecord.overall_review || {}),
                approval_audit: {
                    approved_by: approvedByUserId || 'SYSTEM_ADMIN',
                    approved_at: new Date().toISOString(),
                    final_notes: reviewerNotes || 'Approved via Review Hub',
                },
            };

            await client.query(
                `UPDATE pending 
                 SET approved = 'Y', 
                     overall_review = $1 
                 WHERE id = $2`,
                [JSON.stringify(updatedReview), id]
            );

            // Insert into published table
            const publishedRes = await client.query(
                `INSERT INTO published (post, timestamp)
                 VALUES ($1, CURRENT_TIMESTAMP)
                 RETURNING *`,
                [postRecord.post]
            );

            return {
                pendingId: id,
                publishedRecord: publishedRes.rows[0],
            };
        });

        res.json({
            success: true,
            message: 'Post successfully approved and transferred to published records!',
            data: result,
        });
    } catch (error) {
        console.error('[REVIEW-CONTROLLER-ERROR] approveAndPublish:', error);
        res.status(400).json({ success: false, error: error.message });
    }
};

/**
 * POST /api/review/submit
 * Submit a new draft into the pending review queue
 */
exports.submitPostForReview = async (req, res) => {
    try {
        const { post, overall_review } = req.body;

        if (!post || typeof post !== 'object') {
            return res.status(400).json({
                success: false,
                error: 'Field "post" is required and must be a valid JSON object',
            });
        }

        const queryText = `
            INSERT INTO pending (post, overall_review)
            VALUES ($1, $2)
            RETURNING *
        `;

        const result = await db.query(queryText, [
            JSON.stringify(post),
            overall_review ? JSON.stringify(overall_review) : null,
        ]);

        res.status(201).json({
            success: true,
            message: 'Post successfully submitted to pending queue',
            data: result.rows[0],
        });
    } catch (error) {
        console.error('[REVIEW-CONTROLLER-ERROR] submitPostForReview:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};
