/**
 * TrueTone Pending Queue & Governance Voting Engine
 * Implements atomic voting, threaded comments, and 5-day expiration auto-publishing.
 */

const crypto = require('crypto');
const db = require('../db');

/**
 * Counts total comments including nested replies
 */
function countTotalComments(commentsArray) {
    if (!Array.isArray(commentsArray)) return 0;
    let count = 0;
    for (const c of commentsArray) {
        count += 1;
        if (Array.isArray(c.replies)) {
            count += countTotalComments(c.replies);
        }
    }
    return count;
}

/**
 * Checks for expired pending submissions (older than 5 days) and finalizes them:
 * - If vote_approve > vote_not_approve: Marks APPROVED and atomically copies to published table.
 * - If vote_approve <= vote_not_approve: Marks REJECTED.
 * - Updates author's metrics in actions table.
 * Uses FOR UPDATE SKIP LOCKED to prevent race conditions across server nodes.
 */
async function checkAndFinalizeExpiredVotes() {
    try {
        await db.withTransaction(async (client) => {
            // Auto-synchronize legacy seeded pending statuses if unpopulated
            try {
                await client.query(`
                    UPDATE pending
                    SET overall_review = jsonb_set(
                        jsonb_set(
                            COALESCE(overall_review, '{}'::jsonb),
                            '{status}',
                            '"REJECTED"'
                        ),
                        '{final_decision}',
                        '"COMMUNITY_CONSENSUS_REJECTED"'
                    )
                    WHERE (
                        overall_review->>'compliance_status' ILIKE '%REJECT%'
                        OR overall_review->>'compliance_status' = 'REJECTED_BRAND_DEVIATION'
                    )
                    AND COALESCE(overall_review->>'status', '') != 'REJECTED'
                `);

                await client.query(`
                    UPDATE pending
                    SET approved = 'Y',
                        overall_review = jsonb_set(
                            jsonb_set(
                                COALESCE(overall_review, '{}'::jsonb),
                                '{status}',
                                '"APPROVED"'
                            ),
                            '{final_decision}',
                            '"COMMUNITY_CONSENSUS_APPROVED"'
                        )
                    WHERE (
                        overall_review->>'compliance_status' = 'READY_FOR_FINAL_SIGN_OFF'
                        OR (approved = 'Y' AND COALESCE(overall_review->>'status', '') != 'APPROVED')
                    )
                    AND COALESCE(overall_review->>'status', '') != 'APPROVED'
                `);
            } catch (syncErr) {
                // Non-critical if table is locked or in-memory
            }

            const queryText = `
                SELECT id, post, timestamp, vote_approve, vote_not_approve, overall_review
                FROM pending
                WHERE timestamp <= NOW() - INTERVAL '5 days'
                  AND COALESCE(overall_review->>'status', 'UNAPPROVED') = 'UNAPPROVED'
                FOR UPDATE SKIP LOCKED
            `;

            const res = await client.query(queryText);
            const expiredRows = res.rows || [];

            for (const row of expiredRows) {
                const currentReview = row.overall_review || {};
                const authorId = (row.post && (row.post.submitted_by || row.post.author_id)) || null;

                if (row.vote_approve > row.vote_not_approve) {
                    // Case A: Approved by peer consensus
                    const updatedReview = {
                        ...currentReview,
                        status: 'APPROVED',
                        finalized_at: new Date().toISOString(),
                        final_decision: 'COMMUNITY_CONSENSUS_APPROVED'
                    };

                    await client.query(
                        `UPDATE pending
                         SET overall_review = $1::jsonb, approved = 'Y'
                         WHERE id = $2`,
                        [JSON.stringify(updatedReview), row.id]
                    );

                    // Insert into published table
                    await client.query(
                        `INSERT INTO published (post, timestamp)
                         VALUES ($1::jsonb, NOW())`,
                        [JSON.stringify(row.post)]
                    );

                    console.log(`[TrueTone Publisher] Post #${row.id} published to organization channels (${row.vote_approve} Yes vs ${row.vote_not_approve} No).`);

                    // Update author's cumulative report in actions table if author exists
                    if (authorId) {
                        await updateAuthorReport(client, authorId, 'APPROVED');
                    }
                } else {
                    // Case B: Not Approved / Rejected
                    const updatedReview = {
                        ...currentReview,
                        status: 'REJECTED',
                        finalized_at: new Date().toISOString(),
                        final_decision: 'COMMUNITY_CONSENSUS_REJECTED'
                    };

                    await client.query(
                        `UPDATE pending
                         SET overall_review = $1::jsonb, approved = 'N'
                         WHERE id = $2`,
                        [JSON.stringify(updatedReview), row.id]
                    );

                    console.log(`[TrueTone Governance] Post #${row.id} rejected by peer voting (${row.vote_approve} Yes vs ${row.vote_not_approve} No).`);

                    if (authorId) {
                        await updateAuthorReport(client, authorId, 'REJECTED', currentReview.unresolved_issues);
                    }
                }
            }
        });
    } catch (err) {
        console.error('[PENDING-EXPIRE-ENGINE-ERROR]', err.message);
    }
}

