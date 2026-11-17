/**
 * Actions Tab Routes
 * Dedicated route handler for the User Actions & Performance Tab
 */

const express = require('express');
const router = express.Router();
const actionsController = require('../controllers/actions.controller');

// GET /api/actions - List user cumulative reports
router.get('/', actionsController.getAllActions);

// GET /api/actions/user/:userId - Get report for a specific user
router.get('/user/:userId', actionsController.getUserActionReport);

// POST /api/actions/record - Log an action/remediation
router.post('/record', actionsController.recordAction);

module.exports = router;
