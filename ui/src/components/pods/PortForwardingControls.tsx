import React from 'react';
import {
  Typography,
  Box,
  TextField,
  Button,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Stack,
} from '@mui/material';
import WarningIcon from '@mui/icons-material/Warning';

interface PortForwardingControlsProps {
  podPort: string;
  localPort: string;
  exposedPorts: number[];
  isForwarding: boolean;
  isLoading: boolean;
  isPortInUse: boolean;
  statusMessage: string;
  disabled: boolean;
  onPortInputChange: (field: 'podPort' | 'localPort', value: string) => void;
  onPortForward: () => void;
  onStopPortForward: () => void;
  onForcePortForward: () => void;
}

const PortForwardingControls: React.FC<PortForwardingControlsProps> = ({
  podPort,
  localPort,
  exposedPorts,
  isForwarding,
  isLoading,
  isPortInUse,
  statusMessage,
  disabled,
  onPortInputChange,
  onPortForward,
  onStopPortForward,
  onForcePortForward,
}) => {
  return (
    <Stack spacing={2}>
      <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
        <FormControl fullWidth size="small">
          <InputLabel>Source Port</InputLabel>
          <Select
            value={podPort || ''}
            onChange={(e) => onPortInputChange('podPort', e.target.value as string)}
            label="Pod Port"
            disabled={isForwarding || disabled}
            sx={{ minWidth: '150px' }}
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
        <TextField
          label="Local Port"
          size="small"
          fullWidth
          value={localPort || ''}
          onChange={(e) => onPortInputChange('localPort', e.target.value)}
          type="number"
          aria-valuemin={0}
          aria-valuemax={65535}
          disabled={isForwarding || disabled}
          slotProps={{
            htmlInput: {
              min: 0,
              max: 65535,
            },
          }}
          sx={{ minWidth: '150px' }}
        />
      </Stack>

      {!isForwarding ? (
        <>
          <Button
            variant="contained"
            color="primary"
            onClick={onPortForward}
            disabled={!podPort || !localPort || isLoading || disabled}
            fullWidth
            sx={{ mb: isPortInUse ? 1 : 0 }}
          >
            {isLoading ? (
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <CircularProgress size={20} color="inherit" sx={{ mr: 1 }} />
                {statusMessage || 'Loading...'}
              </Box>
            ) : (
              'Forward Port'
            )}
          </Button>
          
          {/* Show warning and confirm button if port is in use */}
          {isPortInUse && (
            <Box sx={{ mt: 1, display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
              <Typography variant="body2" color="error" sx={{ mb: 1 }}>
                {statusMessage}
              </Typography>
              <Button
                variant="outlined"
                color="warning"
                onClick={onForcePortForward}
                size="small"
                startIcon={<WarningIcon />}
              >
                Kill Process & Force Mapping
              </Button>
            </Box>
          )}
        </>
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
    </Stack>
  );
};

export default PortForwardingControls;