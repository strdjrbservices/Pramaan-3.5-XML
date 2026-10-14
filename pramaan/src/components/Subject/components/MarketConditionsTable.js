import React from 'react';
import { Paper, Box, Typography, TableContainer, Table, TableHead, TableBody, TableRow, TableCell } from '@mui/material';
import { EditableField } from './EditableField';
import { checkMarketConditionsTableFields } from '../../../validations/marketConditionsValidation';

export const MarketConditionsTable = ({ id, title, data, onDataChange, editingField, setEditingField, marketConditionsRows = [], manualValidations, handleManualValidation, isEditable }) => {
  const timeframes = ["Prior 7-12 Months", "Prior 4-6 Months", "Current-3 Months", "Overall Trend"];

  const getMarketConditionValue = (row, tf) => {
    if (!data) return '';
    const marketData = data.MARKET_CONDITIONS && typeof data.MARKET_CONDITIONS === 'object' ? data.MARKET_CONDITIONS : {};
    const combinedData = { ...data, ...marketData };

    const fieldName = `${row.fullLabel} (${tf})`;
    if (combinedData[fieldName] !== undefined && combinedData[fieldName] !== null && combinedData[fieldName] !== '') {
      return String(combinedData[fieldName]);
    }

    const shortFieldName = `${row.label} (${tf})`;
    if (combinedData[shortFieldName] !== undefined && combinedData[shortFieldName] !== null && combinedData[shortFieldName] !== '') {
      return String(combinedData[shortFieldName]);
    }

    const normalizeKey = (str) => String(str || '').toLowerCase().replace(/[\u2013\u2014\u2212]/g, '-').replace(/\s+/g, ' ').trim();
    const targetNormalized = normalizeKey(fieldName);
    const altFieldName = normalizeKey(shortFieldName);

    for (const [key, val] of Object.entries(combinedData)) {
      if (val === undefined || val === null || val === '') continue;
      if (key === 'MARKET_CONDITIONS' || typeof val === 'object') continue;

      const keyNorm = normalizeKey(key);
      if (keyNorm === targetNormalized || keyNorm === altFieldName) {
        return String(val);
      }
    }

    const isOverall = tf.toLowerCase().includes('overall');
    const tfDigits = tf.replace(/[^0-9]/g, '');

    for (const [key, val] of Object.entries(combinedData)) {
      if (val === undefined || val === null || val === '') continue;
      if (key === 'MARKET_CONDITIONS' || typeof val === 'object') continue;

      const keyNorm = normalizeKey(key);
      const rowLabelNorm = normalizeKey(row.label);

      const matchesRow = keyNorm.includes(rowLabelNorm) || rowLabelNorm.split(' ').slice(0, 3).every(w => keyNorm.includes(w));
      if (!matchesRow) continue;

      if (isOverall && keyNorm.includes('overall')) {
        return String(val);
      }
      if (!isOverall && tfDigits) {
        if (tfDigits === '712' && (keyNorm.includes('7-12') || keyNorm.includes('7 to 12'))) return String(val);
        if (tfDigits === '46' && (keyNorm.includes('4-6') || keyNorm.includes('4 to 6'))) return String(val);
        if (tfDigits === '3' && (keyNorm.includes('current-3') || keyNorm.includes('3 months') || keyNorm.includes('0-3'))) return String(val);
      }
    }

    return '';
  };

  return (
    <Paper id={id} elevation={1} sx={{ mb: 4, mt: 4, borderRadius: 2, overflow: 'hidden', borderTop: '3px solid', borderTopColor: 'warning.main' }}>
      <Box sx={{ bgcolor: 'grey.50', color: 'text.primary', borderBottom: '1px solid', borderColor: 'grey.200', px: 2, py: 1.5, position: 'sticky', top: 0, zIndex: 10 }}>
        <Typography variant="subtitle1" fontWeight="bold">{title}</Typography>
      </Box>
      <TableContainer>
        <Table size="small" aria-label="market conditions table">
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 'bold', width: '30%', backgroundColor: '#e0e0e0', border: '1px solid rgba(224, 224, 224, 1)' }}>Inventory Analysis</TableCell>
              {timeframes.map(tf => (
                <TableCell key={tf} align="center" sx={{ fontWeight: 'bold', backgroundColor: '#e0e0e0', border: '1px solid rgba(224, 224, 224, 1)' }}>{tf}</TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {marketConditionsRows.flatMap((row, index) => {
              const elements = [];
              if (index === 4) {
                elements.push(
                  <TableRow key="subheader-median" sx={{ backgroundColor: '#e0e0e0' }}>
                    <TableCell sx={{ fontWeight: 'bold', backgroundColor: '#e0e0e0', border: '1px solid rgba(224, 224, 224, 1)' }}>
                      Median Sale & List Price, DOM, Sale/List %
                    </TableCell>
                    {timeframes.map(tf => (
                      <TableCell key={tf} align="center" sx={{ fontWeight: 'bold', backgroundColor: '#e0e0e0', border: '1px solid rgba(224, 224, 224, 1)' }}>
                        {tf}
                      </TableCell>
                    ))}
                  </TableRow>
                );
              }

              const isGrayRow = [
                "Total # of Comparable Active Listings",
                "Months of Housing Supply (Total Listings/Ab.Rate)",
                "Median Comparable List Price",
                "Median Comparable Listings Days on Market"
              ].includes(row.label);

              elements.push(
                <TableRow key={row.label} hover>
                  <TableCell component="th" scope="row" sx={{ fontWeight: 'medium', border: '1px solid rgba(224, 224, 224, 1)' }}>
                    {row.label}
                  </TableCell>
                  {timeframes.map(tf => {
                    const fieldName = `${row.fullLabel} (${tf})`;
                    const value = getMarketConditionValue(row, tf);
                    const isGrayCell = isGrayRow && (tf === "Prior 7-12 Months" || tf === "Prior 4-6 Months");

                    return (
                      <TableCell key={tf} align="center" sx={{ border: '1px solid rgba(224, 224, 224, 1)', backgroundColor: isGrayCell ? '#e0e0e0' : 'inherit' }}>
                        <EditableField
                          fieldPath={['MARKET_CONDITIONS', fieldName]}
                          value={value}
                          onDataChange={(path, val) => onDataChange(path, val)}
                          editingField={editingField}
                          setEditingField={setEditingField}
                          isMissing={!value}
                          allData={data}
                          manualValidations={manualValidations}
                          handleManualValidation={handleManualValidation}
                          customValidation={(f, t, d) => checkMarketConditionsTableFields(f, t, data || d)}
                          isEditable={isEditable}
                        />
                      </TableCell>
                    );
                  })}
                </TableRow>
              );

              return elements;
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
};
