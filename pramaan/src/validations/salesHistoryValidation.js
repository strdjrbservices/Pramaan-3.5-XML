export const checkResearchHistory = (field, text) => {
  if (field !== "I did did not research the sale or transfer history of the subject property and comparable sales. If not, explain") return null;
  const value = String(text || '').trim().toLowerCase();
  if (value.includes('did not')) {
    return { isError: true, message: "Critical Error: Research on sale/transfer history must be performed. 'did not' is not acceptable." };
  }
  if (!value.includes('did')) {
    return { isError: true, message: "This field must state whether research 'did' or 'did not' occur." };
  }
  return { isMatch: true };
};

const getSubjectPriorSaleDetails = (data) => {
  if (!data) return { researchValue: '', priorSaleDateStr: '', priorSalePriceStr: '', asOfDateStr: '' };

  const researchKeys = [
    "My research did did not reveal any prior sales or transfers of the subject property for the three years prior to the effective date of this appraisal.",
    "Prior Sale History: My research did did not reveal any prior sales or transfers of the subject property for the three years prior to the effective date of this appraisal"
  ];
  let researchValue = '';
  for (const key of researchKeys) {
    if (data[key] !== undefined && data[key] !== null) { researchValue = String(data[key]); break; }
    if (data.Subject?.[key] !== undefined && data.Subject?.[key] !== null) { researchValue = String(data.Subject[key]); break; }
    if (data.SALES_TRANSFER?.[key] !== undefined && data.SALES_TRANSFER?.[key] !== null) { researchValue = String(data.SALES_TRANSFER[key]); break; }
    if (data.PRIOR_SALE_HISTORY?.[key] !== undefined && data.PRIOR_SALE_HISTORY?.[key] !== null) { researchValue = String(data.PRIOR_SALE_HISTORY[key]); break; }
  }
  if (!researchValue) {
    const allKeys = [
      ...Object.keys(data),
      ...(data.Subject ? Object.keys(data.Subject) : []),
      ...(data.SALES_TRANSFER ? Object.keys(data.SALES_TRANSFER) : []),
      ...(data.PRIOR_SALE_HISTORY ? Object.keys(data.PRIOR_SALE_HISTORY) : [])
    ];
    const matchKey = allKeys.find(k => k.includes("My research did did not reveal any prior sales or transfers of the subject property"));
    if (matchKey) {
      if (data[matchKey] !== undefined && data[matchKey] !== null) researchValue = String(data[matchKey]);
      else if (data.Subject?.[matchKey] !== undefined && data.Subject?.[matchKey] !== null) researchValue = String(data.Subject[matchKey]);
      else if (data.SALES_TRANSFER?.[matchKey] !== undefined && data.SALES_TRANSFER?.[matchKey] !== null) researchValue = String(data.SALES_TRANSFER[matchKey]);
      else if (data.PRIOR_SALE_HISTORY?.[matchKey] !== undefined && data.PRIOR_SALE_HISTORY?.[matchKey] !== null) researchValue = String(data.PRIOR_SALE_HISTORY[matchKey]);
    }
  }

  const dateKeys = [
    "Date of Prior Sale/Transfer",
    "Prior Sale History: Date of Prior Sale/Transfer"
  ];
  let priorSaleDateStr = '';
  for (const key of dateKeys) {
    if (data[key] !== undefined && data[key] !== null) { priorSaleDateStr = String(data[key]); break; }
    if (data.Subject?.[key] !== undefined && data.Subject?.[key] !== null) { priorSaleDateStr = String(data.Subject[key]); break; }
    if (data.SALES_TRANSFER?.[key] !== undefined && data.SALES_TRANSFER?.[key] !== null) { priorSaleDateStr = String(data.SALES_TRANSFER[key]); break; }
    if (data.PRIOR_SALE_HISTORY?.[key] !== undefined && data.PRIOR_SALE_HISTORY?.[key] !== null) { priorSaleDateStr = String(data.PRIOR_SALE_HISTORY[key]); break; }
  }

  const priceKeys = [
    "Price of Prior Sale/Transfer",
    "Prior Sale History: Price of Prior Sale/Transfer"
  ];
  let priorSalePriceStr = '';
  for (const key of priceKeys) {
    if (data[key] !== undefined && data[key] !== null) { priorSalePriceStr = String(data[key]); break; }
    if (data.Subject?.[key] !== undefined && data.Subject?.[key] !== null) { priorSalePriceStr = String(data.Subject[key]); break; }
    if (data.SALES_TRANSFER?.[key] !== undefined && data.SALES_TRANSFER?.[key] !== null) { priorSalePriceStr = String(data.SALES_TRANSFER[key]); break; }
    if (data.PRIOR_SALE_HISTORY?.[key] !== undefined && data.PRIOR_SALE_HISTORY?.[key] !== null) { priorSalePriceStr = String(data.PRIOR_SALE_HISTORY[key]); break; }
  }

  const asOfKeys = ["as of", "as of date"];
  let asOfDateStr = '';
  for (const key of asOfKeys) {
    if (data[key] !== undefined && data[key] !== null) { asOfDateStr = String(data[key]); break; }
    if (data.RECONCILIATION?.[key] !== undefined && data.RECONCILIATION?.[key] !== null) { asOfDateStr = String(data.RECONCILIATION[key]); break; }
    if (data.Subject?.[key] !== undefined && data.Subject?.[key] !== null) { asOfDateStr = String(data.Subject[key]); break; }
  }
  if (!asOfDateStr) {
    const reconKeys = data.RECONCILIATION ? Object.keys(data.RECONCILIATION) : [];
    const matchKey = reconKeys.find(k => k.toLowerCase().includes("as of"));
    if (matchKey) {
      asOfDateStr = String(data.RECONCILIATION[matchKey]);
    }
  }

  return {
    researchValue: researchValue.trim().toLowerCase(),
    priorSaleDateStr: priorSaleDateStr.trim(),
    priorSalePriceStr: priorSalePriceStr.trim(),
    asOfDateStr: asOfDateStr.trim()
  };
};

