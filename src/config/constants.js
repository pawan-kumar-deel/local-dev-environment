const path = require('path');

// Server configuration
const PORT = process.env.PORT || 884;

// File paths
const CONFIG_FILE = path.join(__dirname, '../../port-forwarding-config.json');
const APP_CONFIG_FILE = path.join(__dirname, '../../config.json');

module.exports = {
  PORT,
  CONFIG_FILE,
  APP_CONFIG_FILE
};