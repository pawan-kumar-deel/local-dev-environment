import React, { useState, useEffect } from 'react';
import { TextField, Button, Box, Typography, Divider } from '@mui/material';
import { useAppSettings } from '../services/hooks';

interface NamespaceSelectorProps {
  onNamespaceChange: (namespace: string) => void;
}

const NamespaceSelector: React.FC<NamespaceSelectorProps> = ({ onNamespaceChange }) => {
  const { settings } = useAppSettings();
  const [namespace, setNamespace] = useState<string>('');
  const [inputValue, setInputValue] = useState<string>('');

  useEffect(() => {
    // Update namespace and input value when settings are loaded
    if (settings?.namespace) {
      setNamespace(settings.namespace);
      setInputValue(settings.namespace);
    }
  }, [settings]);

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
