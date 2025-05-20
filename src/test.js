/**
 * Test script for the Deel LDE Management API
 * 
 * This script tests the API endpoints by making requests to the server.
 * Make sure the server is running before executing this script.
 * 
 * Usage: node src/test.js
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

// Test the API endpoints
async function runTests() {
  console.log('Testing Deel LDE Management API...');
  
  try {
    // Test the root endpoint
    console.log('\n1. Testing root endpoint...');
    const rootResponse = await makeRequest('GET', '/');
    console.log(`Status code: ${rootResponse.statusCode}`);
    console.log('API Documentation:');
    console.log(JSON.stringify(rootResponse.data, null, 2));

    // Test getting pods in a namespace
    console.log('\n2. Testing get pods in namespace...');
    const podsResponse = await makeRequest('GET', `/api/pods/${NAMESPACE}`);
    console.log(`Status code: ${podsResponse.statusCode}`);
    console.log(`Found ${podsResponse.data.items ? podsResponse.data.items.length : 0} pods in namespace ${NAMESPACE}`);
    
    // If a pod name is provided, test getting pod details and port forwarding
    if (POD_NAME) {
      // Test getting pod details
      console.log(`\n3. Testing get pod details for ${POD_NAME}...`);
      const podDetailsResponse = await makeRequest('GET', `/api/pods/${NAMESPACE}/${POD_NAME}`);
      console.log(`Status code: ${podDetailsResponse.statusCode}`);
      console.log('Pod details:');
      console.log(`Name: ${podDetailsResponse.data.metadata?.name}`);
      console.log(`Namespace: ${podDetailsResponse.data.metadata?.namespace}`);
      console.log(`Status: ${podDetailsResponse.data.status?.phase}`);
      
      // Test port forwarding
      console.log(`\n4. Testing port forwarding for ${POD_NAME}...`);
      const portForwardResponse = await makeRequest('POST', `/api/pods/${NAMESPACE}/${POD_NAME}/portforward`, {
        podPort: POD_PORT,
        localPort: LOCAL_PORT
      });
      console.log(`Status code: ${portForwardResponse.statusCode}`);
      console.log('Port forwarding response:');
      console.log(JSON.stringify(portForwardResponse.data, null, 2));
      
      // Wait a bit and then stop port forwarding
      console.log('\nWaiting 5 seconds before stopping port forwarding...');
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      console.log(`\n5. Testing stop port forwarding for port ${LOCAL_PORT}...`);
      const stopPortForwardResponse = await makeRequest('DELETE', `/api/portforward/${LOCAL_PORT}`);
      console.log(`Status code: ${stopPortForwardResponse.statusCode}`);
      console.log('Stop port forwarding response:');
      console.log(JSON.stringify(stopPortForwardResponse.data, null, 2));
    } else {
      console.log('\nSkipping pod details and port forwarding tests because POD_NAME is not set.');
    }
    
    console.log('\nAll tests completed successfully!');
  } catch (error) {
    console.error('Error during tests:', error);
  }
}

// Check if the server is running before starting tests
function checkServerConnection() {
  return new Promise((resolve) => {
    const req = http.request({
      hostname: API_HOST,
      port: API_PORT,
      path: '/',
      method: 'GET',
    }, () => {
      resolve(true);
    });

    req.on('error', () => {
      resolve(false);
    });

    req.end();
  });
}

async function main() {
  console.log(`Checking if server is running at http://${API_HOST}:${API_PORT}...`);
  
  const isServerRunning = await checkServerConnection();
  
  if (isServerRunning) {
    console.log('Server is running. Starting tests...');
    await runTests();
  } else {
    console.error(`Server is not running at http://${API_HOST}:${API_PORT}`);
    console.log('Please start the server with: npm start');
  }
}

main();