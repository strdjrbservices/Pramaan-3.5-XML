import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Stack,
  Button,
  IconButton,
  Tooltip,
  LinearProgress,
  Alert,
  ToggleButtonGroup,
  ToggleButton,
  Card
} from '@mui/material';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';
import ClearIcon from '@mui/icons-material/Clear';
import ViewListIcon from '@mui/icons-material/ViewList';
import ViewModuleIcon from '@mui/icons-material/ViewModule';
import AutoModeIcon from '@mui/icons-material/AutoMode';

import { GridInfoCard } from '../components/FormComponents';
import ActionButtons from '../components/ActionButtons';
import PhotosGallerySection from '../components/PhotosGallerySection';
import MapAndSketchExhibitsSection from '../components/MapAndSketchExhibitsSection';
import ECRComparisonTable from './ECRComparisonTable';
import ECRSalesGridTable from './ECRSalesGridTable';
import ECRMarketTrendsTable from './ECRMarketTrendsTable';
import ECRSiteTable from './ECRSiteTable';
import ECRCertificationTable from './ECRCertificationTable';
import ECRImprovementsTable from './ECRImprovementsTable';
import ECRSummaryTable from './ECRSummaryTable';
import ECRSubjectInfoTable from './ECRSubjectInfoTable';
import { playSound, API_BASE_URL } from '../utils/utils';
import {
  ecrSummaryFields,
  ecrSubjectFields,
  ecrNeighborhoodFields,
  ecrSiteFields,
  ecrImprovementsFields,
  ecrMarketTrendsFields,
  ecrSalesGridAttributes,
  ecrSalesGridNarrativeFields,
  ecrComparableSalesList,
  ecrAnticipatedSalesPriceFields,
  ecrCertificationFields,
  stripPrefix,
  normalize
} from './ecrFields';

