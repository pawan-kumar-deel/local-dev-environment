const { executeKubectlCommand } = require('../utils/execUtils');
const { execPromiseWithOptions } = require('../utils/execUtils');
const configService = require('./configService');
const {exec} = require('child_process');
const { promisify } = require('util');
const k8s = require('@kubernetes/client-node');
const kc = new k8s.KubeConfig();
kc.loadFromDefault();
const k8sApi = kc.makeApiClient(k8s.CoreV1Api);


const execAsync = promisify(exec);
/**
 * Get all services in a namespace
 * @param {string} namespace - The namespace to get services from
 * @returns {Promise<object>} - Promise that resolves with services data
 */
async function getServices(namespace) {
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

  // If namespace exists, get services
  const command = `kubectl get services -n ${namespace} -o json`;
  const output = await executeKubectlCommand(command);
  return JSON.parse(output);
}

/**
 * Get the service name for a pod
 * @param {string} namespace - The namespace the pod is in
 * @param {string} podName - The name of the pod
 * @returns {Promise<string|null>} - Promise that resolves with the service name or null if not found
 */
async function getServiceForPod(namespace, podName) {
  try {
    // Get pod details to get labels
    const podDetails = await getPodDetails(namespace, podName);
    const podLabels = podDetails.metadata.labels;

    if (!podLabels) {
      return null;
    }

    // Get all services in the namespace
    const servicesData = await getServices(namespace);
    const services = servicesData.items || [];

    // Find a service that selects this pod
    for (const service of services) {
      const selector = service.spec.selector;
      if (!selector) continue;

      // Check if all selector labels match the pod labels
      const matches = Object.entries(selector).every(([key, value]) => 
        podLabels[key] === value
      );

      if (matches) {
        return service.metadata.name;
      }
    }

    return null;
  } catch (error) {
    console.error(`Error getting service for pod: ${error.message || error}`);
    return null;
  }
}

/**
 * Find pods by service name
 * @param {string} namespace - The namespace the service is in
 * @param {string} serviceName - The name of the service
 * @param {number} [requiredPort] - Optional port that must be exposed by the pod
 * @returns {Promise<Array>} - Promise that resolves with an array of matching pods
 */
async function findPodsByService(namespace, serviceName, requiredPort = null) {
  try {
    // Get service details to get selector
    const command = `kubectl get service ${serviceName} -n ${namespace} -o json`;
    const output = await executeKubectlCommand(command);
    const service = JSON.parse(output);

    if (!service.spec.selector) {
      return [];
    }

    // Get all pods in the namespace
    const podsData = await getPods(namespace);
    const pods = podsData.items || [];

    // Filter pods that match the service selector
    const matchingPods = pods.filter(pod => {
      const podLabels = pod.metadata.labels;
      if (!podLabels) return false;

      // Check if all selector labels match the pod labels
      return Object.entries(service.spec.selector).every(([key, value]) => 
        podLabels[key] === value
      );
    });

    // If a required port is specified, filter pods that expose that port
    if (requiredPort !== null) {
      return matchingPods.filter(pod => {
        // Check if the pod has containers with the required port
        return pod.spec.containers.some(container => {
          return container.ports && container.ports.some(port => 
            port.containerPort === requiredPort
          );
        });
      });
    }

    return matchingPods;
  } catch (error) {
    console.error(`Error finding pods by service: ${error.message || error}`);
    return [];
  }
}

async function getPodsInNamespace(namespace) {
  const command = `kubectl get pods -n ${namespace} --chunk-size=5 -o json`;
  try {
    const { stdout } = await execAsync(command);
    return JSON.parse(stdout);
  } catch (error) {
    console.error(`Error fetching pods for namespace ${namespace}:`, error);
    return { items: [] }; // fail gracefully
  }
}

async function fetchPodsInParallel(namespaces){
  const podLists = await Promise.all(namespaces.map(ns => getPodsInNamespace(ns)));
  return podLists.flatMap(podList => podList.items);
}

