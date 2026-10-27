import {
    checkLeaseDates,
    checkSubjectMonthlyRental,
    checkSubjectUtilities,
    checkSubjectFurniture,
    checkSubjectAdjustedMonthlyRent,
    checkRentSubjectDesignStyleConsistency,
    checkRentDesignAppealAdjustment,
    checkRentSubjectLocationViewConsistency,
    checkRentLocationViewAdjustment,
    checkRentSubjectAgeConsistency,
    checkRentAgeAdjustment,
    checkRentSubjectConditionConsistency,
    checkRentConditionAdjustment,
    checkRentSubjectRoomCountConsistency,
    checkRentRoomCountAdjustment,
    checkRentSubjectGrossLivingAreaConsistency,
    checkRentGrossLivingAreaAdjustment,
    checkRentSubjectOtherConsistency,
    checkRentOtherAdjustment,
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

        describe('1004+1007 Rental Grid: Design & Appeal vs Improvements Design (Style)', () => {
            const mockData = (rentDesign, impDesign) => ({
                formType: '1004 + 1007',
                'Single Family Rent Schedule': {
                    'Design and Appeal': rentDesign
                },
                IMPROVEMENTS: {
                    'Design (Style)': impDesign
                }
            });

            test('matches when Rental Grid Subject "Design and Appeal" matches Improvements "Design (Style)"', () => {
                const allData = mockData('R Ranch', 'R Ranch');
                const res = checkRentSubjectDesignStyleConsistency(
                    'Design and Appeal',
                    'R Ranch',
                    allData,
                    ['Subject', 'Design and Appeal'],
                    'Subject',
                    '1004 + 1007'
                );
                expect(res).toEqual({ isMatch: true, message: 'validated' });
            });

            test('matches when Improvements is "DT1;R Ranch" and Rental Grid is "R Ranch"', () => {
                const allData = mockData('R Ranch', 'DT1;R Ranch');
                const res = checkRentSubjectDesignStyleConsistency(
                    'Design and Appeal',
                    'R Ranch',
                    allData,
                    ['Subject', 'Design and Appeal'],
                    'Subject',
                    '1004 + 1007'
                );
                expect(res).toEqual({ isMatch: true, message: 'validated' });
            });

            test('matches abbreviations (Raised Ranch vs R Ranch)', () => {
                const allData = mockData('Raised Ranch', 'DT1;R Ranch');
                const res = checkRentSubjectDesignStyleConsistency(
                    'Design and Appeal',
                    'Raised Ranch',
                    allData,
                    ['Subject', 'Design and Appeal'],
                    'Subject',
                    '1004 + 1007'
                );
                expect(res).toEqual({ isMatch: true, message: 'validated' });
            });

            test('returns error when Rental Grid is "Colonial" but Improvements is "R Ranch"', () => {
                const allData = mockData('Colonial', 'R Ranch');
                const res = checkRentSubjectDesignStyleConsistency(
                    'Design and Appeal',
                    'Colonial',
                    allData,
                    ['Subject', 'Design and Appeal'],
                    'Subject',
                    '1004 + 1007'
                );
                expect(res).toEqual({
                    isError: true,
                    skipBlankFilter: true,
                    message: "Design mismatch: Improvements section indicates 'R Ranch', but Rental Grid (Subject) indicates 'Colonial'. Please reconcile and revise."
                });
            });

            test('does not run on non-1007 form types', () => {
                const allData = {
                    formType: '1004',
                    'Single Family Rent Schedule': { 'Design and Appeal': 'Colonial' },
                    IMPROVEMENTS: { 'Design (Style)': 'R Ranch' }
                };
                const res = checkRentSubjectDesignStyleConsistency(
                    'Design and Appeal',
                    'Colonial',
                    allData,
                    ['Subject', 'Design and Appeal'],
                    'Subject',
                    '1004'
                );
                expect(res).toBeNull();
            });
        });

        describe('1004+1007 Rental Grid: Comparable Design and Appeal Adjustment', () => {
            const mockRentCompData = (subjectDesign, compDesign, adjustment) => ({
                formType: '1004 + 1007',
                'Single Family Rent Schedule': {
                    'Design and Appeal': subjectDesign
                },
                'COMPARABLE NO. 1': {
                    'Design and Appeal': compDesign,
                    'Design and Appeal Adjustment': adjustment
                }
            });

            test('matches when comp design is identical to subject with no adjustment', () => {
                const allData = mockRentCompData('R Ranch', 'R Ranch', '');
                const res = checkRentDesignAppealAdjustment(
                    'Design and Appeal',
                    'R Ranch',
                    allData,
                    ['COMPARABLE NO. 1', 'Design and Appeal'],
                    'COMPARABLE NO. 1'
                );
                expect(res).toEqual({ isMatch: true });
            });

            test('matches when comp design is different and adjustment is provided', () => {
                const allData = mockRentCompData('R Ranch', 'Colonial', '100');
                const res = checkRentDesignAppealAdjustment(
                    'Design and Appeal',
                    'Colonial',
                    allData,
                    ['COMPARABLE NO. 1', 'Design and Appeal'],
                    'COMPARABLE NO. 1'
                );
                expect(res).toEqual({ isMatch: true });
            });

            test('returns error when comp design is different but adjustment is missing', () => {
                const allData = mockRentCompData('R Ranch', 'Colonial', '');
                const res = checkRentDesignAppealAdjustment(
                    'Design and Appeal',
                    'Colonial',
                    allData,
                    ['COMPARABLE NO. 1', 'Design and Appeal'],
                    'COMPARABLE NO. 1'
                );
                expect(res).toEqual({
                    isError: true,
                    message: "Design/Appeal mismatch (Subject: 'R Ranch', Comp: 'Colonial'). An adjustment is required, even if $0."
                });
            });

            test('returns null when checking Subject', () => {
                const allData = mockRentCompData('R Ranch', 'Colonial', '');
                const res = checkRentDesignAppealAdjustment(
                    'Design and Appeal',
                    'R Ranch',
                    allData,
                    ['Subject', 'Design and Appeal'],
                    'Subject'
                );
                expect(res).toBeNull();
            });
        });

        describe('Location/View Validations', () => {
            test('returns isMatch: true when Subject Location/View matches Sales Grid Location and View', () => {
                const allData = {
                    formType: '1004 + 1007',
                    SALES_GRID: {
                        Subject: {
                            'Location': 'N;OpnAr;BsyRd',
                            'View': 'N;Res;Mtn'
                        }
                    },
                    Subject: {
                        'Location/View': 'N;OpnAr;BsyRd\nN;Res;Mtn'
                    }
                };
                const res = checkRentSubjectLocationViewConsistency(
                    'Location/View',
                    'N;OpnAr;BsyRd\nN;Res;Mtn',
                    allData,
                    ['Subject', 'Location/View'],
                    'Subject'
                );
                expect(res).toEqual({ isMatch: true, message: 'validated' });
            });

            test('returns isError: true when Subject Location/View contradicts Sales Grid', () => {
                const allData = {
                    formType: '1004 + 1007',
                    SALES_GRID: {
                        Subject: {
                            'Location': 'N;OpnAr;BsyRd',
                            'View': 'N;Res;Mtn'
                        }
                    },
                    Subject: {
                        'Location/View': 'B;Comm;Pkwy\nB;Ind;'
                    }
                };
                const res = checkRentSubjectLocationViewConsistency(
                    'Location/View',
                    'B;Comm;Pkwy\nB;Ind;',
                    allData,
                    ['Subject', 'Location/View'],
                    'Subject'
                );
                expect(res.isError).toBe(true);
                expect(res.message).toContain('Location/View mismatch');
            });

            test('requires adjustment when comp Location/View differs from Subject', () => {
                const allData = {
                    Subject: { 'Location/View': 'N;OpnAr;BsyRd' },
                    'COMPARABLE NO. 1': {
                        'Location/View': 'B;Comm;Pkwy',
                        'Location/View Adjustment': ''
                    }
                };
                const res = checkRentLocationViewAdjustment(
                    'Location/View',
                    'B;Comm;Pkwy',
                    allData,
                    ['COMPARABLE NO. 1', 'Location/View'],
                    'COMPARABLE NO. 1'
                );
                expect(res.isError).toBe(true);
                expect(res.message).toContain('An adjustment is required');
            });
        });

        describe('Age & Condition Validations', () => {
            test('returns isMatch: true when Subject Age matches Sales Grid Subject Actual Age', () => {
                const allData = {
                    formType: '1004 + 1007',
                    SALES_GRID: { Subject: { 'Actual Age': '24' } },
                    Subject: { 'Age': '24' }
                };
                const res = checkRentSubjectAgeConsistency('Age', '24', allData, ['Subject', 'Age'], 'Subject');
                expect(res).toEqual({ isMatch: true, message: 'validated' });
            });

            test('returns isError: true when Subject Age mismatches Sales Grid Subject Actual Age', () => {
                const allData = {
                    formType: '1004 + 1007',
                    SALES_GRID: { Subject: { 'Actual Age': '24' } },
                    Subject: { 'Age': '30' }
                };
                const res = checkRentSubjectAgeConsistency('Age', '30', allData, ['Subject', 'Age'], 'Subject');
                expect(res.isError).toBe(true);
                expect(res.message).toContain('Subject Age (30) in Rental Grid does not match Sales Grid Subject Actual Age (24)');
            });

            test('returns isMatch: true when Subject Condition matches Sales Grid Condition C4', () => {
                const allData = {
                    formType: '1004 + 1007',
                    SALES_GRID: { Subject: { 'Condition': 'C4' } },
                    Subject: { 'Condition': 'C4' }
                };
                const res = checkRentSubjectConditionConsistency('Condition', 'C4', allData, ['Subject', 'Condition'], 'Subject');
                expect(res).toEqual({ isMatch: true, message: 'validated' });
            });

            test('returns isError: true when Subject Condition differs from Sales Grid Condition', () => {
                const allData = {
                    formType: '1004 + 1007',
                    SALES_GRID: { Subject: { 'Condition': 'C4' } },
                    Subject: { 'Condition': 'C2' }
                };
                const res = checkRentSubjectConditionConsistency('Condition', 'C2', allData, ['Subject', 'Condition'], 'Subject');
                expect(res.isError).toBe(true);
                expect(res.message).toContain('Condition mismatch');
            });
        });

        describe('Above Grade Room Count Validations', () => {
            test('returns isMatch: true for matching Total, Bdrms, and Baths', () => {
                const allData = {
                    formType: '1004 + 1007',
                    SALES_GRID: {
                        Subject: {
                            'Total': '8',
                            'Bedrooms': '3',
                            'Baths': '2.0'
                        }
                    },
                    Subject: {
                        'Room Count Total': '8',
                        'Room Count Bdrms': '3',
                        'Room Count Baths': '2.0'
                    }
                };
                const resTotal = checkRentSubjectRoomCountConsistency('Room Count Total', '8', allData, ['Subject', 'Room Count Total'], 'Subject');
                expect(resTotal).toEqual({ isMatch: true, message: 'validated' });

                const resBdrms = checkRentSubjectRoomCountConsistency('Room Count Bdrms', '3', allData, ['Subject', 'Room Count Bdrms'], 'Subject');
                expect(resBdrms).toEqual({ isMatch: true, message: 'validated' });

                const resBaths = checkRentSubjectRoomCountConsistency('Room Count Baths', '2.0', allData, ['Subject', 'Room Count Baths'], 'Subject');
                expect(resBaths).toEqual({ isMatch: true, message: 'validated' });
            });

            test('returns isError: true when bedroom count does not match Sales Grid / Improvements', () => {
                const allData = {
                    formType: '1004 + 1007',
                    SALES_GRID: { Subject: { 'Bedrooms': '3' } },
                    Subject: { 'Room Count Bdrms': '4' }
                };
                const res = checkRentSubjectRoomCountConsistency('Room Count Bdrms', '4', allData, ['Subject', 'Room Count Bdrms'], 'Subject');
                expect(res.isError).toBe(true);
                expect(res.message).toContain('Bedroom count mismatch');
            });
        });

        describe('Gross Living Area Validations', () => {
            test('returns isMatch: true when GLA matches 1,939 Sq. Ft.', () => {
                const allData = {
                    formType: '1004 + 1007',
                    SALES_GRID: { Subject: { 'Gross Living Area': '1,939' } },
                    Subject: { 'Gross Living Area': '1,939' }
                };
                const res = checkRentSubjectGrossLivingAreaConsistency('Gross Living Area', '1,939', allData, ['Subject', 'Gross Living Area'], 'Subject');
                expect(res).toEqual({ isMatch: true, message: 'validated' });
            });

            test('returns isError: true when GLA mismatches', () => {
                const allData = {
                    formType: '1004 + 1007',
                    SALES_GRID: { Subject: { 'Gross Living Area': '1,939' } },
                    Subject: { 'Gross Living Area': '2,100' }
                };
                const res = checkRentSubjectGrossLivingAreaConsistency('Gross Living Area', '2,100', allData, ['Subject', 'Gross Living Area'], 'Subject');
                expect(res.isError).toBe(true);
                expect(res.message).toContain('GLA mismatch');
            });

            test('validates comp GLA adjustment directionality', () => {
                const allData = {
                    Subject: { 'Gross Living Area': '1,939' },
                    'COMPARABLE NO. 1': {
                        'Gross Living Area': '2,200',
                        'Gross Living Area Adjustment': '+5000'
                    }
                };
                const res = checkRentGrossLivingAreaAdjustment('Gross Living Area Adjustment', '+5000', allData, ['COMPARABLE NO. 1', 'Gross Living Area Adjustment'], 'COMPARABLE NO. 1');
                expect(res.isError).toBe(true);
                expect(res.message).toContain('superior to Subject (1,939), but adjustment is not negative');
            });
        });

        describe('Other: Feature Validations', () => {
            test('returns isMatch: true when Subject Other: matches or has feature', () => {
                const allData = {
                    formType: '1004 + 1007',
                    Subject: { 'Other:': "NoPool/Wall Avg Amen's" }
                };
                const res = checkRentSubjectOtherConsistency('Other:', "NoPool/Wall Avg Amen's", allData, ['Subject', 'Other:'], 'Subject');
                expect(res).toEqual({ isMatch: true, message: 'validated' });
            });

            test('requires adjustment when comp Other: feature differs from Subject', () => {
                const allData = {
                    Subject: { 'Other:': 'Pool' },
                    'COMPARABLE NO. 1': {
                        'Other:': 'No Pool',
                        'Other: Adjustment': ''
                    }
                };
                const res = checkRentOtherAdjustment('Other:', 'No Pool', allData, ['COMPARABLE NO. 1', 'Other:'], 'COMPARABLE NO. 1');
                expect(res.isError).toBe(true);
                expect(res.message).toContain('Other feature mismatch');
            });
        });
    });
});