const ECR = ({
  data,
  allData,
  extractionAttempted,
  handleDataChange,
  editingField,
  setEditingField,
  isEditable = true,
  highlightedSubjectFields,
  highlightedContractFields,
  highlightedSiteFields,
  comparisonData: externalComparisonData,
  loading: parentLoading,
  loadingSection,
  handleStateRequirementCheck,
  stateReqLoading,
  handleClientRequirementCheck,
  clientReqLoading,
  handleEscalationCheck,
  escalationLoading,
  manualValidations,
  handleManualValidation,
  onSubjectRevisionButtonClick,
  onContractRevisionButtonClick,
  onNeighborhoodRevisionButtonClick,
  onSiteRevisionButtonClick,
  onImprovementsRevisionButtonClick,
  onMarketConditionsRevisionButtonClick,
  onSalesGridRevisionButtonClick,
  onReconciliationRevisionButtonClick,
  onCostApproachRevisionButtonClick,
  onCertificationRevisionButtonClick,
  selectedFile,
  revisionHandlers
}) => {
  const [file1, setFile1] = useState(null);
  const [file2, setFile2] = useState(null);
  const [file1Data, setFile1Data] = useState(data || {});
  const [file2Data, setFile2Data] = useState(externalComparisonData || {});

  const [isComparing, setIsComparing] = useState(false);
  const [compareError, setCompareError] = useState('');
  const [compareSuccess, setCompareSuccess] = useState('');
  const [compareProgress, setCompareProgress] = useState(0);
  const [timer, setTimer] = useState(0);
  const timerRef = useRef(null);

  const [viewMode, setViewMode] = useState('cards');

  const file1InputRef = useRef(null);
  const file2InputRef = useRef(null);

  useEffect(() => {
    if (data && Object.keys(data).length > 0) {
      setFile1Data(data);
    }
  }, [data]);

  useEffect(() => {
    if (externalComparisonData && Object.keys(externalComparisonData).length > 0) {
      setFile2Data(externalComparisonData);
    }
  }, [externalComparisonData]);

  const handleFile1Upload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setFile1(file);
      setCompareError('');
      setCompareSuccess('');
      playSound('upload');
    }
  };

  const handleFile2Upload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setFile2(file);
      setCompareError('');
      setCompareSuccess('');
      playSound('upload');
    }
  };

  const handleClearFile1 = (e) => {
    e.stopPropagation();
    setFile1(null);
    setFile1Data({});
    if (file1InputRef.current) file1InputRef.current.value = '';
  };

  const handleClearFile2 = (e) => {
    e.stopPropagation();
    setFile2(null);
    setFile2Data({});
    if (file2InputRef.current) file2InputRef.current.value = '';
  };

  const handleComparePDFs = async () => {
    if (!file1 && (!file1Data || Object.keys(file1Data).length === 0)) {
      setCompareError('Please select ERC Main Pdf.');
      return;
    }
    if (!file2 && (!file2Data || Object.keys(file2Data).length === 0)) {
      setCompareError('Please select ERC Secondary Pdf.');
      return;
    }

    setIsComparing(true);
    setCompareError('');
    setCompareSuccess('');
    setCompareProgress(10);
    setTimer(0);

    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimer((prev) => prev + 1);
    }, 1000);

    try {
      let extractedData1 = file1Data;
      let extractedData2 = file2Data;

      if (file1) {
        setCompareProgress(25);
        const formData1 = new FormData();
        formData1.append('file', file1);
        formData1.append('form_type', 'ERC');

        const res1 = await fetch(`${API_BASE_URL}/api/extract/`, {
          method: 'POST',
          body: formData1
        });

        if (!res1.ok) {
          throw new Error(`Failed to extract PDF #1 (${file1.name})`);
        }
        const result1 = await res1.json();
        extractedData1 = result1.fields || result1;
        setFile1Data(extractedData1);
      }

      setCompareProgress(60);

      if (file2) {
        const formData2 = new FormData();
        formData2.append('file', file2);
        formData2.append('form_type', 'ERC');

        const res2 = await fetch(`${API_BASE_URL}/api/extract/`, {
          method: 'POST',
          body: formData2
        });

        if (!res2.ok) {
          throw new Error(`Failed to extract PDF #2 (${file2.name})`);
        }
        const result2 = await res2.json();
        extractedData2 = result2.fields || result2;
        setFile2Data(extractedData2);
      }

      setCompareProgress(100);
      setCompareSuccess('Both PDF files successfully extracted and compared!');
      playSound('success');
    } catch (err) {
      console.error('ERC Comparison Error:', err);
      setCompareError(err.message || 'An error occurred during comparison.');
      playSound('error');
    } finally {
      setIsComparing(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const comparisonRows = useMemo(() => {
    const rows = [];

    const addSectionFields = (sectionTitle, fieldsList, obj1 = {}, obj2 = {}) => {
      if (!fieldsList || fieldsList.length === 0) return;

      fieldsList.forEach((field) => {
        const val1 = obj1?.[field] !== undefined ? obj1[field] : (data?.[field] !== undefined ? data[field] : '');
        const val2 = obj2?.[field] !== undefined ? obj2[field] : (file2Data?.[field] !== undefined ? file2Data[field] : '');

        const cleanVal1 = stripPrefix(val1, field);
        const cleanVal2 = stripPrefix(val2, field);

        const norm1 = normalize(val1, field);
        const norm2 = normalize(val2, field);

        let status = 'MATCH';
        if (!norm1 && !norm2) {
          status = 'MATCH';
        } else if (!norm1 && norm2) {
          status = 'MISSING_PDF1';
        } else if (norm1 && !norm2) {
          status = 'MISSING_PDF2';
        } else if (norm1 === norm2) {
          status = 'MATCH';
        } else {
          status = 'MISMATCH';
        }

        rows.push({
          section: sectionTitle,
          field,
          value1: cleanVal1 !== undefined && cleanVal1 !== null ? String(cleanVal1) : '',
          value2: cleanVal2 !== undefined && cleanVal2 !== null ? String(cleanVal2) : '',
          raw1: val1,
          raw2: val2,
          status
        });
      });
    };

    addSectionFields('Summary', ecrSummaryFields, file1Data?.SUMMARY || file1Data, file2Data?.SUMMARY || file2Data);
    addSectionFields('Subject Information', ecrSubjectFields, file1Data?.SUBJECT || file1Data, file2Data?.SUBJECT || file2Data);
    addSectionFields('Neighborhood', ecrNeighborhoodFields, file1Data?.NEIGHBORHOOD || file1Data, file2Data?.NEIGHBORHOOD || file2Data);
    addSectionFields('Site', ecrSiteFields, file1Data?.SITE || file1Data, file2Data?.SITE || file2Data);
    addSectionFields('Description of Improvements', ecrImprovementsFields, file1Data?.IMPROVEMENTS || file1Data, file2Data?.IMPROVEMENTS || file2Data);
    addSectionFields('Market Trends Analysis', ecrMarketTrendsFields, file1Data?.MARKET_TRENDS || file1Data, file2Data?.MARKET_TRENDS || file2Data);

    // Sales Comparison Grid Analysis (Subject + Comparable Sales #1 to #6 + Narrative)
    const salesComp1 = file1Data?.SALES_COMPARISON || file1Data?.SALES_GRID || file1Data || {};
    const salesComp2 = file2Data?.SALES_COMPARISON || file2Data?.SALES_GRID || file2Data || {};

    // 1. Subject Grid Attributes
    addSectionFields(
      'Sales Comparison - Subject',
      ecrSalesGridAttributes,
      salesComp1?.Subject || salesComp1 || {},
      salesComp2?.Subject || salesComp2 || {}
    );

    // 2. Comparable Sales #1 to #6 Grid Attributes
    ecrComparableSalesList.forEach((compKey, idx) => {
      const comp1 = salesComp1?.[compKey] || {};
      const comp2 = salesComp2?.[compKey] || {};
      const hasData = Object.values(comp1).some((v) => v && String(v).trim() !== '') ||
                      Object.values(comp2).some((v) => v && String(v).trim() !== '');
      if (idx < 3 || hasData) {
        addSectionFields(
          `Sales Comparison - Comparable Sale #${idx + 1}`,
          ecrSalesGridAttributes,
          comp1,
          comp2
        );
      }
    });

    // 3. Narrative & Comments
    addSectionFields(
      'Sales Comparison - Narrative & Comments',
      ecrSalesGridNarrativeFields,
      salesComp1,
      salesComp2
    );

    addSectionFields('Anticipated Sales Price', ecrAnticipatedSalesPriceFields, file1Data?.ANTICIPATED_SALES_PRICE || file1Data, file2Data?.ANTICIPATED_SALES_PRICE || file2Data);
    addSectionFields('Appraiser & Certification', ecrCertificationFields, file1Data?.CERTIFICATION || file1Data, file2Data?.CERTIFICATION || file2Data);

    return rows;
  }, [
    file1Data,
    file2Data,
    data
  ]);

  const stats = useMemo(() => {
    const total = comparisonRows.length;
    const matches = comparisonRows.filter((r) => r.status === 'MATCH').length;
    const mismatches = comparisonRows.filter((r) => r.status === 'MISMATCH').length;
    const missing = comparisonRows.filter((r) => r.status === 'MISSING_PDF1' || r.status === 'MISSING_PDF2').length;
    const matchRate = total > 0 ? Math.round((matches / total) * 100) : 100;
    return { total, matches, mismatches, missing, matchRate };
  }, [comparisonRows]);

  const sectionCategoryMap = {
    'Summary': 'SUMMARY',
    'Subject Information': 'SUBJECT',
    'Neighborhood': 'NEIGHBORHOOD',
    'Site': 'SITE',
    'Description of Improvements': 'IMPROVEMENTS',
    'Market Trends Analysis': 'MARKET_TRENDS',
    'Anticipated Sales Price': 'ANTICIPATED_SALES_PRICE',
    'Appraiser & Certification': 'CERTIFICATION'
  };

  const handleComparisonFieldChange = (section, field, fileType, newValue) => {
    // 1. Handle Sales Grid Subject
    if (section === 'Sales Comparison - Subject') {
      if (fileType === 1) {
        setFile1Data((prev) => {
          const next = { ...prev };
          const prevGrid = next.SALES_COMPARISON || next.SALES_GRID || {};
          const nextGrid = {
            ...prevGrid,
            Subject: {
              ...(prevGrid.Subject || {}),
              [field]: newValue
            }
          };
          next.SALES_COMPARISON = nextGrid;
          next.SALES_GRID = nextGrid;
          return next;
        });
        if (handleDataChange) {
          handleDataChange(['SALES_COMPARISON', 'Subject', field], newValue);
        }
      } else if (fileType === 2) {
        setFile2Data((prev) => {
          const next = { ...prev };
          const prevGrid = next.SALES_COMPARISON || next.SALES_GRID || {};
          const nextGrid = {
            ...prevGrid,
            Subject: {
              ...(prevGrid.Subject || {}),
              [field]: newValue
            }
          };
          next.SALES_COMPARISON = nextGrid;
          next.SALES_GRID = nextGrid;
          return next;
        });
      }
      return;
    }

    // 2. Handle Sales Grid Comparable Sales #1 to #6
    const compMatch = section.match(/Sales Comparison - Comparable Sale #(\d+)/i);
    if (compMatch) {
      const compNum = compMatch[1];
      const compKey = `COMPARABLE SALE #${compNum}`;
      if (fileType === 1) {
        setFile1Data((prev) => {
          const next = { ...prev };
          const prevGrid = next.SALES_COMPARISON || next.SALES_GRID || {};
          const nextGrid = {
            ...prevGrid,
            [compKey]: {
              ...(prevGrid[compKey] || {}),
              [field]: newValue
            }
          };
          next.SALES_COMPARISON = nextGrid;
          next.SALES_GRID = nextGrid;
          return next;
        });
        if (handleDataChange) {
          handleDataChange(['SALES_COMPARISON', compKey, field], newValue);
        }
      } else if (fileType === 2) {
        setFile2Data((prev) => {
          const next = { ...prev };
          const prevGrid = next.SALES_COMPARISON || next.SALES_GRID || {};
          const nextGrid = {
            ...prevGrid,
            [compKey]: {
              ...(prevGrid[compKey] || {}),
              [field]: newValue
            }
          };
          next.SALES_COMPARISON = nextGrid;
          next.SALES_GRID = nextGrid;
          return next;
        });
      }
      return;
    }

    // 3. Handle Sales Comparison Narrative & Comments
    if (section === 'Sales Comparison - Narrative & Comments' || section === 'Sales Comparison Analysis') {
      if (fileType === 1) {
        setFile1Data((prev) => {
          const next = { ...prev };
          const prevGrid = next.SALES_COMPARISON || next.SALES_GRID || {};
          const nextGrid = {
            ...prevGrid,
            [field]: newValue
          };
          next.SALES_COMPARISON = nextGrid;
          next.SALES_GRID = nextGrid;
          next[field] = newValue;
          return next;
        });
        if (handleDataChange) {
          handleDataChange(['SALES_COMPARISON', field], newValue);
        }
      } else if (fileType === 2) {
        setFile2Data((prev) => {
          const next = { ...prev };
          const prevGrid = next.SALES_COMPARISON || next.SALES_GRID || {};
          const nextGrid = {
            ...prevGrid,
            [field]: newValue
          };
          next.SALES_COMPARISON = nextGrid;
          next.SALES_GRID = nextGrid;
          next[field] = newValue;
          return next;
        });
      }
      return;
    }

    // 4. Standard Form Sections
    const cat = sectionCategoryMap[section];
    if (fileType === 1) {
      setFile1Data((prev) => {
        const next = { ...prev };
        if (cat) {
          next[cat] = { ...(next[cat] || {}), [field]: newValue };
        }
        next[field] = newValue;
        return next;
      });

      if (handleDataChange) {
        if (cat) {
          handleDataChange([cat, field], newValue);
        } else {
          handleDataChange(field, newValue);
        }
      }
    } else if (fileType === 2) {
      setFile2Data((prev) => {
        const next = { ...prev };
        if (cat) {
          next[cat] = { ...(next[cat] || {}), [field]: newValue };
        }
        next[field] = newValue;
        return next;
      });
    }
  };

  return (
    <Box sx={{ width: '100%', mt: 0.5 }}>
      <ActionButtons
        handleStateRequirementCheck={handleStateRequirementCheck}
        stateReqLoading={stateReqLoading}
        handleClientRequirementCheck={handleClientRequirementCheck}
        clientReqLoading={clientReqLoading}
        handleEscalationCheck={handleEscalationCheck}
        escalationLoading={escalationLoading}
        revisionHandlers={revisionHandlers}
      />

      <Paper
        elevation={3}
        sx={{
          p: 3,
          mb: 3,
          borderRadius: 3,
          background: 'linear-gradient(135deg, rgba(25, 118, 210, 0.05) 0%, rgba(156, 39, 176, 0.05) 100%)',
          border: '1px solid',
          borderColor: 'divider'
        }}
      >
        <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 2 }}>
          <CompareArrowsIcon color="primary" sx={{ fontSize: 32 }} />
          <Box>
            <Typography variant="h5" fontWeight={800} color="primary.main">
              ERC PDF Comparison & Review
            </Typography>
          </Box>
        </Stack>

        <Grid container spacing={2.5} sx={{ mb: 2.5 }}>
          <Grid item xs={12} md={6}>
            <Paper
              variant="outlined"
              onClick={() => file1InputRef.current?.click()}
              sx={{
                p: 2.5,
                borderRadius: 2.5,
                cursor: 'pointer',
                textAlign: 'center',
                borderStyle: file1 || Object.keys(file1Data).length > 0 ? 'solid' : 'dashed',
                borderWidth: 2,
                borderColor: file1 || Object.keys(file1Data).length > 0 ? 'primary.main' : 'divider',
                bgcolor: file1 ? 'rgba(25, 118, 210, 0.04)' : 'background.paper',
                transition: 'all 0.25s ease',
                '&:hover': {
                  borderColor: 'primary.main',
                  transform: 'translateY(-2px)',
                  boxShadow: 3
                }
              }}
            >
              <input
                type="file"
                hidden
                ref={file1InputRef}
                accept=".pdf,application/pdf"
                onChange={handleFile1Upload}
              />
              <Stack direction="row" spacing={2} alignItems="center">
                <Box
                  sx={{
                    p: 1.5,
                    borderRadius: 2,
                    bgcolor: 'primary.main',
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <PictureAsPdfIcon fontSize="large" />
                </Box>
                <Box sx={{ textAlign: 'left', flexGrow: 1, overflow: 'hidden' }}>
                  <Typography variant="subtitle1" fontWeight={700}>
                    ERC Main Pdf
                  </Typography>
                  <Typography
                    variant="body2"
                    color={file1 ? 'text.primary' : 'text.secondary'}
                    noWrap
                    fontWeight={file1 ? 600 : 400}
                  >
                    {file1 ? file1.name : (Object.keys(file1Data).length > 0 ? 'Original PDF Data Loaded' : 'Click or drop PDF')}
                  </Typography>
                  {file1 && (
                    <Typography variant="caption" color="text.secondary">
                      {(file1.size / (1024 * 1024)).toFixed(2)} MB
                    </Typography>
                  )}
                </Box>
                {file1 && (
                  <Tooltip title="Remove PDF 1">
                    <IconButton size="small" onClick={handleClearFile1} color="error">
                      <ClearIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                )}
              </Stack>
            </Paper>
          </Grid>

          <Grid item xs={12} md={6}>
            <Paper
              variant="outlined"
              onClick={() => file2InputRef.current?.click()}
              sx={{
                p: 2.5,
                borderRadius: 2.5,
                cursor: 'pointer',
                textAlign: 'center',
                borderStyle: file2 || Object.keys(file2Data).length > 0 ? 'solid' : 'dashed',
                borderWidth: 2,
                borderColor: file2 || Object.keys(file2Data).length > 0 ? 'secondary.main' : 'divider',
                bgcolor: file2 ? 'rgba(156, 39, 176, 0.04)' : 'background.paper',
                transition: 'all 0.25s ease',
                '&:hover': {
                  borderColor: 'secondary.main',
                  transform: 'translateY(-2px)',
                  boxShadow: 3
                }
              }}
            >
              <input
                type="file"
                hidden
                ref={file2InputRef}
                accept=".pdf,application/pdf"
                onChange={handleFile2Upload}
              />
              <Stack direction="row" spacing={2} alignItems="center">
                <Box
                  sx={{
                    p: 1.5,
                    borderRadius: 2,
                    bgcolor: 'secondary.main',
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <PictureAsPdfIcon fontSize="large" />
                </Box>
                <Box sx={{ textAlign: 'left', flexGrow: 1, overflow: 'hidden' }}>
                  <Typography variant="subtitle1" fontWeight={700}>
                    ERC Secondary Pdf
                  </Typography>
                  <Typography
                    variant="body2"
                    color={file2 ? 'text.primary' : 'text.secondary'}
                    noWrap
                    fontWeight={file2 ? 600 : 400}
                  >
                    {file2 ? file2.name : (Object.keys(file2Data).length > 0 ? 'Comparison PDF Data Loaded' : 'Click or drop PDF')}
                  </Typography>
                  {file2 && (
                    <Typography variant="caption" color="text.secondary">
                      {(file2.size / (1024 * 1024)).toFixed(2)} MB
                    </Typography>
                  )}
                </Box>
                {file2 && (
                  <Tooltip title="Remove PDF 2">
                    <IconButton size="small" onClick={handleClearFile2} color="error">
                      <ClearIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                )}
              </Stack>
            </Paper>
          </Grid>
        </Grid>

        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={2}
          alignItems="center"
          justifyContent="space-between"
        >
          <Button
            variant="contained"
            color="primary"
            size="large"
            startIcon={<AutoModeIcon />}
            onClick={handleComparePDFs}
            disabled={isComparing || (!file1 && Object.keys(file1Data).length === 0) || (!file2 && Object.keys(file2Data).length === 0)}
            sx={{ px: 4, py: 1.2, borderRadius: 2, fontWeight: 700 }}
          >
            {isComparing ? `Extracting & Comparing... (${timer}s)` : 'Extract & Compare Both PDFs'}
          </Button>

          <ToggleButtonGroup
            value={viewMode}
            exclusive
            onChange={(e, val) => val && setViewMode(val)}
            size="small"
            color="primary"
          >
            <ToggleButton value="cards">
              <Stack direction="row" spacing={0.5} alignItems="center">
                <ViewModuleIcon fontSize="small" />
                <Typography variant="caption" fontWeight={600}>Section Cards</Typography>
              </Stack>
            </ToggleButton>
            <ToggleButton value="table">
              <Stack direction="row" spacing={0.5} alignItems="center">
                <ViewListIcon fontSize="small" />
                <Typography variant="caption" fontWeight={600}>Side-by-Side Table</Typography>
              </Stack>
            </ToggleButton>
          </ToggleButtonGroup>
        </Stack>

        {isComparing && (
          <Box sx={{ width: '100%', mt: 2.5 }}>
            <LinearProgress variant="determinate" value={compareProgress} sx={{ height: 8, borderRadius: 4 }} />
            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block', textAlign: 'center' }}>
              Processing document structure and matching corresponding fields... {compareProgress}%
            </Typography>
          </Box>
        )}

        {compareError && (
          <Alert severity="error" sx={{ mt: 2.5 }} onClose={() => setCompareError('')}>
            {compareError}
          </Alert>
        )}

        {compareSuccess && (
          <Alert severity="success" sx={{ mt: 2.5 }} onClose={() => setCompareSuccess('')}>
            {compareSuccess}
          </Alert>
        )}
      </Paper>

      {comparisonRows.length > 0 && (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={6} sm={3}>
            <Card variant="outlined" sx={{ borderRadius: 2.5, textAlign: 'center', p: 1.5 }}>
              <Typography variant="caption" color="text.secondary" fontWeight={600}>
                Total Fields
              </Typography>
              <Typography variant="h5" fontWeight={800} color="text.primary">
                {stats.total}
              </Typography>
            </Card>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Card
              variant="outlined"
              sx={{
                borderRadius: 2.5,
                textAlign: 'center',
                p: 1.5,
                bgcolor: 'rgba(46, 125, 50, 0.05)',
                borderColor: 'rgba(46, 125, 50, 0.3)'
              }}
            >
              <Typography variant="caption" color="success.main" fontWeight={700}>
                Exact Matches
              </Typography>
              <Typography variant="h5" fontWeight={800} color="success.main">
                {stats.matches} ({stats.matchRate}%)
              </Typography>
            </Card>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Card
              variant="outlined"
              sx={{
                borderRadius: 2.5,
                textAlign: 'center',
                p: 1.5,
                bgcolor: 'rgba(211, 47, 47, 0.05)',
                borderColor: 'rgba(211, 47, 47, 0.3)'
              }}
            >
              <Typography variant="caption" color="error.main" fontWeight={700}>
                Value Mismatches
              </Typography>
              <Typography variant="h5" fontWeight={800} color="error.main">
                {stats.mismatches}
              </Typography>
            </Card>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Card
              variant="outlined"
              sx={{
                borderRadius: 2.5,
                textAlign: 'center',
                p: 1.5,
                bgcolor: 'rgba(237, 108, 2, 0.05)',
                borderColor: 'rgba(237, 108, 2, 0.3)'
              }}
            >
              <Typography variant="caption" color="#ed6c02" fontWeight={700}>
                Single-File / Missing
              </Typography>
              <Typography variant="h5" fontWeight={800} color="#ed6c02">
                {stats.missing}
              </Typography>
            </Card>
          </Grid>
        </Grid>
      )}

      {viewMode === 'table' ? (
        <ECRComparisonTable
          comparisonRows={comparisonRows}
          file1Name={file1?.name ? `PDF 1: ${file1.name}` : 'ERC Main Pdf'}
          file2Name={file2?.name ? `PDF 2: ${file2.name}` : 'ERC 2nd Report'}
          onFieldChange={handleComparisonFieldChange}
          isEditable={isEditable}
        />
      ) : (
        <>
          <ECRSummaryTable
            id="summary-section"
            data={file1Data}
            allData={allData}
            extractionAttempted={extractionAttempted}
            handleDataChange={handleDataChange}
            editingField={editingField}
            setEditingField={setEditingField}
            isEditable={isEditable}
            manualValidations={manualValidations}
            handleManualValidation={handleManualValidation}
            onRevisionButtonClick={onSubjectRevisionButtonClick}
            revisionHandlers={revisionHandlers}
          />

          <ECRSubjectInfoTable
            id="subject-info"
            data={file1Data}
            allData={allData}
            extractionAttempted={extractionAttempted}
            handleDataChange={handleDataChange}
            editingField={editingField}
            setEditingField={setEditingField}
            isEditable={isEditable}
            manualValidations={manualValidations}
            handleManualValidation={handleManualValidation}
            onRevisionButtonClick={onSubjectRevisionButtonClick}
            revisionHandlers={revisionHandlers}
          />

          <GridInfoCard
            id="neighborhood-section"
            title="Neighborhood"
            fields={ecrNeighborhoodFields}
            data={file1Data?.NEIGHBORHOOD || file1Data}
            cardClass="bg-info"
            extractionAttempted={extractionAttempted}
            onDataChange={(field, value) => handleDataChange(['NEIGHBORHOOD', ...field], value)}
            editingField={editingField}
            setEditingField={setEditingField}
            isEditable={isEditable}
            allData={allData}
            loading={parentLoading}
            loadingSection={loadingSection}
            manualValidations={manualValidations}
            handleManualValidation={handleManualValidation}
            onRevisionButtonClick={onNeighborhoodRevisionButtonClick}
            revisionHandlers={revisionHandlers}
            showBlankValidation={extractionAttempted}
          />

          <ECRSiteTable
            id="site-section"
            data={file1Data}
            allData={allData}
            extractionAttempted={extractionAttempted}
            handleDataChange={handleDataChange}
            editingField={editingField}
            setEditingField={setEditingField}
            isEditable={isEditable}
            manualValidations={manualValidations}
            handleManualValidation={handleManualValidation}
            onRevisionButtonClick={onSiteRevisionButtonClick}
            revisionHandlers={revisionHandlers}
          />

          <ECRImprovementsTable
            id="improvements-section"
            data={file1Data}
            allData={allData}
            extractionAttempted={extractionAttempted}
            handleDataChange={handleDataChange}
            editingField={editingField}
            setEditingField={setEditingField}
            isEditable={isEditable}
            manualValidations={manualValidations}
            handleManualValidation={handleManualValidation}
            onRevisionButtonClick={onImprovementsRevisionButtonClick}
            revisionHandlers={revisionHandlers}
          />

          <ECRMarketTrendsTable
            id="market-trends-section"
            data={file1Data}
            allData={allData}
            extractionAttempted={extractionAttempted}
            handleDataChange={handleDataChange}
            editingField={editingField}
            setEditingField={setEditingField}
            isEditable={isEditable}
            manualValidations={manualValidations}
            handleManualValidation={handleManualValidation}
            onRevisionButtonClick={onMarketConditionsRevisionButtonClick || onNeighborhoodRevisionButtonClick}
            revisionHandlers={revisionHandlers}
          />

          <ECRSalesGridTable
            id="sales-comparison-section"
            data={file1Data}
            comparisonData={file2Data}
            file1Name={file1?.name ? `PDF 1 (${file1.name})` : 'PDF 1'}
            file2Name={file2?.name ? `PDF 2 (${file2.name})` : 'PDF 2'}
            allData={allData}
            extractionAttempted={extractionAttempted}
            handleDataChange={handleDataChange}
            editingField={editingField}
            setEditingField={setEditingField}
            isEditable={isEditable}
            manualValidations={manualValidations}
            handleManualValidation={handleManualValidation}
            onRevisionButtonClick={onSalesGridRevisionButtonClick}
            revisionHandlers={revisionHandlers}
          />

          <GridInfoCard
            id="anticipated-sales-price-section"
            title="Anticipated Sales Price"
            fields={ecrAnticipatedSalesPriceFields}
            data={file1Data?.ANTICIPATED_SALES_PRICE || file1Data}
            cardClass="bg-success"
            extractionAttempted={extractionAttempted}
            onDataChange={(field, value) => handleDataChange(['ANTICIPATED_SALES_PRICE', ...field], value)}
            editingField={editingField}
            setEditingField={setEditingField}
            isEditable={isEditable}
            allData={allData}
            loading={parentLoading}
            loadingSection={loadingSection}
            manualValidations={manualValidations}
            handleManualValidation={handleManualValidation}
            onRevisionButtonClick={onReconciliationRevisionButtonClick}
            revisionHandlers={revisionHandlers}
            showBlankValidation={extractionAttempted}
          />

          <ECRCertificationTable
            id="certifications-section"
            data={file1Data}
            allData={allData}
            extractionAttempted={extractionAttempted}
            handleDataChange={handleDataChange}
            editingField={editingField}
            setEditingField={setEditingField}
            isEditable={isEditable}
            manualValidations={manualValidations}
            handleManualValidation={handleManualValidation}
            onRevisionButtonClick={onCertificationRevisionButtonClick}
            revisionHandlers={revisionHandlers}
          />

          <MapAndSketchExhibitsSection id="map-sketch-exhibits-section" data={file1Data} allData={allData} selectedFile={selectedFile || file1} />
          <PhotosGallerySection id="photos-exhibits-section" data={file1Data} allData={allData} extractedPhotos={allData?.EXTRACTED_PHOTOS || file1Data?.EXTRACTED_PHOTOS || []} />
        </>
      )}
    </Box>
  );
};

export default ECR;
