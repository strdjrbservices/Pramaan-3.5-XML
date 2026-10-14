import { SubjectInfoCard, GridInfoCard, MarketConditionsTable } from '../components/FormComponents';
import { CondoCoopProjectsTable } from '../components/tables';
import ActionButtons from '../components/ActionButtons';
import PhotosGallerySection from '../components/PhotosGallerySection';

import SalesComparisonSection from '../components/SalesComparisonSection';
const Form1004 = ({
  data, allData, extractionAttempted, handleDataChange, editingField, setEditingField,
  highlightedSubjectFields, highlightedContractFields, highlightedSiteFields,
  condoCoopProjectsRows, condoForeclosureFields, subjectFields, contractFields,
  neighborhoodFields, siteFields, improvementsFields, salesGridRows, comparableSales,
  salesHistoryFields, salesComparisonAdditionalInfoFields, reconciliationFields,
  costApproachFields, incomeApproachFields, pudInformationFields, marketConditionsRows,
  marketConditionsFields, appraiserFields, formType, comparisonData, getComparisonStyle,
  infoOfSalesFields, loading, loadingSection, handleStateRequirementCheck, stateReqLoading,
  handleClientRequirementCheck, clientReqLoading, handleEscalationCheck, escalationLoading,
  manualValidations, handleManualValidation, onSubjectRevisionButtonClick, onContractRevisionButtonClick,
  onNeighborhoodRevisionButtonClick, onSiteRevisionButtonClick, onImprovementsRevisionButtonClick,
  onSalesGridRevisionButtonClick, onReconciliationRevisionButtonClick, onCostApproachRevisionButtonClick,
  onCertificationRevisionButtonClick, revisionHandlers
}) => (

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

    <SubjectInfoCard id="subject-info" title="Subject Information" fields={subjectFields} data={data} extractionAttempted={extractionAttempted} onDataChange={handleDataChange} isEditable={true} editingField={editingField} setEditingField={setEditingField} highlightedFields={highlightedSubjectFields} allData={allData} comparisonData={comparisonData} getComparisonStyle={getComparisonStyle} loading={loading} loadingSection={loadingSection} manualValidations={manualValidations} handleManualValidation={handleManualValidation} onRevisionButtonClick={onSubjectRevisionButtonClick} revisionHandlers={revisionHandlers} />

    <GridInfoCard id="contract-section" title="Contract Section" fields={contractFields} data={data.CONTRACT} cardClass="bg-secondary" extractionAttempted={extractionAttempted} onDataChange={(field, value) => handleDataChange(['CONTRACT', ...field], value)} editingField={editingField} setEditingField={setEditingField} isEditable={true} highlightedFields={highlightedContractFields} allData={allData} loading={loading} loadingSection={loadingSection} manualValidations={manualValidations} handleManualValidation={handleManualValidation} onRevisionButtonClick={onContractRevisionButtonClick} revisionHandlers={revisionHandlers} />

    <GridInfoCard id="neighborhood-section" title="Neighborhood Section" fields={neighborhoodFields} data={data.NEIGHBORHOOD} cardClass="bg-info" extractionAttempted={extractionAttempted} onDataChange={(field, value) => handleDataChange(['NEIGHBORHOOD', ...field], value)} editingField={editingField} setEditingField={setEditingField} isEditable={true} allData={allData} loading={loading} loadingSection={loadingSection} manualValidations={manualValidations} handleManualValidation={handleManualValidation} onRevisionButtonClick={onNeighborhoodRevisionButtonClick} revisionHandlers={revisionHandlers} />

    <GridInfoCard id="site-section" title="Site Section" fields={siteFields} data={data.SITE} cardClass="bg-warning" extractionAttempted={extractionAttempted} onDataChange={(field, value) => handleDataChange(['SITE', ...field], value)} editingField={editingField} setEditingField={setEditingField} isEditable={true} highlightedFields={highlightedSiteFields} allData={allData} loading={loading} loadingSection={loadingSection} manualValidations={manualValidations} handleManualValidation={handleManualValidation} onRevisionButtonClick={onSiteRevisionButtonClick} revisionHandlers={revisionHandlers} />

    <GridInfoCard id="improvements-section" title="Improvements Section" fields={improvementsFields} data={data} cardClass="bg-success" extractionAttempted={extractionAttempted} onDataChange={(field, value) => handleDataChange(field, value)} editingField={editingField} setEditingField={setEditingField} isEditable={true} allData={allData} loading={loading} loadingSection={loadingSection} manualValidations={manualValidations} handleManualValidation={handleManualValidation} onRevisionButtonClick={onImprovementsRevisionButtonClick} revisionHandlers={revisionHandlers} />

    <GridInfoCard id="info-of-sales-section" title="Sales Comparison Approach" fields={infoOfSalesFields} data={data.INFO_OF_SALES} cardClass="bg-primary" extractionAttempted={extractionAttempted} onDataChange={(field, value) => handleDataChange(['INFO_OF_SALES', ...field], value)} editingField={editingField} setEditingField={setEditingField} isEditable={true} allData={allData} loading={loading} loadingSection={loadingSection} manualValidations={manualValidations} handleManualValidation={handleManualValidation} revisionHandlers={revisionHandlers} />

    <SalesComparisonSection
      data={data}
      extractionAttempted={extractionAttempted}
      handleDataChange={handleDataChange}
      editingField={editingField}
      setEditingField={setEditingField}
      salesGridRows={salesGridRows}
      comparableSales={comparableSales}
      salesHistoryFields={salesHistoryFields}
      salesComparisonAdditionalInfoFields={salesComparisonAdditionalInfoFields}
      isEditable={true}
      allData={allData}
      formType={formType}
      manualValidations={manualValidations}
      handleManualValidation={handleManualValidation}
      onRevisionButtonClick={onSalesGridRevisionButtonClick}
      revisionHandlers={revisionHandlers}
    />

    <GridInfoCard id="reconciliation-section" title="RECONCILIATION" fields={reconciliationFields} data={data.RECONCILIATION} cardClass="bg-secondary" extractionAttempted={extractionAttempted} onDataChange={(field, value) => handleDataChange(['RECONCILIATION', ...field], value)} editingField={editingField} setEditingField={setEditingField} isEditable={true} allData={allData} loading={loading} loadingSection={loadingSection} manualValidations={manualValidations} handleManualValidation={handleManualValidation} onRevisionButtonClick={onReconciliationRevisionButtonClick} revisionHandlers={revisionHandlers} />

    <GridInfoCard id="cost-approach-section" title="Cost Approach" fields={costApproachFields} data={data} cardClass="bg-dark" extractionAttempted={extractionAttempted} onDataChange={(field, value) => handleDataChange(field, value)} editingField={editingField} setEditingField={setEditingField} isEditable={true} allData={allData} loading={loading} loadingSection={loadingSection} manualValidations={manualValidations} handleManualValidation={handleManualValidation} onRevisionButtonClick={onCostApproachRevisionButtonClick} revisionHandlers={revisionHandlers} />

    <GridInfoCard id="income-approach-section" title="Income Approach" fields={incomeApproachFields} data={data} cardClass="bg-danger" extractionAttempted={extractionAttempted} onDataChange={(field, value) => handleDataChange(field, value)} editingField={editingField} setEditingField={setEditingField} isEditable={true} allData={allData} loading={loading} loadingSection={loadingSection} manualValidations={manualValidations} handleManualValidation={handleManualValidation} revisionHandlers={revisionHandlers} />

    <GridInfoCard id="pud-info-section" title="PUD Information" fields={pudInformationFields} data={data} cardClass="bg-secondary" extractionAttempted={extractionAttempted} onDataChange={(field, value) => handleDataChange(field, value)} editingField={editingField} setEditingField={setEditingField} isEditable={true} allData={allData} loading={loading} loadingSection={loadingSection} manualValidations={manualValidations} handleManualValidation={handleManualValidation} revisionHandlers={revisionHandlers} />

    <GridInfoCard id="market-conditions-summary" title="Market Conditions Narrative" fields={marketConditionsFields} data={{ ...data, ...(data?.MARKET_CONDITIONS || {}) }} cardClass="bg-warning" usePre={true} extractionAttempted={extractionAttempted} onDataChange={(field, value) => handleDataChange(['MARKET_CONDITIONS', field], value)} editingField={editingField} setEditingField={setEditingField} isEditable={true} loading={loading} loadingSection={loadingSection} manualValidations={manualValidations} handleManualValidation={handleManualValidation} revisionHandlers={revisionHandlers} />

    <MarketConditionsTable id="market-conditions-section" data={data} onDataChange={(field, value) => handleDataChange(field, value)} editingField={editingField} setEditingField={setEditingField} isEditable={true} marketConditionsRows={marketConditionsRows} manualValidations={manualValidations} handleManualValidation={handleManualValidation} revisionHandlers={revisionHandlers} />

    <CondoCoopProjectsTable id="condo-coop-section" title="CONDO/CO-OP PROJECTS" data={data} onDataChange={handleDataChange} editingField={editingField} setEditingField={setEditingField} isEditable={true} condoCoopProjectsRows={condoCoopProjectsRows} extractionAttempted={extractionAttempted} revisionHandlers={revisionHandlers} />

    <GridInfoCard id="condo-foreclosure-section" fields={condoForeclosureFields} data={data.CONDO_FORECLOSURE} usePre={true} extractionAttempted={extractionAttempted} onDataChange={(field, value) => handleDataChange(['CONDO_FORECLOSURE', ...field], value)} editingField={editingField} setEditingField={setEditingField} isEditable={true} allData={allData} loading={loading} loadingSection={loadingSection} manualValidations={manualValidations} handleManualValidation={handleManualValidation} revisionHandlers={revisionHandlers} />

    <GridInfoCard id="appraiser-section" title="CERTIFICATION" fields={appraiserFields} data={data.CERTIFICATION} cardClass="bg-info" extractionAttempted={extractionAttempted} onDataChange={(field, value) => handleDataChange(['CERTIFICATION', ...field], value)} editingField={editingField} setEditingField={setEditingField} isEditable={true} allData={allData} loading={loading} loadingSection={loadingSection} manualValidations={manualValidations} handleManualValidation={handleManualValidation} onRevisionButtonClick={onCertificationRevisionButtonClick} revisionHandlers={revisionHandlers} />

    <PhotosGallerySection id="photos-exhibits-section" data={data} allData={allData} extractedPhotos={allData?.EXTRACTED_PHOTOS || data?.EXTRACTED_PHOTOS || []} />
  </>
);

export default Form1004;
