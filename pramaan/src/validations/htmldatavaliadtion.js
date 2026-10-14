const normalize = (val) =>
    String(val || '')
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '');

const createHtmlComparator = (htmlFields, errorFieldLabel, comparisonType = 'exact') => {
    return (field, text, allData) => {
        if (!allData.comparisonData) return null;
        
        let htmlValue = null;
        const fieldsToCheck = Array.isArray(htmlFields) ? htmlFields : [htmlFields];
        for (const hField of fieldsToCheck) {
            if (allData.comparisonData[hField]) {
                htmlValue = allData.comparisonData[hField];
                break;
            }
        }

        if (!htmlValue) {
            return null;
        }
        
        const pdfValue = text;

        if (!htmlValue || htmlValue === 'N/A' || !pdfValue) {
            return null;
        }

        const normalizedHtml = normalize(htmlValue);
        const normalizedPdf = normalize(pdfValue);

        let isMismatch = false;
        if (comparisonType === 'includes') {
            isMismatch = !normalizedHtml.includes(normalizedPdf);
        } else {
            isMismatch = normalizedHtml !== normalizedPdf;
        }

        if (isMismatch) {
            return {
                isError: true,
                message: `${errorFieldLabel} mismatch. HTML: '${htmlValue}', PDF: '${pdfValue}'.`
            };
        }

        return { isMatch: true };
    };
};

export const checkLenderAddressInconsistency = createHtmlComparator(['Lender Address', 'Client Address'], 'Lender/Client Address');

export const checkSubjectLenderNameVsHtml = createHtmlComparator(['Client/Lender on Report', 'Client Name'], 'Lender/Client Name');

export const checkBorrowerNameVsHtml = (field, text, allData) => {
    if (!allData.comparisonData || !allData.comparisonData['Borrower (and Co-Borrower)']) {
        return null;
    }

    const htmlBorrower = allData.comparisonData['Borrower (and Co-Borrower)'];
    const pdfBorrower = text;

    if (!htmlBorrower || htmlBorrower === 'N/A' || !pdfBorrower) {
        return null;
    }

    const getWords = (name) =>
        new Set(
            String(name || '')
                .toLowerCase()
                .split(/[^a-z0-9]+/)
                .filter(Boolean)
        );

    const htmlWords = getWords(htmlBorrower);
    const pdfWords = Array.from(getWords(pdfBorrower));

    const isMismatch = !pdfWords.every(word => htmlWords.has(word));

    if (isMismatch) {
        return {
            isError: true,
            message: `Borrower mismatch. HTML: '${htmlBorrower}', PDF: '${pdfBorrower}'.`
        };
    }

    return { isMatch: true };
};
