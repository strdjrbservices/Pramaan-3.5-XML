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

export const ADU_REQUIREMENTS_PROMPT = `
Based on the document, verify the following ADU-specific appraisal requirements.
The output must be a JSON object with a "summary" (a one to two-line overview of ADU compliance) and a "details" array. Each object in the "details" array should have "requirement", "status" ('Fulfilled', 'Not Fulfilled', 'Needs Review'), and "value_or_comment" keys.

ADU Requirements to check:
"1. If there is an additional dwelling with kitchen and bath then ‘‘One with Accessory Unit’ must be checked.
Very important- Kitchen must have stove 
Case 1: If there is interior access between them then ADU may be added in the main unit
If an ADU is included in the main GLA, there must be interior access between the main unit and ADU. And also have separate entrances and exits.
Case 2: If there is no interior access between them then ADU must be added in the separate line item
Case 3: If the ADU consider as a second floor then ADU may be added in the main unit
2. If the kitchen or bath is missing from additional dwelling then ‘One with Accessory Unit’ must be unchecked. 
3. If there is a kitchen and bath in the basement then the ‘One with Accessory Unit’ box can be checked or unchecked. Both ways it will be okay.
4. If a room labeled as a 'kitchenette' should not have a stove then no need check for health and safety comment
If there is a stove in the kitchenette, please escalate with the comment if a comment is present (permitted comment/health or safety comment).
Escalation language: On page # a room labeled as 'kitchenette' has a stove. Please advise"
`;

const ADUCheck = ({ onPromptSubmit, loading, response, error }) => {
  const handleCheck = () => {
    onPromptSubmit(ADU_REQUIREMENTS_PROMPT);
  };

  ADUCheck.ADU_REQUIREMENTS_PROMPT = ADU_REQUIREMENTS_PROMPT;

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
    <div id="ADU-check-section" className="card shadow mb-4">
      <div className="card-header CAR1 bg-primary text-white">
        <strong>ADU Requirement Check</strong>
      </div>
      <div className="card-body">
        <Stack spacing={2}>
          <Button onClick={handleCheck} variant="contained" color="secondary" disabled={loading}>
            {loading ? <CircularProgress size={24} /> : 'Check ADU Requirements'}
          </Button>

          {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
          {response && renderResponse()}
        </Stack>
      </div>
    </div>
  );
};

export default ADUCheck;
