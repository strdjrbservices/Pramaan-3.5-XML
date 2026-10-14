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

const CHECKLIST_PROMPT = `Appraisal Report Confirmation Checklist

Please confirm the appraised value has been not changed.

Please confirm if the appraised value is bracketed with the unadjusted value.

Please confirm if the appraised value is bracketed with the  adjusted value.

Please confirm the Aerial Map, Location Map, UAD Dataset Pages, and 1004MC are present.

Please confirm the GLA, total room count, bath count, and bed count from the Improvements section match the Sales Grid, Photos, and Sketch.

Please confirm if the 1007 form is Not present in the new report.

Please confirm if the 216,str,rental,operating income form is not present in the new report.

For each item in the checklist, provide a 'yes' or 'no' answer in the 'final_output' field. The response should be a JSON object with a 'details' array. Each object in the array should have 'sr_no', 'description', 'old_pdf', 'new_pdf', and 'final_output' keys.
`;

const ConfirmationChecklist = () => {
  const [oldPdfFile, setOldPdfFile] = useState(null);
  const [newPdfFile, setNewPdfFile] = useState(null);
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

  const handleFileChange = (setter) => (event) => {
    setter(event.target.files[0]);
    setError('');
    setResponse(null);
    if (event.target.files[0]) playSound('upload');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!oldPdfFile || !newPdfFile) {
      setError('Please provide both PDF files.');
      return;
    }

    setLoading(true);
    setError('');
    setResponse(null);
    setTimer(0);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => setTimer(prev => prev + 1), 1000);

    const formData = new FormData();
    formData.append('old_pdf_file', oldPdfFile);
    formData.append('new_pdf_file', newPdfFile);
    formData.append('revision_request', CHECKLIST_PROMPT);

    try {
      const res = await fetch(`${API_BASE_URL}/api/compare-pdfs/`, {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        const result = await res.json();
        setResponse(result);
      } else {
        const errorText = await res.text();
        throw new Error(errorText || `HTTP error! status: ${res.status}`);
      }
    } catch (e) {
      const errorMessage = e.message.includes('Failed to fetch') ? 'Could not connect to the server. Please ensure it is running.' : e.message;
      setError(errorMessage);
    } finally {
      setLoading(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
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

  const renderResponse = (data) => {
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

  return (
    <Paper elevation={3} sx={{ p: 4, m: 2 }}>
      <Typography variant="h5" gutterBottom>Appraisal Report Confirmation</Typography>
      <form onSubmit={handleSubmit}>
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} md={6}>
            <Tooltip title="Click to upload the old PDF file">
              <Button variant="outlined" component="label" fullWidth>Upload Old PDF<input type="file" hidden accept=".pdf" onChange={handleFileChange(setOldPdfFile)} /></Button>
            </Tooltip>
            {oldPdfFile && <Typography variant="body2" noWrap>Selected: {oldPdfFile.name}</Typography>}
          </Grid>
          <Grid item xs={12} md={6}>
            <Tooltip title="Click to upload the new PDF file">
              <Button variant="outlined" component="label" fullWidth>Upload New PDF<input type="file" hidden accept=".pdf" onChange={handleFileChange(setNewPdfFile)} /></Button>
            </Tooltip>
            {newPdfFile && <Typography variant="body2" noWrap>Selected: {newPdfFile.name}</Typography>}
          </Grid>
        </Grid>
        <Box sx={{ position: 'relative', mt: 2 }}>
          <Button type="submit" variant="contained" color="primary" disabled={loading || !oldPdfFile || !newPdfFile} fullWidth>
            {loading ? <CircularProgress size={24} /> : 'Run Confirmation Check'}
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

export default ConfirmationChecklist;
