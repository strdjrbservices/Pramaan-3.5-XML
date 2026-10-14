import React, { useState, useEffect, useRef } from 'react';
import {
  IconButton ,Box ,Button , TextField, Typography, Paper, Alert, Table, TableBody, TableCell, TableContainer,
  TableHead , TableRow, Container, Tooltip, Grid, CssBaseline,
} from '@mui/material';
import { LoadingButton } from '@mui/lab';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import SearchIcon from '@mui/icons-material/Search';
import LightModeIcon from '@mui/icons-material/LightMode';
import NightlightRoundIcon from '@mui/icons-material/NightlightRound';
import uploadSoundFile from '../../Assets/upload.mp3';
import successSoundFile from '../../Assets/success.mp3';
import errorSoundFile from '../../Assets/error.mp3';
import PremiumLogo from '../auth/logo';
import { API_BASE_URL } from '../Subject/utils/utils.js';
import { useThemeContext } from '../../context/ThemeContext';

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

const fetchWithRetry = async (url, options, retries = 3, delay = 1000) => {
  const timeout = 60000;
  for (let i = 0; i < retries; i++) {
    try {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), timeout);
      const res = await fetch(url, { ...options, signal: controller.signal });
      clearTimeout(id);

      if (res.status < 500) {
        return res;
      }
      console.warn(`Attempt ${i + 1}: Server error ${res.status}. Retrying in ${delay / 1000}s...`);
    } catch (error) {
      if (error.name === 'AbortError') {
        console.warn(`Attempt ${i + 1}: Request timed out. Retrying in ${delay / 1000}s...`);
      } else {
        console.warn(`Attempt ${i + 1}: Network error. Retrying in ${delay / 1000}s...`, error);
      }
    }
    if (i < retries - 1) {
      await new Promise(resolve => setTimeout(resolve));
      delay *= 2;
    }
  }
  throw new Error(`Failed to fetch from ${url} after ${retries} attempts.`);
};

