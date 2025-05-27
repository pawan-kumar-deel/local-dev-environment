import React from 'react';
import {
  Popover,
  Box,
  Typography,
  Button,
  Stack
} from '@mui/material';

interface ConfirmationPopoverProps {
  open: boolean;
  anchorEl: HTMLElement | null;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
}

const ConfirmationPopover: React.FC<ConfirmationPopoverProps> = ({
  open,
  anchorEl,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel'
}) => {
  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  return (
    <Popover
      open={open}
      anchorEl={anchorEl}
      onClose={onClose}
      anchorOrigin={{
        vertical: 'bottom',
        horizontal: 'center',
      }}
      transformOrigin={{
        vertical: 'top',
        horizontal: 'center',
      }}
    >
      <Box sx={{ p: 2, maxWidth: 300 }}>
        <Typography variant="h6" gutterBottom>
          {title}
        </Typography>
        <Typography variant="body2" sx={{ mb: 2 }}>
          {message}
        </Typography>
        <Stack direction="row" spacing={1} justifyContent="flex-end">
          <Button variant="outlined" onClick={onClose} size="small">
            {cancelText}
          </Button>
          <Button variant="contained" onClick={handleConfirm} color="error" size="small">
            {confirmText}
          </Button>
        </Stack>
      </Box>
    </Popover>
  );
};

export default ConfirmationPopover;