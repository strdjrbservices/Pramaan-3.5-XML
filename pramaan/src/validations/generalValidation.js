export const checkPhysicalDeficiencies = (field, text) => {
    const fieldName = "Are there any physical deficiencies or adverse conditions that affect the livability, soundness, or structural integrity of the property? If Yes, describe";
    if (field !== fieldName) return null;

    const value = String(text || '').trim().toLowerCase();
    if (value === 'yes') {
        return { isMatch: true };
    }
    if (value !== '') {
        return { isError: true, message: `Value must be 'Yes' for this field.` };
    }
    return null;
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
        const hasValueInContract = contractFields.some(f => contractData[f] && String(contractData[f]).trim() !== '');
        if (hasValueInContract) {
            return { isError: true, message: `Assignment Type is 'Refinance Transaction' then all contract fields must be blank.` };
        }
        return { isMatch: true };
    }

    if (assignmentType.includes('other')) {
        return { isError: true, message: `need to find the comment` };
    }

    return { isError: true, message: `Assignment Type is required or invalid.` };
};

export const checkNotBlank = (field, text, fieldName) => {
    if (field === fieldName) {
        if (!text || String(text).trim() === '') {
            return { isError: true, message: `'${fieldName}' should not be blank.` };
        }
        return { isMatch: true };
    }
    return null;
};
