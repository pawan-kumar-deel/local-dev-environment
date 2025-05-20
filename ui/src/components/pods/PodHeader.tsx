import React from 'react';
import {
  Typography,
  Chip,
  Box,
  IconButton,
  Tooltip,
} from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';
import AssessmentIcon from '@mui/icons-material/Assessment';
import TerminalIcon from '@mui/icons-material/Terminal';
import CodeIcon from '@mui/icons-material/Code';
import type { Pod } from '../../types';

interface PodHeaderProps {
  pod: Pod;
  onEnvVarsClick: (event: React.MouseEvent<HTMLButtonElement>) => void;
  onPrintEnvClick: (event: React.MouseEvent<HTMLButtonElement>) => void;
  onTerminalClick: (event: React.MouseEvent<HTMLButtonElement>) => void;
  datadogLink: string;
}

const PodHeader: React.FC<PodHeaderProps> = ({
  pod,
  onEnvVarsClick,
  onPrintEnvClick,
  onTerminalClick,
  datadogLink,
}) => {
  // Helper functions
  const getAppName = (): string => {
    if (pod.metadata.labels && pod.metadata.labels.app) {
      return pod.metadata.labels.app;
    }
    return pod.metadata.name; // Fallback to pod name if app label doesn't exist
  };

  const getRestartCount = (): number => {
    if (!pod.status.containerStatuses || pod.status.containerStatuses.length === 0) return 0;

    // Sum up restart counts from all containers
    return pod.status.containerStatuses.reduce((total, container) => {
      return total + container.restartCount;
    }, 0);
  };

  return (
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
              href={datadogLink}
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
  );
};

export default PodHeader;