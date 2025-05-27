import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useState } from 'react';
import { Box, Grid, Alert, Card, CardContent, CardActions, Typography, IconButton, Tooltip, } from '@mui/material';
import PortForwardingControls from './PortForwardingControls';
import PodHeader from './PodHeader';
import VisibilityIcon from '@mui/icons-material/Visibility';
import AssessmentIcon from '@mui/icons-material/Assessment';
import TerminalIcon from '@mui/icons-material/Terminal';
import CodeIcon from '@mui/icons-material/Code';
const PodCard = ({ pod, portForwardConfig, actionStatus, portInputs, onPortInputChange, onPortForward, onStopPortForward, onForcePortForward, onEnvVarsClick, onPrintEnvClick, onTerminalClick, onActionStatusClose, currentNamespace, }) => {
    const getDatadogLink = () => {
        if (!pod.metadata.labels)
            return '';
        const tags = Object.entries(pod.metadata.labels)
            .filter(([key]) => key.startsWith('tags.datadoghq.com/'))
            .map(([key, value]) => `${key}:${value}`.replace('tags.datadoghq.com/', ''))
            .join(' ');
        return `https://app.datadoghq.eu/logs?query=pod_name:${pod.metadata.name} ${tags}`;
    };
    const getExposedPorts = () => {
        const ports = [];
        pod.spec.containers.forEach(container => {
            if (container.ports) {
                container.ports.forEach(port => {
                    ports.push(port.containerPort);
                });
            }
        });
        return ports;
    };
    const exposedPorts = getExposedPorts();
    return (_jsxs(Card, { elevation: 2, sx: { width: '100%', minHeight: '100px' }, children: [_jsxs(CardContent, { children: [_jsx(PodHeader, { pod: pod, onEnvVarsClick: onEnvVarsClick, onPrintEnvClick: onPrintEnvClick, onTerminalClick: onTerminalClick, datadogLink: getDatadogLink() }), portForwardConfig && (_jsxs(Box, { sx: { mt: 2, p: 2, bgcolor: 'action.hover', borderRadius: 1 }, children: [_jsxs(Typography, { variant: "body2", children: [_jsx("strong", { children: "Active Port Forwarding:" }), " ", portForwardConfig.podPort, " \u2192 localhost:", portForwardConfig.localPort, currentNamespace && portForwardConfig.namespace !== currentNamespace && (_jsxs("span", { children: [" ", _jsxs("strong", { children: ["(", portForwardConfig.namespace || 'giger', ")"] })] }))] }), _jsxs(Typography, { variant: "body2", children: [_jsx("strong", { children: "URL:" }), ' ', _jsxs("a", { href: `http://localhost:${portForwardConfig.localPort}`, target: "_blank", rel: "noopener noreferrer", children: ["http://localhost:", portForwardConfig.localPort] })] })] })), actionStatus && (_jsx(Alert, { severity: actionStatus.success ? 'success' : 'error', sx: { mt: 2 }, onClose: onActionStatusClose, children: actionStatus.message }))] }), _jsx(CardActions, { sx: { p: 2, pt: 0, width: '100%' }, children: _jsx(PortForwardingControls, { podPort: portInputs.podPort, localPort: portInputs.localPort, exposedPorts: exposedPorts, isForwarding: !!portForwardConfig, isLoading: !!actionStatus?.isLoading, isPortInUse: !!actionStatus?.isPortInUse, statusMessage: actionStatus?.message || '', disabled: false, onPortInputChange: onPortInputChange, onPortForward: onPortForward, onStopPortForward: onStopPortForward, onForcePortForward: onForcePortForward }) })] }));
};
export default PodCard;
