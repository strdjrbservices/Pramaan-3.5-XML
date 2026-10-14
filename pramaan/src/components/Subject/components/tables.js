import React from 'react';
import {
    TableContainer, Table, TableHead, TableRow, TableCell, TableBody, Paper,
    Box, Typography, Alert
} from '@mui/material';
import {
    CheckCircleOutline as CheckCircleOutlineIcon, ErrorOutline as ErrorOutlineIcon
} from '@mui/icons-material';
import { EditableField } from './FormComponents';
import { checkCondoCoopProjectsTableFields } from '../../../validations/form1073Validation';

export const SubjectRentScheduleTable = ({ data, onDataChange, editingField, setEditingField, isEditable, allData, extractionAttempted, manualValidations, handleManualValidation, revisionHandlers }) => {
    const units = [1, 2, 3, 4];

    const getValue = (field) => {
        return data?.[field] || data?.Subject?.[field] || data?.SUBJECT_RENT_SCHEDULE?.[field] || '';
    };

    return (
        <Paper id="subject-rent-schedule-table" elevation={1} sx={{ mb: 4, borderRadius: 2, overflow: 'hidden', borderTop: '3px solid', borderTopColor: 'primary.main' }}>
            <Box sx={{ bgcolor: 'grey.50', color: 'text.primary', borderBottom: '1px solid', borderColor: 'grey.200', px: 2, py: 1.5 }}>
                <Typography variant="h6" component="h5" sx={{ fontSize: '1.05rem', fontWeight: 'bold' }}>Subject Rent Schedule</Typography>
            </Box>
            <div className="card-body p-2 table-container" style={{ overflowX: 'auto' }}>
                <TableContainer>
                    <Table size="small" aria-label="subject-rent-schedule-table" sx={{ minWidth: 800, border: '1px solid #ccc', '& th, & td': { border: '1px solid #ccc', p: 1 } }}>
                        <TableHead>
                            <TableRow sx={{ bgcolor: 'grey.100' }}>
                                <TableCell rowSpan={3} align="center" sx={{ fontWeight: 'bold', verticalAlign: 'middle' }}>Unit #</TableCell>
                                <TableCell colSpan={2} align="center" sx={{ fontWeight: 'bold' }}>Leases</TableCell>
                                <TableCell colSpan={3} align="center" sx={{ fontWeight: 'bold' }}>Actual Rents</TableCell>
                                <TableCell colSpan={3} align="center" sx={{ fontWeight: 'bold' }}>Opinion Of Market Rent</TableCell>
                            </TableRow>
                            <TableRow sx={{ bgcolor: 'grey.100' }}>
                                <TableCell colSpan={2} align="center" sx={{ fontWeight: 'bold' }}>Lease Date</TableCell>
                                <TableCell colSpan={2} align="center" sx={{ fontWeight: 'bold' }}>Per Unit</TableCell>
                                <TableCell rowSpan={2} align="center" sx={{ fontWeight: 'bold', verticalAlign: 'middle' }}>Total Rents</TableCell>
                                <TableCell colSpan={2} align="center" sx={{ fontWeight: 'bold' }}>Per Unit</TableCell>
                                <TableCell rowSpan={2} align="center" sx={{ fontWeight: 'bold', verticalAlign: 'middle' }}>Total Rents</TableCell>
                            </TableRow>
                            <TableRow sx={{ bgcolor: 'grey.100' }}>
                                <TableCell align="center" sx={{ fontWeight: 'bold' }}>Begin Date</TableCell>
                                <TableCell align="center" sx={{ fontWeight: 'bold' }}>End Date</TableCell>
                                <TableCell align="center" sx={{ fontWeight: 'bold' }}>Unfurnished</TableCell>
                                <TableCell align="center" sx={{ fontWeight: 'bold' }}>Furnished</TableCell>
                                <TableCell align="center" sx={{ fontWeight: 'bold' }}>Unfurnished</TableCell>
                                <TableCell align="center" sx={{ fontWeight: 'bold' }}>Furnished</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {units.map((u) => {
                                const beginDateKey = `Unit # Lease Date  Begin Date ${u}`;
                                const endDateKey = `Unit # Lease Date End Date ${u}`;
                                const actualUnfurnishedKey = `Actual Rents Unit # ${u}  Per Unit Unfurnished`;
                                const actualFurnishedKey = `Actual Rents Unit # ${u}  Per Unit Furnished`;
                                const actualTotalKey = `Actual Rents Unit # ${u} Total Rents`;
                                const marketUnfurnishedKey = `Opinion Of Market Rent Unit # ${u} Per Unit Unfurnished`;
                                const marketFurnishedKey = `Opinion Of Market Rent Unit # ${u} Per Unit Furnished`;
                                const marketTotalKey = `Opinion Of Market Rent Unit # ${u} Total Rents`;

                                return (
                                    <TableRow key={u} hover>
                                        <TableCell align="center" sx={{ fontWeight: 'bold' }}>{u}</TableCell>
                                        <TableCell align="center">
                                            <EditableField
                                                fieldPath={[beginDateKey]}
                                                value={getValue(beginDateKey)}
                                                onDataChange={onDataChange}
                                                editingField={editingField}
                                                setEditingField={setEditingField}
                                                isEditable={isEditable}
                                                allData={allData}
                                                manualValidations={manualValidations}
                                                handleManualValidation={handleManualValidation}
                                            />
                                        </TableCell>
                                        <TableCell align="center">
                                            <EditableField
                                                fieldPath={[endDateKey]}
                                                value={getValue(endDateKey)}
                                                onDataChange={onDataChange}
                                                editingField={editingField}
                                                setEditingField={setEditingField}
                                                isEditable={isEditable}
                                                allData={allData}
                                                manualValidations={manualValidations}
                                                handleManualValidation={handleManualValidation}
                                            />
                                        </TableCell>
                                        <TableCell align="center">
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                {u === 1 && <span style={{ fontSize: '0.8rem', color: '#666' }}>$</span>}
                                                <EditableField
                                                    fieldPath={[actualUnfurnishedKey]}
                                                    value={getValue(actualUnfurnishedKey)}
                                                    onDataChange={onDataChange}
                                                    editingField={editingField}
                                                    setEditingField={setEditingField}
                                                    isEditable={isEditable}
                                                    allData={allData}
                                                    manualValidations={manualValidations}
                                                    handleManualValidation={handleManualValidation}
                                                />
                                            </Box>
                                        </TableCell>
                                        <TableCell align="center">
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                {u === 1 && <span style={{ fontSize: '0.8rem', color: '#666' }}>$</span>}
                                                <EditableField
                                                    fieldPath={[actualFurnishedKey]}
                                                    value={getValue(actualFurnishedKey)}
                                                    onDataChange={onDataChange}
                                                    editingField={editingField}
                                                    setEditingField={setEditingField}
                                                    isEditable={isEditable}
                                                    allData={allData}
                                                    manualValidations={manualValidations}
                                                    handleManualValidation={handleManualValidation}
                                                />
                                            </Box>
                                        </TableCell>
                                        <TableCell align="center">
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                {u === 1 && <span style={{ fontSize: '0.8rem', color: '#666' }}>$</span>}
                                                <EditableField
                                                    fieldPath={[actualTotalKey]}
                                                    value={getValue(actualTotalKey)}
                                                    onDataChange={onDataChange}
                                                    editingField={editingField}
                                                    setEditingField={setEditingField}
                                                    isEditable={isEditable}
                                                    allData={allData}
                                                    manualValidations={manualValidations}
                                                    handleManualValidation={handleManualValidation}
                                                />
                                            </Box>
                                        </TableCell>
                                        <TableCell align="center">
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                {u === 1 && <span style={{ fontSize: '0.8rem', color: '#666' }}>$</span>}
                                                <EditableField
                                                    fieldPath={[marketUnfurnishedKey]}
                                                    value={getValue(marketUnfurnishedKey)}
                                                    onDataChange={onDataChange}
                                                    editingField={editingField}
                                                    setEditingField={setEditingField}
                                                    isEditable={isEditable}
                                                    allData={allData}
                                                    manualValidations={manualValidations}
                                                    handleManualValidation={handleManualValidation}
                                                />
                                            </Box>
                                        </TableCell>
                                        <TableCell align="center">
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                {u === 1 && <span style={{ fontSize: '0.8rem', color: '#666' }}>$</span>}
                                                <EditableField
                                                    fieldPath={[marketFurnishedKey]}
                                                    value={getValue(marketFurnishedKey)}
                                                    onDataChange={onDataChange}
                                                    editingField={editingField}
                                                    setEditingField={setEditingField}
                                                    isEditable={isEditable}
                                                    allData={allData}
                                                    manualValidations={manualValidations}
                                                    handleManualValidation={handleManualValidation}
                                                />
                                            </Box>
                                        </TableCell>
                                        <TableCell align="center">
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                {u === 1 && <span style={{ fontSize: '0.8rem', color: '#666' }}>$</span>}
                                                <EditableField
                                                    fieldPath={[marketTotalKey]}
                                                    value={getValue(marketTotalKey)}
                                                    onDataChange={onDataChange}
                                                    editingField={editingField}
                                                    setEditingField={setEditingField}
                                                    isEditable={isEditable}
                                                    allData={allData}
                                                    manualValidations={manualValidations}
                                                    handleManualValidation={handleManualValidation}
                                                />
                                            </Box>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}

                            <TableRow>
                                <TableCell colSpan={3} rowSpan={3} sx={{ verticalAlign: 'top', bgcolor: 'grey.50' }}>
                                    <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 0.5 }}>Comment on lease data</Typography>
                                    <EditableField
                                        fieldPath={["Comment on lease data"]}
                                        value={getValue("Comment on lease data")}
                                        onDataChange={onDataChange}
                                        editingField={editingField}
                                        setEditingField={setEditingField}
                                        isEditable={isEditable}
                                        allData={allData}
                                        manualValidations={manualValidations}
                                        handleManualValidation={handleManualValidation}
                                    />
                                </TableCell>
                                <TableCell colSpan={2} sx={{ fontWeight: 'bold', bgcolor: 'grey.50' }}>Total Actual Monthly Rent</TableCell>
                                <TableCell>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                        <span style={{ fontSize: '0.8rem', color: '#666' }}>$</span>
                                        <EditableField
                                            fieldPath={["Total Actual Monthly Rent"]}
                                            value={getValue("Total Actual Monthly Rent")}
                                            onDataChange={onDataChange}
                                            editingField={editingField}
                                            setEditingField={setEditingField}
                                            isEditable={isEditable}
                                            allData={allData}
                                            manualValidations={manualValidations}
                                            handleManualValidation={handleManualValidation}
                                        />
                                    </Box>
                                </TableCell>
                                <TableCell colSpan={2} sx={{ fontWeight: 'bold', bgcolor: 'grey.50' }}> Total Gross Monthly Rent</TableCell>
                                <TableCell>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                        <span style={{ fontSize: '0.8rem', color: '#666' }}>$</span>
                                        <EditableField
                                            fieldPath={[" Total Gross Monthly Rent"]}
                                            value={getValue(" Total Gross Monthly Rent")}
                                            onDataChange={onDataChange}
                                            editingField={editingField}
                                            setEditingField={setEditingField}
                                            isEditable={isEditable}
                                            allData={allData}
                                            manualValidations={manualValidations}
                                            handleManualValidation={handleManualValidation}
                                        />
                                    </Box>
                                </TableCell>
                            </TableRow>

                            {/* Row 2 */}
                            <TableRow>
                                <TableCell colSpan={2} sx={{ fontWeight: 'bold', bgcolor: 'grey.50' }}>Other Monthly Income (itemize)</TableCell>
                                <TableCell>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                        <span style={{ fontSize: '0.8rem', color: '#666' }}>$</span>
                                        <EditableField
                                            fieldPath={["Other Monthly Income (itemize)"]}
                                            value={getValue("Other Monthly Income (itemize)")}
                                            onDataChange={onDataChange}
                                            editingField={editingField}
                                            setEditingField={setEditingField}
                                            isEditable={isEditable}
                                            allData={allData}
                                            manualValidations={manualValidations}
                                            handleManualValidation={handleManualValidation}
                                        />
                                    </Box>
                                </TableCell>
                                <TableCell colSpan={2} sx={{ fontWeight: 'bold', bgcolor: 'grey.50' }}>Other Monthly Income (itemize)</TableCell>
                                <TableCell>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                        <span style={{ fontSize: '0.8rem', color: '#666' }}>$</span>
                                        <EditableField
                                            fieldPath={["Other Monthly Income (itemize)"]}
                                            value={getValue("Other Monthly Income (itemize)")}
                                            onDataChange={onDataChange}
                                            editingField={editingField}
                                            setEditingField={setEditingField}
                                            isEditable={isEditable}
                                            allData={allData}
                                            manualValidations={manualValidations}
                                            handleManualValidation={handleManualValidation}
                                        />
                                    </Box>
                                </TableCell>
                            </TableRow>

                            {/* Row 3 */}
                            <TableRow>
                                <TableCell colSpan={2} sx={{ fontWeight: 'bold', bgcolor: 'grey.50' }}>Total Actual Monthly Income</TableCell>
                                <TableCell>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                        <span style={{ fontSize: '0.8rem', color: '#666' }}>$</span>
                                        <EditableField
                                            fieldPath={["Total Actual Monthly Income"]}
                                            value={getValue("Total Actual Monthly Income")}
                                            onDataChange={onDataChange}
                                            editingField={editingField}
                                            setEditingField={setEditingField}
                                            isEditable={isEditable}
                                            allData={allData}
                                            manualValidations={manualValidations}
                                            handleManualValidation={handleManualValidation}
                                        />
                                    </Box>
                                </TableCell>
                                <TableCell colSpan={2} sx={{ fontWeight: 'bold', bgcolor: 'grey.50' }}>Total Estimated Monthly Income</TableCell>
                                <TableCell>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                        <span style={{ fontSize: '0.8rem', color: '#666' }}>$</span>
                                        <EditableField
                                            fieldPath={["Total Estimated Monthly Income"]}
                                            value={getValue("Total Estimated Monthly Income")}
                                            onDataChange={onDataChange}
                                            editingField={editingField}
                                            setEditingField={setEditingField}
                                            isEditable={isEditable}
                                            allData={allData}
                                            manualValidations={manualValidations}
                                            handleManualValidation={handleManualValidation}
                                        />
                                    </Box>
                                </TableCell>
                            </TableRow>
                        </TableBody>
                    </Table>
                </TableContainer>

                <Box sx={{ p: 2, mt: 2, borderTop: '1px solid', borderColor: 'grey.200' }}>
                    <Box sx={{ mb: 2 }}>
                        <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 0.5 }}>
                            Utilities included in estimated rents
                        </Typography>
                        <EditableField
                            fieldPath={[" Utilities included in estimated rents"]}
                            value={getValue(" Utilities included in estimated rents")}
                            onDataChange={onDataChange}
                            editingField={editingField}
                            setEditingField={setEditingField}
                            isEditable={isEditable}
                            allData={allData}
                            manualValidations={manualValidations}
                            handleManualValidation={handleManualValidation}
                        />
                    </Box>
                    <Box sx={{ mb: 1 }}>
                        <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 0.5 }}>
                            Comments on actual or estimated rents and other monthly income (including personal property)
                        </Typography>
                        <EditableField
                            fieldPath={["Comments on actual or estimated rents and other monthly income (including personal property)"]}
                            value={getValue("Comments on actual or estimated rents and other monthly income (including personal property)")}
                            onDataChange={onDataChange}
                            editingField={editingField}
                            setEditingField={setEditingField}
                            isEditable={isEditable}
                            allData={allData}
                            manualValidations={manualValidations}
                            handleManualValidation={handleManualValidation}
                        />
                    </Box>
                </Box>
            </div>
        </Paper>
    );
};

