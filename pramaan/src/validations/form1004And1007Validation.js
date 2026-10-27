/**
 * Validations for Form Type 1004 + 1007
 * 
 * Rules:
 * 1. "I (WE) ESTIMATE THE MONTHLY MARKET RENT OF THE SUBJECT AS OF" (date) from
 *    Comparable Rent Schedule Reconciliation must match with "as of" (date) from RECONCILIATION.
 * 2. "TO BE $" from Comparable Rent Schedule Reconciliation must match with
 *    "Estimated Monthly Market Rent $" from Income Approach.
 * 3. "Income Approach (if developed) $" from RECONCILIATION must match with
 *    "Indicated Value by Income Approach" from Income Approach.
 * 4. If "Cost Approach (if developed)" from RECONCILIATION is not blank,
 *    then it must match with "INDICATED VALUE BY COST APPROACH" from Cost Approach.
 */

export const is1004And1007Form = (allData, selectedFormType) => {
    const raw = String(
        selectedFormType ||
        allData?.selectedFormType ||
        allData?.formType ||
        allData?.['Form Type'] ||
        allData?.['From Type'] ||
        allData?.selected_form_type ||
        allData?.clean_data?.formType ||
        allData?.clean_data?.['Form Type'] ||
        ''
    ).toLowerCase();

    const normalized = raw.replace(/\s+/g, '');
    return normalized.includes('1004+1007') || (normalized.includes('1004') && normalized.includes('1007'));
};

export const is1004Or1004And1007Form = (allData, selectedFormType) => {
    const raw = String(
        selectedFormType ||
        allData?.selectedFormType ||
        allData?.formType ||
        allData?.['Form Type'] ||
        allData?.['From Type'] ||
        allData?.selected_form_type ||
        allData?.clean_data?.formType ||
        allData?.clean_data?.['Form Type'] ||
        ''
    ).toLowerCase();

    if (!raw) return true;
    const normalized = raw.replace(/\s+/g, '');
    if (normalized.includes('1073') || normalized.includes('version1') || normalized.includes('version#1')) {
        return false;
    }
    return true;
};

export const normalizeDate = (d) => {
    if (d === undefined || d === null) return '';
    const str = String(typeof d === 'object' && d !== null ? (d.value ?? '') : d).trim();
    if (!str) return '';

    // Match MM/DD/YYYY or MM-DD-YYYY or M/D/YYYY
    const mUs = str.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
    if (mUs) {
        return `${parseInt(mUs[1], 10)}/${parseInt(mUs[2], 10)}/${mUs[3]}`;
    }

    // Match YYYY-MM-DD or YYYY/MM/DD
    const mIso = str.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})$/);
    if (mIso) {
        return `${parseInt(mIso[2], 10)}/${parseInt(mIso[3], 10)}/${mIso[1]}`;
    }

    // Attempt Date object parsing
    const parsed = new Date(str);
    if (!isNaN(parsed.getTime())) {
        return `${parsed.getUTCMonth() + 1}/${parsed.getUTCDate()}/${parsed.getUTCFullYear()}`;
    }

    return str.toLowerCase();
};

export const parseCurrencyOrNumber = (v) => {
    if (v === undefined || v === null) return null;
    const str = String(typeof v === 'object' && v !== null ? (v.value ?? '') : v).trim();
    if (str === '') return null;
    const num = parseFloat(str.replace(/[^0-9.-]+/g, ""));
    return isNaN(num) ? null : num;
};

