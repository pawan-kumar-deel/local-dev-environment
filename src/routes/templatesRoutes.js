const express = require('express');
const router = express.Router();
const templatesController = require('../controllers/templatesController');

// Get all templates
router.get('/', templatesController.getTemplates);

// Save current port forwarding configuration as a template
router.post('/', templatesController.saveTemplate);

// Apply a template
router.post('/:name/apply', templatesController.applyTemplate);

// Delete a template
router.delete('/:name', templatesController.deleteTemplate);

// Download a template
router.get('/:name/download', templatesController.downloadTemplate);

module.exports = router;
