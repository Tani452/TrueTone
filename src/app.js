/**
 * TrueTone Express Application
 * Modular architecture mounting separated tab route controllers.
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./db');

// Import dedicated route handlers for each tab
const reviewRoutes = require('./routes/review.routes');
const pendingRoutes = require('./routes/pending.routes');
const publishRoutes = require('./routes/publish.routes');
const logsRoutes = require('./routes/logs.routes');
const actionsRoutes = require('./routes/actions.routes');
const usersRoutes = require('./routes/users.routes');
const guidelinesRoutes = require('./routes/guidelines.routes');
const submissionRoutes = require('./routes/submission.routes');

const app = express();

// Standard middlewares
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Serve frontend static files and uploaded media
app.use(express.static(path.join(__dirname, '../public')));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Mount Tab Backends cleanly separated
app.use('/api/review', reviewRoutes);
app.use('/api/pending', pendingRoutes);
app.use('/api/publish', publishRoutes);
app.use('/api/logs', logsRoutes);
app.use('/api/actions', actionsRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/guidelines', guidelinesRoutes);
app.use('/api/publish-submission', submissionRoutes);

// Lightweight ping/health endpoint for cloud orchestrators (Railway, Render, AWS)
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'healthy', uptime: process.uptime() });
});

// Database Health & Performance Diagnostics Endpoint
app.get('/api/health', async (req, res) => {
    const health = await db.checkHealth();
    res.status(200).json(health);
});

// Root fallback to serve index.html
app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) {
        return next();
    }
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

// 404 handler for API routes
app.use('/api/*', (req, res) => {
    res.status(404).json({
        success: false,
        error: `Endpoint not found: ${req.method} ${req.originalUrl}`,
    });
});

// Global Error Handler
app.use((err, req, res, next) => {
    console.error('[UNCAUGHT-APP-ERROR]', err);
    res.status(err.status || 500).json({
        success: false,
        error: err.message || 'Internal Server Error',
    });
});

module.exports = app;
