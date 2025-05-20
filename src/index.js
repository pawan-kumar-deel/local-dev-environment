const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { exec } = require('child_process');
const { promisify } = require('util');
const fs = require('fs');
const path = require('path');
// Create a custom promisified version of exec with increased maxBuffer
const execPromiseWithOptions = (command, options = {}) => {
  return new Promise((resolve, reject) => {
    exec(command, { maxBuffer: 10 * 1024 * 1024, ...options }, (error, stdout, stderr) => {
      if (error) {
        reject(error);
        return;
      }
      resolve({ stdout, stderr });
    });
  });
};

const execPromise = promisify(exec);
const fsPromises = fs.promises;

const app = express();
const PORT = process.env.PORT || 3000;
const CONFIG_FILE = path.join(__dirname, 'port-forwarding-config.json');
const APP_CONFIG_FILE = path.join(__dirname, 'config.json');

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Helper function to execute kubectl commands with retries
async function executeKubectlCommand(command, retries = 3, delay = 1000) {
  let lastError;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      // Use the custom execPromiseWithOptions with increased maxBuffer
      const { stdout, stderr } = await execPromiseWithOptions(command);
      if (stderr && !stderr.includes('Warning')) {
        throw new Error(stderr);
      }
      return stdout;
    } catch (error) {
      console.error(`Error executing command (attempt ${attempt}/${retries}): ${command}`, error);
      lastError = error;

      // If this is not the last attempt, wait before retrying
      if (attempt < retries) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  // If we've exhausted all retries, throw the last error
  throw new Error(`Failed after ${retries} attempts: ${lastError.message}`);
}

// Helper functions for configuration management
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

async function applyConfigurations() {
  try {
    const configurations = await loadConfigurations();
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

// Helper functions for application settings management
async function loadAppSettings() {
  try {
    try {
      const data = await fsPromises.readFile(APP_CONFIG_FILE, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      // File doesn't exist or is invalid, return default settings
      const defaultSettings = {
        filterPreference: "Services with exposed ports",
        namespace: ""
      };
      await saveAppSettings(defaultSettings);
      return defaultSettings;
    }
  } catch (error) {
    console.error('Error loading application settings:', error);
    throw error;
  }
}

async function saveAppSettings(settings) {
  try {
    await fsPromises.writeFile(APP_CONFIG_FILE, JSON.stringify(settings, null, 2), 'utf8');
    return settings;
  } catch (error) {
    console.error('Error saving application settings:', error);
    throw error;
  }
}

// API Routes

// Get all pods in a namespace
app.get('/api/pods/:namespace', async (req, res) => {
  try {
    const { namespace } = req.params;

    // First check if the namespace exists
    try {
      const namespaceCommand = `kubectl get namespace ${namespace} -o name`;
      await executeKubectlCommand(namespaceCommand, 2, 500);
    } catch (nsError) {
      console.error(`Namespace check failed: ${nsError.message}`);
      return res.status(404).json({ 
        error: `Namespace '${namespace}' not found or not accessible`,
        details: nsError.message
      });
    }

    // If namespace exists, get pods
    const command = `kubectl get pods -n ${namespace} -o json`;
    const output = await executeKubectlCommand(command);
    const pods = JSON.parse(output);
    res.json(pods);
  } catch (error) {
    console.error(`Error fetching pods: ${error.message}`);
    res.status(500).json({ 
      error: `Failed to fetch pods in namespace '${req.params.namespace}'`,
      details: error.message
    });
  }
});

// Get details of a specific pod
app.get('/api/pods/:namespace/:podName', async (req, res) => {
  try {
    const { namespace, podName } = req.params;
    const command = `kubectl get pod ${podName} -n ${namespace} -o json`;
    const output = await executeKubectlCommand(command);
    const podDetails = JSON.parse(output);
    res.json(podDetails);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Port forward a pod's port to the local machine
app.post('/api/pods/:namespace/:podName/portforward', async (req, res) => {
  try {
    const { namespace, podName } = req.params;
    const { podPort, localPort } = req.body;

    if (!podPort || !localPort) {
      return res.status(400).json({ error: 'podPort and localPort are required' });
    }

    // Check if the port is already in use
    try {
      await execPromiseWithOptions(`lsof -i:${localPort}`);
      return res.status(400).json({ error: `Local port ${localPort} is already in use` });
    } catch (error) {
      // Port is not in use, which is good
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

    await saveConfiguration(config);

    res.json({ 
      message: 'Port forwarding started successfully', 
      details: {
        namespace,
        podName,
        podPort,
        localPort,
        url: `http://localhost:${localPort}`
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Stop port forwarding
app.delete('/api/portforward/:localPort', async (req, res) => {
  try {
    const { localPort } = req.params;

    // Find and kill the process using the local port
    const command = `lsof -ti:${localPort} | xargs kill -9`;
    await executeKubectlCommand(command);

    // Remove the configuration from the saved configurations
    try {
      const configurations = await loadConfigurations();
      const updatedConfigurations = configurations.filter(config => config.localPort !== parseInt(localPort));
      await fsPromises.writeFile(CONFIG_FILE, JSON.stringify(updatedConfigurations, null, 2), 'utf8');
    } catch (error) {
      console.error('Error updating configurations:', error);
    }

    res.json({ message: `Port forwarding on local port ${localPort} stopped successfully` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all saved port forwarding configurations
app.get('/api/configurations', async (req, res) => {
  try {
    const configurations = await loadConfigurations();
    res.json(configurations);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get application settings
app.get('/api/settings', async (req, res) => {
  try {
    const settings = await loadAppSettings();
    res.json(settings);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update application settings
app.put('/api/settings', async (req, res) => {
  try {
    const { filterPreference, namespace } = req.body;
    const currentSettings = await loadAppSettings();

    const updatedSettings = {
      ...currentSettings,
      ...(filterPreference !== undefined && { filterPreference }),
      ...(namespace !== undefined && { namespace })
    };

    await saveAppSettings(updatedSettings);
    res.json(updatedSettings);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Deel LDE Management API',
    endpoints: [
      { method: 'GET', path: '/api/pods/:namespace', description: 'Get all pods in a namespace' },
      { method: 'GET', path: '/api/pods/:namespace/:podName', description: 'Get details of a specific pod' },
      { method: 'POST', path: '/api/pods/:namespace/:podName/portforward', description: 'Port forward a pod port to local machine' },
      { method: 'DELETE', path: '/api/portforward/:localPort', description: 'Stop port forwarding on a local port' },
      { method: 'GET', path: '/api/configurations', description: 'Get all saved port forwarding configurations' },
      { method: 'GET', path: '/api/settings', description: 'Get application settings' },
      { method: 'PUT', path: '/api/settings', description: 'Update application settings' }
    ]
  });
});

// Start the server
app.listen(PORT, async () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Access the API documentation at http://localhost:${PORT}`);

  // Apply saved port forwarding configurations
  await applyConfigurations();
});