export const checkSubjectPriorSales = (field, text, data) => {
  const fieldName1 = "My research did did not reveal any prior sales or transfers of the subject property for the three years prior to the effective date of this appraisal.";
  const fieldName2 = "Prior Sale History: My research did did not reveal any prior sales or transfers of the subject property for the three years prior to the effective date of this appraisal";
  if (field !== fieldName1 && field !== fieldName2) return null;
  if (!data) return null;

  const { priorSaleDateStr, priorSalePriceStr, asOfDateStr } = getSubjectPriorSaleDetails(data);

  const value = String(text || '').trim().toLowerCase();
  if (!value.includes('did') && !value.includes('did not')) {
    return { isError: true, message: "This field cannot be blank. Please indicate 'did' or 'did not'." };
  }

  const isDidNot = value.includes('did not');
  const isDid = value.includes('did') && !isDidNot;

  if (isDidNot) {
    const hasDate = priorSaleDateStr !== '';
    const hasPrice = priorSalePriceStr !== '';

    if (hasDate || hasPrice) {
      if (!hasDate || !hasPrice) {
        return { isError: true, message: "If prior sales were revealed, 'Date of Prior Sale/Transfer' and 'Price of Prior Sale/Transfer' for the Subject must blank or three years prior " };
      }
      if (asOfDateStr) {
        const priorSaleDate = new Date(priorSaleDateStr);
        const asOfDate = new Date(asOfDateStr);
        if (!isNaN(priorSaleDate.getTime()) && !isNaN(asOfDate.getTime())) {
          const threeYears = 3 * 365 * 24 * 60 * 60 * 1000;
          if (asOfDate - priorSaleDate <= threeYears || priorSaleDate > asOfDate) {
            return { isError: true, message: "If prior sales were revealed, 'Date of Prior Sale/Transfer' and 'Price of Prior Sale/Transfer' for the Subject must blank or three years prior " };
          }
        }
      }
    }
  } else if (isDid) {
    const hasDate = priorSaleDateStr !== '';
    const hasPrice = priorSalePriceStr !== '';

    if (!hasDate || !hasPrice) {
      return { isError: true, message: "If prior sales were revealed, 'Date of Prior Sale/Transfer' and 'Price of Prior Sale/Transfer' for the Subject must greater than or less than  three years prior " };
    }

    if (asOfDateStr) {
      const priorSaleDate = new Date(priorSaleDateStr);
      const asOfDate = new Date(asOfDateStr);
      if (!isNaN(priorSaleDate.getTime()) && !isNaN(asOfDate.getTime())) {
        const threeYears = 3 * 365 * 24 * 60 * 60 * 1000;
        if (asOfDate - priorSaleDate > threeYears || priorSaleDate > asOfDate) {
          return { isError: true, message: "If prior sales were revealed, 'Date of Prior Sale/Transfer' and 'Price of Prior Sale/Transfer' for the Subject must greater than or less than  three years prior " };
        }
      }
    }
  }

  return { isMatch: true };
};

