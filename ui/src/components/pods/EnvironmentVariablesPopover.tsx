import React, { useState, useEffect } from 'react';
import {
  Typography,
  Box,
  TextField,
  Popover,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
} from '@mui/material';
import type { Pod } from '../../types';

interface EnvVar {
  name: string;
  value: string;
  container: string;
}

interface EnvironmentVariablesPopoverProps {
  open: boolean;
  anchorEl: HTMLElement | null;
  onClose: () => void;
  pod: Pod | null;
  title?: string;
}

const EnvironmentVariablesPopover: React.FC<EnvironmentVariablesPopoverProps> = ({
  open,
  anchorEl,
  onClose,
  pod,
  title,
}) => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filteredEnvVars, setFilteredEnvVars] = useState<EnvVar[]>([]);

  // Extract app name from pod labels
  const getAppName = (pod: Pod): string => {
    if (pod.metadata.labels && pod.metadata.labels.app) {
      return pod.metadata.labels.app;
    }
    return pod.metadata.name; // Fallback to pod name if app label doesn't exist
  };

  // Extract and format environment variables when pod changes
  useEffect(() => {
    if (!pod) {
      setFilteredEnvVars([]);
      return;
    }

    const envVars: EnvVar[] = [];
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
  }, [pod]);

  // Filter environment variables based on search term
  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const term = event.target.value.toLowerCase();
    setSearchTerm(term);

    if (!pod) return;

    const envVars: EnvVar[] = [];
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

          // Only include if name or value contains search term
          if (env.name.toLowerCase().includes(term) || value.toLowerCase().includes(term)) {
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

  return (
    <Popover
      open={open}
      anchorEl={anchorEl}
      onClose={onClose}
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
          {title || 'Environment Variables'} {pod && `for ${getAppName(pod)}`}
        </Typography>

        <TextField
          label="Search Variables"
          variant="outlined"
          fullWidth
          margin="normal"
          value={searchTerm}
          onChange={handleSearchChange}
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
                    {searchTerm ? 'No matching environment variables found' : 'No environment variables available'}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>
    </Popover>
  );
};

export default EnvironmentVariablesPopover;