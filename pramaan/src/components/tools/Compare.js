import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Button,
  TextField,
  Typography,
  Paper,
  Alert,
  Stack,
  Grid,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  ToggleButton,
  ToggleButtonGroup,
  Container,
  Tooltip,
} from '@mui/material';
import { LoadingButton } from '@mui/lab';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import CancelIcon from '@mui/icons-material/Cancel';
import uploadSoundFile from '../../Assets/upload.mp3';
import successSoundFile from '../../Assets/success.mp3';
import errorSoundFile from '../../Assets/error.mp3';
import PremiumLogo from '../auth/logo';
import { API_BASE_URL } from '../Subject/utils/utils.js';

const playSound = (soundType) => {
  let soundFile;
  if (soundType === 'success') {
    soundFile = successSoundFile;
  } else if (soundType === 'error') {
    soundFile = errorSoundFile;
  } else if (soundType === 'upload') {
    soundFile = uploadSoundFile;
  } else {
    return;
  }

  try {
    const audio = new Audio(soundFile);
    audio.play().catch(e => console.error("Error playing sound:", e));
  } catch (e) {
    console.error("Error playing sound:", e);
  }
};

const HighlightKeywords = ({ text, keywordGroups, comment }) => {
  if (!text || !keywordGroups || keywordGroups.length === 0) {
    return text;
  }

  const allKeywords = keywordGroups.flatMap(group => group.keywords);
  if (allKeywords.length === 0) {
    return text;
  }

  const escapedKeywords = allKeywords.map(kw => kw.replace(/[-\\^$*+?.()|[\]{}]/g, '\\$&'));
  const regex = new RegExp(`(${escapedKeywords.join('|')})`, 'gi');
  const parts = String(text).split(regex);

  return (
    <span>
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

const SimpleEditableField = ({ fieldPath, value, onDataChange, editingField, setEditingField, isEditable }) => {
  const isEditing = isEditable && editingField && JSON.stringify(editingField) === JSON.stringify(fieldPath);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === 'Escape') {
      setEditingField(null);
    }
  };

  if (isEditing) {
    return (
      <TextField
        value={value || ''}
        onChange={(e) => onDataChange(fieldPath, e.target.value)}
        onBlur={() => setEditingField(null)}
        onKeyDown={handleKeyDown}
        autoFocus
        spellCheck="true"
        fullWidth
        size="small"
        variant="standard"
      />
    );
  }

  return (
    <Box onClick={() => isEditable && setEditingField(fieldPath)} sx={{ minHeight: '24px', cursor: isEditable ? 'pointer' : 'default' }}>
      {value}
    </Box>
  );
};

const normalizeCurrencyValue = (value) => {
  if (typeof value !== 'string' || value === 'Not Found') {
    return NaN;
  }
  const cleanedValue = value.replace(/[^0-9.-]/g, '');
  return parseFloat(cleanedValue);
};

const renderFinalOutput = (output) => {
  if (!output) {
    return 'N/A';
  }
  const outputLower = String(output).toLowerCase().trim();
  const style = {};

  const positiveWords = ['yes', 'present', 'corrected', 'match', 'fulfilled', 'consistent', 'ok', 'pass', 'correct'];
  const negativeWords = ['no', 'not corrected', 'mismatch', 'not fulfilled', 'inconsistent', 'absent', 'missing', 'fail', 'incorrect', 'no match'];

  if (positiveWords.includes(outputLower)) {
    style.backgroundColor = '#91ff00ff';
    style.color = '#000000';
  } else if (negativeWords.includes(outputLower)) {
    style.backgroundColor = '#ff0000';
    style.color = '#ffffff';
  }

  if (Object.keys(style).length > 0) {
    return (
      <span style={{ ...style, padding: '4px 8px', borderRadius: '4px', display: 'inline-block' }}>
        {output}
      </span>
    );
  }

  return output;
};

const CHECKLIST_PROMPT = `Appraisal Report Confirmation Checklist

Please confirm the appraised value has been changed.

Please confirm if the unadjusted value is bracketed with the appraised value.

Please confirm if the adjusted value is bracketed with the appraised value.

Please confirm the Aerial Map, Location Map, UAD Dataset Pages, and 1004MC are present.

Please confirm the GLA, total room count, bath count, and bed count from the Improvements section match the Sales Grid, Photos, and Sketch.

Please confirm if the 1007 form is present in the new report.

Please confirm if the 216,str,rental,operating income form is present in the new report.

Please confirm the total pages count in the reports.

For each item in the checklist, provide a 'yes' or 'no' answer in the 'final_output' field. The response should be a JSON object with a 'details' array. Each object in the array should have 'sr_no', 'description', 'old_pdf', 'new_pdf', and 'final_output' keys.

`;


