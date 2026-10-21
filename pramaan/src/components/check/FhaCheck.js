import React, { useCallback, useState } from 'react';
import {
  Button,
  CircularProgress,
  Paper,
  Typography,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Stack,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Tooltip,
  IconButton,
  Box,
  TextField,
  InputAdornment
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Cancel as CancelIcon,
  HelpOutline as HelpOutlineIcon,
  ContentCopy as ContentCopyIcon,
  Check as CheckIcon,
  Search as SearchIcon,
  Clear as ClearIcon,
  Security as FhaIcon
} from '@mui/icons-material';

export const FHA_RULES = [
  { id: 1, requirement: "FHA Case Number", description: "Extract the FHA case number (format XXX-XXXXXXX). Must be present and valid." },
  { id: 2, requirement: "FHA as Intended User", description: "Verify a comment exists stating that FHA/HUD is an additional intended user of the report." },
  { id: 3, requirement: "HUD Handbook 4000.1 Compliance", description: "Verify there is a comment confirming whether the subject meets HUD 4000.1 / MPR guidelines." },
  { id: 4, requirement: "Attic/Crawl Space Inspection", description: "Verify a comment confirms head & shoulders inspection of attic and/or crawl space (or clearly states if inaccessible)." },
  { id: 5, requirement: "Amenities on Sketch", description: "Verify exterior amenities (patios, decks, porches) mentioned in the report are depicted on the building sketch." },
  { id: 6, requirement: "Well and Septic Distances", description: "If property uses well and/or septic, verify appraiser has commented on whether separation distances meet HUD guidelines." },
  { id: 7, requirement: "Outbuilding Photos", description: "If storage sheds, barns, or outbuildings are present, verify interior photos are included in photo exhibits." },
  { id: 8, requirement: "Crawl Space/Attic Access Issues", description: "If attic/crawl space was inaccessible, verify report is conditioned 'Subject To' inspection if deficiencies exist." }
];

export const FHA_REQUIREMENTS_PROMPT = `
Based on the document, verify the following FHA-specific appraisal requirements.
The output must be a JSON object with a "summary" (a one to two-line overview of FHA compliance) and a "details" array. Each object in the "details" array should have "requirement", "status" ('Fulfilled', 'Not Fulfilled', 'Needs Review', or 'Not Applicable'), and "value_or_comment" keys.

FHA Requirements to check:
- FHA Case Number: Extract the FHA case number. The status should be "Fulfilled" if present, "Not Fulfilled" if absent.
- FHA as Intended User: Verify a comment exists stating that FHA is an additional intended user of the report. This is often in the 'Intended Use' or 'Addendum' sections.
- HUD Handbook 4000.1 Compliance: Verify there is a comment stating whether the subject property meets the HUD 4000.1 handbook guidelines.
- Attic/Crawl Space Inspection: Verify there is a comment confirming if the attic and/or crawl space was inspected. If access was not possible, this should be noted.
- Amenities on Sketch: Based on photo and sketch analysis, verify if amenities like patios, decks, or porches mentioned in the report are also depicted on the property sketch.
- Well and Septic Distances: If the property uses a well and septic system (check 'Water' and 'Sanitary Sewer' fields), verify the appraiser has commented on whether the distances between them meet HUD guidelines.
- Outbuilding Photos: If storage sheds, barns, or other outbuildings are present, verify that interior photos of these structures are included.
- Crawl Space/Attic Access Issues: If the appraiser notes there was no access to the crawl space or attic, check if the report is made "subject to" inspection. If there are no signs of damage mentioned, the report can be "as is". The status should be "Needs Review" if there's a potential conflict.
`;

