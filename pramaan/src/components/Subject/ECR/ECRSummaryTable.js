import React from 'react';
import {
  Paper,
  Box,
  Typography,
  Grid,
  Tooltip,
  IconButton,
  Divider,
  Stack
} from '@mui/material';
import DescriptionIcon from '@mui/icons-material/Description';
import LibraryBooksIcon from '@mui/icons-material/LibraryBooks';
import { EditableField } from '../components/FormComponents';

export const ECRSummaryTable = ({
  id = "summary-section",
  data = {},
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
  const sumData = data?.SUMMARY || data || {};

  const getFieldVal = (field) => {
    return sumData?.[field] !== undefined ? sumData[field] : (data?.[field] || '');
  };

  const checklistItems = [
    { label: "Mandatory Inspections", key: "Mandatory Inspections" },
    { label: "Adverse Easements/Encroachments", key: "Adverse Easements/Encroachments" },
    { label: "Adverse External Conditions", key: "Adverse External Conditions" },
    { label: "Adverse Environmental Conditions", key: "Adverse Environmental Conditions" },
    { label: "Apparent Modifications to Dwelling", key: "Apparent Modifications to Dwelling" },
    { label: "Adverse Conditions Requiring Inspections", key: "Adverse Conditions Requiring Inspections" },
    { label: "Recommended Repairs and/or Improvements", key: "Recommended Repairs and/or Improvements" },
    { label: "New Construction Competition", key: "New Construction Competition" },
    { label: "Distressed Market Competition", key: "Distressed Market Competition" },
    { label: "Prevalence of Seller Concessions", key: "Prevalence of Seller Concessions" },
    { label: "Adverse Financing Conditions", key: "Adverse Financing Conditions" }
  ];

  return (
    <Paper
      id={id}
      elevation={2}
      sx={{
        mb: 2,
        borderRadius: 2,
        overflow: 'hidden',
        border: '1px solid',
        borderColor: 'divider'
      }}
    >
      <Box
        sx={{
          bgcolor: 'primary.dark',
          color: 'white',
          px: 2,
          py: 0.8,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}
      >
        <Box display="flex" alignItems="center" gap={1}>
          <DescriptionIcon fontSize="small" />
          <Typography variant="subtitle2" fontWeight="bold">
            SUMMARY & SALIENT FACTS AND CONCLUSIONS
          </Typography>
        </Box>
        {onRevisionButtonClick && (
          <Tooltip title="Revision Language">
            <IconButton onClick={onRevisionButtonClick} size="small" sx={{ color: 'white', ml: 'auto', p: 0.5 }}>
              <LibraryBooksIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
      </Box>

      <Box sx={{ p: 1.2 }}>
        <Paper variant="outlined" sx={{ p: 1, mb: 1.2, bgcolor: 'grey.50', borderRadius: 1.5 }}>
          <Grid container spacing={1.5} sx={{ mb: 1.5 }}>
            <Grid item xs={12} sm={8} md={8}>
              <Typography variant="caption" fontWeight={700} color="text.secondary">Client:</Typography>
              <EditableField
                fieldPath={['SUMMARY', 'Client:']}
                value={getFieldVal('Client:') || getFieldVal('Client')}
                onDataChange={handleDataChange}
                editingField={editingField}
                setEditingField={setEditingField}
                isEditable={isEditable}
                allData={allData || data}
                revisionHandlers={revisionHandlers}
              />
            </Grid>
            <Grid item xs={12} sm={4} md={4}>
              <Typography variant="caption" fontWeight={700} color="text.secondary">Client File #:</Typography>
              <EditableField
                fieldPath={['SUMMARY', 'Client File #:']}
                value={getFieldVal('Client File #:') || getFieldVal('Client File #')}
                onDataChange={handleDataChange}
                editingField={editingField}
                setEditingField={setEditingField}
                isEditable={isEditable}
                allData={allData || data}
                revisionHandlers={revisionHandlers}
              />
            </Grid>

            <Grid item xs={12} sm={6} md={5}>
              <Typography variant="caption" fontWeight={700} color="text.secondary">Client Address:</Typography>
              <EditableField
                fieldPath={['SUMMARY', 'Client Address:']}
                value={getFieldVal('Client Address:') || getFieldVal('Client Address')}
                onDataChange={handleDataChange}
                editingField={editingField}
                setEditingField={setEditingField}
                isEditable={isEditable}
                allData={allData || data}
                revisionHandlers={revisionHandlers}
              />
            </Grid>
            <Grid item xs={6} sm={3} md={3}>
              <Typography variant="caption" fontWeight={700} color="text.secondary">City:</Typography>
              <EditableField
                fieldPath={['SUMMARY', 'Client City:']}
                value={getFieldVal('Client City:') || getFieldVal('Client City')}
                onDataChange={handleDataChange}
                editingField={editingField}
                setEditingField={setEditingField}
                isEditable={isEditable}
                allData={allData || data}
                revisionHandlers={revisionHandlers}
              />
            </Grid>
            <Grid item xs={3} sm={1.5} md={2}>
              <Typography variant="caption" fontWeight={700} color="text.secondary">State:</Typography>
              <EditableField
                fieldPath={['SUMMARY', 'Client State:']}
                value={getFieldVal('Client State:') || getFieldVal('Client State')}
                onDataChange={handleDataChange}
                editingField={editingField}
                setEditingField={setEditingField}
                isEditable={isEditable}
                allData={allData || data}
                revisionHandlers={revisionHandlers}
              />
            </Grid>
            <Grid item xs={3} sm={1.5} md={2}>
              <Typography variant="caption" fontWeight={700} color="text.secondary">Zip Code:</Typography>
              <EditableField
                fieldPath={['SUMMARY', 'Client Zip Code:']}
                value={getFieldVal('Client Zip Code:') || getFieldVal('Client Zip Code')}
                onDataChange={handleDataChange}
                editingField={editingField}
                setEditingField={setEditingField}
                isEditable={isEditable}
                allData={allData || data}
                revisionHandlers={revisionHandlers}
              />
            </Grid>
          </Grid>

          <Divider sx={{ my: 1 }} />

          <Grid container spacing={1.5} sx={{ mb: 1.5 }}>
            <Grid item xs={12} sm={6}>
              <Typography variant="caption" fontWeight={700} color="text.secondary">Transferee:</Typography>
              <EditableField
                fieldPath={['SUMMARY', 'Transferee:']}
                value={getFieldVal('Transferee:') || getFieldVal('Transferee')}
                onDataChange={handleDataChange}
                editingField={editingField}
                setEditingField={setEditingField}
                isEditable={isEditable}
                allData={allData || data}
                revisionHandlers={revisionHandlers}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="caption" fontWeight={700} color="text.secondary">Owner(s) of Record:</Typography>
              <EditableField
                fieldPath={['SUMMARY', 'Owner(s) of Record:']}
                value={getFieldVal('Owner(s) of Record:') || getFieldVal('Owner(s) of Record')}
                onDataChange={handleDataChange}
                editingField={editingField}
                setEditingField={setEditingField}
                isEditable={isEditable}
                allData={allData || data}
                revisionHandlers={revisionHandlers}
              />
            </Grid>
          </Grid>

          <Grid container spacing={1.5} sx={{ mb: 1.5 }}>
            <Grid item xs={12} sm={6} md={5}>
              <Typography variant="caption" fontWeight={700} color="text.secondary">Subject Property Address:</Typography>
              <EditableField
                fieldPath={['SUMMARY', 'Subject Property Address:']}
                value={getFieldVal('Subject Property Address:') || getFieldVal('Subject Property Address')}
                onDataChange={handleDataChange}
                editingField={editingField}
                setEditingField={setEditingField}
                isEditable={isEditable}
                allData={allData || data}
                revisionHandlers={revisionHandlers}
              />
            </Grid>
            <Grid item xs={6} sm={2} md={1.5}>
              <Typography variant="caption" fontWeight={700} color="text.secondary">Unit:</Typography>
              <EditableField
                fieldPath={['SUMMARY', 'Unit:']}
                value={getFieldVal('Unit:') || getFieldVal('Unit')}
                onDataChange={handleDataChange}
                editingField={editingField}
                setEditingField={setEditingField}
                isEditable={isEditable}
                allData={allData || data}
                revisionHandlers={revisionHandlers}
              />
            </Grid>
            <Grid item xs={6} sm={4} md={2}>
              <Typography variant="caption" fontWeight={700} color="text.secondary">County:</Typography>
              <EditableField
                fieldPath={['SUMMARY', 'Subject County:']}
                value={getFieldVal('Subject County:') || getFieldVal('Subject County')}
                onDataChange={handleDataChange}
                editingField={editingField}
                setEditingField={setEditingField}
                isEditable={isEditable}
                allData={allData || data}
                revisionHandlers={revisionHandlers}
              />
            </Grid>
            <Grid item xs={6} sm={4} md={2}>
              <Typography variant="caption" fontWeight={700} color="text.secondary">City:</Typography>
              <EditableField
                fieldPath={['SUMMARY', 'Subject City:']}
                value={getFieldVal('Subject City:') || getFieldVal('Subject City')}
                onDataChange={handleDataChange}
                editingField={editingField}
                setEditingField={setEditingField}
                isEditable={isEditable}
                allData={allData || data}
                revisionHandlers={revisionHandlers}
              />
            </Grid>
            <Grid item xs={3} sm={1} md={0.75}>
              <Typography variant="caption" fontWeight={700} color="text.secondary">State:</Typography>
              <EditableField
                fieldPath={['SUMMARY', 'Subject State:']}
                value={getFieldVal('Subject State:') || getFieldVal('Subject State')}
                onDataChange={handleDataChange}
                editingField={editingField}
                setEditingField={setEditingField}
                isEditable={isEditable}
                allData={allData || data}
                revisionHandlers={revisionHandlers}
              />
            </Grid>
            <Grid item xs={3} sm={1} md={0.75}>
              <Typography variant="caption" fontWeight={700} color="text.secondary">Zip:</Typography>
              <EditableField
                fieldPath={['SUMMARY', 'Subject Zip Code:']}
                value={getFieldVal('Subject Zip Code:') || getFieldVal('Subject Zip Code')}
                onDataChange={handleDataChange}
                editingField={editingField}
                setEditingField={setEditingField}
                isEditable={isEditable}
                allData={allData || data}
                revisionHandlers={revisionHandlers}
              />
            </Grid>
          </Grid>

          <Divider sx={{ my: 1 }} />

          <Grid container spacing={1.5}>
            <Grid item xs={12} sm={8} md={8}>
              <Typography variant="caption" fontWeight={700} color="text.secondary">Appraiser Company Name:</Typography>
              <EditableField
                fieldPath={['SUMMARY', 'Appraiser Company Name:']}
                value={getFieldVal('Appraiser Company Name:') || getFieldVal('Appraiser Company Name')}
                onDataChange={handleDataChange}
                editingField={editingField}
                setEditingField={setEditingField}
                isEditable={isEditable}
                allData={allData || data}
                revisionHandlers={revisionHandlers}
              />
            </Grid>
            <Grid item xs={12} sm={4} md={4}>
              <Typography variant="caption" fontWeight={700} color="text.secondary">Appraiser File #:</Typography>
              <EditableField
                fieldPath={['SUMMARY', 'Appraiser File #:']}
                value={getFieldVal('Appraiser File #:') || getFieldVal('Appraiser File #')}
                onDataChange={handleDataChange}
                editingField={editingField}
                setEditingField={setEditingField}
                isEditable={isEditable}
                allData={allData || data}
                revisionHandlers={revisionHandlers}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <Typography variant="caption" fontWeight={700} color="text.secondary">Appraiser(s):</Typography>
              <EditableField
                fieldPath={['SUMMARY', 'Appraiser(s):']}
                value={getFieldVal('Appraiser(s):') || getFieldVal('Appraiser(s)')}
                onDataChange={handleDataChange}
                editingField={editingField}
                setEditingField={setEditingField}
                isEditable={isEditable}
                allData={allData || data}
                revisionHandlers={revisionHandlers}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="caption" fontWeight={700} color="text.secondary">Co-appraiser (if applicable):</Typography>
              <EditableField
                fieldPath={['SUMMARY', 'Co-appraiser (if applicable)']}
                value={getFieldVal('Co-appraiser (if applicable)')}
                onDataChange={handleDataChange}
                editingField={editingField}
                setEditingField={setEditingField}
                isEditable={isEditable}
                allData={allData || data}
                revisionHandlers={revisionHandlers}
              />
            </Grid>

            <Grid item xs={12} sm={4}>
              <Typography variant="caption" fontWeight={700} color="text.secondary">Ph. #:</Typography>
              <EditableField
                fieldPath={['SUMMARY', 'Appraiser Ph. #:']}
                value={getFieldVal('Appraiser Ph. #:') || getFieldVal('Appraiser Ph. #')}
                onDataChange={handleDataChange}
                editingField={editingField}
                setEditingField={setEditingField}
                isEditable={isEditable}
                allData={allData || data}
                revisionHandlers={revisionHandlers}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <Typography variant="caption" fontWeight={700} color="text.secondary">Fax #:</Typography>
              <EditableField
                fieldPath={['SUMMARY', 'Appraiser Fax #:']}
                value={getFieldVal('Appraiser Fax #:') || getFieldVal('Appraiser Fax #')}
                onDataChange={handleDataChange}
                editingField={editingField}
                setEditingField={setEditingField}
                isEditable={isEditable}
                allData={allData || data}
                revisionHandlers={revisionHandlers}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <Typography variant="caption" fontWeight={700} color="text.secondary">E-mail:</Typography>
              <EditableField
                fieldPath={['SUMMARY', 'Appraiser E-mail:']}
                value={getFieldVal('Appraiser E-mail:') || getFieldVal('Appraiser E-mail')}
                onDataChange={handleDataChange}
                editingField={editingField}
                setEditingField={setEditingField}
                isEditable={isEditable}
                allData={allData || data}
                revisionHandlers={revisionHandlers}
              />
            </Grid>
          </Grid>
        </Paper>

        <Box sx={{ mb: 1, bgcolor: '#b0bec5', py: 0.8, px: 2, textAlign: 'center', borderRadius: 1 }}>
          <Typography variant="subtitle2" fontWeight={800} letterSpacing={0.5}>
            SALIENT FACTS AND CONCLUSIONS
          </Typography>
        </Box>

        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <Paper variant="outlined" sx={{ p: 2, height: '100%', borderRadius: 1.5, bgcolor: 'background.paper' }}>
              <Stack spacing={1.5}>
                <Box>
                  <Typography variant="caption" fontWeight={700} color="primary.main">Anticipated Sales Price: $</Typography>
                  <EditableField
                    fieldPath={['SUMMARY', 'Anticipated Sales Price: $']}
                    value={getFieldVal('Anticipated Sales Price: $') || getFieldVal('Anticipated Sales Price')}
                    onDataChange={handleDataChange}
                    editingField={editingField}
                    setEditingField={setEditingField}
                    isEditable={isEditable}
                    allData={allData || data}
                    revisionHandlers={revisionHandlers}
                  />
                </Box>

                <Box>
                  <Typography variant="caption" fontWeight={700} color="text.secondary">Assignment Marketing Period:</Typography>
                  <EditableField
                    fieldPath={['SUMMARY', 'Assignment Marketing Period:']}
                    value={getFieldVal('Assignment Marketing Period:') || getFieldVal('Assignment Marketing Period')}
                    onDataChange={handleDataChange}
                    editingField={editingField}
                    setEditingField={setEditingField}
                    isEditable={isEditable}
                    allData={allData || data}
                    revisionHandlers={revisionHandlers}
                  />
                </Box>

                <Grid container spacing={1}>
                  <Grid item xs={6}>
                    <Typography variant="caption" fontWeight={700} color="text.secondary">Appearance:</Typography>
                    <EditableField
                      fieldPath={['SUMMARY', 'Appearance:']}
                      value={getFieldVal('Appearance:') || getFieldVal('Appearance')}
                      onDataChange={handleDataChange}
                      editingField={editingField}
                      setEditingField={setEditingField}
                      isEditable={isEditable}
                      allData={allData || data}
                      revisionHandlers={revisionHandlers}
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="caption" fontWeight={700} color="text.secondary">Effective Date:</Typography>
                    <EditableField
                      fieldPath={['SUMMARY', 'Date of Value Opinion (Effective Date):']}
                      value={getFieldVal('Date of Value Opinion (Effective Date):') || getFieldVal('Date of Value Opinion (Effective Date)')}
                      onDataChange={handleDataChange}
                      editingField={editingField}
                      setEditingField={setEditingField}
                      isEditable={isEditable}
                      allData={allData || data}
                      revisionHandlers={revisionHandlers}
                    />
                  </Grid>
                </Grid>

                <Divider sx={{ my: 0.5 }} />

                <Typography variant="subtitle2" fontWeight={800} color="text.primary">
                  Subject Property Listing Information:
                </Typography>
                <Grid container spacing={1}>
                  <Grid item xs={6}>
                    <Typography variant="caption" fontWeight={700} color="text.secondary">Currently Listed?</Typography>
                    <EditableField
                      fieldPath={['SUMMARY', 'Is the subject property currently listed?']}
                      value={getFieldVal('Is the subject property currently listed?')}
                      onDataChange={handleDataChange}
                      editingField={editingField}
                      setEditingField={setEditingField}
                      isEditable={isEditable}
                      allData={allData || data}
                      revisionHandlers={revisionHandlers}
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="caption" fontWeight={700} color="text.secondary">Current List Price: $</Typography>
                    <EditableField
                      fieldPath={['SUMMARY', 'Current List Price: $']}
                      value={getFieldVal('Current List Price: $') || getFieldVal('Current List Price')}
                      onDataChange={handleDataChange}
                      editingField={editingField}
                      setEditingField={setEditingField}
                      isEditable={isEditable}
                      allData={allData || data}
                      revisionHandlers={revisionHandlers}
                    />
                  </Grid>
                </Grid>

                <Divider sx={{ my: 0.5 }} />

                <Typography variant="subtitle2" fontWeight={800} color="text.primary">
                  Description of Improvements:
                </Typography>
                <Grid container spacing={1}>
                  <Grid item xs={3}>
                    <Typography variant="caption" fontWeight={700} color="text.secondary">Actual Age:</Typography>
                    <EditableField
                      fieldPath={['SUMMARY', 'Actual Age (Yrs.):']}
                      value={getFieldVal('Actual Age (Yrs.):') || getFieldVal('Actual Age')}
                      onDataChange={handleDataChange}
                      editingField={editingField}
                      setEditingField={setEditingField}
                      isEditable={isEditable}
                      allData={allData || data}
                      revisionHandlers={revisionHandlers}
                    />
                  </Grid>
                  <Grid item xs={3}>
                    <Typography variant="caption" fontWeight={700} color="text.secondary">Bedrooms:</Typography>
                    <EditableField
                      fieldPath={['SUMMARY', 'Bedrooms:']}
                      value={getFieldVal('Bedrooms:') || getFieldVal('Bedrooms')}
                      onDataChange={handleDataChange}
                      editingField={editingField}
                      setEditingField={setEditingField}
                      isEditable={isEditable}
                      allData={allData || data}
                      revisionHandlers={revisionHandlers}
                    />
                  </Grid>
                  <Grid item xs={3}>
                    <Typography variant="caption" fontWeight={700} color="text.secondary">Baths:</Typography>
                    <EditableField
                      fieldPath={['SUMMARY', 'Baths:']}
                      value={getFieldVal('Baths:') || getFieldVal('Baths')}
                      onDataChange={handleDataChange}
                      editingField={editingField}
                      setEditingField={setEditingField}
                      isEditable={isEditable}
                      allData={allData || data}
                      revisionHandlers={revisionHandlers}
                    />
                  </Grid>
                  <Grid item xs={3}>
                    <Typography variant="caption" fontWeight={700} color="text.secondary">GLA (sq ft):</Typography>
                    <EditableField
                      fieldPath={['SUMMARY', 'Gross Living Area:']}
                      value={getFieldVal('Gross Living Area:') || getFieldVal('Gross Living Area')}
                      onDataChange={handleDataChange}
                      editingField={editingField}
                      setEditingField={setEditingField}
                      isEditable={isEditable}
                      allData={allData || data}
                      revisionHandlers={revisionHandlers}
                    />
                  </Grid>
                </Grid>
              </Stack>
            </Paper>
          </Grid>

          <Grid item xs={12} md={6}>
            <Paper variant="outlined" sx={{ p: 2, height: '100%', borderRadius: 1.5, bgcolor: 'background.paper' }}>
              <Stack spacing={0.8}>
                {checklistItems.map((item) => (
                  <Box
                    key={item.key}
                    display="flex"
                    alignItems="center"
                    justifyContent="space-between"
                    sx={{ pb: 0.5, borderBottom: '1px solid #eee' }}
                  >
                    <Box display="flex" alignItems="center" gap={1} sx={{ maxWidth: '65%' }}>
                      <Typography variant="caption" fontWeight={600} color="text.primary">
                        {item.label}
                      </Typography>
                    </Box>
                    <Box sx={{ width: '35%' }}>
                      <EditableField
                        fieldPath={['SUMMARY', item.key]}
                        value={getFieldVal(item.key)}
                        onDataChange={handleDataChange}
                        editingField={editingField}
                        setEditingField={setEditingField}
                        isEditable={isEditable}
                        allData={allData || data}
                        revisionHandlers={revisionHandlers}
                      />
                    </Box>
                  </Box>
                ))}
              </Stack>
            </Paper>
          </Grid>

          <Grid item xs={12}>
            <Paper variant="outlined" sx={{ p: 1.5, bgcolor: '#eceff1', borderRadius: 1.5 }}>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={4}>
                  <Typography variant="caption" fontWeight={800} color="text.primary">Overall Historic Price Trend:</Typography>
                  <EditableField
                    fieldPath={['SUMMARY', 'Overall Historic Price Trend']}
                    value={getFieldVal('Overall Historic Price Trend') || getFieldVal('Overall Historic Price Trend:')}
                    onDataChange={handleDataChange}
                    editingField={editingField}
                    setEditingField={setEditingField}
                    isEditable={isEditable}
                    allData={allData || data}
                    revisionHandlers={revisionHandlers}
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Typography variant="caption" fontWeight={800} color="text.primary">Current Supply/Demand:</Typography>
                  <EditableField
                    fieldPath={['SUMMARY', 'Current Supply/Demand:']}
                    value={getFieldVal('Current Supply/Demand:') || getFieldVal('Current Supply/Demand')}
                    onDataChange={handleDataChange}
                    editingField={editingField}
                    setEditingField={setEditingField}
                    isEditable={isEditable}
                    allData={allData || data}
                    revisionHandlers={revisionHandlers}
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Typography variant="caption" fontWeight={800} color="text.primary">Forecasted Price Trend:</Typography>
                  <EditableField
                    fieldPath={['SUMMARY', 'Forecasted Price Trend:']}
                    value={getFieldVal('Forecasted Price Trend:') || getFieldVal('Forecasted Price Trend')}
                    onDataChange={handleDataChange}
                    editingField={editingField}
                    setEditingField={setEditingField}
                    isEditable={isEditable}
                    allData={allData || data}
                    revisionHandlers={revisionHandlers}
                  />
                </Grid>
              </Grid>
            </Paper>
          </Grid>
        </Grid>
      </Box>
    </Paper>
  );
};

export default ECRSummaryTable;
