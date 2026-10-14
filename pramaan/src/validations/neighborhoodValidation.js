export const checkHousingPriceAndAge = (field, arg2, arg3) => {
    const priceField = "one unit housing price(high,low,pred)";
    const ageField = "one unit housing age(high,low,pred)";

    if (field !== priceField && field !== ageField) return null;

    let val = arg2;
    let allData = arg3 || {};

    if (arg2 && typeof arg2 === 'object' && (arg2.NEIGHBORHOOD || arg2.CONTRACT || arg2.Subject)) {
        allData = arg2;
        val = allData?.NEIGHBORHOOD?.[field] ?? allData?.[field];
    }

    if ((!val || (typeof val === 'string' && val.trim() === '')) && allData) {
        val = allData?.NEIGHBORHOOD?.[field] ?? allData?.[field] ?? val;
    }

    const fieldLabel = field;

    let highStr = '';
    let lowStr = '';
    let predStr = '';

    if (typeof val === 'object' && val !== null) {
        highStr = String(val.high ?? val.High ?? val.HIGH ?? val.high_price ?? val.high_age ?? '').trim();
        lowStr = String(val.low ?? val.Low ?? val.LOW ?? val.low_price ?? val.low_age ?? '').trim();
        predStr = String(val.pred ?? val.Pred ?? val.PRED ?? val.predominant ?? val.pred_price ?? val.pred_age ?? '').trim();
    } else if (typeof val === 'string' || typeof val === 'number') {
        const rawStr = String(val).trim();
        if (rawStr.startsWith('{') && rawStr.endsWith('}')) {
            try {
                const parsed = JSON.parse(rawStr);
                highStr = String(parsed.high ?? parsed.High ?? '').trim();
                lowStr = String(parsed.low ?? parsed.Low ?? '').trim();
                predStr = String(parsed.pred ?? parsed.Pred ?? '').trim();
            } catch (e) {}
        }
        
        if (!highStr && !lowStr && !predStr && rawStr) {
            const parts = rawStr.split(/[/,;]+/).map(p => p.trim()).filter(Boolean);
            if (parts.length >= 3) {
                highStr = parts[0];
                lowStr = parts[1];
                predStr = parts[2];
            } else if (parts.length > 0) {
                const numParts = rawStr.split(/\s+/).map(p => p.trim()).filter(Boolean);
                if (numParts.length === 3) {
                    highStr = numParts[0];
                    lowStr = numParts[1];
                    predStr = numParts[2];
                } else if (parts.length === 1) {
                    highStr = parts[0];
                } else if (parts.length === 2) {
                    highStr = parts[0];
                    lowStr = parts[1];
                }
            }
        }
    }

    const valuesFound = [];
    if (highStr !== '') valuesFound.push(`High: ${highStr}`);
    if (lowStr !== '') valuesFound.push(`Low: ${lowStr}`);
    if (predStr !== '') valuesFound.push(`Pred: ${predStr}`);

    if (!highStr || !lowStr || !predStr) {
        const missing = [];
        if (!highStr) missing.push('High');
        if (!lowStr) missing.push('Low');
        if (!predStr) missing.push('Predominant');

        return {
            isError: true,
            message: `${fieldLabel} must contain all 3 values (High / Low / Predominant). Missing: ${missing.join(', ')}. (${valuesFound.length}/3 values provided)`
        };
    }

    const highNum = parseFloat(highStr.replace(/[^0-9.-]+/g, ''));
    const lowNum = parseFloat(lowStr.replace(/[^0-9.-]+/g, ''));
    const predNum = parseFloat(predStr.replace(/[^0-9.-]+/g, ''));

    if (!isNaN(highNum) && !isNaN(lowNum) && !isNaN(predNum)) {
        if (highNum < lowNum) {
            return {
                isError: true,
                message: `${fieldLabel}: High value (${highStr}) cannot be less than Low value (${lowStr}).`
            };
        }
        if (predNum > highNum || predNum < lowNum) {
            return {
                isError: true,
                message: `${fieldLabel}: Predominant value (${predStr}) must fall between Low (${lowStr}) and High (${highStr}).`
            };
        }
    }

    return {
        isMatch: true,
        message: `${fieldLabel} contains all 3 values (${highStr} / ${lowStr} / ${predStr}) and is validated.`
    };
};

export const checkNeighborhoodBoundaries = (field, text) => {
    if (field !== 'Neighborhood Boundaries') return null;
    const value = String(text || '').toLowerCase();
    if (!value) return { isError: true, message: 'Neighborhood Boundaries cannot be blank. It must include North, South, East, and West.' };

    const requiredWords = ['north', 'south', 'east', 'west'];
    const missingWords = requiredWords.filter(word => !value.includes(word));

    if (missingWords.length > 0) {
        return { isError: true, message: `Neighborhood Boundaries is missing required directions: ${missingWords.join(', ').toUpperCase()}.` };
    }
    return { isMatch: true };
};

