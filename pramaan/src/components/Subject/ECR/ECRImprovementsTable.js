import React from 'react';
import {
  Paper,
  Box,
  Typography,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  IconButton,
  // Divider,
  Stack
} from '@mui/material';
import BuildIcon from '@mui/icons-material/Build';
import LibraryBooksIcon from '@mui/icons-material/LibraryBooks';
import { EditableField } from '../components/FormComponents';

export const ECRImprovementsTable = ({
  id = "improvements-section",
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
  const impData = data?.IMPROVEMENTS || data || {};

  const getFieldVal = (field) => {
    return impData?.[field] !== undefined ? impData[field] : (data?.[field] || '');
  };

  const roomLevels = [
    { label: "Level 1", key: "Level 1" },
    { label: "Level 2", key: "Level 2" },
    { label: "Level 3", key: "Level 3" },
    { label: "Basement (Not included in GLA)", key: "Basement", notInGLA: true },
    { label: "Attic (Not included in GLA)", key: "Attic", notInGLA: true }
  ];

  const ratingCategories = [
    { label: "Exterior Appeal", key: "Exterior Appeal" },
    { label: "Quality of Construction", key: "Quality of Construction" },
    { label: "Condition", key: "Condition" },
    { label: "Interior Appeal/Décor", key: "Interior Appeal/Décor" },
    { label: "Functional Utility", key: "Functional Utility" }
  ];

  return (
    <Box sx={{ mb: 2 }} id={id}>
      <Paper
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
            bgcolor: 'success.dark',
            color: 'white',
            px: 2,
            py: 0.8,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}
        >
          <Box display="flex" alignItems="center" gap={1}>
            <BuildIcon fontSize="small" />
            <Typography variant="subtitle2" fontWeight="bold">
              DESCRIPTION OF IMPROVEMENTS
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
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={3}>
              <Paper variant="outlined" sx={{ p: 1.5, height: '100%', borderRadius: 1.5, bgcolor: 'grey.50' }}>
                <Typography variant="subtitle2" fontWeight={800} color="primary.main" sx={{ mb: 1 }}>
                  General
                </Typography>
                <Stack spacing={1}>
                  <Box>
                    <Typography variant="caption" fontWeight={700} color="text.secondary">Existing / New Construction:</Typography>
                    <EditableField
                      fieldPath={['IMPROVEMENTS', 'Existing Construction:']}
                      value={getFieldVal('Existing Construction:') || getFieldVal('Existing Construction')}
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
                      <Typography variant="caption" fontWeight={700} color="text.secondary">Year Built:</Typography>
                      <EditableField
                        fieldPath={['IMPROVEMENTS', 'Year Built']}
                        value={getFieldVal('Year Built')}
                        onDataChange={handleDataChange}
                        editingField={editingField}
                        setEditingField={setEditingField}
                        isEditable={isEditable}
                        allData={allData || data}
                        revisionHandlers={revisionHandlers}
                      />
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="caption" fontWeight={700} color="text.secondary">Completed:</Typography>
                      <EditableField
                        fieldPath={['IMPROVEMENTS', 'Completed']}
                        value={getFieldVal('Completed')}
                        onDataChange={handleDataChange}
                        editingField={editingField}
                        setEditingField={setEditingField}
                        isEditable={isEditable}
                        allData={allData || data}
                        revisionHandlers={revisionHandlers}
                      />
                    </Grid>
                  </Grid>

                  <Grid container spacing={1}>
                    <Grid item xs={6}>
                      <Typography variant="caption" fontWeight={700} color="text.secondary">Actual Age (Yrs.):</Typography>
                      <EditableField
                        fieldPath={['IMPROVEMENTS', 'Actual Age (Yrs.):']}
                        value={getFieldVal('Actual Age (Yrs.):') || getFieldVal('Actual Age')}
                        onDataChange={handleDataChange}
                        editingField={editingField}
                        setEditingField={setEditingField}
                        isEditable={isEditable}
                        allData={allData || data}
                        revisionHandlers={revisionHandlers}
                      />
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="caption" fontWeight={700} color="text.secondary">Effective Age (Yrs.):</Typography>
                      <EditableField
                        fieldPath={['IMPROVEMENTS', 'Effective Age (Yrs.):']}
                        value={getFieldVal('Effective Age (Yrs.):') || getFieldVal('Effective Age')}
                        onDataChange={handleDataChange}
                        editingField={editingField}
                        setEditingField={setEditingField}
                        isEditable={isEditable}
                        allData={allData || data}
                        revisionHandlers={revisionHandlers}
                      />
                    </Grid>
                  </Grid>

                  <Grid container spacing={1}>
                    <Grid item xs={6}>
                      <Typography variant="caption" fontWeight={700} color="text.secondary">Attached / Detached:</Typography>
                      <EditableField
                        fieldPath={['IMPROVEMENTS', 'Detached:']}
                        value={getFieldVal('Detached:') || getFieldVal('Detached') || getFieldVal('Attached:') || getFieldVal('Attached')}
                        onDataChange={handleDataChange}
                        editingField={editingField}
                        setEditingField={setEditingField}
                        isEditable={isEditable}
                        allData={allData || data}
                        revisionHandlers={revisionHandlers}
                      />
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="caption" fontWeight={700} color="text.secondary">No. of Units / Stories:</Typography>
                      <EditableField
                        fieldPath={['IMPROVEMENTS', 'No. of Stories']}
                        value={getFieldVal('No. of Stories') || getFieldVal('No. of Units')}
                        onDataChange={handleDataChange}
                        editingField={editingField}
                        setEditingField={setEditingField}
                        isEditable={isEditable}
                        allData={allData || data}
                        revisionHandlers={revisionHandlers}
                      />
                    </Grid>
                  </Grid>

                  <Box>
                    <Typography variant="caption" fontWeight={700} color="text.secondary">Manufact. Housing:</Typography>
                    <EditableField
                      fieldPath={['IMPROVEMENTS', 'Manufact. Housing']}
                      value={getFieldVal('Manufact. Housing') || getFieldVal('If yes, type:')}
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

            <Grid item xs={12} sm={6} md={3}>
              <Paper variant="outlined" sx={{ p: 1.5, height: '100%', borderRadius: 1.5, bgcolor: 'grey.50' }}>
                <Typography variant="subtitle2" fontWeight={800} color="primary.main" sx={{ mb: 1 }}>
                  Exterior
                </Typography>
                <Stack spacing={1}>
                  <Box>
                    <Typography variant="caption" fontWeight={700} color="text.secondary">Architectural Style:</Typography>
                    <EditableField
                      fieldPath={['IMPROVEMENTS', 'Architectural Style']}
                      value={getFieldVal('Architectural Style')}
                      onDataChange={handleDataChange}
                      editingField={editingField}
                      setEditingField={setEditingField}
                      isEditable={isEditable}
                      allData={allData || data}
                      revisionHandlers={revisionHandlers}
                    />
                  </Box>
                  <Box>
                    <Typography variant="caption" fontWeight={700} color="text.secondary">Roofing Material:</Typography>
                    <EditableField
                      fieldPath={['IMPROVEMENTS', 'Roofing Material:']}
                      value={getFieldVal('Roofing Material:') || getFieldVal('Roofing Material')}
                      onDataChange={handleDataChange}
                      editingField={editingField}
                      setEditingField={setEditingField}
                      isEditable={isEditable}
                      allData={allData || data}
                      revisionHandlers={revisionHandlers}
                    />
                  </Box>
                  <Box>
                    <Typography variant="caption" fontWeight={700} color="text.secondary">Wall Material:</Typography>
                    <EditableField
                      fieldPath={['IMPROVEMENTS', 'Wall Material']}
                      value={getFieldVal('Wall Material')}
                      onDataChange={handleDataChange}
                      editingField={editingField}
                      setEditingField={setEditingField}
                      isEditable={isEditable}
                      allData={allData || data}
                      revisionHandlers={revisionHandlers}
                    />
                  </Box>
                  <Box>
                    <Typography variant="caption" fontWeight={700} color="text.secondary">Window Type / Storm / Screens:</Typography>
                    <EditableField
                      fieldPath={['IMPROVEMENTS', 'Window Type:']}
                      value={getFieldVal('Window Type:') || getFieldVal('Window Type')}
                      onDataChange={handleDataChange}
                      editingField={editingField}
                      setEditingField={setEditingField}
                      isEditable={isEditable}
                      allData={allData || data}
                      revisionHandlers={revisionHandlers}
                    />
                  </Box>
                  <Box>
                    <Typography variant="caption" fontWeight={700} color="text.secondary">Gutters / Downspouts:</Typography>
                    <EditableField
                      fieldPath={['IMPROVEMENTS', 'Gutters/Downspouts:']}
                      value={getFieldVal('Gutters/Downspouts:') || getFieldVal('Gutters/Downspouts')}
                      onDataChange={handleDataChange}
                      editingField={editingField}
                      setEditingField={setEditingField}
                      isEditable={isEditable}
                      allData={allData || data}
                      revisionHandlers={revisionHandlers}
                    />
                  </Box>
                  <Box>
                    <Typography variant="caption" fontWeight={700} color="text.secondary">Exterior Amenities (Patio, Deck, Fence, etc.):</Typography>
                    <EditableField
                      fieldPath={['IMPROVEMENTS', 'Exterior Amenities']}
                      value={getFieldVal('Exterior Amenities')}
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

            <Grid item xs={12} sm={6} md={3}>
              <Paper variant="outlined" sx={{ p: 1.5, height: '100%', borderRadius: 1.5, bgcolor: 'grey.50' }}>
                <Typography variant="subtitle2" fontWeight={800} color="primary.main" sx={{ mb: 1 }}>
                  Interior & Bath
                </Typography>
                <Stack spacing={1}>
                  <Box>
                    <Typography variant="caption" fontWeight={700} color="text.secondary">Floors (Carpet, Vinyl, Tile, Wood):</Typography>
                    <EditableField
                      fieldPath={['IMPROVEMENTS', 'Floor']}
                      value={getFieldVal('Floor') || getFieldVal('Floors')}
                      onDataChange={handleDataChange}
                      editingField={editingField}
                      setEditingField={setEditingField}
                      isEditable={isEditable}
                      allData={allData || data}
                      revisionHandlers={revisionHandlers}
                    />
                  </Box>
                  <Box>
                    <Typography variant="caption" fontWeight={700} color="text.secondary">Walls (Drywall, Plaster):</Typography>
                    <EditableField
                      fieldPath={['IMPROVEMENTS', 'Walls']}
                      value={getFieldVal('Walls')}
                      onDataChange={handleDataChange}
                      editingField={editingField}
                      setEditingField={setEditingField}
                      isEditable={isEditable}
                      allData={allData || data}
                      revisionHandlers={revisionHandlers}
                    />
                  </Box>
                  <Box>
                    <Typography variant="caption" fontWeight={700} color="text.secondary">Bath Floors:</Typography>
                    <EditableField
                      fieldPath={['IMPROVEMENTS', 'Bath Floors']}
                      value={getFieldVal('Bath Floors')}
                      onDataChange={handleDataChange}
                      editingField={editingField}
                      setEditingField={setEditingField}
                      isEditable={isEditable}
                      allData={allData || data}
                      revisionHandlers={revisionHandlers}
                    />
                  </Box>
                  <Box>
                    <Typography variant="caption" fontWeight={700} color="text.secondary">Bath Wainscot:</Typography>
                    <EditableField
                      fieldPath={['IMPROVEMENTS', 'Bath Wainscot']}
                      value={getFieldVal('Bath Wainscot')}
                      onDataChange={handleDataChange}
                      editingField={editingField}
                      setEditingField={setEditingField}
                      isEditable={isEditable}
                      allData={allData || data}
                      revisionHandlers={revisionHandlers}
                    />
                  </Box>
                  <Box>
                    <Typography variant="caption" fontWeight={700} color="text.secondary">Interior Amenities (Fireplace, Jetted Tub, etc.):</Typography>
                    <EditableField
                      fieldPath={['IMPROVEMENTS', 'interior amenities']}
                      value={getFieldVal('interior amenities') || getFieldVal('Interior Amenities')}
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

            <Grid item xs={12} sm={6} md={3}>
              <Paper variant="outlined" sx={{ p: 1.5, height: '100%', borderRadius: 1.5, bgcolor: 'grey.50' }}>
                <Typography variant="subtitle2" fontWeight={800} color="primary.main" sx={{ mb: 1 }}>
                  Kitchen, HVAC & Attic
                </Typography>
                <Stack spacing={1}>
                  <Box>
                    <Typography variant="caption" fontWeight={700} color="text.secondary">Kitchen Built-ins & Counters:</Typography>
                    <EditableField
                      fieldPath={['IMPROVEMENTS', 'Kitchen Built-ins']}
                      value={getFieldVal('Kitchen Built-ins')}
                      onDataChange={handleDataChange}
                      editingField={editingField}
                      setEditingField={setEditingField}
                      isEditable={isEditable}
                      allData={allData || data}
                      revisionHandlers={revisionHandlers}
                    />
                  </Box>
                  <Box>
                    <Typography variant="caption" fontWeight={700} color="text.secondary">Heating Type & Fuel:</Typography>
                    <EditableField
                      fieldPath={['IMPROVEMENTS', 'Heating Type:']}
                      value={getFieldVal('Heating Type:') || getFieldVal('Heating Type')}
                      onDataChange={handleDataChange}
                      editingField={editingField}
                      setEditingField={setEditingField}
                      isEditable={isEditable}
                      allData={allData || data}
                      revisionHandlers={revisionHandlers}
                    />
                  </Box>
                  <Box>
                    <Typography variant="caption" fontWeight={700} color="text.secondary">Air Conditioning (Central Air/Other):</Typography>
                    <EditableField
                      fieldPath={['IMPROVEMENTS', 'Air Conditioning Central Air:']}
                      value={getFieldVal('Air Conditioning Central Air:') || getFieldVal('Central Air')}
                      onDataChange={handleDataChange}
                      editingField={editingField}
                      setEditingField={setEditingField}
                      isEditable={isEditable}
                      allData={allData || data}
                      revisionHandlers={revisionHandlers}
                    />
                  </Box>
                  <Box>
                    <Typography variant="caption" fontWeight={700} color="text.secondary">Attic (Scuttle, Drop Stair, Finished):</Typography>
                    <EditableField
                      fieldPath={['IMPROVEMENTS', 'Attic Scuttle:']}
                      value={getFieldVal('Attic Scuttle:') || getFieldVal('Attic')}
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

          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} md={5}>
              <Paper variant="outlined" sx={{ p: 1.5, height: '100%', borderRadius: 1.5, bgcolor: 'grey.50' }}>
                <Typography variant="subtitle2" fontWeight={800} color="primary.main" sx={{ mb: 1 }}>
                  Car Storage
                </Typography>
                <Grid container spacing={1}>
                  <Grid item xs={12}>
                    <Typography variant="caption" fontWeight={700} color="text.secondary">Garage (Attached, Detached, Built-in / # of Cars):</Typography>
                    <EditableField
                      fieldPath={['IMPROVEMENTS', 'Garage (Attached, Detached, Built-in:)']}
                      value={getFieldVal('Garage (Attached, Detached, Built-in:)') || getFieldVal('Garage')}
                      onDataChange={handleDataChange}
                      editingField={editingField}
                      setEditingField={setEditingField}
                      isEditable={isEditable}
                      allData={allData || data}
                      revisionHandlers={revisionHandlers}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <Typography variant="caption" fontWeight={700} color="text.secondary">Carport / Other Storage:</Typography>
                    <EditableField
                      fieldPath={['IMPROVEMENTS', 'Carport (Attached, Detached, Built-in:)']}
                      value={getFieldVal('Carport (Attached, Detached, Built-in:)') || getFieldVal('Carport') || getFieldVal('Car Storage Other')}
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

            <Grid item xs={12} md={7}>
              <Paper variant="outlined" sx={{ p: 1.5, height: '100%', borderRadius: 1.5, bgcolor: 'grey.50' }}>
                <Typography variant="subtitle2" fontWeight={800} color="primary.main" sx={{ mb: 1 }}>
                  Foundation & Basement
                </Typography>
                <Grid container spacing={1.5}>
                  <Grid item xs={6} sm={4}>
                    <Typography variant="caption" fontWeight={700} color="text.secondary">Foundation Material:</Typography>
                    <EditableField
                      fieldPath={['IMPROVEMENTS', 'Foundation Material']}
                      value={getFieldVal('Foundation Material')}
                      onDataChange={handleDataChange}
                      editingField={editingField}
                      setEditingField={setEditingField}
                      isEditable={isEditable}
                      allData={allData || data}
                      revisionHandlers={revisionHandlers}
                    />
                  </Grid>
                  <Grid item xs={6} sm={4}>
                    <Typography variant="caption" fontWeight={700} color="text.secondary">Slab / Crawl Space:</Typography>
                    <EditableField
                      fieldPath={['IMPROVEMENTS', 'Crawl Space:']}
                      value={getFieldVal('Crawl Space:') || getFieldVal('Slab:')}
                      onDataChange={handleDataChange}
                      editingField={editingField}
                      setEditingField={setEditingField}
                      isEditable={isEditable}
                      allData={allData || data}
                      revisionHandlers={revisionHandlers}
                    />
                  </Grid>
                  <Grid item xs={6} sm={4}>
                    <Typography variant="caption" fontWeight={700} color="text.secondary">Basement Sq. Ft / % Finished:</Typography>
                    <EditableField
                      fieldPath={['IMPROVEMENTS', 'Basement:']}
                      value={getFieldVal('Basement:') || getFieldVal('Sq. Ft') || getFieldVal('% Finished:')}
                      onDataChange={handleDataChange}
                      editingField={editingField}
                      setEditingField={setEditingField}
                      isEditable={isEditable}
                      allData={allData || data}
                      revisionHandlers={revisionHandlers}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="caption" fontWeight={700} color="text.secondary">Basement Floor, Wall, Ceiling:</Typography>
                    <EditableField
                      fieldPath={['IMPROVEMENTS', 'Floor:']}
                      value={getFieldVal('Floor:') || getFieldVal('Wall:') || getFieldVal('Ceiling:')}
                      onDataChange={handleDataChange}
                      editingField={editingField}
                      setEditingField={setEditingField}
                      isEditable={isEditable}
                      allData={allData || data}
                      revisionHandlers={revisionHandlers}
                    />
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <Typography variant="caption" fontWeight={700} color="text.secondary">Outside Entry / Sump:</Typography>
                    <EditableField
                      fieldPath={['IMPROVEMENTS', 'Sump:']}
                      value={getFieldVal('Sump:') || getFieldVal('Outside Entry:')}
                      onDataChange={handleDataChange}
                      editingField={editingField}
                      setEditingField={setEditingField}
                      isEditable={isEditable}
                      allData={allData || data}
                      revisionHandlers={revisionHandlers}
                    />
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <Typography variant="caption" fontWeight={700} color="text.secondary">Adequate:</Typography>
                    <EditableField
                      fieldPath={['IMPROVEMENTS', 'Adequate:']}
                      value={getFieldVal('Adequate:') || getFieldVal('Adequate')}
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

          <Box sx={{ mt: 2, p: 1.5, bgcolor: 'grey.50', borderRadius: 1.5, border: '1px solid #e0e0e0' }}>
            <Typography variant="caption" fontWeight={700} color="text.secondary">
              Relevant Characteristics / Significant Features (Describe features affecting marketability):
            </Typography>
            <EditableField
              fieldPath={['IMPROVEMENTS', 'Relevant Characteristics/Significant Features: Describe and discuss features and improvements affecting marketability. (Only those relevant characteristics affecting the Anticipated Sales Price should be considered in the Significant Features fields on pages 5 and 6.)']}
              value={getFieldVal('Relevant Characteristics/Significant Features: Describe and discuss features and improvements affecting marketability. (Only those relevant characteristics affecting the Anticipated Sales Price should be considered in the Significant Features fields on pages 5 and 6.)')}
              onDataChange={handleDataChange}
              editingField={editingField}
              setEditingField={setEditingField}
              isEditable={isEditable}
              allData={allData || data}
              multiline={true}
              rows={3}
              revisionHandlers={revisionHandlers}
            />
            <Box sx={{ mt: 1 }}>
              <Typography variant="caption" fontWeight={700} color="text.secondary">
                Personal Property: Is personal property included in the Anticipated Sales Price?
              </Typography>
              <EditableField
                fieldPath={['IMPROVEMENTS', 'Personal Property: Is personal property included in the Anticipated Sales Price?']}
                value={getFieldVal('Personal Property: Is personal property included in the Anticipated Sales Price?')}
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

      <Paper
        elevation={3}
        sx={{
          mb: 3,
          borderRadius: 2.5,
          overflow: 'hidden',
          border: '1px solid',
          borderColor: 'divider'
        }}
      >
        <Box sx={{ bgcolor: '#cfd8dc', py: 1, px: 2, textAlign: 'center', borderBottom: '1px solid #b0bec5' }}>
          <Typography variant="subtitle2" fontWeight={800} letterSpacing={0.5}>
            ROOMS & GROSS LIVING AREA (GLA) BREAKDOWN
          </Typography>
        </Box>

        <TableContainer>
          <Table size="small" sx={{ minWidth: 900, '& th, & td': { border: '1px solid #cfd8dc', p: 0.8 } }}>
            <TableHead>
              <TableRow sx={{ bgcolor: 'grey.100' }}>
                <TableCell sx={{ fontWeight: 800, width: '18%' }}>Rooms</TableCell>
                <TableCell align="center" sx={{ fontWeight: 700, width: '7%' }}>Living</TableCell>
                <TableCell align="center" sx={{ fontWeight: 700, width: '7%' }}>Dining</TableCell>
                <TableCell align="center" sx={{ fontWeight: 700, width: '7%' }}>Kitchen</TableCell>
                <TableCell align="center" sx={{ fontWeight: 700, width: '7%' }}>Family</TableCell>
                <TableCell align="center" sx={{ fontWeight: 700, width: '8%' }}>Bedrooms</TableCell>
                <TableCell align="center" sx={{ fontWeight: 700, width: '7%' }}>Baths</TableCell>
                <TableCell align="center" sx={{ fontWeight: 700, width: '8%' }}>Other Rooms</TableCell>
                <TableCell sx={{ fontWeight: 700, width: '25%' }}>List of Other Rooms</TableCell>
                <TableCell align="right" sx={{ fontWeight: 800, width: '10%' }}>GLA</TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {roomLevels.map((lvl) => {
                const prefix = `${lvl.key}_`;
                const isNotInGLA = lvl.notInGLA;

                return (
                  <TableRow
                    key={lvl.key}
                    hover
                    sx={{ bgcolor: isNotInGLA ? 'grey.100' : 'background.paper' }}
                  >
                    <TableCell sx={{ fontWeight: 600, fontSize: '0.85rem' }}>
                      {lvl.label}
                    </TableCell>

                    <TableCell align="center">
                      <EditableField
                        fieldPath={['IMPROVEMENTS', `${prefix}Living`]}
                        value={getFieldVal(`${prefix}Living`)}
                        onDataChange={handleDataChange}
                        editingField={editingField}
                        setEditingField={setEditingField}
                        isEditable={isEditable}
                        allData={allData || data}
                        revisionHandlers={revisionHandlers}
                      />
                    </TableCell>

                    <TableCell align="center">
                      <EditableField
                        fieldPath={['IMPROVEMENTS', `${prefix}Dining`]}
                        value={getFieldVal(`${prefix}Dining`)}
                        onDataChange={handleDataChange}
                        editingField={editingField}
                        setEditingField={setEditingField}
                        isEditable={isEditable}
                        allData={allData || data}
                        revisionHandlers={revisionHandlers}
                      />
                    </TableCell>

                    <TableCell align="center">
                      <EditableField
                        fieldPath={['IMPROVEMENTS', `${prefix}Kitchen`]}
                        value={getFieldVal(`${prefix}Kitchen`)}
                        onDataChange={handleDataChange}
                        editingField={editingField}
                        setEditingField={setEditingField}
                        isEditable={isEditable}
                        allData={allData || data}
                        revisionHandlers={revisionHandlers}
                      />
                    </TableCell>

                    <TableCell align="center">
                      <EditableField
                        fieldPath={['IMPROVEMENTS', `${prefix}Family`]}
                        value={getFieldVal(`${prefix}Family`)}
                        onDataChange={handleDataChange}
                        editingField={editingField}
                        setEditingField={setEditingField}
                        isEditable={isEditable}
                        allData={allData || data}
                        revisionHandlers={revisionHandlers}
                      />
                    </TableCell>

                    <TableCell align="center">
                      <EditableField
                        fieldPath={['IMPROVEMENTS', `${prefix}Bedrooms`]}
                        value={getFieldVal(`${prefix}Bedrooms`)}
                        onDataChange={handleDataChange}
                        editingField={editingField}
                        setEditingField={setEditingField}
                        isEditable={isEditable}
                        allData={allData || data}
                        revisionHandlers={revisionHandlers}
                      />
                    </TableCell>

                    <TableCell align="center">
                      <EditableField
                        fieldPath={['IMPROVEMENTS', `${prefix}Baths`]}
                        value={getFieldVal(`${prefix}Baths`)}
                        onDataChange={handleDataChange}
                        editingField={editingField}
                        setEditingField={setEditingField}
                        isEditable={isEditable}
                        allData={allData || data}
                        revisionHandlers={revisionHandlers}
                      />
                    </TableCell>

                    <TableCell align="center">
                      <EditableField
                        fieldPath={['IMPROVEMENTS', `${prefix}OtherRooms`]}
                        value={getFieldVal(`${prefix}OtherRooms`)}
                        onDataChange={handleDataChange}
                        editingField={editingField}
                        setEditingField={setEditingField}
                        isEditable={isEditable}
                        allData={allData || data}
                        revisionHandlers={revisionHandlers}
                      />
                    </TableCell>

                    <TableCell>
                      <EditableField
                        fieldPath={['IMPROVEMENTS', `${prefix}ListOfOtherRooms`]}
                        value={getFieldVal(`${prefix}ListOfOtherRooms`)}
                        onDataChange={handleDataChange}
                        editingField={editingField}
                        setEditingField={setEditingField}
                        isEditable={isEditable}
                        allData={allData || data}
                        revisionHandlers={revisionHandlers}
                      />
                    </TableCell>

                    <TableCell align="right" sx={{ bgcolor: isNotInGLA ? 'grey.300' : 'inherit' }}>
                      {!isNotInGLA ? (
                        <EditableField
                          fieldPath={['IMPROVEMENTS', `${prefix}GLA`]}
                          value={getFieldVal(`${prefix}GLA`)}
                          onDataChange={handleDataChange}
                          editingField={editingField}
                          setEditingField={setEditingField}
                          isEditable={isEditable}
                          allData={allData || data}
                          revisionHandlers={revisionHandlers}
                        />
                      ) : (
                        <Box sx={{ height: 16 }} />
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>

        <Box
          sx={{
            p: 1.5,
            bgcolor: 'grey.50',
            borderTop: '2px solid #b0bec5',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 2
          }}
        >
          <Box display="flex" alignItems="center" gap={1}>
            <Typography variant="body2" fontWeight={800}>Bedrooms:</Typography>
            <Box sx={{ width: 80 }}>
              <EditableField
                fieldPath={['IMPROVEMENTS', 'Bedrooms:']}
                value={getFieldVal('Bedrooms:') || getFieldVal('Bedrooms')}
                onDataChange={handleDataChange}
                editingField={editingField}
                setEditingField={setEditingField}
                isEditable={isEditable}
                allData={allData || data}
                revisionHandlers={revisionHandlers}
              />
            </Box>
          </Box>

          <Box display="flex" alignItems="center" gap={1}>
            <Typography variant="body2" fontWeight={800}>Baths:</Typography>
            <Box sx={{ width: 80 }}>
              <EditableField
                fieldPath={['IMPROVEMENTS', 'Baths:']}
                value={getFieldVal('Baths:') || getFieldVal('Baths')}
                onDataChange={handleDataChange}
                editingField={editingField}
                setEditingField={setEditingField}
                isEditable={isEditable}
                allData={allData || data}
                revisionHandlers={revisionHandlers}
              />
            </Box>
          </Box>

          <Box display="flex" alignItems="center" gap={1}>
            <Typography variant="body2" fontWeight={800}>Gross Living Area:</Typography>
            <Box sx={{ width: 120 }}>
              <EditableField
                fieldPath={['IMPROVEMENTS', 'Gross Living Area: square feet']}
                value={getFieldVal('Gross Living Area: square feet') || getFieldVal('Gross Living Area')}
                onDataChange={handleDataChange}
                editingField={editingField}
                setEditingField={setEditingField}
                isEditable={isEditable}
                allData={allData || data}
                revisionHandlers={revisionHandlers}
              />
            </Box>
            <Typography variant="caption" fontWeight={700} color="text.secondary">square feet</Typography>
          </Box>
        </Box>
      </Paper>

      <Paper
        elevation={3}
        sx={{
          mb: 3,
          borderRadius: 2.5,
          overflow: 'hidden',
          border: '1px solid',
          borderColor: 'divider'
        }}
      >
        <Box sx={{ bgcolor: 'grey.200', py: 1, px: 2, borderBottom: '1px solid #cfd8dc' }}>
          <Typography variant="subtitle2" fontWeight={800} letterSpacing={0.5}>
            MODIFICATIONS, ADVERSE CONDITIONS & INSPECTIONS
          </Typography>
        </Box>

        <Box sx={{ p: 2 }}>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <Typography variant="caption" fontWeight={700} color="text.secondary">
                Evidence of Apparent Modifications to Dwelling (Additions, enclosures, etc.):
              </Typography>
              <EditableField
                fieldPath={['IMPROVEMENTS', 'Evidence of any apparent modifications to dwelling (e.g., additions, enclosures, etc.):']}
                value={getFieldVal('Evidence of any apparent modifications to dwelling (e.g., additions, enclosures, etc.):')}
                onDataChange={handleDataChange}
                editingField={editingField}
                setEditingField={setEditingField}
                isEditable={isEditable}
                allData={allData || data}
                revisionHandlers={revisionHandlers}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <Typography variant="caption" fontWeight={700} color="text.secondary">
                Evidence of Adverse Conditions Requiring Inspections (Dampness, termites, settlement, etc.):
              </Typography>
              <EditableField
                fieldPath={['IMPROVEMENTS', 'Evidence of any adverse conditions requiring inspections (e.g., dampness, termites, settlement, etc.):']}
                value={getFieldVal('Evidence of any adverse conditions requiring inspections (e.g., dampness, termites, settlement, etc.):')}
                onDataChange={handleDataChange}
                editingField={editingField}
                setEditingField={setEditingField}
                isEditable={isEditable}
                allData={allData || data}
                revisionHandlers={revisionHandlers}
              />
            </Grid>

            <Grid item xs={12}>
              <Typography variant="caption" fontWeight={700} color="text.secondary">
                Discuss Evidence of Modifications / Adverse Conditions & Recommended Inspections:
              </Typography>
              <EditableField
                fieldPath={['IMPROVEMENTS', 'Discuss evidence of any apparent modifications and/or adverse conditions and list any recommended inspections and why (e.g., structural, materials, mechanical, roof, code compliance, etc.).']}
                value={getFieldVal('Discuss evidence of any apparent modifications and/or adverse conditions and list any recommended inspections and why (e.g., structural, materials, mechanical, roof, code compliance, etc.).')}
                onDataChange={handleDataChange}
                editingField={editingField}
                setEditingField={setEditingField}
                isEditable={isEditable}
                allData={allData || data}
                multiline={true}
                rows={2}
                revisionHandlers={revisionHandlers}
              />
            </Grid>
          </Grid>
        </Box>
      </Paper>

      <Paper
        elevation={3}
        sx={{
          borderRadius: 2.5,
          overflow: 'hidden',
          border: '1px solid',
          borderColor: 'divider'
        }}
      >
        <Box sx={{ bgcolor: 'grey.200', py: 1, px: 2, borderBottom: '1px solid #cfd8dc' }}>
          <Typography variant="subtitle2" fontWeight={800} letterSpacing={0.5}>
            PROPERTY APPEARANCE, RECOMMENDED REPAIRS & RATINGS
          </Typography>
        </Box>

        <Box sx={{ p: 2 }}>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={4}>
              <Typography variant="caption" fontWeight={700} color="text.secondary">Subject Property’s Appearance ("as is" / Client Instruction):</Typography>
              <EditableField
                fieldPath={['IMPROVEMENTS', 'Subject Property’s Appearance:']}
                value={getFieldVal('Subject Property’s Appearance:') || getFieldVal('Subject Property’s Appearance')}
                onDataChange={handleDataChange}
                editingField={editingField}
                setEditingField={setEditingField}
                isEditable={isEditable}
                allData={allData || data}
                revisionHandlers={revisionHandlers}
              />
            </Grid>

            <Grid item xs={12} sm={8}>
              <Typography variant="caption" fontWeight={700} color="text.secondary">Comments on General Maintenance & Interior Finish:</Typography>
              <EditableField
                fieldPath={['IMPROVEMENTS', 'Comments:']}
                value={getFieldVal('Comments:') || getFieldVal('Comments')}
                onDataChange={handleDataChange}
                editingField={editingField}
                setEditingField={setEditingField}
                isEditable={isEditable}
                allData={allData || data}
                revisionHandlers={revisionHandlers}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <Typography variant="caption" fontWeight={700} color="text.secondary">Are Any Repairs / Improvements Recommended?</Typography>
              <EditableField
                fieldPath={['IMPROVEMENTS', 'Are any repairs and/or improvements recommended?']}
                value={getFieldVal('Are any repairs and/or improvements recommended?')}
                onDataChange={handleDataChange}
                editingField={editingField}
                setEditingField={setEditingField}
                isEditable={isEditable}
                allData={allData || data}
                revisionHandlers={revisionHandlers}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <Typography variant="caption" fontWeight={700} color="text.secondary">Total Estimated Cost to Cure:</Typography>
              <EditableField
                fieldPath={['IMPROVEMENTS', 'Total Estimated Cost to Cure: $']}
                value={getFieldVal('Total Estimated Cost to Cure: $') || getFieldVal('Total Estimated Cost to Cure')}
                onDataChange={handleDataChange}
                editingField={editingField}
                setEditingField={setEditingField}
                isEditable={isEditable}
                allData={allData || data}
                revisionHandlers={revisionHandlers}
              />
            </Grid>

            <Grid item xs={12}>
              <Typography variant="caption" fontWeight={700} color="text.secondary">List Recommended Repairs & Marketability Impact:</Typography>
              <EditableField
                fieldPath={['IMPROVEMENTS', 'List recommended repairs and/or Improvements and provide a total estimated cost to cure. Comment on the impact on marketability.']}
                value={getFieldVal('List recommended repairs and/or Improvements and provide a total estimated cost to cure. Comment on the impact on marketability.')}
                onDataChange={handleDataChange}
                editingField={editingField}
                setEditingField={setEditingField}
                isEditable={isEditable}
                allData={allData || data}
                multiline={true}
                rows={2}
                revisionHandlers={revisionHandlers}
              />
            </Grid>

            <Grid item xs={12}>
              <Paper variant="outlined" sx={{ p: 1.5, bgcolor: '#eceff1', borderRadius: 1.5 }}>
                <Typography variant="subtitle2" fontWeight={800} sx={{ mb: 1 }}>
                  Overall Improvement Ratings:
                </Typography>
                <Grid container spacing={1.5}>
                  {ratingCategories.map((rc) => (
                    <Grid item xs={12} sm={6} md={2.4} key={rc.key}>
                      <Typography variant="caption" fontWeight={700} color="text.secondary">{rc.label}:</Typography>
                      <EditableField
                        fieldPath={['IMPROVEMENTS', rc.key]}
                        value={getFieldVal(rc.key)}
                        onDataChange={handleDataChange}
                        editingField={editingField}
                        setEditingField={setEditingField}
                        isEditable={isEditable}
                        allData={allData || data}
                        revisionHandlers={revisionHandlers}
                      />
                    </Grid>
                  ))}
                </Grid>
              </Paper>
            </Grid>
          </Grid>
        </Box>
      </Paper>
    </Box>
  );
};

export default ECRImprovementsTable;
