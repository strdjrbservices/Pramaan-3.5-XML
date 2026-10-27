import { parseDesignStyle } from './improvementsValidation';
import { is1004And1007Form } from './form1004And1007Validation';

export const parseMMDDYYYY = (str) => {
    if (!str || typeof str !== 'string') return null;
    const trimmed = str.trim();
    const dateRegex = /^(0?[1-9]|1[0-2])\/(0?[1-9]|[12]\d|3[01])\/(\d{4})$/;
    const match = trimmed.match(dateRegex);
    if (!match) return null;

    const month = parseInt(match[1], 10);
    const day = parseInt(match[2], 10);
    const year = parseInt(match[3], 10);
    const dateObj = new Date(year, month - 1, day);
    if (dateObj.getFullYear() !== year || dateObj.getMonth() !== month - 1 || dateObj.getDate() !== day) {
        return null;
    }
    return dateObj;
};

export const parseRentalAmount = (val) => {
    if (val === undefined || val === null) return null;
    const str = String(typeof val === 'object' && val !== null ? (val.value ?? '') : val).trim();
    if (str === '') return null;
    const cleaned = str.replace(/[^0-9.-]+/g, '');
    if (cleaned === '' || cleaned === '-' || cleaned === '.') return NaN;
    const num = parseFloat(cleaned);
    return isNaN(num) ? NaN : num;
};

export const getSubjectRentFieldVal = (allData, fieldName) => {
    if (!allData) return '';
    const aliases = [fieldName];
    if (fieldName === 'Less: Utilities') {
        aliases.push('Less Utilities', 'Utilities', 'Less: Utilities $');
    } else if (fieldName === 'Monthly Rental') {
        aliases.push('Monthly Rent', 'If Currently Rented: $', 'If Currently Rented');
    } else if (fieldName === 'Adjusted Monthly Rent') {
        aliases.push('Adjusted Monthly', 'Adjusted Rent');
    } else if (fieldName === 'Design and Appeal') {
        aliases.push('Design & Appeal', 'Design and Appeal (Subject)', 'Design (Style)', 'Design/Appeal');
    } else if (fieldName === 'Location/View') {
        aliases.push('Location / View', 'Location', 'View');
    } else if (fieldName === 'Age') {
        aliases.push('Actual Age', 'Age (Yrs)', 'Age (Years)');
    } else if (fieldName === 'Condition') {
        aliases.push('Overall Condition', 'Condition Rating');
    } else if (fieldName === 'Room Count Total') {
        aliases.push('Total Rooms', 'Total', 'Rooms', 'Above Grade Room Count Total');
    } else if (fieldName === 'Room Count Bdrms') {
        aliases.push('Bedrooms', 'Bdrms', 'Bedrooms Above Grade');
    } else if (fieldName === 'Room Count Baths') {
        aliases.push('Baths', 'Bathrooms', 'Bath(s)', 'Bath(s) Above Grade');
    } else if (fieldName === 'Gross Living Area') {
        aliases.push('Gross Living Area (GLA)', 'Square Feet of Gross Living Area Above Grade', 'GLA');
    } else if (fieldName === 'Other:') {
        aliases.push('Other', 'Other Feature', 'Other Description');
    }

    for (const f of aliases) {
        const val =
            allData?.['Single Family Rent Schedule']?.[f] ??
            allData?.clean_data?.['Single Family Rent Schedule']?.[f] ??
            allData?.['Subject Rent Schedule']?.[f] ??
            allData?.clean_data?.['Subject Rent Schedule']?.[f] ??
            allData?.Subject?.[f] ??
            allData?.clean_data?.Subject?.[f] ??
            allData?.[f];

        if (val !== undefined && val !== null) {
            const strVal = typeof val === 'object' && val !== null ? (val.value ?? '') : val;
            if (String(strVal).trim() !== '') {
                return String(strVal).trim();
            }
        }
    }
    return '';
};

export const getSubjectOccupant = (allData) => {
    if (!allData) return '';
    const raw = (
        allData?.['Occupant'] ??
        allData?.Subject?.['Occupant'] ??
        allData?.clean_data?.['Occupant'] ??
        allData?.clean_data?.Subject?.['Occupant'] ??
        allData?.['Occupancy'] ??
        allData?.Subject?.['Occupancy'] ??
        allData?.clean_data?.['Occupancy'] ??
        allData?.clean_data?.Subject?.['Occupancy'] ??
        ''
    );
    const strVal = typeof raw === 'object' && raw !== null ? (raw.value ?? '') : raw;
    const lower = String(strVal || '').trim().toLowerCase();
    if (lower === 'tenant' || lower.includes('tenant')) return 'Tenant';
    if (lower === 'owner' || lower.includes('owner')) return 'Owner';
    if (lower === 'vacant' || lower.includes('vacant')) return 'Vacant';
    return '';
};

export const is1007Active = (allData, selectedFormType) => {
    const raw = String(
        selectedFormType ||
        allData?.formType ||
        allData?.selectedFormType ||
        allData?.['Form Type'] ||
        allData?.['From Type'] ||
        allData?.clean_data?.formType ||
        allData?.clean_data?.['Form Type'] ||
        ''
    ).toLowerCase();

    const normalized = raw.replace(/\s+/g, '');

    // If form type is 1004 (and not 1004+1007), it is strictly NOT 1004+1007
    if (normalized.includes('1004') && !normalized.includes('1007')) {
        return false;
    }

    return normalized.includes('1004+1007') || normalized.includes('1007');
};

export const checkRentProximityToSubject = (field, text, allData, path, saleName) => {
    if (field !== 'Proximity to Subject' || !saleName || !saleName.startsWith('COMPARABLE NO.')) {
        return null;
    }

    const proximityText = String(text || '').trim();
    if (!proximityText) return null;

    const proximityValue = parseFloat(proximityText);
    if (isNaN(proximityValue)) return null;

    if (proximityValue > 1) {
        return { isError: true, message: `For Rent Comparables, Proximity to Subject (${proximityText}) must not be greater than 1.0 mile.` };
    }
    return { isMatch: true };
};

export const isNA = (val) => {
    if (val === undefined || val === null) return false;
    const str = String(typeof val === 'object' && val !== null ? (val.value ?? '') : val).trim().toLowerCase();
    return ['n/a', 'na', 'n / a', 'none', 'not applicable', '-', '--'].includes(str);
};

export const isBlankOrNA = (val) => {
    if (val === undefined || val === null) return true;
    const str = String(typeof val === 'object' && val !== null ? (val.value ?? '') : val).trim();
    if (str === '') return true;
    return isNA(str);
};

