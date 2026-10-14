const checkNotBlank = (field, text, fieldName) => {
    if (field === fieldName) {
        if (!text || String(text).trim() === '') {
            return { isError: true, message: `'${fieldName}' should not be blank.` };
        }
        return { isMatch: true };
    }
    return null;
};

export const checkTaxYear = (field, text) => {
    if (field !== 'Tax Year') return null;
    const taxYearValue = String(text || '').trim();
    if (!taxYearValue) {
        return { isError: true, message: 'Tax Year should not be blank.' };
    }
    const taxYear = parseInt(taxYearValue, 10);
    if (isNaN(taxYear)) {
        return { isError: true, message: 'Tax Year must be a valid year.' };
    }
    const currentYear = new Date().getFullYear();
    if (taxYear > currentYear || taxYear < currentYear - 1) {
        return { isError: true, message: `Tax Year must be the current year (${currentYear}) or the previous year (${currentYear - 1}).` };
    }
    return { isMatch: true };
};

export const checkSubjectFieldsNotBlank = (field, text) => {
    const fieldsToCheck = [
        'Property Address',
        'County',
        'Borrower',
        'City',
        'Zip Code',
        'Owner of Public Record',
        'Legal Description',
        "Assessor's Parcel #",
        'Neighborhood Name',
        'Map Reference',
        'Census Tract',
        'Occupant',
        'Property Rights Appraised',
        'Lender/Client',
        'Address (Lender/Client)',
        'Report data source(s) used, offering price(s), and date(s)'
    ];
    return checkNotBlank(field, text, fieldsToCheck.find(f => f === field));
};

export const checkAssignmentTypeConsistency = (field, text, data) => {
    if (field !== 'Assignment Type') return null;

    const assignmentType = String(text || data?.['Assignment Type'] || data?.Subject?.['Assignment Type'] || data?.CONTRACT?.['Assignment Type'] || '').trim().toLowerCase();
    const contractData = data?.CONTRACT || {};

    if (assignmentType.includes('purchase')) {
        const isAssistanceYes = String(contractData["Is there any financial assistance (loan charges, sale concessions, gift or downpayment assistance, etc.) to be paid by any party on behalf of the borrower?"] || '').trim().toLowerCase().includes('yes');
        
        const isContractIncomplete = [
            "I did did not analyze the contract for sale for the subject purchase transaction. Explain the results of the analysis of the contract for sale or why the analysis was not performed.",
            "Contract Price $",
            "Date of Contract",
            "Is property seller owner of public record?",
            "Is there any financial assistance (loan charges, sale concessions, gift or downpayment assistance, etc.) to be paid by any party on behalf of the borrower?"
        ].some(f => !contractData[f] || String(contractData[f]).trim() === '') ||
        (!contractData["Data Source(s)"] && !contractData["Data Source(s) (Contract)"]) ||
        (isAssistanceYes && (!contractData["If Yes, report the total dollar amount and describe the items to be paid"] || String(contractData["If Yes, report the total dollar amount and describe the items to be paid"]).trim() === ''));

        if (isContractIncomplete) {
            return { isError: true, message: `Assignment Type is 'Purchase Transaction' then contract fields must be filled.` };
        }
        return { isMatch: true };
    }

    if (assignmentType.includes('refinance')) {
        const contractFields = [
            "I did did not analyze the contract for sale for the subject purchase transaction. Explain the results of the analysis of the contract for sale or why the analysis was not performed.",
            "Contract Price $",
            "Date of Contract",
            "Is property seller owner of public record?",
            "Data Source(s)",
            "Data Source(s) (Contract)",
            "Is there any financial assistance (loan charges, sale concessions, gift or downpayment assistance, etc.) to be paid by any party on behalf of the borrower?",
            "If Yes, report the total dollar amount and describe the items to be paid"
        ];
        const invalidFieldsExist = contractFields.some(f => {
            const val = String(contractData[f] || '').trim().toLowerCase();
            return val !== '' && val !== 'did not' && val !== 'no' && val !== 'n/a';
        });

        if (invalidFieldsExist) {
            return { isError: true, message: `Assignment Type is 'Refinance Transaction' then all contract fields must be blank, 'No', 'N/A', or 'Did not'.` };
        }
        return { isMatch: true };
    }

    if (assignmentType.includes('other')) {
        return { isError: true, message: `need to find the comment` };
    }

    return { isError: true, message: `Assignment Type is required or invalid.` };
};
export const checkRETaxes = (field, text) => {
    if (field !== 'R.E. Taxes $') return null;
    const taxesValue = String(text || '').trim();
    if (!taxesValue) {
        return { isError: true, message: 'R.E. Taxes $ should not be blank.' };
    }
    if (/[a-zA-Z]/.test(taxesValue)) {
        return { isError: true, message: 'R.E. Taxes $ must only contain numbers and currency symbols.' };
    }
    return { isMatch: true };
};

export const checkSpecialAssessments = (field, text) => {
    if (field !== 'Special Assessments $') return null;
    const value = parseFloat(String(text || '0').replace(/[^0-9.-]+/g, ""));
    if (isNaN(value) || value < 0) {
        return { isError: true, message: 'Special Assessments $ must be at least 0.' };
    }
    return { isMatch: true };
};

