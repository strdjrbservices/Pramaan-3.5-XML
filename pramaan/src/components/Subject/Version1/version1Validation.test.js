import React from 'react';
import { render } from '@testing-library/react';
import { EditableField } from '../components/FormComponents';
import { checkVersion1UtilitySubfields, checkZoningClassificationDescription, checkSiteSizesConsistency, checkVersion1EffectiveDatesConsistency, checkAboveGradeFinishedAreaConsistency, checkYearBuiltConsistency, checkAppraiserNameConsistency, checkVersion1ComparableListingStatusConsistency, checkVersion1ComparableTransferTermsConsistency, checkVersion1YearBuiltAdjustmentConsistency, checkVersion1ConstructionMethodAdjustmentConsistency, checkVersion1SiteSizeAdjustmentConsistency, checkVersion1LocationAdjustmentConsistency, checkVersion1AttachedDetachedAdjustmentConsistency, checkVersion1HeatingAdjustmentConsistency, checkVersion1AmenitiesAdjustmentConsistency, checkVersion1QualityConditionConsistency, checkVersion1AreaAdjustmentConsistency, checkVersion1OverallQualityConditionAdjustmentConsistency, checkVersion1VehicleStorageAdjustmentConsistency } from './version1Validation';
import '@testing-library/jest-dom';

