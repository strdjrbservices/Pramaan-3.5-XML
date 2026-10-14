const checkAppraiserFee = (data) => {
    const fee = data?.CERTIFICATION?.['Appraisal Fee'] || data?.RECONCILIATION?.['Appraisal Fee'] || data?.SUBJECT?.["Appraiser's Fee"] || data?.["Appraiser's Fee"] || data?.['Appraisal Fee'];
    return fee && String(fee).replace(/[^0-9.]/g, '') > 0;
};

const checkAmcLicense = (data) => {
    return data?.CERTIFICATION?.['AMC License #'] || data?.['AMC License #'] || data?.SUBJECT?.['AMC License #'] || data?.['AMC Reg. Number'] || data?.CERTIFICATION?.['AMC Reg. Number'];
};

const checkAmcFee = (data) => {
    const fee = data?.CERTIFICATION?.['AMC Fee'] || data?.['AMC Fee'] || data?.SUBJECT?.['AMC Fee'];
    return fee && String(fee).replace(/[^0-9.]/g, '') > 0;
};

const checkIllinoisRequirements = (data) => {
    const missing = [];
    if (!checkAmcLicense(data)) missing.push("AMC License #");
    if (!checkAppraiserFee(data)) missing.push("Appraiser's Fee");
    if (data?.Subject?.['CO detector comment']) return missing;
    return missing;
};

const checkCaliforniaRequirements = (data) => {
    const missing = [];
    if (!data?.['Smoke detector comment']) missing.push("Smoke detector comment");
    if (!data?.['CO detector comment']) missing.push("CO detector comment");
    if (!data?.['Water heater double-strapped comment']) missing.push("Water heater double-strapped comment");

    return missing;
};

const checkUtahRequirements = (data) => {
    const improvements = data?.IMPROVEMENTS?.['Additional features']?.toLowerCase() || '';
    const missing = [];
    if (!improvements.includes('double strapped')) missing.push("Double-strapped water heater comment");
    if (!checkAmcFee(data)) missing.push("AMC Fee");
    if (!checkAppraiserFee(data)) missing.push("Appraiser's Fee");
    return missing;
};

const checkVirginiaRequirements = (data) => {
    const missing = [];
    if (!data?.['Smoke detector comment']) missing.push("Smoke detector comment");
    if (!data?.['CO detector comment']) missing.push("CO detector comment");
    return missing;
};

const checkWisconsinRequirements = (data) => {
    const improvements = data?.IMPROVEMENTS?.['Additional features']?.toLowerCase() || '';
    const hasCO = improvements.includes('CO');
    return hasCO;
};

export const checkStateRequirements = (field, text, data) => {
    if (field !== 'State') return null;

    const state = String(text || '').trim().toUpperCase();
    if (!state) return null;


    const detailedChecks = {
        'GA': () => {
            const missing = [];
            if (!checkAppraiserFee(data)) missing.push("Appraiser's Fee");
            if (!checkAmcLicense(data)) missing.push("AMC License #");
            return missing;
        },
        'IL': () => checkIllinoisRequirements(data),
        'NJ': () => {
            const missing = [];
            if (!checkAppraiserFee(data)) missing.push("Appraiser's Fee");
            if (!checkAmcLicense(data)) missing.push("AMC License #");
            return missing;
        },
        'NV': () => {
            const missing = [];
            if (!checkAppraiserFee(data)) missing.push("Appraiser's Fee");
            if (!checkAmcFee(data)) missing.push("AMC Fee");
            return missing;
        },
        'NM': () => {
            const missing = [];
            if (!checkAppraiserFee(data)) missing.push("Appraiser's Fee");
            if (!checkAmcFee(data)) missing.push("AMC Fee");
            return missing;
        },
        'OH': () => {
            const missing = [];
            if (!checkAppraiserFee(data)) missing.push("Appraiser's Fee");
            if (!checkAmcLicense(data)) missing.push("AMC License #");
            return missing;
        },
        'UT': () => checkUtahRequirements(data),
        'VA': () => checkVirginiaRequirements(data),
        'VT': () => {
            const missing = [];
            if (!checkAppraiserFee(data)) missing.push("Appraiser's Fee");
            if (!checkAmcLicense(data)) missing.push("AMC License #");
            return missing;
        },
        'CA': () => checkCaliforniaRequirements(data),
        'WI': () => checkWisconsinRequirements(data) ? [] : ["CO detector confirmation"],
    };

    const requirements = {
        'AZ': { check: () => checkAppraiserFee(data), msg: "Appraiser's fee must be disclosed." },
        'CO': { check: () => checkAppraiserFee(data), msg: "Appraiser's fee must be disclosed." },
        'CT': { check: () => checkAppraiserFee(data), msg: "Appraiser's fee must be disclosed." },
        'LA': { check: () => checkAppraiserFee(data), msg: "Appraiser's fee must be disclosed." },
        'ND': { check: () => checkAppraiserFee(data), msg: "Appraiser's fee must be disclosed." },
        'WV': { check: () => checkAppraiserFee(data), msg: "Appraiser's fee must be disclosed." },
        'MT': { check: () => checkAmcLicense(data), msg: "AMC License # must be included." },
        'NY': { check: () => true, msg: "Invoice copy should be included in the report (except for Plaza Home Mortgage)." }
    };

    if (detailedChecks[state]) {
        const missingItems = detailedChecks[state]();
        if (missingItems.length === 0) {
            return { isMatch: true, message: `All state requirements for ${state} appear to be met.` };
        } else {
            return { isError: true, message: `Missing for ${state}: ${missingItems.join(', ')}.` };
        }
    }

    const simpleRequirement = requirements[state];

    if (simpleRequirement) {
        if (simpleRequirement.check()) {
            return { isMatch: true, message: `State requirements for ${state} appear to be met.` };
        } else {
            return { isError: true, message: `State Requirement Mismatch for ${state}: ${simpleRequirement.msg}` };
        }
    }

    return null;
};
