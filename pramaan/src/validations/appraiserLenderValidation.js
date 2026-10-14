const checkNotBlank = (field, text, fieldName) => {
    if (field === fieldName) {
        if (!text || String(text).trim() === '') {
            return { isError: true, skipBlankFilter: true, message: `'${fieldName}' must not be blank.` };
        }
        return { isMatch: true };
    }
    return null;
};

export const checkLenderAddressInconsistency = (field, text, data) => {
    const relevantFields = ['Address (Lender/Client)', 'Lender/Client Company Address'];
    if (!relevantFields.includes(field) || !data) return null;

    const normalize = (str) => {
        let s = String(str || '').toLowerCase();
        s = s.replace(/\bstreet\b/g, 'st')
            .replace(/\bavenue\b/g, 'ave')
            .replace(/\broad\b/g, 'rd')
            .replace(/\bdrive\b/g, 'dr')
            .replace(/\bboulevard\b/g, 'blvd')
            .replace(/\blane\b/g, 'ln')
            .replace(/\bplace\b/g, 'pl')
            .replace(/\bcircle\b/g, 'cir')
            .replace(/\bcourt\b/g, 'ct')
            .replace(/\bsuite\b/g, 'ste');
        return s.replace(/[\s.,#\-']/g, '');
    };

    const subjectLenderAddress = String(data.Subject?.['Address (Lender/Client)'] || '').trim();
    const appraiserLenderAddress = String(data.CERTIFICATION?.['Lender/Client Company Address'] || '').trim();

    if (subjectLenderAddress && appraiserLenderAddress) {
        const normSubject = normalize(subjectLenderAddress);
        const normAppraiser = normalize(appraiserLenderAddress);

        if (normSubject !== normAppraiser && !normSubject.includes(normAppraiser) && !normAppraiser.includes(normSubject)) {
            return { isError: true, message: `Lender Address mismatch: Subject section has '${subjectLenderAddress}', but Appraiser section has '${appraiserLenderAddress}'.` };
        }
    }
    return { isMatch: true };
};

export const checkClientNameHtmlConsistency = (field, text, allData) => {
    if (field === 'LENDER/CLIENT Company Name') {
        const certificationClientName = String(text || '').trim();
        const htmlClientName = String(allData?.comparisonData?.['Client/Lender on Report'] || allData?.comparisonData?.['Company Name'] || '').trim();

        if (htmlClientName && certificationClientName && htmlClientName.toLowerCase() !== certificationClientName.toLowerCase()) {
            return {
                isError: true,
                message: `Client Name mismatch. HTML: '${htmlClientName}', Report: '${certificationClientName}'.`
            };
        }
        return { isMatch: true };
    } else if (field === 'Client Name') {
        const htmlClientName = String(text || '').trim();
        const certLenderClientName = String(allData?.CERTIFICATION?.['Lender/Client Company Name'] || allData?.Subject?.['Lender/Client'] || '').trim();

        if (!htmlClientName || !certLenderClientName || htmlClientName === 'N/A') return null;

        if (htmlClientName.toLowerCase() !== certLenderClientName.toLowerCase()) {
            return {
                isError: true,
                message: `Client Name mismatch. HTML: '${htmlClientName}', Report: '${certLenderClientName}'.`
            };
        }
        return { isMatch: true };
    }
    return null;
};

export const checkClientAddressHtmlConsistency = (field, text, allData) => {
    const normalize = (str) => {
        let s = String(str || '').toLowerCase();
        s = s.replace(/\bstreet\b/g, 'st')
            .replace(/\bavenue\b/g, 'ave')
            .replace(/\broad\b/g, 'rd')
            .replace(/\bdrive\b/g, 'dr')
            .replace(/\bboulevard\b/g, 'blvd')
            .replace(/\blane\b/g, 'ln')
            .replace(/\bplace\b/g, 'pl')
            .replace(/\bcircle\b/g, 'cir')
            .replace(/\bcourt\b/g, 'ct')
            .replace(/\bsuite\b/g, 'ste');
        return s.replace(/[\s.,#\-']/g, '');
    };

    if (field === 'Address (Lender/Client)') {
        if (!allData.comparisonData || !allData.comparisonData['Client Address'] || allData.comparisonData['Client Address'] === 'N/A') {
            return null;
        }

        const certLenderAddress = String(text || '').trim();
        const htmlClientAddress = String(allData.comparisonData['Client Address'] || '').trim();

        if (!htmlClientAddress || !certLenderAddress) {
            return null;
        }

        const normCert = normalize(certLenderAddress);
        const normHtml = normalize(htmlClientAddress);

        if (normHtml !== normCert && !normHtml.includes(normCert) && !normCert.includes(htmlClientAddress)) {
            return {
                isError: true,
                message: `Client Address mismatch. HTML: '${htmlClientAddress}', Report: '${certLenderAddress}'.`
            };
        }
        return { isMatch: true };
    } else if (field === 'Client Address') {
        const htmlClientAddress = String(text || '').trim();
        const certLenderAddress = String(allData?.Subject?.['Address (Lender/Client)'] || allData?.CERTIFICATION?.['Lender/Client Company Address'] || '').trim();

        if (!htmlClientAddress || !certLenderAddress || htmlClientAddress === 'N/A') {
            return null;
        }

        const normCert = normalize(certLenderAddress);
        const normHtml = normalize(htmlClientAddress);

        if (normHtml !== normCert && !normHtml.includes(normCert) && !normCert.includes(htmlClientAddress)) {
            return {
                isError: true,
                message: `Client Address mismatch. HTML: '${htmlClientAddress}', Report: '${certLenderAddress}'.`
            };
        }
        return { isMatch: true };
    }
    return null;
};

export const checkBorrowerHtmlConsistency = (field, text, allData) => {
    const normalize = (str) =>
        String(str || '')
            .toLowerCase()
            .replace(/&/g, 'and')
            .replace(/[.,]/g, '')
            .replace(/\s+/g, ' ')
            .trim();

    if (field === 'Borrower') {
        if (!allData.comparisonData || !allData.comparisonData['Borrower (and Co-Borrower)'] || allData.comparisonData['Borrower (and Co-Borrower)'] === 'N/A') {
            return null;
        }

        const reportBorrower = String(text || '').trim();
        const htmlBorrower = String(allData.comparisonData['Borrower (and Co-Borrower)'] || '').trim();

        if (!htmlBorrower || !reportBorrower) {
            return null;
        }

        const normHtml = normalize(htmlBorrower);
        const normReport = normalize(reportBorrower);

        if (!normHtml.includes(normReport) && !normReport.includes(normHtml)) {
            return {
                isError: true,
                message: `Borrower mismatch. HTML: '${htmlBorrower}', Report: '${reportBorrower}'.`
            };
        }
        return { isMatch: true };
    } else if (field === 'Borrower (and Co-Borrower)') {
        const htmlBorrower = String(text || '').trim();
        const reportBorrower = String(allData?.Subject?.['Borrower'] || '').trim();

        if (!htmlBorrower || !reportBorrower || htmlBorrower === 'N/A') return null;

        const normHtml = normalize(htmlBorrower);
        const normReport = normalize(reportBorrower);

        if (!normHtml.includes(normReport) && !normReport.includes(normHtml)) {
            return {
                isError: true,
                message: `Borrower mismatch. HTML: '${htmlBorrower}', Report: '${reportBorrower}'.`
            };
        }
        return { isMatch: true };
    }
    return null;
};

export const checkPropertyAddressHtmlConsistency = (field, text, allData, fieldPath) => {
    if (field === 'Property Address' && fieldPath?.length === 1) {
        const reportAddress = String(text || '').trim();
        const htmlAddress = String(allData?.comparisonData?.['Property Address'] || '').trim();

        if (!htmlAddress || !reportAddress || htmlAddress === 'N/A') {
            return null;
        }

        const normalize = (str) => {
            let s = String(str || '').toLowerCase();
            s = s.replace(/\bstreet\b/g, 'st')
                .replace(/\bavenue\b/g, 'ave')
                .replace(/\broad\b/g, 'rd')
                .replace(/\bdrive\b/g, 'dr')
                .replace(/\bboulevard\b/g, 'blvd')
                .replace(/\blane\b/g, 'ln')
                .replace(/\bplace\b/g, 'pl')
                .replace(/\bcircle\b/g, 'cir')
                .replace(/\bcourt\b/g, 'ct');
            return s.replace(/[\s.,#\-']/g, '');
        };

        const normReport = normalize(reportAddress);
        const normHtml = normalize(htmlAddress);

        if (normReport !== normHtml && !normHtml.includes(normReport) && !normReport.includes(htmlAddress)) {
            return { isError: true, message: `Property Address mismatch. HTML: '${htmlAddress}', Report: '${reportAddress}'.` };
        }
        return { isMatch: true };
    }
    return null;
};

export const checkAppraiserLicenseGroup = (field, text, allData) => {
    const groupFields = [
        "State Certification #",
        "or State License #",
        "or Other (describe)",
        "State #"
    ];

    if (!groupFields.includes(field)) return null;

    const certObj = allData?.CERTIFICATION || allData || {};
    const certNo = String(certObj["State Certification #"] || allData?.["State Certification #"] || '').trim();
    const licNo = String(certObj["or State License #"] || allData?.["or State License #"] || '').trim();
    const otherNo = String(certObj["or Other (describe)"] || allData?.["or Other (describe)"] || '').trim();
    const stateNo = String(certObj["State #"] || allData?.["State #"] || '').trim();

    if (certNo || licNo || otherNo || stateNo) {
        return { isMatch: true };
    }

    return {
        isError: true,
        skipBlankFilter: true,
        message: "At least one of 'State Certification #', 'or State License #', 'or Other (describe)', or 'State #' must be filled."
    };
};

export const checkAppraiserFieldsNotBlank = (field, text) => {
    const fieldsToCheck = [
        "Signature",
        "Name",
        "Company Name",
        "Appraiser License",
        "Company Address",
        "Telephone Number",
        // "Email Address",
        "Date of Signature and Report",
        "Effective Date of Appraisal",
        "State",
        "Expiration Date of Certification or License",
        "ADDRESS OF PROPERTY APPRAISED",
        "APPRAISED VALUE OF SUBJECT PROPERTY $",
        "LENDER/CLIENT Name",
        "Lender/Client Company Name",
        "Lender/Client Company Address",
        // "Lender/Client Email Address",
        "Appraiser Certifications",
        "Appraiser Signature",
        "Appraiser Name",
        "Appraiser Credential Level",
        "Appraiser ID",
        "Appraiser State",
        "Appraiser License Expiration Date",
        "Policy Period From",
        "Policy Period To",
        "License Valid To",
        "License Vaild To",
        "E&O Insurance",
        "LICENSE/REGISTRATION/CERTIFICATION #"
    ];
    return checkNotBlank(field, text, fieldsToCheck.find(f => f === field));
};

export const checkLenderNameInconsistency = (field, text, data) => {
    if (field !== 'Lender/Client' && field !== 'Lender/Client Company Name') return null;

    const subjectLenderName = String(data.Subject?.['Lender/Client'] || '').trim();
    const appraiserCompanyName = String(data.CERTIFICATION?.['Lender/Client Company Name'] || '').trim();
    const appraiserLenderName = appraiserCompanyName;
    const htmlLenderName = String(data.comparisonData?.['Client/Lender on Report'] || '').trim();

    const normalize = (str) => String(str).toLowerCase().replace(/[\s.,#\-']/g, '');

    const normSubject = subjectLenderName ? normalize(subjectLenderName) : '';
    const normAppraiser = appraiserLenderName ? normalize(appraiserLenderName) : '';
    const normHtml = (htmlLenderName && htmlLenderName !== 'N/A') ? normalize(htmlLenderName) : '';

    const mismatches = [];

    if (normSubject && normAppraiser && normSubject !== normAppraiser && !normSubject.includes(normAppraiser) && !normAppraiser.includes(normSubject)) {
        mismatches.push(`Subject ('${subjectLenderName}') vs Certification ('${appraiserLenderName}')`);
    }

    if (normSubject && normHtml && normSubject !== normHtml && !normSubject.includes(normHtml) && !normHtml.includes(normSubject)) {
        mismatches.push(`Subject ('${subjectLenderName}') vs HTML ('${htmlLenderName}')`);
    }

    if (normAppraiser && normHtml && normAppraiser !== normHtml && !normAppraiser.includes(normHtml) && !normHtml.includes(normAppraiser)) {
        mismatches.push(`Certification ('${appraiserLenderName}') vs HTML ('${htmlLenderName}')`);
    }

    if (mismatches.length > 0) {
        return { isError: true, message: `Lender/Client Company Name mismatch found between: ${mismatches.join('; ')}.` };
    }

    return { isMatch: true };
};

export const checkLicenseNumberConsistency = (field, text, data) => {
    if (field !== 'LICENSE/REGISTRATION/CERTIFICATION #') return null;

    const licenseNumber = String(text || '').trim();
    if (!licenseNumber) return null;

    const certificationData = data?.CERTIFICATION;
    if (!certificationData) return null;

    const stateCert = String(certificationData['State Certification #'] || '').trim();
    const stateLicense = String(certificationData['or State License #'] || '').trim();
    const otherLicense = String(certificationData['or Other (describe)'] || '').trim();
    const stateNumber = String(certificationData['State #'] || '').trim();

    const possibleMatches = [stateCert, stateLicense, otherLicense, stateNumber].filter(Boolean);

    if (possibleMatches.length > 0 && !possibleMatches.includes(licenseNumber)) {
        return { isError: true, message: `License number mismatch. Expected to match one of: State Certification #, State License #, Other, or State #.` };
    }

    return { isMatch: true };
};

export const checkAppraiserVendorNameConsistency = (field, text, allData) => {
    if (field === 'Name') {
        const vendorName = allData?.comparisonData?.['Assigned to Vendor(s)'];
        const appraiserName = String(text || '').trim();

        if (!vendorName || vendorName === 'N/A' || !appraiserName) {
            return null;
        }

        const normalize = (str) =>
            String(str || '')
                .toLowerCase()
                .replace(/&/g, 'and')
                .replace(/[.,]/g, '')
                .replace(/\s+/g, ' ')
                .trim();

        const normVendor = normalize(vendorName);
        const normAppraiser = normalize(appraiserName);

        if (!normVendor.includes(normAppraiser) && !normAppraiser.includes(normVendor)) {
            return {
                isError: true,
                message: `Appraiser Name mismatch. HTML (Assigned to Vendor): '${vendorName}', Report: '${appraiserName}'.`
            };
        }
        return { isMatch: true };
    }
    return null;
};

export const checkDateGreaterThanToday = (field, text) => {
    const fieldsToCheck = ['Policy Period To', 'License Vaild To', 'License Valid To'];
    if (!fieldsToCheck.includes(field)) return null;

    if (!text || String(text).trim() === '') {
        return null;
    }

    const inputDate = new Date(text);
    if (isNaN(inputDate.getTime())) {
        return { isError: true, skipBlankFilter: true, message: `Invalid date format for '${field}'.` };
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (inputDate <= today) {
        return { isError: true, skipBlankFilter: true, message: `'${field}' must be a future date.` };
    }

    return { isMatch: true };
};

export const checkSupervisoryAppraiserFields = (field, text, allData, fieldPath) => {
    const fieldStr = String(field || '').trim();

    const isSupervisoryKey = fieldStr.toLowerCase().includes('supervisory') ||
        (fieldPath && Array.isArray(fieldPath) && fieldPath.some(p => String(p).toUpperCase().includes('SUPERVISORY')));

    if (!isSupervisoryKey) return null;

    // Get the supervisory signature status
    const certObj = allData?.CERTIFICATION || allData?.SUPERVISORY_APPRAISER || allData || {};
    const signatureVal = String(
        certObj['Supervisory Signature'] ||
        certObj['Supervisory Appraiser Signature'] ||
        certObj['Signature (Supervisory)'] ||
        allData?.['Supervisory Signature'] ||
        ''
    ).trim();

    const isPresent = signatureVal &&
        signatureVal.toLowerCase() !== 'not present' &&
        signatureVal.toLowerCase() !== 'n/a' &&
        signatureVal.toLowerCase() !== 'none' &&
        signatureVal.toLowerCase() !== 'false' &&
        signatureVal.toLowerCase() !== 'no';

    const val = String(text || '').trim();

    // 1. IF Supervisory Appraiser Signature IS PRESENT:
    if (isPresent) {
        // License / Cert # check: at least one of State Cert # or State License # must be present
        if (fieldStr.includes('State Certification #') || fieldStr.includes('State License #')) {
            const certNo = String(certObj['Supervisory State Certification #'] || certObj['State Certification #'] || '').trim();
            const licNo = String(certObj['Supervisory or State License #'] || certObj['or State License #'] || '').trim();
            if (!certNo && !licNo) {
                return { isError: true, skipBlankFilter: true, message: `'Supervisory State Certification #' or 'State License #' must be filled when Supervisory Appraiser signature is Present.` };
            }
            return { isMatch: true };
        }

        // Exterior inspection date check
        if (fieldStr.includes('Exterior') && fieldStr.includes('Date')) {
            const extChecked = String(certObj['Did inspect exterior of subject property from street'] || '').trim();
            if ((extChecked.toLowerCase() === 'yes' || extChecked.toLowerCase() === 'true') && !val) {
                return { isError: true, skipBlankFilter: true, message: `'Subject Property Date of Inspection (Exterior)' must not be blank when exterior inspection is selected.` };
            }
            return { isMatch: true };
        }

        // Interior/Exterior inspection date check
        if (fieldStr.includes('Interior') && fieldStr.includes('Date')) {
            const intChecked = String(certObj['Did inspect interior and exterior of subject property'] || '').trim();
            if ((intChecked.toLowerCase() === 'yes' || intChecked.toLowerCase() === 'true') && !val) {
                return { isError: true, skipBlankFilter: true, message: `'Subject Property Date of Inspection (Interior/Exterior)' must not be blank when interior/exterior inspection is selected.` };
            }
            return { isMatch: true };
        }

        // Comparable Sales inspection date check
        if (fieldStr.includes('Comparable Sales') && fieldStr.includes('Date')) {
            const compChecked = String(certObj['Did inspect exterior of comparable sales from street'] || '').trim();
            if ((compChecked.toLowerCase() === 'yes' || compChecked.toLowerCase() === 'true') && !val) {
                return { isError: true, skipBlankFilter: true, message: `'Comparable Sales Date of Inspection' must not be blank when comparable sales inspection is selected.` };
            }
            return { isMatch: true };
        }

        // All other supervisory fields must not be blank when signature is Present
        if (!val) {
            return { isError: true, skipBlankFilter: true, message: `'${fieldStr}' in Supervisory Appraiser section must not be blank when Supervisory Appraiser signature is Present.` };
        }
        return { isMatch: true };
    }

    // 2. IF Supervisory Appraiser Signature IS NOT PRESENT ('Not Present' or blank):
    else {
        // If field is the Signature field itself and value is 'Not Present' or empty, that's valid
        if (fieldStr.toLowerCase().includes('signature') && (val.toLowerCase() === 'not present' || !val)) {
            return { isMatch: true };
        }

        // All other fields in Supervisory Appraiser section MUST BE BLANK when signature is Not Present!
        if (val && val.toLowerCase() !== 'not present' && val.toLowerCase() !== 'n/a' && val.toLowerCase() !== 'none' && val.toLowerCase() !== 'false' && val.toLowerCase() !== 'no') {
            return { isError: true, skipBlankFilter: true, message: `'${fieldStr}' in Supervisory Appraiser section must be blank when Supervisory Appraiser signature is Not Present.` };
        }
        return { isMatch: true };
    }
};