/**
 * Get all pods in a namespace
 * @param {string} namespace - The namespace to get pods from
 * @returns {Promise<object>} - Promise that resolves with pods data
 */
async function getPods(namespace) {
  // First check if the namespace exists
  try {
    const res = await k8sApi.readNamespace({name: namespace});

    if (!res.metadata.name) {
      throw new Error('Namespace not found or malformed response');
    }
  } catch (nsError) {
    console.error(`Namespace check failed: ${nsError.message}`);
    throw {
      status: 404,
      message: `Namespace '${namespace}' not found or not accessible`,
      details: nsError.message
    };
  }

  return await k8sApi.listNamespacedPod({namespace});
}

/**
 * Get details of a specific pod
 * @param {string} namespace - The namespace the pod is in
 * @param {string} podName - The name of the pod
 * @returns {Promise<object>} - Promise that resolves with pod details
 */
async function getPodDetails(namespace, podName) {
  const res = await k8sApi.readNamespacedPod({name: podName, namespace});
  return res.body;
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

  // Get the service name for the pod
  let serviceName = await getServiceForPod(namespace, podName);

  // If no service found, use the pod name directly
  if (!serviceName) {
    console.warn(`No service found for pod ${podName} in namespace ${namespace}. Using pod name directly.`);

    // Start port forwarding in the background using pod name
    const command = `kubectl port-forward -n ${namespace} pod/${podName} ${localPort}:${podPort} > /dev/null 2>&1 &`;
    await executeKubectlCommand(command);

    // Save the configuration with pod name but without service name
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

  // Start port forwarding in the background using pod name
  const command = `kubectl port-forward -n ${namespace} pod/${podName} ${localPort}:${podPort} > /dev/null 2>&1 &`;
  await executeKubectlCommand(command);

  // Save the configuration with both service name and pod name
  const config = {
    namespace,
    serviceName,
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
      serviceName,
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
async function stopPortForwarding(localPort, removeConfig = true) {
  // Find and kill the process using the local port
  const command = `lsof -ti:${localPort} | xargs kill -9`;
  await executeKubectlCommand(command);

  // Remove the configuration
  removeConfig && await configService.removeConfiguration(localPort);

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
    kubectlCommand = `kubectl exec -n ${namespace} ${podName} -c ${containerName} -- sh -c '${command.replace(/'/g, `'\\''`)}'`;
  } else {
    // Otherwise, let kubectl choose the default container
    kubectlCommand = `kubectl exec -n ${namespace} ${podName} -- sh -c '${command.replace(/'/g, `'\\''`)}'`;
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
// Parallelize port forwarding for all configurations
    await Promise.all(configurations.map(async (config) => {
      try {
        // Check if port is already in use
        try {
          await execPromiseWithOptions(`lsof -i:${config.localPort}`);
          console.log(`Local port ${config.localPort} is already in use, skipping...`);
          return;
        } catch (error) {
          // Port is not in use, which is good
        }

        // If we have a service name, use it to find a suitable pod
        if (config.serviceName) {
          try {
            // Find pods that belong to this service and expose the required port
            const pods = await findPodsByService(config.namespace, config.serviceName, config.podPort);

            if (pods.length === 0) {
              console.error(`No pods found for service ${config.serviceName} with port ${config.podPort} in namespace ${config.namespace}`);
              return;
            }

            // Use the first available pod
            const pod = pods[0];
            const podName = pod.metadata.name;

            // Start port forwarding in the background
            const command = `kubectl port-forward -n ${config.namespace} pod/${podName} ${config.localPort}:${config.podPort} > /dev/null 2>&1 &`;
            await executeKubectlCommand(command);
            console.log(`Started port forwarding: ${config.namespace}/${config.serviceName} (pod: ${podName}) ${config.localPort}:${config.podPort}`);
          } catch (serviceError) {
            console.error(`Error finding pods for service ${config.serviceName}:`, serviceError);

            // Fall back to using the saved pod name if available
            if (config.podName) {
              try {
                const command = `kubectl port-forward -n ${config.namespace} pod/${config.podName} ${config.localPort}:${config.podPort} > /dev/null 2>&1 &`;
                await executeKubectlCommand(command);
                console.log(`Fallback: Started port forwarding using saved pod name: ${config.namespace}/${config.podName} ${config.localPort}:${config.podPort}`);
              } catch (podError) {
                console.error(`Error applying configuration using fallback pod ${config.podName}:`, podError);
              }
            }
          }
        } else if (config.podName) {
          // If we don't have a service name but have a pod name, use it directly
          const command = `kubectl port-forward -n ${config.namespace} pod/${config.podName} ${config.localPort}:${config.podPort} > /dev/null 2>&1 &`;
          await executeKubectlCommand(command);
          console.log(`Started port forwarding: ${config.namespace}/${config.podName} ${config.localPort}:${config.podPort}`);
        } else {
          console.error(`Configuration missing both serviceName and podName: ${JSON.stringify(config)}`);
        }
      } catch (error) {
        console.error(`Error applying configuration:`, error);
      }
    }));
    // for (const config of configurations) {
    //   try {
    //     // Check if port is already in use
    //     try {
    //       await execPromiseWithOptions(`lsof -i:${config.localPort}`);
    //       console.log(`Local port ${config.localPort} is already in use, skipping...`);
    //       continue;
    //     } catch (error) {
    //       // Port is not in use, which is good
    //     }
    //
    //     // If we have a service name, use it to find a suitable pod
    //     if (config.serviceName) {
    //       try {
    //         // Find pods that belong to this service and expose the required port
    //         const pods = await findPodsByService(config.namespace, config.serviceName, config.podPort);
    //
    //         if (pods.length === 0) {
    //           console.error(`No pods found for service ${config.serviceName} with port ${config.podPort} in namespace ${config.namespace}`);
    //           continue;
    //         }
    //
    //         // Use the first available pod
    //         const pod = pods[0];
    //         const podName = pod.metadata.name;
    //
    //         // Start port forwarding in the background
    //         const command = `kubectl port-forward -n ${config.namespace} pod/${podName} ${config.localPort}:${config.podPort} > /dev/null 2>&1 &`;
    //         await executeKubectlCommand(command);
    //         console.log(`Started port forwarding: ${config.namespace}/${config.serviceName} (pod: ${podName}) ${config.localPort}:${config.podPort}`);
    //       } catch (serviceError) {
    //         console.error(`Error finding pods for service ${config.serviceName}:`, serviceError);
    //
    //         // Fall back to using the saved pod name if available
    //         if (config.podName) {
    //           try {
    //             const command = `kubectl port-forward -n ${config.namespace} pod/${config.podName} ${config.localPort}:${config.podPort} > /dev/null 2>&1 &`;
    //             await executeKubectlCommand(command);
    //             console.log(`Fallback: Started port forwarding using saved pod name: ${config.namespace}/${config.podName} ${config.localPort}:${config.podPort}`);
    //           } catch (podError) {
    //             console.error(`Error applying configuration using fallback pod ${config.podName}:`, podError);
    //           }
    //         }
    //       }
    //     } else if (config.podName) {
    //       // If we don't have a service name but have a pod name, use it directly
    //       const command = `kubectl port-forward -n ${config.namespace} pod/${config.podName} ${config.localPort}:${config.podPort} > /dev/null 2>&1 &`;
    //       await executeKubectlCommand(command);
    //       console.log(`Started port forwarding: ${config.namespace}/${config.podName} ${config.localPort}:${config.podPort}`);
    //     } else {
    //       console.error(`Configuration missing both serviceName and podName: ${JSON.stringify(config)}`);
    //     }
    //   } catch (error) {
    //     console.error(`Error applying configuration:`, error);
    //   }
    // }
  } catch (error) {
    console.error('Error applying configurations:', error);
  }
}

module.exports = {
  getPods,
  getPodDetails,
  getServices,
  getServiceForPod,
  findPodsByService,
  checkPortAvailability,
  startPortForwarding,
  stopPortForwarding,
  executeCommand,
  applyConfigurations
};