export const checkPUD = (field, text) => {
    if (field !== 'PUD') return null;
    const value = String(text || '').trim().toLowerCase();
    if (value !== 'yes' && value !== 'no') {
        return { isError: true, message: "PUD must be 'Yes' or 'No'." };
    }
    return { isMatch: true };
};

export const checkHOA = (field, text, data) => {
    if (field !== 'HOA $') return null;
    const pudValue = String(data['PUD'] || '').trim().toLowerCase();
    if (pudValue === 'yes') {
        const hoaValue = parseFloat(String(text || '').replace(/[^0-9.-]+/g, ""));
        if (isNaN(hoaValue) || hoaValue <= 0) {
            return { isError: true, message: 'HOA $ must be greater than 0 if PUD is Yes.' };
        }
        if (!data['HOA(per year)'] && !data['HOA(per month)']) {
            return { isError: true, message: "If PUD is 'Yes', at least one of 'HOA (per year)' or 'HOA (per month)' must be specified." };
        }
    }
    return { isMatch: true };
};
export const checkOfferedForSale = (field, text, data) => {
    if (field === 'Offered for Sale in Last 12 Months') {
        const value = String(text || '').trim().toLowerCase();
        if (value !== 'yes' && value !== 'no') {
            return { isError: true, message: "This field must be 'Yes' or 'No'." };
        }
        if (value === 'yes') {
            const detailsField = data['Report data source(s) used, offering price(s), and date(s)'];
            if (!detailsField) {
                return { isError: true, message: "If 'Yes', details must be provided in the data source field below." };
            }
            const detailsValue = String(detailsField || '').toLowerCase();
            const keywords = ['dom', 'listed', 'listing', 'mls', 'multiple listing service'];
            const hasKeyword = keywords.some(keyword => detailsValue.includes(keyword));

            if (!hasKeyword) {
                return { isError: true, message: `If 'Yes', details must include one of: ${keywords.join(', ')}.` };
            }
        }
    }
    return { isMatch: true };
};

export const checkPropertyRightsInconsistency = (field, text, data) => {
    if (field !== 'Property Rights Appraised' || !data.Subject) return null;
    const subjectPropertyRights = String(text || '').trim();
    const salesGridPropertyRights = String(data.Subject['Leasehold/Fee Simple'] || '').trim();
    if (subjectPropertyRights && salesGridPropertyRights && subjectPropertyRights !== salesGridPropertyRights) {
        return { isError: true, message: `Property Rights mismatch: Subject section has '${subjectPropertyRights}', but Sales Comparison has '${salesGridPropertyRights}'.` };
    }
    return { isMatch: true };
};

export const checkAnsi = (field, text, data) => {
    if (field !== 'ANSI') return null;
    const isFha = data && data['FHA Case No.'] && String(data['FHA Case No.']).trim() !== '';
    const ansiComment = String(text || '').trim();
    if (ansiComment.toUpperCase().includes('GX001')) {
        return { isError: true, message: "ANSI comment must not include code 'GX001'." };
    }

    if (!isFha && !ansiComment) {
        return { isError: true, message: "ANSI comment is mandatory for conventional loans." };
    }

    return { isMatch: true };
};

export const checkCensusTract = (field, text) => {
    if (field !== 'Census Tract') return null;
    const value = String(text || '').trim();
    if (!value) return null;

    if (!/^\d+(\.\d+)?$/.test(value)) {
        return { isError: true, message: 'Census Tract must only contain numbers.' };
    }
    return { isMatch: true };
};

export const checkFullAddressConsistency = (field, text) => {
    if (field !== 'Full Address') return null;
    const value = String(text || '').trim();
    if (value.includes('Inconsistent')) {
        return { isError: true, message: "Full Address is inconsistent." };
    }
    return { isMatch: true };
};

export const checkPresence = (field, text) => {
    const value = String(text || '').trim();
    if (!value) return { isError: true, message: `${field} is empty.` };

    const lowerValue = value.toLowerCase();
    if (lowerValue.includes('not present')) {
        return { isError: true, message: `${field} is marked as not present.` };
    }
    return { isMatch: true };
};

export const checkFhaCaseNo = (field, text) => {
    if (field !== 'FHA Case No.') return null;
    const value = String(text || '').trim();
    if (value === '000-0000000') {
        return { isError: true, message: "FHA Case No. cannot be 000-0000000." };
    }
    return { isMatch: true };
};

export const checkOccupancy = (field, text) => {
    const targetFields = ['Occupant', 'Occupancy'];
    if (!targetFields.includes(field)) return null;

    const value = String(text || '').trim();
    if (!value) return null;

    const validOptions = ['owner', 'tenant', 'vacant'];
    const valueLower = value.toLowerCase();

    const isValid = validOptions.some(opt => valueLower === opt);

    if (!isValid) {
        return {
            isError: true,
            skipBlankFilter: true,
            message: `Invalid value for '${field}': '${value}'. Expected one of: Owner, Tenant, Vacant.`
        };
    }

    return { isMatch: true };
};
