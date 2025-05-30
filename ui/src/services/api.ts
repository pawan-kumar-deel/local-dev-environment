import axios from 'axios';
import type {AppSettings, Pod, PodList, PortForwardConfig, Template} from '../types';

const API_URL = 'http://localhost:884';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const getPods = async (namespace: string): Promise<Pod[]> => {
  try {
    const response = await api.get<PodList>(`/api/pods/${namespace}`);
    return response.data.items || [];
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      // Handle structured error responses from our API
      const errorData = error.response.data;
      console.error('Error fetching pods:', errorData.error, errorData.details || '');

      // Rethrow with more detailed message for the UI to display
      throw new Error(errorData.error || 'Failed to fetch pods');
    } else {
      // Handle network errors or other unexpected errors
      console.error('Error fetching pods:', error);
      // throw new Error('Connection error. Please check if the backend server is running.');
    }
  }
};

export const getPodDetails = async (namespace: string, podName: string): Promise<Pod | null> => {
  try {
    const response = await api.get<Pod>(`/api/pods/${namespace}/${podName}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching pod details:', error);
    return null;
  }
};

export interface PortAvailabilityResult {
  available: boolean;
  processInfo?: {
    pid: string;
    command: string;
    user: string;
  };
}

export const checkPortAvailability = async (localPort: number): Promise<PortAvailabilityResult> => {
  try {
    const response = await api.get<PortAvailabilityResult>(`/api/portforward/check/${localPort}`);
    return response.data;
  } catch (error) {
    console.error('Error checking port availability:', error);
    // If there's an error, assume the port is not available
    return { available: false };
  }
};

export interface PortForwardingResult {
  success: boolean;
  message?: string;
  error?: string;
  processInfo?: {
    pid: string;
    command: string;
    user: string;
  };
}

export const startPortForwarding = async (
  namespace: string,
  podName: string,
  podPort: number,
  localPort: number,
  force: boolean = false
): Promise<PortForwardingResult> => {
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
  } catch (error) {
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

export const stopPortForwarding = async (localPort: number): Promise<boolean> => {
  try {
    await api.delete(`/api/portforward/${localPort}`);
    return true;
  } catch (error) {
    console.error('Error stopping port forwarding:', error);
    return false;
  }
};

export const getConfigurations = async (): Promise<PortForwardConfig[]> => {
  try {
    const response = await api.get<PortForwardConfig[]>('/api/configurations');
    return response.data;
  } catch (error) {
    console.error('Error fetching configurations:', error);
    return [];
  }
};

export const getAppSettings = async (): Promise<AppSettings> => {
  try {
    const response = await api.get<AppSettings>('/api/settings');
    return response.data;
  } catch (error) {
    console.error('Error fetching application settings:', error);
    // Return default settings if there's an error
    return {
      filterPreference: 'Services with listeners',
      namespace: '',
      refreshInterval: '15s'
    };
  }
};

export const updateAppSettings = async (settings: Partial<AppSettings>): Promise<AppSettings> => {
  try {
    const response = await api.put<AppSettings>('/api/settings', settings);
    return response.data;
  } catch (error) {
    console.error('Error updating application settings:', error);
    throw error;
  }
};

interface ExecCommandResponse {
  success: boolean;
  output?: string;
  error?: string;
  podName: string;
  namespace: string;
  command: string;
  containerName?: string;
}

export const execCommand = async (
  namespace: string,
  podName: string,
  command: string,
  containerName?: string
): Promise<ExecCommandResponse> => {
  try {
    const response = await api.post<ExecCommandResponse>(
      `/api/pods/${namespace}/${podName}/exec`,
      { command, containerName }
    );
    return response.data;
  } catch (error) {
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

export const getTemplates = async (): Promise<Template[]> => {
  try {
    const response = await api.get<Template[]>('/api/templates');
    return response.data;
  } catch (error) {
    console.error('Error fetching templates:', error);
    return [];
  }
};

export interface SaveTemplateResult {
  success: boolean;
  message?: string;
  error?: string;
  template?: Template;
}

export const saveTemplate = async (name: string, body = {}): Promise<SaveTemplateResult> => {
  try {
    const response = await api.post('/api/templates', { name, ...body });
    return {
      success: true,
      message: response.data.message,
      template: response.data.template
    };
  } catch (error) {
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

export interface ApplyTemplateResult {
  success: boolean;
  message?: string;
  error?: string;
  template?: Template;
}

export const applyTemplate = async (name: string): Promise<ApplyTemplateResult> => {
  try {
    const response = await api.post(`/api/templates/${name}/apply`);
    return {
      success: true,
      message: response.data.message,
      template: response.data.template
    };
  } catch (error) {
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

export const deleteTemplate = async (name: string): Promise<boolean> => {
  try {
    await api.delete(`/api/templates/${name}`);
    window.location.reload(); // Reload the page to reflect changes
    return true;
  } catch (error) {
    console.error('Error deleting template:', error);
    return false;
  }
};

/**
 * Get the download URL for a template
 * @param name - The name of the template to download
 * @returns The URL to download the template
 */
export const getTemplateDownloadUrl = (name: string): string => {
  return `${API_URL}/api/templates/${name}/download`;
};

export const getProfiles = async (): Promise<string[]> => {
  try {
    const response = await api.get<string[]>('/api/profile');
    return response.data;
  } catch (error) {
    console.error('Error fetching profiles:', error);
    return [];
  }
}

export const getCurrentProfile = async (): Promise<string | null> => {
  try {
    const response = await api.get<string>('/api/profile/current');
    return response.data;
  } catch (error) {
    console.error('Error fetching current profile:', error);
    return null;
  }
}

export const login = async (): Promise<boolean> => {
  try {
    const response = await api.get('/api/profile/login');
    return response.data;
  } catch (error) {
    console.error('Error during login:', error);
    return false;
  }
}