/**
 * Updates author cumulative activity statistics in actions table
 */
async function updateAuthorReport(client, authorId, decision, unresolvedIssues = null) {
    try {
        const actionRes = await client.query('SELECT * FROM actions WHERE user_id = $1', [authorId]);
        if (actionRes.rowCount > 0) {
            const currentReport = actionRes.rows[0].cumulative_report || {};
            const summary = currentReport.summary || {};

            if (decision === 'APPROVED') {
                summary.approved_after_review = (summary.approved_after_review || 0) + 1;
            } else {
                summary.rejected_in_review = (summary.rejected_in_review || 0) + 1;
            }

            const history = Array.isArray(currentReport.historical_activity) ? currentReport.historical_activity : [];
            history.push({
                date: new Date().toISOString().split('T')[0],
                action: decision === 'APPROVED'
                    ? 'Post approved by 5-day community consensus and published'
                    : 'Post rejected by 5-day community review due to unresolved brand deviations',
                status: decision,
                timestamp: new Date().toISOString()
            });

            currentReport.summary = summary;
            currentReport.historical_activity = history;

            await client.query(
                `UPDATE actions
                 SET cumulative_report = $1::jsonb, updated_at = NOW()
                 WHERE user_id = $2`,
                [JSON.stringify(currentReport), authorId]
            );
        }
    } catch (e) {
        console.warn('[ACTIONS-UPDATE-NOTICE] Non-critical error updating actions table:', e.message);
    }
}

/**
 * Recursive finder for comments and nested replies
 */
function findCommentRecursive(commentsArray, targetCommentId) {
    if (!Array.isArray(commentsArray)) return null;
    for (const c of commentsArray) {
        if (String(c.comment_id) === String(targetCommentId)) {
            return c;
        }
        if (Array.isArray(c.replies) && c.replies.length > 0) {
            const found = findCommentRecursive(c.replies, targetCommentId);
            if (found) return found;
        }
    }
    return null;
}

/**
 * Resolves uniform status across pending post records:
 * 'APPROVED' | 'REJECTED' | 'UNAPPROVED'
 */
function resolvePostStatus(row) {
    if (!row) return 'UNAPPROVED';
    const rev = row.overall_review || {};
    if (
        row.approved === 'Y' ||
        (rev.status && String(rev.status).toUpperCase() === 'APPROVED') ||
        (rev.compliance_status && String(rev.compliance_status).toUpperCase().includes('READY')) ||
        (rev.final_decision && String(rev.final_decision).toUpperCase().includes('APPROVED'))
    ) {
        return 'APPROVED';
    }
    if (
        (rev.status && String(rev.status).toUpperCase() === 'REJECTED') ||
        (rev.compliance_status && String(rev.compliance_status).toUpperCase().includes('REJECT')) ||
        (rev.final_decision && String(rev.final_decision).toUpperCase().includes('REJECT'))
    ) {
        return 'REJECTED';
    }
    return 'UNAPPROVED';
}

/**
 * Get pending posts list with optional filter
 */
