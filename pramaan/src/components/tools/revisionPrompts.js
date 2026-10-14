export const SUBJECT_REVISION_PROMPTS = [
    "Please mark whether the subject property is currently offered for sale in the subject section.",
    "Please add the borrower's middle initial to the borrower name in the subject section.",
    "The unit number is missing from the subject property address; please update it to reflect the complete address including unit number.",
    "Please revise the subject property street name and suffix to match the title and purchase agreement.",
    "Please revise the lender/client name to match the engagement letter and order form.",
    "Please update the lender/client address in the subject section to match the order form.",
    "Please revise the borrower name in the subject section to match the order form.",
    "Please revise the spelling of the borrower name to match legal documentation.",
    "Please ensure the 'Legal Description' is noted in the subject section or attached addendum.",
    "The 'Legal Description' is noted as 'see attached addendum'; however, the legal description is missing from the addendum. Please revise.",
    "Please provide the 'Assessor's Parcel #' (APN) in the subject section.",
    "Please ensure the 'Neighborhood Name' is noted in the subject section.",
    "The occupancy is marked as 'Owner'; however, interior photos indicate the property is vacant. Please verify and revise.",
    "The occupancy is marked as 'Vacant'; however, interior photos indicate the property is occupied. Please verify and revise.",
    "This is an investment property; please revise the occupancy to tenant or vacant.",
    "Zoning indicates PUD; however, the PUD box is not checked in the subject section. Please update or comment to confirm.",
    "The subject section indicates the property is in a PUD; however, the PUD Information section is incomplete. Please revise.",
    "In the subject section, the HOA amount is noted; however, the payment frequency (per year or per month) is missing. Please revise.",
    "The PUD box is marked in the subject section; however, the HOA amount is noted as 0. Please verify or update.",
    "The subject section indicates the property is not located in a PUD; however, the PUD Information section is completed. Please revise.",
    "Please mark the appropriate checkbox for 'Property Rights Appraised' (Fee Simple or Leasehold) in the subject section.",
    "Please provide the owner of public record in the subject section.",
    "Please state the report data source(s) used, offering price(s), and date(s) in the subject section.",
    "Please mark the appropriate checkbox for whether the subject property was currently offered for sale or offered in the past 12 months in the subject section.",
    "Please revise the assignment type according to contract section.",
    "Please ensure county name, state, and zip code are complete and accurate in the subject section."
];

export const CONTRACT_REVISION_PROMPTS = [
    "The 'Contract Price' noted in the report does not match the purchase agreement; please verify and revise.",
    "The 'Date of Contract' noted in the contract section does not match the purchase agreement; please verify and revise.",
    "The report indicates 'Is there any financial assistance to be paid by any party on behalf of the borrower?' as YES; however, the concession amount is noted as $0. Please revise.",
    "The report indicates a financial assistance concession amount that does not match the purchase agreement; please verify and revise.",
    "Please state whether the seller is the owner of public record in the contract section.",
    "Please provide the transaction type in the contract section (arm's length or non-arm's length).",
    "Please state the data source(s) used to analyze the contract for sale in the contract section.",
    "Please explain the results of the contract analysis or provide an explanation why the analysis was not performed."
];

export const NEIGHBORHOOD_REVISION_PROMPTS = [
    "Neighborhood section: The predominant price noted under 'One-Unit Housing' does not fall between the Low to High price range. Please revise.",
    "Neighborhood section: The Low and High price range under 'One-Unit Housing' appears to be interchanged. Please revise.",
    "Neighborhood section: The predominant age noted under 'One-Unit Housing' does not fall between the Low to High age range. Please revise.",
    "Please state the Low, High, and Predominant values under 'One-Unit Housing' in the neighborhood section.",
    "Please provide complete neighborhood boundaries for North, South, East, and West directions in the neighborhood section.",
    "Please revise the 'Present Land Use' percentages in the neighborhood section so that the total equals 100%.",
    "Please provide explanation and comment for the 'Other' land use percentage noted in the neighborhood section.",
    "The appraised value is lower than the predominant neighborhood value. Appraiser to comment on whether this represents an under-improvement and its impact on marketability.",
    "The appraised value is higher than the predominant neighborhood value. Appraiser to comment on whether this represents an over-improvement and its impact on marketability.",
    "Please ensure Location, Built-Up, Growth, Property Values, Demand/Supply, and Marketing Time checkboxes are completed in the neighborhood section.",
    "Please provide neighborhood description and market conditions analysis in the neighborhood section."
];

