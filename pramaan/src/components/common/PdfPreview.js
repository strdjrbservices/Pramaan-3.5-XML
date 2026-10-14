import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  IconButton,
  Tooltip,
  Stack,
  useTheme
} from '@mui/material';
import {
  Close as CloseIcon,
  Remove as RemoveIcon,
  KeyboardArrowUp as KeyboardArrowUpIcon,
  Fullscreen as FullscreenIcon,
  FullscreenExit as FullscreenExitIcon,
  DragIndicator as DragIndicatorIcon,
  AspectRatio as AspectRatioIcon,
  FitScreen as FitScreenIcon,
  PhotoSizeSelectLarge as PhotoSizeSelectLargeIcon
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';

const PdfPreview = ({ pdfUrl, onClose }) => {
  const theme = useTheme();


  const [size, setSize] = useState({ width: 600, height: 800 });
  const [position, setPosition] = useState({ x: 80, y: 80 });
  const [isMinimized, setIsMinimized] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const [preFullscreenSize, setPreFullscreenSize] = useState(null);
  const [preFullscreenPosition, setPreFullscreenPosition] = useState(null);

  useEffect(() => {
    const handleResize = () => {
      setPosition((prev) => {
        const x = Math.min(prev.x, window.innerWidth - 100);
        const y = Math.min(prev.y, window.innerHeight - 40);
        return { x: Math.max(0, x), y: Math.max(0, y) };
      });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const applyPreset = (preset) => {
    if (isFullscreen) {
      setIsFullscreen(false);
    }
    if (isMinimized) {
      setIsMinimized(false);
    }

    let newWidth = 600;
    let newHeight = 800;

    if (preset === 'compact') {
      newWidth = 420;
      newHeight = 600;
    } else if (preset === 'standard') {
      newWidth = 650;
      newHeight = 800;
    } else if (preset === 'wide') {
      newWidth = 950;
      newHeight = 900;
    }

    setSize({ width: newWidth, height: newHeight });

    setPosition((prev) => {
      const x = Math.min(prev.x, window.innerWidth - newWidth - 20);
      const y = Math.min(prev.y, window.innerHeight - newHeight - 20);
      return { x: Math.max(20, x), y: Math.max(20, y) };
    });
  };

  const toggleFullscreen = () => {
    if (isFullscreen) {
      setSize(preFullscreenSize || { width: 600, height: 800 });
      setPosition(preFullscreenPosition || { x: 80, y: 80 });
      setIsFullscreen(false);
    } else {
      setPreFullscreenSize(size);
      setPreFullscreenPosition(position);
      setIsFullscreen(true);
    }
  };

  const toggleMinimize = () => {
    if (isMinimized) {
      setIsMinimized(false);
    } else {
      setIsMinimized(true);
    }
  };

  const handleHeaderMouseDown = (e) => {
    if (isFullscreen || isMinimized) return;
    if (e.button !== 0) return;
    if (e.target.closest('button') || e.target.closest('.size-presets')) return;

    e.preventDefault();
    const startX = e.clientX - position.x;
    const startY = e.clientY - position.y;

    const handleMouseMove = (moveEvent) => {
      let newX = moveEvent.clientX - startX;
      let newY = moveEvent.clientY - startY;

      const minX = -size.width + 100;
      const maxX = window.innerWidth - 100;
      const minY = 0;
      const maxY = window.innerHeight - 40;

      newX = Math.max(minX, Math.min(newX, maxX));
      newY = Math.max(minY, Math.min(newY, maxY));

      setPosition({ x: newX, y: newY });
    };

    const handleMouseUp = () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const handleResizeMouseDown = (e, direction) => {
    e.preventDefault();
    e.stopPropagation();
    if (isFullscreen || isMinimized) return;

    const startWidth = size.width;
    const startHeight = size.height;
    const startX = e.clientX;
    const startY = e.clientY;

    const handleMouseMove = (moveEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const deltaY = moveEvent.clientY - startY;

      let newWidth = startWidth;
      let newHeight = startHeight;

      if (direction.includes('right')) {
        newWidth = Math.max(380, startWidth + deltaX);
        newWidth = Math.min(newWidth, window.innerWidth - position.x - 10);
      }
      if (direction.includes('bottom')) {
        newHeight = Math.max(250, startHeight + deltaY);
        newHeight = Math.min(newHeight, window.innerHeight - position.y - 10);
      }

      setSize({ width: newWidth, height: newHeight });
    };

    const handleMouseUp = () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const glassmorphicStyles = {
    position: 'fixed',
    left: isFullscreen ? 0 : position.x,
    top: isFullscreen ? 0 : position.y,
    width: isFullscreen ? '100vw' : isMinimized ? 340 : size.width,
    height: isFullscreen ? '100vh' : isMinimized ? 48 : size.height,
    zIndex: 1300,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    borderRadius: isFullscreen ? 0 : '16px',
    border: '1px solid',
    borderColor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)',
    background: theme.palette.mode === 'dark'
      ? 'rgba(30, 30, 32, 0.82)'
      : 'rgba(255, 255, 255, 0.85)',
    backdropFilter: 'blur(16px)',
    boxShadow: theme.palette.mode === 'dark'
      ? '0 12px 40px 0 rgba(0, 0, 0, 0.6)'
      : '0 12px 40px 0 rgba(15, 30, 60, 0.18)',
    transition: 'border-radius 0.2s ease, background 0.3s ease',
  };

  const isLight = theme.palette.mode === 'light';

  return (
    <AnimatePresence>
      <motion.div
        layout
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ type: 'spring', damping: 25, stiffness: 220 }}
        style={glassmorphicStyles}
      >
        <Box
          onMouseDown={handleHeaderMouseDown}
          sx={{
            p: 1.25,
            px: 2,
            background: isLight
              ? 'linear-gradient(90deg, rgba(240, 244, 250, 0.9) 0%, rgba(225, 232, 245, 0.9) 100%)'
              : 'linear-gradient(90deg, rgba(40, 42, 48, 0.9) 0%, rgba(28, 30, 35, 0.9) 100%)',
            borderBottom: '1px solid',
            borderColor: isLight ? 'rgba(0, 0, 0, 0.06)' : 'rgba(255, 255, 255, 0.06)',
            cursor: isFullscreen ? 'default' : 'grab',
            '&:active': { cursor: isFullscreen ? 'default' : 'grabbing' },
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            userSelect: 'none'
          }}
        >
          <Stack direction="row" alignItems="center" spacing={1}>
            <DragIndicatorIcon
              fontSize="small"
              sx={{
                color: isLight ? 'text.secondary' : 'text.disabled',
                display: isFullscreen ? 'none' : 'block',
                opacity: 0.7
              }}
            />
            <Typography
              variant="subtitle2"
              fontWeight={700}
              noWrap
              sx={{
                maxWidth: '180px',
                fontFamily: 'BBH Sans Hegarty, sans-serif',
                letterSpacing: '0.2px',
                color: isLight ? 'primary.dark' : 'primary.light'
              }}
            >
              PDF Document Preview
            </Typography>
          </Stack>

          <Stack direction="row" alignItems="center" spacing={0.5}>
            {!isMinimized && !isFullscreen && (
              <Stack direction="row" alignItems="center" className="size-presets" spacing={0.25} sx={{ mr: 1 }}>
                <Tooltip title="Compact Size (420x600)">
                  <IconButton
                    size="small"
                    onClick={() => applyPreset('compact')}
                    sx={{
                      color: isLight ? 'text.secondary' : 'text.primary',
                      '&:hover': { bgcolor: isLight ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.06)' }
                    }}
                  >
                    <AspectRatioIcon fontSize="inherit" sx={{ transform: 'scale(0.85)' }} />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Standard Size (650x800)">
                  <IconButton
                    size="small"
                    onClick={() => applyPreset('standard')}
                    sx={{
                      color: isLight ? 'text.secondary' : 'text.primary',
                      '&:hover': { bgcolor: isLight ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.06)' }
                    }}
                  >
                    <FitScreenIcon fontSize="inherit" sx={{ transform: 'scale(0.85)' }} />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Wide Size (950x900)">
                  <IconButton
                    size="small"
                    onClick={() => applyPreset('wide')}
                    sx={{
                      color: isLight ? 'text.secondary' : 'text.primary',
                      '&:hover': { bgcolor: isLight ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.06)' }
                    }}
                  >
                    <PhotoSizeSelectLargeIcon fontSize="inherit" sx={{ transform: 'scale(0.85)' }} />
                  </IconButton>
                </Tooltip>
              </Stack>
            )}

            <Tooltip title={isMinimized ? "Expand Preview" : "Minimize Preview"}>
              <IconButton
                size="small"
                onClick={toggleMinimize}
                sx={{
                  color: isLight ? 'text.secondary' : 'text.primary',
                  '&:hover': { bgcolor: isLight ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.06)' }
                }}
              >
                {isMinimized ? <KeyboardArrowUpIcon fontSize="small" /> : <RemoveIcon fontSize="small" />}
              </IconButton>
            </Tooltip>

            {!isMinimized && (
              <Tooltip title={isFullscreen ? "Restore Window" : "Fullscreen"}>
                <IconButton
                  size="small"
                  onClick={toggleFullscreen}
                  sx={{
                    color: isLight ? 'text.secondary' : 'text.primary',
                    '&:hover': { bgcolor: isLight ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.06)' }
                  }}
                >
                  {isFullscreen ? <FullscreenExitIcon fontSize="small" /> : <FullscreenIcon fontSize="small" />}
                </IconButton>
              </Tooltip>
            )}

            <Tooltip title="Close Preview">
              <IconButton
                size="small"
                onClick={onClose}
                sx={{
                  color: theme.palette.error.main,
                  '&:hover': { bgcolor: isLight ? 'error.lighter' : 'rgba(244, 67, 54, 0.12)' }
                }}
              >
                <CloseIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Stack>
        </Box>

        {!isMinimized && (
          <Box
            sx={{
              flexGrow: 1,
              bgcolor: isLight ? 'grey.50' : '#141416',
              overflow: 'hidden',
              position: 'relative'
            }}
          >
            <iframe
              src={pdfUrl}
              width="100%"
              height="100%"
              style={{ border: 'none' }}
              title="PDF Document Viewer"
            />
          </Box>
        )}

        {!isFullscreen && !isMinimized && (
          <>
            <Box
              onMouseDown={(e) => handleResizeMouseDown(e, 'right')}
              sx={{
                position: 'absolute',
                top: 0,
                right: 0,
                width: '6px',
                height: '100%',
                cursor: 'col-resize',
                zIndex: 10,
                transition: 'background 0.2s',
                '&:hover': {
                  background: 'rgba(0, 110, 255, 0.15)'
                }
              }}
            />

            <Box
              onMouseDown={(e) => handleResizeMouseDown(e, 'bottom')}
              sx={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                width: '100%',
                height: '6px',
                cursor: 'row-resize',
                zIndex: 10,
                transition: 'background 0.2s',
                '&:hover': {
                  background: 'rgba(0, 110, 255, 0.15)'
                }
              }}
            />

            <Box
              onMouseDown={(e) => handleResizeMouseDown(e, 'bottom-right')}
              sx={{
                position: 'absolute',
                bottom: 0,
                right: 0,
                width: '18px',
                height: '18px',
                cursor: 'se-resize',
                zIndex: 11,
                display: 'flex',
                alignItems: 'flex-end',
                justifyContent: 'flex-end',
                p: '3px',
                '&::after': {
                  content: '""',
                  width: '8px',
                  height: '8px',
                  borderRight: `2px solid ${isLight ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.4)'}`,
                  borderBottom: `2px solid ${isLight ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.4)'}`,
                  transition: 'border-color 0.2s'
                },
                '&:hover::after': {
                  borderColor: theme.palette.primary.main
                }
              }}
            />
          </>
        )}
      </motion.div>
    </AnimatePresence>
  );
};

export default PdfPreview;