export const checkComparablePriorSales = (field, text, data) => {
  const fieldName1 = "My research did did not reveal any prior sales or transfers of the comparable sales for the year prior to the date of sale of the comparable sale.";
  const fieldName2 = "Prior Sale History: My research did did not reveal any prior sales or transfers of the comparable sales for the year prior to the date of sale of the comparable sale";
  if (field !== fieldName1 && field !== fieldName2) return null;
  if (!data) return null;

  const value = String(text || '').trim().toLowerCase();
  if (!value.includes('did') && !value.includes('did not')) {
    return { isError: true, message: "This field cannot be blank. Please indicate 'did' or 'did not'." };
  }

  const isDidNot = value.includes('did not');
  const isDid = value.includes('did') && !isDidNot;

  const comparableSales = Object.keys(data).filter(k => k.startsWith('COMPARABLE SALE #'));

  if (isDidNot) {
    for (const sale of comparableSales) {
      const priorSaleDateStr = String(data[sale]?.['Date of Prior Sale/Transfer'] || '').trim();
      const priorSalePriceStr = String(data[sale]?.['Price of Prior Sale/Transfer'] || '').trim();
      const saleDateStr = String(data[sale]?.['Date of Sale/Time'] || '').trim();

      const hasDate = priorSaleDateStr !== '';
      const hasPrice = priorSalePriceStr !== '';

      if (hasDate || hasPrice) {
        if (!hasDate || !hasPrice) {
          return { isError: true, message: "If prior sales for comparables were revealed, at least one comparable must have 'Date of Prior Sale/Transfer' and 'Price of Prior Sale/Transfer' must blank ." };
        }
        if (saleDateStr) {
          const priorSaleDate = new Date(priorSaleDateStr);
          const saleDate = new Date(saleDateStr);
          if (!isNaN(priorSaleDate.getTime()) && !isNaN(saleDate.getTime())) {
            const oneYear = 365 * 24 * 60 * 60 * 1000;
            if (saleDate - priorSaleDate <= oneYear || priorSaleDate > saleDate) {
              return { isError: true, message: "If prior sales for comparables were revealed, at least one comparable must have 'Date of Prior Sale/Transfer' and 'Price of Prior Sale/Transfer' must blank ." };
            }
          }
        }
      }
    }
  } else if (isDid) {
    let atLeastOneValid = false;
    for (const sale of comparableSales) {
      const priorSaleDateStr = String(data[sale]?.['Date of Prior Sale/Transfer'] || '').trim();
      const priorSalePriceStr = String(data[sale]?.['Price of Prior Sale/Transfer'] || '').trim();
      const saleDateStr = String(data[sale]?.['Date of Sale/Time'] || '').trim();

      if (priorSaleDateStr && priorSalePriceStr && saleDateStr) {
        const priorSaleDate = new Date(priorSaleDateStr);
        const saleDate = new Date(saleDateStr);
        if (!isNaN(priorSaleDate.getTime()) && !isNaN(saleDate.getTime())) {
          const oneYear = 365 * 24 * 60 * 60 * 1000;
          if (saleDate - priorSaleDate <= oneYear && priorSaleDate <= saleDate) {
            atLeastOneValid = true;
            break;
          }
        }
      }
    }
    if (!atLeastOneValid) {
      return { isError: true, message: "If prior sales for comparables were revealed, at least one comparable must have 'Date of Prior Sale/Transfer' and 'Price of Prior Sale/Transfer' comparable sales for the year prior ." };
    }
  }

  return { isMatch: true };
};

export const checkDataSourceNotBlank = (field, text) => {
  const fieldsToCheck = ["Data Source(s) for subject property research", "Data Source(s) for comparable sales research", "Summary of Sales Comparison Approach"];
  if (fieldsToCheck.includes(field)) {
    if (!text || String(text).trim() === '') {
      return { isError: true, message: `'${field}' cannot be blank.` };
    }
  }
  return { isMatch: true };
};

export const checkEffectiveDateIsCurrentYear = (field, text) => {
  if (field !== "Effective Date of Data Source(s) for prior sale") return null;
  const value = String(text || '').trim();
  if (!value) return null;

  const year = new Date(value).getFullYear();
  const currentYear = new Date().getFullYear();

  if (year !== currentYear) {
    return { isError: true, message: `The year for '${field}' must be the current year (${currentYear}).` };
  }
  return { isMatch: true };
};

export const checkSubjectPriorSaleDate = (field, text, data) => {
  if (field !== 'Date of Prior Sale/Transfer' && field !== 'Prior Sale History: Date of Prior Sale/Transfer') return null;
  if (!data) return null;

  const { researchValue, priorSaleDateStr: parsedDate, asOfDateStr } = getSubjectPriorSaleDetails(data);

  const priorSaleDateStr = text ? String(text).trim() : parsedDate;

  if (!priorSaleDateStr) return null;

  const isDidNot = researchValue.includes('did not');
  const isDid = researchValue.includes('did') && !isDidNot;

  if (isDidNot) {
    if (asOfDateStr) {
      const priorSaleDate = new Date(priorSaleDateStr);
      const asOfDate = new Date(asOfDateStr);
      if (!isNaN(priorSaleDate.getTime()) && !isNaN(asOfDate.getTime())) {
        const threeYears = 3 * 365 * 24 * 60 * 60 * 1000;
        if (asOfDate - priorSaleDate <= threeYears || priorSaleDate > asOfDate) {
          return { isError: true, message: "If prior sales were revealed, 'Date of Prior Sale/Transfer' and 'Price of Prior Sale/Transfer' for the Subject must blank or three years prior " };
        }
      }
    }
  } else if (isDid) {
    if (asOfDateStr) {
      const priorSaleDate = new Date(priorSaleDateStr);
      const asOfDate = new Date(asOfDateStr);
      if (!isNaN(priorSaleDate.getTime()) && !isNaN(asOfDate.getTime())) {
        const threeYears = 3 * 365 * 24 * 60 * 60 * 1000;
        if (asOfDate - priorSaleDate > threeYears || priorSaleDate > asOfDate) {
          return { isError: true, message: "If prior sales were revealed, 'Date of Prior Sale/Transfer' and 'Price of Prior Sale/Transfer' for the Subject must greater than or less than  three years prior " };
        }
      }
    }
  }

  return { isMatch: true };
};

