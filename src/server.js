const app = require('./app');
const { PORT } = require('./config/constants');
const kubectlService = require('./services/kubectlService');
const configService = require('./services/configService');

(async function startServer() {
  try {
    const server = app.listen(PORT, async () => {
      console.log(`Server is running on port ${PORT}`);
      console.log(`Access the web interface at http://localhost:${PORT}`);
      console.log(`Access the API documentation at http://localhost:${PORT}/api`);
      const open = (await import('open')).default;
      open(`http://localhost:${PORT}`);
    });

    // Apply saved port forwarding configurations
    await kubectlService.applyConfigurations();

    // Handle graceful shutdown
    process.on('SIGINT', async () => {
      console.log('Shutting down server...');

      try {
        // Get all active port forwarding configurations
        const configurations = await configService.loadConfigurations();
        console.log(`Stopping ${configurations.length} active port forwardings...`);

        // Stop all port forwardings in parallel
        await Promise.all(
            configurations.map(async (config) => {
              try {
                await kubectlService.stopPortForwarding(config.localPort, false);
                console.log(`Stopped port forwarding on local port ${config.localPort}`);
              } catch (error) {
                console.error(`Error stopping port forwarding on port ${config.localPort}:`, error);
              }
            })
        );

        // Close the server
        server.close(() => {
          console.log('Server closed');
          process.exit(0);
        });
      } catch (error) {
        console.error('Error during shutdown:', error);
        process.exit(1);
      }
    });
  } catch (error) {
    console.error('Error starting server:', error);
    process.exit(1);
  }
})();
