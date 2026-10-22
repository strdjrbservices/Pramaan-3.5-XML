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

        // If Occupant is Owner or Vacant, lease dates MUST be blank
        if (occupant === 'Owner' || occupant === 'Vacant') {
            if (thisDateStr !== '') {
                return {
                    isError: true,
                    skipBlankFilter: true,
                    message: `For Subject, '${field}' must be blank when Occupant is ${occupant}.`
                };
            }
            return null;
        }

        // If Occupant is Tenant, lease dates MUST be present and valid
        if (occupant === 'Tenant') {
            if (!thisDateStr) {
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
        if (!occupant && thisDateStr !== '') {
            return {
                isError: true,
                skipBlankFilter: true,
                message: `When lease dates are present in Rental Grid, 'Occupant' in Subject section must be 'Tenant'.`
            };
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

    if (!leaseBeginsStr || !leaseExpiresStr) {
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
