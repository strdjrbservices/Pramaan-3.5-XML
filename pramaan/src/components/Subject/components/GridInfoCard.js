import React from 'react';
import { Paper, Box, Typography, Tooltip, IconButton, LinearProgress } from '@mui/material';
import LibraryBooksIcon from '@mui/icons-material/LibraryBooks';
import { EditableField } from './EditableField';

export const GridInfoCard = ({ id, title, fields, data, cardClass = 'bg-secondary', usePre = false, extractionAttempted, onDataChange, editingField, setEditingField, highlightedFields = [], allData, loading, loadingSection, manualValidations, handleManualValidation, onRevisionButtonClick, revisionHandlers, showBlankValidation = false, hideEmptyFields = false, isEditable = true }) => {

  const renderNeighborhoodTotal = () => {
    if (id !== 'neighborhood-section' || !data) return null;

    const usageFields = ["One-Unit", "2-4 Unit", "Multi-Family", "Commercial", "Other"];
    const values = usageFields.map(f => {
      const val = String(data[f] || '0').replace('%', '').trim();
      return parseFloat(val) || 0;
    });
    const total = values.reduce((sum, v) => sum + v, 0);

    const totalStyle = {
      fontWeight: 'bold',
      padding: '2px 8px',
      borderRadius: '4px',
      color: total === 100 ? '#000000' : '#721c24',
      backgroundColor: total === 100 ? '#91ff00ff' : '#f8d7da',
    };

    return <span style={totalStyle}>Total: {total}%</span>;
  };

  const getDynamicFields = () => {
    if (!data) return fields;

    let dynamicFields = [...fields];
    if (id === 'site-section' || id === 'project-site-section') {
      const zoningComplianceRaw = data?.['Zoning Compliance']
        ?? data?.SITE?.['Zoning Compliance']
        ?? allData?.SITE?.['Zoning Compliance']
        ?? allData?.['Zoning Compliance'];
      const zoningComplianceValue = (typeof zoningComplianceRaw === 'object' && zoningComplianceRaw !== null
        ? (zoningComplianceRaw.choice || zoningComplianceRaw.value || '')
        : String(zoningComplianceRaw || '')).trim().toLowerCase();
      const complianceIndex = dynamicFields.indexOf('Zoning Compliance');

      if (complianceIndex !== -1) {
        const isNonconforming = zoningComplianceValue.includes('nonconforming') || zoningComplianceValue.includes('grandfathered');
        if (isNonconforming && !dynamicFields.includes('Legal Nonconforming (Grandfathered Use) comment')) {
          dynamicFields.splice(complianceIndex + 1, 0, 'Legal Nonconforming (Grandfathered Use) comment');
        } else if (zoningComplianceValue.includes('no zoning') && !dynamicFields.includes('No Zoning comment')) {
          dynamicFields.splice(complianceIndex + 1, 0, 'No Zoning comment');
        }
      }
    }

    if (id === 'reconciliation-section' || title === 'RECONCILIATION') {
      const reconConditionField = 'This appraisal is made "as is", subject to completion per plans and specifications on the basis of a hypothetical condition that the improvements have been completed, subject to the following repairs or alterations on the basis of a hypothetical condition that the repairs or alterations have been completed, or subject to the following required inspection based on the extraordinary assumption that the condition or deficiency does not require alteration or repair:';
      let conditionIndex = dynamicFields.indexOf(reconConditionField);
      if (conditionIndex === -1) {
        conditionIndex = dynamicFields.findIndex(f => typeof f === 'string' && f.toLowerCase().includes('this appraisal is made'));
      }

      const reconConditionRaw = data?.[reconConditionField]
        ?? data?.RECONCILIATION?.[reconConditionField]
        ?? allData?.RECONCILIATION?.[reconConditionField]
        ?? allData?.[reconConditionField]
        ?? data?.['Reconciliation Status']
        ?? allData?.['Reconciliation Status']
        ?? '';
      const reconConditionValue = (typeof reconConditionRaw === 'object' && reconConditionRaw !== null
        ? (reconConditionRaw.choice || reconConditionRaw.value || '')
        : String(reconConditionRaw || '')).trim().toLowerCase();

      const isSubjectTo = reconConditionValue.includes('subject');
      const conditionsCommentRaw = data?.['Conditions Comment']
        ?? data?.['Subject To Comment']
        ?? data?.RECONCILIATION?.['Conditions Comment']
        ?? data?.RECONCILIATION?.['Subject To Comment']
        ?? allData?.RECONCILIATION?.['Conditions Comment']
        ?? allData?.RECONCILIATION?.['Subject To Comment']
        ?? allData?.['Conditions Comment']
        ?? allData?.['Subject To Comment']
        ?? '';

      if (isSubjectTo || String(conditionsCommentRaw || '').trim() !== '') {
        if (!dynamicFields.includes('Conditions Comment')) {
          if (conditionIndex !== -1) {
            dynamicFields.splice(conditionIndex + 1, 0, 'Conditions Comment');
          } else {
            dynamicFields.push('Conditions Comment');
          }
        }
      }
    }

    return dynamicFields;
  };
  const cardHeaderColors = {
    'bg-primary': 'primary.main',
    'bg-secondary': 'secondary.main',
    'bg-info': 'info.main',
    'bg-warning': 'warning.main',
    'bg-success': 'success.main',
    'bg-danger': 'error.main',
    'bg-dark': 'grey.900',
  };

  const borderColor = cardHeaderColors[cardClass] || 'primary.main';

  const renderValue = (value) => {
    if (typeof value === 'object' && value !== null) {
      if (value.hasOwnProperty('choice')) {
        return value.choice || '';
      }
      return Object.entries(value).map(([key, val]) => `${key}: ${val}`).join(', ');
    }
    return value || '';
  };

  const renderGridItemValue = (field) => {
    if (field === 'Garage Att./Det./Built-in') {
      const att = data?.['Garage Att.'] || data?.IMPROVEMENTS?.['Garage Att.'] || allData?.['Garage Att.'] || '';
      const det = data?.['Garage Detached'] || data?.IMPROVEMENTS?.['Garage Detached'] || allData?.['Garage Detached'] || '';
      const builtin = data?.['Garage Built-in'] || data?.IMPROVEMENTS?.['Garage Built-in'] || allData?.['Garage Built-in'] || '';
      return [att, det, builtin].filter(Boolean).join(' / ');
    }
    if (field === 'as of' || (typeof field === 'string' && field.trim().toLowerCase() === 'as of')) {
      const asOfVal = data?.['as of']
        ?? data?.['as of date']
        ?? data?.['Appraisal Effective Date']
        ?? data?.['Effective Date of Appraisal']
        ?? data?.['Effective Date']
        ?? data?.RECONCILIATION?.['as of']
        ?? data?.RECONCILIATION?.['as of date']
        ?? data?.RECONCILIATION?.['Appraisal Effective Date']
        ?? data?.RECONCILIATION?.['Effective Date of Appraisal']
        ?? data?.Reconciliation?.['as of']
        ?? data?.Reconciliation?.['as of date']
        ?? data?.Reconciliation?.['Appraisal Effective Date']
        ?? data?.Reconciliation?.['Effective Date of Appraisal']
        ?? allData?.['as of']
        ?? allData?.['as of date']
        ?? allData?.RECONCILIATION?.['as of']
        ?? allData?.RECONCILIATION?.['as of date']
        ?? allData?.RECONCILIATION?.['Appraisal Effective Date']
        ?? allData?.RECONCILIATION?.['Effective Date of Appraisal']
        ?? allData?.Reconciliation?.['as of']
        ?? allData?.Reconciliation?.['as of date']
        ?? allData?.Reconciliation?.['Appraisal Effective Date']
        ?? allData?.Reconciliation?.['Effective Date of Appraisal']
        ?? allData?.CERTIFICATION?.['Effective Date of Appraisal']
        ?? allData?.CERTIFICATION?.['Effective Date']
        ?? allData?.Certification?.['Effective Date of Appraisal']
        ?? allData?.Certification?.['Effective Date']
        ?? allData?.['Appraisal Effective Date']
        ?? allData?.['Effective Date of Appraisal']
        ?? allData?.['Effective Date'];
      if (asOfVal) return renderValue(asOfVal);
    }
    if (field === 'FHA Case #' || field === 'FHA Case No.' || field === 'FHA Case Number') {
      const fhaVal = data?.['FHA Case No.']
        ?? data?.['FHA Case #']
        ?? data?.['FHA Case Number']
        ?? data?.SUBJECT?.['FHA Case No.']
        ?? data?.SUBJECT?.['FHA Case #']
        ?? data?.Subject?.['FHA Case No.']
        ?? allData?.['FHA Case No.']
        ?? allData?.['FHA Case #']
        ?? allData?.['FHA Case Number']
        ?? allData?.SUBJECT?.['FHA Case No.']
        ?? allData?.SUBJECT?.['FHA Case #']
        ?? allData?.Subject?.['FHA Case No.'];
      if (fhaVal) return renderValue(fhaVal);
    }
    if (field === "Appraiser's Fee" || field === "Appraiser Fee" || field === "Appraisal Fee") {
      const feeVal = data?.["Appraiser's Fee"]
        ?? data?.["Appraiser Fee"]
        ?? data?.["Appraisal Fee"]
        ?? data?.SUBJECT?.["Appraiser's Fee"]
        ?? data?.SUBJECT?.["Appraiser Fee"]
        ?? data?.CERTIFICATION?.["Appraiser's Fee"]
        ?? data?.CERTIFICATION?.["Appraiser Fee"]
        ?? allData?.["Appraiser's Fee"]
        ?? allData?.["Appraiser Fee"]
        ?? allData?.["Appraisal Fee"]
        ?? allData?.SUBJECT?.["Appraiser's Fee"]
        ?? allData?.CERTIFICATION?.["Appraiser's Fee"];
      if (feeVal) return renderValue(feeVal);
    }
    if (field === "1004MC Addendum" || field === "1004MC Present" || field === "1004MC") {
      const mcVal = data?.["1004MC Addendum"]
        ?? data?.["1004MC Present"]
        ?? data?.SUBJECT?.["1004MC Addendum"]
        ?? data?.SUBJECT?.["1004MC Present"]
        ?? allData?.["1004MC Addendum"]
        ?? allData?.["1004MC Present"]
        ?? allData?.SUBJECT?.["1004MC Addendum"]
        ?? (allData?.has_1004mc ? "Present" : "");
      if (mcVal) return renderValue(mcVal);
    }
    if (
      field === "USPAP / Appraisal and Report Identification" ||
      field === "Appraisal and Report Identification" ||
      field === "USPAP Addendum" ||
      field === "USPAP" ||
      field === "USPAP Reporting Option" ||
      (typeof field === "string" && field.includes("USPAP reporting option"))
    ) {
      const uspapVal = data?.[field]
        ?? data?.["This report was prepared under the following USPAP reporting option:\nAppraisal Report A written report prepared under Standards Rule 2-2(a).\nRestricted Appraisal Report A written report prepared under Standards Rule 2-2(b)."]
        ?? data?.["This report was prepared under the following USPAP reporting option:"]
        ?? data?.["USPAP Reporting Option"]
        ?? data?.["USPAP / Appraisal and Report Identification"]
        ?? data?.["Appraisal and Report Identification"]
        ?? data?.["USPAP Addendum"]
        ?? data?.SUBJECT?.["USPAP Reporting Option"]
        ?? data?.SUBJECT?.["USPAP / Appraisal and Report Identification"]
        ?? data?.SUBJECT?.["Appraisal and Report Identification"]
        ?? data?.CERTIFICATION?.["USPAP Reporting Option"]
        ?? allData?.["USPAP Reporting Option"]
        ?? allData?.["USPAP / Appraisal and Report Identification"]
        ?? allData?.["Appraisal and Report Identification"]
        ?? allData?.SUBJECT?.["USPAP / Appraisal and Report Identification"]
        ?? (allData?.has_uspap_identification ? "Appraisal Report" : "");
      if (uspapVal) return renderValue(uspapVal);
    }
    if (field === "Comments on Appraisal and Report Identification" || field === "Restricted Appraisal Report Comment") {
      const commVal = data?.["Comments on Appraisal and Report Identification"]
        ?? data?.["Restricted Appraisal Report Comment"]
        ?? data?.CERTIFICATION?.["Comments on Appraisal and Report Identification"]
        ?? data?.Subject?.["Comments on Appraisal and Report Identification"]
        ?? allData?.["Comments on Appraisal and Report Identification"]
        ?? allData?.["Restricted Appraisal Report Comment"]
        ?? allData?.CERTIFICATION?.["Comments on Appraisal and Report Identification"];
      if (commVal) return renderValue(commVal);
    }
    if (field === "E&O" || field === "E&O Present") {
      const eoVal = data?.["E&O"]
        ?? data?.["E&O Present"]
        ?? data?.CERTIFICATION?.["E&O"]
        ?? data?.CERTIFICATION?.["E&O Present"]
        ?? allData?.["E&O"]
        ?? allData?.["E&O Present"]
        ?? allData?.CERTIFICATION?.["E&O"]
        ?? allData?.CERTIFICATION?.["E&O Present"];
      if (eoVal) return renderValue(eoVal);
    }
    if (
      field === 'Legal Nonconforming (Grandfathered Use) comment' ||
      field === 'Legal Nonconforming comment' ||
      field === 'Nonconforming comment' ||
      field === 'Zoning Compliance comment'
    ) {
      const commentVal = data?.['Legal Nonconforming (Grandfathered Use) comment']
        ?? data?.['Legal Nonconforming comment']
        ?? data?.['Nonconforming comment']
        ?? data?.['Zoning Compliance comment']
        ?? data?.SITE?.['Legal Nonconforming (Grandfathered Use) comment']
        ?? data?.SITE?.['Legal Nonconforming comment']
        ?? data?.SITE?.['Nonconforming comment']
        ?? data?.SITE?.['Zoning Compliance comment']
        ?? allData?.SITE?.['Legal Nonconforming (Grandfathered Use) comment']
        ?? allData?.SITE?.['Legal Nonconforming comment']
        ?? allData?.SITE?.['Nonconforming comment']
        ?? allData?.SITE?.['Zoning Compliance comment']
        ?? allData?.['Legal Nonconforming (Grandfathered Use) comment']
        ?? allData?.['Legal Nonconforming comment']
        ?? allData?.['Nonconforming comment']
        ?? allData?.['Zoning Compliance comment'];
      if (commentVal) return renderValue(commentVal);
    }
    if (field === 'Invoice Attached' || field === 'Invoice Present') {
      const invVal = data?.['Invoice Attached'] ?? data?.['Invoice Present'] ?? data?.CERTIFICATION?.['Invoice Attached'] ?? data?.CERTIFICATION?.['Invoice Present'] ?? data?.SUBJECT?.['Invoice Attached'] ?? data?.SUBJECT?.['Invoice Present'] ?? data?.INVOICE?.['Invoice Attached'] ?? allData?.['Invoice Attached'] ?? allData?.['Invoice Present'] ?? allData?.CERTIFICATION?.['Invoice Attached'] ?? allData?.CERTIFICATION?.['Invoice Present'] ?? allData?.SUBJECT?.['Invoice Attached'] ?? allData?.INVOICE?.['Invoice Attached'];
      if (invVal) return renderValue(invVal);
    }
    if (field === 'Conditions Comment' || field === 'Subject To Comment') {
      const condVal = data?.['Conditions Comment']
        ?? data?.['Subject To Comment']
        ?? data?.RECONCILIATION?.['Conditions Comment']
        ?? data?.RECONCILIATION?.['Subject To Comment']
        ?? data?.Reconciliation?.['Conditions Comment']
        ?? data?.Reconciliation?.['Subject To Comment']
        ?? allData?.RECONCILIATION?.['Conditions Comment']
        ?? allData?.RECONCILIATION?.['Subject To Comment']
        ?? allData?.['Conditions Comment']
        ?? allData?.['Subject To Comment'];
      if (condVal !== undefined && condVal !== null) return renderValue(condVal);
    }
    const val = data?.[field]
      ?? data?.CONTRACT?.[field]
      ?? data?.NEIGHBORHOOD?.[field]
      ?? data?.IMPROVEMENTS?.[field]
      ?? data?.COST_APPROACH?.[field]
      ?? data?.INCOME_APPROACH?.[field]
      ?? data?.PUD_INFO?.[field]
      ?? data?.PROJECT_INFO?.[field]
      ?? data?.['Project Information']?.[field]
      ?? data?.PROJECT_ANALYSIS?.[field]
      ?? data?.['Project Analysis']?.[field]
      ?? data?.clean_data?.['Project Information']?.[field]
      ?? data?.clean_data?.['Project Analysis']?.[field]
      ?? data?.SITE?.[field]
      ?? data?.SUBJECT?.[field]
      ?? data?.RECONCILIATION?.[field]
      ?? data?.Reconciliation?.[field]
      ?? data?.CERTIFICATION?.[field]
      ?? allData?.[field]
      ?? allData?.CONTRACT?.[field]
      ?? allData?.NEIGHBORHOOD?.[field]
      ?? allData?.IMPROVEMENTS?.[field]
      ?? allData?.PROJECT_INFO?.[field]
      ?? allData?.['Project Information']?.[field]
      ?? allData?.PROJECT_ANALYSIS?.[field]
      ?? allData?.['Project Analysis']?.[field]
      ?? allData?.clean_data?.['Project Information']?.[field]
      ?? allData?.clean_data?.['Project Analysis']?.[field]
      ?? allData?.SITE?.[field]
      ?? allData?.SUBJECT?.[field]
      ?? allData?.RECONCILIATION?.[field]
      ?? allData?.Reconciliation?.[field]
      ?? allData?.CERTIFICATION?.[field];
    return renderValue(val);
  };

  const renderGridItem = (field) => {
    if (id === 'neighborhood-section' && field === 'Present Land Use for other') {
      const otherValue = String(data?.['Other'] || allData?.NEIGHBORHOOD?.['Other'] || allData?.['Other'] || '0').replace('%', '').trim();
      const otherNumericValue = parseFloat(otherValue);

      if (isNaN(otherNumericValue) || otherNumericValue <= 0) {
        return null;
      }
    }

    const isHighlighted = highlightedFields.includes(field);
    let isItemMissing = false;
    const computedFieldPath = (() => {
      const baseFieldPath = Array.isArray(field) ? field : [field];
      return onDataChange && onDataChange.length === 2 ? baseFieldPath : [id.replace('-section', '').toUpperCase(), ...baseFieldPath];
    })();

    if (field === 'Conditions Comment' || field === 'Subject To Comment') {
      return (
        <div
          key={field}
          className={`subject-grid-item ${isHighlighted ? 'highlighted-field' : ''}`}

        >
          <span
            className="field-label"
            onClick={() => setEditingField && setEditingField(computedFieldPath)}
            style={{ cursor: 'pointer', userSelect: 'none', color: '#b45309', fontWeight: 'bold', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}
          >
            <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#f59e0b' }}></span>
            Subject To / Conditions Comment
          </span>
          <EditableField
            fieldPath={computedFieldPath}
            value={renderGridItemValue(field)}
            onDataChange={onDataChange}
            editingField={editingField}
            setEditingField={setEditingField}
            usePre={true}
            isMissing={isItemMissing}
            inputClassName="form-control form-control-sm field-value-pre"
            isEditable={true}
            allData={allData}
            manualValidations={manualValidations}
            handleManualValidation={handleManualValidation}
            revisionHandlers={revisionHandlers}
            showBlankValidation={showBlankValidation}
            inputStyle={{ width: '100%', border: 'none', background: 'transparent', padding: 0, height: 'auto', resize: 'vertical', fontSize: '0.9rem', color: '#1f2937' }}
          />
        </div>
      );
    }

    return (
      <div key={field} className={`subject-grid-item ${isHighlighted ? 'highlighted-field' : ''}`}>
        <span
          className="field-label"
          onClick={() => setEditingField && setEditingField(computedFieldPath)}
          style={{ cursor: 'pointer', userSelect: 'none' }}
        >
          {field}
        </span>
        <EditableField
          fieldPath={computedFieldPath}
          value={renderGridItemValue(field)}
          onDataChange={onDataChange}
          editingField={editingField}
          setEditingField={setEditingField}
          usePre={usePre}
          isMissing={isItemMissing}
          inputClassName={`form-control form-control-sm ${usePre ? "field-value-pre" : "field-value"}`}
          isEditable={true}
          allData={allData}
          manualValidations={manualValidations}
          handleManualValidation={handleManualValidation} revisionHandlers={revisionHandlers}
          showBlankValidation={showBlankValidation}
          inputStyle={{ width: '100%', border: 'none', background: 'transparent', padding: 0, height: 'auto', resize: usePre ? 'vertical' : 'none' }}
        />
      </div>
    );
  };

  const renderCertField = (label, fieldPath, isCheckbox = false) => {
    if (isCheckbox) {
      const isChecked = data && (data[fieldPath] === 'Yes' || data[fieldPath] === true || String(data[fieldPath]).toLowerCase() === 'x');
      const handleToggle = () => {
        const newValue = isChecked ? 'No' : 'Yes';
        onDataChange([fieldPath], newValue);
      };
      return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '4px 0' }}>
          <input
            type="checkbox"
            checked={isChecked}
            onChange={handleToggle}
            style={{ width: '14px', height: '14px', cursor: 'pointer' }}
          />
          <span style={{ fontSize: '0.75rem', fontWeight: '500', color: '#495057' }}>{label}</span>
        </div>
      );
    }

    let certVal = data ? renderValue(data[fieldPath]) : '';
    if ((certVal === undefined || certVal === null || certVal === '') && (fieldPath === 'E&O' || fieldPath === 'E&O Present')) {
      certVal = renderValue(data?.['E&O'] ?? data?.['E&O Present'] ?? data?.CERTIFICATION?.['E&O'] ?? data?.CERTIFICATION?.['E&O Present'] ?? allData?.['E&O'] ?? allData?.['E&O Present'] ?? allData?.CERTIFICATION?.['E&O'] ?? allData?.CERTIFICATION?.['E&O Present'] ?? '');
    }
    if ((certVal === undefined || certVal === null || certVal === '') && (fieldPath === 'Invoice Attached' || fieldPath === 'Invoice Present')) {
      certVal = renderValue(data?.['Invoice Attached'] ?? data?.['Invoice Present'] ?? data?.CERTIFICATION?.['Invoice Attached'] ?? data?.CERTIFICATION?.['Invoice Present'] ?? data?.SUBJECT?.['Invoice Attached'] ?? data?.SUBJECT?.['Invoice Present'] ?? data?.INVOICE?.['Invoice Attached'] ?? allData?.['Invoice Attached'] ?? allData?.['Invoice Present'] ?? allData?.CERTIFICATION?.['Invoice Attached'] ?? allData?.CERTIFICATION?.['Invoice Present'] ?? allData?.SUBJECT?.['Invoice Attached'] ?? allData?.INVOICE?.['Invoice Attached'] ?? '');
    }
    if ((certVal === undefined || certVal === null || certVal === '') && (
      fieldPath === 'USPAP Reporting Option' ||
      fieldPath === 'USPAP / Appraisal and Report Identification' ||
      fieldPath === 'Appraisal and Report Identification' ||
      fieldPath === 'This report was prepared under the following USPAP reporting option:\nAppraisal Report A written report prepared under Standards Rule 2-2(a).\nRestricted Appraisal Report A written report prepared under Standards Rule 2-2(b).' ||
      (typeof fieldPath === 'string' && fieldPath.includes('USPAP reporting option'))
    )) {
      certVal = renderValue(
        data?.["This report was prepared under the following USPAP reporting option:\nAppraisal Report A written report prepared under Standards Rule 2-2(a).\nRestricted Appraisal Report A written report prepared under Standards Rule 2-2(b)."]
        ?? data?.["This report was prepared under the following USPAP reporting option:"]
        ?? data?.["USPAP Reporting Option"]
        ?? data?.["USPAP / Appraisal and Report Identification"]
        ?? data?.["Appraisal and Report Identification"]
        ?? data?.CERTIFICATION?.["USPAP Reporting Option"]
        ?? data?.SUBJECT?.["USPAP Reporting Option"]
        ?? allData?.["USPAP Reporting Option"]
        ?? allData?.["This report was prepared under the following USPAP reporting option:\nAppraisal Report A written report prepared under Standards Rule 2-2(a).\nRestricted Appraisal Report A written report prepared under Standards Rule 2-2(b)."]
        ?? allData?.CERTIFICATION?.["USPAP Reporting Option"]
        ?? (data?.has_uspap_identification ? "Appraisal Report" : "")
      );
    }
    if ((certVal === undefined || certVal === null || certVal === '') && (
      fieldPath === 'Comments on Appraisal and Report Identification' ||
      fieldPath === 'Restricted Appraisal Report Comment'
    )) {
      certVal = renderValue(
        data?.["Comments on Appraisal and Report Identification"]
        ?? data?.["Restricted Appraisal Report Comment"]
        ?? data?.CERTIFICATION?.["Comments on Appraisal and Report Identification"]
        ?? data?.Subject?.["Comments on Appraisal and Report Identification"]
        ?? allData?.["Comments on Appraisal and Report Identification"]
        ?? allData?.["Restricted Appraisal Report Comment"]
        ?? allData?.CERTIFICATION?.["Comments on Appraisal and Report Identification"]
        ?? ""
      );
    }
    if ((certVal === undefined || certVal === null || certVal === '') && typeof fieldPath === 'string' && fieldPath.startsWith('Supervisory ')) {
      const subKey = fieldPath.replace('Supervisory ', '');
      const altKey = `Supervisory Appraiser ${subKey}`;
      if (data?.[altKey]) certVal = renderValue(data[altKey]);
      else if (data?.SUPERVISORY_APPRAISER?.[subKey]) certVal = renderValue(data.SUPERVISORY_APPRAISER[subKey]);
      else if (data?.SUPERVISORY_APPRAISER?.[fieldPath]) certVal = renderValue(data.SUPERVISORY_APPRAISER[fieldPath]);
    }
    if ((certVal === undefined || certVal === null || certVal === '') && typeof fieldPath === 'string') {
      if (data?.CERTIFICATION?.[fieldPath]) certVal = renderValue(data.CERTIFICATION[fieldPath]);
      else if (allData?.CERTIFICATION?.[fieldPath]) certVal = renderValue(allData.CERTIFICATION[fieldPath]);
      else if (allData?.[fieldPath]) certVal = renderValue(allData[fieldPath]);
    }

    if (fieldPath === 'E&O' || fieldPath === 'E&O Present') {
      const isPresent = String(certVal || '').trim().toLowerCase() === 'present';
      return (
        <div style={{ borderBottom: '1px solid #dee2e6', paddingBottom: '3px', marginBottom: '6px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span
              onClick={() => setEditingField && setEditingField([fieldPath])}
              style={{ fontWeight: 'bold', color: '#495057', fontSize: '0.7rem', minWidth: '100px', whiteSpace: 'nowrap', cursor: 'pointer', userSelect: 'none' }}
            >
              {label}
            </span>
            <div style={{ flexGrow: 1, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span
                style={{
                  display: 'inline-block',
                  padding: '2px 8px',
                  borderRadius: '12px',
                  fontSize: '0.72rem',
                  fontWeight: 'bold',
                  backgroundColor: isPresent ? '#e8f5e9' : '#ffebee',
                  color: isPresent ? '#1b5e20' : '#c62828',
                  border: `1px solid ${isPresent ? '#a5d6a7' : '#ef9a9a'}`
                }}
              >
                {isPresent ? '● Present' : '○ Absent'}
              </span>
              <div style={{ flexGrow: 1 }}>
                <EditableField
                  fieldPath={[fieldPath]}
                  value={certVal || 'Absent'}
                  onDataChange={onDataChange}
                  editingField={editingField}
                  setEditingField={setEditingField}
                  isMissing={false}
                  isEditable={true}
                  allData={allData}
                  manualValidations={manualValidations}
                  handleManualValidation={handleManualValidation}
                  revisionHandlers={revisionHandlers}
                  inputClassName="form-control form-control-sm field-value"
                  inputStyle={{ width: '100%', border: 'none', background: 'transparent', padding: 0, fontSize: '0.8rem', height: 'auto' }}
                />
              </div>
            </div>
          </div>
        </div>
      );
    }

    if (fieldPath === 'Invoice Attached' || fieldPath === 'Invoice Present') {
      const isAttached = ['yes', 'true', 'attached', 'included', '1', 'present'].includes(String(certVal || '').trim().toLowerCase());
      return (
        <div style={{ borderBottom: '1px solid #dee2e6', paddingBottom: '3px', marginBottom: '6px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span
              onClick={() => setEditingField && setEditingField([fieldPath])}
              style={{ fontWeight: 'bold', color: '#495057', fontSize: '0.7rem', minWidth: '100px', whiteSpace: 'nowrap', cursor: 'pointer', userSelect: 'none' }}
            >
              {label}
            </span>
            <div style={{ flexGrow: 1, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span
                style={{
                  display: 'inline-block',
                  padding: '2px 8px',
                  borderRadius: '12px',
                  fontSize: '0.72rem',
                  fontWeight: 'bold',
                  backgroundColor: isAttached ? '#e8f5e9' : '#ffebee',
                  color: isAttached ? '#1b5e20' : '#c62828',
                  border: `1px solid ${isAttached ? '#a5d6a7' : '#ef9a9a'}`
                }}
              >
                {isAttached ? '● Attached' : '○ Not Attached'}
              </span>
              <div style={{ flexGrow: 1 }}>
                <EditableField
                  fieldPath={[fieldPath]}
                  value={certVal || (isAttached ? 'Yes' : 'No')}
                  onDataChange={onDataChange}
                  editingField={editingField}
                  setEditingField={setEditingField}
                  isMissing={false}
                  isEditable={true}
                  allData={allData}
                  manualValidations={manualValidations}
                  handleManualValidation={handleManualValidation}
                  revisionHandlers={revisionHandlers}
                  inputClassName="form-control form-control-sm field-value"
                  inputStyle={{ width: '100%', border: 'none', background: 'transparent', padding: 0, fontSize: '0.8rem', height: 'auto' }}
                />
              </div>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div style={{ borderBottom: '1px solid #dee2e6', paddingBottom: '3px', marginBottom: '6px' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
          <span
            onClick={() => setEditingField && setEditingField([fieldPath])}
            style={{ fontWeight: 'bold', color: '#495057', fontSize: '0.7rem', minWidth: '100px', whiteSpace: 'nowrap', cursor: 'pointer', userSelect: 'none' }}
          >
            {label}
          </span>
          <div style={{ flexGrow: 1 }}>
            <EditableField
              fieldPath={[fieldPath]}
              value={certVal}
              onDataChange={onDataChange}
              editingField={editingField}
              setEditingField={setEditingField}
              isMissing={false}
              isEditable={true}
              allData={allData}
              manualValidations={manualValidations}
              handleManualValidation={handleManualValidation}
              revisionHandlers={revisionHandlers}
              inputClassName="form-control form-control-sm field-value"
              inputStyle={{ width: '100%', border: 'none', background: 'transparent', padding: 0, fontSize: '0.8rem', height: 'auto' }}
            />
          </div>
        </div>
      </div>
    );
  };

  const renderCostField = (label, fieldPath) => {
    const costData = data?.COST_APPROACH || data || {};
    let val = costData?.[fieldPath] ?? costData?.[label] ?? data?.COST_APPROACH?.[fieldPath] ?? data?.COST_APPROACH?.[label] ?? data?.[fieldPath] ?? data?.[label] ?? '';
    const isOpinionOfSite = label === 'OPINION OF SITE VALUE' || fieldPath.includes('OPINION OF SITE VALUE');
    const isEconomicLife = label === 'Remaining Economic Life' || fieldPath.includes('Remaining Economic Life');

    if ((val === undefined || val === null || String(val).trim() === '') && isOpinionOfSite) {
      val = costData?.['Opinion of Site Value']
        ?? costData?.['Opinion of Site Value $']
        ?? costData?.['OPINION OF SITE VALUE $']
        ?? allData?.COST_APPROACH?.['OPINION OF SITE VALUE = $ ................................................']
        ?? allData?.COST_APPROACH?.['OPINION OF SITE VALUE']
        ?? allData?.COST_APPROACH?.['Opinion of Site Value']
        ?? allData?.COST_APPROACH?.['Opinion of Site Value $']
        ?? allData?.['OPINION OF SITE VALUE = $ ................................................']
        ?? allData?.['OPINION OF SITE VALUE']
        ?? allData?.['Opinion of Site Value']
        ?? '';
    }
    if ((val === undefined || val === null || String(val).trim() === '') && isEconomicLife) {
      val = costData?.['Remaining Economic Life']
        ?? costData?.['Estimated Remaining Economic Life (HUD and VA only)']
        ?? costData?.['Estimated Remaining Economic Life']
        ?? allData?.COST_APPROACH?.['Estimated Remaining Economic Life (HUD and VA only)']
        ?? allData?.COST_APPROACH?.['Remaining Economic Life']
        ?? allData?.COST_APPROACH?.['Estimated Remaining Economic Life']
        ?? allData?.['Estimated Remaining Economic Life (HUD and VA only)']
        ?? allData?.['Remaining Economic Life']
        ?? allData?.['Estimated Remaining Economic Life']
        ?? '';
    }
    const valStr = renderValue(val);
    const targetPath = ['COST_APPROACH', fieldPath];

    return (
      <div style={{ borderBottom: '1px solid #dee2e6', paddingBottom: '3px', marginBottom: '6px' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
          <span
            onClick={() => setEditingField && setEditingField(targetPath)}
            style={{ fontWeight: 'bold', color: '#495057', fontSize: '0.7rem', minWidth: '120px', whiteSpace: 'nowrap', cursor: 'pointer', userSelect: 'none' }}
          >
            {label}
            {(isOpinionOfSite || isEconomicLife) && <span style={{ color: '#d32f2f', marginLeft: '3px', fontWeight: 'bold' }}>*</span>}
          </span>
          <div style={{ flexGrow: 1 }}>
            <EditableField
              fieldPath={targetPath}
              value={valStr}
              onDataChange={onDataChange}
              editingField={editingField}
              setEditingField={setEditingField}
              isMissing={false}
              isEditable={true}
              allData={allData}
              manualValidations={manualValidations}
              handleManualValidation={handleManualValidation}
              revisionHandlers={revisionHandlers}
              inputClassName="form-control form-control-sm field-value"
              inputStyle={{ width: '100%', border: 'none', background: 'transparent', padding: 0, fontSize: '0.8rem', height: 'auto' }}
            />
          </div>
        </div>
      </div>
    );
  };

  const getImpValue = (keys) => {
    const keyList = Array.isArray(keys) ? keys : [keys];
    for (const key of keyList) {
      const val = data?.IMPROVEMENTS?.[key]
        ?? data?.Improvements?.[key]
        ?? data?.[key]
        ?? allData?.IMPROVEMENTS?.[key]
        ?? allData?.Improvements?.[key]
        ?? allData?.[key];
      if (val !== undefined && val !== null && String(val).trim() !== '') {
        return { value: val, actualKey: key };
      }
    }
    return { value: '', actualKey: keyList[0] };
  };

  const getFieldPath = (actualKey) => {
    if (data?.IMPROVEMENTS && actualKey in data.IMPROVEMENTS) {
      return ['IMPROVEMENTS', actualKey];
    }
    if (data?.Improvements && actualKey in data.Improvements) {
      return ['Improvements', actualKey];
    }
    if (allData?.IMPROVEMENTS && actualKey in allData.IMPROVEMENTS) {
      return ['IMPROVEMENTS', actualKey];
    }
    if (allData?.Improvements && actualKey in allData.Improvements) {
      return ['Improvements', actualKey];
    }
    if (data && actualKey in data) {
      return [actualKey];
    }
    if (allData && actualKey in allData) {
      return [actualKey];
    }
    if (data?.Improvements || allData?.Improvements) {
      return ['Improvements', actualKey];
    }
    return ['IMPROVEMENTS', actualKey];
  };

  const checkOptionMatches = (valStr, opt) => {
    if (!valStr || !opt) return false;
    const v = String(valStr).trim().toLowerCase();
    const optLower = opt.trim().toLowerCase();
    const o = optLower.replace(/\./g, '');

    // Handle Units special case: "One" should NOT match "One with Accessory Unit"
    if (opt === 'One') {
      return v === 'one' || (/\bone\b/i.test(v) && !v.includes('accessory'));
    }
    if (opt === 'One with Accessory Unit') {
      return v.includes('accessory');
    }

    // Exact string match
    if (v === optLower || v === o) return true;

    // Split by commas, slashes, or semicolons
    const tokens = v.split(/[,;/]+/).map(t => t.trim()).filter(Boolean);
    for (const token of tokens) {
      const t = token.toLowerCase();
      const tClean = t.replace(/\./g, '').trim();

      if (t === optLower || tClean === o) return true;
      if (o === 'det' && (tClean === 'detached' || tClean === 'det')) return true;
      if (o === 'att' && (tClean === 'attached' || tClean === 'att')) return true;
      if ((o.includes('s-det') || o.includes('end unit')) && (tClean.includes('semi') || tClean.includes('s-det') || tClean.includes('end unit'))) return true;
      if (o === 'existing' && tClean === 'existing') return true;
      if (o === 'proposed' && tClean === 'proposed') return true;
      if (o.includes('under') && tClean.includes('under')) return true;
      if (o === 'concrete slab' && (tClean.includes('slab') || tClean === 'concrete slab')) return true;
      if (o === 'crawl space' && (tClean.includes('crawl') || tClean === 'crawl space')) return true;
      if (o === 'full basement' && (tClean.includes('full') || tClean === 'full basement')) return true;
      if (o === 'partial basement' && (tClean.includes('partial') || tClean === 'partial basement')) return true;
      if (o.includes('outside') && (tClean.includes('outside') || tClean.includes('entry'))) return true;
      if (o.includes('sump') && (tClean.includes('sump') || tClean.includes('pump'))) return true;
      if (o === 'none' && tClean === 'none') return true;
      if (o.includes('refrigerator') && tClean.includes('refrigerator')) return true;
      if (o.includes('range') && (tClean.includes('range') || tClean.includes('oven'))) return true;
      if (o.includes('dishwasher') && tClean.includes('dishwasher')) return true;
      if (o.includes('disposal') && tClean.includes('disposal')) return true;
      if (o.includes('microwave') && tClean.includes('microwave')) return true;
      if (o.includes('washer') && (tClean.includes('washer') || tClean.includes('dryer'))) return true;
      if (o.includes('fwa') && tClean === 'fwa') return true;
      if (o.includes('hwbb') && tClean === 'hwbb') return true;
      if (o.includes('radiant') && tClean === 'radiant') return true;
      if (o.includes('central') && (tClean.includes('central') || tClean.includes('central air'))) return true;
      if (o.includes('woodstove') && tClean.includes('woodstove')) return true;
      if (o.includes('fireplace') && tClean.includes('fireplace')) return true;
      if (o.includes('fence') && tClean.includes('fence')) return true;
      if (o.includes('patio') && (tClean.includes('patio') || tClean.includes('deck'))) return true;
      if (o.includes('porch') && tClean.includes('porch')) return true;
      if (o.includes('pool') && tClean.includes('pool')) return true;
      if (o === 'driveway' && (tClean.includes('driveway') || tClean === 'driveway')) return true;
      if (o === 'garage' && (tClean.includes('garage') || tClean === 'garage')) return true;
      if (o === 'carport' && (tClean.includes('carport') || tClean === 'carport')) return true;
      if (o.includes('other') && tClean.includes('other')) return true;
    }
    return false;
  };

  const renderImpField = (label, keys, options = []) => {
    const { value: rawVal, actualKey } = getImpValue(keys);
    const valStr = renderValue(rawVal);
    const targetPath = getFieldPath(actualKey);

    return (
      <div style={{ borderBottom: '1px solid #e9ecef', paddingBottom: '3px', marginBottom: '4px' }}>
        <div
          onClick={() => setEditingField && setEditingField(targetPath)}
          style={{ fontWeight: 'bold', color: '#495057', fontSize: '0.7rem', marginBottom: '2px', cursor: 'pointer', userSelect: 'none' }}
        >
          {label}
        </div>
        {options.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 8px', marginBottom: '3px' }}>
            {options.map(opt => {
              const isChecked = checkOptionMatches(valStr, opt);
              const handleToggle = () => {
                let items = valStr ? valStr.split(',').map(s => s.trim()).filter(Boolean) : [];
                if (isChecked) {
                  items = items.filter(item => !checkOptionMatches(item, opt));
                } else {
                  items.push(opt);
                }
                const newVal = items.join(', ');
                onDataChange(targetPath, newVal);
              };
              return (
                <label key={opt} style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', cursor: 'pointer', fontSize: '0.7rem', userSelect: 'none', margin: 0 }}>
                  <input type="checkbox" checked={isChecked} onChange={handleToggle} style={{ margin: 0, width: '12px', height: '12px' }} />
                  <span>{opt}</span>
                </label>
              );
            })}
          </div>
        )}
        <EditableField
          fieldPath={targetPath}
          value={valStr}
          onDataChange={onDataChange}
          editingField={editingField}
          setEditingField={setEditingField}
          isEditable={true}
          allData={allData}
          manualValidations={manualValidations}
          handleManualValidation={handleManualValidation}
          revisionHandlers={revisionHandlers}
          inputClassName="form-control form-control-sm field-value"
          inputStyle={{ width: '100%', border: 'none', background: 'transparent', padding: 0, fontSize: '0.75rem', height: 'auto' }}
        />
      </div>
    );
  };

  const renderImpNarrativeField = (keys) => {
    const { value: rawVal, actualKey } = getImpValue(keys);
    const valStr = renderValue(rawVal);
    const targetPath = getFieldPath(actualKey);
    return (
      <EditableField
        fieldPath={targetPath}
        value={valStr}
        onDataChange={onDataChange}
        editingField={editingField}
        setEditingField={setEditingField}
        usePre={true}
        isEditable={true}
        allData={allData}
        manualValidations={manualValidations}
        handleManualValidation={handleManualValidation}
        revisionHandlers={revisionHandlers}
        inputClassName="form-control form-control-sm field-value-pre"
        inputStyle={{ width: '100%', border: '1px solid #ced4da', background: '#fff', padding: '4px', fontSize: '0.8rem', height: 'auto', minHeight: '40px', resize: 'vertical' }}
      />
    );
  };

  if (id === 'improvements-section') {
    return (
      <Paper id={id} elevation={1} sx={{ mb: 2, borderRadius: 2, overflow: 'hidden', borderTop: '3px solid', borderTopColor: borderColor }}>
        <Box
          sx={{
            p: 1.5,
            bgcolor: 'grey.50',
            color: 'text.primary',
            borderBottom: '1px solid',
            borderColor: 'grey.200',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}>
          <Typography variant="h6" component="h5" sx={{ fontSize: '1.05rem', fontWeight: 'bold' }}>{title || "Improvements Section"}</Typography>
          {onRevisionButtonClick && (
            <Tooltip title="Revision Language">
              <IconButton onClick={onRevisionButtonClick} size="small" sx={{ color: 'text.secondary', ml: 'auto' }}><LibraryBooksIcon /></IconButton>
            </Tooltip>
          )}
        </Box>
        {loading && loadingSection === id && (
          <Box sx={{ width: '100%' }}><LinearProgress /></Box>
        )}
        <div className="card-body p-2" style={{ fontSize: '0.78rem', backgroundColor: '#fff', overflowX: 'auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(220px, 1fr))', gap: '8px', border: '1px solid #ced4da', borderRadius: '4px', padding: '4px' }}>

            {/* COLUMN 1: GENERAL DESCRIPTION */}
            <div style={{ border: '1px solid #dee2e6', borderRadius: '4px', overflow: 'hidden' }}>
              <div style={{ backgroundColor: '#e9ecef', padding: '4px 8px', fontWeight: 'bold', fontSize: '0.75rem', textAlign: 'center', borderBottom: '1px solid #dee2e6' }}>
                GENERAL DESCRIPTION
              </div>
              <div style={{ padding: '4px' }}>
                {renderImpField("Units", ["Units", "One with Accessory Unit"], ["One", "One with Accessory Unit"])}
                {renderImpField("# of Stories", ["# of Stories"])}
                {renderImpField("Type", ["Type", "Property Type"], ["Det.", "Att.", "S-Det./End Unit"])}
                {renderImpField("Status", ["Existing/Proposed/Under Const.", "Construction Status"], ["Existing", "Proposed", "Under Const."])}
                {renderImpField("Design (Style)", ["Design (Style)", "Design Style"])}
                {renderImpField("Year Built", ["Year Built"])}
                {renderImpField("Effective Age (Yrs)", ["Effective Age (Yrs)", "Effective Age"])}
                {renderImpField("Attic", ["Attic"], ["None", "Drop Stair", "Stairs", "Floor", "Scuttle", "Finished", "Heated"])}
                {renderImpField("Appliances", ["Appliances"], ["Refrigerator", "Range/Oven", "Dishwasher", "Disposal", "Microwave", "Washer/Dryer", "Other (describe)"])}
              </div>
            </div>

            {/* COLUMN 2: FOUNDATION */}
            <div style={{ border: '1px solid #dee2e6', borderRadius: '4px', overflow: 'hidden' }}>
              <div style={{ backgroundColor: '#e9ecef', padding: '4px 8px', fontWeight: 'bold', fontSize: '0.75rem', textAlign: 'center', borderBottom: '1px solid #dee2e6' }}>
                FOUNDATION
              </div>
              <div style={{ padding: '4px' }}>
                {renderImpField("Foundation", ["Foundation Type", "Foundation"], ["Concrete Slab", "Crawl Space", "Full Basement", "Partial Basement"])}
                {renderImpField("Basement Area", ["Basement Area sq.ft.", "Basement Area"])}
                {renderImpField("Basement Finish", ["Basement Finish %", "Basement Finish"])}
                {renderImpField("Details", ["Basement Details"], ["Outside Entry/Exit", "Sump Pump"])}
                {renderImpField("Evidence of", ["Evidence of (Foundation)", "Evidence of"], ["Infestation", "Dampness", "Settlement", "None"])}
                {renderImpField("Heating", ["Heating Type"], ["FWA", "HWBB", "Radiant", "Other"])}
                {renderImpField("Fuel", ["Fuel", "Heating Fuel"])}
                {renderImpField("Cooling", ["Cooling Type"], ["Central Air Conditioning", "Individual", "Other"])}
              </div>
            </div>

            {/* COLUMN 3: EXTERIOR DESCRIPTION */}
            <div style={{ border: '1px solid #dee2e6', borderRadius: '4px', overflow: 'hidden' }}>
              <div style={{ backgroundColor: '#e9ecef', padding: '4px 8px', fontWeight: 'bold', fontSize: '0.75rem', textAlign: 'center', borderBottom: '1px solid #dee2e6' }}>
                EXTERIOR DESCRIPTION <span style={{ fontWeight: 'normal', fontSize: '0.65rem' }}>materials/condition</span>
              </div>
              <div style={{ padding: '4px' }}>
                {renderImpField("Foundation Walls", ["Foundation Walls (Material/Condition)", "Foundation Walls"])}
                {renderImpField("Exterior Walls", ["Exterior Walls (Material/Condition)", "Exterior Walls"])}
                {renderImpField("Roof Surface", ["Roof Surface (Material/Condition)", "Roof Surface"])}
                {renderImpField("Gutters & Downspouts", ["Gutters & Downspouts (Material/Condition)", "Gutters & Downspouts"])}
                {renderImpField("Window Type", ["Window Type (Material/Condition)", "Window Type"])}
                {renderImpField("Storm Sash/Insulated", ["Storm Sash/Insulated"])}
                {renderImpField("Screens", ["Screens"])}
                {renderImpField("Amenities", ["Amenities", "Patio/Deck", "Fence", "Porch", "Pool"], ["WoodStove", "Fireplace", "Fence", "Patio/Deck", "Porch", "Pool"])}
              </div>
            </div>

            {/* COLUMN 4: INTERIOR */}
            <div style={{ border: '1px solid #dee2e6', borderRadius: '4px', overflow: 'hidden' }}>
              <div style={{ backgroundColor: '#e9ecef', padding: '4px 8px', fontWeight: 'bold', fontSize: '0.75rem', textAlign: 'center', borderBottom: '1px solid #dee2e6' }}>
                INTERIOR <span style={{ fontWeight: 'normal', fontSize: '0.65rem' }}>materials/condition</span>
              </div>
              <div style={{ padding: '4px' }}>
                {renderImpField("Floors", ["Floors (Material/Condition)", "Floors"])}
                {renderImpField("Walls", ["Walls (Material/Condition)", "Walls"])}
                {renderImpField("Trim/Finish", ["Trim/Finish (Material/Condition)", "Trim/Finish"])}
                {renderImpField("Bath Floor", ["Bath Floor (Material/Condition)", "Bath Floor"])}
                {renderImpField("Bath Wainscot", ["Bath Wainscot (Material/Condition)", "Bath Wainscot"])}

                {/* CAR STORAGE STRUCTURED SECTION */}
                <div style={{ marginTop: '8px', border: '1px solid #dee2e6', borderRadius: '4px', overflow: 'hidden', backgroundColor: '#fcfcfc' }}>
                  {/* Row 1: Header + None */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f1f3f5', padding: '3px 6px', borderBottom: '1px solid #dee2e6' }}>
                    <span style={{ fontWeight: 'bold', color: '#495057', fontSize: '0.72rem' }}>Car Storage</span>
                    {(() => {
                      const { value: csVal, actualKey: csKey } = getImpValue(["Car Storage", "CAR STORAGE", "Car Storage None", "Vehicle Storage"]);
                      const { value: csNoneFlag } = getImpValue(["Car Storage None", "Car Storage - None"]);
                      const { value: driveCars } = getImpValue(["Driveway # of Cars", "Driveway Cars"]);
                      const { value: garageCars } = getImpValue(["Garage # of Cars", "Garage Cars"]);
                      const { value: carportCars } = getImpValue(["Carport # of Cars", "Carport Cars"]);

                      const hasAnyParking = (
                        checkOptionMatches(csVal, "Driveway") ||
                        checkOptionMatches(csVal, "Garage") ||
                        checkOptionMatches(csVal, "Carport") ||
                        (parseInt(driveCars, 10) > 0) ||
                        (parseInt(garageCars, 10) > 0) ||
                        (parseInt(carportCars, 10) > 0)
                      );

                      const isNoneChecked = !hasAnyParking && (
                        checkOptionMatches(csVal, "None") ||
                        checkOptionMatches(csNoneFlag, "Yes") ||
                        checkOptionMatches(csNoneFlag, "None") ||
                        checkOptionMatches(csNoneFlag, "true")
                      );

                      const toggleNone = () => {
                        const targetKey = csKey || "Car Storage";
                        if (isNoneChecked) {
                          onDataChange(getFieldPath(targetKey), "");
                        } else {
                          onDataChange(getFieldPath(targetKey), "None");
                        }
                      };
                      return (
                        <label style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', cursor: 'pointer', fontSize: '0.7rem', margin: 0, fontWeight: '500' }}>
                          <input type="checkbox" checked={Boolean(isNoneChecked)} onChange={toggleNone} style={{ margin: 0, width: '13px', height: '13px', cursor: 'pointer' }} />
                          <span>None</span>
                        </label>
                      );
                    })()}
                  </div>

                  <div style={{ padding: '4px 6px' }}>
                    {/* Row 2: [ ] Driveway   # of Cars [ 1 ] */}
                    {(() => {
                      const { value: csVal } = getImpValue(["Car Storage"]);
                      const isDriveChecked = checkOptionMatches(csVal, "Driveway");
                      const toggleDrive = () => {
                        let items = csVal ? String(csVal).split(',').map(s => s.trim()).filter(Boolean) : [];
                        if (isDriveChecked) {
                          items = items.filter(i => !checkOptionMatches(i, "Driveway"));
                        } else {
                          items = items.filter(i => !checkOptionMatches(i, "None"));
                          items.push("Driveway");
                        }
                        onDataChange(getFieldPath("Car Storage"), items.join(', '));
                      };
                      const { value: driveCarsVal, actualKey: driveCarsKey } = getImpValue(["Driveway # of Cars", "Driveway Cars", "# of Cars"]);
                      return (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '2px 0', borderBottom: '1px dashed #e9ecef' }}>
                          <label style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', cursor: 'pointer', fontSize: '0.7rem', margin: 0, minWidth: '75px' }}>
                            <input type="checkbox" checked={isDriveChecked} onChange={toggleDrive} style={{ margin: 0, width: '13px', height: '13px', cursor: 'pointer' }} />
                            <span>Driveway</span>
                          </label>
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <span style={{ fontSize: '0.68rem', color: '#6c757d', whiteSpace: 'nowrap' }}># of Cars</span>
                            <div style={{ width: '65px', borderBottom: '1px solid #495057' }}>
                              <EditableField
                                fieldPath={getFieldPath(driveCarsKey || "Driveway # of Cars")}
                                value={renderValue(driveCarsVal)}
                                onDataChange={onDataChange}
                                editingField={editingField}
                                setEditingField={setEditingField}
                                isEditable={true}
                                allData={allData}
                                manualValidations={manualValidations}
                                handleManualValidation={handleManualValidation}
                                revisionHandlers={revisionHandlers}
                                inputClassName="form-control form-control-sm text-center"
                                inputStyle={{ width: '100%', border: 'none', background: 'transparent', padding: '0 2px', fontSize: '0.75rem', height: 'auto', textAlign: 'center', fontWeight: 'bold' }}
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })()}

                    {/* Row 3: Driveway Surface [ Asphalt ] */}
                    {(() => {
                      const { value: surfVal, actualKey: surfKey } = getImpValue(["Driveway Surface"]);
                      return (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '2px 0', borderBottom: '1px dashed #e9ecef' }}>
                          <span style={{ fontSize: '0.7rem', color: '#495057' }}>Driveway Surface</span>
                          <div style={{ width: '95px', borderBottom: '1px solid #495057' }}>
                            <EditableField
                              fieldPath={getFieldPath(surfKey || "Driveway Surface")}
                              value={renderValue(surfVal)}
                              onDataChange={onDataChange}
                              editingField={editingField}
                              setEditingField={setEditingField}
                              isEditable={true}
                              allData={allData}
                              manualValidations={manualValidations}
                              handleManualValidation={handleManualValidation}
                              revisionHandlers={revisionHandlers}
                              inputClassName="form-control form-control-sm text-center"
                              inputStyle={{ width: '100%', border: 'none', background: 'transparent', padding: '0 2px', fontSize: '0.75rem', height: 'auto', textAlign: 'center', fontWeight: 'bold' }}
                            />
                          </div>
                        </div>
                      );
                    })()}

                    {/* Row 4: [ ] Garage   # of Cars [ 1 ] */}
                    {(() => {
                      const { value: csVal } = getImpValue(["Car Storage"]);
                      const isGarageChecked = checkOptionMatches(csVal, "Garage");
                      const toggleGarage = () => {
                        let items = csVal ? String(csVal).split(',').map(s => s.trim()).filter(Boolean) : [];
                        if (isGarageChecked) {
                          items = items.filter(i => !checkOptionMatches(i, "Garage"));
                        } else {
                          items = items.filter(i => !checkOptionMatches(i, "None"));
                          items.push("Garage");
                        }
                        onDataChange(getFieldPath("Car Storage"), items.join(', '));
                      };
                      const { value: garageCarsVal, actualKey: garageCarsKey } = getImpValue(["Garage # of Cars", "Garage Cars"]);
                      return (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '2px 0', borderBottom: '1px dashed #e9ecef' }}>
                          <label style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', cursor: 'pointer', fontSize: '0.7rem', margin: 0, minWidth: '75px' }}>
                            <input type="checkbox" checked={isGarageChecked} onChange={toggleGarage} style={{ margin: 0, width: '13px', height: '13px', cursor: 'pointer' }} />
                            <span>Garage</span>
                          </label>
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <span style={{ fontSize: '0.68rem', color: '#6c757d', whiteSpace: 'nowrap' }}># of Cars</span>
                            <div style={{ width: '65px', borderBottom: '1px solid #495057' }}>
                              <EditableField
                                fieldPath={getFieldPath(garageCarsKey || "Garage # of Cars")}
                                value={renderValue(garageCarsVal)}
                                onDataChange={onDataChange}
                                editingField={editingField}
                                setEditingField={setEditingField}
                                isEditable={true}
                                allData={allData}
                                manualValidations={manualValidations}
                                handleManualValidation={handleManualValidation}
                                revisionHandlers={revisionHandlers}
                                inputClassName="form-control form-control-sm text-center"
                                inputStyle={{ width: '100%', border: 'none', background: 'transparent', padding: '0 2px', fontSize: '0.75rem', height: 'auto', textAlign: 'center', fontWeight: 'bold' }}
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })()}

                    {/* Row 5: [ ] Carport   # of Cars [ 0 ] */}
                    {(() => {
                      const { value: csVal } = getImpValue(["Car Storage"]);
                      const isCarportChecked = checkOptionMatches(csVal, "Carport");
                      const toggleCarport = () => {
                        let items = csVal ? String(csVal).split(',').map(s => s.trim()).filter(Boolean) : [];
                        if (isCarportChecked) {
                          items = items.filter(i => !checkOptionMatches(i, "Carport"));
                        } else {
                          items = items.filter(i => !checkOptionMatches(i, "None"));
                          items.push("Carport");
                        }
                        onDataChange(getFieldPath("Car Storage"), items.join(', '));
                      };
                      const { value: carportCarsVal, actualKey: carportCarsKey } = getImpValue(["Carport # of Cars", "Carport Cars"]);
                      return (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '2px 0', borderBottom: '1px dashed #e9ecef' }}>
                          <label style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', cursor: 'pointer', fontSize: '0.7rem', margin: 0, minWidth: '75px' }}>
                            <input type="checkbox" checked={isCarportChecked} onChange={toggleCarport} style={{ margin: 0, width: '13px', height: '13px', cursor: 'pointer' }} />
                            <span>Carport</span>
                          </label>
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <span style={{ fontSize: '0.68rem', color: '#6c757d', whiteSpace: 'nowrap' }}># of Cars</span>
                            <div style={{ width: '65px', borderBottom: '1px solid #495057' }}>
                              <EditableField
                                fieldPath={getFieldPath(carportCarsKey || "Carport # of Cars")}
                                value={renderValue(carportCarsVal)}
                                onDataChange={onDataChange}
                                editingField={editingField}
                                setEditingField={setEditingField}
                                isEditable={true}
                                allData={allData}
                                manualValidations={manualValidations}
                                handleManualValidation={handleManualValidation}
                                revisionHandlers={revisionHandlers}
                                inputClassName="form-control form-control-sm text-center"
                                inputStyle={{ width: '100%', border: 'none', background: 'transparent', padding: '0 2px', fontSize: '0.75rem', height: 'auto', textAlign: 'center', fontWeight: 'bold' }}
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })()}

                    {/* Row 6: [ ] Att.   [ ] Det.   [ ] Built-in */}
                    {(() => {
                      const { value: attVal, actualKey: attKey } = getImpValue([
                        "Att./Det./Built-in",
                        "Garage Att./Det./Built-in",
                        "Car Storage Att/Det",
                        "Garage Type",
                        "Attachment Type",
                        "Vehicle Storage Detail",
                        "ATT./DET./BUILT-IN"
                      ]);
                      const { value: csVal } = getImpValue(["Car Storage", "CAR STORAGE", "Vehicle Storage"]);
                      const { value: garVal } = getImpValue(["Garage", "Garage # of Cars", "Garage Cars"]);
                      const { value: garAttFlag } = getImpValue(["Garage Att.", "Garage Att"]);
                      const { value: garDetFlag } = getImpValue(["Garage Detached", "Garage Det"]);
                      const { value: garBuiltFlag } = getImpValue(["Garage Built-in", "Garage Built-In", "Garage Builtin"]);
                      const { value: subjAttType } = getImpValue(["Subject Attachment Type", "Dwelling Attachment Type"]);

                      const subjAtt = subjAttType || allData?.Subject?.["Attachment Type"] || allData?.Subject?.AttachmentType || data?.Subject?.["Attachment Type"] || '';

                      const combinedStr = `${attVal} ${csVal} ${garVal} ${subjAtt}`.toLowerCase();

                      const isAtt = (
                        checkOptionMatches(attVal, "Att") ||
                        checkOptionMatches(attVal, "Attached") ||
                        checkOptionMatches(csVal, "Att") ||
                        checkOptionMatches(csVal, "Attached") ||
                        checkOptionMatches(garAttFlag, "Yes") ||
                        checkOptionMatches(garAttFlag, "true") ||
                        /\b(?:att|attached|\d+ga)\b/i.test(combinedStr)
                      );

                      const isDet = (
                        checkOptionMatches(attVal, "Det") ||
                        checkOptionMatches(attVal, "Detached") ||
                        checkOptionMatches(csVal, "Det") ||
                        checkOptionMatches(csVal, "Detached") ||
                        checkOptionMatches(garDetFlag, "Yes") ||
                        checkOptionMatches(garDetFlag, "true") ||
                        /\b(?:det|detached|\d+gd)\b/i.test(combinedStr)
                      );

                      const isBuiltin = (
                        checkOptionMatches(attVal, "Built-in") ||
                        checkOptionMatches(attVal, "Built") ||
                        checkOptionMatches(attVal, "BuiltIn") ||
                        checkOptionMatches(csVal, "Built-in") ||
                        checkOptionMatches(csVal, "Built") ||
                        checkOptionMatches(garBuiltFlag, "Yes") ||
                        checkOptionMatches(garBuiltFlag, "true") ||
                        /\b(?:built[\s-]?in|\d+gbi)\b/i.test(combinedStr)
                      );

                      const setType = (typeVal) => {
                        const targetKey = attKey || "Att./Det./Built-in";
                        onDataChange(getFieldPath(targetKey), typeVal);
                      };

                      return (
                        <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center', marginTop: '4px', paddingTop: '4px' }}>
                          <label style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', cursor: 'pointer', fontSize: '0.7rem', margin: 0 }}>
                            <input type="checkbox" checked={Boolean(isAtt)} onChange={() => setType(isAtt ? '' : 'Attached')} style={{ margin: 0, width: '13px', height: '13px', cursor: 'pointer' }} />
                            <span>Att.</span>
                          </label>
                          <label style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', cursor: 'pointer', fontSize: '0.7rem', margin: 0 }}>
                            <input type="checkbox" checked={Boolean(isDet)} onChange={() => setType(isDet ? '' : 'Detached')} style={{ margin: 0, width: '13px', height: '13px', cursor: 'pointer' }} />
                            <span>Det.</span>
                          </label>
                          <label style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', cursor: 'pointer', fontSize: '0.7rem', margin: 0 }}>
                            <input type="checkbox" checked={Boolean(isBuiltin)} onChange={() => setType(isBuiltin ? '' : 'Built-in')} style={{ margin: 0, width: '13px', height: '13px', cursor: 'pointer' }} />
                            <span>Built-in</span>
                          </label>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* FINISHED AREA ABOVE GRADE & ADDITIONAL FEATURES */}
          <div style={{ marginTop: '10px', border: '1px solid #ced4da', borderRadius: '4px', padding: '10px 12px', backgroundColor: '#fcfcfc' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '20px', fontSize: '0.78rem', borderBottom: '1px solid #e9ecef', paddingBottom: '10px', marginBottom: '10px' }}>
              <span style={{ fontWeight: 'bold', color: '#343a40', whiteSpace: 'nowrap', marginRight: '4px' }}>
                Finished area above grade contains:
              </span>

              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ minWidth: '85px', width: '85px', borderBottom: '1.5px solid #495057' }}>
                  {(() => {
                    const { value: rawVal, actualKey } = getImpValue(["Finished area above grade Rooms", "Rooms"]);
                    const targetPath = getFieldPath(actualKey);
                    return (
                      <EditableField
                        fieldPath={targetPath}
                        value={renderValue(rawVal)}
                        onDataChange={onDataChange}
                        editingField={editingField}
                        setEditingField={setEditingField}
                        isEditable={true}
                        allData={allData}
                        manualValidations={manualValidations}
                        handleManualValidation={handleManualValidation}
                        revisionHandlers={revisionHandlers}
                        inputClassName="form-control form-control-sm text-center"
                        inputStyle={{ width: '100%', border: 'none', background: 'transparent', padding: '0 4px', fontSize: '0.82rem', height: 'auto', textAlign: 'center', fontWeight: 'bold' }}
                      />
                    );
                  })()}
                </div>
                <span style={{ color: '#495057', fontWeight: '500' }}>Rooms</span>
              </div>

              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ minWidth: '85px', width: '85px', borderBottom: '1.5px solid #495057' }}>
                  {(() => {
                    const { value: rawVal, actualKey } = getImpValue(["Finished area above grade Bedrooms", "Bedrooms"]);
                    const targetPath = getFieldPath(actualKey);
                    return (
                      <EditableField
                        fieldPath={targetPath}
                        value={renderValue(rawVal)}
                        onDataChange={onDataChange}
                        editingField={editingField}
                        setEditingField={setEditingField}
                        isEditable={true}
                        allData={allData}
                        manualValidations={manualValidations}
                        handleManualValidation={handleManualValidation}
                        revisionHandlers={revisionHandlers}
                        inputClassName="form-control form-control-sm text-center"
                        inputStyle={{ width: '100%', border: 'none', background: 'transparent', padding: '0 4px', fontSize: '0.82rem', height: 'auto', textAlign: 'center', fontWeight: 'bold' }}
                      />
                    );
                  })()}
                </div>
                <span style={{ color: '#495057', fontWeight: '500' }}>Bedrooms</span>
              </div>

              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ minWidth: '85px', width: '85px', borderBottom: '1.5px solid #495057' }}>
                  {(() => {
                    const { value: rawVal, actualKey } = getImpValue(["Finished area above grade Bath(s)", "Bath(s)", "Finished area above grade Baths", "Baths"]);
                    const targetPath = getFieldPath(actualKey);
                    return (
                      <EditableField
                        fieldPath={targetPath}
                        value={renderValue(rawVal)}
                        onDataChange={onDataChange}
                        editingField={editingField}
                        setEditingField={setEditingField}
                        isEditable={true}
                        allData={allData}
                        manualValidations={manualValidations}
                        handleManualValidation={handleManualValidation}
                        revisionHandlers={revisionHandlers}
                        inputClassName="form-control form-control-sm text-center"
                        inputStyle={{ width: '100%', border: 'none', background: 'transparent', padding: '0 4px', fontSize: '0.82rem', height: 'auto', textAlign: 'center', fontWeight: 'bold' }}
                      />
                    );
                  })()}
                </div>
                <span style={{ color: '#495057', fontWeight: '500' }}>Bath(s)</span>
              </div>

              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ minWidth: '120px', width: '120px', borderBottom: '1.5px solid #495057' }}>
                  {(() => {
                    const { value: rawVal, actualKey } = getImpValue(["Square Feet of Gross Living Area Above Grade", "Gross Living Area", "Gross Living Area: square feet", "Square Feet of Gross Living Area"]);
                    const targetPath = getFieldPath(actualKey);
                    return (
                      <EditableField
                        fieldPath={targetPath}
                        value={renderValue(rawVal)}
                        onDataChange={onDataChange}
                        editingField={editingField}
                        setEditingField={setEditingField}
                        isEditable={true}
                        allData={allData}
                        manualValidations={manualValidations}
                        handleManualValidation={handleManualValidation}
                        revisionHandlers={revisionHandlers}
                        inputClassName="form-control form-control-sm text-center"
                        inputStyle={{ width: '100%', border: 'none', background: 'transparent', padding: '0 4px', fontSize: '0.82rem', height: 'auto', textAlign: 'center', fontWeight: 'bold' }}
                      />
                    );
                  })()}
                </div>
                <span style={{ color: '#495057', fontWeight: '500' }}>Square Feet of Gross Living Area Above Grade</span>
              </div>
            </div>

            {/* Additional features */}
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px', fontSize: '0.78rem' }}>
              <span style={{ fontWeight: 'bold', color: '#343a40', whiteSpace: 'nowrap' }}>
                Additional features (special energy efficient items, etc.):
              </span>
              <div style={{ flexGrow: 1 }}>
                {(() => {
                  const { value: rawVal, actualKey } = getImpValue(["Additional features", "Additional features (special energy efficient items, etc.)", "Additional features (special energy efficient items, etc.)."]);
                  const targetPath = getFieldPath(actualKey);
                  return (
                    <EditableField
                      fieldPath={targetPath}
                      value={renderValue(rawVal)}
                      onDataChange={onDataChange}
                      editingField={editingField}
                      setEditingField={setEditingField}
                      isEditable={true}
                      allData={allData}
                      manualValidations={manualValidations}
                      handleManualValidation={handleManualValidation}
                      revisionHandlers={revisionHandlers}
                      inputClassName="form-control form-control-sm field-value"
                      inputStyle={{ width: '100%', border: 'none', borderBottom: '1px solid #dee2e6', background: 'transparent', padding: '0 4px', fontSize: '0.78rem', height: 'auto' }}
                    />
                  );
                })()}
              </div>
            </div>
          </div>

          {/* SUMMARY COMMENTS AT BOTTOM */}
          <div style={{ marginTop: '12px', borderTop: '1px dashed #dee2e6', paddingTop: '8px' }}>
            <div style={{ marginBottom: '8px' }}>
              <div style={{ fontWeight: 'bold', color: '#495057', fontSize: '0.75rem', marginBottom: '2px' }}>
                Describe the condition of the property (including needed repairs, deterioration, renovations, remodeling, etc.):
              </div>
              {renderImpNarrativeField(["Describe the condition of the property", "Describe the condition of the property (including needed repairs, deterioration, renovations, remodeling, etc.)"])}
            </div>
            <div style={{ marginBottom: '8px' }}>
              <div style={{ fontWeight: 'bold', color: '#495057', fontSize: '0.75rem', marginBottom: '2px' }}>
                Are there any physical deficiencies or adverse conditions that affect the livability, soundness, or structural integrity of the property? If Yes, describe:
              </div>
              {renderImpNarrativeField(["Are there any physical deficiencies or adverse conditions that affect the livability, soundness, or structural integrity of the property? If Yes, describe", "Are there any physical deficiencies or adverse conditions that affect the livability, soundness, or structural integrity of the property?"])}
            </div>
            <div>
              <div style={{ fontWeight: 'bold', color: '#495057', fontSize: '0.75rem', marginBottom: '2px' }}>
                Does the property generally conform to the neighborhood (functional utility, style, condition, use, construction, etc.)? If No, describe:
              </div>
              {renderImpNarrativeField(["Does the property generally conform to the neighborhood (functional utility, style, condition, use, construction, etc.)?", "Does the property generally conform to the neighborhood (functional utility, style, condition, use, construction, etc.)? If No, describe"])}
            </div>
          </div>
        </div>
      </Paper>
    );
  }

  if (id === 'cost-approach-section') {
    const costData = data?.COST_APPROACH || data || {};
    return (
      <Paper id={id} elevation={1} sx={{ mb: 2, borderRadius: 2, overflow: 'hidden', borderTop: '3px solid', borderTopColor: borderColor }}>
        <Box
          sx={{
            p: 1.5,
            bgcolor: 'grey.50',
            color: 'text.primary',
            borderBottom: '1px solid',
            borderColor: 'grey.200',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}>
          <Typography variant="h6" component="h5" sx={{ fontSize: '1.05rem', fontWeight: 'bold' }}>{title || "Cost Approach"}</Typography>
          {onRevisionButtonClick && (
            <Tooltip title="Revision Language">
              <IconButton onClick={onRevisionButtonClick} size="small" sx={{ color: 'text.secondary', ml: 'auto' }}><LibraryBooksIcon /></IconButton>
            </Tooltip>
          )}
        </Box>
        {loading && loadingSection === id && (
          <Box sx={{ width: '100%' }}><LinearProgress /></Box>
        )}
        <div className="card-body p-3" style={{ fontSize: '0.8rem', backgroundColor: '#fff' }}>

          <div style={{ borderBottom: '1px solid #dee2e6', paddingBottom: '12px', marginBottom: '16px' }}>
            <div style={{ fontWeight: 'bold', color: '#495057', fontSize: '0.75rem', marginBottom: '4px' }}>
              Provide adequate information for the lender/client to replicate the below cost figures and calculations.
            </div>
            <div style={{ minHeight: '40px', marginBottom: '12px' }}>
              <EditableField
                fieldPath={["COST_APPROACH", "Provide adequate information for the lender/client to replicate the below cost figures and calculations."]}
                value={renderValue(costData["Provide adequate information for the lender/client to replicate the below cost figures and calculations."] || '')}
                onDataChange={onDataChange}
                editingField={editingField}
                setEditingField={setEditingField}
                usePre={true}
                isMissing={false}
                isEditable={true}
                allData={allData}
                manualValidations={manualValidations}
                handleManualValidation={handleManualValidation}
                revisionHandlers={revisionHandlers}
                inputClassName="form-control form-control-sm field-value-pre"
                inputStyle={{ width: '100%', border: 'none', background: 'transparent', padding: 0, fontSize: '0.8rem', height: 'auto', minHeight: '40px', resize: 'vertical' }}
              />
            </div>

            <div style={{ fontWeight: 'bold', color: '#495057', fontSize: '0.75rem', marginBottom: '4px' }}>
              Support for the opinion of site value (summary of comparable land sales or other methods for estimating site value)
            </div>
            <div style={{ minHeight: '40px' }}>
              <EditableField
                fieldPath={["COST_APPROACH", "Support for the opinion of site value (summary of comparable land sales or other methods for estimating site value)"]}
                value={renderValue(costData["Support for the opinion of site value (summary of comparable land sales or other methods for estimating site value)"] || '')}
                onDataChange={onDataChange}
                editingField={editingField}
                setEditingField={setEditingField}
                usePre={true}
                isMissing={false}
                isEditable={true}
                allData={allData}
                manualValidations={manualValidations}
                handleManualValidation={handleManualValidation}
                revisionHandlers={revisionHandlers}
                inputClassName="form-control form-control-sm field-value-pre"
                inputStyle={{ width: '100%', border: 'none', background: 'transparent', padding: 0, fontSize: '0.8rem', height: 'auto', minHeight: '40px', resize: 'vertical' }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '24px' }}>
            <div style={{ flex: 1, minWidth: 0, borderRight: '1px solid #dee2e6', paddingRight: '16px' }}>
              <div style={{ fontWeight: 'bold', fontSize: '0.85rem', marginBottom: '12px', borderBottom: '2px solid #343a40', paddingBottom: '4px' }}>
                SUPPORT & DETAILS
              </div>

              {renderCostField("ESTIMATED COST NEW TYPE", "Estimated")}
              {renderCostField("Source of Cost Data", "Source of cost data")}

              <div style={{ borderBottom: '1px solid #dee2e6', paddingBottom: '3px', marginBottom: '6px' }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                  <span style={{ fontWeight: 'bold', color: '#495057', fontSize: '0.7rem', minWidth: '80px', whiteSpace: 'nowrap' }}>Quality Rating</span>
                  <div style={{ flexGrow: 1 }}>
                    <EditableField
                      fieldPath={["COST_APPROACH", "Quality rating from cost service "]}
                      value={renderValue(costData["Quality rating from cost service "] || costData["Quality rating from cost service"] || costData["Quality Rating"] || '')}
                      onDataChange={onDataChange}
                      editingField={editingField}
                      setEditingField={setEditingField}
                      isEditable={true}
                      allData={allData}
                      manualValidations={manualValidations}
                      handleManualValidation={handleManualValidation}
                      revisionHandlers={revisionHandlers}
                      inputClassName="form-control form-control-sm field-value"
                      inputStyle={{ width: '100%', border: 'none', background: 'transparent', padding: 0, fontSize: '0.8rem', height: 'auto' }}
                    />
                  </div>
                  <span style={{ fontWeight: 'bold', color: '#495057', fontSize: '0.7rem', whiteSpace: 'nowrap' }}>Effective Date</span>
                  <div style={{ width: '80px' }}>
                    <EditableField
                      fieldPath={["COST_APPROACH", "Effective date of cost data "]}
                      value={renderValue(costData["Effective date of cost data "] || costData["Effective date of cost data"] || costData["Effective Date"] || '')}
                      onDataChange={onDataChange}
                      editingField={editingField}
                      setEditingField={setEditingField}
                      isEditable={true}
                      allData={allData}
                      manualValidations={manualValidations}
                      handleManualValidation={handleManualValidation}
                      revisionHandlers={revisionHandlers}
                      inputClassName="form-control form-control-sm field-value"
                      inputStyle={{ width: '100%', border: 'none', background: 'transparent', padding: 0, fontSize: '0.8rem', height: 'auto' }}
                    />
                  </div>
                </div>
              </div>

              <div style={{ borderBottom: '1px solid #dee2e6', paddingBottom: '3px', marginBottom: '6px' }}>
                <div style={{ fontWeight: 'bold', color: '#495057', fontSize: '0.7rem', marginBottom: '4px' }}>
                  Comments on Cost Approach (gross living area calculations, depreciation, etc.)
                </div>
                <div style={{ minHeight: '60px', marginTop: '4px' }}>
                  <EditableField
                    fieldPath={["COST_APPROACH", "Comments on Cost Approach (gross living area calculations, depreciation, etc.)"]}
                    value={renderValue(costData["Comments on Cost Approach (gross living area calculations, depreciation, etc.)"] || '')}
                    onDataChange={onDataChange}
                    editingField={editingField}
                    setEditingField={setEditingField}
                    usePre={true}
                    isMissing={false}
                    isEditable={true}
                    allData={allData}
                    manualValidations={manualValidations}
                    handleManualValidation={handleManualValidation}
                    revisionHandlers={revisionHandlers}
                    inputClassName="form-control form-control-sm field-value-pre"
                    inputStyle={{ width: '100%', border: 'none', background: 'transparent', padding: 0, fontSize: '0.8rem', height: 'auto', minHeight: '60px', resize: 'vertical' }}
                  />
                </div>
              </div>

              {renderCostField("Remaining Economic Life", "Estimated Remaining Economic Life (HUD and VA only)")}
            </div>

            <div style={{ flex: 1, minWidth: 0, paddingLeft: '16px' }}>
              <div style={{ fontWeight: 'bold', fontSize: '0.85rem', marginBottom: '12px', borderBottom: '2px solid #343a40', paddingBottom: '4px' }}>
                COST CALCULATIONS
              </div>

              {renderCostField("OPINION OF SITE VALUE", "OPINION OF SITE VALUE = $ ................................................")}
              {renderCostField("DWELLING", "Dwelling")}
              {renderCostField("Basement", "Basement")}
              {renderCostField("Deck", "Deck")}
              {renderCostField("Garage/Carport", "Garage/Carport ")}
              {renderCostField("Total Estimate Cost-New", "Total Estimate of Cost-New = $ ...................")}

              <div style={{ borderBottom: '1px solid #dee2e6', paddingBottom: '3px', marginBottom: '6px' }}>
                <div style={{ fontWeight: 'bold', color: '#6c757d', fontSize: '0.65rem', marginBottom: '2px' }}>
                  Less: Physical | Functional | External
                </div>
                {renderCostField("Depreciation", "Depreciation ")}
              </div>

              {renderCostField("Depreciated Cost of Improvements", "Depreciated Cost of Improvements......................................................=$ ")}
              {renderCostField("As-is Value Site Improvements", "“As-is” Value of Site Improvements......................................................=$")}

              <div style={{ marginTop: '12px', backgroundColor: '#e9ecef', padding: '6px', borderRadius: '4px' }}>
                {renderCostField("INDICATED VALUE BY COST APPROACH", "Indicated Value By Cost Approach......................................................=$")}
              </div>
            </div>
          </div>

        </div>
      </Paper>
    );
  }

  if (id === 'income-approach-section') {
    const incData = data?.INCOME_APPROACH || data || {};
    const rentVal = renderValue(incData["Estimated Monthly Market Rent $"] || incData["Estimated Monthly Market Rent"] || data?.["Estimated Monthly Market Rent $"] || '');
    const grmVal = renderValue(incData["X Gross Rent Multiplier  = $"] || incData["X Gross Rent Multiplier = $"] || incData["Gross Rent Multiplier"] || incData["X GROSS RENT MULTIPLIER = $"] || data?.["X Gross Rent Multiplier  = $"] || '');
    const indIncVal = renderValue(incData["Indicated Value by Income Approach"] || incData["Indicated Value by Income Approach $"] || incData["INDICATED VALUE BY INCOME APPROACH"] || data?.["Indicated Value by Income Approach"] || '');
    const sumVal = renderValue(incData["Summary of Income Approach (including support for market rent and GRM) "] || incData["Summary of Income Approach (including support for market rent and GRM)"] || incData["SUMMARY OF INCOME APPROACH"] || data?.["Summary of Income Approach (including support for market rent and GRM) "] || '');

    return (
      <Paper id={id} elevation={1} sx={{ mb: 2, borderRadius: 2, overflow: 'hidden', borderTop: '3px solid', borderTopColor: borderColor }}>
        <Box
          sx={{
            p: 1.5,
            bgcolor: 'grey.50',
            color: 'text.primary',
            borderBottom: '1px solid',
            borderColor: 'grey.200',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}>
          <Typography variant="h6" component="h5" sx={{ fontSize: '1.05rem', fontWeight: 'bold' }}>{title || "Income Approach"}</Typography>
          {onRevisionButtonClick && (
            <Tooltip title="Revision Language">
              <IconButton onClick={onRevisionButtonClick} size="small" sx={{ color: 'text.secondary', ml: 'auto' }}><LibraryBooksIcon /></IconButton>
            </Tooltip>
          )}
        </Box>
        {loading && loadingSection === id && (
          <Box sx={{ width: '100%' }}><LinearProgress /></Box>
        )}
        <div className="card-body p-3" style={{ fontSize: '0.8rem', backgroundColor: '#fff' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '16px', borderBottom: '1px solid #dee2e6', paddingBottom: '12px' }}>
            <div style={{ borderBottom: '1px solid #dee2e6', paddingBottom: '3px' }}>
              <span style={{ fontWeight: 'bold', color: '#495057', fontSize: '0.7rem', display: 'block', marginBottom: '2px' }}>Estimated Monthly Market Rent $</span>
              <EditableField
                fieldPath={["INCOME_APPROACH", "Estimated Monthly Market Rent $"]}
                value={rentVal}
                onDataChange={onDataChange}
                editingField={editingField}
                setEditingField={setEditingField}
                isEditable={true}
                allData={allData}
                manualValidations={manualValidations}
                handleManualValidation={handleManualValidation}
                revisionHandlers={revisionHandlers}
                inputClassName="form-control form-control-sm field-value"
                inputStyle={{ width: '100%', border: 'none', background: 'transparent', padding: 0, fontSize: '0.8rem', height: 'auto' }}
              />
            </div>
            <div style={{ borderBottom: '1px solid #dee2e6', paddingBottom: '3px' }}>
              <span style={{ fontWeight: 'bold', color: '#495057', fontSize: '0.7rem', display: 'block', marginBottom: '2px' }}>X Gross Rent Multiplier = $</span>
              <EditableField
                fieldPath={["INCOME_APPROACH", "X Gross Rent Multiplier  = $"]}
                value={grmVal}
                onDataChange={onDataChange}
                editingField={editingField}
                setEditingField={setEditingField}
                isEditable={true}
                allData={allData}
                manualValidations={manualValidations}
                handleManualValidation={handleManualValidation}
                revisionHandlers={revisionHandlers}
                inputClassName="form-control form-control-sm field-value"
                inputStyle={{ width: '100%', border: 'none', background: 'transparent', padding: 0, fontSize: '0.8rem', height: 'auto' }}
              />
            </div>
            <div style={{ borderBottom: '1px solid #dee2e6', paddingBottom: '3px', backgroundColor: '#e9ecef', padding: '6px', borderRadius: '4px' }}>
              <span style={{ fontWeight: 'bold', color: '#495057', fontSize: '0.7rem', display: 'block', marginBottom: '2px' }}>Indicated Value by Income Approach</span>
              <EditableField
                fieldPath={["INCOME_APPROACH", "Indicated Value by Income Approach"]}
                value={indIncVal}
                onDataChange={onDataChange}
                editingField={editingField}
                setEditingField={setEditingField}
                isEditable={true}
                allData={allData}
                manualValidations={manualValidations}
                handleManualValidation={handleManualValidation}
                revisionHandlers={revisionHandlers}
                inputClassName="form-control form-control-sm field-value"
                inputStyle={{ width: '100%', border: 'none', background: 'transparent', padding: 0, fontSize: '0.8rem', height: 'auto' }}
              />
            </div>
          </div>

          <div>
            <div style={{ fontWeight: 'bold', color: '#495057', fontSize: '0.75rem', marginBottom: '4px' }}>
              Summary of Income Approach (including support for market rent and GRM)
            </div>
            <EditableField
              fieldPath={["INCOME_APPROACH", "Summary of Income Approach (including support for market rent and GRM) "]}
              value={sumVal}
              onDataChange={onDataChange}
              editingField={editingField}
              setEditingField={setEditingField}
              usePre={true}
              isMissing={false}
              isEditable={true}
              allData={allData}
              manualValidations={manualValidations}
              handleManualValidation={handleManualValidation}
              revisionHandlers={revisionHandlers}
              inputClassName="form-control form-control-sm field-value-pre"
              inputStyle={{ width: '100%', border: 'none', background: 'transparent', padding: 0, fontSize: '0.8rem', height: 'auto', minHeight: '60px', resize: 'vertical' }}
            />
          </div>
        </div>
      </Paper>
    );
  }

  if (id === 'appraiser-section') {
    const hasAppraisedValue = data && data["APPRAISED VALUE OF SUBJECT PROPERTY $"] && String(data["APPRAISED VALUE OF SUBJECT PROPERTY $"]).trim() !== '';
    const hasSubjectInspection = data && (data["Did not inspect subject property"] === 'Yes' || data["Did inspect exterior of subject property from street"] === 'Yes' || data["Did inspect interior and exterior of subject property"] === 'Yes');
    const hasCompInspection = data && (data["Did not inspect exterior of comparable sales from street"] === 'Yes' || data["Did inspect exterior of comparable sales from street"] === 'Yes');
    const hasLenderData = data && (data["LENDER/CLIENT Name"] || data["Lender/Client Company Name"] || data["Lender/Client Company Address"] || data["Lender/Client Email Address"]);

    return (
      <Paper id={id} elevation={1} sx={{ mb: 2, borderRadius: 2, overflow: 'hidden', borderTop: '3px solid', borderTopColor: borderColor }}>
        <Box
          sx={{
            p: 1.5,
            bgcolor: 'grey.50',
            color: 'text.primary',
            borderBottom: '1px solid',
            borderColor: 'grey.200',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}>
          <Typography variant="h6" component="h5" sx={{ fontSize: '1.05rem', fontWeight: 'bold' }}>{title}</Typography>
          {onRevisionButtonClick && (
            <Tooltip title="Revision Language">
              <IconButton onClick={onRevisionButtonClick} size="small" sx={{ color: 'text.secondary', ml: 'auto' }}><LibraryBooksIcon /></IconButton>
            </Tooltip>
          )}
        </Box>
        {loading && loadingSection === id && (
          <Box sx={{ width: '100%' }}><LinearProgress /></Box>
        )}
        <div className="card-body p-3" style={{ fontSize: '0.8rem', backgroundColor: '#fff' }}>

          <div style={{ display: 'flex', gap: '24px', marginBottom: '24px' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 'bold', fontSize: '0.9rem', marginBottom: '12px', borderBottom: '2px solid #343a40', paddingBottom: '4px' }}>
                APPRAISER
              </div>
              {data && data["Signature"] && String(data["Signature"]).trim() !== '' && (
                <div style={{ borderBottom: '1px solid #dee2e6', paddingBottom: '3px', marginBottom: '6px' }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                    <span style={{ fontWeight: 'bold', color: '#495057', fontSize: '0.7rem', minWidth: '100px', whiteSpace: 'nowrap' }}>Signature</span>
                    <div style={{ flexGrow: 1 }}>
                      <EditableField
                        fieldPath={["Signature"]}
                        value={data ? renderValue(data["Signature"]) : ''}
                        onDataChange={onDataChange}
                        editingField={editingField}
                        setEditingField={setEditingField}
                        isEditable={true}
                        allData={allData}
                        manualValidations={manualValidations}
                        handleManualValidation={handleManualValidation}
                        revisionHandlers={revisionHandlers}
                        inputClassName="form-control form-control-sm field-value"
                        inputStyle={{ width: '100%', border: 'none', background: 'transparent', padding: 0, fontSize: '0.8rem', height: 'auto' }}
                        valueStyle={{ fontFamily: "'Caveat', 'Dancing Script', 'Brush Script MT', cursive, sans-serif", fontSize: '1.25rem', color: '#1a252c', fontStyle: 'italic' }}
                      />
                    </div>
                  </div>
                </div>
              )}
              {renderCertField("Name", "Name")}
              {renderCertField("Company Name", "Company Name")}
              {renderCertField("Company Address", "Company Address")}
              {renderCertField("Telephone Number", "Telephone Number")}
              {renderCertField("Email Address", "Email Address")}
              {renderCertField("Date of Signature", "Date of Signature and Report")}
              {renderCertField("Effective Date of Appraisal", "Effective Date of Appraisal")}
              {renderCertField("State Certification #", "State Certification #")}
              {renderCertField("or State License #", "or State License #")}


              {(!hideEmptyFields || (data && (data["or Other (describe)"] || data["State #"]))) && (
                <div style={{ borderBottom: '1px solid #dee2e6', paddingBottom: '3px', marginBottom: '6px' }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                    <span style={{ fontWeight: 'bold', color: '#495057', fontSize: '0.7rem', minWidth: '100px', whiteSpace: 'nowrap' }}>or Other (describe)</span>
                    <div style={{ flexGrow: 1 }}>
                      <EditableField
                        fieldPath={["or Other (describe)"]}
                        value={data ? renderValue(data["or Other (describe)"]) : ''}
                        onDataChange={onDataChange}
                        editingField={editingField}
                        setEditingField={setEditingField}
                        isEditable={true}
                        allData={allData}
                        manualValidations={manualValidations}
                        handleManualValidation={handleManualValidation}
                        revisionHandlers={revisionHandlers}
                        inputClassName="form-control form-control-sm field-value"
                        inputStyle={{ width: '100%', border: 'none', background: 'transparent', padding: 0, fontSize: '0.8rem', height: 'auto' }}
                      />
                    </div>
                    <span style={{ fontWeight: 'bold', color: '#495057', fontSize: '0.7rem' }}>State #</span>
                    <div style={{ width: '80px' }}>
                      <EditableField
                        fieldPath={["State #"]}
                        value={data ? renderValue(data["State #"]) : ''}
                        onDataChange={onDataChange}
                        editingField={editingField}
                        setEditingField={setEditingField}
                        isEditable={true}
                        allData={allData}
                        manualValidations={manualValidations}
                        handleManualValidation={handleManualValidation}
                        revisionHandlers={revisionHandlers}
                        inputClassName="form-control form-control-sm field-value"
                        inputStyle={{ width: '100%', border: 'none', background: 'transparent', padding: 0, fontSize: '0.8rem', height: 'auto' }}
                      />
                    </div>
                  </div>
                </div>
              )}

              {renderCertField("State", "State")}
              {renderCertField("Expiration Date", "Expiration Date of Certification or License")}
            </div>

            {/* Right: SUPERVISORY APPRAISER */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 'bold', fontSize: '0.9rem', marginBottom: '12px', borderBottom: '2px solid #343a40', paddingBottom: '4px' }}>
                SUPERVISORY APPRAISER (ONLY IF REQUIRED)
              </div>
              <div style={{ borderBottom: '1px solid #dee2e6', paddingBottom: '3px', marginBottom: '6px' }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                  <span style={{ fontWeight: 'bold', color: '#495057', fontSize: '0.7rem', minWidth: '100px', whiteSpace: 'nowrap' }}>Signature</span>
                  <div style={{ flexGrow: 1 }}>
                    <EditableField
                      fieldPath={["Supervisory Signature"]}
                      value={data ? renderValue(data["Supervisory Signature"] || data["Supervisory Appraiser Signature"] || '') : ''}
                      onDataChange={onDataChange}
                      editingField={editingField}
                      setEditingField={setEditingField}
                      isEditable={true}
                      allData={allData}
                      manualValidations={manualValidations}
                      handleManualValidation={handleManualValidation}
                      revisionHandlers={revisionHandlers}
                      inputClassName="form-control form-control-sm field-value"
                      inputStyle={{ width: '100%', border: 'none', background: 'transparent', padding: 0, fontSize: '0.8rem', height: 'auto' }}
                      valueStyle={{ fontFamily: "'Caveat', 'Dancing Script', 'Brush Script MT', cursive, sans-serif", fontSize: '1.25rem', color: '#1a252c', fontStyle: 'italic' }}
                    />
                  </div>
                </div>
              </div>
              {renderCertField("Name", "Supervisory Name")}
              {renderCertField("Company Name", "Supervisory Company Name")}
              {renderCertField("Company Address", "Supervisory Company Address")}
              {renderCertField("Telephone Number", "Supervisory Telephone Number")}
              {renderCertField("Email Address", "Supervisory Email Address")}
              {renderCertField("Date of Signature", "Supervisory Date of Signature")}
              {renderCertField("State Certification #", "Supervisory State Certification #")}
              {renderCertField("or State License #", "Supervisory or State License #")}
              {renderCertField("State", "Supervisory State")}
              {renderCertField("Expiration Date", "Supervisory Expiration Date of Certification or License")}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '24px', borderTop: '2px solid #495057', paddingTop: '16px' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 'bold', fontSize: '0.8rem', marginBottom: '8px', color: '#343a40' }}>
                ADDRESS OF PROPERTY APPRAISED
              </div>
              {renderCertField("Address", "ADDRESS OF PROPERTY APPRAISED")}

              {(!hideEmptyFields || hasAppraisedValue) && (
                <>
                  <div style={{ fontWeight: 'bold', fontSize: '0.8rem', marginTop: '16px', marginBottom: '8px', color: '#343a40' }}>
                    APPRAISED VALUE OF SUBJECT PROPERTY
                  </div>
                  {renderCertField("Appraised Value $", "APPRAISED VALUE OF SUBJECT PROPERTY $")}
                </>
              )}

              {(!hideEmptyFields || hasLenderData) && (
                <>
                  <div style={{ fontWeight: 'bold', fontSize: '0.8rem', marginTop: '16px', marginBottom: '8px', color: '#343a40' }}>
                    LENDER/CLIENT
                  </div>
                  {renderCertField("Name", "LENDER/CLIENT Name")}
                  {renderCertField("Company Name", "Lender/Client Company Name")}
                  {renderCertField("Company Address", "Lender/Client Company Address")}
                  {renderCertField("Email Address", "Lender/Client Email Address")}
                </>
              )}
            </div>

            {(!hideEmptyFields || hasSubjectInspection || hasCompInspection) && (
              <div style={{ flex: 1, minWidth: 0 }}>
                {(!hideEmptyFields || hasSubjectInspection) && (
                  <>
                    <div style={{ fontWeight: 'bold', fontSize: '0.8rem', marginBottom: '8px', color: '#343a40' }}>
                      SUBJECT PROPERTY
                    </div>
                    {renderCertField("Did not inspect subject property", "Did not inspect subject property", true)}
                    {renderCertField("Did inspect exterior of subject property from street", "Did inspect exterior of subject property from street", true)}
                    <div style={{ paddingLeft: '24px' }}>
                      {renderCertField("Date of Inspection", "Subject Property Date of Inspection (Exterior)")}
                    </div>
                    {renderCertField("Did inspect interior and exterior of subject property", "Did inspect interior and exterior of subject property", true)}
                    <div style={{ paddingLeft: '24px' }}>
                      {renderCertField("Date of Inspection", "Subject Property Date of Inspection (Interior/Exterior)")}
                    </div>
                  </>
                )}

                {(!hideEmptyFields || hasCompInspection) && (
                  <>
                    <div style={{ fontWeight: 'bold', fontSize: '0.8rem', marginTop: '16px', marginBottom: '8px', color: '#343a40' }}>
                      COMPARABLE SALES
                    </div>
                    {renderCertField("Did not inspect exterior of comparable sales from street", "Did not inspect exterior of comparable sales from street", true)}
                    {renderCertField("Did inspect exterior of comparable sales from street", "Did inspect exterior of comparable sales from street", true)}
                    <div style={{ paddingLeft: '24px' }}>
                      {renderCertField("Date of Inspection", "Comparable Sales Date of Inspection")}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>


          <div style={{ borderTop: '1px dashed #dee2e6', marginTop: '20px', paddingTop: '12px' }}>
            <div style={{ fontWeight: 'bold', fontSize: '0.8rem', color: '#6c757d', marginBottom: '8px' }}>
              Additional Info & E&O Insurance
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
              {renderCertField("E&O", "E&O")}
              {renderCertField("Invoice Attached", "Invoice Attached")}
              {renderCertField("USPAP Reporting Option", "USPAP Reporting Option")}
              {renderCertField("E&O Insurance", "E&O Insurance")}
              {renderCertField("Policy Period From", "Policy Period From")}
              {renderCertField("Policy Period To", "Policy Period To")}
              {renderCertField("E&O Insured", "E&O Insured")}
              {renderCertField("E&O Carrier", "E&O Carrier")}
              {renderCertField("E&O Limit", "E&O Limit")}
              {renderCertField("E&O Deductible", "E&O Deductible")}
              {renderCertField("Appraiser License", "Appraiser License")}
              {renderCertField("License Valid To", "License Valid To")}
              {renderCertField("License # / Reg #", "LICENSE/REGISTRATION/CERTIFICATION #")}
            </div>
          </div>

        </div>
      </Paper>
    );
  }

  return (
    <Paper id={id} elevation={1} sx={{ mb: 2, borderRadius: 2, overflow: 'hidden', borderTop: '3px solid', borderTopColor: borderColor }}>
      <Box
        sx={{
          p: 1.5,
          bgcolor: 'grey.50',
          color: 'text.primary',
          borderBottom: '1px solid',
          borderColor: 'grey.200',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography variant="h6" component="h5" sx={{ fontSize: '1.05rem', fontWeight: 'bold' }}>{title}</Typography>
          {renderNeighborhoodTotal()}
        </Box>
        {onRevisionButtonClick && (
          <Tooltip title="Revision Language">
            <IconButton onClick={onRevisionButtonClick} size="small" sx={{ color: 'text.secondary', ml: 'auto' }}><LibraryBooksIcon /></IconButton>
          </Tooltip>
        )}
      </Box>
      {loading && loadingSection === id && (
        <Box sx={{ width: '100%' }}><LinearProgress /></Box>
      )}
      <div className="card-body subject-grid-container">
        {getDynamicFields().map(field => renderGridItem(field))}
      </div>
    </Paper>
  );
};
