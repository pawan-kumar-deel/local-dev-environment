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
import AssessmentIcon from '@mui/icons-material/Assessment';
import TerminalIcon from '@mui/icons-material/Terminal';
import CodeIcon from '@mui/icons-material/Code';
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

  // Terminal command state
  const [terminalAnchorEl, setTerminalAnchorEl] = useState<HTMLButtonElement | null>(null);
  const [terminalCommand, setTerminalCommand] = useState<string>('');
  const [terminalOutput, setTerminalOutput] = useState<string>('');

  // PrintEnv state
  const [printEnvAnchorEl, setPrintEnvAnchorEl] = useState<HTMLButtonElement | null>(null);
  const [printEnvOutput, setPrintEnvOutput] = useState<Array<{ name: string; value: string; container: string }>>([]);
  const [printEnvSearch, setPrintEnvSearch] = useState<string>('');

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

  // Helper functions for environment variables
  const handleEnvVarsClick = (event: React.MouseEvent<HTMLButtonElement>, pod: Pod) => {
    setEnvVarsAnchorEl(event.currentTarget);
    setCurrentPod(pod);

    // Extract and format environment variables
    const envVars: Array<{ name: string; value: string; container: string }> = [];
    pod.spec.containers.forEach(container => {
      if (container.env) {
        container.env.forEach(env => {
          // Handle different types of env vars
          let value = env.value || '';
          if (env.valueFrom) {
            if (env.valueFrom.fieldRef) {
              value = `[Field Ref: ${env.valueFrom.fieldRef.fieldPath}]`;
            } else if (env.valueFrom.secretKeyRef) {
              value = `[Secret: ${env.valueFrom.secretKeyRef.name}.${env.valueFrom.secretKeyRef.key}]`;
            } else if (env.valueFrom.configMapKeyRef) {
              value = `[ConfigMap: ${env.valueFrom.configMapKeyRef.name}.${env.valueFrom.configMapKeyRef.key}]`;
            }
          }
          envVars.push({
            name: env.name,
            value,
            container: container.name
          });
        });
      }
    });

    setFilteredEnvVars(envVars);
    setEnvVarSearch('');
  };

  const handleEnvVarsClose = () => {
    setEnvVarsAnchorEl(null);
    setCurrentPod(null);
    setFilteredEnvVars([]);
    setEnvVarSearch('');
  };

  const handleEnvVarSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const searchTerm = event.target.value.toLowerCase();
    setEnvVarSearch(searchTerm);

    if (!currentPod) return;

    // Filter environment variables based on search term
    const envVars: Array<{ name: string; value: string; container: string }> = [];
    currentPod.spec.containers.forEach(container => {
      if (container.env) {
        container.env.forEach(env => {
          // Handle different types of env vars
          let value = env.value || '';
          if (env.valueFrom) {
            if (env.valueFrom.fieldRef) {
              value = `[Field Ref: ${env.valueFrom.fieldRef.fieldPath}]`;
            } else if (env.valueFrom.secretKeyRef) {
              value = `[Secret: ${env.valueFrom.secretKeyRef.name}.${env.valueFrom.secretKeyRef.key}]`;
            } else if (env.valueFrom.configMapKeyRef) {
              value = `[ConfigMap: ${env.valueFrom.configMapKeyRef.name}.${env.valueFrom.configMapKeyRef.key}]`;
            }
          }

          // Only include if name or value contains search term
          if (env.name.toLowerCase().includes(searchTerm) || value.toLowerCase().includes(searchTerm)) {
            envVars.push({
              name: env.name,
              value,
              container: container.name
            });
          }
        });
      }
    });

    setFilteredEnvVars(envVars);
  };

  // Helper function to get app name from labels
  const getAppName = (pod: Pod): string => {
    if (pod.metadata.labels && pod.metadata.labels.app) {
      return pod.metadata.labels.app;
    }
    return pod.metadata.name; // Fallback to pod name if app label doesn't exist
  };

  // Helper function to generate Datadog link
  const getDatadogLink = (pod: Pod): string => {
    if (!pod.metadata.labels) return '';

    // Build tags for Datadog URL
    const tags = Object.entries(pod.metadata.labels)
      .map(([key, value]) => `${key}:${value}`)
      .join(',');

    return `https://app.datadoghq.com/logs?query=pod_name:${pod.metadata.name} ${tags}`;
  };

  // Helper function to get restart count
  const getRestartCount = (pod: Pod): number => {
    if (!pod.status.containerStatuses || pod.status.containerStatuses.length === 0) return 0;

    // Sum up restart counts from all containers
    return pod.status.containerStatuses.reduce((total, container) => {
      return total + container.restartCount;
    }, 0);
  };

  // Helper functions for terminal commands
  const handleTerminalClick = (event: React.MouseEvent<HTMLButtonElement>, pod: Pod) => {
    setTerminalAnchorEl(event.currentTarget);
    setCurrentPod(pod);
    setTerminalCommand('');
    setTerminalOutput('');
  };

  const handleTerminalClose = () => {
    setTerminalAnchorEl(null);
    setCurrentPod(null);
    setTerminalCommand('');
    setTerminalOutput('');
  };

  const handleTerminalCommandChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setTerminalCommand(event.target.value);
  };

  const executeTerminalCommand = async () => {
    if (!currentPod || !terminalCommand) return;

    try {
      // This is a placeholder - you would need to implement the actual API call
      // to execute the command in the pod
      setTerminalOutput(`Executing command: ${terminalCommand} in pod ${currentPod.metadata.name}...`);

      // Simulate API call response
      setTimeout(() => {
        setTerminalOutput(`Command executed successfully.\nThis is a simulated response for: ${terminalCommand}`);
      }, 1000);
    } catch (error) {
      console.error('Error executing terminal command:', error);
      setTerminalOutput(`Error executing command: ${error}`);
    }
  };

  // Helper functions for printenv command
  const handlePrintEnvClick = (event: React.MouseEvent<HTMLButtonElement>, pod: Pod) => {
    setPrintEnvAnchorEl(event.currentTarget);
    setCurrentPod(pod);
    setPrintEnvSearch('');

    // Simulate executing printenv command
    const envVars: Array<{ name: string; value: string; container: string }> = [];
    pod.spec.containers.forEach(container => {
      // Add simulated environment variables from printenv command
      envVars.push({
        name: 'PATH',
        value: '/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin',
        container: container.name
      });
      envVars.push({
        name: 'HOSTNAME',
        value: pod.metadata.name,
        container: container.name
      });
      envVars.push({
        name: 'KUBERNETES_PORT',
        value: 'tcp://10.96.0.1:443',
        container: container.name
      });

      // Add actual environment variables from pod spec
      if (container.env) {
        container.env.forEach(env => {
          let value = env.value || '';
          if (env.valueFrom) {
            if (env.valueFrom.fieldRef) {
              value = `[Field Ref: ${env.valueFrom.fieldRef.fieldPath}]`;
            } else if (env.valueFrom.secretKeyRef) {
              value = `[Secret: ${env.valueFrom.secretKeyRef.name}.${env.valueFrom.secretKeyRef.key}]`;
            } else if (env.valueFrom.configMapKeyRef) {
              value = `[ConfigMap: ${env.valueFrom.configMapKeyRef.name}.${env.valueFrom.configMapKeyRef.key}]`;
            }
          }
          envVars.push({
            name: env.name,
            value,
            container: container.name
          });
        });
      }
    });

    setPrintEnvOutput(envVars);
  };

  const handlePrintEnvClose = () => {
    setPrintEnvAnchorEl(null);
    setCurrentPod(null);
    setPrintEnvOutput([]);
    setPrintEnvSearch('');
  };

  const handlePrintEnvSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const searchTerm = event.target.value.toLowerCase();
    setPrintEnvSearch(searchTerm);

    if (!currentPod) return;

    // Filter printenv output based on search term
    const filteredOutput = printEnvOutput.filter(env => 
      env.name.toLowerCase().includes(searchTerm) || 
      env.value.toLowerCase().includes(searchTerm)
    );

    setPrintEnvOutput(filteredOutput);
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
            {filteredPods.map((pod) => {
              const exposedPorts = getExposedPorts(pod);

              return (
                <Grid item xs={12} key={pod.metadata.uid}>
                  <Card elevation={2}>
                    <CardContent>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', maxWidth: '70%' }}>
                          <Typography variant="h6" component="div" noWrap sx={{ mr: 1 }}>
                            {getAppName(pod)}
                          </Typography>
                          <Box sx={{ display: 'flex' }}>
                            <Tooltip title="View Environment Variables">
                              <IconButton 
                                size="small" 
                                color="primary" 
                                onClick={(e) => handleEnvVarsClick(e, pod)}
                                aria-label="view environment variables"
                              >
                                <VisibilityIcon />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Execute printenv Command">
                              <IconButton 
                                size="small" 
                                color="primary" 
                                onClick={(e) => handlePrintEnvClick(e, pod)}
                                aria-label="execute printenv command"
                              >
                                <CodeIcon />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Run Terminal Command">
                              <IconButton 
                                size="small" 
                                color="primary" 
                                onClick={(e) => handleTerminalClick(e, pod)}
                                aria-label="run terminal command"
                              >
                                <TerminalIcon />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="View in Datadog">
                              <IconButton 
                                size="small" 
                                color="primary" 
                                component="a"
                                href={getDatadogLink(pod)}
                                target="_blank"
                                rel="noopener noreferrer"
                                aria-label="view in datadog"
                              >
                                <AssessmentIcon />
                              </IconButton>
                            </Tooltip>
                          </Box>
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <Chip
                            label={pod.status.phase}
                            color={pod.status.phase === 'Running' ? 'success' : 'warning'}
                            size="small"
                          />
                          {pod.status.phase === 'Running' && (
                            <Typography variant="body2" color="text.secondary" sx={{ ml: 1 }}>
                              Restarts: {getRestartCount(pod)}
                            </Typography>
                          )}
                        </Box>
                      </Box>

                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        <strong>Pod Name:</strong> {pod.metadata.name}
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
  }

  return (
    <>
      {/* Main component content */}
      {mainContent}

      {/* Environment Variables Popover */}
      <Popover
        open={Boolean(envVarsAnchorEl)}
        anchorEl={envVarsAnchorEl}
        onClose={handleEnvVarsClose}
        anchorOrigin={{
          vertical: 'center',
          horizontal: 'center',
        }}
        transformOrigin={{
          vertical: 'center',
          horizontal: 'center',
        }}
        PaperProps={{
          sx: { width: '80%', maxWidth: '800px', maxHeight: '80vh' }
        }}
      >
        <Box sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Environment Variables {currentPod && `for ${getAppName(currentPod)}`}
          </Typography>

          <TextField
            label="Search Variables"
            variant="outlined"
            fullWidth
            margin="normal"
            value={envVarSearch}
            onChange={handleEnvVarSearchChange}
            placeholder="Search by name or value"
            size="small"
            sx={{ mb: 2 }}
          />

          <TableContainer component={Paper} sx={{ maxHeight: '60vh' }}>
            <Table stickyHeader size="small">
              <TableHead>
                <TableRow>
                  <TableCell><strong>Container</strong></TableCell>
                  <TableCell><strong>Name</strong></TableCell>
                  <TableCell><strong>Value</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredEnvVars.length > 0 ? (
                  filteredEnvVars.map((env, index) => (
                    <TableRow key={`${env.container}-${env.name}-${index}`}>
                      <TableCell>{env.container}</TableCell>
                      <TableCell>{env.name}</TableCell>
                      <TableCell sx={{ wordBreak: 'break-all' }}>{env.value}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={3} align="center">
                      {envVarSearch ? 'No matching environment variables found' : 'No environment variables available'}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      </Popover>

      {/* Terminal Command Popover */}
      <Popover
        open={Boolean(terminalAnchorEl)}
        anchorEl={terminalAnchorEl}
        onClose={handleTerminalClose}
        anchorOrigin={{
          vertical: 'center',
          horizontal: 'center',
        }}
        transformOrigin={{
          vertical: 'center',
          horizontal: 'center',
        }}
        PaperProps={{
          sx: { width: '80%', maxWidth: '800px', maxHeight: '80vh' }
        }}
      >
        <Box sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Run Terminal Command {currentPod && `in ${getAppName(currentPod)}`}
          </Typography>

          <Box sx={{ display: 'flex', mb: 2 }}>
            <TextField
              label="Command"
              variant="outlined"
              fullWidth
              value={terminalCommand}
              onChange={handleTerminalCommandChange}
              placeholder="Enter command to execute"
              size="small"
              sx={{ mr: 1 }}
            />
            <Button 
              variant="contained" 
              color="primary" 
              onClick={executeTerminalCommand}
              disabled={!terminalCommand}
            >
              Execute
            </Button>
          </Box>

          {terminalOutput && (
            <Box sx={{ mt: 2, p: 2, bgcolor: 'action.hover', borderRadius: 1, whiteSpace: 'pre-wrap' }}>
              <Typography variant="body2" component="pre" sx={{ fontFamily: 'monospace' }}>
                {terminalOutput}
              </Typography>
            </Box>
          )}
        </Box>
      </Popover>

      {/* PrintEnv Command Popover */}
      <Popover
        open={Boolean(printEnvAnchorEl)}
        anchorEl={printEnvAnchorEl}
        onClose={handlePrintEnvClose}
        anchorOrigin={{
          vertical: 'center',
          horizontal: 'center',
        }}
        transformOrigin={{
          vertical: 'center',
          horizontal: 'center',
        }}
        PaperProps={{
          sx: { width: '80%', maxWidth: '800px', maxHeight: '80vh' }
        }}
      >
        <Box sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            PrintEnv Output {currentPod && `for ${getAppName(currentPod)}`}
          </Typography>

          <TextField
            label="Search Variables"
            variant="outlined"
            fullWidth
            margin="normal"
            value={printEnvSearch}
            onChange={handlePrintEnvSearchChange}
            placeholder="Search by name or value"
            size="small"
            sx={{ mb: 2 }}
          />

          <TableContainer component={Paper} sx={{ maxHeight: '60vh' }}>
            <Table stickyHeader size="small">
              <TableHead>
                <TableRow>
                  <TableCell><strong>Container</strong></TableCell>
                  <TableCell><strong>Name</strong></TableCell>
                  <TableCell><strong>Value</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {printEnvOutput.length > 0 ? (
                  printEnvOutput.map((env, index) => (
                    <TableRow key={`printenv-${env.container}-${env.name}-${index}`}>
                      <TableCell>{env.container}</TableCell>
                      <TableCell>{env.name}</TableCell>
                      <TableCell sx={{ wordBreak: 'break-all' }}>{env.value}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={3} align="center">
                      {printEnvSearch ? 'No matching environment variables found' : 'No environment variables available'}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      </Popover>
    </>
  );
};

export default PodList;
