import React, {useEffect, useRef, useState} from 'react';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Backdrop,
  Box,
  Card,
  CardContent,
  CircularProgress,
  FormControl,
  Grid,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  type SelectChangeEvent,
  Tooltip,
  Typography,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import RefreshIcon from '@mui/icons-material/Refresh';
import StopIcon from '@mui/icons-material/Stop';
import type {Pod} from '../types';
import {updateAppSettingsWithMutate, useAppSettings, useConfigurations, usePods} from '../services/hooks';

// Import custom components
import PodCard from './pods/PodCard';
import EnvironmentVariablesPopover from './pods/EnvironmentVariablesPopover';
import TerminalDialog from './pods/TerminalDialog';
import PrintEnvPopover from './pods/PrintEnvPopover';
import ConfirmationPopover from './common/ConfirmationPopover';

// Import custom hooks
import {usePodFiltering} from '../hooks/usePodFiltering';
import {usePortForwarding} from '../hooks/usePortForwarding';
import {useTerminalCommands} from '../hooks/useTerminalCommands';
import {useEnvironmentVariables} from '../hooks/useEnvironmentVariables';
import {usePrintEnv} from '../hooks/usePrintEnv';

interface PodListProps {
  namespace: string;
}

const PodList: React.FC<PodListProps> = ({ namespace }) => {
  // Use SWR hooks for data fetching
  const { pods: allPods, isLoading: podsLoading, isError: podsError, mutate: refreshPods } = usePods(namespace);
  const { configurations, isLoading: configsLoading, mutate: refreshConfigurations } = useConfigurations();
  const { settings, mutate: refreshSettings } = useAppSettings();

  // State for stop all confirmation popover and loading state
  const [stopAllAnchorEl, setStopAllAnchorEl] = useState<HTMLElement | null>(null);
  const [isStoppingAllForwards, setIsStoppingAllForwards] = useState<boolean>(false);
  const [isLoadingEnvVars, setIsLoadingEnvVars] = useState<boolean>(false);

  // Use custom hooks for state management
  const { filteredPods, filterPreference, setFilterPreference } = usePodFiltering(allPods, settings?.filterPreference);
  const { 
    portInputs, 
    actionStatus, 
    handleInputChange, 
    handlePortForward: startPortForward, 
    handleStopPortForward: stopPortForward, 
    handleForcePortForward: forcePortForward,
    handleStopAllPortForwards,
    clearActionStatus,
    getPortForwardConfig,
    hasActiveForwards
  } = usePortForwarding(configurations, namespace, refreshConfigurations);

  const {
    terminalDialogOpen,
    currentPod: terminalPod,
    selectedPodName,
    availablePods,
    isExecuting,
    terminalCommand,
    terminalHistory,
    openTerminal,
    closeTerminal,
    setTerminalCommand,
    executeCommand,
    changePod
  } = useTerminalCommands();

  const {
    envVarsAnchorEl,
    currentPod: envVarsPod,
    filteredEnvVars,
    searchTerm: envVarSearch,
    handleEnvVarsClick,
    handleEnvVarsClose,
    handleSearchChange: handleEnvVarSearchChange
  } = useEnvironmentVariables();

  const {
    printEnvAnchorEl,
    currentPod: printEnvPod,
    printEnvOutput,
    searchTerm: printEnvSearch,
    handlePrintEnvClick,
    handlePrintEnvClose,
    handleSearchChange: handlePrintEnvSearchChange
  } = usePrintEnv();

  // Convert refresh interval string to milliseconds
  const getRefreshIntervalMs = (interval: string): number => {
    if (interval === '1m') return 60 * 1000;
    const seconds = parseInt(interval.replace('s', ''));
    return seconds * 1000;
  };

  // Set up auto-refresh interval
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

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
  const handleFilterChange = async (event: SelectChangeEvent<string>) => {
    const newFilterPreference = event.target.value as typeof filterPreference;
    setFilterPreference(newFilterPreference);

    // Save the preference to the backend
    try {
      await updateAppSettingsWithMutate({ filterPreference: newFilterPreference }, refreshSettings);
    } catch (err) {
      console.error('Failed to update filter preference:', err);
    }
  };

  // Wrapper functions for port forwarding
  const handlePortForward = (podName: string) => {
    return startPortForward(namespace, podName);
  };

  const handleStopPortForward = (podName: string) => {
    return stopPortForward(podName);
  };

  const handleActionStatusClose = (podName: string) => {
    clearActionStatus(podName);
  };

  // Separate pods into active forwards and available
  const separatePods = () => {
    if (!filteredPods && !allPods) return { activeForwards: [], available: [] };

    const activeForwards: Pod[] = [];
    const available: Pod[] = [];

    // Create a map of all pods by name for quick lookup
    const allPodsMap = new Map<string, Pod>();
    if (allPods) {
      allPods.forEach(pod => {
        allPodsMap.set(pod.metadata.name, pod);
      });
    }

    // First, add all pods from the current namespace to the appropriate array
    if (filteredPods) {
      filteredPods.forEach(pod => {
        if (getPortForwardConfig(pod.metadata.labels?.app ?? pod.metadata.name)) {
          pod.metadata.name = pod.metadata.labels?.app ?? pod.metadata.name;
          activeForwards.push(pod);
        } else {
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
        if (activePodNames.has(config.podName)) return;

        // Try to find the actual pod in allPods
        const actualPod = allPodsMap.get(config.podName);

        if (actualPod) {
          // Use the actual pod if found
          activeForwards.push(actualPod);
        } else {
          // // Create a dummy pod object for this active forward as fallback
          // const dummyPod: Pod = {
          //   metadata: {
          //     name: config.podName,
          //     namespace: config.namespace,
          //     uid: `dummy-${config.podName}`,
          //     creationTimestamp: config.createdAt,
          //     labels: {}
          //   },
          //   spec: {
          //     containers: [{
          //       name: 'dummy-container',
          //       image: 'dummy-image'
          //     }]
          //   },
          //   status: {
          //     phase: 'Unknown',
          //     conditions: []
          //   }
          // };
          //
          // // Add the dummy pod to the activeForwards array
          // activeForwards.push(dummyPod);
        }
      });
    }

    return { activeForwards, available };
  };

  // Always get active forwards and available pods
  const { activeForwards, available } = separatePods();

  console.log({ activeForwards, available });

  // Render main content
  const mainContent = (
    <Card elevation={3} sx={{ width: '100%', minWidth: '500px', overflow:'auto', flexGrow: 1, border: 'mediumpurple 1px solid' }}>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h5">
            Services
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <FormControl sx={{ minWidth: 200, mr: 1 }} size="small">
              <InputLabel id="filter-preference-label">Filter</InputLabel>
              <Select
                labelId="filter-preference-label"
                value={filterPreference}
                onChange={handleFilterChange}
                label="Filter"
              >
                <MenuItem value="Services with listeners">Services with listeners</MenuItem>
                <MenuItem value="All services">All services</MenuItem>
              </Select>
            </FormControl>
            <Tooltip title="Refresh pods">
              <IconButton onClick={() => refreshPods()} color="primary">
                <RefreshIcon />
              </IconButton>
            </Tooltip>
            {hasActiveForwards && (
              <Tooltip title="Stop all port forwards">
                <IconButton 
                  onClick={(e) => setStopAllAnchorEl(e.currentTarget)} 
                  color="error"
                  sx={{ ml: 1 }}
                >
                  <StopIcon />
                </IconButton>
              </Tooltip>
            )}
          </Box>
        </Box>

        {/* Active Forwards Section */}
        <Accordion defaultExpanded sx={{ mb: 2 }}>
          <AccordionSummary
            expandIcon={<ExpandMoreIcon />}
            aria-controls="active-forwards-content"
            id="active-forwards-header"
          >
            <Typography variant="h6">Active Forwards</Typography>
          </AccordionSummary>
          <AccordionDetails>
            {activeForwards.length > 0 ? (
              <Grid container spacing={3}>
                {activeForwards.map((pod) => (
                    <PodCard
                      pod={pod}
                      portForwardConfig={getPortForwardConfig(pod.metadata.name)}
                      actionStatus={actionStatus[pod.metadata.name]}
                      portInputs={portInputs[pod.metadata.name] || { podPort: '', localPort: '' }}
                      onPortInputChange={(field, value) => handleInputChange(pod.metadata.name, field, value)}
                      onPortForward={() => handlePortForward(pod.metadata.name)}
                      onStopPortForward={() => handleStopPortForward(pod.metadata.name)}
                      onForcePortForward={() => forcePortForward(pod.metadata.namespace, pod.metadata.name)}
                      onEnvVarsClick={(e) => handleEnvVarsClick(e, pod)}
                      onPrintEnvClick={(e) => handlePrintEnvClick(e, pod)}
                      onTerminalClick={(e) => {
                        // Find all pods with the same app label
                        const appLabel = pod.metadata.labels?.app;
                        const podsInService = appLabel 
                          ? filteredPods.filter(p => p.metadata.labels?.app === appLabel)
                          : [pod]; // If no app label, just use this pod

                        openTerminal(pod, podsInService);
                      }}
                      onActionStatusClose={() => handleActionStatusClose(pod.metadata.name)}
                      currentNamespace={namespace}
                    />
                ))}
              </Grid>
            ) : (
              <Box sx={{ textAlign: 'center', p: 2 }}>
                <Typography variant="body1">No active forwards</Typography>
              </Box>
            )}
          </AccordionDetails>
        </Accordion>

        {/* Available Section */}
        <Accordion defaultExpanded>
          <AccordionSummary
            expandIcon={<ExpandMoreIcon />}
            aria-controls="available-content"
            id="available-header"
          >
            <Typography variant="h6">Available</Typography>
          </AccordionSummary>
          <AccordionDetails>
            {podsLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                <CircularProgress />
              </Box>
            ) : podsError ? (
              <Box sx={{ p: 2 }}>
                <Alert severity="error">
                  {podsError instanceof Error ? podsError.message : 'Failed to fetch pods. Please try again.'}
                </Alert>
              </Box>
            ) : !allPods || allPods.length === 0 ? (
              <Box sx={{ textAlign: 'center', p: 2 }}>
                <Typography variant="body1">No pods found in namespace: {namespace}</Typography>
              </Box>
            ) : available.length > 0 ? (
              <Grid container spacing={3}>
                {available.map((pod) => (
                    <PodCard
                      pod={pod}
                      portForwardConfig={getPortForwardConfig(pod.metadata.name)}
                      actionStatus={actionStatus[pod.metadata.name]}
                      portInputs={portInputs[pod.metadata.name] || { podPort: '', localPort: '' }}
                      onPortInputChange={(field, value) => handleInputChange(pod.metadata.name, field, value)}
                      onPortForward={() => handlePortForward(pod.metadata.name)}
                      onStopPortForward={() => handleStopPortForward(pod.metadata.name)}
                      onForcePortForward={() => forcePortForward(pod.metadata.namespace, pod.metadata.name)}
                      onEnvVarsClick={(e) => handleEnvVarsClick(e, pod)}
                      onPrintEnvClick={(e) => handlePrintEnvClick(e, pod)}
                      onTerminalClick={(e) => {
                        // Find all pods with the same app label
                        const appLabel = pod.metadata.labels?.app;
                        const podsInService = appLabel 
                          ? filteredPods.filter(p => p.metadata.labels?.app === appLabel)
                          : [pod]; // If no app label, just use this pod

                        openTerminal(pod, podsInService);
                      }}
                      onActionStatusClose={() => handleActionStatusClose(pod.metadata.name)}
                      currentNamespace={namespace}
                    />
                ))}
              </Grid>
            ) : (
              <Box sx={{ textAlign: 'center', p: 2 }}>
                <Typography variant="body1">No available services</Typography>
              </Box>
            )}
          </AccordionDetails>
        </Accordion>
      </CardContent>
    </Card>
  );

  return (
    <>
      {/* Main component content */}
      <Box sx={{ display: 'flex', flexDirection: 'column', flexGrow: 1, width: '100%' }}>
        {mainContent}
      </Box>

      {/* Environment Variables Popover */}
      <EnvironmentVariablesPopover
        open={Boolean(envVarsAnchorEl)}
        anchorEl={envVarsAnchorEl}
        onClose={handleEnvVarsClose}
        pod={envVarsPod}
        title="Environment Variables"
      />

      {/* Terminal Command Dialog */}
      <TerminalDialog
        open={terminalDialogOpen}
        onClose={closeTerminal}
        pod={terminalPod}
        availablePods={availablePods}
        selectedPodName={selectedPodName}
        isExecuting={isExecuting}
        onExecuteCommand={executeCommand}
        onChangePod={changePod}
        commandHistory={terminalHistory}
      />

      {/* PrintEnv Command Popover */}
      <PrintEnvPopover
        open={Boolean(printEnvAnchorEl)}
        anchorEl={printEnvAnchorEl}
        onClose={handlePrintEnvClose}
        pod={printEnvPod}
        envVars={printEnvOutput}
        onSearchChange={handlePrintEnvSearchChange}
        searchTerm={printEnvSearch}
      />

      {/* Stop All Confirmation Popover */}
      <ConfirmationPopover
        open={Boolean(stopAllAnchorEl)}
        anchorEl={stopAllAnchorEl}
        onClose={() => setStopAllAnchorEl(null)}
        onConfirm={() => {
          setStopAllAnchorEl(null);
          setIsStoppingAllForwards(true);
          handleStopAllPortForwards().finally(() => {
            setIsStoppingAllForwards(false);
          });
        }}
        title="Stop All Port Forwards"
        message="Are you sure you want to stop all active port forwards?"
        confirmText="Stop All"
        cancelText="Cancel"
      />

      {/* Progress Overlay for stopping all port forwards */}
      <Backdrop
        sx={{ 
          color: '#fff', 
          zIndex: (theme) => theme.zIndex.drawer + 1,
          flexDirection: 'column',
          gap: 2
        }}
        open={isStoppingAllForwards}
      >
        <CircularProgress color="inherit" />
        <Typography variant="h6">
          Stopping all port forwards...
        </Typography>
      </Backdrop>
    </>
  );
};

export default PodList;
