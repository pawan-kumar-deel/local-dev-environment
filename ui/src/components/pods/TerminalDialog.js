import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useState } from 'react';
import { Typography, Box, TextField, Button, Dialog, DialogTitle, DialogContent, IconButton, FormControl, InputLabel, Select, MenuItem, } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
const TerminalDialog = ({ open, onClose, pod, availablePods, selectedPodName, isExecuting, onExecuteCommand, onChangePod, commandHistory, }) => {
    const [command, setCommand] = useState('');
    // Extract app name from pod labels
    const getAppName = (pod) => {
        if (pod.metadata.labels && pod.metadata.labels.app) {
            return pod.metadata.labels.app;
        }
        return pod.metadata.name; // Fallback to pod name if app label doesn't exist
    };
    const handleCommandChange = (event) => {
        setCommand(event.target.value);
    };
    const handleKeyDown = (event) => {
        if (event.key === 'Enter' && !isExecuting) {
            event.preventDefault();
            handleExecuteCommand();
        }
    };
    const handleExecuteCommand = async () => {
        if (!command.trim() || isExecuting)
            return;
        await onExecuteCommand(command);
        setCommand('');
    };
    const handlePodChange = (event) => {
        onChangePod(event.target.value);
    };
    return (_jsxs(Dialog, { open: open, onClose: onClose, maxWidth: "lg", fullWidth: true, PaperProps: {
            sx: {
                minHeight: '60vh',
                maxHeight: '80vh',
                display: 'flex',
                flexDirection: 'column'
            }
        }, children: [_jsxs(DialogTitle, { sx: {
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    p: 2
                }, children: [_jsxs(Box, { sx: { display: 'flex', alignItems: 'center', flexGrow: 1 }, children: [_jsx(Typography, { variant: "h6", sx: { mr: 2 }, children: "Run Terminal Command" }), _jsxs(FormControl, { size: "small", sx: { minWidth: 200 }, children: [_jsx(InputLabel, { id: "pod-select-label", children: "Select Pod" }), _jsx(Select, { labelId: "pod-select-label", value: selectedPodName, onChange: handlePodChange, label: "Select Pod", disabled: isExecuting, children: availablePods.map((pod) => (_jsx(MenuItem, { value: pod.metadata.name, children: pod.metadata.name }, pod.metadata.name))) })] })] }), _jsx(IconButton, { edge: "end", color: "inherit", onClick: onClose, "aria-label": "close", children: _jsx(CloseIcon, {}) })] }), _jsxs(DialogContent, { sx: {
                    p: 2,
                    flexGrow: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden'
                }, children: [_jsx(Box, { sx: {
                            flexGrow: 1,
                            bgcolor: '#1e1e1e',
                            color: 'white',
                            p: 2,
                            borderRadius: 1,
                            fontFamily: 'monospace',
                            overflow: 'auto',
                            mb: 2
                        }, children: commandHistory.length > 0 ? (_jsx(Box, { component: "pre", sx: {
                                m: 0,
                                whiteSpace: 'pre-wrap',
                                wordBreak: 'break-word',
                                fontSize: '0.875rem',
                                lineHeight: 1.5
                            }, children: commandHistory.map((item, index) => (_jsxs(Box, { sx: { mb: 2 }, children: [_jsxs(Box, { sx: { color: '#4caf50', fontWeight: 'bold' }, children: ["$ ", item.command] }), _jsx(Box, { sx: { mt: 0.5, color: 'white' }, children: item.output })] }, index))) })) : (_jsx(Typography, { variant: "body2", sx: { color: '#aaa', fontStyle: 'italic' }, children: "Enter a command below to execute it in the pod." })) }), _jsxs(Box, { sx: { display: 'flex' }, children: [_jsx(TextField, { label: "Command", variant: "outlined", fullWidth: true, value: command, onChange: handleCommandChange, onKeyDown: handleKeyDown, placeholder: "Enter command to execute", size: "small", disabled: isExecuting, sx: {
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
                                }, InputProps: {
                                    sx: { bgcolor: '#2d2d2d' }
                                } }), _jsx(Button, { variant: "contained", color: "primary", onClick: handleExecuteCommand, disabled: !command.trim() || isExecuting, children: isExecuting ? 'Executing...' : 'Execute' })] })] })] }));
};
export default TerminalDialog;
