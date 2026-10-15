import { UNPAID_LENDERS_LIST, findUnpaidLenderMatch, checkUnpaidLenderStatus, getLenderFromData } from './unpaidLenders';
import { checkUnpaidLender } from '../validations/appraiserLenderValidation';

describe('Unpaid Lenders Validation', () => {
  const all19Lenders = [
    { input: 'PRMG', expectedName: 'PRMG (Paramount Residential Mortgage Group)' },
    { input: 'Paramount Residential Mortgage Group', expectedName: 'PRMG (Paramount Residential Mortgage Group)' },
    { input: 'CARDINAL FINANCIAL COMPANY', expectedName: 'CARDINAL FINANCIAL COMPANY/Cardinal Financial Company, LP' },
    { input: 'Cardinal Financial Company, LP', expectedName: 'CARDINAL FINANCIAL COMPANY/Cardinal Financial Company, LP' },
    { input: 'Ice Lender Holdings LLC', expectedName: 'Ice Lender Holdings LLC' },
    { input: 'NP Inc', expectedName: 'NP Inc / NQM Funding, LLC' },
    { input: 'NQM Funding, LLC', expectedName: 'NP Inc / NQM Funding, LLC' },
    { input: 'East Coast Capital', expectedName: 'East Coast Capital' },
    { input: 'Guaranteed Rate. Inc', expectedName: 'Guaranteed Rate. Inc' },
    { input: 'Guaranteed Rate', expectedName: 'Guaranteed Rate. Inc' },
    { input: 'Commercial Lender, LLC', expectedName: 'Commercial Lender, LLC' },
    { input: 'LoanDepot.com', loanNum: '123456', expectedName: "LoanDepot.com - When loan number starts with '1 or 4'" },
    { input: 'LoanDepot.com', loanNum: '498765', expectedName: "LoanDepot.com - When loan number starts with '1 or 4'" },
    { input: 'Direct Lending Partners', expectedName: 'Direct Lending Partners' },
    { input: 'CIVIC', expectedName: 'CIVIC' },
    { input: 'CV3', expectedName: 'CV3' },
    { input: 'United Faith Mortgage', expectedName: 'United Faith Mortgage' },
    { input: 'Arixa Capital', expectedName: 'Arixa Capital/Crosswind Financial and Western Alliance Bank' },
    { input: 'Crosswind Financial', expectedName: 'Arixa Capital/Crosswind Financial and Western Alliance Bank' },
    { input: 'Western Alliance Bank', expectedName: 'Arixa Capital/Crosswind Financial and Western Alliance Bank' },
    { input: 'RCN Capital, LLC', expectedName: 'RCN Capital, LLC' },
    { input: 'Aura Mortgage Advisors, LLC', expectedName: 'Aura Mortgage Advisors, LLC/Blue Hub Capital' },
    { input: 'Blue Hub Capital', expectedName: 'Aura Mortgage Advisors, LLC/Blue Hub Capital' },
    { input: 'Nations Direct Mortgage LLC', expectedName: 'Nations Direct Mortgage LLC' },
    { input: 'Sierra Pacific Mortgage Company Inc', expectedName: 'Sierra Pacific Mortgage Company Inc(Union Home Mortgage-SP)' },
    { input: 'Union Home Mortgage-SP', expectedName: 'Sierra Pacific Mortgage Company Inc(Union Home Mortgage-SP)' },
    { input: 'Champions Funding LLC', expectedName: 'Champions Funding LLC' },
    { input: 'Vontive', expectedName: 'Vontive' }
  ];

  test('Has exactly 19 configuration entries in UNPAID_LENDERS_LIST', () => {
    expect(UNPAID_LENDERS_LIST.length).toBe(19);
  });

  all19Lenders.forEach(({ input, loanNum, expectedName }) => {
    test(`Matches "${input}" and returns comment: "Unpaid lender in the list found :- ${input}"`, () => {
      const allData = loanNum ? { 'Loan #': loanNum } : {};
      const match = findUnpaidLenderMatch(input, allData);
      expect(match).not.toBeNull();
      expect(match.configName).toBe(expectedName);
      expect(match.comment).toBe(`Unpaid lender in the list found :- ${input}`);
    });
  });

  test('checkUnpaidLenderStatus extracts from data and returns comment', () => {
    const data = {
      'Lender/Client': 'Vontive'
    };
    const status = checkUnpaidLenderStatus(data);
    expect(status.isUnpaidOkLender).toBe(true);
    expect(status.matchedLender).toBe('Vontive');
    expect(status.comment).toBe('Unpaid lender in the list found :- Vontive');
  });

  test('checkUnpaidLenderStatus extracts from Subject when top-level is absent', () => {
    const data = {
      Subject: {
        'Lender/Client': 'PRMG'
      }
    };
    const status = checkUnpaidLenderStatus(data);
    expect(status.isUnpaidOkLender).toBe(true);
    expect(status.matchedLender).toBe('PRMG');
    expect(status.comment).toBe('Unpaid lender in the list found :- PRMG');
  });

  test('checkUnpaidLender validation returns match with correct comment', () => {
    const res = checkUnpaidLender('Lender/Client', 'Champions Funding LLC', {});
    expect(res).not.toBeNull();
    expect(res.isMatch).toBe(true);
    expect(res.message).toBe('Unpaid lender in the list found :- Champions Funding LLC');
  });

  test('Non-unpaid lender returns null or false', () => {
    const match = findUnpaidLenderMatch('Bank of America', {});
    expect(match).toBeNull();

    const status = checkUnpaidLenderStatus({ 'Lender/Client': 'Bank of America' });
    expect(status.isUnpaidOkLender).toBe(false);
    expect(status.comment).toBe('');

    const res = checkUnpaidLender('Lender/Client', 'Bank of America', {});
    expect(res).toBeNull();
  });
});
