import React from 'react';
import { checkContractFieldsMandatory, checkFinancialAssistanceInconsistency, checkContractAnalysisConsistency, checkYesNoOnly } from '../../../validations/contractValidation';
import { checkTaxYear, checkRETaxes, checkSpecialAssessments, checkPUD, checkHOA, checkHOAFrequency, checkOfferedForSale, checkAnsi, checkFullAddressConsistency, checkPresence, checkAssignmentTypeConsistency, checkSubjectFieldsNotBlank, checkFhaCaseNo, checkOccupancy } from '../../../validations/subjectValidation';
import { checkZoning, checkNonconformingComment, checkZoningDescription, checkSpecificZoningClassification, checkHighestAndBestUse, checkFemaInconsistency, checkFemaFieldsConsistency, checkSiteSectionBlank, checkArea, checkYesNoWithComment, checkUtilities } from '../../../validations/siteValidation';
import { checkVersion1UtilitySubfields, checkZoningClassificationDescription, checkSiteSizesConsistency, checkVersion1EffectiveDatesConsistency, checkAboveGradeFinishedAreaConsistency, checkYearBuiltConsistency, checkAppraiserNameConsistency, checkVersion1ComparableListingStatusConsistency, checkVersion1ComparableTransferTermsConsistency, checkVersion1YearBuiltAdjustmentConsistency, checkVersion1ConstructionMethodAdjustmentConsistency, checkVersion1SiteSizeAdjustmentConsistency, checkVersion1LocationAdjustmentConsistency, checkVersion1AttachedDetachedAdjustmentConsistency, checkVersion1HeatingAdjustmentConsistency, checkVersion1AmenitiesAdjustmentConsistency, checkVersion1QualityConditionConsistency, checkVersion1AreaAdjustmentConsistency, checkVersion1OverallQualityConditionAdjustmentConsistency, checkVersion1VehicleStorageAdjustmentConsistency } from '../Version1/version1Validation';
import { checkHousingPriceAndAge, checkNeighborhoodUsageConsistency, checkSingleChoiceFields, checkNeighborhoodBoundaries, checkNeighborhoodFieldsNotBlank, checkOtherLandUseComment, checkOtherLandUse, checkSearchCriteriaDescription, checkNeighborhoodListPricesConsistency, checkNeighborhoodSalePricesConsistency, checkLocation, checkBuiltUp, checkGrowth, checkPropertyValues, checkDemandSupply } from '../../../validations/neighborhoodValidation';
import { checkUnits, checkAccessoryUnit, checkNumberOfStories, checkPropertyType, checkConstructionStatusAndReconciliation, checkDesignStyle, checkYearBuilt, checkEffectiveAge, checkAdditionalFeatures, checkPropertyConditionDescription, checkPhysicalDeficienciesImprovements, checkNeighborhoodConformity, checkFoundationType, checkBasementDetails, checkEvidenceOf, checkMaterialCondition, checkHeatingFuel, checkCarStorage, checkImprovementsFieldsNotBlank } from '../../../validations/improvementsValidation';
import { checkConditionAdjustment, checkBedroomsAdjustment, checkBathsAdjustment, checkQualityOfConstructionAdjustment, checkProximityToSubject, checkSiteAdjustment, checkGrossLivingAreaAdjustment, checkSubjectAddressInconsistency, checkDesignStyleAdjustment, checkFunctionalUtilityAdjustment, checkEnergyEfficientItemsAdjustment, checkPorchPatioDeckAdjustment, checkHeatingCoolingAdjustment, checkDataSourceDOM, checkActualAgeAdjustment, checkLeaseholdFeeSimpleConsistency, checkDateOfSale, checkLocationConsistency, checkSalePrice, checkSubjectAgeConsistency, checkViewAdjustment } from '../../../validations/salesComparisonValidation';
import { checkFinalValueConsistency, checkCostApproachDeveloped, checkAppraisalCondition, checkAsOfDate, checkFinalValueBracketing, checkReconciliationFieldsNotBlank, checkFiveValuesConsistency, checkEffectiveDatesConsistency, checkPropertyQualityConsistency, checkPropertyConditionConsistency, checkHbuConsistency, checkCostApproachConsistency, checkAttachmentTypeConsistency, checkPropertyRightsConsistency, checkAppraiserCredentialLevelConsistency } from '../../../validations/reconciliationValidation';
import { checkLenderAddressInconsistency, checkLenderNameInconsistency, checkUnpaidLender, checkAppraiserFieldsNotBlank, checkLicenseNumberConsistency as checkAppraiserLicenseConsistency, checkDateGreaterThanToday, checkClientNameHtmlConsistency, checkClientAddressHtmlConsistency, checkBorrowerHtmlConsistency, checkPropertyAddressHtmlConsistency, checkAppraiserVendorNameConsistency, checkSupervisoryAppraiserFields, checkAppraiserLicenseGroup } from '../../../validations/appraiserLenderValidation';
import { checkCostNew, checkSourceOfCostData, checkIndicatedValueByCostApproach, checkCostApproachFieldsNotBlank, checkOpinionOfSiteValue, checkRemainingEconomicLife } from '../../../validations/costApproachValidation';
import { checkResearchHistory, checkSubjectPriorSales, checkComparablePriorSales, checkDataSourceNotBlank, checkEffectiveDateIsCurrentYear, checkSubjectPriorSaleDate, checkCompPriorSaleDate } from '../../../validations/salesHistoryValidation';
import { checkStateRequirements } from '../../../validations/stateValidation';
import { checkLenderAddressInconsistency as checkLenderAddressHtmlInconsistency, checkSubjectLenderNameVsHtml, checkBorrowerNameVsHtml } from '../../../validations/htmldatavaliadtion';
import { checkLeaseDates, checkOtherBasement, checkSubjectMonthlyRental, checkSubjectUtilities, checkSubjectFurniture, checkSubjectAdjustedMonthlyRent } from '../../../validations/rentScheduleValidation';
import { checkIncomeApproachFieldsNotBlank, checkIncomeApproach1007Required, INCOME_APPROACH_1007_REQUIRED_FIELDS } from '../../../validations/incomeApproachValidation';
import { checkPudInformationFieldsNotBlank, checkPudControlAndFees } from '../../../validations/pudInformationValidation';
import { checkMarketConditionsFieldsNotBlank } from '../../../validations/marketConditionsValidation';
import { checkProjectInfoFieldsNotBlank, checkCondoForeclosureFieldsNotBlank } from '../../../validations/form1073Validation';
import { checkProjectAnalysisFieldsNotBlank } from '../../../validations/projectAnalysisValidation';
import { checkUnitDescriptionsFieldsNotBlank } from '../../../validations/unitDescriptionsValidation';
import { checkProjectSiteFieldsNotBlank } from '../../../validations/projectSiteValidation';
import { checkPriorSaleHistoryFieldsNotBlank } from '../../../validations/priorSaleHistoryValidation';
import { checkInfoOfSalesFieldsNotBlank } from '../../../validations/infoOfSalesValidation';
import { Tooltip, IconButton } from '@mui/material';
import { PlaylistAdd as PlaylistAddIcon, CheckCircle as CheckCircleIcon } from '@mui/icons-material';

export const HighlightKeywords = ({ text, keywords }) => {
  if (!keywords || !text) {
    return text;
  }
  const regex = new RegExp(`(${keywords.join('|')})`, 'gi');
  const parts = text.split(regex);

  return (
    <span>
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          <span key={i} style={{ backgroundColor: '#91ff00ff', color: '#000000', padding: '1px 3px', borderRadius: '3px' }}>{part}</span>
        ) : (
          part
        )
      )}
    </span>
  );
};

