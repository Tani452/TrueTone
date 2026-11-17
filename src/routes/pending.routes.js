/**
 * Pending Queue & Governance Voting API Routes
 * Endpoints for queue browsing, atomic peer voting, threaded discussions,
 * and 5-day expiration finalization.
 */

const express = require('express');
const router = express.Router();
const pendingService = require('../services/pending.service');

// GET /api/pending - List pending submissions with optional filter (?filter=all|open|approved|rejected)
router.get('/', async (req, res) => {
    try {
        const filter = req.query.filter || req.query.status || 'all';
        const items = await pendingService.getPendingList(filter);
        res.json({
            success: true,
            filter,
            count: items.length,
            data: items,
        });
    } catch (err) {
        console.error('[GET /api/pending ERROR]', err);
        res.status(500).json({
            success: false,
            error: err.message || 'Error fetching pending queue',
        });
    }
});

// GET /api/pending/:id - Single pending post inspection
router.get('/:id', async (req, res) => {
    try {
        const item = await pendingService.getPendingById(req.params.id);
        if (!item) {
            return res.status(404).json({
                success: false,
                error: `Pending item #${req.params.id} not found`,
            });
        }
        res.json({
            success: true,
            data: item,
        });
    } catch (err) {
        console.error('[GET /api/pending/:id ERROR]', err);
        res.status(500).json({
            success: false,
            error: err.message || 'Error fetching pending item details',
        });
    }
});

// POST /api/pending/:id/vote - Cast/toggle peer vote (requires can_approve = 'Y')
router.post('/:id/vote', async (req, res) => {
    try {
        const userId = parseInt(req.body.user_id, 10);
        const vote = req.body.vote; // 'yes' or 'no'

        if (!userId) {
            return res.status(400).json({
                success: false,
                error: 'user_id is required to register a vote',
            });
        }

        const result = await pendingService.castVote(req.params.id, userId, vote);
        res.json(result);
    } catch (err) {
        console.error('[POST /api/pending/:id/vote ERROR]', err);
        const statusCode = err.message.includes('Unauthorized') ? 403 : 400;
        res.status(statusCode).json({
            success: false,
            error: err.message,
        });
    }
});

// POST /api/pending/:id/comments - Add top-level comment
router.post('/:id/comments', async (req, res) => {
    try {
        const { user_id, user_name, designation, text } = req.body;
        if (!user_id || !text) {
            return res.status(400).json({
                success: false,
                error: 'user_id and text are required',
            });
        }

        const result = await pendingService.addComment(req.params.id, {
            userId: user_id,
            userName: user_name,
            designation,
            text,
        });

        res.json(result);
    } catch (err) {
        console.error('[POST /api/pending/:id/comments ERROR]', err);
        res.status(400).json({
            success: false,
            error: err.message,
        });
    }
});

// POST /api/pending/:id/comments/:commentId/reply - Add nested reply
router.post('/:id/comments/:commentId/reply', async (req, res) => {
    try {
        const { user_id, user_name, designation, text } = req.body;
        if (!user_id || !text) {
            return res.status(400).json({
                success: false,
                error: 'user_id and text are required',
            });
        }

        const result = await pendingService.addReply(req.params.id, req.params.commentId, {
            userId: user_id,
            userName: user_name,
            designation,
            text,
        });

        res.json(result);
    } catch (err) {
        console.error('[POST /api/pending/:id/comments/:commentId/reply ERROR]', err);
        res.status(400).json({
            success: false,
            error: err.message,
        });
    }
});

// POST /api/pending/:id/comments/:commentId/react - React (like or dislike)
router.post('/:id/comments/:commentId/react', async (req, res) => {
    try {
        const { user_id, reaction } = req.body;
        if (!user_id || !reaction) {
            return res.status(400).json({
                success: false,
                error: 'user_id and reaction ("like"|"dislike") are required',
            });
        }

        const result = await pendingService.reactToComment(req.params.id, req.params.commentId, user_id, reaction);
        res.json(result);
    } catch (err) {
        console.error('[POST /api/pending/:id/comments/:commentId/react ERROR]', err);
        res.status(400).json({
            success: false,
            error: err.message,
        });
    }
});

// POST /api/pending/:id/finalize-demo - Fast-forward 5-day expiration for demo
router.post('/:id/finalize-demo', async (req, res) => {
    try {
        const result = await pendingService.forceFinalizePost(req.params.id);
        res.json(result);
    } catch (err) {
        console.error('[POST /api/pending/:id/finalize-demo ERROR]', err);
        res.status(400).json({
            success: false,
            error: err.message,
        });
    }
});

module.exports = router;
