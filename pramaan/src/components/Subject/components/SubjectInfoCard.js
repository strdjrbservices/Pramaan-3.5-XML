import React from 'react';
import { Paper, Box, Typography, Tooltip, IconButton, LinearProgress } from '@mui/material';
import LibraryBooksIcon from '@mui/icons-material/LibraryBooks';
import { EditableField } from './EditableField';

export const SubjectInfoCard = ({ id, title, fields, data, extractionAttempted, onDataChange, isEditable = true, editingField, setEditingField, highlightedFields, allData, comparisonData, getComparisonStyle, loading, loadingSection, contractExtracted, setContractExtracted, handleExtract, manualValidations, handleManualValidation, onRevisionButtonClick, revisionHandlers, hideEmptyFields = false }) => {

  const getFieldValue = (field) => {
    const candidateKeys = [field];
    if (field === 'HOA(per month)' || field === 'HOA (per month)') {
      candidateKeys.push('HOA(per month)', 'HOA (per month)', 'PUD Fees (per month)', 'per month');
    } else if (field === 'HOA(per year)' || field === 'HOA (per year)') {
      candidateKeys.push('HOA(per year)', 'HOA (per year)', 'PUD Fees (per year)', 'per year');
    } else if (field === 'PUD') {
      candidateKeys.push('PUD', 'Planned Unit Development (PUD)');
    } else if (field === 'HOA $') {
      candidateKeys.push('HOA $', 'HOA', 'PUD Fees $', 'Monthly Amount');
    } else if (field === 'as of' || (typeof field === 'string' && field.trim().toLowerCase() === 'as of')) {
      candidateKeys.push('as of', 'as of date', 'Appraisal Effective Date', 'Effective Date of Appraisal', 'Effective Date');
    } else if (field === 'FHA Case #' || field === 'FHA Case No.' || field === 'FHA Case Number') {
      candidateKeys.push('FHA Case #', 'FHA Case No.', 'FHA Case Number');
    } else if (field === "Appraiser's Fee" || field === "Appraiser Fee" || field === "Appraisal Fee") {
      candidateKeys.push("Appraiser's Fee", "Appraiser Fee", "Appraisal Fee", "Total Fee", "Fee");
    } else if (field === '1004MC Addendum' || field === '1004MC Present' || field === '1004MC') {
      candidateKeys.push('1004MC Addendum', '1004MC Present', '1004MC');
    } else if (field === 'ANSI' || field === 'ANSI Comment' || field === 'ANSI Standards') {
      candidateKeys.push('ANSI', 'ANSI Comment', 'ANSI Standards');
    } else if (field === 'Exposure Comment' || field === 'Exposure comment') {
      candidateKeys.push('Exposure Comment', 'Exposure comment', 'Reasonable Exposure Time', 'exposure_comment');
    } else if (field === 'Prior Service Comment' || field === 'Prior service comment' || field === 'Prior Service') {
      candidateKeys.push('Prior Service Comment', 'Prior service comment', 'Prior Service', 'prior_service_comment');
    }

    for (const k of candidateKeys) {
      if (data && data[k] !== undefined && data[k] !== null && data[k] !== '') return data[k];
      if (data && data.Subject && data.Subject[k] !== undefined && data.Subject[k] !== null && data.Subject[k] !== '') return data.Subject[k];
      if (data && data.SUBJECT && data.SUBJECT[k] !== undefined && data.SUBJECT[k] !== null && data.SUBJECT[k] !== '') return data.SUBJECT[k];
      if (data && data.RECONCILIATION && data.RECONCILIATION[k] !== undefined && data.RECONCILIATION[k] !== null && data.RECONCILIATION[k] !== '') return data.RECONCILIATION[k];
      if (data && data.Reconciliation && data.Reconciliation[k] !== undefined && data.Reconciliation[k] !== null && data.Reconciliation[k] !== '') return data.Reconciliation[k];
      if (allData && allData[k] !== undefined && allData[k] !== null && allData[k] !== '') return allData[k];
      if (allData && allData.Subject && allData.Subject[k] !== undefined && allData.Subject[k] !== null && allData.Subject[k] !== '') return allData.Subject[k];
      if (allData && allData.SUBJECT && allData.SUBJECT[k] !== undefined && allData.SUBJECT[k] !== null && allData.SUBJECT[k] !== '') return allData.SUBJECT[k];
      if (allData && allData.PUD_INFO && allData.PUD_INFO[k] !== undefined && allData.PUD_INFO[k] !== null && allData.PUD_INFO[k] !== '') return allData.PUD_INFO[k];
      if (allData && allData.RECONCILIATION && allData.RECONCILIATION[k] !== undefined && allData.RECONCILIATION[k] !== null && allData.RECONCILIATION[k] !== '') return allData.RECONCILIATION[k];
      if (allData && allData.Reconciliation && allData.Reconciliation[k] !== undefined && allData.Reconciliation[k] !== null && allData.Reconciliation[k] !== '') return allData.Reconciliation[k];
      if (allData && allData.CERTIFICATION && allData.CERTIFICATION[k] !== undefined && allData.CERTIFICATION[k] !== null && allData.CERTIFICATION[k] !== '') return allData.CERTIFICATION[k];
      if (allData && allData.Certification && allData.Certification[k] !== undefined && allData.Certification[k] !== null && allData.Certification[k] !== '') return allData.Certification[k];
    }
    return '';
  };

  const renderGridItem = (field) => {
    const isHighlighted = highlightedFields.includes(field);
    const itemStyle = {};
    if (extractionAttempted && (data[field] === undefined || data[field] === null || data[field] === '')) {
      itemStyle.padding = '4px';
      itemStyle.borderRadius = '4px';
    }

    let displayValue = getFieldValue(field);

    let fieldPath = (data && data.Subject && data.Subject[field] !== undefined)
      ? ['Subject', field]
      : (data && data.SUBJECT && data.SUBJECT[field] !== undefined)
      ? ['SUBJECT', field]
      : (data && data[field] !== undefined)
      ? [field]
      : (allData && allData.Subject && allData.Subject[field] !== undefined)
      ? ['Subject', field]
      : (allData && allData.SUBJECT && allData.SUBJECT[field] !== undefined)
      ? ['SUBJECT', field]
      : (allData && allData[field] !== undefined)
      ? [field]
      : (allData && allData.RECONCILIATION && allData.RECONCILIATION[field] !== undefined)
      ? ['RECONCILIATION', field]
      : [field];

    const comparisonStyle = getComparisonStyle ? getComparisonStyle(field, displayValue, comparisonData?.[field]) : {};

    const isLongCommentField = ['ANSI', 'Exposure Comment', 'Prior Service Comment'].includes(field);
    const displayLabel = (field === 'HOA(per month)' || field === 'HOA (per month)')
      ? 'HOA (per month)'
      : (field === 'HOA(per year)' || field === 'HOA (per year)')
      ? 'HOA (per year)'
      : field;

    return (
      <div 
        key={field} 
        className={`subject-grid-item ${isHighlighted ? 'highlighted-field' : ''}`} 
        style={{ 
          ...itemStyle, 
          ...comparisonStyle, 
          color: 'inherit',
          gridColumn: isLongCommentField ? '1 / -1' : 'auto'
        }}
      >
        <span 
          className="field-label" 
          onClick={() => isEditable !== false && setEditingField && setEditingField(fieldPath)}
          style={{ cursor: isEditable !== false ? 'pointer' : 'default', userSelect: 'none' }}
        >
          {displayLabel}
        </span>

        <EditableField
          fieldPath={fieldPath}
          value={displayValue}
          onDataChange={(path, val) => {
            if (onDataChange) {
              onDataChange(path, val);
            }
          }}
          editingField={editingField}
          setEditingField={setEditingField}
          isMissing={false}
          allData={{ ...(allData || data), comparisonData: comparisonData || (allData || data)?.comparisonData }}
          isEditable={isEditable !== false}
          manualValidations={manualValidations}
          handleManualValidation={handleManualValidation}
          revisionHandlers={revisionHandlers}
        />
      </div>
    );
  };

  return (
    <Paper id={id} elevation={1} sx={{ mb: 4, borderRadius: 2, overflow: 'hidden', borderTop: '3px solid', borderTopColor: 'secondary.main' }} className="subject-info-card">
      <Box sx={{ bgcolor: 'grey.50', color: 'text.primary', borderBottom: '1px solid', borderColor: 'grey.200', px: 2, py: 1.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, zIndex: 10 }}>
        <Typography variant="h6" component="div" sx={{ fontSize: '1.1rem', fontWeight: 'bold' }}>{title}</Typography>
        {onRevisionButtonClick && (
          <Tooltip title="Revision Language">
            <IconButton onClick={onRevisionButtonClick} size="small" sx={{ color: 'text.secondary', float: 'right', ml: 'auto' }}><LibraryBooksIcon /></IconButton>
          </Tooltip>
        )}
      </Box>
      {loading && loadingSection === id && (
        <Box sx={{ width: '100%' }}><LinearProgress /></Box>
      )}
      <Box className="card-body subject-grid-container" sx={{ p: 2 }}>
        {fields
          .filter(field =>
            (!hideEmptyFields || (getFieldValue(field) !== undefined && getFieldValue(field) !== null && String(getFieldValue(field)).trim() !== ''))
          )
          .map(field => renderGridItem(field))
        }
      </Box>
    </Paper>
  );
};
