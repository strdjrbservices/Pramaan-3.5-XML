export const checkZoning = (field, text, data) => {
    if (field !== 'Zoning Compliance') return null;
    const value = String(text || '').trim();
    const validValues = ['Legal', 'Legal Nonconforming (Grandfathered Use)', 'No Zoning'];

    if (value.startsWith('Illegal')) {
        return { isError: true, message: "STOP REVIEW AND ESCALATE TO MANAGER/ CLIENT" };
    }

    if (value === 'Legal') {
        return { isMatch: true, message: "Zoning is Legal." };
    } else if (value === 'Legal Nonconforming (Grandfathered Use)') {
        const commentData = data?.SITE?.['Legal Nonconforming (Grandfathered Use) comment'];
        const comment = typeof commentData === 'object' && commentData !== null ? (commentData.value !== undefined ? commentData.value : commentData.comment) : commentData;
        if (!comment || String(comment).trim() === '') {
            return { isError: true, message: "A comment is required for 'Legal Nonconforming (Grandfathered Use)'." };
        }
    } else if (value === 'No Zoning') {
        const commentData = data?.SITE?.['No Zoning comment'];
        const comment = typeof commentData === 'object' && commentData !== null ? (commentData.value !== undefined ? commentData.value : commentData.comment) : commentData;
        if (!comment || String(comment).trim() === '') {
            return { isError: true, message: "A comment is required for 'No Zoning'." };
        }
    } else if (value && !validValues.some(v => value.startsWith(v))) {
        return { isError: true, message: `Invalid Zoning Compliance value: '${value}'.` };
    }
    return { isMatch: true };
};

export const checkZoningDescription = (field, text) => {
    if (field !== 'Zoning Description') return null;
    const value = String(text || '').trim();
    if (!value) {
        return { isError: true, message: 'Zoning Description should not be blank.' };
    }
    if (/\b(agriculture|agr)\b/i.test(value)) {
        return { isError: true, message: "CRITICAL: Zoning Description contains 'agriculture' or 'agr'. Please review." };
    }
    return { isMatch: true };
};

export const checkSpecificZoningClassification = (field, text) => {
    if (field !== 'Specific Zoning Classification') return null;
    const value = String(text || '').trim();
    if (!value) {
        return { isError: true, message: 'Specific Zoning Classification should not be blank.' };
    }
    return { isMatch: true };
};

export const checkHighestAndBestUse = (field, text) => {
    if (field !== 'Is the highest and best use of subject property as improved (or as proposed per plans and specifications) the present use?') return null;
    const raw = String(text || '').trim();
    if (!raw) {
        return { isError: true, message: "This field must be marked 'Yes'." };
    }

    const value = raw.toLowerCase();
    const yesPattern = /^(y|yes)\b|present use|as improved|as proposed/;
    if (yesPattern.test(value)) return { isMatch: true };

    if (value.startsWith('no') || value.includes('no')) {
        return { isError: true, message: `CRITICAL: Highest & Best Use is not the present use. This should be 'Yes'.` };
    }

    return { isError: true, message: `Value for 'Highest and Best Use' should be 'Yes'.` };
};

const normalizeZone = (z) => String(z || '').trim().toUpperCase().replace(/^ZONE\s*/, '');

const isZoneAorAE = (zone) => {
    const norm = normalizeZone(zone);
    return ['A', 'AE', 'A/AE', 'A / AE'].includes(norm) || norm.startsWith('A') || norm.startsWith('AE');
};

const isZoneXorX500 = (zone) => {
    const norm = normalizeZone(zone);
    return ['X', 'X500', 'X 500', 'X/X500', 'X / X500', 'C', 'X(SHADED)', 'X(UNSHADED)'].some(v => norm.includes(v)) || norm.startsWith('X') || norm.startsWith('C');
};

