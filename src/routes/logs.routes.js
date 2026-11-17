/**
 * Logs Tab Routes
 * Dedicated route handler for the AI Brand Audit Logs Tab
 */

const express = require('express');
const router = express.Router();
const logsController = require('../controllers/logs.controller');

// GET /api/logs - List audit logs
router.get('/', logsController.getLogs);

// GET /api/logs/stats - Aggregate compliance stats and severity distribution
router.get('/stats', logsController.getAuditStats);

// POST /api/logs - Log a brand compliance violation
router.post('/', logsController.createLog);

module.exports = router;
