const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const routes = require('./routes');
const errorHandler = require('./middleware/errorHandler');
const {join} = require("node:path");

// Create Express app
const app = express();

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Mount API routes
app.use('/api', routes);

const distPath = join(__dirname, '../ui/dist');
app.use(express.static(distPath));

// --- Handle SPA routing for all non-API routes ---
app.get('*', (req, res) => {
    // Skip if request is for an API route
    if (req.path.startsWith('/api')) return res.sendStatus(404);
    res.sendFile(join(distPath, 'index.html'));
});

// Error handling middleware (should be last)
app.use(errorHandler);

module.exports = app;