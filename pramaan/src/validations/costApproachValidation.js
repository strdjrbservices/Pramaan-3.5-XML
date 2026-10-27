import { checkCostApproachMatchConsistency } from './form1004And1007Validation';

export const checkCostNew = (field, text) => {
    if (field !== 'ESTIMATED/REPRODUCTION / REPLACEMENT COST NEW') return null;

    const value = String(text || '').trim().toLowerCase();
    if (!value) {
        return { isError: true, message: "'ESTIMATED/REPRODUCTION / REPLACEMENT COST NEW' cannot be blank. One option must be selected." };
    }

    const hasReproduction = value.includes('reproduction');
    const hasReplacement = value.includes('replacement');

    if (hasReproduction && hasReplacement) {
        return { isError: true, message: "Only one of 'Reproduction' or 'Replacement' can be selected." };
    }

    if (!hasReproduction && !hasReplacement) {
        return { isError: true, message: "Either 'Reproduction' or 'Replacement' must be selected." };
    }

    return { isMatch: true };
};

export const checkSourceOfCostData = (field, text) => {
    if (field !== 'Source of cost data') return null;
    if (!text || String(text).trim() === '') {
        return { isError: true, message: "'Source of cost data' cannot be blank." };
    }
    return { isMatch: true };
};

export const checkIndicatedValueByCostApproach = (field, text, data, path, saleName, formType) => {
    if (field !== 'Indicated Value By Cost Approach......................................................=$' && field !== 'Indicated Value by Cost Approach') return null;
    const currentFormType = String(data?.formType || data?.['From Type'] || data?.['Form Type'] || formType || '').trim();
    if (currentFormType === '1073') {
        return { isMatch: true };
    }

    const matchRes = checkCostApproachMatchConsistency(field, text, data, path, saleName, currentFormType);
    if (matchRes && matchRes.isError) {
        return matchRes;
    }

    const value = String(text || '').trim();
    const comments = String(
        data?.['Comments on Cost Approach (gross living area calculations, depreciation, etc.)'] || 
        data?.COST_APPROACH?.['Comments on Cost Approach (gross living area calculations, depreciation, etc.)'] || 
        data?.RECONCILIATION?.['Cost Approach (if developed) Comment'] || ''
    ).toLowerCase();

    const hasNotDevelopedComment = comments.includes('why cost approach cannot be developed') || 
        (comments.includes('cost approach') && (comments.includes('not') || comments.includes('omitted') || comments.includes('unreliable') || comments.includes('less reliable') || comments.includes('applicable') || comments.includes('developed') || comments.includes('analyzed')));

    if ((!value || value === '0') && !hasNotDevelopedComment) {
        return { isError: true, message: "If 'Indicated Value by Cost Approach' is blank, a comment explaining why it was not developed is required." };
    }

    if (matchRes && matchRes.isMatch) {
        return matchRes;
    }

    return { isMatch: true };
};

export const checkOpinionOfSiteValue = (field, text, data) => {
    const siteValueFields = [
        "OPINION OF SITE VALUE = $ ................................................",
        "OPINION OF SITE VALUE",
        "Opinion of Site Value",
        "Opinion of Site Value $",
        "OPINION OF SITE VALUE $"
    ];
    if (!siteValueFields.includes(field)) return null;

    let valStr = (text !== undefined && text !== null) ? String(text).trim() : '';
    if (!valStr && data) {
        const costData = data.COST_APPROACH || data.Cost_Approach || data;
        const candidate = costData?.["OPINION OF SITE VALUE = $ ................................................"]
            ?? costData?.["OPINION OF SITE VALUE"]
            ?? costData?.["Opinion of Site Value"]
            ?? costData?.["Opinion of Site Value $"]
            ?? costData?.["OPINION OF SITE VALUE $"]
            ?? data?.["OPINION OF SITE VALUE = $ ................................................"]
            ?? data?.["OPINION OF SITE VALUE"]
            ?? data?.["Opinion of Site Value"];
        if (candidate !== undefined && candidate !== null) {
            valStr = String(candidate).trim();
        }
    }

    const cleanNum = valStr.replace(/[^0-9.]/g, '');
    if (!valStr || (cleanNum !== '' && parseFloat(cleanNum) === 0)) {
        return {
            isError: true,
            skipBlankFilter: true,
            message: "'OPINION OF SITE VALUE' in Cost Calculations is mandatory and must not be blank."
        };
    }

    return {
        isMatch: true,
        skipBlankFilter: true,
        message: "'OPINION OF SITE VALUE' is present."
    };
};

