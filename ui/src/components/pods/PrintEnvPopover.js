import { jsxs as _jsxs, jsx as _jsx } from "react/jsx-runtime";
import React, { useState } from 'react';
import { Typography, Box, TextField, Popover, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, } from '@mui/material';
const PrintEnvPopover = ({ open, anchorEl, onClose, pod, envVars, onSearchChange, searchTerm, }) => {
    // Extract app name from pod labels
    const getAppName = (pod) => {
        if (pod.metadata.labels && pod.metadata.labels.app) {
            return pod.metadata.labels.app;
        }
        return pod.metadata.name; // Fallback to pod name if app label doesn't exist
    };
    return (_jsx(Popover, { open: open, anchorEl: anchorEl, onClose: onClose, anchorOrigin: {
            vertical: 'center',
            horizontal: 'center',
        }, transformOrigin: {
            vertical: 'center',
            horizontal: 'center',
        }, PaperProps: {
            sx: { width: '80%', maxWidth: '800px', maxHeight: '80vh' }
        }, children: _jsxs(Box, { sx: { p: 3 }, children: [_jsxs(Typography, { variant: "h6", gutterBottom: true, children: ["PrintEnv Output ", pod && `for ${getAppName(pod)}`] }), _jsx(TextField, { label: "Search Variables", variant: "outlined", fullWidth: true, margin: "normal", value: searchTerm, onChange: onSearchChange, placeholder: "Search by name or value", size: "small", sx: { mb: 2 } }), _jsx(TableContainer, { component: Paper, sx: { maxHeight: '60vh' }, children: _jsxs(Table, { stickyHeader: true, size: "small", children: [_jsx(TableHead, { children: _jsxs(TableRow, { children: [_jsx(TableCell, { children: _jsx("strong", { children: "Container" }) }), _jsx(TableCell, { children: _jsx("strong", { children: "Name" }) }), _jsx(TableCell, { children: _jsx("strong", { children: "Value" }) })] }) }), _jsx(TableBody, { children: envVars.length > 0 ? (envVars.map((env, index) => (_jsxs(TableRow, { children: [_jsx(TableCell, { children: env.container }), _jsx(TableCell, { children: env.name }), _jsx(TableCell, { sx: { wordBreak: 'break-all' }, children: env.value })] }, `printenv-${env.container}-${env.name}-${index}`)))) : (_jsx(TableRow, { children: _jsx(TableCell, { colSpan: 3, align: "center", children: searchTerm ? 'No matching environment variables found' : 'No environment variables available' }) })) })] }) })] }) }));
};
export default PrintEnvPopover;
