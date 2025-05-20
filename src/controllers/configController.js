const configService = require('../services/configService');
const kubectlService = require('../services/kubectlService');

/**
 * Get all saved port forwarding configurations
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 */
async function getConfigurations(req, res) {
  try {
    const configurations = await configService.loadConfigurations();
    res.json(configurations);
  } catch (error) {
    console.error(`Error fetching configurations: ${error.message || error}`);
    res.status(500).json({ error: error.message || 'Failed to fetch configurations' });
  }
}

/**
 * Stop port forwarding
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 */
async function stopPortForwarding(req, res) {
  try {
    const { localPort } = req.params;
    const result = await kubectlService.stopPortForwarding(localPort);
    res.json(result);
  } catch (error) {
    console.error(`Error stopping port forwarding: ${error.message || error}`);
    res.status(500).json({ error: error.message || 'Failed to stop port forwarding' });
  }
}

module.exports = {
  getConfigurations,
  stopPortForwarding
};