import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useThemeContext } from '../../context/ThemeContext';
import {
  Paper,
  Box,
  Typography,
  TextField,
  Button,
  Stack,
  Alert,
  Avatar,
  Checkbox,
  FormControlLabel,
  Link as MuiLink,
  InputAdornment,
  IconButton,
  CircularProgress,
  Snackbar,
} from '@mui/material';

import {
  LockOutlined,
  Visibility,
  VisibilityOff,
  PersonOutline,
  EmailOutlined,
  LightMode,
  NightlightRound,
} from '@mui/icons-material';
import { API_BASE_URL } from '../Subject/utils/utils.js';

const Register = () => {
  const { themeMode, toggleTheme } = useThemeContext();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [success, setSuccess] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);

  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess(false);

    if (!agreeTerms) {
      setError("You must agree to the terms and conditions");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/register/`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, email, password }),
        }
      );

      if (response.ok) {
        setSuccess(true);
        setTimeout(() => {
          navigate('/login');
        }, 2000);
      } else {
        const errorData = await response.json();
        setError(errorData.detail || errorData.message || 'Registration failed');
      }
    } catch (err) {
      setError('Registration failed. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background:
          'linear-gradient(135deg, #0f0c29, #302b63, #24243e)',
        backgroundSize: '400% 400%',
        animation: 'gradient 18s ease infinite',
        '@keyframes gradient': {
          '0%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
          '100%': { backgroundPosition: '0% 50%' },
        },
      }}
    >
      <IconButton
        onClick={toggleTheme}
        sx={{
          position: 'absolute',
          top: 16,
          right: 16,
          color: 'white',
        }}
      >
        {themeMode === 'dark' ? <LightMode /> : <NightlightRound />}
      </IconButton>
      <Paper
        elevation={0}
        sx={{
          width: '100%',
          maxWidth: 420,
          p: 4,
          borderRadius: 4,
          bgcolor: 'background.paper',
          boxShadow: '0 30px 60px rgba(0,0,0,0.25)',
        }}
      >
        <Box textAlign="center">
          <Avatar
            sx={{
              mx: 'auto',
              mb: 1,
              width: 64,
              height: 64,
              background:
                'linear-gradient(135deg, #1976d2, #42a5f5)',
              boxShadow: '0 10px 25px rgba(25,118,210,0.45)',
            }}
          >
            <LockOutlined fontSize="large" />
          </Avatar>

          <Typography variant="h5" fontWeight={700}>
            Create Account
          </Typography>
          <Typography variant="body2" color="text.secondary" mb={3}>
            Sign up to get started
          </Typography>
        </Box>

        <Box component="form" onSubmit={handleRegister}>
          <Stack spacing={2}>

            <TextField
              label="Username"
              fullWidth
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              autoFocus
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <PersonOutline />
                  </InputAdornment>
                ),
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 3,
                  marginBottom: 2,
                  backgroundColor: 'action.hover',
                  transition: 'all 0.2s ease-in-out',
                  '&:hover': {
                    backgroundColor: 'action.selected',
                  },
                  '&.Mui-focused': {
                    backgroundColor: 'background.paper',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                  },
                },
              }}
            />

            <TextField
              label="Email"
              type="email"
              fullWidth
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <EmailOutlined />
                  </InputAdornment>
                ),
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 3,
                  marginBottom: 2,
                  backgroundColor: 'action.hover',
                  transition: 'all 0.2s ease-in-out',
                  '&:hover': {
                    backgroundColor: 'action.selected',
                  },
                  '&.Mui-focused': {
                    backgroundColor: 'background.paper',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                  },
                },
              }}
            />

            <TextField
              label="Password"
              type={showPassword ? 'text' : 'password'}
              fullWidth
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <LockOutlined />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowPassword((p) => !p)}
                      edge="end"
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 3,
                  marginBottom: 2,
                  backgroundColor: 'action.hover',
                  transition: 'all 0.2s ease-in-out',
                  '&:hover': {
                    backgroundColor: 'action.selected',
                  },
                  '&.Mui-focused': {
                    backgroundColor: 'background.paper',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                  },
                },
              }}
            />

            <TextField
              label="Confirm Password"
              type={showPassword ? 'text' : 'password'}
              fullWidth
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <LockOutlined />
                  </InputAdornment>
                ),
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 3,
                  marginBottom: 2,
                  backgroundColor: 'action.hover',
                  transition: 'all 0.2s ease-in-out',
                  '&:hover': {
                    backgroundColor: 'action.selected',
                  },
                  '&.Mui-focused': {
                    backgroundColor: 'background.paper',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                  },
                },
              }}
            />

            <FormControlLabel
              control={<Checkbox checked={agreeTerms} onChange={(e) => setAgreeTerms(e.target.checked)} color="primary" />}
              label={
                <Typography variant="body2" color="text.secondary">
                  I agree to the <MuiLink component={Link} to="/terms">Terms</MuiLink> & <MuiLink component={Link} to="/privacy">Privacy Policy</MuiLink>
                </Typography>
              }
            />

            <Button
              type="submit"
              fullWidth
              size="large"
              disabled={loading}
              sx={{
                mt: 1,
                py: 1.4,
                fontWeight: 700,
                borderRadius: 3,
                background:
                  'linear-gradient(135deg, #1976d2, #42a5f5)',
                boxShadow: '0 10px 25px rgba(25,118,210,0.45)',
                color: '#000',
                fontStyle: 'normal',
                transition: 'all 0.3s ease',
                '&:hover': {
                  transform: 'translateY(-2px)',
                  boxShadow:
                    '0 15px 35px rgba(25,118,210,0.6)',
                },
              }}
            >
              {loading ? (
                <CircularProgress size={26} color="#000000" />
              ) : (
                'Register'
              )}
            </Button>

            <Box mt={2} textAlign="center">
              <Typography variant="body2" color="text.secondary">
                Already have an account?{' '}
                <MuiLink component={Link} to="/login" underline="hover" fontWeight="bold">
                  Log In
                </MuiLink>
              </Typography>
            </Box>
          </Stack>
        </Box>
      </Paper>

      <Snackbar open={!!error} autoHideDuration={6000} onClose={() => setError('')} anchorOrigin={{ vertical: 'top', horizontal: 'center' }}>
        <Alert onClose={() => setError('')} severity="error" sx={{ width: '100%' }} variant="filled">
          {error}
        </Alert>
      </Snackbar>

      <Snackbar open={success} autoHideDuration={6000} onClose={() => setSuccess(false)} anchorOrigin={{ vertical: 'top', horizontal: 'center' }}>
        <Alert onClose={() => setSuccess(false)} severity="success" sx={{ width: '100%' }} variant="filled">
          Registration successful! Redirecting to login...
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default Register;
