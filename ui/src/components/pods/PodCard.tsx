import React from 'react';
import {Alert, Box, Card, CardActions, CardContent, Typography,} from '@mui/material';
import PortForwardingControls from './PortForwardingControls';
import PodHeader from './PodHeader';
import type {Pod, PortForwardConfig} from '../../types';

interface PodCardProps {
  pod: Pod;
  portForwardConfig?: PortForwardConfig;
  actionStatus?: { 
    success: boolean; 
    message: string;
    isLoading?: boolean;
    isPortInUse?: boolean;
    processInfo?: {
      pid: string;
      command: string;
      user: string;
    };
  };
  portInputs: { podPort: string; localPort: string };
  onPortInputChange: (field: 'podPort' | 'localPort', value: string) => void;
  onPortForward: () => void;
  onStopPortForward: () => void;
  onForcePortForward: () => void;
  onEnvVarsClick: (event: React.MouseEvent<HTMLButtonElement>) => void;
  onPrintEnvClick: (event: React.MouseEvent<HTMLButtonElement>) => void;
  onTerminalClick: (event: React.MouseEvent<HTMLButtonElement>) => void;
  onActionStatusClose: () => void;
  currentNamespace?: string;
}

const PodCard: React.FC<PodCardProps> = ({
  pod,
  portForwardConfig,
  actionStatus,
  portInputs,
  onPortInputChange,
  onPortForward,
  onStopPortForward,
  onForcePortForward,
  onEnvVarsClick,
  onPrintEnvClick,
  onTerminalClick,
  onActionStatusClose,
  currentNamespace,
}) => {
  const getDatadogLink = (): string => {
    if (!pod.metadata.labels) return '';

    const tags = Object.entries(pod.metadata.labels)
      .filter(([key]) => key.startsWith('tags.datadoghq.com/'))
      .map(([key, value]) => `${key}:${value}`.replace('tags.datadoghq.com/',''))
      .join(' ');

    return `https://app.datadoghq.eu/logs?query=pod_name:${pod.metadata.name} ${tags}`;
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
    <Card elevation={2} sx={{ width: '100%', minHeight: '100px' }}>
      <CardContent>
        <PodHeader
          pod={pod}
          onEnvVarsClick={onEnvVarsClick}
          onPrintEnvClick={onPrintEnvClick}
          onTerminalClick={onTerminalClick}
          datadogLink={getDatadogLink()}
        />

        {/*<Typography variant="body2" color="text.secondary" gutterBottom>*/}
        {/*  <strong>Pod Name:</strong> {pod.metadata.name}*/}
        {/*</Typography>*/}

        {/*<Typography variant="body2" color="text.secondary" gutterBottom>*/}
        {/*  <strong>Exposed Ports:</strong> {exposedPorts.length > 0 ? exposedPorts.join(', ') : 'None'}*/}
        {/*</Typography>*/}

        {portForwardConfig && (
          <Box sx={{ mt: 2, p: 2, bgcolor: 'action.hover', borderRadius: 1 }}>
            <Typography variant="body2">
              <strong>Active port forwarding:</strong> {portForwardConfig.podPort} → localhost:
              {portForwardConfig.localPort}
              {currentNamespace && portForwardConfig.namespace !== currentNamespace && (
                <span> <strong>({portForwardConfig.namespace || 'giger'})</strong></span>
              )}
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

      <CardActions sx={{ p: 2, pt: 0, width: '100%' }}>
          <PortForwardingControls
            podPort={portInputs.podPort}
            localPort={portInputs.localPort}
            exposedPorts={exposedPorts}
            isForwarding={!!portForwardConfig}
            isLoading={!!actionStatus?.isLoading}
            isPortInUse={!!actionStatus?.isPortInUse}
            statusMessage={actionStatus?.message || ''}
            disabled={false}
            onPortInputChange={onPortInputChange}
            onPortForward={onPortForward}
            onStopPortForward={onStopPortForward}
            onForcePortForward={onForcePortForward}
          />
      </CardActions>
    </Card>
  );
};

export default PodCard;
