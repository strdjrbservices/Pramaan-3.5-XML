// State-specific requirements validation for appraisal reports (PDF & XML data)

const STATE_NAMES = {
    'ALABAMA': 'AL', 'ALASKA': 'AK', 'ARIZONA': 'AZ', 'ARKANSAS': 'AR', 'CALIFORNIA': 'CA',
    'COLORADO': 'CO', 'CONNECTICUT': 'CT', 'DELAWARE': 'DE', 'FLORIDA': 'FL', 'GEORGIA': 'GA',
    'HAWAII': 'HI', 'IDAHO': 'ID', 'ILLINOIS': 'IL', 'INDIANA': 'IN', 'IOWA': 'IA',
    'KANSAS': 'KS', 'KENTUCKY': 'KY', 'LOUISIANA': 'LA', 'MAINE': 'ME', 'MARYLAND': 'MD',
    'MASSACHUSETTS': 'MA', 'MICHIGAN': 'MI', 'MINNESOTA': 'MN', 'MISSISSIPPI': 'MS', 'MISSOURI': 'MO',
    'MONTANA': 'MT', 'NEBRASKA': 'NE', 'NEVADA': 'NV', 'NEW HAMPSHIRE': 'NH', 'NEW JERSEY': 'NJ',
    'NEW MEXICO': 'NM', 'NEW YORK': 'NY', 'NORTH CAROLINA': 'NC', 'NORTH DAKOTA': 'ND', 'OHIO': 'OH',
    'OKLAHOMA': 'OK', 'OREGON': 'OR', 'PENNSYLVANIA': 'PA', 'RHODE ISLAND': 'RI', 'SOUTH CAROLINA': 'SC',
    'SOUTH DAKOTA': 'SD', 'TENNESSEE': 'TN', 'TEXAS': 'TX', 'UTAH': 'UT', 'VERMONT': 'VT',
    'VIRGINIA': 'VA', 'WASHINGTON': 'WA', 'WEST VIRGINIA': 'WV', 'WISCONSIN': 'WI', 'WYOMING': 'WY'
};

const normalizeState = (rawState) => {
    if (!rawState) return '';
    const clean = String(rawState).trim().toUpperCase();
    return STATE_NAMES[clean] || clean;
};

// Case-insensitive helper to retrieve field value from section or top-level
const getVal = (data, sectionName, fieldName) => {
    if (!data || typeof data !== 'object') return '';
    const secKeys = Object.keys(data);
    const targetSecKey = secKeys.find(k => k.toLowerCase() === sectionName.toLowerCase());
    const sec = targetSecKey ? data[targetSecKey] : null;
    if (sec && typeof sec === 'object') {
        const fieldKeys = Object.keys(sec);
        const targetFieldKey = fieldKeys.find(k => k.toLowerCase() === fieldName.toLowerCase());
        if (targetFieldKey && sec[targetFieldKey] !== undefined && sec[targetFieldKey] !== null) {
            const v = sec[targetFieldKey];
            return typeof v === 'object' && v.value !== undefined ? v.value : v;
        }
    }
    const topKey = Object.keys(data).find(k => k.toLowerCase() === fieldName.toLowerCase());
    if (topKey && data[topKey] !== undefined && data[topKey] !== null) {
        const v = data[topKey];
        return typeof v === 'object' && v.value !== undefined ? v.value : v;
    }
    return '';
};

