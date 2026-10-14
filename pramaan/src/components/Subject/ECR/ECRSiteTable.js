import React from 'react';
import {
  Paper,
  Box,
  Typography,
  Grid,
  Table,
  TableBody,
  TableCell,
  // TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  IconButton,
  // Divider,
  Stack
} from '@mui/material';
import LibraryBooksIcon from '@mui/icons-material/LibraryBooks';
import LandscapeIcon from '@mui/icons-material/Landscape';
import { EditableField } from '../components/FormComponents';

export const ECRSiteTable = ({
  id = "site-section",
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
  const siteData = data?.SITE || data || {};

  const getFieldVal = (field) => {
    return siteData?.[field] !== undefined ? siteData[field] : (data?.[field] || '');
  };

  const utilitiesList = [
    { label: "Electric:", key: "Electric" },
    { label: "Gas:", key: "Gas" },
    { label: "Water:", key: "Water" },
    { label: "San. Sewer:", key: "San. Sewer:" }
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
      {/* Header Bar */}
      <Box
        sx={{
          bgcolor: '#263238',
          color: 'white',
          px: 2,
          py: 0.8,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}
      >
        <Box display="flex" alignItems="center" gap={1}>
          <LandscapeIcon fontSize="small" />
          <Typography variant="subtitle2" fontWeight="bold">
            SITE ANALYSIS
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
        {/* Row 1: Dimensions, Site Area, Corner Lot, Flood, Street Access/Maint, Gated */}
        <Grid container spacing={1.5} sx={{ mb: 1.5, p: 1.5, bgcolor: 'grey.50', borderRadius: 1.5, border: '1px solid #e0e0e0' }}>
          <Grid item xs={12} sm={6} md={3}>
            <Typography variant="caption" fontWeight={700} color="text.secondary">Dimensions:</Typography>
            <EditableField
              fieldPath={['SITE', 'Dimensions:']}
              value={getFieldVal('Dimensions:') || getFieldVal('Dimensions')}
              onDataChange={handleDataChange}
              editingField={editingField}
              setEditingField={setEditingField}
              isEditable={isEditable}
              allData={allData || data}
              revisionHandlers={revisionHandlers}
            />
          </Grid>

          <Grid item xs={6} sm={3} md={2}>
            <Typography variant="caption" fontWeight={700} color="text.secondary">Site Area:</Typography>
            <EditableField
              fieldPath={['SITE', 'Site Area:']}
              value={getFieldVal('Site Area:') || getFieldVal('Site Area')}
              onDataChange={handleDataChange}
              editingField={editingField}
              setEditingField={setEditingField}
              isEditable={isEditable}
              allData={allData || data}
              revisionHandlers={revisionHandlers}
            />
          </Grid>

          <Grid item xs={6} sm={3} md={2}>
            <Typography variant="caption" fontWeight={700} color="text.secondary">Corner Lot:</Typography>
            <EditableField
              fieldPath={['SITE', 'Corner Lot']}
              value={getFieldVal('Corner Lot')}
              onDataChange={handleDataChange}
              editingField={editingField}
              setEditingField={setEditingField}
              isEditable={isEditable}
              allData={allData || data}
              revisionHandlers={revisionHandlers}
            />
          </Grid>

          <Grid item xs={6} sm={3} md={2.5}>
            <Typography variant="caption" fontWeight={700} color="text.secondary">Street Access:</Typography>
            <EditableField
              fieldPath={['SITE', 'Street Access:']}
              value={getFieldVal('Street Access:') || getFieldVal('Street Access')}
              onDataChange={handleDataChange}
              editingField={editingField}
              setEditingField={setEditingField}
              isEditable={isEditable}
              allData={allData || data}
              revisionHandlers={revisionHandlers}
            />
          </Grid>

          <Grid item xs={6} sm={3} md={2.5}>
            <Typography variant="caption" fontWeight={700} color="text.secondary">Street Maintenance:</Typography>
            <EditableField
              fieldPath={['SITE', 'Street Maintenance:']}
              value={getFieldVal('Street Maintenance:') || getFieldVal('Street Maintenance')}
              onDataChange={handleDataChange}
              editingField={editingField}
              setEditingField={setEditingField}
              isEditable={isEditable}
              allData={allData || data}
              revisionHandlers={revisionHandlers}
            />
          </Grid>

          <Grid item xs={12} sm={8} md={8}>
            <Typography variant="caption" fontWeight={700} color="text.secondary">FEMA Special Flood Hazard Area?</Typography>
            <EditableField
              fieldPath={['SITE', 'FEMA Special Flood Hazard Area?']}
              value={getFieldVal('FEMA Special Flood Hazard Area?') || getFieldVal('FEMA Special Flood Hazard Area')}
              onDataChange={handleDataChange}
              editingField={editingField}
              setEditingField={setEditingField}
              isEditable={isEditable}
              allData={allData || data}
              revisionHandlers={revisionHandlers}
            />
          </Grid>

          <Grid item xs={12} sm={4} md={4}>
            <Typography variant="caption" fontWeight={700} color="text.secondary">Gated:</Typography>
            <EditableField
              fieldPath={['SITE', 'Gated']}
              value={getFieldVal('Gated')}
              onDataChange={handleDataChange}
              editingField={editingField}
              setEditingField={setEditingField}
              isEditable={isEditable}
              allData={allData || data}
              revisionHandlers={revisionHandlers}
            />
          </Grid>
        </Grid>

        {/* Row 2: Zoning Classification, Zoning Description, Present Use Permitted */}
        <Grid container spacing={1.5} sx={{ mb: 1.5, p: 1.5, bgcolor: 'grey.50', borderRadius: 1.5, border: '1px solid #e0e0e0' }}>
          <Grid item xs={12} sm={4} md={3}>
            <Typography variant="caption" fontWeight={700} color="text.secondary">Specific Zoning Classification:</Typography>
            <EditableField
              fieldPath={['SITE', 'Specific Zoning Classification:']}
              value={getFieldVal('Specific Zoning Classification:') || getFieldVal('Specific Zoning Classification')}
              onDataChange={handleDataChange}
              editingField={editingField}
              setEditingField={setEditingField}
              isEditable={isEditable}
              allData={allData || data}
              revisionHandlers={revisionHandlers}
            />
          </Grid>

          <Grid item xs={12} sm={8} md={5}>
            <Typography variant="caption" fontWeight={700} color="text.secondary">Zoning Description:</Typography>
            <EditableField
              fieldPath={['SITE', 'Zoning Description:']}
              value={getFieldVal('Zoning Description:') || getFieldVal('Zoning Description')}
              onDataChange={handleDataChange}
              editingField={editingField}
              setEditingField={setEditingField}
              isEditable={isEditable}
              allData={allData || data}
              revisionHandlers={revisionHandlers}
            />
          </Grid>

          <Grid item xs={12} sm={12} md={4}>
            <Typography variant="caption" fontWeight={700} color="text.secondary">Is present use permitted by zoning regulations?</Typography>
            <EditableField
              fieldPath={['SITE', 'Is present use permitted by zoning regulations?']}
              value={getFieldVal('Is present use permitted by zoning regulations?')}
              onDataChange={handleDataChange}
              editingField={editingField}
              setEditingField={setEditingField}
              isEditable={isEditable}
              allData={allData || data}
              revisionHandlers={revisionHandlers}
            />
          </Grid>
        </Grid>

        {/* Row 3: 3 Columns (Utilities | Topography & Site | Adverse Conditions & Surfaces) */}
        <Grid container spacing={1.5} sx={{ mb: 1.5 }}>
          {/* Column 1: Utilities Table */}
          <Grid item xs={12} md={4}>
            <Paper variant="outlined" sx={{ p: 1.5, height: '100%', borderRadius: 1.5 }}>
              <Typography variant="subtitle2" fontWeight={800} sx={{ mb: 1, color: 'primary.main' }}>
                Utilities
              </Typography>
              <Table size="small" sx={{ '& td': { py: 0.6, px: 0.5, borderBottom: '1px solid #eee' } }}>
                <TableHead>
                  <TableRow sx={{ bgcolor: 'grey.100' }}>
                    <TableCell sx={{ fontWeight: 700, width: '35%' }}>Utility</TableCell>
                    <TableCell sx={{ fontWeight: 700, width: '65%' }}>Status / Description</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {utilitiesList.map((u) => {
                    const val = getFieldVal(u.key) || getFieldVal(u.label);
                    return (
                      <TableRow key={u.key}>
                        <TableCell sx={{ fontWeight: 600, fontSize: '0.82rem' }}>{u.label}</TableCell>
                        <TableCell>
                          <EditableField
                            fieldPath={['SITE', u.key]}
                            value={val}
                            onDataChange={handleDataChange}
                            editingField={editingField}
                            setEditingField={setEditingField}
                            isEditable={isEditable}
                            allData={allData || data}
                            revisionHandlers={revisionHandlers}
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </Paper>
          </Grid>

          {/* Column 2: Topography, Shape, View, Landscaping, Drainage */}
          <Grid item xs={12} md={4}>
            <Paper variant="outlined" sx={{ p: 1.5, height: '100%', borderRadius: 1.5 }}>
              <Typography variant="subtitle2" fontWeight={800} sx={{ mb: 1, color: 'primary.main' }}>
                Topography & Site Features
              </Typography>
              <Stack spacing={1}>
                <Box>
                  <Typography variant="caption" fontWeight={700} color="text.secondary">Topography:</Typography>
                  <EditableField
                    fieldPath={['SITE', 'Topography:']}
                    value={getFieldVal('Topography:') || getFieldVal('Topography')}
                    onDataChange={handleDataChange}
                    editingField={editingField}
                    setEditingField={setEditingField}
                    isEditable={isEditable}
                    allData={allData || data}
                    revisionHandlers={revisionHandlers}
                  />
                </Box>
                <Box>
                  <Typography variant="caption" fontWeight={700} color="text.secondary">Shape:</Typography>
                  <EditableField
                    fieldPath={['SITE', 'Shape:']}
                    value={getFieldVal('Shape:') || getFieldVal('Shape')}
                    onDataChange={handleDataChange}
                    editingField={editingField}
                    setEditingField={setEditingField}
                    isEditable={isEditable}
                    allData={allData || data}
                    revisionHandlers={revisionHandlers}
                  />
                </Box>
                <Box>
                  <Typography variant="caption" fontWeight={700} color="text.secondary">View:</Typography>
                  <EditableField
                    fieldPath={['SITE', 'View']}
                    value={getFieldVal('View') || getFieldVal('View:')}
                    onDataChange={handleDataChange}
                    editingField={editingField}
                    setEditingField={setEditingField}
                    isEditable={isEditable}
                    allData={allData || data}
                    revisionHandlers={revisionHandlers}
                  />
                </Box>
                <Box>
                  <Typography variant="caption" fontWeight={700} color="text.secondary">Landscaping:</Typography>
                  <EditableField
                    fieldPath={['SITE', 'Landscaping:']}
                    value={getFieldVal('Landscaping:') || getFieldVal('Landscaping')}
                    onDataChange={handleDataChange}
                    editingField={editingField}
                    setEditingField={setEditingField}
                    isEditable={isEditable}
                    allData={allData || data}
                    revisionHandlers={revisionHandlers}
                  />
                </Box>
                <Box>
                  <Typography variant="caption" fontWeight={700} color="text.secondary">Drainage:</Typography>
                  <EditableField
                    fieldPath={['SITE', 'Drainage:']}
                    value={getFieldVal('Drainage:') || getFieldVal('Drainage')}
                    onDataChange={handleDataChange}
                    editingField={editingField}
                    setEditingField={setEditingField}
                    isEditable={isEditable}
                    allData={allData || data}
                    revisionHandlers={revisionHandlers}
                  />
                </Box>
              </Stack>
            </Paper>
          </Grid>

          {/* Column 3: Adverse Conditions & Surfaces */}
          <Grid item xs={12} md={4}>
            <Paper variant="outlined" sx={{ p: 1.5, height: '100%', borderRadius: 1.5 }}>
              <Typography variant="subtitle2" fontWeight={800} sx={{ mb: 1, color: 'primary.main' }}>
                Adverse Conditions & Surfaces
              </Typography>
              <Stack spacing={1}>
                <Box>
                  <Typography variant="caption" fontWeight={700} color="text.secondary">Adverse Easements/Encroachments:</Typography>
                  <EditableField
                    fieldPath={['SITE', 'Adverse Easements/Encroachments:']}
                    value={getFieldVal('Adverse Easements/Encroachments:') || getFieldVal('Adverse Easements/Encroachments')}
                    onDataChange={handleDataChange}
                    editingField={editingField}
                    setEditingField={setEditingField}
                    isEditable={isEditable}
                    allData={allData || data}
                    revisionHandlers={revisionHandlers}
                  />
                </Box>
                <Box>
                  <Typography variant="caption" fontWeight={700} color="text.secondary">Adverse External Conditions:</Typography>
                  <EditableField
                    fieldPath={['SITE', 'Adverse External Conditions:']}
                    value={getFieldVal('Adverse External Conditions:') || getFieldVal('Adverse External Conditions')}
                    onDataChange={handleDataChange}
                    editingField={editingField}
                    setEditingField={setEditingField}
                    isEditable={isEditable}
                    allData={allData || data}
                    revisionHandlers={revisionHandlers}
                  />
                </Box>
                <Box>
                  <Typography variant="caption" fontWeight={700} color="text.secondary">Adverse Environmental Conditions:</Typography>
                  <EditableField
                    fieldPath={['SITE', 'Adverse Environmental Conditions:']}
                    value={getFieldVal('Adverse Environmental Conditions:') || getFieldVal('Adverse Environmental Conditions')}
                    onDataChange={handleDataChange}
                    editingField={editingField}
                    setEditingField={setEditingField}
                    isEditable={isEditable}
                    allData={allData || data}
                    revisionHandlers={revisionHandlers}
                  />
                </Box>
                <Box>
                  <Typography variant="caption" fontWeight={700} color="text.secondary">Street Surface:</Typography>
                  <EditableField
                    fieldPath={['SITE', 'Street Surface:']}
                    value={getFieldVal('Street Surface:') || getFieldVal('Street Surface')}
                    onDataChange={handleDataChange}
                    editingField={editingField}
                    setEditingField={setEditingField}
                    isEditable={isEditable}
                    allData={allData || data}
                    revisionHandlers={revisionHandlers}
                  />
                </Box>
                <Box>
                  <Typography variant="caption" fontWeight={700} color="text.secondary">Driveway Surface:</Typography>
                  <EditableField
                    fieldPath={['SITE', 'Driveway Surface:']}
                    value={getFieldVal('Driveway Surface:') || getFieldVal('Driveway Surface')}
                    onDataChange={handleDataChange}
                    editingField={editingField}
                    setEditingField={setEditingField}
                    isEditable={isEditable}
                    allData={allData || data}
                    revisionHandlers={revisionHandlers}
                  />
                </Box>
                <Box>
                  <Typography variant="caption" fontWeight={700} color="text.secondary">Alley:</Typography>
                  <EditableField
                    fieldPath={['SITE', 'Alley:']}
                    value={getFieldVal('Alley:') || getFieldVal('Alley')}
                    onDataChange={handleDataChange}
                    editingField={editingField}
                    setEditingField={setEditingField}
                    isEditable={isEditable}
                    allData={allData || data}
                    revisionHandlers={revisionHandlers}
                  />
                </Box>
              </Stack>
            </Paper>
          </Grid>
        </Grid>

        {/* Row 4: Narrative Comment Discussion */}
        <Box sx={{ mb: 1.5, p: 1.5, bgcolor: 'grey.50', borderRadius: 1.5, border: '1px solid #e0e0e0' }}>
          <Typography variant="caption" fontWeight={700} color="text.secondary">
            Discuss positive and negative site characteristics impacting the subject property’s marketability (e.g., site utility, conformity, site improvements, leasehold, adverse conditions, etc):
          </Typography>
          <EditableField
            fieldPath={['SITE', 'Discuss positive and negative site characteristics impacting the subject property’s marketability (e.g., site utility, conformity, site improvements, leasehold, adverse conditions, etc)']}
            value={getFieldVal('Discuss positive and negative site characteristics impacting the subject property’s marketability (e.g., site utility, conformity, site improvements, leasehold, adverse conditions, etc)')}
            onDataChange={handleDataChange}
            editingField={editingField}
            setEditingField={setEditingField}
            isEditable={isEditable}
            allData={allData || data}
            multiline={true}
            rows={3}
            revisionHandlers={revisionHandlers}
          />
        </Box>

        {/* Row 5: Overall Site Appeal Rating */}
        <Box sx={{ p: 1.5, bgcolor: '#eceff1', borderRadius: 1.5, border: '1px solid #cfd8dc', display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography variant="subtitle2" fontWeight={800} color="text.primary">
            Overall Site Appeal Rating:
          </Typography>
          <Box sx={{ flexGrow: 1, maxWidth: 300 }}>
            <EditableField
              fieldPath={['SITE', 'Overall Site Appeal Rating:']}
              value={getFieldVal('Overall Site Appeal Rating:') || getFieldVal('Overall Site Appeal Rating')}
              onDataChange={handleDataChange}
              editingField={editingField}
              setEditingField={setEditingField}
              isEditable={isEditable}
              allData={allData || data}
              revisionHandlers={revisionHandlers}
            />
          </Box>
        </Box>
      </Box>
    </Paper>
  );
};

export default ECRSiteTable;
