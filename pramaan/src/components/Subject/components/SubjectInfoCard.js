import React from 'react';
import { Paper, Box, Typography, Tooltip, IconButton, LinearProgress } from '@mui/material';
import LibraryBooksIcon from '@mui/icons-material/LibraryBooks';
import { EditableField } from './EditableField';

export const SubjectInfoCard = ({ id, title, fields, data, extractionAttempted, onDataChange, isEditable = true, editingField, setEditingField, highlightedFields, allData, comparisonData, getComparisonStyle, loading, loadingSection, contractExtracted, setContractExtracted, handleExtract, manualValidations, handleManualValidation, onRevisionButtonClick, revisionHandlers, hideEmptyFields = false }) => {

  const getFieldValue = (field) => {
    if (data && data[field] !== undefined && data[field] !== null && data[field] !== '') return data[field];
    if (data && data.Subject && data.Subject[field] !== undefined && data.Subject[field] !== null && data.Subject[field] !== '') return data.Subject[field];
    if (data && data.SUBJECT && data.SUBJECT[field] !== undefined && data.SUBJECT[field] !== null && data.SUBJECT[field] !== '') return data.SUBJECT[field];
    if (allData && allData[field] !== undefined && allData[field] !== null && allData[field] !== '') return allData[field];
    if (allData && allData.Subject && allData.Subject[field] !== undefined && allData.Subject[field] !== null && allData.Subject[field] !== '') return allData.Subject[field];
    if (allData && allData.SUBJECT && allData.SUBJECT[field] !== undefined && allData.SUBJECT[field] !== null && allData.SUBJECT[field] !== '') return allData.SUBJECT[field];
    if (allData && allData.RECONCILIATION && allData.RECONCILIATION[field] !== undefined && allData.RECONCILIATION[field] !== null && allData.RECONCILIATION[field] !== '') return allData.RECONCILIATION[field];
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

    if (field === 'PUD') {
      const perMonth = data['PUD Fees (per month)'] || allData?.['PUD Fees (per month)'];
      const perYear = data['PUD Fees (per year)'] || allData?.['PUD Fees (per year)'];
      if (perMonth) {
        displayValue = `${displayValue} per month`;
      } else if (perYear) {
        displayValue = `${displayValue} per year`;
      }
    }

    const isLongCommentField = ['ANSI', 'Exposure Comment', 'Prior Service Comment'].includes(field);

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
          {field}
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
            field !== 'HOA(per month)' &&
            field !== 'HOA(per year)' &&
            field !== 'PUD Fees (per month)' &&
            field !== 'PUD Fees (per year)' &&
            (!hideEmptyFields || (getFieldValue(field) !== undefined && getFieldValue(field) !== null && String(getFieldValue(field)).trim() !== ''))
          )
          .map(field => renderGridItem(field))
        }
      </Box>
    </Paper>
  );
};
