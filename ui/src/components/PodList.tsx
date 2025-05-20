import React, { useEffect, useRef } from 'react';
import {
  Typography,
  Box,
  CircularProgress,
  Alert,
  Card,
  CardContent,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  IconButton,
  Tooltip,
  Grid,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  type SelectChangeEvent,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import RefreshIcon from '@mui/icons-material/Refresh';
import type { Pod } from '../types';
import { 
  usePods,
  useConfigurations,
  useAppSettings,
  updateAppSettingsWithMutate
} from '../services/hooks';

// Import custom components
import PodCard from './pods/PodCard';
import EnvironmentVariablesPopover from './pods/EnvironmentVariablesPopover';
import TerminalDialog from './pods/TerminalDialog';
import PrintEnvPopover from './pods/PrintEnvPopover';

// Import custom hooks
import { usePodFiltering } from '../hooks/usePodFiltering';
import { usePortForwarding } from '../hooks/usePortForwarding';
import { useTerminalCommands } from '../hooks/useTerminalCommands';
import { useEnvironmentVariables } from '../hooks/useEnvironmentVariables';
import { usePrintEnv } from '../hooks/usePrintEnv';

interface PodListProps {
  namespace: string;
}

const PodList: React.FC<PodListProps> = ({ namespace }) => {
  // Use SWR hooks for data fetching
  const { pods: allPods, isLoading: podsLoading, isError: podsError, mutate: refreshPods } = usePods(namespace);
  const { configurations, isLoading: configsLoading, mutate: refreshConfigurations } = useConfigurations();
  const { settings, mutate: refreshSettings } = useAppSettings();

  // Use custom hooks for state management
  const { filteredPods, filterPreference, setFilterPreference } = usePodFiltering(allPods, settings?.filterPreference);
  const { 
    portInputs, 
    actionStatus, 
    handleInputChange, 
    handlePortForward: startPortForward, 
    handleStopPortForward: stopPortForward, 
    handleForcePortForward: forcePortForward,
    clearActionStatus,
    getPortForwardConfig
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
    if (!filteredPods) return { activeForwards: [], available: [] };

    const activeForwards: Pod[] = [];
    const available: Pod[] = [];

    filteredPods.forEach(pod => {
      if (getPortForwardConfig(pod.metadata.name)) {
        activeForwards.push(pod);
      } else {
        available.push(pod);
      }
    });

    return { activeForwards, available };
  };

  // Render main content based on loading/error state
  let mainContent;

  if (podsLoading) {
    mainContent = (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
        <CircularProgress />
      </Box>
    );
  } else if (podsError) {
    mainContent = (
      <Alert severity="error" sx={{ mb: 3 }}>
        {podsError instanceof Error ? podsError.message : 'Failed to fetch pods. Please try again.'}
      </Alert>
    );
  } else if (!allPods || allPods.length === 0) {
    mainContent = (
      <Box sx={{ textAlign: 'center', p: 3 }}>
        <Typography variant="h6">No pods found in namespace: {namespace}</Typography>
      </Box>
    );
  } else {
    const { activeForwards, available } = separatePods();

    mainContent = (
      <Card elevation={3} sx={{ width: '100%', border: 'mediumpurple 1px solid' }}>
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
                        onForcePortForward={() => forcePortForward(pod.metadata.name)}
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
              {available.length > 0 ? (
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
                        onForcePortForward={() => forcePortForward(pod.metadata.name)}
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
  }

  return (
    <>
      {/* Main component content */}
      {mainContent}

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
    </>
  );
};

export default PodList;
