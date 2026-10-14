import React, { useCallback } from 'react';
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
} from '@mui/material';

export const UNPAID_OK_PROMPT = `
Based on the Lender/Client name in the document, verify if it matches any of the following "Unpaid OK" lenders.
The output must be a JSON object with a "summary" (a one to two-line overview stating if the lender is on the 'Unpaid OK' list and what the lender name is) and a "details" array. The "details" array should contain one object with "requirement", "status", and "value_or_comment" keys.

"Unpaid OK" Lender List:
- PRMG (Paramount Residential Mortgage Group)
- CARDINAL FINANCIAL COMPANY
- Ice Lender Holdings LLC
- NP Inc / NQM Funding, LLC
- East Coast Capital
- Guaranteed Rate. Inc
- Commercial Lender, LLC
- LoanDepot.com - When loan number starts with '1 or 4'
- Direct Lending Partners
- CIVIC
- CV3
- United Faith Mortgage
- Arixa Capital/Crosswind Financial and Western Alliance Bank
- RCN Capital, LLC
- Aura Mortgage Advisors, LLC/Blue Hub Capital
- Nations Direct Mortgage LLC
- Sierra Pacific Mortgage Company Inc
- Champions Funding LLC
`;

const UnpaidOkCheck = ({ onPromptSubmit, loading, response, error }) => {
  const handleCheck = () => {
    onPromptSubmit(UNPAID_OK_PROMPT);
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
            <Typography variant="h6" gutterBottom component="div" color="primary.main">
              Details
            </Typography>
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
                  {details.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell>{item.requirement}</TableCell>
                      <TableCell>{item.status}</TableCell>
                      <TableCell>
                        {typeof item.value_or_comment === 'object' && item.value_or_comment !== null ? (
                          <>
                            {item.value_or_comment.value && (
                              <Typography variant="body2">{item.value_or_comment.value}</Typography>
                            )}
                            {item.value_or_comment.page_no && (
                              <Typography variant="caption" color="text.secondary">
                                Page: {item.value_or_comment.page_no}
                              </Typography>
                            )}
                          </>
                        ) : (
                          item.value_or_comment
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        )}
      </Stack>
    );
  }, [response]);

  return (
    <div id="unpaid-ok-check-section" className="card shadow mb-4">
      <div className="card-header CAR1 bg-primary text-white">
        <strong>Unpaid OK Lender Check</strong>
      </div>
      <div className="card-body">
        <Stack spacing={2}>
          <Button onClick={handleCheck} variant="contained" color="secondary" disabled={loading}>
            {loading ? <CircularProgress size={24} /> : 'Check Unpaid OK Lenders'}
          </Button>

          {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
          {response && renderResponse()}
        </Stack>
      </div>
    </div>
  );
};

export default UnpaidOkCheck;
