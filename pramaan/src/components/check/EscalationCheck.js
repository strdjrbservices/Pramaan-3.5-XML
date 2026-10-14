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
  Tooltip,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';

export const ESCALATION_RULES = [
  { id: 1, requirement: "Assignment Type Mismatch", ruleText: "1. Assignment Type Mismatch: If order form indicates ‘Purchase’ but report is marked ‘Refinance’, or vice-versa." },
  { id: 2, requirement: "Appraisal Type Mismatch", ruleText: "2. Appraisal Type Mismatch: If order form shows '1004+1007' but report is '1025'." },
  { id: 3, requirement: "Appraiser Mismatch", ruleText: "3. Appraiser Mismatch: If order form appraiser name differs from the completing appraiser in the report." },
  { id: 4, requirement: "Repairs vs. As-Is", ruleText: "4. Repairs vs. As-Is: If photos or comments show multiple repairs but the report is made 'As-is'." },
  { id: 5, requirement: "Supervisory Appraiser Signature", ruleText: "5. Supervisory Appraiser Signature: If the appraiser on the order form signs as the supervisory appraiser." },
  { id: 6, requirement: "Missing Revisions", ruleText: "6. Missing Revisions: If latest revision requests are not reflected in the report." },
  { id: 7, requirement: "Lender/Client Name Change", ruleText: "7. Lender/Client Name Change: If the lender/client name is changed in the report (e.g., from “Easy Street Capital” to “National Loan Funder”)." },
  { id: 8, requirement: "Appraiser Fee Mismatch", ruleText: "8. Appraiser Fee Mismatch: If the appraiser’s fee in the report does not match the engagement letter." },
  { id: 9, requirement: "Neighborhood Condition Comment", ruleText: "9. Neighborhood Condition Comment: If the Neighborhood section comment contains potentially negative words like \"*average* condition\"." },
  { id: 10, requirement: "Value vs. Price", ruleText: "10. Value vs. Price: If the final value is 10% lower than list price, purchase price, and prior sale price." },
  { id: 11, requirement: "1004D Mismatch", ruleText: "11. 1004D Mismatch: If order form shows ‘1004D Final Inspection/Appraisal Update’ but report is only one of them, or vice-versa." },
  { id: 12, requirement: "Loan/Appraisal Type Conflict", ruleText: "12. Loan/Appraisal Type Conflict: If order form loan type (e.g., USDA) conflicts with appraisal type (e.g., 1004 FHA)." },
  { id: 13, requirement: "Illegal Use", ruleText: "13. Illegal Use: If the property is marked as 'Illegal'." },
  { id: 14, requirement: "Multiple Kitchens", ruleText: "14. Multiple Kitchens: If a 1004 report shows 3+ kitchens, check for comments on whether they are permitted." },
  { id: 15, requirement: "Inspection/Effective Date Mismatch", ruleText: "15. Inspection/Effective Date Mismatch: If inspection date from records differs from the report's effective date." },
  { id: 16, requirement: "Value vs. Unadjusted Sales Price", ruleText: "16. Value vs. Unadjusted Sales Price: If final value is more than 10% higher than the unadjusted sales price." },
  { id: 17, requirement: "Drastic Grid Adjustments", ruleText: "17. Drastic Grid Adjustments: If sales grid adjustments are drastic." },
  { id: 18, requirement: "Commercial Location in Sales Grid", ruleText: "18. Commercial Location in Sales Grid: If a comparable's location is marked \"Commercial\"." },
  { id: 19, requirement: "Value Higher than Purchase Price", ruleText: "19. Value Higher than Purchase Price: If purchase price is 10% higher than the appraised value." },
  { id: 20, requirement: "Value Increase Since Prior Sale", ruleText: "20. Value Increase Since Prior Sale: If there's an increase in value since the subject's prior sale." },
  { id: 21, requirement: "Duplicate Addresses", ruleText: "21. Duplicate Addresses: If the subject address is the same as any comparable sale or rental comparable." },
  { id: 22, requirement: "Highest and Best Use 'NO'", ruleText: "22. Highest and Best Use 'NO': If 'Highest and best use' is marked 'NO'." },
  { id: 23, requirement: "Physical Deficiencies 'YES' but 'As-Is'", ruleText: "23. Physical Deficiencies 'YES' but 'As-Is': If 'Physical deficiencies' is marked 'YES' but the report is made 'as-is'." }
];