export const ComparableAddressConsistency = ({ data, comparableSales, extractionAttempted, onDataChange, editingField, setEditingField, isEditable, allData }) => {
    return (
        <Paper id="comparable-address-consistency-section" elevation={1} sx={{ mb: 4, borderRadius: 2, overflow: 'hidden', borderTop: '3px solid', borderTopColor: 'grey.900' }}>
            <Box sx={{ bgcolor: 'grey.50', color: 'text.primary', borderBottom: '1px solid', borderColor: 'grey.200', px: 2, py: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 10 }}>
                <Typography variant="h6" component="h5" sx={{ flexGrow: 1, textAlign: 'center', fontSize: '1.05rem', fontWeight: 'bold' }}>Comparable Address Consistency Check</Typography>
            </Box>
            <div className="card-body p-0 table-container">
                <table className="table table-hover table-striped mb-0">
                    <thead className="table-light">
                        <tr>
                            <th>Comparable Sale #</th>
                            <th>Sales Comparison Approach Address</th>
                            <th>Location Map Address</th>
                            <th>Photo Section Address</th>
                            <th>is label correct?</th>
                            <th>duplicate photo?</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {comparableSales.map((sale, index) => {
                            const compNum = index + 1;
                            const salesGridAddress = data[sale]?.Address || '';
                            const locationMapAddress = data[`Location Map Address ${compNum}`] || '';
                            const photoAddress = data[`Comparable Photo Address ${compNum}`] || '';
                            const matchingPhoto = data[`is label correct? ${compNum}`] || '';
                            const duplicatePhoto = data[`duplicate photo? ${compNum}`] || '';

                            const getFirstThreeWords = (str) => str.split(/\s+/).slice(0, 3).join(' ').toLowerCase();

                            const allAddresses = [salesGridAddress, locationMapAddress, photoAddress];
                            const validAddresses = allAddresses.filter(Boolean);

                            let isConsistent = false;
                            if (validAddresses.length < 2) {
                                isConsistent = true;
                            } else {
                                const shortAddresses = validAddresses.map(getFirstThreeWords);
                                const uniqueShortAddresses = new Set(shortAddresses);
                                if (uniqueShortAddresses.size < shortAddresses.length) {
                                    isConsistent = true;
                                }
                            }

                            const isMissingSalesGrid = false;
                            const isMissingLocationMap = false;
                            const isMissingPhoto = false;

                            return (
                                <tr key={sale}>
                                    <td style={{ fontWeight: 'bold' }}>{`Comparable Sale #${compNum}`}</td>
                                    <td style={isMissingSalesGrid ? { border: '2px solid red' } : {}}>
                                        <EditableField
                                            fieldPath={[sale, 'Address']}
                                            value={salesGridAddress}
                                            onDataChange={onDataChange}
                                            editingField={editingField}
                                            setEditingField={setEditingField} allData={allData}
                                            isMissing={isMissingSalesGrid} isEditable={isEditable}
                                        />
                                    </td>
                                    <td style={isMissingLocationMap ? { border: '2px solid red' } : {}}>
                                        <EditableField
                                            fieldPath={[`Location Map Address ${compNum}`]}
                                            value={locationMapAddress}
                                            onDataChange={onDataChange}
                                            editingField={editingField}
                                            setEditingField={setEditingField}
                                            isMissing={isMissingLocationMap} allData={allData}
                                            isEditable={isEditable}
                                        />
                                    </td>
                                    <td style={isMissingPhoto ? { border: '2px solid red' } : {}}>
                                        <EditableField
                                            fieldPath={[`Comparable Photo Address ${compNum}`]}
                                            value={photoAddress}
                                            onDataChange={onDataChange}
                                            editingField={editingField}
                                            setEditingField={setEditingField}
                                            isMissing={isMissingPhoto} allData={allData}
                                            isEditable={isEditable}
                                        />
                                    </td>
                                    <td>
                                        <EditableField
                                            fieldPath={[`is label correct? ${compNum}`]}
                                            value={matchingPhoto}
                                            onDataChange={onDataChange}
                                            editingField={editingField}
                                            setEditingField={setEditingField} allData={allData}
                                            isEditable={isEditable} />
                                    </td>
                                    <td>
                                        <EditableField
                                            fieldPath={[`duplicate photo? ${compNum}`]}
                                            value={duplicatePhoto}
                                            onDataChange={onDataChange}
                                            editingField={editingField}
                                            setEditingField={setEditingField} allData={allData}
                                            isEditable={isEditable} />
                                    </td>
                                    <td style={{ textAlign: 'center' }}>
                                        {validAddresses.length > 0 && (isConsistent ? <CheckCircleOutlineIcon style={{ color: 'green' }} /> : <ErrorOutlineIcon style={{ color: 'red' }} />)}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </Paper>
    );
};

export const MarketConditionsTable = ({ data, marketConditionsRows, marketConditionsFields, extractionAttempted, onDataChange, editingField, setEditingField, isEditable, allData }) => {
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
        <TableContainer component={Paper} sx={{ marginTop: '20px', marginBottom: '20px' }}>
            <Table className="table mb-20" style={{ marginTop: '20px' }} size="small" aria-label="market-conditions-table">
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
                            <TableRow key={row.label}>
                                <TableCell component="th" scope="row" sx={{ border: '1px solid rgba(224, 224, 224, 1)' }}>
                                    {row.label}
                                </TableCell>
                                {timeframes.map(tf => {
                                    const value = getMarketConditionValue(row, tf);
                                    const isGrayCell = isGrayRow && tf !== "Current-3 Months";
                                    return (
                                        <TableCell key={tf} align="center" sx={{ border: '1px solid rgba(224, 224, 224, 1)', backgroundColor: isGrayCell ? '#e0e0e0' : 'inherit' }}>
                                            {value}
                                        </TableCell>
                                    );
                                })}
                            </TableRow>
                        );

                        return elements;
                    })}
                </TableBody>
            </Table>
            <Box sx={{ p: 2 }}>
                {marketConditionsFields.map(field => {
                    if (marketConditionsRows.some(row => row.fullLabel.includes(field) || field.includes(row.fullLabel))) return null;

                    return (
                        <Box key={field} sx={{ mb: 2 }}>
                            <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold' }}>
                                {field}
                            </Typography>
                            <EditableField
                                fieldPath={['MARKET_CONDITIONS', field]}
                                value={data?.MARKET_CONDITIONS?.[field] || ''}
                                onDataChange={onDataChange}
                                editingField={editingField}
                                setEditingField={setEditingField} allData={allData}
                                isEditable={isEditable}
                            />
                        </Box>
                    );
                })}
            </Box>
        </TableContainer>
    );
};

