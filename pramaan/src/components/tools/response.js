import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Button,
  TextField,
  Typography,
  CircularProgress,
  Paper,
  Alert,
  Stack,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
} from '@mui/material';
import uploadSoundFile from '../../Assets/upload.mp3';
import { API_BASE_URL } from '../Subject/utils/utils.js';
import successSoundFile from '../../Assets/success.mp3';
import errorSoundFile from '../../Assets/error.mp3';

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

const renderFinalOutput = (output) => {
  if (!output) return 'N/A';
  const outputLower = String(output).toLowerCase().trim();
  const positiveWords = ['yes', 'present', 'corrected', 'match', 'fulfilled', 'consistent', 'ok', 'pass', 'correct'];
  const negativeWords = ['no', 'not corrected', 'mismatch', 'not fulfilled', 'inconsistent', 'absent', 'missing', 'fail', 'incorrect', 'no match'];

  let style = {};
  if (positiveWords.includes(outputLower)) {
    style = { backgroundColor: '#91ff00ff', color: '#000000', padding: '4px 8px', borderRadius: '4px', fontWeight: 600, display: 'inline-block' };
  } else if (negativeWords.includes(outputLower)) {
    style = { backgroundColor: '#ff0000', color: '#ffffff', padding: '4px 8px', borderRadius: '4px', fontWeight: 600, display: 'inline-block' };
  }

  if (Object.keys(style).length > 0) {
    return <span style={style}>{output}</span>;
  }
  return output;
};

