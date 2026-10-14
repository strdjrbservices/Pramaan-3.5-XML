export const isGrayMarketCell = (field) => {
    const fieldStr = String(field || '');

    const grayRowKeywords = [
        "Total # of Comparable Active Listings",
        "Months of Housing Supply",
        "Median Comparable List Price",
        "Median Comparable Listings Days on Market"
    ];

    const isGrayRow = grayRowKeywords.some(kw => fieldStr.includes(kw));
    const isPriorPeriod = fieldStr.includes("Prior 7-12") || fieldStr.includes("Prior 7–12") || fieldStr.includes("Prior 4-6") || fieldStr.includes("Prior 4–6");

    return isGrayRow && isPriorPeriod;
};

export const isMarketConditionsPerformed = (allData) => {
    if (!allData) return true; // Default to true if not provided to be safe

    const mcData = allData.MARKET_CONDITIONS || allData;
    if (!mcData || typeof mcData !== 'object') return false;

    const values = Object.values(mcData);
    return values.some(val => {
        if (typeof val === 'string') return val.trim().length > 0;
        if (typeof val === 'number') return true;
        if (typeof val === 'object' && val !== null) {
            return Object.values(val).some(v => String(v || '').trim().length > 0);
        }
        return false;
    });
};

export const getForeclosureFactorValue = (allData) => {
    if (!allData) return '';
    const mcData = allData?.MARKET_CONDITIONS || allData;
    const factorKey = Object.keys(mcData || {}).find(k => k.toLowerCase().includes("are foreclosure sales"));
    return String((factorKey ? mcData[factorKey] : mcData?.["Are foreclosure sales (REO sales) a factor in the market?"]) || '').trim();
};

export const checkForeclosureExplanation = (field, text, allData) => {
    const fieldStr = String(field || '');
    const isForeclosureExpField = fieldStr.includes("If yes, explain (including the trends in listings and sales of foreclosed properties)");

    if (!isForeclosureExpField) return null;

    const foreclosureFactor = getForeclosureFactorValue(allData).toLowerCase();
    const val = String(text || '').trim();

    if (foreclosureFactor === 'yes') {
        if (!val) {
            return {
                isError: true,
                skipBlankFilter: true,
                message: `'If yes, explain (including the trends in listings and sales of foreclosed properties).' must not be blank when foreclosure sales are a factor in the market.`
            };
        }
        return { isMatch: true };
    } else {
        // If foreclosure factor is 'No' or not 'Yes', explanation is not required
        return null;
    }
};

export const checkSellerConcessionsExplanation = (field, text, allData) => {
    const fieldStr = String(field || '');
    const isSellerExpField = fieldStr.includes("Explain in detail the seller concessions trends");

    if (!isSellerExpField) return null;

    const mcData = allData?.MARKET_CONDITIONS || allData;
    const factorKey = Object.keys(mcData || {}).find(k => k.toLowerCase().includes("seller-(developer") || k.toLowerCase().includes("seller concessions"));
    const sellerFactor = String((factorKey ? mcData[factorKey] : mcData?.["Seller-(developer, builder, etc.)paid financial assistance prevalent?"]) || '').trim().toLowerCase();
    const val = String(text || '').trim();

    if (sellerFactor === 'yes') {
        if (!val) {
            return {
                isError: true,
                skipBlankFilter: true,
                message: `'Explain in detail the seller concessions trends' must not be blank when seller paid financial assistance is prevalent.`
            };
        }
        return { isMatch: true };
    }
    return null;
};

export const checkMarketConditionsFieldsNotBlank = (field, text, allData) => {
    const fieldStr = String(field || '');

    // Handle foreclosure explanation dependency
    if (fieldStr.includes("If yes, explain (including the trends in listings and sales of foreclosed properties)")) {
        return checkForeclosureExplanation(field, text, allData);
    }

    // Handle seller concessions explanation dependency
    if (fieldStr.includes("Explain in detail the seller concessions trends")) {
        return checkSellerConcessionsExplanation(field, text, allData);
    }

    const fieldsToCheck = [
        "Seller-(developer, builder, etc.)paid financial assistance prevalent?",
        "Are foreclosure sales (REO sales) a factor in the market?",
        "Cite data sources for above information.",
        "Summarize the above information as support for your conclusions in the Neighborhood section of the appraisal report form. If you used any additional information, such as an analysis of pending sales and/or expired and withdrawn listings, to formulate your conclusions, provide both an explanation and support for your conclusions."
    ];

    if (!fieldsToCheck.some(f => fieldStr.includes(f))) return null;

    const performed = isMarketConditionsPerformed(allData);
    const val = String(text || '').trim();

    if (performed && !val) {
        return { isError: true, skipBlankFilter: true, message: `'${field}' must not be blank when Market Conditions analysis is performed.` };
    }

    if (val) {
        return { isMatch: true };
    }

    return null;
};

export const checkMarketConditionsTableFields = (field, text, allData) => {
    if (isGrayMarketCell(field)) {
        return null;
    }

    const performed = isMarketConditionsPerformed(allData);
    const val = String(text || '').trim();

    if (performed && !val) {
        return {
            isError: true,
            skipBlankFilter: true,
            message: `'${field}' in Market Conditions table must not be blank.`
        };
    }

    if (val) {
        return { isMatch: true };
    }

    return null;
};