export const checkCompPriorSaleDate = (field, text, data, fieldPath, saleName) => {
  if (field !== 'Date of Prior Sale/Transfer' && field !== 'Prior Sale History: Date of Prior Sale/Transfer') return null;
  if (!saleName || saleName === 'Subject' || !data) return null;

  const checkboxKeys = [
    "My research did did not reveal any prior sales or transfers of the comparable sales for the year prior to the date of sale of the comparable sale.",
    "Prior Sale History: My research did did not reveal any prior sales or transfers of the comparable sales for the year prior to the date of sale of the comparable sale"
  ];
  let researchValue = '';
  for (const key of checkboxKeys) {
    if (data[key] !== undefined && data[key] !== null) { researchValue = String(data[key]); break; }
    if (data.Subject?.[key] !== undefined && data.Subject?.[key] !== null) { researchValue = String(data.Subject[key]); break; }
    if (data.SALES_TRANSFER?.[key] !== undefined && data.SALES_TRANSFER?.[key] !== null) { researchValue = String(data.SALES_TRANSFER[key]); break; }
    if (data.PRIOR_SALE_HISTORY?.[key] !== undefined && data.PRIOR_SALE_HISTORY?.[key] !== null) { researchValue = String(data.PRIOR_SALE_HISTORY[key]); break; }
  }
  if (!researchValue) {
    const allKeys = [
      ...Object.keys(data),
      ...(data.Subject ? Object.keys(data.Subject) : []),
      ...(data.SALES_TRANSFER ? Object.keys(data.SALES_TRANSFER) : []),
      ...(data.PRIOR_SALE_HISTORY ? Object.keys(data.PRIOR_SALE_HISTORY) : [])
    ];
    const matchKey = allKeys.find(k => k.includes("My research did did not reveal any prior sales or transfers of the comparable sales"));
    if (matchKey) {
      if (data[matchKey] !== undefined && data[matchKey] !== null) researchValue = String(data[matchKey]);
      else if (data.Subject?.[matchKey] !== undefined && data.Subject?.[matchKey] !== null) researchValue = String(data.Subject[matchKey]);
      else if (data.SALES_TRANSFER?.[matchKey] !== undefined && data.SALES_TRANSFER?.[matchKey] !== null) researchValue = String(data.SALES_TRANSFER[matchKey]);
      else if (data.PRIOR_SALE_HISTORY?.[matchKey] !== undefined && data.PRIOR_SALE_HISTORY?.[matchKey] !== null) researchValue = String(data.PRIOR_SALE_HISTORY[matchKey]);
    }
  }

  const normalized = researchValue.toLowerCase();
  const isDidNot = normalized.includes('did not');
  const isDid = normalized.includes('did') && !isDidNot;

  const priorSaleDateStr = String(text || '').trim();
  const saleDateStr = data[saleName]?.['Date of Sale/Time'];
  if (!priorSaleDateStr || !saleDateStr) return null;
  const priorSaleDate = new Date(priorSaleDateStr);
  const saleDate = new Date(saleDateStr);
  if (isNaN(priorSaleDate.getTime()) || isNaN(saleDate.getTime())) return null;
  const oneYear = 365 * 24 * 60 * 60 * 1000;

  if (isDidNot) {
    if (saleDate - priorSaleDate <= oneYear || priorSaleDate > saleDate) {
      return { isError: true, message: "If prior sales for comparables were revealed, at least one comparable must have 'Date of Prior Sale/Transfer' and 'Price of Prior Sale/Transfer' must blank ." };
    }
  } else if (isDid) {
    if (saleDate - priorSaleDate > oneYear || priorSaleDate > saleDate) {
      return { isError: true, message: "If prior sales for comparables were revealed, at least one comparable must have 'Date of Prior Sale/Transfer' and 'Price of Prior Sale/Transfer' comparable sales for the year prior ." };
    }
  }
  return { isMatch: true };
};
