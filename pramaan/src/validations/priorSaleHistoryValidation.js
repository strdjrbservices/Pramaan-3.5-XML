export const checkPriorSaleHistoryFieldsNotBlank = (field, text) => {
    const fieldsToCheck = [
        "Prior Sale History: I did did not research the sale or transfer history of the subject property and comparable sales",
        "Prior Sale History: My research did did not reveal any prior sales or transfers of the subject property for the three years prior to the effective date of this appraisal",
        "Prior Sale History: Data source(s) for subject",
        "Prior Sale History: My research did did not reveal any prior sales or transfers of the comparable sales for the year prior to the date of sale of the comparable sale",
        "Prior Sale History: Data source(s) for comparables",
        "Prior Sale History: Report the results of the research and analysis of the prior sale or transfer history of the subject property and comparable sales",
        "Prior Sale History: Date of Prior Sale/Transfer",
        "Prior Sale History: Price of Prior Sale/Transfer",
        "Prior Sale History: Data Source(s) for prior sale/transfer",
        "Prior Sale History: Effective Date of Data Source(s)",
        "Prior Sale History: Analysis of prior sale or transfer history of the subject property and comparable sales",
        "Prior Sales or Transfers",
        "Subject Transfer History Data Source",
        "Comparable Number",
        "Comparable Transfer Terms",
        "Comparable Transfer Date",
        "Comparable Transfer Amount",
        "Comparable Transfer Data Source",
        "Analysis of Prior Sale and Transfer History of Subject Property",
        "Analysis of Prior Sale and Transfer History of Comparable Sales"
    ];
    if (fieldsToCheck.includes(field) && (!text || String(text).trim() === '')) {
        return { isError: true, message: `'${field}' should not be blank.` };
    }
    return null;
};
