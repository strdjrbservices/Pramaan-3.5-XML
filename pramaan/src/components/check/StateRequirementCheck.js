import { useCallback, useState } from 'react';
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
  Tooltip,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';

export const STATE_REQUIREMENTS_PROMPT = `
Analyze the appraisal report for state-specific requirements based on the property's state.
Your output must be a single, clean JSON object. Do not include any text outside of the JSON object.
The JSON object must have a "summary" (a one to two-line overview of findings) and a "details" array.
Each object in the "details" array represents a requirement and must have the following keys:
- "requirement": A string describing the state-specific rule being checked.
- "status": A string, which must be one of 'Fulfilled', 'Not Fulfilled', 'Needs Review', or 'Not Applicable'.
- "value_or_comment": A string containing the extracted value or comment formatted only in words (e.g., "Appraiser fee = $395.00" or "AMC License/Registration number = 26529dfhghsk."). Do not include page numbers.

State-Specific Requirements:
1. Appraiser fee disclosed in report body: Required for AZ, CO, CT, GA, IL, LA, NJ, NV, NM, ND, OH, UT, VA, VT, WV.
2. AMC license/registration number included: Required for GA, IL, MT, NJ, OH, VT.
3. AMC number and expiration date included: Required for IL (e.g., 558000312, Exp: 12/31/2026).
4. AMC fee included in report: Required for NV, NM, UT.
5. Smoke/CO detector presence and legal requirement addressed: Required for CA.
6. Water heater double-strapping addressed: Required for CA; UT for Averra Financial LLC.
7. CO detector presence confirmed; photos provided: Required for IL.
8. Invoice attached to report: Required for NY (except Plaza Home Mortgage); WI.
9. Invoice included or omitted without rejection: Required for OK (Pass/Fulfilled).
10. Philadelphia report escalation: Required for PA: escalate only if value seems high; no escalation for 1004D.
11. Smoke/CO detector installation confirmed: Required for VA.
`;

const StateRequirementCheck = ({ onPromptSubmit, loading, response, error }) => {
  const [filterValue, setFilterValue] = useState('all');

  const handleCheckRequirements = () => {
    onPromptSubmit(STATE_REQUIREMENTS_PROMPT);
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

    const { summary, details } = data;

    const greenStatuses = ['fulfilled', 'ok', 'pass', 'passed', 'yes'];
    const isGreen = (status) => {
      const normalized = String(status || '').trim().toLowerCase();
      return greenStatuses.includes(normalized);
    };

    const parsedDetails = Array.isArray(details) ? details : [];

    const filteredDetails = parsedDetails.filter(item => {
      if (filterValue === 'passed') return isGreen(item.status);
      if (filterValue === 'failed') return !isGreen(item.status) && item.status !== 'Not Applicable';
      return true;
    });

    const sortedDetails = [...filteredDetails].sort((a, b) => {
      const isGreenA = isGreen(a.status);
      const isGreenB = isGreen(b.status);
      if (isGreenA && !isGreenB) return -1;
      if (!isGreenA && isGreenB) return 1;
      return 0;
    });

    return (
      <Stack spacing={3} sx={{ mt: 3 }}>
        {summary && (
          <Paper elevation={1} sx={{ p: 2, bgcolor: 'background.default' }}>
            <Typography variant="h6" gutterBottom component="div" color="primary.main">
              Summary
            </Typography>
            <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
              {summary}
            </Typography>
          </Paper>
        )}

        {details && Array.isArray(details) && (
          <Paper elevation={1} sx={{ p: 2 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
              <Typography variant="h6" component="div" color="primary.main">
                Details
              </Typography>
              <FormControl size="small" sx={{ minWidth: 150 }}>
                <InputLabel id="state-status-filter-label">Filter Status</InputLabel>
                <Select
                  labelId="state-status-filter-label"
                  id="state-status-filter"
                  value={filterValue}
                  label="Filter Status"
                  onChange={(e) => setFilterValue(e.target.value)}
                >
                  <MenuItem value="all">All</MenuItem>
                  <MenuItem value="passed">Passed / OK</MenuItem>
                  <MenuItem value="failed">Failed / Review</MenuItem>
                </Select>
              </FormControl>
            </Stack>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 'bold' }}>Requirement</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Status</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Value / Comment</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {sortedDetails.length > 0 ? (
                    sortedDetails.map((item, index) => {
                      const normStatus = String(item.status || '').trim().toLowerCase();
                      const isFulfilled = ['fulfilled', 'ok', 'pass', 'passed', 'yes'].includes(normStatus);
                      const isNA = ['not applicable', 'n/a', 'na'].includes(normStatus);
                      const isNeedsReview = ['needs review', 'review', 'escalate'].includes(normStatus);
                      
                      let statusStyle = {
                        backgroundColor: '#ff0000',
                        color: '#ffffff',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        display: 'inline-block',
                        cursor: 'pointer',
                        fontWeight: 'bold'
                      };
                      if (isFulfilled) {
                        statusStyle = {
                          backgroundColor: '#91ff00ff',
                          color: '#000000',
                          padding: '4px 8px',
                          borderRadius: '4px',
                          display: 'inline-block',
                          fontWeight: 'bold'
                        };
                      } else if (isNA) {
                        statusStyle = {
                          backgroundColor: '#e0e0e0',
                          color: '#555555',
                          padding: '4px 8px',
                          borderRadius: '4px',
                          display: 'inline-block'
                        };
                      } else if (isNeedsReview) {
                        statusStyle = {
                          backgroundColor: '#ffc107',
                          color: '#000000',
                          padding: '4px 8px',
                          borderRadius: '4px',
                          display: 'inline-block',
                          fontWeight: 'bold'
                        };
                      }

                      const isInvalid = !isFulfilled && !isNA;
                      let tooltipContent = '';
                      if (isInvalid) {
                        if (typeof item.value_or_comment === 'object' && item.value_or_comment !== null) {
                          tooltipContent = item.value_or_comment.value || JSON.stringify(item.value_or_comment);
                        } else {
                          tooltipContent = item.value_or_comment;
                        }
                      }
                      return (
                        <TableRow key={index}>
                          <TableCell>{item.requirement}</TableCell>
                          <TableCell>
                            {isInvalid ? (
                              <Tooltip title={tooltipContent} arrow>
                                <span style={statusStyle}>{item.status}</span>
                              </Tooltip>
                            ) : (
                              <span style={statusStyle}>{item.status}</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {typeof item.value_or_comment === 'object' && item.value_or_comment !== null ? (
                              <Typography variant="body2">{item.value_or_comment.value || JSON.stringify(item.value_or_comment)}</Typography>
                            ) : (
                              item.value_or_comment
                            )}
                          </TableCell>
                        </TableRow>
                      )
                    })
                  ) : (
                    <TableRow>
                      <TableCell colSpan={3} align="center">
                        No matching items found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        )}
      </Stack>
    );
  }, [response, filterValue]);

  return (
    <div id="state-requirement-section" className="card shadow mb-4">
      <div className="card-header CAR1 bg-primary text-white">
        <strong>State Requirement Check</strong>
      </div>
      <div className="card-body">
        <Stack spacing={2}>
          <Button
            onClick={handleCheckRequirements}
            variant="contained"
            color="secondary"
            disabled={loading}
          >
            {loading ? <CircularProgress size={24} /> : 'Check State Requirements'}
          </Button>

          {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
          {response && renderResponse()}
        </Stack>
      </div>
    </div>
  );
};

export default StateRequirementCheck;