async function getPendingList(filter = 'all') {
    // First, run expiration finalizer
    await checkAndFinalizeExpiredVotes();

    let whereClause = '';
    const params = [];

    if (filter === 'open') {
        whereClause = `
            WHERE (approved = 'N' OR approved IS NULL)
              AND COALESCE(overall_review->>'status', 'UNAPPROVED') NOT IN ('APPROVED', 'REJECTED')
              AND COALESCE(overall_review->>'compliance_status', '') NOT ILIKE '%REJECT%'
              AND COALESCE(overall_review->>'compliance_status', '') NOT ILIKE '%READY%'
              AND COALESCE(overall_review->>'final_decision', '') NOT ILIKE '%APPROVED%'
              AND COALESCE(overall_review->>'final_decision', '') NOT ILIKE '%REJECT%'
              AND timestamp > NOW() - INTERVAL '5 days'
        `;
    } else if (filter === 'approved') {
        whereClause = `
            WHERE (approved = 'Y'
               OR COALESCE(overall_review->>'status', '') = 'APPROVED'
               OR COALESCE(overall_review->>'compliance_status', '') ILIKE '%READY%'
               OR COALESCE(overall_review->>'final_decision', '') ILIKE '%APPROVED%')
        `;
    } else if (filter === 'rejected') {
        whereClause = `
            WHERE (COALESCE(overall_review->>'status', '') = 'REJECTED'
               OR COALESCE(overall_review->>'compliance_status', '') ILIKE '%REJECT%'
               OR COALESCE(overall_review->>'final_decision', '') ILIKE '%REJECT%')
        `;
    }

    const queryText = `
        SELECT id, post, timestamp, vote_approve, vote_not_approve, approved, overall_review
        FROM pending
        ${whereClause}
        ORDER BY timestamp DESC
    `;

    const res = await db.query(queryText, params);
    const now = Date.now();

    return res.rows.map(row => {
        const postTimestamp = new Date(row.timestamp).getTime();
        const expiresAt = new Date(postTimestamp + 5 * 24 * 60 * 60 * 1000);
        const timeRemainingMs = Math.max(0, expiresAt.getTime() - now);
        const status = resolvePostStatus(row);
        const isVotingOpen = status === 'UNAPPROVED' && timeRemainingMs > 0;
        const comments = (row.overall_review && row.overall_review.reviewer_comments) || [];

        return {
            ...row,
            status,
            expires_at: expiresAt.toISOString(),
            is_voting_open: isVotingOpen,
            time_remaining_ms: timeRemainingMs,
            total_comments: countTotalComments(comments),
        };
    });
}

/**
 * Get single pending post by ID
 */
async function getPendingById(id) {
    await checkAndFinalizeExpiredVotes();

    const res = await db.query(
        `SELECT id, post, timestamp, vote_approve, vote_not_approve, approved, overall_review
         FROM pending
         WHERE id = $1`,
        [id]
    );

    if (res.rowCount === 0) return null;

    const row = res.rows[0];
    const postTimestamp = new Date(row.timestamp).getTime();
    const expiresAt = new Date(postTimestamp + 5 * 24 * 60 * 60 * 1000);
    const now = Date.now();
    const timeRemainingMs = Math.max(0, expiresAt.getTime() - now);
    const status = resolvePostStatus(row);
    const isVotingOpen = status === 'UNAPPROVED' && timeRemainingMs > 0;
    const comments = (row.overall_review && row.overall_review.reviewer_comments) || [];

    return {
        ...row,
        status,
        expires_at: expiresAt.toISOString(),
        is_voting_open: isVotingOpen,
        time_remaining_ms: timeRemainingMs,
        total_comments: countTotalComments(comments),
    };
}

/**
 * Cast a vote on a pending post
 */
async function castVote(postId, userId, voteType) {
    // 1. Validate user permissions
    const userRes = await db.query(
        'SELECT user_id, user_name, can_approve FROM users WHERE user_id = $1',
        [userId]
    );

    if (userRes.rowCount === 0) {
        throw new Error(`User #${userId} not found`);
    }

    if (userRes.rows[0].can_approve !== 'Y') {
        throw new Error('Unauthorized: Your role does not possess approval authority (can_approve = N).');
    }

    if (voteType !== 'yes' && voteType !== 'no') {
        throw new Error('Invalid vote option. Must be "yes" or "no".');
    }

    // 2. Perform atomic voting inside a transaction
    return await db.withTransaction(async (client) => {
        const selRes = await client.query(
            `SELECT id, timestamp, vote_approve, vote_not_approve, approved, overall_review
             FROM pending
             WHERE id = $1
             FOR UPDATE`,
            [postId]
        );

        if (selRes.rowCount === 0) {
            throw new Error(`Pending submission #${postId} not found`);
        }

        const row = selRes.rows[0];
        const currentReview = row.overall_review || {};
        const status = resolvePostStatus(row);
        const postTimestamp = new Date(row.timestamp).getTime();
        const expiresAt = postTimestamp + 5 * 24 * 60 * 60 * 1000;

        if (status !== 'UNAPPROVED' || Date.now() >= expiresAt) {
            throw new Error('Voting is closed for this submission.');
        }

        const voters = currentReview.voters || {};
        const currentVote = voters[userId];

        // Toggle vote: if clicking same vote again, remove it; otherwise set to voteType
        if (currentVote === voteType) {
            delete voters[userId];
        } else {
            voters[userId] = voteType;
        }

        // Recalculate tallies
        let yesCount = 0;
        let noCount = 0;
        for (const v of Object.values(voters)) {
            if (v === 'yes') yesCount++;
            if (v === 'no') noCount++;
        }

        currentReview.voters = voters;

        await client.query(
            `UPDATE pending
             SET vote_approve = $1, vote_not_approve = $2, overall_review = $3::jsonb
             WHERE id = $4`,
            [yesCount, noCount, JSON.stringify(currentReview), postId]
        );

        return {
            success: true,
            post_id: postId,
            vote_approve: yesCount,
            vote_not_approve: noCount,
            user_vote: voters[userId] || null,
            voters,
        };
    });
}