export const checkFemaInconsistency = (field, text, data) => {
    const relevantFields = ['FEMA Special Flood Hazard Area', 'FEMA Flood Zone', 'FEMA Map #', 'FEMA Map Date'];
    if (!relevantFields.includes(field)) return null;

    let allData = data;
    let fieldValue = text;
    if (text && typeof text === 'object' && !Array.isArray(text)) {
        allData = text;
        fieldValue = undefined;
    }

    const siteData = allData?.SITE || allData || {};

    const hazardAreaRaw = String(siteData['FEMA Special Flood Hazard Area'] ?? allData?.['FEMA Special Flood Hazard Area'] ?? '').trim().toLowerCase();
    const floodZoneRaw = String(siteData['FEMA Flood Zone'] ?? allData?.['FEMA Flood Zone'] ?? '').trim();
    const mapNoRaw = String(siteData['FEMA Map #'] ?? allData?.['FEMA Map #'] ?? '').trim();
    const mapDateRaw = String(siteData['FEMA Map Date'] ?? allData?.['FEMA Map Date'] ?? '').trim();

    const isHazardYes = hazardAreaRaw === 'yes' || hazardAreaRaw === 'y';
    const isHazardNo = hazardAreaRaw === 'no' || hazardAreaRaw === 'n';

    if (field === 'FEMA Special Flood Hazard Area') {
        const val = fieldValue !== undefined ? String(fieldValue).trim().toLowerCase() : hazardAreaRaw;
        if (!val) {
            return { isError: true, skipBlankFilter: true, message: "'FEMA Special Flood Hazard Area' must not be blank." };
        }
        if (val !== 'yes' && val !== 'y' && val !== 'no' && val !== 'n') {
            return { isError: true, skipBlankFilter: true, message: "'FEMA Special Flood Hazard Area' must be 'Yes' or 'No'." };
        }
        return { isMatch: true };
    }

    if (field === 'FEMA Flood Zone') {
        const zoneVal = fieldValue !== undefined ? String(fieldValue).trim() : floodZoneRaw;
        if (!zoneVal) {
            return { isError: true, skipBlankFilter: true, message: "'FEMA Flood Zone' must not be blank." };
        }

        if (isHazardYes) {
            if (!isZoneAorAE(zoneVal)) {
                return { isError: true, skipBlankFilter: true, message: "When FEMA Special Flood Hazard Area is 'Yes', FEMA Flood Zone must be 'A' or 'AE'." };
            }
        } else if (isHazardNo) {
            if (!isZoneXorX500(zoneVal)) {
                return { isError: true, skipBlankFilter: true, message: "When FEMA Special Flood Hazard Area is 'No', FEMA Flood Zone must be 'X' or 'X500'." };
            }
        }
        return { isMatch: true };
    }

    if (field === 'FEMA Map #') {
        const mapVal = fieldValue !== undefined ? String(fieldValue).trim() : mapNoRaw;
        if (!mapVal) {
            return { isError: true, skipBlankFilter: true, message: "'FEMA Map #' must not be blank." };
        }
        return { isMatch: true };
    }

    if (field === 'FEMA Map Date') {
        const dateVal = fieldValue !== undefined ? String(fieldValue).trim() : mapDateRaw;
        if (!dateVal) {
            return { isError: true, skipBlankFilter: true, message: "'FEMA Map Date' must not be blank." };
        }
        return { isMatch: true };
    }

    return null;
};

export const checkFemaFieldsConsistency = (field, text, data) => {
    return checkFemaInconsistency(field, text, data);
};

export const checkSiteSectionBlank = (field, text) => {
    const fieldsToCheck = ["Dimensions", "Shape", "View"];
    if (fieldsToCheck.includes(field)) {
        if (!String(text || '').trim()) {
            return { isError: true, message: `'${field}' should not be blank.` };
        }
        return { isMatch: true };
    }
    return null;
};

export const checkArea = (field, text) => {
    if (field !== 'Area') return null;
    const value = String(text || '').trim();
    if (!value) {
        return { isError: true, message: 'Area should not be blank.' };
    }

    const numericValue = parseFloat(value.replace(/[^0-9.]/g, ''));
    if (isNaN(numericValue)) return null;

    const hasAcres = /\b(ac|acres?)\b/i.test(value);
    const hasSqFt = /\b(sf|sqft|sq\.?\s*ft\.?|square\s*feet)\b/i.test(value);

    if (!hasAcres && numericValue < 100) {
        return {
            isError: true,
            message: `Area value '${value}' is unrealistically small for Square Feet (${numericValue} SF). If this is in Acres, please update unit to AC.`
        };
    }

    const areaInSqFt = hasAcres ? numericValue * 43560 : numericValue;

    if (areaInSqFt > 43500) {
        if (!hasAcres) {
            return { isError: true, message: 'Area is greater than 43,500, unit should be in Acres (AC).' };
        }
        if (hasSqFt) {
            return { isError: true, message: 'Area is greater than 43,500, unit should be in Acres (AC), not Square Feet.' };
        }
    } else {
        if (!hasSqFt) {
            return { isError: true, message: 'Area is 43,500 or less, unit should be in Square Feet (SF).' };
        }
        if (hasAcres) {
            return { isError: true, message: 'Area is 43,500 or less, unit should be in Square Feet (SF), not Acres.' };
        }
    }
    return { isMatch: true };
};
export const checkYesNoWithComment = (field, text, data, fieldConfig) => {
    if (field !== fieldConfig.name) return null;

    const value = String(text || '').trim();

    if (!value) {
        return {
            isError: true,
            message: `'${field}' should not be blank.`,
        };
    }

    const wanted = fieldConfig.wantedValue.toLowerCase();
    const unwanted = fieldConfig.unwantedValue.toLowerCase();

    const wantedRegex = new RegExp(`^${wanted}\\b`, 'i');
    const unwantedRegex = new RegExp(`^${unwanted}\\b`, 'i');

    const isWanted = wantedRegex.test(value);
    const isUnwanted = unwantedRegex.test(value);

    if (isWanted) {
        return { isMatch: true };
    }

    if (isUnwanted) {
        const description = value.replace(unwantedRegex, '').replace(/^[\s;:,\-./]+/, '').trim();

        if (!description) {
            return {
                isError: true,
                message: `'${field}' requires a description when answered '${unwanted}'.`,
            };
        }

        return { isMatch: true };
    }

    return {
        isError: true,
        message: `'${field}' should be '${wanted}' or '${unwanted}' with description.`,
    };
};

