import { useState, useEffect } from 'react';
import type { Pod, PortForwardConfig } from '../types';
import { startPortForwardingWithMutate, stopPortForwardingWithMutate } from '../services/hooks';

interface PortInput {
  podPort: string;
  localPort: string;
}

interface ActionStatus {
  success: boolean;
  message: string;
}

interface UsePortForwardingResult {
  portInputs: Record<string, PortInput>;
  actionStatus: Record<string, ActionStatus>;
  handleInputChange: (podName: string, field: 'podPort' | 'localPort', value: string) => void;
  handlePortForward: (namespace: string, podName: string) => Promise<void>;
  handleStopPortForward: (podName: string) => Promise<void>;
  clearActionStatus: (podName: string) => void;
  getPortForwardConfig: (podName: string) => PortForwardConfig | undefined;
}

/**
 * Custom hook for managing port forwarding operations
 * @param configurations The list of port forwarding configurations
 * @param namespace The current namespace
 * @param refreshConfigurations Function to refresh configurations
 * @returns Port forwarding state and handlers
 */
export const usePortForwarding = (
  configurations: PortForwardConfig[] | undefined,
  namespace: string,
  refreshConfigurations: () => Promise<any>
): UsePortForwardingResult => {
  const [portInputs, setPortInputs] = useState<Record<string, PortInput>>({});
  const [actionStatus, setActionStatus] = useState<Record<string, ActionStatus>>({});
  const [portForwardConfigs, setPortForwardConfigs] = useState<Record<string, PortForwardConfig>>({});

  // Initialize port forward configs when configurations change
  useEffect(() => {
    if (!configurations) return;

    const configMap: Record<string, PortForwardConfig> = {};
    configurations.forEach(config => {
      if (config.namespace === namespace) {
        configMap[config.podName] = config;
      }
    });
    setPortForwardConfigs(configMap);

    // Initialize port inputs with existing configurations
    const inputs: Record<string, PortInput> = {};
    Object.entries(configMap).forEach(([podName, config]) => {
      inputs[podName] = {
        podPort: config.podPort.toString(),
        localPort: config.localPort.toString()
      };
    });

    setPortInputs(prevInputs => ({
      ...prevInputs,
      ...inputs
    }));
  }, [configurations, namespace]);

  const handleInputChange = (podName: string, field: 'podPort' | 'localPort', value: string) => {
    setPortInputs(prev => ({
      ...prev,
      [podName]: {
        ...prev[podName] || { podPort: '', localPort: '' },
        [field]: value
      }
    }));
  };

  const handlePortForward = async (namespace: string, podName: string) => {
    const input = portInputs[podName];
    if (!input || !input.podPort || !input.localPort) {
      setActionStatus({
        ...actionStatus,
        [podName]: { success: false, message: 'Please enter both pod port and local port' }
      });
      return;
    }

    try {
      const success = await startPortForwardingWithMutate(
        namespace,
        podName,
        parseInt(input.podPort),
        parseInt(input.localPort),
        refreshConfigurations
      );

      if (success) {
        setActionStatus({
          ...actionStatus,
          [podName]: { success: true, message: 'Port forwarding started successfully' }
        });
      } else {
        setActionStatus({
          ...actionStatus,
          [podName]: { success: false, message: 'Failed to start port forwarding' }
        });
      }
    } catch (err) {
      setActionStatus({
        ...actionStatus,
        [podName]: { success: false, message: 'Error starting port forwarding' }
      });
      console.error(err);
    }
  };

  const handleStopPortForward = async (podName: string) => {
    const config = portForwardConfigs[podName];
    if (!config) return;

    try {
      const success = await stopPortForwardingWithMutate(config.localPort, refreshConfigurations);
      if (success) {
        setActionStatus({
          ...actionStatus,
          [podName]: { success: true, message: 'Port forwarding stopped successfully' }
        });
      } else {
        setActionStatus({
          ...actionStatus,
          [podName]: { success: false, message: 'Failed to stop port forwarding' }
        });
      }
    } catch (err) {
      setActionStatus({
        ...actionStatus,
        [podName]: { success: false, message: 'Error stopping port forwarding' }
      });
      console.error(err);
    }
  };

  const clearActionStatus = (podName: string) => {
    const newStatus = { ...actionStatus };
    delete newStatus[podName];
    setActionStatus(newStatus);
  };

  const getPortForwardConfig = (podName: string) => {
    return portForwardConfigs[podName];
  };

  return {
    portInputs,
    actionStatus,
    handleInputChange,
    handlePortForward,
    handleStopPortForward,
    clearActionStatus,
    getPortForwardConfig
  };
};