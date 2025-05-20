const kubectlService = require('../services/kubectlService');

/**
 * Get all pods in a namespace
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 */
async function getPods(req, res) {
  try {
    const { namespace } = req.params;
    const pods = await kubectlService.getPods(namespace);
    res.json(pods);
  } catch (error) {
    console.error(`Error fetching pods: ${error.message || error}`);
    const status = error.status || 500;
    res.status(status).json({ 
      error: error.message || `Failed to fetch pods in namespace '${req.params.namespace}'`,
      details: error.details || error.message
    });
  }
}

/**
 * Get details of a specific pod
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 */
async function getPodDetails(req, res) {
  try {
    const { namespace, podName } = req.params;
    const podDetails = await kubectlService.getPodDetails(namespace, podName);
    res.json(podDetails);
  } catch (error) {
    console.error(`Error fetching pod details: ${error.message || error}`);
    res.status(500).json({ error: error.message || 'Failed to fetch pod details' });
  }
}

/**
 * Check if a port is available
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 */
async function checkPortAvailability(req, res) {
  try {
    const { localPort } = req.params;

    if (!localPort) {
      return res.status(400).json({ error: 'localPort is required' });
    }

    const result = await kubectlService.checkPortAvailability(parseInt(localPort), true);
    res.json(result);
  } catch (error) {
    console.error(`Error checking port availability: ${error.message || error}`);
    res.status(500).json({ error: error.message || 'Failed to check port availability' });
  }
}

/**
 * Start port forwarding for a pod
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 */
async function startPortForwarding(req, res) {
  try {
    const { namespace, podName } = req.params;
    const { podPort, localPort, force } = req.body;

    if (!podPort || !localPort) {
      return res.status(400).json({ error: 'podPort and localPort are required' });
    }

    const result = await kubectlService.startPortForwarding(
      namespace, 
      podName, 
      podPort, 
      localPort, 
      force === true
    );
    res.json(result);
  } catch (error) {
    console.error(`Error starting port forwarding: ${error.message || error}`);
    const status = error.status || 500;
    // Include processInfo in the response if available
    res.status(status).json({ 
      error: error.message || 'Failed to start port forwarding',
      processInfo: error.processInfo
    });
  }
}

/**
 * Execute a command in a pod
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 */
async function executeCommand(req, res) {
  try {
    const { namespace, podName } = req.params;
    const { command, containerName } = req.body;

    if (!command) {
      return res.status(400).json({ error: 'Command is required' });
    }

    const result = await kubectlService.executeCommand(namespace, podName, command, containerName);
    res.json(result);
  } catch (error) {
    console.error(`Error executing command in pod: ${error.message || error}`);
    res.status(500).json({ 
      success: false,
      error: error.message || 'Failed to execute command',
      command: req.body.command,
      containerName: req.body.containerName
    });
  }
}

module.exports = {
  getPods,
  getPodDetails,
  checkPortAvailability,
  startPortForwarding,
  executeCommand
};
