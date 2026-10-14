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
    if ((field !== 'Date Lease Begins' && field !== 'Date Lease Expires') || !saleName || !(saleName.startsWith('COMPARABLE') || saleName === 'Subject')) {
        return null;
    }

    const leaseBeginsStr = String(allData[saleName]?.['Date Lease Begins'] || '').trim();
    const leaseExpiresStr = String(allData[saleName]?.['Date Lease Expires'] || '').trim();

    if (!leaseBeginsStr || !leaseExpiresStr) {
        return null;
    }

    const dateRegex = /^(0[1-9]|1[0-2])\/(0[1-9]|[12]\d|3[01])\/\d{4}$/;

    if (!dateRegex.test(leaseBeginsStr)) {
        return { isError: true, message: `For ${saleName}, 'Date Lease Begins' (${leaseBeginsStr}) must be in MM/DD/YYYY format.` };
    }
    if (!dateRegex.test(leaseExpiresStr)) {
        return { isError: true, message: `For ${saleName}, 'Date Lease Expires' (${leaseExpiresStr}) must be in MM/DD/YYYY format.` };
    }

    const parseDate = (str) => {
        const parts = str.split('/');
        const month = parseInt(parts[0], 10);
        const day = parseInt(parts[1], 10);
        const year = parseInt(parts[2], 10);
        const dateObj = new Date(year, month - 1, day);
        if (dateObj.getFullYear() !== year || dateObj.getMonth() !== month - 1 || dateObj.getDate() !== day) {
            return null;
        }
        return dateObj;
    };

    const leaseBeginsDate = parseDate(leaseBeginsStr);
    const leaseExpiresDate = parseDate(leaseExpiresStr);

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

export const checkOtherBasement = (field, text, allData, path, saleName) => {
    if (field !== 'Other (e.g., basement, etc.)') {
        return null;
    }

    if (!saleName || !saleName.startsWith('COMPARABLE')) {
        return null;
    }

    const subjectValue = allData?.Subject?.['Other (e.g., basement, etc.)'];
    const comparableValue = text;

    const subjectValueStr = String(subjectValue || '').trim();
    const comparableValueStr = String(comparableValue || '').trim();

    if (subjectValueStr === comparableValueStr) {
        return { isMatch: true };
    } else {
        return { isError: true, message: `Value (${comparableValueStr || 'empty'}) does not match Subject's value (${subjectValueStr || 'empty'}).` };
    }
};