/**
 * Add a top-level comment
 */
async function addComment(postId, { userId, userName, designation, text }) {
    if (!text || !text.trim()) {
        throw new Error('Comment text cannot be empty.');
    }

    return await db.withTransaction(async (client) => {
        const selRes = await client.query(
            'SELECT overall_review FROM pending WHERE id = $1 FOR UPDATE',
            [postId]
        );

        if (selRes.rowCount === 0) {
            throw new Error(`Pending submission #${postId} not found`);
        }

        const currentReview = selRes.rows[0].overall_review || {};
        const comments = Array.isArray(currentReview.reviewer_comments) ? currentReview.reviewer_comments : [];

        const newComment = {
            comment_id: crypto.randomUUID(),
            user_id: parseInt(userId, 10) || 1,
            user_name: userName || 'Reviewer',
            designation: designation || 'Staff',
            text: text.trim(),
            timestamp: new Date().toISOString(),
            likes: 0,
            dislikes: 0,
            liked_by: [],
            disliked_by: [],
            replies: [],
        };

        comments.push(newComment);
        currentReview.reviewer_comments = comments;

        await client.query(
            'UPDATE pending SET overall_review = $1::jsonb WHERE id = $2',
            [JSON.stringify(currentReview), postId]
        );

        return {
            success: true,
            comment: newComment,
            comments,
        };
    });
}

/**
 * Add a reply to an existing comment
 */
async function addReply(postId, commentId, { userId, userName, designation, text }) {
    if (!text || !text.trim()) {
        throw new Error('Reply text cannot be empty.');
    }

    return await db.withTransaction(async (client) => {
        const selRes = await client.query(
            'SELECT overall_review FROM pending WHERE id = $1 FOR UPDATE',
            [postId]
        );

        if (selRes.rowCount === 0) {
            throw new Error(`Pending submission #${postId} not found`);
        }

        const currentReview = selRes.rows[0].overall_review || {};
        const comments = Array.isArray(currentReview.reviewer_comments) ? currentReview.reviewer_comments : [];

        const targetComment = findCommentRecursive(comments, commentId);
        if (!targetComment) {
            throw new Error(`Comment #${commentId} not found`);
        }

        if (!Array.isArray(targetComment.replies)) {
            targetComment.replies = [];
        }

        const newReply = {
            comment_id: crypto.randomUUID(),
            user_id: parseInt(userId, 10) || 1,
            user_name: userName || 'Reviewer',
            designation: designation || 'Staff',
            text: text.trim(),
            timestamp: new Date().toISOString(),
            likes: 0,
            dislikes: 0,
            liked_by: [],
            disliked_by: [],
            replies: [],
        };

        targetComment.replies.push(newReply);
        currentReview.reviewer_comments = comments;

        await client.query(
            'UPDATE pending SET overall_review = $1::jsonb WHERE id = $2',
            [JSON.stringify(currentReview), postId]
        );

        return {
            success: true,
            reply: newReply,
            comments,
        };
    });
}

/**
 * React to a comment (like or dislike)
 */
