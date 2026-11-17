/**
 * TrueTone Actions & Governance Performance Service
 * Implements weekly log analysis synthesis (logs -> actions),
 * Pass A (flagged via Gemini AI) and Pass B (Good Performance),
 * and role-gated manager reviews.
 */

const crypto = require('crypto');
const db = require('../db');
const { generateCumulativeReportWithGemini } = require('./gemini.service');

/**
 * Helper to determine if a log entry represents a flagged violation
 */
function isLogFlagged(log) {
    if (!log || !log.issue) return false;
    const issue = log.issue;
    if (typeof issue === 'object') {
        if (Array.isArray(issue.text) && issue.text.length > 0) return true;
        if (Array.isArray(issue.bad_files) && issue.bad_files.length > 0) return true;
        if (issue.error_type || issue.category || issue.violation_details) return true;
        return Object.keys(issue).length > 0;
    }
    return Boolean(issue);
}

/**
 * Runs the weekly log analysis engine
 * Aggregates logs from the past daysLookback days and updates/upserts actions table
 */
async function runWeeklyLogAnalysis(daysLookback = 7) {
    try {
        // 1. Fetch logs within lookback window joined with user information
        let logQuery = `
            SELECT 
                l.id as log_id,
                l.post,
                l.published_by,
                l.issue,
                COALESCE(l.timestamp, l.created_at) as log_time,
                u.user_id,
                u.user_name,
                u.designation,
                u.department
            FROM logs l
            JOIN users u ON l.published_by = u.user_id
            WHERE COALESCE(l.timestamp, l.created_at) >= NOW() - ($1 || ' days')::INTERVAL
            ORDER BY l.published_by, l.id DESC
        `;
        let res = await db.query(logQuery, [daysLookback]);

        // Fallback: If no logs exist strictly within lookback window, fetch all available logs
        // to ensure hackathon demo and freshly initialized environments synthesize immediately
        if (res.rowCount === 0) {
            const fallbackQuery = `
                SELECT 
                    l.id as log_id,
                    l.post,
                    l.published_by,
                    l.issue,
                    COALESCE(l.timestamp, l.created_at) as log_time,
                    u.user_id,
                    u.user_name,
                    u.designation,
                    u.department
                FROM logs l
                JOIN users u ON l.published_by = u.user_id
                ORDER BY l.published_by, l.id DESC
            `;
            res = await db.query(fallbackQuery);
        }

        const logs = res.rows || [];
        if (logs.length === 0) {
            console.log('[ACTIONS-WEEKLY-ENGINE] No log entries found to analyze.');
            return { processed_users: 0, records: [] };
        }

        // 2. Group logs by user_id
        const userLogsMap = new Map();
        for (const log of logs) {
            const uid = log.user_id;
            if (!userLogsMap.has(uid)) {
                userLogsMap.set(uid, {
                    user: {
                        user_id: log.user_id,
                        user_name: log.user_name,
                        designation: log.designation,
                        department: log.department,
                    },
                    logs: [],
                });
            }
            userLogsMap.get(uid).logs.push(log);
        }

        const updatedRows = [];

        // 3. Process each user through Pass A or Pass B
        for (const [userId, group] of userLogsMap.entries()) {
            const user = group.user;
            const userLogs = group.logs;

            const flaggedLogs = userLogs.filter(isLogFlagged);
            const totalSubmissions = userLogs.length;
            const flaggedSubmissions = flaggedLogs.length;
            const cleanSubmissions = totalSubmissions - flaggedSubmissions;

            // Fetch existing actions record to preserve manager_comments
            const existingRes = await db.query(
                'SELECT cumulative_report FROM actions WHERE user_id = $1',
                [userId]
            );
            const existingReport = existingRes.rowCount > 0 ? (existingRes.rows[0].cumulative_report || {}) : {};
            const existingComments = Array.isArray(existingReport.manager_comments) ? existingReport.manager_comments : [];

            let finalReport;

            if (flaggedSubmissions > 0) {
                // PASS A: User WITH Flagged Issues -> Synthesize using Gemini AI
                const logBundle = {
                    stats: {
                        total_submissions: totalSubmissions,
                        flagged_submissions: flaggedSubmissions,
                        clean_submissions: cleanSubmissions,
                    },
                    flagged_logs: flaggedLogs.map(l => ({
                        log_id: l.log_id,
                        post: l.post,
                        issue: l.issue,
                        timestamp: l.log_time,
                    })),
                    history: existingReport,
                };

                const aiReport = await generateCumulativeReportWithGemini(user, logBundle);

                finalReport = {
                    status: aiReport.status || 'NEEDS_ATTENTION',
                    summary_headline: aiReport.summary_headline || 'Brand guideline deviations detected.',
                    detailed_analysis: aiReport.detailed_analysis || 'Employee submissions exhibited multiple unapproved tone or factual discrepancies.',
                    recurring_issues: Array.isArray(aiReport.recurring_issues) ? aiReport.recurring_issues : [],
                    recommended_actions: Array.isArray(aiReport.recommended_actions) ? aiReport.recommended_actions : [],
                    stats: {
                        total_submissions: totalSubmissions,
                        flagged_submissions: flaggedSubmissions,
                        clean_submissions: cleanSubmissions,
                    },
                    manager_comments: existingComments,
                };
            } else {
                // PASS B: User ONLY With Clean Submissions -> Standard Good Performance
                finalReport = {
                    status: 'GOOD_PERFORMANCE',
                    summary_headline: 'Good Performance',
                    detailed_analysis: 'Good Performance — All submitted content over the past week adhered strictly to TrueTone brand guidelines with zero unresolved tone, factual, or visual violations.',
                    recurring_issues: [],
                    recommended_actions: ['Maintain current adherence to brand guidelines.'],
                    stats: {
                        total_submissions: totalSubmissions,
                        flagged_submissions: 0,
                        clean_submissions: totalSubmissions,
                    },
                    manager_comments: existingComments,
                };
            }

            // Upsert into actions table
            const upsertRes = await db.query(
                `INSERT INTO actions (user_id, user_name, designation, cumulative_report, updated_at)
                 VALUES ($1, $2, $3, $4::jsonb, NOW())
                 ON CONFLICT (user_id)
                 DO UPDATE SET
                     user_name = EXCLUDED.user_name,
                     designation = EXCLUDED.designation,
                     cumulative_report = EXCLUDED.cumulative_report,
                     updated_at = NOW()
                 RETURNING id, user_id, user_name, designation, cumulative_report, updated_at`,
                [userId, user.user_name, user.designation, JSON.stringify(finalReport)]
            );

            updatedRows.push(upsertRes.rows[0]);
        }

        console.log(`[ACTIONS-WEEKLY-ENGINE] Synthesized cumulative reports for ${updatedRows.length} active creator(s).`);
        return {
            processed_users: updatedRows.length,
            records: updatedRows,
        };
    } catch (err) {
        console.error('[ACTIONS-WEEKLY-ENGINE-ERROR]', err);
        throw err;
    }
}

