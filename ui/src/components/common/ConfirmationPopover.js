import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from 'react';
import { Popover, Box, Typography, Button, Stack } from '@mui/material';
const ConfirmationPopover = ({ open, anchorEl, onClose, onConfirm, title, message, confirmText = 'Confirm', cancelText = 'Cancel' }) => {
    const handleConfirm = () => {
        onConfirm();
        onClose();
    };
    return (_jsx(Popover, { open: open, anchorEl: anchorEl, onClose: onClose, anchorOrigin: {
            vertical: 'bottom',
            horizontal: 'center',
        }, transformOrigin: {
            vertical: 'top',
            horizontal: 'center',
        }, children: _jsxs(Box, { sx: { p: 2, maxWidth: 300 }, children: [_jsx(Typography, { variant: "h6", gutterBottom: true, children: title }), _jsx(Typography, { variant: "body2", sx: { mb: 2 }, children: message }), _jsxs(Stack, { direction: "row", spacing: 1, justifyContent: "flex-end", children: [_jsx(Button, { variant: "outlined", onClick: onClose, size: "small", children: cancelText }), _jsx(Button, { variant: "contained", onClick: handleConfirm, color: "error", size: "small", children: confirmText })] })] }) }));
};
export default ConfirmationPopover;
