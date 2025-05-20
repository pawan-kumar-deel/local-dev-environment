const settingsService = require('../services/settingsService');

/**
 * Get application settings
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 */
async function getSettings(req, res) {
  try {
    const settings = await settingsService.loadAppSettings();
    res.json(settings);
  } catch (error) {
    console.error(`Error fetching settings: ${error.message || error}`);
    res.status(500).json({ error: error.message || 'Failed to fetch settings' });
  }
}

/**
 * Update application settings
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 */
async function updateSettings(req, res) {
  try {
    const { filterPreference, namespace } = req.body;
    const updatedSettings = await settingsService.updateAppSettings({ filterPreference, namespace });
    res.json(updatedSettings);
  } catch (error) {
    console.error(`Error updating settings: ${error.message || error}`);
    res.status(500).json({ error: error.message || 'Failed to update settings' });
  }
}

module.exports = {
  getSettings,
  updateSettings
};