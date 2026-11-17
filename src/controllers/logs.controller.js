/**
 * Logs Tab Controller (AI Brand Guideline Audit Logs)
 * Handles structured AI-detected brand guideline violations, error types, and reasons.
 */

const db = require('../db');

/**
 * GET /api/logs
 * Retrieves compliance audit logs with author metadata join
 */
exports.getLogs = async (req, res) => {
    try {
        const { userId, severity, limit = 50, offset = 0 } = req.query;

        let queryText = `
            SELECT 
                l.id,
                l.post,
                l.published_by,
                u.user_name AS author_name,
                u.department AS author_department,
                u.designation AS author_designation,
                l.issue,
                l.created_at
            FROM logs l
            JOIN users u ON l.published_by = u.user_id
            WHERE 1=1
        `;
        const params = [];

        if (userId) {
            params.push(userId);
            queryText += ` AND l.published_by = $${params.length}`;
        }

        if (severity) {
            params.push(severity.toUpperCase());
            // Fast JSONB attribute matching
            queryText += ` AND l.issue->>'severity' = $${params.length}`;
        }

        params.push(parseInt(limit, 10));
        const limitParam = params.length;
        params.push(parseInt(offset, 10));
        const offsetParam = params.length;

        // Uses composite index idx_logs_user_created or idx_logs_created_at
        queryText += ` ORDER BY l.created_at DESC LIMIT $${limitParam} OFFSET $${offsetParam}`;

        const result = await db.query(queryText, params);

        const countRes = await db.query('SELECT COUNT(*) as total FROM logs');

        res.json({
            success: true,
            total: parseInt(countRes.rows[0].total, 10),
            data: result.rows,
        });
    } catch (error) {
        console.error('[LOGS-CONTROLLER-ERROR] getLogs:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

/**
 * GET /api/logs/stats
 * Aggregate audit logs by severity and error categories
 */
exports.getAuditStats = async (req, res) => {
    try {
        const stats = await db.query(`
            SELECT 
                COUNT(*) as total_violations,
                COUNT(*) FILTER (WHERE issue->>'severity' = 'CRITICAL') as critical_count,
                COUNT(*) FILTER (WHERE issue->>'severity' = 'HIGH') as high_count,
                COUNT(*) FILTER (WHERE issue->>'severity' = 'MEDIUM') as medium_count,
                COUNT(*) FILTER (WHERE issue->>'severity' = 'LOW') as low_count,
                COUNT(DISTINCT published_by) as affected_creators
            FROM logs
        `);

        const topCategories = await db.query(`
            SELECT 
                issue->>'category' as category,
                COUNT(*) as occurrences
            FROM logs
            GROUP BY issue->>'category'
            ORDER BY occurrences DESC
            LIMIT 5
        `);

        res.json({
            success: true,
            overview: stats.rows[0],
            topCategories: topCategories.rows,
        });
    } catch (error) {
        console.error('[LOGS-CONTROLLER-ERROR] getAuditStats:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

/**
 * POST /api/logs
 * Log a new AI brand guideline violation
 */
exports.createLog = async (req, res) => {
    try {
        const { post, published_by, issue } = req.body;

        if (!post || !published_by || !issue) {
            return res.status(400).json({
                success: false,
                error: 'Fields "post", "published_by", and "issue" are required',
            });
        }

        const queryText = `
            INSERT INTO logs (post, published_by, issue, created_at)
            VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
            RETURNING *
        `;

        const result = await db.query(queryText, [
            JSON.stringify(post),
            published_by,
            JSON.stringify(issue),
        ]);

        res.status(201).json({
            success: true,
            message: 'Brand compliance issue successfully logged',
            data: result.rows[0],
        });
    } catch (error) {
        console.error('[LOGS-CONTROLLER-ERROR] createLog:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};
