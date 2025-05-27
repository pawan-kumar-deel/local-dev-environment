const templatesService = require('../services/templatesService');
const kubectlService = require('../services/kubectlService');
const settingsService = require('../services/settingsService');

/**
 * Get all templates
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 */
async function getTemplates(req, res) {
  try {
    const templates = await templatesService.getTemplates();
    res.json(templates);
  } catch (error) {
    console.error(`Error fetching templates: ${error.message || error}`);
    res.status(500).json({ error: error.message || 'Failed to fetch templates' });
  }
}

/**
 * Save current port forwarding configuration as a template
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 */
async function saveTemplate(req, res) {
  try {
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Template name is required' });
    }

    const template = await templatesService.saveTemplate(name);
    res.json({
      message: `Template '${name}' saved successfully`,
      template
    });
  } catch (error) {
    console.error(`Error saving template: ${error.message || error}`);
    res.status(500).json({ error: error.message || 'Failed to save template' });
  }
}

/**
 * Apply a template
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 */
async function applyTemplate(req, res) {
  try {
    const { name } = req.params;

    if (!name) {
      return res.status(400).json({ error: 'Template name is required' });
    }

    // Get current namespace from settings
    const settings = await settingsService.loadAppSettings();
    const currentNamespace = settings.namespace;

    if (!currentNamespace) {
      return res.status(400).json({ error: 'Current namespace is not set. Please set a namespace before applying a template.' });
    }

    const template = await templatesService.applyTemplate(name, currentNamespace);

    // Apply the configurations
    await kubectlService.applyConfigurations();

    res.json({
      message: `Template '${name}' applied successfully with namespace '${currentNamespace}'`,
      template
    });
  } catch (error) {
    console.error(`Error applying template: ${error.message || error}`);
    res.status(500).json({ error: error.message || 'Failed to apply template' });
  }
}

/**
 * Delete a template
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 */
async function deleteTemplate(req, res) {
  try {
    const { name } = req.params;

    if (!name) {
      return res.status(400).json({ error: 'Template name is required' });
    }

    const success = await templatesService.deleteTemplate(name);

    if (success) {
      res.json({
        message: `Template '${name}' deleted successfully`
      });
    } else {
      res.status(404).json({
        error: `Template '${name}' not found or could not be deleted`
      });
    }
  } catch (error) {
    console.error(`Error deleting template: ${error.message || error}`);
    res.status(500).json({ error: error.message || 'Failed to delete template' });
  }
}

/**
 * Download a template file
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 */
async function downloadTemplate(req, res) {
  try {
    const { name } = req.params;

    if (!name) {
      return res.status(400).json({ error: 'Template name is required' });
    }

    const templatePath = require('path').join(__dirname, '../../templates', `${name}.json`);

    // Check if file exists
    try {
      await require('fs').promises.access(templatePath);
    } catch (error) {
      return res.status(404).json({ error: `Template '${name}' not found` });
    }

    // Set headers for file download
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename=${name}.json`);

    // Send the file
    res.sendFile(templatePath);
  } catch (error) {
    console.error(`Error downloading template: ${error.message || error}`);
    res.status(500).json({ error: error.message || 'Failed to download template' });
  }
}

module.exports = {
  getTemplates,
  saveTemplate,
  applyTemplate,
  deleteTemplate,
  downloadTemplate
};
