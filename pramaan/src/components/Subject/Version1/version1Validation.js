const checkFormIsV1 = (data) => {
    if (!data) return false;
    const ft = String(data.formType || data.form_type || data.selected_form_type || data.selectedFormType || '').trim();
    if (!ft) return true;
    return ft === 'Appraisal Version #1' || ft === 'Version 1' || ft === 'Version1';
};

export const checkVersion1UtilitySubfields = (field, text, data) => {
    if (!checkFormIsV1(data)) return null;
    const isElectricitySubField = ['Electricity Detail', 'Electricity Private Utility Impact', 'Electricity Comment'].includes(field);
    const isSewerSubField = ['Sanitary Sewer Detail', 'Sanitary Sewer Private Utility Impact', 'Sanitary Sewer Comment'].includes(field);
    const isWaterSubField = ['Water Detail', 'Water Private Utility Impact', 'Water Comment'].includes(field);

    if (!isElectricitySubField && !isSewerSubField && !isWaterSubField) return null;

    let utilityName = '';
    if (isElectricitySubField) utilityName = 'Electricity';
    else if (isSewerSubField) utilityName = 'Sanitary Sewer';
    else if (isWaterSubField) utilityName = 'Water';

    const utilityVal = String(data?.SITE?.[utilityName] || '').trim().toLowerCase();
    const isPrivate = utilityVal === 'private';

    const isValBlank = text === undefined || text === null || (typeof text === 'string' && text.trim() === '') || (typeof text === 'object' && Object.values(text).every(v => v === undefined || v === null || String(v).trim() === ''));

    if (isPrivate) {
        if (isValBlank) {
            return {
                isError: true,
                message: `'${field}' should not be blank.`,
                skipBlankFilter: true
            };
        }
    }
    return null;
};

export const checkZoningClassificationDescription = (field, text, data) => {
    if (!checkFormIsV1(data)) return null;
    const validFields = ['Zoning Classification Description', 'Classification Code Description'];
    if (!validFields.includes(field)) return null;

    const value = String(text || '').trim();
    if (!value) return null;

    if (/\b(agriculture|agricultural|agribusiness|agri|agr)\b/i.test(value)) {
        return {
            isError: true,
            message: "Critical Field: 'agriculture' or 'agricultural' or 'agribusiness' or 'agri' or 'agr'. Please review."
        };
    }

    return { isMatch: true };
};

const normalizeAreaValue = (val) => {
    if (!val) return '';
    let cleaned = String(val).trim().toLowerCase();

    cleaned = cleaned.replace(/,/g, '');

    cleaned = cleaned.replace(/\s*(sf|sq\s*ft|sq\.\s*ft\.|square\s*feet)$/, '');

    cleaned = cleaned.replace(/\s*(ac|acres?)$/, '');

    return cleaned.trim();
};

export const checkSiteSizesConsistency = (field, text, data) => {
    if (!checkFormIsV1(data)) return null;
    const targetFields = ['Site Size', 'Site', 'Total Site Size', 'Parcel Size'];
    if (!targetFields.includes(field) || !data) return null;

    const siteSizeSalesGrid = String(data.Subject?.['Site Size'] || data.Subject?.['Site'] || '').trim();
    const totalSiteSize = String(data.SITE?.['Total Site Size'] || '').trim();
    const parcelSize = String(data.SITE?.['Parcel Size'] || '').trim();

    if (!siteSizeSalesGrid || !totalSiteSize || !parcelSize) return null;

    const normSalesGrid = normalizeAreaValue(siteSizeSalesGrid);
    const normTotalSiteSize = normalizeAreaValue(totalSiteSize);
    const normParcelSize = normalizeAreaValue(parcelSize);

    if (normSalesGrid !== normTotalSiteSize || normTotalSiteSize !== normParcelSize || normSalesGrid !== normParcelSize) {
        return {
            isError: true,
            message: `Values for 'Site Size in sales grid' (${siteSizeSalesGrid || 'blank'}), 'Total Site Size' (${totalSiteSize || 'blank'}), and 'Parcel Size' (${parcelSize || 'blank'}) must be the same.`
        };
    }

    return { isMatch: true };
};