export const ESCALATION_CHECK_PROMPT = `
Analyze the appraisal report for the following 23 escalation rules.
You MUST process and include all 23 rules in the "details" array.
Your output must be a single, clean JSON object. Do not include any text outside of the JSON object.
The JSON object must have a "summary" (a one to two-line overview of findings) and a "details" array.
Each object in the "details" array represents a rule check and must have the following keys:
- "rule_number": An integer (1 to 23) corresponding to the rule number below.
- "requirement": A string matching the exact rule name (e.g., "Assignment Type Mismatch").
- "status": 'OK' if the rule is satisfied/passed, or 'Needs Escalation' if it fails/requires review.
- "value_or_comment": A string containing a brief comment explaining the finding (e.g., confirming consistency or describing any mismatch), along with the page number.

Escalation Rules:
1. Assignment Type Mismatch: If order form indicates ‘Purchase’ but report is marked ‘Refinance’, or vice-versa.
2. Appraisal Type Mismatch: If order form shows '1004+1007' but report is '1025'.
3. Appraiser Mismatch: If order form appraiser name differs from the completing appraiser in the report.
4. Repairs vs. As-Is: If photos or comments show multiple repairs but the report is made 'As-is'.
5. Supervisory Appraiser Signature: If the appraiser on the order form signs as the supervisory appraiser.
6. Missing Revisions: If latest revision requests are not reflected in the report.
7. Lender/Client Name Change: If the lender/client name is changed in the report (e.g., from “Easy Street Capital” to “National Loan Funder”).
8. Appraiser Fee Mismatch: If the appraiser’s fee in the report does not match the engagement letter.
9. Neighborhood Condition Comment: If the Neighborhood section comment contains potentially negative words like "*average* condition".
10. Value vs. Price: If the final value is 10% lower than list price, purchase price.
11. 1004D Mismatch: If order form shows ‘1004D Final Inspection/Appraisal Update’ but report is only one of them, or vice-versa.
12. Loan/Appraisal Type Conflict: If order form loan type (e.g., USDA) conflicts with appraisal type (e.g., 1004 FHA).
13. Illegal Use: If the property is marked as 'Illegal'.
14. Multiple Kitchens: If a 1004 report shows 3+ kitchens, check for comments on whether they are permitted.
15. Inspection/Effective Date Mismatch: If inspection date from records differs from the report's effective date.
16. Value vs. Unadjusted Sales Price: If final value is more than 10% higher than the unadjusted sales price.
17. Drastic Grid Adjustments: If sales grid adjustments are drastic.
18. Commercial Location in Sales Grid: If a comparable's location is marked "Commercial".
19. Value Higher than Purchase Price: If purchase price is 10% higher than the appraised value.
20. Value Increase Since Prior Sale: If there's an increase in value since the subject's prior sale.
21. Duplicate Addresses: If the subject address is the same as any comparable sale or rental comparable.
22. Highest and Best Use 'NO': If 'Highest and best use' is marked 'NO'.
23. Physical Deficiencies 'YES' but 'As-Is': If 'Physical deficiencies' is marked 'YES' but the report is made 'as-is'.
`;


