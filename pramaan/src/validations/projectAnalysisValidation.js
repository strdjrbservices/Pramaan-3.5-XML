export const checkProjectAnalysisFieldsNotBlank = (field, text) => {
    const fieldsToCheck = [
        "I did did not analyze the condominium project budget for the current year. Explain the results of the analysis of the budget (adequacy of fees, reserves, etc.), or why the analysis was not performed.",
        "Are there any other fees (other than regular HOA charges) for the use of the project facilities?",
        "If Yes, report the charges and describe.",
        "Compared to other competitive projects of similar quality and design, the subject unit charge appears",
        "If High or Low, describe",
        "Are there any special or unusual characteristics of the project (based on the condominium documents, HOA meetings, or other information) known to the appraiser?",
        "If Yes, describe and explain the effect on value and marketability."
    ];
    if (fieldsToCheck.includes(field) && (!text || String(text).trim() === '')) {
        return { isError: true, message: `'${field}' should not be blank.` };
    }
    return null;
};