const CustomQuery = () => {
  const { themeMode, toggleTheme } = useThemeContext();
  const [file, setFile] = useState(null);
  const [comment, setComment] = useState('');
  const [formType,] = useState('1004');
  const [response, setResponse] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [timer, setTimer] = useState(0);
  const timerRef = useRef(null);

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
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const handleFileChange = (event) => {
    setFile(event.target.files[0]);
    setError('');
    setResponse(null);
  };

  const handleCommentChange = (event) => {
    setComment(event.target.value);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!file) {
      setError('Please upload a PDF file.');
      return;
    }
    if (!comment.trim()) {
      setError('Please enter a query or comment.');
      return;
    }

    setLoading(true);
    setError('');
    setResponse(null);
    setTimer(0);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => setTimer(prev => prev + 1), 1000);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('form_type', formType);
    formData.append('comment', comment);

    try {
      const res = await fetchWithRetry(`${API_BASE_URL}/api/customquery/`, {
        method: 'POST',
        body: formData,
      });

      const text = await res.text();

      if (!res.ok) {
        throw new Error(text || `HTTP error! status: ${res.status}`);
      }


      try {
        const parsedJson = JSON.parse(text);
        setResponse(parsedJson);
      } catch (err) {

        setResponse({ rawText: text });
      }
    } catch (e) {
      setError(e.message || 'An unexpected error occurred.');
      console.error('Extraction failed:', e);
    } finally {
      setLoading(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const renderResponse = () => {
    if (!response) return null;

    let dataToRender = [];
    let summary = null;

    if (response.rawText) {
      return (
        <Paper elevation={1} sx={{
          p: 3,
          mt: 3,
          whiteSpace: 'pre-wrap',
          overflowWrap: 'break-word',
          bgcolor: 'background.paper',
          borderRadius: 3,
          color: 'text.primary',
          wordWrap: 'break-word',
        }}>
          <Typography variant="body1">{response.rawText}</Typography>
        </Paper>
      );
    }

    if (Array.isArray(response)) {
      dataToRender = response;
    } else if (response.details && Array.isArray(response.details)) {
      dataToRender = response.details;
      summary = response.summary;
    } else if (response.fields && typeof response.fields === 'object') {
      summary = response.fields.summary;
      dataToRender = Object.entries(response.fields)
        .filter(([key]) => key !== 'summary')
        .map(([key, val], index) => ({
          'sr_no': index + 1,
          'description': key.replace(/_/g, ' '),
          'final_output': typeof val === 'object' && val !== null ? val.value : val,
        }));
    } else if (Object.values(response).every(v => typeof v === 'object' && v !== null && 'value' in v && 'page_no' in v)) {
      dataToRender = Object.entries(response).map(([key, val]) => ({
        'field': key.replace(/_/g, ' '),
        'value': val.value,
        'page_no': val.page_no,
      }));
    } else {
      dataToRender = Object.entries(response).map(([key, value]) => ({
        'field': key.replace(/_/g, ' '),
        'value': typeof value === 'object' && value !== null ? JSON.stringify(value, null, 2) : String(value)
      }));
    }

    if (dataToRender.length > 0) {
      return (
        <Paper elevation={2} sx={{ p: 3, mt: 3, borderRadius: 3 }}>
          {summary && (
            <Paper elevation={0} sx={{ p: 2, mb: 3, bgcolor: 'action.hover', borderRadius: 2, borderLeft: '4px solid', borderColor: 'primary.main' }}>
              <Typography variant="h6" gutterBottom color="primary">Summary</Typography>
              <Typography variant="body1">{summary}</Typography>
            </Paper>
          )}
          <TableContainer>
            <Table sx={{ minWidth: 650 }} aria-label="custom query response table">
              <TableHead>
                <TableRow>
                  {Object.keys(dataToRender[0]).map((key) => (
                    <TableCell key={key} sx={{ fontWeight: 'bold', textTransform: 'capitalize' }}>
                      {key.replace(/_/g, ' ')}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {dataToRender.map((item, index) => (
                  <TableRow key={index}>
                    {Object.values(item).map((value, cellIndex) => (
                      <TableCell key={cellIndex}>{value || 'N/A'}</TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      );
    }

    return (
      <Paper elevation={1} sx={{
        p: 3,
        mt: 3,
        whiteSpace: 'pre-wrap',
        bgcolor: 'background.paper',
        borderRadius: 3,
        color: 'text.primary'
      }}>
        <pre>{JSON.stringify(response, null, 2)}</pre>
      </Paper>
    );
  };

  return (
    <>
      <CssBaseline />
      <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', py: 4 }}>
        <Container maxWidth="xl">
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
          CUSTOM QUERY
        </Typography>
        <Tooltip title="Toggle Dark/Light Theme">
          <IconButton onClick={toggleTheme} color="primary">
            {themeMode === 'dark' ? <LightModeIcon /> : <NightlightRoundIcon />}
          </IconButton>
        </Tooltip>
      </Box>

      <form onSubmit={handleSubmit}>
        <Paper elevation={0} sx={{ p: 3, mb: 3, borderRadius: 4, border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper', color: 'text.primary' }}>
          <Grid container spacing={3} justifyContent="center">
            <Grid item xs={12} md={6}>
              <Paper variant="outlined" sx={{ p: 2, textAlign: 'center', borderStyle: 'dashed', borderColor: file ? 'success.main' : 'divider', bgcolor: file ? 'action.selected' : 'transparent' }}>
                <Button component="label" fullWidth startIcon={<CloudUploadIcon />} sx={{ mb: 1 }}>
                  Upload PDF File
                  <input type="file" hidden accept=".pdf" onChange={handleFileChange} />
                </Button>
                <Typography variant="caption" display="block" noWrap color={file ? "success.main" : "text.secondary"}>
                  {file ? file.name : "No file selected"}
                </Typography>
              </Paper>
            </Grid>
          </Grid>
        </Paper>

        <Paper elevation={0} sx={{ p: 3, mb: 3, borderRadius: 3, border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper', color: 'text.primary' }}>
          <Typography variant="subtitle2" gutterBottom fontWeight="bold">Query Details</Typography>
          <TextField
            label="Enter your query or comment"
            placeholder="e.g., Extract the borrower's name and property address..."
            multiline
            rows={4}
            value={comment}
            onChange={handleCommentChange}
            variant="outlined"
            spellCheck="true"
            fullWidth
            required
            sx={{ bgcolor: 'background.paper' }}
          />
        </Paper>

        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 4 }}>
          <LoadingButton
            type="submit"
            variant="contained"
            color="primary"
            size="large"
            loading={loading}
            disabled={!file || !comment.trim()}
            startIcon={<SearchIcon />}
            sx={{ px: 6, py: 1.5, borderRadius: 3, fontSize: '1.1rem', fontWeight: 'bold', boxShadow: 4 }}
          >
            Run Query
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
        {response && renderResponse()}
      </Box>
        </Container>
      </Box>
    </>
  );
};

export default CustomQuery;