async function reactToComment(postId, commentId, userId, reaction) {
    if (reaction !== 'like' && reaction !== 'dislike') {
        throw new Error('Reaction must be "like" or "dislike".');
    }

    const uid = parseInt(userId, 10) || 1;

    return await db.withTransaction(async (client) => {
        const selRes = await client.query(
            'SELECT overall_review FROM pending WHERE id = $1 FOR UPDATE',
            [postId]
        );

        if (selRes.rowCount === 0) {
            throw new Error(`Pending submission #${postId} not found`);
        }

        const currentReview = selRes.rows[0].overall_review || {};
        const comments = Array.isArray(currentReview.reviewer_comments) ? currentReview.reviewer_comments : [];

        const targetComment = findCommentRecursive(comments, commentId);
        if (!targetComment) {
            throw new Error(`Comment #${commentId} not found`);
        }

        targetComment.liked_by = Array.isArray(targetComment.liked_by) ? targetComment.liked_by : [];
        targetComment.disliked_by = Array.isArray(targetComment.disliked_by) ? targetComment.disliked_by : [];

        const alreadyLiked = targetComment.liked_by.includes(uid);
        const alreadyDisliked = targetComment.disliked_by.includes(uid);

        if (reaction === 'like') {
            if (alreadyLiked) {
                targetComment.liked_by = targetComment.liked_by.filter(id => id !== uid);
            } else {
                targetComment.liked_by.push(uid);
                targetComment.disliked_by = targetComment.disliked_by.filter(id => id !== uid);
            }
        } else {
            if (alreadyDisliked) {
                targetComment.disliked_by = targetComment.disliked_by.filter(id => id !== uid);
            } else {
                targetComment.disliked_by.push(uid);
                targetComment.liked_by = targetComment.liked_by.filter(id => id !== uid);
            }
        }

        targetComment.likes = targetComment.liked_by.length;
        targetComment.dislikes = targetComment.disliked_by.length;

        currentReview.reviewer_comments = comments;

        await client.query(
            'UPDATE pending SET overall_review = $1::jsonb WHERE id = $2',
            [JSON.stringify(currentReview), postId]
        );

        return {
            success: true,
            comment: targetComment,
            comments,
        };
    });
}

/**
 * Force finalize post for Hackathon 5-day elapsed demo
 */
async function forceFinalizePost(postId) {
    return await db.withTransaction(async (client) => {
        const selRes = await client.query(
            `SELECT id, post, timestamp, vote_approve, vote_not_approve, approved, overall_review
             FROM pending
             WHERE id = $1
             FOR UPDATE`,
            [postId]
        );

        if (selRes.rowCount === 0) {
            throw new Error(`Pending submission #${postId} not found`);
        }

        const row = selRes.rows[0];
        const currentReview = row.overall_review || {};
        const authorId = (row.post && (row.post.submitted_by || row.post.author_id)) || null;

        const isApproved = row.vote_approve > row.vote_not_approve;
        const decision = isApproved ? 'COMMUNITY_CONSENSUS_APPROVED' : 'COMMUNITY_CONSENSUS_REJECTED';
        const finalStatus = isApproved ? 'APPROVED' : 'REJECTED';

        const updatedReview = {
            ...currentReview,
            status: finalStatus,
            finalized_at: new Date().toISOString(),
            final_decision: decision,
            demo_simulated: true,
        };

        // Update pending row with expired timestamp (5 days + 1 hour ago) and decision
        await client.query(
            `UPDATE pending
             SET timestamp = NOW() - INTERVAL '5 days 1 hour',
                 approved = $1,
                 overall_review = $2::jsonb
             WHERE id = $3`,
            [isApproved ? 'Y' : 'N', JSON.stringify(updatedReview), postId]
        );

        let publishedId = null;
        if (isApproved) {
            const pubRes = await client.query(
                `INSERT INTO published (post, timestamp)
                 VALUES ($1::jsonb, NOW())
                 RETURNING id`,
                [JSON.stringify(row.post)]
            );
            publishedId = pubRes.rows[0].id;
            console.log(`[TrueTone Publisher Demo] Post #${postId} published to organization channels (${row.vote_approve} Yes vs ${row.vote_not_approve} No).`);
            if (authorId) {
                await updateAuthorReport(client, authorId, 'APPROVED');
            }
        } else {
            console.log(`[TrueTone Governance Demo] Post #${postId} rejected by peer voting (${row.vote_approve} Yes vs ${row.vote_not_approve} No).`);
            if (authorId) {
                await updateAuthorReport(client, authorId, 'REJECTED', currentReview.unresolved_issues);
            }
        }

        return {
            success: true,
            post_id: postId,
            status: finalStatus,
            decision,
            published_id: publishedId,
            vote_approve: row.vote_approve,
            vote_not_approve: row.vote_not_approve,
            message: isApproved
                ? `Simulated 5 days elapsed: Post approved with ${row.vote_approve} Yes vs ${row.vote_not_approve} No, and published!`
                : `Simulated 5 days elapsed: Post rejected with ${row.vote_approve} Yes vs ${row.vote_not_approve} No, and blocked from publishing.`,
        };
    });
}

module.exports = {
    countTotalComments,
    checkAndFinalizeExpiredVotes,
    findCommentRecursive,
    getPendingList,
    getPendingById,
    castVote,
    addComment,
    addReply,
    reactToComment,
    forceFinalizePost,
};
