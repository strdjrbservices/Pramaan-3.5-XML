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
      setError('Please provide a PDF file and ensure revision text is extracted.');
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

    const comparisonSummary = data?.fields?.comparison_summary || [];
    const summaryText = data?.fields?.summary || '';

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
            <Typography variant="h6" gutterBottom component="div" color="text.primary">
              Summary
            </Typography>
            <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.7 }}>
              {summaryText}
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
                  <TableCell component="th" scope="row">{change.status}</TableCell>
                  <TableCell>{change.section}</TableCell>
                  <TableCell>{change.comment}</TableCell>
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
            <Typography variant="h6" gutterBottom>2. Upload Revised PDF</Typography>
            <Stack spacing={2}>
              <Button variant="outlined" component="label">
                Upload PDF File
                <input type="file" hidden accept=".pdf,application/pdf" onChange={handlePdfFileChange} />
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
