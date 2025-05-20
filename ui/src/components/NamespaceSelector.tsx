import React, { useState, useEffect } from 'react';
import { TextField, Button, Box, Typography, Divider } from '@mui/material';
import { getSavedNamespace, saveNamespace } from '../services/storage';

interface NamespaceSelectorProps {
  onNamespaceChange: (namespace: string) => void;
}

const NamespaceSelector: React.FC<NamespaceSelectorProps> = ({ onNamespaceChange }) => {
  const [namespace, setNamespace] = useState<string>(getSavedNamespace());
  const [inputValue, setInputValue] = useState<string>(namespace);

  useEffect(() => {
    // When component mounts, notify parent of the current namespace
    onNamespaceChange(namespace);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim()) {
      setNamespace(inputValue);
      saveNamespace(inputValue);
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