const normalizeDateValue = (val) => {
    if (!val) return '';
    const cleaned = String(val).trim().replace(/-/g, '/');
    const d = new Date(cleaned);
    if (!isNaN(d.getTime())) {
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${month}/${day}/${year}`;
    }
    return cleaned.toLowerCase();
};

export const checkVersion1EffectiveDatesConsistency = (field, text, data) => {
    if (!checkFormIsV1(data)) return null;
    const targetFields = ['Effective Date of Appraisal', 'Inspection Date', 'Effective Date'];
    if (!targetFields.includes(field) || !data) return null;

    const val1 = String(data['Effective Date of Appraisal'] || '').trim();
    const val2 = String(data['Inspection Date'] || '').trim();

    const val3 = String(data['Effective Date'] || '').trim();
    const val4 = String(data.RECONCILIATION?.['Effective Date of Appraisal'] || '').trim();

    if (!val1 && !val2 && !val3 && !val4) return null;

    const normVal1 = normalizeDateValue(val1);
    const normVal2 = normalizeDateValue(val2);
    const normVal3 = normalizeDateValue(val3);
    const normVal4 = normalizeDateValue(val4);

    if (normVal1 !== normVal2 || normVal2 !== normVal3 || normVal3 !== normVal4 || normVal1 !== normVal4) {
        return {
            isError: true,
            skipBlankFilter: true,
            message: `Effective Dates must be identical. SUMMARY Effective Date of Appraisal: ${val1 || 'blank'}, CONTACT Inspection Date: ${val2 || 'blank'}, COST APPROACH Effective Date: ${val3 || 'blank'}, RECONCILIATION Effective Date of Appraisal: ${val4 || 'blank'}`
        };
    }

    return { isMatch: true };
};

export const checkAboveGradeFinishedAreaConsistency = (field, text, data) => {
    if (!checkFormIsV1(data)) return null;
    const targetFields = ['Above Grade Finished Area', 'Finished Area Above Grade'];
    if (!targetFields.includes(field) || !data) return null;

    const val1 = String(data['Above Grade Finished Area'] || '').trim();

    const val2 = String(data.Subject?.['Finished Area Above Grade'] || '').trim();

    if (!val1 || !val2) return null;

    const normalizeArea = (val) => {
        if (!val) return '';
        let cleaned = String(val).trim().toLowerCase();
        cleaned = cleaned.replace(/,/g, '');
        cleaned = cleaned.replace(/\s*(sf|sq\s*ft|sq\.\s*ft\.|square\s*feet|sqft)$/, '');
        return cleaned.trim();
    };

    const norm1 = normalizeArea(val1);
    const norm2 = normalizeArea(val2);

    if (norm1 !== norm2) {
        return {
            isError: true,
            skipBlankFilter: true,
            message: `Above Grade Finished Area values must be the same. Improvements: ${val1}, Sales Comparison Grid: ${val2}`
        };
    }

    return { isMatch: true };
};

export const checkYearBuiltConsistency = (field, text, data) => {
    if (!checkFormIsV1(data)) return null;
    const targetFields = ['Year Built'];
    if (!targetFields.includes(field) || !data) return null;

    const val1 = String(data['Year Built'] || '').trim();

    const val2 = String(data.Subject?.['Year Built'] || '').trim();

    if (!val1 || !val2) return null;

    if (val1 !== val2) {
        return {
            isError: true,
            skipBlankFilter: true,
            message: `Year Built values must be the same. Improvements: ${val1}, Sales Comparison Grid: ${val2}`
        };
    }

    return { isMatch: true };
};

export const checkAppraiserNameConsistency = (field, text, data) => {
    if (!checkFormIsV1(data)) return null;
    const targetFields = ['Appraiser Name'];
    if (!targetFields.includes(field) || !data) return null;

    const val1 = String(data['Appraiser Name'] || data.APPRAISER?.['Appraiser Name'] || '').trim();

    const val2 = String(data.CERTIFICATION?.['Appraiser Name'] || '').trim();

    if (!val1 || !val2) return null;

    if (val1.toLowerCase() !== val2.toLowerCase()) {
        return {
            isError: true,
            skipBlankFilter: true,
            message: `Appraiser Name must be identical across sections. Contact/Summary: '${val1}', Certifications: '${val2}'`
        };
    }

    return { isMatch: true };
};

export const checkVersion1ComparableListingStatusConsistency = (field, text, data) => {
    if (!checkFormIsV1(data)) return null;
    if (field !== 'Listing Status' || !data) return null;

    const comparableSales = [
        'COMPARABLE SALE #1', 'COMPARABLE SALE #2', 'COMPARABLE SALE #3',
        'COMPARABLE SALE #4', 'COMPARABLE SALE #5', 'COMPARABLE SALE #6'
    ];

    const values = [];
    comparableSales.forEach(comp => {
        const val = String(data[comp]?.['Listing Status'] || '').trim();
        if (val) {
            values.push({ comp, val });
        }
    });

    if (values.length < 2) return null;

    const firstVal = values[0].val.toLowerCase();
    const hasMismatch = values.some(item => item.val.toLowerCase() !== firstVal);

    if (hasMismatch) {
        const details = values.map(item => `${item.comp.replace('COMPARABLE SALE #', 'Comp ')}: '${item.val}'`).join(', ');
        return {
            isError: true,
            skipBlankFilter: true,
            message: `Listing Status must be the same for all comparables. ${details}`
        };
    }

    return { isMatch: true };
};

export const checkVersion1ComparableTransferTermsConsistency = (field, text, data) => {
    if (!checkFormIsV1(data)) return null;
    if (field !== 'Transfer Terms' || !data) return null;

    const comparableSales = [
        'COMPARABLE SALE #1', 'COMPARABLE SALE #2', 'COMPARABLE SALE #3',
        'COMPARABLE SALE #4', 'COMPARABLE SALE #5', 'COMPARABLE SALE #6'
    ];

    const values = [];
    comparableSales.forEach(comp => {
        const val = String(data[comp]?.['Transfer Terms'] || '').trim();
        if (val) {
            values.push({ comp, val });
        }
    });

    if (values.length < 2) return null;

    const firstVal = values[0].val.toLowerCase();
    const hasMismatch = values.some(item => item.val.toLowerCase() !== firstVal);

    if (hasMismatch) {
        const details = values.map(item => `${item.comp.replace('COMPARABLE SALE #', 'Comp ')}: '${item.val}'`).join(', ');
        return {
            isError: true,
            skipBlankFilter: true,
            message: `Transfer Terms must be the same for all comparables. ${details}`
        };
    }

    return { isMatch: true };
};

export const checkVersion1YearBuiltAdjustmentConsistency = (field, text, data, fieldPath, saleName) => {
    if (!checkFormIsV1(data)) return null;
    const isYearBuilt = field === 'Year Built';
    const isAdjustment = field === 'Year Built Adjustment';
    if ((!isYearBuilt && !isAdjustment) || !data) return null;

    const compName = saleName || (fieldPath && fieldPath[0]);
    if (!compName || compName === 'Subject' || !compName.startsWith('COMPARABLE SALE #')) return null;

    const subjectYearStr = String(data.Subject?.['Year Built'] || '').trim();
    const compYearStr = String(data[compName]?.['Year Built'] || '').trim();
    const adjustmentStr = String(data[compName]?.['Year Built Adjustment'] || '').trim();

    if (!subjectYearStr || !compYearStr) return null;

    const subjectYear = parseInt(subjectYearStr, 10);
    const compYear = parseInt(compYearStr, 10);

    if (isNaN(subjectYear) || isNaN(compYear)) return null;

    if (subjectYear === compYear) {
        return { isMatch: true };
    } else {
        const hasAdjustment = adjustmentStr !== '';
        if (hasAdjustment) {
            return { isMatch: true };
        } else {
            return {
                isError: true,
                skipBlankFilter: true,
                message: `${compName.replace('COMPARABLE SALE #', 'Comparable Sale ')} Year Built (${compYear}) differs from Subject Year Built (${subjectYear}). An adjustment must be entered.`
            };
        }
    }
};

export const checkVersion1ConstructionMethodAdjustmentConsistency = (field, text, data, fieldPath, saleName) => {
    if (!checkFormIsV1(data)) return null;
    const isConstructionMethod = field === 'Construction Method';
    const isAdjustment = field === 'Construction Method Adjustment';
    if ((!isConstructionMethod && !isAdjustment) || !data) return null;

    const compName = saleName || (fieldPath && fieldPath[0]);
    if (!compName || compName === 'Subject' || !compName.startsWith('COMPARABLE SALE #')) return null;

    const subjectMethod = String(data.Subject?.['Construction Method'] || '').trim();
    const compMethod = String(data[compName]?.['Construction Method'] || '').trim();
    const adjustmentStr = String(data[compName]?.['Construction Method Adjustment'] || '').trim();

    if (!subjectMethod || !compMethod) return null;

    if (subjectMethod.toLowerCase() === compMethod.toLowerCase()) {
        return { isMatch: true };
    } else {
        const hasAdjustment = adjustmentStr !== '';
        if (hasAdjustment) {
            return { isMatch: true };
        } else {
            return {
                isError: true,
                skipBlankFilter: true,
                message: `${compName.replace('COMPARABLE SALE #', 'Comparable Sale ')} Construction Method ('${compMethod}') differs from Subject Construction Method ('${subjectMethod}'). An adjustment must be entered.`
            };
        }
    }
};

export const checkVersion1SiteSizeAdjustmentConsistency = (field, text, data, fieldPath, saleName) => {
    if (!checkFormIsV1(data)) return null;
    const isSiteSize = field === 'Site Size';
    const isAdjustment = field === 'Site Size Adjustment';
    if ((!isSiteSize && !isAdjustment) || !data) return null;

    const compName = saleName || (fieldPath && fieldPath[0]);
    if (!compName || compName === 'Subject' || !compName.startsWith('COMPARABLE SALE #')) return null;

    const subjectSizeStr = String(data.Subject?.['Site Size'] || '').trim();
    const compSizeStr = String(data[compName]?.['Site Size'] || '').trim();
    const adjustmentStr = String(data[compName]?.['Site Size Adjustment'] || '').trim();

    if (!subjectSizeStr || !compSizeStr) return null;

    const normSubject = normalizeAreaValue(subjectSizeStr);
    const normComp = normalizeAreaValue(compSizeStr);

    if (normSubject === normComp) {
        return { isMatch: true };
    } else {
        const hasAdjustment = adjustmentStr !== '';
        if (hasAdjustment) {
            return { isMatch: true };
        } else {
            return {
                isError: true,
                skipBlankFilter: true,
                message: `${compName.replace('COMPARABLE SALE #', 'Comparable Sale ')} Site Size (${compSizeStr}) differs from Subject Site Size (${subjectSizeStr}). An adjustment must be entered.`
            };
        }
    }
};

export const checkVersion1LocationAdjustmentConsistency = (field, text, data, fieldPath, saleName) => {
    if (!checkFormIsV1(data)) return null;
    const isLocation = field === 'Site Influence (Location)' || field === 'Location';
    const isAdjustment = field === 'Location Adjustment';
    if ((!isLocation && !isAdjustment) || !data) return null;

    const compName = saleName || (fieldPath && fieldPath[0]);
    if (!compName || compName === 'Subject' || !compName.startsWith('COMPARABLE SALE #')) return null;

    const subjectLoc = String(data.Subject?.['Site Influence (Location)'] || '').trim();
    const compLoc = String(data[compName]?.['Site Influence (Location)'] || '').trim();
    const adjustmentStr = String(data[compName]?.['Location Adjustment'] || '').trim();

    if (!subjectLoc || !compLoc) return null;

    if (subjectLoc.toLowerCase() === compLoc.toLowerCase()) {
        return { isMatch: true };
    } else {
        const hasAdjustment = adjustmentStr !== '';
        if (hasAdjustment) {
            return { isMatch: true };
        } else {
            return {
                isError: true,
                skipBlankFilter: true,
                message: `${compName.replace('COMPARABLE SALE #', 'Comparable Sale ')} Location ('${compLoc}') differs from Subject Location ('${subjectLoc}'). An adjustment must be entered.`
            };
        }
    }
};

export const checkVersion1AttachedDetachedAdjustmentConsistency = (field, text, data, fieldPath, saleName) => {
    if (!checkFormIsV1(data)) return null;
    const isAttachedDetached = field === 'Attached / Detached';
    const isAdjustment = field === 'Attached / Detached Adjustment';
    if ((!isAttachedDetached && !isAdjustment) || !data) return null;

    const compName = saleName || (fieldPath && fieldPath[0]);
    if (!compName || compName === 'Subject' || !compName.startsWith('COMPARABLE SALE #')) return null;

    const subjectVal = String(data.Subject?.['Attached / Detached'] || '').trim();
    const compVal = String(data[compName]?.['Attached / Detached'] || '').trim();
    const adjustmentStr = String(data[compName]?.['Attached / Detached Adjustment'] || '').trim();

    if (!subjectVal || !compVal) return null;

    if (subjectVal.toLowerCase() === compVal.toLowerCase()) {
        return { isMatch: true };
    } else {
        const hasAdjustment = adjustmentStr !== '';
        if (hasAdjustment) {
            return { isMatch: true };
        } else {
            return {
                isError: true,
                skipBlankFilter: true,
                message: `${compName.replace('COMPARABLE SALE #', 'Comparable Sale ')} Attached/Detached ('${compVal}') differs from Subject Attached/Detached ('${subjectVal}'). An adjustment must be entered.`
            };
        }
    }
};

export const checkVersion1HeatingAdjustmentConsistency = (field, text, data, fieldPath, saleName) => {
    if (!checkFormIsV1(data)) return null;
    const isHeating = field === 'Heating';
    const isAdjustment = field === 'Heating Adjustment';
    if ((!isHeating && !isAdjustment) || !data) return null;

    const compName = saleName || (fieldPath && fieldPath[0]);
    if (!compName || compName === 'Subject' || !compName.startsWith('COMPARABLE SALE #')) return null;

    const subjectVal = String(data.Subject?.['Heating'] || '').trim();
    const compVal = String(data[compName]?.['Heating'] || '').trim();
    const adjustmentStr = String(data[compName]?.['Heating Adjustment'] || '').trim();

    if (!subjectVal || !compVal) return null;

    if (subjectVal.toLowerCase() === compVal.toLowerCase()) {
        return { isMatch: true };
    } else {
        const hasAdjustment = adjustmentStr !== '';
        if (hasAdjustment) {
            return { isMatch: true };
        } else {
            return {
                isError: true,
                skipBlankFilter: true,
                message: `${compName.replace('COMPARABLE SALE #', 'Comparable Sale ')} Heating ('${compVal}') differs from Subject Heating ('${subjectVal}'). An adjustment must be entered.`
            };
        }
    }
};

export const checkVersion1AmenitiesAdjustmentConsistency = (field, text, data, fieldPath, saleName) => {
    if (!checkFormIsV1(data)) return null;
    const isAmenities = field === 'Amenities';
    const isAdjustment = field === 'Amenities Adjustment';
    if ((!isAmenities && !isAdjustment) || !data) return null;

    const compName = saleName || (fieldPath && fieldPath[0]);
    if (!compName || compName === 'Subject' || !compName.startsWith('COMPARABLE SALE #')) return null;

    const subjectVal = String(data.Subject?.['Amenities'] || '').trim();
    const compVal = String(data[compName]?.['Amenities'] || '').trim();
    const adjustmentStr = String(data[compName]?.['Amenities Adjustment'] || '').trim();

    if (!subjectVal || !compVal) return null;

    if (subjectVal.toLowerCase() === compVal.toLowerCase()) {
        return { isMatch: true };
    } else {
        const hasAdjustment = adjustmentStr !== '';
        if (hasAdjustment) {
            return { isMatch: true };
        } else {
            return {
                isError: true,
                skipBlankFilter: true,
                message: `${compName.replace('COMPARABLE SALE #', 'Comparable Sale ')} Amenities ('${compVal}') differs from Subject Amenities ('${subjectVal}'). An adjustment must be entered.`
            };
        }
    }
};

export const checkVersion1QualityConditionConsistency = (field, text, data, fieldPath, saleName) => {
    if (!checkFormIsV1(data)) return null;
    const validFields = ['Exterior Quality', 'Exterior Condition', 'Interior Quality', 'Interior Condition'];
    if (!validFields.includes(field) || !data) return null;

    const compName = saleName || (fieldPath && fieldPath[0]);
    if (!compName || compName === 'Subject' || !compName.startsWith('COMPARABLE SALE #')) return null;

    const subjectVal = String(data.Subject?.[field] || '').trim();
    const compVal = String(data[compName]?.[field] || '').trim();

    if (!subjectVal || !compVal) return null;

    if (subjectVal.toLowerCase() === compVal.toLowerCase()) {
        return { isMatch: true };
    } else {
        return {
            isError: true,
            skipBlankFilter: true,
            message: `${compName.replace('COMPARABLE SALE #', 'Comparable Sale ')} ${field} ('${compVal}') differs from Subject ${field} ('${subjectVal}').`
        };
    }
};

export const checkVersion1AreaAdjustmentConsistency = (field, text, data, fieldPath, saleName) => {
    if (!checkFormIsV1(data)) return null;
    const validFields = ['Finished Area Above Grade', 'Finished Area Below Grade', 'Unfinished Area Below Grade'];
    const validAdjustments = ['Finished Area Above Grade Adjustment', 'Finished Area Below Grade Adjustment', 'Unfinished Area Below Grade Adjustment'];

    const isField = validFields.includes(field);
    const isAdjustment = validAdjustments.includes(field);
    if ((!isField && !isAdjustment) || !data) return null;

    let coreField = field;
    if (isAdjustment) {
        coreField = field.replace(' Adjustment', '');
    }
    const adjField = `${coreField} Adjustment`;

    const compName = saleName || (fieldPath && fieldPath[0]);
    if (!compName || compName === 'Subject' || !compName.startsWith('COMPARABLE SALE #')) return null;

    const subjectVal = String(data.Subject?.[coreField] || '').trim();
    const compVal = String(data[compName]?.[coreField] || '').trim();
    const adjustmentStr = String(data[compName]?.[adjField] || '').trim();

    if (!subjectVal || !compVal) return null;

    const parseAreaVal = (val) => {
        const cleaned = String(val).replace(/[^0-9.]/g, '');
        return cleaned ? parseFloat(cleaned) : null;
    };

    const subjectNum = parseAreaVal(subjectVal);
    const compNum = parseAreaVal(compVal);

    if (subjectNum === null || compNum === null) return null;

    if (subjectNum === compNum) {
        return { isMatch: true };
    } else {
        const hasAdjustment = adjustmentStr !== '';
        if (hasAdjustment) {
            return { isMatch: true };
        } else {
            let displayName = coreField;
            if (coreField === 'Finished Area Above Grade') {
                displayName = 'GLA / GBA';
            }
            return {
                isError: true,
                skipBlankFilter: true,
                message: `${compName.replace('COMPARABLE SALE #', 'Comparable Sale ')} ${displayName} ('${compVal}') differs from Subject ${displayName} ('${subjectVal}'). An adjustment must be entered.`
            };
        }
    }
};

export const checkVersion1OverallQualityConditionAdjustmentConsistency = (field, text, data, fieldPath, saleName) => {
    if (!checkFormIsV1(data)) return null;
    const validFields = ['Overall Quality', 'Overall Condition'];
    const validAdjustments = ['Overall Quality Adjustment', 'Overall Condition Adjustment'];

    const isField = validFields.includes(field);
    const isAdjustment = validAdjustments.includes(field);
    if ((!isField && !isAdjustment) || !data) return null;

    let coreField = field;
    if (isAdjustment) {
        coreField = field.replace(' Adjustment', '');
    }
    const adjField = `${coreField} Adjustment`;

    const compName = saleName || (fieldPath && fieldPath[0]);
    if (!compName || compName === 'Subject' || !compName.startsWith('COMPARABLE SALE #')) return null;

    const subjectVal = String(data.Subject?.[coreField] || '').trim();
    const compVal = String(data[compName]?.[coreField] || '').trim();
    const adjustmentStr = String(data[compName]?.[adjField] || '').trim();

    if (!subjectVal || !compVal) return null;

    if (subjectVal.toLowerCase() === compVal.toLowerCase()) {
        return { isMatch: true };
    } else {
        const hasAdjustment = adjustmentStr !== '';
        if (hasAdjustment) {
            return { isMatch: true };
        } else {
            return {
                isError: true,
                skipBlankFilter: true,
                message: `${compName.replace('COMPARABLE SALE #', 'Comparable Sale ')} ${coreField} ('${compVal}') differs from Subject ${coreField} ('${subjectVal}'). An adjustment must be entered.`
            };
        }
    }
};

export const checkVersion1VehicleStorageAdjustmentConsistency = (field, text, data, fieldPath, saleName) => {
    if (!checkFormIsV1(data)) return null;
    const validFields = ['Vehicle Storage Type', 'Vehicle Storage Spaces'];
    const validAdjustments = ['Vehicle Storage Adjustment'];

    const isField = validFields.includes(field);
    const isAdjustment = validAdjustments.includes(field);
    if ((!isField && !isAdjustment) || !data) return null;

    const compName = saleName || (fieldPath && fieldPath[0]);
    if (!compName || compName === 'Subject' || !compName.startsWith('COMPARABLE SALE #')) return null;

    const subjectType = String(data.Subject?.['Vehicle Storage Type'] || '').trim();
    const compType = String(data[compName]?.['Vehicle Storage Type'] || '').trim();
    const subjectSpaces = String(data.Subject?.['Vehicle Storage Spaces'] || '').trim();
    const compSpaces = String(data[compName]?.['Vehicle Storage Spaces'] || '').trim();
    const adjustmentStr = String(data[compName]?.['Vehicle Storage Adjustment'] || '').trim();

    if (!subjectType || !compType || !subjectSpaces || !compSpaces) return null;

    const typeMatch = subjectType.toLowerCase() === compType.toLowerCase();

    const cleanSpaces = (val) => {
        const cleaned = String(val).replace(/[^0-9]/g, '');
        return cleaned ? parseInt(cleaned, 10) : val;
    };
    const subjectSpacesNorm = cleanSpaces(subjectSpaces);
    const compSpacesNorm = cleanSpaces(compSpaces);
    const spacesMatch = subjectSpacesNorm === compSpacesNorm;

    if (typeMatch && spacesMatch) {
        return { isMatch: true };
    } else {
        const hasAdjustment = adjustmentStr !== '';
        if (hasAdjustment) {
            return { isMatch: true };
        } else {
            return {
                isError: true,
                skipBlankFilter: true,
                message: `${compName.replace('COMPARABLE SALE #', 'Comparable Sale ')} Vehicle Storage Type ('${compType}') or Spaces ('${compSpaces}') differs from Subject. A Vehicle Storage Adjustment must be entered.`
            };
        }
    }
};
