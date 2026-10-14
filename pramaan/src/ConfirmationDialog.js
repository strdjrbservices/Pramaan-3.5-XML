import React from 'react';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';

function ConfirmationDialog({ open, onClose, onConfirm, title, message }) {
  return (
    <Dialog
      open={open}
      onClose={() => onClose(false)}
      aria-labelledby="alert-dialog-title"
      aria-describedby="alert-dialog-description"
    >
      <DialogTitle id="alert-dialog-title">
        {title || "Confirm Navigation"}
      </DialogTitle>
      <DialogContent>
        <DialogContentText id="alert-dialog-description">
          {message || "You have unsaved changes. Are you sure you want to leave this page? Your changes will be lost."}
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => onClose(false)} color="primary">
          Cancel
        </Button>
        <Button onClick={() => onConfirm()} color="primary" autoFocus>
          Leave
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default ConfirmationDialog;