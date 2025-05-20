const app = require('./app');
const { PORT } = require('./config/constants');
const kubectlService = require('./services/kubectlService');

// Start the server
async function startServer() {
  try {
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
      console.log(`Access the API documentation at http://localhost:${PORT}/api`);
    });

    // Apply saved port forwarding configurations
    await kubectlService.applyConfigurations();
  } catch (error) {
    console.error('Error starting server:', error);
    process.exit(1);
  }
}

// Start the server
startServer();