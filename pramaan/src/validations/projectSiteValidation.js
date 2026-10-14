export const checkProjectSiteFieldsNotBlank = (field, text) => {
    const fieldsToCheck = [
        "Topography", "Size", "Density", "View", "Specific Zoning Classification", "Zoning Description",
        "Zoning Compliance", "Is the highest and best use of subject property as improved (or as proposed per plans and specifications) the present use?",
        "Electricity", "Gas", "Water", "Sanitary Sewer", "Street", "Alley", "FEMA Special Flood Hazard Area",
        "FEMA Flood Zone", "FEMA Map #", "FEMA Map Date", "Are the utilities and off-site improvements typical for the market area? If No, describe",
        "Are there any adverse site conditions or external factors (easements, encroachments, environmental conditions, land uses, etc.)? If Yes, describe",
    ];
    if (fieldsToCheck.includes(field) && (!text || String(text).trim() === '')) {
        return { isError: true, message: `'${field}' should not be blank.` };
    }
    return null;
};
