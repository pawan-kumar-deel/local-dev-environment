import React from 'react';
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
  type SelectChangeEvent,
} from '@mui/material';
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
    clearActionStatus,
    getPortForwardConfig
  } = usePortForwarding(configurations, namespace, refreshConfigurations);

  const {
    terminalDialogOpen,
    currentPod: terminalPod,
    terminalCommand,
    terminalHistory,
    openTerminal,
    closeTerminal,
    setTerminalCommand,
    executeCommand
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
                  <MenuItem value="Services with exposed ports">Services with exposed ports</MenuItem>
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

          <Grid container spacing={3}>
            {filteredPods.map((pod) => (
              <Grid item xs={12} key={pod.metadata.uid}>
                <PodCard
                  pod={pod}
                  portForwardConfig={getPortForwardConfig(pod.metadata.name)}
                  actionStatus={actionStatus[pod.metadata.name]}
                  portInputs={portInputs[pod.metadata.name] || { podPort: '', localPort: '' }}
                  onPortInputChange={(field, value) => handleInputChange(pod.metadata.name, field, value)}
                  onPortForward={() => handlePortForward(pod.metadata.name)}
                  onStopPortForward={() => handleStopPortForward(pod.metadata.name)}
                  onEnvVarsClick={(e) => handleEnvVarsClick(e, pod)}
                  onPrintEnvClick={(e) => handlePrintEnvClick(e, pod)}
                  onTerminalClick={(e) => openTerminal(pod)}
                  onActionStatusClose={() => handleActionStatusClose(pod.metadata.name)}
                />
              </Grid>
            ))}
          </Grid>
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
        onExecuteCommand={executeCommand}
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
