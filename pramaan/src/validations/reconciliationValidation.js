export const checkFinalValueConsistency = (field, text, allData) => {
    if (!allData) return null;

    const formType = String(
        allData.selectedFormType ||
        allData.formType ||
        allData['Form Type'] ||
        allData['From Type'] ||
        allData.selected_form_type ||
        ''
    ).trim();

    // Restrict this validation strictly to 1004 and 1004 + 1007 form types
    if (formType && formType !== '1004' && formType !== '1004 + 1007') {
        return null;
    }

    const val1 = allData.SALES_TRANSFER?.['Indicated Value by Sales Comparison Approach $'] ||
        allData.SALES_GRID?.['Indicated Value by Sales Comparison Approach $'] ||
        allData['Indicated Value by Sales Comparison Approach $'] ||
        '';

    const val2 = allData.RECONCILIATION?.['Indicated Value by: Sales Comparison Approach $'] ||
        allData['Indicated Value by: Sales Comparison Approach $'] ||
        '';

    const val3 = allData.CERTIFICATION?.['APPRAISED VALUE OF SUBJECT PROPERTY Appraised Value $'] ||
        allData.CERTIFICATION?.['APPRAISED VALUE OF SUBJECT PROPERTY $'] ||
        allData.APPRAISER?.['APPRAISED VALUE OF SUBJECT PROPERTY Appraised Value $'] ||
        allData.APPRAISER?.['APPRAISED VALUE OF SUBJECT PROPERTY $'] ||
        allData['APPRAISED VALUE OF SUBJECT PROPERTY Appraised Value $'] ||
        allData['APPRAISED VALUE OF SUBJECT PROPERTY $'] ||
        '';

    const val4 = allData.RECONCILIATION?.["opinion of the market value, as defined, of the real property that is the subject of this report is $"] ||
        allData["opinion of the market value, as defined, of the real property that is the subject of this report is $"] ||
        '';

    const parseNumeric = (v) => {
        if (v === undefined || v === null || String(v).trim() === '') return null;
        const num = parseFloat(String(v).replace(/[^0-9.-]+/g, ""));
        return isNaN(num) ? null : num;
    };

    const n1 = parseNumeric(val1);
    const n2 = parseNumeric(val2);
    const n3 = parseNumeric(val3);
    const n4 = parseNumeric(val4);

    const populated = [
        { name: 'Indicated Value by Sales Comparison Approach $', val: val1, num: n1 },
        { name: 'Indicated Value by: Sales Comparison Approach $', val: val2, num: n2 },
        { name: 'APPRAISED VALUE OF SUBJECT PROPERTY Appraised Value $', val: val3, num: n3 },
        { name: 'opinion of the market value, as defined, of the real property that is the subject of this report is $', val: val4, num: n4 }
    ].filter(item => item.num !== null);

    if (populated.length > 1) {
        const uniqueNums = new Set(populated.map(i => i.num));
        if (uniqueNums.size > 1) {
            const valsSummary = [
                `Indicated Value by Sales Comparison Approach $: ${val1 ? `'${val1}'` : 'missing'}`,
                `Indicated Value by: Sales Comparison Approach $: ${val2 ? `'${val2}'` : 'missing'}`,
                `APPRAISED VALUE OF SUBJECT PROPERTY Appraised Value $: ${val3 ? `'${val3}'` : 'missing'}`,
                `opinion of the market value, as defined... is $: ${val4 ? `'${val4}'` : 'missing'}`
            ].join(' | ');

            return {
                isError: true,
                message: `Inconsistent values across sections for 1004 form. All 4 fields must match. Values: [${valsSummary}]`
            };
        }
    }

    if (field === "opinion of the market value, as defined, of the real property that is the subject of this report is $" && (!text || String(text).trim() === '')) {
        return { isError: true, message: "The final 'as of' value cannot be blank." };
    }

    return { isMatch: true };
};

export const checkCostApproachDeveloped = (field, text, allData) => {
    if (field !== 'Cost Approach (if developed)') return null;
    const costApproachValue = allData.COST_APPROACH?.['Indicated Value By Cost Approach......................................................=$'];
    if (costApproachValue && (!text || String(text).trim() === '')) {
        return { isError: true, message: "Cost Approach is developed, so this field cannot be blank." };
    }
    return { isMatch: true };
};