export const SITE_REVISION_PROMPTS = [
    "Site section: Please check a box for 'Are the utilities and/or off-site improvements typical for the market area?'",
    "The 'Zoning Compliance' is marked as 'Legal Nonconforming (Grandfathered Use)'; please comment whether the subject can be rebuilt if destroyed.",
    "The 'Zoning Compliance' is marked as 'No Zoning'; please comment whether the subject can be rebuilt if destroyed.",
    "The question 'Is the highest and best use of the subject property as improved the present use?' is marked as NO; please provide explanation.",
    "Photos indicate the subject has an Alley; however, the Alley box is not marked in the site section. Please revise.",
    "The subject has a private septic system; please comment whether septic systems are typical for the market area.",
    "Please address whether the distance between well and septic meets FHA/HUD guidelines.",
    "Site section: 'Sanitary Sewer' is marked as public; however, comments indicate septic. Please reconcile and revise.",
    "'FEMA Special Flood Hazard Area' is marked as NO; however, FEMA Flood Zone is AE. Please reconcile and revise.",
    "Please state the FEMA Map Number, FEMA Map Date, and FEMA Flood Zone in the site section.",
    "Please mark the appropriate checkbox for 'Are there any adverse site conditions or external factors?' and provide detailed explanation if YES.",
    "Please state the site area in square feet or acres in the site section."
];

export const IMPROVEMENTS_REVISION_PROMPTS = [
    "Photos and sketches indicate the subject has an ADU; however, 'One with Accessory Unit' is not marked in the Improvements section. Please revise.",
    "The guest house does not have a kitchen; however, it is marked as an accessory unit. Please verify/revise qualifications as an ADU.",
    "The subject's 'Design (Style)' in the sales grid does not match the Improvements section. Please reconcile and revise.",
    "Improvements section: Construction status is marked as 'Proposed'; however, photos show an under-construction property. Please revise.",
    "Please provide the condition rating for Exterior Walls in the exterior description of the Improvements section.",
    "Please provide the condition rating for Interior Walls in the interior description of the Improvements section.",
    "Photos indicate the subject has an attic; however, the attic box is not marked in the Improvements section. Please revise.",
    "The subject's Heating/Cooling system noted in the sales grid does not match the Improvements section. Please reconcile and revise.",
    "Improvements section shows Central Air Conditioning; however, the sales grid shows No CAC. Please reconcile and revise.",
    "Please reflect Gross Living Area (GLA) as a whole number in the report.",
    "Improvements section indicates detached garages; however, the sales grid and sketch show attached garages. Please reconcile and revise.",
    "Photos show a detached property; however, the Improvements section checkbox is marked 'Attached'. Please revise.",
    "Improvements section: Porch box is marked; however, description notes 'None'. Please reconcile and revise.",
    "Photos indicate a crawl space; however, crawl space is not marked in the Improvements section. Please revise.",
    "Please state whether physical deficiencies or adverse conditions exist affecting livability, soundness, or structural integrity."
];

export const SALES_GRID_REVISION_PROMPTS = [
    "Sales grid: Proximity to subject exceeds guidelines (1.0 mile). Please address or provide explanation for using comparable sales over 1.0 mile from the subject property.",
    "Sales grid: Please state the low and high price range for comparable properties currently offered for sale at the top of the sales grid.",
    "Sales grid: Please state the count and price range for comparable sales in the subject neighborhood within the past twelve months at the top of the sales grid.",
    "Comp #1 is noted as an active listing; a minimum of 3 closed comparable sales is required. Please update the grid so comps 1-3 are closed sales.",
    "Comp settled date reflects a date after the effective date of the report. Please verify and update.",
    "Please revise the actual age of the subject in the sales grid to match the Improvements section.",
    "Please provide appropriate 'Verification Source(s)' and 'Data Source(s)' for all comparable sales in the sales grid.",
    "Please review contract date and settlement date for comp #1, as contract date should precede settlement date.",
    "Please provide a View adjustment for comp #1 or comment why no adjustment was warranted relative to the subject.",
    "The actual age adjustment made for comparable sales goes in the wrong direction; please verify and revise.",
    "The GLA adjustment made for comparable sales appears inconsistent with the dollar-per-sq-ft rate used across the grid; please revise.",
    "Please revise the checkbox for prior sales or transfers of the subject property for the 3 years prior to effective date.",
    "Please revise the checkbox for prior sales or transfers of the comparable sales for the 1 year prior to settlement date.",
    "The final opinion of market value is not bracketed by the adjusted sale prices of the comparable sales; please revise or comment.",
    "Please review bathroom adjustments across comparables for consistency relative to subject room counts.",
    "Please review condition adjustments for comparables (e.g. C3 vs C4) to ensure adjustment direction is logical.",
    "Please review garage/carport adjustments across comparables for consistency.",
    "Basement room breakdown (finished/unfinished sq ft, rec room, bath) in the sales grid does not match the sketch or photos. Please revise.",
    "If the subject property is leasehold, please include at least one leasehold comparable sale or explain why none were available.",
    "ADU details should not be combined with main unit GLA and room counts; please report ADU on a separate line item in the grid.",
    "Please address any significant increase in value since the subject's prior sale within the past 3 years."
];