export const checkLeaseDates = (field, text, allData, path, saleName) => {
    if (field !== 'Date Lease Begins' && field !== 'Date Lease Expires') {
        return null;
    }

    const isSubject = saleName === 'Subject' || (path && path[0] === 'Subject') || (!saleName && !path);
    const isComparable = saleName && saleName.startsWith('COMPARABLE');

    if (!isSubject && !isComparable) {
        return null;
    }

    const dateRegex = /^(0?[1-9]|1[0-2])\/(0?[1-9]|[12]\d|3[01])\/\d{4}$/;

    if (isSubject) {
        if (!is1007Active(allData)) {
            return null;
        }

        const occupant = getSubjectOccupant(allData);

        const currentVal = String(text ?? '').trim();
        const storedBegins = getSubjectRentFieldVal(allData, 'Date Lease Begins');
        const storedExpires = getSubjectRentFieldVal(allData, 'Date Lease Expires');

        const leaseBeginsStr = (field === 'Date Lease Begins') ? currentVal : storedBegins;
        const leaseExpiresStr = (field === 'Date Lease Expires') ? currentVal : storedExpires;
        const thisDateStr = (field === 'Date Lease Begins') ? leaseBeginsStr : leaseExpiresStr;

        // If Occupant is Owner or Vacant, lease dates MUST be blank or N/A
        if (occupant === 'Owner' || occupant === 'Vacant') {
            if (!isBlankOrNA(thisDateStr)) {
                return {
                    isError: true,
                    skipBlankFilter: true,
                    message: `For Subject, '${field}' must be blank or N/A when Occupant is ${occupant}.`
                };
            }
            if (isNA(thisDateStr)) {
                return { isMatch: true };
            }
            return null;
        }

        // If Occupant is Tenant, lease dates MUST be present and valid
        if (occupant === 'Tenant') {
            if (!thisDateStr || isNA(thisDateStr)) {
                return {
                    isError: true,
                    skipBlankFilter: true,
                    message: `For Subject, '${field}' must be present when Occupant is Tenant.`
                };
            }

            if (!dateRegex.test(thisDateStr)) {
                return {
                    isError: true,
                    skipBlankFilter: true,
                    message: `For Subject, '${field}' (${thisDateStr}) must be in MM/DD/YYYY format.`
                };
            }

            const thisDateObj = parseMMDDYYYY(thisDateStr);
            if (!thisDateObj) {
                return {
                    isError: true,
                    skipBlankFilter: true,
                    message: `For Subject, '${field}' (${thisDateStr}) is not a valid calendar date.`
                };
            }

            const beginsDateObj = parseMMDDYYYY(leaseBeginsStr);
            const expiresDateObj = parseMMDDYYYY(leaseExpiresStr);

            // Logical check: End date should be greater than current date
            if (field === 'Date Lease Expires') {
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                if (thisDateObj <= today) {
                    return {
                        isError: true,
                        skipBlankFilter: true,
                        message: `For Subject, 'Date Lease Expires' (${thisDateStr}) must be greater than current date.`
                    };
                }
            }

            // Logical check: End date should be greater than start date
            if (beginsDateObj && expiresDateObj) {
                if (beginsDateObj >= expiresDateObj) {
                    if (field === 'Date Lease Begins') {
                        return {
                            isError: true,
                            skipBlankFilter: true,
                            message: `For Subject, 'Date Lease Begins' (${leaseBeginsStr}) must be before 'Date Lease Expires' (${leaseExpiresStr}).`
                        };
                    } else {
                        return {
                            isError: true,
                            skipBlankFilter: true,
                            message: `For Subject, 'Date Lease Expires' (${leaseExpiresStr}) must be greater than 'Date Lease Begins' (${leaseBeginsStr}).`
                        };
                    }
                }
            }

            return { isMatch: true };
        }

        // If Occupant is not specified, but user entered lease dates
        if (!occupant && !isBlankOrNA(thisDateStr)) {
            return {
                isError: true,
                skipBlankFilter: true,
                message: `When lease dates are present in Rental Grid, 'Occupant' in Subject section must be 'Tenant'.`
            };
        }
        if (!occupant && isNA(thisDateStr)) {
            return { isMatch: true };
        }

        return null;
    }

    // Comparable Rental Dates
    const currentVal = String(text ?? '').trim();
    const compData = allData?.[saleName] ||
                     allData?.['Comparable Rental Data']?.[saleName] ||
                     allData?.clean_data?.['Comparable Rental Data']?.[saleName] || {};
    const storedBegins = String(compData['Date Lease Begins'] || '').trim();
    const storedExpires = String(compData['Date Lease Expires'] || '').trim();

    const leaseBeginsStr = (field === 'Date Lease Begins') ? currentVal : storedBegins;
    const leaseExpiresStr = (field === 'Date Lease Expires') ? currentVal : storedExpires;

    if (!leaseBeginsStr || !leaseExpiresStr || isNA(leaseBeginsStr) || isNA(leaseExpiresStr)) {
        if (isNA(currentVal)) {
            return { isMatch: true };
        }
        return null;
    }

    if (!dateRegex.test(leaseBeginsStr)) {
        return { isError: true, message: `For ${saleName}, 'Date Lease Begins' (${leaseBeginsStr}) must be in MM/DD/YYYY format.` };
    }
    if (!dateRegex.test(leaseExpiresStr)) {
        return { isError: true, message: `For ${saleName}, 'Date Lease Expires' (${leaseExpiresStr}) must be in MM/DD/YYYY format.` };
    }

    const leaseBeginsDate = parseMMDDYYYY(leaseBeginsStr);
    const leaseExpiresDate = parseMMDDYYYY(leaseExpiresStr);

    if (!leaseBeginsDate) {
        return { isError: true, message: `For ${saleName}, 'Date Lease Begins' (${leaseBeginsStr}) is not a valid calendar date.` };
    }
    if (!leaseExpiresDate) {
        return { isError: true, message: `For ${saleName}, 'Date Lease Expires' (${leaseExpiresStr}) is not a valid calendar date.` };
    }

    if (leaseBeginsDate >= leaseExpiresDate) {
        return { isError: true, message: `For ${saleName}, 'Date Lease Begins' (${leaseBeginsStr}) must be before 'Date Lease Expires' (${leaseExpiresStr}).` };
    }

    const diffTime = leaseExpiresDate.getTime() - leaseBeginsDate.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 364 || diffDays > 366) {
        return { isError: true, message: `For ${saleName}, the lease duration between 'Date Lease Begins' (${leaseBeginsStr}) and 'Date Lease Expires' (${leaseExpiresStr}) must be one year.` };
    }

    return { isMatch: true };
};

export const checkSubjectMonthlyRental = (field, text, allData, path, saleName) => {
    if (field !== 'Monthly Rental') return null;
    const isSubject = saleName === 'Subject' || (path && path[0] === 'Subject') || (!saleName && !path);
    if (!isSubject) return null;
    if (!is1007Active(allData)) return null;

    const occupant = getSubjectOccupant(allData);
    if (occupant === 'Tenant') {
        const amt = parseRentalAmount(text);
        if (amt === null) {
            return {
                isError: true,
                skipBlankFilter: true,
                message: "For Subject, 'Monthly Rental' must be present when Occupant is Tenant."
            };
        }
        if (isNaN(amt) || amt <= 0) {
            return {
                isError: true,
                skipBlankFilter: true,
                message: "For Subject, 'Monthly Rental' must be a valid amount greater than 0."
            };
        }
        return { isMatch: true };
    }
    return null;
};

export const checkSubjectUtilities = (field, text, allData, path, saleName) => {
    if (field !== 'Less: Utilities' && field !== 'Less Utilities' && field !== 'Utilities') return null;
    const isSubject = saleName === 'Subject' || (path && path[0] === 'Subject') || (!saleName && !path);
    if (!isSubject) return null;
    if (!is1007Active(allData)) return null;

    const occupant = getSubjectOccupant(allData);
    if (occupant === 'Tenant') {
        const amt = parseRentalAmount(text);
        if (amt === null) {
            return {
                isError: true,
                skipBlankFilter: true,
                message: "For Subject, 'Less: Utilities' must be present when Occupant is Tenant (zero allowed)."
            };
        }
        if (isNaN(amt) || amt < 0) {
            return {
                isError: true,
                skipBlankFilter: true,
                message: "For Subject, 'Less: Utilities' must be a valid amount (0 or greater)."
            };
        }
        return { isMatch: true };
    }
    return null;
};

export const checkSubjectFurniture = (field, text, allData, path, saleName) => {
    if (field !== 'Furniture') return null;
    const isSubject = saleName === 'Subject' || (path && path[0] === 'Subject') || (!saleName && !path);
    if (!isSubject) return null;
    if (!is1007Active(allData)) return null;

    const occupant = getSubjectOccupant(allData);
    if (occupant === 'Tenant') {
        const amt = parseRentalAmount(text);
        if (amt === null) {
            return {
                isError: true,
                skipBlankFilter: true,
                message: "For Subject, 'Furniture' must be present when Occupant is Tenant (zero allowed)."
            };
        }
        if (isNaN(amt) || amt < 0) {
            return {
                isError: true,
                skipBlankFilter: true,
                message: "For Subject, 'Furniture' must be a valid amount (0 or greater)."
            };
        }
        return { isMatch: true };
    }
    return null;
};

