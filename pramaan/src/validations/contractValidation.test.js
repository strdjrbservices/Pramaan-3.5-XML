import { checkContractFieldsMandatory, getAssignmentType } from './contractValidation';
import { checkAssignmentTypeConsistency } from './subjectValidation';

describe('Contract & Assignment Type Validation Tests', () => {
    const fields = [
        "I did did not analyze the contract for sale for the subject purchase transaction. Explain the results of the analysis of the contract for sale or why the analysis was not performed.",
        "Contract Price $",
        "Date of Contract",
        "Is property seller owner of public record?",
        "Data Source(s)",
        "Is there any financial assistance (loan charges, sale concessions, gift or downpayment assistance, etc.) to be paid by any party on behalf of the borrower?",
        "If Yes, report the total dollar amount and describe the items to be paid"
    ];

    describe('Assignment Type == Purchase Transaction', () => {
        test('Errors when contract fields are empty', () => {
            const data = { 'Assignment Type': 'Purchase Transaction', CONTRACT: {} };
            const res = checkContractFieldsMandatory(fields[0], '', data, ['CONTRACT', fields[0]]);
            expect(res.isError).toBe(true);
            expect(res.message).toContain("This field is required when Assignment Type is 'Purchase Transaction'");
        });

        test('Passes when contract fields are filled', () => {
            const data = {
                'Assignment Type': 'Purchase Transaction',
                CONTRACT: {
                    [fields[0]]: 'Did analyze',
                    [fields[1]]: '300000',
                    [fields[2]]: '2026-01-01',
                    [fields[3]]: 'Yes',
                    [fields[4]]: 'MLS',
                    [fields[5]]: 'No'
                }
            };
            const res = checkContractFieldsMandatory(fields[0], 'Did analyze', data, ['CONTRACT', fields[0]]);
            expect(res.isMatch).toBe(true);
        });

        test('If Yes field is required when financial assistance is Yes', () => {
            const data = {
                'Assignment Type': 'Purchase Transaction',
                CONTRACT: {
                    [fields[5]]: 'Yes'
                }
            };
            const res = checkContractFieldsMandatory(fields[6], '', data, ['CONTRACT', fields[6]]);
            expect(res.isError).toBe(true);
        });
    });

    describe('Assignment Type == Refinance Transaction', () => {
        test('Passes when all contract fields are blank', () => {
            const data = { 'Assignment Type': 'Refinance Transaction', CONTRACT: {} };
            const res = checkContractFieldsMandatory(fields[0], '', data, ['CONTRACT', fields[0]]);
            expect(res.isMatch).toBe(true);
        });

        test('Errors when any contract field has a value', () => {
            const data = { 'Assignment Type': 'Refinance Transaction', CONTRACT: { [fields[1]]: '500000' } };
            const res = checkContractFieldsMandatory(fields[1], '500000', data, ['CONTRACT', fields[1]]);
            expect(res.isError).toBe(true);
            expect(res.message).toContain("This field should be blank when Assignment Type is 'Refinance Transaction'");
        });

        test('checkAssignmentTypeConsistency fails when contract fields have values for Refinance', () => {
            const data = { 'Assignment Type': 'Refinance Transaction', CONTRACT: { [fields[1]]: '500000' } };
            const res = checkAssignmentTypeConsistency('Assignment Type', 'Refinance Transaction', data);
            expect(res.isError).toBe(true);
            expect(res.message).toContain("Assignment Type is 'Refinance Transaction' then all contract fields must be blank");
        });
    });

    describe('Assignment Type == Other (describe)', () => {
        test('Returns need to find the comment error for contract field', () => {
            const data = { 'Assignment Type': 'Other (describe)', CONTRACT: {} };
            const res = checkContractFieldsMandatory(fields[0], '', data, ['CONTRACT', fields[0]]);
            expect(res.isError).toBe(true);
            expect(res.message).toBe('need to find the comment');
        });

        test('Returns need to find the comment error for Assignment Type field', () => {
            const data = { 'Assignment Type': 'Other (describe)', CONTRACT: {} };
            const res = checkAssignmentTypeConsistency('Assignment Type', 'Other (describe)', data);
            expect(res.isError).toBe(true);
            expect(res.message).toBe('need to find the comment');
        });
    });

    describe('Assignment Type is Blank / Invalid', () => {
        test('Returns error when Assignment Type is missing or blank', () => {
            const data = { 'Assignment Type': '', CONTRACT: {} };
            const res = checkContractFieldsMandatory(fields[0], '', data, ['CONTRACT', fields[0]]);
            expect(res.isError).toBe(true);
            expect(res.message).toBe('Assignment Type is required or invalid.');
        });
    });
});
