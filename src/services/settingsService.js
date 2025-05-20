const fs = require('fs');
const fsPromises = fs.promises;
const { APP_CONFIG_FILE } = require('../config/constants');

/**
 * Load application settings
 * @returns {Promise<object>} - Promise that resolves with application settings
 */
async function loadAppSettings() {
  try {
    try {
      const data = await fsPromises.readFile(APP_CONFIG_FILE, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      // File doesn't exist or is invalid, return default settings
      const defaultSettings = {
        filterPreference: "Services with listeners",
        namespace: "",
        refreshInterval: "15s"
      };
      await saveAppSettings(defaultSettings);
      return defaultSettings;
    }
  } catch (error) {
    console.error('Error loading application settings:', error);
    throw error;
  }
}

/**
 * Save application settings
 * @param {object} settings - The settings to save
 * @returns {Promise<object>} - Promise that resolves with saved settings
 */
async function saveAppSettings(settings) {
  try {
    await fsPromises.writeFile(APP_CONFIG_FILE, JSON.stringify(settings, null, 2), 'utf8');
    return settings;
  } catch (error) {
    console.error('Error saving application settings:', error);
    throw error;
  }
}

/**
 * Update application settings
 * @param {object} newSettings - The settings to update
 * @returns {Promise<object>} - Promise that resolves with updated settings
 */
async function updateAppSettings(newSettings) {
  try {
    const currentSettings = await loadAppSettings();
    const updatedSettings = {
      ...currentSettings,
      ...(newSettings.filterPreference !== undefined && { filterPreference: newSettings.filterPreference }),
      ...(newSettings.namespace !== undefined && { namespace: newSettings.namespace }),
      ...(newSettings.refreshInterval !== undefined && { refreshInterval: newSettings.refreshInterval })
    };
    return await saveAppSettings(updatedSettings);
  } catch (error) {
    console.error('Error updating application settings:', error);
    throw error;
  }
}

module.exports = {
  loadAppSettings,
  saveAppSettings,
  updateAppSettings
};
