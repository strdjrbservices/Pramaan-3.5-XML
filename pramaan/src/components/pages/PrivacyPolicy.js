import React from 'react';
import { Box, Typography, Paper, Container, Button } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useNavigate } from 'react-router-dom';

const PrivacyPolicy = () => {
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
            Privacy Policy
          </Typography>
          <Typography variant="body1" paragraph color="text.secondary">
            Last updated: {new Date().toLocaleDateString()}
          </Typography>

          <Typography variant="h6" gutterBottom fontWeight={700} sx={{ mt: 3 }}>
            1. Information Collection
          </Typography>
          <Typography paragraph color="text.secondary">
            We collect information that you provide directly to us when you use our service, such as when you upload documents for review.
          </Typography>

          <Typography variant="h6" gutterBottom fontWeight={700} sx={{ mt: 3 }}>
            2. Use of Information
          </Typography>
          <Typography paragraph color="text.secondary">
            We use the information we collect to provide, maintain, and improve our services, including analyzing appraisal reports.
          </Typography>

          <Typography variant="h6" gutterBottom fontWeight={700} sx={{ mt: 3 }}>
            3. Data Security
          </Typography>
          <Typography paragraph color="text.secondary">
            We take reasonable measures to help protect information about you from loss, theft, misuse and unauthorized access, disclosure, alteration and destruction.
          </Typography>

          <Typography paragraph color="text.secondary" sx={{ mt: 4, fontStyle: 'italic' }}>
            This is a placeholder for the full Privacy Policy.
          </Typography>
        </Paper>
      </Container>
    </Box>
  );
};

export default PrivacyPolicy;
