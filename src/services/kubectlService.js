const { executeKubectlCommand } = require('../utils/execUtils');
const { execPromiseWithOptions } = require('../utils/execUtils');
const configService = require('./configService');

/**
 * Get all pods in a namespace
 * @param {string} namespace - The namespace to get pods from
 * @returns {Promise<object>} - Promise that resolves with pods data
 */
async function getPods(namespace) {
  // First check if the namespace exists
  try {
    const namespaceCommand = `kubectl get namespace ${namespace} -o name`;
    await executeKubectlCommand(namespaceCommand, 2, 500);
  } catch (nsError) {
    console.error(`Namespace check failed: ${nsError.message}`);
    throw {
      status: 404,
      message: `Namespace '${namespace}' not found or not accessible`,
      details: nsError.message
    };
  }

  // If namespace exists, get pods
  const command = `kubectl get pods -n ${namespace} -o json`;
  const output = await executeKubectlCommand(command);
  return JSON.parse(output);
}

/**
 * Get details of a specific pod
 * @param {string} namespace - The namespace the pod is in
 * @param {string} podName - The name of the pod
 * @returns {Promise<object>} - Promise that resolves with pod details
 */
async function getPodDetails(namespace, podName) {
  const command = `kubectl get pod ${podName} -n ${namespace} -o json`;
  const output = await executeKubectlCommand(command);
  return JSON.parse(output);
}

/**
 * Check if a port is available
 * @param {number} localPort - The local port to check
 * @param {boolean} getProcessInfo - Whether to return process info if port is in use
 * @returns {Promise<object>} - Promise that resolves with port availability info
 */
async function checkPortAvailability(localPort, getProcessInfo = false) {
  try {
    // If getProcessInfo is true, get detailed process information
    if (getProcessInfo) {
      const { stdout } = await execPromiseWithOptions(`lsof -i:${localPort} -F pcn`);

      // Parse the output to extract process information
      // Format is typically: p[PID]c[COMMAND]n[USER]
      const lines = stdout.split('\n');
      let pid = '';
      let command = '';
      let user = '';

      for (const line of lines) {
        if (line.startsWith('p')) pid = line.substring(1);
        if (line.startsWith('c')) command = line.substring(1);
        if (line.startsWith('n')) user = line.substring(1);
      }

      return {
        available: false,
        processInfo: {
          pid,
          command,
          user
        }
      };
    } else {
      // Just check if port is in use without getting process info
      await execPromiseWithOptions(`lsof -i:${localPort}`);
      return { available: false };
    }
  } catch (error) {
    // If lsof command fails, it means the port is not in use
    return { available: true };
  }
}

/**
 * Start port forwarding for a pod
 * @param {string} namespace - The namespace the pod is in
 * @param {string} podName - The name of the pod
 * @param {number} podPort - The port on the pod to forward
 * @param {number} localPort - The local port to forward to
 * @param {boolean} force - Whether to force port forwarding by killing existing processes
 * @returns {Promise<object>} - Promise that resolves with port forwarding details
 */
async function startPortForwarding(namespace, podName, podPort, localPort, force = false) {
  // Check if the port is already in use
  const portCheck = await checkPortAvailability(localPort, true);

  if (!portCheck.available) {
    // If force is true, kill the process using the port
    if (force && portCheck.processInfo && portCheck.processInfo.pid) {
      try {
        await execPromiseWithOptions(`kill -9 ${portCheck.processInfo.pid}`);
        // Wait a moment for the port to be released
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (killError) {
        throw {
          status: 500,
          message: `Failed to kill process using port ${localPort}`,
          details: killError.message
        };
      }
    } else {
      // If not forcing, throw an error with process info
      throw {
        status: 400,
        message: `Local port ${localPort} is already in use`,
        processInfo: portCheck.processInfo
      };
    }
  }

  // Start port forwarding in the background
  const command = `kubectl port-forward -n ${namespace} pod/${podName} ${localPort}:${podPort} > /dev/null 2>&1 &`;
  await executeKubectlCommand(command);

  // Save the configuration
  const config = {
    namespace,
    podName,
    podPort: parseInt(podPort),
    localPort: parseInt(localPort),
    createdAt: new Date().toISOString()
  };

  await configService.saveConfiguration(config);

  return {
    message: 'Port forwarding started successfully',
    details: {
      namespace,
      podName,
      podPort,
      localPort,
      url: `http://localhost:${localPort}`
    }
  };
}

/**
 * Stop port forwarding
 * @param {number} localPort - The local port to stop forwarding
 * @returns {Promise<object>} - Promise that resolves with success message
 */
async function stopPortForwarding(localPort) {
  // Find and kill the process using the local port
  const command = `lsof -ti:${localPort} | xargs kill -9`;
  await executeKubectlCommand(command);

  // Remove the configuration
  await configService.removeConfiguration(localPort);

  return {
    message: `Port forwarding on local port ${localPort} stopped successfully`
  };
}

/**
 * Execute a command in a pod
 * @param {string} namespace - The namespace the pod is in
 * @param {string} podName - The name of the pod
 * @param {string} command - The command to execute
 * @param {string} [containerName] - Optional container name for pods with multiple containers
 * @returns {Promise<object>} - Promise that resolves with command output
 */
async function executeCommand(namespace, podName, command, containerName) {
  let kubectlCommand;

  if (containerName) {
    // If container name is provided, use it
    kubectlCommand = `kubectl exec -n ${namespace} ${podName} -c ${containerName} -- sh -c '${command}'`;
  } else {
    // Otherwise, let kubectl choose the default container
    kubectlCommand = `kubectl exec -n ${namespace} ${podName} -- sh -c '${command}'`;
  }

  const output = await executeKubectlCommand(kubectlCommand);

  return {
    success: true,
    output,
    podName,
    namespace,
    command,
    containerName
  };
}

/**
 * Apply saved port forwarding configurations
 * @returns {Promise<void>}
 */
async function applyConfigurations() {
  try {
    const configurations = await configService.loadConfigurations();
    console.log(`Applying ${configurations.length} port forwarding configurations...`);

    for (const config of configurations) {
      try {
        // Check if port is already in use
        try {
          await execPromiseWithOptions(`lsof -i:${config.localPort}`);
          console.log(`Local port ${config.localPort} is already in use, skipping...`);
          continue;
        } catch (error) {
          // Port is not in use, which is good
        }

        // Start port forwarding in the background
        const command = `kubectl port-forward -n ${config.namespace} pod/${config.podName} ${config.localPort}:${config.podPort} > /dev/null 2>&1 &`;
        await executeKubectlCommand(command);
        console.log(`Started port forwarding: ${config.namespace}/${config.podName} ${config.localPort}:${config.podPort}`);
      } catch (error) {
        console.error(`Error applying configuration for ${config.namespace}/${config.podName}:`, error);
      }
    }
  } catch (error) {
    console.error('Error applying configurations:', error);
  }
}

module.exports = {
  getPods,
  getPodDetails,
  checkPortAvailability,
  startPortForwarding,
  stopPortForwarding,
  executeCommand,
  applyConfigurations
};
