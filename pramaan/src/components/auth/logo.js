import React from 'react';
import { motion } from 'framer-motion';
import { Box, Typography, useTheme } from '@mui/material';

const PremiumLogo = ({ size = 60, fullScreen = true }) => {
  const theme = useTheme();
  const baseSize = 500;
  const scale = fullScreen ? 1 : size / baseSize;

  return (
    <Box
      sx={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: fullScreen ? '100vh' : 'auto',
        width: fullScreen ? '100%' : size,
        height: fullScreen ? '100%' : size,
        background: fullScreen ? 'radial-gradient(circle at center, #0f172a 0%, #020617 100%)' : 'transparent',
        overflow: 'hidden',
      }}
    >

      {fullScreen && (
        <Box
          sx={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '60vw',
            height: '60vw',
            borderRadius: '50%',
            pointerEvents: 'none',
          }}
        />)}

      <Box
        component={motion.div}
        initial={{ scale: fullScreen ? 0.9 : scale, opacity: fullScreen ? 0 : 1 }}
        animate={{ scale: fullScreen ? 1 : scale, opacity: 1 }}
        transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
        sx={{
          position: fullScreen ? 'relative' : 'absolute',
          borderRadius: '50%',
          backdropFilter: fullScreen ? 'blur(20px)' : 'none',
          border: fullScreen ? '1px solid rgba(255, 255, 255, 0.05)' : 'none',
          boxShadow: fullScreen ? '0 0 80px rgba(0,0,0,0.4)' : 'none',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          width: fullScreen ? { xs: 320, md: 500 } : baseSize,
          height: fullScreen ? { xs: 320, md: 500 } : baseSize,
        }}
      >

        <Box
          component={motion.div}
          animate={{ rotate: 360 }}
          transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
          sx={{
            position: 'absolute',
            inset: 0,
            borderRadius: '50%',
            border: '1px dashed',
            borderColor: fullScreen ? 'rgba(56, 189, 248, 0.2)' : theme.palette.primary.main,
            opacity: fullScreen ? 1 : 0.4,
          }}
        />

        <Box
          component={motion.div}
          animate={{ rotate: -360 }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          sx={{
            position: 'absolute',
            inset: 45,
            borderRadius: '50%',
            border: '20px solid transparent',
            borderTopColor: fullScreen ? 'rgb(0, 26, 255)' : theme.palette.primary.main,
            borderBottomColor: fullScreen ? 'rgb(0, 26, 255)' : theme.palette.primary.main,
          }}
        />

        <Box
          sx={{
            position: 'absolute',
            inset: 45,
            borderRadius: '50%',
            border: '1px solid',
            borderColor: fullScreen ? 'rgba(255, 255, 255, 0.03)' : theme.palette.divider,
          }}
        />

        <Box sx={{ position: 'relative', zIndex: 10, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <Typography
            variant="h1"
            component={motion.h1}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.8 }}
            sx={{
              fontFamily: '"Inter", sans-serif',
              fontSize: fullScreen ? { xs: '4rem', md: '6rem' } : '6rem',
              fontWeight: 900,
              letterSpacing: '-0.03em',
              background: fullScreen ? 'linear-gradient(180deg, #ffffff 0%, #94a3b8 100%)' : `linear-gradient(180deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
              backgroundClip: 'text',
              textFillColor: 'transparent',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              lineHeight: 0.9,
              mb: 2,
              filter: fullScreen ? 'drop-shadow(0 4px 20px rgba(0,0,0,0.5))' : 'none'
            }}
          >
            DJRB
          </Typography>

          <Box
            component={motion.div}
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ delay: 0.8, duration: 0.8 }}
            sx={{
              width: '60px',
              height: '3px',
              background: fullScreen ? 'rgb(0, 26, 255)' : theme.palette.primary.main,
              mb: 2,
              borderRadius: '2px'
            }}
          />

          <Typography
            variant="subtitle1"
            component={motion.p}
            initial={{ opacity: 0, letterSpacing: '0.1em' }}
            animate={{ opacity: 1, letterSpacing: '0.3em' }}
            transition={{ delay: 1, duration: 0.8 }}
            sx={{
              fontSize: fullScreen ? { xs: '0.75rem', md: '1rem' } : '1rem',
              fontWeight: 600,
              textTransform: 'uppercase',
              color: fullScreen ? 'rgb(0, 26, 255)' : theme.palette.text.secondary,
            }}
          >
            Services
          </Typography>
        </Box>
      </Box>
    </Box>
  );
};

export default PremiumLogo;
