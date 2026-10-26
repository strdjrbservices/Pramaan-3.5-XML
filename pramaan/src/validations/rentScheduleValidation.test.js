import {
    checkLeaseDates,
    checkSubjectMonthlyRental,
    checkSubjectUtilities,
    checkSubjectFurniture,
    checkSubjectAdjustedMonthlyRent,
    parseMMDDYYYY,
    parseRentalAmount,
    getSubjectRentFieldVal,
    getSubjectOccupant,
    is1007Active,
    isNA,
    isBlankOrNA
} from './rentScheduleValidation';
import { checkOccupancy } from './subjectValidation';

describe('1007 Rental Grid & Occupant Validation Tests', () => {
    describe('Form Type 1004 strictly (standalone Form 1004 without 1007)', () => {
        test('Only validates Occupant is Owner, Tenant, or Vacant without requiring 1007 rental grid', () => {
            const dataOwner = { formType: '1004', Occupant: 'Owner' };
            const resOwner = checkOccupancy('Occupant', 'Owner', dataOwner);
            expect(resOwner.isMatch).toBe(true);

            const dataTenant = { formType: '1004', Occupant: 'Tenant' };
            const resTenant = checkOccupancy('Occupant', 'Tenant', dataTenant);
            expect(resTenant.isMatch).toBe(true);

            const dataVacant = { formType: '1004', Occupant: 'Vacant' };
            const resVacant = checkOccupancy('Occupant', 'Vacant', dataVacant);
            expect(resVacant.isMatch).toBe(true);
        });

        test('Shows error on Form 1004 only when Occupant is not Owner, Tenant, or Vacant', () => {
            const dataInvalid = { formType: '1004', Occupant: 'Unknown' };
            const resInvalid = checkOccupancy('Occupant', 'Unknown', dataInvalid);
            expect(resInvalid.isError).toBe(true);
            expect(resInvalid.message).toContain("Expected one of: Owner, Tenant, Vacant");
        });

        test('Rental grid validations do not trigger on Form 1004', () => {
            const data1004 = {
                formType: '1004',
                Occupant: 'Tenant',
                'Single Family Rent Schedule': {
                    'Date Lease Begins': '',
                    'Date Lease Expires': ''
                }
            };

            const resDates = checkLeaseDates('Date Lease Begins', '', data1004, ['Subject', 'Date Lease Begins'], 'Subject');
            expect(resDates).toBeNull();

            const resRent = checkSubjectMonthlyRental('Monthly Rental', '', data1004, ['Subject', 'Monthly Rental'], 'Subject');
            expect(resRent).toBeNull();

            const resOcc = checkOccupancy('Occupant', 'Tenant', data1004);
            expect(resOcc.isMatch).toBe(true);
        });
    });

    describe('Form Type 1004 + 1007', () => {
        describe('Occupant is Owner or Vacant', () => {
            test('Date Lease Begins and Expires should be blank or N/A when Occupant is Owner', () => {
                const allData = {
                    formType: '1004 + 1007',
                    Occupant: 'Owner',
                    'Single Family Rent Schedule': {
                        'Date Lease Begins': '08/01/2026',
                        'Date Lease Expires': '08/01/2027'
                    }
                };

                const resBegins = checkLeaseDates('Date Lease Begins', '08/01/2026', allData, ['Subject', 'Date Lease Begins'], 'Subject');
                expect(resBegins.isError).toBe(true);
                expect(resBegins.message).toContain("must be blank or N/A when Occupant is Owner");

                const resExpires = checkLeaseDates('Date Lease Expires', '08/01/2027', allData, ['Subject', 'Date Lease Expires'], 'Subject');
                expect(resExpires.isError).toBe(true);
                expect(resExpires.message).toContain("must be blank or N/A when Occupant is Owner");

                const resOcc = checkOccupancy('Occupant', 'Owner', allData);
                expect(resOcc.isError).toBe(true);
                expect(resOcc.message).toContain("lease dates are present in Rental Grid. Lease start and end dates must be blank");
            });

            test('Date Lease Begins and Expires should be blank or N/A when Occupant is Vacant', () => {
                const allData = {
                    formType: '1004 + 1007',
                    Occupant: 'Vacant',
                    'Single Family Rent Schedule': {
                        'Date Lease Begins': '05/01/2026'
                    }
                };

                const resBegins = checkLeaseDates('Date Lease Begins', '05/01/2026', allData, ['Subject', 'Date Lease Begins'], 'Subject');
                expect(resBegins.isError).toBe(true);
                expect(resBegins.message).toContain("must be blank or N/A when Occupant is Vacant");

                const resOcc = checkOccupancy('Occupant', 'Vacant', allData);
                expect(resOcc.isError).toBe(true);
                expect(resOcc.message).toContain("lease dates are present in Rental Grid. Lease start and end dates must be blank");
            });

            test('Passes when Occupant is Owner/Vacant and lease dates are blank', () => {
                const allData = {
                    formType: '1004 + 1007',
                    Occupant: 'Owner',
                    'Single Family Rent Schedule': {
                        'Date Lease Begins': '',
                        'Date Lease Expires': ''
                    }
                };

                const resBegins = checkLeaseDates('Date Lease Begins', '', allData, ['Subject', 'Date Lease Begins'], 'Subject');
                expect(resBegins).toBeNull();

                const resExpires = checkLeaseDates('Date Lease Expires', '', allData, ['Subject', 'Date Lease Expires'], 'Subject');
                expect(resExpires).toBeNull();

                const resOcc = checkOccupancy('Occupant', 'Owner', allData);
                expect(resOcc.isMatch).toBe(true);
            });

            test('Passes when Occupant is Owner and lease dates are N/A', () => {
                const allData = {
                    formType: '1004 + 1007',
                    Occupant: 'Owner',
                    'Single Family Rent Schedule': {
                        'Date Lease Begins': 'N/A',
                        'Date Lease Expires': 'N/A'
                    }
                };

                const resBegins = checkLeaseDates('Date Lease Begins', 'N/A', allData, ['Subject', 'Date Lease Begins'], 'Subject');
                expect(resBegins.isMatch).toBe(true);

                const resExpires = checkLeaseDates('Date Lease Expires', 'N/A', allData, ['Subject', 'Date Lease Expires'], 'Subject');
                expect(resExpires.isMatch).toBe(true);

                const resOcc = checkOccupancy('Occupant', 'Owner', allData);
                expect(resOcc.isMatch).toBe(true);
            });

            test('Passes when Occupant is Vacant and lease dates are N/A (lowercase n/a / na)', () => {
                const allData = {
                    formType: '1004 + 1007',
                    Occupant: 'Vacant',
                    'Single Family Rent Schedule': {
                        'Date Lease Begins': 'N/A',
                        'Date Lease Expires': 'n/a'
                    }
                };

                const resBegins = checkLeaseDates('Date Lease Begins', 'N/A', allData, ['Subject', 'Date Lease Begins'], 'Subject');
                expect(resBegins.isMatch).toBe(true);

                const resExpires = checkLeaseDates('Date Lease Expires', 'n/a', allData, ['Subject', 'Date Lease Expires'], 'Subject');
                expect(resExpires.isMatch).toBe(true);

                const resOcc = checkOccupancy('Occupant', 'Vacant', allData);
                expect(resOcc.isMatch).toBe(true);
            });
        });

        describe('Occupant is Tenant', () => {
            test('Errors when lease start and end dates are missing in rental grid', () => {
                const allData = {
                    formType: '1004 + 1007',
                    Occupant: 'Tenant',
                    'Single Family Rent Schedule': {
                        'Date Lease Begins': '',
                        'Date Lease Expires': ''
                    }
                };

                const resBegins = checkLeaseDates('Date Lease Begins', '', allData, ['Subject', 'Date Lease Begins'], 'Subject');
                expect(resBegins.isError).toBe(true);
                expect(resBegins.message).toContain("'Date Lease Begins' must be present when Occupant is Tenant");

                const resExpires = checkLeaseDates('Date Lease Expires', '', allData, ['Subject', 'Date Lease Expires'], 'Subject');
                expect(resExpires.isError).toBe(true);
                expect(resExpires.message).toContain("'Date Lease Expires' must be present when Occupant is Tenant");

                const resOcc = checkOccupancy('Occupant', 'Tenant', allData);
                expect(resOcc.isError).toBe(true);
                expect(resOcc.message).toContain("lease start and end dates must be present in Rental Grid");
            });

            test('Logical check: Date Lease Expires must be greater than Date Lease Begins', () => {
                const futureYear = new Date().getFullYear() + 2;
                const pastYear = futureYear - 1;
                const allData = {
                    formType: '1004 + 1007',
                    Occupant: 'Tenant',
                    'Single Family Rent Schedule': {
                        'Date Lease Begins': `08/01/${futureYear}`,
                        'Date Lease Expires': `08/01/${pastYear}`
                    }
                };

                const resBegins = checkLeaseDates('Date Lease Begins', `08/01/${futureYear}`, allData, ['Subject', 'Date Lease Begins'], 'Subject');
                expect(resBegins.isError).toBe(true);
                expect(resBegins.message).toContain("must be before 'Date Lease Expires'");

                const resExpires = checkLeaseDates('Date Lease Expires', `08/01/${pastYear}`, allData, ['Subject', 'Date Lease Expires'], 'Subject');
                expect(resExpires.isError).toBe(true);
                expect(resExpires.message).toContain("must be greater than 'Date Lease Begins'");
            });

            test('Logical check: Date Lease Expires must be greater than current date', () => {
                const pastBegins = '01/01/2020';
                const pastExpires = '01/01/2021';
                const allData = {
                    formType: '1004 + 1007',
                    Occupant: 'Tenant',
                    'Single Family Rent Schedule': {
                        'Date Lease Begins': pastBegins,
                        'Date Lease Expires': pastExpires
                    }
                };

                const resExpires = checkLeaseDates('Date Lease Expires', pastExpires, allData, ['Subject', 'Date Lease Expires'], 'Subject');
                expect(resExpires.isError).toBe(true);
                expect(resExpires.message).toContain("must be greater than current date");
            });

            test('Requires Monthly Rental, Less: Utilities (zero allowed), Furniture (zero allowed), and Adjusted Monthly Rent', () => {
                const futureYear = new Date().getFullYear() + 1;
                const allDataMissingAmounts = {
                    formType: '1004 + 1007',
                    Occupant: 'Tenant',
                    'Single Family Rent Schedule': {
                        'Date Lease Begins': `01/01/${futureYear}`,
                        'Date Lease Expires': `01/01/${futureYear + 1}`,
                        'Monthly Rental': '',
                        'Less: Utilities': '',
                        'Furniture': '',
                        'Adjusted Monthly Rent': ''
                    }
                };

                const resRent = checkSubjectMonthlyRental('Monthly Rental', '', allDataMissingAmounts, ['Subject', 'Monthly Rental'], 'Subject');
                expect(resRent.isError).toBe(true);
                expect(resRent.message).toContain("'Monthly Rental' must be present when Occupant is Tenant");

                const resUtils = checkSubjectUtilities('Less: Utilities', '', allDataMissingAmounts, ['Subject', 'Less: Utilities'], 'Subject');
                expect(resUtils.isError).toBe(true);
                expect(resUtils.message).toContain("'Less: Utilities' must be present when Occupant is Tenant (zero allowed)");

                const resFurn = checkSubjectFurniture('Furniture', '', allDataMissingAmounts, ['Subject', 'Furniture'], 'Subject');
                expect(resFurn.isError).toBe(true);
                expect(resFurn.message).toContain("'Furniture' must be present when Occupant is Tenant (zero allowed)");

                const resAdj = checkSubjectAdjustedMonthlyRent('Adjusted Monthly Rent', '', allDataMissingAmounts, ['Subject', 'Adjusted Monthly Rent'], 'Subject');
                expect(resAdj.isError).toBe(true);
                expect(resAdj.message).toContain("'Adjusted Monthly Rent' must be present when Occupant is Tenant");

                const resOcc = checkOccupancy('Occupant', 'Tenant', allDataMissingAmounts);
                expect(resOcc.isError).toBe(true);
                expect(resOcc.message).toContain("Rental Grid is missing: Monthly Rental, Less: Utilities (zero allowed), Furniture (zero allowed), Adjusted Monthly Rent");
            });

            test('Passes with valid dates, rents, and zero utilities & furniture', () => {
                const futureYear = new Date().getFullYear() + 1;
                const allDataValid = {
                    formType: '1004 + 1007',
                    Occupant: 'Tenant',
                    'Single Family Rent Schedule': {
                        'Date Lease Begins': `08/01/${futureYear}`,
                        'Date Lease Expires': `08/01/${futureYear + 1}`,
                        'Monthly Rental': '1,295',
                        'Less: Utilities': '0',
                        'Furniture': '0',
                        'Adjusted Monthly Rent': '1,295'
                    }
                };

                const resBegins = checkLeaseDates('Date Lease Begins', `08/01/${futureYear}`, allDataValid, ['Subject', 'Date Lease Begins'], 'Subject');
                expect(resBegins.isMatch).toBe(true);

                const resExpires = checkLeaseDates('Date Lease Expires', `08/01/${futureYear + 1}`, allDataValid, ['Subject', 'Date Lease Expires'], 'Subject');
                expect(resExpires.isMatch).toBe(true);

                const resRent = checkSubjectMonthlyRental('Monthly Rental', '1,295', allDataValid, ['Subject', 'Monthly Rental'], 'Subject');
                expect(resRent.isMatch).toBe(true);

                const resUtils = checkSubjectUtilities('Less: Utilities', '0', allDataValid, ['Subject', 'Less: Utilities'], 'Subject');
                expect(resUtils.isMatch).toBe(true);

                const resFurn = checkSubjectFurniture('Furniture', '0', allDataValid, ['Subject', 'Furniture'], 'Subject');
                expect(resFurn.isMatch).toBe(true);

                const resAdj = checkSubjectAdjustedMonthlyRent('Adjusted Monthly Rent', '1,295', allDataValid, ['Subject', 'Adjusted Monthly Rent'], 'Subject');
                expect(resAdj.isMatch).toBe(true);

                const resOcc = checkOccupancy('Occupant', 'Tenant', allDataValid);
                expect(resOcc.isMatch).toBe(true);
            });
        });

        describe('Vice-Versa: Dates present but Occupant is blank', () => {
            test('Errors when lease dates are present in rental grid but Occupant is blank', () => {
                const futureYear = new Date().getFullYear() + 1;
                const allData = {
                    formType: '1004 + 1007',
                    Occupant: '',
                    'Single Family Rent Schedule': {
                        'Date Lease Begins': `08/01/${futureYear}`,
                        'Date Lease Expires': `08/01/${futureYear + 1}`
                    }
                };

                const resBegins = checkLeaseDates('Date Lease Begins', `08/01/${futureYear}`, allData, ['Subject', 'Date Lease Begins'], 'Subject');
                expect(resBegins.isError).toBe(true);
                expect(resBegins.message).toContain("must be 'Tenant'");
            });
        });
    });
});
