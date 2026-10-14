import React from 'react';
import {
  Paper,
  Box,
  Typography,
  Grid,
  Tooltip,
  IconButton,

} from '@mui/material';
import HomeIcon from '@mui/icons-material/Home';
import LibraryBooksIcon from '@mui/icons-material/LibraryBooks';
import { EditableField } from '../components/FormComponents';

export const ECRSubjectInfoTable = ({
  id = "subject-info",
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
  const subData = data?.SUBJECT || data || {};

  const getFieldVal = (field) => {
    return subData?.[field] !== undefined ? subData[field] : (data?.[field] || '');
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
          bgcolor: 'primary.main',
          color: 'white',
          px: 2,
          py: 0.8,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}
      >
        <Box display="flex" alignItems="center" gap={1}>
          <HomeIcon fontSize="small" />
          <Typography variant="subtitle2" fontWeight="bold">
            SUBJECT INFORMATION
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
            <Grid item xs={12} sm={6}>
              <Typography variant="caption" fontWeight={700} color="text.secondary">Transferee:</Typography>
              <EditableField
                fieldPath={['SUBJECT', 'Transferee:']}
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
              <Typography variant="caption" fontWeight={700} color="text.secondary">Occupant (Transferee, Tenant, Vacant):</Typography>
              <EditableField
                fieldPath={['SUBJECT', 'Occupant:']}
                value={getFieldVal('Occupant:') || getFieldVal('Occupant')}
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
                fieldPath={['SUBJECT', 'Subject Property Address:']}
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
                fieldPath={['SUBJECT', 'Subject Unit:']}
                value={getFieldVal('Subject Unit:') || getFieldVal('Subject Unit')}
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
                fieldPath={['SUBJECT', 'Subject County:']}
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
                fieldPath={['SUBJECT', 'Subject City:']}
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
                fieldPath={['SUBJECT', 'Subject State:']}
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
                fieldPath={['SUBJECT', 'Subject Zip Code:']}
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

          <Grid container spacing={1.5}>
            <Grid item xs={12} sm={6}>
              <Typography variant="caption" fontWeight={700} color="text.secondary">Legal Description:</Typography>
              <EditableField
                fieldPath={['SUBJECT', 'Legal Description:']}
                value={getFieldVal('Legal Description:') || getFieldVal('Legal Description')}
                onDataChange={handleDataChange}
                editingField={editingField}
                setEditingField={setEditingField}
                isEditable={isEditable}
                allData={allData || data}
                revisionHandlers={revisionHandlers}
              />
            </Grid>
            <Grid item xs={6} sm={3}>
              <Typography variant="caption" fontWeight={700} color="text.secondary">Assessor's Parcel # (APN):</Typography>
              <EditableField
                fieldPath={['SUBJECT', 'Assessor\'s Parcel #:']}
                value={getFieldVal('Assessor\'s Parcel #:') || getFieldVal('Assessor\'s Parcel #')}
                onDataChange={handleDataChange}
                editingField={editingField}
                setEditingField={setEditingField}
                isEditable={isEditable}
                allData={allData || data}
                revisionHandlers={revisionHandlers}
              />
            </Grid>
            <Grid item xs={6} sm={3}>
              <Typography variant="caption" fontWeight={700} color="text.secondary">Map Reference:</Typography>
              <EditableField
                fieldPath={['SUBJECT', 'Map Reference:']}
                value={getFieldVal('Map Reference:') || getFieldVal('Map Reference')}
                onDataChange={handleDataChange}
                editingField={editingField}
                setEditingField={setEditingField}
                isEditable={isEditable}
                allData={allData || data}
                revisionHandlers={revisionHandlers}
              />
            </Grid>
          </Grid>

          <Grid container spacing={1.5} sx={{ mt: 0.5 }}>
            <Grid item xs={12} sm={6}>
              <Typography variant="caption" fontWeight={700} color="text.secondary">Property Rights Appraised (Fee Simple / Leasehold):</Typography>
              <EditableField
                fieldPath={['SUBJECT', 'Property Rights Appraised:']}
                value={getFieldVal('Property Rights Appraised:') || getFieldVal('Property Rights Appraised')}
                onDataChange={handleDataChange}
                editingField={editingField}
                setEditingField={setEditingField}
                isEditable={isEditable}
                allData={allData || data}
                revisionHandlers={revisionHandlers}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="caption" fontWeight={700} color="text.secondary">Subtype (PUD / Condominium / Cooperative):</Typography>
              <EditableField
                fieldPath={['SUBJECT', 'Subtype:']}
                value={getFieldVal('Subtype:') || getFieldVal('Subtype')}
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

        <Paper variant="outlined" sx={{ p: 1.5, mb: 2, bgcolor: 'grey.50', borderRadius: 1.5 }}>
          <Typography variant="subtitle2" fontWeight={800} color="primary.main" sx={{ mb: 1 }}>
            Condominium / Cooperative Information (if applicable)
          </Typography>
          <Grid container spacing={1.5}>
            <Grid item xs={12} sm={6}>
              <Typography variant="caption" fontWeight={700} color="text.secondary">Complex Name:</Typography>
              <EditableField
                fieldPath={['SUBJECT', 'If condominium or cooperative, indicate complex name:']}
                value={getFieldVal('If condominium or cooperative, indicate complex name:')}
                onDataChange={handleDataChange}
                editingField={editingField}
                setEditingField={setEditingField}
                isEditable={isEditable}
                allData={allData || data}
                revisionHandlers={revisionHandlers}
              />
            </Grid>
            <Grid item xs={4} sm={2}>
              <Typography variant="caption" fontWeight={700} color="text.secondary">Total Units:</Typography>
              <EditableField
                fieldPath={['SUBJECT', 'Total No. of Units']}
                value={getFieldVal('Total No. of Units')}
                onDataChange={handleDataChange}
                editingField={editingField}
                setEditingField={setEditingField}
                isEditable={isEditable}
                allData={allData || data}
                revisionHandlers={revisionHandlers}
              />
            </Grid>
            <Grid item xs={4} sm={2}>
              <Typography variant="caption" fontWeight={700} color="text.secondary">Owner-Occupied Units:</Typography>
              <EditableField
                fieldPath={['SUBJECT', 'No. of Owner-occupied Units:']}
                value={getFieldVal('No. of Owner-occupied Units:') || getFieldVal('No. of Owner-occupied Units')}
                onDataChange={handleDataChange}
                editingField={editingField}
                setEditingField={setEditingField}
                isEditable={isEditable}
                allData={allData || data}
                revisionHandlers={revisionHandlers}
              />
            </Grid>
            <Grid item xs={4} sm={2}>
              <Typography variant="caption" fontWeight={700} color="text.secondary">% Owner-Occupied:</Typography>
              <EditableField
                fieldPath={['SUBJECT', '% of Owner-occupied Units:']}
                value={getFieldVal('% of Owner-occupied Units:') || getFieldVal('% of Owner-occupied Units')}
                onDataChange={handleDataChange}
                editingField={editingField}
                setEditingField={setEditingField}
                isEditable={isEditable}
                allData={allData || data}
                revisionHandlers={revisionHandlers}
              />
            </Grid>

            <Grid item xs={6} sm={3}>
              <Typography variant="caption" fontWeight={700} color="text.secondary">Total No. of Floors:</Typography>
              <EditableField
                fieldPath={['SUBJECT', 'Total No. of Floors:']}
                value={getFieldVal('Total No. of Floors:') || getFieldVal('Total No. of Floors')}
                onDataChange={handleDataChange}
                editingField={editingField}
                setEditingField={setEditingField}
                isEditable={isEditable}
                allData={allData || data}
                revisionHandlers={revisionHandlers}
              />
            </Grid>
            <Grid item xs={6} sm={3}>
              <Typography variant="caption" fontWeight={700} color="text.secondary">Subject Floor #:</Typography>
              <EditableField
                fieldPath={['SUBJECT', 'Subject Floor #:']}
                value={getFieldVal('Subject Floor #:') || getFieldVal('Subject Floor #')}
                onDataChange={handleDataChange}
                editingField={editingField}
                setEditingField={setEditingField}
                isEditable={isEditable}
                allData={allData || data}
                revisionHandlers={revisionHandlers}
              />
            </Grid>
            <Grid item xs={6} sm={3}>
              <Typography variant="caption" fontWeight={700} color="text.secondary">Is complex complete?</Typography>
              <EditableField
                fieldPath={['SUBJECT', 'Is the complex complete?']}
                value={getFieldVal('Is the complex complete?')}
                onDataChange={handleDataChange}
                editingField={editingField}
                setEditingField={setEditingField}
                isEditable={isEditable}
                allData={allData || data}
                revisionHandlers={revisionHandlers}
              />
            </Grid>
            <Grid item xs={6} sm={3}>
              <Typography variant="caption" fontWeight={700} color="text.secondary">Market rate financing available?</Typography>
              <EditableField
                fieldPath={['SUBJECT', 'Is market rate financing available?']}
                value={getFieldVal('Is market rate financing available?')}
                onDataChange={handleDataChange}
                editingField={editingField}
                setEditingField={setEditingField}
                isEditable={isEditable}
                allData={allData || data}
                revisionHandlers={revisionHandlers}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="caption" fontWeight={700} color="text.secondary">Developer/builder in control of HOA?</Typography>
              <EditableField
                fieldPath={['SUBJECT', 'Is the developer/builder in control of the homeowners association?']}
                value={getFieldVal('Is the developer/builder in control of the homeowners association?')}
                onDataChange={handleDataChange}
                editingField={editingField}
                setEditingField={setEditingField}
                isEditable={isEditable}
                allData={allData || data}
                revisionHandlers={revisionHandlers}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="caption" fontWeight={700} color="text.secondary">Are there any marketability issues?</Typography>
              <EditableField
                fieldPath={['SUBJECT', 'Are there any marketability issues?']}
                value={getFieldVal('Are there any marketability issues?')}
                onDataChange={handleDataChange}
                editingField={editingField}
                setEditingField={setEditingField}
                isEditable={isEditable}
                allData={allData || data}
                revisionHandlers={revisionHandlers}
              />
            </Grid>
            <Grid item xs={12}>
              <Typography variant="caption" fontWeight={700} color="text.secondary">Condo/Co-op Comments:</Typography>
              <EditableField
                fieldPath={['SUBJECT', 'Comments:']}
                value={getFieldVal('Comments:') || getFieldVal('Comments')}
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

        <Paper variant="outlined" sx={{ p: 1.5, mb: 2, bgcolor: 'grey.50', borderRadius: 1.5 }}>
          <Grid container spacing={1.5}>
            <Grid item xs={6} sm={3}>
              <Typography variant="caption" fontWeight={700} color="text.secondary">Annual Real Estate Taxes: $</Typography>
              <EditableField
                fieldPath={['SUBJECT', 'Annual real estate taxes: $']}
                value={getFieldVal('Annual real estate taxes: $') || getFieldVal('Annual real estate taxes')}
                onDataChange={handleDataChange}
                editingField={editingField}
                setEditingField={setEditingField}
                isEditable={isEditable}
                allData={allData || data}
                revisionHandlers={revisionHandlers}
              />
            </Grid>
            <Grid item xs={6} sm={2}>
              <Typography variant="caption" fontWeight={700} color="text.secondary">Tax Year:</Typography>
              <EditableField
                fieldPath={['SUBJECT', 'Tax Year:']}
                value={getFieldVal('Tax Year:') || getFieldVal('Tax Year')}
                onDataChange={handleDataChange}
                editingField={editingField}
                setEditingField={setEditingField}
                isEditable={isEditable}
                allData={allData || data}
                revisionHandlers={revisionHandlers}
              />
            </Grid>
            <Grid item xs={12} sm={3}>
              <Typography variant="caption" fontWeight={700} color="text.secondary">Data Source:</Typography>
              <EditableField
                fieldPath={['SUBJECT', 'Data Source:']}
                value={getFieldVal('Data Source:') || getFieldVal('Data Source')}
                onDataChange={handleDataChange}
                editingField={editingField}
                setEditingField={setEditingField}
                isEditable={isEditable}
                allData={allData || data}
                revisionHandlers={revisionHandlers}
              />
            </Grid>
            <Grid item xs={6} sm={2}>
              <Typography variant="caption" fontWeight={700} color="text.secondary">Are taxes typical?</Typography>
              <EditableField
                fieldPath={['SUBJECT', 'Are taxes typical?']}
                value={getFieldVal('Are taxes typical?')}
                onDataChange={handleDataChange}
                editingField={editingField}
                setEditingField={setEditingField}
                isEditable={isEditable}
                allData={allData || data}
                revisionHandlers={revisionHandlers}
              />
            </Grid>
            <Grid item xs={6} sm={2}>
              <Typography variant="caption" fontWeight={700} color="text.secondary">Monthly HOA Fees: $</Typography>
              <EditableField
                fieldPath={['SUBJECT', 'Monthly HOA Fees: $']}
                value={getFieldVal('Monthly HOA Fees: $') || getFieldVal('Monthly HOA Fees')}
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
                Discuss atypical taxes, HOA fees and known pending special assessments:
              </Typography>
              <EditableField
                fieldPath={['SUBJECT', 'Discuss atypical taxes, homeowner association fees and known pending special assessments, and comment on their effect on marketability']}
                value={getFieldVal('Discuss atypical taxes, homeowner association fees and known pending special assessments, and comment on their effect on marketability')}
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
        </Paper>

        <Paper variant="outlined" sx={{ p: 1.5, bgcolor: 'grey.50', borderRadius: 1.5 }}>
          <Typography variant="subtitle2" fontWeight={800} color="primary.main" sx={{ mb: 1 }}>
            Listing History & Prior Transfer Analysis
          </Typography>
          <Grid container spacing={1.5}>
            <Grid item xs={6} sm={3}>
              <Typography variant="caption" fontWeight={700} color="text.secondary">Currently Listed?</Typography>
              <EditableField
                fieldPath={['SUBJECT', 'Is the subject property currently listed?']}
                value={getFieldVal('Is the subject property currently listed?')}
                onDataChange={handleDataChange}
                editingField={editingField}
                setEditingField={setEditingField}
                isEditable={isEditable}
                allData={allData || data}
                revisionHandlers={revisionHandlers}
              />
            </Grid>
            <Grid item xs={6} sm={3}>
              <Typography variant="caption" fontWeight={700} color="text.secondary">Original List Price: $</Typography>
              <EditableField
                fieldPath={['SUBJECT', 'Original List Price: $']}
                value={getFieldVal('Original List Price: $') || getFieldVal('Original List Price')}
                onDataChange={handleDataChange}
                editingField={editingField}
                setEditingField={setEditingField}
                isEditable={isEditable}
                allData={allData || data}
                revisionHandlers={revisionHandlers}
              />
            </Grid>
            <Grid item xs={6} sm={3}>
              <Typography variant="caption" fontWeight={700} color="text.secondary">Current List Price: $</Typography>
              <EditableField
                fieldPath={['SUBJECT', 'Current List Price: $']}
                value={getFieldVal('Current List Price: $') || getFieldVal('Current List Price')}
                onDataChange={handleDataChange}
                editingField={editingField}
                setEditingField={setEditingField}
                isEditable={isEditable}
                allData={allData || data}
                revisionHandlers={revisionHandlers}
              />
            </Grid>
            <Grid item xs={6} sm={3}>
              <Typography variant="caption" fontWeight={700} color="text.secondary">Date of Last Price Revision:</Typography>
              <EditableField
                fieldPath={['SUBJECT', 'Date of Last Price Revision:']}
                value={getFieldVal('Date of Last Price Revision:') || getFieldVal('Date of Last Price Revision')}
                onDataChange={handleDataChange}
                editingField={editingField}
                setEditingField={setEditingField}
                isEditable={isEditable}
                allData={allData || data}
                revisionHandlers={revisionHandlers}
              />
            </Grid>

            <Grid item xs={6} sm={2}>
              <Typography variant="caption" fontWeight={700} color="text.secondary">Days-on-market:</Typography>
              <EditableField
                fieldPath={['SUBJECT', 'Days-on-market:']}
                value={getFieldVal('Days-on-market:') || getFieldVal('Days-on-market')}
                onDataChange={handleDataChange}
                editingField={editingField}
                setEditingField={setEditingField}
                isEditable={isEditable}
                allData={allData || data}
                revisionHandlers={revisionHandlers}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="caption" fontWeight={700} color="text.secondary">Listing Company / Agent:</Typography>
              <EditableField
                fieldPath={['SUBJECT', 'Listing Company/Agent:']}
                value={getFieldVal('Listing Company/Agent:') || getFieldVal('Listing Company/Agent')}
                onDataChange={handleDataChange}
                editingField={editingField}
                setEditingField={setEditingField}
                isEditable={isEditable}
                allData={allData || data}
                revisionHandlers={revisionHandlers}
              />
            </Grid>
            <Grid item xs={6} sm={4}>
              <Typography variant="caption" fontWeight={700} color="text.secondary">Listing Agent Ph. #:</Typography>
              <EditableField
                fieldPath={['SUBJECT', 'Ph. #:']}
                value={getFieldVal('Ph. #:') || getFieldVal('Ph. #')}
                onDataChange={handleDataChange}
                editingField={editingField}
                setEditingField={setEditingField}
                isEditable={isEditable}
                allData={allData || data}
                revisionHandlers={revisionHandlers}
              />
            </Grid>

            <Grid item xs={6} sm={6}>
              <Typography variant="caption" fontWeight={700} color="text.secondary">Last Sale Date:</Typography>
              <EditableField
                fieldPath={['SUBJECT', 'Last Sale Date:']}
                value={getFieldVal('Last Sale Date:') || getFieldVal('Last Sale Date')}
                onDataChange={handleDataChange}
                editingField={editingField}
                setEditingField={setEditingField}
                isEditable={isEditable}
                allData={allData || data}
                revisionHandlers={revisionHandlers}
              />
            </Grid>
            <Grid item xs={6} sm={6}>
              <Typography variant="caption" fontWeight={700} color="text.secondary">Last Sale Price: $</Typography>
              <EditableField
                fieldPath={['SUBJECT', 'Last Sale Price: $']}
                value={getFieldVal('Last Sale Price: $') || getFieldVal('Last Sale Price')}
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
                Analyze and discuss agreement of sale / 3-year prior sales history:
              </Typography>
              <EditableField
                fieldPath={['SUBJECT', 'Analyze and discuss any current agreement of sale, option on or listing of the subject property as well as the last three years of sales history. Include complete marketing history, noting price changes and days on market.']}
                value={getFieldVal('Analyze and discuss any current agreement of sale, option on or listing of the subject property as well as the last three years of sales history. Include complete marketing history, noting price changes and days on market.')}
                onDataChange={handleDataChange}
                editingField={editingField}
                setEditingField={setEditingField}
                isEditable={isEditable}
                allData={allData || data}
                multiline={true}
                rows={3}
                revisionHandlers={revisionHandlers}
              />
            </Grid>

            <Grid item xs={12}>
              <Typography variant="caption" fontWeight={700} color="text.secondary">
                Are there any mandatory inspections required by a governmental institution to transfer title?
              </Typography>
              <EditableField
                fieldPath={['SUBJECT', 'Are there any mandatory inspections required by a governmental institution to transfer title?']}
                value={getFieldVal('Are there any mandatory inspections required by a governmental institution to transfer title?')}
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
      </Box>
    </Paper>
  );
};

export default ECRSubjectInfoTable;
