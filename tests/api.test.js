/**
 * API Tests for the Deel LDE Management API
 *
 * This file contains Jest tests for the API endpoints.
 * Make sure the server is running before executing these tests.
 */

const http = require('http');
// Configuration
const API_HOST = 'localhost';
const API_PORT = 3000;
const NAMESPACE = 'default'; // Change this to your target namespace
const POD_NAME = ''; // Change this to a pod name in your namespace
const POD_PORT = 8080; // Change this to the port your pod exposes
const LOCAL_PORT = 8888; // Change this to the local port you want to use

// Helper function to make HTTP requests
function makeRequest(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: API_HOST,
      port: API_PORT,
      path,
      method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    const req = http.request(options, (res) => {
      let responseData = '';

      res.on('data', (chunk) => {
        responseData += chunk;
      });

      res.on('end', () => {
        try {
          const parsedData = JSON.parse(responseData);
          resolve({ statusCode: res.statusCode, data: parsedData });
        } catch (e) {
          resolve({ statusCode: res.statusCode, data: responseData });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (data) {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
}

// Check if the server is running before starting tests
async function checkServerConnection() {
  try {
    await makeRequest('GET', '/api');
    return true;
  } catch (error) {
    return false;
  }
}

// Jest tests
describe('Deel LDE Management API', () => {
  beforeAll(async () => {
    const isServerRunning = await checkServerConnection();
    if (!isServerRunning) {
      console.error(`Server is not running at http://${API_HOST}:${API_PORT}`);
      console.log('Please start the server with: npm start');
      throw new Error('Server is not running');
    }
  });

  test('Root endpoint should return API documentation', async () => {
    const response = await makeRequest('GET', '/api');
    expect(response.statusCode).toBe(200);
    expect(response.data.message).toBe('Deel LDE Management API');
    expect(response.data.endpoints).toBeDefined();
    expect(Array.isArray(response.data.endpoints)).toBe(true);
  });

  test('Get pods in namespace should return pods or error', async () => {
    const response = await makeRequest('GET', `/api/pods/${NAMESPACE}`);
    
    // Either we get a successful response with pods or an error if namespace doesn't exist
    if (response.statusCode === 200) {
      expect(response.data.items).toBeDefined();
      expect(Array.isArray(response.data.items)).toBe(true);
    } else {
      expect(response.statusCode).toBe(404);
      expect(response.data.error).toBeDefined();
    }
  }, 10000); // Increase timeout for this test

  // Only run pod-specific tests if POD_NAME is provided
  if (POD_NAME) {
    test('Get pod details should return pod information', async () => {
      const response = await makeRequest('GET', `/api/pods/${NAMESPACE}/${POD_NAME}`);
      expect(response.statusCode).toBe(200);
      expect(response.data.metadata).toBeDefined();
      expect(response.data.metadata.name).toBe(POD_NAME);
      expect(response.data.metadata.namespace).toBe(NAMESPACE);
    });

    test('Port forwarding should start and stop successfully', async () => {
      // Start port forwarding
      const startResponse = await makeRequest('POST', `/api/pods/${NAMESPACE}/${POD_NAME}/portforward`, {
        podPort: POD_PORT,
        localPort: LOCAL_PORT
      });
      
      // If port is already in use, this might fail
      if (startResponse.statusCode === 200) {
        expect(startResponse.data.message).toBe('Port forwarding started successfully');
        expect(startResponse.data.details).toBeDefined();
        expect(startResponse.data.details.url).toBe(`http://localhost:${LOCAL_PORT}`);

        // Wait a bit before stopping
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Stop port forwarding
        const stopResponse = await makeRequest('DELETE', `/api/portforward/${LOCAL_PORT}`);
        expect(stopResponse.statusCode).toBe(200);
        expect(stopResponse.data.message).toContain('stopped successfully');
      } else {
        console.log('Port forwarding test skipped - port might be in use');
        expect(startResponse.statusCode).toBe(400);
      }
    });
  }

  test('Get configurations should return an array', async () => {
    const response = await makeRequest('GET', '/api/configurations');
    expect(response.statusCode).toBe(200);
    expect(Array.isArray(response.data)).toBe(true);
  });

  test('Get settings should return settings object', async () => {
    const response = await makeRequest('GET', '/api/settings');
    expect(response.statusCode).toBe(200);
    expect(response.data).toBeDefined();
    expect(response.data.filterPreference).toBeDefined();
  });
});