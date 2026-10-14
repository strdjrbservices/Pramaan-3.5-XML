import React from 'react';
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
  Grid,
  Stack
} from '@mui/material';
import LibraryBooksIcon from '@mui/icons-material/LibraryBooks';
import { EditableField } from '../components/FormComponents';

export const ECRMarketTrendsTable = ({
  id = "market-trends-section",
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
  const mtData = data?.MARKET_TRENDS || data || {};

  // 6 rows for Closed Sales Analysis
  const closedSalesRows = [1, 2, 3, 4, 5, 6];
  const competingProps = [1, 2, 3];

  const getFieldVal = (field) => {
    return mtData?.[field] !== undefined ? mtData[field] : (data?.[field] || '');
  };

  const competingAttrs = [
    { label: "Address", key: "Address" },
    { label: "Proximity to Subject", key: "Proximity to Subject" },
    { label: "Original List Price", key: "Original List Price" },
    { label: "Current List Price", key: "Current List Price" },
    { label: "Last Price Revision Date", key: "Last Price Revision Date" },
    { label: "Days on Market", key: "Days on Market" },
    { label: "Last Sale Date/Price", key: "Last Sale Date/Price" },
    { label: "Site Area", key: "Site Area" },
    { label: "Site Appeal", key: "Site Appeal" },
    { label: "Actual Age (Years)", key: "Actual Age (Years)" },
    { label: "Condition", key: "Condition" },
    { label: "Rooms", key: "Rooms" },
    { label: "Gross Living Area", key: "Gross Living Area" },
    { label: "GLA Data Source", key: "GLA Data Source" },
    { label: "Basement Area", key: "Basement Area" },
    { label: "Car Storage", key: "Car Storage" },
    { label: "Significant Features", key: "Significant Features" },
    { label: "Comparative Rating to Subject", key: "Comparative Rating to Subject" }
  ];

  return (
    <Box sx={{ mb: 2 }} id={id}>
      {/* 1. MARKET SEGMENT & COMPETITIVE FACTORS */}
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
            bgcolor: 'warning.dark',
            color: 'white',
            px: 2,
            py: 0.8,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}
        >
          <Typography variant="subtitle2" fontWeight="bold">
            Market Trends Analysis — Market Segment & Competitive Factors
          </Typography>
          {onRevisionButtonClick && (
            <Tooltip title="Revision Language">
              <IconButton onClick={onRevisionButtonClick} size="small" sx={{ color: 'inherit', ml: 'auto' }}>
                <LibraryBooksIcon />
              </IconButton>
            </Tooltip>
          )}
        </Box>

        <Box sx={{ p: 2.5 }}>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <Typography variant="caption" fontWeight={700} color="text.secondary">
                Market Segment Definition & Data Source:
              </Typography>
              <EditableField
                fieldPath={['MARKET_TRENDS', 'Market Segment: Define the specific market segment (the area in which potential buyers for the subject property may look for substitute properties) and identify the data source used for the market trends data collection and analysis. Utilize geographic, economic or price range criteria to define your market segment. (In order to obtain a dependable quantity of data for analysis, the defined market segment may be different from the subject property’s neighborhood as defined on page 2)']}
                value={getFieldVal('Market Segment: Define the specific market segment (the area in which potential buyers for the subject property may look for substitute properties) and identify the data source used for the market trends data collection and analysis. Utilize geographic, economic or price range criteria to define your market segment. (In order to obtain a dependable quantity of data for analysis, the defined market segment may be different from the subject property’s neighborhood as defined on page 2)')}
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

            <Grid item xs={12} sm={6} md={4}>
              <Typography variant="caption" fontWeight={700} color="text.secondary">New Construction Competition:</Typography>
              <EditableField
                fieldPath={['MARKET_TRENDS', 'New Construction Competition:']}
                value={getFieldVal('New Construction Competition:')}
                onDataChange={handleDataChange}
                editingField={editingField}
                setEditingField={setEditingField}
                isEditable={isEditable}
                allData={allData || data}
                revisionHandlers={revisionHandlers}
              />
            </Grid>

            <Grid item xs={12} sm={6} md={4}>
              <Typography variant="caption" fontWeight={700} color="text.secondary">Adverse Financing Conditions:</Typography>
              <EditableField
                fieldPath={['MARKET_TRENDS', 'Adverse Financing Conditions:']}
                value={getFieldVal('Adverse Financing Conditions:')}
                onDataChange={handleDataChange}
                editingField={editingField}
                setEditingField={setEditingField}
                isEditable={isEditable}
                allData={allData || data}
                revisionHandlers={revisionHandlers}
              />
            </Grid>

            <Grid item xs={12} sm={6} md={4}>
              <Typography variant="caption" fontWeight={700} color="text.secondary">Distressed Market Competition:</Typography>
              <EditableField
                fieldPath={['MARKET_TRENDS', 'Distressed Market Competition:']}
                value={getFieldVal('Distressed Market Competition:')}
                onDataChange={handleDataChange}
                editingField={editingField}
                setEditingField={setEditingField}
                isEditable={isEditable}
                allData={allData || data}
                revisionHandlers={revisionHandlers}
              />
            </Grid>

            <Grid item xs={12} sm={6} md={6}>
              <Typography variant="caption" fontWeight={700} color="text.secondary">Mortgage Interest Rates:</Typography>
              <EditableField
                fieldPath={['MARKET_TRENDS', 'Mortgage Interest Rates:']}
                value={getFieldVal('Mortgage Interest Rates:')}
                onDataChange={handleDataChange}
                editingField={editingField}
                setEditingField={setEditingField}
                isEditable={isEditable}
                allData={allData || data}
                revisionHandlers={revisionHandlers}
              />
            </Grid>

            <Grid item xs={12} sm={6} md={6}>
              <Typography variant="caption" fontWeight={700} color="text.secondary">Prevalence of Seller Concessions:</Typography>
              <EditableField
                fieldPath={['MARKET_TRENDS', 'Prevalence of Seller Concessions:']}
                value={getFieldVal('Prevalence of Seller Concessions:')}
                onDataChange={handleDataChange}
                editingField={editingField}
                setEditingField={setEditingField}
                isEditable={isEditable}
                allData={allData || data}
                revisionHandlers={revisionHandlers}
              />
            </Grid>

            <Grid item xs={12}>
              <Typography variant="caption" fontWeight={700} color="text.secondary">Comments:</Typography>
              <EditableField
                fieldPath={['MARKET_TRENDS', 'Comments']}
                value={getFieldVal('Comments')}
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

      {/* 2. CLOSED SALES ANALYSIS TABLE (IMAGE 1) */}
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
        <Box sx={{ bgcolor: '#cfd8dc', py: 1, textAlign: 'center', borderBottom: '1px solid #b0bec5' }}>
          <Typography variant="subtitle2" fontWeight={800} letterSpacing={0.5}>
            CLOSED SALES ANALYSIS
          </Typography>
        </Box>

        <TableContainer>
          <Table size="small" sx={{ minWidth: 950, '& th, & td': { border: '1px solid #cfd8dc', p: 0.8 } }}>
            <TableHead>
              <TableRow sx={{ bgcolor: 'grey.100' }}>
                <TableCell align="center" sx={{ fontWeight: 700, width: '22%' }}>
                  Appraiser Defined Time Period
                </TableCell>
                <TableCell align="center" sx={{ fontWeight: 700, width: '8%' }}>
                  No. of Months
                </TableCell>
                <TableCell align="center" sx={{ fontWeight: 700, width: '12%' }}>
                  Total No. of Closed Sales
                </TableCell>
                <TableCell align="center" sx={{ fontWeight: 700, width: '14%' }}>
                  Monthly Absorption Rate
                </TableCell>
                <TableCell align="center" sx={{ fontWeight: 700, width: '18%' }}>
                  <Box>Sales Price</Box>
                  <Stack direction="row" spacing={1} justifyContent="center" alignItems="center">
                    <Typography variant="caption">Mean</Typography>
                    <Typography variant="caption" fontWeight={700}>Median</Typography>
                  </Stack>
                </TableCell>
                <TableCell align="center" sx={{ fontWeight: 700, width: '14%' }}>
                  <Box>Days on Market</Box>
                  <Stack direction="row" spacing={1} justifyContent="center" alignItems="center">
                    <Typography variant="caption">Mean</Typography>
                    <Typography variant="caption" fontWeight={700}>Median</Typography>
                  </Stack>
                </TableCell>
                <TableCell align="center" sx={{ fontWeight: 700, width: '6%' }}>
                  Other:
                </TableCell>
                <TableCell align="center" sx={{ fontWeight: 700, width: '6%' }}>
                  Other:
                </TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {closedSalesRows.map((rIdx) => {
                const prefix = `ClosedSales_Row${rIdx}_`;
                const tpVal = getFieldVal(`${prefix}TimePeriod`) || (rIdx === 1 ? getFieldVal('Appraiser Defined Time Period') : '');
                const mVal = getFieldVal(`${prefix}Months`) || (rIdx === 1 ? getFieldVal('No. of Months') : '');
                const csVal = getFieldVal(`${prefix}ClosedSales`) || (rIdx === 1 ? getFieldVal('Total No. of Closed Sales') : '');
                const arVal = getFieldVal(`${prefix}AbsorptionRate`) || (rIdx === 1 ? getFieldVal('Monthly Absorption Rate') : '');
                const spVal = getFieldVal(`${prefix}SalesPrice`) || (rIdx === 1 ? getFieldVal('Sales Price') : '');
                const domVal = getFieldVal(`${prefix}DOM`) || (rIdx === 1 ? getFieldVal('Days on Market') : '');
                const o1Val = getFieldVal(`${prefix}Other1`);
                const o2Val = getFieldVal(`${prefix}Other2`);

                return (
                  <TableRow key={rIdx} hover>
                    <TableCell>
                      <EditableField
                        fieldPath={['MARKET_TRENDS', `${prefix}TimePeriod`]}
                        value={tpVal}
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
                        fieldPath={['MARKET_TRENDS', `${prefix}Months`]}
                        value={mVal}
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
                        fieldPath={['MARKET_TRENDS', `${prefix}ClosedSales`]}
                        value={csVal}
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
                        fieldPath={['MARKET_TRENDS', `${prefix}AbsorptionRate`]}
                        value={arVal}
                        onDataChange={handleDataChange}
                        editingField={editingField}
                        setEditingField={setEditingField}
                        isEditable={isEditable}
                        allData={allData || data}
                        revisionHandlers={revisionHandlers}
                      />
                    </TableCell>

                    <TableCell align="right">
                      <EditableField
                        fieldPath={['MARKET_TRENDS', `${prefix}SalesPrice`]}
                        value={spVal}
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
                        fieldPath={['MARKET_TRENDS', `${prefix}DOM`]}
                        value={domVal}
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
                        fieldPath={['MARKET_TRENDS', `${prefix}Other1`]}
                        value={o1Val}
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
                        fieldPath={['MARKET_TRENDS', `${prefix}Other2`]}
                        value={o2Val}
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

              {/* Historic Trends Bottom Row */}
              <TableRow sx={{ bgcolor: 'grey.50' }}>
                <TableCell align="center" sx={{ fontWeight: 800, verticalAlign: 'middle' }}>
                  Historic Trends
                </TableCell>
                <TableCell align="center" sx={{ bgcolor: 'grey.200' }} />

                <TableCell>
                  <EditableField
                    fieldPath={['MARKET_TRENDS', 'ClosedSales_Trend']}
                    value={getFieldVal('ClosedSales_Trend') || 'Stable'}
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
                    fieldPath={['MARKET_TRENDS', 'AbsorptionRate_Trend']}
                    value={getFieldVal('AbsorptionRate_Trend') || 'Stable'}
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
                    fieldPath={['MARKET_TRENDS', 'SalesPrice_Trend']}
                    value={getFieldVal('SalesPrice_Trend') || 'Stable'}
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
                    fieldPath={['MARKET_TRENDS', 'DOM_Trend']}
                    value={getFieldVal('DOM_Trend') || 'Stable'}
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
                    fieldPath={['MARKET_TRENDS', 'Other1_Trend']}
                    value={getFieldVal('Other1_Trend')}
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
                    fieldPath={['MARKET_TRENDS', 'Other2_Trend']}
                    value={getFieldVal('Other2_Trend')}
                    onDataChange={handleDataChange}
                    editingField={editingField}
                    setEditingField={setEditingField}
                    isEditable={isEditable}
                    allData={allData || data}
                    revisionHandlers={revisionHandlers}
                  />
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>

        {/* Narrative after Closed Sales Analysis */}
        <Box sx={{ p: 2, bgcolor: 'background.paper', borderTop: '1px solid #cfd8dc' }}>
          <Typography variant="caption" fontWeight={700} color="text.secondary">
            Historic Trends Analysis & Market Change Adjustment Support:
          </Typography>
          <EditableField
            fieldPath={['MARKET_TRENDS', 'Analyze and discuss the above trends relevant to developing the Market Change Adjustment in the Sales Comparison Analysis grid on page 6. Discuss the relevance and reliability of the data and any other factors used to determine historic price trends – e.g., sale and resale data.']}
            value={getFieldVal('Analyze and discuss the above trends relevant to developing the Market Change Adjustment in the Sales Comparison Analysis grid on page 6. Discuss the relevance and reliability of the data and any other factors used to determine historic price trends – e.g., sale and resale data.')}
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
            <Typography variant="caption" fontWeight={700} color="text.secondary">Overall Historic Price Trend:</Typography>
            <EditableField
              fieldPath={['MARKET_TRENDS', 'Overall Historic Price Trend:']}
              value={getFieldVal('Overall Historic Price Trend:') || getFieldVal('Overall Historic Price Trend')}
              onDataChange={handleDataChange}
              editingField={editingField}
              setEditingField={setEditingField}
              isEditable={isEditable}
              allData={allData || data}
              revisionHandlers={revisionHandlers}
            />
          </Box>
        </Box>
      </Paper>

      {/* 3. CURRENT LISTINGS & PENDING SALES (IMAGE 2) */}
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
        <TableContainer>
          <Table size="small" sx={{ minWidth: 950, '& th, & td': { border: '1px solid #cfd8dc', p: 0.8 } }}>
            <TableHead>
              <TableRow sx={{ bgcolor: '#cfd8dc' }}>
                <TableCell colSpan={4} align="center" sx={{ fontWeight: 800, borderRight: '2px solid #90a4ae' }}>
                  CURRENT LISTINGS
                </TableCell>
                <TableCell colSpan={4} align="center" sx={{ fontWeight: 800 }}>
                  PENDING SALES
                </TableCell>
              </TableRow>
              <TableRow sx={{ bgcolor: 'grey.100' }}>
                <TableCell align="center" sx={{ fontWeight: 700, width: '13%' }}>
                  Total No. of Active Listings
                </TableCell>
                <TableCell align="center" sx={{ fontWeight: 700, width: '15%' }}>
                  <Box>List Price</Box>
                  <Stack direction="row" spacing={1} justifyContent="center" alignItems="center">
                    <Typography variant="caption" fontWeight={700}>Mean</Typography>
                    <Typography variant="caption">Median</Typography>
                  </Stack>
                </TableCell>
                <TableCell align="center" sx={{ fontWeight: 700, width: '14%' }}>
                  <Box>Days on Market</Box>
                  <Stack direction="row" spacing={1} justifyContent="center" alignItems="center">
                    <Typography variant="caption" fontWeight={700}>Mean</Typography>
                    <Typography variant="caption">Median</Typography>
                  </Stack>
                </TableCell>
                <TableCell align="center" sx={{ fontWeight: 700, width: '8%', borderRight: '2px solid #90a4ae' }}>
                  Other:
                </TableCell>
                <TableCell align="center" sx={{ fontWeight: 700, width: '13%' }}>
                  Total No. of Pending Sales
                </TableCell>
                <TableCell align="center" sx={{ fontWeight: 700, width: '15%' }}>
                  <Box>List Price</Box>
                  <Stack direction="row" spacing={1} justifyContent="center" alignItems="center">
                    <Typography variant="caption" fontWeight={700}>Mean</Typography>
                    <Typography variant="caption">Median</Typography>
                  </Stack>
                </TableCell>
                <TableCell align="center" sx={{ fontWeight: 700, width: '14%' }}>
                  <Box>Days on Market</Box>
                  <Stack direction="row" spacing={1} justifyContent="center" alignItems="center">
                    <Typography variant="caption" fontWeight={700}>Mean</Typography>
                    <Typography variant="caption">Median</Typography>
                  </Stack>
                </TableCell>
                <TableCell align="center" sx={{ fontWeight: 700, width: '8%' }}>
                  Other:
                </TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              <TableRow hover>
                {/* Active Listings */}
                <TableCell align="center">
                  <EditableField
                    fieldPath={['MARKET_TRENDS', 'CURRENT LISTINGS - Total No. of Active Listings']}
                    value={getFieldVal('CURRENT LISTINGS - Total No. of Active Listings')}
                    onDataChange={handleDataChange}
                    editingField={editingField}
                    setEditingField={setEditingField}
                    isEditable={isEditable}
                    allData={allData || data}
                    revisionHandlers={revisionHandlers}
                  />
                </TableCell>
                <TableCell align="right">
                  <EditableField
                    fieldPath={['MARKET_TRENDS', 'CURRENT LISTINGS - List Price']}
                    value={getFieldVal('CURRENT LISTINGS - List Price')}
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
                    fieldPath={['MARKET_TRENDS', 'CURRENT LISTINGS - Days on Market']}
                    value={getFieldVal('CURRENT LISTINGS - Days on Market')}
                    onDataChange={handleDataChange}
                    editingField={editingField}
                    setEditingField={setEditingField}
                    isEditable={isEditable}
                    allData={allData || data}
                    revisionHandlers={revisionHandlers}
                  />
                </TableCell>
                <TableCell align="center" sx={{ borderRight: '2px solid #90a4ae' }}>
                  <EditableField
                    fieldPath={['MARKET_TRENDS', 'CURRENT LISTINGS - Other:']}
                    value={getFieldVal('CURRENT LISTINGS - Other:')}
                    onDataChange={handleDataChange}
                    editingField={editingField}
                    setEditingField={setEditingField}
                    isEditable={isEditable}
                    allData={allData || data}
                    revisionHandlers={revisionHandlers}
                  />
                </TableCell>

                {/* Pending Sales */}
                <TableCell align="center">
                  <EditableField
                    fieldPath={['MARKET_TRENDS', 'PENDING SALES - Total No. of Active Listings']}
                    value={getFieldVal('PENDING SALES - Total No. of Active Listings')}
                    onDataChange={handleDataChange}
                    editingField={editingField}
                    setEditingField={setEditingField}
                    isEditable={isEditable}
                    allData={allData || data}
                    revisionHandlers={revisionHandlers}
                  />
                </TableCell>
                <TableCell align="right">
                  <EditableField
                    fieldPath={['MARKET_TRENDS', 'PENDING SALES - List Price']}
                    value={getFieldVal('PENDING SALES - List Price')}
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
                    fieldPath={['MARKET_TRENDS', 'PENDING SALES - Days on Market']}
                    value={getFieldVal('PENDING SALES - Days on Market')}
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
                    fieldPath={['MARKET_TRENDS', 'PENDING SALES - Other:']}
                    value={getFieldVal('PENDING SALES - Other:')}
                    onDataChange={handleDataChange}
                    editingField={editingField}
                    setEditingField={setEditingField}
                    isEditable={isEditable}
                    allData={allData || data}
                    revisionHandlers={revisionHandlers}
                  />
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>

        {/* Subtext info */}
        <Box sx={{ p: 1.5, bgcolor: 'grey.50', borderTop: '1px solid #cfd8dc', borderBottom: '1px solid #cfd8dc' }}>
          <Typography variant="caption" sx={{ fontStyle: 'italic', display: 'block', color: 'text.secondary' }}>
            Market Segment – Absorption Rate/Inventory Analysis: Based on the Closed Sales Analysis above, identify the time period which produces the most credible Absorption Rate. Divide the Total No. of Active Listings by the Monthly Absorption Rate to determine the estimated No. of Months Supply of Inventory.
          </Typography>
        </Box>

        {/* Supply / Demand Summary Table */}
        <TableContainer>
          <Table size="small" sx={{ minWidth: 950, '& th, & td': { border: '1px solid #cfd8dc', p: 0.8 } }}>
            <TableHead>
              <TableRow sx={{ bgcolor: 'grey.100' }}>
                <TableCell align="center" sx={{ fontWeight: 700, width: '25%' }}>
                  Appraiser Defined Time Period
                </TableCell>
                <TableCell align="center" sx={{ fontWeight: 700, width: '10%' }}>
                  No. of Months
                </TableCell>
                <TableCell align="center" sx={{ fontWeight: 700, width: '15%' }}>
                  Total No. of Closed Sales
                </TableCell>
                <TableCell align="center" sx={{ fontWeight: 700, width: '15%' }}>
                  Monthly Absorption Rate
                </TableCell>
                <TableCell align="center" sx={{ fontWeight: 700, width: '18%' }}>
                  Total No. of Active Listings (exclude pending sales)
                </TableCell>
                <TableCell align="center" sx={{ fontWeight: 700, width: '17%' }}>
                  No. of Months Supply of Inventory
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              <TableRow hover>
                <TableCell>
                  <EditableField
                    fieldPath={['MARKET_TRENDS', 'Supply/Demand - Appraiser Defined Time Period']}
                    value={getFieldVal('Supply/Demand - Appraiser Defined Time Period')}
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
                    fieldPath={['MARKET_TRENDS', 'Supply/Demand - No. of Months']}
                    value={getFieldVal('Supply/Demand - No. of Months')}
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
                    fieldPath={['MARKET_TRENDS', 'Supply/Demand - Total No. of Closed Sales']}
                    value={getFieldVal('Supply/Demand - Total No. of Closed Sales')}
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
                    fieldPath={['MARKET_TRENDS', 'Supply/Demand - Monthly Absorption Rate']}
                    value={getFieldVal('Supply/Demand - Monthly Absorption Rate')}
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
                    fieldPath={['MARKET_TRENDS', 'Supply/Demand - Total No. of Active Listings (exclude pending sales)']}
                    value={getFieldVal('Supply/Demand - Total No. of Active Listings (exclude pending sales)')}
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
                    fieldPath={['MARKET_TRENDS', 'Supply/Demand - No. of Months Supply of Inventory']}
                    value={getFieldVal('Supply/Demand - No. of Months Supply of Inventory')}
                    onDataChange={handleDataChange}
                    editingField={editingField}
                    setEditingField={setEditingField}
                    isEditable={isEditable}
                    allData={allData || data}
                    revisionHandlers={revisionHandlers}
                  />
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>

        {/* Narrative & Supply/Demand Status */}
        <Box sx={{ p: 2, bgcolor: 'background.paper', borderTop: '1px solid #cfd8dc' }}>
          <Typography variant="caption" fontWeight={700} color="text.secondary">
            Supply/Demand Analysis Discussion:
          </Typography>
          <EditableField
            fieldPath={['MARKET_TRENDS', 'Analyze and discuss the above data (consider seasonal influences, pending sales, expired/withdrawn listings, relevance and reliability of data, etc.) that pertains to current supply/demand in the subject property’s market segment.']}
            value={getFieldVal('Analyze and discuss the above data (consider seasonal influences, pending sales, expired/withdrawn listings, relevance and reliability of data, etc.) that pertains to current supply/demand in the subject property’s market segment.')}
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
            <Typography variant="caption" fontWeight={700} color="text.secondary">Current Supply/Demand Status:</Typography>
            <EditableField
              fieldPath={['MARKET_TRENDS', 'Current Supply/Demand Status:']}
              value={getFieldVal('Current Supply/Demand Status:') || getFieldVal('Current Supply/Demand:')}
              onDataChange={handleDataChange}
              editingField={editingField}
              setEditingField={setEditingField}
              isEditable={isEditable}
              allData={allData || data}
              revisionHandlers={revisionHandlers}
            />
          </Box>
        </Box>
      </Paper>

      {/* 4. COMPETING PROPERTIES GRID */}
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
        <Box sx={{ bgcolor: '#b0bec5', py: 1, px: 2, borderBottom: '1px solid #90a4ae' }}>
          <Typography variant="subtitle2" fontWeight={800} letterSpacing={0.5}>
            COMPETING PROPERTIES ANALYSIS
          </Typography>
        </Box>

        <TableContainer>
          <Table size="small" sx={{ minWidth: 900, '& th, & td': { border: '1px solid #cfd8dc', p: 0.8 } }}>
            <TableHead>
              <TableRow sx={{ bgcolor: 'grey.100' }}>
                <TableCell sx={{ fontWeight: 700, width: '20%' }}>Item / Feature</TableCell>
                <TableCell align="center" sx={{ fontWeight: 700, width: '20%', bgcolor: '#e3f2fd' }}>
                  Subject Property
                </TableCell>
                {competingProps.map((p) => (
                  <TableCell key={p} align="center" sx={{ fontWeight: 700, width: '20%' }}>
                    Competing Property #{p}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {competingAttrs.map((attr) => {
                const isSubjectDisabled = attr.key === "Proximity to Subject" || attr.key === "Comparative Rating to Subject";
                const subjectKey = `Subject Property - ${attr.key}`;
                const subjectFallbackKey = `Competing Property - Subject - ${attr.key}`;
                const subjectVal = getFieldVal(subjectKey) || getFieldVal(subjectFallbackKey) || '';

                return (
                  <TableRow key={attr.key} hover>
                    <TableCell sx={{ fontWeight: 600, fontSize: '0.85rem' }}>{attr.label}</TableCell>

                    {/* Subject Property Column */}
                    <TableCell sx={{ bgcolor: isSubjectDisabled ? 'grey.200' : '#f8fafd' }}>
                      {isSubjectDisabled ? (
                        <Typography variant="body2" color="text.secondary" align="center" sx={{ fontStyle: 'italic', fontSize: '0.8rem' }}>
                          —
                        </Typography>
                      ) : (
                        <EditableField
                          fieldPath={['MARKET_TRENDS', subjectKey]}
                          value={subjectVal}
                          onDataChange={handleDataChange}
                          editingField={editingField}
                          setEditingField={setEditingField}
                          isEditable={isEditable}
                          allData={allData || data}
                          revisionHandlers={revisionHandlers}
                        />
                      )}
                    </TableCell>

                    {/* Competing Properties Columns */}
                    {competingProps.map((p) => {
                      const key = `Competing Property #${p} - ${attr.key}`;
                      const fallbackKey = `Competing Property - ${attr.key}`;
                      const val = getFieldVal(key) || (p === 1 ? getFieldVal(fallbackKey) : '');

                      return (
                        <TableCell key={p}>
                          <EditableField
                            fieldPath={['MARKET_TRENDS', key]}
                            value={val}
                            onDataChange={handleDataChange}
                            editingField={editingField}
                            setEditingField={setEditingField}
                            isEditable={isEditable}
                            allData={allData || data}
                            revisionHandlers={revisionHandlers}
                          />
                        </TableCell>
                      );
                    })}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>

        <Box sx={{ p: 2, bgcolor: 'background.paper', borderTop: '1px solid #cfd8dc' }}>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <Typography variant="caption" fontWeight={700} color="text.secondary">
                Competing Property Discussions:
              </Typography>
              <EditableField
                fieldPath={['MARKET_TRENDS', 'For each Competing Property, specifically discuss the following: 1) Why was the property selected? 2) What are the major differences between the property and the subject? Comments should support the Comparative Rating to Subject above.']}
                value={getFieldVal('For each Competing Property, specifically discuss the following: 1) Why was the property selected? 2) What are the major differences between the property and the subject? Comments should support the Comparative Rating to Subject above.')}
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

            {competingProps.map((p) => (
              <Grid item xs={12} md={4} key={p}>
                <Typography variant="caption" fontWeight={700} color="text.secondary">Competing Property #{p}:</Typography>
                <EditableField
                  fieldPath={['MARKET_TRENDS', `Competing Property #${p}:`]}
                  value={getFieldVal(`Competing Property #${p}:`) || getFieldVal(`Competing Property #${p}`)}
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
            ))}
          </Grid>
        </Box>
      </Paper>

      {/* 5. PRICING, MARKETING PERIOD & FORECASTING */}
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
            MARKET SEGMENT FORECASTING & MARKETING PERIOD
          </Typography>
        </Box>

        <Box sx={{ p: 2.5 }}>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <Typography variant="caption" fontWeight={700} color="text.secondary">Is subject realistically priced to sell?</Typography>
              <EditableField
                fieldPath={['MARKET_TRENDS', 'Is the subject property realistically priced to sell within the assignment marketing period?']}
                value={getFieldVal('Is the subject property realistically priced to sell within the assignment marketing period?')}
                onDataChange={handleDataChange}
                editingField={editingField}
                setEditingField={setEditingField}
                isEditable={isEditable}
                allData={allData || data}
                revisionHandlers={revisionHandlers}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <Typography variant="caption" fontWeight={700} color="text.secondary">Competitive List Price Range for Subject Property:</Typography>
              <EditableField
                fieldPath={['MARKET_TRENDS', 'Competitive List Price Range for Subject Property (to achieve a sale within the Assignment Marketing Period):']}
                value={getFieldVal('Competitive List Price Range for Subject Property (to achieve a sale within the Assignment Marketing Period):')}
                onDataChange={handleDataChange}
                editingField={editingField}
                setEditingField={setEditingField}
                isEditable={isEditable}
                allData={allData || data}
                revisionHandlers={revisionHandlers}
              />
            </Grid>

            <Grid item xs={12}>
              <Typography variant="caption" fontWeight={700} color="text.secondary">Property Positioned to Sell First & Support:</Typography>
              <EditableField
                fieldPath={['MARKET_TRENDS', 'Identify which competing property is positioned to sell first and why. Include the subject property, if listed. Provide support for the competitive list price range below.']}
                value={getFieldVal('Identify which competing property is positioned to sell first and why. Include the subject property, if listed. Provide support for the competitive list price range below.')}
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

            <Grid item xs={12} sm={4}>
              <Typography variant="caption" fontWeight={700} color="text.secondary">Market Segment Normal Marketing Time:</Typography>
              <EditableField
                fieldPath={['MARKET_TRENDS', 'Market Segment Normal Marketing Time:']}
                value={getFieldVal('Market Segment Normal Marketing Time:')}
                onDataChange={handleDataChange}
                editingField={editingField}
                setEditingField={setEditingField}
                isEditable={isEditable}
                allData={allData || data}
                revisionHandlers={revisionHandlers}
              />
            </Grid>

            <Grid item xs={12} sm={4}>
              <Typography variant="caption" fontWeight={700} color="text.secondary">Subject Estimated Normal Marketing Time:</Typography>
              <EditableField
                fieldPath={['MARKET_TRENDS', 'Subject Property’s Estimated Normal Marketing Time:']}
                value={getFieldVal('Subject Property’s Estimated Normal Marketing Time:')}
                onDataChange={handleDataChange}
                editingField={editingField}
                setEditingField={setEditingField}
                isEditable={isEditable}
                allData={allData || data}
                revisionHandlers={revisionHandlers}
              />
            </Grid>

            <Grid item xs={12} sm={4}>
              <Typography variant="caption" fontWeight={700} color="text.secondary">Assignment Marketing Period:</Typography>
              <EditableField
                fieldPath={['MARKET_TRENDS', 'Assignment Marketing Period:']}
                value={getFieldVal('Assignment Marketing Period:')}
                onDataChange={handleDataChange}
                editingField={editingField}
                setEditingField={setEditingField}
                isEditable={isEditable}
                allData={allData || data}
                revisionHandlers={revisionHandlers}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <Typography variant="caption" fontWeight={700} color="text.secondary">Forecasted Price Trend:</Typography>
              <EditableField
                fieldPath={['MARKET_TRENDS', 'Forecasted Price Trend']}
                value={getFieldVal('Forecasted Price Trend')}
                onDataChange={handleDataChange}
                editingField={editingField}
                setEditingField={setEditingField}
                isEditable={isEditable}
                allData={allData || data}
                revisionHandlers={revisionHandlers}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <Typography variant="caption" fontWeight={700} color="text.secondary">Forecasted Sales Activity:</Typography>
              <EditableField
                fieldPath={['MARKET_TRENDS', 'Forecasted Sales Activity (not to exceed 120 days or as instructed by client):']}
                value={getFieldVal('Forecasted Sales Activity (not to exceed 120 days or as instructed by client):')}
                onDataChange={handleDataChange}
                editingField={editingField}
                setEditingField={setEditingField}
                isEditable={isEditable}
                allData={allData || data}
                revisionHandlers={revisionHandlers}
              />
            </Grid>

            <Grid item xs={12}>
              <Typography variant="caption" fontWeight={700} color="text.secondary">Forecasting Adjustment Analysis & Support:</Typography>
              <EditableField
                fieldPath={['MARKET_TRENDS', 'Forecasting Adjustment Analysis: Discuss the Historic Trends and Current Factors from pages 4 and 5 and any additional pertinent data relevant to developing the Forecasting Adjustment on page 6. Analyze the anticipated trend of market conditions and prices during the subject property’s assignment marketing period (e.g., mood of the market, seasonal market trends, economic and employment shifts, demographic trends, buyer profile, etc.). This discussion should explain and support the Forecasting Adjustment on page 6']}
                value={getFieldVal('Forecasting Adjustment Analysis: Discuss the Historic Trends and Current Factors from pages 4 and 5 and any additional pertinent data relevant to developing the Forecasting Adjustment on page 6. Analyze the anticipated trend of market conditions and prices during the subject property’s assignment marketing period (e.g., mood of the market, seasonal market trends, economic and employment shifts, demographic trends, buyer profile, etc.). This discussion should explain and support the Forecasting Adjustment on page 6')}
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
          </Grid>
        </Box>
      </Paper>
    </Box>
  );
};

export default ECRMarketTrendsTable;
