import React, { useState } from 'react';
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

interface PrintEnvPopoverProps {
  open: boolean;
  anchorEl: HTMLElement | null;
  onClose: () => void;
  pod: Pod | null;
  envVars: EnvVar[];
  onSearchChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  searchTerm: string;
}

const PrintEnvPopover: React.FC<PrintEnvPopoverProps> = ({
  open,
  anchorEl,
  onClose,
  pod,
  envVars,
  onSearchChange,
  searchTerm,
}) => {
  // Extract app name from pod labels
  const getAppName = (pod: Pod): string => {
    if (pod.metadata.labels && pod.metadata.labels.app) {
      return pod.metadata.labels.app;
    }
    return pod.metadata.name; // Fallback to pod name if app label doesn't exist
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
          PrintEnv Output {pod && `for ${getAppName(pod)}`}
        </Typography>

        <TextField
          label="Search Variables"
          variant="outlined"
          fullWidth
          margin="normal"
          value={searchTerm}
          onChange={onSearchChange}
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
              {envVars.length > 0 ? (
                envVars.map((env, index) => (
                  <TableRow key={`printenv-${env.container}-${env.name}-${index}`}>
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

export default PrintEnvPopover;