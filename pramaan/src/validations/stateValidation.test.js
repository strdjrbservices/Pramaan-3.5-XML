import {
    checkStateRequirements,
    checkAppraiserFee,
    checkAmcLicense,
    checkAmcLicenseAndExpiration,
    checkAmcFee,
    checkSmokeCoDetector,
    checkWaterHeaterDoubleStrapping,
    checkInvoiceAttached,
    checkPhiladelphiaReportEscalation
} from './stateValidation';

describe('State Requirements Validations', () => {
    // 1. Appraiser fee disclosed in report body (AZ, CO, CT, GA, IL, LA, NJ, NV, NM, ND, OH, UT, VA, VT, WV)
    test('Rule 1: Appraiser fee disclosure passes when fee is present', () => {
        const data = {
            CERTIFICATION: { "Appraiser's Fee": "$550.00" }
        };
        expect(checkAppraiserFee(data)).toBe(true);

        const feeStates = ['AZ', 'CO', 'CT', 'GA', 'IL', 'LA', 'NJ', 'NV', 'NM', 'ND', 'OH', 'UT', 'VA', 'VT', 'WV'];
        feeStates.forEach(st => {
            const res = checkStateRequirements('State', st, data);
            // If the state only requires fee (AZ, CO, CT, LA, ND, WV), it passes completely
            if (['AZ', 'CO', 'CT', 'LA', 'ND', 'WV'].includes(st)) {
                expect(res.isMatch).toBe(true);
            }
        });
    });

    test('Rule 1: Appraiser fee disclosure fails when fee is missing for fee states', () => {
        const data = {
            SUBJECT: { State: 'CO' }
        };
        const res = checkStateRequirements('State', 'CO', data);
        expect(res.isError).toBe(true);
        expect(res.message).toContain("Appraiser's Fee");
    });

    // 2. AMC license/registration number included (GA, IL, MT, NJ, OH, VT)
    test('Rule 2: AMC license required for GA, IL, MT, NJ, OH, VT', () => {
        const dataWithoutLicense = {
            CERTIFICATION: { "Appraiser's Fee": "$600" }
        };
        const resMT = checkStateRequirements('State', 'MT', dataWithoutLicense);
        expect(resMT.isError).toBe(true);
        expect(resMT.message).toContain("AMC License #");

        const dataWithLicense = {
            CERTIFICATION: { "Appraiser's Fee": "$600", "AMC License #": "AMC.123456" }
        };
        const resMT2 = checkStateRequirements('State', 'MT', dataWithLicense);
        expect(resMT2.isMatch).toBe(true);
    });

    // 3 & 7. Illinois (IL): AMC number + exp date, Appraiser fee, CO detector confirmation
    test('Rule 3 & 7: Illinois requirements evaluation', () => {
        const dataMissing = {
            CERTIFICATION: { "Appraiser's Fee": "$600" }
        };
        const resIL = checkStateRequirements('State', 'IL', dataMissing);
        expect(resIL.isError).toBe(true);
        expect(resIL.message).toContain("AMC License #");
        expect(resIL.message).toContain("CO detector");

        const dataComplete = {
            CERTIFICATION: {
                "Appraiser's Fee": "$600",
                "AMC License #": "558000312",
                "Expiration Date of Certification or License": "12/31/2026"
            },
            SUBJECT: {
                "CO detector comment": "Carbon monoxide detectors are installed and confirmed."
            }
        };
        const resIL2 = checkStateRequirements('State', 'IL', dataComplete);
        expect(resIL2.isMatch).toBe(true);
    });

    // 4. AMC fee included in report (NV, NM, UT)
    test('Rule 4: AMC fee included for NV, NM, UT', () => {
        const dataNoAmcFee = {
            CERTIFICATION: { "Appraiser's Fee": "$500" }
        };
        const resNV = checkStateRequirements('State', 'NV', dataNoAmcFee);
        expect(resNV.isError).toBe(true);
        expect(resNV.message).toContain("AMC Fee");

        const dataWithAmcFee = {
            CERTIFICATION: { "Appraiser's Fee": "$500", "AMC Fee": "$150" }
        };
        const resNV2 = checkStateRequirements('State', 'NV', dataWithAmcFee);
        expect(resNV2.isMatch).toBe(true);
    });

    // 5 & 6. California: Smoke/CO detector + double-strapped water heater
    test('Rule 5 & 6: California smoke/CO detector and water heater double-strapping', () => {
        const dataIncomplete = {};
        const resCA = checkStateRequirements('State', 'CA', dataIncomplete);
        expect(resCA.isError).toBe(true);
        expect(resCA.message).toContain("Smoke/CO detector");
        expect(resCA.message).toContain("Water heater double-strapped");

        const dataCAComplete = {
            SUBJECT: {
                "Smoke detector comment": "Smoke and carbon monoxide detectors present in compliance with health and safety code.",
                "Water heater double-strapped comment": "Water heater is double-strapped in compliance with state code."
            }
        };
        const resCA2 = checkStateRequirements('State', 'CA', dataCAComplete);
        expect(resCA2.isMatch).toBe(true);
    });

    // 6. Utah: Water heater double-strapping addressed for Averra Financial LLC
    test('Rule 6: Utah requires double-strapping only for Averra Financial LLC', () => {
        const dataGeneralLender = {
            CERTIFICATION: { "Appraiser's Fee": "$550", "AMC Fee": "$125" },
            SUBJECT: { "Lender/Client": "First National Bank" }
        };
        const resUT1 = checkStateRequirements('State', 'UT', dataGeneralLender);
        expect(resUT1.isMatch).toBe(true);

        const dataAverraLender = {
            CERTIFICATION: { "Appraiser's Fee": "$550", "AMC Fee": "$125" },
            SUBJECT: { "Lender/Client": "Averra Financial LLC" }
        };
        const resUT2 = checkStateRequirements('State', 'UT', dataAverraLender);
        expect(resUT2.isError).toBe(true);
        expect(resUT2.message).toContain("Averra Financial LLC");

        const dataAverraWithStrapping = {
            CERTIFICATION: { "Appraiser's Fee": "$550", "AMC Fee": "$125" },
            SUBJECT: { "Lender/Client": "Averra Financial LLC" },
            IMPROVEMENTS: { "Water heater double-strapped comment": "Water heater double strapped" }
        };
        const resUT3 = checkStateRequirements('State', 'UT', dataAverraWithStrapping);
        expect(resUT3.isMatch).toBe(true);
    });

    // 8. Invoice attached (NY except Plaza Home Mortgage; WI)
    test('Rule 8: Invoice attached for WI and NY (with Plaza Home exception)', () => {
        const dataNoInvoice = { SUBJECT: { "Lender/Client": "Standard Mortgage" } };
        expect(checkStateRequirements('State', 'WI', dataNoInvoice).isError).toBe(true);
        expect(checkStateRequirements('State', 'NY', dataNoInvoice).isError).toBe(true);

        // NY with Plaza Home Mortgage exception
        const dataPlaza = { SUBJECT: { "Lender/Client": "Plaza Home Mortgage, Inc." } };
        expect(checkStateRequirements('State', 'NY', dataPlaza).isMatch).toBe(true);

        // With invoice attached
        const dataWithInv = {
            INVOICE: { "Invoice Total": "$500" },
            SUBJECT: { "Lender/Client": "Standard Mortgage" }
        };
        expect(checkStateRequirements('State', 'WI', dataWithInv).isMatch).toBe(true);
        expect(checkStateRequirements('State', 'NY', dataWithInv).isMatch).toBe(true);
    });

    // 9. Oklahoma: Invoice included or omitted without rejection
    test('Rule 9: Oklahoma passes regardless of invoice', () => {
        const resOK = checkStateRequirements('State', 'OK', {});
        expect(resOK.isMatch).toBe(true);
        expect(resOK.message).toContain("Invoice included or omitted without rejection");
    });

    // 10. Philadelphia report escalation (PA)
    test('Rule 10: Philadelphia report escalation for PA', () => {
        // Outside Philly
        const dataPittsburgh = {
            SUBJECT: { City: "Pittsburgh", County: "Allegheny" },
            RECONCILIATION: { "Appraised Value": "$500,000" },
            CONTRACT: { "Contract Price": "$300,000" }
        };
        expect(checkStateRequirements('State', 'PA', dataPittsburgh).isMatch).toBe(true);

        // Inside Philly with high value on 1004 form -> Escalate
        const dataPhillyHigh = {
            SUBJECT: { City: "Philadelphia", County: "Philadelphia", "Form Type": "1004" },
            RECONCILIATION: { "Appraised Value": "$500,000" },
            CONTRACT: { "Contract Price": "$350,000" }
        };
        const resPhilly = checkStateRequirements('State', 'PA', dataPhillyHigh);
        expect(resPhilly.isError).toBe(true);
        expect(resPhilly.message).toContain("Philadelphia escalation");

        // Inside Philly on 1004D -> No escalation
        const dataPhilly1004D = {
            ...dataPhillyHigh,
            formType: "1004D"
        };
        expect(checkStateRequirements('State', 'PA', dataPhilly1004D).isMatch).toBe(true);
    });

    // 11. Smoke/CO detector installation confirmed (VA)
    test('Rule 11: Virginia requires Appraiser Fee + Smoke/CO detector confirmation', () => {
        const dataNoCo = {
            CERTIFICATION: { "Appraiser's Fee": "$500" }
        };
        const resVA = checkStateRequirements('State', 'VA', dataNoCo);
        expect(resVA.isError).toBe(true);
        expect(resVA.message).toContain("Smoke and CO detector");

        const dataVAComplete = {
            CERTIFICATION: { "Appraiser's Fee": "$500" },
            SUBJECT: { "Smoke detector comment": "Smoke detectors and CO detectors verified installed." }
        };
        const resVA2 = checkStateRequirements('State', 'VA', dataVAComplete);
        expect(resVA2.isMatch).toBe(true);
    });
});
