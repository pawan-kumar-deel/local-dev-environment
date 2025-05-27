const { execPromiseWithOptions } = require('../utils/execUtils');
const fs = require('fs');
const os = require('os');
const path = require('path');

/**
 * Get AWS profiles from kubectl config
 * @returns {Promise<string[]>} - Promise that resolves with an array of AWS profile names
 */
async function getAwsProfiles() {
  try {
    // Check if ~/.aws/config exists
    const awsConfigPath = path.join(os.homedir(), '.aws', 'config');
    
    if (!fs.existsSync(awsConfigPath)) {
      return [];
    }
    
    // Read the config file
    const configContent = fs.readFileSync(awsConfigPath, 'utf8');
    
    // Extract profile names using regex
    const profileRegex = /\[profile\s+([^\]]+)\]/g;
    const matches = [...configContent.matchAll(profileRegex)];
    
    // Extract profile names from matches
    return matches.map(match => match[1]);
  } catch (error) {
    console.error('Error getting AWS profiles:', error);
    return [];
  }
}

/**
 * Get AWS caller identity using the specified profile
 * @param {string} profile - AWS profile name
 * @returns {Promise<object|null>} - Promise that resolves with caller identity or null if not logged in
 */
async function getAwsCallerIdentity(profile) {
  try {
    const { stdout } = await execPromiseWithOptions(`aws sts get-caller-identity --profile ${profile}`);
    return JSON.parse(stdout);
  } catch (error) {
    console.error(`Error getting AWS caller identity for profile ${profile}:`, error);
    return null;
  }
}

/**
 * Login to AWS SSO using the specified profile
 * @param {string} profile - AWS profile name
 * @returns {Promise<{success: boolean, message: string}>} - Promise that resolves with login result
 */
async function loginToAwsSso(profile) {
  try {
    const { stdout, stderr } = await execPromiseWithOptions(`aws sso login --profile ${profile}`);
    return {
      success: true,
      message: stdout || 'Login successful'
    };
  } catch (error) {
    console.error(`Error logging in to AWS SSO for profile ${profile}:`, error);
    return {
      success: false,
      message: error.message || 'Login failed'
    };
  }
}

module.exports = {
  getAwsProfiles,
  getAwsCallerIdentity,
  loginToAwsSso
};