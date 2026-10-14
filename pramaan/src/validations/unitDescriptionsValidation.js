export const checkUnitDescriptionsFieldsNotBlank = (field, text) => {
    const fieldsToCheck = [
        "Unit Charge$",
        "per month X 12 = $",
        "per year",
        "Annual assessment charge per year per square feet of gross living area = $",
        "Utilities included in the unit monthly assessment [None/Heat/Air/Conditioning/Electricity/Gas/Water/Sewer/Cable/Other (describe)]",
        "Floor #",
        "# of Levels",
        "Heating Type/Fuel",
        "Central AC/Individual AC/Other (describe)",
        "Fireplace(s) #/Woodstove(s) #/Deck/Patio/Porch/Balcony/Other",
        "Refrigerator/Range/Oven/Disp Microwave/Dishwasher/Washer/Dryer",
        "Floors",
        "Walls",
        "Trim/Finish",
        "Bath Wainscot",
        "Doors",
        "None/Garage/Covered/Open",
        "Assigned/Owned",
        "# of Cars",
        "Parking Space #",
        "Finished area above grade contains:",
        "Rooms",
        "Bedrooms",
        "Bath(s)",
        "Square Feet of Gross Living Area Above Grade",
        "Are the heating and cooling for the individual units separately metered?",
        "If No, describe and comment on compatibility to other projects in the market area.",
        "Additional features (special energy efficient items, etc.)",
        "Describe the condition of the property (including needed repairs, deterioration, renovations, remodeling, etc.)",
        "Are there any physical deficiencies or adverse conditions that affect the livability, soundness, or structural integrity of the property?",
        "If Yes, describe",
        "Does the property generally conform to the neighborhood (functional utility, style, condition, use, construction, etc.)?"
    ];
    if (fieldsToCheck.includes(field) && (!text || String(text).trim() === '')) {
        return { isError: true, message: `'${field}' should not be blank.` };
    }
    return null;
};
