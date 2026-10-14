import React, { useState, useEffect } from 'react';
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
  Grid,
  Link as MuiLink,
  InputAdornment,
  IconButton,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Snackbar,
} from '@mui/material';

import {
  LockOutlined,
  LockOpenOutlined,
  Visibility,
  VisibilityOff,
  PersonOutline,
  LightMode,
  NightlightRound,
} from '@mui/icons-material';
import { API_BASE_URL } from '../Subject/utils/utils.js';

const Login = ({ onLogin }) => {
  const { themeMode, toggleTheme } = useThemeContext();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [forgotPasswordOpen, setForgotPasswordOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetMessage, setResetMessage] = useState(null);

  const navigate = useNavigate();

  useEffect(() => {
    const savedUsername = localStorage.getItem('rememberedUsername');
    if (savedUsername) {
      setUsername(savedUsername);
      setRememberMe(true);
    }
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/token/`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        localStorage.setItem('authToken', data.token || data.access);
        localStorage.setItem('username', username);

        if (rememberMe) {
          localStorage.setItem('rememberedUsername', username);
        } else {
          localStorage.removeItem('rememberedUsername');
        }

        onLogin();
        navigate('/');
      } else {
        const errorData = await response.json();
        setError(errorData.detail || 'Invalid username or password');
      }
    } catch {
      setError('Login failed. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPasswordOpen = (e) => {
    e.preventDefault();
    setForgotPasswordOpen(true);
  };

  const handleForgotPasswordClose = () => {
    setForgotPasswordOpen(false);
    setResetEmail('');
    setResetMessage(null);
  };

  const handleResetSubmit = async () => {
    if (!resetEmail) {
      setResetMessage({ type: 'error', text: 'Please enter your email address.' });
      return;
    }
    setResetLoading(true);
    setResetMessage(null);

    try {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      setResetMessage({
        type: 'success',
        text: 'A temporary password has been sent to your email address.',
      });
    } catch (error) {
      setResetMessage({ type: 'error', text: 'An error occurred. Please try again.' });
    } finally {
      setResetLoading(false);
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
              animation: error ? 'shake 0.5s ease-in-out' : 'none',
              '@keyframes shake': {
                '0%, 100%': { transform: 'translateX(0)' },
                '10%, 30%, 50%, 70%, 90%': { transform: 'translateX(-5px)' },
                '20%, 40%, 60%, 80%': { transform: 'translateX(5px)' },
              },
            }}
          >
            {password ? <LockOpenOutlined fontSize="large" /> : <LockOutlined fontSize="large" />}
          </Avatar>

          <Typography variant="h5" fontWeight={700}>
            DJRB Review
          </Typography>
          <Typography variant="body2" color="text.secondary" mb={3}>
            Sign in to continue
          </Typography>
        </Box>

        <Box component="form" onSubmit={handleLogin}>
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

            <Grid container alignItems="center" justifyContent="space-between">
              <Grid item>
                <FormControlLabel
                  control={<Checkbox checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} />}
                  label="Remember me"
                />
              </Grid>
              <Grid item>
                <MuiLink href="#" underline="hover" onClick={handleForgotPasswordOpen}>
                  Forgot password?
                </MuiLink>
              </Grid>
            </Grid>
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
                'Log In'
              )}
            </Button>

            <Box mt={2} textAlign="center">
              <Typography variant="body2" color="text.secondary">
                Don't have an account?{' '}
                <MuiLink component={Link} to="/register" underline="hover" fontWeight="bold">
                  Sign Up
                </MuiLink>
              </Typography>
            </Box>

            <Box mt={1} textAlign="center">
              <MuiLink component={Link} to="/contact" underline="hover" color="text.secondary" variant="body2">
                Need help? Contact Us
              </MuiLink>
            </Box>
          </Stack>
        </Box>
      </Paper>

      <Dialog open={forgotPasswordOpen} onClose={handleForgotPasswordClose}>
        <DialogTitle>Reset Password</DialogTitle>
        <DialogContent>
          <DialogContentText>
            To reset your password, please enter your email address here. We will send a temporary password to your email.
          </DialogContentText>
          <TextField
            autoFocus
            margin="dense"
            id="name"
            label="Email Address"
            type="email"
            fullWidth
            variant="standard"
            value={resetEmail}
            onChange={(e) => setResetEmail(e.target.value)}
          />
          {resetMessage && (
            <Alert severity={resetMessage.type} sx={{ mt: 2 }}>
              {resetMessage.text}
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleForgotPasswordClose}>Cancel</Button>
          <Button onClick={handleResetSubmit} disabled={resetLoading}>
            {resetLoading ? <CircularProgress size={24} /> : 'Send Temp Password'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={!!error} autoHideDuration={6000} onClose={() => setError('')} anchorOrigin={{ vertical: 'top', horizontal: 'center' }}>
        <Alert onClose={() => setError('')} severity="error" sx={{ width: '100%' }} variant="filled">
          {error}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default Login;
