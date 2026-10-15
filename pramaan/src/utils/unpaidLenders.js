export const UNPAID_LENDERS_LIST = [
  {
    name: 'PRMG (Paramount Residential Mortgage Group)',
    matchers: [
      'prmg',
      'paramount residential mortgage group',
      'paramount residential mortgage',
      'paramount residential'
    ]
  },
  {
    name: 'CARDINAL FINANCIAL COMPANY/Cardinal Financial Company, LP',
    matchers: [
      'cardinal financial company/cardinal financial company, lp',
      'cardinal financial company, lp',
      'cardinal financial company lp',
      'cardinal financial company',
      'cardinal financial'
    ]
  },
  {
    name: 'Ice Lender Holdings LLC',
    matchers: [
      'ice lender holdings llc',
      'ice lender holdings',
      'ice lender'
    ]
  },
  {
    name: 'NP Inc / NQM Funding, LLC',
    matchers: [
      'np inc / nqm funding, llc',
      'np inc / nqm funding',
      'np inc',
      'nqm funding, llc',
      'nqm funding llc',
      'nqm funding'
    ]
  },
  {
    name: 'East Coast Capital',
    matchers: [
      'east coast capital'
    ]
  },
  {
    name: 'Guaranteed Rate. Inc',
    matchers: [
      'guaranteed rate. inc',
      'guaranteed rate, inc',
      'guaranteed rate inc',
      'guaranteed rate'
    ]
  },
  {
    name: 'Commercial Lender, LLC',
    matchers: [
      'commercial lender, llc',
      'commercial lender llc',
      'commercial lender'
    ]
  },
  {
    name: "LoanDepot.com - When loan number starts with '1 or 4'",
    matchers: [
      'loandepot.com',
      'loandepot'
    ],
    checkCondition: (allData) => {
      if (!allData || typeof allData !== 'object') return true;
      const loanNum = String(
        allData['Loan #'] ||
        allData['Loan Number'] ||
        allData['Loan No.'] ||
        allData['Client File #:'] ||
        allData['Client File #'] ||
        allData.Subject?.['Loan #'] ||
        allData.Subject?.['Loan Number'] ||
        allData.comparisonData?.['Loan #'] ||
        allData.comparisonData?.['Loan Number'] ||
        ''
      ).trim();

      // If loan number is available, verify it starts with '1' or '4'
      if (loanNum) {
        return loanNum.startsWith('1') || loanNum.startsWith('4');
      }
      return true;
    }
  },
  {
    name: 'Direct Lending Partners',
    matchers: [
      'direct lending partners'
    ]
  },
  {
    name: 'CIVIC',
    matchers: [
      'civic financial services',
      'civic financial',
      'civic'
    ]
  },
  {
    name: 'CV3',
    matchers: [
      'cv3 financial services',
      'cv3 financial',
      'cv3'
    ]
  },
  {
    name: 'United Faith Mortgage',
    matchers: [
      'united faith mortgage'
    ]
  },
  {
    name: 'Arixa Capital/Crosswind Financial and Western Alliance Bank',
    matchers: [
      'arixa capital/crosswind financial and western alliance bank',
      'arixa capital',
      'crosswind financial',
      'western alliance bank'
    ]
  },
  {
    name: 'RCN Capital, LLC',
    matchers: [
      'rcn capital, llc',
      'rcn capital llc',
      'rcn capital'
    ]
  },
  {
    name: 'Aura Mortgage Advisors, LLC/Blue Hub Capital',
    matchers: [
      'aura mortgage advisors, llc/blue hub capital',
      'aura mortgage advisors, llc',
      'aura mortgage advisors llc',
      'aura mortgage advisors',
      'blue hub capital'
    ]
  },
  {
    name: 'Nations Direct Mortgage LLC',
    matchers: [
      'nations direct mortgage llc',
      'nations direct mortgage'
    ]
  },
  {
    name: 'Sierra Pacific Mortgage Company Inc(Union Home Mortgage-SP)',
    matchers: [
      'sierra pacific mortgage company inc(union home mortgage-sp)',
      'sierra pacific mortgage company inc',
      'sierra pacific mortgage company',
      'sierra pacific mortgage',
      'union home mortgage-sp',
      'union home mortgage - sp',
      'union home mortgage'
    ]
  },
  {
    name: 'Champions Funding LLC',
    matchers: [
      'champions funding llc',
      'champions funding'
    ]
  },
  {
    name: 'Vontive',
    matchers: [
      'vontive'
    ]
  }
];

export const getLenderFromData = (data = {}) => {
  if (!data || typeof data !== 'object') return '';
  return String(
    data['Lender/Client'] ||
    data.Subject?.['Lender/Client'] ||
    data.SUBJECT?.['Lender/Client'] ||
    data['Client/Lender Company Name'] ||
    data.Subject?.['Client/Lender Company Name'] ||
    data['LENDER/CLIENT Name'] ||
    data['Lender/Client Company Name'] ||
    data.CERTIFICATION?.['Lender/Client Company Name'] ||
    data.comparisonData?.['Client/Lender on Report'] ||
    data.comparisonData?.['Client Name'] ||
    ''
  ).trim();
};

export const findUnpaidLenderMatch = (lenderText, allData = {}) => {
  if (!lenderText || typeof lenderText !== 'string') return null;
  const cleanLender = lenderText.trim().toLowerCase();
  if (!cleanLender) return null;

  for (const item of UNPAID_LENDERS_LIST) {
    const isMatched = item.matchers.some(m => {
      const matcherLower = m.toLowerCase();
      // Match if cleanLender includes matcher or matcher includes cleanLender (for short exact matches)
      return cleanLender.includes(matcherLower) || (cleanLender.length >= 3 && matcherLower.includes(cleanLender));
    });

    if (isMatched) {
      if (item.checkCondition && !item.checkCondition(allData)) {
        continue;
      }
      return {
        matched: true,
        lenderName: lenderText.trim(),
        configName: item.name,
        comment: `Unpaid lender in the list found :- ${lenderText.trim()}`
      };
    }
  }
  return null;
};

export const checkUnpaidLenderStatus = (data = {}) => {
  const lender = getLenderFromData(data);
  const match = findUnpaidLenderMatch(lender, data);
  const isUnpaidOkLender = !!match;
  const matchedLender = match ? (match.lenderName || match.configName) : '';
  const comment = match ? `Unpaid lender in the list found :- ${matchedLender}` : '';

  return {
    lender,
    isUnpaidOkLender,
    matchedLender,
    comment
  };
};