export const getSectionFieldValue = (allData, sectionNames, fieldNames) => {
    if (!allData || typeof allData !== 'object') return '';
    const sections = Array.isArray(sectionNames) ? sectionNames : [sectionNames];
    const fields = Array.isArray(fieldNames) ? fieldNames : [fieldNames];

    // 1. Search inside explicit section objects
    for (const sec of sections) {
        const secObj = allData[sec] || allData?.clean_data?.[sec];
        if (secObj && typeof secObj === 'object') {
            for (const f of fields) {
                if (secObj[f] !== undefined && secObj[f] !== null) {
                    const val = typeof secObj[f] === 'object' ? (secObj[f].value ?? '') : secObj[f];
                    if (String(val).trim() !== '') return String(val).trim();
                }
            }
            // Fuzzy search inside section
            for (const f of fields) {
                const target = f.toLowerCase().replace(/[^a-z0-9]/g, '');
                for (const [k, v] of Object.entries(secObj)) {
                    if (k.toLowerCase().replace(/[^a-z0-9]/g, '') === target) {
                        const val = typeof v === 'object' && v !== null ? (v.value ?? '') : v;
                        if (String(val).trim() !== '') return String(val).trim();
                    }
                }
            }
        }
    }

    // 2. Search top level allData and allData.clean_data
    for (const f of fields) {
        if (allData[f] !== undefined && allData[f] !== null) {
            const val = typeof allData[f] === 'object' ? (allData[f].value ?? '') : allData[f];
            if (String(val).trim() !== '') return String(val).trim();
        }
        if (allData?.clean_data?.[f] !== undefined && allData?.clean_data?.[f] !== null) {
            const val = typeof allData.clean_data[f] === 'object' ? (allData.clean_data[f].value ?? '') : allData.clean_data[f];
            if (String(val).trim() !== '') return String(val).trim();
        }
    }

    // 3. Fuzzy search top level
    for (const f of fields) {
        const target = f.toLowerCase().replace(/[^a-z0-9]/g, '');
        for (const [k, v] of Object.entries(allData)) {
            if (typeof v !== 'object' && k.toLowerCase().replace(/[^a-z0-9]/g, '') === target) {
                if (String(v).trim() !== '') return String(v).trim();
            }
        }
    }

    return '';
};