export const checkSubjectAdjustedMonthlyRent = (field, text, allData, path, saleName) => {
    if (field !== 'Adjusted Monthly Rent') return null;
    const isSubject = saleName === 'Subject' || (path && path[0] === 'Subject') || (!saleName && !path);
    if (!isSubject) return null;
    if (!is1007Active(allData)) return null;

    const occupant = getSubjectOccupant(allData);
    if (occupant === 'Tenant') {
        const amt = parseRentalAmount(text);
        if (amt === null) {
            return {
                isError: true,
                skipBlankFilter: true,
                message: "For Subject, 'Adjusted Monthly Rent' must be present when Occupant is Tenant."
            };
        }
        if (isNaN(amt) || amt <= 0) {
            return {
                isError: true,
                skipBlankFilter: true,
                message: "For Subject, 'Adjusted Monthly Rent' must be a valid amount greater than 0."
            };
        }
        return { isMatch: true };
    }
    return null;
};

export const checkOtherBasement = (field, text, allData, path, saleName) => {
    if (field !== 'Other (e.g., basement, etc.)' && field !== 'Other (e.g., basement)' && field !== 'Other Basement') {
        return null;
    }

    if (!saleName || !saleName.startsWith('COMPARABLE')) {
        return null;
    }

    const subjRent = allData?.['Single Family Rent Schedule'] ||
                     allData?.clean_data?.['Single Family Rent Schedule'] ||
                     allData?.['Subject Rent Schedule'] ||
                     allData?.clean_data?.['Subject Rent Schedule'] ||
                     allData?.Subject ||
                     allData?.clean_data?.Subject ||
                     {};

    const subjectValue = subjRent['Other (e.g., basement, etc.)'] ??
                         subjRent['Other (e.g., basement)'] ??
                         subjRent['Other Basement'] ??
                         allData?.Subject?.['Other (e.g., basement, etc.)'] ??
                         allData?.Subject?.['Other (e.g., basement)'] ??
                         allData?.Subject?.['Other Basement'];
    const comparableValue = text;

    const subjectValueStr = String(subjectValue || '').trim();
    const comparableValueStr = String(comparableValue || '').trim();

    if (subjectValueStr === comparableValueStr) {
        return { isMatch: true };
    } else {
        return { isError: true, message: `Value (${comparableValueStr || 'empty'}) does not match Subject's value (${subjectValueStr || 'empty'}).` };
    }
};

const normalizeForCompare = (val) =>
    String(val || '')
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '');

