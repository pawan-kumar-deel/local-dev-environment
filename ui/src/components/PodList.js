import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React, { useEffect, useRef, useState } from 'react';
import { Typography, Box, CircularProgress, Alert, Card, CardContent, Select, MenuItem, FormControl, InputLabel, IconButton, Tooltip, Grid, Accordion, AccordionSummary, AccordionDetails, Backdrop, } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import RefreshIcon from '@mui/icons-material/Refresh';
import StopIcon from '@mui/icons-material/Stop';
import { usePods, useConfigurations, useAppSettings, updateAppSettingsWithMutate } from '../services/hooks';
// Import custom components
import PodCard from './pods/PodCard';
import EnvironmentVariablesPopover from './pods/EnvironmentVariablesPopover';
import TerminalDialog from './pods/TerminalDialog';
import PrintEnvPopover from './pods/PrintEnvPopover';
import ConfirmationPopover from './common/ConfirmationPopover';
// Import custom hooks
import { usePodFiltering } from '../hooks/usePodFiltering';
import { usePortForwarding } from '../hooks/usePortForwarding';
import { useTerminalCommands } from '../hooks/useTerminalCommands';
import { useEnvironmentVariables } from '../hooks/useEnvironmentVariables';
import { usePrintEnv } from '../hooks/usePrintEnv';
const PodList = ({ namespace }) => {
    // Use SWR hooks for data fetching
    const { pods: allPods, isLoading: podsLoading, isError: podsError, mutate: refreshPods } = usePods(namespace);
    const { configurations, isLoading: configsLoading, mutate: refreshConfigurations } = useConfigurations();
    const { settings, mutate: refreshSettings } = useAppSettings();
    // State for stop all confirmation popover and loading state
    const [stopAllAnchorEl, setStopAllAnchorEl] = useState(null);
    const [isStoppingAllForwards, setIsStoppingAllForwards] = useState(false);
    // Use custom hooks for state management
    const { filteredPods, filterPreference, setFilterPreference } = usePodFiltering(allPods, settings?.filterPreference);
    const { portInputs, actionStatus, handleInputChange, handlePortForward: startPortForward, handleStopPortForward: stopPortForward, handleForcePortForward: forcePortForward, handleStopAllPortForwards, clearActionStatus, getPortForwardConfig, hasActiveForwards } = usePortForwarding(configurations, namespace, refreshConfigurations);
    const { terminalDialogOpen, currentPod: terminalPod, selectedPodName, availablePods, isExecuting, terminalCommand, terminalHistory, openTerminal, closeTerminal, setTerminalCommand, executeCommand, changePod } = useTerminalCommands();
    const { envVarsAnchorEl, currentPod: envVarsPod, filteredEnvVars, searchTerm: envVarSearch, handleEnvVarsClick, handleEnvVarsClose, handleSearchChange: handleEnvVarSearchChange } = useEnvironmentVariables();
    const { printEnvAnchorEl, currentPod: printEnvPod, printEnvOutput, searchTerm: printEnvSearch, handlePrintEnvClick, handlePrintEnvClose, handleSearchChange: handlePrintEnvSearchChange } = usePrintEnv();
    // Convert refresh interval string to milliseconds
    const getRefreshIntervalMs = (interval) => {
        if (interval === '1m')
            return 60 * 1000;
        const seconds = parseInt(interval.replace('s', ''));
        return seconds * 1000;
    };
    // Set up auto-refresh interval
    const intervalRef = useRef(null);
    useEffect(() => {
        // Clear any existing interval
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }
        // Set up new interval if we have a valid refresh interval
        if (settings?.refreshInterval) {
            const intervalMs = getRefreshIntervalMs(settings.refreshInterval);
            intervalRef.current = setInterval(() => {
                console.log(`Auto-refreshing data (interval: ${settings.refreshInterval})`);
                refreshPods();
                refreshConfigurations();
            }, intervalMs);
        }
        // Clean up on unmount
        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
        };
    }, [settings?.refreshInterval, refreshPods, refreshConfigurations]);
    // Handle filter preference change
    const handleFilterChange = async (event) => {
        const newFilterPreference = event.target.value;
        setFilterPreference(newFilterPreference);
        // Save the preference to the backend
        try {
            await updateAppSettingsWithMutate({ filterPreference: newFilterPreference }, refreshSettings);
        }
        catch (err) {
            console.error('Failed to update filter preference:', err);
        }
    };
    // Wrapper functions for port forwarding
    const handlePortForward = (podName) => {
        return startPortForward(namespace, podName);
    };
    const handleStopPortForward = (podName) => {
        return stopPortForward(podName);
    };
    const handleActionStatusClose = (podName) => {
        clearActionStatus(podName);
    };
    // Separate pods into active forwards and available
    const separatePods = () => {
        if (!filteredPods && !allPods)
            return { activeForwards: [], available: [] };
        const activeForwards = [];
        const available = [];
        // Create a map of all pods by name for quick lookup
        const allPodsMap = new Map();
        if (allPods) {
            allPods.forEach(pod => {
                allPodsMap.set(pod.metadata.name, pod);
            });
        }
        // First, add all pods from the current namespace to the appropriate array
        if (filteredPods) {
            filteredPods.forEach(pod => {
                if (getPortForwardConfig(pod.metadata.name)) {
                    activeForwards.push(pod);
                }
                else {
                    available.push(pod);
                }
            });
        }
        // Then, add all active forwards from other namespaces
        if (configurations) {
            // Create a set of pod names that are already in the activeForwards array
            const activePodNames = new Set(activeForwards.map(pod => pod.metadata.name));
            // Add active forwards from other namespaces
            configurations.forEach(config => {
                // Skip if this pod is already in the activeForwards array
                if (activePodNames.has(config.podName))
                    return;
                // Try to find the actual pod in allPods
                const actualPod = allPodsMap.get(config.podName);
                if (actualPod) {
                    // Use the actual pod if found
                    activeForwards.push(actualPod);
                }
                else {
                    // Create a dummy pod object for this active forward as fallback
                    const dummyPod = {
                        metadata: {
                            name: config.podName,
                            namespace: config.namespace,
                            uid: `dummy-${config.podName}`,
                            creationTimestamp: config.createdAt,
                            labels: {}
                        },
                        spec: {
                            containers: [{
                                    name: 'dummy-container',
                                    image: 'dummy-image'
                                }]
                        },
                        status: {
                            phase: 'Unknown',
                            conditions: []
                        }
                    };
                    // Add the dummy pod to the activeForwards array
                    activeForwards.push(dummyPod);
                }
            });
        }
        return { activeForwards, available };
    };
    // Always get active forwards and available pods
    const { activeForwards, available } = separatePods();
    // Render main content
    const mainContent = (_jsx(Card, { elevation: 3, sx: { width: '100%', minWidth: '500px', overflow: 'auto', flexGrow: 1, border: 'mediumpurple 1px solid' }, children: _jsxs(CardContent, { children: [_jsxs(Box, { sx: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }, children: [_jsx(Typography, { variant: "h5", children: "Services" }), _jsxs(Box, { sx: { display: 'flex', alignItems: 'center' }, children: [_jsxs(FormControl, { sx: { minWidth: 200, mr: 1 }, size: "small", children: [_jsx(InputLabel, { id: "filter-preference-label", children: "Filter" }), _jsxs(Select, { labelId: "filter-preference-label", value: filterPreference, onChange: handleFilterChange, label: "Filter", children: [_jsx(MenuItem, { value: "Services with listeners", children: "Services with listeners" }), _jsx(MenuItem, { value: "All services", children: "All services" })] })] }), _jsx(Tooltip, { title: "Refresh pods", children: _jsx(IconButton, { onClick: () => refreshPods(), color: "primary", children: _jsx(RefreshIcon, {}) }) }), hasActiveForwards && (_jsx(Tooltip, { title: "Stop all port forwards", children: _jsx(IconButton, { onClick: (e) => setStopAllAnchorEl(e.currentTarget), color: "error", sx: { ml: 1 }, children: _jsx(StopIcon, {}) }) }))] })] }), _jsxs(Accordion, { defaultExpanded: true, sx: { mb: 2 }, children: [_jsx(AccordionSummary, { expandIcon: _jsx(ExpandMoreIcon, {}), "aria-controls": "active-forwards-content", id: "active-forwards-header", children: _jsx(Typography, { variant: "h6", children: "Active Forwards" }) }), _jsx(AccordionDetails, { children: activeForwards.length > 0 ? (_jsx(Grid, { container: true, spacing: 3, children: activeForwards.map((pod) => (_jsx(PodCard, { pod: pod, portForwardConfig: getPortForwardConfig(pod.metadata.name), actionStatus: actionStatus[pod.metadata.name], portInputs: portInputs[pod.metadata.name] || { podPort: '', localPort: '' }, onPortInputChange: (field, value) => handleInputChange(pod.metadata.name, field, value), onPortForward: () => handlePortForward(pod.metadata.name), onStopPortForward: () => handleStopPortForward(pod.metadata.name), onForcePortForward: () => forcePortForward(pod.metadata.namespace, pod.metadata.name), onEnvVarsClick: (e) => handleEnvVarsClick(e, pod), onPrintEnvClick: (e) => handlePrintEnvClick(e, pod), onTerminalClick: (e) => {
                                        // Find all pods with the same app label
                                        const appLabel = pod.metadata.labels?.app;
                                        const podsInService = appLabel
                                            ? filteredPods.filter(p => p.metadata.labels?.app === appLabel)
                                            : [pod]; // If no app label, just use this pod
                                        openTerminal(pod, podsInService);
                                    }, onActionStatusClose: () => handleActionStatusClose(pod.metadata.name), currentNamespace: namespace }))) })) : (_jsx(Box, { sx: { textAlign: 'center', p: 2 }, children: _jsx(Typography, { variant: "body1", children: "No active forwards" }) })) })] }), _jsxs(Accordion, { defaultExpanded: true, children: [_jsx(AccordionSummary, { expandIcon: _jsx(ExpandMoreIcon, {}), "aria-controls": "available-content", id: "available-header", children: _jsx(Typography, { variant: "h6", children: "Available" }) }), _jsx(AccordionDetails, { children: podsLoading ? (_jsx(Box, { sx: { display: 'flex', justifyContent: 'center', p: 3 }, children: _jsx(CircularProgress, {}) })) : podsError ? (_jsx(Box, { sx: { p: 2 }, children: _jsx(Alert, { severity: "error", children: podsError instanceof Error ? podsError.message : 'Failed to fetch pods. Please try again.' }) })) : !allPods || allPods.length === 0 ? (_jsx(Box, { sx: { textAlign: 'center', p: 2 }, children: _jsxs(Typography, { variant: "body1", children: ["No pods found in namespace: ", namespace] }) })) : available.length > 0 ? (_jsx(Grid, { container: true, spacing: 3, children: available.map((pod) => (_jsx(PodCard, { pod: pod, portForwardConfig: getPortForwardConfig(pod.metadata.name), actionStatus: actionStatus[pod.metadata.name], portInputs: portInputs[pod.metadata.name] || { podPort: '', localPort: '' }, onPortInputChange: (field, value) => handleInputChange(pod.metadata.name, field, value), onPortForward: () => handlePortForward(pod.metadata.name), onStopPortForward: () => handleStopPortForward(pod.metadata.name), onForcePortForward: () => forcePortForward(pod.metadata.namespace, pod.metadata.name), onEnvVarsClick: (e) => handleEnvVarsClick(e, pod), onPrintEnvClick: (e) => handlePrintEnvClick(e, pod), onTerminalClick: (e) => {
                                        // Find all pods with the same app label
                                        const appLabel = pod.metadata.labels?.app;
                                        const podsInService = appLabel
                                            ? filteredPods.filter(p => p.metadata.labels?.app === appLabel)
                                            : [pod]; // If no app label, just use this pod
                                        openTerminal(pod, podsInService);
                                    }, onActionStatusClose: () => handleActionStatusClose(pod.metadata.name), currentNamespace: namespace }))) })) : (_jsx(Box, { sx: { textAlign: 'center', p: 2 }, children: _jsx(Typography, { variant: "body1", children: "No available services" }) })) })] })] }) }));
    return (_jsxs(_Fragment, { children: [_jsx(Box, { sx: { display: 'flex', flexDirection: 'column', flexGrow: 1, width: '100%' }, children: mainContent }), _jsx(EnvironmentVariablesPopover, { open: Boolean(envVarsAnchorEl), anchorEl: envVarsAnchorEl, onClose: handleEnvVarsClose, pod: envVarsPod, title: "Environment Variables" }), _jsx(TerminalDialog, { open: terminalDialogOpen, onClose: closeTerminal, pod: terminalPod, availablePods: availablePods, selectedPodName: selectedPodName, isExecuting: isExecuting, onExecuteCommand: executeCommand, onChangePod: changePod, commandHistory: terminalHistory }), _jsx(PrintEnvPopover, { open: Boolean(printEnvAnchorEl), anchorEl: printEnvAnchorEl, onClose: handlePrintEnvClose, pod: printEnvPod, envVars: printEnvOutput, onSearchChange: handlePrintEnvSearchChange, searchTerm: printEnvSearch }), _jsx(ConfirmationPopover, { open: Boolean(stopAllAnchorEl), anchorEl: stopAllAnchorEl, onClose: () => setStopAllAnchorEl(null), onConfirm: () => {
                    setStopAllAnchorEl(null);
                    setIsStoppingAllForwards(true);
                    handleStopAllPortForwards().finally(() => {
                        setIsStoppingAllForwards(false);
                    });
                }, title: "Stop All Port Forwards", message: "Are you sure you want to stop all active port forwards?", confirmText: "Stop All", cancelText: "Cancel" }), _jsxs(Backdrop, { sx: {
                    color: '#fff',
                    zIndex: (theme) => theme.zIndex.drawer + 1,
                    flexDirection: 'column',
                    gap: 2
                }, open: isStoppingAllForwards, children: [_jsx(CircularProgress, { color: "inherit" }), _jsx(Typography, { variant: "h6", children: "Stopping all port forwards..." })] })] }));
};
export default PodList;
