import React from 'react';
import { SubjectInfoCard, GridInfoCard } from '../components/FormComponents';
import ActionButtons from '../components/ActionButtons';
import PhotosGallerySection from '../components/PhotosGallerySection';
import MapAndSketchExhibitsSection from '../components/MapAndSketchExhibitsSection';
import ComparableRentScheduleSection from '../components/ComparableRentScheduleSection';

const Form1007 = ({
  data, allData, extractionAttempted, handleDataChange, editingField, setEditingField,
  highlightedSubjectFields, subjectFields, appraiserFields,
  comparableRents, rentScheduleReconciliationFields,
  comparisonData, getComparisonStyle, loading, loadingSection,
  handleStateRequirementCheck, stateReqLoading, handleClientRequirementCheck, clientReqLoading,
  handleEscalationCheck, escalationLoading, manualValidations, handleManualValidation,
  onSubjectRevisionButtonClick, onCertificationRevisionButtonClick,
  on1007RevisionButtonClick, selectedFile, revisionHandlers
}) => {
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
      <SubjectInfoCard
        id="subject-info"
        title="Subject Information"
        fields={subjectFields}
        hideEmptyFields={true}
        data={data}
        extractionAttempted={extractionAttempted}
        onDataChange={handleDataChange}
        isEditable={true}
        editingField={editingField}
        setEditingField={setEditingField}
        highlightedFields={highlightedSubjectFields}
        allData={allData}
        comparisonData={comparisonData}
        getComparisonStyle={getComparisonStyle}
        loading={loading}
        loadingSection={loadingSection}
        manualValidations={manualValidations}
        handleManualValidation={handleManualValidation}
        onRevisionButtonClick={onSubjectRevisionButtonClick}
        revisionHandlers={revisionHandlers}
      />

      <ComparableRentScheduleSection
        data={data}
        allData={allData}
        extractionAttempted={extractionAttempted}
        handleDataChange={handleDataChange}
        editingField={editingField}
        setEditingField={setEditingField}
        comparableRents={comparableRents}
        on1007RevisionButtonClick={on1007RevisionButtonClick}
        manualValidations={manualValidations}
        handleManualValidation={handleManualValidation}
        revisionHandlers={revisionHandlers}
        isEditable={true}
      />

      <GridInfoCard
        id="rent-schedule-reconciliation-section"
        title="Comparable Rent Schedule Reconciliation"
        fields={rentScheduleReconciliationFields}
        data={{
          ...data,
          ...(data?.['Comparable Rent Schedule Reconciliation'] || {}),
          ...(allData?.['Comparable Rent Schedule Reconciliation'] || {}),
          ...(data?.clean_data?.['Comparable Rent Schedule Reconciliation'] || {})
        }}
        cardClass="bg-info"
        usePre={true}
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
      />

      <GridInfoCard
        id="appraiser-section"
        title="CERTIFICATION"
        fields={appraiserFields}
        hideEmptyFields={true}
        data={data?.CERTIFICATION || {}}
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
      />
      <MapAndSketchExhibitsSection id="map-sketch-exhibits-section" data={data} allData={allData} selectedFile={selectedFile} />
      <PhotosGallerySection id="photos-exhibits-section" data={data} allData={allData} extractedPhotos={allData?.EXTRACTED_PHOTOS || data?.EXTRACTED_PHOTOS || []} />
    </>
  );
};

export default Form1007;
