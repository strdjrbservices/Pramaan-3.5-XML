export const checkFormIsECR = (data) => {
  if (!data) return false;
  const ft = String(
    data.formType ||
    data.form_type ||
    data.selected_form_type ||
    data.selectedFormType ||
    ''
  ).trim().toUpperCase();
  return ft === 'ECR' || ft === 'ERC';
};

export const checkECRRequiredFields = (field, text, data) => {
  if (!checkFormIsECR(data)) return null;

  const requiredFields = [
    'Property Address',
    'Borrower',
    'Owner of Public Record',
    'County',
    'Appraiser Name'
  ];

  if (!requiredFields.includes(field)) return null;

  const value = String(text || '').trim();
  if (!value) {
    return {
      isError: true,
      message: `'${field}' is mandatory for ERC report.`
    };
  }

  return null;
};
