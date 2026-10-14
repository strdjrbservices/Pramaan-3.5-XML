export const checkIncomeApproachFieldsNotBlank = (field, text) => {
    const fieldsToCheck = [
        "Estimated Monthly Market Rent $", "X Gross Rent Multiplier  = $",
        "Indicated Value by Income Approach", "Summary of Income Approach (including support for market rent and GRM) "
    ];
    if (fieldsToCheck.includes(field) && (!text || String(text).trim() === '')) {
        return { isError: true, message: `'${field}' should not be blank.` };
    }
    return null;
};

export const INCOME_APPROACH_1007_REQUIRED_FIELDS = [
    "Estimated Monthly Market Rent $"
];
export const checkIncomeApproach1007Required = (field, text, allData, path, saleName, formType) => {
    if (!INCOME_APPROACH_1007_REQUIRED_FIELDS.includes(field)) return null;

    const isRentForm = formType && (String(formType).toLowerCase().includes('1007') || String(formType).toLowerCase().includes('1025'));
    if (!isRentForm) return null;

    if (!text || String(text).trim() === '') {
        return { isError: true, message: `'${field}' is required when the Form Type includes 1007 or 1025.` };
    }
    return { isMatch: true };
};