export const CondoCoopProjectsTable = ({ id, title, data, onDataChange, editingField, setEditingField, isEditable, condoCoopProjectsRows, condoCoopProjectsFields, extractionAttempted, allData }) => {
    const timeframes = ["Prior 7–12 Months", "Prior 4–6 Months", "Current – 3 Months", "Overall Trend"];

    const getTableValue = (fullLabel, timeframe) => {
        const projectData = data?.CONDO_COOP_PROJECTS ?? data ?? {};
        const key = `${fullLabel} (${timeframe})`;
        return projectData[key] ?? '';
    };

    return (
        <div id={id} className="card shadow mb-4">
            <div className="card-header CAR1 bg-primary text-white" style={{ position: 'sticky', top: 0, zIndex: 10 }}>
                <strong>{title}</strong>
            </div>
            <div className="card-body p-0 table-container">
                <TableContainer component={Paper}>
                    <Table size="small" aria-label="condo-coop-projects-table">
                        <TableHead>
                            <TableRow>
                                <TableCell sx={{ fontWeight: 'bold', width: '30%', backgroundColor: '#e0e0e0', border: '1px solid rgba(224, 224, 224, 1)' }}>Subject Project Data</TableCell>
                                {timeframes.map(tf => (
                                    <TableCell key={tf} align="center" sx={{ fontWeight: 'bold', backgroundColor: '#e0e0e0', border: '1px solid rgba(224, 224, 224, 1)' }}>{tf}</TableCell>
                                ))}
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {condoCoopProjectsRows.map(row => {
                                const isGrayRow = [
                                    "Total # of Comparable Active Listings",
                                    "Total # of Active Comparable Listings",
                                    "Months of Unit Supply (Total Listings/Ab.Rate)"
                                ].includes(row.label);

                                return (
                                    <TableRow key={row.label} hover>
                                        <TableCell component="th" scope="row" sx={{ fontWeight: 'medium', border: '1px solid rgba(224, 224, 224, 1)' }}>{row.label}</TableCell>
                                        {timeframes.map(tf => {
                                            const fieldName = `${row.fullLabel} (${tf})`;
                                            const value = getTableValue(row.fullLabel, tf);
                                            const isMissing = false;
                                            const isGrayCell = isGrayRow && tf !== "Current – 3 Months";
                                            return (
                                                <TableCell key={tf} align="center" sx={{ border: '1px solid rgba(224, 224, 224, 1)', backgroundColor: isGrayCell ? '#e0e0e0' : 'inherit' }}>
                                                    <EditableField fieldPath={['CONDO_COOP_PROJECTS', fieldName]} value={value} onDataChange={onDataChange} editingField={editingField} setEditingField={setEditingField} isEditable={isEditable} isMissing={isMissing} allData={allData} customValidation={checkCondoCoopProjectsTableFields} />
                                                </TableCell>
                                            );
                                        })}
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </TableContainer>
            </div>
        </div>
    );
};

export const SalesComparisonSection = ({ data, salesGridRows, comparableSales, extractionAttempted, handleDataChange, editingField, setEditingField, formType, comparisonData, getComparisonStyle, isEditable, allData }) => {
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

    const getSubjectValue = (row) => {
        const s1 = (typeof data?.Subject === 'object' && data.Subject) || {};
        const s2 = (typeof data?.SUBJECT === 'object' && data.SUBJECT) || {};
        const s3 = (data?.SALES_GRID && typeof data.SALES_GRID.Subject === 'object' && data.SALES_GRID.Subject) || {};
        const subjectData = { ...s2, ...s1, ...s3 };
        let value = subjectData[row.valueKey] ?? subjectData[row.subjectValueKey] ?? data?.[row.subjectValueKey] ?? data?.[row.valueKey] ?? '';
        return value;
    };

    return (
        <div id="sales-comparison" className="card shadow mb-4">
            <div className="card-header CAR1 bg-dark text-white" style={{ position: 'sticky', top: 0, zIndex: 10 }}>

            </div>
            <div className="card-body p-0 table-container" style={{ overflowX: 'auto' }}>
                <table className="table table-hover table-striped mb-0 sales-comparison-table">
                    <thead className="table-light">
                        <tr>
                            <th style={{ minWidth: '200px' }}>Feature</th>
                            <th style={{ minWidth: '200px' }}>Subject</th>
                            {comparableSales.map((sale, index) => (
                                <th key={sale} style={{ minWidth: '200px' }}>{`Comparable Sale #${index + 1}`}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {salesGridRows.flatMap((row, rowIndex) => {
                            const rows = [];
                            const subjectValue = getSubjectValue(row);

                            rows.push(
                                <tr key={`${row.label}-${rowIndex}`}>
                                    <td style={{ fontWeight: 'bold' }}>{row.label}</td>
                                    <td>
                                        {row.isAdjustmentOnly ? '' : (
                                            <EditableField
                                                fieldPath={['Subject', row.subjectValueKey || row.valueKey]}
                                                value={subjectValue}
                                                onDataChange={handleDataChange}
                                                isEditable={isEditable} allData={allData}
                                            />
                                        )}
                                    </td>
                                    {comparableSales.map((sale, compIndex) => {
                                        const compData = getCompData(sale);
                                        const value = compData[row.valueKey] ?? compData[row.valueKey?.replace('of Comparable', 'of Comparables')] ?? compData[row.valueKey?.replace('of Comparables', 'of Comparable')] ?? '';
                                        const isMissing = false;
                                        return (
                                            <td key={`${sale}-${row.label}`} style={isMissing ? { border: '2px solid red' } : {}}>
                                                {row.isAdjustmentOnly ? '' : (
                                                    <EditableField
                                                        fieldPath={[sale, row.valueKey]}
                                                        value={value}
                                                        onDataChange={handleDataChange}
                                                        editingField={editingField}
                                                        setEditingField={setEditingField}
                                                        isEditable={isEditable} allData={allData} />
                                                )}
                                            </td>
                                        );
                                    })}
                                </tr>
                            );

                            if (row.adjustmentKey) {
                                rows.push(
                                    <tr key={`${row.label}-adj-${rowIndex}`} className="adjustment-row">
                                        <td style={{ paddingLeft: '2rem' }}>
                                            <i>Adjustment</i>
                                        </td>
                                        <td></td>
                                        {comparableSales.map((sale, compIndex) => {
                                            const compData = getCompData(sale);
                                            const rawAdjValue = compData[row.adjustmentKey];
                                            const adjValue = (row.adjustmentKey === 'Baths Adjustment' && (rawAdjValue === undefined || rawAdjValue === ''))
                                                ? (compData['Above Grade Room Count Adjustment'] || '')
                                                : (rawAdjValue || '');
                                            const isMissing = false;
                                            return (
                                                <td key={`${sale}-${row.adjustmentKey}`} style={isMissing ? { border: '2px solid red' } : {}}>
                                                    <EditableField
                                                        fieldPath={[sale, row.adjustmentKey]}
                                                        value={adjValue}
                                                        onDataChange={handleDataChange}
                                                        editingField={editingField}
                                                        setEditingField={setEditingField}
                                                        isEditable={isEditable}
                                                        allData={allData} />
                                                </td>
                                            );
                                        })}
                                    </tr>
                                );
                            }

                            return rows;
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export const ComparisonResultTable = ({ result }) => {
    if (!result || result.length === 0) {
        return <Alert severity="success" sx={{ mt: 2 }}>No differences found.</Alert>;
    }
    return (
        <TableContainer component={Paper} sx={{ mt: 2 }}>
            <Table stickyHeader aria-label="comparison results table">
                <TableHead>
                    <TableRow>
                        <TableCell sx={{ fontWeight: 'bold' }}>Field</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>Value from HTML</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>Value from PDF</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }} align="center">Status</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {result.map((item, index) => (
                        <TableRow key={index} hover>
                            <TableCell>{item.field}</TableCell>
                            <TableCell>{item.html_value}</TableCell>
                            <TableCell>{item.pdf_value}</TableCell>
                            <TableCell align="center">
                                {item.status === 'Match' ? (
                                    <CheckCircleOutlineIcon color="success" />
                                ) : (
                                    <ErrorOutlineIcon color="error" />
                                )}
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </TableContainer>
    );
};
