import React from 'react';
import { GridInfoCard, EditableField } from '../components/FormComponents';
import ActionButtons from '../components/ActionButtons';
import SalesComparisonSection from '../components/SalesComparisonSection';
import PhotosGallerySection from '../components/PhotosGallerySection';
import { Tooltip, IconButton, Paper, Box, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Checkbox } from '@mui/material';
import LibraryBooksIcon from '@mui/icons-material/LibraryBooks';

const Version1 = ({
  summaryFields,
  data,
  allData,
  extractionAttempted,
  handleDataChange,
  editingField,
  setEditingField,
  highlightedSubjectFields,
  highlightedContractFields,
  highlightedSiteFields,
  subjectFields,
  contractFields,
  neighborhoodFields,
  siteFields,
  improvementsFields,
  salesGridRows,
  comparableSales,
  salesHistoryFields,
  salesComparisonAdditionalInfoFields,
  priorSaleHistoryFields,
  reconciliationFields,
  costApproachFields,
  incomeApproachFields,
  pudInformationFields,
  appraiserFields,
  infoOfSalesFields,
  formType,
  comparisonData,
  getComparisonStyle,
  loading,
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
  onSalesGridRevisionButtonClick,
  onReconciliationRevisionButtonClick,
  onCostApproachRevisionButtonClick,
  onCertificationRevisionButtonClick,
  revisionHandlers
}) => {
  const assignmentFields = [
    'Assignment Reason',
    'Borrower Name',
    'Current Owner of Public Record',
    'Property Valuation Method',
    'Property Data Report Used in Lieu of Inspection'
  ];

  const contactFields = [
    'Client/Lender Company Name',
    'Client/Lender Company Address',
    'Appraisal Management Company Name',
    'Appraisal Management Company Address',
    'Appraiser Name',
    'Appraiser Company Name',
    'Appraiser Company Address',
    'Subject Property Inspection',
    'Exterior Physical Inspection',
    'Interior Physical Inspection',
    'Inspection Date',
    'Appraiser Credential Level',
    'Appraiser ID',
    'Appraiser State',
    'Appraiser License Expiration Date',
    'Appraiser ASC Identifier'
  ];

  const subjectPropertyFields = [
    'Physical Address',
    'County',
    'Neighborhood Name',
    'Planned Unit Development (PUD)',
    'Condominium',
    'Cooperative',
    'Condop',
    'Property on Native American Lands',
    'Subject Site Owned in Common',
    'Homeowner Responsible for All Exterior Maintenance of Dwelling(s)',
    'New Construction',
    'Attachment Type',
    'Units Excluding ADUs',
    'Accessory Dwelling Units (ADUs)',
    'Special Tax Assessments',
    'Property Rights Appraised',
    'All Rights Included in Appraisal',
    'Legal Description',
    'Subject Property Commentary'
  ];
  const subjectListingFields = [
    'Current or Relevant Listings',
    'Data Source',
    'Subject Listing Information Commentary',
    'Subject Listing Information Exhibits'
  ];

  const version1SummaryFields = [
    'Opinion of Market Value',
    'Indicated Value by Sales Comparison Approach Indicated',
    'Market Value Condition',
    'Effective Date of Appraisal',
    'Assignment Reason',
    'Borrower Name',
    'Current Owner of Public Record',
    'Listing Status',
    'Property Valuation Method',
    'Appraiser Name',
    'Construction Method',
    'Attachment Type',
    'Overall Quality',
    'Overall Condition',
    'Planned Unit Development (PUD)',
    'Condominium',
    'Cooperative',
    'Condop',
    'Subject Site Owned in Common',
    'Units Excluding ADUs',
    'Accessory Dwelling Units (ADUs)',
    'Property Rights Appraised',
    'Highest and Best Use as Present Use',
    'Zoning Compliance',
    'Apparent Defects, Damages, Deficiencies Requiring Action',
    'Appraisal Version',
    'Appraiser Reference ID',
    'FHA Case #',
  ];

  const version1SalesComparisonAdditionalInfoFields = [
    'Indicated Value by Sales Comparison Approach',
    'Reconciliation of Sales Comparison Approach',
    'Sales Comparison Map',
    'Sales Comparison Approach Exhibits'
  ];

  const version1AppraiserFields = [
    'Appraiser Certifications',
    'Appraiser Signature',
    'Date of Signature and Report',
    'Appraiser Name',
    'Appraiser Credential Level',
    'Appraiser ID',
    'Appraiser State',
    'Appraiser License Expiration Date'
  ];

  const version1SalesGridRows = [
    { label: "Address", valueKey: "Comparable Property Address", subjectValueKey: "Subject Property Address" },
    { label: "Photo", valueKey: "Photo" },
    { label: "Proximity to Subject", valueKey: "Proximity to Subject" },
    { label: "Proximity to Subject comment", valueKey: "Proximity to Subject comment" },
    { label: "Data Source", valueKey: "Data Source" },
    { label: "List Price", valueKey: "List Price", adjustmentKey: "List Price Adjustment" },
    { label: "Listing Status", valueKey: "Listing Status" },
    { label: "Sale Price", valueKey: "Sale Price", adjustmentKey: "Sale Price Adjustment" },
    { label: "Transfer Terms", valueKey: "Transfer Terms", adjustmentKey: "Transfer Terms Adjustment" },
    { label: "Financing Type", valueKey: "Financing Type", adjustmentKey: "Financing Type Adjustment" },
    { label: "Sales Concessions", valueKey: "Sales Concessions", adjustmentKey: "Sales Concessions Adjustment" },
    { label: "Contract Date", valueKey: "Contract Date", adjustmentKey: "Contract Date Adjustment" },
    { label: "Sale Date", valueKey: "Sale Date", adjustmentKey: "Sale Date Adjustment" },
    { label: "Days on Market", valueKey: "Days on Market" },
    { label: "Attached / Detached", valueKey: "Attached / Detached", adjustmentKey: "Attached / Detached Adjustment" },
    { label: "Property Rights Appraised", valueKey: "Property Rights Appraised" },
    { label: "Site Size", valueKey: "Site Size", adjustmentKey: "Site Size Adjustment" },
    { label: "Location", valueKey: "Site Influence (Location)", adjustmentKey: "Location Adjustment" },
    { label: "View", valueKey: "View" },
    { label: "Range of View", valueKey: "Range of View" },
    { label: "Year Built", valueKey: "Year Built", adjustmentKey: "Year Built Adjustment" },
    { label: "Construction Method", valueKey: "Construction Method", adjustmentKey: "Construction Method Adjustment" },
    { label: "Heating", valueKey: "Heating", adjustmentKey: "Heating Adjustment" },
    { label: "Amenities", valueKey: "Amenities", adjustmentKey: "Amenities Adjustment" },
    { label: "Bedrooms", valueKey: "Bedrooms", adjustmentKey: "Bedrooms Adjustment" },
    { label: "Bathrooms - Full", valueKey: "Bathrooms - Full" },
    { label: "Bathrooms - Half", valueKey: "Bathrooms - Half" },
    { label: "GLA / GBA", valueKey: "Finished Area Above Grade", adjustmentKey: "Finished Area Above Grade Adjustment" },
    { label: "Finished Area Below Grade", valueKey: "Finished Area Below Grade", adjustmentKey: "Finished Area Below Grade Adjustment" },
    { label: "Unfinished Area Below Grade", valueKey: "Unfinished Area Below Grade", adjustmentKey: "Unfinished Area Below Grade Adjustment" },
    { label: "Exterior Quality", valueKey: "Exterior Quality" },
    { label: "Exterior Condition", valueKey: "Exterior Condition" },
    { label: "Interior Quality", valueKey: "Interior Quality" },
    { label: "Interior Condition", valueKey: "Interior Condition" },
    { label: "Overall Quality", valueKey: "Overall Quality", adjustmentKey: "Overall Quality Adjustment" },
    { label: "Overall Condition", valueKey: "Overall Condition", adjustmentKey: "Overall Condition Adjustment" },
    { label: "Vehicle Storage Type", valueKey: "Vehicle Storage Type" },
    { label: "Vehicle Storage Spaces", valueKey: "Vehicle Storage Spaces", adjustmentKey: "Vehicle Storage Adjustment" },
    { label: "Vehicle Storage Detail", valueKey: "Vehicle Storage Detail" },
    { label: "Net Adjustment (Total)", valueKey: "Net Adjustment Total" },
    { label: "Adjusted Price", valueKey: "Adjusted Price" },
    { label: "Comparable Weight", valueKey: "Comparable Weight" },
    // { label: "Indicated Value by Sales Comparison Approach Indicated Value", valueKey: "Indicated Value by Sales Comparison Approach Indicated" }
  ];

  return (
    <>
      <ActionButtons
        handleStateRequirementCheck={handleStateRequirementCheck}
        stateReqLoading={stateReqLoading}
        handleClientRequirementCheck={handleClientRequirementCheck}
        clientReqLoading={clientReqLoading}
        handleEscalationCheck={handleEscalationCheck}
        escalationLoading={escalationLoading}
        revisionHandlers={revisionHandlers}
      />

      <GridInfoCard
        id="summary-section"
        title="Summary"
        fields={version1SummaryFields}
        data={data.SUMMARY || data}
        cardClass="bg-primary"
        extractionAttempted={extractionAttempted}
        onDataChange={(field, value) => handleDataChange(['SUMMARY', ...field], value)}
        editingField={editingField}
        setEditingField={setEditingField}
        isEditable={true}
        allData={allData}
        loading={loading}
        loadingSection={loadingSection}
        manualValidations={manualValidations}
        handleManualValidation={handleManualValidation}
        revisionHandlers={revisionHandlers}
        showBlankValidation={extractionAttempted}
      />

      <GridInfoCard
        id="assignment-information"
        title="Assignment Information"
        fields={assignmentFields}
        data={data.SUMMARY || data}
        cardClass="bg-secondary"
        extractionAttempted={extractionAttempted}
        onDataChange={(field, value) => handleDataChange(['SUMMARY', ...field], value)}
        editingField={editingField}
        setEditingField={setEditingField}
        isEditable={true}
        highlightedFields={highlightedSubjectFields}
        allData={allData}
        loading={loading}
        loadingSection={loadingSection}
        manualValidations={manualValidations}
        handleManualValidation={handleManualValidation}
        onRevisionButtonClick={onSubjectRevisionButtonClick}
        revisionHandlers={revisionHandlers}
        showBlankValidation={extractionAttempted}
      />

      <GridInfoCard
        id="contact-information"
        title="Contact Information"
        fields={contactFields}
        data={data.SUMMARY || data}
        cardClass="bg-info"
        extractionAttempted={extractionAttempted}
        onDataChange={(field, value) => handleDataChange(['SUMMARY', ...field], value)}
        editingField={editingField}
        setEditingField={setEditingField}
        isEditable={true}
        highlightedFields={highlightedSubjectFields}
        allData={allData}
        loading={loading}
        loadingSection={loadingSection}
        manualValidations={manualValidations}
        handleManualValidation={handleManualValidation}
        onRevisionButtonClick={onSubjectRevisionButtonClick}
        revisionHandlers={revisionHandlers}
        showBlankValidation={extractionAttempted}
      />

      <GridInfoCard
        id="subject-property"
        title="Subject Property"
        fields={subjectPropertyFields}
        data={data.SUMMARY || data}
        cardClass="bg-primary"
        extractionAttempted={extractionAttempted}
        onDataChange={(field, value) => handleDataChange(['SUMMARY', ...field], value)}
        editingField={editingField}
        setEditingField={setEditingField}
        isEditable={true}
        highlightedFields={highlightedSubjectFields}
        allData={allData}
        loading={loading}
        loadingSection={loadingSection}
        manualValidations={manualValidations}
        handleManualValidation={handleManualValidation}
        onRevisionButtonClick={onSubjectRevisionButtonClick}
        revisionHandlers={revisionHandlers}
        showBlankValidation={extractionAttempted}
      />

      <Paper id="site" elevation={3} sx={{ mb: 4, borderRadius: 2, overflow: 'hidden', border: '1px solid', borderColor: 'warning.main' }}>
        <Box sx={{ bgcolor: 'warning.main', color: 'black', px: 2, py: 1.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="subtitle1" fontWeight="bold">Site</Typography>
          {onSiteRevisionButtonClick && (
            <Tooltip title="Revision Language">
              <IconButton onClick={onSiteRevisionButtonClick} size="small" sx={{ color: 'black', ml: 'auto' }}><LibraryBooksIcon /></IconButton>
            </Tooltip>
          )}
        </Box>
        <Box sx={{ p: 2 }}>
          <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 1, color: 'text.secondary' }}>General Site Info</Typography>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '8px 16px', marginBottom: '24px' }}>
            {[
              'Total Site Size', 'Number of Parcels', 'Assessor Parcel Number (APN)', 'APN Description', 'Parcel Size',
              'Zoning Compliance', 'Zoning Classification Code', 'Zoning Classification Description', 'Primary Access',
              'Street Type and Surface', 'Typical for Market', 'Non-Residential Use', 'Apparent Defects, Damages, Deficiencies (Site)',
              'Renewable Energy Components', 'Ownership', 'Financing Arrangement',
              'Known Building Certifications', 'Known Efficiency Ratings',
              'Energy Efficient and Green Features Impact to Value/Marketability',
            ].map(field => {
              const isHighlighted = highlightedSiteFields && highlightedSiteFields.includes(field);
              return (
                <div key={field} style={{ borderBottom: '1px solid #e0e0e0', paddingBottom: '4px' }} className={isHighlighted ? 'highlighted-field' : ''}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#666', display: 'block' }}>{field}</span>
                  <EditableField
                    fieldPath={['SITE', field]}
                    value={data.SITE?.[field] || ''}
                    onDataChange={handleDataChange}
                    editingField={editingField}
                    setEditingField={setEditingField}
                    isEditable={true}
                    allData={allData}
                    manualValidations={manualValidations}
                    handleManualValidation={handleManualValidation}
                    revisionHandlers={revisionHandlers}
                    showBlankValidation={extractionAttempted}
                  />
                </div>
              );
            })}
          </div>

          <TableContainer component={Paper} variant="outlined" sx={{ mb: 4, borderRadius: 1, overflow: 'hidden' }}>
            <Box sx={{ bgcolor: '#f5f5f5', px: 2, py: 1, borderBottom: '1px solid #e0e0e0' }}>
              <Typography variant="subtitle2" fontWeight="bold">Site Influence</Typography>
            </Box>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: '#fafafa' }}>
                  <TableCell sx={{ fontWeight: 'bold', fontSize: '0.8rem', py: 1 }}>Influence</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', fontSize: '0.8rem', py: 1 }}>Proximity</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', fontSize: '0.8rem', py: 1 }}>Detail</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', fontSize: '0.8rem', py: 1 }}>Impact</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', fontSize: '0.8rem', py: 1 }}>Comment</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                <TableRow hover>
                  <TableCell sx={{ py: 0.5 }}>
                    <EditableField fieldPath={['SITE', 'Site Influence']} value={data.SITE?.['Site Influence'] || ''} onDataChange={handleDataChange} editingField={editingField} setEditingField={setEditingField} isEditable={true} allData={allData} manualValidations={manualValidations} handleManualValidation={handleManualValidation} revisionHandlers={revisionHandlers} showBlankValidation={extractionAttempted} />
                  </TableCell>
                  <TableCell sx={{ py: 0.5 }}>
                    <EditableField fieldPath={['SITE', 'Site Influence Proximity']} value={data.SITE?.['Site Influence Proximity'] || ''} onDataChange={handleDataChange} editingField={editingField} setEditingField={setEditingField} isEditable={true} allData={allData} manualValidations={manualValidations} handleManualValidation={handleManualValidation} revisionHandlers={revisionHandlers} showBlankValidation={extractionAttempted} />
                  </TableCell>
                  <TableCell sx={{ py: 0.5 }}>
                    <EditableField fieldPath={['SITE', 'Site Influence Detail']} value={data.SITE?.['Site Influence Detail'] || ''} onDataChange={handleDataChange} editingField={editingField} setEditingField={setEditingField} isEditable={true} allData={allData} manualValidations={manualValidations} handleManualValidation={handleManualValidation} revisionHandlers={revisionHandlers} showBlankValidation={extractionAttempted} />
                  </TableCell>
                  <TableCell sx={{ py: 0.5 }}>
                    <EditableField fieldPath={['SITE', 'Site Influence Impact']} value={data.SITE?.['Site Influence Impact'] || ''} onDataChange={handleDataChange} editingField={editingField} setEditingField={setEditingField} isEditable={true} allData={allData} manualValidations={manualValidations} handleManualValidation={handleManualValidation} revisionHandlers={revisionHandlers} showBlankValidation={extractionAttempted} />
                  </TableCell>
                  <TableCell sx={{ py: 0.5 }}>
                    <EditableField fieldPath={['SITE', 'Site Influence Comment']} value={data.SITE?.['Site Influence Comment'] || ''} onDataChange={handleDataChange} editingField={editingField} setEditingField={setEditingField} isEditable={true} allData={allData} manualValidations={manualValidations} handleManualValidation={handleManualValidation} revisionHandlers={revisionHandlers} showBlankValidation={extractionAttempted} />
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
            <Box sx={{ p: 2, borderTop: '1px solid #e0e0e0', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Typography variant="subtitle2" fontWeight="bold" sx={{ minWidth: '170px' }}>Site Influence Commentary:</Typography>
              <Box sx={{ flexGrow: 1 }}>
                <EditableField fieldPath={['SITE', 'Site Influence Commentary']} value={data.SITE?.['Site Influence Commentary'] || data['Site Influence Commentary'] || ''} onDataChange={handleDataChange} editingField={editingField} setEditingField={setEditingField} isEditable={true} allData={allData} manualValidations={manualValidations} handleManualValidation={handleManualValidation} revisionHandlers={revisionHandlers} showBlankValidation={extractionAttempted} />
              </Box>
            </Box>
          </TableContainer>

          <TableContainer component={Paper} variant="outlined" sx={{ mb: 4, borderRadius: 1, overflow: 'hidden' }}>
            <Box sx={{ bgcolor: '#f5f5f5', px: 2, py: 1, borderBottom: '1px solid #e0e0e0' }}>
              <Typography variant="subtitle2" fontWeight="bold">View and Impact to Value/Marketability</Typography>
            </Box>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: '#fafafa' }}>
                  <TableCell sx={{ fontWeight: 'bold', fontSize: '0.8rem', py: 1 }}>View</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', fontSize: '0.8rem', py: 1 }}>Range of View</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', fontSize: '0.8rem', py: 1 }}>Impact</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                <TableRow hover>
                  <TableCell sx={{ py: 0.5 }}>
                    <EditableField fieldPath={['SITE', 'View']} value={data.SITE?.['View'] || ''} onDataChange={handleDataChange} editingField={editingField} setEditingField={setEditingField} isEditable={true} allData={allData} manualValidations={manualValidations} handleManualValidation={handleManualValidation} revisionHandlers={revisionHandlers} showBlankValidation={extractionAttempted} />
                  </TableCell>
                  <TableCell sx={{ py: 0.5 }}>
                    <EditableField fieldPath={['SITE', 'Range of View']} value={data.SITE?.['Range of View'] || ''} onDataChange={handleDataChange} editingField={editingField} setEditingField={setEditingField} isEditable={true} allData={allData} manualValidations={manualValidations} handleManualValidation={handleManualValidation} revisionHandlers={revisionHandlers} showBlankValidation={extractionAttempted} />
                  </TableCell>
                  <TableCell sx={{ py: 0.5 }}>
                    <EditableField fieldPath={['SITE', 'View Impact']} value={data.SITE?.['View Impact'] || ''} onDataChange={handleDataChange} editingField={editingField} setEditingField={setEditingField} isEditable={true} allData={allData} manualValidations={manualValidations} handleManualValidation={handleManualValidation} revisionHandlers={revisionHandlers} showBlankValidation={extractionAttempted} />
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
            <Box sx={{ p: 2, borderTop: '1px solid #e0e0e0', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Typography variant="subtitle2" fontWeight="bold" sx={{ minWidth: '130px' }}>View Commentary:</Typography>
              <Box sx={{ flexGrow: 1 }}>
                <EditableField fieldPath={['SITE', 'View Commentary']} value={data.SITE?.['View Commentary'] || ''} onDataChange={handleDataChange} editingField={editingField} setEditingField={setEditingField} isEditable={true} allData={allData} manualValidations={manualValidations} handleManualValidation={handleManualValidation} revisionHandlers={revisionHandlers} showBlankValidation={extractionAttempted} />
              </Box>
            </Box>
          </TableContainer>

          <TableContainer component={Paper} variant="outlined" sx={{ mb: 4, borderRadius: 1, overflow: 'hidden' }}>
            <Box sx={{ bgcolor: '#f5f5f5', px: 2, py: 1, borderBottom: '1px solid #e0e0e0' }}>
              <Typography variant="subtitle2" fontWeight="bold">Site Features and Impact to Value/Marketability</Typography>
            </Box>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: '#fafafa' }}>
                  <TableCell sx={{ fontWeight: 'bold', fontSize: '0.8rem', py: 1 }}>Feature</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', fontSize: '0.8rem', py: 1 }}>Detail</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', fontSize: '0.8rem', py: 1 }}>Impact</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', fontSize: '0.8rem', py: 1 }}>Comment</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                <TableRow hover>
                  <TableCell sx={{ py: 0.5 }}>
                    <EditableField fieldPath={['SITE', 'Site Feature']} value={data.SITE?.['Site Feature'] || data['Site Feature'] || ''} onDataChange={handleDataChange} editingField={editingField} setEditingField={setEditingField} isEditable={true} allData={allData} manualValidations={manualValidations} handleManualValidation={handleManualValidation} revisionHandlers={revisionHandlers} showBlankValidation={extractionAttempted} />
                  </TableCell>
                  <TableCell sx={{ py: 0.5 }}>
                    <EditableField fieldPath={['SITE', 'Site Feature Detail']} value={data.SITE?.['Site Feature Detail'] || data['Site Feature Detail'] || ''} onDataChange={handleDataChange} editingField={editingField} setEditingField={setEditingField} isEditable={true} allData={allData} manualValidations={manualValidations} handleManualValidation={handleManualValidation} revisionHandlers={revisionHandlers} showBlankValidation={extractionAttempted} />
                  </TableCell>
                  <TableCell sx={{ py: 0.5 }}>
                    <EditableField fieldPath={['SITE', 'Site Feature Impact']} value={data.SITE?.['Site Feature Impact'] || data['Site Feature Impact'] || ''} onDataChange={handleDataChange} editingField={editingField} setEditingField={setEditingField} isEditable={true} allData={allData} manualValidations={manualValidations} handleManualValidation={handleManualValidation} revisionHandlers={revisionHandlers} showBlankValidation={extractionAttempted} />
                  </TableCell>
                  <TableCell sx={{ py: 0.5 }}>
                    <EditableField fieldPath={['SITE', 'Site Feature Comment']} value={data.SITE?.['Site Feature Comment'] || data['Site Feature Comment'] || ''} onDataChange={handleDataChange} editingField={editingField} setEditingField={setEditingField} isEditable={true} allData={allData} manualValidations={manualValidations} handleManualValidation={handleManualValidation} revisionHandlers={revisionHandlers} showBlankValidation={extractionAttempted} />
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
            <Box sx={{ p: 2, borderTop: '1px solid #e0e0e0', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Typography variant="subtitle2" fontWeight="bold" sx={{ minWidth: '170px' }}>Site Features Commentary:</Typography>
              <Box sx={{ flexGrow: 1 }}>
                <EditableField fieldPath={['SITE', 'Site Features Commentary']} value={data.SITE?.['Site Features Commentary'] || data['Site Features Commentary'] || ''} onDataChange={handleDataChange} editingField={editingField} setEditingField={setEditingField} isEditable={true} allData={allData} manualValidations={manualValidations} handleManualValidation={handleManualValidation} revisionHandlers={revisionHandlers} showBlankValidation={extractionAttempted} />
              </Box>
            </Box>
          </TableContainer>

          <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 1, overflow: 'hidden' }}>
            <Box sx={{ bgcolor: '#f5f5f5', px: 2, py: 1, borderBottom: '1px solid #e0e0e0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="subtitle2" fontWeight="bold">Utilities and Impact to Value/Marketability</Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>Broadband Internet Available:</span>
                <EditableField fieldPath={['SITE', 'Broadband Internet Available']} value={data.SITE?.['Broadband Internet Available'] || ''} onDataChange={handleDataChange} editingField={editingField} setEditingField={setEditingField} isEditable={true} allData={allData} manualValidations={manualValidations} handleManualValidation={handleManualValidation} revisionHandlers={revisionHandlers} showBlankValidation={extractionAttempted} />
              </Box>
            </Box>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: '#fafafa' }}>
                  <TableCell sx={{ fontWeight: 'bold', fontSize: '0.8rem', py: 1, width: '150px' }}></TableCell>
                  <TableCell sx={{ fontWeight: 'bold', fontSize: '0.8rem', py: 1, textAlign: 'center', width: '100px' }}>Public</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', fontSize: '0.8rem', py: 1, textAlign: 'center', width: '100px' }}>Private</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', fontSize: '0.8rem', py: 1 }}>Detail</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', fontSize: '0.8rem', py: 1 }}>Private Utility Impact</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', fontSize: '0.8rem', py: 1 }}>Comment</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {['Electricity', 'Sanitary Sewer', 'Water'].map(utility => {
                  const val = data.SITE?.[utility] || '';
                  const detailKey = `${utility} Detail`;
                  const impactKey = `${utility} Private Utility Impact`;
                  const commentKey = `${utility} Comment`;

                  return (
                    <TableRow key={utility} hover>
                      <TableCell sx={{ fontWeight: 'bold', fontSize: '0.85rem' }}>{utility}</TableCell>
                      <TableCell sx={{ textAlign: 'center' }}>
                        <Checkbox
                          size="small"
                          checked={val.toLowerCase() === 'public'}
                          onChange={(e) => handleDataChange(['SITE', utility], e.target.checked ? 'Public' : '')}
                        />
                      </TableCell>
                      <TableCell sx={{ textAlign: 'center' }}>
                        <Checkbox
                          size="small"
                          checked={val.toLowerCase() === 'private'}
                          onChange={(e) => handleDataChange(['SITE', utility], e.target.checked ? 'Private' : '')}
                        />
                      </TableCell>
                      <TableCell sx={{ py: 0.5 }}>
                        <EditableField fieldPath={['SITE', detailKey]} value={data.SITE?.[detailKey] || ''} onDataChange={handleDataChange} editingField={editingField} setEditingField={setEditingField} isEditable={true} allData={allData} manualValidations={manualValidations} handleManualValidation={handleManualValidation} revisionHandlers={revisionHandlers} showBlankValidation={extractionAttempted} />
                      </TableCell>
                      <TableCell sx={{ py: 0.5 }}>
                        <EditableField fieldPath={['SITE', impactKey]} value={data.SITE?.[impactKey] || ''} onDataChange={handleDataChange} editingField={editingField} setEditingField={setEditingField} isEditable={true} allData={allData} manualValidations={manualValidations} handleManualValidation={handleManualValidation} revisionHandlers={revisionHandlers} showBlankValidation={extractionAttempted} />
                      </TableCell>
                      <TableCell sx={{ py: 0.5 }}>
                        <EditableField fieldPath={['SITE', commentKey]} value={data.SITE?.[commentKey] || ''} onDataChange={handleDataChange} editingField={editingField} setEditingField={setEditingField} isEditable={true} allData={allData} manualValidations={manualValidations} handleManualValidation={handleManualValidation} revisionHandlers={revisionHandlers} showBlankValidation={extractionAttempted} />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>

          <Paper variant="outlined" sx={{ p: 2, mb: 3, mt: 3, borderRadius: 1 }}>
            <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 1 }}>Apparent Defects, Damages, Deficiencies (Site)</Typography>
            <EditableField
              fieldPath={['SITE', 'Apparent Defects, Damages, Deficiencies (Site)']}
              value={data.SITE?.['Apparent Defects, Damages, Deficiencies (Site)'] || data['Apparent Defects, Damages, Deficiencies (Site)'] || ''}
              onDataChange={handleDataChange}
              editingField={editingField}
              setEditingField={setEditingField}
              isEditable={true}
              allData={allData}
              manualValidations={manualValidations}
              handleManualValidation={handleManualValidation}
              revisionHandlers={revisionHandlers}
              showBlankValidation={extractionAttempted}
            />
          </Paper>

          <Paper variant="outlined" sx={{ p: 2, mb: 3, borderRadius: 1 }}>
            <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 1 }}>Site Commentary</Typography>
            <EditableField
              fieldPath={['SITE', 'Site Commentary']}
              value={data.SITE?.['Site Commentary'] || data['Site Commentary'] || ''}
              onDataChange={handleDataChange}
              editingField={editingField}
              setEditingField={setEditingField}
              isEditable={true}
              allData={allData}
              manualValidations={manualValidations}
              handleManualValidation={handleManualValidation}
              revisionHandlers={revisionHandlers}
              showBlankValidation={extractionAttempted}
            />
          </Paper>

          {/* Energy Efficient and Green Features */}
          <TableContainer component={Paper} variant="outlined" sx={{ mb: 3, borderRadius: 1, overflow: 'hidden' }}>
            <Box sx={{ bgcolor: '#2c3e50', color: '#fff', px: 2, py: 1 }}>
              <Typography variant="subtitle2" fontWeight="bold">Energy Efficient and Green Features</Typography>
            </Box>
            <Table size="small">
              <TableHead sx={{ bgcolor: '#f8f9fa' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 'bold', width: '33%' }}>Renewable Energy Components</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', width: '33%' }}>Ownership</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', width: '34%' }}>Financing Arrangement</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                <TableRow>
                  <TableCell>
                    <EditableField
                      fieldPath={['SITE', 'Renewable Energy Components']}
                      value={data.SITE?.['Renewable Energy Components'] || data['Renewable Energy Components'] || ''}
                      onDataChange={handleDataChange}
                      editingField={editingField}
                      setEditingField={setEditingField}
                      isEditable={true}
                      allData={allData}
                      manualValidations={manualValidations}
                      handleManualValidation={handleManualValidation}
                      revisionHandlers={revisionHandlers}
                      showBlankValidation={extractionAttempted}
                    />
                  </TableCell>
                  <TableCell>
                    <EditableField
                      fieldPath={['SITE', 'Ownership']}
                      value={data.SITE?.['Ownership'] || data['Ownership'] || ''}
                      onDataChange={handleDataChange}
                      editingField={editingField}
                      setEditingField={setEditingField}
                      isEditable={true}
                      allData={allData}
                      manualValidations={manualValidations}
                      handleManualValidation={handleManualValidation}
                      revisionHandlers={revisionHandlers}
                      showBlankValidation={extractionAttempted}
                    />
                  </TableCell>
                  <TableCell>
                    <EditableField
                      fieldPath={['SITE', 'Financing Arrangement']}
                      value={data.SITE?.['Financing Arrangement'] || data['Financing Arrangement'] || ''}
                      onDataChange={handleDataChange}
                      editingField={editingField}
                      setEditingField={setEditingField}
                      isEditable={true}
                      allData={allData}
                      manualValidations={manualValidations}
                      handleManualValidation={handleManualValidation}
                      revisionHandlers={revisionHandlers}
                      showBlankValidation={extractionAttempted}
                    />
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell sx={{ fontWeight: 'bold' }}>Known Building Certifications</TableCell>
                  <TableCell colSpan={2}>
                    <EditableField
                      fieldPath={['SITE', 'Known Building Certifications']}
                      value={data.SITE?.['Known Building Certifications'] || data['Known Building Certifications'] || ''}
                      onDataChange={handleDataChange}
                      editingField={editingField}
                      setEditingField={setEditingField}
                      isEditable={true}
                      allData={allData}
                      manualValidations={manualValidations}
                      handleManualValidation={handleManualValidation}
                      revisionHandlers={revisionHandlers}
                      showBlankValidation={extractionAttempted}
                    />
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell sx={{ fontWeight: 'bold' }}>Known Efficiency Ratings</TableCell>
                  <TableCell colSpan={2}>
                    <EditableField
                      fieldPath={['SITE', 'Known Efficiency Ratings']}
                      value={data.SITE?.['Known Efficiency Ratings'] || data['Known Efficiency Ratings'] || ''}
                      onDataChange={handleDataChange}
                      editingField={editingField}
                      setEditingField={setEditingField}
                      isEditable={true}
                      allData={allData}
                      manualValidations={manualValidations}
                      handleManualValidation={handleManualValidation}
                      revisionHandlers={revisionHandlers}
                      showBlankValidation={extractionAttempted}
                    />
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>

          {/* Energy Efficient and Green Features Impact to Value/Marketability */}
          <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 1, overflow: 'hidden' }}>
            <Box sx={{ bgcolor: '#e9ecef', px: 2, py: 1, borderBottom: '1px solid #ced4da' }}>
              <Typography variant="subtitle2" fontWeight="bold">Energy Efficient and Green Features Impact to Value/Marketability</Typography>
            </Box>
            <Box sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
              <Typography variant="body2" fontWeight="bold" sx={{ minWidth: '220px' }}>Impact to Value/Marketability</Typography>
              <Box sx={{ flexGrow: 1 }}>
                <EditableField
                  fieldPath={['SITE', 'Energy Efficient and Green Features Impact to Value/Marketability']}
                  value={data.SITE?.['Energy Efficient and Green Features Impact to Value/Marketability'] || data.SITE?.['Impact to Value/Marketability'] || data['Energy Efficient and Green Features Impact to Value/Marketability'] || data['Impact to Value/Marketability'] || ''}
                  onDataChange={handleDataChange}
                  editingField={editingField}
                  setEditingField={setEditingField}
                  isEditable={true}
                  allData={allData}
                  manualValidations={manualValidations}
                  handleManualValidation={handleManualValidation}
                  revisionHandlers={revisionHandlers}
                  showBlankValidation={extractionAttempted}
                />
              </Box>
            </Box>
          </TableContainer>
        </Box>
      </Paper>


      <Paper id="dwelling-exterior" elevation={3} sx={{ mb: 4, borderRadius: 2, overflow: 'hidden', border: '1px solid', borderColor: 'success.main' }}>
        <Box sx={{ bgcolor: 'success.main', color: 'white', px: 2, py: 1.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="subtitle1" fontWeight="bold">Dwelling Exterior</Typography>
          {onImprovementsRevisionButtonClick && (
            <Tooltip title="Revision Language">
              <IconButton onClick={onImprovementsRevisionButtonClick} size="small" sx={{ color: 'white', ml: 'auto' }}><LibraryBooksIcon /></IconButton>
            </Tooltip>
          )}
        </Box>
        <Box sx={{ p: 2 }}>
          <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 1, color: 'text.secondary' }}>General Dwelling Info</Typography>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '8px 16px', marginBottom: '24px' }}>
            {[
              'Units in Structure', 'Floors in Building', 'Dwelling Style', 'Front Door Elevation',
              'Year Built', 'Construction Method', 'Converted Area', 'Dwelling Exterior Exhibits'
            ].map(field => (
              <div key={field} style={{ borderBottom: '1px solid #e0e0e0', paddingBottom: '4px' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#666', display: 'block' }}>{field}</span>
                <EditableField
                  fieldPath={[field]}
                  value={data[field] || ''}
                  onDataChange={handleDataChange}
                  editingField={editingField}
                  setEditingField={setEditingField}
                  isEditable={true}
                  allData={allData}
                  manualValidations={manualValidations}
                  handleManualValidation={handleManualValidation}
                  revisionHandlers={revisionHandlers}
                  showBlankValidation={extractionAttempted}
                />
              </div>
            ))}
          </div>

          <TableContainer component={Paper} variant="outlined" sx={{ mb: 4, borderRadius: 1, overflow: 'hidden' }}>
            <Box sx={{ bgcolor: '#f5f5f5', px: 2, py: 1, borderBottom: '1px solid #e0e0e0' }}>
              <Typography variant="subtitle2" fontWeight="bold">Quality and Condition</Typography>
            </Box>
            <Box sx={{ p: 2, display: 'flex', gap: '40px', flexWrap: 'wrap', borderBottom: '1px solid #e0e0e0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <Typography variant="subtitle2" fontWeight="bold" sx={{ color: '#495057' }}>Exterior Quality Rating:</Typography>
                <Box sx={{ width: '100px' }}>
                  <EditableField fieldPath={['Exterior Quality Rating']} value={data['Exterior Quality Rating'] || ''} onDataChange={handleDataChange} editingField={editingField} setEditingField={setEditingField} isEditable={true} allData={allData} manualValidations={manualValidations} handleManualValidation={handleManualValidation} revisionHandlers={revisionHandlers} showBlankValidation={extractionAttempted} />
                </Box>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <Typography variant="subtitle2" fontWeight="bold" sx={{ color: '#495057' }}>Exterior Condition Rating:</Typography>
                <Box sx={{ width: '100px' }}>
                  <EditableField fieldPath={['Exterior Condition Rating']} value={data['Exterior Condition Rating'] || ''} onDataChange={handleDataChange} editingField={editingField} setEditingField={setEditingField} isEditable={true} allData={allData} manualValidations={manualValidations} handleManualValidation={handleManualValidation} revisionHandlers={revisionHandlers} showBlankValidation={extractionAttempted} />
                </Box>
              </div>
            </Box>
            <Box sx={{ px: 2, py: 1, bgcolor: '#fafafa' }}>
              <Typography variant="caption" sx={{ fontStyle: 'italic', color: '#555' }}>
                The table below supports the Exterior Quality and Condition ratings and reflects the market value condition of this report
              </Typography>
            </Box>
          </TableContainer>

          <TableContainer component={Paper} variant="outlined" sx={{ mb: 4, borderRadius: 1, overflow: 'hidden' }}>
            <Box sx={{ bgcolor: '#f5f5f5', px: 2, py: 1, borderBottom: '1px solid #e0e0e0' }}>
              <Typography variant="subtitle2" fontWeight="bold">Exterior Features</Typography>
            </Box>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: '#fafafa' }}>
                  <TableCell sx={{ fontWeight: 'bold', fontSize: '0.8rem', py: 1, width: '220px' }}>Feature</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', fontSize: '0.8rem', py: 1 }}>Detail</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', fontSize: '0.8rem', py: 1 }}>Quality Comment</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', fontSize: '0.8rem', py: 1 }}>Condition Status</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', fontSize: '0.8rem', py: 1 }}>Condition Comment</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {[
                  { label: 'Exterior Walls and Trim', valueKey: 'Exterior Walls and Trim' },
                  { label: 'Foundation', valueKey: 'Foundation' },
                  { label: 'Roof', valueKey: 'Roof' },
                  { label: 'Windows', valueKey: 'Windows' }
                ].map(feature => {
                  const detailKey = feature.valueKey;
                  const qCommentKey = `${feature.valueKey} Quality Comment`;
                  const cStatusKey = `${feature.valueKey} Condition Status`;
                  const cCommentKey = `${feature.valueKey} Condition Comment`;

                  return (
                    <TableRow key={feature.label} hover>
                      <TableCell sx={{ fontWeight: 'bold', fontSize: '0.85rem' }}>{feature.label}</TableCell>
                      <TableCell sx={{ py: 0.5 }}>
                        {feature.label === 'Roof' ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <EditableField fieldPath={['Roof']} value={data['Roof'] || ''} onDataChange={handleDataChange} editingField={editingField} setEditingField={setEditingField} isEditable={true} allData={allData} placeholder="Roof type" />
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#666' }}>Est. Age:</span>
                              <EditableField fieldPath={['Roof Estimated Age']} value={data['Roof Estimated Age'] || ''} onDataChange={handleDataChange} editingField={editingField} setEditingField={setEditingField} isEditable={true} allData={allData} placeholder="e.g. 1-10 years" />
                            </div>
                          </div>
                        ) : (
                          <EditableField fieldPath={[detailKey]} value={data[detailKey] || ''} onDataChange={handleDataChange} editingField={editingField} setEditingField={setEditingField} isEditable={true} allData={allData} showBlankValidation={extractionAttempted} />
                        )}
                      </TableCell>
                      <TableCell sx={{ py: 0.5 }}>
                        <EditableField fieldPath={[qCommentKey]} value={data[qCommentKey] || ''} onDataChange={handleDataChange} editingField={editingField} setEditingField={setEditingField} isEditable={true} allData={allData} showBlankValidation={extractionAttempted} />
                      </TableCell>
                      <TableCell sx={{ py: 0.5 }}>
                        <EditableField fieldPath={[cStatusKey]} value={data[cStatusKey] || ''} onDataChange={handleDataChange} editingField={editingField} setEditingField={setEditingField} isEditable={true} allData={allData} showBlankValidation={extractionAttempted} />
                      </TableCell>
                      <TableCell sx={{ py: 0.5 }}>
                        <EditableField fieldPath={[cCommentKey]} value={data[cCommentKey] || ''} onDataChange={handleDataChange} editingField={editingField} setEditingField={setEditingField} isEditable={true} allData={allData} showBlankValidation={extractionAttempted} />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px' }}>
            <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 1, overflow: 'hidden' }}>
              <Box sx={{ bgcolor: '#f5f5f5', px: 2, py: 1, borderBottom: '1px solid #e0e0e0' }}>
                <Typography variant="subtitle2" fontWeight="bold">Mechanical System Details</Typography>
              </Box>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: '#fafafa' }}>
                    <TableCell sx={{ fontWeight: 'bold', fontSize: '0.8rem', py: 1 }}>System</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', fontSize: '0.8rem', py: 1 }}>Detail</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', fontSize: '0.8rem', py: 1 }}>Fuel</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  <TableRow hover>
                    <TableCell sx={{ fontWeight: 'bold' }}>Heating</TableCell>
                    <TableCell sx={{ py: 0.5 }}>
                      <EditableField fieldPath={['Heating System']} value={data['Heating System'] || ''} onDataChange={handleDataChange} editingField={editingField} setEditingField={setEditingField} isEditable={true} allData={allData} showBlankValidation={extractionAttempted} />
                    </TableCell>
                    <TableCell sx={{ py: 0.5 }}>
                      <EditableField fieldPath={['Heating Fuel']} value={data['Heating Fuel'] || ''} onDataChange={handleDataChange} editingField={editingField} setEditingField={setEditingField} isEditable={true} allData={allData} showBlankValidation={extractionAttempted} />
                    </TableCell>
                  </TableRow>
                  <TableRow hover>
                    <TableCell sx={{ fontWeight: 'bold' }}>Cooling</TableCell>
                    <TableCell sx={{ py: 0.5 }}>
                      <EditableField fieldPath={['Cooling System']} value={data['Cooling System'] || ''} onDataChange={handleDataChange} editingField={editingField} setEditingField={setEditingField} isEditable={true} allData={allData} showBlankValidation={extractionAttempted} />
                    </TableCell>
                    <TableCell sx={{ py: 0.5 }}></TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>

            <Paper variant="outlined" sx={{ p: 2, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', borderRadius: 1 }}>
              <div>
                <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 1.5 }}>Core Heating System Below Grade</Typography>
                <Box sx={{ display: 'flex', gap: '24px', mb: 2 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Checkbox
                      size="small"
                      checked={String(data['Core Heating System Below Grade']).toLowerCase() === 'yes' || data['Core Heating System Below Grade'] === true}
                      onChange={(e) => handleDataChange(['Core Heating System Below Grade'], e.target.checked ? 'Yes' : 'No')}
                    />
                    <Typography variant="body2" fontWeight="medium">Yes</Typography>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Checkbox
                      size="small"
                      checked={String(data['Core Heating System Below Grade']).toLowerCase() === 'no' || data['Core Heating System Below Grade'] === false}
                      onChange={(e) => handleDataChange(['Core Heating System Below Grade'], e.target.checked ? 'No' : 'Yes')}
                    />
                    <Typography variant="body2" fontWeight="medium">No</Typography>
                  </div>
                </Box>
              </div>

              <div style={{ borderTop: '1px solid #e0e0e0', paddingTop: '10px' }}>
                <Typography variant="caption" fontWeight="bold" sx={{ color: '#666', display: 'block', mb: 0.5 }}>Other Mechanical Systems</Typography>
                <EditableField
                  fieldPath={['Other Mechanical Systems']}
                  value={data['Other Mechanical Systems'] || ''}
                  onDataChange={handleDataChange}
                  editingField={editingField}
                  setEditingField={setEditingField}
                  isEditable={true}
                  allData={allData}
                  manualValidations={manualValidations}
                  handleManualValidation={handleManualValidation}
                  revisionHandlers={revisionHandlers}
                  placeholder="e.g. Water Heater"
                />
              </div>
            </Paper>
          </div>

          <Paper variant="outlined" sx={{ p: 2, mb: 3, borderRadius: 1 }}>
            <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 1 }}>Apparent Defects, Damages, Deficiencies (Dwelling Exterior)</Typography>
            <EditableField
              fieldPath={['Apparent Defects, Damages, Deficiencies (Dwelling Exterior)']}
              value={data['Apparent Defects, Damages, Deficiencies (Dwelling Exterior)'] || ''}
              onDataChange={handleDataChange}
              editingField={editingField}
              setEditingField={setEditingField}
              isEditable={true}
              allData={allData}
              manualValidations={manualValidations}
              handleManualValidation={handleManualValidation}
              revisionHandlers={revisionHandlers}
              showBlankValidation={extractionAttempted}
            />
          </Paper>

          <Paper variant="outlined" sx={{ p: 2, borderRadius: 1 }}>
            <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 1 }}>Dwelling Exterior Commentary</Typography>
            <EditableField
              fieldPath={['Dwelling Exterior Commentary']}
              value={data['Dwelling Exterior Commentary'] || data.IMPROVEMENTS?.['Dwelling Exterior Commentary'] || ''}
              onDataChange={handleDataChange}
              editingField={editingField}
              setEditingField={setEditingField}
              isEditable={true}
              allData={allData}
              manualValidations={manualValidations}
              handleManualValidation={handleManualValidation}
              revisionHandlers={revisionHandlers}
              showBlankValidation={extractionAttempted}
            />
          </Paper>

        </Box>
      </Paper>

      <Paper id="amenities-quality-condition" elevation={3} sx={{ mb: 4, borderRadius: 2, overflow: 'hidden', border: '1px solid', borderColor: 'secondary.main' }}>
        <Box sx={{ bgcolor: 'secondary.main', color: 'white', px: 2, py: 1.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="subtitle1" fontWeight="bold">Unit Interior</Typography>
          {onImprovementsRevisionButtonClick && (
            <Tooltip title="Revision Language">
              <IconButton onClick={onImprovementsRevisionButtonClick} size="small" sx={{ color: 'white', ml: 'auto' }}><LibraryBooksIcon /></IconButton>
            </Tooltip>
          )}
        </Box>
        <Box sx={{ p: 2 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px' }}>
            <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 1, overflow: 'hidden' }}>
              <Box sx={{ bgcolor: '#f5f5f5', px: 2, py: 1, borderBottom: '1px solid #e0e0e0' }}>
                <Typography variant="subtitle2" fontWeight="bold">Area Breakdown</Typography>
              </Box>
              <Table size="small">
                <TableBody>
                  {[
                    { label: 'Finished Above Grade', key: 'Finished Above Grade' },
                    { label: 'Unfinished Above Grade', key: 'Unfinished Above Grade' },
                    { label: 'Finished Below Grade', key: 'Finished Below Grade' },
                    { label: 'Unfinished Below Grade', key: 'Unfinished Below Grade' },
                    { label: 'Area Data Source', key: 'Area Data Source' }
                  ].map(row => (
                    <TableRow key={row.label} hover>
                      <TableCell sx={{ fontWeight: 'bold', width: '200px', py: 0.5 }}>{row.label}</TableCell>
                      <TableCell sx={{ py: 0.5 }}>
                        <EditableField fieldPath={[row.key]} value={data[row.key] || ''} onDataChange={handleDataChange} editingField={editingField} setEditingField={setEditingField} isEditable={true} allData={allData} showBlankValidation={extractionAttempted} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 1, overflow: 'hidden' }}>
              <Box sx={{ bgcolor: '#f5f5f5', px: 2, py: 1, borderBottom: '1px solid #e0e0e0' }}>
                <Typography variant="subtitle2" fontWeight="bold">Unit details</Typography>
              </Box>
              <Table size="small">
                <TableBody>
                  {[
                    { label: 'Levels in Unit', key: 'Levels in Unit' },
                    { label: 'Occupancy', key: 'Occupancy' },
                    { label: 'Total Bedrooms', key: 'Total Bedrooms' },
                    { label: 'Total Bathrooms - Full', key: 'Total Bathrooms - Full' },
                    { label: 'Total Bathrooms - Half', key: 'Total Bathrooms - Half' }
                  ].map(row => (
                    <TableRow key={row.label} hover>
                      <TableCell sx={{ fontWeight: 'bold', width: '200px', py: 0.5 }}>{row.label}</TableCell>
                      <TableCell sx={{ py: 0.5 }}>
                        <EditableField fieldPath={[row.key]} value={data[row.key] || ''} onDataChange={handleDataChange} editingField={editingField} setEditingField={setEditingField} isEditable={true} allData={allData} showBlankValidation={extractionAttempted} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </div>

          <TableContainer component={Paper} variant="outlined" sx={{ mb: 4, borderRadius: 1, overflow: 'hidden' }}>
            <Box sx={{ bgcolor: '#f5f5f5', px: 2, py: 1, borderBottom: '1px solid #e0e0e0' }}>
              <Typography variant="subtitle2" fontWeight="bold">Level and Room Detail</Typography>
            </Box>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: '#fafafa' }}>
                  <TableCell sx={{ fontWeight: 'bold', fontSize: '0.8rem', py: 1 }}>Level in Unit</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', fontSize: '0.8rem', py: 1 }}>Grade Level Detail</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', fontSize: '0.8rem', py: 1 }}>Finish</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', fontSize: '0.8rem', py: 1 }}>Area</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', fontSize: '0.8rem', py: 1 }}>Room Summary</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {[1, 2, 3].map(rowIdx => {
                  const levelKey = `Level in Unit Row ${rowIdx}`;
                  const gradeKey = `Grade Level Detail Row ${rowIdx}`;
                  const finishKey = `Finish Row ${rowIdx}`;
                  const areaKey = `Area Row ${rowIdx}`;
                  const roomKey = `Room Summary Row ${rowIdx}`;

                  if (rowIdx > 1 && !data[levelKey] && !data[gradeKey] && !data[finishKey] && !data[areaKey] && !data[roomKey] && editingField !== levelKey) {
                    return null;
                  }

                  return (
                    <TableRow key={rowIdx} hover>
                      <TableCell sx={{ py: 0.5 }}>
                        <EditableField fieldPath={[levelKey]} value={data[levelKey] || ''} onDataChange={handleDataChange} editingField={editingField} setEditingField={setEditingField} isEditable={true} allData={allData} placeholder={rowIdx === 1 ? "e.g. Level 1" : ""} />
                      </TableCell>
                      <TableCell sx={{ py: 0.5 }}>
                        <EditableField fieldPath={[gradeKey]} value={data[gradeKey] || ''} onDataChange={handleDataChange} editingField={editingField} setEditingField={setEditingField} isEditable={true} allData={allData} placeholder={rowIdx === 1 ? "e.g. Above Grade" : ""} />
                      </TableCell>
                      <TableCell sx={{ py: 0.5 }}>
                        <EditableField fieldPath={[finishKey]} value={data[finishKey] || ''} onDataChange={handleDataChange} editingField={editingField} setEditingField={setEditingField} isEditable={true} allData={allData} placeholder={rowIdx === 1 ? "e.g. Finished" : ""} />
                      </TableCell>
                      <TableCell sx={{ py: 0.5 }}>
                        <EditableField fieldPath={[areaKey]} value={data[areaKey] || ''} onDataChange={handleDataChange} editingField={editingField} setEditingField={setEditingField} isEditable={true} allData={allData} placeholder={rowIdx === 1 ? "e.g. 1492 Sq. Ft." : ""} />
                      </TableCell>
                      <TableCell sx={{ py: 0.5 }}>
                        <EditableField fieldPath={[roomKey]} value={data[roomKey] || ''} onDataChange={handleDataChange} editingField={editingField} setEditingField={setEditingField} isEditable={true} allData={allData} placeholder={rowIdx === 1 ? "e.g. 1-Kitchen, 3-Bedroom" : ""} style={{ whiteSpace: 'pre-line' }} />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>

          <TableContainer component={Paper} variant="outlined" sx={{ mb: 4, borderRadius: 1, overflow: 'hidden' }}>
            <Box sx={{ bgcolor: '#f5f5f5', px: 2, py: 1, borderBottom: '1px solid #e0e0e0' }}>
              <Typography variant="subtitle2" fontWeight="bold">Kitchen and Bathroom Details</Typography>
            </Box>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: '#fafafa' }}>
                  <TableCell sx={{ fontWeight: 'bold', fontSize: '0.8rem', py: 1, width: '220px' }}>Room</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', fontSize: '0.8rem', py: 1 }}>Update Status</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', fontSize: '0.8rem', py: 1 }}>Time Frame</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', fontSize: '0.8rem', py: 1 }}>Quality Comment</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', fontSize: '0.8rem', py: 1 }}>Condition Status</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', fontSize: '0.8rem', py: 1 }}>Condition Comment</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {(() => {
                  const indices = new Set([1, 2, 3]);
                  Object.keys(data || {}).forEach(k => {
                    const m = k.match(/^Kitchen\/Bath Row (\d+) Room$/);
                    if (m) indices.add(parseInt(m[1], 10));
                  });
                  return Array.from(indices).sort((a, b) => a - b).map(rowIdx => {
                    const roomKey = `Kitchen/Bath Row ${rowIdx} Room`;
                    const statusKey = `Kitchen/Bath Row ${rowIdx} Update Status`;
                    const tfKey = `Kitchen/Bath Row ${rowIdx} Time Frame`;
                    const qCommentKey = `Kitchen/Bath Row ${rowIdx} Quality Comment`;
                    const cStatusKey = `Kitchen/Bath Row ${rowIdx} Condition Status`;
                    const cCommentKey = `Kitchen/Bath Row ${rowIdx} Condition Comment`;

                    if (rowIdx > 1 && !data[roomKey] && !data[statusKey] && !data[tfKey] && !data[qCommentKey] && !data[cStatusKey] && !data[cCommentKey] && editingField !== roomKey) {
                      return null;
                    }

                    return (
                      <TableRow key={rowIdx} hover>
                        <TableCell sx={{ py: 0.5 }}>
                          <EditableField fieldPath={[roomKey]} value={data[roomKey] || ''} onDataChange={handleDataChange} editingField={editingField} setEditingField={setEditingField} isEditable={true} allData={allData} placeholder={rowIdx === 1 ? "e.g. Kitchen Level 1" : "e.g. Bath - Full Level 1"} />
                        </TableCell>
                        <TableCell sx={{ py: 0.5 }}>
                          <EditableField fieldPath={[statusKey]} value={data[statusKey] || ''} onDataChange={handleDataChange} editingField={editingField} setEditingField={setEditingField} isEditable={true} allData={allData} placeholder="e.g. Partially Updated" />
                        </TableCell>
                        <TableCell sx={{ py: 0.5 }}>
                          <EditableField fieldPath={[tfKey]} value={data[tfKey] || ''} onDataChange={handleDataChange} editingField={editingField} setEditingField={setEditingField} isEditable={true} allData={allData} placeholder="e.g. 5-10 Years" />
                        </TableCell>
                        <TableCell sx={{ py: 0.5 }}>
                          <EditableField fieldPath={[qCommentKey]} value={data[qCommentKey] || ''} onDataChange={handleDataChange} editingField={editingField} setEditingField={setEditingField} isEditable={true} allData={allData} showBlankValidation={extractionAttempted} />
                        </TableCell>
                        <TableCell sx={{ py: 0.5 }}>
                          <EditableField fieldPath={[cStatusKey]} value={data[cStatusKey] || ''} onDataChange={handleDataChange} editingField={editingField} setEditingField={setEditingField} isEditable={true} allData={allData} placeholder="e.g. Typical Wear & Tear" />
                        </TableCell>
                        <TableCell sx={{ py: 0.5 }}>
                          <EditableField fieldPath={[cCommentKey]} value={data[cCommentKey] || ''} onDataChange={handleDataChange} editingField={editingField} setEditingField={setEditingField} isEditable={true} allData={allData} showBlankValidation={extractionAttempted} />
                        </TableCell>
                      </TableRow>
                    );
                  });
                })()}
              </TableBody>
            </Table>
            <Box sx={{ p: 2, borderTop: '1px solid #e0e0e0', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Typography variant="subtitle2" fontWeight="bold" sx={{ minWidth: '220px' }}>Overall Update Status for Bathrooms:</Typography>
              <Box sx={{ width: '250px' }}>
                <EditableField fieldPath={['Overall Update Status for Bathrooms']} value={data['Overall Update Status for Bathrooms'] || ''} onDataChange={handleDataChange} editingField={editingField} setEditingField={setEditingField} isEditable={true} allData={allData} placeholder="e.g. Moderately Updated" />
              </Box>
            </Box>
          </TableContainer>

          <TableContainer component={Paper} variant="outlined" sx={{ mb: 4, borderRadius: 1, overflow: 'hidden' }}>
            <Box sx={{ bgcolor: '#f5f5f5', px: 2, py: 1, borderBottom: '1px solid #e0e0e0' }}>
              <Typography variant="subtitle2" fontWeight="bold">Interior Features</Typography>
            </Box>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: '#fafafa' }}>
                  <TableCell sx={{ fontWeight: 'bold', fontSize: '0.8rem', py: 1, width: '220px' }}>Feature</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', fontSize: '0.8rem', py: 1 }}>Detail</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', fontSize: '0.8rem', py: 1 }}>Quality Comment</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', fontSize: '0.8rem', py: 1 }}>Condition Status</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', fontSize: '0.8rem', py: 1 }}>Condition Comment</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {[
                  { label: 'Flooring', valueKey: 'Flooring' },
                  { label: 'Walls and Ceiling', valueKey: 'Walls and Ceiling' },
                  ...((data['Bath Floor Detail'] || data['Bath Floor Condition Status']) ? [{ label: 'Bath Floor', valueKey: 'Bath Floor' }] : [])
                ].map(feature => {
                  const detailKey = `${feature.valueKey} Detail`;
                  const qCommentKey = `${feature.valueKey} Quality Comment`;
                  const cStatusKey = `${feature.valueKey} Condition Status`;
                  const cCommentKey = `${feature.valueKey} Condition Comment`;

                  return (
                    <TableRow key={feature.label} hover>
                      <TableCell sx={{ fontWeight: 'bold', fontSize: '0.85rem' }}>{feature.label}</TableCell>
                      <TableCell sx={{ py: 0.5 }}>
                        <EditableField fieldPath={[detailKey]} value={data[detailKey] || ''} onDataChange={handleDataChange} editingField={editingField} setEditingField={setEditingField} isEditable={true} allData={allData} showBlankValidation={extractionAttempted} />
                      </TableCell>
                      <TableCell sx={{ py: 0.5 }}>
                        <EditableField fieldPath={[qCommentKey]} value={data[qCommentKey] || ''} onDataChange={handleDataChange} editingField={editingField} setEditingField={setEditingField} isEditable={true} allData={allData} showBlankValidation={extractionAttempted} />
                      </TableCell>
                      <TableCell sx={{ py: 0.5 }}>
                        <EditableField fieldPath={[cStatusKey]} value={data[cStatusKey] || ''} onDataChange={handleDataChange} editingField={editingField} setEditingField={setEditingField} isEditable={true} allData={allData} showBlankValidation={extractionAttempted} />
                      </TableCell>
                      <TableCell sx={{ py: 0.5 }}>
                        <EditableField fieldPath={[cCommentKey]} value={data[cCommentKey] || ''} onDataChange={handleDataChange} editingField={editingField} setEditingField={setEditingField} isEditable={true} allData={allData} showBlankValidation={extractionAttempted} />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            <Box sx={{ p: 2, borderTop: '1px solid #e0e0e0', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Typography variant="subtitle2" fontWeight="bold" sx={{ minWidth: '220px' }}>Overall Update Status for Flooring:</Typography>
              <Box sx={{ width: '250px' }}>
                <EditableField fieldPath={['Overall Update Status for Flooring']} value={data['Overall Update Status for Flooring'] || ''} onDataChange={handleDataChange} editingField={editingField} setEditingField={setEditingField} isEditable={true} allData={allData} placeholder="e.g. Fully Updated" />
              </Box>
            </Box>
          </TableContainer>

          <Paper variant="outlined" sx={{ p: 2, mb: 4, borderRadius: 1 }}>
            <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 1 }}>Apparent Defects, Damages, Deficiencies (Unit Interior)</Typography>
            <EditableField
              fieldPath={['Apparent Defects, Damages, Deficiencies (Unit Interior)']}
              value={data['Apparent Defects, Damages, Deficiencies (Unit Interior)'] || ''}
              onDataChange={handleDataChange}
              editingField={editingField}
              setEditingField={setEditingField}
              isEditable={true}
              allData={allData}
              manualValidations={manualValidations}
              handleManualValidation={handleManualValidation}
              revisionHandlers={revisionHandlers}
              showBlankValidation={extractionAttempted}
            />
          </Paper>

          <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 1, overflow: 'hidden' }}>
            <Box sx={{ bgcolor: '#f5f5f5', px: 2, py: 1, borderBottom: '1px solid #e0e0e0' }}>
              <Typography variant="subtitle2" fontWeight="bold">Quality and Condition</Typography>
            </Box>
            <Box sx={{ p: 2, display: 'flex', gap: '40px', flexWrap: 'wrap', borderBottom: '1px solid #e0e0e0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <Typography variant="subtitle2" fontWeight="bold" sx={{ color: '#495057' }}>Interior Quality Rating:</Typography>
                <Box sx={{ width: '100px' }}>
                  <EditableField fieldPath={['Interior Quality Rating']} value={data['Interior Quality Rating'] || ''} onDataChange={handleDataChange} editingField={editingField} setEditingField={setEditingField} isEditable={true} allData={allData} manualValidations={manualValidations} handleManualValidation={handleManualValidation} revisionHandlers={revisionHandlers} showBlankValidation={extractionAttempted} />
                </Box>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <Typography variant="subtitle2" fontWeight="bold" sx={{ color: '#495057' }}>Interior Condition Rating:</Typography>
                <Box sx={{ width: '100px' }}>
                  <EditableField fieldPath={['Interior Condition Rating']} value={data['Interior Condition Rating'] || ''} onDataChange={handleDataChange} editingField={editingField} setEditingField={setEditingField} isEditable={true} allData={allData} manualValidations={manualValidations} handleManualValidation={handleManualValidation} revisionHandlers={revisionHandlers} showBlankValidation={extractionAttempted} />
                </Box>
              </div>
            </Box>
            <Box sx={{ px: 2, py: 1, bgcolor: '#fafafa' }}>
              <Typography variant="caption" sx={{ fontStyle: 'italic', color: '#555' }}>
                The tables below support the Interior Quality and Condition ratings and reflect the market value condition of this report
              </Typography>
            </Box>
          </TableContainer>

        </Box>
      </Paper>

      <Paper id="highest-best-use-market" elevation={3} sx={{ mb: 4, borderRadius: 2, overflow: 'hidden', border: '1px solid', borderColor: 'info.main' }}>
        <Box sx={{ bgcolor: 'info.main', color: 'black', px: 2, py: 1.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="subtitle1" fontWeight="bold">Highest & Best Use & Market</Typography>
          {onNeighborhoodRevisionButtonClick && (
            <Tooltip title="Revision Language">
              <IconButton onClick={onNeighborhoodRevisionButtonClick} size="small" sx={{ color: 'black', ml: 'auto' }}><LibraryBooksIcon /></IconButton>
            </Tooltip>
          )}
        </Box>
        <Box sx={{ p: 2 }}>
          <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 1, color: 'text.secondary' }}>Highest and Best Use</Typography>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '8px 16px', marginBottom: '24px' }}>
            {[
              { label: 'Legally Permissible', key: 'Legally Permissible' },
              { label: 'Physically Possible', key: 'Physically Possible' },
              { label: 'Financially Feasible', key: 'Financially Feasible' },
              { label: 'Maximally Productive', key: 'Maximally Productive' },
              { label: 'Highest and Best Use as Improved (Present Use)', key: 'Highest and Best Use as Improved (Present Use)' }
            ].map(field => (
              <div key={field.key} style={{ borderBottom: '1px solid #e0e0e0', paddingBottom: '4px' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#666', display: 'block' }}>{field.label}</span>
                <EditableField
                  fieldPath={['SITE', field.key]}
                  value={data.SITE?.[field.key] || ''}
                  onDataChange={handleDataChange}
                  editingField={editingField}
                  setEditingField={setEditingField}
                  isEditable={true}
                  allData={allData}
                />
              </div>
            ))}
          </div>
          <Paper variant="outlined" sx={{ p: 2, mb: 4, borderRadius: 1 }}>
            <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 1 }}>Highest and Best Use Commentary</Typography>
            <EditableField
              fieldPath={['SITE', 'Highest and Best Use Commentary']}
              value={data.SITE?.['Highest and Best Use Commentary'] || ''}
              onDataChange={handleDataChange}
              editingField={editingField}
              setEditingField={setEditingField}
              isEditable={true}
              allData={allData}
              manualValidations={manualValidations}
              handleManualValidation={handleManualValidation}
              revisionHandlers={revisionHandlers}
              showBlankValidation={extractionAttempted}
            />
          </Paper>

          <hr style={{ margin: '24px 0', borderColor: '#e0e0e0' }} />

          <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 2, color: 'text.secondary' }}>Market Search Results</Typography>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', borderBottom: '1px solid #e0e0e0', paddingBottom: '8px' }}>
              <Typography variant="subtitle2" fontWeight="bold" sx={{ minWidth: '180px' }}>Market Area Boundary:</Typography>
              <Box sx={{ flexGrow: 1 }}>
                <EditableField fieldPath={['NEIGHBORHOOD', 'Market Area Boundary']} value={data.NEIGHBORHOOD?.['Market Area Boundary'] || ''} onDataChange={handleDataChange} editingField={editingField} setEditingField={setEditingField} isEditable={true} allData={allData} showBlankValidation={extractionAttempted} />
              </Box>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', borderBottom: '1px solid #e0e0e0', paddingBottom: '8px' }}>
              <Typography variant="subtitle2" fontWeight="bold" sx={{ minWidth: '180px' }}>Search Criteria Description:</Typography>
              <Box sx={{ flexGrow: 1 }}>
                <EditableField fieldPath={['NEIGHBORHOOD', 'Search Criteria Description']} value={data.NEIGHBORHOOD?.['Search Criteria Description'] || ''} onDataChange={handleDataChange} editingField={editingField} setEditingField={setEditingField} isEditable={true} allData={allData} showBlankValidation={extractionAttempted} />
              </Box>
            </div>
          </div>

          <TableContainer component={Paper} variant="outlined" sx={{ mb: 4, borderRadius: 1, overflow: 'hidden' }}>
            <Box sx={{ bgcolor: '#f5f5f5', px: 2, py: 1, borderBottom: '1px solid #e0e0e0' }}>
              <Typography variant="subtitle2" fontWeight="bold">Search Result Metrics</Typography>
            </Box>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1px', backgroundColor: '#e0e0e0' }}>
              <div style={{ backgroundColor: '#fff' }}>
                <Table size="small">
                  <TableBody>
                    {[
                      { label: 'Active Listings', key: 'Active Listings' },
                      { label: '  Median Days on Market', key: 'Median Days on Market', indent: true },
                      { label: '  Lowest List Price', key: 'Lowest List Price', indent: true },
                      { label: '  Median List Price', key: 'Median List Price', indent: true },
                      { label: '  Highest List Price', key: 'Highest List Price', indent: true },
                      { label: 'Pending Sales', key: 'Pending Sales' }
                    ].map(row => (
                      <TableRow key={row.key} hover>
                        <TableCell sx={{ fontWeight: 'bold', pl: row.indent ? 4 : 2, py: 0.5, fontSize: '0.85rem' }}>{row.label}</TableCell>
                        <TableCell sx={{ py: 0.5 }}>
                          <EditableField fieldPath={['NEIGHBORHOOD', row.key]} value={data.NEIGHBORHOOD?.[row.key] || ''} onDataChange={handleDataChange} editingField={editingField} setEditingField={setEditingField} isEditable={true} allData={allData} showBlankValidation={extractionAttempted} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div style={{ backgroundColor: '#fff' }}>
                <Table size="small">
                  <TableBody>
                    {[
                      { label: 'Sales in Past 12 Months', key: 'Sales in Past 12 Months' },
                      { label: '  Lowest Sale Price', key: 'Lowest Sale Price', indent: true },
                      { label: '  Median Sale Price', key: 'Median Sale Price', indent: true },
                      { label: '  Highest Sale Price', key: 'Highest Sale Price', indent: true },
                      { label: 'Distressed Market Competition', key: 'Distressed Market Competition' },
                      { label: 'Price Trend Source (Graph)', key: 'Price Trend Source' }
                    ].map(row => (
                      <TableRow key={row.key} hover>
                        <TableCell sx={{ fontWeight: 'bold', pl: row.indent ? 4 : 2, py: 0.5, fontSize: '0.85rem' }}>{row.label}</TableCell>
                        <TableCell sx={{ py: 0.5 }}>
                          <EditableField fieldPath={['NEIGHBORHOOD', row.key]} value={data.NEIGHBORHOOD?.[row.key] || ''} onDataChange={handleDataChange} editingField={editingField} setEditingField={setEditingField} isEditable={true} allData={allData} showBlankValidation={row.key === 'Median Sale Price' ? false : extractionAttempted} manualValidations={row.key === 'Median Sale Price' ? manualValidations : undefined} handleManualValidation={row.key === 'Median Sale Price' ? handleManualValidation : undefined} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </TableContainer>

          <Paper variant="outlined" sx={{ p: 2, mb: 4, borderRadius: 1 }}>
            <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 1 }}>Price Trend Analysis Commentary</Typography>
            <EditableField
              fieldPath={['NEIGHBORHOOD', 'Price Trend Analysis Commentary']}
              value={data.NEIGHBORHOOD?.['Price Trend Analysis Commentary'] || ''}
              onDataChange={handleDataChange}
              editingField={editingField}
              setEditingField={setEditingField}
              isEditable={true}
              allData={allData}
            />
          </Paper>

          <TableContainer component={Paper} variant="outlined" sx={{ mb: 4, borderRadius: 1, overflow: 'hidden' }}>
            <Box sx={{ bgcolor: '#f5f5f5', px: 2, py: 1, borderBottom: '1px solid #e0e0e0' }}>
              <Typography variant="subtitle2" fontWeight="bold">Housing Trends</Typography>
            </Box>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', padding: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', borderBottom: '1px solid #e0e0e0', paddingBottom: '4px' }}>
                <Typography variant="subtitle2" fontWeight="bold" sx={{ color: '#555', minWidth: '130px' }}>Demand/Supply:</Typography>
                <Box sx={{ flexGrow: 1 }}>
                  <EditableField fieldPath={['NEIGHBORHOOD', 'Demand / Supply']} value={data.NEIGHBORHOOD?.['Demand / Supply'] || ''} onDataChange={handleDataChange} editingField={editingField} setEditingField={setEditingField} isEditable={true} allData={allData} showBlankValidation={extractionAttempted} />
                </Box>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', borderBottom: '1px solid #e0e0e0', paddingBottom: '4px' }}>
                <Typography variant="subtitle2" fontWeight="bold" sx={{ color: '#555', minWidth: '130px' }}>Marketing Time:</Typography>
                <Box sx={{ flexGrow: 1 }}>
                  <EditableField fieldPath={['NEIGHBORHOOD', 'Marketing Time']} value={data.NEIGHBORHOOD?.['Marketing Time'] || ''} onDataChange={handleDataChange} editingField={editingField} setEditingField={setEditingField} isEditable={true} allData={allData} showBlankValidation={extractionAttempted} />
                </Box>
              </div>
            </div>
          </TableContainer>

          <Paper variant="outlined" sx={{ p: 2, mb: 4, borderRadius: 1 }}>
            <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 1 }}>Market Commentary</Typography>
            <EditableField
              fieldPath={['NEIGHBORHOOD', 'Market Commentary']}
              value={data.NEIGHBORHOOD?.['Market Commentary'] || ''}
              onDataChange={handleDataChange}
              editingField={editingField}
              setEditingField={setEditingField}
              isEditable={true}
              allData={allData}
            />
          </Paper>

          <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 1, color: 'text.secondary' }}>Additional Neighborhood Info</Typography>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '8px 16px' }}>
            {[
              { label: 'Current or Relevant Listings', key: 'Current or Relevant Listings' },
              { label: 'Data Source', key: 'Data Source' },
              { label: 'Subject Listing Information Commentary', key: 'Subject Listing Information Commentary' },
              { label: 'Subject Listing Information Exhibits', key: 'Subject Listing Information Exhibits' }
            ].map(field => (
              <div key={field.key} style={{ borderBottom: '1px solid #e0e0e0', paddingBottom: '4px' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#666', display: 'block' }}>{field.label}</span>
                <EditableField
                  fieldPath={['NEIGHBORHOOD', field.key]}
                  value={data.NEIGHBORHOOD?.[field.key] || ''}
                  onDataChange={handleDataChange}
                  editingField={editingField}
                  setEditingField={setEditingField}
                  isEditable={true}
                  allData={allData}
                />
              </div>
            ))}
          </div>

        </Box>
      </Paper>

      <Paper id="project-info-section" elevation={3} sx={{ mb: 4, borderRadius: 2, overflow: 'hidden', border: '1px solid', borderColor: '#334155' }}>
        <Box sx={{ bgcolor: '#334155', color: 'white', px: 2, py: 1.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="subtitle1" fontWeight="bold">Project Information</Typography>
        </Box>

        <Box sx={{ p: 2, bgcolor: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', gap: 3, flexWrap: 'wrap', alignItems: 'center' }}>
          <Typography variant="subtitle2" fontWeight="bold" sx={{ color: '#1e293b' }}>Project Type:</Typography>
          {[
            'Planned Unit Development (PUD)',
            'Condominium',
            'Cooperative',
            'Condop'
          ].map(cb => {
            const isChecked = (data.PROJECT_INFO?.[cb] || data[cb] || '').toLowerCase() === 'yes';
            return (
              <Box key={cb} sx={{ display: 'flex', alignItems: 'center' }}>
                <Checkbox
                  checked={isChecked}
                  onChange={e => handleDataChange(['PROJECT_INFO', cb], e.target.checked ? 'Yes' : 'No')}
                  size="small"
                />
                <Typography variant="body2" sx={{ fontWeight: isChecked ? 600 : 400 }}>{cb}</Typography>
              </Box>
            );
          })}
        </Box>

        <Box sx={{ p: 2 }}>
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 1, color: '#334155' }}>General Project Info</Typography>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px 24px' }}>
              <div style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '4px' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#64748b', display: 'block' }}>Project Information Data Source</span>
                <EditableField
                  fieldPath={['PROJECT_INFO', 'Project Information Data Source']}
                  value={data.PROJECT_INFO?.['Project Information Data Source'] || data['Project Information Data Source'] || ''}
                  onDataChange={handleDataChange}
                  editingField={editingField}
                  setEditingField={setEditingField}
                  isEditable={true}
                  allData={allData}
                  placeholder="e.g. Builder or Developer"
                />
              </div>
            </div>
          </Box>

          <Paper variant="outlined" sx={{ p: 2, mb: 3, borderRadius: 1.5, bgcolor: '#fcfcfc' }}>
            <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 1.5, color: '#1e293b' }}>Mandatory Fees (HOA, PUD, or Co-op)</Typography>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
              <div style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '4px' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#64748b', display: 'block' }}>Monthly Amount</span>
                <EditableField
                  fieldPath={['PROJECT_INFO', 'Monthly Amount']}
                  value={data.PROJECT_INFO?.['Monthly Amount'] || data['Monthly Amount'] || ''}
                  onDataChange={handleDataChange}
                  editingField={editingField}
                  setEditingField={setEditingField}
                  isEditable={true}
                  allData={allData}
                  placeholder="e.g. $250"
                />
              </div>
              <div style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '4px' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#64748b', display: 'block' }}>Common Amenities / Services Included</span>
                <EditableField
                  fieldPath={['PROJECT_INFO', 'Common Amenities / Services Included']}
                  value={data.PROJECT_INFO?.['Common Amenities / Services Included'] || data['Common Amenities / Services Included'] || ''}
                  onDataChange={handleDataChange}
                  editingField={editingField}
                  setEditingField={setEditingField}
                  isEditable={true}
                  allData={allData}
                  placeholder="e.g. Clubhouse, Inground Pool"
                />
              </div>
              <div style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '4px' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#64748b', display: 'block' }}>Utilities Included</span>
                <EditableField
                  fieldPath={['PROJECT_INFO', 'Utilities Included']}
                  value={data.PROJECT_INFO?.['Utilities Included'] || data['Utilities Included'] || ''}
                  onDataChange={handleDataChange}
                  editingField={editingField}
                  setEditingField={setEditingField}
                  isEditable={true}
                  allData={allData}
                  placeholder="e.g. None"
                />
              </div>
            </div>
          </Paper>

          <TableContainer component={Paper} variant="outlined" sx={{ mb: 3, borderRadius: 1.5, overflow: 'hidden' }}>
            <Box sx={{ bgcolor: '#f1f5f9', px: 2, py: 1, borderBottom: '1px solid #cbd5e1' }}>
              <Typography variant="subtitle2" fontWeight="bold">Project Factors and Impact to Value/Marketability</Typography>
            </Box>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: '#f8fafc' }}>
                  <TableCell sx={{ fontWeight: 'bold', fontSize: '0.8rem', py: 1, width: '220px' }}>Project Factor</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', fontSize: '0.8rem', py: 1, width: '120px' }}>Detail</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', fontSize: '0.8rem', py: 1, width: '140px' }}>Impact</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', fontSize: '0.8rem', py: 1 }}>Comment</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {[
                  { label: 'Developer/Sponsor in Control', key: 'Developer/Sponsor in Control' },
                  { label: 'Known Legal Actions', key: 'Known Legal Actions' },
                  { label: 'Unit Special Assessments', key: 'Unit Special Assessments' },
                  { label: 'Unit Tax Abatements or Exemptions', key: 'Unit Tax Abatements or Exemptions' }
                ].map(factor => {
                  const detKey = `${factor.key} Detail`;
                  const impKey = `${factor.key} Impact`;
                  const comKey = `${factor.key} Comment`;

                  return (
                    <TableRow key={factor.key} hover>
                      <TableCell sx={{ fontWeight: 600, fontSize: '0.85rem' }}>{factor.label}</TableCell>
                      <TableCell sx={{ py: 0.5 }}>
                        <EditableField
                          fieldPath={['PROJECT_INFO', detKey]}
                          value={data.PROJECT_INFO?.[detKey] || data[detKey] || ''}
                          onDataChange={handleDataChange}
                          editingField={editingField}
                          setEditingField={setEditingField}
                          isEditable={true}
                          allData={allData}
                          placeholder="e.g. Yes / None"
                        />
                      </TableCell>
                      <TableCell sx={{ py: 0.5 }}>
                        <EditableField
                          fieldPath={['PROJECT_INFO', impKey]}
                          value={data.PROJECT_INFO?.[impKey] || data[impKey] || ''}
                          onDataChange={handleDataChange}
                          editingField={editingField}
                          setEditingField={setEditingField}
                          isEditable={true}
                          allData={allData}
                          placeholder="e.g. Neutral"
                        />
                      </TableCell>
                      <TableCell sx={{ py: 0.5 }}>
                        <EditableField
                          fieldPath={['PROJECT_INFO', comKey]}
                          value={data.PROJECT_INFO?.[comKey] || data[comKey] || ''}
                          onDataChange={handleDataChange}
                          editingField={editingField}
                          setEditingField={setEditingField}
                          isEditable={true}
                          allData={allData}
                          placeholder="Comment"
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>

          <Paper variant="outlined" sx={{ p: 2, mb: 2, borderRadius: 1.5 }}>
            <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 1 }}>Project Factors Commentary</Typography>
            <EditableField
              fieldPath={['PROJECT_INFO', 'Project Factors Commentary']}
              value={data.PROJECT_INFO?.['Project Factors Commentary'] || data['Project Factors Commentary'] || ''}
              onDataChange={handleDataChange}
              editingField={editingField}
              setEditingField={setEditingField}
              isEditable={true}
              allData={allData}
              placeholder="Project Factors Commentary"
            />
          </Paper>

          <Paper variant="outlined" sx={{ p: 2, borderRadius: 1.5 }}>
            <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 1 }}>Project Information Commentary</Typography>
            <EditableField
              fieldPath={['PROJECT_INFO', 'Project Information Commentary']}
              value={data.PROJECT_INFO?.['Project Information Commentary'] || data['Project Information Commentary'] || ''}
              onDataChange={handleDataChange}
              editingField={editingField}
              setEditingField={setEditingField}
              isEditable={true}
              allData={allData}
              placeholder="Project Information Commentary"
            />
          </Paper>
        </Box>
      </Paper>

      <GridInfoCard
        id="subject-listing-info"
        title="Subject Listing Information"
        fields={subjectListingFields}
        data={data}
        cardClass="bg-warning"
        extractionAttempted={extractionAttempted}
        onDataChange={(field, value) => handleDataChange(field, value)}
        editingField={editingField}
        setEditingField={setEditingField}
        isEditable={true}
        allData={allData}
        loading={loading}
        loadingSection={loadingSection}
        manualValidations={manualValidations}
        handleManualValidation={handleManualValidation}
        revisionHandlers={revisionHandlers}
        showBlankValidation={extractionAttempted}
      />

      <Paper id="prior-sale-history" elevation={3} sx={{ mb: 4, borderRadius: 2, overflow: 'hidden', border: '1px solid', borderColor: 'grey.700' }}>
        <Box sx={{ bgcolor: 'grey.700', color: 'white', px: 2, py: 1.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="subtitle1" fontWeight="bold">Prior Sale & Transfer History</Typography>
        </Box>
        <Box sx={{ p: 2 }}>
          <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 0.5, color: '#333' }}>Subject Transfer History</Typography>
          <Typography variant="caption" sx={{ fontStyle: 'italic', color: '#666', display: 'block', mb: 2 }}>
            Prior sales and/or transfers of the subject property (minimum 3 year look back)
          </Typography>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 24px', marginBottom: '20px' }}>
            <div style={{ borderBottom: '1px solid #e0e0e0', paddingBottom: '4px' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#666', display: 'block' }}>Prior Sales or Transfers</span>
              <EditableField
                fieldPath={['Prior Sales or Transfers']}
                value={data['Prior Sales or Transfers'] || ''}
                onDataChange={handleDataChange}
                editingField={editingField}
                setEditingField={setEditingField}
                isEditable={true}
                allData={allData}
              />
            </div>
            <div style={{ borderBottom: '1px solid #e0e0e0', paddingBottom: '4px' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#666', display: 'block' }}>Data Source</span>
              <EditableField
                fieldPath={['Subject Transfer History Data Source']}
                value={data['Subject Transfer History Data Source'] || ''}
                onDataChange={handleDataChange}
                editingField={editingField}
                setEditingField={setEditingField}
                isEditable={true}
                allData={allData}
              />
            </div>
          </div>

          <Paper variant="outlined" sx={{ p: 2, mb: 4, borderRadius: 1 }}>
            <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 1 }}>Analysis of Prior Sale and Transfer History of Subject Property</Typography>
            <EditableField
              fieldPath={['Analysis of Prior Sale and Transfer History of Subject Property']}
              value={data['Analysis of Prior Sale and Transfer History of Subject Property'] || ''}
              onDataChange={handleDataChange}
              editingField={editingField}
              setEditingField={setEditingField}
              isEditable={true}
              allData={allData}
              manualValidations={manualValidations}
              handleManualValidation={handleManualValidation}
              revisionHandlers={revisionHandlers}
              showBlankValidation={extractionAttempted}
            />
          </Paper>

          <hr style={{ margin: '24px 0', borderColor: '#e0e0e0' }} />

          <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 0.5, color: '#333' }}>Comparable Transfer History</Typography>
          <Typography variant="caption" sx={{ fontStyle: 'italic', color: '#666', display: 'block', mb: 2 }}>
            Prior sales and/or transfers of the comparable properties from the 'Sales Comparison Approach' section (minimum 1 year look back)
          </Typography>

          <TableContainer component={Paper} variant="outlined" sx={{ mb: 4, borderRadius: 1, overflow: 'hidden' }}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: '#fafafa' }}>
                  <TableCell sx={{ fontWeight: 'bold', fontSize: '0.8rem', py: 1, width: '60px', textAlign: 'center' }}>#</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', fontSize: '0.8rem', py: 1 }}>Transfer Terms</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', fontSize: '0.8rem', py: 1 }}>Date</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', fontSize: '0.8rem', py: 1 }}>Amount</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', fontSize: '0.8rem', py: 1 }}>Data Source</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {[1, 2, 3].map(idx => {
                  const termsKey = `Comparable ${idx} Transfer Terms`;
                  const dateKey = `Comparable ${idx} Transfer Date`;
                  const amountKey = `Comparable ${idx} Transfer Amount`;
                  const dsKey = `Comparable ${idx} Transfer Data Source`;

                  return (
                    <TableRow key={idx} hover>
                      <TableCell sx={{ py: 0.5, textAlign: 'center', fontWeight: 'bold' }}>{idx}</TableCell>
                      <TableCell sx={{ py: 0.5 }}>
                        <EditableField fieldPath={[termsKey]} value={data[termsKey] || ''} onDataChange={handleDataChange} editingField={editingField} setEditingField={setEditingField} isEditable={true} allData={allData} showBlankValidation={extractionAttempted} />
                      </TableCell>
                      <TableCell sx={{ py: 0.5 }}>
                        <EditableField fieldPath={[dateKey]} value={data[dateKey] || ''} onDataChange={handleDataChange} editingField={editingField} setEditingField={setEditingField} isEditable={true} allData={allData} showBlankValidation={extractionAttempted} />
                      </TableCell>
                      <TableCell sx={{ py: 0.5 }}>
                        <EditableField fieldPath={[amountKey]} value={data[amountKey] || ''} onDataChange={handleDataChange} editingField={editingField} setEditingField={setEditingField} isEditable={true} allData={allData} showBlankValidation={extractionAttempted} />
                      </TableCell>
                      <TableCell sx={{ py: 0.5 }}>
                        <EditableField fieldPath={[dsKey]} value={data[dsKey] || ''} onDataChange={handleDataChange} editingField={editingField} setEditingField={setEditingField} isEditable={true} allData={allData} showBlankValidation={extractionAttempted} />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>

          <Paper variant="outlined" sx={{ p: 2, borderRadius: 1 }}>
            <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 1 }}>Analysis of Prior Sale and Transfer History of Comparable Sales</Typography>
            <EditableField
              fieldPath={['Analysis of Prior Sale and Transfer History of Comparable Sales']}
              value={data['Analysis of Prior Sale and Transfer History of Comparable Sales'] || ''}
              onDataChange={handleDataChange}
              editingField={editingField}
              setEditingField={setEditingField}
              isEditable={true}
              allData={allData}
              manualValidations={manualValidations}
              handleManualValidation={handleManualValidation}
              revisionHandlers={revisionHandlers}
              showBlankValidation={extractionAttempted}
            />
          </Paper>

        </Box>
      </Paper>

      <div id="sales-comparison-approach">
        <SalesComparisonSection
          id="sales-comparison-grid"
          data={data}
          extractionAttempted={extractionAttempted}
          handleDataChange={handleDataChange}
          editingField={editingField}
          setEditingField={setEditingField}
          salesGridRows={version1SalesGridRows}
          comparableSales={comparableSales}
          salesHistoryFields={salesHistoryFields}
          salesComparisonAdditionalInfoFields={version1SalesComparisonAdditionalInfoFields}
          isEditable={true}
          allData={allData}
          formType={formType}
          manualValidations={manualValidations}
          handleManualValidation={handleManualValidation}
          onRevisionButtonClick={onSalesGridRevisionButtonClick}
          revisionHandlers={revisionHandlers}
        />
      </div>

      <Paper id="cost-approach" elevation={3} sx={{ mb: 4, borderRadius: 2, overflow: 'hidden', border: '1px solid', borderColor: 'grey.800' }}>
        <Box sx={{ bgcolor: 'grey.800', color: 'white', px: 2, py: 1.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="subtitle1" fontWeight="bold">Cost Approach</Typography>
          {onCostApproachRevisionButtonClick && (
            <Tooltip title="Revision Language">
              <IconButton onClick={onCostApproachRevisionButtonClick} size="small" sx={{ color: 'white', ml: 'auto' }}><LibraryBooksIcon /></IconButton>
            </Tooltip>
          )}
        </Box>
        <Box sx={{ p: 2 }}>
          <TableContainer component={Paper} variant="outlined" sx={{ mb: 4, borderRadius: 1, overflow: 'hidden' }}>
            <Box sx={{ bgcolor: '#fafafa', px: 2, py: 1.5, borderBottom: '1px solid #e0e0e0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="subtitle2" fontWeight="bold">Indicated Value by Cost Approach</Typography>
              <Box sx={{ width: '200px' }}>
                <EditableField fieldPath={['Indicated Value by Cost Approach']} value={data['Indicated Value by Cost Approach'] || ''} onDataChange={handleDataChange} editingField={editingField} setEditingField={setEditingField} isEditable={true} allData={allData} showBlankValidation={extractionAttempted} />
              </Box>
            </Box>
            <Table size="small">
              <TableBody>
                {[
                  { label: 'Depreciated Cost of Dwellings', key: 'Depreciated Cost of Dwellings' },
                  { label: 'As Is Value of Site Improvements', key: 'As Is Value of Site Improvements' },
                  { label: 'Opinion of Site Value', key: 'Opinion of Site Value' }
                ].map(row => (
                  <TableRow key={row.key} hover>
                    <TableCell sx={{ pl: 4, py: 0.5, fontWeight: 'bold' }}>{row.label}</TableCell>
                    <TableCell sx={{ py: 0.5, textAlign: 'right', pr: 4, width: '250px' }}>
                      <EditableField fieldPath={[row.key]} value={data[row.key] || ''} onDataChange={handleDataChange} editingField={editingField} setEditingField={setEditingField} isEditable={true} allData={allData} showBlankValidation={extractionAttempted} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          <TableContainer component={Paper} variant="outlined" sx={{ mb: 4, borderRadius: 1, overflow: 'hidden' }}>
            <Box sx={{ bgcolor: '#f5f5f5', px: 2, py: 1, borderBottom: '1px solid #e0e0e0' }}>
              <Typography variant="subtitle2" fontWeight="bold">Depreciated Cost - Dwelling</Typography>
            </Box>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: '#fafafa' }}>
                  <TableCell sx={{ fontWeight: 'bold', fontSize: '0.8rem', py: 1 }}></TableCell>
                  <TableCell sx={{ fontWeight: 'bold', fontSize: '0.8rem', py: 1 }}>Size</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', fontSize: '0.8rem', py: 1 }}>Rate</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', fontSize: '0.8rem', py: 1 }}>Total Amount</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {/* 1. Above Grade Finished Area (Row 1) */}
                <TableRow hover>
                  <TableCell sx={{ fontWeight: 'bold', py: 0.5 }}>
                    {data['Dwelling Cost Item 1 Description'] || 'Above Grade Finished Area'}
                  </TableCell>
                  <TableCell sx={{ py: 0.5 }}>
                    <EditableField fieldPath={['Above Grade Finished Area']} value={data['Above Grade Finished Area'] || data['Dwelling Cost Item 1 Size'] || ''} onDataChange={handleDataChange} editingField={editingField} setEditingField={setEditingField} isEditable={true} allData={allData} placeholder="1,492 Sq. Ft." />
                  </TableCell>
                  <TableCell sx={{ py: 0.5 }}>
                    <EditableField fieldPath={['Cost Per Square Foot']} value={data['Cost Per Square Foot'] || data['Dwelling Cost Item 1 Rate'] || ''} onDataChange={handleDataChange} editingField={editingField} setEditingField={setEditingField} isEditable={true} allData={allData} placeholder="$151.31" />
                  </TableCell>
                  <TableCell sx={{ py: 0.5 }}>
                    <EditableField fieldPath={['Depreciated Cost']} value={data['Depreciated Cost'] || data['Dwelling Cost Item 1 Amount'] || ''} onDataChange={handleDataChange} editingField={editingField} setEditingField={setEditingField} isEditable={true} allData={allData} placeholder="$225,755" />
                  </TableCell>
                </TableRow>

                {/* 2. Additional dynamic dwelling cost items (e.g. Attached Garage, Porch;Scrn;Pat, Finished Basement, etc.) */}
                {[2, 3, 4, 5, 6].map(rowIdx => {
                  const descKey = `Dwelling Cost Item ${rowIdx} Description`;
                  const sizeKey = `Dwelling Cost Item ${rowIdx} Size`;
                  const rateKey = `Dwelling Cost Item ${rowIdx} Rate`;
                  const amtKey = `Dwelling Cost Item ${rowIdx} Amount`;

                  if (!data[descKey] && !data[sizeKey] && !data[rateKey] && !data[amtKey] && editingField !== descKey) {
                    return null;
                  }

                  return (
                    <TableRow key={rowIdx} hover>
                      <TableCell sx={{ fontWeight: 'bold', py: 0.5 }}>
                        <EditableField fieldPath={[descKey]} value={data[descKey] || ''} onDataChange={handleDataChange} editingField={editingField} setEditingField={setEditingField} isEditable={true} allData={allData} placeholder="e.g. Attached Garage" />
                      </TableCell>
                      <TableCell sx={{ py: 0.5 }}>
                        <EditableField fieldPath={[sizeKey]} value={data[sizeKey] || ''} onDataChange={handleDataChange} editingField={editingField} setEditingField={setEditingField} isEditable={true} allData={allData} placeholder="508 Sq. Ft." />
                      </TableCell>
                      <TableCell sx={{ py: 0.5 }}>
                        <EditableField fieldPath={[rateKey]} value={data[rateKey] || ''} onDataChange={handleDataChange} editingField={editingField} setEditingField={setEditingField} isEditable={true} allData={allData} placeholder="$48" />
                      </TableCell>
                      <TableCell sx={{ py: 0.5 }}>
                        <EditableField fieldPath={[amtKey]} value={data[amtKey] || ''} onDataChange={handleDataChange} editingField={editingField} setEditingField={setEditingField} isEditable={true} allData={allData} placeholder="$24,384" />
                      </TableCell>
                    </TableRow>
                  );
                })}

                {/* 3. Depreciation Rows (Physical, Functional, External) */}
                {[
                  { label: 'Physical Depreciation', rateKey: 'Physical Depreciation', amtKey: 'Physical Depreciation Amount' },
                  { label: 'Functional Depreciation', rateKey: 'Functional Depreciation', amtKey: 'Functional Depreciation Amount' },
                  { label: 'External Depreciation', rateKey: 'External Depreciation', amtKey: 'External Depreciation Amount' }
                ].map(row => (
                  <TableRow key={row.label} hover>
                    <TableCell sx={{ fontWeight: 'bold', py: 0.5 }}>{row.label}</TableCell>
                    <TableCell sx={{ py: 0.5 }}>
                      <EditableField fieldPath={[row.rateKey]} value={data[row.rateKey] || ''} onDataChange={handleDataChange} editingField={editingField} setEditingField={setEditingField} isEditable={true} allData={allData} placeholder="0%" />
                    </TableCell>
                    <TableCell sx={{ py: 0.5 }}></TableCell>
                    <TableCell sx={{ py: 0.5 }}>
                      <EditableField fieldPath={[row.amtKey]} value={data[row.amtKey] || ''} onDataChange={handleDataChange} editingField={editingField} setEditingField={setEditingField} isEditable={true} allData={allData} placeholder="$0" />
                    </TableCell>
                  </TableRow>
                ))}

                {/* 4. Total Row */}
                <TableRow sx={{ bgcolor: '#fafafa' }}>
                  <TableCell sx={{ fontWeight: 'bold', py: 1 }}>Total</TableCell>
                  <TableCell sx={{ py: 1 }}></TableCell>
                  <TableCell sx={{ py: 1 }}></TableCell>
                  <TableCell sx={{ py: 1, fontWeight: 'bold' }}>
                    <EditableField fieldPath={['Depreciated Cost of Dwellings']} value={data['Depreciated Cost of Dwellings'] || data['Total Depreciation'] || ''} onDataChange={handleDataChange} editingField={editingField} setEditingField={setEditingField} isEditable={true} allData={allData} placeholder="$494,481" />
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 24px', marginBottom: '24px' }}>
            <div style={{ borderBottom: '1px solid #e0e0e0', paddingBottom: '4px' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#666', display: 'block' }}>Remaining Economic Life</span>
              <EditableField fieldPath={['Remaining Economic Life']} value={data['Remaining Economic Life'] || ''} onDataChange={handleDataChange} editingField={editingField} setEditingField={setEditingField} isEditable={true} allData={allData} placeholder="80 years" />
            </div>
            <div style={{ borderBottom: '1px solid #e0e0e0', paddingBottom: '4px' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#666', display: 'block' }}>Effective Age</span>
              <EditableField fieldPath={['Effective Age']} value={data['Effective Age'] || ''} onDataChange={handleDataChange} editingField={editingField} setEditingField={setEditingField} isEditable={true} allData={allData} placeholder="2 years" />
            </div>
          </div>

          <Paper variant="outlined" sx={{ p: 2, mb: 4, borderRadius: 1 }}>
            <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 1 }}>Commentary on Remaining Economic Life</Typography>
            <EditableField fieldPath={['Commentary on Remaining Economic Life']} value={data['Commentary on Remaining Economic Life'] || ''} onDataChange={handleDataChange} editingField={editingField} setEditingField={setEditingField} isEditable={true} allData={allData} showBlankValidation={extractionAttempted} />
          </Paper>

          <Paper variant="outlined" sx={{ p: 2, mb: 4, borderRadius: 1 }}>
            <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 1 }}>Commentary on Effective Age</Typography>
            <EditableField fieldPath={['Commentary on Effective Age']} value={data['Commentary on Effective Age'] || ''} onDataChange={handleDataChange} editingField={editingField} setEditingField={setEditingField} isEditable={true} allData={allData} showBlankValidation={extractionAttempted} />
          </Paper>

          <TableContainer component={Paper} variant="outlined" sx={{ mb: 4, borderRadius: 1, overflow: 'hidden' }}>
            <Box sx={{ bgcolor: '#f5f5f5', px: 2, py: 1, borderBottom: '1px solid #e0e0e0' }}>
              <Typography variant="subtitle2" fontWeight="bold">As Is Value of Site Improvements</Typography>
            </Box>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: '#fafafa' }}>
                  <TableCell sx={{ fontWeight: 'bold', fontSize: '0.8rem', py: 1 }}>Description</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', fontSize: '0.8rem', py: 1, width: '250px' }}>Amount</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                <TableRow hover>
                  <TableCell sx={{ py: 0.5 }}>
                    <EditableField fieldPath={['Site Improvement Description']} value={data['Site Improvement Description'] || ''} onDataChange={handleDataChange} editingField={editingField} setEditingField={setEditingField} isEditable={true} allData={allData} placeholder="Driveway" />
                  </TableCell>
                  <TableCell sx={{ py: 0.5 }}>
                    <EditableField fieldPath={['Site Improvement Amount']} value={data['Site Improvement Amount'] || ''} onDataChange={handleDataChange} editingField={editingField} setEditingField={setEditingField} isEditable={true} allData={allData} placeholder="$6,000" />
                  </TableCell>
                </TableRow>
                <TableRow sx={{ bgcolor: '#fafafa' }}>
                  <TableCell sx={{ fontWeight: 'bold', py: 1 }}>Total</TableCell>
                  <TableCell sx={{ py: 1, fontWeight: 'bold' }}>
                    <EditableField fieldPath={['As Is Value of Site Improvements']} value={data['As Is Value of Site Improvements'] || ''} onDataChange={handleDataChange} editingField={editingField} setEditingField={setEditingField} isEditable={true} allData={allData} placeholder="$6,000" />
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>

          <TableContainer component={Paper} variant="outlined" sx={{ mb: 4, borderRadius: 1, overflow: 'hidden' }}>
            <Box sx={{ bgcolor: '#f5f5f5', px: 2, py: 1, borderBottom: '1px solid #e0e0e0' }}>
              <Typography variant="subtitle2" fontWeight="bold">Site Value</Typography>
            </Box>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 24px', padding: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', borderBottom: '1px solid #e0e0e0', paddingBottom: '4px' }}>
                <Typography variant="subtitle2" fontWeight="bold" sx={{ color: '#555', minWidth: '180px' }}>Primary Site Valuation Method:</Typography>
                <Box sx={{ flexGrow: 1 }}>
                  <EditableField fieldPath={['Primary Site Valuation Method']} value={data['Primary Site Valuation Method'] || ''} onDataChange={handleDataChange} editingField={editingField} setEditingField={setEditingField} isEditable={true} allData={allData} placeholder="Sales Comparison" />
                </Box>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', borderBottom: '1px solid #e0e0e0', paddingBottom: '4px' }}>
                <Typography variant="subtitle2" fontWeight="bold" sx={{ color: '#555', minWidth: '180px' }}>Opinion of Site Value:</Typography>
                <Box sx={{ flexGrow: 1 }}>
                  <EditableField fieldPath={['Opinion of Site Value']} value={data['Opinion of Site Value'] || ''} onDataChange={handleDataChange} editingField={editingField} setEditingField={setEditingField} isEditable={true} allData={allData} placeholder="$53,000" />
                </Box>
              </div>
            </div>
          </TableContainer>

          <TableContainer component={Paper} variant="outlined" sx={{ mb: 4, borderRadius: 1, overflow: 'hidden' }}>
            <Box sx={{ bgcolor: '#f5f5f5', px: 2, py: 1, borderBottom: '1px solid #e0e0e0' }}>
              <Typography variant="subtitle2" fontWeight="bold">Land Comparables</Typography>
            </Box>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: '#fafafa' }}>
                  <TableCell sx={{ fontWeight: 'bold', fontSize: '0.8rem', py: 1, width: '40px', textAlign: 'center' }}>#</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', fontSize: '0.8rem', py: 1 }}>Address</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', fontSize: '0.8rem', py: 1 }}>County</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', fontSize: '0.8rem', py: 1 }}>Data Source</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', fontSize: '0.8rem', py: 1 }}>Assessor Parcel Number (APN)</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', fontSize: '0.8rem', py: 1 }}>Site Size</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', fontSize: '0.8rem', py: 1 }}>Sale Date</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', fontSize: '0.8rem', py: 1 }}>Price</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {[1, 2, 3].map(idx => {
                  const addrKey = `Land Comparable ${idx} Address`;
                  const countyKey = `Land Comparable ${idx} County`;
                  const dsKey = `Land Comparable ${idx} Data Source`;
                  const apnKey = `Land Comparable ${idx} Assessor Parcel Number (APN)`;
                  const sizeKey = `Land Comparable ${idx} Site Size`;
                  const dateKey = `Land Comparable ${idx} Sale Date`;
                  const priceKey = `Land Comparable ${idx} Sale Price`;

                  return (
                    <TableRow key={idx} hover>
                      <TableCell sx={{ py: 0.5, textAlign: 'center', fontWeight: 'bold' }}>{idx}</TableCell>
                      <TableCell sx={{ py: 0.5 }}>
                        <EditableField fieldPath={[addrKey]} value={data[addrKey] || ''} onDataChange={handleDataChange} editingField={editingField} setEditingField={setEditingField} isEditable={true} allData={allData} showBlankValidation={extractionAttempted} />
                      </TableCell>
                      <TableCell sx={{ py: 0.5 }}>
                        <EditableField fieldPath={[countyKey]} value={data[countyKey] || ''} onDataChange={handleDataChange} editingField={editingField} setEditingField={setEditingField} isEditable={true} allData={allData} showBlankValidation={extractionAttempted} />
                      </TableCell>
                      <TableCell sx={{ py: 0.5 }}>
                        <EditableField fieldPath={[dsKey]} value={data[dsKey] || ''} onDataChange={handleDataChange} editingField={editingField} setEditingField={setEditingField} isEditable={true} allData={allData} showBlankValidation={extractionAttempted} />
                      </TableCell>
                      <TableCell sx={{ py: 0.5 }}>
                        <EditableField fieldPath={[apnKey]} value={data[apnKey] || ''} onDataChange={handleDataChange} editingField={editingField} setEditingField={setEditingField} isEditable={true} allData={allData} showBlankValidation={extractionAttempted} />
                      </TableCell>
                      <TableCell sx={{ py: 0.5 }}>
                        <EditableField fieldPath={[sizeKey]} value={data[sizeKey] || ''} onDataChange={handleDataChange} editingField={editingField} setEditingField={setEditingField} isEditable={true} allData={allData} showBlankValidation={extractionAttempted} />
                      </TableCell>
                      <TableCell sx={{ py: 0.5 }}>
                        <EditableField fieldPath={[dateKey]} value={data[dateKey] || ''} onDataChange={handleDataChange} editingField={editingField} setEditingField={setEditingField} isEditable={true} allData={allData} showBlankValidation={extractionAttempted} />
                      </TableCell>
                      <TableCell sx={{ py: 0.5 }}>
                        <EditableField fieldPath={[priceKey]} value={data[priceKey] || ''} onDataChange={handleDataChange} editingField={editingField} setEditingField={setEditingField} isEditable={true} allData={allData} showBlankValidation={extractionAttempted} />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>

          <Paper variant="outlined" sx={{ p: 2, mb: 4, borderRadius: 1 }}>
            <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 1 }}>Reconciliation of Site Value</Typography>
            <EditableField fieldPath={['Reconciliation of Site Value']} value={data['Reconciliation of Site Value'] || ''} onDataChange={handleDataChange} editingField={editingField} setEditingField={setEditingField} isEditable={true} allData={allData} showBlankValidation={extractionAttempted} />
          </Paper>

          <TableContainer component={Paper} variant="outlined" sx={{ mb: 4, borderRadius: 1, overflow: 'hidden' }}>
            <Box sx={{ bgcolor: '#f5f5f5', px: 2, py: 1, borderBottom: '1px solid #e0e0e0' }}>
              <Typography variant="subtitle2" fontWeight="bold">General Description</Typography>
            </Box>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 24px', padding: '16px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', borderBottom: '1px solid #e0e0e0', paddingBottom: '4px' }}>
                  <Typography variant="subtitle2" fontWeight="bold" sx={{ color: '#555', minWidth: '130px' }}>Cost Type:</Typography>
                  <Box sx={{ flexGrow: 1 }}>
                    <EditableField fieldPath={['Cost Type']} value={data['Cost Type'] || ''} onDataChange={handleDataChange} editingField={editingField} setEditingField={setEditingField} isEditable={true} allData={allData} placeholder="Replacement" />
                  </Box>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', borderBottom: '1px solid #e0e0e0', paddingBottom: '4px' }}>
                  <Typography variant="subtitle2" fontWeight="bold" sx={{ color: '#555', minWidth: '130px' }}>Cost Data Source:</Typography>
                  <Box sx={{ flexGrow: 1 }}>
                    <EditableField fieldPath={['Cost Data Source']} value={data['Cost Data Source'] || ''} onDataChange={handleDataChange} editingField={editingField} setEditingField={setEditingField} isEditable={true} allData={allData} placeholder="DwellingCost" />
                  </Box>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', borderBottom: '1px solid #e0e0e0', paddingBottom: '4px' }}>
                  <Typography variant="subtitle2" fontWeight="bold" sx={{ color: '#555', minWidth: '130px' }}>Quality Rating:</Typography>
                  <Box sx={{ flexGrow: 1 }}>
                    <EditableField fieldPath={['Quality Rating']} value={data['Quality Rating'] || ''} onDataChange={handleDataChange} editingField={editingField} setEditingField={setEditingField} isEditable={true} allData={allData} placeholder="Average" />
                  </Box>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', borderBottom: '1px solid #e0e0e0', paddingBottom: '4px' }}>
                  <Typography variant="subtitle2" fontWeight="bold" sx={{ color: '#555', minWidth: '130px' }}>Effective Date:</Typography>
                  <Box sx={{ flexGrow: 1 }}>
                    <EditableField fieldPath={['Effective Date']} value={data['Effective Date'] || ''} onDataChange={handleDataChange} editingField={editingField} setEditingField={setEditingField} isEditable={true} allData={allData} placeholder="06/30/2026" />
                  </Box>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', borderBottom: '1px solid #e0e0e0', paddingBottom: '4px' }}>
                  <Typography variant="subtitle2" fontWeight="bold" sx={{ color: '#555', minWidth: '180px' }}>Cost Method:</Typography>
                  <Box sx={{ flexGrow: 1 }}>
                    <EditableField fieldPath={['Cost Method']} value={data['Cost Method'] || ''} onDataChange={handleDataChange} editingField={editingField} setEditingField={setEditingField} isEditable={true} allData={allData} placeholder="Comparative Unit" />
                  </Box>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', borderBottom: '1px solid #e0e0e0', paddingBottom: '4px' }}>
                  <Typography variant="subtitle2" fontWeight="bold" sx={{ color: '#555', minWidth: '180px' }}>Depreciation Method:</Typography>
                  <Box sx={{ flexGrow: 1 }}>
                    <EditableField fieldPath={['Depreciation Method']} value={data['Depreciation Method'] || ''} onDataChange={handleDataChange} editingField={editingField} setEditingField={setEditingField} isEditable={true} allData={allData} placeholder="Modified Economic Age-Life" />
                  </Box>
                </div>
              </div>
            </div>
          </TableContainer>

          <Paper variant="outlined" sx={{ p: 2, mb: 4, borderRadius: 1 }}>
            <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 1 }}>Cost Approach Commentary</Typography>
            <EditableField fieldPath={['Cost Approach Commentary']} value={data['Cost Approach Commentary'] || ''} onDataChange={handleDataChange} editingField={editingField} setEditingField={setEditingField} isEditable={true} allData={allData} showBlankValidation={extractionAttempted} />
          </Paper>

          <Paper variant="outlined" sx={{ p: 2, borderRadius: 1 }}>
            <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 1 }}>Cost Approach Exhibits</Typography>
            <EditableField fieldPath={['Cost Approach Exhibits']} value={data['Cost Approach Exhibits'] || ''} onDataChange={handleDataChange} editingField={editingField} setEditingField={setEditingField} isEditable={true} allData={allData} showBlankValidation={extractionAttempted} />
          </Paper>

        </Box>
      </Paper>

      <Paper id="reconciliation" elevation={3} sx={{ mb: 4, borderRadius: 2, overflow: 'hidden', border: '1px solid', borderColor: 'secondary.main' }}>
        <Box sx={{ bgcolor: 'secondary.main', color: 'white', px: 2, py: 1.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="subtitle1" fontWeight="bold">Reconciliation</Typography>
          {onReconciliationRevisionButtonClick && (
            <Tooltip title="Revision Language">
              <IconButton onClick={onReconciliationRevisionButtonClick} size="small" sx={{ color: 'white', ml: 'auto' }}><LibraryBooksIcon /></IconButton>
            </Tooltip>
          )}
        </Box>
        <Box sx={{ p: 2 }}>

          <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 1, color: 'text.secondary' }}>Approaches to Value</Typography>
          <TableContainer component={Paper} variant="outlined" sx={{ mb: 4, borderRadius: 1, overflow: 'hidden' }}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: '#fafafa' }}>
                  <TableCell sx={{ fontWeight: 'bold', fontSize: '0.8rem', py: 1 }}></TableCell>
                  <TableCell sx={{ fontWeight: 'bold', fontSize: '0.8rem', py: 1, width: '30%' }}>Sales Comparison Approach</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', fontSize: '0.8rem', py: 1, width: '30%' }}>Income Approach</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', fontSize: '0.8rem', py: 1, width: '30%' }}>Cost Approach</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                <TableRow hover>
                  <TableCell sx={{ fontWeight: 'bold', py: 0.5 }}>Indicated Value</TableCell>
                  <TableCell sx={{ py: 0.5 }}>
                    <EditableField
                      fieldPath={['RECONCILIATION', 'Sales Comparison Approach Indicated Value']}
                      value={data.RECONCILIATION?.['Sales Comparison Approach Indicated Value'] || ''}
                      onDataChange={handleDataChange}
                      editingField={editingField}
                      setEditingField={setEditingField}
                      isEditable={true}
                      allData={allData}
                      manualValidations={manualValidations}
                      handleManualValidation={handleManualValidation}
                      showBlankValidation={false}
                    />
                  </TableCell>
                  <TableCell sx={{ py: 0.5 }}>
                    <EditableField
                      fieldPath={['RECONCILIATION', 'Income Approach Indicated Value']}
                      value={data.RECONCILIATION?.['Income Approach Indicated Value'] || ''}
                      onDataChange={handleDataChange}
                      editingField={editingField}
                      setEditingField={setEditingField}
                      isEditable={true}
                      allData={allData}
                    />
                  </TableCell>
                  <TableCell sx={{ py: 0.5 }}>
                    <EditableField
                      fieldPath={['RECONCILIATION', 'Cost Approach Indicated Value']}
                      value={data.RECONCILIATION?.['Cost Approach Indicated Value'] || ''}
                      onDataChange={handleDataChange}
                      editingField={editingField}
                      setEditingField={setEditingField}
                      isEditable={true}
                      allData={allData}
                    />
                  </TableCell>
                </TableRow>
                <TableRow hover>
                  <TableCell sx={{ fontWeight: 'bold', py: 0.5 }}>Reason for Exclusion</TableCell>
                  <TableCell sx={{ py: 0.5 }}>
                    <EditableField
                      fieldPath={['RECONCILIATION', 'Reason for Exclusion (Sales Comparison Approach)']}
                      value={data.RECONCILIATION?.['Reason for Exclusion (Sales Comparison Approach)'] || ''}
                      onDataChange={handleDataChange}
                      editingField={editingField}
                      setEditingField={setEditingField}
                      isEditable={true}
                      allData={allData}
                    />
                  </TableCell>
                  <TableCell sx={{ py: 0.5 }}>
                    <EditableField
                      fieldPath={['RECONCILIATION', 'Reason for Exclusion (Income Approach)']}
                      value={data.RECONCILIATION?.['Reason for Exclusion (Income Approach)'] || ''}
                      onDataChange={handleDataChange}
                      editingField={editingField}
                      setEditingField={setEditingField}
                      isEditable={true}
                      allData={allData}
                    />
                  </TableCell>
                  <TableCell sx={{ py: 0.5 }}>
                    <EditableField
                      fieldPath={['RECONCILIATION', 'Reason for Exclusion (Cost Approach)']}
                      value={data.RECONCILIATION?.['Reason for Exclusion (Cost Approach)'] || ''}
                      onDataChange={handleDataChange}
                      editingField={editingField}
                      setEditingField={setEditingField}
                      isEditable={true}
                      allData={allData}
                    />
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>

          <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 1, color: 'text.secondary' }}>Appraisal Summary</Typography>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 24px', marginBottom: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', borderBottom: '1px solid #e0e0e0', paddingBottom: '4px' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#333', minWidth: '180px' }}>Opinion of Market Value</span>
              <Box sx={{ flexGrow: 1 }}>
                <EditableField
                  fieldPath={['RECONCILIATION', 'Opinion of Market Value']}
                  value={data.RECONCILIATION?.['Opinion of Market Value'] || ''}
                  onDataChange={handleDataChange}
                  editingField={editingField}
                  setEditingField={setEditingField}
                  isEditable={true}
                  allData={allData}
                  manualValidations={manualValidations}
                  handleManualValidation={handleManualValidation}
                  showBlankValidation={false}
                />
              </Box>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', borderBottom: '1px solid #e0e0e0', paddingBottom: '4px' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#333', minWidth: '180px' }}>Reasonable Exposure Time</span>
              <Box sx={{ flexGrow: 1 }}>
                <EditableField
                  fieldPath={['RECONCILIATION', 'Reasonable Exposure Time']}
                  value={data.RECONCILIATION?.['Reasonable Exposure Time'] || ''}
                  onDataChange={handleDataChange}
                  editingField={editingField}
                  setEditingField={setEditingField}
                  isEditable={true}
                  allData={allData}
                />
              </Box>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', borderBottom: '1px solid #e0e0e0', paddingBottom: '4px' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#333', minWidth: '180px' }}>Market Value Condition</span>
              <Box sx={{ flexGrow: 1 }}>
                <EditableField
                  fieldPath={['RECONCILIATION', 'Market Value Condition']}
                  value={data.RECONCILIATION?.['Market Value Condition'] || ''}
                  onDataChange={handleDataChange}
                  editingField={editingField}
                  setEditingField={setEditingField}
                  isEditable={true}
                  allData={allData}
                />
              </Box>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', borderBottom: '1px solid #e0e0e0', paddingBottom: '4px' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#333', minWidth: '180px' }}>Effective Date of Appraisal</span>
              <Box sx={{ flexGrow: 1 }}>
                <EditableField
                  fieldPath={['RECONCILIATION', 'Effective Date of Appraisal']}
                  value={data.RECONCILIATION?.['Effective Date of Appraisal'] || ''}
                  onDataChange={handleDataChange}
                  editingField={editingField}
                  setEditingField={setEditingField}
                  isEditable={true}
                  allData={allData}
                />
              </Box>
            </div>
          </div>

          <Paper variant="outlined" sx={{ p: 2, mb: 4, borderRadius: 1 }}>
            <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 1 }}>Reconciliation of Market Value</Typography>
            <EditableField
              fieldPath={['RECONCILIATION', 'Reconciliation of Market Value']}
              value={data.RECONCILIATION?.['Reconciliation of Market Value'] || ''}
              onDataChange={handleDataChange}
              editingField={editingField}
              setEditingField={setEditingField}
              isEditable={true}
              allData={allData}
              manualValidations={manualValidations}
              handleManualValidation={handleManualValidation}
              revisionHandlers={revisionHandlers}
              showBlankValidation={extractionAttempted}
            />
          </Paper>

          <Paper variant="outlined" sx={{ p: 2, borderRadius: 1 }}>
            <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 1 }}>Apparent Defects, Damages, Deficiencies</Typography>
            <EditableField
              fieldPath={['RECONCILIATION', 'Apparent Defects, Damages, Deficiencies']}
              value={data.RECONCILIATION?.['Apparent Defects, Damages, Deficiencies'] || ''}
              onDataChange={handleDataChange}
              editingField={editingField}
              setEditingField={setEditingField}
              isEditable={true}
              allData={allData}
              manualValidations={manualValidations}
              handleManualValidation={handleManualValidation}
              revisionHandlers={revisionHandlers}
              showBlankValidation={extractionAttempted}
            />
          </Paper>
        </Box>
      </Paper>

      <GridInfoCard
        id="certifications"
        title="Certifications"
        fields={version1AppraiserFields}
        data={data.CERTIFICATION}
        cardClass="bg-info"
        extractionAttempted={extractionAttempted}
        onDataChange={(field, value) => handleDataChange(['CERTIFICATION', ...field], value)}
        editingField={editingField}
        setEditingField={setEditingField}
        isEditable={true}
        allData={allData}
        loading={loading}
        loadingSection={loadingSection}
        manualValidations={manualValidations}
        handleManualValidation={handleManualValidation}
        onRevisionButtonClick={onCertificationRevisionButtonClick}
        revisionHandlers={revisionHandlers}
        showBlankValidation={extractionAttempted}
      />

      <PhotosGallerySection id="photos-exhibits-section" data={data} allData={allData} extractedPhotos={allData?.EXTRACTED_PHOTOS || data?.EXTRACTED_PHOTOS || []} />
    </>
  );
};

export default Version1;




