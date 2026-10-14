import React, { useState, useMemo } from 'react';
import {
  Paper,
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  IconButton,
  Chip,
  FormControlLabel,
  Switch,
  Stack,
  Button,
  Collapse
} from '@mui/material';
import LibraryBooksIcon from '@mui/icons-material/LibraryBooks';
import DifferenceIcon from '@mui/icons-material/Difference';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import { EditableField, GridInfoCard } from '../components/FormComponents';
import {
  ecrSalesGridAttributes,
  ecrSalesGridNarrativeFields,
  ecrComparableSalesList,
  stripPrefix,
  normalize
} from './ecrFields';

export const ECRSalesGridTable = ({
  id = "sales-comparison-section",
  data = {},
  comparisonData = {},
  file1Name = 'PDF 1',
  file2Name = 'PDF 2',
  allData,
  extractionAttempted,
  handleDataChange,
  editingField,
  setEditingField,
  isEditable = true,
  manualValidations,
  handleManualValidation,
  onRevisionButtonClick,
  revisionHandlers
}) => {
  const comparableSales = ecrComparableSalesList;
  const gridData = useMemo(() => data?.SALES_COMPARISON || data?.SALES_GRID || data || {}, [data]);
  const compGridData = useMemo(() => comparisonData?.SALES_COMPARISON || comparisonData?.SALES_GRID || comparisonData || {}, [comparisonData]);

  const hasComparisonData = useMemo(() => {
    return Boolean(
      (compGridData.Subject && Object.keys(compGridData.Subject).length > 0) ||
      comparableSales.some((sale) => compGridData[sale] && Object.keys(compGridData[sale]).length > 0)
    );
  }, [compGridData, comparableSales]);

  const [showGridFields, setShowGridFields] = useState(true);
  const [highlightDiffs, setHighlightDiffs] = useState(true);

  // Compute total grid differences
  const diffCount = useMemo(() => {
    if (!hasComparisonData) return 0;
    let count = 0;

    // Check Subject
    ecrSalesGridAttributes.forEach((attr) => {
      const v1 = gridData?.Subject?.[attr] || gridData?.[attr] || '';
      const v2 = compGridData?.Subject?.[attr] || compGridData?.[attr] || '';
      if (normalize(v1, attr) !== normalize(v2, attr)) {
        count++;
      }
    });

    // Check Comps 1..6
    comparableSales.forEach((sale) => {
      ecrSalesGridAttributes.forEach((attr) => {
        const v1 = gridData?.[sale]?.[attr] || '';
        const v2 = compGridData?.[sale]?.[attr] || '';
        if (normalize(v1, attr) !== normalize(v2, attr)) {
          count++;
        }
      });
    });

    return count;
  }, [gridData, compGridData, hasComparisonData, comparableSales]);

  const handleCopyFromComp = (propKey, attr, valueToCopy) => {
    if (handleDataChange) {
      handleDataChange(['SALES_COMPARISON', propKey, attr], valueToCopy);
    }
  };

  return (
    <Box sx={{ mb: 2 }}>
      {/* 1. SALES COMPARISON GRID TABLE (Subject + Comps 1-6) */}
      <Paper
        id={id}
        elevation={2}
        sx={{
          mb: 1.5,
          borderRadius: 2,
          overflow: 'hidden',
          border: '1px solid',
          borderColor: 'divider'
        }}
      >
        <Box
          sx={{
            bgcolor: 'primary.main',
            color: 'white',
            px: 2,
            py: 0.8,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            position: 'sticky',
            top: 0,
            zIndex: 10,
            flexWrap: 'wrap',
            gap: 1
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box>
              <Typography variant="subtitle2" fontWeight="bold">
                Sales Comparison Analysis Grid
              </Typography>
              <Typography variant="caption" sx={{ opacity: 0.9 }}>
                Subject Property & Comparable Sales #1 – #6 ({ecrSalesGridAttributes.length} Fields)
              </Typography>
            </Box>
          </Box>

          <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap">
            {/* Show / Hide Sales Grid Fields Button */}
            <Button
              size="small"
              variant="outlined"
              onClick={() => setShowGridFields((prev) => !prev)}
              startIcon={showGridFields ? <VisibilityOffIcon sx={{ fontSize: '1rem !important' }} /> : <VisibilityIcon sx={{ fontSize: '1rem !important' }} />}
              sx={{
                color: 'white',
                borderColor: 'rgba(255, 255, 255, 0.5)',
                textTransform: 'none',
                fontSize: '0.78rem',
                fontWeight: 700,
                py: 0.3,
                px: 1.5,
                borderRadius: 1.5,
                bgcolor: showGridFields ? 'rgba(255, 255, 255, 0.12)' : 'rgba(255, 255, 255, 0.28)',
                '&:hover': {
                  borderColor: 'white',
                  bgcolor: 'rgba(255, 255, 255, 0.25)'
                }
              }}
            >
              {showGridFields ? 'Hide Sales Grid Fields' : 'Show Sales Grid Fields'}
            </Button>

            {hasComparisonData && showGridFields && (
              <>
                <Chip
                  size="small"
                  icon={<DifferenceIcon sx={{ color: 'white !important', fontSize: '1rem' }} />}
                  label={`${diffCount} Grid Diffs vs ${file2Name}`}
                  sx={{
                    bgcolor: diffCount > 0 ? 'rgba(211, 47, 47, 0.85)' : 'rgba(46, 125, 50, 0.85)',
                    color: 'white',
                    fontWeight: 700,
                    fontSize: '0.75rem'
                  }}
                />

                <FormControlLabel
                  control={
                    <Switch
                      size="small"
                      checked={highlightDiffs}
                      onChange={(e) => setHighlightDiffs(e.target.checked)}
                      sx={{
                        '& .MuiSwitch-switchBase.Mui-checked': { color: '#ffca28' },
                        '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { backgroundColor: '#ffca28' }
                      }}
                    />
                  }
                  label={
                    <Typography variant="caption" sx={{ color: 'white', fontWeight: 600 }}>
                      Highlight Diffs
                    </Typography>
                  }
                  sx={{ m: 0 }}
                />
              </>
            )}

            {onRevisionButtonClick && (
              <Tooltip title="Revision Language">
                <IconButton onClick={onRevisionButtonClick} size="small" sx={{ color: 'white', p: 0.5 }}>
                  <LibraryBooksIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
          </Stack>
        </Box>

        {/* Collapsible Sales Grid Table */}
        <Collapse in={showGridFields} unmountOnExit={false}>
          <TableContainer sx={{ maxHeight: 750 }}>
          <Table size="small" stickyHeader aria-label="ERC sales comparison grid" sx={{ minWidth: 900 }}>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 700, minWidth: 200, bgcolor: 'grey.100', borderRight: '1px solid #e0e0e0' }}>
                  Feature / Grid Attribute
                </TableCell>
                <TableCell sx={{ fontWeight: 700, minWidth: 170, bgcolor: '#e3f2fd', borderRight: '1px solid #e0e0e0', color: 'primary.dark' }}>
                  Subject
                </TableCell>
                {comparableSales.map((sale, idx) => (
                  <TableCell
                    key={sale}
                    sx={{
                      fontWeight: 700,
                      minWidth: 170,
                      bgcolor: idx % 2 === 0 ? 'grey.50' : 'background.paper',
                      borderRight: '1px solid #e0e0e0'
                    }}
                  >
                    Comp #{idx + 1}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {ecrSalesGridAttributes.map((attr, idx) => {
                const isHighlight = attr === 'Sales Price' || attr === 'Adjusted Sales Price' || attr === 'Net Adjustment';

                // Check Subject difference
                const subjVal1 = gridData?.Subject?.[attr] || gridData?.[attr] || '';
                const subjVal2 = compGridData?.Subject?.[attr] || compGridData?.[attr] || '';
                const subjDiff = hasComparisonData && highlightDiffs && (normalize(subjVal1, attr) !== normalize(subjVal2, attr));

                return (
                  <TableRow
                    key={attr}
                    hover
                    sx={{
                      bgcolor: isHighlight ? 'rgba(25, 118, 210, 0.04)' : (idx % 2 === 0 ? 'transparent' : 'rgba(0,0,0,0.015)')
                    }}
                  >
                    {/* Feature Label */}
                    <TableCell
                      sx={{
                        fontWeight: isHighlight ? 700 : 500,
                        fontSize: '0.85rem',
                        borderRight: '1px solid #e0e0e0',
                        color: isHighlight ? 'primary.main' : 'text.primary'
                      }}
                    >
                      {attr}
                    </TableCell>

                    {/* Subject Column */}
                    <TableCell
                      sx={{
                        borderRight: '1px solid #e0e0e0',
                        bgcolor: subjDiff
                          ? 'rgba(255, 235, 238, 0.6)'
                          : isHighlight
                            ? 'rgba(227, 242, 253, 0.5)'
                            : 'inherit',
                        borderLeft: subjDiff ? '3px solid #d32f2f' : undefined,
                        fontSize: '0.85rem'
                      }}
                    >
                      <EditableField
                        fieldPath={['SALES_COMPARISON', 'Subject', attr]}
                        value={subjVal1}
                        onDataChange={handleDataChange}
                        editingField={editingField}
                        setEditingField={setEditingField}
                        isEditable={isEditable}
                        allData={allData || data}
                        saleName="Subject"
                        manualValidations={manualValidations}
                        handleManualValidation={handleManualValidation}
                        revisionHandlers={revisionHandlers}
                      />

                      {subjDiff && (
                        <Box
                          sx={{
                            mt: 0.5,
                            p: 0.5,
                            bgcolor: 'rgba(211, 47, 47, 0.08)',
                            borderRadius: 1,
                            border: '1px dashed rgba(211, 47, 47, 0.5)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between'
                          }}
                        >
                          <Typography
                            variant="caption"
                            sx={{ color: '#c62828', fontWeight: 600, fontSize: '0.72rem', wordBreak: 'break-word' }}
                          >
                            {file2Name}: {stripPrefix(subjVal2, attr) || '(Empty)'}
                          </Typography>
                          {isEditable && subjVal2 && (
                            <Tooltip title={`Apply ${file2Name} value to PDF 1`}>
                              <IconButton
                                size="small"
                                onClick={() => handleCopyFromComp('Subject', attr, stripPrefix(subjVal2, attr))}
                                sx={{ p: 0.2, color: 'error.main' }}
                              >
                                <ContentCopyIcon sx={{ fontSize: 13 }} />
                              </IconButton>
                            </Tooltip>
                          )}
                        </Box>
                      )}
                    </TableCell>

                    {/* Comparable Sales Columns 1 to 6 */}
                    {comparableSales.map((sale) => {
                      const compData1 = gridData?.[sale] || {};
                      const compVal1 = compData1[attr] || '';
                      const compData2 = compGridData?.[sale] || {};
                      const compVal2 = compData2[attr] || '';

                      const compDiff = hasComparisonData && highlightDiffs && (normalize(compVal1, attr) !== normalize(compVal2, attr));

                      return (
                        <TableCell
                          key={sale}
                          sx={{
                            borderRight: '1px solid #e0e0e0',
                            bgcolor: compDiff
                              ? 'rgba(255, 235, 238, 0.6)'
                              : 'inherit',
                            borderLeft: compDiff ? '3px solid #d32f2f' : undefined,
                            fontSize: '0.85rem'
                          }}
                        >
                          <EditableField
                            fieldPath={['SALES_COMPARISON', sale, attr]}
                            value={compVal1}
                            onDataChange={handleDataChange}
                            editingField={editingField}
                            setEditingField={setEditingField}
                            isEditable={isEditable}
                            allData={allData || data}
                            saleName={sale}
                            manualValidations={manualValidations}
                            handleManualValidation={handleManualValidation}
                            revisionHandlers={revisionHandlers}
                          />

                          {compDiff && (
                            <Box
                              sx={{
                                mt: 0.5,
                                p: 0.5,
                                bgcolor: 'rgba(211, 47, 47, 0.08)',
                                borderRadius: 1,
                                border: '1px dashed rgba(211, 47, 47, 0.5)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between'
                              }}
                            >
                              <Typography
                                variant="caption"
                                sx={{ color: '#c62828', fontWeight: 600, fontSize: '0.72rem', wordBreak: 'break-word' }}
                              >
                                {file2Name}: {stripPrefix(compVal2, attr) || '(Empty)'}
                              </Typography>
                              {isEditable && compVal2 && (
                                <Tooltip title={`Apply ${file2Name} value to PDF 1`}>
                                  <IconButton
                                    size="small"
                                    onClick={() => handleCopyFromComp(sale, attr, stripPrefix(compVal2, attr))}
                                    sx={{ p: 0.2, color: 'error.main' }}
                                  >
                                    <ContentCopyIcon sx={{ fontSize: 13 }} />
                                  </IconButton>
                                </Tooltip>
                              )}
                            </Box>
                          )}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          </TableContainer>
        </Collapse>

        {!showGridFields && (
          <Box
            onClick={() => setShowGridFields(true)}
            sx={{
              p: 2,
              textAlign: 'center',
              bgcolor: 'rgba(25, 118, 210, 0.04)',
              cursor: 'pointer',
              borderTop: '1px solid',
              borderColor: 'divider',
              transition: 'background-color 0.2s',
              '&:hover': { bgcolor: 'rgba(25, 118, 210, 0.08)' }
            }}
          >
            <Typography variant="body2" color="primary.main" fontWeight={600}>
              Sales Comparison Grid is currently hidden ({ecrSalesGridAttributes.length} attributes for Subject & Comps #1–#6). Click here or the button above to expand.
            </Typography>
          </Box>
        )}
      </Paper>

      {/* 2. COMPARABLE DISCUSSIONS & RECONCILIATION CARD */}
      <GridInfoCard
        id="sales-comparison-narratives"
        title="Comparable Discussions & Reconciliation"
        fields={ecrSalesGridNarrativeFields}
        data={gridData}
        cardClass="bg-primary"
        usePre={true}
        extractionAttempted={extractionAttempted}
        onDataChange={(field, value) => handleDataChange(['SALES_COMPARISON', ...field], value)}
        editingField={editingField}
        setEditingField={setEditingField}
        isEditable={isEditable}
        allData={allData}
        manualValidations={manualValidations}
        handleManualValidation={handleManualValidation}
        onRevisionButtonClick={onRevisionButtonClick}
        revisionHandlers={revisionHandlers}
        showBlankValidation={extractionAttempted}
      />
    </Box>
  );
};

export default ECRSalesGridTable;

