import React, { useState } from 'react';
import {
  Typography,
  Chip,
  Box,
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
  type SelectChangeEvent,
} from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';
import AssessmentIcon from '@mui/icons-material/Assessment';
import TerminalIcon from '@mui/icons-material/Terminal';
import CodeIcon from '@mui/icons-material/Code';
import type { Pod, PortForwardConfig } from '../../types';

interface PodCardProps {
  pod: Pod;
  portForwardConfig?: PortForwardConfig;
  actionStatus?: { success: boolean; message: string };
  portInputs: { podPort: string; localPort: string };
  onPortInputChange: (field: 'podPort' | 'localPort', value: string) => void;
  onPortForward: () => void;
  onStopPortForward: () => void;
  onEnvVarsClick: (event: React.MouseEvent<HTMLButtonElement>) => void;
  onPrintEnvClick: (event: React.MouseEvent<HTMLButtonElement>) => void;
  onTerminalClick: (event: React.MouseEvent<HTMLButtonElement>) => void;
  onActionStatusClose: () => void;
}

const PodCard: React.FC<PodCardProps> = ({
  pod,
  portForwardConfig,
  actionStatus,
  portInputs,
  onPortInputChange,
  onPortForward,
  onStopPortForward,
  onEnvVarsClick,
  onPrintEnvClick,
  onTerminalClick,
  onActionStatusClose,
}) => {
  // Helper functions
  const getAppName = (): string => {
    if (pod.metadata.labels && pod.metadata.labels.app) {
      return pod.metadata.labels.app;
    }
    return pod.metadata.name; // Fallback to pod name if app label doesn't exist
  };

  const getDatadogLink = (): string => {
    if (!pod.metadata.labels) return '';

    // Build tags for Datadog URL
    const tags = Object.entries(pod.metadata.labels)
      .map(([key, value]) => `${key}:${value}`)
      .join(',');

    return `https://app.datadoghq.eu/logs?query=pod_name:${pod.metadata.name} ${tags}`;
  };

  const getRestartCount = (): number => {
    if (!pod.status.containerStatuses || pod.status.containerStatuses.length === 0) return 0;

    // Sum up restart counts from all containers
    return pod.status.containerStatuses.reduce((total, container) => {
      return total + container.restartCount;
    }, 0);
  };

  const getExposedPorts = (): number[] => {
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

  const exposedPorts = getExposedPorts();

  return (
    <Card elevation={2}>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', maxWidth: '70%' }}>
            <Typography variant="h6" component="div" noWrap sx={{ mr: 1 }}>
              {getAppName()}
            </Typography>
            <Box sx={{ display: 'flex' }}>
              <Tooltip title="View Environment Variables">
                <IconButton 
                  size="small" 
                  color="primary" 
                  onClick={onEnvVarsClick}
                  aria-label="view environment variables"
                >
                  <VisibilityIcon />
                </IconButton>
              </Tooltip>
              <Tooltip title="Execute printenv Command">
                <IconButton 
                  size="small" 
                  color="primary" 
                  onClick={onPrintEnvClick}
                  aria-label="execute printenv command"
                >
                  <CodeIcon />
                </IconButton>
              </Tooltip>
              <Tooltip title="Run Terminal Command">
                <IconButton 
                  size="small" 
                  color="primary" 
                  onClick={onTerminalClick}
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
                  href={getDatadogLink()}
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
                Restarts: {getRestartCount()}
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

        {portForwardConfig && (
          <Box sx={{ mt: 2, p: 2, bgcolor: 'action.hover', borderRadius: 1 }}>
            <Typography variant="body2">
              <strong>Active Port Forwarding:</strong> {portForwardConfig.podPort} → localhost:
              {portForwardConfig.localPort}
            </Typography>
            <Typography variant="body2">
              <strong>URL:</strong>{' '}
              <a
                href={`http://localhost:${portForwardConfig.localPort}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                http://localhost:{portForwardConfig.localPort}
              </a>
            </Typography>
          </Box>
        )}

        {actionStatus && (
          <Alert
            severity={actionStatus.success ? 'success' : 'error'}
            sx={{ mt: 2 }}
            onClose={onActionStatusClose}
          >
            {actionStatus.message}
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
                value={portInputs.podPort || ''}
                onChange={(e) => onPortInputChange('podPort', e.target.value as string)}
                label="Pod Port"
                disabled={!!portForwardConfig}
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
              value={portInputs.localPort || ''}
              onChange={(e) => onPortInputChange('localPort', e.target.value)}
              type="number"
              disabled={!!portForwardConfig}
            />
          </Grid>
          <Grid item xs={12}>
            {!portForwardConfig ? (
              <Button
                variant="contained"
                color="primary"
                onClick={onPortForward}
                disabled={!portInputs.podPort || !portInputs.localPort}
                fullWidth
              >
                Forward Port
              </Button>
            ) : (
              <Button
                variant="outlined"
                color="secondary"
                onClick={onStopPortForward}
                fullWidth
              >
                Stop Forwarding
              </Button>
            )}
          </Grid>
        </Grid>
      </CardActions>
    </Card>
  );
};

export default PodCard;