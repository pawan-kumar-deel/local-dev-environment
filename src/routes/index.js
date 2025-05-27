const express = require('express');
const router = express.Router();
const podRoutes = require('./podRoutes');
const configRoutes = require('./configRoutes');
const settingsRoutes = require('./settingsRoutes');
const templatesRoutes = require('./templatesRoutes');
const configController = require('../controllers/configController');

// API Routes
router.use('/pods', podRoutes);
router.use('/configurations', configRoutes);
router.use('/settings', settingsRoutes);
router.use('/templates', templatesRoutes);

// Special routes for port forwarding
router.delete('/portforward/:localPort', configController.stopPortForwarding);
router.get('/portforward/check/:localPort', require('../controllers/podController').checkPortAvailability);

// Root endpoint
router.get('/', (req, res) => {
  res.json({
    message: 'Deel LDE Management API',
    endpoints: [
      { method: 'GET', path: '/api/pods/:namespace', description: 'Get all pods in a namespace' },
      { method: 'GET', path: '/api/pods/:namespace/:podName', description: 'Get details of a specific pod' },
      { method: 'POST', path: '/api/pods/:namespace/:podName/portforward', description: 'Port forward a pod port to local machine' },
      { method: 'GET', path: '/api/portforward/check/:localPort', description: 'Check if a local port is available' },
      { method: 'DELETE', path: '/api/portforward/:localPort', description: 'Stop port forwarding on a local port' },
      { method: 'GET', path: '/api/configurations', description: 'Get all saved port forwarding configurations' },
      { method: 'GET', path: '/api/settings', description: 'Get application settings' },
      { method: 'PUT', path: '/api/settings', description: 'Update application settings' },
      { method: 'POST', path: '/api/pods/:namespace/:podName/exec', description: 'Execute a command in a pod' },
      { method: 'GET', path: '/api/templates', description: 'Get all saved templates' },
      { method: 'POST', path: '/api/templates', description: 'Save current port forwarding configuration as a template' },
      { method: 'POST', path: '/api/templates/:name/apply', description: 'Apply a template' },
      { method: 'DELETE', path: '/api/templates/:name', description: 'Delete a template' }
    ]
  });
});

module.exports = router;
