import React from 'react';
import {
  Box,
  Button,
  IconButton,
  Avatar,
  Typography,
  ClickAwayListener,
  Paper,
  Grow,
} from '@mui/material';
import LogoutIcon from '@mui/icons-material/Logout';

const FloatingMenu = ({
  menuOpen,
  setMenuOpen,
  menuButtonRef,
  navItems,
  location,
  isAuthenticated,
  handleLogout,
}) => {
  return (
    <Grow in={menuOpen} transformOrigin="top right">
      <Box
        sx={{
          position: 'fixed',
          top: 16,
          right: { xs: 72, sm: 88 },
          zIndex: 1400,
        }}
      >
        <ClickAwayListener
          onClickAway={(event) => {
            if (
              menuButtonRef.current &&
              menuButtonRef.current.contains(event.target)
            ) {
              return;
            }
            setMenuOpen(false);
          }}
        >
          <Paper
            elevation={0}
            sx={{
              px: 2,
              py: 1.5,
              borderRadius: 4,
              background:
                'linear-gradient(135deg, rgba(255,255,255,0.9), rgba(255,255,255,0.65))',
              backdropFilter: 'blur(18px)',
              boxShadow:
                '0 20px 40px rgba(0,0,0,0.08), inset 0 0 0 1px rgba(255,255,255,0.4)',
              display: 'flex',
              flexDirection: 'column',
              gap: 0.5,
              minWidth: 240,
            }}
          >
            {/* NAV LINKS */}
            {navItems.map(({ label, path, icon }) => {
              const isActive = location.pathname === path;

              return (
                <Button
                  key={path}
                  component="a"
                  href={path}
                  target={path === '/history' ? undefined : '_blank'}
                  rel="noopener noreferrer"
                  onClick={() => setMenuOpen(false)}
                  startIcon={
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        transition: 'all 0.3s ease',
                        transform: isActive ? 'scale(1.15)' : 'scale(1)',
                      }}
                    >
                      {icon}
                    </Box>
                  }
                  sx={{
                    position: 'relative',
                    justifyContent: 'flex-start',
                    textTransform: 'none',
                    fontWeight: 600,
                    fontSize: '0.95rem',
                    borderRadius: 3,
                    px: 2,
                    py: 1,
                    color: isActive ? '#1976d2' : '#222',
                    background: isActive
                      ? 'linear-gradient(90deg, rgba(25,118,210,0.18), transparent)'
                      : 'transparent',
                    transition: 'all 0.25s ease',

                    '&::before': {
                      content: '""',
                      position: 'absolute',
                      left: 6,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      width: 4,
                      height: isActive ? 22 : 0,
                      borderRadius: 4,
                      background: '#1976d2',
                      transition: 'height 0.25s ease',
                    },

                    '&:hover': {
                      background: 'rgba(25,118,210,0.1)',
                      transform: 'translateX(6px)',
                      '& svg': {
                        transform: 'rotate(-8deg) scale(1.2)',
                      },
                    },
                  }}
                >
                  {label}
                </Button>
              );
            })}

            {isAuthenticated && (
              <Box
                sx={{
                  mt: 1.5,
                  pt: 1.5,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  borderTop: '1px solid rgba(0,0,0,0.08)',
                }}
              >
                <Avatar sx={{ width: 32, height: 32 }}>
                  {localStorage.getItem('username')?.[0]?.toUpperCase()}
                </Avatar>
                <Typography fontSize="0.85rem" fontWeight={600} flexGrow={1}>
                  {localStorage.getItem('username')}
                </Typography>
                <IconButton
                  size="small"
                  onClick={handleLogout}
                  sx={{
                    transition: 'all 0.25s ease',
                    '&:hover': {
                      transform: 'rotate(-20deg) scale(1.15)',
                    },
                  }}
                >
                  <LogoutIcon fontSize="small" />
                </IconButton>
              </Box>
            )}
          </Paper>
        </ClickAwayListener>
      </Box>
    </Grow>
  );
};

export default FloatingMenu;
