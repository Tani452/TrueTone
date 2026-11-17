/**
 * Users Tab Controller
 * Handles user directory, department-level filtering, and granular role permissions.
 */

const db = require('../db');

/**
 * GET /api/users
 * Lists users with fast department and permission filtering
 */
exports.getUsers = async (req, res) => {
    try {
        const { department, canPost, canApprove, canTakeAction, search, limit = 50, offset = 0 } = req.query;

        let queryText = 'SELECT * FROM users WHERE 1=1';
        const params = [];

        // Uses B-Tree index idx_users_department
        if (department) {
            params.push(department);
            queryText += ` AND department = $${params.length}`;
        }

        // Uses composite index idx_users_permissions
        if (canPost) {
            params.push(canPost.toUpperCase());
            queryText += ` AND can_post = $${params.length}`;
        }

        if (canApprove) {
            params.push(canApprove.toUpperCase());
            queryText += ` AND can_approve = $${params.length}`;
        }

        if (canTakeAction) {
            params.push(canTakeAction.toUpperCase());
            queryText += ` AND can_take_action = $${params.length}`;
        }

        if (search) {
            params.push(`%${search}%`);
            queryText += ` AND (user_name ILIKE $${params.length} OR designation ILIKE $${params.length})`;
        }

        params.push(parseInt(limit, 10));
        const limitParam = params.length;
        params.push(parseInt(offset, 10));
        const offsetParam = params.length;

        queryText += ` ORDER BY user_id ASC LIMIT $${limitParam} OFFSET $${offsetParam}`;

        const result = await db.query(queryText, params);
        const countRes = await db.query('SELECT COUNT(*) as total FROM users');

        res.json({
            success: true,
            total: parseInt(countRes.rows[0].total, 10),
            data: result.rows,
        });
    } catch (error) {
        console.error('[USERS-CONTROLLER-ERROR] getUsers:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

/**
 * GET /api/users/departments
 * Retrieves department breakdown
 */
exports.getDepartments = async (req, res) => {
    try {
        const result = await db.query(`
            SELECT 
                department, 
                COUNT(*) as user_count,
                COUNT(*) FILTER (WHERE can_approve = 'Y') as approvers_count,
                COUNT(*) FILTER (WHERE can_take_action = 'Y') as auditors_count
            FROM users 
            GROUP BY department 
            ORDER BY user_count DESC
        `);

        res.json({
            success: true,
            data: result.rows,
        });
    } catch (error) {
        console.error('[USERS-CONTROLLER-ERROR] getDepartments:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

/**
 * GET /api/users/:id
 * Retrieve single user by ID
 */
exports.getUserById = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await db.query('SELECT * FROM users WHERE user_id = $1', [id]);

        if (result.rowCount === 0) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }

        res.json({
            success: true,
            data: result.rows[0],
        });
    } catch (error) {
        console.error('[USERS-CONTROLLER-ERROR] getUserById:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

/**
 * POST /api/users
 * Create a new user with permission flags
 */
exports.createUser = async (req, res) => {
    try {
        const {
            user_name,
            designation,
            department,
            contact_no,
            can_post = 'N',
            can_approve = 'N',
            can_take_action = 'N',
        } = req.body;

        if (!user_name) {
            return res.status(400).json({ success: false, error: 'Field "user_name" is required' });
        }

        const validFlag = (val) => ['Y', 'N'].includes((val || '').toUpperCase()) ? val.toUpperCase() : 'N';

        const queryText = `
            INSERT INTO users (user_name, designation, department, contact_no, can_post, can_approve, can_take_action)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING *
        `;

        const result = await db.query(queryText, [
            user_name,
            designation || null,
            department || null,
            contact_no || null,
            validFlag(can_post),
            validFlag(can_approve),
            validFlag(can_take_action),
        ]);

        res.status(201).json({
            success: true,
            message: 'User created successfully',
            data: result.rows[0],
        });
    } catch (error) {
        console.error('[USERS-CONTROLLER-ERROR] createUser:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

/**
 * PATCH /api/users/:id/permissions
 * Update user authorization flags
 */
exports.updateUserPermissions = async (req, res) => {
    try {
        const { id } = req.params;
        const { can_post, can_approve, can_take_action } = req.body;

        const validFlag = (val) => ['Y', 'N'].includes((val || '').toUpperCase()) ? val.toUpperCase() : null;

        const updates = [];
        const params = [id];

        if (can_post !== undefined && validFlag(can_post)) {
            params.push(validFlag(can_post));
            updates.push(`can_post = $${params.length}`);
        }

        if (can_approve !== undefined && validFlag(can_approve)) {
            params.push(validFlag(can_approve));
            updates.push(`can_approve = $${params.length}`);
        }

        if (can_take_action !== undefined && validFlag(can_take_action)) {
            params.push(validFlag(can_take_action));
            updates.push(`can_take_action = $${params.length}`);
        }

        if (updates.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'No valid permission updates provided (must be Y or N)',
            });
        }

        const queryText = `
            UPDATE users
            SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
            WHERE user_id = $1
            RETURNING *
        `;

        const result = await db.query(queryText, params);

        if (result.rowCount === 0) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }

        res.json({
            success: true,
            message: 'User permissions updated successfully',
            data: result.rows[0],
        });
    } catch (error) {
        console.error('[USERS-CONTROLLER-ERROR] updateUserPermissions:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};
