/**
 * Actions Tab Routes
 * Endpoints for weekly log analysis synthesis, per-user cumulative report cards,
 * and role-gated manager reviews.
 */

const express = require('express');
const router = express.Router();
const actionsController = require('../controllers/actions.controller');

// GET /api/actions - List all cumulative employee reports
router.get('/', actionsController.getAllActions);

// POST /api/actions/run-weekly-analysis - Trigger weekly AI synthesis
router.post('/run-weekly-analysis', actionsController.runWeeklyAnalysis);

// GET /api/actions/user/:userId - Legacy user lookup
router.get('/user/:userId', actionsController.getUserActionReport);

// POST /api/actions/record - Legacy intervention logging
router.post('/record', actionsController.recordAction);

// GET /api/actions/:id - Single employee report with audit evidence logs
router.get('/:id', actionsController.getActionById);

// POST /api/actions/:id/comments - Add role-gated manager review note
router.post('/:id/comments', actionsController.addComment);

module.exports = router;
