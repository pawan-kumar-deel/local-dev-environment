# Deel LDE Management Dashboard

A full-stack application for managing Deel LDEs, including a Node.js Express.js backend API and a React-based UI dashboard. The application allows you to view pods in a namespace, get pod details, and set up port forwarding.

## Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- kubectl configured with access to a Kubernetes cluster

## Installation

1. Clone the repository:
   ```
   git clone <repository-url>
   cd local-dev-environment
   ```

2. Install dependencies:
   ```
   npm run setup
   ```

## Usage

### Start the Backend Server

```
npm start
```

For development with auto-restart:
```
npm run dev
```

The server will start on port 884 by default. You can change this by setting the PORT environment variable.

### Start the UI Development Server

```
npm run ui:dev
```

The UI will be available at http://localhost:5173 by default.

### Run Both Backend and UI Together

```
npm run dev:all
```

This will start both the backend server and the UI development server concurrently.

### Build the UI for Production

```
npm run ui:build
```

The built files will be in the `ui/dist` directory.

### Testing the API

A test script is provided to verify that the API is working correctly:

```
npm test
```

Before running the test, you may want to configure the test parameters in `src/test.js`:

```javascript
const NAMESPACE = 'default'; // Change this to your target namespace
const POD_NAME = ''; // Change this to a pod name in your namespace
const POD_PORT = 8080; // Change this to the port your pod exposes
const LOCAL_PORT = 8888; // Change this to the local port you want to use
```

## API Endpoints

### Get all pods in a namespace

```
GET /api/pods/:namespace
```

Example:
```
GET /api/pods/default
```

### Get details of a specific pod

```
GET /api/pods/:namespace/:podName
```

Example:
```
GET /api/pods/default/my-pod
```

### Port forward a pod's port to the local machine

```
POST /api/pods/:namespace/:podName/portforward
```

Request body:
```json
{
  "podPort": 8080,
  "localPort": 8080
}
```

Example:
```
POST /api/pods/default/my-pod/portforward
```

### Stop port forwarding

```
DELETE /api/portforward/:localPort
```

Example:
```
DELETE /api/portforward/8080
```

## API Documentation

Access the API documentation by visiting the root endpoint:

```
GET /
```

## UI Dashboard

The application includes a modern UI dashboard built with React, TypeScript, and Material UI.

### Starting the UI

1. Install UI dependencies:
   ```
   cd ui
   npm install
   ```

2. Start the UI development server:
   ```
   npm run dev
   ```

   The UI will be available at http://localhost:5173 by default.

### UI Features

- **Namespace Selection**: Enter a giger namespace and save it to local storage
- **Pod List**: View all pods in the selected namespace
- **Pod Details**: See pod information including name, status, and exposed ports
- **Port Forwarding**: Forward pod ports to your local machine with a simple form
- **Configuration Persistence**: Port forwarding configurations are saved and automatically applied when the server restarts

## Implementation Details

- **Backend**:
  - The backend uses the `kubectl` command-line tool to interact with the Kubernetes cluster.
  - Port forwarding is implemented using the `kubectl port-forward` command.
  - The server uses Express.js for handling HTTP requests.
  - CORS is enabled for cross-origin requests.
  - Port forwarding configurations are saved to a JSON file and loaded on startup.

- **Frontend**:
  - Built with React and TypeScript using Vite.js
  - Material UI for a responsive, modern interface
  - Modular component architecture
  - Local storage for persisting user preferences
  - Axios for API communication
