import React from 'react';
import { Box, Typography, Paper, Container, Button } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useNavigate } from 'react-router-dom';

const TermsOfService = () => {
  const navigate = useNavigate();

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f5f6f8', py: 5 }}>
      <Container maxWidth="md">
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate(-1)}
          sx={{ mb: 3 }}
        >
          Back
        </Button>

        <Paper elevation={0} sx={{ p: { xs: 3, md: 5 }, borderRadius: 4 }}>
          <Typography variant="h4" gutterBottom fontWeight={800} color="primary">
            Terms of Service
          </Typography>
          <Typography variant="body1" paragraph color="text.secondary">
            Last updated: {new Date().toLocaleDateString()}
          </Typography>

          <Typography variant="h6" gutterBottom fontWeight={700} sx={{ mt: 3 }}>
            1. Acceptance of Terms
          </Typography>
          <Typography paragraph color="text.secondary">
            By accessing or using our service, you agree to be bound by these Terms. If you disagree with any part of the terms, then you may not access the service.
          </Typography>

          <Typography variant="h6" gutterBottom fontWeight={700} sx={{ mt: 3 }}>
            2. Use of Service
          </Typography>
          <Typography paragraph color="text.secondary">
            You agree to use the service only for lawful purposes and in accordance with these Terms. You are responsible for maintaining the confidentiality of your account and password.
          </Typography>

          <Typography variant="h6" gutterBottom fontWeight={700} sx={{ mt: 3 }}>
            3. Intellectual Property
          </Typography>
          <Typography paragraph color="text.secondary">
            The service and its original content, features, and functionality are and will remain the exclusive property of DJRB Services and its licensors.
          </Typography>

          <Typography paragraph color="text.secondary" sx={{ mt: 4, fontStyle: 'italic' }}>
            This is a placeholder for the full Terms of Service agreement.
          </Typography>
        </Paper>
      </Container>
    </Box>
  );
};

export default TermsOfService;