describe('Version1 Utility sub-fields validations', () => {
  const allDataPrivate = {
    formType: 'Appraisal Version #1',
    SITE: {
      Electricity: 'Private',
      'Sanitary Sewer': 'Private',
      Water: 'Private',
    }
  };

  const allDataPublic = {
    formType: 'Appraisal Version #1',
    SITE: {
      Electricity: 'Public',
      'Sanitary Sewer': 'Public',
      Water: 'Public',
    }
  };

  const utilities = ['Electricity', 'Sanitary Sewer', 'Water'];

  describe('Pure validator function checkVersion1UtilitySubfields', () => {
    utilities.forEach(utility => {
      const detailKey = `${utility} Detail`;
      const impactKey = `${utility} Private Utility Impact`;
      const commentKey = `${utility} Comment`;

      [detailKey, impactKey, commentKey].forEach(fieldKey => {
        test(`should return error for ${fieldKey} when utility is Private and field is blank`, () => {
          const result = checkVersion1UtilitySubfields(fieldKey, '', allDataPrivate);
          expect(result).toEqual({
            isError: true,
            message: `'${fieldKey}' should not be blank.`,
            skipBlankFilter: true
          });
        });

        test(`should return null for ${fieldKey} when utility is Public and field is blank`, () => {
          const result = checkVersion1UtilitySubfields(fieldKey, '', allDataPublic);
          expect(result).toBeNull();
        });

        test(`should return null for ${fieldKey} when utility is Private and field has value`, () => {
          const result = checkVersion1UtilitySubfields(fieldKey, 'Some details', allDataPrivate);
          expect(result).toBeNull();
        });
      });
    });
  });

  describe('EditableField Component integration', () => {
    utilities.forEach(utility => {
      const detailKey = `${utility} Detail`;
      const impactKey = `${utility} Private Utility Impact`;
      const commentKey = `${utility} Comment`;

      [detailKey, impactKey, commentKey].forEach(fieldKey => {
        test(`should show validation error for ${fieldKey} when utility is Private and field is blank`, () => {
          const { container } = render(
            <EditableField
              fieldPath={['SITE', fieldKey]}
              value=""
              onDataChange={() => {}}
              editingField={null}
              setEditingField={() => {}}
              isEditable={true}
              allData={allDataPrivate}
              manualValidations={{}}
              handleManualValidation={() => {}}
              showBlankValidation={true}
            />
          );

          const fieldContainer = container.querySelector('.editable-field-container');
          expect(fieldContainer).toBeInTheDocument();
          const bg = fieldContainer.style.backgroundColor;
          expect(bg === 'rgb(255, 0, 21)' || bg === '#ff0015ff' || bg.includes('255, 0, 21')).toBe(true);
        });

        test(`should NOT show validation error for ${fieldKey} when utility is Public and field is blank`, () => {
          const { container } = render(
            <EditableField
              fieldPath={['SITE', fieldKey]}
              value=""
              onDataChange={() => {}}
              editingField={null}
              setEditingField={() => {}}
              isEditable={true}
              allData={allDataPublic}
              manualValidations={{}}
              handleManualValidation={() => {}}
              showBlankValidation={true}
            />
          );

          const fieldContainer = container.querySelector('.editable-field-container');
          expect(fieldContainer).toBeInTheDocument();
          const bg = fieldContainer.style.backgroundColor;
          expect(bg === 'rgb(255, 0, 21)' || bg === '#ff0015ff' || bg.includes('255, 0, 21')).toBe(false);
        });
      });
    });
  });

  describe('checkZoningClassificationDescription validation rules', () => {
    const testFields = ['Zoning Classification Description', 'Classification Code Description'];

    testFields.forEach(field => {
      test(`should return error for ${field} when value contains agricultural terms`, () => {
        const testCases = [
          'agr', 'AGR', 'agri', 'AGRI', 'agriculture', 'Agriculture', 'agricultural', 'Agri-business'
        ];
        testCases.forEach(val => {
          const result = checkZoningClassificationDescription(field, val);
          expect(result).toEqual({
            isError: true,
            message: "Critical Field: 'agriculture' or 'agricultural' or 'agribusiness' or 'agri' or 'agr'. Please review."
          });
        });
      });

      test(`should return match for ${field} when value is valid and doesn't contain agricultural terms`, () => {
        const testCases = [
          'Residential', 'R-1', 'Commercial', 'Zoning complies', 'agree'
        ];
        testCases.forEach(val => {
          const result = checkZoningClassificationDescription(field, val);
          expect(result).toEqual({ isMatch: true });
        });
      });

      test(`should return null for ${field} when value is blank`, () => {
        const result = checkZoningClassificationDescription(field, '');
        expect(result).toBeNull();
      });
    });

    test('should return null for unrelated fields', () => {
      const result = checkZoningClassificationDescription('Unrelated Field', 'agriculture');
      expect(result).toBeNull();
    });
  });

  describe('checkSiteSizesConsistency validation rules', () => {
    const mockData = (siteSize, totalSiteSize, parcelSize) => ({
      Subject: {
        'Site Size': siteSize
      },
      SITE: {
        'Total Site Size': totalSiteSize,
        'Parcel Size': parcelSize
      }
    });

    test('should return null if any field is blank', () => {
      const data = mockData('', '10,000', '10,000');
      const result = checkSiteSizesConsistency('Total Site Size', '10,000', data);
      expect(result).toBeNull();
    });

    test('should return isMatch true when all fields are same', () => {
      const data = mockData('10,000', '10,000', '10,000');
      const result = checkSiteSizesConsistency('Total Site Size', '10,000', data);
      expect(result).toEqual({ isMatch: true });
    });

    test('should return isMatch true when fields are same but formatted differently', () => {
      const data = mockData('10,000 sf', '10000 Sq. Ft.', '10,000');
      const result = checkSiteSizesConsistency('Total Site Size', '10,000', data);
      expect(result).toEqual({ isMatch: true });
    });

    test('should return error when fields are different', () => {
      const data = mockData('10,000 sf', '12,000 sf', '10,000 sf');
      const result = checkSiteSizesConsistency('Total Site Size', '12,000 sf', data);
      expect(result).toEqual({
        isError: true,
        message: "Values for 'Site Size in sales grid' (10,000 sf), 'Total Site Size' (12,000 sf), and 'Parcel Size' (10,000 sf) must be the same."
      });
    });

    test('should return null for unrelated fields', () => {
      const data = mockData('10,000 sf', '12,000 sf', '10,000 sf');
      const result = checkSiteSizesConsistency('Unrelated Field', '12,000 sf', data);
      expect(result).toBeNull();
    });
  });

  describe('checkVersion1EffectiveDatesConsistency validation rules', () => {
    const mockData = (summaryEffDate, inspDate, costEffDate, reconEffDate) => ({
      'Effective Date of Appraisal': summaryEffDate,
      'Inspection Date': inspDate,
      'Effective Date': costEffDate,
      RECONCILIATION: {
        'Effective Date of Appraisal': reconEffDate
      }
    });

    test('should return null if all fields are blank', () => {
      const data = mockData('', '', '', '');
      const result = checkVersion1EffectiveDatesConsistency('Effective Date of Appraisal', '', data);
      expect(result).toBeNull();
    });

    test('should return isMatch true when all fields are same', () => {
      const data = mockData('06/30/2026', '06/30/2026', '06/30/2026', '06/30/2026');
      const result = checkVersion1EffectiveDatesConsistency('Effective Date of Appraisal', '06/30/2026', data);
      expect(result).toEqual({ isMatch: true });
    });

    test('should return isMatch true when fields are same but formatted differently', () => {
      const data = mockData('06-30-2026', '06/30/2026', '6/30/2026', '06/30/2026');
      const result = checkVersion1EffectiveDatesConsistency('Effective Date of Appraisal', '06-30-2026', data);
      expect(result).toEqual({ isMatch: true });
    });

    test('should return error when fields are different', () => {
      const data = mockData('06/30/2026', '07/01/2026', '06/30/2026', '06/30/2026');
      const result = checkVersion1EffectiveDatesConsistency('Effective Date of Appraisal', '06/30/2026', data);
      expect(result.isError).toBe(true);
      expect(result.message).toContain('Effective Dates must be identical');
    });

    test('should return null for unrelated fields', () => {
      const data = mockData('06/30/2026', '07/01/2026', '06/30/2026', '06/30/2026');
      const result = checkVersion1EffectiveDatesConsistency('Unrelated Field', '06/30/2026', data);
      expect(result).toBeNull();
    });
  });

  describe('checkAboveGradeFinishedAreaConsistency validation rules', () => {
    const mockData = (improvementsArea, salesGridArea) => ({
      'Above Grade Finished Area': improvementsArea,
      Subject: {
        'Finished Area Above Grade': salesGridArea
      }
    });

    test('should return null if any field is blank', () => {
      const data = mockData('', '1,492 Sq. Ft.');
      const result = checkAboveGradeFinishedAreaConsistency('Above Grade Finished Area', '', data);
      expect(result).toBeNull();
    });

    test('should return isMatch true when both areas are same', () => {
      const data = mockData('1,492 Sq. Ft.', '1,492 Sq. Ft.');
      const result = checkAboveGradeFinishedAreaConsistency('Above Grade Finished Area', '1,492 Sq. Ft.', data);
      expect(result).toEqual({ isMatch: true });
    });

    test('should return isMatch true when both areas are same but formatted differently', () => {
      const data = mockData('1492 sf', '1,492 Sq. Ft.');
      const result = checkAboveGradeFinishedAreaConsistency('Above Grade Finished Area', '1492 sf', data);
      expect(result).toEqual({ isMatch: true });
    });

    test('should return error when areas are different', () => {
      const data = mockData('1,500 Sq. Ft.', '1,492 Sq. Ft.');
      const result = checkAboveGradeFinishedAreaConsistency('Above Grade Finished Area', '1,500 Sq. Ft.', data);
      expect(result.isError).toBe(true);
      expect(result.message).toContain('Above Grade Finished Area values must be the same');
    });

    test('should return null for unrelated fields', () => {
      const data = mockData('1,500 Sq. Ft.', '1,492 Sq. Ft.');
      const result = checkAboveGradeFinishedAreaConsistency('Unrelated Field', '1,500 Sq. Ft.', data);
      expect(result).toBeNull();
    });
  });

  describe('checkYearBuiltConsistency validation rules', () => {
    const mockData = (improvementsYear, salesGridYear) => ({
      'Year Built': improvementsYear,
      Subject: {
        'Year Built': salesGridYear
      }
    });

    test('should return null if any field is blank', () => {
      const data = mockData('', '2020');
      const result = checkYearBuiltConsistency('Year Built', '', data);
      expect(result).toBeNull();
    });

    test('should return isMatch true when both years are same', () => {
      const data = mockData('2020', '2020');
      const result = checkYearBuiltConsistency('Year Built', '2020', data);
      expect(result).toEqual({ isMatch: true });
    });

    test('should return error when years are different', () => {
      const data = mockData('2020', '2019');
      const result = checkYearBuiltConsistency('Year Built', '2020', data);
      expect(result.isError).toBe(true);
      expect(result.message).toContain('Year Built values must be the same');
    });

    test('should return null for unrelated fields', () => {
      const data = mockData('2020', '2019');
      const result = checkYearBuiltConsistency('Unrelated Field', '2020', data);
      expect(result).toBeNull();
    });
  });

  describe('checkAppraiserNameConsistency validation rules', () => {
    const mockData = (rootName, certName) => ({
      'Appraiser Name': rootName,
      CERTIFICATION: {
        'Appraiser Name': certName
      }
    });

    test('should return null if any field is blank', () => {
      const data = mockData('', 'John Doe');
      const result = checkAppraiserNameConsistency('Appraiser Name', '', data);
      expect(result).toBeNull();
    });

    test('should return isMatch true when both names are same', () => {
      const data = mockData('John Doe', 'John Doe');
      const result = checkAppraiserNameConsistency('Appraiser Name', 'John Doe', data);
      expect(result).toEqual({ isMatch: true });
    });

    test('should return isMatch true when both names are same with case differences', () => {
      const data = mockData('john doe', 'John Doe');
      const result = checkAppraiserNameConsistency('Appraiser Name', 'john doe', data);
      expect(result).toEqual({ isMatch: true });
    });

    test('should return error when names are different', () => {
      const data = mockData('Jane Doe', 'John Doe');
      const result = checkAppraiserNameConsistency('Appraiser Name', 'Jane Doe', data);
      expect(result.isError).toBe(true);
      expect(result.message).toContain('Appraiser Name must be identical');
    });

    test('should return null for unrelated fields', () => {
      const data = mockData('Jane Doe', 'John Doe');
      const result = checkAppraiserNameConsistency('Unrelated Field', 'Jane Doe', data);
      expect(result).toBeNull();
    });
  });

  describe('checkVersion1ComparableListingStatusConsistency validation rules', () => {
    const mockData = (compStatuses) => {
      const data = {};
      compStatuses.forEach((status, idx) => {
        data[`COMPARABLE SALE #${idx + 1}`] = { 'Listing Status': status };
      });
      return data;
    };

    test('should return null if there is less than two populated values', () => {
      const data = mockData(['Active', '', '']);
      const result = checkVersion1ComparableListingStatusConsistency('Listing Status', 'Active', data);
      expect(result).toBeNull();
    });

    test('should return isMatch true when all populated statuses are same', () => {
      const data = mockData(['Active', 'Active', 'Active']);
      const result = checkVersion1ComparableListingStatusConsistency('Listing Status', 'Active', data);
      expect(result).toEqual({ isMatch: true });
    });

    test('should return isMatch true when all populated statuses are same with case differences', () => {
      const data = mockData(['Active', 'active', 'ACTIVE']);
      const result = checkVersion1ComparableListingStatusConsistency('Listing Status', 'Active', data);
      expect(result).toEqual({ isMatch: true });
    });

    test('should return error when there is a mismatch', () => {
      const data = mockData(['Active', 'Pending', 'Active']);
      const result = checkVersion1ComparableListingStatusConsistency('Listing Status', 'Active', data);
      expect(result.isError).toBe(true);
      expect(result.message).toContain('Listing Status must be the same for all comparables');
    });

    test('should return null for unrelated fields', () => {
      const data = mockData(['Active', 'Pending', 'Active']);
      const result = checkVersion1ComparableListingStatusConsistency('Unrelated Field', 'Active', data);
      expect(result).toBeNull();
    });
  });

  describe('checkVersion1ComparableTransferTermsConsistency validation rules', () => {
    const mockData = (compTerms) => {
      const data = {};
      compTerms.forEach((terms, idx) => {
        data[`COMPARABLE SALE #${idx + 1}`] = { 'Transfer Terms': terms };
      });
      return data;
    };

    test('should return null if there is less than two populated values', () => {
      const data = mockData(['Arm\'s Length', '', '']);
      const result = checkVersion1ComparableTransferTermsConsistency('Transfer Terms', 'Arm\'s Length', data);
      expect(result).toBeNull();
    });

    test('should return isMatch true when all populated transfer terms are same', () => {
      const data = mockData(['Arm\'s Length', 'Arm\'s Length', 'Arm\'s Length']);
      const result = checkVersion1ComparableTransferTermsConsistency('Transfer Terms', 'Arm\'s Length', data);
      expect(result).toEqual({ isMatch: true });
    });

    test('should return isMatch true when all populated transfer terms are same with case differences', () => {
      const data = mockData(['Arm\'s Length', 'arm\'s length', 'ARM\'S LENGTH']);
      const result = checkVersion1ComparableTransferTermsConsistency('Transfer Terms', 'Arm\'s Length', data);
      expect(result).toEqual({ isMatch: true });
    });

    test('should return error when there is a mismatch', () => {
      const data = mockData(['Arm\'s Length', 'Non-Arm\'s Length', 'Arm\'s Length']);
      const result = checkVersion1ComparableTransferTermsConsistency('Transfer Terms', 'Arm\'s Length', data);
      expect(result.isError).toBe(true);
      expect(result.message).toContain('Transfer Terms must be the same for all comparables');
    });

    test('should return null for unrelated fields', () => {
      const data = mockData(['Arm\'s Length', 'Non-Arm\'s Length', 'Arm\'s Length']);
      const result = checkVersion1ComparableTransferTermsConsistency('Unrelated Field', 'Arm\'s Length', data);
      expect(result).toBeNull();
    });
  });

  describe('checkVersion1YearBuiltAdjustmentConsistency validation rules', () => {
    const mockData = (subjectYear, compYear, adjustment) => ({
      Subject: {
        'Year Built': subjectYear
      },
      'COMPARABLE SALE #1': {
        'Year Built': compYear,
        'Year Built Adjustment': adjustment
      }
    });

    test('should return null if subject Year Built is blank', () => {
      const data = mockData('', '2020', '');
      const result = checkVersion1YearBuiltAdjustmentConsistency('Year Built', '2020', data, ['COMPARABLE SALE #1', 'Year Built'], 'COMPARABLE SALE #1');
      expect(result).toBeNull();
    });

    test('should return null if comp Year Built is blank', () => {
      const data = mockData('2020', '', '');
      const result = checkVersion1YearBuiltAdjustmentConsistency('Year Built', '', data, ['COMPARABLE SALE #1', 'Year Built'], 'COMPARABLE SALE #1');
      expect(result).toBeNull();
    });

    test('should return isMatch true when subject and comp Year Built are same', () => {
      const data = mockData('2020', '2020', '');
      const result = checkVersion1YearBuiltAdjustmentConsistency('Year Built', '2020', data, ['COMPARABLE SALE #1', 'Year Built'], 'COMPARABLE SALE #1');
      expect(result).toEqual({ isMatch: true });
    });

    test('should return isMatch true when subject and comp Year Built are different and adjustment is present', () => {
      const data = mockData('2020', '2015', '$5,000');
      const result = checkVersion1YearBuiltAdjustmentConsistency('Year Built', '2015', data, ['COMPARABLE SALE #1', 'Year Built'], 'COMPARABLE SALE #1');
      expect(result).toEqual({ isMatch: true });
    });

    test('should return error when subject and comp Year Built are different and adjustment is missing', () => {
      const data = mockData('2020', '2015', '');
      const result = checkVersion1YearBuiltAdjustmentConsistency('Year Built', '2015', data, ['COMPARABLE SALE #1', 'Year Built'], 'COMPARABLE SALE #1');
      expect(result.isError).toBe(true);
      expect(result.message).toContain('differs from Subject Year Built');
    });

    test('should return isMatch true when subject and comp Year Built are different and adjustment is zero', () => {
      const data = mockData('2020', '2015', '0');
      const result = checkVersion1YearBuiltAdjustmentConsistency('Year Built', '2015', data, ['COMPARABLE SALE #1', 'Year Built'], 'COMPARABLE SALE #1');
      expect(result).toEqual({ isMatch: true });
    });

    test('should return null for unrelated fields', () => {
      const data = mockData('2020', '2015', '');
      const result = checkVersion1YearBuiltAdjustmentConsistency('Unrelated Field', '2015', data, ['COMPARABLE SALE #1', 'Unrelated Field'], 'COMPARABLE SALE #1');
      expect(result).toBeNull();
    });
  });

  describe('checkVersion1ConstructionMethodAdjustmentConsistency validation rules', () => {
    const mockData = (subjectMethod, compMethod, adjustment) => ({
      Subject: {
        'Construction Method': subjectMethod
      },
      'COMPARABLE SALE #1': {
        'Construction Method': compMethod,
        'Construction Method Adjustment': adjustment
      }
    });

    test('should return null if subject Construction Method is blank', () => {
      const data = mockData('', 'Modular', '');
      const result = checkVersion1ConstructionMethodAdjustmentConsistency('Construction Method', 'Modular', data, ['COMPARABLE SALE #1', 'Construction Method'], 'COMPARABLE SALE #1');
      expect(result).toBeNull();
    });

    test('should return null if comp Construction Method is blank', () => {
      const data = mockData('Modular', '', '');
      const result = checkVersion1ConstructionMethodAdjustmentConsistency('Construction Method', '', data, ['COMPARABLE SALE #1', 'Construction Method'], 'COMPARABLE SALE #1');
      expect(result).toBeNull();
    });

    test('should return isMatch true when subject and comp Construction Method are same', () => {
      const data = mockData('Modular', 'Modular', '');
      const result = checkVersion1ConstructionMethodAdjustmentConsistency('Construction Method', 'Modular', data, ['COMPARABLE SALE #1', 'Construction Method'], 'COMPARABLE SALE #1');
      expect(result).toEqual({ isMatch: true });
    });

    test('should return isMatch true when subject and comp Construction Method are different and adjustment is present', () => {
      const data = mockData('Modular', 'Manufactured', '$5,000');
      const result = checkVersion1ConstructionMethodAdjustmentConsistency('Construction Method', 'Manufactured', data, ['COMPARABLE SALE #1', 'Construction Method'], 'COMPARABLE SALE #1');
      expect(result).toEqual({ isMatch: true });
    });

    test('should return isMatch true when subject and comp Construction Method are different and adjustment is zero', () => {
      const data = mockData('Modular', 'Manufactured', '0');
      const result = checkVersion1ConstructionMethodAdjustmentConsistency('Construction Method', 'Manufactured', data, ['COMPARABLE SALE #1', 'Construction Method'], 'COMPARABLE SALE #1');
      expect(result).toEqual({ isMatch: true });
    });

    test('should return error when subject and comp Construction Method are different and adjustment is missing', () => {
      const data = mockData('Modular', 'Manufactured', '');
      const result = checkVersion1ConstructionMethodAdjustmentConsistency('Construction Method', 'Manufactured', data, ['COMPARABLE SALE #1', 'Construction Method'], 'COMPARABLE SALE #1');
      expect(result.isError).toBe(true);
      expect(result.message).toContain('differs from Subject Construction Method');
    });

    test('should return null for unrelated fields', () => {
      const data = mockData('Modular', 'Manufactured', '');
      const result = checkVersion1ConstructionMethodAdjustmentConsistency('Unrelated Field', 'Manufactured', data, ['COMPARABLE SALE #1', 'Unrelated Field'], 'COMPARABLE SALE #1');
      expect(result).toBeNull();
    });
  });

  describe('checkVersion1SiteSizeAdjustmentConsistency validation rules', () => {
    const mockData = (subjectSize, compSize, adjustment) => ({
      Subject: {
        'Site Size': subjectSize
      },
      'COMPARABLE SALE #1': {
        'Site Size': compSize,
        'Site Size Adjustment': adjustment
      }
    });

    test('should return null if subject Site Size is blank', () => {
      const data = mockData('', '10,000 sf', '');
      const result = checkVersion1SiteSizeAdjustmentConsistency('Site Size', '10,000 sf', data, ['COMPARABLE SALE #1', 'Site Size'], 'COMPARABLE SALE #1');
      expect(result).toBeNull();
    });

    test('should return null if comp Site Size is blank', () => {
      const data = mockData('10,000 sf', '', '');
      const result = checkVersion1SiteSizeAdjustmentConsistency('Site Size', '', data, ['COMPARABLE SALE #1', 'Site Size'], 'COMPARABLE SALE #1');
      expect(result).toBeNull();
    });

    test('should return isMatch true when subject and comp Site Size are same', () => {
      const data = mockData('10,000 sf', '10,000 sf', '');
      const result = checkVersion1SiteSizeAdjustmentConsistency('Site Size', '10,000 sf', data, ['COMPARABLE SALE #1', 'Site Size'], 'COMPARABLE SALE #1');
      expect(result).toEqual({ isMatch: true });
    });

    test('should return isMatch true when subject and comp Site Size are different and adjustment is present', () => {
      const data = mockData('10,000 sf', '12,000 sf', '$5,000');
      const result = checkVersion1SiteSizeAdjustmentConsistency('Site Size', '12,000 sf', data, ['COMPARABLE SALE #1', 'Site Size'], 'COMPARABLE SALE #1');
      expect(result).toEqual({ isMatch: true });
    });

    test('should return isMatch true when subject and comp Site Size are different and adjustment is zero', () => {
      const data = mockData('10,000 sf', '12,000 sf', '0');
      const result = checkVersion1SiteSizeAdjustmentConsistency('Site Size', '12,000 sf', data, ['COMPARABLE SALE #1', 'Site Size'], 'COMPARABLE SALE #1');
      expect(result).toEqual({ isMatch: true });
    });

    test('should return error when subject and comp Site Size are different and adjustment is missing', () => {
      const data = mockData('10,000 sf', '12,000 sf', '');
      const result = checkVersion1SiteSizeAdjustmentConsistency('Site Size', '12,000 sf', data, ['COMPARABLE SALE #1', 'Site Size'], 'COMPARABLE SALE #1');
      expect(result.isError).toBe(true);
      expect(result.message).toContain('differs from Subject Site Size');
    });

    test('should return null for unrelated fields', () => {
      const data = mockData('10,000 sf', '12,000 sf', '');
      const result = checkVersion1SiteSizeAdjustmentConsistency('Unrelated Field', '12,000 sf', data, ['COMPARABLE SALE #1', 'Unrelated Field'], 'COMPARABLE SALE #1');
      expect(result).toBeNull();
    });
  });

  describe('checkVersion1LocationAdjustmentConsistency validation rules', () => {
    const mockData = (subjectLoc, compLoc, adjustment) => ({
      Subject: {
        'Site Influence (Location)': subjectLoc
      },
      'COMPARABLE SALE #1': {
        'Site Influence (Location)': compLoc,
        'Location Adjustment': adjustment
      }
    });

    test('should return null if subject Location is blank', () => {
      const data = mockData('', 'Suburban', '');
      const result = checkVersion1LocationAdjustmentConsistency('Site Influence (Location)', 'Suburban', data, ['COMPARABLE SALE #1', 'Site Influence (Location)'], 'COMPARABLE SALE #1');
      expect(result).toBeNull();
    });

    test('should return null if comp Location is blank', () => {
      const data = mockData('Suburban', '', '');
      const result = checkVersion1LocationAdjustmentConsistency('Site Influence (Location)', '', data, ['COMPARABLE SALE #1', 'Site Influence (Location)'], 'COMPARABLE SALE #1');
      expect(result).toBeNull();
    });

    test('should return isMatch true when subject and comp Location are same', () => {
      const data = mockData('Suburban', 'Suburban', '');
      const result = checkVersion1LocationAdjustmentConsistency('Site Influence (Location)', 'Suburban', data, ['COMPARABLE SALE #1', 'Site Influence (Location)'], 'COMPARABLE SALE #1');
      expect(result).toEqual({ isMatch: true });
    });

    test('should return isMatch true when subject and comp Location are same with case differences', () => {
      const data = mockData('Suburban', 'suburban', '');
      const result = checkVersion1LocationAdjustmentConsistency('Site Influence (Location)', 'suburban', data, ['COMPARABLE SALE #1', 'Site Influence (Location)'], 'COMPARABLE SALE #1');
      expect(result).toEqual({ isMatch: true });
    });

    test('should return isMatch true when subject and comp Location are different and adjustment is present', () => {
      const data = mockData('Suburban', 'Urban', '$5,000');
      const result = checkVersion1LocationAdjustmentConsistency('Site Influence (Location)', 'Urban', data, ['COMPARABLE SALE #1', 'Site Influence (Location)'], 'COMPARABLE SALE #1');
      expect(result).toEqual({ isMatch: true });
    });

    test('should return isMatch true when subject and comp Location are different and adjustment is zero', () => {
      const data = mockData('Suburban', 'Urban', '0');
      const result = checkVersion1LocationAdjustmentConsistency('Site Influence (Location)', 'Urban', data, ['COMPARABLE SALE #1', 'Site Influence (Location)'], 'COMPARABLE SALE #1');
      expect(result).toEqual({ isMatch: true });
    });

    test('should return error when subject and comp Location are different and adjustment is missing', () => {
      const data = mockData('Suburban', 'Urban', '');
      const result = checkVersion1LocationAdjustmentConsistency('Site Influence (Location)', 'Urban', data, ['COMPARABLE SALE #1', 'Site Influence (Location)'], 'COMPARABLE SALE #1');
      expect(result.isError).toBe(true);
      expect(result.message).toContain('differs from Subject Location');
    });

    test('should return null for unrelated fields', () => {
      const data = mockData('Suburban', 'Urban', '');
      const result = checkVersion1LocationAdjustmentConsistency('Unrelated Field', 'Urban', data, ['COMPARABLE SALE #1', 'Unrelated Field'], 'COMPARABLE SALE #1');
      expect(result).toBeNull();
    });
  });

  describe('checkVersion1AttachedDetachedAdjustmentConsistency validation rules', () => {
    const mockData = (subjectVal, compVal, adjustment) => ({
      Subject: {
        'Attached / Detached': subjectVal
      },
      'COMPARABLE SALE #1': {
        'Attached / Detached': compVal,
        'Attached / Detached Adjustment': adjustment
      }
    });

    test('should return null if subject Attached/Detached is blank', () => {
      const data = mockData('', 'Detached', '');
      const result = checkVersion1AttachedDetachedAdjustmentConsistency('Attached / Detached', 'Detached', data, ['COMPARABLE SALE #1', 'Attached / Detached'], 'COMPARABLE SALE #1');
      expect(result).toBeNull();
    });

    test('should return null if comp Attached/Detached is blank', () => {
      const data = mockData('Detached', '', '');
      const result = checkVersion1AttachedDetachedAdjustmentConsistency('Attached / Detached', '', data, ['COMPARABLE SALE #1', 'Attached / Detached'], 'COMPARABLE SALE #1');
      expect(result).toBeNull();
    });

    test('should return isMatch true when subject and comp Attached/Detached are same', () => {
      const data = mockData('Detached', 'Detached', '');
      const result = checkVersion1AttachedDetachedAdjustmentConsistency('Attached / Detached', 'Detached', data, ['COMPARABLE SALE #1', 'Attached / Detached'], 'COMPARABLE SALE #1');
      expect(result).toEqual({ isMatch: true });
    });

    test('should return isMatch true when subject and comp Attached/Detached are same with case differences', () => {
      const data = mockData('Detached', 'detached', '');
      const result = checkVersion1AttachedDetachedAdjustmentConsistency('Attached / Detached', 'detached', data, ['COMPARABLE SALE #1', 'Attached / Detached'], 'COMPARABLE SALE #1');
      expect(result).toEqual({ isMatch: true });
    });

    test('should return isMatch true when subject and comp Attached/Detached are different and adjustment is present', () => {
      const data = mockData('Detached', 'Attached', '$5,000');
      const result = checkVersion1AttachedDetachedAdjustmentConsistency('Attached / Detached', 'Attached', data, ['COMPARABLE SALE #1', 'Attached / Detached'], 'COMPARABLE SALE #1');
      expect(result).toEqual({ isMatch: true });
    });

    test('should return isMatch true when subject and comp Attached/Detached are different and adjustment is zero', () => {
      const data = mockData('Detached', 'Attached', '0');
      const result = checkVersion1AttachedDetachedAdjustmentConsistency('Attached / Detached', 'Attached', data, ['COMPARABLE SALE #1', 'Attached / Detached'], 'COMPARABLE SALE #1');
      expect(result).toEqual({ isMatch: true });
    });

    test('should return error when subject and comp Attached/Detached are different and adjustment is missing', () => {
      const data = mockData('Detached', 'Attached', '');
      const result = checkVersion1AttachedDetachedAdjustmentConsistency('Attached / Detached', 'Attached', data, ['COMPARABLE SALE #1', 'Attached / Detached'], 'COMPARABLE SALE #1');
      expect(result.isError).toBe(true);
      expect(result.message).toContain('differs from Subject Attached/Detached');
    });

    test('should return null for unrelated fields', () => {
      const data = mockData('Detached', 'Attached', '');
      const result = checkVersion1AttachedDetachedAdjustmentConsistency('Unrelated Field', 'Attached', data, ['COMPARABLE SALE #1', 'Unrelated Field'], 'COMPARABLE SALE #1');
      expect(result).toBeNull();
    });
  });

  describe('checkVersion1HeatingAdjustmentConsistency validation rules', () => {
    const mockData = (subjectVal, compVal, adjustment) => ({
      Subject: {
        'Heating': subjectVal
      },
      'COMPARABLE SALE #1': {
        'Heating': compVal,
        'Heating Adjustment': adjustment
      }
    });

    test('should return null if subject Heating is blank', () => {
      const data = mockData('', 'Forced Air', '');
      const result = checkVersion1HeatingAdjustmentConsistency('Heating', 'Forced Air', data, ['COMPARABLE SALE #1', 'Heating'], 'COMPARABLE SALE #1');
      expect(result).toBeNull();
    });

    test('should return null if comp Heating is blank', () => {
      const data = mockData('Forced Air', '', '');
      const result = checkVersion1HeatingAdjustmentConsistency('Heating', '', data, ['COMPARABLE SALE #1', 'Heating'], 'COMPARABLE SALE #1');
      expect(result).toBeNull();
    });

    test('should return isMatch true when subject and comp Heating are same', () => {
      const data = mockData('Forced Air', 'Forced Air', '');
      const result = checkVersion1HeatingAdjustmentConsistency('Heating', 'Forced Air', data, ['COMPARABLE SALE #1', 'Heating'], 'COMPARABLE SALE #1');
      expect(result).toEqual({ isMatch: true });
    });

    test('should return isMatch true when subject and comp Heating are same with case differences', () => {
      const data = mockData('Forced Air', 'forced air', '');
      const result = checkVersion1HeatingAdjustmentConsistency('Heating', 'forced air', data, ['COMPARABLE SALE #1', 'Heating'], 'COMPARABLE SALE #1');
      expect(result).toEqual({ isMatch: true });
    });

    test('should return isMatch true when subject and comp Heating are different and adjustment is present', () => {
      const data = mockData('Forced Air', 'Heat Pump', '$5,000');
      const result = checkVersion1HeatingAdjustmentConsistency('Heating', 'Heat Pump', data, ['COMPARABLE SALE #1', 'Heating'], 'COMPARABLE SALE #1');
      expect(result).toEqual({ isMatch: true });
    });

    test('should return isMatch true when subject and comp Heating are different and adjustment is zero', () => {
      const data = mockData('Forced Air', 'Heat Pump', '0');
      const result = checkVersion1HeatingAdjustmentConsistency('Heating', 'Heat Pump', data, ['COMPARABLE SALE #1', 'Heating'], 'COMPARABLE SALE #1');
      expect(result).toEqual({ isMatch: true });
    });

    test('should return error when subject and comp Heating are different and adjustment is missing', () => {
      const data = mockData('Forced Air', 'Heat Pump', '');
      const result = checkVersion1HeatingAdjustmentConsistency('Heating', 'Heat Pump', data, ['COMPARABLE SALE #1', 'Heating'], 'COMPARABLE SALE #1');
      expect(result.isError).toBe(true);
      expect(result.message).toContain('differs from Subject Heating');
    });

    test('should return null for unrelated fields', () => {
      const data = mockData('Forced Air', 'Heat Pump', '');
      const result = checkVersion1HeatingAdjustmentConsistency('Unrelated Field', 'Heat Pump', data, ['COMPARABLE SALE #1', 'Unrelated Field'], 'COMPARABLE SALE #1');
      expect(result).toBeNull();
    });
  });

  describe('checkVersion1AmenitiesAdjustmentConsistency validation rules', () => {
    const mockData = (subjectVal, compVal, adjustment) => ({
      Subject: {
        'Amenities': subjectVal
      },
      'COMPARABLE SALE #1': {
        'Amenities': compVal,
        'Amenities Adjustment': adjustment
      }
    });

    test('should return null if subject Amenities is blank', () => {
      const data = mockData('', 'Deck, Patio', '');
      const result = checkVersion1AmenitiesAdjustmentConsistency('Amenities', 'Deck, Patio', data, ['COMPARABLE SALE #1', 'Amenities'], 'COMPARABLE SALE #1');
      expect(result).toBeNull();
    });

    test('should return null if comp Amenities is blank', () => {
      const data = mockData('Deck, Patio', '', '');
      const result = checkVersion1AmenitiesAdjustmentConsistency('Amenities', '', data, ['COMPARABLE SALE #1', 'Amenities'], 'COMPARABLE SALE #1');
      expect(result).toBeNull();
    });

    test('should return isMatch true when subject and comp Amenities are same', () => {
      const data = mockData('Deck, Patio', 'Deck, Patio', '');
      const result = checkVersion1AmenitiesAdjustmentConsistency('Amenities', 'Deck, Patio', data, ['COMPARABLE SALE #1', 'Amenities'], 'COMPARABLE SALE #1');
      expect(result).toEqual({ isMatch: true });
    });

    test('should return isMatch true when subject and comp Amenities are same with case differences', () => {
      const data = mockData('Deck, Patio', 'deck, patio', '');
      const result = checkVersion1AmenitiesAdjustmentConsistency('Amenities', 'deck, patio', data, ['COMPARABLE SALE #1', 'Amenities'], 'COMPARABLE SALE #1');
      expect(result).toEqual({ isMatch: true });
    });

    test('should return isMatch true when subject and comp Amenities are different and adjustment is present', () => {
      const data = mockData('Deck, Patio', 'None', '$5,000');
      const result = checkVersion1AmenitiesAdjustmentConsistency('Amenities', 'None', data, ['COMPARABLE SALE #1', 'Amenities'], 'COMPARABLE SALE #1');
      expect(result).toEqual({ isMatch: true });
    });

    test('should return isMatch true when subject and comp Amenities are different and adjustment is zero', () => {
      const data = mockData('Deck, Patio', 'None', '0');
      const result = checkVersion1AmenitiesAdjustmentConsistency('Amenities', 'None', data, ['COMPARABLE SALE #1', 'Amenities'], 'COMPARABLE SALE #1');
      expect(result).toEqual({ isMatch: true });
    });

    test('should return error when subject and comp Amenities are different and adjustment is missing', () => {
      const data = mockData('Deck, Patio', 'None', '');
      const result = checkVersion1AmenitiesAdjustmentConsistency('Amenities', 'None', data, ['COMPARABLE SALE #1', 'Amenities'], 'COMPARABLE SALE #1');
      expect(result.isError).toBe(true);
      expect(result.message).toContain('differs from Subject Amenities');
    });

    test('should return null for unrelated fields', () => {
      const data = mockData('Deck, Patio', 'None', '');
      const result = checkVersion1AmenitiesAdjustmentConsistency('Unrelated Field', 'None', data, ['COMPARABLE SALE #1', 'Unrelated Field'], 'COMPARABLE SALE #1');
      expect(result).toBeNull();
    });
  });

  describe('checkVersion1QualityConditionConsistency validation rules', () => {
    const mockData = (subjectVal, compVal) => ({
      Subject: {
        'Exterior Quality': subjectVal
      },
      'COMPARABLE SALE #1': {
        'Exterior Quality': compVal
      }
    });

    test('should return null if subject Exterior Quality is blank', () => {
      const data = mockData('', 'Average');
      const result = checkVersion1QualityConditionConsistency('Exterior Quality', 'Average', data, ['COMPARABLE SALE #1', 'Exterior Quality'], 'COMPARABLE SALE #1');
      expect(result).toBeNull();
    });

    test('should return null if comp Exterior Quality is blank', () => {
      const data = mockData('Average', '');
      const result = checkVersion1QualityConditionConsistency('Exterior Quality', '', data, ['COMPARABLE SALE #1', 'Exterior Quality'], 'COMPARABLE SALE #1');
      expect(result).toBeNull();
    });

    test('should return isMatch true when subject and comp Exterior Quality are same', () => {
      const data = mockData('Average', 'Average');
      const result = checkVersion1QualityConditionConsistency('Exterior Quality', 'Average', data, ['COMPARABLE SALE #1', 'Exterior Quality'], 'COMPARABLE SALE #1');
      expect(result).toEqual({ isMatch: true });
    });

    test('should return isMatch true when subject and comp Exterior Quality are same with case differences', () => {
      const data = mockData('Average', 'average');
      const result = checkVersion1QualityConditionConsistency('Exterior Quality', 'average', data, ['COMPARABLE SALE #1', 'Exterior Quality'], 'COMPARABLE SALE #1');
      expect(result).toEqual({ isMatch: true });
    });

    test('should return error when subject and comp Exterior Quality are different', () => {
      const data = mockData('Average', 'Good');
      const result = checkVersion1QualityConditionConsistency('Exterior Quality', 'Good', data, ['COMPARABLE SALE #1', 'Exterior Quality'], 'COMPARABLE SALE #1');
      expect(result.isError).toBe(true);
      expect(result.message).toContain('differs from Subject Exterior Quality');
    });

    test('should return null for unrelated fields', () => {
      const data = mockData('Average', 'Good');
      const result = checkVersion1QualityConditionConsistency('Unrelated Field', 'Good', data, ['COMPARABLE SALE #1', 'Unrelated Field'], 'COMPARABLE SALE #1');
      expect(result).toBeNull();
    });
  });

  describe('checkVersion1AreaAdjustmentConsistency validation rules', () => {
    const mockData = (subjectVal, compVal, adjustment) => ({
      Subject: {
        'Finished Area Above Grade': subjectVal
      },
      'COMPARABLE SALE #1': {
        'Finished Area Above Grade': compVal,
        'Finished Area Above Grade Adjustment': adjustment
      }
    });

    test('should return null if subject area is blank', () => {
      const data = mockData('', '1,500', '');
      const result = checkVersion1AreaAdjustmentConsistency('Finished Area Above Grade', '1,500', data, ['COMPARABLE SALE #1', 'Finished Area Above Grade'], 'COMPARABLE SALE #1');
      expect(result).toBeNull();
    });

    test('should return null if comp area is blank', () => {
      const data = mockData('1,500', '', '');
      const result = checkVersion1AreaAdjustmentConsistency('Finished Area Above Grade', '', data, ['COMPARABLE SALE #1', 'Finished Area Above Grade'], 'COMPARABLE SALE #1');
      expect(result).toBeNull();
    });

    test('should return isMatch true when subject and comp area are same', () => {
      const data = mockData('1,500', '1,500', '');
      const result = checkVersion1AreaAdjustmentConsistency('Finished Area Above Grade', '1,500', data, ['COMPARABLE SALE #1', 'Finished Area Above Grade'], 'COMPARABLE SALE #1');
      expect(result).toEqual({ isMatch: true });
    });

    test('should return isMatch true when subject and comp area are numerically same but formatted differently', () => {
      const data = mockData('1,500 sq ft', '1500', '');
      const result = checkVersion1AreaAdjustmentConsistency('Finished Area Above Grade', '1500', data, ['COMPARABLE SALE #1', 'Finished Area Above Grade'], 'COMPARABLE SALE #1');
      expect(result).toEqual({ isMatch: true });
    });

    test('should return isMatch true when subject and comp area are different and adjustment is present', () => {
      const data = mockData('1,500', '1,600', '$5,000');
      const result = checkVersion1AreaAdjustmentConsistency('Finished Area Above Grade', '1,600', data, ['COMPARABLE SALE #1', 'Finished Area Above Grade'], 'COMPARABLE SALE #1');
      expect(result).toEqual({ isMatch: true });
    });

    test('should return isMatch true when subject and comp area are different and adjustment is zero', () => {
      const data = mockData('1,500', '1,600', '0');
      const result = checkVersion1AreaAdjustmentConsistency('Finished Area Above Grade', '1,600', data, ['COMPARABLE SALE #1', 'Finished Area Above Grade'], 'COMPARABLE SALE #1');
      expect(result).toEqual({ isMatch: true });
    });

    test('should return error when subject and comp area are different and adjustment is missing', () => {
      const data = mockData('1,500', '1,600', '');
      const result = checkVersion1AreaAdjustmentConsistency('Finished Area Above Grade', '1,600', data, ['COMPARABLE SALE #1', 'Finished Area Above Grade'], 'COMPARABLE SALE #1');
      expect(result.isError).toBe(true);
      expect(result.message).toContain('GLA / GBA (\'1,600\') differs from Subject GLA / GBA (\'1,500\')');
    });

    test('should return null for unrelated fields', () => {
      const data = mockData('1,500', '1,600', '');
      const result = checkVersion1AreaAdjustmentConsistency('Unrelated Field', '1,600', data, ['COMPARABLE SALE #1', 'Unrelated Field'], 'COMPARABLE SALE #1');
      expect(result).toBeNull();
    });
  });

  describe('checkVersion1OverallQualityConditionAdjustmentConsistency validation rules', () => {
    const mockData = (subjectVal, compVal, adjustment) => ({
      Subject: {
        'Overall Quality': subjectVal
      },
      'COMPARABLE SALE #1': {
        'Overall Quality': compVal,
        'Overall Quality Adjustment': adjustment
      }
    });

    test('should return null if subject Overall Quality is blank', () => {
      const data = mockData('', 'Q3', '');
      const result = checkVersion1OverallQualityConditionAdjustmentConsistency('Overall Quality', 'Q3', data, ['COMPARABLE SALE #1', 'Overall Quality'], 'COMPARABLE SALE #1');
      expect(result).toBeNull();
    });

    test('should return null if comp Overall Quality is blank', () => {
      const data = mockData('Q3', '', '');
      const result = checkVersion1OverallQualityConditionAdjustmentConsistency('Overall Quality', '', data, ['COMPARABLE SALE #1', 'Overall Quality'], 'COMPARABLE SALE #1');
      expect(result).toBeNull();
    });

    test('should return isMatch true when subject and comp Overall Quality are same', () => {
      const data = mockData('Q3', 'Q3', '');
      const result = checkVersion1OverallQualityConditionAdjustmentConsistency('Overall Quality', 'Q3', data, ['COMPARABLE SALE #1', 'Overall Quality'], 'COMPARABLE SALE #1');
      expect(result).toEqual({ isMatch: true });
    });

    test('should return isMatch true when subject and comp Overall Quality are same with case differences', () => {
      const data = mockData('Q3', 'q3', '');
      const result = checkVersion1OverallQualityConditionAdjustmentConsistency('Overall Quality', 'q3', data, ['COMPARABLE SALE #1', 'Overall Quality'], 'COMPARABLE SALE #1');
      expect(result).toEqual({ isMatch: true });
    });

    test('should return isMatch true when subject and comp Overall Quality are different and adjustment is present', () => {
      const data = mockData('Q3', 'Q4', '$5,000');
      const result = checkVersion1OverallQualityConditionAdjustmentConsistency('Overall Quality', 'Q4', data, ['COMPARABLE SALE #1', 'Overall Quality'], 'COMPARABLE SALE #1');
      expect(result).toEqual({ isMatch: true });
    });

    test('should return isMatch true when subject and comp Overall Quality are different and adjustment is zero', () => {
      const data = mockData('Q3', 'Q4', '0');
      const result = checkVersion1OverallQualityConditionAdjustmentConsistency('Overall Quality', 'Q4', data, ['COMPARABLE SALE #1', 'Overall Quality'], 'COMPARABLE SALE #1');
      expect(result).toEqual({ isMatch: true });
    });

    test('should return error when subject and comp Overall Quality are different and adjustment is missing', () => {
      const data = mockData('Q3', 'Q4', '');
      const result = checkVersion1OverallQualityConditionAdjustmentConsistency('Overall Quality', 'Q4', data, ['COMPARABLE SALE #1', 'Overall Quality'], 'COMPARABLE SALE #1');
      expect(result.isError).toBe(true);
      expect(result.message).toContain('differs from Subject Overall Quality');
    });

    test('should return null for unrelated fields', () => {
      const data = mockData('Q3', 'Q4', '');
      const result = checkVersion1OverallQualityConditionAdjustmentConsistency('Unrelated Field', 'Q4', data, ['COMPARABLE SALE #1', 'Unrelated Field'], 'COMPARABLE SALE #1');
      expect(result).toBeNull();
    });
  });

  describe('checkVersion1VehicleStorageAdjustmentConsistency validation rules', () => {
    const mockData = (subjectType, compType, subjectSpaces, compSpaces, adjustment) => ({
      Subject: {
        'Vehicle Storage Type': subjectType,
        'Vehicle Storage Spaces': subjectSpaces
      },
      'COMPARABLE SALE #1': {
        'Vehicle Storage Type': compType,
        'Vehicle Storage Spaces': compSpaces,
        'Vehicle Storage Adjustment': adjustment
      }
    });

    test('should return null if subject fields are blank', () => {
      const data = mockData('', 'Garage', '2', '2', '');
      const result = checkVersion1VehicleStorageAdjustmentConsistency('Vehicle Storage Type', 'Garage', data, ['COMPARABLE SALE #1', 'Vehicle Storage Type'], 'COMPARABLE SALE #1');
      expect(result).toBeNull();
    });

    test('should return null if comp fields are blank', () => {
      const data = mockData('Garage', '', '2', '2', '');
      const result = checkVersion1VehicleStorageAdjustmentConsistency('Vehicle Storage Type', '', data, ['COMPARABLE SALE #1', 'Vehicle Storage Type'], 'COMPARABLE SALE #1');
      expect(result).toBeNull();
    });

    test('should return isMatch true when subject and comp fields are same', () => {
      const data = mockData('Garage', 'Garage', '2', '2', '');
      const result = checkVersion1VehicleStorageAdjustmentConsistency('Vehicle Storage Type', 'Garage', data, ['COMPARABLE SALE #1', 'Vehicle Storage Type'], 'COMPARABLE SALE #1');
      expect(result).toEqual({ isMatch: true });
    });

    test('should return isMatch true when subject and comp fields are same with case differences', () => {
      const data = mockData('Garage', 'garage', '2', '2', '');
      const result = checkVersion1VehicleStorageAdjustmentConsistency('Vehicle Storage Type', 'garage', data, ['COMPARABLE SALE #1', 'Vehicle Storage Type'], 'COMPARABLE SALE #1');
      expect(result).toEqual({ isMatch: true });
    });

    test('should return isMatch true when subject and comp fields are different and adjustment is present', () => {
      const data = mockData('Garage', 'Carport', '2', '2', '$5,000');
      const result = checkVersion1VehicleStorageAdjustmentConsistency('Vehicle Storage Type', 'Carport', data, ['COMPARABLE SALE #1', 'Vehicle Storage Type'], 'COMPARABLE SALE #1');
      expect(result).toEqual({ isMatch: true });
    });

    test('should return isMatch true when subject and comp fields are different and adjustment is zero', () => {
      const data = mockData('Garage', 'Garage', '2', '1', '0');
      const result = checkVersion1VehicleStorageAdjustmentConsistency('Vehicle Storage Spaces', '1', data, ['COMPARABLE SALE #1', 'Vehicle Storage Spaces'], 'COMPARABLE SALE #1');
      expect(result).toEqual({ isMatch: true });
    });

    test('should return error when subject and comp fields are different and adjustment is missing', () => {
      const data = mockData('Garage', 'Carport', '2', '2', '');
      const result = checkVersion1VehicleStorageAdjustmentConsistency('Vehicle Storage Type', 'Carport', data, ['COMPARABLE SALE #1', 'Vehicle Storage Type'], 'COMPARABLE SALE #1');
      expect(result.isError).toBe(true);
      expect(result.message).toContain('Vehicle Storage Type');
    });

    test('should return null for unrelated fields', () => {
      const data = mockData('Garage', 'Carport', '2', '2', '');
      const result = checkVersion1VehicleStorageAdjustmentConsistency('Unrelated Field', 'Carport', data, ['COMPARABLE SALE #1', 'Unrelated Field'], 'COMPARABLE SALE #1');
      expect(result).toBeNull();
    });
  });
});
