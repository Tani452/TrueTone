/**
 * Publish Tab Controller
 * Handles published content cataloging, channel feeds, and distribution history.
 */

const db = require('../db');

/**
 * GET /api/publish
 * Lists published posts ordered by timestamp DESC (hits idx_published_timestamp)
 */
exports.getPublishedPosts = async (req, res) => {
    try {
        const { channel, limit = 50, offset = 0, search } = req.query;

        let queryText = 'SELECT * FROM published WHERE 1=1';
        const params = [];

        // Fast JSONB filtering on channel arrays or title text
        if (channel) {
            params.push(JSON.stringify([channel]));
            // Uses GIN index for JSON containment
            queryText += ` AND post->'channels' @> $${params.length}::jsonb`;
        }

        if (search) {
            params.push(`%${search}%`);
            queryText += ` AND (post->>'title' ILIKE $${params.length} OR post->>'summary' ILIKE $${params.length})`;
        }

        params.push(parseInt(limit, 10));
        const limitParam = params.length;
        params.push(parseInt(offset, 10));
        const offsetParam = params.length;

        queryText += ` ORDER BY timestamp DESC LIMIT $${limitParam} OFFSET $${offsetParam}`;

        const result = await db.query(queryText, params);

        const countRes = await db.query('SELECT COUNT(*) as total FROM published');

        res.json({
            success: true,
            total: parseInt(countRes.rows[0].total, 10),
            data: result.rows,
        });
    } catch (error) {
        console.error('[PUBLISH-CONTROLLER-ERROR] getPublishedPosts:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

/**
 * GET /api/publish/:id
 * Retrieve a specific published post by ID
 */
exports.getPublishedById = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await db.query('SELECT * FROM published WHERE id = $1', [id]);

        if (result.rowCount === 0) {
            return res.status(404).json({ success: false, error: 'Published post not found' });
        }

        res.json({
            success: true,
            data: result.rows[0],
        });
    } catch (error) {
        console.error('[PUBLISH-CONTROLLER-ERROR] getPublishedById:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

/**
 * POST /api/publish
 * Directly publish validated content
 */
exports.createPublishedPost = async (req, res) => {
    try {
        const { post } = req.body;

        if (!post || typeof post !== 'object') {
            return res.status(400).json({
                success: false,
                error: 'Field "post" is required and must be a valid JSON object',
            });
        }

        const result = await db.query(
            'INSERT INTO published (post, timestamp) VALUES ($1, CURRENT_TIMESTAMP) RETURNING *',
            [JSON.stringify(post)]
        );

        res.status(201).json({
            success: true,
            message: 'Post successfully published',
            data: result.rows[0],
        });
    } catch (error) {
        console.error('[PUBLISH-CONTROLLER-ERROR] createPublishedPost:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

/**
 * GET /api/publish/metrics/summary
 * Aggregate metrics across all published content
 */
exports.getMetricsSummary = async (req, res) => {
    try {
        const stats = await db.query(`
            SELECT 
                COUNT(*) as total_published,
                COUNT(*) FILTER (WHERE timestamp >= NOW() - INTERVAL '7 days') as published_last_7_days,
                COUNT(*) FILTER (WHERE post->'channels' @> '["LinkedIn"]'::jsonb) as linkedin_count,
                COUNT(*) FILTER (WHERE post->'channels' @> '["Twitter/X"]'::jsonb OR post->'channels' @> '["X/Twitter"]'::jsonb) as twitter_count
            FROM published
        `);

        res.json({
            success: true,
            metrics: stats.rows[0],
        });
    } catch (error) {
        console.error('[PUBLISH-CONTROLLER-ERROR] getMetricsSummary:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};