export const EditableField = ({ fieldPath, value, onDataChange, editingField, setEditingField, usePre, isMissing, inputClassName, inputStyle, valueStyle, isEditable = true, isAdjustment, allData, saleName, manualValidations, handleManualValidation, revisionHandlers = {}, customValidation, showBlankValidation = false, prefix, suffix }) => {
  isMissing = false;
  const [internalEditing, setInternalEditing] = React.useState(false);
  const isFieldEditable = isEditable !== false;
  const isControlled = setEditingField !== undefined;
  const isEditing = isFieldEditable && (
    isControlled
      ? (Boolean(editingField) && JSON.stringify(editingField) === JSON.stringify(fieldPath))
      : internalEditing
  );

  const setEditing = (val) => {
    if (setEditingField) {
      setEditingField(val);
    }
    setInternalEditing(Boolean(val));
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !usePre) {
      setEditing(null);
      if (onDataChange) onDataChange(fieldPath, e.target.value);

    } else if (e.key === 'Escape') {
      setEditing(null);
    }
  };

  const handleContainerClick = () => {
    if (!isEditing && isFieldEditable) {
      setEditing(fieldPath);
    }
  };

  const formTypeVal = allData ? (allData.formType || allData['From Type'] || '') : '';

  const validationRegistry = {
    // Site Validations
    'Zoning Compliance': [checkZoning],
    'Legal Nonconforming (Grandfathered Use) comment': [checkNonconformingComment],
    'Legal Nonconforming comment': [checkNonconformingComment],
    'Nonconforming comment': [checkNonconformingComment],
    'Zoning Compliance comment': [checkNonconformingComment],
    'Zoning Description': [checkZoningDescription],
    'Specific Zoning Classification': [checkSpecificZoningClassification],
    'Zoning Classification Description': [checkZoningClassificationDescription],
    'Classification Code Description': [checkZoningClassificationDescription],
    'Is the highest and best use of subject property as improved (or as proposed per plans and specifications) the present use?': [checkHighestAndBestUse],
    'FEMA Special Flood Hazard Area': [checkFemaInconsistency, checkFemaFieldsConsistency],
    'FEMA Flood Zone': [checkFemaInconsistency, checkFemaFieldsConsistency],
    'FEMA Map #': [checkFemaInconsistency, checkFemaFieldsConsistency],
    'FEMA Map Date': [checkFemaInconsistency, checkFemaFieldsConsistency],
    'Dimensions': [checkSiteSectionBlank],
    'Shape': [checkSiteSectionBlank],
    'View': [checkSiteSectionBlank, checkViewAdjustment], 'View Adjustment': [checkViewAdjustment],
    'Area': [checkArea],

    'Are the utilities and off-site improvements typical for the market area? If No, describe': [(field, text, data) => checkYesNoWithComment(field, text, data, { name: 'Are the utilities and off-site improvements typical for the market area? If No, describe', wantedValue: 'yes', unwantedValue: 'no' })],
    'Are there any adverse site conditions or external factors (easements, encroachments, environmental conditions, land uses, etc.)? If Yes, describe': [(field, text, data) => checkYesNoWithComment(field, text, data, { name: 'Are there any adverse site conditions or external factors (easements, encroachments, environmental conditions, land uses, etc.)? If Yes, describe', wantedValue: 'no', unwantedValue: 'yes' })],
    "Electricity": [checkUtilities], "Gas": [checkUtilities], "Water": [checkUtilities], "Sanitary Sewer": [checkUtilities], "Street": [checkUtilities], "Alley": [checkUtilities],

    'Electricity Detail': [checkVersion1UtilitySubfields],
    'Electricity Private Utility Impact': [checkVersion1UtilitySubfields],
    'Electricity Comment': [checkVersion1UtilitySubfields],
    'Sanitary Sewer Detail': [checkVersion1UtilitySubfields],
    'Sanitary Sewer Private Utility Impact': [checkVersion1UtilitySubfields],
    'Sanitary Sewer Comment': [checkVersion1UtilitySubfields],
    'Water Detail': [checkVersion1UtilitySubfields],
    'Water Private Utility Impact': [checkVersion1UtilitySubfields],
    'Water Comment': [checkVersion1UtilitySubfields],
    'Total Site Size': [checkSiteSizesConsistency],
    'Parcel Size': [checkSiteSizesConsistency],
    'Site Size': [checkSiteSizesConsistency, checkVersion1SiteSizeAdjustmentConsistency],
    'Site Size Adjustment': [checkVersion1SiteSizeAdjustmentConsistency],
    'Above Grade Finished Area': [checkAboveGradeFinishedAreaConsistency],
    'Finished Area Above Grade': [checkAboveGradeFinishedAreaConsistency, checkVersion1AreaAdjustmentConsistency],
    'Finished Area Above Grade Adjustment': [checkVersion1AreaAdjustmentConsistency],
    'Finished Area Below Grade': [checkVersion1AreaAdjustmentConsistency],
    'Finished Area Below Grade Adjustment': [checkVersion1AreaAdjustmentConsistency],
    'Unfinished Area Below Grade': [checkVersion1AreaAdjustmentConsistency],
    'Unfinished Area Below Grade Adjustment': [checkVersion1AreaAdjustmentConsistency],

    // Subject Validations
    'Full Address': [checkFullAddressConsistency],
    'Exposure comment': [checkPresence],
    'Prior service comment': [checkPresence],
    'ADU File Check': [checkPresence],
    'FHA Case No.': [checkFhaCaseNo],
    'FHA Case #': [checkFhaCaseNo],
    'FHA Case Number': [checkFhaCaseNo],
    'Tax Year': [checkTaxYear],
    'R.E. Taxes $': [checkRETaxes],
    'Special Assessments $': [checkSpecialAssessments],
    'PUD': [checkPUD, checkHOA],
    'HOA $': [checkHOA],
    'HOA(per month)': [checkHOAFrequency],
    'HOA (per month)': [checkHOAFrequency],
    'HOA(per year)': [checkHOAFrequency],
    'HOA (per year)': [checkHOAFrequency],
    'Offered for Sale in Last 12 Months': [checkOfferedForSale],
    'ANSI': [checkAnsi],
    'State': [checkStateRequirements],
    'Property Address': [checkSubjectFieldsNotBlank, checkSubjectAddressInconsistency, checkPropertyAddressHtmlConsistency],
    'County': [checkSubjectFieldsNotBlank],
    'Borrower': [checkBorrowerNameVsHtml, checkSubjectFieldsNotBlank],
    'Owner of Public Record': [checkSubjectFieldsNotBlank],
    'Legal Description': [checkSubjectFieldsNotBlank],
    "Assessor's Parcel #": [checkSubjectFieldsNotBlank],
    'Neighborhood Name': [checkSubjectFieldsNotBlank],
    'Map Reference': [checkSubjectFieldsNotBlank],
    'Census Tract': [checkSubjectFieldsNotBlank],
    'Occupant': [checkSubjectFieldsNotBlank, checkOccupancy],
    'Occupancy': [checkOccupancy],
    'Property Rights Appraised': [checkSubjectFieldsNotBlank],
    'Lender/Client': [checkSubjectLenderNameVsHtml, checkLenderNameInconsistency, checkUnpaidLender, checkSubjectFieldsNotBlank],
    'Client/Lender Company Name': [checkUnpaidLender, checkClientNameHtmlConsistency, checkLenderNameInconsistency],
    'Name': [checkAppraiserVendorNameConsistency],
    'Address (Lender/Client)': [checkLenderAddressHtmlInconsistency, checkLenderAddressInconsistency, checkSubjectFieldsNotBlank],

    // Neighborhood Validations
    'one unit housing price(high,low,pred)': [checkHousingPriceAndAge, checkNeighborhoodFieldsNotBlank],
    'one unit housing age(high,low,pred)': [checkHousingPriceAndAge, checkNeighborhoodFieldsNotBlank],
    "One-Unit": [checkNeighborhoodUsageConsistency, checkNeighborhoodFieldsNotBlank],
    "2-4 Unit": [checkNeighborhoodUsageConsistency, checkNeighborhoodFieldsNotBlank],
    "Multi-Family": [checkNeighborhoodUsageConsistency, checkNeighborhoodFieldsNotBlank],
    "Commercial": [checkNeighborhoodUsageConsistency, checkNeighborhoodFieldsNotBlank],
    "Other": [checkOtherLandUseComment, checkNeighborhoodUsageConsistency, checkNeighborhoodFieldsNotBlank],
    "Present Land Use for other": [checkOtherLandUse],
    "Neighborhood Boundaries": [checkNeighborhoodBoundaries, checkNeighborhoodFieldsNotBlank],
    "Built-Up": [checkBuiltUp, checkSingleChoiceFields, checkNeighborhoodFieldsNotBlank], "Growth": [checkGrowth, checkSingleChoiceFields, checkNeighborhoodFieldsNotBlank], "Property Values": [checkPropertyValues, checkSingleChoiceFields, checkNeighborhoodFieldsNotBlank], "Demand/Supply": [checkDemandSupply, checkSingleChoiceFields, checkNeighborhoodFieldsNotBlank], "Marketing Time": [checkSingleChoiceFields, checkNeighborhoodFieldsNotBlank],
    "Neighborhood Description": [checkNeighborhoodFieldsNotBlank],
    "Market Conditions:": [checkNeighborhoodFieldsNotBlank],
    'Legally Permissible': [checkNeighborhoodFieldsNotBlank],
    'Physically Possible': [checkNeighborhoodFieldsNotBlank],
    'Financially Feasible': [checkNeighborhoodFieldsNotBlank],
    'Maximally Productive': [checkNeighborhoodFieldsNotBlank],
    'Highest and Best Use as Improved (Present Use)': [checkNeighborhoodFieldsNotBlank],
    'Highest and Best Use Commentary': [checkNeighborhoodFieldsNotBlank],
    'Market Area Boundary': [checkNeighborhoodFieldsNotBlank],
    'Active Listings': [checkNeighborhoodFieldsNotBlank],
    'Median Days on Market': [checkNeighborhoodFieldsNotBlank],
    'Lowest List Price': [checkNeighborhoodFieldsNotBlank, checkNeighborhoodListPricesConsistency],
    'Median List Price': [checkNeighborhoodFieldsNotBlank, checkNeighborhoodListPricesConsistency],
    'Highest List Price': [checkNeighborhoodFieldsNotBlank, checkNeighborhoodListPricesConsistency],
    'Pending Sales': [checkNeighborhoodFieldsNotBlank],
    'Sales in Past 12 Months': [checkNeighborhoodFieldsNotBlank],
    'Lowest Sale Price': [checkNeighborhoodFieldsNotBlank, checkNeighborhoodSalePricesConsistency],
    'Median Sale Price': [checkNeighborhoodFieldsNotBlank, checkNeighborhoodSalePricesConsistency],
    'Highest Sale Price': [checkNeighborhoodFieldsNotBlank, checkNeighborhoodSalePricesConsistency],
    'Distressed Market Competition': [checkNeighborhoodFieldsNotBlank],
    'Price Trend Source': [checkNeighborhoodFieldsNotBlank],
    'Demand / Supply': [checkDemandSupply, checkSingleChoiceFields, checkNeighborhoodFieldsNotBlank],
    'Market Commentary': [checkNeighborhoodFieldsNotBlank],
    'Search Criteria Description': [checkNeighborhoodFieldsNotBlank, checkSearchCriteriaDescription],
    'Price Trend Analysis Commentary': [checkNeighborhoodFieldsNotBlank],
    'Listing Status': [checkVersion1ComparableListingStatusConsistency],
    'Transfer Terms': [checkVersion1ComparableTransferTermsConsistency],
    'Site Influence (Location)': [checkVersion1LocationAdjustmentConsistency],
    'Attached / Detached': [checkVersion1AttachedDetachedAdjustmentConsistency],
    'Attached / Detached Adjustment': [checkVersion1AttachedDetachedAdjustmentConsistency],
    'Heating': [checkVersion1HeatingAdjustmentConsistency],
    'Heating Adjustment': [checkVersion1HeatingAdjustmentConsistency],
    'Amenities': [checkVersion1AmenitiesAdjustmentConsistency],
    'Amenities Adjustment': [checkVersion1AmenitiesAdjustmentConsistency],


    'Units': [checkUnits, checkAccessoryUnit],
    '# of Stories': [checkNumberOfStories],
    'Type': [checkPropertyType],
    'Existing/Proposed/Under Const.': [checkConstructionStatusAndReconciliation],
    'Design (Style)': [checkDesignStyle, checkDesignStyleAdjustment],
    'Year Built': [checkYearBuilt, checkYearBuiltConsistency, checkVersion1YearBuiltAdjustmentConsistency],
    'Year Built Adjustment': [checkVersion1YearBuiltAdjustmentConsistency],
    'Construction Method': [checkVersion1ConstructionMethodAdjustmentConsistency],
    'Construction Method Adjustment': [checkVersion1ConstructionMethodAdjustmentConsistency],
    'Appraiser Name': [checkAppraiserNameConsistency],
    'Effective Age (Yrs)': [checkEffectiveAge],
    'Additional features': [checkAdditionalFeatures],
    'Describe the condition of the property': [checkPropertyConditionDescription],
    'Are there any physical deficiencies or adverse conditions that affect the livability, soundness, or structural integrity of the property? If Yes, describe': [checkPhysicalDeficienciesImprovements],
    'Does the property generally conform to the neighborhood (functional utility, style, condition, use, construction, etc.)? If No, describe': [checkNeighborhoodConformity],
    'Foundation Type': [checkFoundationType],
    'Basement Area sq.ft.': [checkBasementDetails],
    'Basement Finish %': [checkBasementDetails],
    'Infestation': [checkEvidenceOf], 'Dampness': [checkEvidenceOf], 'Settlement': [checkEvidenceOf],
    'Foundation Walls (Material/Condition)': [checkMaterialCondition], 'Exterior Walls (Material/Condition)': [checkMaterialCondition],
    'Roof Surface (Material/Condition)': [checkMaterialCondition], 'Gutters & Downspouts (Material/Condition)': [checkMaterialCondition],
    'Window Type (Material/Condition)': [checkMaterialCondition], 'Floors (Material/Condition)': [checkMaterialCondition],
    'Walls (Material/Condition)': [checkMaterialCondition],
    'Trim/Finish (Material/Condition)': [checkMaterialCondition],
    'Bath Floor (Material/Condition)': [checkMaterialCondition], 'Bath Wainscot (Material/Condition)': [checkMaterialCondition],
    'Fuel': [checkHeatingFuel, checkImprovementsFieldsNotBlank],
    'Car Storage': [checkCarStorage, checkImprovementsFieldsNotBlank],
    'Attic': [checkImprovementsFieldsNotBlank],
    'Heating Type': [checkImprovementsFieldsNotBlank],
    'Cooling Type': [checkImprovementsFieldsNotBlank],
    'Fireplace(s) #': [checkImprovementsFieldsNotBlank],
    'Patio/Deck': [checkImprovementsFieldsNotBlank],
    'Pool': [checkImprovementsFieldsNotBlank],
    'Woodstove(s) #': [checkImprovementsFieldsNotBlank],
    'Fence': [checkImprovementsFieldsNotBlank],
    'Porch': [checkImprovementsFieldsNotBlank],
    'Other Amenities': [checkImprovementsFieldsNotBlank],
    'Appliances': [checkImprovementsFieldsNotBlank],
    'Amenity Category': [checkImprovementsFieldsNotBlank],
    'Subject Property Amenity': [checkImprovementsFieldsNotBlank],
    'Amenity Material': [checkImprovementsFieldsNotBlank],
    'Amenity Detail': [checkImprovementsFieldsNotBlank],
    'Apparent Defects, Damages, Deficiencies (Subject Property Amenities)': [checkImprovementsFieldsNotBlank],
    'Subject Property Amenities Exhibits': [checkImprovementsFieldsNotBlank],
    'Overall Quality': [checkImprovementsFieldsNotBlank, checkVersion1OverallQualityConditionAdjustmentConsistency],
    'Overall Quality Adjustment': [checkVersion1OverallQualityConditionAdjustmentConsistency],
    'Exterior Quality': [checkImprovementsFieldsNotBlank, checkVersion1QualityConditionConsistency],
    'Interior Quality': [checkImprovementsFieldsNotBlank, checkVersion1QualityConditionConsistency],
    'Overall Condition': [checkImprovementsFieldsNotBlank, checkVersion1OverallQualityConditionAdjustmentConsistency],
    'Overall Condition Adjustment': [checkVersion1OverallQualityConditionAdjustmentConsistency],
    'Exterior Condition': [checkImprovementsFieldsNotBlank, checkVersion1QualityConditionConsistency],
    'Interior Condition': [checkImprovementsFieldsNotBlank, checkVersion1QualityConditionConsistency],
    'Reconciliation of Overall Quality and Condition': [checkImprovementsFieldsNotBlank],

    'Vehicle Storage Type': [checkVersion1VehicleStorageAdjustmentConsistency],
    'Vehicle Storage Spaces': [checkVersion1VehicleStorageAdjustmentConsistency],
    'Vehicle Storage Adjustment': [checkVersion1VehicleStorageAdjustmentConsistency],

    // Sales Comparison Validations
    'Address': [checkSubjectAddressInconsistency],
    'Condition': [checkConditionAdjustment], 'Condition Adjustment': [checkConditionAdjustment],
    'Bedrooms': [checkBedroomsAdjustment], 'Bedrooms Adjustment': [checkBedroomsAdjustment],
    'Baths': [checkBathsAdjustment], 'Baths Adjustment': [checkBathsAdjustment],
    'Quality of Construction': [checkQualityOfConstructionAdjustment], 'Quality of Construction Adjustment': [checkQualityOfConstructionAdjustment],
    'Proximity to Subject': [checkProximityToSubject],
    'Site': [checkSiteAdjustment, checkSiteSizesConsistency], 'Site Adjustment': [checkSiteAdjustment],
    'Gross Living Area': [checkGrossLivingAreaAdjustment], 'Gross Living Area Adjustment': [checkGrossLivingAreaAdjustment],
    'Design (Style) Adjustment': [checkDesignStyleAdjustment],
    'Functional Utility': [checkFunctionalUtilityAdjustment], 'Functional Utility Adjustment': [checkFunctionalUtilityAdjustment],
    'Energy Efficient Items': [checkEnergyEfficientItemsAdjustment], 'Energy Efficient Items Adjustment': [checkEnergyEfficientItemsAdjustment],
    'Porch/Patio/Deck': [checkPorchPatioDeckAdjustment], 'Porch/Patio/Deck Adjustment': [checkPorchPatioDeckAdjustment],
    'Heating/Cooling': [checkHeatingCoolingAdjustment], 'Heating/Cooling Adjustment': [checkHeatingCoolingAdjustment],
    'Data Source(s)': [checkDataSourceDOM],
    'Actual Age': [checkActualAgeAdjustment, checkSubjectAgeConsistency], 'Actual Age Adjustment': [checkActualAgeAdjustment],
    'Sale Price': [checkSalePrice],
    'Leasehold/Fee Simple': [checkLeaseholdFeeSimpleConsistency], 'Leasehold/Fee Simple Adjustment': [checkLeaseholdFeeSimpleConsistency],
    'Date of Sale/Time': [checkDateOfSale],
    'Location': [checkLocation, checkLocationConsistency, checkNeighborhoodFieldsNotBlank, checkVersion1LocationAdjustmentConsistency], 'Location Adjustment': [checkLocationConsistency, checkVersion1LocationAdjustmentConsistency],

    // Rent Schedule Validations
    'Date Lease Begins': [checkLeaseDates],
    'Date Lease Expires': [checkLeaseDates],
    'Monthly Rental': [checkSubjectMonthlyRental],
    'Less: Utilities': [checkSubjectUtilities],
    'Furniture': [checkSubjectFurniture],
    'Adjusted Monthly Rent': [checkSubjectAdjustedMonthlyRent],
    'Other (e.g., basement, etc.)': [checkOtherBasement],

    // Reconciliation Validations
    'Indicated Value by Sales Comparison Approach $': [checkFinalValueConsistency],
    'Indicated Value by: Sales Comparison Approach $': [checkFinalValueConsistency, checkCostApproachDeveloped],
    'opinion of the market value, as defined, of the real property that is the subject of this report is $': [checkFinalValueConsistency],
    'APPRAISED VALUE OF SUBJECT PROPERTY $': [checkFinalValueConsistency],
    'Cost Approach (if developed)': [checkCostApproachDeveloped],
    'This appraisal is made "as is", subject to completion per plans and specifications on the basis of a hypothetical condition that the improvements have been completed, subject to the following repairs or alterations on the basis of a hypothetical condition that the repairs or alterations have been completed, or subject to the following required inspection based on the extraordinary assumption that the condition or deficiency does not require alteration or repair:': [checkAppraisalCondition],
    'as of': [checkAsOfDate],

    'final value': [checkFinalValueBracketing, checkReconciliationFieldsNotBlank],
    // Appraiser/Lender Validations
    'Lender/Client Company Address': [checkLenderAddressHtmlInconsistency, checkLenderAddressInconsistency],
    'Supervisory Signature': [checkSupervisoryAppraiserFields],
    'Supervisory Appraiser Signature': [checkSupervisoryAppraiserFields],
    'Supervisory Name': [checkSupervisoryAppraiserFields],
    'Supervisory Appraiser Name': [checkSupervisoryAppraiserFields],
    'Supervisory Company Name': [checkSupervisoryAppraiserFields],
    'Supervisory Appraiser Company Name': [checkSupervisoryAppraiserFields],
    'Supervisory Company Address': [checkSupervisoryAppraiserFields],
    'Supervisory Appraiser Company Address': [checkSupervisoryAppraiserFields],
    'Supervisory Telephone Number': [checkSupervisoryAppraiserFields],
    'Supervisory Appraiser Telephone Number': [checkSupervisoryAppraiserFields],
    'Supervisory Appraiser Phone': [checkSupervisoryAppraiserFields],
    'Supervisory Email Address': [checkSupervisoryAppraiserFields],
    'Supervisory Appraiser Email Address': [checkSupervisoryAppraiserFields],
    'Supervisory Appraiser Email': [checkSupervisoryAppraiserFields],
    'Supervisory Date of Signature': [checkSupervisoryAppraiserFields],
    'Supervisory Appraiser Date of Signature': [checkSupervisoryAppraiserFields],
    'Supervisory State Certification #': [checkSupervisoryAppraiserFields],
    'Supervisory Appraiser State Certification #': [checkSupervisoryAppraiserFields],
    'Supervisory or State License #': [checkSupervisoryAppraiserFields],
    'Supervisory Appraiser or State License #': [checkSupervisoryAppraiserFields],
    'Supervisory Appraiser State License #': [checkSupervisoryAppraiserFields],
    'Supervisory State': [checkSupervisoryAppraiserFields],
    'Supervisory Appraiser State': [checkSupervisoryAppraiserFields],
    'Supervisory Expiration Date of Certification or License': [checkSupervisoryAppraiserFields],
    'Supervisory Expiration Date': [checkSupervisoryAppraiserFields],
    'Supervisory Appraiser Expiration Date': [checkSupervisoryAppraiserFields],
    'Supervisory Appraiser Expiration Date of Certification or License': [checkSupervisoryAppraiserFields],
    'Did not inspect subject property': [checkSupervisoryAppraiserFields],
    'Did inspect exterior of subject property from street': [checkSupervisoryAppraiserFields],
    'Subject Property Date of Inspection (Exterior)': [checkSupervisoryAppraiserFields],
    'Did inspect interior and exterior of subject property': [checkSupervisoryAppraiserFields],
    'Subject Property Date of Inspection (Interior/Exterior)': [checkSupervisoryAppraiserFields],
    'Did not inspect exterior of comparable sales from street': [checkSupervisoryAppraiserFields],
    'Did inspect exterior of comparable sales from street': [checkSupervisoryAppraiserFields],
    'Comparable Sales Date of Inspection': [checkSupervisoryAppraiserFields],
    'Appraiser License': [checkAppraiserFieldsNotBlank],
    'E&O Insurance': [checkAppraiserFieldsNotBlank],
    'Policy Period From': [checkAppraiserFieldsNotBlank],
    'Policy Period To': [checkAppraiserFieldsNotBlank, checkDateGreaterThanToday],
    'License Valid To': [checkAppraiserFieldsNotBlank, checkDateGreaterThanToday],
    'License Vaild To': [checkAppraiserFieldsNotBlank, checkDateGreaterThanToday],
    'LICENSE/REGISTRATION/CERTIFICATION #': [checkAppraiserFieldsNotBlank, checkAppraiserLicenseConsistency],
    'State Certification #': [checkAppraiserLicenseGroup],
    'or State License #': [checkAppraiserLicenseGroup],
    'or Other (describe)': [checkAppraiserLicenseGroup],
    'State #': [checkAppraiserLicenseGroup],

    // General Validations
    'Assignment Type': [checkAssignmentTypeConsistency],

    // Contract Section Validations
    "I did did not analyze the contract for sale for the subject purchase transaction. Explain the results of the analysis of the contract for sale or why the analysis was not performed.": [checkContractFieldsMandatory, checkContractAnalysisConsistency],
    "Contract Price $": [checkContractFieldsMandatory, checkContractAnalysisConsistency],
    "Date of Contract": [checkContractFieldsMandatory, checkContractAnalysisConsistency],
    "Is property seller owner of public record?": [
      checkContractFieldsMandatory,
      checkContractAnalysisConsistency,
      (field, text, data) => checkYesNoOnly(field, text, data, {
        name: 'Is property seller owner of public record?'
      })],
    "Data Source(s) (Contract)": [checkContractFieldsMandatory, checkContractAnalysisConsistency],
    "Is there any financial assistance (loan charges, sale concessions, gift or downpayment assistance, etc.) to be paid by any party on behalf of the borrower?": [
      checkContractFieldsMandatory,
      checkContractAnalysisConsistency,
      (field, text, data) => checkYesNoOnly(field, text, data, {
        name: 'Is there any financial assistance (loan charges, sale concessions, gift or downpayment assistance, etc.) to be paid by any party on behalf of the borrower?'
      }),
      checkFinancialAssistanceInconsistency],
    "If Yes, report the total dollar amount and describe the items to be paid": [checkContractFieldsMandatory, checkFinancialAssistanceInconsistency, checkContractAnalysisConsistency],
  };

  validationRegistry['final value'] = [checkFinalValueConsistency, checkFinalValueBracketing];

  const reconciliationFieldsToValidate = [
    'Indicated Value by: Sales Comparison Approach $',
    'Cost Approach (if developed)',
    'Income Approach (if developed) $',
    'Income Approach (if developed) $ Comment',
    'This appraisal is made "as is", subject to completion per plans and specifications on the basis of a hypothetical condition that the improvements have been completed, subject to the following repairs or alterations on the basis of a hypothetical condition that the repairs or alterations have been completed, or subject to the following required inspection based on the extraordinary assumption that the condition or deficiency does not require alteration or repair:',
    "opinion of the market value, as defined, of the real property that is the subject of this report is $",
    "as of", "final value",
    "Sales Comparison Approach Indicated Value",
    "Income Approach Indicated Value",
    "Cost Approach Indicated Value",
    "Reason for Exclusion (Income Approach)",
    "Opinion of Market Value",
    "Market Value Condition",
    "Reasonable Exposure Time",
    "Effective Date of Appraisal",
    "Reconciliation of Market Value",
    "Apparent Defects, Damages, Deficiencies"
  ];
  reconciliationFieldsToValidate.forEach(field => {
    if (!validationRegistry[field]) validationRegistry[field] = [];
    validationRegistry[field].push(checkReconciliationFieldsNotBlank);
  });
  // Appraiser Validations
  const appraiserFieldsToValidate = [
    "Signature", "Name", "Company Name", "Company Address", "Telephone Number",
    "Email Address", "Date of Signature and Report", "Effective Date of Appraisal",
    "State Certification #", "or State License #", "or Other (describe)", "State #",
    "State", "Expiration Date of Certification or License", "ADDRESS OF PROPERTY APPRAISED",
    "APPRAISED VALUE OF SUBJECT PROPERTY $", "LENDER/CLIENT Name", "Lender/Client Company Name",
    "Lender/Client Company Address", "Lender/Client Email Address",
    "Appraiser Certifications",
    "Appraiser Signature",
    "Appraiser Name",
    "Appraiser Credential Level",
    "Appraiser ID",
    "Appraiser State",
    "Appraiser License Expiration Date"
  ];

  appraiserFieldsToValidate.forEach(field => {
    if (!validationRegistry[field]) {
      validationRegistry[field] = [];
    }
    validationRegistry[field].push(checkAppraiserFieldsNotBlank);
  });

  validationRegistry['Lender/Client Company Address'].push(checkLenderAddressInconsistency);
  validationRegistry['LENDER/CLIENT Name'].push(checkLenderNameInconsistency, checkClientNameHtmlConsistency, checkUnpaidLender);
  validationRegistry['LICENSE/REGISTRATION/CERTIFICATION #'] = [checkAppraiserLicenseConsistency];

  // HTML Data Validations
  validationRegistry['Client Name'] = [checkClientNameHtmlConsistency];
  validationRegistry['Client Address'] = [checkClientAddressHtmlConsistency];
  validationRegistry['Borrower (and Co-Borrower)'] = [checkBorrowerHtmlConsistency];

  validationRegistry['Policy Period To'] = [checkDateGreaterThanToday];
  validationRegistry['License Vaild To'] = [checkDateGreaterThanToday];

  // Cost Approach Validations
  validationRegistry["ESTIMATED/REPRODUCTION / REPLACEMENT COST NEW"] = [checkCostNew];
  validationRegistry["Source of cost data"] = [checkSourceOfCostData];
  validationRegistry["Indicated Value By Cost Approach......................................................=$"] = [checkIndicatedValueByCostApproach];

  const opinionOfSiteFields = [
    "OPINION OF SITE VALUE = $ ................................................",
    "OPINION OF SITE VALUE",
    "Opinion of Site Value",
    "Opinion of Site Value $",
    "OPINION OF SITE VALUE $"
  ];
  opinionOfSiteFields.forEach(f => {
    validationRegistry[f] = [checkOpinionOfSiteValue];
  });

  const remainingEconomicLifeFields = [
    "Estimated Remaining Economic Life (HUD and VA only)",
    "Remaining Economic Life",
    "Estimated Remaining Economic Life",
    "Estimated Remaining Economic Life Years"
  ];
  remainingEconomicLifeFields.forEach(f => {
    validationRegistry[f] = [checkRemainingEconomicLife];
  });

  const costApproachFieldsToValidate = [
    "Estimated", "Source of cost data", "Quality rating from cost service ",
    "Effective date of cost data ", "Comments on Cost Approach (gross living area calculations, depreciation, etc.)",
    "Dwelling", "Garage/Carport ",
    " Total Estimate of Cost-New  = $ ...................", "Depreciation ",
    "Depreciated Cost of Improvements......................................................=$ ",
    "“As-is” Value of Site Improvements......................................................=$",
    "Indicated Value By Cost Approach......................................................=$",
    "Indicated Value by Cost Approach",
    "Depreciated Cost of Dwellings",
    "As Is Value of Site Improvements",
    "Above Grade Finished Area",
    "Cost Per Square Foot",
    "Depreciated Cost",
    "Physical Depreciation",
    "Functional Depreciation",
    "External Depreciation",
    "Total Depreciation",
    "Effective Age",
    "Site Improvement Description",
    "Site Improvement Amount",
    "Primary Site Valuation Method",
    "Land Comparable Number",
    "Land Comparable Address",
    "Land Comparable County",
    "Land Comparable Data Source",
    "Land Comparable Assessor Parcel Number (APN)",
    "Land Comparable Site Size",
    "Land Comparable Sale Date",
    "Land Comparable Sale Price",
    "Commentary on Remaining Economic Life",
    "Commentary on Effective Age",
    "Reconciliation of Site Value",
    "General Description",
    "Cost Type",
    "Cost Data Source",
    "Quality Rating",
    "Effective Date",
    "Cost Method",
    "Depreciation Method",
    "Cost Approach Commentary",
    "Cost Approach Exhibits"
  ];
  costApproachFieldsToValidate.forEach(field => {
    if (!validationRegistry[field]) {
      validationRegistry[field] = [];
    }
    validationRegistry[field].push(checkCostApproachFieldsNotBlank);
  });


  validationRegistry["I did did not research the sale or transfer history of the subject property and comparable sales. If not, explain"] = [checkResearchHistory];
  validationRegistry["My research did did not reveal any prior sales or transfers of the subject property for the three years prior to the effective date of this appraisal."] = [checkSubjectPriorSales];
  validationRegistry["My research did did not reveal any prior sales or transfers of the comparable sales for the year prior to the date of sale of the comparable sale."] = [checkComparablePriorSales];
  validationRegistry["Data Source(s) for subject property research"] = [checkDataSourceNotBlank];
  validationRegistry["Data Source(s) for comparable sales research"] = [checkDataSourceNotBlank];
  validationRegistry["Summary of Sales Comparison Approach"] = [checkDataSourceNotBlank];
  validationRegistry["Effective Date of Data Source(s) for prior sale"] = [checkEffectiveDateIsCurrentYear];
  validationRegistry["Date of Prior Sale/Transfer"] = [checkSubjectPriorSaleDate, checkCompPriorSaleDate];

  const incomeApproachFieldsToValidate = [
    "Estimated Monthly Market Rent $", "X Gross Rent Multiplier  = $",
    "Indicated Value by Income Approach", "Summary of Income Approach (including support for market rent and GRM) "
  ];
  incomeApproachFieldsToValidate.forEach(field => {
    if (!validationRegistry[field]) validationRegistry[field] = [];
    validationRegistry[field].push(checkIncomeApproachFieldsNotBlank);
    if (INCOME_APPROACH_1007_REQUIRED_FIELDS.includes(field)) {
      validationRegistry[field].push((f, text, d, path, sName) =>
        checkIncomeApproach1007Required(f, text, d, path, sName, formTypeVal)
      );
    }
  });

  const pudInformationFieldsToValidate = [
    "PUD Fees $", "PUD Fees (per month)", "PUD Fees (per year)",
    "Is the developer/builder in control of the Homeowners' Association (HOA)?", "Unit type(s)",
    "Provide the following information for PUDs ONLY if the developer/builder is in control of the HOA and the subject property is an attached dwelling unit.",
    "Legal Name of Project", "Total number of phases", "Total number of units",
    "Total number of units sold", "Total number of units rented", "Total number of units for sale",
    "Data source(s)", "Was the project created by the conversion of existing building(s) into a PUD?",
    " If Yes, date of conversion", "Does the project contain any multi-dwelling units? Yes No Data",
    "Are the units, common elements, and recreation facilities complete?", "If No, describe the status of completion.",
    "Are the common elements leased to or by the Homeowners' Association?",
    "If Yes, describe the rental terms and options.", "Describe common elements and recreational facilities."
  ];
  pudInformationFieldsToValidate.forEach(field => {
    if (!validationRegistry[field]) validationRegistry[field] = [];
    validationRegistry[field].push(checkPudInformationFieldsNotBlank, checkPudControlAndFees);
  });

  const marketConditionsFieldsToValidate = [
    "Instructions:", "Seller-(developer, builder, etc.)paid financial assistance prevalent?",
    "Explain in detail the seller concessions trends for the past 12 months (e.g., seller contributions increased from 3% to 5%, increasing use of buydowns, closing costs, condo fees, options, etc.).",
    "Are foreclosure sales (REO sales) a factor in the market?", "If yes, explain (including the trends in listings and sales of foreclosed properties).",
    "Cite data sources for above information.", "Summarize the above information as support for your conclusions in the Neighborhood section of the appraisal report form. If you used any additional information, such as an analysis of pending sales and/or expired and withdrawn listings, to formulate your conclusions, provide both an explanation and support for your conclusions."
  ];
  marketConditionsFieldsToValidate.forEach(field => {
    if (!validationRegistry[field]) validationRegistry[field] = [];
    validationRegistry[field].push(checkMarketConditionsFieldsNotBlank);
  });

  const projectInfoFieldsToValidate = [
    "Data source(s) for project information", "Project Description", "# of Stories",
    "# of Elevators", "Existing/Proposed/Under Construction", "Year Built",
    "Effective Age", "Exterior Walls",
    "Roof Surface", "Total # Parking", "Ratio (spaces/units)", "Type", "Guest Parking", "# of Units", "# of Units Completed",
    "# of Units For Sale", "# of Units Sold", "# of Units Rented", "# of Owner Occupied Units",
    "# of Phases", "# of Planned Phases",
    "Project Primary Occupancy", "Is the developer/builder in control of the Homeowners' Association (HOA)?",
    "Management Group", "Does any single entity (the same individual, investor group, corporation, etc.) own more than 10% of the total units in the project?",
    "Was the project created by the conversion of existing building(s) into a condominium?",
    "If Yes,describe the original use and date of conversion",
    "Are the units, common elements, and recreation facilities complete (including any planned rehabilitation for a condominium conversion)?", "If No, describe",
    "Is there any commercial space in the project?",
    "If Yes, describe and indicate the overall percentage of the commercial space.", "Describe the condition of the project and quality of construction.",
    "Describe the common elements and recreational facilities.", "Are any common elements leased to or by the Homeowners' Association?",
    "If Yes, describe the rental terms and options.", "Is the project subject to a ground rent?",
    "If Yes, $ per year (describe terms and conditions)",
    "Are the parking facilities adequate for the project size and type?", "If No, describe and comment on the effect on value and marketability."
  ];
  projectInfoFieldsToValidate.forEach(field => {
    if (!validationRegistry[field]) validationRegistry[field] = [];
    validationRegistry[field].push(checkProjectInfoFieldsNotBlank);
  });

  const projectAnalysisFieldsToValidate = [
    "I did did not analyze the condominium project budget for the current year. Explain the results of the analysis of the budget (adequacy of fees, reserves, etc.), or why the analysis was not performed.",
    "Are there any other fees (other than regular HOA charges) for the use of the project facilities?",
    "If Yes, report the charges and describe.",
    "Compared to other competitive projects of similar quality and design, the subject unit charge appears",
    "If High or Low, describe",
    "Are there any special or unusual characteristics of the project (based on the condominium documents, HOA meetings, or other information) known to the appraiser?",
    "If Yes, describe and explain the effect on value and marketability."
  ];
  projectAnalysisFieldsToValidate.forEach(field => {
    if (!validationRegistry[field]) validationRegistry[field] = [];
    validationRegistry[field].push(checkProjectAnalysisFieldsNotBlank);
  });

  const unitDescriptionsFieldsToValidate = [
    "Unit Charge$",
    "per month X 12 = $",
    "per year",
    "Annual assessment charge per year per square feet of gross living area = $",
    "Utilities included in the unit monthly assessment [None/Heat/Air/Conditioning/Electricity/Gas/Water/Sewer/Cable/Other (describe)]",
    "Floor #",
    "# of Levels",
    "Heating Type/Fuel",
    "Central AC/Individual AC/Other (describe)",
    "Fireplace(s) #/Woodstove(s) #/Deck/Patio/Porch/Balcony/Other",
    "Refrigerator/Range/Oven/Disp Microwave/Dishwasher/Washer/Dryer",
    "Floors", "Walls", "Trim/Finish", "Bath Wainscot", "Doors",
    "None/Garage/Covered/Open", "Assigned/Owned", "# of Cars", "Parking Space #",
    "Finished area above grade contains:",
    "Are the heating and cooling for the individual units separately metered?",
    "Additional features (special energy efficient items, etc.)",
    "Describe the condition of the property (including needed repairs, deterioration, renovations, remodeling, etc.)",
  ];

  unitDescriptionsFieldsToValidate.forEach(field => {
    if (!validationRegistry[field]) {
      validationRegistry[field] = [];
    }
    validationRegistry[field].push(checkUnitDescriptionsFieldsNotBlank);
  });

  const projectSiteFieldsToValidate = [
    "Topography", "Size", "Density", "View", "Specific Zoning Classification", "Zoning Description",
    "Zoning Compliance", "Is the highest and best use of subject property as improved (or as proposed per plans and specifications) the present use?",
    "Electricity", "Gas", "Water", "Sanitary Sewer", "Street", "Alley", "FEMA Special Flood Hazard Area",
    "FEMA Flood Zone", "FEMA Map #", "FEMA Map Date", "Are the utilities and off-site improvements typical for the market area? If No, describe",
    "Are there any adverse site conditions or external factors (easements, encroachments, environmental conditions, land uses, etc.)? If Yes, describe",
  ];
  projectSiteFieldsToValidate.forEach(field => {
    if (!validationRegistry[field]) {
      validationRegistry[field] = [];
    }
    validationRegistry[field].push(checkProjectSiteFieldsNotBlank);
  });

  const priorSaleHistoryFieldsToValidate = [
    "Prior Sale History: I did did not research the sale or transfer history of the subject property and comparable sales",
    "Prior Sale History: My research did did not reveal any prior sales or transfers of the subject property for the three years prior to the effective date of this appraisal",
    "Prior Sale History: Data source(s) for subject",
    "Prior Sale History: My research did did not reveal any prior sales or transfers of the comparable sales for the year prior to the date of sale of the comparable sale",
    "Prior Sale History: Data source(s) for comparables",
    "Prior Sale History: Report the results of the research and analysis of the prior sale or transfer history of the subject property and comparable sales",
    "Prior Sale History: Date of Prior Sale/Transfer",
    "Prior Sale History: Price of Prior Sale/Transfer",
    "Prior Sale History: Data Source(s) for prior sale/transfer",
    "Prior Sale History: Effective Date of Data Source(s)",
    "Prior Sale History: Analysis of prior sale or transfer history of the subject property and comparable sales",
    "Prior Sales or Transfers",
    "Subject Transfer History Data Source",
    "Comparable Number",
    "Comparable Transfer Terms",
    "Comparable Transfer Date",
    "Comparable Transfer Amount",
    "Comparable Transfer Data Source",
    "Analysis of Prior Sale and Transfer History of Subject Property",
    "Analysis of Prior Sale and Transfer History of Comparable Sales"
  ];
  priorSaleHistoryFieldsToValidate.forEach(field => {
    if (!validationRegistry[field]) validationRegistry[field] = [];
    validationRegistry[field].push(checkPriorSaleHistoryFieldsNotBlank);
  });

  const infoOfSalesFieldsToValidate = [
    "There are ____ comparable properties currently offered for sale in the subject neighborhood ranging in price from$ ___to $___",
    "There are ___comparable sales in the subject neighborhoodwithin the past twelvemonths ranging in sale price from$___ to $____"
  ];
  infoOfSalesFieldsToValidate.forEach(field => {
    if (!validationRegistry[field]) {
      validationRegistry[field] = [];
    }
    validationRegistry[field].push(checkInfoOfSalesFieldsNotBlank);
  });

  const condoForeclosureFieldsToValidate = [
    "Are foreclosure sales (REO sales) a factor in the project?",
    "If yes, indicate the number of REO listings and explain the trends in listings and sales of foreclosed properties.",
    "Summarize the above trends and address the impact on the subject unit and project."
  ];
  condoForeclosureFieldsToValidate.forEach(field => {
    if (!validationRegistry[field]) validationRegistry[field] = [];
    validationRegistry[field].push(checkCondoForeclosureFieldsNotBlank);
  });

  if (!validationRegistry['Sales Comparison Approach Indicated Value']) validationRegistry['Sales Comparison Approach Indicated Value'] = [];
  validationRegistry['Sales Comparison Approach Indicated Value'].push(checkFiveValuesConsistency);

  const isV1Form = formTypeVal === 'Appraisal Version #1' || formTypeVal === 'Version 1' || formTypeVal === 'Version1';

  if (!validationRegistry['Effective Date of Appraisal']) validationRegistry['Effective Date of Appraisal'] = [];
  validationRegistry['Effective Date of Appraisal'].push(checkEffectiveDatesConsistency);

  if (!validationRegistry['Inspection Date']) validationRegistry['Inspection Date'] = [];
  validationRegistry['Inspection Date'].push(checkEffectiveDatesConsistency);

  if (!validationRegistry['Effective Date']) validationRegistry['Effective Date'] = [];
  validationRegistry['Effective Date'].push(checkEffectiveDatesConsistency);

  if (isV1Form) {
    if (!validationRegistry['Opinion of Market Value']) validationRegistry['Opinion of Market Value'] = [];
    validationRegistry['Opinion of Market Value'].push(checkFiveValuesConsistency);

    if (!validationRegistry['Median Sale Price']) validationRegistry['Median Sale Price'] = [];
    validationRegistry['Median Sale Price'].push(checkFiveValuesConsistency);

    if (!validationRegistry['Indicated Value by Sales Comparison Approach']) validationRegistry['Indicated Value by Sales Comparison Approach'] = [];
    validationRegistry['Indicated Value by Sales Comparison Approach'].push(checkFiveValuesConsistency);

    if (!validationRegistry['Indicated Value by Sales Comparison Approach $']) validationRegistry['Indicated Value by Sales Comparison Approach $'] = [];
    validationRegistry['Indicated Value by Sales Comparison Approach $'].push(checkFiveValuesConsistency);

    if (!validationRegistry['Indicated Value by Sales Comparison Approach Indicated']) validationRegistry['Indicated Value by Sales Comparison Approach Indicated'] = [];
    validationRegistry['Indicated Value by Sales Comparison Approach Indicated'].push(checkFiveValuesConsistency);

    validationRegistry['Effective Date of Appraisal'].push(checkVersion1EffectiveDatesConsistency);
    validationRegistry['Inspection Date'].push(checkVersion1EffectiveDatesConsistency);
    validationRegistry['Effective Date'].push(checkVersion1EffectiveDatesConsistency);

    if (!validationRegistry['Overall Quality']) validationRegistry['Overall Quality'] = [];
    validationRegistry['Overall Quality'].push(checkVersion1OverallQualityConditionAdjustmentConsistency);

    if (!validationRegistry['Overall Quality Adjustment']) validationRegistry['Overall Quality Adjustment'] = [];
    validationRegistry['Overall Quality Adjustment'].push(checkVersion1OverallQualityConditionAdjustmentConsistency);

    if (!validationRegistry['Overall Condition']) validationRegistry['Overall Condition'] = [];
    validationRegistry['Overall Condition'].push(checkVersion1OverallQualityConditionAdjustmentConsistency);

    if (!validationRegistry['Overall Condition Adjustment']) validationRegistry['Overall Condition Adjustment'] = [];
    validationRegistry['Overall Condition Adjustment'].push(checkVersion1OverallQualityConditionAdjustmentConsistency);

    ['Overall Quality', 'Exterior Quality', 'Interior Quality', 'Exterior Quality Rating', 'Interior Quality Rating'].forEach(field => {
      if (!validationRegistry[field]) validationRegistry[field] = [];
      validationRegistry[field].push(checkPropertyQualityConsistency);
    });

    ['Overall Condition', 'Exterior Condition', 'Interior Condition', 'Exterior Condition Rating', 'Interior Condition Rating'].forEach(field => {
      if (!validationRegistry[field]) validationRegistry[field] = [];
      validationRegistry[field].push(checkPropertyConditionConsistency);
    });

    ['Highest and Best Use as Improved (Present Use)', 'Legally Permissible', 'Physically Possible', 'Financially Feasible', 'Maximally Productive'].forEach(field => {
      if (!validationRegistry[field]) validationRegistry[field] = [];
      validationRegistry[field].push(checkHbuConsistency);
    });

    ['Indicated Value by Cost Approach', 'Cost Approach Indicated Value'].forEach(field => {
      if (!validationRegistry[field]) validationRegistry[field] = [];
      validationRegistry[field].push(checkCostApproachConsistency);
    });

    ['Attachment Type', 'Attached / Detached'].forEach(field => {
      if (!validationRegistry[field]) validationRegistry[field] = [];
      validationRegistry[field].push(checkAttachmentTypeConsistency);
    });

    ['Property Rights Appraised'].forEach(field => {
      if (!validationRegistry[field]) validationRegistry[field] = [];
      validationRegistry[field].push(checkPropertyRightsConsistency);
    });

    ['Appraiser Credential Level'].forEach(field => {
      if (!validationRegistry[field]) validationRegistry[field] = [];
      validationRegistry[field].push(checkAppraiserCredentialLevelConsistency);
    });
  }

  const getValidationInfo = (lookupField, text, data, fieldPath, saleName, manualValidations, isAdjustment) => {
    let validationResult = null;
    let isValBlank = (text === undefined || text === null || String(text).trim() === '');

    if (customValidation && typeof customValidation === 'function') {
      const customRes = customValidation(lookupField, text, data, fieldPath, saleName);
      if (customRes) validationResult = customRes;
    }

    const isSupervisory = String(lookupField || '').toLowerCase().includes('supervisory') ||
      (Array.isArray(fieldPath) && fieldPath.some(p => String(p).toLowerCase().includes('supervisory')));

    if (!validationResult) {
      let checksToRun = [...(validationRegistry[lookupField] || [])];
      if (isSupervisory && !checksToRun.includes(checkSupervisoryAppraiserFields)) {
        checksToRun = [checkSupervisoryAppraiserFields, ...checksToRun];
      }
      for (const check of checksToRun) {
        if (typeof check === 'function') {
          let res = check(lookupField, text, data, fieldPath, saleName);
          if (!res && saleName) {
            try {
              const res2 = check(lookupField, data, saleName);
              if (res2) res = res2;
            } catch (e) { }
          }
          if (res) {
            // Errors always take priority — keep checking if we only have isMatch so far
            if (res.isError) {
              validationResult = res;
              break;
            } else if (!validationResult) {
              validationResult = res;
              // Don't break — a later check might find an error
            }
          }
        }
      }
    }

    if (validationResult?.message && !validationResult.skipBlankFilter) {
      const isMsgBlank = (
        validationResult.message.includes('should not be blank') ||
        validationResult.message.includes('must not be blank') ||
        validationResult.message.includes('cannot be blank') ||
        validationResult.message.includes('is mandatory') ||
        validationResult.message.includes('cannot be empty')
      );
      if (isMsgBlank && !showBlankValidation && !isMissing) {
        validationResult = null;
      }
    }

    let style = {};
    let message = validationResult?.message || null;

    const isManuallyValidated = manualValidations && manualValidations[JSON.stringify(fieldPath)];

    if (isManuallyValidated) {
      style = { backgroundColor: '#87ceeb', color: '#000000', padding: '2px 5px', borderRadius: '4px' };
      message = "Manually validated.";
    } else if (validationResult?.isError) {
      style = { backgroundColor: '#ff0015ff', color: '#ffffff', padding: '2px 5px', borderRadius: '4px', border: '1px solid #721c24' };
    } else if (validationResult?.isMatch) {
      style = { backgroundColor: '#91ff00ff', color: '#000000', padding: '2px 5px', borderRadius: '4px' };
      message = validationResult.message || "Validation successful!";
    } else if (showBlankValidation && !isValBlank) {
      style = { backgroundColor: '#91ff00ff', color: '#000000', padding: '2px 5px', borderRadius: '4px' };
      message = 'Value is present';
    } else if (lookupField === 'Zoning Compliance' && String(text || '').toLowerCase().includes('nonconforming')) {
      style = { backgroundColor: '#ff9d0bff', color: '#ffffff', padding: '2px 5px', borderRadius: '4px' };
    }

    return { style, message, validationResult };
  };

  const validation = getValidationInfo(fieldPath.slice(-1)[0], value, allData, fieldPath, saleName, manualValidations, isAdjustment); // Pass allData here
  const isManuallyValidated = manualValidations && manualValidations[JSON.stringify(fieldPath)];
  const strVal = (value !== undefined && value !== null) ? String(value) : '';
  const isValEmpty = strVal.trim() === '';

  const fieldContent = (
    <div
      className={`editable-field-container ${isAdjustment ? 'adjustment-value' : ''}`}
      onClick={handleContainerClick}
      style={{
        ...(isMissing ? { border: '2px solid #ff50315b' } : {}),
        ...validation.style,
        position: 'relative',
        paddingRight: handleManualValidation ? '50px' : '28px',
        cursor: isFieldEditable ? 'pointer' : 'default',
        minHeight: '26px',
        display: 'flex',
        alignItems: 'center'
      }}
    >
      {isEditing ? (
        React.createElement(usePre ? 'textarea' : 'input', {
          type: "text",
          value: value ?? '',
          onChange: (e) => onDataChange && onDataChange(fieldPath, e.target.value),
          onBlur: () => setEditing(null),
          onKeyDown: handleKeyDown,
          autoFocus: true,
          spellCheck: true,
          className: inputClassName || `form-control form-control-sm ${isAdjustment ? 'adjustment-value' : ''}`,
          style: inputStyle || { width: '100%', border: '1px solid #005A9C', background: '#fff', padding: '2px 4px', height: 'auto', resize: usePre ? 'vertical' : 'none' },
          rows: usePre ? 3 : undefined
        })
      ) : (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '2px', flexWrap: 'nowrap', width: '100%', minHeight: '20px', ...(valueStyle || {}) }}>
          {prefix && !isValEmpty && <span style={{ opacity: 0.85, fontWeight: 500 }}>{prefix}</span>}
          {(() => {
            if (typeof value === 'object' && value !== null && !React.isValidElement(value)) {
              return JSON.stringify(value);
            }
            if (usePre && typeof value === 'string' && value.includes('\n')) {
              return <div style={{ whiteSpace: 'pre-wrap' }}>{value}</div>;
            }
            if (isValEmpty) {
              const isSupervisoryField = String(fieldPath?.[fieldPath.length - 1] || '').toLowerCase().includes('supervisory') ||
                (Array.isArray(fieldPath) && fieldPath.some(p => String(p).toLowerCase().includes('supervisory')));
              const isGreenSupervisory = isSupervisoryField && validation?.style?.backgroundColor === '#91ff00ff';
              return (
                <span style={{ color: '#155724', fontStyle: 'italic', fontSize: '0.8rem', userSelect: 'none' }}>
                  {isGreenSupervisory ? '(Not Present)' : ''}
                </span>
              );
            }
            return (
              <HighlightKeywords
                text={strVal}
                keywords={['suburban', 'urban', 'rural', 'one-unit', '2-4 unit', 'multi-family', 'commercial']}
              />
            );
          })()}
          {suffix && !isValEmpty && <span style={{ opacity: 0.85, fontSize: '0.75rem', marginLeft: '2px' }}>{suffix}</span>}
        </span>
      )}

      <div style={{ position: 'absolute', right: 4, top: '50%', transform: 'translateY(-50%)', display: 'flex', alignItems: 'center', gap: '2px', zIndex: 2 }}>
        <Tooltip title="Revision Language">
          <IconButton
            onClick={(e) => {
              e.stopPropagation();
              const fieldName = Array.isArray(fieldPath) ? fieldPath[fieldPath.length - 1] : String(fieldPath);
              const sectionName = Array.isArray(fieldPath) && fieldPath.length > 1 ? fieldPath[0] : '';
              let handled = false;
              if (revisionHandlers && typeof revisionHandlers === 'object') {
                const cleanName = String(fieldName).toLowerCase().replace(/[^a-z0-9]/g, '');
                for (const [key, fn] of Object.entries(revisionHandlers)) {
                  if (typeof fn === 'function') {
                    const cleanKey = key.toLowerCase().replace(/[^a-z0-9]/g, '');
                    if (cleanKey.includes(cleanName)) {
                      fn();
                      handled = true;
                      break;
                    }
                  }
                }
              }
              if (!handled) {
                const cleanVal = (value !== undefined && value !== null && String(value).trim() !== '')
                  ? String(value).trim()
                  : '';
                const cleanSection = sectionName ? sectionName.replace(/[-_]/g, ' ') : '';
                const sectionPart = cleanSection ? ` in the ${cleanSection} section` : '';
                const text = cleanVal
                  ? `Please review and revise '${fieldName}' (Current Value: "${cleanVal}")${sectionPart}.`
                  : `Please provide '${fieldName}'${sectionPart || ' in the report'}.`;
                if (navigator.clipboard) navigator.clipboard.writeText(text);
                if (window.dispatchEvent) {
                  window.dispatchEvent(new CustomEvent('showNotification', { detail: `'${fieldName}' revision text copied to clipboard!` }));
                }
              }
            }}
            size="small"
            sx={{ padding: '2px' }}
          >
            <PlaylistAddIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        {handleManualValidation && (
          <Tooltip title={isManuallyValidated ? "Remove Manual Validation" : "Mark as Validated"}>
            <IconButton
              onClick={(e) => {
                e.stopPropagation();
                handleManualValidation(fieldPath);
              }}
              size="small"
              sx={{
                opacity: isManuallyValidated ? 1 : 0,
                transition: 'opacity 0.2s ease-in-out',
                '.editable-field-container:hover &': { opacity: 1 },
                padding: '2px', color: isManuallyValidated ? 'green' : 'inherit'
              }}
            >
              <CheckCircleIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
      </div>
    </div>
  );

  if (validation.message) {
    return <Tooltip title={validation.message} placement="top" arrow>{fieldContent}</Tooltip>;
  }

  return (
    <div>
      {fieldContent}
    </div>
  );
};

export default EditableField;
