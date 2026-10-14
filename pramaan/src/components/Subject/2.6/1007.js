import React from 'react';
import { SubjectInfoCard, GridInfoCard, EditableField } from '../components/FormComponents';
import { Tooltip, IconButton } from '@mui/material';
import LibraryBooksIcon from '@mui/icons-material/LibraryBooks';
import ActionButtons from '../components/ActionButtons';
import PhotosGallerySection from '../components/PhotosGallerySection';

const stripDollar = (val) => {
  if (!val) return '';
  return String(val).replace(/\$/g, '').trim();
};

const Form1007 = ({
  data, allData, extractionAttempted, handleDataChange, editingField, setEditingField,
  highlightedSubjectFields, highlightedContractFields, highlightedSiteFields,
  subjectFields, contractFields, neighborhoodFields, siteFields, improvementsFields,
  salesGridRows, comparableSales, salesHistoryFields, salesComparisonAdditionalInfoFields,
  reconciliationFields, costApproachFields, incomeApproachFields, pudInformationFields,
  marketConditionsRows, marketConditionsFields, appraiserFields, condoCoopProjectsRows,
  condoForeclosureFields, comparableRents, RentSchedulesFIELDS2, rentScheduleReconciliationFields,
  formType, comparisonData, getComparisonStyle, infoOfSalesFields, loading, loadingSection,
  handleStateRequirementCheck, stateReqLoading, handleClientRequirementCheck, clientReqLoading,
  handleEscalationCheck, escalationLoading, manualValidations, handleManualValidation,
  onSubjectRevisionButtonClick, onContractRevisionButtonClick, onNeighborhoodRevisionButtonClick,
  onSiteRevisionButtonClick, onImprovementsRevisionButtonClick, onSalesGridRevisionButtonClick,
  onReconciliationRevisionButtonClick, onCostApproachRevisionButtonClick, onCertificationRevisionButtonClick,
  on1007RevisionButtonClick, revisionHandlers
}) => {
  const activeComparableRents = (comparableRents || []).filter((rent, idx) => {
    const rentData = (data && data[rent]) || (allData && allData[rent]);
    if (!rentData) return idx < 3;
    const hasVal = Object.values(rentData).some(val => val !== undefined && val !== null && String(val).trim() !== '');
    return hasVal || idx < 3;
  });

  return (
    <>
      <ActionButtons
        handleStateRequirementCheck={handleStateRequirementCheck}
        stateReqLoading={stateReqLoading}
        handleClientRequirementCheck={handleClientRequirementCheck}
        clientReqLoading={clientReqLoading}
        handleEscalationCheck={handleEscalationCheck}
        escalationLoading={escalationLoading}
      />
      <SubjectInfoCard id="subject-info" title="Subject Information" fields={subjectFields} hideEmptyFields={true} data={data} extractionAttempted={extractionAttempted} onDataChange={handleDataChange} isEditable={true} editingField={editingField} setEditingField={setEditingField} highlightedFields={highlightedSubjectFields} allData={allData} comparisonData={comparisonData} getComparisonStyle={getComparisonStyle} loading={loading} loadingSection={loadingSection} manualValidations={manualValidations} handleManualValidation={handleManualValidation} onRevisionButtonClick={onSubjectRevisionButtonClick} revisionHandlers={revisionHandlers} />

      <div id="rent-schedule-section" style={{ marginBottom: '1rem', marginTop: '1rem' }} className="card shadow mb-4">
        <div className="card-header CAR1 bg-info text-white" style={{ position: 'sticky', top: 0, zIndex: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <strong>Comparable Rent Schedule</strong>
            {on1007RevisionButtonClick && (
              <Tooltip title="Revision Language">
                <IconButton onClick={on1007RevisionButtonClick} size="small" sx={{ color: 'white', marginLeft: 'auto' }}><LibraryBooksIcon /></IconButton>
              </Tooltip>
            )}
          </div>
        </div>
        <div className="card-body p-0 table-container">
          <table className="table table-bordered mb-0" style={{ fontSize: '0.8rem', borderCollapse: 'collapse' }}>
            <thead className="table-light">
              <tr>
                <th className="border border-gray-400 p-1 bg-gray-200 align-middle" style={{ width: '20%' }}>ITEM</th>
                <th className="border border-gray-400 p-1 bg-gray-200 align-middle" style={{ width: '20%' }}>SUBJECT</th>
                {activeComparableRents.map((rent, idx) => (
                  <th key={idx} colSpan={2} className="border border-gray-400 p-1 bg-gray-200 text-center align-middle">{rent}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-gray-400 p-2 font-medium bg-light">Address</td>
                <td className="border border-gray-400 p-1">
                  <EditableField
                    fieldPath={['Subject', 'Address']} value={(data.Subject && data.Subject['Address']) || ''}
                    onDataChange={handleDataChange} editingField={editingField} setEditingField={setEditingField}
                    isMissing={extractionAttempted && (!data.Subject || !data.Subject['Address'] || data.Subject['Address'] === '')} isEditable={true}
                    manualValidations={manualValidations} revisionHandlers={revisionHandlers}
                    handleManualValidation={handleManualValidation} allData={allData} saleName={'Subject'}
                  />
                </td>
                {comparableRents.map((rent, idx) => (
                  <td key={idx} colSpan={2} className="border border-gray-400 p-1">
                    <EditableField
                      fieldPath={[rent, 'Address']} value={(data[rent] && data[rent]['Address']) || ''}
                      onDataChange={handleDataChange} editingField={editingField} setEditingField={setEditingField}
                      isMissing={extractionAttempted && (!data[rent] || !data[rent]['Address'] || data[rent]['Address'] === '')} isEditable={true}
                      manualValidations={manualValidations} revisionHandlers={revisionHandlers}
                      handleManualValidation={handleManualValidation} allData={allData} saleName={rent}
                    />
                  </td>
                ))}
              </tr>

              <tr>
                <td className="border border-gray-400 p-2 font-medium bg-light">Proximity to Subject</td>
                <td className="border border-gray-400 p-1 bg-gray-200" style={{ backgroundColor: '#e9ecef' }}></td>
                {comparableRents.map((rent, idx) => (
                  <td key={idx} colSpan={2} className="border border-gray-400 p-1">
                    <EditableField
                      fieldPath={[rent, 'Proximity to Subject']} value={(data[rent] && data[rent]['Proximity to Subject']) || ''}
                      onDataChange={handleDataChange} editingField={editingField} setEditingField={setEditingField}
                      isMissing={extractionAttempted && (!data[rent] || !data[rent]['Proximity to Subject'] || data[rent]['Proximity to Subject'] === '')} isEditable={true}
                      manualValidations={manualValidations} revisionHandlers={revisionHandlers}
                      handleManualValidation={handleManualValidation} allData={allData} saleName={rent}
                    />
                  </td>
                ))}
              </tr>

              <tr>
                <td className="border border-gray-400 p-2 font-medium bg-light">
                  <div>Date Lease Begins</div>
                  <div className="text-muted" style={{ borderTop: '1px solid #dee2e6', marginTop: '4px', paddingTop: '4px' }}>Date Lease Expires</div>
                </td>
                <td className="border border-gray-400 p-1 bg-gray-200" style={{ backgroundColor: '#e9ecef' }}></td>
                {comparableRents.map((rent, idx) => (
                  <td key={idx} colSpan={2} className="border border-gray-400 p-1">
                    <div>
                      <EditableField
                        fieldPath={[rent, 'Date Lease Begins']} value={(data[rent] && data[rent]['Date Lease Begins']) || ''}
                        onDataChange={handleDataChange} editingField={editingField} setEditingField={setEditingField}
                        isMissing={extractionAttempted && (!data[rent] || !data[rent]['Date Lease Begins'] || data[rent]['Date Lease Begins'] === '')} isEditable={true}
                        manualValidations={manualValidations} revisionHandlers={revisionHandlers}
                        handleManualValidation={handleManualValidation} allData={allData} saleName={rent}
                      />
                    </div>
                    <div style={{ borderTop: '1px solid #dee2e6', marginTop: '4px', paddingTop: '4px' }}>
                      <EditableField
                        fieldPath={[rent, 'Date Lease Expires']} value={(data[rent] && data[rent]['Date Lease Expires']) || ''}
                        onDataChange={handleDataChange} editingField={editingField} setEditingField={setEditingField}
                        isMissing={extractionAttempted && (!data[rent] || !data[rent]['Date Lease Expires'] || data[rent]['Date Lease Expires'] === '')} isEditable={true}
                        manualValidations={manualValidations} revisionHandlers={revisionHandlers}
                        handleManualValidation={handleManualValidation} allData={allData} saleName={rent}
                      />
                    </div>
                  </td>
                ))}
              </tr>

              <tr>
                <td className="border border-gray-400 p-2 font-medium bg-light">Monthly Rental</td>
                <td className="border border-gray-400 p-1">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span style={{ fontSize: '0.75rem', whiteSpace: 'nowrap' }}>If Currently Rented:</span>
                    <EditableField
                      fieldPath={['Subject', 'Monthly Rental']} value={stripDollar(data.Subject && data.Subject['Monthly Rental'])} prefix="$"
                      onDataChange={handleDataChange} editingField={editingField} setEditingField={setEditingField}
                      isMissing={extractionAttempted && (!data.Subject || !data.Subject['Monthly Rental'] || data.Subject['Monthly Rental'] === '')} isEditable={true}
                      manualValidations={manualValidations} revisionHandlers={revisionHandlers}
                      handleManualValidation={handleManualValidation} allData={allData} saleName={'Subject'}
                    />
                  </div>
                </td>
                {comparableRents.map((rent, idx) => (
                  <td key={idx} colSpan={2} className="border border-gray-400 p-1">
                    <EditableField
                      fieldPath={[rent, 'Monthly Rental']} value={stripDollar(data[rent] && data[rent]['Monthly Rental'])} prefix="$"
                      onDataChange={handleDataChange} editingField={editingField} setEditingField={setEditingField}
                      isMissing={extractionAttempted && (!data[rent] || !data[rent]['Monthly Rental'] || data[rent]['Monthly Rental'] === '')} isEditable={true}
                      manualValidations={manualValidations} revisionHandlers={revisionHandlers}
                      handleManualValidation={handleManualValidation} allData={allData} saleName={rent}
                    />
                  </td>
                ))}
              </tr>

              <tr>
                <td className="border border-gray-400 p-2 font-medium bg-light">
                  <div>Less: Utilities</div>
                  <div className="text-muted" style={{ borderTop: '1px solid #dee2e6', marginTop: '4px', paddingTop: '4px' }}>Furniture</div>
                </td>
                <td className="border border-gray-400 p-1">
                  <div>
                    <EditableField
                      fieldPath={['Subject', 'Less: Utilities']} value={stripDollar(data.Subject && data.Subject['Less: Utilities'])} prefix="$"
                      onDataChange={handleDataChange} editingField={editingField} setEditingField={setEditingField}
                      isMissing={extractionAttempted && (!data.Subject || !data.Subject['Less: Utilities'] || data.Subject['Less: Utilities'] === '')} isEditable={true}
                      manualValidations={manualValidations} revisionHandlers={revisionHandlers}
                      handleManualValidation={handleManualValidation} allData={allData} saleName={'Subject'}
                    />
                  </div>
                  <div style={{ borderTop: '1px solid #dee2e6', marginTop: '4px', paddingTop: '4px' }}>
                    <EditableField
                      fieldPath={['Subject', 'Furniture']} value={(data.Subject && data.Subject['Furniture']) || ''}
                      onDataChange={handleDataChange} editingField={editingField} setEditingField={setEditingField}
                      isMissing={extractionAttempted && (!data.Subject || !data.Subject['Furniture'] || data.Subject['Furniture'] === '')} isEditable={true}
                      manualValidations={manualValidations} revisionHandlers={revisionHandlers}
                      handleManualValidation={handleManualValidation} allData={allData} saleName={'Subject'}
                    />
                  </div>
                </td>
                {comparableRents.map((rent, idx) => (
                  <td key={idx} colSpan={2} className="border border-gray-400 p-1">
                    <div>
                      <EditableField
                        fieldPath={[rent, 'Less: Utilities']} value={stripDollar(data[rent] && data[rent]['Less: Utilities'])} prefix="$"
                        onDataChange={handleDataChange} editingField={editingField} setEditingField={setEditingField}
                        isMissing={extractionAttempted && (!data[rent] || !data[rent]['Less: Utilities'] || data[rent]['Less: Utilities'] === '')} isEditable={true}
                        manualValidations={manualValidations} revisionHandlers={revisionHandlers}
                        handleManualValidation={handleManualValidation} allData={allData} saleName={rent}
                      />
                    </div>
                    <div style={{ borderTop: '1px solid #dee2e6', marginTop: '4px', paddingTop: '4px' }}>
                      <EditableField
                        fieldPath={[rent, 'Furniture']} value={(data[rent] && data[rent]['Furniture']) || ''}
                        onDataChange={handleDataChange} editingField={editingField} setEditingField={setEditingField}
                        isMissing={extractionAttempted && (!data[rent] || !data[rent]['Furniture'] || data[rent]['Furniture'] === '')} isEditable={true}
                        manualValidations={manualValidations} revisionHandlers={revisionHandlers}
                        handleManualValidation={handleManualValidation} allData={allData} saleName={rent}
                      />
                    </div>
                  </td>
                ))}
              </tr>

              <tr>
                <td className="border border-gray-400 p-2 font-medium bg-light">Adjusted Monthly Rent</td>
                <td className="border border-gray-400 p-1">
                  <EditableField
                    fieldPath={['Subject', 'Adjusted Monthly Rent']} value={stripDollar(data.Subject && data.Subject['Adjusted Monthly Rent'])} prefix="$"
                    onDataChange={handleDataChange} editingField={editingField} setEditingField={setEditingField}
                    isMissing={extractionAttempted && (!data.Subject || !data.Subject['Adjusted Monthly Rent'] || data.Subject['Adjusted Monthly Rent'] === '')} isEditable={true}
                    manualValidations={manualValidations} revisionHandlers={revisionHandlers}
                    handleManualValidation={handleManualValidation} allData={allData} saleName={'Subject'}
                  />
                </td>
                {comparableRents.map((rent, idx) => (
                  <td key={idx} colSpan={2} className="border border-gray-400 p-1">
                    <EditableField
                      fieldPath={[rent, 'Adjusted Monthly Rent']} value={stripDollar(data[rent] && data[rent]['Adjusted Monthly Rent'])} prefix="$"
                      onDataChange={handleDataChange} editingField={editingField} setEditingField={setEditingField}
                      isMissing={extractionAttempted && (!data[rent] || !data[rent]['Adjusted Monthly Rent'] || data[rent]['Adjusted Monthly Rent'] === '')} isEditable={true}
                      manualValidations={manualValidations} revisionHandlers={revisionHandlers}
                      handleManualValidation={handleManualValidation} allData={allData} saleName={rent}
                    />
                  </td>
                ))}
              </tr>

              <tr>
                <td className="border border-gray-400 p-2 font-medium bg-light">Data Source</td>
                <td className="border border-gray-400 p-1 bg-gray-200" style={{ backgroundColor: '#e9ecef' }}></td>
                {comparableRents.map((rent, idx) => (
                  <td key={idx} colSpan={2} className="border border-gray-400 p-1">
                    <EditableField
                      fieldPath={[rent, 'Data Source']} value={(data[rent] && data[rent]['Data Source']) || ''}
                      onDataChange={handleDataChange} editingField={editingField} setEditingField={setEditingField}
                      isMissing={extractionAttempted && (!data[rent] || !data[rent]['Data Source'] || data[rent]['Data Source'] === '')} isEditable={true}
                      manualValidations={manualValidations} revisionHandlers={revisionHandlers}
                      handleManualValidation={handleManualValidation} allData={allData} saleName={rent}
                    />
                  </td>
                ))}
              </tr>

              <tr className="bg-light">
                <td className="border border-gray-400 p-2 font-bold" style={{ backgroundColor: '#f8f9fa' }}>RENT ADJUSTMENTS</td>
                <td className="border border-gray-400 p-2 font-bold" style={{ backgroundColor: '#f8f9fa' }}>DESCRIPTION</td>
                {comparableRents.map((rent, idx) => (
                  <React.Fragment key={idx}>
                    <td className="border border-gray-400 p-2 font-bold text-center" style={{ width: '13%', backgroundColor: '#f8f9fa' }}>DESCRIPTION</td>
                    <td className="border border-gray-400 p-2 font-bold text-center" style={{ width: '7%', backgroundColor: '#f8f9fa' }}>+(-)$ Adjust.</td>
                  </React.Fragment>
                ))}
              </tr>

              <tr>
                <td className="border border-gray-400 p-2 font-medium bg-light">Rent</td>
                <td className="border border-gray-400 p-1 bg-gray-200" style={{ backgroundColor: '#e9ecef' }}></td>
                {comparableRents.map((rent, idx) => (
                  <React.Fragment key={idx}>
                    <td className="border border-gray-400 p-1">
                      <EditableField
                        fieldPath={[rent, 'Rent']} value={(data[rent] && data[rent]['Rent']) || ''}
                        onDataChange={handleDataChange} editingField={editingField} setEditingField={setEditingField}
                        isMissing={extractionAttempted && (!data[rent] || !data[rent]['Rent'] || data[rent]['Rent'] === '')} isEditable={true}
                        manualValidations={manualValidations} revisionHandlers={revisionHandlers}
                        handleManualValidation={handleManualValidation} allData={allData} saleName={rent}
                      />
                    </td>
                    <td className="border border-gray-400 p-1 bg-gray-200" style={{ backgroundColor: '#e9ecef' }}></td>
                  </React.Fragment>
                ))}
              </tr>

              <tr>
                <td className="border border-gray-400 p-2 font-medium bg-light">Concessions</td>
                <td className="border border-gray-400 p-1 bg-gray-200" style={{ backgroundColor: '#e9ecef' }}></td>
                {comparableRents.map((rent, idx) => (
                  <React.Fragment key={idx}>
                    <td className="border border-gray-400 p-1">
                      <EditableField
                        fieldPath={[rent, 'Concessions']} value={(data[rent] && data[rent]['Concessions']) || ''}
                        onDataChange={handleDataChange} editingField={editingField} setEditingField={setEditingField}
                        isMissing={extractionAttempted && (!data[rent] || !data[rent]['Concessions'] || data[rent]['Concessions'] === '')} isEditable={true}
                        manualValidations={manualValidations} revisionHandlers={revisionHandlers}
                        handleManualValidation={handleManualValidation} allData={allData} saleName={rent}
                      />
                    </td>
                    <td className="border border-gray-400 p-1 bg-gray-200" style={{ backgroundColor: '#e9ecef' }}></td>
                  </React.Fragment>
                ))}
              </tr>

              <tr>
                <td className="border border-gray-400 p-2 font-medium bg-light">Location/View</td>
                <td className="border border-gray-400 p-1">
                  <EditableField
                    fieldPath={['Subject', 'Location/View']} value={(data.Subject && data.Subject['Location/View']) || ''}
                    onDataChange={handleDataChange} editingField={editingField} setEditingField={setEditingField}
                    isMissing={extractionAttempted && (!data.Subject || !data.Subject['Location/View'] || data.Subject['Location/View'] === '')} isEditable={true}
                    manualValidations={manualValidations} revisionHandlers={revisionHandlers}
                    handleManualValidation={handleManualValidation} allData={allData} saleName={'Subject'}
                  />
                </td>
                {comparableRents.map((rent, idx) => (
                  <React.Fragment key={idx}>
                    <td className="border border-gray-400 p-1">
                      <EditableField
                        fieldPath={[rent, 'Location/View']} value={(data[rent] && data[rent]['Location/View']) || ''}
                        onDataChange={handleDataChange} editingField={editingField} setEditingField={setEditingField}
                        isMissing={extractionAttempted && (!data[rent] || !data[rent]['Location/View'] || data[rent]['Location/View'] === '')} isEditable={true}
                        manualValidations={manualValidations} revisionHandlers={revisionHandlers}
                        handleManualValidation={handleManualValidation} allData={allData} saleName={rent}
                      />
                    </td>
                    <td className="border border-gray-400 p-1">
                      <EditableField
                        fieldPath={[rent, 'Location/View Adjustment']} value={(data[rent] && data[rent]['Location/View Adjustment']) || ''}
                        onDataChange={handleDataChange} editingField={editingField} setEditingField={setEditingField}
                        isMissing={extractionAttempted && (!data[rent] || !data[rent]['Location/View Adjustment'] || data[rent]['Location/View Adjustment'] === '')} isEditable={true}
                        manualValidations={manualValidations} revisionHandlers={revisionHandlers}
                        handleManualValidation={handleManualValidation} allData={allData} saleName={rent}
                      />
                    </td>
                  </React.Fragment>
                ))}
              </tr>

              <tr>
                <td className="border border-gray-400 p-2 font-medium bg-light">Design and Appeal</td>
                <td className="border border-gray-400 p-1">
                  <EditableField
                    fieldPath={['Subject', 'Design and Appeal']} value={(data.Subject && data.Subject['Design and Appeal']) || ''}
                    onDataChange={handleDataChange} editingField={editingField} setEditingField={setEditingField}
                    isMissing={extractionAttempted && (!data.Subject || !data.Subject['Design and Appeal'] || data.Subject['Design and Appeal'] === '')} isEditable={true}
                    manualValidations={manualValidations} revisionHandlers={revisionHandlers}
                    handleManualValidation={handleManualValidation} allData={allData} saleName={'Subject'}
                  />
                </td>
                {comparableRents.map((rent, idx) => (
                  <React.Fragment key={idx}>
                    <td className="border border-gray-400 p-1">
                      <EditableField
                        fieldPath={[rent, 'Design and Appeal']} value={(data[rent] && data[rent]['Design and Appeal']) || ''}
                        onDataChange={handleDataChange} editingField={editingField} setEditingField={setEditingField}
                        isMissing={extractionAttempted && (!data[rent] || !data[rent]['Design and Appeal'] || data[rent]['Design and Appeal'] === '')} isEditable={true}
                        manualValidations={manualValidations} revisionHandlers={revisionHandlers}
                        handleManualValidation={handleManualValidation} allData={allData} saleName={rent}
                      />
                    </td>
                    <td className="border border-gray-400 p-1">
                      <EditableField
                        fieldPath={[rent, 'Design and Appeal Adjustment']} value={(data[rent] && data[rent]['Design and Appeal Adjustment']) || ''}
                        onDataChange={handleDataChange} editingField={editingField} setEditingField={setEditingField}
                        isMissing={extractionAttempted && (!data[rent] || !data[rent]['Design and Appeal Adjustment'] || data[rent]['Design and Appeal Adjustment'] === '')} isEditable={true}
                        manualValidations={manualValidations} revisionHandlers={revisionHandlers}
                        handleManualValidation={handleManualValidation} allData={allData} saleName={rent}
                      />
                    </td>
                  </React.Fragment>
                ))}
              </tr>

              <tr>
                <td className="border border-gray-400 p-2 font-medium bg-light">Age/Condition</td>
                <td className="border border-gray-400 p-1">
                  <div>
                    <EditableField
                      fieldPath={['Subject', 'Age']} value={(data.Subject && data.Subject['Age']) || ''}
                      onDataChange={handleDataChange} editingField={editingField} setEditingField={setEditingField}
                      isMissing={extractionAttempted && (!data.Subject || !data.Subject['Age'] || data.Subject['Age'] === '')} isEditable={true}
                      manualValidations={manualValidations} revisionHandlers={revisionHandlers}
                      handleManualValidation={handleManualValidation} allData={allData} saleName={'Subject'}
                    />
                  </div>
                  <div style={{ borderTop: '1px solid #dee2e6', marginTop: '4px', paddingTop: '4px' }}>
                    <EditableField
                      fieldPath={['Subject', 'Condition']} value={(data.Subject && data.Subject['Condition']) || ''}
                      onDataChange={handleDataChange} editingField={editingField} setEditingField={setEditingField}
                      isMissing={extractionAttempted && (!data.Subject || !data.Subject['Condition'] || data.Subject['Condition'] === '')} isEditable={true}
                      manualValidations={manualValidations} revisionHandlers={revisionHandlers}
                      handleManualValidation={handleManualValidation} allData={allData} saleName={'Subject'}
                    />
                  </div>
                </td>
                {comparableRents.map((rent, idx) => (
                  <React.Fragment key={idx}>
                    <td className="border border-gray-400 p-1">
                      <div>
                        <EditableField
                          fieldPath={[rent, 'Age']} value={(data[rent] && data[rent]['Age']) || ''}
                          onDataChange={handleDataChange} editingField={editingField} setEditingField={setEditingField}
                          isMissing={extractionAttempted && (!data[rent] || !data[rent]['Age'] || data[rent]['Age'] === '')} isEditable={true}
                          manualValidations={manualValidations} revisionHandlers={revisionHandlers}
                          handleManualValidation={handleManualValidation} allData={allData} saleName={rent}
                        />
                      </div>
                      <div style={{ borderTop: '1px solid #dee2e6', marginTop: '4px', paddingTop: '4px' }}>
                        <EditableField
                          fieldPath={[rent, 'Condition']} value={(data[rent] && data[rent]['Condition']) || ''}
                          onDataChange={handleDataChange} editingField={editingField} setEditingField={setEditingField}
                          isMissing={extractionAttempted && (!data[rent] || !data[rent]['Condition'] || data[rent]['Condition'] === '')} isEditable={true}
                          manualValidations={manualValidations} revisionHandlers={revisionHandlers}
                          handleManualValidation={handleManualValidation} allData={allData} saleName={rent}
                        />
                      </div>
                    </td>
                    <td className="border border-gray-400 p-1">
                      <div>
                        <EditableField
                          fieldPath={[rent, 'Age Adjustment']} value={(data[rent] && data[rent]['Age Adjustment']) || ''}
                          onDataChange={handleDataChange} editingField={editingField} setEditingField={setEditingField}
                          isMissing={extractionAttempted && (!data[rent] || !data[rent]['Age Adjustment'] || data[rent]['Age Adjustment'] === '')} isEditable={true}
                          manualValidations={manualValidations} revisionHandlers={revisionHandlers}
                          handleManualValidation={handleManualValidation} allData={allData} saleName={rent}
                        />
                      </div>
                      <div style={{ borderTop: '1px solid #dee2e6', marginTop: '4px', paddingTop: '4px' }}>
                        <EditableField
                          fieldPath={[rent, 'Condition Adjustment']} value={(data[rent] && data[rent]['Condition Adjustment']) || ''}
                          onDataChange={handleDataChange} editingField={editingField} setEditingField={setEditingField}
                          isMissing={extractionAttempted && (!data[rent] || !data[rent]['Condition Adjustment'] || data[rent]['Condition Adjustment'] === '')} isEditable={true}
                          manualValidations={manualValidations} revisionHandlers={revisionHandlers}
                          handleManualValidation={handleManualValidation} allData={allData} saleName={rent}
                        />
                      </div>
                    </td>
                  </React.Fragment>
                ))}
              </tr>

              <tr>
                <td className="border border-gray-400 p-2 font-medium bg-light">
                  <div>Above Grade Room Count</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: '#6c757d', borderTop: '1px solid #dee2e6', marginTop: '4px', paddingTop: '4px' }}>
                    <span>Total</span>
                    <span>Bdrms</span>
                    <span>Baths</span>
                  </div>
                </td>
                <td className="border border-gray-400 p-1">
                  <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                    <EditableField
                      fieldPath={['Subject', 'Room Count Total']} value={(data.Subject && data.Subject['Room Count Total']) || ''}
                      onDataChange={handleDataChange} editingField={editingField} setEditingField={setEditingField}
                      isMissing={extractionAttempted && (!data.Subject || !data.Subject['Room Count Total'] || data.Subject['Room Count Total'] === '')} isEditable={true}
                      manualValidations={manualValidations} revisionHandlers={revisionHandlers}
                      handleManualValidation={handleManualValidation} allData={allData} saleName={'Subject'}
                    />
                    <span>:</span>
                    <EditableField
                      fieldPath={['Subject', 'Room Count Bdrms']} value={(data.Subject && data.Subject['Room Count Bdrms']) || ''}
                      onDataChange={handleDataChange} editingField={editingField} setEditingField={setEditingField}
                      isMissing={extractionAttempted && (!data.Subject || !data.Subject['Room Count Bdrms'] || data.Subject['Room Count Bdrms'] === '')} isEditable={true}
                      manualValidations={manualValidations} revisionHandlers={revisionHandlers}
                      handleManualValidation={null} allData={allData} saleName={'Subject'}
                    />
                    <span>:</span>
                    <EditableField
                      fieldPath={['Subject', 'Room Count Baths']} value={(data.Subject && data.Subject['Room Count Baths']) || ''}
                      onDataChange={handleDataChange} editingField={editingField} setEditingField={setEditingField}
                      isMissing={extractionAttempted && (!data.Subject || !data.Subject['Room Count Baths'] || data.Subject['Room Count Baths'] === '')} isEditable={true}
                      manualValidations={manualValidations} revisionHandlers={revisionHandlers}
                      handleManualValidation={null} allData={allData} saleName={'Subject'}
                    />
                  </div>
                </td>
                {comparableRents.map((rent, idx) => (
                  <React.Fragment key={idx}>
                    <td className="border border-gray-400 p-1">
                      <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                        <EditableField
                          fieldPath={[rent, 'Room Count Total']} value={(data[rent] && data[rent]['Room Count Total']) || ''}
                          onDataChange={handleDataChange} editingField={editingField} setEditingField={setEditingField}
                          isMissing={extractionAttempted && (!data[rent] || !data[rent]['Room Count Total'] || data[rent]['Room Count Total'] === '')} isEditable={true}
                          manualValidations={manualValidations} revisionHandlers={revisionHandlers}
                          handleManualValidation={handleManualValidation} allData={allData} saleName={rent}
                        />
                        <span>:</span>
                        <EditableField
                          fieldPath={[rent, 'Room Count Bdrms']} value={(data[rent] && data[rent]['Room Count Bdrms']) || ''}
                          onDataChange={handleDataChange} editingField={editingField} setEditingField={setEditingField}
                          isMissing={extractionAttempted && (!data[rent] || !data[rent]['Room Count Bdrms'] || data[rent]['Room Count Bdrms'] === '')} isEditable={true}
                          manualValidations={manualValidations} revisionHandlers={revisionHandlers}
                          handleManualValidation={null} allData={allData} saleName={rent}
                        />
                        <span>:</span>
                        <EditableField
                          fieldPath={[rent, 'Room Count Baths']} value={(data[rent] && data[rent]['Room Count Baths']) || ''}
                          onDataChange={handleDataChange} editingField={editingField} setEditingField={setEditingField}
                          isMissing={extractionAttempted && (!data[rent] || !data[rent]['Room Count Baths'] || data[rent]['Room Count Baths'] === '')} isEditable={true}
                          manualValidations={manualValidations} revisionHandlers={revisionHandlers}
                          handleManualValidation={null} allData={allData} saleName={rent}
                        />
                      </div>
                    </td>
                    <td className="border border-gray-400 p-1">
                      <EditableField
                        fieldPath={[rent, 'Room Count Total Adjustment']} value={(data[rent] && data[rent]['Room Count Total Adjustment']) || ''}
                        onDataChange={handleDataChange} editingField={editingField} setEditingField={setEditingField}
                        isMissing={extractionAttempted && (!data[rent] || !data[rent]['Room Count Total Adjustment'] || data[rent]['Room Count Total Adjustment'] === '')} isEditable={true}
                        manualValidations={manualValidations} revisionHandlers={revisionHandlers}
                        handleManualValidation={handleManualValidation} allData={allData} saleName={rent}
                      />
                    </td>
                  </React.Fragment>
                ))}
              </tr>

              {/* 15. Gross Living Area */}
              <tr>
                <td className="border border-gray-400 p-2 font-medium bg-light">Gross Living Area</td>
                <td className="border border-gray-400 p-1">
                  <EditableField
                    fieldPath={['Subject', 'Gross Living Area']} value={(data.Subject && data.Subject['Gross Living Area']) || ''} suffix="Sq. Ft."
                    onDataChange={handleDataChange} editingField={editingField} setEditingField={setEditingField}
                    isMissing={extractionAttempted && (!data.Subject || !data.Subject['Gross Living Area'] || data.Subject['Gross Living Area'] === '')} isEditable={true}
                    manualValidations={manualValidations} revisionHandlers={revisionHandlers}
                    handleManualValidation={handleManualValidation} allData={allData} saleName={'Subject'}
                  />
                </td>
                {comparableRents.map((rent, idx) => (
                  <React.Fragment key={idx}>
                    <td className="border border-gray-400 p-1">
                      <EditableField
                        fieldPath={[rent, 'Gross Living Area']} value={(data[rent] && data[rent]['Gross Living Area']) || ''} suffix="Sq. Ft."
                        onDataChange={handleDataChange} editingField={editingField} setEditingField={setEditingField}
                        isMissing={extractionAttempted && (!data[rent] || !data[rent]['Gross Living Area'] || data[rent]['Gross Living Area'] === '')} isEditable={true}
                        manualValidations={manualValidations} revisionHandlers={revisionHandlers}
                        handleManualValidation={handleManualValidation} allData={allData} saleName={rent}
                      />
                    </td>
                    <td className="border border-gray-400 p-1">
                      <EditableField
                        fieldPath={[rent, 'Gross Living Area Adjustment']} value={(data[rent] && data[rent]['Gross Living Area Adjustment']) || ''}
                        onDataChange={handleDataChange} editingField={editingField} setEditingField={setEditingField}
                        isMissing={extractionAttempted && (!data[rent] || !data[rent]['Gross Living Area Adjustment'] || data[rent]['Gross Living Area Adjustment'] === '')} isEditable={true}
                        manualValidations={manualValidations} revisionHandlers={revisionHandlers}
                        handleManualValidation={handleManualValidation} allData={allData} saleName={rent}
                      />
                    </td>
                  </React.Fragment>
                ))}
              </tr>

              <tr>
                <td className="border border-gray-400 p-2 font-medium bg-light">Other (e.g., basement, etc.)</td>
                <td className="border border-gray-400 p-1">
                  <EditableField
                    fieldPath={['Subject', 'Other (e.g., basement, etc.)']} value={(data.Subject && data.Subject['Other (e.g., basement, etc.)']) || ''}
                    onDataChange={handleDataChange} editingField={editingField} setEditingField={setEditingField}
                    isMissing={extractionAttempted && (!data.Subject || !data.Subject['Other (e.g., basement, etc.)'] || data.Subject['Other (e.g., basement, etc.)'] === '')} isEditable={true}
                    manualValidations={manualValidations} revisionHandlers={revisionHandlers}
                    handleManualValidation={handleManualValidation} allData={allData} saleName={'Subject'}
                  />
                </td>
                {comparableRents.map((rent, idx) => (
                  <React.Fragment key={idx}>
                    <td className="border border-gray-400 p-1">
                      <EditableField
                        fieldPath={[rent, 'Other (e.g., basement, etc.)']} value={(data[rent] && data[rent]['Other (e.g., basement, etc.)']) || ''}
                        onDataChange={handleDataChange} editingField={editingField} setEditingField={setEditingField}
                        isMissing={extractionAttempted && (!data[rent] || !data[rent]['Other (e.g., basement, etc.)'] || data[rent]['Other (e.g., basement, etc.)'] === '')} isEditable={true}
                        manualValidations={manualValidations} revisionHandlers={revisionHandlers}
                        handleManualValidation={handleManualValidation} allData={allData} saleName={rent}
                      />
                    </td>
                    <td className="border border-gray-400 p-1">
                      <EditableField
                        fieldPath={[rent, 'Other (e.g., basement, etc.) Adjustment']} value={(data[rent] && data[rent]['Other (e.g., basement, etc.) Adjustment']) || ''}
                        onDataChange={handleDataChange} editingField={editingField} setEditingField={setEditingField}
                        isMissing={extractionAttempted && (!data[rent] || !data[rent]['Other (e.g., basement, etc.) Adjustment'] || data[rent]['Other (e.g., basement, etc.) Adjustment'] === '')} isEditable={true}
                        manualValidations={manualValidations} revisionHandlers={revisionHandlers}
                        handleManualValidation={handleManualValidation} allData={allData} saleName={rent}
                      />
                    </td>
                  </React.Fragment>
                ))}
              </tr>

              <tr>
                <td className="border border-gray-400 p-2 font-medium bg-light">Other:</td>
                <td className="border border-gray-400 p-1">
                  <EditableField
                    fieldPath={['Subject', 'Other:']} value={(data.Subject && data.Subject['Other:']) || ''}
                    onDataChange={handleDataChange} editingField={editingField} setEditingField={setEditingField}
                    isMissing={extractionAttempted && (!data.Subject || !data.Subject['Other:'] || data.Subject['Other:'] === '')} isEditable={true}
                    manualValidations={manualValidations} revisionHandlers={revisionHandlers}
                    handleManualValidation={handleManualValidation} allData={allData} saleName={'Subject'}
                  />
                </td>
                {comparableRents.map((rent, idx) => (
                  <React.Fragment key={idx}>
                    <td className="border border-gray-400 p-1">
                      <EditableField
                        fieldPath={[rent, 'Other:']} value={(data[rent] && data[rent]['Other:']) || ''}
                        onDataChange={handleDataChange} editingField={editingField} setEditingField={setEditingField}
                        isMissing={extractionAttempted && (!data[rent] || !data[rent]['Other:'] || data[rent]['Other:'] === '')} isEditable={true}
                        manualValidations={manualValidations} revisionHandlers={revisionHandlers}
                        handleManualValidation={handleManualValidation} allData={allData} saleName={rent}
                      />
                    </td>
                    <td className="border border-gray-400 p-1 bg-gray-200" style={{ backgroundColor: '#e9ecef' }}></td>
                  </React.Fragment>
                ))}
              </tr>

              <tr>
                <td className="border border-gray-400 p-2 font-medium bg-light">Net Adj. (total)</td>
                <td className="border border-gray-400 p-1 bg-gray-200" style={{ backgroundColor: '#e9ecef' }}></td>
                {comparableRents.map((rent, idx) => {
                  const netAdjValue = String((data[rent] && data[rent]['Net Adj. (total)']) || '').trim();
                  const isPlus = netAdjValue.startsWith('+') || parseFloat(netAdjValue) > 0;
                  const isMinus = netAdjValue.startsWith('-') || parseFloat(netAdjValue) < 0;
                  return (
                    <React.Fragment key={idx}>
                      <td className="border border-gray-400 p-1 bg-gray-200" style={{ backgroundColor: '#e9ecef' }}></td>
                      <td className="border border-gray-400 p-1">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <span style={{ fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '2px' }}>
                            <input type="checkbox" checked={isPlus} readOnly disabled style={{ transform: 'scale(0.8)', margin: 0 }} />+
                            <input type="checkbox" checked={isMinus} readOnly disabled style={{ transform: 'scale(0.8)', margin: 0 }} />-
                          </span>
                          <EditableField
                            fieldPath={[rent, 'Net Adj. (total)']} value={stripDollar(netAdjValue.replace(/[+-]/g, '').trim())} prefix="$"
                            onDataChange={handleDataChange} editingField={editingField} setEditingField={setEditingField}
                            isMissing={extractionAttempted && (!data[rent] || !data[rent]['Net Adj. (total)'] || data[rent]['Net Adj. (total)'] === '')} isEditable={true}
                            manualValidations={manualValidations} revisionHandlers={revisionHandlers}
                            handleManualValidation={handleManualValidation} allData={allData} saleName={rent}
                          />
                        </div>
                      </td>
                    </React.Fragment>
                  );
                })}
              </tr>

              <tr>
                <td className="border border-gray-400 p-2 font-medium bg-light">Indicated Monthly Market Rent</td>
                <td className="border border-gray-400 p-1 bg-gray-200" style={{ backgroundColor: '#e9ecef' }}></td>
                {comparableRents.map((rent, idx) => (
                  <React.Fragment key={idx}>
                    <td className="border border-gray-400 p-1 bg-gray-200" style={{ backgroundColor: '#e9ecef' }}></td>
                    <td className="border border-gray-400 p-1">
                      <EditableField
                        fieldPath={[rent, 'Indicated Monthly Market Rent']} value={stripDollar(data[rent] && data[rent]['Indicated Monthly Market Rent'])} prefix="$"
                        onDataChange={handleDataChange} editingField={editingField} setEditingField={setEditingField}
                        isMissing={extractionAttempted && (!data[rent] || !data[rent]['Indicated Monthly Market Rent'] || data[rent]['Indicated Monthly Market Rent'] === '')} isEditable={true}
                        manualValidations={manualValidations} revisionHandlers={revisionHandlers}
                        handleManualValidation={handleManualValidation} allData={allData} saleName={rent}
                      />
                    </td>
                  </React.Fragment>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      {/* <GridInfoCard id="rent-schedule-reconciliation-section" title="Comparable Rent Schedule Reconciliation" fields={rentScheduleReconciliationFields} data={data} cardClass="bg-info" usePre={true} extractionAttempted={extractionAttempted} onDataChange={(field, value) => handleDataChange(field, value)} editingField={editingField} setEditingField={setEditingField} isEditable={true} loading={loading} loadingSection={loadingSection} manualValidations={manualValidations} handleManualValidation={handleManualValidation} revisionHandlers={revisionHandlers} /> */}

      <GridInfoCard id="appraiser-section" title="CERTIFICATION" fields={appraiserFields} hideEmptyFields={true} data={data.CERTIFICATION} cardClass="bg-info" extractionAttempted={extractionAttempted} onDataChange={(field, value) => handleDataChange(['CERTIFICATION', ...field], value)} editingField={editingField} setEditingField={setEditingField} isEditable={true} allData={allData} loading={loading} loadingSection={loadingSection} manualValidations={manualValidations} handleManualValidation={handleManualValidation} onRevisionButtonClick={onCertificationRevisionButtonClick} revisionHandlers={revisionHandlers} />
      <PhotosGallerySection id="photos-exhibits-section" data={data} allData={allData} extractedPhotos={allData?.EXTRACTED_PHOTOS || data?.EXTRACTED_PHOTOS || []} />
    </>
  );
};

export default Form1007;
