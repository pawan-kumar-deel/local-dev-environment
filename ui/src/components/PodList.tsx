import React, { useState } from 'react';
import {
  Typography,
  Chip,
  Box,
  CircularProgress,
  TextField,
  Button,
  Grid,
  Alert,
  Card,
  CardContent,
  CardActions,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  IconButton,
  Tooltip,
  Popover,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Link,
  type SelectChangeEvent,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import VisibilityIcon from '@mui/icons-material/Visibility';
import type {Pod, PortForwardConfig, AppSettings} from '../types';
import { 
  usePods,
  useConfigurations,
  useAppSettings,
  startPortForwardingWithMutate,
  stopPortForwardingWithMutate,
  updateAppSettingsWithMutate
} from '../services/hooks';

interface PodListProps {
  namespace: string;
}

const PodList: React.FC<PodListProps> = ({ namespace }) => {
  // Use SWR hooks for data fetching
  const { pods: allPods, isLoading: podsLoading, isError: podsError, mutate: refreshPods } = usePods(namespace);
  const { configurations, isLoading: configsLoading, mutate: refreshConfigurations } = useConfigurations();
  const { settings, mutate: refreshSettings } = useAppSettings();

  // Local state
  const [filteredPods, setFilteredPods] = useState<Pod[]>([]);
  const [portInputs, setPortInputs] = useState<Record<string, { podPort: string; localPort: string }>>({});
  const [actionStatus, setActionStatus] = useState<Record<string, { success: boolean; message: string }>>({});
  const [filterPreference, setFilterPreference] = useState<AppSettings['filterPreference']>('Services with exposed ports');

  // Environment variables popover state
  const [envVarsAnchorEl, setEnvVarsAnchorEl] = useState<HTMLButtonElement | null>(null);
  const [currentPod, setCurrentPod] = useState<Pod | null>(null);
  const [envVarSearch, setEnvVarSearch] = useState<string>('');
  const [filteredEnvVars, setFilteredEnvVars] = useState<Array<{ name: string; value: string; container: string }>>([]);

  // Derived state
  const portForwardConfigs = React.useMemo(() => {
    if (!configurations) return {};

    const configMap: Record<string, PortForwardConfig> = {};
    configurations.forEach(config => {
      if (config.namespace === namespace) {
        configMap[config.podName] = config;
      }
    });
    return configMap;
  }, [configurations, namespace]);

  // Initialize port inputs with existing configurations
  React.useEffect(() => {
    if (!portForwardConfigs) return;

    const inputs: Record<string, { podPort: string; localPort: string }> = {};
    Object.entries(portForwardConfigs).forEach(([podName, config]) => {
      inputs[podName] = {
        podPort: config.podPort.toString(),
        localPort: config.localPort.toString()
      };
    });

    setPortInputs(prevInputs => ({
      ...prevInputs,
      ...inputs
    }));
  }, [portForwardConfigs]);

  // Set filter preference from settings
  React.useEffect(() => {
    if (settings?.filterPreference) {
      setFilterPreference(settings.filterPreference);
    }
  }, [settings]);

  // Apply filter when pods or filter preference changes
  React.useEffect(() => {
    if (!allPods) {
      setFilteredPods([]);
      return;
    }

    if (filterPreference === 'All services') {
      setFilteredPods(allPods);
    } else {
      // Filter pods with exposed ports
      const podsWithExposedPorts = allPods.filter(pod => {
        const ports = getExposedPorts(pod);
        return ports.length > 0;
      });
      setFilteredPods(podsWithExposedPorts);
    }
  }, [allPods, filterPreference]);

  const handleInputChange = (podName: string, field: 'podPort' | 'localPort', value: string) => {
    setPortInputs(prev => ({
      ...prev,
      [podName]: {
        ...prev[podName] || { podPort: '', localPort: '' },
        [field]: value
      }
    }));
  };

  const handlePortForward = async (podName: string) => {
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

  const handleFilterChange = async (event: SelectChangeEvent<string>) => {
    const newFilterPreference = event.target.value as AppSettings['filterPreference'];
    setFilterPreference(newFilterPreference);

    // Save the preference to the backend
    try {
      await updateAppSettingsWithMutate({ filterPreference: newFilterPreference }, refreshSettings);
    } catch (err) {
      console.error('Failed to update filter preference:', err);
    }
  };

  const getExposedPorts = (pod: Pod): number[] => {
    const ports: number[] = [];
    pod.spec.containers.forEach(container => {
      if (container.ports) {
        container.ports.forEach(port => {
          ports.push(port.containerPort);
        });
      }
    });
    return ports;
  };

  if (podsLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (podsError) {
    return (
      <Alert severity="error" sx={{ mb: 3 }}>
        {podsError instanceof Error ? podsError.message : 'Failed to fetch pods. Please try again.'}
      </Alert>
    );
  }

  if (!allPods || allPods.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', p: 3 }}>
        <Typography variant="h6">No pods found in namespace: {namespace}</Typography>
      </Box>
    );
  }

  return (
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
          {filteredPods.map((pod) => {
            const exposedPorts = getExposedPorts(pod);

            return (
              <Grid item xs={12} key={pod.metadata.uid}>
                <Card elevation={2}>
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                      <Typography variant="h6" component="div" noWrap sx={{ maxWidth: '70%' }}>
                        {pod.metadata.name}
                      </Typography>
                      <Chip
                        label={pod.status.phase}
                        color={pod.status.phase === 'Running' ? 'success' : 'warning'}
                        size="small"
                      />
                    </Box>

                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      <strong>Created:</strong> {new Date(pod.metadata.creationTimestamp).toLocaleString()}
                    </Typography>

                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      <strong>Exposed Ports:</strong> {exposedPorts.length > 0 ? exposedPorts.join(', ') : 'None'}
                    </Typography>

                    {portForwardConfigs[pod.metadata.name] && (
                      <Box sx={{ mt: 2, p: 2, bgcolor: 'action.hover', borderRadius: 1 }}>
                        <Typography variant="body2">
                          <strong>Active Port Forwarding:</strong> {portForwardConfigs[pod.metadata.name].podPort} → localhost:
                          {portForwardConfigs[pod.metadata.name].localPort}
                        </Typography>
                        <Typography variant="body2">
                          <strong>URL:</strong>{' '}
                          <a
                            href={`http://localhost:${portForwardConfigs[pod.metadata.name].localPort}`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            http://localhost:{portForwardConfigs[pod.metadata.name].localPort}
                          </a>
                        </Typography>
                      </Box>
                    )}

                    {actionStatus[pod.metadata.name] && (
                      <Alert
                        severity={actionStatus[pod.metadata.name].success ? 'success' : 'error'}
                        sx={{ mt: 2 }}
                        onClose={() => {
                          const newStatus = { ...actionStatus };
                          delete newStatus[pod.metadata.name];
                          setActionStatus(newStatus);
                        }}
                      >
                        {actionStatus[pod.metadata.name].message}
                      </Alert>
                    )}
                  </CardContent>

                  <CardActions sx={{ p: 2, pt: 0 }}>
                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={6}>
                        <FormControl fullWidth size="small">
                          <InputLabel id={`pod-port-label-${pod.metadata.uid}`}>Pod Port</InputLabel>
                          <Select
                            labelId={`pod-port-label-${pod.metadata.uid}`}
                            value={portInputs[pod.metadata.name]?.podPort || ''}
                            onChange={(e) => handleInputChange(pod.metadata.name, 'podPort', e.target.value as string)}
                            label="Pod Port"
                            disabled={!!portForwardConfigs[pod.metadata.name]}
                          >
                            {exposedPorts.length > 0 ? (
                              exposedPorts.map((port) => (
                                <MenuItem key={port} value={port.toString()}>
                                  {port}
                                </MenuItem>
                              ))
                            ) : (
                              <MenuItem value="" disabled>
                                No ports available
                              </MenuItem>
                            )}
                          </Select>
                        </FormControl>
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          label="Local Port"
                          size="small"
                          fullWidth
                          value={portInputs[pod.metadata.name]?.localPort || ''}
                          onChange={(e) => handleInputChange(pod.metadata.name, 'localPort', e.target.value)}
                          type="number"
                          disabled={!!portForwardConfigs[pod.metadata.name]}
                        />
                      </Grid>
                      <Grid item xs={12}>
                        {!portForwardConfigs[pod.metadata.name] ? (
                          <Button
                            variant="contained"
                            color="primary"
                            onClick={() => handlePortForward(pod.metadata.name)}
                            disabled={!portInputs[pod.metadata.name]?.podPort || !portInputs[pod.metadata.name]?.localPort}
                            fullWidth
                          >
                            Forward Port
                          </Button>
                        ) : (
                          <Button
                            variant="outlined"
                            color="secondary"
                            onClick={() => handleStopPortForward(pod.metadata.name)}
                            fullWidth
                          >
                            Stop Forwarding
                          </Button>
                        )}
                      </Grid>
                    </Grid>
                  </CardActions>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      </CardContent>
    </Card>
  );
};

export default PodList;