export const checkSearchCriteriaDescription = (field, text, allData) => {
    if (field !== 'Search Criteria Description') return null;

    const formType = String(
        allData?.formType ||
        allData?.selectedFormType ||
        allData?.['Form Type'] ||
        allData?.['From Type'] ||
        allData?.selected_form_type ||
        ''
    ).trim();

    const isV1Form = formType === 'Appraisal Version #1' || formType === 'Version 1' || formType === 'Version1';
    if (formType && !isV1Form) return null;

    const value = String(text || '').toLowerCase();
    if (!value) return { isError: true, message: 'Search Criteria Description cannot be blank. It must include North, South, East, and West.' };

    const requiredWords = ['north', 'south', 'east', 'west'];
    const missingWords = requiredWords.filter(word => !value.includes(word));

    if (missingWords.length > 0) {
        return { isError: true, message: `Search Criteria Description is missing required directions: ${missingWords.join(', ').toUpperCase()}.` };
    }
    return { isMatch: true };
};

export const checkNeighborhoodUsageConsistency = (field, arg2) => {
    const usageFields = ["One-Unit", "2-4 Unit", "Multi-Family", "Commercial", "Other"];
    if (!usageFields.includes(field)) return null;

    const val = arg2;

    if (val === undefined || val === null || String(val).trim() === '') {
        return { isError: true, message: `${field} usage percentage is blank.` };
    }
    return { isMatch: true };
};

export const checkSpecificZoningClassification = (field, text) => {
    if (field !== 'Specific Zoning Classification') return null;
    const value = String(text || '').trim();
    const validValues = ['R1', 'R2', 'Residence'];
    const regex = new RegExp(`\\b(${validValues.join('|')})\\b`, 'i');

    if (value && regex.test(value)) {
        return { isMatch: true };
    } else if (value) {
        return { isError: true, message: `Invalid Specific Zoning Classification: '${value}'. Expected to contain R1, R2, or Residence.` };
    }
};

const parseArgs = (arg2, arg3, arg4, arg5) => {
    let text = '';
    let allData = null;
    let path = null;
    let saleName = null;

    if (arg2 && typeof arg2 === 'object' && !Array.isArray(arg2) && (arg2.NEIGHBORHOOD || arg2.Subject || arg2.CONTRACT || arg2.IMPROVEMENTS)) {
        allData = arg2;
        saleName = arg3;
    } else {
        text = arg2;
        allData = arg3;
        path = arg4;
        saleName = arg5;
    }

    if (!saleName && path && Array.isArray(path) && path.length > 0) {
        const root = String(path[0]).toUpperCase();
        if (root.includes('COMPARABLE') || root.includes('COMP') || root.includes('SUBJECT') || root.includes('SALES_COMPARISON')) {
            saleName = path[0];
        }
    }

    return { text, allData, path, saleName };
};

const isSalesCompField = (path, saleName, text) => {
    if (saleName) return true;
    if (path && Array.isArray(path) && path.length > 0) {
        const first = String(path[0]).toUpperCase();
        if (first.includes('COMPARABLE') || first.includes('COMP') || first.includes('SUBJECT') || first.includes('SALES_COMPARISON')) {
            return true;
        }
    }
    const valStr = String(text || '').trim();
    if (valStr.includes(';') || /^[nba];/i.test(valStr)) {
        return true;
    }
    return false;
};

export const checkBuiltUp = (field, arg2, arg3, arg4, arg5) => {
    if (!field || String(field).trim().toLowerCase() !== 'built-up') return null;
    const { text, allData, path, saleName } = parseArgs(arg2, arg3, arg4, arg5);
    if (isSalesCompField(path, saleName, text)) return null;

    const value = String(text || '').trim().toLowerCase();

    if (!value) {
        return { isError: true, skipBlankFilter: true, message: "'Built-Up' in Neighborhood section must not be blank." };
    }

    const validBuiltUpValues = [
        'over 75%',
        '25-75%',
        'under 25%',
        'over 75',
        '25%-75%',
        '25% - 75%',
        '25-75',
        'under 25'
    ];

    if (!validBuiltUpValues.includes(value)) {
        return {
            isError: true,
            skipBlankFilter: true,
            message: "Built-Up in Neighborhood section must be one of: 'Over 75%', '25-75%', or 'Under 25%'."
        };
    }

    const locationVal = String(allData?.NEIGHBORHOOD?.Location || allData?.Location || '').trim().toLowerCase();
    if (locationVal === 'rural') {
        const ruralValidValues = ['25-75%', 'under 25%', '25%-75%', '25% - 75%', '25-75', 'under 25'];
        if (!ruralValidValues.includes(value)) {
            return {
                isError: true,
                skipBlankFilter: true,
                message: "When Location is 'Rural', Built-Up must be one of: '25-75%' or 'Under 25%'."
            };
        }
    }

    return { isMatch: true };
};

