import { jsxs as _jsxs, jsx as _jsx } from "react/jsx-runtime";
import React, { useState, useEffect } from 'react';
import { Typography, Box, TextField, Popover, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, } from '@mui/material';
const EnvironmentVariablesPopover = ({ open, anchorEl, onClose, pod, title, }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [filteredEnvVars, setFilteredEnvVars] = useState([]);
    // Extract app name from pod labels
    const getAppName = (pod) => {
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
        const envVars = [];
        pod.spec.containers.forEach(container => {
            if (container.env) {
                container.env.forEach(env => {
                    // Handle different types of env vars
                    let value = env.value || '';
                    if (env.valueFrom) {
                        if (env.valueFrom.fieldRef) {
                            value = `[Field Ref: ${env.valueFrom.fieldRef.fieldPath}]`;
                        }
                        else if (env.valueFrom.secretKeyRef) {
                            value = `[Secret: ${env.valueFrom.secretKeyRef.name}.${env.valueFrom.secretKeyRef.key}]`;
                        }
                        else if (env.valueFrom.configMapKeyRef) {
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
    const handleSearchChange = (event) => {
        const term = event.target.value.toLowerCase();
        setSearchTerm(term);
        if (!pod)
            return;
        const envVars = [];
        pod.spec.containers.forEach(container => {
            if (container.env) {
                container.env.forEach(env => {
                    // Handle different types of env vars
                    let value = env.value || '';
                    if (env.valueFrom) {
                        if (env.valueFrom.fieldRef) {
                            value = `[Field Ref: ${env.valueFrom.fieldRef.fieldPath}]`;
                        }
                        else if (env.valueFrom.secretKeyRef) {
                            value = `[Secret: ${env.valueFrom.secretKeyRef.name}.${env.valueFrom.secretKeyRef.key}]`;
                        }
                        else if (env.valueFrom.configMapKeyRef) {
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
    return (_jsx(Popover, { open: open, anchorEl: anchorEl, onClose: onClose, anchorOrigin: {
            vertical: 'center',
            horizontal: 'center',
        }, transformOrigin: {
            vertical: 'center',
            horizontal: 'center',
        }, PaperProps: {
            sx: { width: '80%', maxWidth: '800px', maxHeight: '80vh' }
        }, children: _jsxs(Box, { sx: { p: 3 }, children: [_jsxs(Typography, { variant: "h6", gutterBottom: true, children: [title || 'Environment Variables', " ", pod && `for ${getAppName(pod)}`] }), _jsx(TextField, { label: "Search Variables", variant: "outlined", fullWidth: true, margin: "normal", value: searchTerm, onChange: handleSearchChange, placeholder: "Search by name or value", size: "small", sx: { mb: 2 } }), _jsx(TableContainer, { component: Paper, sx: { maxHeight: '60vh' }, children: _jsxs(Table, { stickyHeader: true, size: "small", children: [_jsx(TableHead, { children: _jsxs(TableRow, { children: [_jsx(TableCell, { children: _jsx("strong", { children: "Container" }) }), _jsx(TableCell, { children: _jsx("strong", { children: "Name" }) }), _jsx(TableCell, { children: _jsx("strong", { children: "Value" }) })] }) }), _jsx(TableBody, { children: filteredEnvVars.length > 0 ? (filteredEnvVars.map((env, index) => (_jsxs(TableRow, { children: [_jsx(TableCell, { children: env.container }), _jsx(TableCell, { children: env.name }), _jsx(TableCell, { sx: { wordBreak: 'break-all' }, children: env.value })] }, `${env.container}-${env.name}-${index}`)))) : (_jsx(TableRow, { children: _jsx(TableCell, { colSpan: 3, align: "center", children: searchTerm ? 'No matching environment variables found' : 'No environment variables available' }) })) })] }) })] }) }));
};
export default EnvironmentVariablesPopover;
