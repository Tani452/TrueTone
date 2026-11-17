/**
 * Actions Tab Controller
 * Handles cumulative report card retrieval, weekly AI analysis execution,
 * and role-gated manager reviews.
 */

const actionsService = require('../services/actions.service');
const db = require('../db');

/**
 * GET /api/actions
 * Retrieves all cumulative employee governance reports
 */
exports.getAllActions = async (req, res) => {
    try {
        const records = await actionsService.getAllActionReports();
        res.json({
            success: true,
            records,
            total: records.length,
            data: records, // For backwards compatibility
        });
    } catch (error) {
        console.error('[ACTIONS-CONTROLLER-ERROR] getAllActions:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

/**
 * GET /api/actions/:id
 * Retrieves a single report card alongside user's past audit logs (audit evidence)
 */
exports.getActionById = async (req, res) => {
    try {
        const actionId = parseInt(req.params.id, 10);
        if (!actionId) {
            return res.status(400).json({ success: false, error: 'Invalid action ID' });
        }

        const result = await actionsService.getActionReportById(actionId);
        if (!result) {
            return res.status(404).json({ success: false, error: `Action report #${actionId} not found` });
        }

        res.json({
            success: true,
            record: result.record,
            logs: result.logs,
            data: result.record, // For backwards compatibility
        });
    } catch (error) {
        console.error('[ACTIONS-CONTROLLER-ERROR] getActionById:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

/**
 * POST /api/actions/run-weekly-analysis
 * Live trigger to run weekly AI log synthesis across all creator logs
 */
exports.runWeeklyAnalysis = async (req, res) => {
    try {
        const days = parseInt(req.body.days, 10) || 7;
        const result = await actionsService.runWeeklyLogAnalysis(days);

        res.json({
            success: true,
            processed_users: result.processed_users,
            records: result.records,
            message: `Successfully analyzed logs and updated ${result.processed_users} employee governance profile(s).`,
        });
    } catch (error) {
        console.error('[ACTIONS-CONTROLLER-ERROR] runWeeklyAnalysis:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

/**
 * POST /api/actions/:id/comments
 * Adds an official manager review note (role-gated: can_approve = 'Y')
 */
exports.addComment = async (req, res) => {
    try {
        const actionId = parseInt(req.params.id, 10);
        const { user_id, text } = req.body;

        if (!user_id || !text) {
            return res.status(400).json({
                success: false,
                error: 'Fields "user_id" and "text" are required',
            });
        }

        const result = await actionsService.addManagerComment(actionId, user_id, text);
        res.json({
            success: true,
            message: 'Manager review note recorded',
            comment: result.comment,
            record: result.record,
        });
    } catch (error) {
        console.error('[ACTIONS-CONTROLLER-ERROR] addComment:', error);
        const statusCode = error.statusCode || (error.message.includes('Unauthorized') ? 403 : 400);
        res.status(statusCode).json({
            success: false,
            error: error.message,
        });
    }
};

/**
 * GET /api/actions/user/:userId
 * Retrieves detailed cumulative report for a specific user (legacy compatibility)
 */
exports.getUserActionReport = async (req, res) => {
    try {
        const { userId } = req.params;
        const result = await db.query('SELECT * FROM actions WHERE user_id = $1', [userId]);

        if (result.rowCount === 0) {
            return res.status(404).json({
                success: false,
                error: `No cumulative report found for user_id ${userId}`,
            });
        }

        res.json({
            success: true,
            data: result.rows[0],
            record: result.rows[0],
        });
    } catch (error) {
        console.error('[ACTIONS-CONTROLLER-ERROR] getUserActionReport:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

/**
 * POST /api/actions/record
 * Record a corrective action (legacy compatibility)
 */
exports.recordAction = async (req, res) => {
    try {
        const { userId, actionTitle, actionStatus = 'COMPLETED', updatedRiskLevel } = req.body;

        if (!userId || !actionTitle) {
            return res.status(400).json({
                success: false,
                error: 'Fields "userId" and "actionTitle" are required',
            });
        }

        const userRes = await db.query('SELECT user_name, designation FROM users WHERE user_id = $1', [userId]);
        if (userRes.rowCount === 0) {
            return res.status(404).json({ success: false, error: 'User does not exist' });
        }
        const user = userRes.rows[0];

        const newEntry = {
            date: new Date().toISOString().split('T')[0],
            action: actionTitle,
            status: actionStatus,
            timestamp: new Date().toISOString(),
        };

        const existing = await db.query('SELECT * FROM actions WHERE user_id = $1', [userId]);
        let savedRecord;

        if (existing.rowCount === 0) {
            const initialReport = {
                status: 'NEEDS_ATTENTION',
                summary_headline: actionTitle,
                detailed_analysis: actionTitle,
                recurring_issues: [],
                recommended_actions: [actionTitle],
                stats: { total_submissions: 1, flagged_submissions: 1, clean_submissions: 0 },
                historical_activity: [newEntry],
                manager_comments: [],
            };
            const insertRes = await db.query(
                `INSERT INTO actions (user_id, user_name, designation, cumulative_report, updated_at)
                 VALUES ($1, $2, $3, $4::jsonb, CURRENT_TIMESTAMP)
                 RETURNING *`,
                [userId, user.user_name, user.designation, JSON.stringify(initialReport)]
            );
            savedRecord = insertRes.rows[0];
        } else {
            const currentReport = existing.rows[0].cumulative_report || {};
            const history = Array.isArray(currentReport.historical_activity)
                ? [...currentReport.historical_activity, newEntry]
                : [newEntry];
            currentReport.historical_activity = history;

            const updateRes = await db.query(
                `UPDATE actions 
                 SET cumulative_report = $1::jsonb, 
                     user_name = $2,
                     designation = $3,
                     updated_at = CURRENT_TIMESTAMP 
                 WHERE user_id = $4 
                 RETURNING *`,
                [JSON.stringify(currentReport), user.user_name, user.designation, userId]
            );
            savedRecord = updateRes.rows[0];
        }

        res.json({
            success: true,
            message: 'Corrective action recorded successfully',
            data: savedRecord,
        });
    } catch (error) {
        console.error('[ACTIONS-CONTROLLER-ERROR] recordAction:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};
