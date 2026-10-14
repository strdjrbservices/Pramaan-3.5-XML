import React from 'react';
import { EditableField } from './FormComponents';
import { Tooltip, IconButton, Paper, Box, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from '@mui/material';
import LibraryBooksIcon from '@mui/icons-material/LibraryBooks';


const SalesComparisonSection = ({
  id = "sales-comparison",
  data,
  extractionAttempted,
  handleDataChange,
  editingField,
  setEditingField,
  salesGridRows,
  comparableSales,
  salesHistoryFields,
  salesComparisonAdditionalInfoFields,
  formType,
  isEditable,
  allData,
  manualValidations,
  handleManualValidation,
  onRevisionButtonClick,
  revisionHandlers
}) => {
  extractionAttempted = false;

  const getCompData = (sale) => {
    if (!data || typeof data !== 'object') return {};
    if (data[sale] && typeof data[sale] === 'object') return data[sale];
    if (data.SALES_GRID && data.SALES_GRID[sale] && typeof data.SALES_GRID[sale] === 'object') return data.SALES_GRID[sale];
    const noSpace = typeof sale === 'string' ? sale.replace('# ', '#') : sale;
    const withSpace = typeof sale === 'string' ? sale.replace('#', '# ') : sale;
    if (data[noSpace] && typeof data[noSpace] === 'object') return data[noSpace];
    if (data[withSpace] && typeof data[withSpace] === 'object') return data[withSpace];
    if (data.SALES_GRID && data.SALES_GRID[noSpace] && typeof data.SALES_GRID[noSpace] === 'object') return data.SALES_GRID[noSpace];
    if (data.SALES_GRID && data.SALES_GRID[withSpace] && typeof data.SALES_GRID[withSpace] === 'object') return data.SALES_GRID[withSpace];
    return {};
  };

  const getSubjectData = () => {
    if (!data || typeof data !== 'object') return {};
    const s1 = (typeof data.Subject === 'object' && data.Subject) || {};
    const s2 = (typeof data.SUBJECT === 'object' && data.SUBJECT) || {};
    const s3 = (data.SALES_GRID && typeof data.SALES_GRID.Subject === 'object' && data.SALES_GRID.Subject) || {};
    return { ...s2, ...s1, ...s3 };
  };

  const subjectObj = getSubjectData();

  return (
    <>
      <Paper id={id} elevation={3} sx={{ mb: 4, mt: 4, borderRadius: 2, overflow: 'hidden' }}>
        <Box sx={{ bgcolor: 'primary.main', color: 'white', px: 2, py: 1.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, zIndex: 10 }}>
          <Typography variant="subtitle1" fontWeight="bold">Sales Comparison Approach</Typography>
          {onRevisionButtonClick && (
            <Tooltip title="Revision Language">
              <IconButton onClick={onRevisionButtonClick} size="small" sx={{ color: 'white', ml: 'auto' }}><LibraryBooksIcon /></IconButton>
            </Tooltip>
          )}
        </Box>
        <TableContainer>
          <Table size="small" aria-label="sales comparison table" className="sales-comparison-table">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 'bold', minWidth: '200px', backgroundColor: 'action.hover' }}>Feature</TableCell>
                <TableCell sx={{ fontWeight: 'bold', minWidth: '200px', backgroundColor: 'action.hover' }}>Subject</TableCell>
                {comparableSales.map((sale, idx) => (
                  <TableCell key={idx} sx={{ fontWeight: 'bold', minWidth: '200px', backgroundColor: 'action.hover' }}>{sale}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {salesGridRows.map((row, idx) => {
                const isHighlighted = row.label === 'Date of Sale/Time';
                const isFirstAdjustment = row.valueKey === "Sales or Financing Concessions" || row.valueKey === "Sales Concessions";
                const isFirstUnitBreakdown = row.isUnitBreakdown && row.unitNumber === 1;

                const renderRow = () => {
                  if (row.isUnitBreakdown) {
                    const u = row.unitNumber;
                    const totKey = `Unit Breakdown Tot Unit # ${u}`;
                    const brKey = `Unit Breakdown Br Unit # ${u}`;
                    const baKey = `Unit Breakdown Ba Unit # ${u}`;
                    const adjKey = `Unit Breakdown Adjustment Unit # ${u}`;

                    return (
                      <TableRow key={idx} hover>
                        <TableCell sx={{ fontWeight: 'medium', borderRight: '1px solid rgba(224, 224, 224, 1)', pl: 3 }}>
                          Unit #{u}
                        </TableCell>

                        <TableCell sx={{ borderRight: '1px solid rgba(224, 224, 224, 1)' }}>
                          <div style={{ display: 'flex', gap: '4px' }}>
                            <EditableField fieldPath={['Subject', totKey]} value={subjectObj[totKey] || ''} onDataChange={handleDataChange} editingField={editingField} setEditingField={setEditingField} isEditable={true} allData={allData || data} revisionHandlers={revisionHandlers} placeholder="Tot" />
                            <EditableField fieldPath={['Subject', brKey]} value={subjectObj[brKey] || ''} onDataChange={handleDataChange} editingField={editingField} setEditingField={setEditingField} isEditable={true} allData={allData || data} revisionHandlers={revisionHandlers} placeholder="Br" />
                            <EditableField fieldPath={['Subject', baKey]} value={subjectObj[baKey] || ''} onDataChange={handleDataChange} editingField={editingField} setEditingField={setEditingField} isEditable={true} allData={allData || data} revisionHandlers={revisionHandlers} placeholder="Ba" />
                          </div>
                        </TableCell>

                        {comparableSales.map((sale, cidx) => {
                          const compVal = getCompData(sale);
                          return (
                            <TableCell key={cidx} sx={{ borderRight: '1px solid rgba(224, 224, 224, 1)' }}>
                              <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                                <EditableField fieldPath={[sale, totKey]} value={compVal[totKey] || ''} onDataChange={handleDataChange} editingField={editingField} setEditingField={setEditingField} isEditable={true} allData={allData || data} revisionHandlers={revisionHandlers} placeholder="Tot" />
                                <EditableField fieldPath={[sale, brKey]} value={compVal[brKey] || ''} onDataChange={handleDataChange} editingField={editingField} setEditingField={setEditingField} isEditable={true} allData={allData || data} revisionHandlers={revisionHandlers} placeholder="Br" />
                                <EditableField fieldPath={[sale, baKey]} value={compVal[baKey] || ''} onDataChange={handleDataChange} editingField={editingField} setEditingField={setEditingField} isEditable={true} allData={allData || data} revisionHandlers={revisionHandlers} placeholder="Ba" />
                                <EditableField fieldPath={[sale, adjKey]} value={compVal[adjKey] || ''} onDataChange={handleDataChange} editingField={editingField} setEditingField={setEditingField} isEditable={true} isAdjustment={true} allData={allData || data} revisionHandlers={revisionHandlers} placeholder="Adj" />
                              </div>
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    );
                  }

                  let mostCommonLeasehold = null;
                  let leaseholdInconsistent = false;
                  if (row.label === "Leasehold/Fee Simple") {
                    const allValues = [subjectObj[row.valueKey], ...comparableSales.map(sale => getCompData(sale)[row.valueKey])].filter(Boolean);
                    if (allValues.length > 0) {
                      const valueCounts = allValues.reduce((acc, value) => {
                        acc[value] = (acc[value] || 0) + 1;
                        return acc;
                      }, {});
                      mostCommonLeasehold = Object.keys(valueCounts).reduce((a, b) => valueCounts[a] > valueCounts[b] ? a : b);
                      const uniqueValues = new Set(allValues);
                      if (uniqueValues.size > 1) leaseholdInconsistent = true;
                    }
                  }

                  const subjectValue = row.label === "Verification Source(s)"
                    ? (comparableSales.map(sale => getCompData(sale)[row.valueKey]).find(Boolean) || subjectObj[row.valueKey] || '')
                    : (row.subjectValueKey ? (data[row.subjectValueKey] || subjectObj[row.subjectValueKey] || subjectObj[row.valueKey] || '') : (subjectObj[row.valueKey] || data[row.valueKey] || ''));

                  const subjectStyle = {};
                  if (extractionAttempted && !subjectValue) {
                    subjectStyle.border = '2px solid red';
                  }
                  const subjectLeaseholdValue = subjectObj[row.valueKey] || '';
                  if (leaseholdInconsistent && subjectLeaseholdValue && subjectLeaseholdValue !== mostCommonLeasehold) {
                    subjectStyle.backgroundColor = 'red';
                  }

                  return (
                    <TableRow key={idx} sx={isHighlighted ? { backgroundColor: 'action.selected' } : {}}>
                      <TableCell sx={{ fontWeight: 'medium', borderRight: '1px solid rgba(224, 224, 224, 1)' }}>{row.label}</TableCell>
                      <TableCell sx={{ borderRight: '1px solid rgba(224, 224, 224, 1)', ...subjectStyle }}>
                        {!row.isAdjustmentOnly && (
                          <EditableField
                            fieldPath={row.subjectValueKey ? [row.subjectValueKey] : ['Subject', row.valueKey]}
                            value={subjectValue}
                            onDataChange={handleDataChange} editingField={editingField} setEditingField={setEditingField}
                            isMissing={extractionAttempted && !subjectValue}
                            isEditable={true}
                            allData={allData || data}
                            saleName={'Subject'}
                            manualValidations={manualValidations}
                            handleManualValidation={handleManualValidation}
                            revisionHandlers={revisionHandlers}
                          />
                        )}
                        {row.adjustmentKey && (
                          <EditableField
                            fieldPath={['Subject', row.adjustmentKey]} value={subjectObj[row.adjustmentKey] || ''}
                            onDataChange={handleDataChange} editingField={editingField} setEditingField={setEditingField}
                            isMissing={extractionAttempted && (!subjectObj[row.adjustmentKey] || subjectObj[row.adjustmentKey] === '')}
                            isEditable={true} isAdjustment={true}
                            allData={allData || data}
                            saleName={'Subject'}
                            manualValidations={manualValidations}
                            handleManualValidation={handleManualValidation}
                            revisionHandlers={revisionHandlers}
                          />
                        )}
                      </TableCell>
                      {comparableSales.map((sale, cidx) => {
                        const compObj = getCompData(sale);
                        const compValue = compObj[row.valueKey] ?? compObj[row.valueKey?.replace('of Comparable', 'of Comparables')] ?? compObj[row.valueKey?.replace('of Comparables', 'of Comparable')] ?? '';
                        const rawAdjValue = compObj[row.adjustmentKey];
                        const adjValue = (row.adjustmentKey === 'Baths Adjustment' && (rawAdjValue === undefined || rawAdjValue === ''))
                          ? (compObj['Above Grade Room Count Adjustment'] || '')
                          : (rawAdjValue || '');
                        const cellStyle = {};
                        if (extractionAttempted && !row.isAdjustmentOnly && (!compObj || (compValue === undefined || compValue === ''))) {
                          cellStyle.border = '2px solid red';
                        }

                        return (
                          <TableCell key={cidx} sx={{ borderRight: '1px solid rgba(224, 224, 224, 1)', ...cellStyle }}>
                            {!row.isAdjustmentOnly && (
                              <EditableField
                                fieldPath={[sale, row.valueKey]}
                                value={compValue}
                                onDataChange={handleDataChange} editingField={editingField} setEditingField={setEditingField}
                                isMissing={extractionAttempted && (!compValue || compValue === '')}
                                isEditable={true}
                                allData={allData || data}
                                saleName={sale}
                                manualValidations={manualValidations}
                                handleManualValidation={handleManualValidation}
                                revisionHandlers={revisionHandlers}
                              />
                            )}
                            {row.adjustmentKey && (
                              <EditableField
                                fieldPath={[sale, row.adjustmentKey]}
                                value={adjValue}
                                onDataChange={handleDataChange} editingField={editingField} setEditingField={setEditingField}
                                isMissing={extractionAttempted && (!adjValue || adjValue === '')}
                                isEditable={true}
                                isAdjustment={true}
                                allData={allData || data}
                                saleName={sale}
                                manualValidations={manualValidations}
                                handleManualValidation={handleManualValidation}
                                revisionHandlers={revisionHandlers}
                              />
                            )}
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  );
                };

                return (
                  <React.Fragment key={idx}>
                    {isFirstAdjustment && (
                      <TableRow key={`adj-header-${idx}`} sx={{ backgroundColor: '#f3f4f6' }}>
                        <TableCell sx={{ fontWeight: 'bold', borderRight: '1px solid rgba(224, 224, 224, 1)' }}>VALUE ADJUSTMENTS</TableCell>
                        <TableCell sx={{ fontWeight: 'bold', borderRight: '1px solid rgba(224, 224, 224, 1)', textAlign: 'center' }}>DESCRIPTION</TableCell>
                        {comparableSales.map((sale, cidx) => (
                          <TableCell key={cidx} sx={{ fontWeight: 'bold', borderRight: '1px solid rgba(224, 224, 224, 1)', textAlign: 'center' }}>DESCRIPTION / ADJ</TableCell>
                        ))}
                      </TableRow>
                    )}
                    {isFirstUnitBreakdown && (
                      <TableRow key={`unit-header-${idx}`} sx={{ backgroundColor: '#f3f4f6' }}>
                        <TableCell sx={{ fontWeight: 'bold', borderRight: '1px solid rgba(224, 224, 224, 1)' }}>Unit Breakdown</TableCell>
                        <TableCell sx={{ fontWeight: 'bold', borderRight: '1px solid rgba(224, 224, 224, 1)', textAlign: 'center' }}>Total / Br / Ba</TableCell>
                        {comparableSales.map((sale, cidx) => (
                          <TableCell key={cidx} sx={{ fontWeight: 'bold', borderRight: '1px solid rgba(224, 224, 224, 1)', textAlign: 'center' }}>Total / Br / Ba / Adj</TableCell>
                        ))}
                      </TableRow>
                    )}
                    {renderRow()}
                  </React.Fragment>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {formType !== 'Appraisal Version #1' && (
        <Paper elevation={3} sx={{ mb: 4, borderRadius: 2, overflow: 'hidden' }}>
          <Box sx={{ bgcolor: 'info.main', color: 'white', px: 2, py: 1.5, position: 'sticky', top: 0, zIndex: 10 }}>
            <Typography variant="subtitle1" fontWeight="bold">Sales or Transfer History</Typography>
          </Box>
          <TableContainer>
            <Table size="small">
              <TableBody>
                {salesComparisonAdditionalInfoFields.map((field, index) => (
                  <TableRow key={index} hover>
                    <TableCell sx={{ width: '50%' }}>{field}</TableCell>
                    <TableCell>
                      <EditableField
                        fieldPath={[field]}
                        value={data[field] || ''}
                        onDataChange={(path, val) => handleDataChange(path, val)} editingField={editingField} setEditingField={setEditingField}
                        isMissing={extractionAttempted && (!data[field] || data[field] === '')}
                        allData={allData}
                        isEditable={true}
                        manualValidations={manualValidations}
                        handleManualValidation={handleManualValidation}
                        revisionHandlers={revisionHandlers}
                        showBlankValidation={field === 'Indicated Value by Sales Comparison Approach' ? false : undefined}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}

      {formType !== 'Appraisal Version #1' && (
        <Paper id="prior-sale-history-grid" elevation={3} sx={{ mb: 4, mt: 4, borderRadius: 2, overflow: 'hidden' }}>
          <Box sx={{ bgcolor: 'grey.900', color: 'white', px: 2, py: 1.5, position: 'sticky', top: 0, zIndex: 10 }}>
          </Box>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 'bold', backgroundColor: 'action.hover' }}>Feature</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', backgroundColor: 'action.hover' }}>Subject</TableCell>
                  {comparableSales.map((sale, idx) => (
                    <TableCell key={idx} sx={{ fontWeight: 'bold', backgroundColor: 'action.hover' }}>{sale}</TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {salesHistoryFields.map((feature, idx) => (
                  <TableRow key={idx} hover>
                    <TableCell sx={{ fontWeight: 'medium' }}>{feature}</TableCell>
                    <TableCell>
                      <EditableField
                        fieldPath={['Subject', feature]}
                        value={data.Subject?.[feature] || ''}
                        onDataChange={handleDataChange} editingField={editingField} setEditingField={setEditingField}
                        isMissing={extractionAttempted && (!data.Subject?.[feature] || data.Subject?.[feature] === '')}
                        allData={allData}
                        isEditable={true}
                        manualValidations={manualValidations}
                        handleManualValidation={handleManualValidation}
                      />
                    </TableCell>
                    {comparableSales.map((sale, cidx) => (
                      <TableCell key={cidx}>
                        <EditableField
                          fieldPath={[sale, feature]}
                          value={data[sale]?.[feature] || ''}
                          onDataChange={handleDataChange} editingField={editingField} setEditingField={setEditingField}
                          isMissing={extractionAttempted && (!data[sale]?.[feature] || data[sale]?.[feature] === '')}
                          allData={allData}
                          isEditable={true}
                          manualValidations={manualValidations}
                          handleManualValidation={handleManualValidation}
                        />
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}
    </>
  );
};

export default SalesComparisonSection;