export const checkRemainingEconomicLife = (field, text, data) => {
    const economicLifeFields = [
        "Estimated Remaining Economic Life (HUD and VA only)",
        "Remaining Economic Life",
        "Estimated Remaining Economic Life",
        "Estimated Remaining Economic Life Years"
    ];
    if (!economicLifeFields.includes(field)) return null;

    let valStr = (text !== undefined && text !== null) ? String(text).trim() : '';
    if (!valStr && data) {
        const costData = data.COST_APPROACH || data.Cost_Approach || data;
        const candidate = costData?.["Estimated Remaining Economic Life (HUD and VA only)"]
            ?? costData?.["Remaining Economic Life"]
            ?? costData?.["Estimated Remaining Economic Life"]
            ?? data?.["Estimated Remaining Economic Life (HUD and VA only)"]
            ?? data?.["Remaining Economic Life"]
            ?? data?.["Estimated Remaining Economic Life"];
        if (candidate !== undefined && candidate !== null) {
            valStr = String(candidate).trim();
        }
    }

    const cleanNum = valStr.replace(/[^0-9.]/g, '');
    if (!valStr || (cleanNum !== '' && parseFloat(cleanNum) === 0)) {
        return {
            isError: true,
            skipBlankFilter: true,
            message: "'Remaining Economic Life' in Cost Approach is mandatory and must not be blank."
        };
    }

    return {
        isMatch: true,
        skipBlankFilter: true,
        message: "'Remaining Economic Life' is present."
    };
};

export const checkCostApproachFieldsNotBlank = (field, text) => {
    const fieldsToCheck = [
        "Estimated", "Source of cost data", "Quality rating from cost service ",
        "Effective date of cost data ", "Comments on Cost Approach (gross living area calculations, depreciation, etc.)",
        "Dwelling", "Garage/Carport ",
        " Total Estimate of Cost-New  = $ ...................", "Depreciation ",
        "Depreciated Cost of Improvements......................................................=$ ",
        "“As-is” Value of Site Improvements......................................................=$",
        "Indicated Value By Cost Approach......................................................=$",
        "Indicated Value by Cost Approach",
        "Depreciated Cost of Dwellings",
        "As Is Value of Site Improvements",
        "Above Grade Finished Area",
        "Cost Per Square Foot",
        "Depreciated Cost",
        "Physical Depreciation",
        "Functional Depreciation",
        "External Depreciation",
        "Total Depreciation",
        "Effective Age",
        "Site Improvement Description",
        "Site Improvement Amount",
        "Primary Site Valuation Method",
        "Land Comparable Number",
        "Land Comparable Address",
        "Land Comparable County",
        "Land Comparable Data Source",
        "Land Comparable Assessor Parcel Number (APN)",
        "Land Comparable Site Size",
        "Land Comparable Sale Date",
        "Land Comparable Sale Price",
        "Commentary on Remaining Economic Life",
        "Commentary on Effective Age",
        "Reconciliation of Site Value",
        "General Description",
        "Cost Type",
        "Cost Data Source",
        "Quality Rating",
        "Effective Date",
        "Cost Method",
        "Depreciation Method",
        "Cost Approach Commentary",
        "Cost Approach Exhibits"
    ];
    if (fieldsToCheck.includes(field) && (!text || String(text).trim() === '')) {
        return { isError: true, message: `'${field}' should not be blank.` };
    }
    return null;
};

export { checkCostApproachMatchConsistency } from './form1004And1007Validation';