/**
 * Retrieve all action reports, ordering flagged/needs attention first, followed by good performance
 */
async function getAllActionReports() {
    const queryText = `
        SELECT 
            a.id, 
            a.user_id, 
            a.user_name, 
            a.designation, 
            u.department, 
            a.cumulative_report, 
            a.updated_at
        FROM actions a
        LEFT JOIN users u ON a.user_id = u.user_id
        ORDER BY CASE WHEN a.cumulative_report->>'status' = 'GOOD_PERFORMANCE' THEN 1 ELSE 0 END, a.id DESC;
    `;
    const res = await db.query(queryText);
    return res.rows;
}

/**
 * Retrieve a single action report by ID alongside the user's past logs (audit evidence)
 */
async function getActionReportById(actionId) {
    const actionRes = await db.query(
        `SELECT 
            a.id, 
            a.user_id, 
            a.user_name, 
            a.designation, 
            u.department, 
            a.cumulative_report, 
            a.updated_at
         FROM actions a
         LEFT JOIN users u ON a.user_id = u.user_id
         WHERE a.id = $1`,
        [actionId]
    );

    if (actionRes.rowCount === 0) return null;

    const actionRecord = actionRes.rows[0];

    // Fetch user's recent audit logs
    const logsRes = await db.query(
        `SELECT id, post, issue, COALESCE(timestamp, created_at) as timestamp
         FROM logs
         WHERE published_by = $1
         ORDER BY id DESC
         LIMIT 20`,
        [actionRecord.user_id]
    );

    return {
        record: actionRecord,
        logs: logsRes.rows || [],
    };
}

/**
 * Append a manager review comment with strict permission checking (can_approve = 'Y')
 */
async function addManagerComment(actionId, userId, text) {
    if (!text || !text.trim()) {
        throw new Error('Comment text cannot be empty.');
    }

    // 1. Permission Gate: Check that user exists and has can_approve === 'Y'
    const userRes = await db.query(
        'SELECT user_id, user_name, designation, can_approve FROM users WHERE user_id = $1',
        [userId]
    );

    if (userRes.rowCount === 0) {
        throw new Error(`User #${userId} not found`);
    }

    const reviewer = userRes.rows[0];
    if (reviewer.can_approve !== 'Y') {
        const authErr = new Error('Unauthorized: Only approvers can comment on action reports');
        authErr.statusCode = 403;
        throw authErr;
    }

    // 2. Perform atomic update in a transaction
    return await db.withTransaction(async (client) => {
        const selRes = await client.query(
            'SELECT id, cumulative_report FROM actions WHERE id = $1 FOR UPDATE',
            [actionId]
        );

        if (selRes.rowCount === 0) {
            throw new Error(`Action record #${actionId} not found`);
        }

        const report = selRes.rows[0].cumulative_report || {};
        const comments = Array.isArray(report.manager_comments) ? report.manager_comments : [];

        const newComment = {
            comment_id: crypto.randomUUID(),
            user_id: reviewer.user_id,
            user_name: reviewer.user_name,
            designation: reviewer.designation || 'Brand Approver',
            text: text.trim(),
            timestamp: new Date().toISOString(),
        };

        comments.push(newComment);
        report.manager_comments = comments;

        const updateRes = await client.query(
            `UPDATE actions
             SET cumulative_report = $1::jsonb, updated_at = NOW()
             WHERE id = $2
             RETURNING id, user_id, user_name, designation, cumulative_report, updated_at`,
            [JSON.stringify(report), actionId]
        );

        return {
            success: true,
            comment: newComment,
            record: updateRes.rows[0],
        };
    });
}

module.exports = {
    isLogFlagged,
    runWeeklyLogAnalysis,
    getAllActionReports,
    getActionReportById,
    addManagerComment,
};
