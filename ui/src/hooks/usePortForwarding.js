import { useState, useEffect } from 'react';
import { startPortForwardingWithMutate, stopPortForwardingWithMutate, checkPortAvailabilityWithMutate } from '../services/hooks';
/**
 * Custom hook for managing port forwarding operations
 * @param configurations The list of port forwarding configurations
 * @param namespace The current namespace
 * @param refreshConfigurations Function to refresh configurations
 * @returns Port forwarding state and handlers
 */
export const usePortForwarding = (configurations, namespace, refreshConfigurations) => {
    const [portInputs, setPortInputs] = useState({});
    const [actionStatus, setActionStatus] = useState({});
    const [portForwardConfigs, setPortForwardConfigs] = useState({});
    // Initialize port forward configs when configurations change
    useEffect(() => {
        if (!configurations)
            return;
        const configMap = {};
        configurations.forEach(config => {
            // Include all configurations, regardless of namespace
            // Use podName as the key for backward compatibility
            configMap[config.podName] = config;
        });
        setPortForwardConfigs(configMap);
        // Initialize port inputs with existing configurations
        const inputs = {};
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
    }, [configurations]);
    const handleInputChange = (podName, field, value) => {
        setPortInputs(prev => ({
            ...prev,
            [podName]: {
                ...prev[podName] || { podPort: '', localPort: '' },
                [field]: value
            }
        }));
    };
    const handlePortForward = async (namespace, podName) => {
        const input = portInputs[podName];
        if (!input || !input.podPort || !input.localPort) {
            setActionStatus({
                ...actionStatus,
                [podName]: { success: false, message: 'Please enter both pod port and local port' }
            });
            return;
        }
        // Set loading state
        setActionStatus({
            ...actionStatus,
            [podName]: {
                success: false,
                message: 'Checking port availability...',
                isLoading: true
            }
        });
        try {
            // First check if the port is available
            const localPort = parseInt(input.localPort);
            const portCheck = await checkPortAvailabilityWithMutate(localPort);
            if (!portCheck.available) {
                // Port is in use, show warning
                setActionStatus({
                    ...actionStatus,
                    [podName]: {
                        success: false,
                        message: `Local port ${localPort} is already in use by ${portCheck.processInfo?.command || 'another process'}`,
                        isLoading: false,
                        isPortInUse: true,
                        processInfo: portCheck.processInfo
                    }
                });
                return;
            }
            // Port is available, proceed with port forwarding
            const result = await startPortForwardingWithMutate(namespace, podName, parseInt(input.podPort), localPort, () => Promise.resolve() // No-op function that returns a resolved promise
            );
            if (result.success) {
                setActionStatus({
                    ...actionStatus,
                    [podName]: {
                        success: true,
                        message: result.message || 'Port forwarding started successfully',
                        isLoading: false
                    }
                });
                // Refresh configurations to update UI immediately
                refreshConfigurations();
            }
            else {
                setActionStatus({
                    ...actionStatus,
                    [podName]: {
                        success: false,
                        message: result.error || 'Failed to start port forwarding',
                        isLoading: false
                    }
                });
            }
        }
        catch (err) {
            setActionStatus({
                ...actionStatus,
                [podName]: {
                    success: false,
                    message: err instanceof Error ? err.message : 'Error starting port forwarding',
                    isLoading: false
                }
            });
            console.error(err);
        }
    };
    const handleForcePortForward = async (namespace, podName) => {
        const input = portInputs[podName];
        if (!input || !input.podPort || !input.localPort) {
            setActionStatus({
                ...actionStatus,
                [podName]: { success: false, message: 'Please enter both pod port and local port' }
            });
            return;
        }
        // Set loading state
        setActionStatus({
            ...actionStatus,
            [podName]: {
                success: false,
                message: 'Forcing port forwarding...',
                isLoading: true
            }
        });
        try {
            // Force port forwarding by killing existing process
            const result = await startPortForwardingWithMutate(namespace, podName, parseInt(input.podPort), parseInt(input.localPort), () => Promise.resolve(), // No-op function that returns a resolved promise
            true // force = true
            );
            if (result.success) {
                setActionStatus({
                    ...actionStatus,
                    [podName]: {
                        success: true,
                        message: result.message || 'Port forwarding started successfully',
                        isLoading: false
                    }
                });
                // Refresh configurations to update UI immediately
                refreshConfigurations();
            }
            else {
                setActionStatus({
                    ...actionStatus,
                    [podName]: {
                        success: false,
                        message: result.error || 'Failed to force port forwarding',
                        isLoading: false
                    }
                });
            }
        }
        catch (err) {
            setActionStatus({
                ...actionStatus,
                [podName]: {
                    success: false,
                    message: err instanceof Error ? err.message : 'Error forcing port forwarding',
                    isLoading: false
                }
            });
            console.error(err);
        }
    };
    const handleStopPortForward = async (podName) => {
        const config = portForwardConfigs[podName];
        if (!config)
            return;
        try {
            const success = await stopPortForwardingWithMutate(config.localPort, refreshConfigurations);
            if (success) {
                setActionStatus({
                    ...actionStatus,
                    [podName]: { success: true, message: 'Port forwarding stopped successfully' }
                });
            }
            else {
                setActionStatus({
                    ...actionStatus,
                    [podName]: { success: false, message: 'Failed to stop port forwarding' }
                });
            }
        }
        catch (err) {
            setActionStatus({
                ...actionStatus,
                [podName]: { success: false, message: 'Error stopping port forwarding' }
            });
            console.error(err);
        }
    };
    const clearActionStatus = (podName) => {
        const newStatus = { ...actionStatus };
        delete newStatus[podName];
        setActionStatus(newStatus);
    };
    const getPortForwardConfig = (podName) => {
        return portForwardConfigs[podName];
    };
    const handleStopAllPortForwards = async () => {
        if (!configurations || configurations.length === 0)
            return;
        try {
            // Stop all port forwards one by one
            const promises = configurations.map(config => stopPortForwardingWithMutate(config.localPort, refreshConfigurations));
            await Promise.all(promises);
            // Clear all action statuses
            setActionStatus({});
            // Refresh configurations to update UI
            await refreshConfigurations();
        }
        catch (err) {
            console.error('Error stopping all port forwards:', err);
        }
    };
    // Check if there are any active forwards
    const hasActiveForwards = configurations ? configurations.length > 0 : false;
    return {
        portInputs,
        actionStatus,
        handleInputChange,
        handlePortForward,
        handleStopPortForward,
        handleForcePortForward,
        handleStopAllPortForwards,
        clearActionStatus,
        getPortForwardConfig,
        hasActiveForwards
    };
};
