/**
 * Publish Tab Routes
 * Dedicated route handler for the Publish Tab
 */

const express = require('express');
const router = express.Router();
const publishController = require('../controllers/publish.controller');

// GET /api/publish - List published posts
router.get('/', publishController.getPublishedPosts);

// GET /api/publish/metrics/summary - High-level publishing analytics
router.get('/metrics/summary', publishController.getMetricsSummary);

// GET /api/publish/:id - Get published post by ID
router.get('/:id', publishController.getPublishedById);

// POST /api/publish - Create published post
router.post('/', publishController.createPublishedPost);

module.exports = router;
