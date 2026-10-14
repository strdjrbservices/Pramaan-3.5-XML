import React from 'react';
import {
    Tooltip, IconButton, List, ListItem, ListItemButton, ListItemText, Box,
    CircularProgress, ListItemIcon, Typography, ToggleButton, ToggleButtonGroup, Chip,
} from '@mui/material';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import { keyframes } from '@mui/system';
import LightModeIcon from '@mui/icons-material/LightMode';
import NightlightRoundIcon from '@mui/icons-material/NightlightRound';
import PremiumLogo from '../../auth/logo';

const bounce = keyframes`
  0%, 20%, 50%, 80%, 100% { transform: translateY(0); }
  40% { transform: translateY(-8px); }
  60% { transform: translateY(-4px); }
`;

const Sidebar = ({
    sections, isOpen, isLocked, onLockToggle, onMouseEnter, onMouseLeave,
    onSectionClick, onThemeToggle, currentTheme, activeSection, loading,
    loadingSection, extractedSections = new Set(), visibleSections = new Set(),
    onArrowClick, extractionSource = 'pdf', onExtractionSourceChange,
    hasPdfFile = false, hasXmlFile = false, onOpenPdfXmlDiff, diffCount = 0
}) => (
    <>
        {isOpen && (
            <Box
                onClick={onLockToggle}
                sx={{
                    display: { xs: 'block', md: 'none' },
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    width: '100vw',
                    height: '100vh',
                    backgroundColor: 'rgba(0, 0, 0, 0.4)',
                    backdropFilter: 'blur(3px)',
                    zIndex: 1100,
                    transition: 'opacity 0.3s ease',
                }}
            />
        )}

        {!isOpen && (
            <IconButton
                onClick={onLockToggle}
                sx={{
                    display: { xs: 'flex', md: 'none' },
                    position: 'fixed',
                    bottom: 24,
                    left: 24,
                    zIndex: 1090,
                    backgroundColor: currentTheme === 'dark' ? '#1e88e5' : '#005A9C',
                    color: '#ffffff',
                    boxShadow: '0 4px 14px rgba(0,0,0,0.25)',
                    '&:hover': {
                        backgroundColor: currentTheme === 'dark' ? '#1565c0' : '#004070',
                    },
                    width: 50,
                    height: 50,
                    borderRadius: '50%',
                }}
            >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="3" y1="12" x2="21" y2="12"></line>
                    <line x1="3" y1="6" x2="21" y2="6"></line>
                    <line x1="3" y1="18" x2="21" y2="18"></line>
                </svg>
            </IconButton>
        )}

        <div className={`sidebar ${isOpen ? 'open' : 'closed'}`} onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave}>
            <div className="sidebar-header">
                <Box className="sidebar-logo" sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', width: 40, height: 40 }}>
                    <PremiumLogo size={40} fullScreen={false} />
                </Box>
                <Typography variant="h6" className="sidebar-title" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                    DJRB
                </Typography>
                <Tooltip title={isLocked ? "Unpin Sidebar" : "Pin Sidebar"} placement="right">
                    <IconButton onClick={onLockToggle} size="small" className="sidebar-toggle-btn">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: isLocked ? 'rotate(45deg)' : 'none', transition: 'transform 0.2s' }}>
                            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                            <circle cx="12" cy="10" r="3"></circle>
                        </svg>
                    </IconButton>
                </Tooltip>
                <Tooltip title="Toggle Dark/Light Theme" placement="right">
                    <IconButton onClick={onThemeToggle} size="small" sx={{ color: 'var(--primary-color)', ml: 1 }}>
                        {currentTheme === 'dark' ? <LightModeIcon /> : <NightlightRoundIcon />}
                    </IconButton>
                </Tooltip>
            </div>

            {isOpen && (
                <Box sx={{ px: 1.5, py: 1.2, borderBottom: '1px solid var(--sidebar-border)', bgcolor: currentTheme === 'dark' ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)' }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.8 }}>
                        <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.5px', fontSize: '0.65rem' }}>
                            Extraction Source
                        </Typography>
                        {hasPdfFile && hasXmlFile && onOpenPdfXmlDiff && (
                            <Chip
                                size="small"
                                label={diffCount > 0 ? `${diffCount} Diff` : "Compare"}
                                color={diffCount > 0 ? "error" : "primary"}
                                onClick={onOpenPdfXmlDiff}
                                sx={{ height: 18, fontSize: '0.65rem', fontWeight: 700, cursor: 'pointer' }}
                            />
                        )}
                    </Box>
                    <ToggleButtonGroup
                        value={extractionSource || 'pdf'}
                        exclusive
                        onChange={(e, val) => {
                            if (val && onExtractionSourceChange) onExtractionSourceChange(val);
                        }}
                        size="small"
                        fullWidth
                        sx={{
                            borderRadius: 1.5,
                            '& .MuiToggleButton-root': {
                                py: 0.4,
                                fontWeight: 700,
                                fontSize: '0.72rem',
                                border: '1px solid var(--sidebar-border)',
                                '&.Mui-selected': {
                                    bgcolor: extractionSource === 'xml' ? '#7b1fa2' : '#005A9C',
                                    color: '#ffffff',
                                    '&:hover': { bgcolor: extractionSource === 'xml' ? '#6a1b9a' : '#004070' }
                                }
                            }
                        }}
                    >
                        <ToggleButton value="pdf" disabled={!hasPdfFile && !hasXmlFile}>
                            PDF {hasPdfFile ? '✓' : ''}
                        </ToggleButton>
                        <ToggleButton value="xml" disabled={!hasXmlFile}>
                            XML {hasXmlFile ? '✓' : ''}
                        </ToggleButton>
                    </ToggleButtonGroup>
                </Box>
            )}

            {!isOpen && (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 0.8, borderBottom: '1px solid var(--sidebar-border)' }}>
                    <Tooltip title={`Source: ${(extractionSource || 'pdf').toUpperCase()} (Click to toggle)`} placement="right">
                        <IconButton
                            size="small"
                            onClick={() => {
                                if (onExtractionSourceChange) {
                                    onExtractionSourceChange(extractionSource === 'xml' ? 'pdf' : (hasXmlFile ? 'xml' : 'pdf'));
                                }
                            }}
                            sx={{
                                width: 26,
                                height: 26,
                                fontSize: '0.65rem',
                                fontWeight: 'bold',
                                bgcolor: extractionSource === 'xml' ? '#7b1fa2' : '#005A9C',
                                color: '#fff',
                                '&:hover': { opacity: 0.85 }
                            }}
                        >
                            {(extractionSource || 'pdf').toUpperCase().slice(0, 3)}
                        </IconButton>
                    </Tooltip>
                </Box>
            )}

            <List dense>
                {sections.map((section) => (
                    <ListItem key={section.id} disablePadding>
                        <Tooltip title={!isOpen ? `${section.title} (${(extractionSource || 'pdf').toUpperCase()})` : ""} placement="right" arrow>
                            <ListItemButton
                                component="a"
                                href={`#${section.id}`}
                                className="sidebar-link"
                                selected={activeSection === section.id}
                                onClick={(e) => { e.preventDefault(); onSectionClick(section); }}
                                disabled={loading}
                                sx={{
                                    '&.Mui-selected': {
                                        backgroundColor: extractionSource === 'xml' ? 'secondary.main' : 'info.main',
                                        color: '#ffffff',
                                        '&:hover': { backgroundColor: extractionSource === 'xml' ? 'secondary.dark' : 'info.dark' },
                                        '& .MuiListItemIcon-root': { color: '#ffffff' },
                                    },
                                }}>
                                {section.icon && (
                                    <ListItemIcon>
                                        {section.icon}
                                    </ListItemIcon>
                                )}
                                <ListItemText
                                    primary={section.title}
                                    secondary={isOpen && extractionSource === 'xml' ? 'Extract from XML' : null}
                                    secondaryTypographyProps={{ fontSize: '0.65rem', color: '#7b1fa2', fontWeight: 600 }}
                                />
                                {loadingSection === section.id && (
                                    <Box sx={{ display: 'flex', alignItems: 'center', ml: 1 }}>
                                        <CircularProgress size={16} color="inherit" />
                                    </Box>
                                )}
                                {extractedSections.has(section.id) && !visibleSections.has(section.id) && loadingSection !== section.id && (
                                    <IconButton size="small" onClick={(e) => { e.stopPropagation(); onArrowClick(section.id); }} sx={{ rotate: '270deg', animation: `${bounce} 2s infinite`, ml: 'auto' }}>
                                        <ArrowDownwardIcon fontSize="small" />
                                    </IconButton>
                                )}
                            </ListItemButton>
                        </Tooltip>
                    </ListItem>
                ))}
            </List>
            <div className="sidebar-footer">
                Appraisal Extractor {extractionSource ? `(${extractionSource.toUpperCase()})` : ''}
            </div>
        </div>
    </>
);

export default Sidebar;
