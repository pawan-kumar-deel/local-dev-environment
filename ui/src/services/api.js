import axios from 'axios';
const API_URL = 'http://localhost:884';
const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});
export const getPods = async (namespace) => {
    try {
        const response = await api.get(`/api/pods/${namespace}`);
        return response.data.items || [];
    }
    catch (error) {
        if (axios.isAxiosError(error) && error.response) {
            // Handle structured error responses from our API
            const errorData = error.response.data;
            console.error('Error fetching pods:', errorData.error, errorData.details || '');
            // Rethrow with more detailed message for the UI to display
            throw new Error(errorData.error || 'Failed to fetch pods');
        }
        else {
            // Handle network errors or other unexpected errors
            console.error('Error fetching pods:', error);
            // throw new Error('Connection error. Please check if the backend server is running.');
        }
    }
};
export const getPodDetails = async (namespace, podName) => {
    try {
        const response = await api.get(`/api/pods/${namespace}/${podName}`);
        return response.data;
    }
    catch (error) {
        console.error('Error fetching pod details:', error);
        return null;
    }
};
export const checkPortAvailability = async (localPort) => {
    try {
        const response = await api.get(`/api/portforward/check/${localPort}`);
        return response.data;
    }
    catch (error) {
        console.error('Error checking port availability:', error);
        // If there's an error, assume the port is not available
        return { available: false };
    }
};
export const startPortForwarding = async (namespace, podName, podPort, localPort, force = false) => {
    try {
        const response = await api.post(`/api/pods/${namespace}/${podName}/portforward`, {
            podPort,
            localPort,
            force
        });
        return {
            success: true,
            message: response.data.message
        };
    }
    catch (error) {
        console.error('Error starting port forwarding:', error);
        if (axios.isAxiosError(error) && error.response) {
            return {
                success: false,
                error: error.response.data.error,
                processInfo: error.response.data.processInfo
            };
        }
        return {
            success: false,
            error: 'Failed to start port forwarding'
        };
    }
};
export const stopPortForwarding = async (localPort) => {
    try {
        await api.delete(`/api/portforward/${localPort}`);
        return true;
    }
    catch (error) {
        console.error('Error stopping port forwarding:', error);
        return false;
    }
};
export const getConfigurations = async () => {
    try {
        const response = await api.get('/api/configurations');
        return response.data;
    }
    catch (error) {
        console.error('Error fetching configurations:', error);
        return [];
    }
};
export const getAppSettings = async () => {
    try {
        const response = await api.get('/api/settings');
        return response.data;
    }
    catch (error) {
        console.error('Error fetching application settings:', error);
        // Return default settings if there's an error
        return {
            filterPreference: 'Services with listeners',
            namespace: '',
            refreshInterval: '15s'
        };
    }
};
export const updateAppSettings = async (settings) => {
    try {
        const response = await api.put('/api/settings', settings);
        return response.data;
    }
    catch (error) {
        console.error('Error updating application settings:', error);
        throw error;
    }
};
export const execCommand = async (namespace, podName, command, containerName) => {
    try {
        const response = await api.post(`/api/pods/${namespace}/${podName}/exec`, { command, containerName });
        return response.data;
    }
    catch (error) {
        console.error('Error executing command in pod:', error);
        if (axios.isAxiosError(error) && error.response) {
            return {
                success: false,
                error: error.response.data.error || 'Failed to execute command',
                podName,
                namespace,
                command,
                containerName
            };
        }
        return {
            success: false,
            error: 'Connection error. Please check if the backend server is running.',
            podName,
            namespace,
            command,
            containerName
        };
    }
};
export const getTemplates = async () => {
    try {
        const response = await api.get('/api/templates');
        return response.data;
    }
    catch (error) {
        console.error('Error fetching templates:', error);
        return [];
    }
};
export const saveTemplate = async (name, body = {}) => {
    try {
        const response = await api.post('/api/templates', { name, ...body });
        return {
            success: true,
            message: response.data.message,
            template: response.data.template
        };
    }
    catch (error) {
        console.error('Error saving template:', error);
        if (axios.isAxiosError(error) && error.response) {
            return {
                success: false,
                error: error.response.data.error || 'Failed to save template'
            };
        }
        return {
            success: false,
            error: 'Connection error. Please check if the backend server is running.'
        };
    }
};
export const applyTemplate = async (name) => {
    try {
        const response = await api.post(`/api/templates/${name}/apply`);
        return {
            success: true,
            message: response.data.message,
            template: response.data.template
        };
    }
    catch (error) {
        console.error('Error applying template:', error);
        if (axios.isAxiosError(error) && error.response) {
            return {
                success: false,
                error: error.response.data.error || 'Failed to apply template'
            };
        }
        return {
            success: false,
            error: 'Connection error. Please check if the backend server is running.'
        };
    }
};
export const deleteTemplate = async (name) => {
    try {
        await api.delete(`/api/templates/${name}`);
        window.location.reload(); // Reload the page to reflect changes
        return true;
    }
    catch (error) {
        console.error('Error deleting template:', error);
        return false;
    }
};
/**
 * Get the download URL for a template
 * @param name - The name of the template to download
 * @returns The URL to download the template
 */
export const getTemplateDownloadUrl = (name) => {
    return `${API_URL}/api/templates/${name}/download`;
};
export const getProfiles = async () => {
    try {
        const response = await api.get('/api/profile');
        return response.data;
    }
    catch (error) {
        console.error('Error fetching profiles:', error);
        return [];
    }
};
export const getCurrentProfile = async () => {
    try {
        const response = await api.get('/api/profile/current');
        return response.data;
    }
    catch (error) {
        console.error('Error fetching current profile:', error);
        return null;
    }
};
export const login = async () => {
    try {
        const response = await api.get('/api/profile/login');
        return response.data;
    }
    catch (error) {
        console.error('Error during login:', error);
        return false;
    }
};
