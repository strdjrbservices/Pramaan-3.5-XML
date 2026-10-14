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

export const FHA_REQUIREMENTS_PROMPT = `
Based on the document, verify the following FHA-specific appraisal requirements.
The output must be a JSON object with a "summary" (a one to two-line overview of FHA compliance) and a "details" array. Each object in the "details" array should have "requirement", "status" ('Fulfilled', 'Not Fulfilled', 'Needs Review'), and "value_or_comment" keys.

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
  const handleCheck = () => {
    onPromptSubmit(FHA_REQUIREMENTS_PROMPT);
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
    <div id="fha-check-section" className="card shadow mb-4">
      <div className="card-header CAR1 bg-primary text-white">
        <strong>FHA Requirement Check</strong>
      </div>
      <div className="card-body">
        <Stack spacing={2}>
          <Button onClick={handleCheck} variant="contained" color="secondary" disabled={loading}>
            {loading ? <CircularProgress size={24} /> : 'Check FHA Requirements'}
          </Button>

          {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
          {response && renderResponse()}
        </Stack>
      </div>
    </div>
  );
};

export default FhaCheck;
