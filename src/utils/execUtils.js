const { exec } = require('child_process');
const { promisify } = require('util');

/**
 * Create a custom promisified version of exec with increased maxBuffer
 * @param {string} command - The command to execute
 * @param {object} options - Options for the exec function
 * @returns {Promise<{stdout: string, stderr: string}>} - Promise that resolves with stdout and stderr
 */
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

/**
 * Standard promisified version of exec
 */
const execPromise = promisify(exec);

/**
 * Execute kubectl command with retries
 * @param {string} command - The kubectl command to execute
 * @param {number} retries - Number of retries
 * @param {number} delay - Delay between retries in milliseconds
 * @returns {Promise<string>} - Promise that resolves with command output
 */
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

module.exports = {
  execPromiseWithOptions,
  execPromise,
  executeKubectlCommand
};