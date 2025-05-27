import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React, { useEffect, useRef, useState } from 'react';
import { Backdrop, Box, Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, Divider, FormControl, IconButton, InputLabel, MenuItem, Select, TextField, Tooltip, Typography } from '@mui/material';
import { applyTemplateWithMutate, saveTemplateWithMutate, updateAppSettingsWithMutate, useAppSettings, useConfigurations, useTemplates } from '../services/hooks';
import DownloadIcon from '@mui/icons-material/Download';
import UploadIcon from '@mui/icons-material/Upload';
import DeleteIcon from '@mui/icons-material/Delete';
import { deleteTemplate, getTemplateDownloadUrl } from '../services/api';
const NamespaceSelector = ({ onNamespaceChange }) => {
    const { settings, mutate: refreshSettings } = useAppSettings();
    const { templates, mutate: refreshTemplates } = useTemplates();
    const { mutate: refreshConfigurations } = useConfigurations();
    const [namespace, setNamespace] = useState('');
    const [inputValue, setInputValue] = useState('');
    const [refreshInterval, setRefreshInterval] = useState("15s");
    // Template state
    const [selectedTemplate, setSelectedTemplate] = useState('');
    const [saveTemplateDialogOpen, setSaveTemplateDialogOpen] = useState(false);
    const [newTemplateName, setNewTemplateName] = useState('');
    const [saveTemplateError, setSaveTemplateError] = useState('');
    const [isApplyingTemplate, setIsApplyingTemplate] = useState(false);
    const fileInputRef = useRef(null);
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
    const handleRefreshIntervalChange = async (event) => {
        const newRefreshInterval = event.target.value;
        setRefreshInterval(newRefreshInterval);
        // Save the refresh interval to settings
        try {
            await updateAppSettingsWithMutate({ refreshInterval: newRefreshInterval }, refreshSettings);
        }
        catch (err) {
            console.error('Failed to update refresh interval:', err);
        }
    };
    // Template handlers
    const handleTemplateChange = (event) => {
        const templateName = event.target.value;
        setSelectedTemplate(templateName);
    };
    const handleApplyTemplate = async () => {
        if (selectedTemplate) {
            try {
                // Show progress overlay
                setIsApplyingTemplate(true);
                const result = await applyTemplateWithMutate(selectedTemplate, refreshTemplates, refreshConfigurations);
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
            }
            catch (err) {
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
            }
            else {
                setSaveTemplateError(result.error || 'Failed to save template');
            }
        }
        catch (err) {
            console.error('Error saving template:', err);
            setSaveTemplateError('An unexpected error occurred');
        }
    };
    const handleUploadClick = () => {
        if (fileInputRef.current) {
            fileInputRef.current.click();
        }
    };
    const handleFileUpload = async (event) => {
        const file = event.target.files?.[0];
        if (!file)
            return;
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
            }
            else {
                console.error('Failed to upload template:', result.error);
            }
        }
        catch (err) {
            console.error('Error uploading template file:', err);
        }
        // Reset the file input
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };
    const handleSubmit = (e) => {
        e.preventDefault();
        if (inputValue.trim()) {
            setNamespace(inputValue);
            onNamespaceChange(inputValue);
        }
    };
    return (_jsxs(Box, { children: [_jsx(Typography, { variant: "h6", gutterBottom: true, children: "Configuration" }), _jsx(Divider, { sx: { mb: 2 } }), _jsxs(Box, { component: "form", onSubmit: handleSubmit, sx: { display: 'flex', flexDirection: 'column', gap: 2 }, children: [_jsx(TextField, { label: "Giger", variant: "outlined", value: inputValue, onChange: (e) => setInputValue(e.target.value), size: "small", fullWidth: true }), _jsx(Button, { type: "submit", variant: "contained", color: "primary", fullWidth: true, children: "Change" }), _jsxs(FormControl, { fullWidth: true, size: "small", children: [_jsx(InputLabel, { id: "refresh-interval-label", children: "Refresh interval" }), _jsxs(Select, { labelId: "refresh-interval-label", value: refreshInterval, onChange: handleRefreshIntervalChange, label: "Refresh interval", children: [_jsx(MenuItem, { value: "5s", children: "5s" }), _jsx(MenuItem, { value: "10s", children: "10s" }), _jsx(MenuItem, { value: "15s", children: "15s" }), _jsx(MenuItem, { value: "30s", children: "30s" }), _jsx(MenuItem, { value: "1m", children: "1m" })] })] }), _jsx(Typography, { variant: "subtitle1", sx: { mt: 2 }, children: "Templates" }), _jsxs(Box, { sx: { display: 'flex', alignItems: 'center', gap: 1 }, children: [_jsxs(FormControl, { fullWidth: true, size: "small", children: [_jsx(InputLabel, { id: "template-select-label", children: "Select Template" }), _jsxs(Select, { labelId: "template-select-label", value: selectedTemplate, onChange: handleTemplateChange, label: "Select Template", children: [_jsx(MenuItem, { value: "", children: _jsx("em", { children: "None" }) }), templates?.map((template) => (_jsx(MenuItem, { value: template.name, children: template.name }, template.name)))] })] }), selectedTemplate ? (_jsxs(_Fragment, { children: [_jsx(Tooltip, { title: "Delete template", children: _jsx(IconButton, { color: "error", component: "a", onClick: () => { setSelectedTemplate(''); deleteTemplate(selectedTemplate); }, download: true, disabled: !selectedTemplate, children: _jsx(DeleteIcon, {}) }) }), _jsx(Tooltip, { title: "Download template", children: _jsx(IconButton, { color: "primary", component: "a", href: getTemplateDownloadUrl(selectedTemplate), download: true, disabled: !selectedTemplate, children: _jsx(DownloadIcon, {}) }) })] })) : (_jsx(Tooltip, { title: "Upload template", children: _jsx(IconButton, { color: "primary", onClick: handleUploadClick, children: _jsx(UploadIcon, {}) }) })), _jsx("input", { type: "file", ref: fileInputRef, style: { display: 'none' }, accept: ".json", onChange: handleFileUpload })] }), _jsx(Button, { variant: "outlined", color: "primary", onClick: handleOpenSaveTemplateDialog, fullWidth: true, children: "Save Current Config as Template" }), _jsx(Button, { variant: "contained", color: "primary", onClick: handleApplyTemplate, fullWidth: true, disabled: !selectedTemplate, sx: { mt: 1 }, children: "Apply Template" })] }), _jsxs(Typography, { variant: "body2", sx: { mt: 2, color: 'text.secondary' }, children: ["Current: ", _jsx("strong", { children: namespace })] }), _jsxs(Dialog, { open: saveTemplateDialogOpen, onClose: handleCloseSaveTemplateDialog, children: [_jsx(DialogTitle, { children: "Save as Template" }), _jsxs(DialogContent, { children: [_jsx(DialogContentText, { children: "Enter a name for your template. This will save the current port forwarding configuration." }), _jsx(TextField, { autoFocus: true, margin: "dense", label: "Template Name", type: "text", fullWidth: true, variant: "outlined", value: newTemplateName, onChange: (e) => setNewTemplateName(e.target.value), error: !!saveTemplateError, helperText: saveTemplateError })] }), _jsxs(DialogActions, { children: [_jsx(Button, { onClick: handleCloseSaveTemplateDialog, children: "Cancel" }), _jsx(Button, { onClick: handleSaveTemplate, color: "primary", children: "Save" })] })] }), _jsxs(Backdrop, { sx: {
                    color: '#fff',
                    zIndex: (theme) => theme.zIndex.drawer + 1,
                    flexDirection: 'column',
                    gap: 2
                }, open: isApplyingTemplate, children: [_jsx(CircularProgress, { color: "inherit" }), _jsx(Typography, { variant: "h6", children: "Applying template..." })] })] }));
};
export default NamespaceSelector;
