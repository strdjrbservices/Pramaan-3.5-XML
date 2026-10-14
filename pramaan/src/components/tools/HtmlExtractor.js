import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Button,
  Typography,
  CircularProgress,
  Paper,
  Alert,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
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

const HtmlExtractor = () => {
  const [htmlFile, setHtmlFile] = useState(null);
  const [response, setResponse] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [timer, setTimer] = useState(0);
  const timerRef = useRef(null);

  useEffect(() => {
    if (error) playSound('error');
  }, [error]);

  useEffect(() => {
    if (response) playSound('success');
  }, [response]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const handleFileChange = (event) => {
    setHtmlFile(event.target.files[0]);
    setError('');
    setResponse(null);
    if (event.target.files[0]) playSound('upload');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!htmlFile) {
      setError('Please provide an HTML file.');
      return;
    }

    setLoading(true);
    setError('');
    setResponse(null);
    setTimer(0);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => setTimer(prev => prev + 1), 1000);

    const formData = new FormData();
    formData.append('file', htmlFile);

    try {
      const res = await fetch(`${API_BASE_URL}/api/extract-from-html/`, {
        method: 'POST',
        body: formData,
      });

      const rawText = await res.text();
      if (!res.ok) {
        throw new Error(rawText || `HTTP error! status: ${res.status}`);
      }

      const result = JSON.parse(rawText);
      setResponse(result.extracted_data);
    } catch (e) {
      const errorMessage = e.message.includes('Failed to fetch')
        ? 'Could not connect to the server. Please ensure it is running.'
        : e.message;
      setError(errorMessage);
    } finally {
      setLoading(false);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  };

  const renderResponse = (data) => {
    if (!data || Object.keys(data).length === 0) return null;

    return (
      <Paper elevation={1} sx={{ p: 2, mt: 3 }}>
        <Typography variant="h6" gutterBottom>Extraction Results</Typography>
        <TableContainer>
          <Table sx={{ minWidth: 650 }} aria-label="extraction table">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 'bold' }}>Field</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Value</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {Object.entries(data).map(([key, value]) => (
                <TableRow key={key} sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                  <TableCell>{key}</TableCell>
                  <TableCell>{value || 'N/A'}</TableCell>
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
      <Typography variant="h5" gutterBottom>HTML Field Extractor</Typography>
      <form onSubmit={handleSubmit}>
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12}>
            <Tooltip title="Click to upload the HTML file">
              <Button variant="outlined" component="label" fullWidth>Upload HTML File<input type="file" hidden accept=".html" onChange={handleFileChange} /></Button>
            </Tooltip>
            {htmlFile && <Typography variant="body2" noWrap>Selected: {htmlFile.name}</Typography>}
          </Grid>
        </Grid>
        <Box sx={{ position: 'relative', mt: 2 }}>
          <Button type="submit" variant="contained" color="primary" disabled={loading || !htmlFile} fullWidth>
            {loading ? <CircularProgress size={24} /> : 'Extract from HTML'}
          </Button>
          {loading && <Typography variant="body2" sx={{ mt: 1, textAlign: 'center' }}>Elapsed Time: {Math.floor(timer / 60)}m {timer % 60}s</Typography>}
        </Box>
      </form>
      {error && <Alert severity="error" sx={{ mt: 3 }}>{error}</Alert>}
      {!loading && (response || error) && (
        <Typography variant="body2" sx={{ mt: 2, textAlign: 'center', color: 'text.secondary' }}>
          Total time taken: {Math.floor(timer / 60)}m {timer % 60}s
        </Typography>
      )}
      {response && renderResponse(response)}
    </Paper>
  );
};

export default HtmlExtractor;
