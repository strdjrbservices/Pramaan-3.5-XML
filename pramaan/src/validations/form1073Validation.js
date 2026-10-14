export const checkProjectInfoFieldsNotBlank = (field, text) => {
    const fieldsToCheck = [
        "Data source(s) for project information", "Project Description", "# of Stories", "FEMA Special Flood Hazard Area", "Density", "Size", "Topography", "Zoning Compliance",
        "# of Elevators", "Existing/Proposed/Under Construction", "Year Built",
        "Effective Age", "Exterior Walls",
        "Roof Surface", "Total # Parking", "Ratio (spaces/units)", "Type", "Guest Parking", "# of Units", "# of Units Completed",
        "# of Units For Sale", "# of Units Sold", "# of Units Rented", "# of Owner Occupied Units",
        "# of Phases", "# of Planned Phases",
        "Project Primary Occupancy", "Is the developer/builder in control of the Homeowners' Association (HOA)?",
        "Management Group", "Does any single entity (the same individual, investor group, corporation, etc.) own more than 10% of the total units in the project?"
        , "Was the project created by the conversion of existing building(s) into a condominium?",
        "If Yes,describe the original use and date of conversion",
        "Are the units, common elements, and recreation facilities complete (including any planned rehabilitation for a condominium conversion)?", "If No, describe",
        "Is there any commercial space in the project?",
        "If Yes, describe and indicate the overall percentage of the commercial space.", "Describe the condition of the project and quality of construction.",
        "Describe the common elements and recreational facilities.", "Are any common elements leased to or by the Homeowners' Association?",
        "If Yes, describe the rental terms and options.", "Is the project subject to a ground rent?",
        "If Yes, $ per year (describe terms and conditions)",
        "Are the parking facilities adequate for the project size and type?", "If No, describe and comment on the effect on value and marketability."
    ];
    if (fieldsToCheck.includes(field) && (!text || String(text).trim() === '')) {
        return { isError: true, message: `'${field}' should not be blank.` };
    }
    return null;
};

export const checkCondoCoopProjectsTableFields = (field, text) => {
    if (!text || String(text).trim() === '') {
        return { isError: true, message: `'${field}' should not be blank.` };
    }
    return null;
};

export const checkCondoForeclosureFieldsNotBlank = (field, text) => {
    if (!text || String(text).trim() === '') {
        return { isError: true, message: `'${field}' should not be blank.` };
    }
    return null;
};