export const checkAppraisalCondition = (field, text) => {
    if (field !== 'This appraisal is made "as is", subject to completion per plans and specifications on the basis of a hypothetical condition that the improvements have been completed, subject to the following repairs or alterations on the basis of a hypothetical condition that the repairs or alterations have been completed, or subject to the following required inspection based on the extraordinary assumption that the condition or deficiency does not require alteration or repair:') return null;

    const value = String(text || '').trim().toLowerCase();
    const hasAsIs = value.includes('as is');
    const hasSubjectTo = value.includes('subject to');

    if (!hasAsIs && !hasSubjectTo) {
        return { isError: true, message: "Either 'as is' or 'subject to' must be selected." };
    }
    if (hasAsIs && hasSubjectTo) {
        return { isError: true, message: "Only one of 'as is' or 'subject to' can be selected." };
    }
    return { isMatch: true };
};

export const checkAsOfDate = (field, text, allData) => {
    if (field !== 'as of') return null;
    if (!text || String(text).trim() === '') {
        return { isError: true, message: "'as of' date cannot be blank." };
    }
    const effectiveDate = allData.CERTIFICATION?.['Effective Date of Appraisal'];
    if (effectiveDate && String(text).trim() !== String(effectiveDate).trim()) {
        return { isError: true, message: `Date mismatch: 'as of' date (${text}) does not match 'Effective Date of Appraisal' (${effectiveDate}) in the signature section.` };
    }
    return { isMatch: true };
};

export const checkFinalValueBracketing = (field, text, allData) => {
    if (field !== 'opinion of the market value, as defined, of the real property that is the subject of this report is $' || !text || String(text).trim() === '') {
        return null;
    }
    const finalValue = parseFloat(String(text).replace(/[^0-9.]/g, ''));
    if (isNaN(finalValue)) {
        return null;
    }

    let minComparableValue = Infinity;
    let maxComparableValue = -Infinity;
    let comparableValuesFound = false;

    const comparableSalesKeys = Object.keys(allData).filter(k => k.startsWith('COMPARABLE SALE #'));

    if (comparableSalesKeys.length === 0) {
        return null;
    }

    for (const saleKey of comparableSalesKeys) {
        const salePriceText = String(allData[saleKey]?.['Sale Price'] || '').trim();
        const adjustedSalePriceText = String(allData[saleKey]?.['Adjusted Sale Price of Comparable'] || '').trim();

        const salePrice = parseFloat(salePriceText.replace(/[^0-9.]/g, ''));
        const adjustedSalePrice = parseFloat(adjustedSalePriceText.replace(/[^0-9.]/g, ''));

        if (!isNaN(salePrice)) {
            minComparableValue = Math.min(minComparableValue, salePrice);
            maxComparableValue = Math.max(maxComparableValue, salePrice);
            comparableValuesFound = true;
        }
        if (!isNaN(adjustedSalePrice)) {
            minComparableValue = Math.min(minComparableValue, adjustedSalePrice);
            maxComparableValue = Math.max(maxComparableValue, adjustedSalePrice);
            comparableValuesFound = true;
        }
    }

    if (!comparableValuesFound) {
        return null;
    }

    if (finalValue < minComparableValue || finalValue > maxComparableValue) {
        return {
            isError: true,
            message: `opinion of the market value, as defined, of the real property that is the subject of this report is $ ($${finalValue.toLocaleString()}) is not bracketed by comparable sales prices. Range: $${minComparableValue.toLocaleString()} - $${maxComparableValue.toLocaleString()}.`
        };
    }

    return { isMatch: true, message: "opinion of the market value, as defined, of the real property that is the subject of this report is $ is bracketed by comparable sales prices." };
};

export const checkReconciliationFieldsNotBlank = (field, text) => {
    const fieldsToCheck = [
        'Indicated Value by: Sales Comparison Approach $',
        'Cost Approach (if developed)',
        'Income Approach (if developed) $',
        'This appraisal is made "as is", subject to completion per plans and specifications on the basis of a hypothetical condition that the improvements have been completed, subject to the following repairs or alterations on the basis of a hypothetical condition that the repairs or alterations have been completed, or subject to the following required inspection based on the extraordinary assumption that the condition or deficiency does not require alteration or repair:',
        "opinion of the market value, as defined, of the real property that is the subject of this report is $",
        "as of",
        "opinion of the market value, as defined, of the real property that is the subject of this report is $",
        "Sales Comparison Approach Indicated Value",
        "Income Approach Indicated Value",
        "Cost Approach Indicated Value",
        "Reason for Exclusion (Income Approach)",
        "Opinion of Market Value",
        "Market Value Condition",
        "Reasonable Exposure Time",
        "Effective Date of Appraisal",
        "Reconciliation of Market Value",
        "Apparent Defects, Damages, Deficiencies"
    ];
    if (fieldsToCheck.includes(field) && (!text || String(text).trim() === '')) {
        return { isError: true, message: `'${field}' should not be blank.` };
    }
    return null;
};