const Compare = () => {
  const [htmlFile, setHtmlFile] = useState(null);
  const [response, setResponse] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [comparisonMode, setComparisonMode] = useState('revision');
  const [oldPdfFile, setOldPdfFile] = useState(null);
  const [newPdfFile, setNewPdfFile] = useState(null);
  const [revisionText, setRevisionText] = useState('');
  const [editingField, setEditingField] = useState(null);
  const [comparisonData, setComparisonData] = useState([]);
  const [oldPdfPageCount, setOldPdfPageCount] = useState(null);
  const [newPdfPageCount, setNewPdfPageCount] = useState(null);
  const [timer, setTimer] = useState(0);
  const timerRef = useRef(null);

  const keywordGroups = [
    {
      keywords: ["Corrected", "Fulfilled", "pass", "correct", "match", "matched"],
      style: { backgroundColor: '#91ff00ff', color: '#000000', padding: '1px 3px', borderRadius: '3px' },
      Tooltip: 'This item has been successfully validated.'
    },
    {
      keywords: ["not Corrected", "not Fulfilled", "Fail", "incorrect", "mismatch", "mismatched", "no match"],
      style: { backgroundColor: '#ff0000', color: '#ffffff', padding: '1px 3px', borderRadius: '3px' },
      Tooltip: 'This item has an issue or could not be validated.'
    }
  ];


  useEffect(() => {
    if (comparisonMode === 'pdf-html' && response && response.comparison_results) {
      setComparisonData(response.comparison_results);
    } else {
      setComparisonData([]);
    }
  }, [response, comparisonMode]);
  useEffect(() => {
    if (comparisonMode !== 'revision' || !htmlFile) {
      setRevisionText('');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target.result;
      const parser = new DOMParser();
      const doc = parser.parseFromString(content, 'text/html');

      let extractedText = '';
      const fieldNameToFind = 'report rejection reason';
      const allElements = doc.body.querySelectorAll('*');

      for (let i = 0; i < allElements.length; i++) {
        const element = allElements[i];
        if (element.textContent.trim().toLowerCase().replace(/:$/, '') === fieldNameToFind) {
          let nextElement = element.nextElementSibling;
          if (nextElement) {
            extractedText = nextElement.innerText.trim();
            break;
          }
        }
      }

      setRevisionText(extractedText);
    };
    reader.readAsText(htmlFile);
  }, [htmlFile, comparisonMode]);

  useEffect(() => {
    if (error) {
      playSound('error');
    }
  }, [error]);

  useEffect(() => {
    if (response) {
      playSound('success');
    }
  }, [response]);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  const handleOldPdfFileChange = (event) => {
    setOldPdfFile(event.target.files[0]);
    setError('');
    setResponse(null);
    setOldPdfPageCount(null);
    setNewPdfPageCount(null);
  };

  const handleNewPdfFileChange = (event) => {
    setNewPdfFile(event.target.files[0]);
    setError('');
    setResponse(null);
    setOldPdfPageCount(null);
    setNewPdfPageCount(null);
  };

  const handleHtmlFileChange = (event) => {
    setHtmlFile(event.target.files[0]);
    setError('');
    setResponse(null);
    setOldPdfPageCount(null);
    setNewPdfPageCount(null);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    await startComparison(comparisonMode);
  };

  const startComparison = async (mode) => {
    setLoading(true);
    setError('');
    setResponse(null);
    setTimer(0);
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    timerRef.current = setInterval(() => {
      setTimer(prev => prev + 1);
    }, 1000);

    const formData = new FormData();
    let endpoint = '';

    if (mode === 'revision') {
      if (!newPdfFile || !revisionText) {
        setError('Please provide a PDF file and ensure revision text is extracted.');
        setLoading(false);
        return;
      }
      formData.append('file', newPdfFile);
      formData.append('form_type', '1004');
      formData.append('revision_request', revisionText);
      endpoint = `${API_BASE_URL}/api/extract/`;
    } else if (mode === 'checklist') {
      if (!oldPdfFile || !newPdfFile) {
        setError('Both Old and New PDF files must be provided for this check.');
        setLoading(false);
        return;
      }
      formData.append('old_pdf_file', oldPdfFile);
      formData.append('new_pdf_file', newPdfFile);
      formData.append('revision_request', CHECKLIST_PROMPT);
      endpoint = `${API_BASE_URL}/api/compare-pdfs/`;
    } else if (mode === 'pdf-html') {
      if (!newPdfFile || !htmlFile) {
        setError('Both PDF and HTML files must be provided for this comparison.');
        setLoading(false);
        return;
      }
      formData.append('pdf_file', newPdfFile);
      formData.append('html_file', htmlFile);
      endpoint = `${API_BASE_URL}/api/compare/`;
    } else { // 'pdf-pdf'
      if (!oldPdfFile || !newPdfFile) {
        setError('Both Old and New PDF files must be provided for this comparison.');
        setLoading(false);
        return;
      }
      formData.append('old_pdf_file', oldPdfFile);
      formData.append('new_pdf_file', newPdfFile);
      endpoint = `${API_BASE_URL}/api/compare-pdfs/`;
    }

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        body: formData,
      });

      const rawText = await res.text();

      if (!res.ok) {
        let errorDetail = `HTTP error! status: ${res.status}`;
        try {
          const errorJson = JSON.parse(rawText);
          errorDetail = errorJson.detail || errorDetail;
        } catch (parseError) {
          errorDetail = rawText || errorDetail;
        }
        throw new Error(errorDetail);
      }

      const result = JSON.parse(rawText);
      if (mode === 'revision') {
        setResponse(result.fields);
      } else if (mode === 'checklist') {
        setResponse(result);
      } else {
        setResponse(result);
      }
      if (comparisonMode === 'pdf-pdf' && result) {
        setOldPdfPageCount(result.old_pdf_page_count);
        setNewPdfPageCount(result.new_pdf_page_count);
      }

    } catch (e) {
      const errorMessage = e.message.includes('Failed to fetch') ? 'Could not connect to the server. Please ensure it is running.' : e.message;
      setError(errorMessage);
      console.error('Comparison failed:', e);
    } finally {
      setLoading(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }
  };

  const handleModeChange = (event, newMode) => {
    if (newMode !== null) {
      setComparisonMode(newMode);
      setResponse(null);
      setOldPdfPageCount(null);
      setNewPdfPageCount(null);
      setRevisionText('');
      startComparison(newMode);
    }
  };

  const renderPdfToPdfResponse = (data) => {
    if (!data) return null;

    const comparisonSummary = data?.comparison_summary || [];
    const summaryText = data?.summary || '';

    const oldMarketValueRaw = data.old_market_value || 'Not Found';
    const newMarketValueRaw = data.new_market_value || 'Not Found';

    const normalizedOldMarketValue = normalizeCurrencyValue(oldMarketValueRaw);
    const normalizedNewMarketValue = normalizeCurrencyValue(newMarketValueRaw);

    const areMarketValuesMatching = (oldMarketValueRaw === 'Not Found' && newMarketValueRaw === 'Not Found') ||
      (!isNaN(normalizedOldMarketValue) && !isNaN(normalizedNewMarketValue) &&
        normalizedOldMarketValue === normalizedNewMarketValue);

    if (comparisonSummary.length === 0) {
      return (
        <Alert severity="success" sx={{ mt: 3 }}>
          No differences were found between the two PDF documents.
        </Alert>
      );
    }

    return (
      <Paper elevation={1} sx={{ p: 2, mt: 3 }}>
        <Typography variant="h6" gutterBottom>Verification Results</Typography>
        {summaryText && (
          <Paper elevation={2} sx={{ p: 3, mb: 3, borderLeft: 5, borderColor: 'primary.main', bgcolor: 'action.hover' }}>
            <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.7 }}>
              <HighlightKeywords text={summaryText} keywordGroups={keywordGroups} />
            </Typography>
          </Paper>
        )}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={6}>
            <Paper variant="outlined" sx={{ p: 2, textAlign: 'center' }}>
              <Typography variant="caption" color="text.secondary">Old PDF Page Count</Typography>
              <Typography variant="h6">{oldPdfPageCount || 'N/A'}</Typography>
            </Paper>
          </Grid>
          <Grid item xs={6}>
            <Paper variant="outlined" sx={{ p: 2, textAlign: 'center' }}>
              <Typography variant="caption" color="text.secondary">New PDF Page Count</Typography>
              <Typography variant="h6">{newPdfPageCount || 'N/A'}</Typography>
            </Paper>
          </Grid>
        </Grid>
        <Paper variant="outlined" sx={{ p: 2, mb: 3, bgcolor: areMarketValuesMatching ? 'success.light' : 'error.light' }}>
          <Typography variant="h6" gutterBottom>Opinion of Market Value Comparison</Typography>
          <Stack direction="row" spacing={2} alignItems="center">
            <Typography>Old Value: <strong>{oldMarketValueRaw}</strong></Typography>
            <Divider orientation="vertical" flexItem />
            <Typography>New Value: <strong>{newMarketValueRaw}</strong></Typography>
            {areMarketValuesMatching ? <CheckCircleIcon color="success" /> : <CancelIcon color="error" />}
          </Stack>
        </Paper>

        <TableContainer>
          <Table sx={{ minWidth: 650 }} aria-label="comparison table">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 'bold' }}>Field Changed</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Original Value</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Revised Value</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Comment</TableCell>
                <TableCell align="right" sx={{ fontWeight: 'bold' }}>Page</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {comparisonSummary.map((change, index) => (
                <TableRow key={index} sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                  <TableCell component="th" scope="row">
                    <HighlightKeywords text={change.field} keywordGroups={keywordGroups} />
                  </TableCell>
                  <TableCell>
                    <HighlightKeywords text={change.original_value} keywordGroups={keywordGroups} />
                  </TableCell>
                  <TableCell>
                    <HighlightKeywords text={change.revised_value} keywordGroups={keywordGroups} />
                  </TableCell>
                  <TableCell>
                    <HighlightKeywords text={change.comment} keywordGroups={keywordGroups} />
                  </TableCell>
                  <TableCell align="right">{change.page_no}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    );
  };

  const renderRevisionResponse = (data) => {
    if (!data) return null;

    const comparisonSummary = data?.comparison_summary || [];
    const summaryText = data?.summary || '';

    if (comparisonSummary.length === 0) {
      return (
        <Alert severity="success" sx={{ mt: 3 }}>
          No differences were found.
        </Alert>
      );
    }

    return (
      <Paper elevation={1} sx={{ p: 2, mt: 3 }}>
        <Typography variant="h6" gutterBottom>Verification Results</Typography>
        {summaryText && (
          <Paper elevation={2} sx={{ p: 3, mb: 3, borderLeft: 5, borderColor: 'primary.main', bgcolor: 'action.hover' }}>
            <Typography variant="h6" gutterBottom component="div" color="text.primary">
              Summary
            </Typography>
            <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.7 }}>
              <HighlightKeywords text={summaryText} keywordGroups={keywordGroups} />
            </Typography>
          </Paper>
        )}
        <TableContainer>
          <Table sx={{ minWidth: 650 }} aria-label="comparison table">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 'bold' }}>Corrected/Not Corrected</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Section</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Comment</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {comparisonSummary.map((change, index) => (
                <TableRow key={index} sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                  <TableCell component="th" scope="row">{renderFinalOutput(change.status)}</TableCell>
                  <TableCell>
                    <HighlightKeywords text={change.section} keywordGroups={keywordGroups} />
                  </TableCell>
                  <TableCell>
                    <HighlightKeywords text={change.comment} keywordGroups={keywordGroups} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    );
  };

  const renderChecklistResponse = (data) => {
    if (!data || !data.details || data.details.length === 0) return null;

    return (
      <Paper elevation={1} sx={{ p: 2, mt: 3 }}>
        <Typography variant="h6" gutterBottom>Confirmation Checklist Results</Typography>
        <TableContainer>
          <Table sx={{ minWidth: 650 }} aria-label="confirmation table">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 'bold' }}>Sr No</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Description</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Old PDF</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>New PDF</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Final Output</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {data.details.map((item, index) => (
                <TableRow key={index} sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                  <TableCell>{item.sr_no}</TableCell>
                  <TableCell>{item.description}</TableCell>
                  <TableCell>{item.old_pdf}</TableCell>
                  <TableCell>{item.new_pdf}</TableCell>
                  <TableCell>{renderFinalOutput(item.final_output)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    );
  };

  const showOldPdf = comparisonMode === 'checklist' || comparisonMode === 'pdf-pdf';
  const showNewPdf = true;
  const showHtml = comparisonMode === 'revision' || comparisonMode === 'pdf-html';

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 2,
          mb: 5,
        }}
      >
        <PremiumLogo size={70} fullScreen={false} />
        <Typography variant="h4" component="h1" sx={{ fontWeight: 800, letterSpacing: '-0.5px', background: 'linear-gradient(45deg, #1976d2, #9c27b0)', backgroundClip: 'text', textFillColor: 'transparent', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          REVISED FILE REVIEW
        </Typography>
      </Box>

      <Paper elevation={0} sx={{ p: 3, mb: 4, borderRadius: 4, border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}>
        <Stack spacing={3} alignItems="center">
          <ToggleButtonGroup
            color="primary"
            value={comparisonMode}
            exclusive
            onChange={handleModeChange}
            aria-label="Comparison Mode"
            size="medium"
            sx={{
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'center',
              gap: 1,
              '& .MuiToggleButton-root': {
                px: { xs: 1.5, sm: 3 },
                py: 1,
                borderRadius: '8px !important',
                mx: 0.5,
                my: 0.5,
                border: '1px solid rgba(0, 0, 0, 0.12) !important',
                '&.Mui-selected': {
                  bgcolor: 'primary.main',
                  color: 'white',
                  '&:hover': {
                    bgcolor: 'primary.dark',
                  }
                }
              }
            }}
          >
            <ToggleButton value="revision">Revision Verification</ToggleButton>
            <ToggleButton value="checklist">Confirmation Checklist</ToggleButton>
            <ToggleButton value="pdf-html">PDF/HTML</ToggleButton>
            <ToggleButton value="pdf-pdf">PDF/PDF</ToggleButton>
          </ToggleButtonGroup>

          <Divider flexItem sx={{ width: '100%', maxWidth: 800, mx: 'auto !important' }} />

          <Grid container spacing={3} justifyContent="center" sx={{ maxWidth: 1000 }}>
            {showOldPdf && (
              <Grid item xs={12} sm={6} md={4}>
                <Paper variant="outlined" sx={{ p: 2, textAlign: 'center', borderStyle: 'dashed', borderColor: oldPdfFile ? 'success.main' : 'divider', bgcolor: oldPdfFile ? 'success.lighter' : 'transparent' }}>
                  <Button component="label" fullWidth startIcon={<CloudUploadIcon />} sx={{ mb: 1 }}>
                    Upload Old PDF
                    <input type="file" hidden accept=".pdf,application/pdf" onChange={handleOldPdfFileChange} />
                  </Button>
                  <Typography variant="caption" display="block" noWrap color={oldPdfFile ? "success.main" : "text.secondary"}>
                    {oldPdfFile ? oldPdfFile.name : "No file selected"}
                  </Typography>
                </Paper>
              </Grid>
            )}
            {showNewPdf && (
              <Grid item xs={12} sm={6} md={4}>
                <Paper variant="outlined" sx={{ p: 2, textAlign: 'center', borderStyle: 'dashed', borderColor: newPdfFile ? 'success.main' : 'divider', bgcolor: newPdfFile ? 'success.lighter' : 'transparent' }}>
                  <Button component="label" fullWidth startIcon={<CloudUploadIcon />} sx={{ mb: 1 }}>
                    Upload New PDF
                    <input type="file" hidden accept=".pdf,application/pdf" onChange={handleNewPdfFileChange} />
                  </Button>
                  <Typography variant="caption" display="block" noWrap color={newPdfFile ? "success.main" : "text.secondary"}>
                    {newPdfFile ? newPdfFile.name : "No file selected"}
                  </Typography>
                </Paper>
              </Grid>
            )}
            {showHtml && (
              <Grid item xs={12} sm={6} md={4}>
                <Paper variant="outlined" sx={{ p: 2, textAlign: 'center', borderStyle: 'dashed', borderColor: htmlFile ? 'success.main' : 'divider', bgcolor: htmlFile ? 'success.lighter' : 'transparent' }}>
                  <Button component="label" fullWidth startIcon={<CloudUploadIcon />} sx={{ mb: 1 }}>
                    Upload HTML
                    <input type="file" hidden accept=".html,text/html" onChange={handleHtmlFileChange} />
                  </Button>
                  <Typography variant="caption" display="block" noWrap color={htmlFile ? "success.main" : "text.secondary"}>
                    {htmlFile ? htmlFile.name : "No file selected"}
                  </Typography>
                </Paper>
              </Grid>
            )}
          </Grid>
        </Stack>
      </Paper>

      <form onSubmit={handleSubmit}>
        {comparisonMode === 'revision' && (
          <Paper elevation={0} sx={{ p: 3, mb: 3, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
            <Typography variant="subtitle2" gutterBottom fontWeight="bold">Revision Request Details</Typography>
            <TextField
              placeholder="Enter or extract revision request details..."
              multiline
              rows={4}
              value={revisionText}
              onChange={(e) => setRevisionText(e.target.value)}
              spellCheck="true"
              variant="outlined"
              fullWidth
              sx={{ bgcolor: 'background.paper' }}
            />
          </Paper>
        )}

        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 4 }}>
          <LoadingButton
            type="submit"
            variant="contained"
            color="primary"
            size="large"
            loading={loading}
            disabled={
              (comparisonMode === 'revision' && (!newPdfFile || !revisionText)) ||
              (comparisonMode === 'pdf-html' && (!newPdfFile || !htmlFile)) ||
              (comparisonMode === 'pdf-pdf' && (!oldPdfFile || !newPdfFile)) ||
              (comparisonMode === 'checklist' && (!oldPdfFile || !newPdfFile))
            }
            sx={{ px: 6, py: 1.5, borderRadius: 3, fontSize: '1.1rem', fontWeight: 'bold', boxShadow: 4 }}
          >
            {comparisonMode === 'revision' ? 'Verify Revisions' : (comparisonMode === 'checklist' ? 'Run Confirmation Check' : 'Compare')}
          </LoadingButton>
        </Box>
        {loading && <Typography variant="body2" sx={{ mt: -2, mb: 3, textAlign: 'center', color: 'text.secondary' }}>Processing... {Math.floor(timer / 60)}m {timer % 60}s</Typography>}
      </form>

      {error && <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>{error}</Alert>}

      {!loading && (response || error) && (
        <Typography variant="body2" sx={{ mb: 2, textAlign: 'center', color: 'text.secondary' }}>
          Total time taken: {Math.floor(timer / 60)}m {timer % 60}s
        </Typography>
      )}

      <Box sx={{ animation: 'fadeIn 0.5s ease-in-out' }}>
        {response && comparisonMode === 'revision' && renderRevisionResponse(response)}
        {response && comparisonMode === 'checklist' && renderChecklistResponse(response)}
        {response && comparisonMode === 'pdf-pdf' && renderPdfToPdfResponse(response)}

        {response && comparisonMode === 'pdf-html' && (
          <>
            {response.comparison_results && (
              <Paper elevation={2} sx={{ p: 3, mt: 3, borderRadius: 3 }}>
                <Typography variant="h6" gutterBottom fontWeight="bold" color="primary">Comparison Result</Typography>
                {response.comparison_results.length > 0 ? (
                  <TableContainer sx={{ maxHeight: 600 }}>
                    <Table stickyHeader aria-label="comparison results table">
                      <TableHead>
                        <TableRow>
                          <TableCell sx={{ fontWeight: 'bold', bgcolor: 'background.paper' }}>Field</TableCell>
                          <TableCell sx={{ fontWeight: 'bold', bgcolor: 'background.paper' }}>Value from HTML</TableCell>
                          <TableCell sx={{ fontWeight: 'bold', bgcolor: 'background.paper' }}>Value from PDF</TableCell>
                          <TableCell sx={{ fontWeight: 'bold', bgcolor: 'background.paper' }} align="center">Status</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {comparisonData.map((item, index) => {
                          const htmlValue = (item.html_value === null || item.html_value === undefined) ? '' : String(item.html_value);
                          const pdfValue = (item.pdf_value === null || item.pdf_value === undefined) ? '' : String(item.pdf_value);

                          let isMatch = item.status === 'Match';

                          const normalize = (str) => {
                            if (typeof str !== 'string') {
                              return '';
                            }

                            let normalizedStr = str.toLowerCase();

                            normalizedStr = normalizedStr.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

                            const abbreviations = {
                              'ave': 'avenue', 'st': 'street', 'rd': 'road', 'dr': 'drive',
                              'blvd': 'boulevard', 'ln': 'lane', 'pl': 'place',
                              'cir': 'circle', 'pkwy': 'parkway', 'ter': 'terrace',
                              'al': 'alabama', 'ak': 'alaska', 'az': 'arizona', 'ar': 'arkansas', 'ca': 'california',
                              'co': 'colorado', 'ct': 'connecticut', 'de': 'delaware', 'fl': 'florida', 'ga': 'georgia',
                              'hi': 'hawaii', 'id': 'idaho', 'il': 'illinois', 'in': 'indiana', 'ia': 'iowa',
                              'ks': 'kansas', 'ky': 'kentucky', 'la': 'louisiana', 'me': 'maine', 'md': 'maryland',
                              'ma': 'massachusetts', 'mi': 'michigan', 'mn': 'minnesota', 'ms': 'mississippi',
                              'mo': 'missouri', 'mt': 'montana', 'ne': 'nebraska', 'nv': 'nevada', 'nh': 'newhampshire',
                              'nj': 'newjersey', 'nm': 'newmexico', 'ny': 'newyork', 'nc': 'northcarolina',
                              'nd': 'northdakota', 'oh': 'ohio', 'ok': 'oklahoma', 'or': 'oregon', 'pa': 'pennsylvania',
                              'ri': 'rhodeisland', 'sc': 'southcarolina', 'sd': 'southdakota', 'tn': 'tennessee',
                              'tx': 'texas', 'ut': 'utah', 'vt': 'vermont', 'va': 'virginia', 'wa': 'washington',
                              'wv': 'westvirginia', 'wi': 'wisconsin', 'wy': 'wyoming',
                              'apt': 'apartment', 'bldg': 'building', 'dept': 'department',
                              'ste': 'suite', 'unit': 'unit'
                            };
                            for (const [abbr, full] of Object.entries(abbreviations)) {
                              normalizedStr = normalizedStr.replace(new RegExp(`\\b${abbr}\\b`, 'g'), full);
                            }
                            return normalizedStr.replace(/[\s\W_]/g, '');
                          };

                          const normalizedHtml = normalize(htmlValue);
                          const normalizedPdf = normalize(pdfValue);

                          if (item.field === 'Property Address') {
                            const getFirstWord = (str) => (str || '').toLowerCase().replace(/[^\w\s]/g, '').trim().split(/\s+/)[0] || '';
                            const htmlFirstWord = getFirstWord(htmlValue);
                            const pdfFirstWord = getFirstWord(pdfValue);
                            isMatch = htmlFirstWord && pdfFirstWord && htmlFirstWord === pdfFirstWord;
                          } else {
                            isMatch = normalizedHtml === normalizedPdf || normalizedHtml.includes(normalizedPdf) || normalizedPdf.includes(normalizedHtml);
                          }

                          const handleDataChange = (path, newValue) => {
                            setComparisonData(prevData => {
                              const newData = [...prevData];
                              newData[path[0]][path[1]] = newValue;
                              return newData;
                            });
                          };

                          return (
                            <TableRow key={index} hover>
                              <TableCell><SimpleEditableField fieldPath={[index, 'field']} value={item.field} onDataChange={handleDataChange} editingField={editingField} setEditingField={setEditingField} isEditable={true} /></TableCell>
                              <TableCell><SimpleEditableField fieldPath={[index, 'html_value']} value={item.html_value} onDataChange={handleDataChange} editingField={editingField} setEditingField={setEditingField} isEditable={true} /></TableCell>
                              <TableCell><SimpleEditableField fieldPath={[index, 'pdf_value']} value={item.pdf_value} onDataChange={handleDataChange} editingField={editingField} setEditingField={setEditingField} isEditable={true} /></TableCell>
                              <TableCell align="center">
                                {isMatch ? (
                                  <Chip icon={<CheckCircleIcon />} label="Match" color="success" size="small" variant="outlined" />
                                ) : (
                                  <Chip icon={<CancelIcon />} label="Mismatch" color="error" size="small" variant="outlined" />
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </TableContainer>
                ) : (
                  <Alert severity="success" sx={{ mt: 2 }}>
                    No differences found between the two documents.
                  </Alert>
                )}
              </Paper>)}
          </>
        )}
      </Box>
    </Container>
  );
};

export default Compare;