export const checkUtilities = (field, text, data) => {
    const utilityFields = ["Electricity", "Gas", "Water", "Sanitary Sewer", "Street", "Alley"];
    if (!utilityFields.includes(field)) return null;

    const value = String(text || '').trim();
    const supplementalAddendum = String(data?.['SUPPLEMENTAL ADDENDUM'] || data?.SITE?.['SUPPLEMENTAL ADDENDUM'] || '').trim();

    const specificCommentKeys = [
        `${field} COMMENT`,
        `${field} Comment`,
        `${field} comment`,
        `${field} Commentary`,
        `${field} Detail`,
        `${field} Details`,
        `${field} description`,
        `${field.toUpperCase()} COMMENT`,
        `${field.toUpperCase()} COMMENTARY`,
        `${field.toUpperCase()} DETAIL`,
        `${field.toUpperCase()} DETAILS`
    ];

    let commentVal = '';
    let hasSpecificComment = false;
    const findCommentInObj = (obj) => {
        if (!obj || typeof obj !== 'object') return '';
        const normField = field.toLowerCase();
        for (const [k, v] of Object.entries(obj)) {
            const normK = k.toLowerCase();
            if (normK.includes(normField) && (normK.includes('comment') || normK.includes('detail') || normK.includes('desc'))) {
                const strV = typeof v === 'object' && v !== null ? String(v.value || v.comment || '') : String(v || '');
                if (strV.trim() !== '') return strV.trim();
            }
        }
        return '';
    };

    if (data) {
        for (const key of specificCommentKeys) {
            const cVal = String(data[key] || data?.SITE?.[key] || data?.Subject?.[key] || '').trim();
            if (cVal) {
                commentVal = cVal;
                hasSpecificComment = true;
                break;
            }
        }
        if (!hasSpecificComment) {
            const foundVal = findCommentInObj(data) || findCommentInObj(data?.SITE) || findCommentInObj(data?.Subject);
            if (foundVal) {
                commentVal = foundVal;
                hasSpecificComment = true;
            }
        }
    }

    if (!value) {
        if (hasSpecificComment) {
            const lowerComment = commentVal.toLowerCase();
            if (lowerComment.includes('none') || lowerComment.includes('public') || lowerComment.includes('private') || commentVal !== '') {
                return { isMatch: true };
            }
        }
        if (supplementalAddendum) {
            return { isMatch: true };
        }
        return {
            isError: true,
            message: `'${field}' in the Site section cannot be blank. If not available, it should be 'None'.`
        };
    }

    let hasInlineDescription = false;
    if (value.includes(':')) {
        const parts = value.split(':');
        if (parts.length > 1 && parts[1].trim() !== '') {
            hasInlineDescription = true;
        }
    }

    if (field === "Alley") {
        const lowerVal = value.toLowerCase();
        if (lowerVal === 'none' || lowerVal === 'public: none' || lowerVal === 'private: none' || lowerVal.includes('none')) {
            return { isMatch: true };
        }
        if (/\b(other|private)\b/i.test(value)) {
            if (!hasSpecificComment && !hasInlineDescription && !supplementalAddendum) {
                return {
                    isError: true,
                    message: `Comments or description are required when 'Alley' is '${value}'.`
                };
            }
        }
        return { isMatch: true };
    }

    if (/\b(other|private)\b/i.test(value)) {
        if (!hasSpecificComment && !hasInlineDescription && !supplementalAddendum) {
            return {
                isError: true,
                message: `Comments or description are required when '${field}' is '${value}'.`
            };
        }
    }

    return { isMatch: true };
};
