import React from 'react';
import { Paper, Box, Typography, TableContainer, Table, TableBody, TableRow, TableCell } from '@mui/material';
import { EditableField } from './EditableField';

export const FieldTable = ({ id, title, fields, data, cardClass = 'bg-primary', usePre = false, extractionAttempted, onDataChange, editingField, setEditingField, allData }) => {
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

  return (
    <Paper id={id} elevation={1} sx={{ mb: 4, mt: 4, borderRadius: 2, overflow: 'hidden', borderTop: '3px solid', borderTopColor: borderColor }}>
      {title && (
        <Box sx={{ bgcolor: 'grey.50', color: 'text.primary', borderBottom: '1px solid', borderColor: 'grey.200', px: 2, py: 1.5, position: 'sticky', top: 0, zIndex: 10 }}>
          <Typography variant="subtitle1" fontWeight="bold" align="center">{title}</Typography>
        </Box>
      )}
      <TableContainer>
        <Table size="small" aria-label={title || "data table"}>
          <TableBody>
            {fields.map((field, index) => {
              const fieldLabel = typeof field === 'object' && field !== null ? `${field.choice} ${field.comment || ''}`.trim() : field;
              const value = data[fieldLabel];
              const isMissing = false;
              return (
                <TableRow key={index} hover>
                  <TableCell sx={{ width: usePre ? '35%' : '50%', fontWeight: 'medium' }}>
                    {typeof field === 'object' && field !== null ? `${field.choice} ${field.comment || ''}`.trim() : field}
                  </TableCell>
                  <TableCell sx={isMissing ? { border: '1px solid #d32f2f', bgcolor: '#fff5f5' } : {}}>
                    <EditableField
                      fieldPath={[fieldLabel]}
                      value={value || ''}
                      onDataChange={(path, val) => onDataChange(path[0], val)}
                      editingField={editingField}
                      setEditingField={setEditingField}
                      usePre={usePre} isMissing={isMissing}
                      allData={allData}
                    />
                    {/* Passing manual validation props */}
                    <EditableField manualValidations={allData.manualValidations} handleManualValidation={allData.handleManualValidation} />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
};
