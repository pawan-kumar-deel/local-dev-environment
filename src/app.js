const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const routes = require('./routes');
const errorHandler = require('./middleware/errorHandler');

// Create Express app
const app = express();

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Mount API routes
app.use('/api', routes);

// Error handling middleware (should be last)
app.use(errorHandler);

module.exports = app;