const parseAdjustmentValue = (adjStr) => {
    if (adjStr === null || adjStr === undefined) return 0;
    const str = String(typeof adjStr === 'object' && adjStr !== null ? (adjStr.value ?? '') : adjStr).trim();
    if (!str) return 0;
    const isNegative = str.includes('-') || /^\s*\(\s*\d+/.test(str);
    const digits = str.replace(/[^0-9.]/g, '');
    const num = parseFloat(digits);
    if (isNaN(num)) return 0;
    return isNegative ? -num : num;
};

const parseAreaToSqFt = (areaStr) => {
    if (areaStr === null || areaStr === undefined) return NaN;
    const str = String(typeof areaStr === 'object' && areaStr !== null ? (areaStr.value ?? '') : areaStr).trim();
    if (!str) return NaN;
    const cleaned = str.replace(/,/g, '').replace(/[^0-9.]/g, '');
    const num = parseFloat(cleaned);
    return isNaN(num) ? NaN : num;
};

const extractConditionRating = (condStr) => {
    if (!condStr) return '';
    const str = String(typeof condStr === 'object' && condStr !== null ? (condStr.value ?? '') : condStr).trim();
    const match = str.match(/\b(C[1-6])\b/i);
    if (match) return match[1].toUpperCase();
    return normalizeForCompare(str);
};

/**
 * Validates consistency for Form Type 1004 + 1007:
 * The Subject's 'Design and Appeal' in the Comparable Rent Schedule (rental grid)
 * must match with 'Design (Style)' from the Improvements section (and Sales Comparison Approach).
 */
export const checkRentSubjectDesignStyleConsistency = (field, text, allData, fieldPath, saleName, formType) => {
    const isDesignField = field === 'Design and Appeal' || field === 'Design & Appeal' || field === 'Design (Style)';
    if (!isDesignField) return null;

    // Only validate the Subject property in the rent schedule
    if (saleName && saleName !== 'Subject') return null;
    if (!allData) return null;

    // Only active when 1007 form or 1004+1007 form is detected
    if (!is1007Active(allData, formType) && !is1004And1007Form(allData, formType)) return null;

    // 1. Get Subject Design & Appeal from Rental Grid
    const isRentSubjectField = saleName === 'Subject' && (
        field === 'Design and Appeal' ||
        field === 'Design & Appeal' ||
        (fieldPath && fieldPath[0] === 'Subject' && (fieldPath[1] === 'Design and Appeal' || fieldPath[1] === 'Design & Appeal'))
    );

    let rentRaw = isRentSubjectField && text !== undefined && text !== null
        ? String(typeof text === 'object' ? (text.value ?? '') : text).trim()
        : String(
            getSubjectRentFieldVal(allData, 'Design and Appeal') ||
            allData['Single Family Rent Schedule']?.['Design and Appeal'] ||
            allData['Subject Rent Schedule']?.['Design and Appeal'] ||
            allData.Subject?.['Design and Appeal'] ||
            allData.clean_data?.['Single Family Rent Schedule']?.['Design and Appeal'] ||
            allData.clean_data?.['Subject Rent Schedule']?.['Design and Appeal'] ||
            allData.clean_data?.Subject?.['Design and Appeal'] ||
            ''
        ).trim();

    // 2. Get Improvements Design (Style)
    const isImprovementsField = fieldPath && (fieldPath[0] === 'IMPROVEMENTS' || fieldPath[0] === 'Improvements');
    let impRaw = isImprovementsField && text !== undefined && text !== null
        ? String(typeof text === 'object' ? (text.value ?? '') : text).trim()
        : String(
            allData.IMPROVEMENTS?.['Design (Style)'] ||
            allData.Improvements?.['Design (Style)'] ||
            allData.clean_data?.IMPROVEMENTS?.['Design (Style)'] ||
            allData.clean_data?.Improvements?.['Design (Style)'] ||
            allData['Design (Style)'] ||
            ''
        ).trim();

    // 3. Get Sales Grid Subject Design (Style) as fallback target
    const isSalesGridField = fieldPath && fieldPath[0] === 'Subject' && field === 'Design (Style)';
    let salesGridRaw = isSalesGridField && text !== undefined && text !== null
        ? String(typeof text === 'object' ? (text.value ?? '') : text).trim()
        : String(
            allData.SALES_GRID?.Subject?.['Design (Style)'] ||
            allData['Sales Grid']?.Subject?.['Design (Style)'] ||
            allData.SALES_GRID?.SUBJECT?.['Design (Style)'] ||
            allData['Sales Grid']?.SUBJECT?.['Design (Style)'] ||
            allData.Subject?.['Design (Style)'] ||
            allData.clean_data?.Subject?.['Design (Style)'] ||
            allData.comparisonData?.Subject?.['Design (Style)'] ||
            ''
        ).trim();

    // If either value is blank, let blank checks handle it
    if (!rentRaw) return null;
    const targetRaw = impRaw || salesGridRaw;
    const targetSource = impRaw ? 'Improvements section' : 'Sales Comparison Grid (Subject)';
    if (!targetRaw) return null;

    // Parse out any UAD prefixes (e.g. "DT1;R Ranch" -> "R Ranch")
    const rentParsed = parseDesignStyle(rentRaw);
    const targetParsed = parseDesignStyle(targetRaw);

    const rentNorm = normalizeForCompare(rentParsed.style);
    const targetNorm = normalizeForCompare(targetParsed.style);

    if (!rentNorm || !targetNorm) return null;

    const isExactMatch = rentNorm === targetNorm;
    const isSubstringMatch = rentNorm.includes(targetNorm) || targetNorm.includes(rentNorm);
    const isAbbrMatch = (
        (rentNorm.includes('rranch') && targetNorm.includes('raisedranch')) ||
        (targetNorm.includes('rranch') && rentNorm.includes('raisedranch')) ||
        (rentNorm.includes('splitlvl') && targetNorm.includes('splitlevel')) ||
        (targetNorm.includes('splitlvl') && rentNorm.includes('splitlevel')) ||
        (rentNorm.includes('contemp') && targetNorm.includes('contemporary')) ||
        (targetNorm.includes('contemp') && rentNorm.includes('contemporary')) ||
        (rentNorm.includes('trad') && targetNorm.includes('traditional')) ||
        (targetNorm.includes('trad') && rentNorm.includes('traditional')) ||
        (rentNorm.includes('col') && targetNorm.includes('colonial')) ||
        (targetNorm.includes('col') && rentNorm.includes('colonial'))
    );

    if (!isExactMatch && !isSubstringMatch && !isAbbrMatch) {
        return {
            isError: true,
            skipBlankFilter: true,
            message: `Design mismatch: ${targetSource} indicates '${targetRaw}', but Rental Grid (Subject) indicates '${rentRaw}'. Please reconcile and revise.`
        };
    }

    return { isMatch: true, message: "validated" };
};

/**
 * Validates that for comparable rentals in the 1007 Rental Grid,
 * if 'Design and Appeal' differs from the Subject's 'Design and Appeal',
 * an adjustment is required in 'Design and Appeal Adjustment'.
 */
export const checkRentDesignAppealAdjustment = (field, text, allData, fieldPath, rentName) => {
    const isDesignField = field === 'Design and Appeal' || field === 'Design & Appeal';
    const isAdjField = field === 'Design and Appeal Adjustment' || field === 'Design & Appeal Adjustment';
    if (!isDesignField && !isAdjField) return null;

    if (!rentName || rentName === 'Subject') return null;
    if (!allData) return null;

    // Get Subject Design from Rental Grid or Improvements / Sales Grid
    const subjectDesign = String(
        getSubjectRentFieldVal(allData, 'Design and Appeal') ||
        allData['Single Family Rent Schedule']?.['Design and Appeal'] ||
        allData['Subject Rent Schedule']?.['Design and Appeal'] ||
        allData.Subject?.['Design and Appeal'] ||
        allData.IMPROVEMENTS?.['Design (Style)'] ||
        allData.Subject?.['Design (Style)'] ||
        ''
    ).trim();

    // Get Comp Design from the comparable rent entry
    const compObj = allData[rentName] ||
                    allData['Comparable Rental Data']?.[rentName] ||
                    allData.clean_data?.['Comparable Rental Data']?.[rentName] ||
                    {};
    const compDesign = String(
        (isDesignField && text !== undefined && text !== null ? (typeof text === 'object' ? (text.value ?? '') : text) : compObj['Design and Appeal']) ||
        compObj['Design & Appeal'] ||
        compObj['Design (Style)'] ||
        ''
    ).trim();

    // Get Adjustment
    const adjObj = allData[rentName] ||
                   allData['Comparable Rent Adjustments']?.[rentName] ||
                   allData[`${rentName} Adjustments`] ||
                   compObj;
    const adjustmentText = String(
        (isAdjField && text !== undefined && text !== null ? (typeof text === 'object' ? (text.value ?? '') : text) : adjObj['Design and Appeal Adjustment']) ||
        adjObj['Design and Appeal Adj'] ||
        adjObj['Design & Appeal Adjustment'] ||
        ''
    ).trim();

    if (subjectDesign && compDesign) {
        const subjParsed = parseDesignStyle(subjectDesign);
        const compParsed = parseDesignStyle(compDesign);

        const subjNorm = normalizeForCompare(subjParsed.style);
        const compNorm = normalizeForCompare(compParsed.style);

        if (subjNorm && compNorm) {
            const isMatch = subjNorm === compNorm ||
                            subjNorm.includes(compNorm) || compNorm.includes(subjNorm) ||
                            ((subjNorm.includes('rranch') && compNorm.includes('raisedranch')) || (compNorm.includes('rranch') && subjNorm.includes('raisedranch'))) ||
                            ((subjNorm.includes('splitlvl') && compNorm.includes('splitlevel')) || (compNorm.includes('splitlvl') && subjNorm.includes('splitlevel')));

            const designsAreDifferent = !isMatch;
            const adjustmentIsPresent = adjustmentText !== '';

            if (designsAreDifferent && !adjustmentIsPresent) {
                return {
                    isError: true,
                    message: `Design/Appeal mismatch (Subject: '${subjectDesign}', Comp: '${compDesign}'). An adjustment is required, even if $0.`
                };
            }
        }
    }

    return { isMatch: true };
};

/**
 * Validates consistency for Subject 'Location/View' in the 1007 Rental Grid
 * against the Subject's Location and View from Sales Comparison Grid (and Site/Neighborhood).
 */
export const checkRentSubjectLocationViewConsistency = (field, text, allData, fieldPath, saleName, formType) => {
    const isLocViewField = field === 'Location/View' || field === 'Location / View' || field === 'Location' || field === 'View';
    if (!isLocViewField) return null;
    if (saleName && saleName !== 'Subject') return null;
    if (!allData) return null;
    if (!is1007Active(allData, formType) && !is1004And1007Form(allData, formType)) return null;

    const rentRaw = String(
        (text !== undefined && text !== null ? (typeof text === 'object' ? (text.value ?? '') : text) : '') ||
        getSubjectRentFieldVal(allData, 'Location/View') ||
        allData?.Subject?.['Location/View'] ||
        ''
    ).trim();

    if (!rentRaw) return null;

    const salesLoc = String(
        allData.SALES_GRID?.Subject?.['Location'] ||
        allData['Sales Grid']?.Subject?.['Location'] ||
        allData.Subject?.['Location'] ||
        allData.clean_data?.Subject?.['Location'] ||
        allData.NEIGHBORHOOD?.['Location'] ||
        ''
    ).trim();

    const salesView = String(
        allData.SALES_GRID?.Subject?.['View'] ||
        allData['Sales Grid']?.Subject?.['View'] ||
        allData.Subject?.['View'] ||
        allData.clean_data?.Subject?.['View'] ||
        allData.SITE?.['View'] ||
        ''
    ).trim();

    if (!salesLoc && !salesView) {
        return { isMatch: true, message: "validated" };
    }

    const normRent = normalizeForCompare(rentRaw);
    const normLoc = normalizeForCompare(salesLoc);
    const normView = normalizeForCompare(salesView);

    const locMatches = !normLoc || normRent.includes(normLoc) || normLoc.includes(normRent);
    const viewMatches = !normView || normRent.includes(normView) || normView.includes(normRent);

    if (locMatches && viewMatches) {
        return { isMatch: true, message: "validated" };
    }

    const checkTokensMatch = (source, target) => {
        if (!source || !target) return true;
        const tokens = source.split(/[\s;/\\]+/).map(t => normalizeForCompare(t)).filter(Boolean);
        if (tokens.length === 0) return true;
        return tokens.every(token => target.includes(token));
    };

    if (checkTokensMatch(salesLoc, normRent) && checkTokensMatch(salesView, normRent)) {
        return { isMatch: true, message: "validated" };
    }

    return {
        isError: true,
        skipBlankFilter: true,
        message: `Location/View mismatch: Sales Comparison indicates Location '${salesLoc || 'N/A'}' and View '${salesView || 'N/A'}', but Rental Grid indicates '${rentRaw}'. Please reconcile and revise.`
    };
};

/**
 * Validates Comparable Rentals 'Location/View Adjustment' in the 1007 Rental Grid.
 */
export const checkRentLocationViewAdjustment = (field, text, allData, fieldPath, rentName) => {
    const isField = field === 'Location/View' || field === 'Location / View' || field === 'Location/View Adjustment' || field === 'Location / View Adjustment';
    if (!isField || !rentName || rentName === 'Subject' || !allData) return null;

    const isAdjField = field.includes('Adjustment');
    const subjVal = String(
        getSubjectRentFieldVal(allData, 'Location/View') ||
        allData.SALES_GRID?.Subject?.['Location'] ||
        allData.Subject?.['Location/View'] ||
        allData.Subject?.['Location'] ||
        ''
    ).trim();

    const compObj = allData[rentName] ||
                    allData['Comparable Rental Data']?.[rentName] ||
                    allData.clean_data?.['Comparable Rental Data']?.[rentName] ||
                    {};
    const compVal = String(
        (!isAdjField && text !== undefined && text !== null ? (typeof text === 'object' ? (text.value ?? '') : text) : compObj['Location/View']) ||
        compObj['Location / View'] ||
        compObj['Location'] ||
        ''
    ).trim();

    const adjObj = allData[rentName] ||
                   allData['Comparable Rent Adjustments']?.[rentName] ||
                   allData[`${rentName} Adjustments`] ||
                   compObj;
    const adjStr = String(
        (isAdjField && text !== undefined && text !== null ? (typeof text === 'object' ? (text.value ?? '') : text) : adjObj['Location/View Adjustment']) ||
        adjObj['Location / View Adjustment'] ||
        adjObj['Location Adjustment'] ||
        ''
    ).trim();

    if (subjVal && compVal) {
        const normSubj = normalizeForCompare(subjVal);
        const normComp = normalizeForCompare(compVal);

        if (normSubj !== normComp) {
            if (adjStr === '') {
                return {
                    isError: true,
                    message: `Location/View mismatch (Subject: '${subjVal}', Comp: '${compVal}'). An adjustment is required, even if $0.`
                };
            }
        } else {
            if (adjStr !== '' && adjStr !== '0' && adjStr !== '$0' && parseAdjustmentValue(adjStr) !== 0) {
                return {
                    isError: true,
                    message: `Location/View is the same (${subjVal}), but adjustment is not $0.`
                };
            }
        }
    }

    return { isMatch: true };
};

/**
 * Validates consistency for Subject 'Age' in the 1007 Rental Grid
 * against Sales Grid Subject 'Actual Age' and Improvements 'Year Built'.
 */
export const checkRentSubjectAgeConsistency = (field, text, allData, fieldPath, saleName, formType) => {
    const isAgeField = field === 'Age' || field === 'Actual Age';
    if (!isAgeField) return null;
    if (saleName && saleName !== 'Subject') return null;
    if (!allData) return null;
    if (!is1007Active(allData, formType) && !is1004And1007Form(allData, formType)) return null;

    const rentAgeStr = String(
        (text !== undefined && text !== null ? (typeof text === 'object' ? (text.value ?? '') : text) : '') ||
        getSubjectRentFieldVal(allData, 'Age') ||
        allData?.Subject?.['Age'] ||
        allData?.Subject?.['Actual Age'] ||
        ''
    ).trim();

    if (!rentAgeStr) return null;

    let rentAge = parseInt(rentAgeStr.replace(/[^0-9]/g, ''), 10);
    if (isNaN(rentAge) && rentAgeStr.toLowerCase().includes('new')) {
        rentAge = 0;
    }
    if (isNaN(rentAge)) return null;

    const salesAgeStr = String(
        allData.SALES_GRID?.Subject?.['Actual Age'] ||
        allData['Sales Grid']?.Subject?.['Actual Age'] ||
        allData.SALES_GRID?.Subject?.['Age'] ||
        allData['Sales Grid']?.Subject?.['Age'] ||
        allData.Subject?.['Actual Age'] ||
        allData.Subject?.['Age'] ||
        allData.clean_data?.Subject?.['Actual Age'] ||
        ''
    ).trim();
    let salesAge = parseInt(salesAgeStr.replace(/[^0-9]/g, ''), 10);
    if (isNaN(salesAge) && salesAgeStr.toLowerCase().includes('new')) {
        salesAge = 0;
    }

    const yearBuiltStr = String(
        allData.IMPROVEMENTS?.['Year Built'] ||
        allData.Improvements?.['Year Built'] ||
        allData['Year Built'] ||
        allData.Subject?.['Year Built'] ||
        ''
    ).trim();
    const yearBuilt = parseInt(yearBuiltStr.replace(/[^0-9]/g, ''), 10);

    let currentYear = new Date().getFullYear();
    const effectiveDateStr = String(
        allData.CERTIFICATION?.['Effective Date of Appraisal'] ||
        allData['Effective Date of Appraisal'] ||
        allData['Effective Date'] ||
        ''
    ).trim();
    if (effectiveDateStr) {
        const ym = effectiveDateStr.match(/\b(19\d\d|20\d\d)\b/);
        if (ym) currentYear = parseInt(ym[1], 10);
    }

    if (!isNaN(salesAge)) {
        if (rentAge === salesAge) {
            return { isMatch: true, message: "validated" };
        }
        return {
            isError: true,
            skipBlankFilter: true,
            message: `Subject Age (${rentAgeStr}) in Rental Grid does not match Sales Grid Subject Actual Age (${salesAgeStr}). Please reconcile and revise.`
        };
    }

    if (!isNaN(yearBuilt)) {
        const calculatedAge = currentYear - yearBuilt;
        if (Math.abs(calculatedAge - rentAge) <= 1) {
            return { isMatch: true, message: "validated" };
        }
        return {
            isError: true,
            skipBlankFilter: true,
            message: `Subject Age (${rentAgeStr}) in Rental Grid does not match Year Built (${yearBuiltStr}, expected ~${calculatedAge}). Please reconcile and revise.`
        };
    }

    return { isMatch: true, message: "validated" };
};

/**
 * Validates Comparable Rentals 'Age Adjustment' in the 1007 Rental Grid.
 */
export const checkRentAgeAdjustment = (field, text, allData, fieldPath, rentName) => {
    const isField = field === 'Age' || field === 'Age Adjustment' || field === 'Actual Age' || field === 'Actual Age Adjustment';
    if (!isField || !rentName || rentName === 'Subject' || !allData) return null;

    const isAdjField = field.includes('Adjustment');
    const subjVal = String(
        getSubjectRentFieldVal(allData, 'Age') ||
        allData.SALES_GRID?.Subject?.['Actual Age'] ||
        allData.Subject?.['Age'] ||
        allData.Subject?.['Actual Age'] ||
        ''
    ).trim();

    const compObj = allData[rentName] ||
                    allData['Comparable Rental Data']?.[rentName] ||
                    allData.clean_data?.['Comparable Rental Data']?.[rentName] ||
                    {};
    const compVal = String(
        (!isAdjField && text !== undefined && text !== null ? (typeof text === 'object' ? (text.value ?? '') : text) : compObj['Age']) ||
        compObj['Actual Age'] ||
        ''
    ).trim();

    const adjObj = allData[rentName] ||
                   allData['Comparable Rent Adjustments']?.[rentName] ||
                   allData[`${rentName} Adjustments`] ||
                   compObj;
    const adjStr = String(
        (isAdjField && text !== undefined && text !== null ? (typeof text === 'object' ? (text.value ?? '') : text) : adjObj['Age Adjustment']) ||
        adjObj['Actual Age Adjustment'] ||
        adjObj['Age Adj'] ||
        ''
    ).trim();

    if (subjVal && compVal) {
        let subjAge = parseInt(subjVal.replace(/[^0-9]/g, ''), 10);
        let compAge = parseInt(compVal.replace(/[^0-9]/g, ''), 10);
        if (isNaN(subjAge) && subjVal.toLowerCase().includes('new')) subjAge = 0;
        if (isNaN(compAge) && compVal.toLowerCase().includes('new')) compAge = 0;

        if (!isNaN(subjAge) && !isNaN(compAge)) {
            if (subjAge !== compAge) {
                if (adjStr === '') {
                    return {
                        isError: true,
                        message: `Age mismatch (Subject: '${subjVal}', Comp: '${compVal}'). An adjustment is required, even if $0.`
                    };
                }
            } else {
                if (adjStr !== '' && adjStr !== '0' && adjStr !== '$0' && parseAdjustmentValue(adjStr) !== 0) {
                    return {
                        isError: true,
                        message: `Age is the same (${subjVal}), but adjustment is not $0.`
                    };
                }
            }
        }
    }

    return { isMatch: true };
};

/**
 * Validates consistency for Subject 'Condition' in the 1007 Rental Grid
 * against Sales Grid Subject 'Condition' and Improvements Condition.
 */
export const checkRentSubjectConditionConsistency = (field, text, allData, fieldPath, saleName, formType) => {
    if (field !== 'Condition') return null;
    if (saleName && saleName !== 'Subject') return null;
    if (!allData) return null;
    if (!is1007Active(allData, formType) && !is1004And1007Form(allData, formType)) return null;

    const rentCondStr = String(
        (text !== undefined && text !== null ? (typeof text === 'object' ? (text.value ?? '') : text) : '') ||
        getSubjectRentFieldVal(allData, 'Condition') ||
        allData?.Subject?.['Condition'] ||
        ''
    ).trim();

    if (!rentCondStr) return null;

    const salesCondStr = String(
        allData.SALES_GRID?.Subject?.['Condition'] ||
        allData['Sales Grid']?.Subject?.['Condition'] ||
        allData.Subject?.['Condition'] ||
        allData.clean_data?.Subject?.['Condition'] ||
        ''
    ).trim();

    const impCondStr = String(
        allData.IMPROVEMENTS?.['Overall Condition'] ||
        allData.IMPROVEMENTS?.['Describe the condition of the property'] ||
        allData.Improvements?.['Overall Condition'] ||
        ''
    ).trim();

    const rentRating = extractConditionRating(rentCondStr);
    const targetRating = extractConditionRating(salesCondStr || impCondStr);

    if (targetRating) {
        if (rentRating === targetRating) {
            return { isMatch: true, message: "validated" };
        }
        return {
            isError: true,
            skipBlankFilter: true,
            message: `Condition mismatch: Sales Grid/Improvements indicates '${salesCondStr || impCondStr}', but Rental Grid indicates '${rentCondStr}'. Please reconcile and revise.`
        };
    }

    if (rentRating) {
        return { isMatch: true, message: "validated" };
    }
    return null;
};

/**
 * Validates Comparable Rentals 'Condition Adjustment' in the 1007 Rental Grid.
 */
export const checkRentConditionAdjustment = (field, text, allData, fieldPath, rentName) => {
    const isField = field === 'Condition' || field === 'Condition Adjustment';
    if (!isField || !rentName || rentName === 'Subject' || !allData) return null;

    const isAdjField = field === 'Condition Adjustment';
    const subjVal = String(
        getSubjectRentFieldVal(allData, 'Condition') ||
        allData.SALES_GRID?.Subject?.['Condition'] ||
        allData.Subject?.['Condition'] ||
        ''
    ).trim();

    const compObj = allData[rentName] ||
                    allData['Comparable Rental Data']?.[rentName] ||
                    allData.clean_data?.['Comparable Rental Data']?.[rentName] ||
                    {};
    const compVal = String(
        (!isAdjField && text !== undefined && text !== null ? (typeof text === 'object' ? (text.value ?? '') : text) : compObj['Condition']) ||
        ''
    ).trim();

    const adjObj = allData[rentName] ||
                   allData['Comparable Rent Adjustments']?.[rentName] ||
                   allData[`${rentName} Adjustments`] ||
                   compObj;
    const adjStr = String(
        (isAdjField && text !== undefined && text !== null ? (typeof text === 'object' ? (text.value ?? '') : text) : adjObj['Condition Adjustment']) ||
        adjObj['Condition Adj'] ||
        ''
    ).trim();

    if (subjVal && compVal) {
        const subjRating = extractConditionRating(subjVal);
        const compRating = extractConditionRating(compVal);

        if (subjRating && compRating) {
            if (subjRating !== compRating) {
                if (adjStr === '') {
                    return {
                        isError: true,
                        message: `Condition mismatch (Subject: '${subjVal}', Comp: '${compVal}'). An adjustment is required, even if $0.`
                    };
                }
            } else {
                if (adjStr !== '' && adjStr !== '0' && adjStr !== '$0' && parseAdjustmentValue(adjStr) !== 0) {
                    return {
                        isError: true,
                        message: `Condition is the same (${subjVal}), but adjustment is not $0.`
                    };
                }
            }
        }
    }

    return { isMatch: true };
};

/**
 * Validates consistency for Subject 'Room Count Total', 'Room Count Bdrms', and 'Room Count Baths'
 * in the 1007 Rental Grid against Sales Grid Subject and Improvements room counts.
 */
export const checkRentSubjectRoomCountConsistency = (field, text, allData, fieldPath, saleName, formType) => {
    const isRoomField = field === 'Room Count Total' || field === 'Room Count Bdrms' || field === 'Room Count Baths' || field === 'Above Grade Room Count';
    if (!isRoomField) return null;
    if (saleName && saleName !== 'Subject') return null;
    if (!allData) return null;
    if (!is1007Active(allData, formType) && !is1004And1007Form(allData, formType)) return null;

    const valStr = String(
        (text !== undefined && text !== null ? (typeof text === 'object' ? (text.value ?? '') : text) : '') ||
        getSubjectRentFieldVal(allData, field) ||
        allData?.Subject?.[field] ||
        ''
    ).trim();

    if (!valStr) return null;

    if (field === 'Room Count Total') {
        const rentNum = parseInt(valStr.replace(/[^0-9]/g, ''), 10);
        const targetVal = String(
            allData.SALES_GRID?.Subject?.['Total'] ||
            allData.SALES_GRID?.Subject?.['Total Rooms'] ||
            allData.Subject?.['Total Rooms'] ||
            allData.Subject?.['Total'] ||
            allData.IMPROVEMENTS?.['Finished area above grade Rooms'] ||
            allData.Improvements?.['Finished area above grade Rooms'] ||
            ''
        ).trim();
        const targetNum = parseInt(targetVal.replace(/[^0-9]/g, ''), 10);

        if (!isNaN(rentNum) && !isNaN(targetNum)) {
            if (rentNum === targetNum) {
                return { isMatch: true, message: "validated" };
            }
            return {
                isError: true,
                skipBlankFilter: true,
                message: `Total room count mismatch: Sales Grid/Improvements indicates '${targetVal}', but Rental Grid indicates '${valStr}'. Please reconcile and revise.`
            };
        }
        if (!isNaN(rentNum)) return { isMatch: true, message: "validated" };
    }

    if (field === 'Room Count Bdrms') {
        const rentNum = parseInt(valStr.replace(/[^0-9]/g, ''), 10);
        const targetVal = String(
            allData.SALES_GRID?.Subject?.['Bedrooms'] ||
            allData.SALES_GRID?.Subject?.['Bdrms'] ||
            allData.Subject?.['Bedrooms'] ||
            allData.Subject?.['Bdrms'] ||
            allData.IMPROVEMENTS?.['Finished area above grade Bedrooms'] ||
            allData.Improvements?.['Finished area above grade Bedrooms'] ||
            ''
        ).trim();
        const targetNum = parseInt(targetVal.replace(/[^0-9]/g, ''), 10);

        if (!isNaN(rentNum) && !isNaN(targetNum)) {
            if (rentNum === targetNum) {
                return { isMatch: true, message: "validated" };
            }
            return {
                isError: true,
                skipBlankFilter: true,
                message: `Bedroom count mismatch: Sales Grid/Improvements indicates '${targetVal}', but Rental Grid indicates '${valStr}'. Please reconcile and revise.`
            };
        }
        if (!isNaN(rentNum)) return { isMatch: true, message: "validated" };
    }

    if (field === 'Room Count Baths') {
        const rentNum = parseFloat(valStr.replace(/[^0-9.]/g, ''));
        const targetVal = String(
            allData.SALES_GRID?.Subject?.['Baths'] ||
            allData.Subject?.['Baths'] ||
            allData.IMPROVEMENTS?.['Finished area above grade Bath(s)'] ||
            allData.Improvements?.['Finished area above grade Bath(s)'] ||
            ''
        ).trim();
        const targetNum = parseFloat(targetVal.replace(/[^0-9.]/g, ''));

        if (!isNaN(rentNum) && !isNaN(targetNum)) {
            if (rentNum === targetNum) {
                return { isMatch: true, message: "validated" };
            }
            return {
                isError: true,
                skipBlankFilter: true,
                message: `Bathroom count mismatch: Sales Grid/Improvements indicates '${targetVal}', but Rental Grid indicates '${valStr}'. Please reconcile and revise.`
            };
        }
        if (!isNaN(rentNum)) return { isMatch: true, message: "validated" };
    }

    return { isMatch: true, message: "validated" };
};

/**
 * Validates Comparable Rentals 'Room Count Total Adjustment' in the 1007 Rental Grid.
 */
export const checkRentRoomCountAdjustment = (field, text, allData, fieldPath, rentName) => {
    const isField = field === 'Room Count Total Adjustment' || field === 'Room Count Total' || field === 'Room Count Bdrms' || field === 'Room Count Baths';
    if (!isField || !rentName || rentName === 'Subject' || !allData) return null;

    const isAdjField = field === 'Room Count Total Adjustment';

    const subjBdrms = parseInt(String(getSubjectRentFieldVal(allData, 'Room Count Bdrms') || allData.SALES_GRID?.Subject?.['Bedrooms'] || allData.Subject?.['Bedrooms'] || '0').replace(/[^0-9]/g, ''), 10);
    const subjBaths = parseFloat(String(getSubjectRentFieldVal(allData, 'Room Count Baths') || allData.SALES_GRID?.Subject?.['Baths'] || allData.Subject?.['Baths'] || '0').replace(/[^0-9.]/g, ''));
    const subjTotal = parseInt(String(getSubjectRentFieldVal(allData, 'Room Count Total') || allData.SALES_GRID?.Subject?.['Total'] || allData.Subject?.['Total Rooms'] || '0').replace(/[^0-9]/g, ''), 10);

    const compObj = allData[rentName] ||
                    allData['Comparable Rental Data']?.[rentName] ||
                    allData.clean_data?.['Comparable Rental Data']?.[rentName] ||
                    {};

    let compBdrms = parseInt(String(compObj['Room Count Bdrms'] || compObj['Bedrooms'] || '0').replace(/[^0-9]/g, ''), 10);
    let compBaths = parseFloat(String(compObj['Room Count Baths'] || compObj['Baths'] || '0').replace(/[^0-9.]/g, ''));
    let compTotal = parseInt(String(compObj['Room Count Total'] || compObj['Total Rooms'] || '0').replace(/[^0-9]/g, ''), 10);

    if (text !== undefined && text !== null && !isAdjField) {
        const num = parseFloat(String(typeof text === 'object' ? (text.value ?? '') : text).replace(/[^0-9.]/g, ''));
        if (!isNaN(num)) {
            if (field === 'Room Count Bdrms') compBdrms = num;
            if (field === 'Room Count Baths') compBaths = num;
            if (field === 'Room Count Total') compTotal = num;
        }
    }

    const adjObj = allData[rentName] ||
                   allData['Comparable Rent Adjustments']?.[rentName] ||
                   allData[`${rentName} Adjustments`] ||
                   compObj;
    const adjStr = String(
        (isAdjField && text !== undefined && text !== null ? (typeof text === 'object' ? (text.value ?? '') : text) : adjObj['Room Count Total Adjustment']) ||
        adjObj['Room Count Adjustment'] ||
        ''
    ).trim();

    if (subjTotal > 0 && compTotal > 0) {
        const countsDiffer = compBdrms !== subjBdrms || compBaths !== subjBaths || compTotal !== subjTotal;
        if (countsDiffer) {
            if (adjStr === '') {
                return {
                    isError: true,
                    message: `Room count mismatch (Subject: ${subjTotal}/${subjBdrms}/${subjBaths}, Comp: ${compTotal}/${compBdrms}/${compBaths}). An adjustment is required, even if $0.`
                };
            }
            const adjVal = parseAdjustmentValue(adjStr);
            if (compBdrms > subjBdrms && adjVal > 0) {
                return {
                    isError: true,
                    message: `Warning: Comp has more bedrooms (${compBdrms}) than Subject (${subjBdrms}), so a negative adjustment is expected.`
                };
            }
            if (compBdrms < subjBdrms && adjVal < 0) {
                return {
                    isError: true,
                    message: `Warning: Comp has fewer bedrooms (${compBdrms}) than Subject (${subjBdrms}), so a positive adjustment is expected.`
                };
            }
        } else {
            if (adjStr !== '' && adjStr !== '0' && adjStr !== '$0' && parseAdjustmentValue(adjStr) !== 0) {
                return {
                    isError: true,
                    message: `Room count is the same, but adjustment is not $0.`
                };
            }
        }
    }

    return { isMatch: true };
};

/**
 * Validates consistency for Subject 'Gross Living Area' in the 1007 Rental Grid
 * against Sales Grid Subject GLA and Improvements GLA.
 */
export const checkRentSubjectGrossLivingAreaConsistency = (field, text, allData, fieldPath, saleName, formType) => {
    if (field !== 'Gross Living Area' && field !== 'GLA') return null;
    if (saleName && saleName !== 'Subject') return null;
    if (!allData) return null;
    if (!is1007Active(allData, formType) && !is1004And1007Form(allData, formType)) return null;

    const rentGlaStr = String(
        (text !== undefined && text !== null ? (typeof text === 'object' ? (text.value ?? '') : text) : '') ||
        getSubjectRentFieldVal(allData, 'Gross Living Area') ||
        allData?.Subject?.['Gross Living Area'] ||
        ''
    ).trim();

    if (!rentGlaStr) return null;
    const rentGla = parseAreaToSqFt(rentGlaStr);
    if (isNaN(rentGla)) return null;

    const salesGlaStr = String(
        allData.SALES_GRID?.Subject?.['Gross Living Area'] ||
        allData['Sales Grid']?.Subject?.['Gross Living Area'] ||
        allData.Subject?.['Gross Living Area'] ||
        allData.clean_data?.Subject?.['Gross Living Area'] ||
        ''
    ).trim();

    const impGlaStr = String(
        allData.IMPROVEMENTS?.['Square Feet of Gross Living Area Above Grade'] ||
        allData.Improvements?.['Square Feet of Gross Living Area Above Grade'] ||
        ''
    ).trim();

    const targetGla = parseAreaToSqFt(salesGlaStr || impGlaStr);

    if (!isNaN(targetGla)) {
        if (rentGla === targetGla) {
            return { isMatch: true, message: "validated" };
        }
        return {
            isError: true,
            skipBlankFilter: true,
            message: `GLA mismatch: Sales Grid/Improvements indicates '${salesGlaStr || impGlaStr}', but Rental Grid indicates '${rentGlaStr}'. Please reconcile and revise.`
        };
    }

    return { isMatch: true, message: "validated" };
};

/**
 * Validates Comparable Rentals 'Gross Living Area Adjustment' in the 1007 Rental Grid.
 */
export const checkRentGrossLivingAreaAdjustment = (field, text, allData, fieldPath, rentName) => {
    const isField = field === 'Gross Living Area' || field === 'Gross Living Area Adjustment' || field === 'GLA' || field === 'GLA Adjustment';
    if (!isField || !rentName || rentName === 'Subject' || !allData) return null;

    const isAdjField = field.includes('Adjustment');
    const subjVal = String(
        getSubjectRentFieldVal(allData, 'Gross Living Area') ||
        allData.SALES_GRID?.Subject?.['Gross Living Area'] ||
        allData.Subject?.['Gross Living Area'] ||
        ''
    ).trim();

    const compObj = allData[rentName] ||
                    allData['Comparable Rental Data']?.[rentName] ||
                    allData.clean_data?.['Comparable Rental Data']?.[rentName] ||
                    {};
    const compVal = String(
        (!isAdjField && text !== undefined && text !== null ? (typeof text === 'object' ? (text.value ?? '') : text) : compObj['Gross Living Area']) ||
        ''
    ).trim();

    const adjObj = allData[rentName] ||
                   allData['Comparable Rent Adjustments']?.[rentName] ||
                   allData[`${rentName} Adjustments`] ||
                   compObj;
    const adjStr = String(
        (isAdjField && text !== undefined && text !== null ? (typeof text === 'object' ? (text.value ?? '') : text) : adjObj['Gross Living Area Adjustment']) ||
        adjObj['Gross Living Area Adj'] ||
        adjObj['GLA Adjustment'] ||
        ''
    ).trim();

    const subjGla = parseAreaToSqFt(subjVal);
    const compGla = parseAreaToSqFt(compVal);

    if (!isNaN(subjGla) && !isNaN(compGla)) {
        if (adjStr === '') {
            return {
                isError: true,
                message: "Warning: Gross Living Area Adjustment cannot be blank."
            };
        }
        const adjVal = parseAdjustmentValue(adjStr);
        if (adjVal === 0) {
            return { isMatch: true };
        }
        if (compGla === subjGla) {
            return {
                isError: true,
                message: `Warning: Gross Living Area is the same (${subjVal}), but adjustment is not $0.`
            };
        }
        if (compGla > subjGla && adjVal > 0) {
            return {
                isError: true,
                message: `Warning: Comp GLA (${compVal}) is superior to Subject (${subjVal}), but adjustment is not negative.`
            };
        }
        if (compGla < subjGla && adjVal < 0) {
            return {
                isError: true,
                message: `Warning: Comp GLA (${compVal}) is inferior to Subject (${subjVal}), but adjustment is not positive.`
            };
        }
    }

    return { isMatch: true };
};

/**
 * Validates consistency for Subject 'Other:' in the 1007 Rental Grid
 * against Sales Grid Subject 'Other:' or 'Other'.
 */
export const checkRentSubjectOtherConsistency = (field, text, allData, fieldPath, saleName, formType) => {
    const isOtherField = field === 'Other:' || field === 'Other';
    if (!isOtherField) return null;
    if (saleName && saleName !== 'Subject') return null;
    if (!allData) return null;
    if (!is1007Active(allData, formType) && !is1004And1007Form(allData, formType)) return null;

    const rentOtherStr = String(
        (text !== undefined && text !== null ? (typeof text === 'object' ? (text.value ?? '') : text) : '') ||
        getSubjectRentFieldVal(allData, 'Other:') ||
        allData?.Subject?.['Other:'] ||
        allData?.Subject?.['Other'] ||
        ''
    ).trim();

    if (!rentOtherStr) return null;

    const salesOther = String(
        allData.SALES_GRID?.Subject?.['Other:'] ||
        allData['Sales Grid']?.Subject?.['Other:'] ||
        allData.SALES_GRID?.Subject?.['Other'] ||
        allData['Sales Grid']?.Subject?.['Other'] ||
        allData.Subject?.['Other:'] ||
        allData.Subject?.['Other'] ||
        ''
    ).trim();

    if (salesOther) {
        const normSales = normalizeForCompare(salesOther);
        const normRent = normalizeForCompare(rentOtherStr);
        if (normSales === normRent || normRent.includes(normSales) || normSales.includes(normRent)) {
            return { isMatch: true, message: "validated" };
        }
        return {
            isError: true,
            skipBlankFilter: true,
            message: `Other feature mismatch: Sales Grid indicates '${salesOther}', but Rental Grid indicates '${rentOtherStr}'. Please reconcile and revise.`
        };
    }

    return { isMatch: true, message: "validated" };
};

/**
 * Validates Comparable Rentals 'Other: Adjustment' in the 1007 Rental Grid.
 */
export const checkRentOtherAdjustment = (field, text, allData, fieldPath, rentName) => {
    const isField = field === 'Other:' || field === 'Other' || field === 'Other: Adjustment' || field === 'Other Adjustment';
    if (!isField || !rentName || rentName === 'Subject' || !allData) return null;

    const isAdjField = field.includes('Adjustment');
    const subjVal = String(
        getSubjectRentFieldVal(allData, 'Other:') ||
        allData.SALES_GRID?.Subject?.['Other:'] ||
        allData.Subject?.['Other:'] ||
        allData.Subject?.['Other'] ||
        ''
    ).trim();

    const compObj = allData[rentName] ||
                    allData['Comparable Rental Data']?.[rentName] ||
                    allData.clean_data?.['Comparable Rental Data']?.[rentName] ||
                    {};
    const compVal = String(
        (!isAdjField && text !== undefined && text !== null ? (typeof text === 'object' ? (text.value ?? '') : text) : compObj['Other:']) ||
        compObj['Other'] ||
        ''
    ).trim();

    const adjObj = allData[rentName] ||
                   allData['Comparable Rent Adjustments']?.[rentName] ||
                   allData[`${rentName} Adjustments`] ||
                   compObj;
    const adjStr = String(
        (isAdjField && text !== undefined && text !== null ? (typeof text === 'object' ? (text.value ?? '') : text) : adjObj['Other: Adjustment']) ||
        adjObj['Other Adjustment'] ||
        ''
    ).trim();

    if (subjVal && compVal) {
        const normSubj = normalizeForCompare(subjVal);
        const normComp = normalizeForCompare(compVal);

        if (normSubj !== normComp) {
            if (adjStr === '') {
                return {
                    isError: true,
                    message: `Other feature mismatch (Subject: '${subjVal}', Comp: '${compVal}'). An adjustment is required, even if $0.`
                };
            }
        } else {
            if (adjStr !== '' && adjStr !== '0' && adjStr !== '$0' && parseAdjustmentValue(adjStr) !== 0) {
                return {
                    isError: true,
                    message: `Other feature is the same (${subjVal}), but adjustment is not $0.`
                };
            }
        }
    }

    return { isMatch: true };
};

export {
    checkRentScheduleAsOfDateConsistency,
    checkRentScheduleToBeAmountConsistency,
    checkIncomeApproachIndicatedValueConsistency
} from './form1004And1007Validation';
export { is1004And1007Form };

