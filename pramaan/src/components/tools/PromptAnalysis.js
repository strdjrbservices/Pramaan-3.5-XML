import React, { useState } from 'react';
import {
    Button, Stack, Paper, Box, Typography, CircularProgress, Alert,
    TableContainer, Table, TableHead, TableRow, TableCell, TableBody, Tooltip, IconButton,
    FormControl, InputLabel, Select, MenuItem, Chip
} from '@mui/material';
import LibraryBooksIcon from '@mui/icons-material/LibraryBooks';

const formatText = (val) => {
    if (val === null || val === undefined) {
        return '';
    }
    if (typeof val === 'object') {
        if (Array.isArray(val)) {
            return val.map(item => formatText(item)).join(', ');
        }
        if ('value' in val) {
            return formatText(val.value);
        }
        return Object.entries(val)
            .map(([key, value]) => `${key}: ${typeof value === 'object' ? JSON.stringify(value) : value}`)
            .join('\n');
    }
    let textStr = String(val);
    textStr = textStr.replace(/URAR Page 1/gi, 'Subject')
        .replace(/URAR Page 2/gi, 'Sales Comparison Grid')
        .replace(/URAR Page 3/gi, 'Reconciliation & Certification')
        .replace(/URAR Page \d+/gi, 'Subject Report Section')
        .replace(/URAR Page/gi, 'Subject Report Section');
    return textStr;
};

const HighlightKeywords = ({ text, keywordGroups, comment }) => {
    const formattedText = formatText(text);
    if (!formattedText || !keywordGroups || keywordGroups.length === 0) {
        return <span style={{ whiteSpace: 'pre-wrap' }}>{formattedText}</span>;
    }

    const allKeywords = keywordGroups.flatMap(group => group.keywords);
    if (allKeywords.length === 0) {
        return <span style={{ whiteSpace: 'pre-wrap' }}>{formattedText}</span>;
    }

    const escapedKeywords = allKeywords.map(kw => kw.replace(/[-\\^$*+?.()|[\]{}]/g, '\\$&'));
    const regex = new RegExp(`(${escapedKeywords.join('|')})`, 'gi');
    const parts = String(formattedText).split(regex);

    return (
        <span style={{ whiteSpace: 'pre-wrap' }}>
            {parts.map((part, i) => {
                const matchedGroup = keywordGroups.find(group =>
                    group.keywords.some(keyword => part.toLowerCase() === keyword.toLowerCase())
                );
                if (matchedGroup) {
                    const styledPart = <span style={matchedGroup.style}>{part}</span>;

                    const isErrorGroup = matchedGroup.style.backgroundColor === '#ff0000';

                    let tooltipText = matchedGroup.Tooltip;
                    if (isErrorGroup && comment) {
                        tooltipText = comment;
                    }

                    if (tooltipText) {
                        return <Tooltip key={i} title={tooltipText}>{styledPart}</Tooltip>;
                    }
                    return <span key={i} style={matchedGroup.style}>{part}</span>;
                }
                return part;
            })}
        </span>
    );
};