export { checkFiveValuesConsistency } from './appraisalVersion1Validation';


export const checkEffectiveDatesConsistency = (field, text, allData) => {
    if (!allData) return null;
    const formType = allData.formType || allData['From Type'] || '';
    if (formType === 'Appraisal Version #1' || formType === 'Version 1' || formType === 'Version1') return null;


    const val1 = allData.SUMMARY?.['Effective Date of Appraisal'] || allData['Effective Date of Appraisal'];
    const val2 = allData.SUMMARY?.['Inspection Date'] || allData['Inspection Date'];
    const val3 = allData['Effective Date'] || allData.COST_APPROACH?.['Effective Date'];
    const val4 = allData.RECONCILIATION?.['Effective Date of Appraisal'];

    const cleanDate = (val) => {
        if (val === undefined || val === null || String(val).trim() === '') return null;
        return String(val).trim().replace(/-/g, '/').toLowerCase();
    };

    const d1 = cleanDate(val1);
    const d2 = cleanDate(val2);
    const d3 = cleanDate(val3);
    const d4 = cleanDate(val4);

    const formatValForMessage = (val) => {
        if (val === undefined || val === null || String(val).trim() === '') return 'blank';
        return `'${String(val).trim()}'`;
    };

    const msg = `values is not same. SUMMARY Effective Date of Appraisal: ${formatValForMessage(val1)}, Scope of Inspection by Appraiser Inspection Date: ${formatValForMessage(val2)}, General Description Effective Date: ${formatValForMessage(val3)}, Appraisal Summary Effective Date of Appraisal in Reconciliation: ${formatValForMessage(val4)}`;

    if (d1 === null || d2 === null || d3 === null || d4 === null) {
        return { isError: true, message: msg };
    }

    if (d1 === d2 && d2 === d3 && d3 === d4) {
        return { isMatch: true, message: "validated" };
    } else {
        return { isError: true, message: msg };
    }
};

export const checkPropertyQualityConsistency = (field, text, allData, fieldPath, saleName) => {
    if (!allData) return null;

    const propName = saleName || (fieldPath && fieldPath[0]) || 'Subject';

    let overall = '';
    let exterior = '';
    let interior = '';

    if (propName === 'Subject') {
        overall = allData.Subject?.['Overall Quality'] || allData.SUMMARY?.['Overall Quality'] || '';
        exterior = allData.Subject?.['Exterior Quality'] || allData.IMPROVEMENTS?.['Exterior Quality Rating'] || allData['Exterior Quality Rating'] || '';
        interior = allData.Subject?.['Interior Quality'] || allData.IMPROVEMENTS?.['Interior Quality Rating'] || allData['Interior Quality Rating'] || '';
    } else {
        const propData = allData[propName] || {};
        overall = propData['Overall Quality'] || '';
        exterior = propData['Exterior Quality'] || '';
        interior = propData['Interior Quality'] || '';
    }

    const cleanRating = (val) => {
        if (val === undefined || val === null || String(val).trim() === '') return null;
        return String(val).trim().toLowerCase();
    };

    const qOverall = cleanRating(overall);
    const qExterior = cleanRating(exterior);
    const qInterior = cleanRating(interior);

    const formatValForMessage = (val) => {
        if (val === undefined || val === null || String(val).trim() === '') return 'blank';
        return `'${String(val).trim()}'`;
    };

    const msg = `values is not same. Overall Quality: ${formatValForMessage(overall)}, Exterior Quality: ${formatValForMessage(exterior)}, Interior Quality: ${formatValForMessage(interior)}`;

    if (qOverall === null || qExterior === null || qInterior === null) {
        return { isError: true, message: msg };
    }

    if (qOverall === qExterior && qExterior === qInterior) {
        return { isMatch: true, message: "validated" };
    } else {
        return { isError: true, message: msg };
    }
};