const ResponsePage = () => {
  const [htmlFile, setHtmlFile] = useState(null);
  const [revisionText, setRevisionText] = useState('');
  const [pdfFile, setPdfFile] = useState(null);
  const [response, setResponse] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [timer, setTimer] = useState(0);
  const timerRef = useRef(null);

  useEffect(() => {
    if (!htmlFile) {
      setRevisionText('');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target.result;
      const parser = new DOMParser();
      const doc = parser.parseFromString(content, 'text/html');

      let extractedText = '';

      // 1. Direct check for known FastApp/portal ID pattern
      const rejectSpan = doc.querySelector('[id*="lblFileRejectReason"], [id*="FileRejectReason"], [id*="lblRejectReason"]');
      if (rejectSpan) {
        extractedText = rejectSpan.innerText ? rejectSpan.innerText.trim() : rejectSpan.textContent.trim();
      }

      // 2. Search elements matching "report rejection reason"
      if (!extractedText) {
        const fieldNameToFind = 'report rejection reason';
        const allElements = doc.body.querySelectorAll('*');

        for (let i = 0; i < allElements.length; i++) {
          const element = allElements[i];
          const text = element.textContent.trim().toLowerCase().replace(/:$/, '');
          if (text === fieldNameToFind || text.includes('report rejection reason')) {
            let nextElement = element.nextElementSibling;
            if (!nextElement && element.parentElement) {
              nextElement = element.parentElement.nextElementSibling;
            }
            if (nextElement) {
              const val = nextElement.innerText ? nextElement.innerText.trim() : nextElement.textContent.trim();
              if (val && !val.toLowerCase().includes('report rejection reason')) {
                extractedText = val;
                break;
              }
            }
          }
        }
      }

      // 3. Fallback regex on HTML raw text
      if (!extractedText) {
        const match = content.match(/report\s*rejection\s*reason[\s\S]*?<span[^>]*id=["'][^"']*lblFileRejectReason[^"']*["'][^>]*>([\s\S]*?)<\/span>/i) ||
                      content.match(/report\s+rejection\s+reason\s*:?\s*<\/?[^>]+>\s*([^<]+)/i) ||
                      content.match(/report\s+rejection\s+reason[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i);
        if (match && match[1]) {
          const tempDiv = document.createElement('div');
          tempDiv.innerHTML = match[1];
          extractedText = tempDiv.innerText ? tempDiv.innerText.trim() : tempDiv.textContent.trim();
        }
      }

      // Clean redundant title echo
      extractedText = extractedText.replace(/^(?:report\s+rejection\s+reason\s*:?\s*)+/i, '').trim();

      if (!extractedText) {
        setError("Could not find 'report rejection reason' field in the HTML file.");
      }
      setRevisionText(extractedText);
    };
    reader.onerror = () => {
      setError('Failed to read the HTML file.');
    };
    reader.readAsText(htmlFile);

  }, [htmlFile]);

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

  const handleHtmlFileChange = (event) => {
    setHtmlFile(event.target.files[0]);
    setError('');
    setResponse(null);
  };

  const handlePdfFileChange = (event) => {
    setPdfFile(event.target.files[0]);
    setError('');
    setResponse(null);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!pdfFile || !revisionText) {
      setError('Please provide a report file (PDF or XML) and ensure revision text is extracted.');
      return;
    }

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
    formData.append('file', pdfFile);
    formData.append('form_type', '1004');  
    formData.append('revision_request', revisionText);

    try {
      const res = await fetch(`${API_BASE_URL}/api/extract/`, {
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
      setResponse(result);
    } catch (e) {
      const errorMessage = e.message.includes('Failed to fetch') ? 'Could not connect to the server. Please ensure it is running.' : e.message;
      setError(errorMessage);
      console.error('Verification failed:', e);
    } finally {
      setLoading(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }
  };

  const renderResponse = (data) => {
    if (!data) return null;

    const comparisonSummary = data?.fields?.comparison_summary || data?.comparison_summary || [];
    const summaryText = data?.fields?.summary || data?.summary || '';

    if (comparisonSummary.length === 0) {
      return (
        <Alert severity="success" sx={{ mt: 3 }}>
          No differences were found between the two documents.
        </Alert>
      );
    }

    const verifiedCount = comparisonSummary.filter(c => ['fulfilled', 'corrected', 'pass', 'match'].includes(String(c.status).toLowerCase())).length;

    return (
      <Paper elevation={1} sx={{ p: 3, mt: 3, borderRadius: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2, flexWrap: 'wrap', gap: 1 }}>
          <Typography variant="h6" fontWeight="bold">
            Revision Verification Findings
          </Typography>
          <Chip
            label={`${verifiedCount} of ${comparisonSummary.length} Verified`}
            color={verifiedCount === comparisonSummary.length ? 'success' : 'warning'}
            size="small"
            sx={{ fontWeight: 'bold' }}
          />
        </Box>

        {summaryText && (
          <Paper elevation={0} sx={{ p: 2.5, mb: 3, borderLeft: 5, borderColor: 'primary.main', bgcolor: 'action.hover', borderRadius: 2 }}>
            <Typography variant="subtitle1" fontWeight="bold" gutterBottom component="div" color="text.primary">
              Summary
            </Typography>
            <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.7 }}>
              {summaryText}
            </Typography>
          </Paper>
        )}

        <TableContainer sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
          <Table sx={{ minWidth: 800 }} aria-label="revision verification table">
            <TableHead sx={{ bgcolor: 'action.hover' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 'bold', width: '50px' }}>#</TableCell>
                <TableCell sx={{ fontWeight: 'bold', minWidth: '220px' }}>Revision Request</TableCell>
                <TableCell sx={{ fontWeight: 'bold', minWidth: '170px' }}>Section & Page</TableCell>
                <TableCell sx={{ fontWeight: 'bold', minWidth: '180px' }}>Original Finding / Issue</TableCell>
                <TableCell sx={{ fontWeight: 'bold', minWidth: '220px' }}>Revised Finding (Verified)</TableCell>
                <TableCell sx={{ fontWeight: 'bold', minWidth: '130px' }} align="center">Status</TableCell>
                <TableCell sx={{ fontWeight: 'bold', minWidth: '220px' }}>Confirmation Details</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {comparisonSummary.map((change, index) => (
                <TableRow key={index} hover sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                  <TableCell component="th" scope="row" sx={{ fontWeight: 'bold', color: 'text.secondary' }}>
                    {change.item_no || index + 1}
                  </TableCell>
                  <TableCell sx={{ fontSize: '0.875rem' }}>
                    <Typography variant="body2" sx={{ fontWeight: 500, color: 'text.primary' }}>
                      {change.revision_request || `Revision Item ${index + 1}`}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {change.section}
                    </Typography>
                    {change.page_no && (
                      <Chip
                        label={change.page_no}
                        size="small"
                        variant="outlined"
                        color="primary"
                        sx={{ mt: 0.5, fontSize: '0.72rem', height: '20px' }}
                      />
                    )}
                  </TableCell>
                  <TableCell sx={{ fontSize: '0.85rem' }}>
                    <Typography variant="body2" color="text.secondary">
                      {change.original_finding || change.original_value || 'Report Rejection Note'}
                    </Typography>
                  </TableCell>
                  <TableCell sx={{ fontSize: '0.85rem' }}>
                    <Typography variant="body2" sx={{ fontWeight: 600, color: 'primary.dark' }}>
                      {change.revised_finding || change.revised_value || change.comment}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    {renderFinalOutput(change.status)}
                  </TableCell>
                  <TableCell sx={{ fontSize: '0.85rem' }}>
                    <Typography variant="body2" color="text.secondary">
                      {change.finding || change.comment}
                    </Typography>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    );
  };

  return (
    <Paper elevation={3} sx={{ p: 4, m: 2 }}>
      <form onSubmit={handleSubmit}>
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} md={4}>
            <Typography variant="h6" gutterBottom>1. Upload HTML File</Typography>
            <Stack spacing={2}>
              <Button variant="outlined" component="label">
                Upload HTML File
                <input type="file" hidden accept=".html,text/html" onChange={handleHtmlFileChange} />
              </Button>
              {htmlFile && <Typography variant="body2" noWrap>Selected: {htmlFile.name}</Typography>}
            </Stack>
          </Grid>

          <Grid item xs={12} md={8}>
            <Typography variant="h6" gutterBottom>2. Upload Revised PDF / XML Report</Typography>
            <Stack spacing={2}>
              <Button variant="outlined" component="label">
                Upload Report File (PDF or XML)
                <input type="file" hidden accept=".pdf,.xml,application/pdf,text/xml,application/xml" onChange={handlePdfFileChange} />
              </Button>
              {pdfFile && <Typography variant="body2" noWrap>Selected: {pdfFile.name}</Typography>}
            </Stack>
          </Grid>

        </Grid>

        <TextField
          label="Extracted Revision Request"
          multiline
          rows={6}
          value={revisionText}
          onChange={(e) => setRevisionText(e.target.value)}
          spellCheck="true"
          variant="outlined"
          fullWidth
          lineHeight
          sx={{ mb: 3 }}
          InputProps={{
            readOnly: false
          }}
        />

        <Box sx={{ position: 'relative', mt: 2 }}>
          <Button type="submit" variant="contained" color="primary" disabled={loading || !pdfFile || !revisionText} fullWidth>
            {loading ? <CircularProgress size={24} /> : 'Verify Revisions'}
          </Button>
          {loading && (
            <Typography variant="body2" sx={{ mt: 1, textAlign: 'center' }}>
              Elapsed Time: {Math.floor(timer / 60)}m {timer % 60}s
            </Typography>
          )}
        </Box>
      </form>

      {error && <Alert severity="error" sx={{ mt: 3 }}>{error}</Alert>}

      {response && renderResponse(response)}
    </Paper>
  );
};

export default ResponsePage;