export const checkGrowth = (field, arg2, arg3, arg4, arg5) => {
    if (!field || String(field).trim().toLowerCase() !== 'growth') return null;
    const { text, path, saleName } = parseArgs(arg2, arg3, arg4, arg5);
    if (isSalesCompField(path, saleName, text)) return null;

    const value = String(text || '').trim().toLowerCase();

    if (!value) {
        return { isError: true, skipBlankFilter: true, message: "'Growth' in Neighborhood section must not be blank." };
    }

    const validGrowthValues = ['rapid', 'stable', 'slow'];

    if (!validGrowthValues.includes(value)) {
        return {
            isError: true,
            skipBlankFilter: true,
            message: "Growth in Neighborhood section must be one of: 'Rapid', 'Stable', or 'Slow'."
        };
    }

    return { isMatch: true };
};

export const checkPropertyValues = (field, arg2, arg3, arg4, arg5) => {
    if (!field || String(field).trim().toLowerCase() !== 'property values') return null;
    const { text, path, saleName } = parseArgs(arg2, arg3, arg4, arg5);
    if (isSalesCompField(path, saleName, text)) return null;

    const value = String(text || '').trim().toLowerCase();

    if (!value) {
        return { isError: true, skipBlankFilter: true, message: "'Property Values' in Neighborhood section must not be blank." };
    }

    const validPropertyValues = ['increasing', 'stable', 'declining'];

    if (!validPropertyValues.includes(value)) {
        return {
            isError: true,
            skipBlankFilter: true,
            message: "Property Values in Neighborhood section must be one of: 'Increasing', 'Stable', or 'Declining'."
        };
    }

    return { isMatch: true };
};

export const checkDemandSupply = (field, arg2, arg3, arg4, arg5) => {
    const fieldClean = String(field || '').trim().toLowerCase().replace(/\s+/g, '');
    if (!field || (fieldClean !== 'demand/supply' && fieldClean !== 'demand-supply')) return null;
    const { text, path, saleName } = parseArgs(arg2, arg3, arg4, arg5);
    if (isSalesCompField(path, saleName, text)) return null;

    const value = String(text || '').trim().toLowerCase();

    if (!value) {
        return { isError: true, skipBlankFilter: true, message: "'Demand/Supply' in Neighborhood section must not be blank." };
    }

    const validDemandSupplyValues = ['shortage', 'in balance', 'over supply', 'oversupply'];

    if (!validDemandSupplyValues.includes(value)) {
        return {
            isError: true,
            skipBlankFilter: true,
            message: "Demand/Supply in Neighborhood section must be one of: 'Shortage', 'In Balance', or 'Over Supply'."
        };
    }

    return { isMatch: true };
};

export const checkSingleChoiceFields = (field, arg2, arg3, arg4, arg5) => {
    const { text, path, saleName } = parseArgs(arg2, arg3, arg4, arg5);
    if (isSalesCompField(path, saleName, text)) return null;

    const fieldLower = String(field || '').trim().toLowerCase();
    const fieldClean = fieldLower.replace(/\s+/g, '');
    if (fieldLower === 'built-up') {
        return checkBuiltUp(field, arg2, arg3, arg4, arg5);
    }
    if (fieldLower === 'growth') {
        return checkGrowth(field, arg2, arg3, arg4, arg5);
    }
    if (fieldLower === 'property values') {
        return checkPropertyValues(field, arg2, arg3, arg4, arg5);
    }
    if (fieldClean === 'demand/supply' || fieldClean === 'demand-supply') {
        return checkDemandSupply(field, arg2, arg3, arg4, arg5);
    }

    const singleChoiceFields = ['Built-Up', 'Growth', 'Property Values', 'Demand/Supply', 'Marketing Time', 'Demand / Supply'];
    if (!singleChoiceFields.includes(field)) return null;
    if (!text || String(text).trim() === '') {
        return { isError: true, skipBlankFilter: true, message: `${field} choice must not be blank.` };
    }
    return { isMatch: true };
};

