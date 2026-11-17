/**
 * Review Tab Routes
 * Dedicated route handler for the Review Tab
 */

const express = require('express');
const router = express.Router();
const reviewController = require('../controllers/review.controller');

// GET /api/review/pending - Retrieve unapproved queue
router.get('/pending', reviewController.getPendingPosts);

// POST /api/review/:id/vote - Register community / manager vote
router.post('/:id/vote', reviewController.voteOnPost);

// POST /api/review/:id/approve - Approve post and dispatch to published
router.post('/:id/approve', reviewController.approveAndPublish);

// POST /api/review/submit - Create new pending post draft
router.post('/submit', reviewController.submitPostForReview);

module.exports = router;