const renderNestedObject = (obj) => {
    if (typeof obj !== 'object' || obj === null) return String(obj);

    return (
        <Stack spacing={2} sx={{ py: 1 }}>
            {Object.entries(obj).map(([subKey, subValue]) => {
                const label = subKey.replace(/^[a-z_]+/, '').replace(/_/g, ' ').trim() || subKey;

                if (subValue && typeof subValue === 'object') {
                    const { status, comment, values } = subValue;

                    const isPassed = status && ['consistent', 'present', 'yes', 'fulfilled', 'ok', 'pass'].some(s => status.toLowerCase().includes(s));

                    return (
                        <Box key={subKey} sx={{ pl: 1.5, borderLeft: '2px solid', borderColor: 'grey.300' }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5, flexWrap: 'wrap' }}>
                                <Typography variant="subtitle2" sx={{ fontWeight: 'bold', textTransform: 'capitalize' }}>
                                    {label}:
                                </Typography>
                                {status && (
                                    <Chip
                                        label={status}
                                        size="small"
                                        sx={{
                                            height: 20,
                                            fontSize: '0.75rem',
                                            bgcolor: isPassed ? 'success.light' : 'error.light',
                                            color: isPassed ? 'success.dark' : 'error.dark',
                                            fontWeight: 'bold',
                                            textTransform: 'capitalize'
                                        }}
                                    />
                                )}
                            </Box>
                            {comment && (
                                <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                                    {comment}
                                </Typography>
                            )}
                            {values && typeof values === 'object' && Object.keys(values).length > 0 && (
                                <Box sx={{ mt: 0.5, pl: 1, bgcolor: 'grey.100', p: 1, borderRadius: 1 }}>
                                    {Object.entries(values).map(([vKey, vVal]) => (
                                        <Typography key={vKey} variant="caption" display="block" color="text.secondary">
                                            <strong>{vKey.replace(/_/g, ' ')}</strong>: {String(vVal)}
                                        </Typography>
                                    ))}
                                </Box>
                            )}
                        </Box>
                    );
                }
                return (
                    <Typography key={subKey} variant="body2">
                        <strong>{subKey}</strong>: {String(subValue)}
                    </Typography>
                );
            })}
        </Stack>
    );
};