// 1. Appraiser fee disclosed in report body (AZ, CO, CT, GA, IL, LA, NJ, NV, NM, ND, OH, UT, VA, VT, WV)
export const checkAppraiserFee = (data) => {
    const feeSources = [
        getVal(data, 'Certification', "Appraiser's Fee"),
        getVal(data, 'Certification', "Appraisal Fee"),
        getVal(data, 'Certification', "Appraiser Fee"),
        getVal(data, 'Certification', "Fee"),
        getVal(data, 'Reconciliation', "Appraisal Fee"),
        getVal(data, 'Reconciliation', "Appraiser's Fee"),
        getVal(data, 'Reconciliation', "Appraiser Fee"),
        getVal(data, 'Subject', "Appraiser's Fee"),
        getVal(data, 'Subject', "Appraiser Fee"),
        getVal(data, 'Subject', "Appraisal Fee"),
        getVal(data, 'Invoice', "Total Fee"),
        getVal(data, 'Invoice', "Invoice Amount"),
        getVal(data, 'Invoice', "Amount Due"),
        getVal(data, 'Invoice', "Total"),
        data?.["Appraiser's Fee"],
        data?.['Appraiser Fee'],
        data?.['Appraisal Fee']
    ];

    for (const val of feeSources) {
        if (val !== undefined && val !== null) {
            const raw = typeof val === 'object' && val.value !== undefined ? val.value : val;
            const str = String(raw).trim();
            const num = parseFloat(str.replace(/[^0-9.]/g, ''));
            if (!isNaN(num) && num > 0) return true;
            if (str && !['0', '0.00', 'none', 'n/a', 'na'].includes(str.toLowerCase()) && str.length > 1) {
                return true;
            }
        }
    }
    return false;
};

// 2. AMC license/registration number included (GA, IL, MT, NJ, OH, VT)
export const checkAmcLicense = (data) => {
    const licSources = [
        getVal(data, 'Certification', "AMC License #"),
        getVal(data, 'Certification', "AMC Reg. Number"),
        getVal(data, 'Certification', "AMC License"),
        getVal(data, 'Subject', "AMC License #"),
        getVal(data, 'Subject', "AMC Reg. Number"),
        getVal(data, 'Subject', "AMC License"),
        data?.["AMC License #"],
        data?.['AMC Reg. Number'],
        data?.['AMC License']
    ];

    for (const val of licSources) {
        if (val !== undefined && val !== null) {
            const raw = typeof val === 'object' && val.value !== undefined ? val.value : val;
            const str = String(raw).trim();
            if (str && !['none', 'n/a', 'na'].includes(str.toLowerCase())) {
                return true;
            }
        }
    }
    return false;
};

// 3. AMC number and expiration date included (IL)
export const checkAmcLicenseAndExpiration = (data) => {
    const missing = [];
    if (!checkAmcLicense(data)) {
        missing.push("AMC License # (e.g. 558000312)");
    }
    const expSources = [
        getVal(data, 'Certification', "Expiration Date of Certification or License"),
        getVal(data, 'Certification', "AMC License Expiration Date"),
        getVal(data, 'Certification', "License Valid To"),
        getVal(data, 'Subject', "AMC License Expiration Date"),
        data?.["Expiration Date of Certification or License"]
    ];
    let hasExp = false;
    for (const val of expSources) {
        if (val !== undefined && val !== null) {
            const raw = typeof val === 'object' && val.value !== undefined ? val.value : val;
            const str = String(raw).trim();
            if (str && !['none', 'n/a', 'na'].includes(str.toLowerCase())) {
                hasExp = true;
                break;
            }
        }
    }
    if (!hasExp) {
        missing.push("AMC License Expiration Date (e.g. 12/31/2026)");
    }
    return missing;
};

// 4. AMC fee included in report (NV, NM, UT)
export const checkAmcFee = (data) => {
    const feeSources = [
        getVal(data, 'Certification', "AMC Fee"),
        getVal(data, 'Subject', "AMC Fee"),
        getVal(data, 'Reconciliation', "AMC Fee"),
        data?.["AMC Fee"]
    ];

    for (const val of feeSources) {
        if (val !== undefined && val !== null) {
            const raw = typeof val === 'object' && val.value !== undefined ? val.value : val;
            const str = String(raw).trim();
            const num = parseFloat(str.replace(/[^0-9.]/g, ''));
            if (!isNaN(num) && num > 0) return true;
            if (str && !['0', '0.00', 'none', 'n/a', 'na'].includes(str.toLowerCase()) && str.length > 1) {
                return true;
            }
        }
    }
    return false;
};