export const checkPropertyConditionConsistency = (field, text, allData, fieldPath, saleName) => {
    if (!allData) return null;

    const propName = saleName || (fieldPath && fieldPath[0]) || 'Subject';

    let overall = '';
    let exterior = '';
    let interior = '';

    if (propName === 'Subject') {
        overall = allData.Subject?.['Overall Condition'] || allData.SUMMARY?.['Overall Condition'] || '';
        exterior = allData.Subject?.['Exterior Condition'] || allData.IMPROVEMENTS?.['Exterior Condition Rating'] || allData['Exterior Condition Rating'] || '';
        interior = allData.Subject?.['Interior Condition'] || allData.IMPROVEMENTS?.['Interior Condition Rating'] || allData['Interior Condition Rating'] || '';
    } else {
        const propData = allData[propName] || {};
        overall = propData['Overall Condition'] || '';
        exterior = propData['Exterior Condition'] || '';
        interior = propData['Interior Condition'] || '';
    }

    const cleanRating = (val) => {
        if (val === undefined || val === null || String(val).trim() === '') return null;
        return String(val).trim().toLowerCase();
    };

    const qOverall = cleanRating(overall);
    const qExterior = cleanRating(exterior);
    const qInterior = cleanRating(interior);

    const formatValForMessage = (val) => {
        if (val === undefined || val === null || String(val).trim() === '') return 'blank';
        return `'${String(val).trim()}'`;
    };

    const msg = `values is not same. Overall Condition: ${formatValForMessage(overall)}, Exterior Condition: ${formatValForMessage(exterior)}, Interior Condition: ${formatValForMessage(interior)}`;

    if (qOverall === null || qExterior === null || qInterior === null) {
        return { isError: true, message: msg };
    }

    if (qOverall === qExterior && qExterior === qInterior) {
        return { isMatch: true, message: "validated" };
    } else {
        return { isError: true, message: msg };
    }
};

export const checkHbuConsistency = (field, text, allData) => {
    if (!allData) return null;

    const formType = String(
        allData.selectedFormType ||
        allData.formType ||
        allData['Form Type'] ||
        allData['From Type'] ||
        allData.selected_form_type ||
        ''
    ).trim();

    // checkHbuConsistency is strictly for Appraisal Version #1 form type
    if (formType !== 'Appraisal Version #1' && formType !== 'Version 1' && formType !== 'Version1') {
        return null;
    }


    const val1 = allData.SITE?.['Highest and Best Use as Improved (Present Use)'] || allData['Highest and Best Use as Improved (Present Use)'];
    const val2 = allData.SITE?.['Legally Permissible'] || allData['Legally Permissible'];
    const val3 = allData.SITE?.['Physically Possible'] || allData['Physically Possible'];
    const val4 = allData.SITE?.['Financially Feasible'] || allData['Financially Feasible'];

    const cleanVal = (val) => {
        if (val === undefined || val === null || String(val).trim() === '') return null;
        return String(val).trim().toLowerCase();
    };

    const v1 = cleanVal(val1);
    const v2 = cleanVal(val2);
    const v3 = cleanVal(val3);
    const v4 = cleanVal(val4);

    const formatValForMessage = (val) => {
        if (val === undefined || val === null || String(val).trim() === '') return 'blank';
        return `'${String(val).trim()}'`;
    };

    const msg = `values is not same. Is the present use of the subject property ...: ${formatValForMessage(val1)}, Legally Permissible: ${formatValForMessage(val2)}, Physically Possible: ${formatValForMessage(val3)}, Financially Feasible: ${formatValForMessage(val4)}`;

    if (v1 === null || v2 === null || v3 === null || v4 === null) {
        return { isError: true, message: msg };
    }

    if (v1 === v2 && v2 === v3 && v3 === v4) {
        return { isMatch: true, message: "validated" };
    } else {
        return { isError: true, message: msg };
    }
};

export const checkCostApproachConsistency = (field, text, allData) => {
    if (!allData) return null;
    const formType = String(allData.formType || allData['From Type'] || allData.selected_form_type || '').trim();
    if (formType !== 'Appraisal Version #1' && formType !== 'Version 1' && formType !== 'Version1') {
        return null;
    }

    const val1 = allData['Indicated Value by Cost Approach'] || allData.COST_APPROACH?.['Indicated Value by Cost Approach'];
    const val2 = allData.RECONCILIATION?.['Cost Approach Indicated Value'];

    const parseNumeric = (val) => {
        if (val === undefined || val === null || String(val).trim() === '') return null;
        const numericValue = parseFloat(String(val).replace(/[^0-9.-]+/g, ""));
        return isNaN(numericValue) ? null : numericValue;
    };

    const v1 = parseNumeric(val1);
    const v2 = parseNumeric(val2);

    const formatValForMessage = (val) => {
        if (val === undefined || val === null || String(val).trim() === '') return 'blank';
        return `'${String(val).trim()}'`;
    };

    const msg = `values is not same. Indicated Value by Cost Approach: ${formatValForMessage(val1)}, Approaches to Value Cost Approach in Reconciliation: ${formatValForMessage(val2)}`;

    if (v1 === null || v2 === null) {
        return { isError: true, message: msg };
    }

    if (v1 === v2) {
        return { isMatch: true, message: "validated" };
    } else {
        return { isError: true, message: msg };
    }
};