const PromptAnalysis = ({ onPromptSubmit, loading, response, error, submittedPrompt, onAddendumRevisionButtonClick }) => {
    const [filterValue, setFilterValue] = useState('all');

    const keywordGroups = [
        {
            keywords: ["consistently", "Fulfilled", "PRESENT", "CONSISTENT"],
            style: { backgroundColor: '#91ff00ff', color: '#000000', padding: '1px 3px', borderRadius: '3px' },
            Tooltip: `Field is valid.`
        },
        {
            keywords: [
                "Not CONSISTENT", "ilconsistently", "absent", "ilCONSISTENT", "Specifically", "mismatch", "mismatched", "missing", "inconsistent",
            ],
            style: { backgroundColor: '#ff0000', color: '#ffffff', padding: '1px 3px', borderRadius: '3px' },
            Tooltip: `Value must be Fulfilled or PRESENT.`
        }
    ];

    const ALL_IN_ONE_PROMPT = `Please perform a comprehensive accuracy and consistency check on the entire appraisal report. 

Your entire response MUST be a single JSON object. Do not include any explanations or markdown formatting like \`\`\`json.
The JSON object must have exactly two keys: "summary" and "comparison_summary".
- "summary" is a string representing a brief overall summary of the consistency and findings.
- "comparison_summary" is a list of objects. Each object represents one checkpoint and must have exactly these four keys:
  1. "status": "Fulfilled" or "Not Fulfilled" or "Present" or "Not Present" (use "Present" or "Not Present" only for page presence checks).
  2. "section": The section and check identifier name, exactly as listed in the checkpoints (e.g. "1. Subject Data Consistency: a. Address").
  3. "values": A string representing the key extracted values to compare. For section names in values, STRICTLY use standard appraisal section names (e.g. "Subject Section", "Sales Comparison Grid", "Location Map", "Aerial Map", "Improvements Section", "Neighborhood Section", "Reconciliation Section"). DO NOT use "URAR Page 1", "URAR Page 2", or "URAR Page" as section names.
  4. "comment": The explanatory comment or verification finding.

List of Checkpoints to process and include in the comparison_summary:

1. Subject Data Consistency: a. Address
Verify that the Subject Property Address is identical across all locations: Subject Section, Sales Comparison Grid, Location Map, Aerial Map, Header/Footer, and any Addenda.

2. Subject Data Consistency: b. Photos
Confirm the presence of the Subject Street View, Front View, and Rear View photos. Ensure there are no duplicate or mislabeled subject photos.

3. Subject Data Consistency: c. Room Counts
Compare bedroom and bathroom counts across the Improvements section, Sales Comparison Grid, Sketch/Floor Plan, and all interior photos.

4. Subject Data Consistency: d. GLA
Verify that Gross Living Area (GLA) is consistent between the Sketch, Improvements section, Sales Grid, and Cost Approach (if present).

5. Comparable Sales Data Consistency: a. Addresses
Match all Comparable Sale addresses across the Sales Grid, Comparable Photo Pages, MLS/Map Exhibits, Location Map, and Aerial Map.

6. Comparable Sales Data Consistency: b. Photos
Confirm that no comparable photos are duplicated, mislabeled, or incorrectly associated with the wrong comparable.

7. Sales Grid & Value Analysis: a. Value Bracketing
Verify that the final 'opinion of market value' in the Reconciliation section is bracketed by the 'Adjusted Sale Price of Comparable' values in the Sales Comparison Grid.

8. Sales Grid & Value Analysis: b. Adjustment Logic
For each comparable, review the 'Condition' adjustment. If the comp's condition rating (e.g., C3) is superior to the subject's (e.g., C4), the adjustment should be negative. If inferior, it should be positive. Flag any illogical adjustments.

9. Sales Grid & Value Analysis: c. PUD/HOA Fees
If the property is identified as part of a PUD, confirm that HOA fees are greater than $0. If PUD is 'No', confirm HOA fees are $0 or N/A.

10. Certification & Dates: a. Signatures
Verify the presence of the appraiser's signature and license number in the Certification section.

11. Certification & Dates: b. Dates
Confirm the 'Date of Signature and Report' is on or after the 'Effective Date of Appraisal'.

12. Photo & Page Integrity: a. Photo Labeling
Verify that every photo is properly labeled (Subject, Comp 1, Comp 2, etc.) and that there are no reused photos or mislabeled views across the entire photo section.

13. Photo & Page Integrity: b. Page Presence
Verify the presence of the SUPPLEMENTAL ADDENDUM. Output a separate row in the comparison_summary for this.

14. Photo & Page Integrity: b. Page Presence
Verify the presence of the APPRAISER'S CERTIFICATION. Output a separate row in the comparison_summary for this.

15. Photo & Page Integrity: b. Page Presence
Verify the presence of the SCOPE OF WORK. Output a separate row in the comparison_summary for this.

16. Photo & Page Integrity: b. Page Presence
Verify the presence of the INTENDED USE. Output a separate row in the comparison_summary for this.

17. Photo & Page Integrity: b. Page Presence
Verify the presence of the DEFINITION OF MARKET VALUE. Output a separate row in the comparison_summary for this.
`;


    const cleanSectionName = (name) => {
        if (!name) return '';
        let str = String(name).trim();
        str = str.replace(/^(?:\d+|[a-zA-Z])[-.)]\s*/, '').trim();
        if (!str.includes(' ') && (str.includes('_') || str.includes('-'))) {
            str = str.replace(/[-_]+/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
        }
        return str;
    };

    const renderResponse = (response) => {
        let data = response;
        if (typeof response === 'string') {
            try {
                const parsed = JSON.parse(response);
                if (typeof parsed === 'object' && parsed !== null) {
                    data = parsed;
                }
            } catch (e) {
            }
        }

        if (typeof data === 'object' && data !== null) {
            const { summary, comparison_summary, ...otherData } = data.fields || data;
            const hasComparisonSummary = Array.isArray(comparison_summary) && comparison_summary.length > 0;
            const hasOtherData = !hasComparisonSummary && Object.keys(otherData).length > 0 && !(Object.keys(otherData).length === 1 && otherData.raw);

            const greenStatuses = ['fulfilled', 'ok', 'pass', 'passed', 'consistent', 'present', 'consistently', 'yes'];
            const isGreen = (status) => {
                const normalized = String(status || '').trim().toLowerCase();
                return greenStatuses.includes(normalized) || greenStatuses.some(gs => normalized.includes(gs));
            };

            const filteredComparison = hasComparisonSummary
                ? comparison_summary.filter(item => {
                    if (filterValue === 'passed') return isGreen(item.status);
                    if (filterValue === 'failed') return !isGreen(item.status);
                    return true;
                })
                : [];

            const sortedComparison = [...filteredComparison].sort((a, b) => {
                const isGreenA = isGreen(a.status);
                const isGreenB = isGreen(b.status);
                if (isGreenA && !isGreenB) return -1;
                if (!isGreenA && isGreenB) return 1;
                return 0;
            });

            const getOtherDataValue = (val) => {
                if (val && typeof val === 'object') {
                    return String(val.value || val.status || '').trim().toLowerCase();
                }
                return String(val || '').trim().toLowerCase();
            };

            const otherDataEntries = hasOtherData ? Object.entries(otherData) : [];

            const filteredOtherData = otherDataEntries.filter(([key, val]) => {
                const statusStr = getOtherDataValue(val);
                if (filterValue === 'passed') return isGreen(statusStr);
                if (filterValue === 'failed') return !isGreen(statusStr);
                return true;
            });

            const sortedOtherData = [...filteredOtherData].sort((a, b) => {
                const statusA = getOtherDataValue(a[1]);
                const statusB = getOtherDataValue(b[1]);
                const isGreenA = isGreen(statusA);
                const isGreenB = isGreen(statusB);
                if (isGreenA && !isGreenB) return -1;
                if (!isGreenA && isGreenB) return 1;
                return 0;
            });

            return (
                <>
                    <Stack spacing={3} sx={{ mt: 3 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                            <FormControl size="small" sx={{ minWidth: 150 }}>
                                <InputLabel id="prompt-status-filter-label">Filter Status</InputLabel>
                                <Select
                                    labelId="prompt-status-filter-label"
                                    id="prompt-status-filter"
                                    value={filterValue}
                                    label="Filter Status"
                                    onChange={(e) => setFilterValue(e.target.value)}
                                >
                                    <MenuItem value="all">All</MenuItem>
                                    <MenuItem value="passed">Passed / OK</MenuItem>
                                    <MenuItem value="failed">Failed / Review</MenuItem>
                                </Select>
                            </FormControl>
                        </Box>
                        {summary && (
                            <Paper elevation={1} sx={{ p: 2, bgcolor: 'background.default' }}>
                                <Typography variant="h6" gutterBottom component="div" color="primary.main">
                                    Summary
                                </Typography>
                                <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
                                    <HighlightKeywords text={summary} keywordGroups={keywordGroups} />
                                </Typography>
                            </Paper>
                        )}
                        {hasComparisonSummary && (
                            <Paper elevation={1} sx={{ p: 2, borderRadius: 2 }}>
                                <Typography variant="h6" gutterBottom component="div" color="primary.main" fontWeight="bold">
                                    Comparison Summary
                                </Typography>
                                <TableContainer sx={{ borderRadius: 1, border: '1px solid', borderColor: 'grey.300' }}>
                                    <Table size="small" aria-label="comparison summary table">
                                        <TableHead>
                                            <TableRow sx={{ bgcolor: 'grey.100' }}>
                                                <TableCell sx={{ fontWeight: 'bold', width: '20%', borderBottom: 2, borderColor: 'primary.main' }}>Section</TableCell>
                                                <TableCell sx={{ fontWeight: 'bold', width: '15%', borderBottom: 2, borderColor: 'primary.main' }}>sub Section</TableCell>
                                                <TableCell sx={{ fontWeight: 'bold', width: '30%', borderBottom: 2, borderColor: 'primary.main' }}>Values</TableCell>
                                                <TableCell sx={{ fontWeight: 'bold', width: '25%', borderBottom: 2, borderColor: 'primary.main' }}>Comment</TableCell>
                                                <TableCell sx={{ fontWeight: 'bold', width: '10%', borderBottom: 2, borderColor: 'primary.main' }}>Status</TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {sortedComparison.length > 0 ? (
                                                sortedComparison.map((item, index) => {
                                                    let mainSection = String(item.section || '').trim();
                                                    let subSection = String(item.sub_section || item.subSection || '').trim();
                                                    if (!subSection && mainSection.includes(':')) {
                                                        const colonIdx = mainSection.indexOf(':');
                                                        subSection = mainSection.substring(colonIdx + 1).trim();
                                                        mainSection = mainSection.substring(0, colonIdx).trim();
                                                    }
                                                    mainSection = cleanSectionName(mainSection);
                                                    subSection = cleanSectionName(subSection);

                                                    const statusLower = String(item.status || '').toLowerCase();
                                                    const isGreenStatus = ['fulfilled', 'present', 'consistent', 'yes', 'pass', 'ok'].some(s => statusLower.includes(s)) && !['not', 'unfulfilled', 'absent', 'inconsistent', 'no', 'fail'].some(s => statusLower.includes(s));

                                                    const formattedValues = formatText(item.values);
                                                    const valueList = formattedValues ? formattedValues.split(/;\s*|\n+/).filter(Boolean) : [];

                                                    return (
                                                        <TableRow key={index} hover sx={{ '&:nth-of-type(even)': { bgcolor: 'action.hover' } }}>
                                                            <TableCell sx={{ verticalAlign: 'top', fontWeight: 'bold', pt: 1.5 }}>
                                                                <HighlightKeywords text={mainSection} keywordGroups={keywordGroups} />
                                                            </TableCell>
                                                            <TableCell sx={{ verticalAlign: 'top', fontWeight: 'medium', pt: 1.5 }}>
                                                                <HighlightKeywords text={subSection} keywordGroups={keywordGroups} />
                                                            </TableCell>
                                                            <TableCell sx={{ verticalAlign: 'top', pt: 1.5 }}>
                                                                {valueList.length > 1 ? (
                                                                    <Stack spacing={0.5}>
                                                                        {valueList.map((v, vIdx) => (
                                                                            <Typography key={vIdx} variant="caption" sx={{ display: 'block', bgcolor: 'grey.100', p: 0.5, px: 1, borderRadius: 1, fontFamily: 'monospace', fontSize: '0.75rem', border: '1px solid #e0e0e0', whiteSpace: 'pre-wrap' }}>
                                                                                {v}
                                                                            </Typography>
                                                                        ))}
                                                                    </Stack>
                                                                ) : (
                                                                    <HighlightKeywords text={item.values} keywordGroups={keywordGroups} />
                                                                )}
                                                            </TableCell>
                                                            <TableCell sx={{ verticalAlign: 'top', pt: 1.5 }}>
                                                                <HighlightKeywords text={item.comment} keywordGroups={keywordGroups} />
                                                            </TableCell>
                                                            <TableCell sx={{ verticalAlign: 'top', pt: 1.5 }}>
                                                                <Chip
                                                                    label={item.status || 'Unknown'}
                                                                    size="small"
                                                                    sx={{
                                                                        fontWeight: 'bold',
                                                                        fontSize: '0.75rem',
                                                                        bgcolor: isGreenStatus ? '#e8f5e9' : '#ffebee',
                                                                        color: isGreenStatus ? '#2e7d32' : '#c62828',
                                                                        border: '1px solid',
                                                                        borderColor: isGreenStatus ? '#a5d6a7' : '#ef9a9a'
                                                                    }}
                                                                />
                                                            </TableCell>
                                                        </TableRow>
                                                    );
                                                })
                                            ) : (
                                                <TableRow>
                                                    <TableCell colSpan={5} align="center">
                                                        No matching items found.
                                                    </TableCell>
                                                </TableRow>
                                            )}
                                        </TableBody>
                                    </Table>
                                </TableContainer>
                            </Paper>
                        )}
                        {hasOtherData && (
                            <Paper elevation={1} sx={{ p: 2 }}>
                                <Typography variant="h6" gutterBottom component="div" color="primary.main">
                                    Analysis Details
                                </Typography>
                                <TableContainer>
                                    <Table size="small" aria-label="prompt analysis table">
                                        <TableHead>
                                            <TableRow>
                                                <TableCell sx={{ fontWeight: 'bold', borderBottom: 2, borderColor: 'primary.light' }}>Field</TableCell>
                                                <TableCell sx={{ fontWeight: 'bold', borderBottom: 2, borderColor: 'primary.light' }}>Value</TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {sortedOtherData.length > 0 ? (
                                                sortedOtherData.map(([key, value]) => (
                                                    <TableRow key={key} sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                                                        <TableCell component="th" scope="row" sx={{ fontWeight: 'medium' }}>
                                                            {cleanSectionName(key)}
                                                        </TableCell>
                                                        <TableCell>
                                                            {typeof value === 'object' && value !== null && !('value' in value) ? (
                                                                renderNestedObject(value)
                                                            ) : (
                                                                <HighlightKeywords
                                                                    text={(typeof value === 'object' && value !== null && 'value' in value)
                                                                        ? String(value.value)
                                                                        : String(value)}
                                                                    comment={(typeof value === 'object' && value !== null) ? (value.comment || value.tooltip) : null}
                                                                    keywordGroups={keywordGroups}
                                                                />
                                                            )}
                                                        </TableCell>
                                                    </TableRow>
                                                ))
                                            ) : (
                                                <TableRow>
                                                    <TableCell colSpan={2} align="center">
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
                </>
            );
        }


        return (
            <Paper elevation={1} sx={{ p: 2, mt: 3, bgcolor: 'background.default' }}>
                <Typography variant="h6" gutterBottom component="div" color="primary.main">
                    Analysis Result
                </Typography>
                <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', color: 'inherit', fontFamily: 'monospace' }}>
                    <HighlightKeywords text={String(data)} keywordGroups={keywordGroups} />
                </pre>
            </Paper>
        );
    };


    return (
        <div id="prompt-analysis-section" className="card shadow mb-4">
            <div className="card-header CAR1 bg-info text-white" style={{ position: 'sticky', top: 0, zIndex: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <strong style={{ fontSize: '1.1rem' }}>Prompt Analysis</strong>
                {onAddendumRevisionButtonClick && (
                    <Tooltip title="General/Addendum Revisions">
                        <IconButton onClick={onAddendumRevisionButtonClick} size="small" sx={{ color: 'white', float: 'right', ml: 'auto' }}><LibraryBooksIcon /></IconButton>
                    </Tooltip>
                )}
            </div>
            <div className="card-body">
                <Stack spacing={2}>
                    <Button variant="contained" onClick={() => onPromptSubmit(ALL_IN_ONE_PROMPT)} disabled={loading}>
                        Run Full Analysis
                    </Button>
                    {loading && <CircularProgress size={24} />}
                </Stack>

                {error && <Alert severity="error" sx={{ mt: 3 }}>{error}</Alert>}

                {response && (
                    <Box sx={{ mt: 3 }}>
                        {submittedPrompt && <Paper elevation={1} sx={{ p: 2, mb: 3, borderLeft: 4, borderColor: 'secondary.main', bgcolor: 'background.default' }}>
                            <Typography variant="h6" gutterBottom component="div" color="text.primary">
                                Given Prompt
                            </Typography>
                            <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', fontStyle: 'italic', color: 'text.secondary' }}>
                                {submittedPrompt}
                            </Typography>
                        </Paper>}
                        {renderResponse(response)}
                    </Box>
                )}
            </div>
        </div>
    );
};

export default PromptAnalysis;