// 5. Smoke/CO detector presence and legal requirement addressed (CA, VA)
export const checkSmokeCoDetector = (data) => {
    const sources = [
        getVal(data, 'Subject', 'Smoke detector comment'),
        getVal(data, 'Subject', 'CO detector comment'),
        getVal(data, 'Improvements', 'Additional features'),
        getVal(data, 'Subject', 'Comments on Improvements'),
        data?.['Smoke detector comment'],
        data?.['CO detector comment']
    ];
    for (const val of sources) {
        if (val !== undefined && val !== null) {
            const raw = typeof val === 'object' && val.value !== undefined ? val.value : val;
            const str = String(raw).trim().toLowerCase();
            if (str.includes('smoke') || str.includes('carbon monoxide') || str.includes('co detector') || str.includes('co alarm') || str.includes('detector') || str.includes('alarm')) {
                return true;
            }
        }
    }
    return false;
};

// 6. Water heater double-strapping addressed (CA; UT for Averra Financial LLC)
export const checkWaterHeaterDoubleStrapping = (data) => {
    const sources = [
        getVal(data, 'Improvements', 'Water heater double-strapped comment'),
        getVal(data, 'Improvements', 'Additional features'),
        getVal(data, 'Subject', 'Water heater double-strapped comment'),
        getVal(data, 'Subject', 'Comments on Improvements'),
        data?.['Water heater double-strapped comment']
    ];
    for (const val of sources) {
        if (val !== undefined && val !== null) {
            const raw = typeof val === 'object' && val.value !== undefined ? val.value : val;
            const str = String(raw).trim().toLowerCase();
            if (str.includes('strap') || str.includes('brace') || str.includes('double')) {
                return true;
            }
        }
    }
    return false;
};

// Helper: Get Lender/Client Name
export const getLenderClientName = (data) => {
    const sources = [
        getVal(data, 'Subject', 'Lender/Client'),
        getVal(data, 'Subject', 'Client Name'),
        getVal(data, 'Subject', 'Client/Lender Company Name'),
        getVal(data, 'Subject', 'Lender/Client Company Name'),
        getVal(data, 'Subject', 'LENDER/CLIENT Name'),
        getVal(data, 'Certification', 'Lender/Client'),
        getVal(data, 'Certification', 'Client Name'),
        getVal(data, 'Certification', 'Lender Name'),
        getVal(data, 'Certification', 'Lender/Client Company Name'),
        getVal(data, 'Certification', 'LENDER/CLIENT Name'),
        getVal(data, 'Certification', 'LENDER/CLIENT Company Name'),
        data?.['Lender/Client'],
        data?.['Client Name'],
        data?.['Lender/Client Company Name'],
        data?.['LENDER/CLIENT Name'],
        data?.['Lender Name'],
        data?.comparisonData?.['Client/Lender on Report'],
        data?.['Client/Lender on Report']
    ];
    for (const val of sources) {
        if (val !== undefined && val !== null) {
            const raw = typeof val === 'object' && val.value !== undefined ? val.value : val;
            const str = String(raw).trim();
            if (str) return str.toUpperCase();
        }
    }
    return '';
};

// 7. CO detector presence confirmed; photos provided (IL)
export const checkIllinoisCoDetectorAndPhotos = (data) => {
    const sources = [
        getVal(data, 'Subject', 'CO detector comment'),
        getVal(data, 'Subject', 'Smoke detector comment'),
        getVal(data, 'Improvements', 'Additional features'),
        data?.['CO detector comment']
    ];
    let hasComment = false;
    for (const val of sources) {
        if (val !== undefined && val !== null) {
            const raw = typeof val === 'object' && val.value !== undefined ? val.value : val;
            const str = String(raw).trim().toLowerCase();
            if (str.includes('carbon monoxide') || str.includes('co detector') || str.includes('co alarm') || str.includes('co ')) {
                hasComment = true;
                break;
            }
        }
    }
    return hasComment;
};

