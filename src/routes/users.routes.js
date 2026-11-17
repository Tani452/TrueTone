/**
 * Users Tab Routes
 * Dedicated route handler for the Users & Team Directory Tab
 */

const express = require('express');
const router = express.Router();
const usersController = require('../controllers/users.controller');

// GET /api/users - List users with department and permission filtering
router.get('/', usersController.getUsers);

// GET /api/users/departments - Department breakdown & counts
router.get('/departments', usersController.getDepartments);

// GET /api/users/:id - Get user by ID
router.get('/:id', usersController.getUserById);

// POST /api/users - Create new user
router.post('/', usersController.createUser);

// PATCH /api/users/:id/permissions - Update permissions
router.patch('/:id/permissions', usersController.updateUserPermissions);

module.exports = router;