export const VERSION_1_NEIGHBORHOOD_FIELDS = [
    'Legally Permissible',
    'Physically Possible',
    'Financially Feasible',
    'Maximally Productive',
    'Highest and Best Use as Improved (Present Use)',
    'Highest and Best Use Commentary',
    'Market Area Boundary',
    'Active Listings',
    'Median Days on Market',
    'Lowest List Price',
    'Median List Price',
    'Highest List Price',
    'Pending Sales',
    'Sales in Past 12 Months',
    'Lowest Sale Price',
    'Median Sale Price',
    'Highest Sale Price',
    'Distressed Market Competition',
    'Price Trend Source',
    'Demand / Supply',
    'Market Commentary',
    'Search Criteria Description',
    'Price Trend Analysis Commentary'
];

export const checkNeighborhoodFieldsNotBlank = (field, arg2, arg3, arg4, arg5) => {
    const { text, allData, path, saleName } = parseArgs(arg2, arg3, arg4, arg5);
    if (isSalesCompField(path, saleName, text)) return null;

    const formType = String(
        allData?.formType ||
        allData?.selectedFormType ||
        allData?.['Form Type'] ||
        allData?.['From Type'] ||
        allData?.selected_form_type ||
        ''
    ).trim();

    const isV1Form = formType === 'Appraisal Version #1' || formType === 'Version 1' || formType === 'Version1';

    if (VERSION_1_NEIGHBORHOOD_FIELDS.includes(field) && !isV1Form && formType) {
        return null;
    }

    const fieldsToCheck = [
        'Built-Up',
        'Growth',
        'Property Values',
        'Demand/Supply',
        'Marketing Time',
        'Location',
        'One-Unit',
        '2-4 Unit',
        'Multi-Family',
        'Commercial',
        'Other',
        'one unit housing price(high,low,pred)',
        'one unit housing age(high,low,pred)',
        'Neighborhood Boundaries',
        'Neighborhood Description',
        'Market Conditions:',
        ...VERSION_1_NEIGHBORHOOD_FIELDS
    ];

    if (fieldsToCheck.includes(field)) {
        if (field === 'one unit housing price(high,low,pred)' || field === 'one unit housing age(high,low,pred)') {
            let highStr = '';
            let lowStr = '';
            let predStr = '';
            if (typeof text === 'object' && text !== null) {
                highStr = String(text.high ?? text.High ?? '').trim();
                lowStr = String(text.low ?? text.Low ?? '').trim();
                predStr = String(text.pred ?? text.Pred ?? '').trim();
            } else if (text) {
                const parts = String(text).split(/[/,;]+/).map(p => p.trim()).filter(Boolean);
                if (parts.length >= 3) {
                    highStr = parts[0];
                    lowStr = parts[1];
                    predStr = parts[2];
                }
            }
            if (!highStr || !lowStr || !predStr) {
                return { isError: true, skipBlankFilter: true, message: `'${field}' is incomplete. High, Low, and Predominant values are required.` };
            }
        }

        if (typeof text === 'object' && text !== null) {
            if (Object.values(text).every(v => !v)) return { isError: true, skipBlankFilter: true, message: `'${field}' must not be blank.` };
        } else if (!text || String(text).trim() === '') {
            return { isError: true, skipBlankFilter: true, message: `'${field}' must not be blank.` };
        }
    }
    return null;
};

export const checkLocation = (field, arg2, arg3, arg4, arg5) => {
    if (!field || String(field).toLowerCase() !== 'location') return null;

    const { text, path, saleName } = parseArgs(arg2, arg3, arg4, arg5);

    if (isSalesCompField(path, saleName, text)) return null;

    if (typeof text === 'object' && text !== null) {
        return null;
    }

    const valStr = String(text || '').trim();
    const value = valStr.toLowerCase();

    if (!value) {
        return { isError: true, skipBlankFilter: true, message: "'Location' in Neighborhood section must not be blank." };
    }

    const validLocations = ['urban', 'suburban', 'rural'];

    if (!validLocations.includes(value)) {
        return {
            isError: true,
            skipBlankFilter: true,
            message: "Location in Neighborhood section must be one of: 'Urban', 'Suburban', or 'Rural'."
        };
    }

    return { isMatch: true };
};