const FhaCheck = ({ onPromptSubmit, loading, response, error }) => {
  const [filterValue, setFilterValue] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedIndex, setCopiedIndex] = useState(null);

  const handleCheck = () => {
    onPromptSubmit(FHA_REQUIREMENTS_PROMPT);
  };

  const handleCopy = (text, idx) => {
    if (!text) return;
    const cleanText = typeof text === 'object' ? JSON.stringify(text) : String(text);
    if (navigator.clipboard) {
      navigator.clipboard.writeText(cleanText);
    }
    setCopiedIndex(idx);
    setTimeout(() => {
      setCopiedIndex(null);
    }, 2000);
  };

  const renderResponse = useCallback(() => {
    if (!response) return null;

    let data = response;
    if (typeof response === 'string') {
      try {
        data = JSON.parse(response);
      } catch (e) {
        return <pre>{response}</pre>;
      }
    }

    const summary = data?.summary ?? 'No summary available.';
    const details = Array.isArray(data?.details) ? data.details : [];

    const renderValue = (val) => {
      if (val == null) return '';
      if (typeof val === 'object') {
        if (val.value && val.page_no) {
          return `${val.value} (Page ${val.page_no})`;
        }
        return JSON.stringify(val, null, 2);
      }
      return String(val);
    };

    const normalizeStatus = (status) => {
      const s = String(status || '').trim().toLowerCase();
      if (['fulfilled', 'ok', 'pass', 'passed', 'yes'].includes(s)) return 'fulfilled';
      if (['needs review', 'review', 'escalate', 'needs attention', 'pending'].includes(s)) return 'review';
      if (['not fulfilled', 'failed', 'fail', 'no', 'missing'].includes(s)) return 'not_fulfilled';
      if (['not applicable', 'n/a', 'na'].includes(s)) return 'na';
      return 'other';
    };

    const getStatusConfig = (status) => {
      const norm = normalizeStatus(status);
      switch (norm) {
        case 'fulfilled':
          return {
            label: status || 'Fulfilled',
            bg: '#e8f5e9',
            color: '#1b5e20',
            border: '#a5d6a7',
            icon: <CheckCircleIcon sx={{ fontSize: 16, color: '#2e7d32' }} />
          };
        case 'review':
          return {
            label: status || 'Needs Review',
            bg: '#fff8e1',
            color: '#b78103',
            border: '#ffe082',
            icon: <WarningIcon sx={{ fontSize: 16, color: '#f57f17' }} />
          };
        case 'not_fulfilled':
          return {
            label: status || 'Not Fulfilled',
            bg: '#ffebee',
            color: '#c62828',
            border: '#ef9a9a',
            icon: <CancelIcon sx={{ fontSize: 16, color: '#d32f2f' }} />
          };
        case 'na':
          return {
            label: status || 'Not Applicable',
            bg: '#f5f5f5',
            color: '#616161',
            border: '#e0e0e0',
            icon: <HelpOutlineIcon sx={{ fontSize: 16, color: '#757575' }} />
          };
        default:
          return {
            label: status || 'Unknown',
            bg: '#f0f4f8',
            color: '#334155',
            border: '#cbd5e1',
            icon: null
          };
      }
    };

    const counts = {
      all: details.length,
      fulfilled: details.filter(d => normalizeStatus(d.status) === 'fulfilled').length,
      review: details.filter(d => normalizeStatus(d.status) === 'review').length,
      not_fulfilled: details.filter(d => normalizeStatus(d.status) === 'not_fulfilled').length,
      na: details.filter(d => normalizeStatus(d.status) === 'na').length
    };

    const filteredDetails = details.filter((item, index) => {
      const norm = normalizeStatus(item.status);
      if (filterValue === 'fulfilled' && norm !== 'fulfilled') return false;
      if (filterValue === 'review' && norm !== 'review') return false;
      if (filterValue === 'not_fulfilled' && norm !== 'not_fulfilled') return false;
      if (filterValue === 'na' && norm !== 'na') return false;
      if (filterValue === 'action_needed' && norm !== 'not_fulfilled' && norm !== 'review') return false;

      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const reqMatch = String(item.requirement || '').toLowerCase().includes(query);
        const valMatch = renderValue(item.value_or_comment).toLowerCase().includes(query);
        const statusMatch = String(item.status || '').toLowerCase().includes(query);
        return reqMatch || valMatch || statusMatch;
      }

      return true;
    });

    return (
      <Stack spacing={2.5} sx={{ mt: 2 }}>
        {/* Summary Card */}
        {summary && (
          <Paper
            elevation={0}
            sx={{
              p: 2.5,
              bgcolor: '#f8fafc',
              borderRadius: 2,
              border: '1px solid #e2e8f0',
              display: 'flex',
              flexDirection: 'column',
              gap: 1.5
            }}
          >
            <Box display="flex" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={1}>
              <Box display="flex" alignItems="center" gap={1}>
                <FhaIcon color="primary" sx={{ fontSize: 22 }} />
                <Typography variant="subtitle1" fontWeight={700} color="text.primary">
                  FHA Guidelines Compliance Summary
                </Typography>
              </Box>

              <Stack direction="row" spacing={1} flexWrap="wrap">
                <Chip
                  size="small"
                  label={`Fulfilled: ${counts.fulfilled}`}
                  sx={{ bgcolor: '#e8f5e9', color: '#1b5e20', fontWeight: 600, border: '1px solid #a5d6a7' }}
                />
                {(counts.not_fulfilled > 0 || counts.review > 0) && (
                  <Chip
                    size="small"
                    label={`Action Needed: ${counts.not_fulfilled + counts.review}`}
                    sx={{ bgcolor: '#ffebee', color: '#c62828', fontWeight: 700, border: '1px solid #ef9a9a' }}
                  />
                )}
                {counts.na > 0 && (
                  <Chip
                    size="small"
                    label={`N/A: ${counts.na}`}
                    sx={{ bgcolor: '#f5f5f5', color: '#616161', fontWeight: 500, border: '1px solid #e0e0e0' }}
                  />
                )}
              </Stack>
            </Box>

            <Typography variant="body2" sx={{ color: 'text.secondary', whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
              {summary}
            </Typography>
          </Paper>
        )}

        {/* Filter and Search Bar */}
        <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1.5}>
          <Box display="flex" alignItems="center" gap={1} flexWrap="wrap">
            <Typography variant="subtitle2" color="text.secondary" sx={{ minWidth: 50 }}>
              Filter:
            </Typography>
            <FormControl size="small" sx={{ minWidth: 180 }}>
              <InputLabel id="fha-status-filter-label">Status Filter</InputLabel>
              <Select
                labelId="fha-status-filter-label"
                value={filterValue}
                label="Status Filter"
                onChange={(e) => setFilterValue(e.target.value)}
              >
                <MenuItem value="all">All Requirements ({counts.all})</MenuItem>
                <MenuItem value="action_needed">Action Needed ({counts.not_fulfilled + counts.review})</MenuItem>
                <MenuItem value="not_fulfilled">Not Fulfilled ({counts.not_fulfilled})</MenuItem>
                <MenuItem value="review">Needs Review ({counts.review})</MenuItem>
                <MenuItem value="fulfilled">Fulfilled ({counts.fulfilled})</MenuItem>
                <MenuItem value="na">Not Applicable ({counts.na})</MenuItem>
              </Select>
            </FormControl>
          </Box>

          <TextField
            size="small"
            placeholder="Search FHA rules or notes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" color="action" />
                </InputAdornment>
              ),
              endAdornment: searchQuery ? (
                <InputAdornment position="end">
                  <IconButton size="small" onClick={() => setSearchQuery('')}>
                    <ClearIcon fontSize="small" />
                  </IconButton>
                </InputAdornment>
              ) : null
            }}
            sx={{ minWidth: 240 }}
          />
        </Box>

        {/* Details Table */}
        <Paper elevation={0} sx={{ border: '1px solid #e2e8f0', borderRadius: 2, overflow: 'hidden' }}>
          <TableContainer>
            <Table size="small">
              <TableHead sx={{ bgcolor: '#f1f5f9' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700, width: '28%', color: '#334155' }}>FHA Requirement</TableCell>
                  <TableCell sx={{ fontWeight: 700, width: '18%', color: '#334155' }}>Status</TableCell>
                  <TableCell sx={{ fontWeight: 700, width: '54%', color: '#334155' }}>Extracted Finding / Comment</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredDetails.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} align="center" sx={{ py: 3, color: 'text.secondary' }}>
                      No FHA requirements match your filter or search criteria.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredDetails.map((item, index) => {
                    const statusConfig = getStatusConfig(item.status);
                    const valText = renderValue(item.value_or_comment);

                    return (
                      <TableRow
                        key={index}
                        hover
                        sx={{
                          '&:last-child td, &:last-child th': { border: 0 },
                          transition: 'background-color 0.15s ease'
                        }}
                      >
                        <TableCell sx={{ verticalAlign: 'top', py: 1.5 }}>
                          <Typography variant="body2" fontWeight={600} color="text.primary">
                            {item.requirement}
                          </Typography>
                        </TableCell>

                        <TableCell sx={{ verticalAlign: 'top', py: 1.5 }}>
                          <Chip
                            size="small"
                            icon={statusConfig.icon || undefined}
                            label={statusConfig.label}
                            sx={{
                              bgcolor: statusConfig.bg,
                              color: statusConfig.color,
                              fontWeight: 600,
                              border: `1px solid ${statusConfig.border}`,
                              '& .MuiChip-icon': {
                                color: 'inherit'
                              }
                            }}
                          />
                        </TableCell>

                        <TableCell sx={{ verticalAlign: 'top', py: 1.5 }}>
                          <Box display="flex" alignItems="flex-start" justifyContent="space-between" gap={1}>
                            <Typography
                              variant="body2"
                              sx={{
                                color: '#1e293b',
                                lineHeight: 1.5,
                                whiteSpace: 'pre-wrap',
                                wordBreak: 'break-word',
                                flex: 1
                              }}
                            >
                              {valText}
                            </Typography>
                            {valText && (
                              <Tooltip title={copiedIndex === index ? "Copied!" : "Copy comment"}>
                                <IconButton
                                  size="small"
                                  onClick={() => handleCopy(valText, index)}
                                  sx={{
                                    p: 0.5,
                                    color: copiedIndex === index ? 'success.main' : 'action.active',
                                    '&:hover': { bgcolor: 'action.hover' }
                                  }}
                                >
                                  {copiedIndex === index ? (
                                    <CheckIcon sx={{ fontSize: 16 }} />
                                  ) : (
                                    <ContentCopyIcon sx={{ fontSize: 16 }} />
                                  )}
                                </IconButton>
                              </Tooltip>
                            )}
                          </Box>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      </Stack>
    );
  }, [response, filterValue, searchQuery, copiedIndex]);

  return (
    <div id="fha-check-section" className="card shadow-sm mb-4" style={{ borderRadius: 8, overflow: 'hidden' }}>
      <div className="card-header bg-primary text-white d-flex align-items-center justify-content-between py-2.5 px-3">
        <strong style={{ fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: 6 }}>
          <FhaIcon fontSize="small" />
          FHA Requirement Check
        </strong>
      </div>
      <div className="card-body p-3">
        <Stack spacing={2}>
          <Box display="flex" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={1}>
            <Button
              onClick={handleCheck}
              variant="contained"
              color="primary"
              disabled={loading}
              startIcon={loading ? <CircularProgress size={18} color="inherit" /> : <FhaIcon />}
              sx={{ textTransform: 'none', fontWeight: 600 }}
            >
              {loading ? 'Evaluating FHA Requirements...' : 'Check FHA Requirements'}
            </Button>
          </Box>

          {error && <Alert severity="error">{error}</Alert>}
          {renderResponse()}
        </Stack>
      </div>
    </div>
  );
};

export default FhaCheck;