// 8. Invoice attached to report (NY except Plaza Home Mortgage; WI)
export const checkInvoiceAttached = (data) => {
    // 1. Direct flag fields across sections
    const invFlagSources = [
        getVal(data, 'Certification', 'Invoice Attached'),
        getVal(data, 'Certification', 'Invoice Present'),
        getVal(data, 'Subject', 'Invoice Attached'),
        getVal(data, 'Subject', 'Invoice Present'),
        data?.['Invoice Attached'],
        data?.['Invoice Present'],
        data?.['has_invoice'],
        data?.['Invoice copy attached to report'],
        data?.['Invoice copy attached'],
        data?.CERTIFICATION?.['Invoice Attached'],
        data?.CERTIFICATION?.['Invoice Present'],
        data?.SUBJECT?.['Invoice Attached'],
        data?.SUBJECT?.['Invoice Present']
    ];
    for (const flag of invFlagSources) {
        if (flag !== undefined && flag !== null) {
            const raw = typeof flag === 'object' && flag.value !== undefined ? flag.value : flag;
            const str = String(raw).trim().toLowerCase();
            if (['yes', 'true', 'attached', 'included', '1', 'present'].includes(str)) return true;
        }
    }

    // 2. Direct INVOICE / Invoice section
    const invSec = data?.INVOICE || data?.Invoice;
    if (invSec && typeof invSec === 'object' && Object.keys(invSec).length > 0) {
        const val = invSec['Invoice Attached'] || invSec['Invoice Present'] || invSec['has_invoice'] || invSec['Invoice Total'] || invSec['Total Fee'] || invSec['Invoice Page'];
        if (val !== undefined && val !== null) {
            const str = String(val).trim().toLowerCase();
            if (!['no', 'false', 'absent', 'not attached', '0'].includes(str)) {
                return true;
            }
        } else {
            return true;
        }
    }

    // 3. Pages detected containing invoice
    if (data?.pages_detected?.invoice !== null && data?.pages_detected?.invoice !== undefined) return true;
    if (Array.isArray(data?.pages_detected?.invoice_pages) && data.pages_detected.invoice_pages.length > 0) return true;

    // 4. Raw text check in report
    const fullText = String(data?.raw || data?.full_doc_text || '').toUpperCase();
    if (fullText) {
        if (/\bINVOICE\s*(?:COPY\s*)?ATTACHED\b|\bINVOICE\s+INCLUDED\b|\bAPPRAISAL\s+INVOICE\b|\bINVOICE\s*(?:#|NUMBER|TOTAL|DATE|AMOUNT)\b/.test(fullText)) {
            return true;
        }
    }

    // 5. Appraiser fee fallback
    if (checkAppraiserFee(data)) return true;

    return false;
};

// 10. Philadelphia report escalation (PA: escalate only if value seems high; no escalation for 1004D)
export const checkPhiladelphiaReportEscalation = (data) => {
    const city = String(getVal(data, 'Subject', 'City') || data?.City || '').toUpperCase();
    const county = String(getVal(data, 'Subject', 'County') || data?.County || '').toUpperCase();
    const isPhilly = city.includes('PHILADELPHIA') || county.includes('PHILADELPHIA');
    if (!isPhilly) return [];

    const formType = String(data?.formType || data?.selectedFormType || getVal(data, 'Subject', 'Form Type') || '').toUpperCase();
    if (formType.includes('1004D')) {
        return [];
    }

    const appraisedVal = parseFloat(String(getVal(data, 'Reconciliation', 'Appraised Value') || getVal(data, 'Reconciliation', 'final value') || '').replace(/[^0-9.]/g, '')) || 0;
    const contractPrice = parseFloat(String(getVal(data, 'Contract', 'Contract Price $') || getVal(data, 'Contract', 'Contract Price') || '').replace(/[^0-9.]/g, '')) || 0;

    if (contractPrice > 0 && appraisedVal > contractPrice * 1.10) {
        return [`Philadelphia escalation: Appraised value ($${appraisedVal.toLocaleString()}) is >10% higher than contract price ($${contractPrice.toLocaleString()})`];
    }
    return [];
};

// State Requirement Checker mapping to the 11 requirements
export const checkStateRequirements = (field, text, data) => {
    if (field !== 'State') return null;

    let state = normalizeState(text);
    if (!state && data) {
        state = normalizeState(getVal(data, 'Subject', 'State'));
    }
    if (!state) return null;

    const missing = [];

    // 1. Appraiser fee disclosed in report body (AZ, CO, CT, GA, IL, LA, NJ, NV, NM, ND, OH, UT, VA, VT, WV)
    const feeStates = ['AZ', 'CO', 'CT', 'GA', 'IL', 'LA', 'NJ', 'NV', 'NM', 'ND', 'OH', 'UT', 'VA', 'VT', 'WV'];
    if (feeStates.includes(state)) {
        if (!checkAppraiserFee(data)) {
            missing.push("Appraiser's Fee");
        }
    }

    // 2. AMC license/registration number included (GA, IL, MT, NJ, OH, VT)
    const amcLicStates = ['GA', 'IL', 'MT', 'NJ', 'OH', 'VT'];
    if (amcLicStates.includes(state)) {
        if (!checkAmcLicense(data)) {
            missing.push("AMC License #");
        }
    }

    // 3 & 7. Illinois (IL) specific checks
    if (state === 'IL') {
        const ilLicMissing = checkAmcLicenseAndExpiration(data);
        ilLicMissing.forEach(item => {
            if (!missing.includes(item)) missing.push(item);
        });
        if (!checkIllinoisCoDetectorAndPhotos(data)) {
            missing.push("CO detector confirmation / commentary");
        }
    }

    // 4. AMC fee included in report (NV, NM, UT)
    const amcFeeStates = ['NV', 'NM', 'UT'];
    if (amcFeeStates.includes(state)) {
        if (!checkAmcFee(data)) {
            missing.push("AMC Fee");
        }
    }

    // 5 & 6. California (CA) specific checks
    if (state === 'CA') {
        if (!checkSmokeCoDetector(data)) {
            missing.push("Smoke/CO detector presence and legal requirement comment");
        }
        if (!checkWaterHeaterDoubleStrapping(data)) {
            missing.push("Water heater double-strapped comment");
        }
    }

    // 6. Utah (UT) specific check for Averra Financial LLC
    if (state === 'UT') {
        const lender = getLenderClientName(data);
        if (lender.includes('AVERRA')) {
            if (!checkWaterHeaterDoubleStrapping(data)) {
                missing.push("Double-strapped water heater comment (Required for Averra Financial LLC)");
            }
        }
    }

    // 8. Invoice attached to report (NY except Plaza Home Mortgage; WI)
    if (state === 'WI') {
        if (!checkInvoiceAttached(data)) {
            missing.push("Invoice copy attached to report");
        }
    }

    if (state === 'NY') {
        const lender = getLenderClientName(data);
        const isPlaza = lender.includes('PLAZA HOME') || lender.includes('PLAZA');
        if (!isPlaza && !checkInvoiceAttached(data)) {
            missing.push("Invoice copy attached to report (exempt for Plaza Home Mortgage)");
        }
    }

    // 9. Invoice included or omitted without rejection (OK)
    if (state === 'OK') {
        // Always passes in Oklahoma without rejection
        return { isMatch: true, message: `All state requirements for ${state} appear to be met (Invoice included or omitted without rejection).` };
    }

    // 10. Philadelphia report escalation (PA: escalate only if value seems high; no escalation for 1004D)
    if (state === 'PA') {
        const phillyEscalation = checkPhiladelphiaReportEscalation(data);
        if (phillyEscalation.length > 0) {
            return { isError: true, message: phillyEscalation.join(', ') };
        }
    }

    // 11. Smoke/CO detector installation confirmed (VA)
    if (state === 'VA') {
        if (!checkSmokeCoDetector(data)) {
            missing.push("Smoke and CO detector installation confirmation");
        }
    }

    if (missing.length > 0) {
        return { isError: true, message: `Missing for ${state}: ${missing.join(', ')}.` };
    }

    return { isMatch: true, message: `All state requirements for ${state} appear to be met.` };
};

