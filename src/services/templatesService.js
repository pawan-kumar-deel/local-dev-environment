const fs = require('fs');
const path = require('path');
const fsPromises = fs.promises;
const configService = require('./configService');

// Define the templates directory
const TEMPLATES_DIR = path.join(__dirname, '../../templates');

/**
 * Ensure the templates directory exists
 * @returns {Promise<void>}
 */
async function ensureTemplatesDir() {
  try {
    await fsPromises.access(TEMPLATES_DIR);
  } catch (error) {
    // Directory doesn't exist, create it
    await fsPromises.mkdir(TEMPLATES_DIR, { recursive: true });
    console.log(`Created templates directory at ${TEMPLATES_DIR}`);
  }
}

/**
 * Save current port forwarding configuration as a template
 * @param {string} templateName - The name of the template
 * @returns {Promise<object>} - Promise that resolves with the saved template
 */
async function saveTemplate(templateName) {
  try {
    await ensureTemplatesDir();

    // Get current configurations
    const configurations = await configService.loadConfigurations();

    if (configurations.length === 0) {
      throw new Error('No active port forwarding configurations to save as template');
    }

    // Create template object with configurations but without namespace
    const configurationsWithoutNamespace = configurations.map(config => {
      const { namespace, ...configWithoutNamespace } = config;
      return configWithoutNamespace;
    });

    const template = {
      name: templateName,
      createdAt: new Date().toISOString(),
      configurations: configurationsWithoutNamespace
    };

    // Save template to file
    const templatePath = path.join(TEMPLATES_DIR, `${templateName}.json`);
    await fsPromises.writeFile(templatePath, JSON.stringify(template, null, 2), 'utf8');

    return template;
  } catch (error) {
    console.error('Error saving template:', error);
    throw error;
  }
}

/**
 * Get all saved templates
 * @returns {Promise<Array>} - Promise that resolves with all templates
 */
async function getTemplates() {
  try {
    await ensureTemplatesDir();

    // Read all files in templates directory
    const files = await fsPromises.readdir(TEMPLATES_DIR);
    const templateFiles = files.filter(file => file.endsWith('.json'));

    // Read and parse each template file
    const templates = [];
    for (const file of templateFiles) {
      try {
        const templatePath = path.join(TEMPLATES_DIR, file);
        const data = await fsPromises.readFile(templatePath, 'utf8');
        const template = JSON.parse(data);
        templates.push(template);
      } catch (error) {
        console.error(`Error reading template file ${file}:`, error);
      }
    }

    return templates;
  } catch (error) {
    console.error('Error getting templates:', error);
    return [];
  }
}

/**
 * Apply a template
 * @param {string} templateName - The name of the template to apply
 * @param {string} namespace - The namespace to use for all configurations
 * @returns {Promise<object>} - Promise that resolves with the applied template
 */
async function applyTemplate(templateName, namespace) {
  try {
    await ensureTemplatesDir();

    // Read template file
    const templatePath = path.join(TEMPLATES_DIR, `${templateName}.json`);
    const data = await fsPromises.readFile(templatePath, 'utf8');
    const template = JSON.parse(data);

    // Save configurations from template, using the provided namespace
    for (const config of template.configurations) {
      // Add the namespace to the configuration
      const configWithNamespace = {
        ...config,
        namespace
      };
      await configService.saveConfiguration(configWithNamespace);
    }

    return template;
  } catch (error) {
    console.error('Error applying template:', error);
    throw error;
  }
}

/**
 * Delete a template
 * @param {string} templateName - The name of the template to delete
 * @returns {Promise<boolean>} - Promise that resolves with success status
 */
async function deleteTemplate(templateName) {
  try {
    await ensureTemplatesDir();

    // Delete template file
    const templatePath = path.join(TEMPLATES_DIR, `${templateName}.json`);
    await fsPromises.unlink(templatePath);

    return true;
  } catch (error) {
    console.error('Error deleting template:', error);
    return false;
  }
}

module.exports = {
  saveTemplate,
  getTemplates,
  applyTemplate,
  deleteTemplate
};
