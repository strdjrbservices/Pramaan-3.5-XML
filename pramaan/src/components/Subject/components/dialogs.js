import React, { useState, useEffect } from 'react';
import {
    Button, Dialog, DialogTitle, DialogContent, DialogActions, IconButton,
    TableContainer, Table, TableHead, TableRow, TableCell, TableBody, Paper,
    Box, CircularProgress, Alert, Typography, List, ListItem, ListItemText, TextField,
    Chip, Tooltip
} from '@mui/material';
import {
    Close as CloseIcon, CheckCircleOutline as CheckCircleOutlineIcon,
    ErrorOutline as ErrorOutlineIcon, Warning as WarningIcon, ContentCopy as ContentCopyIcon,
    NoteAlt as NoteAltIcon
} from '@mui/icons-material';

export const ContractComparisonDialog = ({ open, onClose, onCompare, loading, result, error, selectedFile, contractFile, mainData }) => {
    const handleClose = () => {
        onClose();
    };

    return (
        <Dialog open={open} onClose={handleClose} maxWidth={result ? "md" : "sm"} fullWidth>
            <DialogTitle>
                Contract Comparison
                <IconButton
                    aria-label="close"
                    onClick={handleClose}
                    sx={{ position: 'absolute', right: 8, top: 8, color: (theme) => theme.palette.grey[500] }}
                >
                    <CloseIcon />
                </IconButton>
            </DialogTitle>
            <DialogContent dividers>
                {loading && <Box sx={{ display: 'flex', justifyContent: 'center', my: 3 }}><CircularProgress /></Box>}
                {error && <Alert severity="error" sx={{ my: 2 }}>{error}</Alert>}
                {result ? (
                    <TableContainer component={Paper} sx={{ mt: 2 }}>
                        <Table>
                            <TableHead>
                                <TableRow>
                                    <TableCell sx={{ fontWeight: 'bold' }}>Field</TableCell>
                                    <TableCell sx={{ fontWeight: 'bold' }}>Main Report</TableCell>
                                    <TableCell sx={{ fontWeight: 'bold' }}>Contract Copy</TableCell>
                                    <TableCell sx={{ fontWeight: 'bold' }} align="center">Status</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {['Contract Price', 'Contract Date'].map(fieldName => {
                                    const item = result.find(r => r.field.toLowerCase() === fieldName.toLowerCase());
                                    const mainValue = fieldName === 'Contract Price' ? mainData?.CONTRACT?.['Contract Price $'] : mainData?.CONTRACT?.['Date of Contract'];
                                    return (
                                        <TableRow key={fieldName} sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                                            <TableCell>{fieldName}</TableCell>
                                            <TableCell>{item?.old_value || mainValue || 'N/A'}</TableCell>
                                            <TableCell>{item?.new_value || 'N/A'}</TableCell>
                                            <TableCell align="center">
                                                {item ? (
                                                    item.status === 'Match' ? <CheckCircleOutlineIcon color="success" /> : <ErrorOutlineIcon color="error" />
                                                ) : <WarningIcon color="warning" />}
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </TableContainer>
                ) : !loading && (
                    <Typography>
                        Click 'Compare' to check for consistency in Contract Date and Contract Price between the main report and the contract copy.
                    </Typography>
                )
                }
            </DialogContent>
            <DialogActions>
                <Button onClick={handleClose}>Close</Button>
                <Button onClick={onCompare} variant="contained" disabled={loading || !selectedFile || !contractFile}>
                    {loading ? <CircularProgress size={24} /> : (result ? 'Reload' : 'Compare')}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export const RevisionLanguageDialog = ({ open, onClose, title, prompts, onCopy, onAddToNotepad }) => {
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        if (open) {
            setSearchTerm('');
        }
    }, [open]);

    const filteredPrompts = prompts.filter(prompt =>
        prompt.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
            <DialogTitle>{title}</DialogTitle>
            <DialogContent dividers>
                <TextField
                    autoFocus
                    margin="dense"
                    id="search-revision"
                    label="Search Revision Language"
                    type="text"
                    fullWidth
                    variant="standard"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    sx={{ mb: 2 }}
                />
                <List dense>
                    {filteredPrompts.map((prompt, index) => (
                        <ListItem key={index} secondaryAction={
                            <>
                                <IconButton edge="end" aria-label="copy" onClick={() => onCopy(prompt)}><ContentCopyIcon /></IconButton>
                                {onAddToNotepad && (
                                    <IconButton edge="end" aria-label="add to notepad" onClick={() => onAddToNotepad(prompt)}><NoteAltIcon /></IconButton>
                                )}
                            </>
                        }>
                            <ListItemText primary={prompt} />
                        </ListItem>
                    ))}
                </List>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Close</Button>
            </DialogActions>
        </Dialog>
    );
};

export const NotepadDialog = ({ open, onClose, notes, onNotesChange }) => {
    const handleSaveNotes = () => {
        if (!notes) {
            return;
        }
        const blob = new Blob([notes], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'Revision.txt';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };
    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm" aria-labelledby="notepad-dialog-title">
            <DialogTitle id="notepad-dialog-title">Notepad</DialogTitle>
            <DialogContent>
                <TextField
                    autoFocus
                    margin="dense"
                    id="notes"
                    label="Your Notes"
                    type="text"
                    fullWidth
                    multiline
                    rows={10}
                    value={notes}
                    spellCheck="true"
                    onChange={(e) => onNotesChange(e.target.value)}
                    variant="outlined" />
            </DialogContent>
            <DialogActions>
                <Button onClick={handleSaveNotes} disabled={!notes}>Save to File</Button>
                <Button onClick={onClose}>Close</Button>
            </DialogActions>
        </Dialog>
    );
};

export const EngagementLetterDialog = ({ open, onClose, onCompare, loading, result, error, selectedFile, engagementLetterFile, mainData }) => {
    const handleClose = () => {
        onClose();
    };

    return (
        <Dialog open={open} onClose={handleClose} maxWidth={result ? "md" : "sm"} fullWidth>
            <DialogTitle>
                Engagement Letter Comparison
                <IconButton
                    aria-label="close"
                    onClick={handleClose}
                    sx={{ position: 'absolute', right: 8, top: 8, color: (theme) => theme.palette.grey[500] }}
                >
                    <CloseIcon />
                </IconButton>
            </DialogTitle>
            <DialogContent dividers>
                {loading && <Box sx={{ display: 'flex', justifyContent: 'center', my: 3 }}><CircularProgress /></Box>}
                {error && <Alert severity="error" sx={{ my: 2 }}>{error}</Alert>}
                {result ? (
                    <TableContainer component={Paper} sx={{ mt: 2 }}>
                        <Table>
                            <TableHead>
                                <TableRow>
                                    <TableCell sx={{ fontWeight: 'bold' }}>Field</TableCell>
                                    <TableCell sx={{ fontWeight: 'bold' }}>Main Report</TableCell>
                                    <TableCell sx={{ fontWeight: 'bold' }}>Engagement Letter</TableCell>
                                    <TableCell sx={{ fontWeight: 'bold' }} align="center">Status</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {result.map((item, index) => (
                                    <TableRow key={index} sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                                        <TableCell>{item.field}</TableCell>
                                        <TableCell>{item.main_report_value || 'N/A'}</TableCell>
                                        <TableCell>{item.engagement_letter_value || 'N/A'}</TableCell>
                                        <TableCell align="center">
                                            {item.status === 'Match' ? <CheckCircleOutlineIcon color="success" /> : <ErrorOutlineIcon color="error" />}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                ) : !loading && (
                    <Typography>
                        Click 'Compare' to check for consistency in Property Address and Vendor's Fee between the main report and the engagement letter.
                    </Typography>
                )}
            </DialogContent>
            <DialogActions>
                <Button onClick={handleClose}>Close</Button>
                {!result && (
                    <Button onClick={onCompare} variant="contained" disabled={loading || !selectedFile || !engagementLetterFile}>Compare</Button>
                )}
                {result && (
                    <Button onClick={onCompare} variant="contained" disabled={loading}>Reload</Button>
                )}
            </DialogActions>
        </Dialog>
    );
};

export const PdfXmlDiffDialog = ({ open, onClose, onCompare, loading, result, error, selectedFile, xmlFile, onApplyAllXml }) => {
    const [filter, setFilter] = useState('all'); // 'all', 'mismatch', 'match'

    const filteredResult = (result || []).filter(item => {
        if (filter === 'mismatch') return item.status !== 'Match';
        if (filter === 'match') return item.status === 'Match';
        return true;
    });

    const mismatchCount = (result || []).filter(r => r.status !== 'Match').length;
    const matchCount = (result || []).filter(r => r.status === 'Match').length;

    return (
        <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
            <DialogTitle sx={{ m: 0, p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Typography variant="h6" component="div" sx={{ fontWeight: 700 }}>
                        PDF vs XML Extraction Comparison
                    </Typography>
                    {result && (
                        <Chip
                            label={`${mismatchCount} Differences`}
                            color={mismatchCount > 0 ? "error" : "success"}
                            size="small"
                            sx={{ fontWeight: 600 }}
                        />
                    )}
                </Box>
                <IconButton aria-label="close" onClick={onClose} sx={{ color: (theme) => theme.palette.grey[500] }}>
                    <CloseIcon />
                </IconButton>
            </DialogTitle>
            <DialogContent dividers>
                {loading && (
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', my: 4, gap: 1.5 }}>
                        <CircularProgress />
                        <Typography variant="body2" color="text.secondary">Comparing PDF and XML fields...</Typography>
                    </Box>
                )}
                {error && <Alert severity="error" sx={{ my: 2 }}>{error}</Alert>}
                {result && !loading && (
                    <>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1 }}>
                            <Box sx={{ display: 'flex', gap: 1 }}>
                                <Button
                                    size="small"
                                    variant={filter === 'all' ? 'contained' : 'outlined'}
                                    onClick={() => setFilter('all')}
                                >
                                    All ({result.length})
                                </Button>
                                <Button
                                    size="small"
                                    color="error"
                                    variant={filter === 'mismatch' ? 'contained' : 'outlined'}
                                    onClick={() => setFilter('mismatch')}
                                >
                                    Differences ({mismatchCount})
                                </Button>
                                <Button
                                    size="small"
                                    color="success"
                                    variant={filter === 'match' ? 'contained' : 'outlined'}
                                    onClick={() => setFilter('match')}
                                >
                                    Matches ({matchCount})
                                </Button>
                            </Box>
                            {onApplyAllXml && mismatchCount > 0 && (
                                <Button
                                    size="small"
                                    variant="contained"
                                    color="secondary"
                                    onClick={onApplyAllXml}
                                >
                                    Apply All XML Values to Form
                                </Button>
                            )}
                        </Box>
                        <TableContainer component={Paper} sx={{ maxHeight: 480 }}>
                            <Table stickyHeader size="small">
                                <TableHead>
                                    <TableRow>
                                        <TableCell sx={{ fontWeight: 700, bgcolor: 'background.paper', width: '25%' }}>Field</TableCell>
                                        <TableCell sx={{ fontWeight: 700, bgcolor: 'background.paper', width: '33%' }}>PDF Value</TableCell>
                                        <TableCell sx={{ fontWeight: 700, bgcolor: 'background.paper', width: '33%' }}>XML Value</TableCell>
                                        <TableCell sx={{ fontWeight: 700, bgcolor: 'background.paper', width: '9%' }} align="center">Status</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {filteredResult.map((item, index) => {
                                        const isMismatch = item.status !== 'Match';
                                        return (
                                            <TableRow
                                                key={index}
                                                sx={{
                                                    bgcolor: isMismatch ? 'rgba(211, 47, 47, 0.04)' : 'inherit',
                                                    '&:hover': { bgcolor: isMismatch ? 'rgba(211, 47, 47, 0.08)' : 'rgba(0,0,0,0.04)' }
                                                }}
                                            >
                                                <TableCell sx={{ fontWeight: 600 }}>{item.field}</TableCell>
                                                <TableCell sx={{ wordBreak: 'break-word' }}>{item.pdf_value || 'N/A'}</TableCell>
                                                <TableCell sx={{ wordBreak: 'break-word', color: isMismatch ? 'primary.main' : 'inherit', fontWeight: isMismatch ? 600 : 400 }}>
                                                    {item.xml_value || 'N/A'}
                                                </TableCell>
                                                <TableCell align="center">
                                                    {isMismatch ? (
                                                        <Tooltip title="Values differ">
                                                            <Chip size="small" color="error" label="Mismatch" />
                                                        </Tooltip>
                                                    ) : (
                                                        <Tooltip title="Values match">
                                                            <Chip size="small" color="success" label="Match" />
                                                        </Tooltip>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </>
                )}
                {!result && !loading && (
                    <Typography color="text.secondary">
                        Click 'Run Comparison' to evaluate differences between the uploaded PDF report and XML data file.
                    </Typography>
                )}
            </DialogContent>
            <DialogActions sx={{ px: 3, py: 1.5 }}>
                <Button onClick={onClose}>Close</Button>
                <Button
                    onClick={onCompare}
                    variant="contained"
                    disabled={loading || !selectedFile || !xmlFile}
                >
                    {loading ? <CircularProgress size={20} /> : (result ? 'Re-Compare' : 'Run Comparison')}
                </Button>
            </DialogActions>
        </Dialog>
    );
};