export const checkAttachmentTypeConsistency = (field, text, allData, fieldPath, saleName) => {
    if (!allData) return null;
    const formType = String(allData.formType || allData['From Type'] || allData.selected_form_type || '').trim();
    if (formType !== 'Appraisal Version #1' && formType !== 'Version 1' && formType !== 'Version1') {
        return null;
    }

    const propName = saleName || (fieldPath && fieldPath[0]);
    if (propName && propName !== 'Subject' && propName.startsWith('COMPARABLE')) {
        return null;
    }

    const val1 = allData.IMPROVEMENTS?.['Attachment Type'] || allData['Attachment Type'];
    const val2 = allData.SUBJECT?.['Attachment Type'];
    const val3 = allData.Subject?.['Attached / Detached'] || allData['Attached / Detached'];

    const normalize = (val) => {
        if (val === undefined || val === null || String(val).trim() === '') return null;
        const cleaned = String(val).trim().toLowerCase();
        if (cleaned.startsWith('att')) return 'attached';
        if (cleaned.startsWith('det')) return 'detached';
        if (cleaned.startsWith('semi')) return 'semi-detached';
        return cleaned;
    };

    const n1 = normalize(val1);
    const n2 = normalize(val2);
    const n3 = normalize(val3);

    const formatValForMessage = (val) => {
        if (val === undefined || val === null || String(val).trim() === '') return 'blank';
        return `'${String(val).trim()}'`;
    };

    const msg = `values is not same. Property Description Attachment Type: ${formatValForMessage(val1)}, Subject Property Attachment Type: ${formatValForMessage(val2)}, Sales Comparison Approach Attached/Detached: ${formatValForMessage(val3)}`;

    if (n1 === null || n2 === null || n3 === null) {
        return { isError: true, message: msg };
    }

    if (n1 === n2 && n2 === n3) {
        return { isMatch: true, message: "validated" };
    } else {
        return { isError: true, message: msg };
    }
};

export const checkPropertyRightsConsistency = (field, text, allData, fieldPath, saleName) => {
    if (!allData) return null;

    const propName = saleName || (fieldPath && fieldPath[0]);
    if (propName && propName !== 'Subject' && propName.startsWith('COMPARABLE')) {
        return null;
    }

    const formType = String(allData.formType || allData['From Type'] || allData.selected_form_type || '').trim();

    if (formType === 'Appraisal Version #1' || formType === 'Version 1' || formType === 'Version1') {

        const val1 = allData['Property Rights Appraised'];
        const val2 = allData.Subject?.['Property Rights Appraised'];

        const cleanVal = (val) => {
            if (val === undefined || val === null || String(val).trim() === '') return null;
            return String(val).trim().toLowerCase();
        };

        const v1 = cleanVal(val1);
        const v2 = cleanVal(val2);

        if (v1 === null || v2 === null) return null;

        if (v1 !== v2) {
            return {
                isError: true,
                skipBlankFilter: true,
                message: `Property Rights Appraised values must be the same. Subject section: '${val1}', Sales Comparison Grid: '${val2}'`
            };
        }
        return { isMatch: true };
    }

    return null;
};

export const checkAppraiserCredentialLevelConsistency = (field, text, allData) => {
    if (!allData) return null;

    const formType = String(allData.formType || allData['From Type'] || allData.selected_form_type || '').trim();
    if (formType !== 'Appraisal Version #1' && formType !== 'Version 1' && formType !== 'Version1') {
        return null;
    }

    const val1 = allData.SUMMARY?.['Appraiser Credential Level'] || allData['Appraiser Credential Level'];
    const val2 = allData.CERTIFICATION?.['Appraiser Credential Level'];

    const cleanVal = (val) => {
        if (val === undefined || val === null || String(val).trim() === '') return null;
        return String(val).trim().toLowerCase();
    };

    const v1 = cleanVal(val1);
    const v2 = cleanVal(val2);

    const formatValForMessage = (val) => {
        if (val === undefined || val === null || String(val).trim() === '') return 'blank';
        return `'${String(val).trim()}'`;
    };

    const msg = `values is not same. Credentials level: ${formatValForMessage(val1)}, Signature level: ${formatValForMessage(val2)}`;

    if (v1 === null || v2 === null) {
        return { isError: true, message: msg };
    }

    if (v1 === v2) {
        return { isMatch: true, message: "validated" };
    } else {
        return { isError: true, message: msg };
    }
};
