/**
 * Actions Tab Controller
 * Tracks user-level error trends, cumulative reports, approval metrics, and remedial actions.
 */

const db = require('../db');

/**
 * GET /api/actions
 * Retrieves all user action reports and risk scorecards
 */
exports.getAllActions = async (req, res) => {
    try {
        const { riskLevel, limit = 50, offset = 0 } = req.query;

        let queryText = 'SELECT * FROM actions WHERE 1=1';
        const params = [];

        if (riskLevel) {
            params.push(riskLevel.toUpperCase());
            queryText += ` AND cumulative_report->'summary'->>'current_risk_level' = $${params.length}`;
        }

        params.push(parseInt(limit, 10));
        const limitParam = params.length;
        params.push(parseInt(offset, 10));
        const offsetParam = params.length;

        // Uses B-Tree index idx_actions_updated_at
        queryText += ` ORDER BY updated_at DESC LIMIT $${limitParam} OFFSET $${offsetParam}`;

        const result = await db.query(queryText, params);
        const countRes = await db.query('SELECT COUNT(*) as total FROM actions');

        res.json({
            success: true,
            total: parseInt(countRes.rows[0].total, 10),
            data: result.rows,
        });
    } catch (error) {
        console.error('[ACTIONS-CONTROLLER-ERROR] getAllActions:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

/**
 * GET /api/actions/user/:userId
 * Retrieves detailed cumulative report for a specific user
 */
exports.getUserActionReport = async (req, res) => {
    try {
        const { userId } = req.params;

        const result = await db.query(
            'SELECT * FROM actions WHERE user_id = $1',
            [userId]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({
                success: false,
                error: `No cumulative report found for user_id ${userId}`,
            });
        }

        res.json({
            success: true,
            data: result.rows[0],
        });
    } catch (error) {
        console.error('[ACTIONS-CONTROLLER-ERROR] getUserActionReport:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

/**
 * POST /api/actions/record
 * Record a corrective action or milestone in a user's cumulative report
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

        // Fetch user info
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

        // Upsert action report using Postgres ON CONFLICT
        const upsertQuery = `
            INSERT INTO actions (user_id, user_name, designation, cumulative_report, updated_at)
            VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
            ON CONFLICT (user_id) 
            DO UPDATE SET 
                cumulative_report = jsonb_set(
                    COALESCE(actions.cumulative_report, '{}'::jsonb),
                    '{historical_activity}',
                    COALESCE(actions.cumulative_report->'historical_activity', '[]'::jsonb) || $5::jsonb
                ),
                updated_at = CURRENT_TIMESTAMP
            RETURNING *
        `;

        // If user record already exists or doesn't, handle gracefully
        const existing = await db.query('SELECT * FROM actions WHERE user_id = $1', [userId]);

        let savedRecord;
        if (existing.rowCount === 0) {
            const initialReport = {
                summary: {
                    total_submitted: 0,
                    approved_count: 0,
                    first_time_pass_rate: 1.0,
                    current_risk_level: updatedRiskLevel || 'LOW',
                },
                error_trends: {},
                historical_activity: [newEntry],
            };
            const insertRes = await db.query(
                `INSERT INTO actions (user_id, user_name, designation, cumulative_report, updated_at)
                 VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
                 RETURNING *`,
                [userId, user.user_name, user.designation, JSON.stringify(initialReport)]
            );
            savedRecord = insertRes.rows[0];
        } else {
            const currentReport = existing.rows[0].cumulative_report || {};
            const history = Array.isArray(currentReport.historical_activity)
                ? [...currentReport.historical_activity, newEntry]
                : [newEntry];

            if (updatedRiskLevel) {
                if (!currentReport.summary) currentReport.summary = {};
                currentReport.summary.current_risk_level = updatedRiskLevel;
            }
            currentReport.historical_activity = history;

            const updateRes = await db.query(
                `UPDATE actions 
                 SET cumulative_report = $1, 
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