const EscalationCheck = ({ onPromptSubmit, loading, response, error }) => {
  const [filterValue, setFilterValue] = useState('all');

  const handleCheck = () => {
    onPromptSubmit(ESCALATION_CHECK_PROMPT);
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
    const rawDetails = Array.isArray(data?.details) ? data.details : [];

    const details = ESCALATION_RULES.map(rule => {

      const match = rawDetails.find(d => {
        if (!d) return false;
        if (d.rule_number !== undefined && String(d.rule_number) === String(rule.id)) {
          return true;
        }
        const reqStr = String(d.requirement || '').toLowerCase();
        const ruleNameStr = rule.requirement.toLowerCase();
        return reqStr.includes(ruleNameStr) || ruleNameStr.includes(reqStr);
      });

      if (match) {
        return {
          requirement: rule.ruleText,
          status: match.status || 'OK',
          value_or_comment: match.value_or_comment || 'OK'
        };
      } else {
        return {
          requirement: rule.ruleText,
          status: 'OK',
          value_or_comment: 'OK'
        };
      }
    });


    const matchedBackendIndices = new Set();
    ESCALATION_RULES.forEach((rule) => {
      const matchIdx = rawDetails.findIndex(d => {
        if (!d) return false;
        if (d.rule_number !== undefined && String(d.rule_number) === String(rule.id)) {
          return true;
        }
        const reqStr = String(d.requirement || '').toLowerCase();
        const ruleNameStr = rule.requirement.toLowerCase();
        return reqStr.includes(ruleNameStr) || ruleNameStr.includes(reqStr);
      });
      if (matchIdx !== -1) {
        matchedBackendIndices.add(matchIdx);
      }
    });

    const extraDetails = rawDetails
      .filter((_, idx) => !matchedBackendIndices.has(idx))
      .map(d => ({
        requirement: d.requirement,
        status: d.status,
        value_or_comment: d.value_or_comment
      }));

    const mergedDetails = [...details, ...extraDetails];

    const greenStatuses = ['fulfilled', 'ok', 'pass', 'passed', 'yes'];
    const isGreen = (status) => {
      const normalized = String(status || '').trim().toLowerCase();
      return greenStatuses.includes(normalized);
    };

    const filteredDetails = mergedDetails.filter(item => {
      if (filterValue === 'passed') return isGreen(item.status);
      if (filterValue === 'failed') return !isGreen(item.status);
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
        <Paper elevation={1} sx={{ p: 2, bgcolor: 'background.default' }}>
          <Typography variant="h6" gutterBottom component="div" color="primary.main">Summary</Typography>
          <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{summary}</Typography>
        </Paper>
        <Paper elevation={1} sx={{ p: 2 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
            <Typography variant="h6" component="div" color="primary.main">Details</Typography>
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel id="escalation-status-filter-label">Filter Status</InputLabel>
              <Select
                labelId="escalation-status-filter-label"
                id="escalation-status-filter"
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
                {sortedDetails.length > 0 ? (sortedDetails.map((item, index) => {
                  const isInvalid = item.status === 'Needs Escalation';
                  const statusStyle = isInvalid
                    ? { backgroundColor: '#ff0000', color: '#ffffff', padding: '4px 8px', borderRadius: '4px', display: 'inline-block', cursor: 'pointer' }
                    : { backgroundColor: '#91ff00ff', color: '#000000', padding: '4px 8px', borderRadius: '4px', display: 'inline-block' };

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
                          String(item.value_or_comment)
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })) : (
                  <TableRow><TableCell colSpan={3} align="center">No matching items found.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      </Stack>
    );
  }, [response, filterValue]);

  return (
    <div id="escalation-check-section" className="card shadow mb-4">
      <div className="card-header CAR1 bg-danger text-white">
        <strong>Escalation Check</strong>
      </div>
      <div className="card-body">
        <Stack spacing={2}>
          <Button
            onClick={handleCheck}
            variant="contained"
            color="error"
            disabled={loading}
          >
            {loading ? <CircularProgress size={24} /> : 'Run Escalation Check'}
          </Button>
          {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
          {response && renderResponse()}
        </Stack>
      </div>
    </div>
  );
};

export default EscalationCheck;