const isRentScheduleDateField = (f) => {
    const s = String(f || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    return s.includes('estimatethemonthlymarketrent') || s.includes('estimatethemonthalymarketrent');
};

const isReconAsOfDateField = (f, path) => {
    const s = String(f || '').trim().toLowerCase();
    if (s !== 'as of') return false;
    if (path && Array.isArray(path) && path.length > 1) {
        const sec = String(path[0] || '').toLowerCase();
        return sec === 'reconciliation' || sec === 'reconciliation_section';
    }
    return true;
};

/**
 * Rule 1:
 * "I (WE) ESTIMATE THE MONTHLY MARKET RENT OF THE SUBJECT AS OF" (date) from
 * Comparable Rent Schedule Reconciliation must match with "as of" (date) from RECONCILIATION.
 */
export const checkRentScheduleAsOfDateConsistency = (field, text, allData, path, saleName, formType) => {
    if (!allData) return null;
    if (!is1004And1007Form(allData, formType)) return null;

    const isRentDate = isRentScheduleDateField(field);
    const isReconDate = isReconAsOfDateField(field, path);
    if (!isRentDate && !isReconDate) return null;

    const rentFieldNames = [
        "I (WE) ESTIMATE THE MONTHLY MARKET RENT OF THE SUBJECT AS OF",
        "i (we) estimate the monthly market rent of the subject as of",
        "I (WE) ESTIMATE THE MONTHALY MARKET RENT OF THE SUBJECT AS OF",
        "i (we) estimate the monthaly market rent of the subject as of"
    ];
    const rentSections = [
        "Comparable Rent Schedule Reconciliation",
        "RENT_SCHEDULE_RECONCILIATION",
        "Rent Schedule Reconciliation",
        "rent_schedule_reconciliation"
    ];

    let rawRentDate = '';
    let rawReconDate = '';

    if (isRentDate) {
        rawRentDate = (text !== undefined && text !== null) ? String(text).trim() : '';
        rawReconDate = getSectionFieldValue(allData, ['RECONCILIATION', 'Reconciliation'], ['as of']);
    } else {
        rawReconDate = (text !== undefined && text !== null) ? String(text).trim() : '';
        rawRentDate = getSectionFieldValue(allData, rentSections, rentFieldNames);
    }

    const normRentDate = normalizeDate(rawRentDate);
    const normReconDate = normalizeDate(rawReconDate);

    // If both are completely blank
    if (!normRentDate && !normReconDate) {
        return {
            isError: true,
            message: "'I (WE) ESTIMATE THE MONTHLY MARKET RENT OF THE SUBJECT AS OF' from Comparable Rent Schedule Reconciliation and 'as of' date from RECONCILIATION must match and cannot be blank."
        };
    }

    // If one is missing or dates do not match
    if (!normRentDate || !normReconDate || normRentDate !== normReconDate) {
        return {
            isError: true,
            skipBlankFilter: true,
            message: `Date mismatch: 'I (WE) ESTIMATE THE MONTHLY MARKET RENT OF THE SUBJECT AS OF' (${rawRentDate ? `'${rawRentDate}'` : 'missing'}) from Comparable Rent Schedule Reconciliation must match 'as of' date (${rawReconDate ? `'${rawReconDate}'` : 'missing'}) from RECONCILIATION.`
        };
    }

    return {
        isMatch: true,
        message: `'I (WE) ESTIMATE THE MONTHLY MARKET RENT OF THE SUBJECT AS OF' (${rawRentDate}) matches 'as of' date (${rawReconDate}) from RECONCILIATION.`
    };
};

const isRentScheduleToBeField = (f) => {
    const s = String(f || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    return s === 'tobe' || s === 'tobedollar';
};

const isIncomeApproachRentField = (f) => {
    const s = String(f || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    return s.includes('estimatedmonthlymarketrent');
};

/**
 * Rule 2:
 * "TO BE $" from Comparable Rent Schedule Reconciliation must match with
 * "Estimated Monthly Market Rent $" from Income Approach.
 */
export const checkRentScheduleToBeAmountConsistency = (field, text, allData, path, saleName, formType) => {
    if (!allData) return null;
    if (!is1004And1007Form(allData, formType)) return null;

    const isToBe = isRentScheduleToBeField(field);
    const isIncomeRent = isIncomeApproachRentField(field);
    if (!isToBe && !isIncomeRent) return null;

    const rentSections = [
        "Comparable Rent Schedule Reconciliation",
        "RENT_SCHEDULE_RECONCILIATION",
        "Rent Schedule Reconciliation",
        "rent_schedule_reconciliation"
    ];
    const rentFieldNames = ["TO BE $", "To be $", "TO BE", "To Be $", "TO BE ($)"];

    const incomeSections = ["INCOME_APPROACH", "Income Approach", "income_approach"];
    const incomeFieldNames = ["Estimated Monthly Market Rent $", "Estimated Monthly Market Rent", "Estimated Monthly Rent $"];

    let rawToBe = '';
    let rawIncomeRent = '';

    if (isToBe) {
        rawToBe = (text !== undefined && text !== null) ? String(text).trim() : '';
        rawIncomeRent = getSectionFieldValue(allData, incomeSections, incomeFieldNames);
    } else {
        rawIncomeRent = (text !== undefined && text !== null) ? String(text).trim() : '';
        rawToBe = getSectionFieldValue(allData, rentSections, rentFieldNames);
    }

    const numToBe = parseCurrencyOrNumber(rawToBe);
    const numIncomeRent = parseCurrencyOrNumber(rawIncomeRent);

    if (numToBe === null && numIncomeRent === null) {
        return {
            isError: true,
            message: "'TO BE $' from Comparable Rent Schedule Reconciliation and 'Estimated Monthly Market Rent $' from Income Approach must match and cannot be blank."
        };
    }

    if (numToBe === null || numIncomeRent === null || numToBe !== numIncomeRent) {
        const val1Display = rawToBe ? (numToBe !== null ? `$${numToBe.toLocaleString()}` : `'${rawToBe}'`) : 'missing';
        const val2Display = rawIncomeRent ? (numIncomeRent !== null ? `$${numIncomeRent.toLocaleString()}` : `'${rawIncomeRent}'`) : 'missing';

        return {
            isError: true,
            skipBlankFilter: true,
            message: `Value mismatch: 'TO BE $' (${val1Display}) from Comparable Rent Schedule Reconciliation must match 'Estimated Monthly Market Rent $' (${val2Display}) from Income Approach.`
        };
    }

    return {
        isMatch: true,
        message: `'TO BE $' ($${numToBe.toLocaleString()}) matches 'Estimated Monthly Market Rent $' ($${numIncomeRent.toLocaleString()}) from Income Approach.`
    };
};

const isReconIncomeApproachField = (f) => {
    const s = String(f || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    return s.includes('incomeapproachifdeveloped');
};

const isIncomeApproachIndicatedValueField = (f) => {
    const s = String(f || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    return s.includes('indicatedvaluebyincomeapproach');
};

/**
 * Rule 3:
 * "Income Approach (if developed) $" from RECONCILIATION must match with
 * "Indicated Value by Income Approach" from Income Approach.
 */
export const checkIncomeApproachIndicatedValueConsistency = (field, text, allData, path, saleName, formType) => {
    if (!allData) return null;
    if (!is1004And1007Form(allData, formType)) return null;

    const isReconIncome = isReconIncomeApproachField(field);
    const isIndicatedVal = isIncomeApproachIndicatedValueField(field);
    if (!isReconIncome && !isIndicatedVal) return null;

    const reconSections = ["RECONCILIATION", "Reconciliation", "reconciliation"];
    const reconFieldNames = [
        "Income Approach (if developed) $",
        "Income Approach (if developed)",
        "Income Approach Indicated Value",
        "Income Approach $"
    ];

    const incomeSections = ["INCOME_APPROACH", "Income Approach", "income_approach"];
    const incomeFieldNames = [
        "Indicated Value by Income Approach",
        "Indicated Value by Income Approach $",
        "Indicated Value by: Income Approach $"
    ];

    let rawReconVal = '';
    let rawIncomeVal = '';

    if (isReconIncome) {
        rawReconVal = (text !== undefined && text !== null) ? String(text).trim() : '';
        rawIncomeVal = getSectionFieldValue(allData, incomeSections, incomeFieldNames);
    } else {
        rawIncomeVal = (text !== undefined && text !== null) ? String(text).trim() : '';
        rawReconVal = getSectionFieldValue(allData, reconSections, reconFieldNames);
    }

    const numRecon = parseCurrencyOrNumber(rawReconVal);
    const numIncome = parseCurrencyOrNumber(rawIncomeVal);

    if (numRecon === null && numIncome === null) {
        return {
            isError: true,
            message: "'Income Approach (if developed) $' from RECONCILIATION and 'Indicated Value by Income Approach' from Income Approach must match and cannot be blank."
        };
    }

    if (numRecon === null || numIncome === null || numRecon !== numIncome) {
        const val1Display = rawReconVal ? (numRecon !== null ? `$${numRecon.toLocaleString()}` : `'${rawReconVal}'`) : 'missing';
        const val2Display = rawIncomeVal ? (numIncome !== null ? `$${numIncome.toLocaleString()}` : `'${rawIncomeVal}'`) : 'missing';

        return {
            isError: true,
            skipBlankFilter: true,
            message: `Value mismatch: 'Income Approach (if developed) $' (${val1Display}) from RECONCILIATION must match 'Indicated Value by Income Approach' (${val2Display}) from Income Approach.`
        };
    }

    return {
        isMatch: true,
        message: `'Income Approach (if developed) $' ($${numRecon.toLocaleString()}) matches 'Indicated Value by Income Approach' ($${numIncome.toLocaleString()}) from Income Approach.`
    };
};

const isReconCostApproachField = (f, path) => {
    const s = String(f || '').trim().toLowerCase();
    if (s === 'cost approach (if developed)' || s === 'cost approach (if developed) $' || s === 'cost approach indicated value') {
        return true;
    }
    const clean = s.replace(/[^a-z0-9]/g, '');
    if (clean === 'costapproachifdeveloped' || clean === 'costapproach') {
        return true;
    }
    if (path && Array.isArray(path) && path.length > 0) {
        const sec = String(path[0] || '').toLowerCase();
        if ((sec === 'reconciliation' || sec === 'reconciliation_section') && clean.includes('costapproach')) {
            return true;
        }
    }
    return false;
};

const isCostApproachIndicatedValueField = (f, path) => {
    const s = String(f || '').trim().toLowerCase();
    if (s.startsWith('indicated value by cost approach') || s.startsWith('indicated value by: cost approach')) {
        return true;
    }
    const clean = s.replace(/[^a-z0-9]/g, '');
    if (clean.includes('indicatedvaluebycostapproach') || clean.includes('indicatedvaluecostapproach')) {
        return true;
    }
    if (path && Array.isArray(path) && path.length > 0) {
        const sec = String(path[0] || '').toLowerCase();
        if ((sec === 'cost_approach' || sec === 'cost approach') && clean.includes('indicatedvalue')) {
            return true;
        }
    }
    return false;
};

/**
 * Rule 4:
 * If "Cost Approach (if developed)" from RECONCILIATION is not blank,
 * then it must match with "INDICATED VALUE BY COST APPROACH" from Cost Approach.
 */
export const checkCostApproachMatchConsistency = (field, text, allData, path, saleName, formType) => {
    if (!allData) return null;
    if (!is1004Or1004And1007Form(allData, formType)) return null;

    const isReconCost = isReconCostApproachField(field, path);
    const isCostIndicated = isCostApproachIndicatedValueField(field, path);
    if (!isReconCost && !isCostIndicated) return null;

    const reconSections = ["RECONCILIATION", "Reconciliation", "reconciliation"];
    const reconFieldNames = [
        "Cost Approach (if developed)",
        "Cost Approach (if developed) $",
        "Cost Approach Indicated Value",
        "Cost Approach $"
    ];

    const costSections = ["COST_APPROACH", "Cost Approach", "cost_approach", "Cost_Approach"];
    const costFieldNames = [
        "Indicated Value By Cost Approach......................................................=$",
        "Indicated Value by Cost Approach",
        "INDICATED VALUE BY COST APPROACH",
        "INDICATED VALUE BY COST APPROACH $",
        "Indicated Value By Cost Approach = $",
        "Indicated Value By Cost Approach $",
        "Indicated Value by: Cost Approach $"
    ];

    let rawReconVal = '';
    let rawCostVal = '';

    if (isReconCost) {
        rawReconVal = (text !== undefined && text !== null) ? String(text).trim() : '';
        rawCostVal = getSectionFieldValue(allData, costSections, costFieldNames);
    } else {
        rawCostVal = (text !== undefined && text !== null) ? String(text).trim() : '';
        rawReconVal = getSectionFieldValue(allData, reconSections, reconFieldNames);
    }

    // Condition: "if Cost Approach (if developed) from RECONCILIATION is not blank"
    // If Reconciliation Cost Approach is blank, no mismatch requirement is enforced.
    if (!rawReconVal || rawReconVal.trim() === '') {
        return null;
    }

    const numRecon = parseCurrencyOrNumber(rawReconVal);
    const numCost = parseCurrencyOrNumber(rawCostVal);

    if (numRecon === null) {
        return {
            isError: true,
            skipBlankFilter: true,
            message: `Invalid numeric value for 'Cost Approach (if developed)': '${rawReconVal}'.`
        };
    }

    if (numCost === null || numRecon !== numCost) {
        const costDisplay = rawCostVal ? (numCost !== null ? `$${numCost.toLocaleString()}` : `'${rawCostVal}'`) : 'missing';
        const reconDisplay = `$${numRecon.toLocaleString()}`;

        if (isReconCost) {
            return {
                isError: true,
                skipBlankFilter: true,
                message: `Value mismatch: 'Cost Approach (if developed)' (${reconDisplay}) from RECONCILIATION must match 'INDICATED VALUE BY COST APPROACH' (${costDisplay}) from Cost Approach.`
            };
        } else {
            return {
                isError: true,
                skipBlankFilter: true,
                message: `Value mismatch: 'INDICATED VALUE BY COST APPROACH' (${costDisplay}) from Cost Approach must match 'Cost Approach (if developed)' (${reconDisplay}) from RECONCILIATION.`
            };
        }
    }

    return {
        isMatch: true,
        message: `'Cost Approach (if developed)' ($${numRecon.toLocaleString()}) matches 'INDICATED VALUE BY COST APPROACH' ($${numCost.toLocaleString()}) from Cost Approach.`
    };
};


