import React, { useState } from 'react';
import {
  Typography,
  Box,
  TextField,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  type SelectChangeEvent,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import type { Pod } from '../../types';

interface CommandHistoryItem {
  command: string;
  output: string;
}

interface TerminalDialogProps {
  open: boolean;
  onClose: () => void;
  pod: Pod | null;
  availablePods: Pod[];
  selectedPodName: string;
  isExecuting: boolean;
  onExecuteCommand: (command: string) => Promise<void>;
  onChangePod: (podName: string) => void;
  commandHistory: CommandHistoryItem[];
}

const TerminalDialog: React.FC<TerminalDialogProps> = ({
  open,
  onClose,
  pod,
  availablePods,
  selectedPodName,
  isExecuting,
  onExecuteCommand,
  onChangePod,
  commandHistory,
}) => {
  const [command, setCommand] = useState<string>('');

  // Extract app name from pod labels
  const getAppName = (pod: Pod): string => {
    if (pod.metadata.labels && pod.metadata.labels.app) {
      return pod.metadata.labels.app;
    }
    return pod.metadata.name; // Fallback to pod name if app label doesn't exist
  };

  const handleCommandChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setCommand(event.target.value);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' && !isExecuting) {
      event.preventDefault();
      handleExecuteCommand();
    }
  };

  const handleExecuteCommand = async () => {
    if (!command.trim() || isExecuting) return;

    await onExecuteCommand(command);
    setCommand('');
  };

  const handlePodChange = (event: SelectChangeEvent<string>) => {
    onChangePod(event.target.value);
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: { 
          minHeight: '60vh',
          maxHeight: '80vh',
          display: 'flex',
          flexDirection: 'column'
        }
      }}
    >
      <DialogTitle sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        p: 2
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', flexGrow: 1 }}>
          <Typography variant="h6" sx={{ mr: 2 }}>
            Run Terminal Command
          </Typography>
          <FormControl 
            size="small" 
            sx={{ minWidth: 200 }}
          >
            <InputLabel id="pod-select-label">Select Pod</InputLabel>
            <Select
              labelId="pod-select-label"
              value={selectedPodName}
              onChange={handlePodChange}
              label="Select Pod"
              disabled={isExecuting}
            >
              {availablePods.map((pod) => (
                <MenuItem key={pod.metadata.name} value={pod.metadata.name}>
                  {pod.metadata.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
        <IconButton 
          edge="end" 
          color="inherit" 
          onClick={onClose} 
          aria-label="close"
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ 
        p: 2, 
        flexGrow: 1, 
        display: 'flex', 
        flexDirection: 'column',
        overflow: 'hidden'
      }}>
        {/* Terminal output area */}
        <Box 
          sx={{ 
            flexGrow: 1, 
            bgcolor: '#1e1e1e', 
            color: 'white', 
            p: 2, 
            borderRadius: 1, 
            fontFamily: 'monospace',
            overflow: 'auto',
            mb: 2
          }}
        >
          {commandHistory.length > 0 ? (
            <Box component="pre" sx={{ 
              m: 0, 
              whiteSpace: 'pre-wrap', 
              wordBreak: 'break-word',
              fontSize: '0.875rem',
              lineHeight: 1.5
            }}>
              {commandHistory.map((item, index) => (
                <Box key={index} sx={{ mb: 2 }}>
                  <Box sx={{ color: '#4caf50', fontWeight: 'bold' }}>
                    $ {item.command}
                  </Box>
                  <Box sx={{ mt: 0.5, color: 'white' }}>
                    {item.output}
                  </Box>
                </Box>
              ))}
            </Box>
          ) : (
            <Typography variant="body2" sx={{ color: '#aaa', fontStyle: 'italic' }}>
              Enter a command below to execute it in the pod.
            </Typography>
          )}
        </Box>

        {/* Command input area */}
        <Box sx={{ display: 'flex' }}>
          <TextField
            label="Command"
            variant="outlined"
            fullWidth
            value={command}
            onChange={handleCommandChange}
            onKeyDown={handleKeyDown}
            placeholder="Enter command to execute"
            size="small"
            disabled={isExecuting}
            sx={{ 
              mr: 1,
              '& .MuiOutlinedInput-root': {
                '& fieldset': {
                  borderColor: '#444',
                },
                '&:hover fieldset': {
                  borderColor: '#666',
                },
                '&.Mui-focused fieldset': {
                  borderColor: '#4caf50',
                },
              },
              '& .MuiInputLabel-root': {
                color: '#aaa',
              },
              '& .MuiInputBase-input': {
                color: 'white',
                fontFamily: 'monospace',
              },
            }}
            InputProps={{
              sx: { bgcolor: '#2d2d2d' }
            }}
          />
          <Button 
            variant="contained" 
            color="primary" 
            onClick={handleExecuteCommand}
            disabled={!command.trim() || isExecuting}
          >
            {isExecuting ? 'Executing...' : 'Execute'}
          </Button>
        </Box>
      </DialogContent>
    </Dialog>
  );
};

export default TerminalDialog;
