const normalizeForCompare = (val) =>
    String(val || '')
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '');

export const parseAdjustmentValue = (adjStr) => {
    if (adjStr === null || adjStr === undefined) return 0;
    const str = String(adjStr).trim();
    if (!str) return 0;

    // Check if explicitly negative via minus sign (-) or parentheses like (5000)
    const isNegative = str.includes('-') || /^\s*\(\s*\d+/.test(str);

    // Extract numeric value
    const digits = str.replace(/[^0-9.]/g, '');
    const num = parseFloat(digits);
    if (isNaN(num)) return 0;

    // If sign is not present or explicit +, treat as positive. If -, treat as negative.
    return isNegative ? -num : num;
};

const normalizeCheckArgs = (field, arg2, arg3, arg4, arg5) => {
    let allData = null;
    let saleName = null;
    let textVal = null;

    if (arg3 && typeof arg3 === 'object' && !arg3.hasOwnProperty('prototype') && !Array.isArray(arg3)) {
        allData = arg3;
        saleName = arg5;
        textVal = arg2;
    } else {
        allData = arg2;
        saleName = arg3;
        if (typeof arg4 === 'string') saleName = arg4;
    }
    return { allData, saleName, textVal };
};

export const checkConditionAdjustment = (field, arg2, arg3, arg4, arg5) => {
    let allData = null;
    let saleName = null;
    let textVal = null;

    if (arg3 && typeof arg3 === 'object' && !arg3.hasOwnProperty('prototype') && !Array.isArray(arg3)) {
        allData = arg3;
        saleName = arg5;
        textVal = arg2;
    } else {
        allData = arg2;
        saleName = arg3;
    }

    const isConditionField = field === 'Condition';
    const isAdjustmentField = field === 'Condition Adjustment';

    if ((!isConditionField && !isAdjustmentField) || !saleName || saleName === 'Subject' || !allData) return null;

    const subjectCondition = String(
        allData.Subject?.['Condition'] ||
        allData['Condition'] ||
        allData['Subject']?.['Condition'] ||
        ''
    ).trim().toUpperCase();

    const compIndexMatch = String(saleName).match(/\d+/);
    const compIndex = compIndexMatch ? compIndexMatch[0] : '';

    let compCondition = '';
    if (isConditionField && textVal !== null && textVal !== undefined) {
        compCondition = String(textVal).trim().toUpperCase();
    } else {
        compCondition = String(
            allData[saleName]?.['Condition'] ||
            (compIndex ? allData[`Comp ${compIndex} Condition`] : '') ||
            (compIndex ? allData[`Comparable ${compIndex} Condition`] : '') ||
            ''
        ).trim().toUpperCase();
    }

    let adjustmentStr = '';
    if (isAdjustmentField && textVal !== null && textVal !== undefined) {
        adjustmentStr = String(textVal).trim();
    } else {
        adjustmentStr = String(
            allData[saleName]?.['Condition Adjustment'] ||
            (compIndex ? allData[`Comp ${compIndex} Condition Adjustment`] : '') ||
            (compIndex ? allData[`Comparable ${compIndex} Condition Adjustment`] : '') ||
            ''
        ).trim();
    }

    if (!subjectCondition || !compCondition) return null;

    const getConditionRating = (condStr) => {
        const match = condStr.match(/C([1-5])/i);
        return match ? parseInt(match[1], 10) : NaN;
    };

    const subjectConditionNum = getConditionRating(subjectCondition);
    const compConditionNum = getConditionRating(compCondition);

    const is1025 = allData?.['Form Type'] === '1025' || allData?.['From Type'] === '1025';
    if (isNaN(subjectConditionNum) || isNaN(compConditionNum)) {
        if (is1025 || (isNaN(subjectConditionNum) && isNaN(compConditionNum))) {
            const adjustmentValue = parseAdjustmentValue(adjustmentStr);
            if (normalizeForCompare(subjectCondition) === normalizeForCompare(compCondition)) {
                if (adjustmentValue !== 0) {
                    return { isError: true, message: `Warning: Condition is the same (${subjectCondition}), so no adjustment is required.` };
                }
                return { isMatch: true };
            }
        }
        if (isNaN(subjectConditionNum)) {
            return { isError: true, message: `Subject condition must be between C1-C5. Got '${subjectCondition}'.` };
        }
        if (isNaN(compConditionNum)) {
            return { isError: true, message: `Comp condition must be between C1-C5. Got '${compCondition}'.` };
        }
    }

    const adjustmentValue = parseAdjustmentValue(adjustmentStr);

    if (subjectConditionNum === compConditionNum) {
        if (adjustmentValue !== 0) {
            return { isError: true, message: `Warning: Condition is the same (${subjectCondition}), so no adjustment is required.` };
        }
    } else if (compConditionNum < subjectConditionNum) {
        if (!adjustmentStr) {
            return { isError: true, message: `Warning: Comp condition (${compCondition}) is superior to Subject (${subjectCondition}), so a negative adjustment is required.` };
        }
        if (adjustmentValue > 0) {
            return { isError: true, message: `Warning: Comp condition (${compCondition}) is superior to Subject (${subjectCondition}), so a negative adjustment or $0 is expected.` };
        }
    } else {
        if (!adjustmentStr) {
            return { isError: true, message: `Warning: Comp condition (${compCondition}) is inferior to Subject (${subjectCondition}), so a positive adjustment is required.` };
        }
        if (adjustmentValue < 0) {
            return { isError: true, message: `Warning: Comp condition (${compCondition}) is inferior to Subject (${subjectCondition}), so a positive adjustment or $0 is expected.` };
        }
    }
    return { isMatch: true };
};

export const checkBedroomsAdjustment = (field, arg2, arg3, arg4, arg5) => {
    const { allData, saleName } = normalizeCheckArgs(field, arg2, arg3, arg4, arg5);
    const isBedroomField = field === 'Bedrooms';
    const isAdjustmentField = field === 'Bedrooms Adjustment';

    if ((!isBedroomField && !isAdjustmentField) || !allData || !allData.Subject || !saleName || saleName === 'Subject') return null;

    const subjectBedrooms = parseInt(String(allData.Subject['Bedrooms'] || '0').trim(), 10);
    const compBedrooms = parseInt(String(allData[saleName]?.['Bedrooms'] || '0').trim(), 10);
    const adjustmentText = String(allData[saleName]?.['Bedrooms Adjustment'] || '').trim();
    const adjustmentValue = parseAdjustmentValue(adjustmentText);

    if (isNaN(subjectBedrooms) || isNaN(compBedrooms)) return null;

    if (subjectBedrooms === compBedrooms) {
        if (adjustmentValue !== 0 && adjustmentText !== '') {
            return { isError: true, message: `Warning: Bedroom count is the same (${subjectBedrooms}), but adjustment is not $0 or blank.` };
        }
    } else if (compBedrooms > subjectBedrooms) {
        if (adjustmentValue > 0) {
            return { isError: true, message: `Warning: Comp has more bedrooms (${compBedrooms}) than Subject (${subjectBedrooms}), so a negative adjustment is expected.` };
        }
    } else {
        if (adjustmentValue < 0) {
            return { isError: true, message: `Warning: Comp has fewer bedrooms (${compBedrooms}) than Subject (${subjectBedrooms}), so a positive adjustment is expected.` };
        }
    }
    return { isMatch: true };
};

export const checkBathsAdjustment = (field, arg2, arg3, arg4, arg5) => {
    let allData = null;
    let saleName = null;
    let textVal = null;

    if (arg3 && typeof arg3 === 'object' && !arg3.hasOwnProperty('prototype') && !Array.isArray(arg3)) {
        allData = arg3;
        saleName = arg5;
        textVal = arg2;
    } else {
        allData = arg2;
        saleName = arg3;
    }

    const isBathField = field === 'Baths';
    const isAdjustmentField = field === 'Baths Adjustment';

    if ((!isBathField && !isAdjustmentField) || !saleName || saleName === 'Subject' || !allData) return null;

    const subjectBathsStr = String(
        allData.Subject?.['Baths'] ||
        allData['Baths'] ||
        allData['Subject']?.['Baths'] ||
        ''
    ).trim();

    const compIndexMatch = String(saleName).match(/\d+/);
    const compIndex = compIndexMatch ? compIndexMatch[0] : '';

    let compBathsStr = '';
    if (isBathField && textVal !== null && textVal !== undefined) {
        compBathsStr = String(textVal).trim();
    }
    if (!compBathsStr) {
        compBathsStr = String(
            allData[saleName]?.['Baths'] ||
            (compIndex ? allData[`Comp ${compIndex} Baths`] : '') ||
            (compIndex ? allData[`Comparable ${compIndex} Baths`] : '') ||
            ''
        ).trim();
    }

    let adjustmentStr = '';
    if (isAdjustmentField && textVal !== null && textVal !== undefined) {
        adjustmentStr = String(textVal).trim();
    }
    if (!adjustmentStr) {
        adjustmentStr = String(
            allData[saleName]?.['Baths Adjustment'] ||
            allData[saleName]?.['Above Grade Room Count Adjustment'] ||
            (compIndex ? allData[`Comp ${compIndex} Baths Adjustment`] : '') ||
            (compIndex ? allData[`Comp ${compIndex} Above Grade Room Count Adjustment`] : '') ||
            (compIndex ? allData[`Comparable ${compIndex} Baths Adjustment`] : '') ||
            (compIndex ? allData[`Comparable ${compIndex} Above Grade Room Count Adjustment`] : '') ||
            ''
        ).trim();
    }

    if (!subjectBathsStr || !compBathsStr) return null;

    const parseBaths = (bathStr) => {
        const numericVal = parseFloat(bathStr.replace(/[^0-9.]/g, ''));
        return isNaN(numericVal) ? NaN : numericVal;
    };

    const subjectBaths = parseBaths(subjectBathsStr);
    const compBaths = parseBaths(compBathsStr);

    if (isNaN(subjectBaths) || isNaN(compBaths)) return null;

    const adjustmentValue = parseAdjustmentValue(adjustmentStr);

    if (compBaths === subjectBaths) {
        if (adjustmentValue !== 0) {
            return { isError: true, message: `Warning: Bath count is the same (${subjectBaths}), so no adjustment is required.` };
        }
    } else if (compBaths > subjectBaths) {
        if (!adjustmentStr) {
            return { isError: true, message: `Warning: Comp has more baths (${compBaths}) than Subject (${subjectBaths}), so a negative adjustment is required.` };
        }
        if (adjustmentValue > 0) {
            return { isError: true, message: `Warning: Comp has more baths (${compBaths}) than Subject (${subjectBaths}), so a negative adjustment or $0 is expected.` };
        }
    } else {
        if (!adjustmentStr) {
            return { isError: true, message: `Warning: Comp has fewer baths (${compBaths}) than Subject (${subjectBaths}), so a positive adjustment is required.` };
        }
        if (adjustmentValue < 0) {
            return { isError: true, message: `Warning: Comp has fewer baths (${compBaths}) than Subject (${subjectBaths}), so a positive adjustment or $0 is expected.` };
        }
    }
    return { isMatch: true };
};

export const checkQualityOfConstructionAdjustment = (field, arg2, arg3, arg4, arg5) => {
    let allData = null;
    let saleName = null;
    let textVal = null;

    if (arg3 && typeof arg3 === 'object' && !arg3.hasOwnProperty('prototype') && !Array.isArray(arg3)) {
        allData = arg3;
        saleName = arg5;
        textVal = arg2;
    } else {
        allData = arg2;
        saleName = arg3;
    }

    const isQualityField = field === 'Quality of Construction';
    const isAdjustmentField = field === 'Quality of Construction Adjustment';

    if ((!isQualityField && !isAdjustmentField) || !saleName || saleName === 'Subject' || !allData) return null;

    const subjectQoCStr = String(
        allData.Subject?.['Quality of Construction'] ||
        allData['Quality of Construction'] ||
        allData['Subject']?.['Quality of Construction'] ||
        ''
    ).trim().toUpperCase();

    const compIndexMatch = String(saleName).match(/\d+/);
    const compIndex = compIndexMatch ? compIndexMatch[0] : '';

    let compQoCStr = '';
    if (isQualityField && textVal !== null && textVal !== undefined) {
        compQoCStr = String(textVal).trim().toUpperCase();
    } else {
        compQoCStr = String(
            allData[saleName]?.['Quality of Construction'] ||
            (compIndex ? allData[`Comp ${compIndex} Quality of Construction`] : '') ||
            (compIndex ? allData[`Comparable ${compIndex} Quality of Construction`] : '') ||
            ''
        ).trim().toUpperCase();
    }

    let adjustmentStr = '';
    if (isAdjustmentField && textVal !== null && textVal !== undefined) {
        adjustmentStr = String(textVal).trim();
    } else {
        adjustmentStr = String(
            allData[saleName]?.['Quality of Construction Adjustment'] ||
            (compIndex ? allData[`Comp ${compIndex} Quality of Construction Adjustment`] : '') ||
            (compIndex ? allData[`Comparable ${compIndex} Quality of Construction Adjustment`] : '') ||
            ''
        ).trim();
    }

    if (!subjectQoCStr || !compQoCStr) return null;

    const getQualityRating = (qocStr) => {
        const match = qocStr.match(/Q([1-5])/i);
        return match ? parseInt(match[1], 10) : NaN;
    };

    const subjectQualityNum = getQualityRating(subjectQoCStr);
    const compQualityNum = getQualityRating(compQoCStr);

    const is1025 = allData?.['Form Type'] === '1025' || allData?.['From Type'] === '1025';
    if (isNaN(subjectQualityNum) || isNaN(compQualityNum)) {
        if (is1025 || (isNaN(subjectQualityNum) && isNaN(compQualityNum))) {
            const adjustmentValue = parseAdjustmentValue(adjustmentStr);
            if (normalizeForCompare(subjectQoCStr) === normalizeForCompare(compQoCStr)) {
                if (adjustmentValue !== 0) {
                    return { isError: true, message: `Warning: Quality of Construction is the same (${subjectQoCStr}), so no adjustment is required.` };
                }
                return { isMatch: true };
            }
        }
        if (isNaN(subjectQualityNum)) {
            return { isError: true, message: `Subject Quality of Construction must be between Q1-Q5. Got '${subjectQoCStr}'.` };
        }
        if (isNaN(compQualityNum)) {
            return { isError: true, message: `Comp Quality of Construction must be between Q1-Q5. Got '${compQoCStr}'.` };
        }
    }

    const adjustmentValue = parseAdjustmentValue(adjustmentStr);

    if (subjectQualityNum === compQualityNum) {
        if (adjustmentValue !== 0) {
            return { isError: true, message: `Warning: Quality of Construction is the same (${subjectQoCStr}), so no adjustment is required.` };
        }
    } else if (compQualityNum < subjectQualityNum) {
        if (!adjustmentStr) {
            return { isError: true, message: `Warning: Comp Quality of Construction (${compQoCStr}) is superior to Subject (${subjectQoCStr}), so a negative adjustment is required.` };
        }
        if (adjustmentValue > 0) {
            return { isError: true, message: `Warning: Comp Quality of Construction (${compQoCStr}) is superior to Subject (${subjectQoCStr}), so a negative adjustment or $0 is expected.` };
        }
    } else {
        if (!adjustmentStr) {
            return { isError: true, message: `Warning: Comp Quality of Construction (${compQoCStr}) is inferior to Subject (${subjectQoCStr}), so a positive adjustment is required.` };
        }
        if (adjustmentValue < 0) {
            return { isError: true, message: `Warning: Comp Quality of Construction (${compQoCStr}) is inferior to Subject (${subjectQoCStr}), so a positive adjustment or $0 is expected.` };
        }
    }
    return { isMatch: true };
};

export const checkProximityToSubject = (field, text, allData, arg4, arg5) => {
    let saleName = arg4;
    if (Array.isArray(arg4)) saleName = arg5;

    if (field !== 'Proximity to Subject' || !allData || !allData.Subject || !saleName || saleName === 'Subject') return null;
    const proximityText = String(text || '').trim();
    if (!proximityText) return null;

    const proximityValue = parseFloat(proximityText);
    if (isNaN(proximityValue)) return null;

    const neighborhoodSection = allData.NEIGHBORHOOD || allData.Neighborhood || allData.neighborhood || {};
    const location = String(neighborhoodSection.Location || neighborhoodSection.location || '').trim().toLowerCase();

    const comment = String(
        allData[saleName]?.['Proximity to Subject comment'] ||
        allData['Summary of Sales Comparison Approach'] ||
        allData['Sales Comparison Commentary'] ||
        allData.Subject?.['Summary of Sales Comparison Approach'] ||
        ''
    ).trim();

    const overrideField = 'Proximity to Subject comment';

    if (location === 'urban') {
        if (proximityValue > 1 && !comment) {
            return { isError: true, field: overrideField, message: `Proximity to Subject (${proximityText}) is greater than 1.0 miles for an Urban location. A comment is required.` };
        }
    } else if (location === 'suburban') {
        if (proximityValue > 3 && !comment) {
            return { isError: true, field: overrideField, message: `Proximity to Subject (${proximityText}) is greater than 3.0 miles for a Suburban location. A comment is required.` };
        }
    } else if (location === 'rural') {
        if (proximityValue > 5 && !comment) {
            return { isError: true, field: overrideField, message: `Proximity to Subject (${proximityText}) is greater than 5.0 miles for a Rural location. A comment is required.` };
        }
    } else if (!['urban', 'suburban', 'rural'].includes(location)) {
        return { isError: true, message: `Location in Neighborhood section must be Urban, Suburban, or Rural to validate proximity.` };
    }

    return { isMatch: true };
};

export const parseAreaToSqFt = (areaStr) => {
    const str = String(areaStr || '').trim().toLowerCase();
    const value = parseFloat(str.replace(/[^0-9.-]+/g, ""));
    if (isNaN(value)) return NaN;
    if (str.includes('ac') || str.includes('acre')) {
        return value * 43560;
    }
    return value;
};

export const checkSiteAdjustment = (field, arg2, arg3, arg4, arg5) => {
    const { allData, saleName } = normalizeCheckArgs(field, arg2, arg3, arg4, arg5);
    const isSiteField = field === 'Site';
    const isAdjustmentField = field === 'Site Adjustment';

    if ((!isSiteField && !isAdjustmentField) || !allData || !allData.Subject || !saleName || saleName === 'Subject') return null;

    const subjectSiteText = String(allData.Subject['Site'] || '').trim();
    const compSiteText = String(allData[saleName]?.['Site'] || '').trim();
    const adjustmentText = String(allData[saleName]?.['Site Adjustment'] || '').trim();

    if (!subjectSiteText || !compSiteText) return null;

    const subjectSiteValue = parseAreaToSqFt(subjectSiteText);
    const compSiteValue = parseAreaToSqFt(compSiteText);
    const adjustmentValue = parseAdjustmentValue(adjustmentText);

    if (isNaN(subjectSiteValue) || isNaN(compSiteValue)) return null;

    if (compSiteValue > subjectSiteValue && (isNaN(adjustmentValue) || adjustmentValue > 0)) {
        return { isError: true, message: `Warning: Comp site value (${compSiteText}) is superior to Subject (${subjectSiteText}), but adjustment is not negative.` };
    }
    if (compSiteValue < subjectSiteValue && (isNaN(adjustmentValue) || adjustmentValue < 0)) {
        return { isError: true, message: `Warning: Comp site value (${compSiteText}) is inferior to Subject (${subjectSiteText}), but adjustment is not positive.` };
    }
    return { isMatch: true };
};

export const checkGrossLivingAreaAdjustment = (field, arg2, arg3, arg4, arg5) => {
    const { allData, saleName } = normalizeCheckArgs(field, arg2, arg3, arg4, arg5);
    const isGlaField = field === 'Gross Living Area';
    const isAdjustmentField = field === 'Gross Living Area Adjustment';

    if ((!isGlaField && !isAdjustmentField) || !allData || !allData.Subject || !saleName || saleName === 'Subject') return null;

    const subjectGlaText = String(allData.Subject['Gross Living Area'] || '').trim();
    const compGlaText = String(allData[saleName]?.['Gross Living Area'] || '').trim();
    const adjustmentText = String(allData[saleName]?.['Gross Living Area Adjustment'] || '').trim();

    if (!subjectGlaText || !compGlaText) return null;

    const subjectGlaValue = parseAreaToSqFt(subjectGlaText);
    const compGlaValue = parseAreaToSqFt(compGlaText);

    if (isNaN(subjectGlaValue) || isNaN(compGlaValue)) return null;

    if (adjustmentText === '') {
        return { isError: true, message: `Warning: Gross Living Area Adjustment cannot be blank.` };
    }

    const adjustmentValue = parseAdjustmentValue(adjustmentText);

    if (isNaN(adjustmentValue)) {
        return { isError: true, message: `Warning: Gross Living Area Adjustment must be a valid number.` };
    }

    if (adjustmentValue === 0) {
        return { isMatch: true };
    }
    if (compGlaValue === subjectGlaValue) {
        return { isError: true, message: `Warning: Gross Living Area is the same (${subjectGlaText}), but adjustment is not $0.` };
    }

    if (compGlaValue > subjectGlaValue && adjustmentValue > 0) {
        return { isError: true, message: `Warning: Comp GLA (${compGlaText}) is superior to Subject (${subjectGlaText}), but adjustment is not negative.` };
    }
    if (compGlaValue < subjectGlaValue && adjustmentValue < 0) {
        return { isError: true, message: `Warning: Comp GLA (${compGlaText}) is inferior to Subject (${subjectGlaText}), but adjustment is not positive.` };
    }

    return { isMatch: true };
};

export const checkSubjectAddressInconsistency = (
    field,
    text,
    data,
    fieldPath
) => {
    if ((field !== 'Property Address' && field !== 'Address') || !data?.Subject) {
        return null;
    }
    if (field === 'Address' && fieldPath[0] !== 'Subject') {
        return null;
    }

    const normalize = (val) =>
        String(val || '')
            .toLowerCase()
            .replace(/[^a-z0-9]/g, '');

    const propertyAddress = normalize(data['Property Address']);
    const subjectGridAddress = normalize(data.Subject?.Address);

    if (!propertyAddress || !subjectGridAddress) {
        return null;
    }

    if (subjectGridAddress === propertyAddress) {
        return { isMatch: true };
    }
    const fullAddress = normalize(
        `${data['Property Address']} ${data.Subject?.City} ${data.Subject?.State} ${data.Subject?.['Zip Code']}`
    );

    if (subjectGridAddress === fullAddress) {
        return { isMatch: true };
    }

    return {
        isError: true,
        message: `Subject Address mismatch.
Expected:
1) '${data['Property Address']}'
OR
2) '${data['Property Address']} ${data.Subject?.City} ${data.Subject?.State} ${data.Subject?.['Zip Code']}'
But found '${data.Subject?.Address}'.`
    };
};

export const checkDesignStyleAdjustment = (field, arg2, arg3, arg4, arg5) => {
    const { allData, saleName } = normalizeCheckArgs(field, arg2, arg3, arg4, arg5);
    const isDesignField = field === 'Design (Style)';
    const isAdjustmentField = field === 'Design (Style) Adjustment';

    if ((!isDesignField && !isAdjustmentField) || !allData || !allData.Subject || !saleName || saleName === 'Subject') return null;

    const subjectDesign = String(allData.Subject['Design (Style)'] || '').trim();
    const compDesign = String(allData[saleName]?.['Design (Style)'] || '').trim();
    const adjustmentText = String(allData[saleName]?.['Design (Style) Adjustment'] || '').trim();

    if (subjectDesign && compDesign) {
        const designsAreDifferent = normalizeForCompare(subjectDesign) !== normalizeForCompare(compDesign);
        const adjustmentIsPresent = adjustmentText !== '';

        if (designsAreDifferent && !adjustmentIsPresent) {
            return { isError: true, message: `Design/Style mismatch (Subject: '${subjectDesign}', Comp: '${compDesign}'). An adjustment is required, even if $0.` };
        }
    }
    return { isMatch: true };
};

export const checkLocationConsistency = (field, arg2, arg3, arg4, arg5) => {
    let allData = null;
    let saleName = null;

    if (arg3 && typeof arg3 === 'object' && !arg3.hasOwnProperty('prototype') && !Array.isArray(arg3)) {
        allData = arg3;
        saleName = arg5;
    } else {
        allData = arg2;
        saleName = arg3;
    }

    const isLocationField = field === 'Location';
    const isAdjustmentField = field === 'Location Adjustment';

    if ((!isLocationField && !isAdjustmentField) || !allData || !allData.Subject || !saleName || saleName === 'Subject') {
        return null;
    }

    const subjectLocation = String(allData.Subject['Location'] || '').trim();
    const compLocation = String(allData[saleName]?.['Location'] || '').trim();
    const adjustmentText = String(allData[saleName]?.['Location Adjustment'] || '').trim();

    if (!subjectLocation || !compLocation) {
        return null;
    }

    if (normalizeForCompare(subjectLocation) === normalizeForCompare(compLocation)) {
        if (adjustmentText && adjustmentText !== '0' && adjustmentText !== '$0') {
            return { isError: true, message: `Warning: Location is the same (${subjectLocation}), but adjustment is not $0.` };
        }
    } else {
        if (!adjustmentText) {
            return { isError: true, message: `Warning: Location differs (Subject: '${subjectLocation}', Comp: '${compLocation}'), but no adjustment is made. An adjustment is required, even if 0.` };
        }
    }
    return { isMatch: true };
};

export const checkFunctionalUtilityAdjustment = (field, arg2, arg3, arg4, arg5) => {
    const { allData, saleName } = normalizeCheckArgs(field, arg2, arg3, arg4, arg5);
    const isFunctionalUtilityField = field === 'Functional Utility';
    const isAdjustmentField = field === 'Functional Utility Adjustment';

    if ((!isFunctionalUtilityField && !isAdjustmentField) || !allData || !allData.Subject || !saleName || saleName === 'Subject') return null;

    const subjectFunctionalUtility = String(allData.Subject['Functional Utility'] || '').trim();
    const compFunctionalUtility = String(allData[saleName]?.['Functional Utility'] || '').trim();
    const adjustmentText = String(allData[saleName]?.['Functional Utility Adjustment'] || '').trim();

    if (!subjectFunctionalUtility || !compFunctionalUtility) return null;

    if (normalizeForCompare(subjectFunctionalUtility) === normalizeForCompare(compFunctionalUtility)) {
        if (adjustmentText && adjustmentText !== '0' && adjustmentText !== '$0') {
            return { isError: true, message: `Warning: Functional Utility is the same (${subjectFunctionalUtility}), but adjustment is not $0.` };
        }
    } else {
        if (!adjustmentText) {
            return { isError: true, message: `Warning: Functional Utility differs (Subject: '${subjectFunctionalUtility}', Comp: '${compFunctionalUtility}'), but no adjustment is made.` };
        }
    }
    return { isMatch: true };
};

export const checkEnergyEfficientItemsAdjustment = (field, arg2, arg3, arg4, arg5) => {
    const { allData, saleName } = normalizeCheckArgs(field, arg2, arg3, arg4, arg5);
    const isItemField = field === 'Energy Efficient Items';
    const isAdjustmentField = field === 'Energy Efficient Items Adjustment';

    if ((!isItemField && !isAdjustmentField) || !allData || !allData.Subject || !saleName || saleName === 'Subject') return null;

    const subjectItems = String(allData.Subject['Energy Efficient Items'] || '').trim();
    const compItems = String(allData[saleName]?.['Energy Efficient Items'] || '').trim();
    const adjustmentText = String(allData[saleName]?.['Energy Efficient Items Adjustment'] || '').trim();

    if (!subjectItems && !compItems) return null;

    if (normalizeForCompare(subjectItems) === normalizeForCompare(compItems)) {
        if (adjustmentText && adjustmentText !== '0' && adjustmentText !== '$0') {
            return { isError: true, message: `Warning: Energy Efficient Items are the same, but adjustment is not $0.` };
        }
    } else {
        if (!adjustmentText) {
            return { isError: true, message: `Warning: Energy Efficient Items differ (Subject: '${subjectItems}', Comp: '${compItems}'), but no adjustment is made.` };
        }
    }
    return { isMatch: true };
};

export const checkPorchPatioDeckAdjustment = (field, arg2, arg3, arg4, arg5) => {
    const { allData, saleName } = normalizeCheckArgs(field, arg2, arg3, arg4, arg5);
    const isItemField = field === 'Porch/Patio/Deck';
    const isAdjustmentField = field === 'Porch/Patio/Deck Adjustment';

    if ((!isItemField && !isAdjustmentField) || !allData || !allData.Subject || !saleName || saleName === 'Subject') return null;

    const subjectItems = String(allData.Subject['Porch/Patio/Deck'] || '').trim();
    const compItems = String(allData[saleName]?.['Porch/Patio/Deck'] || '').trim();
    const adjustmentText = String(allData[saleName]?.['Porch/Patio/Deck Adjustment'] || '').trim();

    if (!subjectItems && !compItems && !adjustmentText) return null;

    if (normalizeForCompare(subjectItems) === normalizeForCompare(compItems)) {
        if (adjustmentText && adjustmentText !== '0' && adjustmentText !== '$0') {
            return { isError: true, message: `Warning: Porch/Patio/Deck are the same, but adjustment is not $0.` };
        }
    } else {
        if (!adjustmentText) {
            return { isError: true, message: `Warning: Porch/Patio/Deck differ (Subject: '${subjectItems}', Comp: '${compItems}'), but no adjustment is made.` };
        }
    }
    return { isMatch: true };
};

export const checkHeatingCoolingAdjustment = (field, arg2, arg3, arg4, arg5) => {
    const { allData, saleName } = normalizeCheckArgs(field, arg2, arg3, arg4, arg5);
    const isHeatingCoolingField = field === 'Heating/Cooling' || field === 'Heating/Cooling Adjustment';
    if (!isHeatingCoolingField || !allData || !allData.Subject || !saleName || saleName === 'Subject') return null;

    const subjectHeatingCooling = String(allData.Subject['Heating/Cooling'] || '').trim();
    const compHeatingCooling = String(allData[saleName]?.['Heating/Cooling'] || '').trim();
    const adjustmentText = String(allData[saleName]?.['Heating/Cooling Adjustment'] || '').trim();

    if (!subjectHeatingCooling || !compHeatingCooling) return null;

    if (normalizeForCompare(subjectHeatingCooling) === normalizeForCompare(compHeatingCooling)) {
        if (adjustmentText && adjustmentText !== '0' && adjustmentText !== '$0') {
            return { isError: true, message: `Heating/Cooling is the same (${compHeatingCooling}), but an adjustment of '${adjustmentText}' is present.` };
        }
    } else {
        if (!adjustmentText) {
            return { isError: true, message: `Heating/Cooling mismatch (Subject: '${subjectHeatingCooling}', Comp: '${compHeatingCooling}'). An adjustment is required.` };
        }
    }
    return { isMatch: true };
};

export const checkDataSourceDOM = (field, text, arg3, arg4, arg5) => {
    let saleName = arg3;
    if (typeof arg3 === 'object') saleName = arg5;

    if (field !== 'Data Source(s)' || !saleName || saleName === 'Subject') return null;

    const textValue = String(text || '').trim();
    if (!textValue) return null;

    const domIndex = textValue.toLowerCase().indexOf('dom');

    if (domIndex !== -1) {
        const restOfString = textValue.substring(domIndex + 3).trim();
        if (restOfString.replace(/[:\s]/g, '') === '') {
            return { isError: true, message: `Value for 'DOM' is missing in Data Source(s).` };
        }
    }
    return { isMatch: true };
};

export const checkActualAgeAdjustment = (field, arg2, arg3, arg4, arg5) => {
    let allData = null;
    let saleName = null;
    let textVal = null;

    if (arg3 && typeof arg3 === 'object' && !arg3.hasOwnProperty('prototype') && !Array.isArray(arg3)) {
        allData = arg3;
        saleName = arg5;
        textVal = arg2;
    } else {
        allData = arg2;
        saleName = arg3;
    }

    const isAgeField = field === 'Actual Age';
    const isAdjustmentField = field === 'Actual Age Adjustment';

    if ((!isAgeField && !isAdjustmentField) || !saleName || saleName === 'Subject' || !allData) return null;

    const subjectAgeStr = String(
        allData.Subject?.['Actual Age'] ||
        allData['Actual Age'] ||
        allData['Subject']?.['Actual Age'] ||
        ''
    ).trim();

    const compIndexMatch = String(saleName).match(/\d+/);
    const compIndex = compIndexMatch ? compIndexMatch[0] : '';

    let compAgeStr = '';
    if (isAgeField && textVal !== null && textVal !== undefined) {
        compAgeStr = String(textVal).trim();
    } else {
        compAgeStr = String(
            allData[saleName]?.['Actual Age'] ||
            (compIndex ? allData[`Comp ${compIndex} Actual Age`] : '') ||
            (compIndex ? allData[`Comparable ${compIndex} Actual Age`] : '') ||
            ''
        ).trim();
    }

    let adjustmentStr = '';
    if (isAdjustmentField && textVal !== null && textVal !== undefined) {
        adjustmentStr = String(textVal).trim();
    } else {
        adjustmentStr = String(
            allData[saleName]?.['Actual Age Adjustment'] ||
            (compIndex ? allData[`Comp ${compIndex} Actual Age Adjustment`] : '') ||
            (compIndex ? allData[`Comparable ${compIndex} Actual Age Adjustment`] : '') ||
            ''
        ).trim();
    }

    if (!subjectAgeStr || !compAgeStr) return null;

    let subjectAge = parseInt(subjectAgeStr.replace(/[^0-9]/g, ''), 10);
    if (isNaN(subjectAge) && subjectAgeStr.toLowerCase().includes('new')) {
        subjectAge = 0;
    }
    let compAge = parseInt(compAgeStr.replace(/[^0-9]/g, ''), 10);
    if (isNaN(compAge) && compAgeStr.toLowerCase().includes('new')) {
        compAge = 0;
    }

    if (isNaN(subjectAge) || isNaN(compAge)) return null;

    const adjustmentValue = parseAdjustmentValue(adjustmentStr);

    if (compAge === subjectAge) {
        if (adjustmentValue !== 0) {
            return { isError: true, message: `Subject and Comp Actual Age are the same (${subjectAge}), so no adjustment is required.` };
        }
    } else if (compAge > subjectAge) {
        if (adjustmentValue < 0) {
            return { isError: true, message: `Comp is older (${compAge} yrs) than Subject (${subjectAge} yrs), so a positive adjustment or $0 is expected.` };
        }
    } else {
        if (adjustmentValue > 0) {
            return { isError: true, message: `Comp is newer (${compAge} yrs) than Subject (${subjectAge} yrs), so a negative adjustment or $0 is expected.` };
        }
    }
    return { isMatch: true };
};


export const checkLeaseholdFeeSimpleConsistency = (field, arg2, arg3, arg4, arg5) => {
    let allData = null;
    let saleName = null;
    let textVal = null;

    if (arg3 && typeof arg3 === 'object' && !arg3.hasOwnProperty('prototype') && !Array.isArray(arg3)) {
        allData = arg3;
        saleName = arg5;
        textVal = arg2;
    } else {
        allData = arg2;
        saleName = arg3;
    }

    const isLeaseholdField = field === 'Leasehold/Fee Simple';
    const isAdjustmentField = field === 'Leasehold/Fee Simple Adjustment';

    if ((!isLeaseholdField && !isAdjustmentField) || !saleName || !allData) return null;

    if (saleName === 'Subject') {
        const subjectSectionPropertyRights = String(allData['Property Rights Appraised'] || '').trim();
        const salesGridPropertyRights = String(
            textVal !== null && textVal !== undefined ? textVal : (allData.Subject?.['Leasehold/Fee Simple'] || allData['Leasehold/Fee Simple'] || '')
        ).trim();

        if (salesGridPropertyRights && subjectSectionPropertyRights && normalizeForCompare(salesGridPropertyRights) !== normalizeForCompare(subjectSectionPropertyRights)) {
            return { isError: true, message: `Property Rights mismatch: Subject section has '${subjectSectionPropertyRights}', but Sales Comparison has '${salesGridPropertyRights}'.` };
        }
        return { isMatch: true };
    }


    const subjectValStr = String(
        allData.Subject?.['Property Rights Appraised'] ||
        allData['Property Rights Appraised'] ||
        allData.Subject?.['Leasehold/Fee Simple'] ||
        allData['Leasehold/Fee Simple'] ||
        ''
    ).trim();

    const compIndexMatch = String(saleName).match(/\d+/);
    const compIndex = compIndexMatch ? compIndexMatch[0] : '';

    let compValStr = '';
    if (isLeaseholdField && textVal !== null && textVal !== undefined) {
        compValStr = String(textVal).trim();
    } else {
        compValStr = String(
            allData[saleName]?.['Leasehold/Fee Simple'] ||
            (compIndex ? allData[`Comp ${compIndex} Leasehold/Fee Simple`] : '') ||
            (compIndex ? allData[`Comparable ${compIndex} Leasehold/Fee Simple`] : '') ||
            ''
        ).trim();
    }

    let adjustmentStr = '';
    if (isAdjustmentField && textVal !== null && textVal !== undefined) {
        adjustmentStr = String(textVal).trim();
    } else {
        adjustmentStr = String(
            allData[saleName]?.['Leasehold/Fee Simple Adjustment'] ||
            (compIndex ? allData[`Comp ${compIndex} Leasehold/Fee Simple Adjustment`] : '') ||
            (compIndex ? allData[`Comparable ${compIndex} Leasehold/Fee Simple Adjustment`] : '') ||
            ''
        ).trim();
    }

    if (!subjectValStr || !compValStr) return null;

    const adjustmentValue = parseAdjustmentValue(adjustmentStr);

    const normSubject = normalizeForCompare(subjectValStr);
    const normComp = normalizeForCompare(compValStr);

    if (normComp === normSubject) {
        if (adjustmentValue !== 0) {
            return { isError: true, message: `Warning: Leasehold/Fee Simple is the same (${compValStr}), so no adjustment is required.` };
        }
    } else {
        if (!adjustmentStr) {
            return { isError: true, message: `Warning: Property rights mismatch (Subject: '${subjectValStr}', Comp: '${compValStr}'), so an adjustment is required.` };
        }
    }
    return { isMatch: true };
};

export const checkCompDesignStyle = (field, text, allData, saleName) => {
    if (field !== 'Design (Style)' || !saleName || saleName === 'Subject' || !allData || !allData.Subject) return null;
    return null;
};

export const checkDateOfSale = (field, text, allData, arg4, arg5) => {
    let saleName = arg4;
    if (Array.isArray(arg4)) saleName = arg5;

    if (field !== 'Date of Sale/Time' || !saleName || saleName === 'Subject' || !allData) return null;

    const compDateStr = String(text || '').trim();
    if (!compDateStr) return null;

    const compDate = new Date(compDateStr);
    if (isNaN(compDate.getTime())) return null;

    const comparableKeys = Object.keys(allData).filter(k => k.startsWith('COMPARABLE SALE #') && k !== saleName);

    for (const key of comparableKeys) {
        const otherCompDateStr = String(allData[key]?.['Date of Sale/Time'] || '').trim();
        if (!otherCompDateStr) continue;

        const otherCompDate = new Date(otherCompDateStr);
        if (isNaN(otherCompDate.getTime())) continue;

        const diffTime = Math.abs(compDate - otherCompDate);
        const diffMonths = diffTime / (1000 * 60 * 60 * 24 * 30.44);

        if (diffMonths > 12) {
            return { isError: true, message: `Sale date is more than 12 months apart from ${key} (${otherCompDateStr}).` };
        }
    }
    return { isMatch: true };
};

export const checkSalePrice = (field, arg2, arg3, arg4, arg5) => {
    const { allData, saleName } = normalizeCheckArgs(field, arg2, arg3, arg4, arg5);
    if (field !== 'Sale Price' || !allData || !allData.Subject || !saleName || saleName === 'Subject') {
        return null;
    }

    const subjectSalePriceText = String(allData.Subject['Sale Price'] || '').trim();
    const compSalePriceText = String(allData[saleName]?.['Sale Price'] || '').trim();

    if (!subjectSalePriceText || !compSalePriceText) {
        return null;
    }

    const subjectPrice = parseFloat(subjectSalePriceText.replace(/[^0-9.-]+/g, ""));
    const compPrice = parseFloat(compSalePriceText.replace(/[^0-9.-]+/g, ""));

    if (isNaN(subjectPrice) || isNaN(compPrice) || subjectPrice === 0) {
        return null;
    }

    const difference = Math.abs(subjectPrice - compPrice);
    const percentageDifference = (difference / subjectPrice) * 100;

    if (percentageDifference > 25) {
        return { isError: true, message: `Warning: Comp sale price ($${compPrice.toLocaleString()}) differs from Subject sale price ($${subjectPrice.toLocaleString()}) by more than 25%.` };
    }

    return { isMatch: true };
};

export const checkSubjectAgeConsistency = (field, arg2, arg3, arg4, arg5) => {
    let allData = null;
    let saleName = null;
    let actualAgeVal = null;

    if (arg3 && typeof arg3 === 'object' && !arg3.hasOwnProperty('prototype') && !Array.isArray(arg3)) {
        allData = arg3;
        saleName = arg5;
        actualAgeVal = arg2;
    } else {
        allData = arg2;
        saleName = arg3;
    }

    if (field !== 'Actual Age' || saleName !== 'Subject' || !allData) return null;

    let actualAgeStr = String(actualAgeVal || '').trim();
    if (!actualAgeStr) {
        actualAgeStr = String(
            allData.Subject?.['Actual Age'] ||
            allData['Actual Age'] ||
            allData['Subject']?.['Actual Age'] ||
            ''
        ).trim();
    }

    const yearBuiltStr = String(
        allData.IMPROVEMENTS?.['Year Built'] ||
        allData['Year Built'] ||
        allData.Subject?.['Year Built'] ||
        allData['Subject']?.['Year Built'] ||
        allData.SITE?.['Year Built'] ||
        ''
    ).trim();

    if (!actualAgeStr || !yearBuiltStr) return null;

    let actualAge = parseInt(actualAgeStr.replace(/[^0-9]/g, ''), 10);
    if (isNaN(actualAge) && actualAgeStr.toLowerCase().includes('new')) {
        actualAge = 0;
    }
    const yearBuilt = parseInt(yearBuiltStr.replace(/[^0-9]/g, ''), 10);

    if (isNaN(actualAge) || isNaN(yearBuilt)) return null;

    let currentYear = new Date().getFullYear();
    const effectiveDateStr = String(
        allData.CERTIFICATION?.['Effective Date of Appraisal'] ||
        allData['Effective Date of Appraisal'] ||
        allData['Effective Date'] ||
        allData.CERTIFICATION?.['Date of Signature and Report'] ||
        allData['Date of Signature and Report'] ||
        ''
    ).trim();

    if (effectiveDateStr) {
        const yearMatch = effectiveDateStr.match(/\b(19\d\d|20\d\d)\b/);
        if (yearMatch) {
            currentYear = parseInt(yearMatch[1], 10);
        }
    }

    const calculatedAge = currentYear - yearBuilt;

    if (Math.abs(calculatedAge - actualAge) > 1) {
        return { isError: true, message: `Subject Actual Age (${actualAge}) in Sales Grid does not match Year Built (${yearBuilt}). Expected ~${calculatedAge}.` };
    }

    return { isMatch: true };
};

export const checkViewAdjustment = (field, arg2, arg3, arg4, arg5) => {
    let allData = null;
    let saleName = null;
    let textVal = null;

    if (arg3 && typeof arg3 === 'object' && !arg3.hasOwnProperty('prototype') && !Array.isArray(arg3)) {
        allData = arg3;
        saleName = arg5;
        textVal = arg2;
    } else {
        allData = arg2;
        saleName = arg3;
    }

    const isViewField = field === 'View';
    const isAdjustmentField = field === 'View Adjustment';

    if ((!isViewField && !isAdjustmentField) || !saleName || saleName === 'Subject' || !allData) return null;

    const subjectView = String(
        allData.Subject?.['View'] ||
        allData['View'] ||
        allData['Subject']?.['View'] ||
        ''
    ).trim().toUpperCase();

    const compIndexMatch = String(saleName).match(/\d+/);
    const compIndex = compIndexMatch ? compIndexMatch[0] : '';

    let compView = '';
    if (isViewField && textVal !== null && textVal !== undefined) {
        compView = String(textVal).trim().toUpperCase();
    } else {
        compView = String(
            allData[saleName]?.['View'] ||
            (compIndex ? allData[`Comp ${compIndex} View`] : '') ||
            (compIndex ? allData[`Comparable ${compIndex} View`] : '') ||
            ''
        ).trim().toUpperCase();
    }

    let adjustmentStr = '';
    if (isAdjustmentField && textVal !== null && textVal !== undefined) {
        adjustmentStr = String(textVal).trim();
    } else {
        adjustmentStr = String(
            allData[saleName]?.['View Adjustment'] ||
            (compIndex ? allData[`Comp ${compIndex} View Adjustment`] : '') ||
            (compIndex ? allData[`Comparable ${compIndex} View Adjustment`] : '') ||
            ''
        ).trim();
    }

    if (!subjectView || !compView) return null;

    const adjustmentValue = parseAdjustmentValue(adjustmentStr);

    const normSubjectView = normalizeForCompare(subjectView);
    const normCompView = normalizeForCompare(compView);

    if (normCompView === normSubjectView) {
        if (adjustmentValue !== 0) {
            return { isError: true, message: `Warning: View is the same (${compView}), so no adjustment is required.` };
        }
    } else {
        if (!adjustmentStr) {
            return { isError: true, message: `Warning: View differs (Subject: '${subjectView}', Comp: '${compView}'), so an adjustment is required.` };
        }
    }
    return { isMatch: true };
};
