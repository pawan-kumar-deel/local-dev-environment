import React, {useEffect, useRef, useState} from 'react';
import {
  Backdrop,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Divider,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  type SelectChangeEvent,
  TextField,
  Tooltip,
  Typography
} from '@mui/material';
import {
  applyTemplateWithMutate,
  saveTemplateWithMutate,
  updateAppSettingsWithMutate,
  useAppSettings,
  useConfigurations,
  useTemplates
} from '../services/hooks';
import DownloadIcon from '@mui/icons-material/Download';
import UploadIcon from '@mui/icons-material/Upload';
import DeleteIcon from '@mui/icons-material/Delete';
import {deleteTemplate, getTemplateDownloadUrl} from '../services/api';

interface NamespaceSelectorProps {
  onNamespaceChange: (namespace: string) => void;
}

const NamespaceSelector: React.FC<NamespaceSelectorProps> = ({ onNamespaceChange }) => {
  const { settings, mutate: refreshSettings } = useAppSettings();
  const { templates, mutate: refreshTemplates } = useTemplates();
  const { mutate: refreshConfigurations } = useConfigurations();

  const [namespace, setNamespace] = useState<string>('');
  const [inputValue, setInputValue] = useState<string>('');
  const [refreshInterval, setRefreshInterval] = useState<string>("15s");

  // Template state
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [saveTemplateDialogOpen, setSaveTemplateDialogOpen] = useState<boolean>(false);
  const [newTemplateName, setNewTemplateName] = useState<string>('');
  const [saveTemplateError, setSaveTemplateError] = useState<string>('');
  const [isApplyingTemplate, setIsApplyingTemplate] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  // Template handlers
  const handleTemplateChange = (event: SelectChangeEvent) => {
    const templateName = event.target.value;
    setSelectedTemplate(templateName);
  };

  const handleApplyTemplate = async () => {
    if (selectedTemplate) {
      try {
        // Show progress overlay
        setIsApplyingTemplate(true);

        const result = await applyTemplateWithMutate(
          selectedTemplate,
          refreshTemplates,
          refreshConfigurations
        );

        if (!result.success) {
          console.error('Failed to apply template:', result.error);
          // Hide progress overlay immediately on error
          setIsApplyingTemplate(false);
          return;
        }

        // Wait for a moment to ensure port forwarding processes have started
        // This delay helps ensure the backend has time to start the port forwarding processes
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Refresh configurations again to ensure we have the latest data
        await refreshConfigurations();

        // Hide progress overlay after ensuring ports are forwarded
        setIsApplyingTemplate(false);
      } catch (err) {
        console.error('Error applying template:', err);
        // Hide progress overlay on error
        setIsApplyingTemplate(false);
      }
    }
  };

  const handleOpenSaveTemplateDialog = () => {
    setNewTemplateName('');
    setSaveTemplateError('');
    setSaveTemplateDialogOpen(true);
  };

  const handleCloseSaveTemplateDialog = () => {
    setSaveTemplateDialogOpen(false);
  };

  const handleSaveTemplate = async () => {
    if (!newTemplateName.trim()) {
      setSaveTemplateError('Template name is required');
      return;
    }

    try {
      const result = await saveTemplateWithMutate(newTemplateName, refreshTemplates);

      if (result.success) {
        setSaveTemplateDialogOpen(false);
      } else {
        setSaveTemplateError(result.error || 'Failed to save template');
      }
    } catch (err) {
      console.error('Error saving template:', err);
      setSaveTemplateError('An unexpected error occurred');
    }
  };

  const handleUploadClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      // Read the file content
      const fileContent = await file.text();
      const templateData = JSON.parse(fileContent);

      // Extract template name from the file
      const templateName = templateData.name || file.name.replace('.json', '');

      // Save the template with the extracted name
      const result = await saveTemplateWithMutate(templateName, refreshTemplates, templateData);

      if (result.success) {
        // Select the newly uploaded template
        setSelectedTemplate(templateName);
      } else {
        console.error('Failed to upload template:', result.error);
      }
    } catch (err) {
      console.error('Error uploading template file:', err);
    }

    // Reset the file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
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
        <Button 
          type="submit" 
          variant="contained" 
          color="primary"
          fullWidth
        >
          Change
        </Button>
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

        {/* Templates section */}
        <Typography variant="subtitle1" sx={{ mt: 2 }}>
          Templates
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <FormControl fullWidth size="small">
            <InputLabel id="template-select-label">Select Template</InputLabel>
            <Select
              labelId="template-select-label"
              value={selectedTemplate}
              onChange={handleTemplateChange}
              label="Select Template"
            >
              <MenuItem value="">
                <em>None</em>
              </MenuItem>
              {templates?.map((template) => (
                <MenuItem key={template.name} value={template.name}>
                  {template.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {selectedTemplate ? (
            <>
            <Tooltip title="Delete template">
              <IconButton
                color="error"
                component="a"
                onClick={()=>{setSelectedTemplate(''); deleteTemplate(selectedTemplate)}}
                download
                disabled={!selectedTemplate}
              >
                <DeleteIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Download template">
              <IconButton
                color="primary"
                component="a"
                href={getTemplateDownloadUrl(selectedTemplate)}
                download
                disabled={!selectedTemplate}
              >
                <DownloadIcon />
              </IconButton>
            </Tooltip>
            </>
          ) : (
            <Tooltip title="Upload template">
              <IconButton 
                color="primary"
                onClick={handleUploadClick}
              >
                <UploadIcon />
              </IconButton>
            </Tooltip>
          )}

          {/* Hidden file input for template upload */}
          <input
            type="file"
            ref={fileInputRef}
            style={{ display: 'none' }}
            accept=".json"
            onChange={handleFileUpload}
          />
        </Box>

        <Button 
          variant="outlined" 
          color="primary"
          onClick={handleOpenSaveTemplateDialog}
          fullWidth
        >
          Save Current Config as Template
        </Button>

        <Button 
          variant="contained" 
          color="primary"
          onClick={handleApplyTemplate}
          fullWidth
          disabled={!selectedTemplate}
          sx={{ mt: 1 }}
        >
          Apply Template
        </Button>
      </Box>
      <Typography variant="body2" sx={{ mt: 2, color: 'text.secondary' }}>
        Current: <strong>{namespace}</strong>
      </Typography>

      {/* Save Template Dialog */}
      <Dialog open={saveTemplateDialogOpen} onClose={handleCloseSaveTemplateDialog}>
        <DialogTitle>Save as Template</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Enter a name for your template. This will save the current port forwarding configuration.
          </DialogContentText>
          <TextField
            autoFocus
            margin="dense"
            label="Template Name"
            type="text"
            fullWidth
            variant="outlined"
            value={newTemplateName}
            onChange={(e) => setNewTemplateName(e.target.value)}
            error={!!saveTemplateError}
            helperText={saveTemplateError}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseSaveTemplateDialog}>Cancel</Button>
          <Button onClick={handleSaveTemplate} color="primary">Save</Button>
        </DialogActions>
      </Dialog>

      {/* Progress Overlay */}
      <Backdrop
        sx={{ 
          color: '#fff', 
          zIndex: (theme) => theme.zIndex.drawer + 1,
          flexDirection: 'column',
          gap: 2
        }}
        open={isApplyingTemplate}
      >
        <CircularProgress color="inherit" />
        <Typography variant="h6">
          Applying template...
        </Typography>
      </Backdrop>
    </Box>
  );
};

export default NamespaceSelector;
