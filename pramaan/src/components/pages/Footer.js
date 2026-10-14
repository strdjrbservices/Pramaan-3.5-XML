import React from 'react';
import { Box, Typography, Link, Stack } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';

const Footer = () => {
  return (
    <Box sx={{ mt: 8, textAlign: 'center', borderTop: '1px solid', borderColor: 'divider', pt: 4, pb: 4 }}>
      <Typography variant="body2" color="text.secondary" gutterBottom>
        &copy; {new Date().getFullYear()} DJRB Services. All rights reserved.
      </Typography>
      <Stack direction="row" spacing={3} justifyContent="center">
        <Link component={RouterLink} to="/terms" color="text.secondary" underline="hover" variant="body2">
          Terms of Service
        </Link>
        <Link component={RouterLink} to="/privacy" color="text.secondary" underline="hover" variant="body2">
          Privacy Policy
        </Link>
      </Stack>
    </Box>
  );
};

export default Footer;
