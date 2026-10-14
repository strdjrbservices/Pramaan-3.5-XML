import React from 'react';
import { Box, Typography, Button, Container, Paper } from '@mui/material';
import { keyframes } from '@mui/system';
import { useNavigate } from 'react-router-dom';
import HomeIcon from '@mui/icons-material/Home';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ReportProblemIcon from '@mui/icons-material/ReportProblem';

const float = keyframes`
  0% { transform: translateY(0px); }
  50% { transform: translateY(-15px); }
  100% { transform: translateY(0px); }
`;

const NotFound = () => {
  const navigate = useNavigate();

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
        p: 2,
      }}
    >
      <Container maxWidth="sm">
        <Paper
          elevation={6}
          sx={{
            p: 2,
            borderRadius: 4,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
            backgroundColor: 'rgba(255,255,255,0.9)',
            backdropFilter: 'blur(10px)',
          }}
        >
          <Box
            component="img"
            src="https://illustrations.popsy.co/gray/crashed-error.svg"
            alt="404 Illustration"
            sx={{
              width: '100%',
              maxWidth: 280,
              height: 'auto',
              mb: 3,
              animation: `${float} 6s ease-in-out infinite`,
            }}
          />
          
          <Typography
            variant="h1"
            component="h1"
            color="primary"
            sx={{
              fontWeight: 800,
              fontSize: { xs: '4rem', md: '5rem' },
              lineHeight: 1,
              mb: 1,
              textShadow: '2px 2px 4px rgba(0,0,0,0.1)',
            }}
          >
            404
          </Typography>

          <Typography variant="h5" component="h2" gutterBottom sx={{ fontWeight: 600, mb: 2 }}>
            Page Not Found
          </Typography>

          <Typography variant="body1" color="text.secondary" paragraph sx={{ mb: 4 }}>
            The page you are looking for might have been removed, had its name changed, or is temporarily unavailable.
          </Typography>

          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', justifyContent: 'center' }}>
            <Button 
              variant="outlined" 
              size="medium" 
              startIcon={<ArrowBackIcon />}
              onClick={() => navigate(-1)}
              sx={{ borderRadius: 2, textTransform: 'none' }}
            >
              Go Back
            </Button>
            <Button 
              variant="contained" 
              size="medium" 
              startIcon={<HomeIcon />}
              onClick={() => navigate('/')}
              sx={{ borderRadius: 2, textTransform: 'none' }}
            >
              Home
            </Button>
            <Button 
              variant="text" 
              color="error" 
              size="medium" 
              startIcon={<ReportProblemIcon />}
              onClick={() => navigate('/contact')}
              sx={{ borderRadius: 2, textTransform: 'none' }}
            >
              Report
            </Button>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
};

export default NotFound;