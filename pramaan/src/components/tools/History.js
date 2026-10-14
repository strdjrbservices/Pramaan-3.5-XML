import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Container,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  CircularProgress,
  Alert,
  TextField,
  InputAdornment,
  Tooltip,
  IconButton,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Select,
  MenuItem,
  Chip
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { API_BASE_URL } from '../Subject/utils/utils.js';
import SearchIcon from '@mui/icons-material/Search';
import DeleteIcon from '@mui/icons-material/Delete';
import PremiumLogo from '../auth/logo';

const History = () => {
  const navigate = useNavigate();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [openDeleteConfirm, setOpenDeleteConfirm] = useState(false);
  const [reportToDelete, setReportToDelete] = useState(null);
  const [processingId, setProcessingId] = useState(null);
  const [filters, setFilters] = useState({
    file_name: '',
    user_name: '',
    created_at: '',
    status: '',
    totalTimeTaken: ''
  });

  useEffect(() => {
    setIsAdmin(localStorage.getItem('username') === 'Abhi');
    fetchReports();
  }, []);

  const fetchReports = async () => {
    setLoading(true);
    setError('');
    const token = localStorage.getItem('authToken');

    const headers = {};
    if (token && token !== 'undefined' && token !== 'null') {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/get-reports/`, { headers });

      if (response.status === 401) {
        localStorage.removeItem('authToken');
        throw new Error('Session expired. Please log in again.');
      }

      if (response.status === 403) {
        throw new Error('Access forbidden (403). Please log in or check permissions.');
      }

      if (!response.ok) {
        throw new Error(`Failed to fetch reports (Status: ${response.status})`);
      }

      const data = await response.json();
      setReports(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Error fetching history:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = (report) => {
    setReportToDelete(report);
    setOpenDeleteConfirm(true);
  };

  const handleCloseDeleteConfirm = () => {
    setOpenDeleteConfirm(false);
    setReportToDelete(null);
  };

  const handleDeleteConfirm = async () => {
    if (!reportToDelete) return;

    try {
      const token = localStorage.getItem('authToken');
      const headers = {};
      if (token && token !== 'undefined' && token !== 'null') {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`${API_BASE_URL}/api/delete-report/${reportToDelete.id}/`, {
        method: 'DELETE',
        headers,
      });

      if (!response.ok) {
        throw new Error('Failed to delete report');
      }

      setReports(prevReports => prevReports.filter(report => report.id !== reportToDelete.id));
      setError('');
    } catch (err) {
      console.error("Error deleting report:", err);
      setError('Could not delete the report. Please try again.');
    } finally {
      handleCloseDeleteConfirm();
    }
  };

  const handleStatusChange = async (id, newStatus) => {
    setReports(prevReports => prevReports.map(report =>
      report.id === id ? { ...report, status: newStatus } : report
    ));

    try {
      const token = localStorage.getItem('authToken');
      const headers = { 'Content-Type': 'application/json' };
      if (token && token !== 'undefined' && token !== 'null') {
        headers['Authorization'] = `Bearer ${token}`;
      }

      await fetch(`${API_BASE_URL}/api/update-report/${id}/`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ status: newStatus }),
      });
    } catch (err) {
      console.error("Error updating status:", err);
    }
  };

  const getStatusColor = (status) => {
    const statusLower = (status || '').toLowerCase();
    if (statusLower === 'completed') return 'success';
    if (statusLower === 'pending') return 'warning';
    if (statusLower === 'in progress') return 'info';
    if (statusLower === 'failed') return 'error';
    return 'default';
  };

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({ ...prev, [field]: value }));
  };

  const handleClearFilters = () => {
    setSearchQuery('');
    setFilters({
      file_name: '',
      user_name: '',
      created_at: '',
      status: '',
      totalTimeTaken: ''
    });
  };

  const handleFileClick = async (report) => {
    setProcessingId(report.id);
    try {
      const token = localStorage.getItem('authToken');
      const headers = {};
      if (token && token !== 'undefined' && token !== 'null') {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`${API_BASE_URL}/api/get-report/${report.id}/`, { headers });
      if (response.ok) {
        const data = await response.json();
        let reportData = data.report_data || {};
        if (typeof reportData === 'string') {
          try { reportData = JSON.parse(reportData); } catch (e) { }
        }
        if (typeof reportData === 'string') {
          try { reportData = JSON.parse(reportData); } catch (e) { }
        }
        if (reportData.data && typeof reportData.data === 'object' && !Array.isArray(reportData.data)) {
          reportData = { ...reportData.data, ...reportData };
          delete reportData.data;
        }

        navigate('/extractor', {
          state: {
            reportData: reportData,
            validationLog: data.validation_log,
            fileName: data.file_name,
            pdfFile: data.pdf_file
          }
        });
      } else {
        throw new Error('Failed to fetch report');
      }
    } catch (err) {
      console.error("Error fetching report details:", err);
      if (report.report_data) {
        let reportData = report.report_data;
        if (typeof reportData === 'string') {
          try { reportData = JSON.parse(reportData); } catch (e) { }
        }
        if (typeof reportData === 'string') {
          try { reportData = JSON.parse(reportData); } catch (e) { }
        }
        if (reportData.data && typeof reportData.data === 'object' && !Array.isArray(reportData.data)) {
          reportData = { ...reportData.data, ...reportData };
          delete reportData.data;
        }

        navigate('/extractor', {
          state: {
            reportData: reportData,
            fileName: report.file_name
          }
        });
      } else {
        setError('Could not load report details.');
        setProcessingId(null);
      }
    }
  };

  const filteredReports = reports.filter((report) => {
    const fileName = (report.file_name || '').toLowerCase();
    const userName = (report.user_name || '').toLowerCase();
    const createdAt = (report.created_at ? new Date(report.created_at).toLocaleString() : 'N/A').toLowerCase();
    const status = (report.status || 'Completed').toLowerCase();
    const timeTaken = (report.report_data?.totalTimeTaken || 'N/A').toLowerCase();

    const searchLower = searchQuery.toLowerCase();
    const matchesSearch = !searchQuery ||
      fileName.includes(searchLower) ||
      userName.includes(searchLower) ||
      createdAt.includes(searchLower) ||
      status.includes(searchLower) ||
      timeTaken.includes(searchLower);

    const matchesFilters =
      (!filters.file_name || fileName.includes(filters.file_name.toLowerCase())) &&
      (!filters.user_name || userName.includes(filters.user_name.toLowerCase())) &&
      (!filters.created_at || createdAt.includes(filters.created_at.toLowerCase())) &&
      (!filters.status || status.includes(filters.status.toLowerCase())) &&
      (!filters.totalTimeTaken || timeTaken.includes(filters.totalTimeTaken.toLowerCase()));

    return matchesSearch && matchesFilters;
  });

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f0f2f5', py: 8 }}>
      <Container maxWidth="lg">
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/')}
          sx={{ mb: 4, color: 'text.secondary', '&:hover': { color: 'primary.main', bgcolor: 'transparent' } }}
        >
          Back to Dashboard
        </Button>

        <Box display="flex" alignItems="center" gap={2} mb={5} justifyContent='center' >
          <PremiumLogo size={60} fullScreen={false} />
          <Box>
            <Typography variant="h4" fontWeight={800} sx={{
              background: 'linear-gradient(45deg, #1976d2, #9c27b0)',
              backgroundClip: 'text',
              textFillColor: 'transparent',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}>
              Review History
            </Typography>
            <Typography variant="subtitle1" color="text.secondary">
              Archive of past appraisal reviews
            </Typography>
          </Box>
        </Box>

        {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

        <Box sx={{ mb: 3, display: 'flex', gap: 2 }}>
          <TextField
            fullWidth
            variant="outlined"
            placeholder="Search all columns..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
              sx: { bgcolor: 'background.paper', borderRadius: 2 }
            }}
          />
          <Button
            variant="outlined"
            color="secondary"
            onClick={handleClearFilters}
            sx={{ px: 3, borderRadius: 2, whiteSpace: 'nowrap', bgcolor: 'background.paper' }}
          >
            Clear Filters
          </Button>
        </Box>

        {!loading && (
          <Typography variant="subtitle2" sx={{ mb: 2, color: 'text.secondary', textAlign: 'left', display: 'block', textTransform: 'uppercase', fontWeight: 600, }}>
            Total Files: {filteredReports.length}
          </Typography>
        )}

        <Paper elevation={3} sx={{ borderRadius: 4, overflow: 'hidden' }}>
          {loading ? (
            <Box sx={{ p: 6, display: 'flex', justifyContent: 'center' }}>
              <CircularProgress />
            </Box>
          ) : reports.length === 0 ? (
            <Box sx={{ p: 6, textAlign: 'center' }}>
              <Typography color="text.secondary" variant="h6" gutterBottom>No review history found.</Typography>
              <Button variant="contained" sx={{ mt: 2 }} onClick={() => navigate('/extractor')}>
                Start New Review
              </Button>
            </Box>
          ) : (
            <TableContainer>
              <Table sx={{ minWidth: 650 }}>
                <TableHead sx={{ bgcolor: 'grey.200' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 'bold', py: 2 }}>File Name</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', py: 2 }}>User</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', py: 2 }}>Date Processed</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', py: 2 }}>Status</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', py: 2 }}>Time Taken</TableCell>
                    {isAdmin && <TableCell sx={{ fontWeight: 'bold', py: 2 }}>Actions</TableCell>}
                  </TableRow>
                  <TableRow>
                    <TableCell sx={{ p: 1 }}>
                      <TextField
                        size="small"
                        variant="standard"
                        placeholder="Filter File"
                        fullWidth
                        onChange={(e) => handleFilterChange('file_name', e.target.value)}
                      />
                    </TableCell>
                    <TableCell sx={{ p: 1 }}>
                      <TextField
                        size="small"
                        variant="standard"
                        placeholder="Filter User"
                        fullWidth
                        value={filters.user_name}
                        onChange={(e) => handleFilterChange('user_name', e.target.value)}
                      />
                    </TableCell>
                    <TableCell sx={{ p: 1 }}>
                      <TextField
                        size="small"
                        variant="standard"
                        placeholder="Filter Date"
                        fullWidth
                        onChange={(e) => handleFilterChange('created_at', e.target.value)}
                      />
                    </TableCell>
                    <TableCell sx={{ p: 1 }}>
                      <TextField size="small" variant="standard" placeholder="Filter Status" fullWidth onChange={(e) => handleFilterChange('status', e.target.value)} />
                    </TableCell>
                    <TableCell sx={{ p: 1 }}>
                      <TextField size="small" variant="standard" placeholder="Filter Time" fullWidth onChange={(e) => handleFilterChange('totalTimeTaken', e.target.value)} />
                    </TableCell>
                    {isAdmin && <TableCell sx={{ p: 1 }} />}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredReports.length === 0 && (
                    <TableRow><TableCell colSpan={isAdmin ? 6 : 5} align="center" sx={{ py: 3 }}>No matching records found</TableCell></TableRow>
                  )}
                  {filteredReports.map((report) => (
                    <TableRow key={report.id} hover sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                      <TableCell component="th" scope="row" sx={{ fontWeight: 500, width: '25%' }}>
                        {processingId === report.id ? (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <CircularProgress size={20} />
                            <Typography variant="body2">Processing...</Typography>
                          </Box>
                        ) : (
                          <Box
                            onClick={() => !processingId && handleFileClick(report)}
                            sx={{ cursor: processingId ? 'default' : 'pointer', color: 'primary.main', '&:hover': { textDecoration: 'underline' } }}
                          >
                            {report.file_name || 'Unknown File'}
                          </Box>
                        )}
                      </TableCell>
                      <TableCell>{report.user_name || 'Unknown'}</TableCell>
                      <TableCell>
                        {report.created_at ? new Date(report.created_at).toLocaleString() : 'N/A'}
                      </TableCell>
                      <TableCell>
                        <Select
                          value={report.status || 'Completed'}
                          onChange={(e) => handleStatusChange(report.id, e.target.value)}
                          variant="standard"
                          disableUnderline
                          size="small"
                          sx={{
                            fontSize: '0.875rem',
                            minWidth: 120,
                            '& .MuiSelect-select': { padding: 0 }
                          }}
                          renderValue={(selected) => (
                            <Chip
                              label={selected}
                              color={getStatusColor(selected)}
                              size="small"
                              sx={{ fontWeight: 600, width: '100%', cursor: 'pointer' }}
                            />
                          )}
                        >
                          <MenuItem value="Completed">Completed</MenuItem>
                          <MenuItem value="Pending">Pending</MenuItem>
                          <MenuItem value="In Progress">In Progress</MenuItem>
                          <MenuItem value="Failed">Failed</MenuItem>
                        </Select>
                      </TableCell>
                      <TableCell>{report.report_data?.totalTimeTaken || 'N/A'}</TableCell>
                      {isAdmin && (
                        <TableCell>
                          <Tooltip title="Delete Report">
                            <IconButton onClick={() => handleDeleteClick(report)} color="error" size="small">
                              <DeleteIcon />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Paper>
      </Container>
      <Dialog
        open={openDeleteConfirm}
        onClose={handleCloseDeleteConfirm}
      >
        <DialogTitle>Confirm Deletion</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete the report for "{reportToDelete?.file_name}"? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDeleteConfirm}>Cancel</Button>
          <Button onClick={handleDeleteConfirm} color="error" autoFocus>
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default History;
