import React from 'react';
import { Box, Typography, Button, Paper } from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    console.error("Uncaught error:", error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100vh',
            p: 3,
            bgcolor: 'background.default',
            color: 'text.primary'
          }}
        >
          <Paper
            elevation={3}
            sx={{
              p: 4,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              maxWidth: 600,
              width: '100%',
              textAlign: 'center',
            }}
          >
            <Typography variant="h4" color="error" gutterBottom>
              Oops! Something went wrong.
            </Typography>
            <Typography variant="body1" color="text.secondary" paragraph>
              An unexpected error has occurred. Please try refreshing the page.
            </Typography>
            
            {this.state.error && (
              <Box
                sx={{
                  mt: 2,
                  mb: 3,
                  p: 2,
                  bgcolor: 'grey.100',
                  borderRadius: 1,
                  width: '100%',
                  overflow: 'auto',
                  textAlign: 'left',
                  maxHeight: 200,
                  border: '1px solid',
                  borderColor: 'grey.300'
                }}
              >
                <Typography variant="caption" component="pre" sx={{ fontFamily: 'monospace', color: 'error.main' }}>
                  {this.state.error.toString()}
                </Typography>
              </Box>
            )}

            <Button
              variant="contained"
              startIcon={<RefreshIcon />}
              onClick={this.handleReset}
            >
              Reload Page
            </Button>
          </Paper>
        </Box>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;