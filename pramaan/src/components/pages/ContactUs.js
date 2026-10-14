import React, { useState } from 'react';
import { Box, Typography, Paper, Container, Button, TextField, Grid, Snackbar, Alert, Stack, Checkbox, FormControlLabel, CircularProgress } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import EmailIcon from '@mui/icons-material/Email';
import PhoneIcon from '@mui/icons-material/Phone';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import SendIcon from '@mui/icons-material/Send';
import { useNavigate, } from 'react-router-dom';
import PremiumLogo from '../auth/logo';
import { API_BASE_URL } from '../Subject/utils/utils.js';
import Footer from './Footer';

const ContactUs = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
    sendCopy: false
  });
  const [errors, setErrors] = useState({});
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    });
    if (errors[name]) {
      setErrors({
        ...errors,
        [name]: ''
      });
    }
  };

  const validate = () => {
    let tempErrors = {};
    let isValid = true;

    if (!formData.name.trim()) {
      tempErrors.name = 'Name is required';
      isValid = false;
    }

    if (!formData.email.trim()) {
      tempErrors.email = 'Email is required';
      isValid = false;
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      tempErrors.email = 'Email is invalid';
      isValid = false;
    }

    if (!formData.subject.trim()) {
      tempErrors.subject = 'Subject is required';
      isValid = false;
    }

    if (!formData.message.trim()) {
      tempErrors.message = 'Message is required';
      isValid = false;
    }

    setErrors(tempErrors);
    return isValid;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (validate()) {
      setLoading(true);
      try {
        const response = await fetch(`${API_BASE_URL}/api/contact/`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ ...formData, sendCopy: true }),
        });

        if (response.ok) {
          setSnackbar({
            open: true,
            message: 'Thank you for contacting us! A confirmation email has been sent.',
            severity: 'success'
          });
          setFormData({ name: '', email: '', subject: '', message: '', sendCopy: false });
        } else {
          throw new Error('Failed to send message');
        }
      } catch (error) {
        setSnackbar({ open: true, message: 'Failed to send the message. Please try again later.', severity: 'error' });
      } finally {
        setLoading(false);
      }
    }
  };

  const handleCloseSnackbar = (event, reason) => {
    if (reason === 'clickaway') {
      return;
    }
    setSnackbar({ ...snackbar, open: false });
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f0f2f5', py: 8 }}>
      <Container maxWidth="lg">
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate(-1)}
          sx={{ mb: 4, color: 'text.secondary', '&:hover': { color: 'primary.main', bgcolor: 'transparent' } }}
        >
          Back
        </Button>

        <Grid container spacing={4} alignItems="stretch">
          <Grid item xs={12} md={5}>
            <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', pr: { md: 4 } }}>
              <Box display="flex" alignItems="center" gap={2} mb={4}>
                <PremiumLogo size={80} fullScreen={false} />
              </Box>
              <Typography variant="h3" fontWeight={800} gutterBottom sx={{
                background: 'linear-gradient(45deg, #1976d2, #9c27b0)',
                backgroundClip: 'text',
                textFillColor: 'transparent',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}>
                Get in Touch
              </Typography>
              <Typography variant="h6" color="text.secondary" paragraph sx={{ mb: 6 }}>
                Have questions about the Appraisal Review Tool? We're here to help you streamline your workflow.
              </Typography>

              <Stack spacing={4}>
                <Paper elevation={0} sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 3, display: 'flex', alignItems: 'center', gap: 2.5 }}>
                  <Box sx={{ p: 1.5, bgcolor: 'primary.main', color: 'white', borderRadius: 2, display: 'flex' }}>
                    <EmailIcon fontSize="medium" />
                  </Box>
                  <Box>
                    <Typography variant="subtitle2" fontWeight="bold" color="text.secondary">Email Us</Typography>
                    <Typography variant="body1" fontWeight={600}>strdjrbservices@gmail.com</Typography>
                  </Box>
                </Paper>

                <Paper elevation={0} sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 3, display: 'flex', alignItems: 'center', gap: 2.5 }}>
                  <Box sx={{ p: 1.5, bgcolor: 'secondary.main', color: 'white', borderRadius: 2, display: 'flex' }}>
                    <PhoneIcon fontSize="medium" />
                  </Box>
                  <Box>
                    <Typography variant="subtitle2" fontWeight="bold" color="text.secondary">Call Us</Typography>
                    <Typography variant="body1" fontWeight={600}>+1 (555) 123-4567</Typography>
                  </Box>
                </Paper>

                <Paper elevation={0} sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 3, display: 'flex', alignItems: 'center', gap: 2.5 }}>
                  <Box sx={{ p: 1.5, bgcolor: 'warning.main', color: 'white', borderRadius: 2, display: 'flex' }}>
                    <LocationOnIcon fontSize="medium" />
                  </Box>
                  <Box>
                    <Typography variant="subtitle2" fontWeight="bold" color="text.secondary">Visit Us</Typography>
                    <Typography variant="body1" fontWeight={600}>
                      Office 101, City Center Building,
                      Hinjawadi Phase 1 Rd, Pune, MH 411057
                    </Typography>
                  </Box>
                </Paper>
              </Stack>
            </Box>
          </Grid>
          <Grid item xs={12} md={7}>
            <Paper elevation={3} sx={{ p: { xs: 4, md: 6 }, borderRadius: 4, bgcolor: 'background.paper' }}>
              <Typography variant="h5" fontWeight={700} gutterBottom>
                Send us a Message
              </Typography>
              <Typography variant="body2" color="text.secondary" mb={4}>
                Fill out the form below and we'll get back to you as soon as possible.
              </Typography>

              <Box component="form" noValidate autoComplete="off" onSubmit={handleSubmit}>
                <Grid container spacing={3}>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Name"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      error={!!errors.name}
                      helperText={errors.name}
                      variant="outlined"
                      required
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      error={!!errors.email}
                      helperText={errors.email}
                      variant="outlined"
                      required
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Subject"
                      name="subject"
                      value={formData.subject}
                      onChange={handleChange}
                      error={!!errors.subject}
                      helperText={errors.subject}
                      variant="outlined"
                      required
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Message"
                      name="message"
                      value={formData.message}
                      onChange={handleChange}
                      error={!!errors.message}
                      helperText={errors.message}
                      variant="outlined"
                      multiline
                      rows={4}
                      required
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={formData.sendCopy}
                          onChange={handleChange}
                          name="sendCopy"
                          color="primary"
                        />
                      }
                      label="Send a copy to my email"
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <Button
                      type="submit"
                      variant="contained"
                      color="primary"
                      size="large"
                      endIcon={!loading && <SendIcon />}
                      disabled={loading}
                      fullWidth
                      sx={{ py: 1.5, borderRadius: 2, fontWeight: 'bold', textTransform: 'none', fontSize: '1rem' }}
                    >
                      {loading ? <CircularProgress size={24} color="inherit" /> : 'Send Message'}
                    </Button>
                  </Grid>
                </Grid>
              </Box>
            </Paper>
          </Grid>
        </Grid>

        <Paper elevation={3} sx={{ mt: 6, borderRadius: 4, overflow: 'hidden', height: 450 }}>
          <iframe
            title="Office Location"
            width="100%"
            height="100%"
            frameBorder="0"
            style={{ border: 0 }}
            src="https://maps.google.com/maps?q=DJRB+SERVICES+PRIVATE+LIMITED&t=&z=15&ie=UTF8&iwloc=B&output=embed"
            allowFullScreen
          />
        </Paper>

        <Box sx={{ mt: 3, display: 'flex', justifyContent: 'center' }}>
          <Button
            variant="outlined"
            size="large"
            startIcon={<LocationOnIcon />}
            href="https://www.google.com/maps/dir/?api=1&destination=DJRB+SERVICES+PRIVATE+LIMITED"
            target="_blank"
            rel="noopener noreferrer"
            sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 'bold', borderWidth: 2, '&:hover': { borderWidth: 2 } }}
          >
            Get Directions
          </Button>
        </Box>

        <Footer />
      </Container>
      <Snackbar open={snackbar.open} autoHideDuration={6000} onClose={handleCloseSnackbar} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }} variant="filled">
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default ContactUs;