export const checkOtherLandUse = (field, text, allData) => {
    const dataObj = allData?.NEIGHBORHOOD || allData;
    if (!dataObj) {
        return null;
    }
    if (field !== 'Other' && field !== 'Present Land Use for other') {
        return null;
    }

    const neighborhoodData = allData?.NEIGHBORHOOD || (allData?.Other !== undefined ? allData : {});
    const otherValueText = String(neighborhoodData['Other'] || '0').trim();
    const otherValue = parseFloat(otherValueText.replace('%', '')) || 0;

    const presentLandUseValue = String(
        (text !== undefined && text !== null && field === 'Present Land Use for other')
            ? text
            : (neighborhoodData['Present Land Use for other'] || '')
    ).trim();

    if (otherValue > 0 && !presentLandUseValue) {
        return { isError: true, message: "'Present Land Use for other' cannot be blank when 'Other' is greater than 0%." };
    }

    if (otherValue > 0 && presentLandUseValue) {
        return { isMatch: true };
    }

    return null;
};


export const checkOtherLandUseComment = (field, text, data) => {
    if (field !== 'Other' || !data) return null;

    const neighborhoodData = data.NEIGHBORHOOD || data;
    const otherValue = parseFloat(String(text || neighborhoodData['Other'] || '0').replace('%', '').trim());
    if (isNaN(otherValue) || otherValue <= 0) {
        return null;
    }

    const commentField = 'Present Land Use for other';
    const commentValue = String(neighborhoodData[commentField] || '').trim();

    if (!commentValue) {
        return { isError: true, message: `A comment in '${commentField}' is required when 'Other' land use is greater than 0%.` };
    }

    return null;
};

export const checkNeighborhoodListPricesConsistency = (field, text, allData) => {
    const targetFields = ['Lowest List Price', 'Median List Price', 'Highest List Price'];
    if (!targetFields.includes(field) || !allData || !allData.NEIGHBORHOOD) return null;

    const formType = String(
        allData.formType ||
        allData.selectedFormType ||
        allData['Form Type'] ||
        allData['From Type'] ||
        allData.selected_form_type ||
        ''
    ).trim();
    const isV1Form = formType === 'Appraisal Version #1' || formType === 'Version 1' || formType === 'Version1';
    if (formType && !isV1Form) return null;

    const lowestVal = String(allData.NEIGHBORHOOD['Lowest List Price'] || '').trim();
    const medianVal = String(allData.NEIGHBORHOOD['Median List Price'] || '').trim();
    const highestVal = String(allData.NEIGHBORHOOD['Highest List Price'] || '').trim();

    if (!lowestVal || !medianVal || !highestVal) return null;

    const parsePrice = (val) => {
        return parseFloat(val.replace(/[^0-9.-]+/g, ""));
    };

    const lowest = parsePrice(lowestVal);
    const median = parsePrice(medianVal);
    const highest = parsePrice(highestVal);

    if (isNaN(lowest) || isNaN(median) || isNaN(highest)) return null;

    if (!(lowest < median && median < highest)) {
        return {
            isError: true,
            skipBlankFilter: true,
            message: `List prices are inconsistent. Expected: Lowest List Price < Median List Price < Highest List Price. (Lowest: $${lowestVal}, Median: $${medianVal}, Highest: $${highestVal})`
        };
    }

    return { isMatch: true };
};

export const checkNeighborhoodSalePricesConsistency = (field, text, allData) => {
    const targetFields = ['Lowest Sale Price', 'Median Sale Price', 'Highest Sale Price'];
    if (!targetFields.includes(field) || !allData || !allData.NEIGHBORHOOD) return null;

    const formType = String(
        allData.formType ||
        allData.selectedFormType ||
        allData['Form Type'] ||
        allData['From Type'] ||
        allData.selected_form_type ||
        ''
    ).trim();
    const isV1Form = formType === 'Appraisal Version #1' || formType === 'Version 1' || formType === 'Version1';
    if (formType && !isV1Form) return null;

    const lowestVal = String(allData.NEIGHBORHOOD['Lowest Sale Price'] || '').trim();
    const medianVal = String(allData.NEIGHBORHOOD['Median Sale Price'] || '').trim();
    const highestVal = String(allData.NEIGHBORHOOD['Highest Sale Price'] || '').trim();

    if (!lowestVal || !medianVal || !highestVal) return null;

    const parsePrice = (val) => {
        return parseFloat(val.replace(/[^0-9.-]+/g, ""));
    };

    const lowest = parsePrice(lowestVal);
    const median = parsePrice(medianVal);
    const highest = parsePrice(highestVal);

    if (isNaN(lowest) || isNaN(median) || isNaN(highest)) return null;

    if (!(lowest < median && median < highest)) {
        return {
            isError: true,
            skipBlankFilter: true,
            message: `Sale prices are inconsistent. Expected: Lowest Sale Price < Median Sale Price < Highest Sale Price. (Lowest: $${lowestVal}, Median: $${medianVal}, Highest: $${highestVal})`
        };
    }

    return { isMatch: true };
};
