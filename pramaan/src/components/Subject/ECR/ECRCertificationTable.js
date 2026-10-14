import React from 'react';
import {
  Paper,
  Box,
  Typography,
  Grid,
  Tooltip,
  IconButton,
  // Divider,
  Stack
} from '@mui/material';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import LibraryBooksIcon from '@mui/icons-material/LibraryBooks';
import { EditableField } from '../components/FormComponents';

export const ECRCertificationTable = ({
  id = "appraiser-section",
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
  const certData = data?.CERTIFICATION || data || {};

  const getFieldVal = (field) => {
    return certData?.[field] !== undefined ? certData[field] : (data?.[field] || '');
  };

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
          <VerifiedUserIcon fontSize="small" />
          <Typography variant="subtitle2" fontWeight="bold">
            APPRAISER & CO-APPRAISER CERTIFICATION / SIGNATURES
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
        <Paper
          variant="outlined"
          sx={{
            p: 1,
            mb: 1.5,
            bgcolor: 'grey.50',
            borderRadius: 1.5,
            border: '1px solid #cfd8dc'
          }}
        >
          <Grid container spacing={1.5}>
            <Grid item xs={12} sm={6} md={6}>
              <Typography variant="caption" fontWeight={700} color="text.secondary">
                Subject Property Address:
              </Typography>
              <EditableField
                fieldPath={['CERTIFICATION', 'Subject Property Address']}
                value={getFieldVal('Subject Property Address') || getFieldVal('Subject Property Address:')}
                onDataChange={handleDataChange}
                editingField={editingField}
                setEditingField={setEditingField}
                isEditable={isEditable}
                allData={allData || data}
                revisionHandlers={revisionHandlers}
              />
            </Grid>

            <Grid item xs={6} sm={3} md={3}>
              <Typography variant="caption" fontWeight={700} color="text.secondary">Unit:</Typography>
              <EditableField
                fieldPath={['CERTIFICATION', 'Subject Unit:']}
                value={getFieldVal('Subject Unit:') || getFieldVal('Subject Unit')}
                onDataChange={handleDataChange}
                editingField={editingField}
                setEditingField={setEditingField}
                isEditable={isEditable}
                allData={allData || data}
                revisionHandlers={revisionHandlers}
              />
            </Grid>

            <Grid item xs={6} sm={3} md={3}>
              <Typography variant="caption" fontWeight={700} color="text.secondary">County:</Typography>
              <EditableField
                fieldPath={['CERTIFICATION', 'Subject County:']}
                value={getFieldVal('Subject County:') || getFieldVal('Subject County')}
                onDataChange={handleDataChange}
                editingField={editingField}
                setEditingField={setEditingField}
                isEditable={isEditable}
                allData={allData || data}
                revisionHandlers={revisionHandlers}
              />
            </Grid>

            <Grid item xs={12} sm={6} md={6}>
              <Typography variant="caption" fontWeight={700} color="text.secondary">City:</Typography>
              <EditableField
                fieldPath={['CERTIFICATION', 'Subject City:']}
                value={getFieldVal('Subject City:') || getFieldVal('Subject City')}
                onDataChange={handleDataChange}
                editingField={editingField}
                setEditingField={setEditingField}
                isEditable={isEditable}
                allData={allData || data}
                revisionHandlers={revisionHandlers}
              />
            </Grid>

            <Grid item xs={6} sm={3} md={3}>
              <Typography variant="caption" fontWeight={700} color="text.secondary">State:</Typography>
              <EditableField
                fieldPath={['CERTIFICATION', 'Subject State:']}
                value={getFieldVal('Subject State:') || getFieldVal('Subject State')}
                onDataChange={handleDataChange}
                editingField={editingField}
                setEditingField={setEditingField}
                isEditable={isEditable}
                allData={allData || data}
                revisionHandlers={revisionHandlers}
              />
            </Grid>

            <Grid item xs={6} sm={3} md={3}>
              <Typography variant="caption" fontWeight={700} color="text.secondary">Zip Code:</Typography>
              <EditableField
                fieldPath={['CERTIFICATION', 'Subject Zip Code:']}
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
        </Paper>

        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <Paper
              variant="outlined"
              sx={{
                p: 2,
                height: '100%',
                borderRadius: 2,
                border: '1px solid #b0bec5',
                bgcolor: 'background.paper'
              }}
            >
              <Box sx={{ pb: 1, mb: 2, borderBottom: '2px solid', borderColor: 'primary.main' }}>
                <Typography variant="subtitle2" fontWeight={800} color="primary.main">
                  APPRAISER
                </Typography>
              </Box>

              <Stack spacing={1.5}>
                <Box>
                  <Typography variant="caption" fontWeight={700} color="text.secondary">
                    APPRAISER Signature:
                  </Typography>
                  <EditableField
                    fieldPath={['CERTIFICATION', 'APPRAISER Signature:']}
                    value={getFieldVal('APPRAISER Signature:') || getFieldVal('APPRAISER Signature')}
                    onDataChange={handleDataChange}
                    editingField={editingField}
                    setEditingField={setEditingField}
                    isEditable={isEditable}
                    allData={allData || data}
                    revisionHandlers={revisionHandlers}
                  />
                </Box>

                <Box>
                  <Typography variant="caption" fontWeight={700} color="text.secondary">
                    APPRAISER Name:
                  </Typography>
                  <EditableField
                    fieldPath={['CERTIFICATION', 'APPRAISER Name:']}
                    value={getFieldVal('APPRAISER Name:') || getFieldVal('APPRAISER Name')}
                    onDataChange={handleDataChange}
                    editingField={editingField}
                    setEditingField={setEditingField}
                    isEditable={isEditable}
                    allData={allData || data}
                    revisionHandlers={revisionHandlers}
                  />
                </Box>

                <Box>
                  <Typography variant="caption" fontWeight={700} color="text.secondary">
                    Date of Appraisal Inspection:
                  </Typography>
                  <EditableField
                    fieldPath={['CERTIFICATION', 'Date of Appraisal Inspection:']}
                    value={getFieldVal('Date of Appraisal Inspection:') || getFieldVal('Date of Appraisal Inspection')}
                    onDataChange={handleDataChange}
                    editingField={editingField}
                    setEditingField={setEditingField}
                    isEditable={isEditable}
                    allData={allData || data}
                    revisionHandlers={revisionHandlers}
                  />
                </Box>

                <Box>
                  <Typography variant="caption" fontWeight={700} color="text.secondary">
                    Date of Value Opinion (Effective Date):
                  </Typography>
                  <EditableField
                    fieldPath={['CERTIFICATION', 'Date of Value Opinion (Effective Date):']}
                    value={getFieldVal('Date of Value Opinion (Effective Date):') || getFieldVal('Date of Value Opinion (Effective Date)')}
                    onDataChange={handleDataChange}
                    editingField={editingField}
                    setEditingField={setEditingField}
                    isEditable={isEditable}
                    allData={allData || data}
                    revisionHandlers={revisionHandlers}
                  />
                </Box>

                <Box>
                  <Typography variant="caption" fontWeight={700} color="text.secondary">
                    State License/Certification #:
                  </Typography>
                  <EditableField
                    fieldPath={['CERTIFICATION', 'State License/Certification #:']}
                    value={getFieldVal('State License/Certification #:') || getFieldVal('State License/Certification #')}
                    onDataChange={handleDataChange}
                    editingField={editingField}
                    setEditingField={setEditingField}
                    isEditable={isEditable}
                    allData={allData || data}
                    revisionHandlers={revisionHandlers}
                  />
                </Box>

                <Box>
                  <Typography variant="caption" fontWeight={700} color="text.secondary">
                    State of License/Certification:
                  </Typography>
                  <EditableField
                    fieldPath={['CERTIFICATION', 'State of License/Certification']}
                    value={getFieldVal('State of License/Certification') || getFieldVal('State of License/Certification:')}
                    onDataChange={handleDataChange}
                    editingField={editingField}
                    setEditingField={setEditingField}
                    isEditable={isEditable}
                    allData={allData || data}
                    revisionHandlers={revisionHandlers}
                  />
                </Box>

                <Box>
                  <Typography variant="caption" fontWeight={700} color="text.secondary">
                    Expiration Date of License/Certification:
                  </Typography>
                  <EditableField
                    fieldPath={['CERTIFICATION', 'Expiration Date of License/Certification:']}
                    value={getFieldVal('Expiration Date of License/Certification:') || getFieldVal('Expiration Date of License/Certification')}
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

          <Grid item xs={12} md={6}>
            <Paper
              variant="outlined"
              sx={{
                p: 2,
                height: '100%',
                borderRadius: 2,
                border: '1px solid #b0bec5',
                bgcolor: 'background.paper'
              }}
            >
              <Box sx={{ pb: 1, mb: 2, borderBottom: '2px solid', borderColor: 'grey.500' }}>
                <Typography variant="subtitle2" fontWeight={800} color="text.primary">
                  CO-APPRAISER (if applicable)
                </Typography>
              </Box>

              <Stack spacing={1.5}>
                <Box>
                  <Typography variant="caption" fontWeight={700} color="text.secondary">
                    CO-APPRAISER (if applicable) Signature:
                  </Typography>
                  <EditableField
                    fieldPath={['CERTIFICATION', 'CO-APPRAISER (if applicable) Signature:']}
                    value={getFieldVal('CO-APPRAISER (if applicable) Signature:') || getFieldVal('CO-APPRAISER Signature')}
                    onDataChange={handleDataChange}
                    editingField={editingField}
                    setEditingField={setEditingField}
                    isEditable={isEditable}
                    allData={allData || data}
                    revisionHandlers={revisionHandlers}
                  />
                </Box>

                <Box>
                  <Typography variant="caption" fontWeight={700} color="text.secondary">
                    CO-APPRAISER Name:
                  </Typography>
                  <EditableField
                    fieldPath={['CERTIFICATION', 'CO-APPRAISER Name']}
                    value={getFieldVal('CO-APPRAISER Name') || getFieldVal('CO-APPRAISER Name:')}
                    onDataChange={handleDataChange}
                    editingField={editingField}
                    setEditingField={setEditingField}
                    isEditable={isEditable}
                    allData={allData || data}
                    revisionHandlers={revisionHandlers}
                  />
                </Box>

                <Box>
                  <Typography variant="caption" fontWeight={700} color="text.secondary">
                    Date of Appraisal Inspection:
                  </Typography>
                  <EditableField
                    fieldPath={['CERTIFICATION', 'CO-APPRAISER Date of Appraisal Inspection:']}
                    value={getFieldVal('CO-APPRAISER Date of Appraisal Inspection:') || getFieldVal('CO-APPRAISER Date of Appraisal Inspection')}
                    onDataChange={handleDataChange}
                    editingField={editingField}
                    setEditingField={setEditingField}
                    isEditable={isEditable}
                    allData={allData || data}
                    revisionHandlers={revisionHandlers}
                  />
                </Box>

                <Box>
                  <Typography variant="caption" fontWeight={700} color="text.secondary">
                    Date of Value Opinion (Effective Date):
                  </Typography>
                  <EditableField
                    fieldPath={['CERTIFICATION', 'CO-APPRAISER Date of Value Opinion (Effective Date)']}
                    value={getFieldVal('CO-APPRAISER Date of Value Opinion (Effective Date)') || getFieldVal('CO-APPRAISER Date of Value Opinion (Effective Date):')}
                    onDataChange={handleDataChange}
                    editingField={editingField}
                    setEditingField={setEditingField}
                    isEditable={isEditable}
                    allData={allData || data}
                    revisionHandlers={revisionHandlers}
                  />
                </Box>

                <Box>
                  <Typography variant="caption" fontWeight={700} color="text.secondary">
                    State License/Certification #:
                  </Typography>
                  <EditableField
                    fieldPath={['CERTIFICATION', 'CO-APPRAISER State License/Certification #:']}
                    value={getFieldVal('CO-APPRAISER State License/Certification #:') || getFieldVal('CO-APPRAISER State License/Certification #')}
                    onDataChange={handleDataChange}
                    editingField={editingField}
                    setEditingField={setEditingField}
                    isEditable={isEditable}
                    allData={allData || data}
                    revisionHandlers={revisionHandlers}
                  />
                </Box>

                <Box>
                  <Typography variant="caption" fontWeight={700} color="text.secondary">
                    State of License/Certification:
                  </Typography>
                  <EditableField
                    fieldPath={['CERTIFICATION', 'CO-APPRAISER State of License/Certification:']}
                    value={getFieldVal('CO-APPRAISER State of License/Certification:') || getFieldVal('CO-APPRAISER State of License/Certification')}
                    onDataChange={handleDataChange}
                    editingField={editingField}
                    setEditingField={setEditingField}
                    isEditable={isEditable}
                    allData={allData || data}
                    revisionHandlers={revisionHandlers}
                  />
                </Box>

                <Box>
                  <Typography variant="caption" fontWeight={700} color="text.secondary">
                    Expiration Date of License/Certification:
                  </Typography>
                  <EditableField
                    fieldPath={['CERTIFICATION', 'CO-APPRAISER Expiration Date of License/Certification:']}
                    value={getFieldVal('CO-APPRAISER Expiration Date of License/Certification:') || getFieldVal('CO-APPRAISER Expiration Date of License/Certification')}
                    onDataChange={handleDataChange}
                    editingField={editingField}
                    setEditingField={setEditingField}
                    isEditable={isEditable}
                    allData={allData || data}
                    revisionHandlers={revisionHandlers}
                  />
                </Box>

                <Box sx={{ pt: 1, borderTop: '1px dashed #cfd8dc' }}>
                  <Typography variant="caption" fontWeight={700} color="text.secondary">
                    Inspection Disclosure:
                  </Typography>
                  <EditableField
                    fieldPath={['CERTIFICATION', 'Did Did Not personally inspect the subject property.']}
                    value={getFieldVal('Did Did Not personally inspect the subject property.')}
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
      </Box>
    </Paper>
  );
};

export default ECRCertificationTable;
