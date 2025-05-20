const express = require('express');
const router = express.Router();
const configController = require('../controllers/configController');

// Get all saved port forwarding configurations
router.get('/', configController.getConfigurations);

// Stop port forwarding
router.delete('/:localPort', configController.stopPortForwarding);

module.exports = router;