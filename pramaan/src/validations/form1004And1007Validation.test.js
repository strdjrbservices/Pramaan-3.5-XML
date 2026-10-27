import {
    is1004And1007Form,
    normalizeDate,
    parseCurrencyOrNumber,
    checkRentScheduleAsOfDateConsistency,
    checkRentScheduleToBeAmountConsistency,
    checkIncomeApproachIndicatedValueConsistency,
    checkCostApproachMatchConsistency
} from './form1004And1007Validation';
import { checkCostApproachDeveloped } from './reconciliationValidation';

describe('Form Type 1004 + 1007 Validations', () => {
    describe('is1004And1007Form detector', () => {
        test('Detects 1004 + 1007 correctly', () => {
            expect(is1004And1007Form({}, '1004 + 1007')).toBe(true);
            expect(is1004And1007Form({ formType: '1004 + 1007' })).toBe(true);
            expect(is1004And1007Form({ selectedFormType: '1004 + 1007' })).toBe(true);
            expect(is1004And1007Form({ 'Form Type': '1004 + 1007' })).toBe(true);
            expect(is1004And1007Form({ 'From Type': '1004 + 1007' })).toBe(true);
            expect(is1004And1007Form({ formType: '1004+1007' })).toBe(true);
            expect(is1004And1007Form({ formType: '1004 and 1007' })).toBe(true);
        });

        test('Returns false for standalone forms or other combos', () => {
            expect(is1004And1007Form({}, '1004')).toBe(false);
            expect(is1004And1007Form({ formType: '1004' })).toBe(false);
            expect(is1004And1007Form({ formType: '1007' })).toBe(false);
            expect(is1004And1007Form({ formType: '1073 + 1007' })).toBe(false);
            expect(is1004And1007Form({ formType: '1025 + 1007' })).toBe(false);
            expect(is1004And1007Form(null)).toBe(false);
        });
    });

    describe('normalizeDate utility', () => {
        test('Normalizes various date formats to consistent M/D/YYYY', () => {
            expect(normalizeDate('08/01/2026')).toBe('8/1/2026');
            expect(normalizeDate('8/1/2026')).toBe('8/1/2026');
            expect(normalizeDate('08-01-2026')).toBe('8/1/2026');
            expect(normalizeDate('2026-08-01')).toBe('8/1/2026');
            expect(normalizeDate('')).toBe('');
            expect(normalizeDate(null)).toBe('');
        });
    });

    describe('parseCurrencyOrNumber utility', () => {
        test('Parses strings with $, commas, decimals to numbers', () => {
            expect(parseCurrencyOrNumber('$2,500')).toBe(2500);
            expect(parseCurrencyOrNumber('2,500.00')).toBe(2500);
            expect(parseCurrencyOrNumber('350000')).toBe(350000);
            expect(parseCurrencyOrNumber('$350,000.50')).toBe(350000.5);
            expect(parseCurrencyOrNumber('')).toBeNull();
            expect(parseCurrencyOrNumber(null)).toBeNull();
        });
    });

    describe('Rule 1: Rent Schedule As Of Date vs RECONCILIATION As Of Date', () => {
        const non1004Data = { formType: '1004' };

        test('Does not run on non-1004+1007 form types', () => {
            const res = checkRentScheduleAsOfDateConsistency(
                'I (WE) ESTIMATE THE MONTHLY MARKET RENT OF THE SUBJECT AS OF',
                '08/01/2026',
                non1004Data
            );
            expect(res).toBeNull();
        });

        test('Passes when both dates match in 1004 + 1007 (same format)', () => {
            const allData = {
                formType: '1004 + 1007',
                'Comparable Rent Schedule Reconciliation': {
                    'I (WE) ESTIMATE THE MONTHLY MARKET RENT OF THE SUBJECT AS OF': '08/01/2026'
                },
                RECONCILIATION: {
                    'as of': '08/01/2026'
                }
            };

            const resRent = checkRentScheduleAsOfDateConsistency(
                'I (WE) ESTIMATE THE MONTHLY MARKET RENT OF THE SUBJECT AS OF',
                '08/01/2026',
                allData
            );
            expect(resRent.isMatch).toBe(true);

            const resRecon = checkRentScheduleAsOfDateConsistency(
                'as of',
                '08/01/2026',
                allData,
                ['RECONCILIATION', 'as of']
            );
            expect(resRecon.isMatch).toBe(true);
        });

        test('Passes when both dates match across different formats (e.g. 08/01/2026 vs 8/1/2026 or 2026-08-01)', () => {
            const allData = {
                formType: '1004 + 1007',
                'Comparable Rent Schedule Reconciliation': {
                    'I (WE) ESTIMATE THE MONTHLY MARKET RENT OF THE SUBJECT AS OF': '2026-08-01'
                },
                RECONCILIATION: {
                    'as of': '8/1/2026'
                }
            };

            const res = checkRentScheduleAsOfDateConsistency(
                'I (WE) ESTIMATE THE MONTHLY MARKET RENT OF THE SUBJECT AS OF',
                '2026-08-01',
                allData
            );
            expect(res.isMatch).toBe(true);
        });

        test('Errors when dates mismatch', () => {
            const allData = {
                formType: '1004 + 1007',
                'Comparable Rent Schedule Reconciliation': {
                    'I (WE) ESTIMATE THE MONTHLY MARKET RENT OF THE SUBJECT AS OF': '08/01/2026'
                },
                RECONCILIATION: {
                    'as of': '08/05/2026'
                }
            };

            const res = checkRentScheduleAsOfDateConsistency(
                'I (WE) ESTIMATE THE MONTHLY MARKET RENT OF THE SUBJECT AS OF',
                '08/01/2026',
                allData
            );
            expect(res.isError).toBe(true);
            expect(res.message).toContain("Date mismatch");
        });

        test('Errors when one date is missing', () => {
            const allData = {
                formType: '1004 + 1007',
                'Comparable Rent Schedule Reconciliation': {
                    'I (WE) ESTIMATE THE MONTHLY MARKET RENT OF THE SUBJECT AS OF': '08/01/2026'
                },
                RECONCILIATION: {
                    'as of': ''
                }
            };

            const res = checkRentScheduleAsOfDateConsistency(
                'I (WE) ESTIMATE THE MONTHLY MARKET RENT OF THE SUBJECT AS OF',
                '08/01/2026',
                allData
            );
            expect(res.isError).toBe(true);
            expect(res.message).toContain("Date mismatch");
            expect(res.message).toContain("missing");
        });

        test('Errors when both dates are blank', () => {
            const allData = {
                formType: '1004 + 1007',
                'Comparable Rent Schedule Reconciliation': {
                    'I (WE) ESTIMATE THE MONTHLY MARKET RENT OF THE SUBJECT AS OF': ''
                },
                RECONCILIATION: {
                    'as of': ''
                }
            };

            const res = checkRentScheduleAsOfDateConsistency(
                'I (WE) ESTIMATE THE MONTHLY MARKET RENT OF THE SUBJECT AS OF',
                '',
                allData
            );
            expect(res.isError).toBe(true);
            expect(res.message).toContain("cannot be blank");
        });
    });

    describe('Rule 2: Rent Schedule TO BE $ vs Income Approach Estimated Monthly Market Rent $', () => {
        const non1004Data = { formType: '1004' };

        test('Does not run on non-1004+1007 form types', () => {
            const res = checkRentScheduleToBeAmountConsistency('TO BE $', '$2,500', non1004Data);
            expect(res).toBeNull();
        });

        test('Passes when both values match numerically ($2,500 vs 2500)', () => {
            const allData = {
                formType: '1004 + 1007',
                'Comparable Rent Schedule Reconciliation': {
                    'TO BE $': '$2,500'
                },
                INCOME_APPROACH: {
                    'Estimated Monthly Market Rent $': '2500'
                }
            };

            const resToBe = checkRentScheduleToBeAmountConsistency('TO BE $', '$2,500', allData);
            expect(resToBe.isMatch).toBe(true);

            const resIncome = checkRentScheduleToBeAmountConsistency(
                'Estimated Monthly Market Rent $',
                '2500',
                allData
            );
            expect(resIncome.isMatch).toBe(true);
        });

        test('Errors when amounts differ', () => {
            const allData = {
                formType: '1004 + 1007',
                'Comparable Rent Schedule Reconciliation': {
                    'TO BE $': '$2,500'
                },
                INCOME_APPROACH: {
                    'Estimated Monthly Market Rent $': '$2,400'
                }
            };

            const res = checkRentScheduleToBeAmountConsistency('TO BE $', '$2,500', allData);
            expect(res.isError).toBe(true);
            expect(res.message).toContain("Value mismatch");
            expect(res.message).toContain("$2,500");
            expect(res.message).toContain("$2,400");
        });

        test('Errors when one amount is missing', () => {
            const allData = {
                formType: '1004 + 1007',
                'Comparable Rent Schedule Reconciliation': {
                    'TO BE $': '$2,500'
                },
                INCOME_APPROACH: {
                    'Estimated Monthly Market Rent $': ''
                }
            };

            const res = checkRentScheduleToBeAmountConsistency('TO BE $', '$2,500', allData);
            expect(res.isError).toBe(true);
            expect(res.message).toContain("missing");
        });

        test('Errors when both amounts are blank', () => {
            const allData = {
                formType: '1004 + 1007',
                'Comparable Rent Schedule Reconciliation': {
                    'TO BE $': ''
                },
                INCOME_APPROACH: {
                    'Estimated Monthly Market Rent $': ''
                }
            };

            const res = checkRentScheduleToBeAmountConsistency('TO BE $', '', allData);
            expect(res.isError).toBe(true);
            expect(res.message).toContain("cannot be blank");
        });
    });

    describe('Rule 3: RECONCILIATION Income Approach (if developed) $ vs Income Approach Indicated Value', () => {
        const non1004Data = { formType: '1004' };

        test('Does not run on non-1004+1007 form types', () => {
            const res = checkIncomeApproachIndicatedValueConsistency(
                'Income Approach (if developed) $',
                '$350,000',
                non1004Data
            );
            expect(res).toBeNull();
        });

        test('Passes when both values match numerically ($350,000 vs 350000)', () => {
            const allData = {
                formType: '1004 + 1007',
                RECONCILIATION: {
                    'Income Approach (if developed) $': '$350,000'
                },
                INCOME_APPROACH: {
                    'Indicated Value by Income Approach': '350000'
                }
            };

            const resRecon = checkIncomeApproachIndicatedValueConsistency(
                'Income Approach (if developed) $',
                '$350,000',
                allData
            );
            expect(resRecon.isMatch).toBe(true);

            const resIncome = checkIncomeApproachIndicatedValueConsistency(
                'Indicated Value by Income Approach',
                '350000',
                allData
            );
            expect(resIncome.isMatch).toBe(true);
        });

        test('Errors when amounts differ', () => {
            const allData = {
                formType: '1004 + 1007',
                RECONCILIATION: {
                    'Income Approach (if developed) $': '$350,000'
                },
                INCOME_APPROACH: {
                    'Indicated Value by Income Approach': '$340,000'
                }
            };

            const res = checkIncomeApproachIndicatedValueConsistency(
                'Income Approach (if developed) $',
                '$350,000',
                allData
            );
            expect(res.isError).toBe(true);
            expect(res.message).toContain("Value mismatch");
            expect(res.message).toContain("$350,000");
            expect(res.message).toContain("$340,000");
        });

        test('Errors when one amount is missing', () => {
            const allData = {
                formType: '1004 + 1007',
                RECONCILIATION: {
                    'Income Approach (if developed) $': '$350,000'
                },
                INCOME_APPROACH: {
                    'Indicated Value by Income Approach': ''
                }
            };

            const res = checkIncomeApproachIndicatedValueConsistency(
                'Income Approach (if developed) $',
                '$350,000',
                allData
            );
            expect(res.isError).toBe(true);
            expect(res.message).toContain("missing");
        });

        test('Errors when both amounts are blank', () => {
            const allData = {
                formType: '1004 + 1007',
                RECONCILIATION: {
                    'Income Approach (if developed) $': ''
                },
                INCOME_APPROACH: {
                    'Indicated Value by Income Approach': ''
                }
            };

            const res = checkIncomeApproachIndicatedValueConsistency(
                'Income Approach (if developed) $',
                '',
                allData
            );
            expect(res.isError).toBe(true);
            expect(res.message).toContain("cannot be blank");
        });
    });

    describe('Rule 4: Cost Approach (if developed) from RECONCILIATION vs INDICATED VALUE BY COST APPROACH from Cost Approach', () => {
        test('Returns null / does not enforce match if Cost Approach (if developed) is blank', () => {
            const allData = {
                formType: '1004 + 1007',
                RECONCILIATION: {
                    'Cost Approach (if developed)': ''
                },
                COST_APPROACH: {
                    'Indicated Value By Cost Approach......................................................=$': '$300,000'
                }
            };

            const res = checkCostApproachMatchConsistency(
                'Cost Approach (if developed)',
                '',
                allData
            );
            expect(res).toBeNull();
        });

        test('Returns null if Cost Approach (if developed) is null or undefined or whitespace', () => {
            const allData = {
                formType: '1004 + 1007',
                RECONCILIATION: {
                    'Cost Approach (if developed)': '   '
                },
                COST_APPROACH: {
                    'Indicated Value By Cost Approach......................................................=$': '$300,000'
                }
            };

            const res = checkCostApproachMatchConsistency(
                'Cost Approach (if developed)',
                '   ',
                allData
            );
            expect(res).toBeNull();
        });

        test('Validates matching amounts with different currency formats', () => {
            const allData = {
                formType: '1004 + 1007',
                RECONCILIATION: {
                    'Cost Approach (if developed)': '$300,000'
                },
                COST_APPROACH: {
                    'Indicated Value By Cost Approach......................................................=$': '300000'
                }
            };

            const resRecon = checkCostApproachMatchConsistency(
                'Cost Approach (if developed)',
                '$300,000',
                allData
            );
            expect(resRecon.isMatch).toBe(true);
            expect(resRecon.message).toContain("matches");
            expect(resRecon.message).toContain("$300,000");

            const resCost = checkCostApproachMatchConsistency(
                'Indicated Value By Cost Approach......................................................=$',
                '300000',
                allData
            );
            expect(resCost.isMatch).toBe(true);
        });

        test('Errors when amounts differ', () => {
            const allData = {
                formType: '1004 + 1007',
                RECONCILIATION: {
                    'Cost Approach (if developed)': '$300,000'
                },
                COST_APPROACH: {
                    'Indicated Value By Cost Approach......................................................=$': '$280,000'
                }
            };

            const res = checkCostApproachMatchConsistency(
                'Cost Approach (if developed)',
                '$300,000',
                allData
            );
            expect(res.isError).toBe(true);
            expect(res.message).toContain("Value mismatch");
            expect(res.message).toContain("$300,000");
            expect(res.message).toContain("$280,000");

            const resCost = checkCostApproachMatchConsistency(
                'Indicated Value By Cost Approach......................................................=$',
                '$280,000',
                allData
            );
            expect(resCost.isError).toBe(true);
            expect(resCost.message).toContain("Value mismatch");
        });

        test('Errors when Cost Approach (if developed) is not blank but Cost Approach indicated value is missing', () => {
            const allData = {
                formType: '1004 + 1007',
                RECONCILIATION: {
                    'Cost Approach (if developed)': '$300,000'
                },
                COST_APPROACH: {
                    'Indicated Value By Cost Approach......................................................=$': ''
                }
            };

            const res = checkCostApproachMatchConsistency(
                'Cost Approach (if developed)',
                '$300,000',
                allData
            );
            expect(res.isError).toBe(true);
            expect(res.message).toContain("missing");
        });

        test('Works for standard Form 1004 as well', () => {
            const allData = {
                formType: '1004',
                RECONCILIATION: {
                    'Cost Approach (if developed)': '$425,000'
                },
                COST_APPROACH: {
                    'Indicated Value By Cost Approach......................................................=$': '$425,000'
                }
            };

            const res = checkCostApproachMatchConsistency(
                'Cost Approach (if developed)',
                '$425,000',
                allData
            );
            expect(res.isMatch).toBe(true);
        });

        test('checkCostApproachDeveloped integration with value matching', () => {
            const matchData = {
                formType: '1004',
                RECONCILIATION: {
                    'Cost Approach (if developed)': '$500,000'
                },
                COST_APPROACH: {
                    'Indicated Value By Cost Approach......................................................=$': '$500,000'
                }
            };

            // When matching
            const matchRes = checkCostApproachDeveloped('Cost Approach (if developed)', '$500,000', matchData);
            expect(matchRes.isMatch).toBe(true);

            // When mismatching
            const mismatchData = {
                formType: '1004',
                RECONCILIATION: {
                    'Cost Approach (if developed)': '$500,000'
                },
                COST_APPROACH: {
                    'Indicated Value By Cost Approach......................................................=$': '$450,000'
                }
            };
            const mismatchRes = checkCostApproachDeveloped('Cost Approach (if developed)', '$500,000', mismatchData);
            expect(mismatchRes.isError).toBe(true);
            expect(mismatchRes.message).toContain("Value mismatch");

            // When text is blank and Cost Approach is developed
            const blankRes = checkCostApproachDeveloped('Cost Approach (if developed)', '', matchData);
            expect(blankRes.isError).toBe(true);
            expect(blankRes.message).toContain("Cost Approach is developed, so this field cannot be blank.");

            // When text is blank and Cost Approach is also blank
            const bothBlankData = {
                COST_APPROACH: {
                    'Indicated Value By Cost Approach......................................................=$': ''
                }
            };
            const bothBlankRes = checkCostApproachDeveloped('Cost Approach (if developed)', '', bothBlankData);
            expect(bothBlankRes.isMatch).toBe(true);
        });
    });
});

