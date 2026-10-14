export const getAssignmentType = (data) => {
    if (!data) return '';
    const raw = data['Assignment Type'] || data?.Subject?.['Assignment Type'] || data?.CONTRACT?.['Assignment Type'] || data?.data?.['Assignment Type'] || '';
    return String(raw).trim();
};

export const checkContractFieldsMandatory = (field, text, data, fieldPath) => {
    if (fieldPath && fieldPath[0] !== 'CONTRACT' && fieldPath[0] !== 'Subject') return null;

    const assignmentType = getAssignmentType(data).toLowerCase();

    if (assignmentType.includes('purchase')) {
        const isIfYesField = field === "If Yes, report the total dollar amount and describe the items to be paid";
        let isRequired = true;
        if (isIfYesField) {
            const assistanceField = "Is there any financial assistance (loan charges, sale concessions, gift or downpayment assistance, etc.) to be paid by any party on behalf of the borrower?";
            const assistanceValue = String(data?.CONTRACT?.[assistanceField] || data?.[assistanceField] || '').trim().toLowerCase();
            isRequired = assistanceValue.includes('yes');
        }

        if (isRequired && (!text || String(text).trim() === '')) {
            return { isError: true, skipBlankFilter: true, message: `This field is required and must not be blank when Assignment Type is 'Purchase Transaction'.` };
        }
        return { isMatch: true };
    } else if (assignmentType.includes('refinance')) {
        const val = String(text || '').trim().toLowerCase();
        if (val !== '' && val !== 'did not' && val !== 'no' && val !== 'n/a') {
            return { isError: true, message: `This field should be blank, 'No', 'N/A', or 'Did not' when Assignment Type is 'Refinance Transaction'.` };
        }
        return { isMatch: true };
    } else if (assignmentType.includes('other')) {
        return { isError: true, message: `need to find the comment` };
    }

    return { isError: true, message: `Assignment Type is required or invalid.` };
};

export const checkContractAnalysisConsistency = (field, text, data) => {
    if (!data) return null;

    const assignmentType = getAssignmentType(data).toLowerCase();

    if (!assignmentType.includes('purchase')) {
        return null;
    }

    const contractData = data.CONTRACT || data;
    const analysisField = "I did did not analyze the contract for sale for the subject purchase transaction. Explain the results of the analysis of the contract for sale or why the analysis was not performed.";
    const analysisValue = String(contractData[analysisField] || '').trim().toLowerCase();

    if (!analysisValue) return null;

    if (!analysisValue.includes('did') && !analysisValue.includes('did not')) {
        if (field === analysisField) return { isError: true, message: "This field must include 'did' or 'did not'." };
    }

    return null;
};

export const checkFinancialAssistanceInconsistency = (field, data) => {
    const assistanceQuestionField =
        'Is there any financial assistance (loan charges, sale concessions, gift or downpayment assistance, etc.) to be paid by any party on behalf of the borrower?';

    const assistanceAmountField =
        'If Yes, report the total dollar amount and describe the items to be paid';

    if (field !== assistanceQuestionField && field !== assistanceAmountField) return null;

    const assignmentType = getAssignmentType(data).toLowerCase();
    if (!assignmentType.includes('purchase')) {
        return { isMatch: true };
    }

    const contractData = data?.CONTRACT || data || {};

    const assistanceAnswer = String(
        contractData[assistanceQuestionField] || ''
    ).toLowerCase();

    const amountText = String(
        contractData[assistanceAmountField] || ''
    ).trim();

    const validNoValues = ['', '0', '$0', '0;', '$0;;', '$0;', '0;;'];

    const isZeroOrNoConcessionsText = (t) => {
        if (!t) return true;
        if (validNoValues.includes(t)) return true;
        if (/^\$?0[;\s,]/.test(t)) return true;
        const lower = t.toLowerCase();
        if (lower.startsWith('no ') || lower.startsWith('none') || lower.startsWith('n/a') || lower.startsWith('not applicable')) return true;
        return false;
    };

    if (assistanceAnswer.includes('yes')) {
        if (isZeroOrNoConcessionsText(amountText)) {
            return {
                isError: true,
                message:
                    "Financial assistance is marked 'Yes', so the amount and description must be specified."
            };
        }
    }

    if (assistanceAnswer.includes('no')) {
        if (!isZeroOrNoConcessionsText(amountText)) {
            return {
                isError: true,
                message:
                    "Financial assistance is marked 'No', so the value must be 0, $0, or a no-concession note."
            };
        }
    }

    return { isMatch: true };
};


export const checkYesNoOnly = (field, text, data, fieldConfig) => {
    if (field !== fieldConfig.name) return null;

    const assignmentType = getAssignmentType(data).toLowerCase();

    if (assignmentType.includes('refinance') || assignmentType.includes('other')) {
        return { isMatch: true };
    }

    const value = String(text || '').trim().toLowerCase();

    if (!value) {
        return { isError: true, message: `'${field}' must be 'Yes' or 'No'.` };
    }

    if (value !== 'yes' && value !== 'no') {
        return { isError: true, message: `Invalid value for '${field}'. It must be 'Yes' or 'No'.` };
    }

    return { isMatch: true };
};

