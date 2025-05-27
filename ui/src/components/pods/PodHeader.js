import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from 'react';
import { Typography, Chip, Box, IconButton, Tooltip, } from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';
import AssessmentIcon from '@mui/icons-material/Assessment';
import TerminalIcon from '@mui/icons-material/Terminal';
import CodeIcon from '@mui/icons-material/Code';
const PodHeader = ({ pod, onEnvVarsClick, onPrintEnvClick, onTerminalClick, datadogLink, }) => {
    // Helper functions
    const getAppName = () => {
        if (pod.metadata.labels && pod.metadata.labels.app) {
            return pod.metadata.labels.app;
        }
        return pod.metadata.name; // Fallback to pod name if app label doesn't exist
    };
    const getRestartCount = () => {
        if (!pod.status.containerStatuses || pod.status.containerStatuses.length === 0)
            return 0;
        // Sum up restart counts from all containers
        return pod.status.containerStatuses.reduce((total, container) => {
            return total + container.restartCount;
        }, 0);
    };
    return (_jsxs(Box, { sx: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }, children: [_jsxs(Box, { sx: { display: 'flex', alignItems: 'center', maxWidth: '70%' }, children: [_jsx(Typography, { variant: "h6", component: "div", noWrap: true, sx: { mr: 1 }, children: getAppName() }), _jsxs(Box, { sx: { display: 'flex' }, children: [_jsx(Tooltip, { title: "View Environment Variables", children: _jsx(IconButton, { size: "small", color: "primary", onClick: onEnvVarsClick, "aria-label": "view environment variables", children: _jsx(VisibilityIcon, {}) }) }), _jsx(Tooltip, { title: "Execute printenv Command", children: _jsx(IconButton, { size: "small", color: "primary", onClick: onPrintEnvClick, "aria-label": "execute printenv command", children: _jsx(CodeIcon, {}) }) }), _jsx(Tooltip, { title: "Run Terminal Command", children: _jsx(IconButton, { size: "small", color: "primary", onClick: onTerminalClick, "aria-label": "run terminal command", children: _jsx(TerminalIcon, {}) }) }), _jsx(Tooltip, { title: "View in Datadog", children: _jsx(IconButton, { size: "small", color: "primary", component: "a", href: datadogLink, target: "_blank", rel: "noopener noreferrer", "aria-label": "view in datadog", children: _jsx(AssessmentIcon, {}) }) })] })] }), _jsxs(Box, { sx: { display: 'flex', alignItems: 'center' }, children: [_jsx(Chip, { label: pod.status.phase, color: pod.status.phase === 'Running' ? 'success' : 'warning', size: "small" }), pod.status.phase === 'Running' && (_jsxs(Typography, { variant: "body2", color: "text.secondary", sx: { ml: 1 }, children: ["Restarts: ", getRestartCount()] }))] })] }));
};
export default PodHeader;
