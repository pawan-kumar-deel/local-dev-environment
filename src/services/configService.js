const fs = require('fs');
const fsPromises = fs.promises;
const { CONFIG_FILE } = require('../config/constants');

/**
 * Save a port forwarding configuration
 * @param {object} config - The configuration to save
 * @returns {Promise<Array>} - Promise that resolves with all configurations
 */
async function saveConfiguration(config) {
  try {
    let configurations = [];

    // Try to read existing configurations
    try {
      const data = await fsPromises.readFile(CONFIG_FILE, 'utf8');
      configurations = JSON.parse(data);
    } catch (error) {
      // File doesn't exist or is invalid, start with empty array
      configurations = [];
    }

    // Check if configuration already exists
    const existingIndex = configurations.findIndex(c => 
      c.namespace === config.namespace && 
      c.podName === config.podName && 
      c.podPort === config.podPort
    );

    if (existingIndex >= 0) {
      // Update existing configuration
      configurations[existingIndex] = config;
    } else {
      // Add new configuration
      configurations.push(config);
    }

    // Write configurations to file
    await fsPromises.writeFile(CONFIG_FILE, JSON.stringify(configurations, null, 2), 'utf8');
    return configurations;
  } catch (error) {
    console.error('Error saving configuration:', error);
    throw error;
  }
}

/**
 * Load all port forwarding configurations
 * @returns {Promise<Array>} - Promise that resolves with all configurations
 */
async function loadConfigurations() {
  try {
    try {
      const data = await fsPromises.readFile(CONFIG_FILE, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      // File doesn't exist or is invalid, return empty array
      return [];
    }
  } catch (error) {
    console.error('Error loading configurations:', error);
    throw error;
  }
}

/**
 * Remove a configuration by local port
 * @param {number} localPort - The local port to remove configuration for
 * @returns {Promise<Array>} - Promise that resolves with updated configurations
 */
async function removeConfiguration(localPort) {
  try {
    const configurations = await loadConfigurations();
    const updatedConfigurations = configurations.filter(config => config.localPort !== parseInt(localPort));
    await fsPromises.writeFile(CONFIG_FILE, JSON.stringify(updatedConfigurations, null, 2), 'utf8');
    return updatedConfigurations;
  } catch (error) {
    console.error('Error removing configuration:', error);
    throw error;
  }
}

module.exports = {
  saveConfiguration,
  loadConfigurations,
  removeConfiguration
};