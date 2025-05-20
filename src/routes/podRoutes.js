const express = require('express');
const router = express.Router();
const podController = require('../controllers/podController');

// Get all pods in a namespace
router.get('/:namespace', podController.getPods);

// Get details of a specific pod
router.get('/:namespace/:podName', podController.getPodDetails);

// Start port forwarding for a pod
router.post('/:namespace/:podName/portforward', podController.startPortForwarding);

// Execute a command in a pod
router.post('/:namespace/:podName/exec', podController.executeCommand);

module.exports = router;