export const RECONCILIATION_REVISION_PROMPTS = [
    "Please check the appropriate condition box in the reconciliation section ('As-Is', 'Subject to completion per plans', or 'Subject to repairs').",
    "The reconciliation section indicates 'Subject to repairs'; however, no repairs or physical deficiencies are specified. Please clarify.",
    "Please state the Indicated Value by Sales Comparison Approach, Cost Approach, and Income Approach in the reconciliation section.",
    "Please state the final Opinion of Market Value in the reconciliation section.",
    "Please ensure the Effective Date of Appraisal is complete and accurate in the reconciliation section."
];

export const COST_APPROACH_REVISION_PROMPTS = [
    "Please state the 'Opinion of Site Value' in the cost approach section.",
    "Please state the 'Estimated Remaining Economic Life' in the cost approach section.",
    "Please develop the cost approach section as required by client guidelines or for manufactured housing.",
    "Please mark the appropriate checkbox in the cost approach section for Reproduction Cost or Replacement Cost New.",
    "Cost approach indicated value does not match the sum of site value and net building cost; please verify math."
];

export const CERTIFICATION_REVISION_PROMPTS = [
    "Please ensure the appraiser has signed the appraisal report in the certification section.",
    "Please provide an updated signature date in the certification section.",
    "The Date of Signature is prior to the Effective Date of Appraisal. Please revise signature date to be on or after effective date.",
    "Please state the appraiser's License or Certification Number and Expiration Date in the certification section.",
    "The appraiser's license number in the certification section does not match the attached license copy. Please revise.",
    "Please include the AMC Name and AMC Registration Number / Expiration Date in the certification section.",
    "Please attach an active copy of the appraiser's state license, as the license copy in the report is expired.",
    "Please attach an active copy of the appraiser's E&O insurance policy, as the policy in the report is expired.",
    "If a supervisory appraiser is included, please ensure supervisory appraiser signature, license #, and inspection checkbox are completed."
];

export const ADDENDUM_GENERAL_REVISION_PROMPTS = [
    "Please complete all fields and checkboxes on the 1004MC Market Conditions Addendum.",
    "1004MC Addendum: Please provide data for Inventory Analysis (Settled Sales, Absorption Rate, Active Listings, Months Supply).",
    "1004MC Addendum: Please provide Median Sale Price, Median Days on Market, and Sale-to-List Price Ratio data.",
    "1004MC Addendum: The question 'Are foreclosure sales (REO sales) a factor in the market?' is marked YES; please provide explanatory comments.",
    "1004MC Addendum: The question 'Seller-paid financial assistance prevalent?' is marked; please detail seller concession trends for the past 12 months.",
    "Please comment on the estimated reasonable exposure time in the report.",
    "Please include the mandatory USPAP 3-year prior services disclosure statement in the report.",
    "Please provide clear, properly labeled subject and comparable photos in the photo addendum.",
    "Please ensure all photos in the photo addendum have descriptive labels (Subject Front, Rear, Street, Comp 1, Comp 2, etc.).",
    "Please ensure the location map clearly shows subject and all comparable sales with legible address labels.",
    "Please include the floor plan / building sketch with interior dimension labels in the report."
];

export const FORM_1007_REVISION_PROMPTS = [
    "Please include the Form 1007 Single Family Comparable Rent Schedule in the report.",
    "Please state the subject's Lease Begin Date and Lease Expiration Date per the current lease agreement on Form 1007.",
    "Please state the Date Lease Begins and Date Lease Expires for all rental comparables on Form 1007.",
    "Please provide clear photos for all rental comparables included on Form 1007.",
    "Please include all rental comparables on the location map exhibit.",
    "The opinion of market rent is not bracketed by the adjusted monthly rents of the rental comparables; please revise or comment.",
    "Please state the final Opinion of Market Rent on Form 1007.",
    "Per assignment guidelines, at least 3 active or closed rental comparables are required to establish market rent; please provide additional rental comps.",
    "Rental comparable lease dates indicate 'Active Listing'; please utilize closed/settled lease rentals to develop market rent where available."
];
