import React, { useState, useMemo } from 'react';
import {
  Box, Paper, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Chip, FormControlLabel, Switch,
  InputAdornment, IconButton, Tooltip, MenuItem, Select, FormControl, InputLabel, Stack, Button
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import EditIcon from '@mui/icons-material/Edit';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';

export const getFriendlyFieldLabel = (field) => {
  if (!field) return '';
  if (field.startsWith('Analyze and discuss any current agreement of sale')) {
    return 'Agreement of Sale & 3-Year Sales History';
  }
  if (field.startsWith('Discuss atypical taxes, homeowner association')) {
    return 'Atypical Taxes & HOA Fees Discussion';
  }
  if (field.startsWith('Define neighborhood boundaries')) {
    return 'Neighborhood Boundaries Definition';
  }
  if (field.startsWith('Discuss positive and negative neighborhood')) {
    return 'Neighborhood Marketability Characteristics';
  }
  if (field.startsWith('Discuss the site factors')) {
    return 'Site Factors & Marketability Discussion';
  }
  if (field.startsWith('For each Competing Property, specifically discuss')) {
    return 'Competing Properties Analysis Discussion';
  }
  if (field.startsWith('Identify which competing property is positioned to sell first')) {
    return 'Competing Property Positioned to Sell First';
  }
  if (field.startsWith('Forecasting Adjustment Analysis:')) {
    return 'Forecasting Adjustment Analysis & Support';
  }
  if (field.startsWith('Discuss each comparable sale and explain subjective adjustments')) {
    return 'Comparable Sales & Subjective Adjustments';
  }
  if (field.startsWith('Reconciliation (discuss the specific reasoning')) {
    return 'Reconciliation of Anticipated Sales Price';
  }
  if (field.startsWith('Are there any mandatory inspections')) {
    return 'Mandatory Inspections Required for Title Transfer';
  }
  return field;
};

export const ECRComparisonTable = ({
  comparisonRows = [],
  file1Name = 'ERC Main Pdf',
  file2Name = 'ERC 2nd Report',
  onFieldChange,
  isEditable = true
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [onlyDifferences, setOnlyDifferences] = useState(false);
  const [selectedSection, setSelectedSection] = useState('ALL');
  const [showSalesGrid, setShowSalesGrid] = useState(true);

  const [editingCellKey, setEditingCellKey] = useState(null);
  const [editingValue, setEditingValue] = useState('');

  const sections = useMemo(() => {
    const list = Array.from(new Set(comparisonRows.map((r) => r.section))).filter(Boolean);
    return ['ALL', ...list];
  }, [comparisonRows]);

  const filteredRows = useMemo(() => {
    return comparisonRows.filter((row) => {
      if (!showSalesGrid && selectedSection === 'ALL' && row.section.startsWith('Sales Comparison')) {
        return false;
      }
      if (onlyDifferences && row.status === 'MATCH') return false;
      if (selectedSection !== 'ALL' && row.section !== selectedSection) return false;

      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const fieldMatch = (row.field || '').toLowerCase().includes(term);
        const val1Match = String(row.value1 || '').toLowerCase().includes(term);
        const val2Match = String(row.value2 || '').toLowerCase().includes(term);
        const sectionMatch = (row.section || '').toLowerCase().includes(term);
        return fieldMatch || val1Match || val2Match || sectionMatch;
      }
      return true;
    });
  }, [comparisonRows, onlyDifferences, selectedSection, searchTerm, showSalesGrid]);

  const handleStartEdit = (section, field, fileType, currentValue) => {
    if (!isEditable) return;
    setEditingCellKey(`${section}:::${field}:::${fileType}`);
    setEditingValue(currentValue || '');
  };

  const handleSaveEdit = (section, field, fileType) => {
    if (onFieldChange) {
      onFieldChange(section, field, fileType, editingValue);
    }
    setEditingCellKey(null);
  };

  const handleCancelEdit = () => {
    setEditingCellKey(null);
  };

  const handleQuickCopy = (section, field, fromFileType, toFileType, valueToCopy) => {
    if (onFieldChange) {
      onFieldChange(section, field, toFileType, valueToCopy);
    }
  };

  const handleExportCSV = () => {
    const headers = ['Section', 'Field Name', file1Name, file2Name, 'Status'];
    const csvRows = [headers.join(',')];

    filteredRows.forEach((r) => {
      const escape = (val) => `"${String(val || '').replace(/"/g, '""')}"`;
      csvRows.push([
        escape(r.section),
        escape(r.field),
        escape(r.value1),
        escape(r.value2),
        escape(r.status)
      ].join(','));
    });

    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `ERC_Comparison_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const renderStatusBadge = (status) => {
    switch (status) {
      case 'MATCH':
        return (
          <Chip
            size="small"
            icon={<CheckCircleOutlineIcon />}
            label="Match"
            sx={{
              bgcolor: 'rgba(46, 125, 50, 0.12)',
              color: '#2e7d32',
              fontWeight: 700,
              fontSize: '0.75rem'
              , border: '1px solid #000000'
            }}
          />
        );
      case 'MISMATCH':
        return (
          <Chip
            size="small"
            icon={<ErrorOutlineIcon />}
            label="Different"
            sx={{
              bgcolor: 'rgba(211, 47, 47, 0.12)',
              color: '#d32f2f',
              fontWeight: 700,
              fontSize: '0.75rem'
              , border: '1px solid #ff0000ff'
            }}
          />
        );
      case 'MISSING_PDF1':
        return (
          <Chip
            size="small"
            icon={<HelpOutlineIcon />}
            label="Missing in PDF 1"
            sx={{
              bgcolor: 'rgba(237, 108, 2, 0.12)',
              color: '#ed6c02',
              fontWeight: 600,
              fontSize: '0.72rem', border: '1px solid #ff7301ff'
            }}
          />
        );
      case 'MISSING_PDF2':
        return (
          <Chip
            size="small"
            icon={<HelpOutlineIcon />}
            label="Missing in PDF 2"
            sx={{
              bgcolor: 'rgba(156, 39, 176, 0.12)',
              color: '#9c27b0',
              fontWeight: 600,
              fontSize: '0.72rem'
              , border: '1px solid #9c27b0'
            }}
          />
        );
      default:
        return null;
    }
  };

  return (
    <Paper
      elevation={2}
      sx={{
        p: 2.5,
        borderRadius: 3,
        border: '1px solid',
        borderColor: 'divider',
        bgcolor: 'background.paper',
        mb: 3
      }}
    >
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        spacing={2}
        justifyContent="space-between"
        alignItems={{ xs: 'stretch', md: 'center' }}
        sx={{ mb: 2.5 }}
      >
        <Box>
          <Typography variant="h6" fontWeight={700}>
            Side-by-Side Field Comparison & Inline Editor
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Click any field value or pencil icon to edit directly. Copy values across reports with 1 click. ({filteredRows.length} shown)
          </Typography>
        </Box>

        <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap">
          <Button
            size="small"
            variant="outlined"
            startIcon={<FileDownloadIcon />}
            onClick={handleExportCSV}
            disabled={filteredRows.length === 0}
          >
            Export CSV
          </Button>
        </Stack>
      </Stack>

      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={2}
        alignItems="center"
        sx={{ mb: 2 }}
      >
        <TextField
          size="small"
          placeholder="Search field or value..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          sx={{ minWidth: { xs: '100%', sm: 260 }, flexGrow: 1 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" color="action" />
              </InputAdornment>
            )
          }}
        />

        <FormControl size="small" sx={{ minWidth: 180 }}>
          <InputLabel>Section</InputLabel>
          <Select
            value={selectedSection}
            label="Section"
            onChange={(e) => setSelectedSection(e.target.value)}
          >
            {sections.map((sec) => (
              <MenuItem key={sec} value={sec}>
                {sec === 'ALL' ? 'All Sections' : sec}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControlLabel
          control={
            <Switch
              color="error"
              checked={onlyDifferences}
              onChange={(e) => setOnlyDifferences(e.target.checked)}
            />
          }
          label={
            <Typography variant="body2" fontWeight={600} color={onlyDifferences ? 'error.main' : 'text.primary'}>
              Differences Only
            </Typography>
          }
          sx={{ whiteSpace: 'nowrap' }}
        />

        <Button
          size="small"
          variant={showSalesGrid ? 'outlined' : 'contained'}
          color={showSalesGrid ? 'primary' : 'inherit'}
          onClick={() => setShowSalesGrid((prev) => !prev)}
          startIcon={showSalesGrid ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
          sx={{ whiteSpace: 'nowrap', textTransform: 'none', fontWeight: 600, fontSize: '0.8rem', borderRadius: 1.5 }}
        >
          {showSalesGrid ? 'Hide Sales Grid' : 'Show Sales Grid'}
        </Button>
      </Stack>

      <TableContainer
        sx={{
          maxHeight: 650,
          borderRadius: 2,
          border: '1px solid',
          borderColor: 'divider'
        }}
      >
        <Table stickyHeader size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 700, border: '1px solid #000000', bgcolor: 'background.default', width: '15%' }}>
                Section
              </TableCell>
              <TableCell sx={{ fontWeight: 700, bgcolor: 'background.default', width: '20%', border: '1px solid #000000' }}>
                Field Name
              </TableCell>
              <TableCell sx={{ fontWeight: 700, bgcolor: 'background.default', width: '25%', border: '1px solid #000000' }}>
                {file1Name}
              </TableCell>
              <TableCell sx={{ fontWeight: 700, bgcolor: 'background.default', width: '8%', textAlign: 'center', border: '1px solid #000000' }}>
                Copy
              </TableCell>
              <TableCell sx={{ fontWeight: 700, bgcolor: 'background.default', width: '24%', border: '1px solid #000000' }}>
                {file2Name}
              </TableCell>
              <TableCell
                align="center"
                sx={{ fontWeight: 700, bgcolor: 'background.default', width: '8%', border: '1px solid #000000' }}
              >
                Status
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredRows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 4 }} border='1px solid #000'>
                  <Typography variant="body2" color="text.secondary">
                    No matching fields found based on current filters.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              filteredRows.map((row, idx) => {
                const isDiff = row.status === 'MISMATCH';
                const key1 = `${row.section}:::${row.field}:::1`;
                const key2 = `${row.section}:::${row.field}:::2`;
                const isEditing1 = editingCellKey === key1;
                const isEditing2 = editingCellKey === key2;

                const rowBg = isDiff
                  ? 'rgba(211, 47, 47, 0.04)'
                  : idx % 2 === 0
                    ? 'transparent'
                    : 'rgba(0, 0, 0, 0.015)';

                return (
                  <TableRow
                    key={`${row.section}-${row.field}-${idx}`}
                    hover
                    sx={{
                      bgcolor: rowBg,
                      '&:hover': {
                        border: '1px solid #000000',
                        bgcolor: isDiff ? 'rgba(211, 47, 47, 0.08) !important' : undefined
                      }
                    }}
                  >
                    <TableCell sx={{ fontSize: '0.8rem', color: 'text.secondary', fontWeight: 600, border: '1px solid #000000' }}>
                      {row.section}
                    </TableCell>

                    <TableCell sx={{ fontSize: '0.85rem', fontWeight: 600, border: '1px solid #000000' }}>
                      {getFriendlyFieldLabel(row.field) !== row.field ? (
                        <Tooltip title={row.field} arrow placement="top-start">
                          <Box component="span" sx={{ cursor: 'help', borderBottom: '1px dotted #90a4ae' }}>
                            {getFriendlyFieldLabel(row.field)}
                          </Box>
                        </Tooltip>
                      ) : (
                        row.field
                      )}
                    </TableCell>

                    <TableCell
                      sx={{
                        fontSize: '0.85rem',
                        color: isDiff ? '#c62828' : 'text.primary',
                        fontWeight: isDiff ? 600 : 400,
                        bgcolor: isDiff ? 'rgba(255, 235, 238, 0.45)' : 'inherit',
                        wordBreak: 'break-word',
                        verticalAlign: 'middle',
                        cursor: isEditable && !isEditing1 ? 'pointer' : 'default',
                        transition: 'background-color 0.2s'
                        , border: '1px solid #000000'
                      }}
                      onDoubleClick={() => handleStartEdit(row.section, row.field, 1, row.value1)}
                    >
                      {isEditing1 ? (
                        <Stack direction="row" spacing={0.5} alignItems="center">
                          <TextField
                            size="small"
                            autoFocus
                            value={editingValue}
                            onChange={(e) => setEditingValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveEdit(row.section, row.field, 1);
                              if (e.key === 'Escape') handleCancelEdit();
                            }}
                            sx={{ width: '100%', border: '1px solid #000000' }}
                            inputProps={{ style: { fontSize: '0.85rem', padding: '4px 8px' } }}
                          />
                          <IconButton
                            size="small"
                            color="primary"
                            onClick={() => handleSaveEdit(row.section, row.field, 1)}
                            title="Save"
                          >
                            <CheckIcon fontSize="small" />
                          </IconButton>
                          <IconButton
                            size="small"
                            color="inherit"
                            onClick={handleCancelEdit}
                            title="Cancel"
                          >
                            <CloseIcon fontSize="small" />
                          </IconButton>
                        </Stack>
                      ) : (
                        <Stack
                          direction="row"
                          alignItems="center"
                          justifyContent="space-between"
                          sx={{ '&:hover .edit-btn-1': { opacity: 1 } }}
                        >
                          <Box sx={{ flexGrow: 1 }}>
                            {row.value1 || (
                              <Typography variant="caption" color="text.disabled" fontStyle="italic">

                              </Typography>
                            )}
                          </Box>
                          {isEditable && (
                            <IconButton
                              size="small"
                              className="edit-btn-1"
                              onClick={() => handleStartEdit(row.section, row.field, 1, row.value1)}
                              sx={{ opacity: 0, transition: 'opacity 0.2s', p: 0.3, ml: 0.5 }}
                              title="Edit PDF 1 value"
                            >
                              <EditIcon sx={{ fontSize: 15 }} />
                            </IconButton>
                          )}
                        </Stack>
                      )}
                    </TableCell>

                    <TableCell align="center" sx={{ verticalAlign: 'middle', px: 0.5, border: '1px solid #000000' }}>
                      <Stack direction="row" spacing={0.5} justifyContent="center">
                        {row.value2 && (
                          <Tooltip title="Copy from PDF 2 to PDF 1">
                            <IconButton
                              size="small"
                              color="primary"
                              onClick={() => handleQuickCopy(row.section, row.field, 2, 1, row.value2)}
                              sx={{ p: 0.3, border: '1px solid #000000' }}
                            >
                              <ArrowBackIcon sx={{ fontSize: 15 }} />
                            </IconButton>
                          </Tooltip>
                        )}
                        {row.value1 && (
                          <Tooltip title="Copy from PDF 1 to PDF 2">
                            <IconButton
                              size="small"
                              color="secondary"
                              onClick={() => handleQuickCopy(row.section, row.field, 1, 2, row.value1)}
                              sx={{ p: 0.3, border: '1px solid #000000' }}
                            >
                              <ArrowForwardIcon sx={{ fontSize: 15 }} />
                            </IconButton>
                          </Tooltip>
                        )}
                      </Stack>
                    </TableCell>

                    <TableCell
                      sx={{
                        fontSize: '0.85rem',
                        color: isDiff ? '#2e7d32' : 'text.primary',
                        fontWeight: isDiff ? 600 : 400,
                        bgcolor: isDiff ? 'rgba(232, 245, 233, 0.45)' : 'inherit',
                        wordBreak: 'break-word',
                        verticalAlign: 'middle',
                        cursor: isEditable && !isEditing2 ? 'pointer' : 'default',
                        transition: 'background-color 0.2s'
                        , border: '1px solid #000000'
                      }}
                      onDoubleClick={() => handleStartEdit(row.section, row.field, 2, row.value2)}
                    >
                      {isEditing2 ? (
                        <Stack direction="row" spacing={0.5} alignItems="center">
                          <TextField
                            size="small"
                            autoFocus
                            value={editingValue}
                            onChange={(e) => setEditingValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveEdit(row.section, row.field, 2);
                              if (e.key === 'Escape') handleCancelEdit();
                            }}
                            sx={{ width: '100%' }}
                            inputProps={{ style: { fontSize: '0.85rem', padding: '4px 8px' } }}
                          />
                          <IconButton
                            size="small"
                            color="primary"
                            onClick={() => handleSaveEdit(row.section, row.field, 2)}
                            title="Save"
                          >
                            <CheckIcon fontSize="small" />
                          </IconButton>
                          <IconButton
                            size="small"
                            color="inherit"
                            onClick={handleCancelEdit}
                            title="Cancel"
                          >
                            <CloseIcon fontSize="small" />
                          </IconButton>
                        </Stack>
                      ) : (
                        <Stack
                          direction="row"
                          alignItems="center"
                          justifyContent="space-between"
                          sx={{ '&:hover .edit-btn-2': { opacity: 1 } }}
                        >
                          <Box sx={{ flexGrow: 1 }}>
                            {row.value2 || (
                              <Typography variant="caption" color="text.disabled" fontStyle="italic">

                              </Typography>
                            )}
                          </Box>
                          {isEditable && (
                            <IconButton
                              size="small"
                              className="edit-btn-2"
                              onClick={() => handleStartEdit(row.section, row.field, 2, row.value2)}
                              sx={{ opacity: 0, transition: 'opacity 0.2s', p: 0.3, ml: 0.5, border: '1px solid #000000' }}
                              title="Edit PDF 2 value"
                            >
                              <EditIcon sx={{ fontSize: 15 }} />
                            </IconButton>
                          )}
                        </Stack>
                      )}
                    </TableCell>

                    <TableCell align="center" sx={{ border: "1px solid #000000" }}>
                      {renderStatusBadge(row.status)}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
};

export default ECRComparisonTable;
