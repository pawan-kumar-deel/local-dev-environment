import React, { useState, useEffect } from 'react';
import { TextField, Button, Box, Typography, Divider, FormControl, InputLabel, Select, MenuItem, type SelectChangeEvent } from '@mui/material';
import { useAppSettings, updateAppSettingsWithMutate } from '../services/hooks';

interface NamespaceSelectorProps {
  onNamespaceChange: (namespace: string) => void;
}

const NamespaceSelector: React.FC<NamespaceSelectorProps> = ({ onNamespaceChange }) => {
  const { settings, mutate: refreshSettings } = useAppSettings();
  const [namespace, setNamespace] = useState<string>('');
  const [inputValue, setInputValue] = useState<string>('');
  const [refreshInterval, setRefreshInterval] = useState<string>("15s");

  useEffect(() => {
    // Update namespace and input value when settings are loaded
    if (settings?.namespace) {
      setNamespace(settings.namespace);
      setInputValue(settings.namespace);
    }
    if (settings?.refreshInterval) {
      setRefreshInterval(settings.refreshInterval);
    }
  }, [settings]);

  const handleRefreshIntervalChange = async (event: SelectChangeEvent) => {
    const newRefreshInterval = event.target.value;
    setRefreshInterval(newRefreshInterval);

    // Save the refresh interval to settings
    try {
      await updateAppSettingsWithMutate({ refreshInterval: newRefreshInterval }, refreshSettings);
    } catch (err) {
      console.error('Failed to update refresh interval:', err);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim()) {
      setNamespace(inputValue);
      onNamespaceChange(inputValue);
    }
  };

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Configuration
      </Typography>
      <Divider sx={{ mb: 2 }} />
      <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <TextField
          label="Giger"
          variant="outlined"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          size="small"
          fullWidth
        />
        <FormControl fullWidth size="small">
          <InputLabel id="refresh-interval-label">Refresh interval</InputLabel>
          <Select
            labelId="refresh-interval-label"
            value={refreshInterval}
            onChange={handleRefreshIntervalChange}
            label="Refresh interval"
          >
            <MenuItem value="5s">5s</MenuItem>
            <MenuItem value="10s">10s</MenuItem>
            <MenuItem value="15s">15s</MenuItem>
            <MenuItem value="30s">30s</MenuItem>
            <MenuItem value="1m">1m</MenuItem>
          </Select>
        </FormControl>
        <Button 
          type="submit" 
          variant="contained" 
          color="primary"
          fullWidth
        >
          Apply
        </Button>
      </Box>
      <Typography variant="body2" sx={{ mt: 2, color: 'text.secondary' }}>
        Current: <strong>{namespace}</strong>
      </Typography>
    </Box>
  );
};

export default NamespaceSelector;
