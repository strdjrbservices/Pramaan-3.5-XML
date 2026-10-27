import React, { useCallback, useState } from 'react';
import {
  Button,
  CircularProgress,
  Paper,
  Typography,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Stack,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Tooltip,
  IconButton,
  Box,
  TextField,
  InputAdornment
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Cancel as CancelIcon,
  HelpOutline as HelpOutlineIcon,
  ContentCopy as ContentCopyIcon,
  Check as CheckIcon,
  Search as SearchIcon,
  Clear as ClearIcon,
  AccountBalance as ClientIcon
} from '@mui/icons-material';

export const CLIENT_REQUIREMENT_PROMPT = `
Client Requirement Check:
Based on the Lender/Client name in the document, verify if it matches any of a list of lenders/clients and check for any specific requirements.
Your output must be a single, clean JSON object. Do not include any text outside of the JSON object.
The JSON object must have a "summary" (a one to two-line overview stating which lender/client is present and if their requirements are met) and a "details" array.
Each object in the "details" array represents a requirement and must have the following keys:
- "requirement": A string describing the requirement rule being checked.
- "status": A string, which must be one of 'Fulfilled', 'Not Fulfilled', 'Needs Review', or 'Not Applicable'.
- "value_or_comment": A string containing the extracted value or a brief comment explaining the status. If a value is extracted, also include the page number.

Lender/Client List and their requirements:
- Visio Lending:
  - As-Is Reports: Reports must be As-Is. If not, advise before rejecting. Escalate as: "The report is made subject to for [reason]."
  - Neighborhood Description: No need to check neighborhood words such as Average, Convenient, Good, or Desirable.
  - UAD Pages: UAD pages are not mandatory for VISIO.
  - Repairs: VISIO reports must be As-Is with no repairs needed. If repairs are listed, escalate even if the report is marked As-Is. Escalate as: "This is VISIO. The report is made As-Is, but the subject has repairs. Please refer to the attached screenshot and advise."
  - VISIO STR (Short-Term Rental) - Comparable Guidelines: 1007 STR ordered requires comparables to be STR (escalate if they are not). 1007 LTR or 1007 only ordered allows comparables to be STR or LTR. (Other clients with 1007 only allow LTR, but not STR).
  - Occupancy Requirements: VISIO with 1007 occupancy must be Vacant or Tenant. If marked Owner, reject as: "The subject is an investment property where the owner does not reside. Please revise to 'Vacant' or 'Tenant.'" For 1025 reports: at least one unit may be owner-occupied, but Tenant or Vacant must also be checked; otherwise, escalate for confirmation.
  - Cost Approach: Must be completed for VISIO.

- Best2Lend LLC:
  - Two-Value Report Requirements: For reports with two values ("As-Is" and "As-Repaired"), the "As-Is" comps are not required to be gridded.
- Ice Lender Holdings LLC:
  - As-Is: Reports should be As-Is. If not, advise before rejecting.
  - Appraised Value: If the final value is more than 10% above the listing or purchase/contract price, escalate for review.
  - USPAP Addendum: The updated USPAP Compliance Addendum must be included, with: (1) USPAP reporting option, (2) Reasonable Exposure Time, (3) 3-year prior services statement ('I have NOT performed services, as an appraiser or in any other capacity, regarding the property that is the subject of this report within the three-year period immediately preceding acceptance of this assignment').
  - FIRREA Statement: The report must include commentary confirming compliance with FIRREA requirements with identifier words (1989, FIRREA).
  - Ice Lender - Comparable Distance Guidelines: Urban <= 1 mile, Suburban <= 3 miles, Rural <= 10 miles.
  - Ice Lender - Refrigerator: The kitchen photo must show the refrigerator. If absent, request a revision or require the appraiser to explain its absence in the report.
  - Photographs: Include interior and exterior photos, all mechanical systems, the full kitchen and appliances, and the roof.
- Equity Wave Lending, Inc:
  - The appraiser is required to include the following intended use verbiage in all reports for this client. If the appraisal does not include the following statements in the report, please reject as:
    1. Intended User: Equity Wave Lending, Inc. it's investors, assignees, and/or successors
    2. Intended Use: The making, arranging, or selling of a private money/hard money loan
- Hometown Equity Mortgage / theLender:
  - Smoke & CO Detectors:
    - The appraiser must provide comments and photos of all smoke detectors and carbon monoxide (CO) detectors.
    - Both detector types must be addressed in the report.
    - If either the required comments or photos are missing, send a revision request.
    - Rejection Comment: "Please confirm if smoke/CO detectors are installed and provide photos."
  - UAD 3.6 Transition / Policy:
    - UAD 3.6 is not permitted for these clients before October 1, 2026.
    - If a UAD 3.6 order is received before October 1, 2026, STOP and ESCALATE immediately. Do not review the report.
- theLender:
  - Smoke & CO Detectors: Follow Hometown Equity Mortgage / theLender requirements (comments and photos of all smoke detectors and carbon monoxide detectors required; reject: "Please confirm if smoke/CO detectors are installed and provide photos.").
  - UAD 3.6 Transition / Policy: UAD 3.6 is not permitted before October 1, 2026. If received before October 1, 2026, STOP and ESCALATE immediately. Do not review the report.
- FOUNDATION MORTGAGE:
  - Short Term Rental (STR) Form: UPDATE: FOUNDATION MORTGAGE - They no longer accept Short Term Rentals on a 1007, so they provide this form for appraisers to complete with STRs. If the product type includes a "STR 1007", then this is the form that needs to be included, not a regular 1007. If a regular 1007 is used or the specific STR form is missing when STR 1007 is ordered, reject as: "UPDATE: FOUNDATION MORTGAGE - They no longer accept Short Term Rentals on a 1007, so they provide this form for appraisers to complete with STRs. If the product type includes a 'STR 1007', then this is the form that needs to be included, not a regular 1007."
- Coast2Coast / BPL Mortgage, LLC – Appraisal Review Requirements:
  - 1. Client and Lender Instructions:
    - If the order page shows Coast2Coast and the report shows Coast2Coast, follow BPL instructions.
    - If the order page shows Coast2Coast and the report shows BPL, follow BPL instructions.
    - If the order page shows Coast2Coast but the report shows a different lender, review the report normally.
  - 2. Smoke and CO Detectors:
    - Ensure the report addresses whether smoke/CO detectors are present and required by law.
    - Rejection Comment: "Please address if smoke/CO detectors were present and required by law."
    - BPL Reminder: Comments regarding smoke/CO detectors are required. The report does not need to be Subject To for missing detectors unless other repair items are required. If missing detectors are the only issue, the report should remain As-Is, with the appraiser commenting that they are missing.
  - 3. Appraised Value vs. Purchase/Listing Price:
    - If the final appraised value is 10% higher than the listing price or purchase/contract price, check for supporting commentary.
    - For As-Is with ARV reports, compare the As-Is value.
    - If supporting commentary is missing, escalate to the group.
    - Always send a revision for the appraised value exceeding the purchase price.
    - Rejection Comment: "Please address the appraised value being higher than the purchase price for the subject property."
  - 4. Prior Sale History – BPL, ICE, etc.:
    - If the final value is higher than the subject's prior sale price, check the Improvements section and Prior Sales History for comments explaining the increase.
    - If no supporting comments are provided, escalate.
    - Escalation Comment: "Please address the increase in value since the subject's prior sale."
  - 5. Cost Approach:
    - The Cost Approach must be completed.
    - Rejection Comment: "This client requires the Cost Approach to be completed for their own internal lending purposes. Whether the appraiser chooses to weight this approach is solely up to the appraiser."
  - 6. BPL – Cost to Cure:
    - If repairs, deferred maintenance, or cosmetic issues are present, request a cost-to-cure amount.
    - Exception: Do not request a cost to cure on failed 1004D reports where repairs are still needed.
    - For two-value ARV/As-Is reports, no cost to cure is required because the repair budget reflects the costs of repairs.
    - Rejection Comment: "Please provide cost to cure for the repairs/deferred maintenance."
  - 7. Freddie Mac Unacceptable Practices:
    - Do not perform the Freddie Mac Unacceptable Practices review for BPL.
  - 8. Bedroom Photo Labels:
    - Bedroom photos must be labeled sequentially, such as Bedroom 1, Bedroom 2, etc.
    - Rejection Comment: 'The bedroom photos need to be labeled as "Bedroom 1", "Bedroom 2", etc. Please revise the labels of the bedroom photos accordingly.'
  - 9. Comparable Distance Guidelines:
    - Urban: 1 mile, Suburban: 1 mile, Rural: 5 miles.
    - If a comparable exceeds the applicable distance guideline, check for supporting commentary. If no comment is provided, reject.
    - Rejection Comment – Urban/Suburban: "Please address the use of Comp 2 exceeding the lender distance guideline of 1 mile."
    - Rejection Comment – Rural: "Please address the use of Comp 2 exceeding the lender distance guideline of 5 miles."
  - 10. Comparable Properties – City Requirements:
    - BPL requires three comparable sales from the same city as the subject.
    - If any sales or rental comparable is located in a different city, the report must include commentary explaining why. Apply the same requirement to rental comparables.
    - Rejection Comment: "Sales Comps #2–4 and Rental Comp #3 are located in a different city than the subject. Please utilize comps located in the same city or address why that is not possible."
  - 11. Multifamily Properties – Unit Count:
    - The number of units in comparable properties should match the subject property's unit count. If unit counts differ, require the appraiser to address the discrepancy in the report.
    - Rejection Comment: "The subject is a 3-unit property; however, Comp #1 is a 4-unit property and Comp #3 is a 2-unit property. Please address this in the report."
  - 12. Quality and Condition Ratings:
    - All reports must include Q (Quality) and C (Condition) ratings for the subject and all comparables. This requirement also applies to 1025 and 2090 reports. For 1007 reports, ratings are required for the subject and all rental comparables.
    - Rejection Comment – Standard Reports: 'Per client requirement, please include "Q" and "C" ratings for "Quality" and "Condition" for the subject and all comps.'
    - Rejection Comment – 1007: '1007: Per client requirement, please include "Q" and "C" ratings for "Quality" and "Condition" for the subject and all rental comps.'
  - 13. Photo Addendum – Maximum Photos:
    - A maximum of 6 subject photos per photo addendum page is allowed. If a page contains more than 6 photos, reject.
    - Rejection Comment: "Per client instructions, please include no more than 6 photos on each photo addendum page."
  - 14. Two-Value Assignments:
    - The report must be completed Subject To for the As-Repaired Value (ARV). ARV comparables must be gridded as Comps 1–3. As-Is comparables must be gridded separately as Comps 4–6.
    - The same comparables cannot be used for both values. If the same comps are used, escalate.
    - Rejection Comment: "The client requires the report to be completed for the ARV. Please update the report to Subject To, with the ARV comps gridded as Comps 1–3 and the As-Is comps gridded as Comps 4–6."
    - Escalation Comment: "As per the engagement letter, the same comps cannot be used for the As-Is and As-Repaired values. Please revise accordingly."
  - 15. Heating System – BPL:
    - The report must address whether the subject's heating system is functioning. A statement that the mechanical systems are functioning is acceptable. Inability to test due to hot weather is acceptable.
    - Rejection Comment: "Please address whether the subject's heating system is functioning."
  - 16. Special Assessments – BPL:
    - If a special assessment is reported, check for supporting commentary. If commentary is missing, send a revision request.
  - 17. Condition and Quality Adjustments – BPL:
    - If the subject's condition or quality differs from a comparable and a zero adjustment is applied, check for explanatory commentary. If no comment is provided, request a revision.
  - 18. Occupancy and Staging – BPL:
    - If the interior photos show personal items or belongings and the property appears vacant or staged, escalate to the WhatsApp group for clarification. Do not independently conclude tenant occupancy based only on these items.
  - 19. BPL Retail Orders – Repairs:
    - For BPL Retail orders, continue the normal review process but escalate repair concerns as with Visio reports. If the report contains repairs but is marked either As-Is or Subject To, escalate. This applies when BPL is the client, not when another client is listed and BPL appears only as the lender on the report.
  - 20. Property Photos – BPL:
    - Carefully review all photos for repairs, deferred maintenance, and cosmetic issues. Kitchen photos must clearly show the stove/appliances. If no stove is visible, request a comment confirming whether a stove is present.
    - Rejection Comment: "Please confirm whether a stove is present in the kitchen."
  - 21. BPL – Report Condition Requirements:
    - BPL generally requires As-Is reports only. If a report is marked Subject To, stop and escalate. Two-value reports may be completed Subject To for the ARV. Cosmetic repairs should be commented on but not made a condition of the report. Only health and safety issues should be made Subject To.
  - 22. Cosmetic Repairs vs. Health and Safety Repairs:
    - For BPL Mortgage and Coast2Coast Mortgage, only health and safety issues should be made Subject To. Cosmetic repairs should be addressed through commentary, not as conditions. If unsure whether an item is cosmetic or a health and safety issue, escalate.
    - Rejection Comment: "Please confirm if [INSERT REPAIR ITEM] is a health and safety issue. If not, please remove it as a Subject To item and comment on any needed repair."
  - 23. Duplicate Client Name:
    - For recent BPL orders, the client name may appear twice on the order page. This is acceptable if the client display name appears correctly in the report.
- Rain City Capital:
  - Conventional reports: Client requires conventional reports.
  - Health and safety: Health and safety issues must be a subject to condition. If health and safety issues exist and report is As-Is, reject as: "Health and safety issues must make the report Subject To."
  - 2 value reports: 2 value reports must be completed 'Subject to,' with an additional grid for the 'As Is' value.
  - Cost to cure: NO cost to cure for cosmetic items. If a cost to cure is included for cosmetic items, reject as: "Please remove cost to cure for cosmetic items."
  - 1004MC Form: No 1004MC OK (1004MC form is not required).
  - Payment Status: Must be PAID.
- TheLender:
  - Smoke/CO Detectors: Ensure photos of smoke and CO detectors are included if they are present and required to be installed. If not, status is "Not Fulfilled" with comment: "Please confirm if smoke/CO detectors are present/required and include photos."

- East Coast Capital Corp:
  - Cost Approach Completion: This client requires the cost approach to be completed, even if not weighted. If the cost approach is not completed, reject as: "This client requires the Cost Approach to be completed for their own internal lending purposes. Whether the appraiser chooses to weight this approach is solely up to the appraiser."
- Plaza home mortage:
  - Invoice (NY State Only): If the property state is NY, verify that an invoice is NOT included in the report. If an invoice is found, the status is "Needs Review" with the comment: "Can the appraiser please remove the invoice from the report? This will be delivered to the client as a separate document. Please also ask the appraiser to upload the invoice to the Supporting Documents section."
  - Client Email Address: Verify that the client's email address is present in the report. If it is missing, the status is "Needs Review" with the comment: "The report can be completed, but advise the team that we could not email the report to the client because there is no email address."
  - Invoice Upload (Non-NY): For states other than NY, if an invoice is required but not found in the report, the status is "Needs Review" with the comment: "Complete the order and advise the team that the appraiser needs to upload the invoice to the supporting documents."
- Lend with Aloha LLC ISAOA/ATIMA / Malama Funding LLC ISAOA/ATIMA:
  - Two-Value Reports:
    - The report must be completed "Subject To", with the ARV comparables in slots 1–3. If completed otherwise, status should be "Not Fulfilled" with comment: "The report must be completed Subject To, with the ARV comparables in slots 1–3."
    - As-Is comparables do not need to be gridded; the appraiser must provide commentary on the As-Is comparables in the report. If the As-Is comparables are gridded, that is also acceptable. If commentary is missing and comps are not gridded, status should be "Not Fulfilled" with comment: "As-Is comparables commentary missing from report. Per client instructions: As-Is comparables do not need to be gridded, but the appraiser must provide commentary on the As-Is comparables in the report (gridding them is also acceptable)."
    - Single-Value Reports: If the report is single-value, status is "Fulfilled".
- CIVIC:
  - As-Is Value Order: Only CIVIC and Capital Funding Financial require the As-Is value to be presented first on two-value reports. For reports with two values (e.g., "As-Is" and "As-Repaired"), verify that the "As-Is" value is presented first.
  - Freddie Mac Unacceptable Practices: Do not perform the Freddie Mac Unacceptable Practices review for CV3 or CIVIC. Status should be "Fulfilled" with comment: "Do not perform the Freddie Mac Unacceptable Practices review for CV3 or CIVIC per client instructions."
- National Loan Funding LLC/ Easy Street Capital, LLC:
  - Prior Services Statement: If the appraiser indicates that they performed services on the subject property within the last three years, STOP and ESCALATE. Status should be "Needs Review" with comment: "The appraiser performed prior services on the subject property within the three-year period. Please refer to the screenshot and advise."
  - Supervisory Section: If the appraiser signs the supervisory section and marks "Did Inspect" for both the interior and exterior of the subject property, no escalation is required. For comparable properties, either "Did" or "Did Not" is acceptable. If the supervisory section is signed and "Did Inspect" for both interior and exterior is not marked, status should be "Needs Review" with comment: "Supervisory appraiser signed the supervisory section, but did not mark 'Did Inspect' for both the interior and exterior of the subject property. Please escalate for review." If the supervisory section is not signed, status is "Fulfilled".
  - Lender Address: The correct lender address for all orders is: 3232 E Cesar Chavez St, Suite 1-320, Austin, TX 78702. If a new report contains the old lender address, send a revision request. Reject as: "Please update the lender address to the following:\n\n3232 E Cesar Chavez St, Suite 1-320, Austin, TX 78702."
- Capital Funding Financial:
  - Two-Value Reports (As-Is with ARV): For all two-value reports (As-Is with ARV), the As-Is value must be presented first. The As-Is value must be reflected in the Reconciliation section, with the As-Is comparables included in the grid as Comparables 1–3. If the report is completed for the As-Repaired Value first, the status should be "Not Fulfilled" and reject with the following comment: "The client requires the report to be completed for the As-Is value. Please update the report to show the As-Is value in the Reconciliation section, with the As-Is comparables included in the grid as Comparables 1–3." If the report is completed for the As-Is value first or is single-value, the status is "Fulfilled".
- Sierra Pacific Mortgage Company
  - 1004MC must needed
- Temple View:
  - Two-Value Reports:
    - The report must be completed "Subject To", with the ARV comparables in slots 1–3. If completed otherwise, status should be "Not Fulfilled" with comment: "The report must be completed Subject To, with the ARV comparables in slots 1–3."
    - As-Is comparables do not need to be gridded; the appraiser must provide commentary on the As-Is comparables in the report. If the As-Is comparables are gridded, that is also acceptable. If commentary is missing and comps are not gridded, status should be "Not Fulfilled" with comment: "As-Is comparables commentary missing from report. Per client instructions: As-Is comparables do not need to be gridded, but the appraiser must provide commentary on the As-Is comparables in the report (gridding them is also acceptable)."
    - Single-Value Reports: If the report is single-value, status is "Fulfilled".
- June Point Lending:
  - Form 1004MC Required: Form 1004MC (Market Conditions Addendum) is required. If missing, status is "Not Fulfilled" with comment: "Form 1004MC (Market Conditions Addendum) is required for June Point Lending. Please include Form 1004MC." If present, status is "Fulfilled".
  - Standard Review Process: Standard appraisal review guidelines apply. Treat as a normal client.
- Kind Lending:
  - ENV File: An ENV file is not required. XML and PDF files are sufficient.
  - 1004MC Form: The 1004MC form is not required.
- Loandepot:
  - Product Type: Escalate if the product type does not match the report.
  - LoanDepot - Second Kitchen: If the subject has a second interior kitchen, request comments on zoning compliance, health/safety/structural risks, workmanship, and impact on marketability/value. Outdoor backyard kitchens are acceptable. Do not make the report Subject-To removal of the kitchen.
  - LoanDepot - Smoke/CO Detectors: Reports must not be Subject-To solely for smoke/CO detector repairs. If the report is Subject-To only for these detectors, escalate.
  - 1004MC Form: The 1004MC form is a mandatory client requirement. Verify its presence and completion. If the appraiser has commented that it is not needed, this is incorrect and should be flagged. Status should be "Not Fulfilled" if missing or commented as not needed.
  - General Instructions: For any required revisions, do not mention page numbers in the comments, especially for ENV files. Revisions should be posted on the internal group for review before sending to the appraiser.

- Dart Bank:
  - ENV File: No ENV anymore. PDF is always ok.
  - Payment Status: Verify the order is marked as PAID.
- The Loan Store:
  - 1. Page Numbers in Revision Requests:
    - Do not mention page numbers in revision language for ENV reports.
    - Page numbers may be used for regular XML/PDF reports only.
  - 2. Utah – Water Heater Requirements:
    - For properties in Utah, verify that the appraiser addresses whether the water heater is double strapped.
  - 3. 1007 Rent Schedule:
    - If the product is only a 1007 Rent Schedule, an ENV is not required. PDF-only submission is acceptable.
  - 4. Environmental Addendum – Commercial Reports:
    - All commercial appraisal reports must include an Environmental Addendum.
    - If missing, reject with the following comment: "The client requires an Environmental Addendum to be included in all commercial appraisals. Please include it."
  - 5. Lender/Client Name:
    - Remove "Inc" from the lender/client name. The correct name is The Loan Store.
  - 6. Product Type Mismatch:
    - If the product type does not match the appraisal report, STOP and ESCALATE.
  - 7. ENV Revision Not Addressed:
    - If a requested revision has not been addressed, begin the rejection request with:
      We are not seeing the below addressed in the ENV:

      (Revision Request)

      Thank you!
  - 8. Initial Report – HOLD:
    - Hold all initial reports for The Loan Store as per Kedar Sir's instructions.
  - 1004MC Form: Verify the 1004MC form is included and completed.
- Champions funding:
  - E&O Insurance: Verify that the appraiser's E&O (Errors and Omissions) insurance document is attached to the report. If not attached, status is "Not Fulfilled" with comment: "Per client instructions for their assignments, please attach appraiser's E&O to the report."
  - Value vs. Predominant Value: Check if the appraised value is more than 10% higher or lower than the 'predominant value' from the neighborhood section. If it is, and no explanatory comment exists, the status is "Not Fulfilled".
    - If value is lower, comment: "Appraised value is lower than Predominant value. Appraiser to comment whether it is an under improvement and if there is any impact on the value and marketability of the subject property".
    - If value is higher, comment: "Appraised value is higher than Predominant value. Appraiser to comment whether it is an over improvement and if there is any impact on the value and marketability of the subject property."
- GFL Capital Mortgage:
  - Value vs. Purchase Price: If the final appraised value is lower than the purchase price, the status should be "Needs Review" with the comment: "Final value is lower than purchase price, please advise".
 
- Futures Financial:
  - Reviewer Level: Only senior members should review these reports.
  - Orders of FRANCIS, Richel / Product Type Requirements:
    - If the product type is As-is with ARV then as-is report will be OK just make sure 2 values are there (both 'As-Is' and 'ARV' values). If 2 values are not present, reject as: "Product type is 'As-is with ARV'. Per Futures Financial requirements: If the product type is As-is with ARV then as-is report will be OK just make sure 2 values are there. Only 1 value was detected in the report. Please ensure both 'As-Is' and 'ARV' values are provided."
    - The report needs to be 'subject-to' only when product type says Desktop. If the product type is Desktop and the report is not completed 'Subject To', reject as: "Product type is 'Desktop'. Per Futures Financial requirements: The report needs to be 'subject-to' only when product type says Desktop. Please revise report to 'Subject To'."
- Cardinal financial company:
  - No 1004MC is OK
- Deephaven Mortgage LLC:
  - Built-Up Status: If "Built Up" in the neighborhood section is "Over 75%", the status should be "Needs Review" with the comment: "Please confirm if 75% built-up status impacts marketability of the subject property."
- OCMBC:
  - Smoke/CO Detectors: Make sure to reject for Smoke/CO Detectors. Verify the report comments on whether smoke/CO detectors were or were not present. If missing or not addressed, status is "Not Fulfilled" and reject as: "Please comment if smoke/CO detectors were or were not present."
  - Water Heater Double Strapping: Make sure to reject for whether the water heater is double strapped and if these are required by law. Verify the report comments on whether the hot water heater is properly double strapped and whether these are required by law. If missing or not addressed, status is "Not Fulfilled" and reject as: "Please comment if the hot water heater is properly double strapped and if these are required by law."
- Loanguys.com inc:
  - Quality and Condition Ratings: All reports must use the "Q" and "C" ratings for "Quality" and "Condition" for the subject and all comps. This is needed on 1025 and 2090 reports also. All reports! If missing, reject as: "Per client requirement, please include 'Q' and 'C' ratings for 'Quality' and 'Condition' for the subject and all comps."
- Paramount Residential Mortgage Group:
  - Lender Name Formatting: Verify if the lender name "Paramount Residential Mortgage Group" includes "INC".
    - Team Note: Moving forward, if below is the only revision for this client, you can disregard and submit. No approval needed. Let me know if you have any questions.
    - If "INC" is included, status should be "Needs Review" with comment: "Lender name includes 'INC'. Team - Please note that moving forward, if below is the only revision for this client, you can disregard and submit. No approval needed. Let me know if you have any questions.\n\n1. Please remove the 'INC' from lender name: Paramount Residential Mortgage Group."
    - If "INC" is not included, status is "Fulfilled".
- Arc Home LLC:
  - Short Term Rental (STR) Escalation & Regulations:
    - If an ARC order includes STR, STOP and ESCALATE for review and revision instructions.
    - When they have "Short term rental" or "STR" in the product type, the appraiser must address short term rental regulations, such as whether the local jurisdiction allows short term rentals per the zoning requirements or if they require the owners to obtain a license.
  - If not an STR order, status is "Fulfilled".
- CV3 Financial:
  - Borrower Name and Entity Name: The borrower name field should include the "Entity Name", and then the appraiser should comment the individual borrower's name on an addendum in the report.
    - Example: Entity: Lindsey Estates LLC, Individual Borrower: Richard Lindsey. "Lindsey Estates LLC" should be in the Borrower name field. Then the appraiser should comment that 'the individual borrower is Richard Lindsey' (or 'The order from the client includes Richard Lindsey named as the individual borrower').
    - If the borrower field contains an entity name and the individual borrower is not commented on an addendum, status is "Not Fulfilled" and reject as: "Please comment that the individual borrower is [Individual's Name]."
    - If there is any confusion, please escalate. We will discuss in Friday's meeting.
  - Freddie Mac Unacceptable Practices: Do not perform the Freddie Mac Unacceptable Practices review for CV3 or CIVIC. Status should be "Fulfilled" with comment: "Do not perform the Freddie Mac Unacceptable Practices review for CV3 or CIVIC per client instructions."
- Nationwide Mortgage Bankers:
  - Hurricane Damage Statement (Florida): Effective immediately, all appraisals for the state of Florida must state if there was any hurricane damage from Helene or Milton. If the subject is located in Florida and the appraiser does not address "Hurricane Helene" or "Hurricane Milton", reject as: "Please address if the subject has suffered any damage from the recent hurricanes Helene and Milton."
  - Hurricane Damage Statement (Georgia, North Carolina, South Carolina, Tennessee, Virginia): Effective immediately, all appraisals in Georgia, North Carolina, South Carolina, Tennessee, and Virginia must state that there is no hurricane damage from Helene. If the subject is located in any of these states and the appraiser does not address "Hurricane Helene", reject as: "Please address if the subject has suffered any damage from the recent hurricane Helene."
- Logan Financial / Logan Finance:
  - Smoke/CO Detectors: Commentary on their presence in the dwelling + photos are needed. Verify the report includes commentary on the presence of smoke/CO detectors in the dwelling and includes photos. If not provided or missing, status is "Not Fulfilled" and reject as: "Please confirm if smoke/CO detectors are present/required and include photos"

- New American Funding (NAF):
  - 1004MC: A 1004MC is not required for New American Funding orders. Status is "Fulfilled" with comment: "A 1004MC is not required for New American Funding orders."
  - ROV (Reconsideration of Value) – Review and Escalation: For all NAF ROVs under Coast to Coast (C2C) and Fastapp, review the ROV and revised report, then escalate. Do not complete or reject the ROV until approval is received. All NAF ROVs must be approved before completion, including rush orders and orders without a file number. Status is "Needs Review" with escalation format:
    [File #]
    New American Funding, LLC
    Paid
    ROV is good to go
  - Health and Safety Issues: All health and safety issues must be made Subject To Repair, including smoke detectors, carbon monoxide detectors, and water heater straps when required. If health and safety issues are present and report is completed As-Is, status is "Not Fulfilled".
- Haus Capital:
  - Subject To Advise / Escalation: (Remember they may have a different lender on the report). If the report is made "Subject To" when the client is Haus, advise and escalate as: "The client is Haus and report made subject to [reason], please advise". Status should be "Needs Review". You can review and reject as normal, but advise whenever a report is "Subject To" for Haus. If the report is "As-Is", status is "Fulfilled".
- Homebridge Financial Services:
  - MLS Comparables: At least 2 sold MLS comparables are required within the subject’s town/municipality and market area. If unavailable, provide detailed commentary explaining why nearby towns are comparable. Rental comps do not require MLS sources. If fewer than 2 sold MLS comparables are found in the subject's town/municipality and detailed commentary is missing, status is "Not Fulfilled" with comment: "Per Homebridge requirements: At least 2 sold MLS comparables are required within the subject's town/municipality and market area. Please provide detailed commentary explaining why nearby towns are comparable."
  - Homebridge Supervisory Appraiser: The assigned appraiser may sign as the Supervisory Appraiser without inspecting the property. The only exception is when a trainee signs as the original appraiser on an FHA assignment. If a trainee signs as original appraiser on an FHA assignment and the supervisory appraiser did not inspect, status is "Not Fulfilled" with comment: "Per Homebridge requirements: Trainee signed as original appraiser on an FHA assignment, so the Supervisory Appraiser is required to inspect the property."
- Eastview Investment Partners:
  - Desk Review Escalation: Every desk review report must be escalated for Eastview Investment Partners. If the report is a desk review, the status should be "Needs Review" with the comment: "This is a desk review report for Eastview Investment Partners. Every desk review report must be escalated." (For other clients, escalation is not required).
  - Desk Review Form Type: For Eastview Investment Partners, the Desk Review (2006) short form is not accepted. The client requires the FRE 1033 Desk Review to be completed. If the report uses the Desk Review (2006) short form, the status should be "Not Fulfilled" and reject as: "The client requires the FRE 1033 Desk Review to be completed. Please provide the FRE 1033 form." (For other clients, Desk Review (2006) short form is acceptable).
- Homeland Lending, LLC:
  - Client Instructions: Right now no instructions for Homeland Lending, LLC. Follow standard appraisal guidelines. Status should be "Fulfilled" with the comment: "Right now no instructions for Homeland Lending, LLC."
- CrossCountry Mortgage:
  - 3.6 Transition: CrossCountry Mortgage is transitioning to 3.6 on 10/14. Status should be "Fulfilled" with comment: "CrossCountry Mortgage is transitioning to 3.6 on 10/14."
  - EAD SSRs (3.6 FHA Reports): EAD SSRs should produce for 3.6 FHA reports now for the clients we run SSRs for. If any issues or if EAD SSR is not producing, the status should be "Needs Review" with comment: "EAD SSRs should produce for 3.6 FHA reports now for the clients we run SSRs for. If any issues, please escalate." If the report is not an FHA report, status is "Fulfilled" or "Not Applicable" with comment: "Report is not an FHA report. EAD SSR requirement applies to 3.6 FHA reports."
- Churchill Real Estate:
  - Rural Property – HOLD and Escalate: If the property is marked as "Rural", place the report on HOLD and escalate for review. Status should be "Needs Review" with comment: "Property is marked as 'Rural'. Per client instructions, place report on HOLD and escalate for review." If not rural, status should be "Fulfilled".
  - FIRREA (1989) Compliance Commentary: Ensure the appraisal report includes a statement/comment confirming compliance with FIRREA requirements (1989), similar to the Ice Lender requirement. If FIRREA commentary is missing, the status should be "Not Fulfilled" and reject as: "Per client instructions: All appraisal reports must contain commentary indicating that the report was prepared in accordance with FIRREA requirements."
  - Two-Value Reports – Required Format: The main report must be completed "Subject To" with the "As Repaired" value reflected under Comparables 1–3. The additional grid must be used to develop the "As Is" value. If it is a two-value report and not completed "Subject To", status should be "Not Fulfilled" with comment: "Per client instructions: The main report must be completed 'Subject To' with the 'As Repaired' value reflected under Comparables 1–3, and the additional grid must be used to develop the 'As Is' value." If it is a single-value report, status is "Fulfilled" or "Not Applicable".
- LXAI LLC:
  - Engagement Letter & Lender Address: Please upload the new engagement letter, as the current engagement letter shows the old address. Status should be "Not Fulfilled" and reject as: "So sorry but please update the lender address to their new address as it was not quite updated in the system. A new engagement letter with this address has been uploaded:"
- Standard Mortgage Capital LLC:
  - SSR Generation: SSRs 'should' generate now for this client. Verify that SSR (Submission Summary Report) is generated and present without issues. If SSR is missing, not producing, or has issues/errors, the status should be "Needs Review" with comment: "SSRs 'should' generate now for this client. Please advise if any issues with SSRs for Standard Mortgage Capital LLC." If SSR is generated successfully, status is "Fulfilled".
- TPC Legacy LLC:
  - Modular / Manufactured Home Foundation Commentary: For modular or manufactured homes, verify the report includes commentary stating whether the subject is affixed or will be affixed to a permanent foundation. If comment is not provided, the status should be "Not Fulfilled" and reject as: "Appraiser must comment if the subject is already affixed or will be affixed, to a permanent foundation ."
  - Form 1004C (New Construction) Foundation Commentary: On the 1004C form for new construction, verify the report comments if the subject is already affixed or will be affixed to a permanent foundation. If comment is not provided, the status should be "Not Fulfilled" and reject as: "Appraiser to comment if the subject is already affixed or will be affixed, to a permanent foundation ."
- Dynamo Capital:
  - As-Is Comparables Requirement: If As-Is comparables are not provided in the report, the status should be "Not Fulfilled" and reject as: "Please include the As-Is development and valuation on an additional addendum attached to the report." If As-Is comparables / development and valuation are provided on an addendum or grid, status is "Fulfilled".
  - Two-Value Reports Format: The second value may be provided in narrative format and does not require a separate grid. Two product types are available: "Subject To (ARV) with As-Is" and "As-Is with Subject To (ARV)". If completed Subject To with an As-Repaired Value, the second value (As-Is) may be provided in narrative format. If completed As-Is, the ARV value may be provided in narrative format. Requirements depend on the product type ordered.
- HomeXpress Mortgage:
  - Auto Review: Run the Auto Review on ValueLink for all HomeXpress Mortgage reports.
  - Review Process: Review the appraisal report first. Then select “Run CrossCheck Results.” Review all errors and cross-verify them against the appraisal report.
  - Required Review Format: Always use the following format:
    Auto Review shows action required for the below points:
    - List the Auto Review points.

    As per the manual review, the below revisions are required:
    - List the manual review revisions.
  - Kedar Sir – HOLD and Escalate: Hold the report for Kedar Sir's review. Always escalate when the specified escalation criteria are met.
- Two-Value Reports (General):
  - Second Value Format & Product Types: The second value may be provided in narrative format and does not require a separate grid. Two product types are available: "Subject To (ARV) with As-Is" and "As-Is with Subject To (ARV)". If the report is completed Subject To with an As-Repaired Value, the second value (As-Is) may be provided in narrative format. If the report is completed As-Is, the ARV value may be provided in narrative format. Requirements depend on the product type ordered.
- Declining Market:
  - Required Commentary: If the appraiser indicates that the property is located in a declining market, the report must include clear and specific commentary explaining:
    - Reason for Selection: Why the appraiser determined that the market is declining.
    - Impact on Appraised Value: How the declining market conditions affect the appraised value.
  - Rejection Comment (If Commentary Is Missing):
    Please ensure the client's instructions are addressed. If the appraiser indicates that the property is located in a declining market, please provide clear and specific commentary explaining why the declining market condition was selected and how it impacts the appraised value.
  - If not in a declining market, status is "Fulfilled".
- 1004D Reports – Appraisal Validation Requirements:
  - Form Completion:
    - 1004D Final Inspection: Complete only the Certification of Completion section.
    - 1004D Appraisal Update: Complete only the Appraisal Update section.
  - Client/Lender Information:
    - At the top of Page 1, the Original Client/Lender must match the Client/Lender on the original appraisal report.
    - In the bottom signature card/certification section, the Client/Lender must match the Order Form.
  - Required Dates:
    - 1004D Final Inspection: The Date of Inspection is required.
    - 1004D Appraisal Update: The Effective Date of Appraisal Update is required. (A Date of Inspection on a 1004D Appraisal Update report is acceptable).
  - HUD Handbook 4000.1:
    - For 1004D Appraisal Update reports, the appraiser is not required to comment on whether the subject meets HUD Handbook 4000.1.
  - Street Photograph:
    - A street photograph is not mandatory. Do not reject a report for a missing street photograph. If a street photograph is already included, accept it.
  - Original Repair Conditions – HOLD and Escalate:
    - If the 1004D report does not appear to address the original repair conditions identified in the original appraisal report, STOP and ESCALATE.
- X Lend:
  - 1. As-Is Reports – Repairs:
    - Reports must be completed As-Is, without major repairs.
    - If the report is marked As-Is but includes major repairs, safety issues, or structural issues, STOP and ESCALATE.
    - Do not complete or reject the report until confirmation is received.
    - Escalation Comment:
      This is an X Lend report. The report is made As-Is, but the subject property has repairs. Please refer to the screenshot and advise.
  - 2. Cosmetic Repairs:
    - Cosmetic repairs are acceptable on As-Is reports if the appraiser specifically confirms that the repairs are cosmetic.
    - No escalation is required when repairs are cosmetic and clearly identified as such.
  - 3. BPL Mortgage, LLC – Lender-Specific Guidelines:
    - If the client is X Lend and the lender is BPL Mortgage, LLC, follow BPL guidelines when the report is As-Is with no major repairs.
    - For cosmetic repairs, check the cost to cure.
    - Deferred maintenance is acceptable and is not considered a major repair; however, request a cost-to-cure amount.
    - Safety or structural issues are considered major repairs.
  - 4. Escalation:
    - If the report is marked Subject To or contains major repairs but is presented as As-Is, STOP and ESCALATE before rejecting or completing the report.
`;

const CLIENT_OPTIONS = [
  { value: '', label: 'Auto-detect from Report' },
  { value: '1004D Reports', label: '1004D Reports – Appraisal Validation Requirements' },
  { value: 'Declining Market', label: 'Declining Market' },
  { value: 'Arc Home', label: 'Arc Home' },
  { value: 'Best2Lend LLC', label: 'Best2Lend LLC' },
  { value: 'BPL Mortgage, LLC', label: 'BPL Mortgage, LLC' },
  { value: 'Capital Funding Financial', label: 'Capital Funding Financial' },
  { value: 'Cardinal Financial Company', label: 'Cardinal Financial Company' },
  { value: 'Champions Funding', label: 'Champions Funding' },
  { value: 'Churchill Real Estate', label: 'Churchill Real Estate' },
  { value: 'CIVIC', label: 'CIVIC' },
  { value: 'Coast2Coast', label: 'Coast2Coast – Appraisal Review Requirements' },
  { value: 'CrossCountry Mortgage', label: 'CrossCountry Mortgage' },
  { value: 'CV3 Financial', label: 'CV3 Financial' },
  { value: 'Dart Bank', label: 'Dart Bank' },
  { value: 'Deephaven Mortgage LLC', label: 'Deephaven Mortgage LLC' },
  { value: 'Dynamo Capital', label: 'Dynamo Capital' },
  { value: 'East Coast Capital Corp', label: 'East Coast Capital Corp' },
  { value: 'Eastview Investment Partners', label: 'Eastview Investment Partners' },
  { value: 'Equity Wave Lending, Inc', label: 'Equity Wave Lending, Inc' },
  { value: 'Foundation Mortgage', label: 'Foundation Mortgage' },
  { value: 'Futures Financial', label: 'Futures Financial' },
  { value: 'GFL Capital Mortgage', label: 'GFL Capital Mortgage' },
  { value: 'Haus Capital', label: 'Haus Capital' },
  { value: 'Homebridge Financial Services', label: 'Homebridge Financial Services' },
  { value: 'Homeland Lending, LLC', label: 'Homeland Lending, LLC' },
  { value: 'HomeXpress Mortgage', label: 'HomeXpress Mortgage' },
  { value: 'Hometown Equity', label: 'Hometown Equity Mortgage / theLender' },
  { value: 'TheLender', label: 'theLender (Hometown Equity Mortgage)' },
  { value: 'Ice Lender Holdings LLC', label: 'Ice Lender Holdings LLC' },
  { value: 'June Point Lending', label: 'June Point Lending' },
  { value: 'Kind Lending', label: 'Kind Lending' },
  { value: 'Lend with Aloha', label: 'Lend with Aloha LLC ISAOA/ATIMA' },
  { value: 'Malama Funding', label: 'Malama Funding LLC ISAOA/ATIMA (formerly Lend with Aloha)' },
  { value: 'Logan Financial', label: 'Logan Financial / Logan Finance' },
  { value: 'LoanDepot', label: 'LoanDepot' },
  { value: 'Loanguys.com inc', label: 'Loanguys.com inc' },
  { value: 'LXAI LLC', label: 'LXAI LLC' },
  { value: 'National Loan Funding', label: 'National Loan Funding / Easy Street' },
  { value: 'Nationwide Mortgage Bankers', label: 'Nationwide Mortgage Bankers' },
  { value: 'New American Funding', label: 'New American Funding (NAF)' },
  { value: 'OCMBC', label: 'OCMBC' },
  { value: 'Paramount Residential Mortgage Group', label: 'Paramount Residential Mortgage Group (PRMG)' },
  { value: 'Plaza Home Mortgage', label: 'Plaza Home Mortgage' },
  { value: 'Rain City Capital', label: 'Rain City Capital' },
  { value: 'Sierra Pacific Mortgage Company', label: 'Sierra Pacific Mortgage Company' },
  { value: 'Standard Mortgage Capital LLC', label: 'Standard Mortgage Capital LLC' },
  { value: 'Temple View', label: 'TempleView / Temple View' },
  { value: 'The Loan Store', label: 'The Loan Store' },
  { value: 'TheLender', label: 'TheLender' },
  { value: 'TPC Legacy LLC', label: 'TPC Legacy LLC' },
  { value: 'Two-Value Reports', label: 'Two-Value Reports (General)' },
  { value: 'Visio Lending', label: 'Visio Lending' },
  { value: 'X Lend', label: 'X Lend' },
];

const ClientRequirementCheck = ({ onPromptSubmit, loading, response, error, detectedLender }) => {
  const [selectedClient, setSelectedClient] = useState('');
  const [filterValue, setFilterValue] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedIndex, setCopiedIndex] = useState(null);

  const cleanLender = typeof detectedLender === 'object'
    ? (detectedLender?.value || '')
    : String(detectedLender || '').trim();
  const validDetectedLender = cleanLender && !/^(?:see\s+addendum|see\s+attached|n\/?a|none)\b/i.test(cleanLender)
    ? cleanLender
    : '';

  const autoDetectLabel = validDetectedLender
    ? `Auto-detect from Report (${validDetectedLender})`
    : 'Auto-detect from Report';

  const handleCheck = () => {
    if (selectedClient) {
      onPromptSubmit(`Lender: ${selectedClient}\n\n${CLIENT_REQUIREMENT_PROMPT}`);
    } else if (validDetectedLender) {
      onPromptSubmit(`Lender: ${validDetectedLender}\n\n${CLIENT_REQUIREMENT_PROMPT}`);
    } else {
      onPromptSubmit(CLIENT_REQUIREMENT_PROMPT);
    }
  };

  const handleCopy = (text, idx) => {
    if (!text) return;
    const cleanText = typeof text === 'object' ? JSON.stringify(text) : String(text);
    if (navigator.clipboard) {
      navigator.clipboard.writeText(cleanText);
    }
    setCopiedIndex(idx);
    setTimeout(() => {
      setCopiedIndex(null);
    }, 2000);
  };

  const renderResponse = useCallback(() => {
    if (!response) return null;

    let data = response;
    if (typeof response === 'string') {
      try {
        data = JSON.parse(response);
      } catch (e) {
        return <pre>{response}</pre>;
      }
    }

    const summary = data?.summary ?? 'No summary available';
    const details = Array.isArray(data?.details) ? data.details : [];

    const renderValue = (val) => {
      if (val == null) return '';  
      if (typeof val === 'object') return JSON.stringify(val, null, 2);
      return String(val);
    };

    const normalizeStatus = (status) => {
      const s = String(status || '').trim().toLowerCase();
      if (['fulfilled', 'ok', 'pass', 'passed', 'yes'].includes(s)) return 'fulfilled';
      if (['needs review', 'review', 'escalate', 'needs attention', 'pending'].includes(s)) return 'review';
      if (['not fulfilled', 'failed', 'fail', 'no'].includes(s)) return 'not_fulfilled';
      if (['not applicable', 'n/a', 'na'].includes(s)) return 'na';
      return 'other';
    };

    const getStatusConfig = (status) => {
      const norm = normalizeStatus(status);
      switch (norm) {
        case 'fulfilled':
          return {
            label: status || 'Fulfilled',
            bg: '#e8f5e9',
            color: '#1b5e20',
            border: '#a5d6a7',
            icon: <CheckCircleIcon sx={{ fontSize: 16, color: '#2e7d32' }} />
          };
        case 'review':
          return {
            label: status || 'Needs Review',
            bg: '#fff8e1',
            color: '#b78103',
            border: '#ffe082',
            icon: <WarningIcon sx={{ fontSize: 16, color: '#f57f17' }} />
          };
        case 'not_fulfilled':
          return {
            label: status || 'Not Fulfilled',
            bg: '#ffebee',
            color: '#c62828',
            border: '#ef9a9a',
            icon: <CancelIcon sx={{ fontSize: 16, color: '#d32f2f' }} />
          };
        case 'na':
          return {
            label: status || 'Not Applicable',
            bg: '#f5f5f5',
            color: '#616161',
            border: '#e0e0e0',
            icon: <HelpOutlineIcon sx={{ fontSize: 16, color: '#757575' }} />
          };
        default:
          return {
            label: status || 'Unknown',
            bg: '#f0f4f8',
            color: '#334155',
            border: '#cbd5e1',
            icon: null
          };
      }
    };

    // Calculate metrics
    const counts = {
      all: details.length,
      fulfilled: details.filter(d => normalizeStatus(d.status) === 'fulfilled').length,
      review: details.filter(d => normalizeStatus(d.status) === 'review').length,
      not_fulfilled: details.filter(d => normalizeStatus(d.status) === 'not_fulfilled').length,
      na: details.filter(d => normalizeStatus(d.status) === 'na').length
    };

    // Extract detected client name from summary if possible
    let detectedClient = '';
    const clientMatch = summary.match(/(?:for|Lender\/Client|Client|Lender)\s*[:]?\s*([A-Za-z0-9\s,&.-]+?)(?:\.|$|,|\s+(?:requirements|has|is))/i);
    if (clientMatch && clientMatch[1]) {
      const candidate = clientMatch[1].trim();
      if (candidate.length > 2 && candidate.length < 50) {
        detectedClient = candidate;
      }
    }
    if (!detectedClient && validDetectedLender) {
      detectedClient = validDetectedLender;
    }

    const filteredDetails = details.filter(item => {
      const norm = normalizeStatus(item.status);
      if (filterValue === 'fulfilled' && norm !== 'fulfilled') return false;
      if (filterValue === 'review' && norm !== 'review') return false;
      if (filterValue === 'not_fulfilled' && norm !== 'not_fulfilled') return false;
      if (filterValue === 'na' && norm !== 'na') return false;
      if (filterValue === 'action_needed' && norm !== 'review' && norm !== 'not_fulfilled') return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const reqMatch = String(item.requirement || '').toLowerCase().includes(q);
        const valMatch = String(item.value_or_comment || '').toLowerCase().includes(q);
        const statusMatch = String(item.status || '').toLowerCase().includes(q);
        if (!reqMatch && !valMatch && !statusMatch) return false;
      }

      return true;
    });

    // Priority sort: Not Fulfilled -> Needs Review -> Fulfilled -> N/A
    const getSortPriority = (status) => {
      const norm = normalizeStatus(status);
      if (norm === 'not_fulfilled') return 1;
      if (norm === 'review') return 2;
      if (norm === 'fulfilled') return 3;
      if (norm === 'na') return 4;
      return 5;
    };

    const sortedDetails = [...filteredDetails].sort((a, b) => {
      return getSortPriority(a.status) - getSortPriority(b.status);
    });

    return (
      <Stack spacing={3} sx={{ mt: 3 }}>
        {summary && (
          <Paper
            elevation={2}
            sx={{
              p: 2.5,
              borderRadius: 2,
              borderLeft: '5px solid #1976d2',
              bgcolor: '#f8fafc'
            }}
          >
            <Stack direction="row" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={1} sx={{ mb: 1 }}>
              <Typography variant="h6" component="div" sx={{ fontWeight: 600, color: 'primary.main', display: 'flex', alignItems: 'center', gap: 1 }}>
                <ClientIcon sx={{ fontSize: 22 }} /> Client Summary
              </Typography>
              {detectedClient && (
                <Chip
                  icon={<ClientIcon sx={{ fontSize: '16px !important' }} />}
                  label={`Client: ${detectedClient}`}
                  color="primary"
                  variant="outlined"
                  size="small"
                  sx={{ fontWeight: 600, bgcolor: 'primary.50' }}
                />
              )}
            </Stack>
            <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.6, color: '#334155' }}>
              {renderValue(summary)}
            </Typography>
          </Paper>
        )}

        {details.length > 0 && (
          <Paper elevation={2} sx={{ p: 2.5, borderRadius: 2 }}>
            {/* Header and Quick-Filter Chips */}
            <Stack spacing={2} sx={{ mb: 2.5 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1.5}>
                <Typography variant="h6" component="div" sx={{ fontWeight: 600, color: '#1e293b' }}>
                  Requirement Rules ({details.length})
                </Typography>

                <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                  <TextField
                    size="small"
                    placeholder="Search requirements or comments..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    sx={{ width: { xs: '100%', sm: 260 } }}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <SearchIcon fontSize="small" sx={{ color: '#94a3b8' }} />
                        </InputAdornment>
                      ),
                      endAdornment: searchQuery ? (
                        <InputAdornment position="end">
                          <IconButton size="small" onClick={() => setSearchQuery('')}>
                            <ClearIcon fontSize="small" />
                          </IconButton>
                        </InputAdornment>
                      ) : null
                    }}
                  />

                  <FormControl size="small" sx={{ minWidth: 160 }}>
                    <InputLabel id="client-status-filter-label">Filter Status</InputLabel>
                    <Select
                      labelId="client-status-filter-label"
                      id="client-status-filter"
                      value={filterValue}
                      label="Filter Status"
                      onChange={(e) => setFilterValue(e.target.value)}
                    >
                      <MenuItem value="all">All ({counts.all})</MenuItem>
                      <MenuItem value="action_needed">Action Needed ({counts.not_fulfilled + counts.review})</MenuItem>
                      <MenuItem value="not_fulfilled">Not Fulfilled ({counts.not_fulfilled})</MenuItem>
                      <MenuItem value="review">Needs Review ({counts.review})</MenuItem>
                      <MenuItem value="fulfilled">Fulfilled ({counts.fulfilled})</MenuItem>
                      <MenuItem value="na">Not Applicable ({counts.na})</MenuItem>
                    </Select>
                  </FormControl>
                </Stack>
              </Stack>

              {/* Status Counter Chips for One-Click Filtering */}
              <Stack direction="row" spacing={1} flexWrap="wrap" gap={1}>
                <Chip
                  label={`All (${counts.all})`}
                  size="small"
                  clickable
                  color={filterValue === 'all' ? 'primary' : 'default'}
                  variant={filterValue === 'all' ? 'filled' : 'outlined'}
                  onClick={() => setFilterValue('all')}
                  sx={{ fontWeight: 600 }}
                />
                {counts.not_fulfilled > 0 && (
                  <Chip
                    icon={<CancelIcon sx={{ fontSize: '15px !important', color: filterValue === 'not_fulfilled' ? '#fff' : '#d32f2f' }} />}
                    label={`Not Fulfilled (${counts.not_fulfilled})`}
                    size="small"
                    clickable
                    color="error"
                    variant={filterValue === 'not_fulfilled' ? 'filled' : 'outlined'}
                    onClick={() => setFilterValue('not_fulfilled')}
                    sx={{ fontWeight: 600 }}
                  />
                )}
                {counts.review > 0 && (
                  <Chip
                    icon={<WarningIcon sx={{ fontSize: '15px !important', color: filterValue === 'review' ? '#fff' : '#ed6c02' }} />}
                    label={`Needs Review (${counts.review})`}
                    size="small"
                    clickable
                    color="warning"
                    variant={filterValue === 'review' ? 'filled' : 'outlined'}
                    onClick={() => setFilterValue('review')}
                    sx={{ fontWeight: 600 }}
                  />
                )}
                {counts.fulfilled > 0 && (
                  <Chip
                    icon={<CheckCircleIcon sx={{ fontSize: '15px !important', color: filterValue === 'fulfilled' ? '#fff' : '#2e7d32' }} />}
                    label={`Fulfilled (${counts.fulfilled})`}
                    size="small"
                    clickable
                    color="success"
                    variant={filterValue === 'fulfilled' ? 'filled' : 'outlined'}
                    onClick={() => setFilterValue('fulfilled')}
                    sx={{ fontWeight: 600 }}
                  />
                )}
                {counts.na > 0 && (
                  <Chip
                    icon={<HelpOutlineIcon sx={{ fontSize: '15px !important' }} />}
                    label={`N/A (${counts.na})`}
                    size="small"
                    clickable
                    variant={filterValue === 'na' ? 'filled' : 'outlined'}
                    onClick={() => setFilterValue('na')}
                    sx={{ fontWeight: 600 }}
                  />
                )}
              </Stack>
            </Stack>

            <TableContainer sx={{ border: '1px solid #e2e8f0', borderRadius: 1.5 }}>
              <Table size="small">
                <TableHead sx={{ bgcolor: '#f1f5f9' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700, width: '30%', color: '#1e293b' }}>Requirement</TableCell>
                    <TableCell sx={{ fontWeight: 700, width: '18%', color: '#1e293b' }}>Status</TableCell>
                    <TableCell sx={{ fontWeight: 700, width: '52%', color: '#1e293b' }}>Value / Revision Comment</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {sortedDetails.length > 0 ? (
                    sortedDetails.map((item, index) => {
                      const cfg = getStatusConfig(item.status);
                      const commentText = renderValue(item.value_or_comment);
                      const isActionNeeded = ['not_fulfilled', 'review'].includes(normalizeStatus(item.status));

                      return (
                        <TableRow
                          key={index}
                          hover
                          sx={{
                            '&:nth-of-type(even)': { bgcolor: '#f8fafc' },
                            '&:hover': { bgcolor: '#f1f5f9 !important' }
                          }}
                        >
                          <TableCell sx={{ fontWeight: 600, color: '#334155', verticalAlign: 'top', pt: 1.5 }}>
                            {renderValue(item.requirement)}
                          </TableCell>
                          <TableCell sx={{ verticalAlign: 'top', pt: 1.5 }}>
                            <Box
                              sx={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 0.75,
                                px: 1.2,
                                py: 0.5,
                                borderRadius: '16px',
                                fontSize: '0.8125rem',
                                fontWeight: 700,
                                bgcolor: cfg.bg,
                                color: cfg.color,
                                border: `1px solid ${cfg.border}`,
                                whiteSpace: 'nowrap'
                              }}
                            >
                              {cfg.icon}
                              <span>{cfg.label}</span>
                            </Box>
                          </TableCell>
                          <TableCell sx={{ verticalAlign: 'top', pt: 1.5 }}>
                            <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1 }}>
                              <Typography
                                variant="body2"
                                sx={{
                                  color: isActionNeeded ? '#991b1b' : '#334155',
                                  fontWeight: isActionNeeded ? 500 : 400,
                                  lineHeight: 1.6,
                                  wordBreak: 'break-word',
                                  ...(isActionNeeded ? {
                                    p: 1,
                                    borderRadius: 1,
                                    bgcolor: normalizeStatus(item.status) === 'review' ? '#fffbeb' : '#fef2f2',
                                    border: `1px solid ${normalizeStatus(item.status) === 'review' ? '#fde68a' : '#fecaca'}`,
                                    fontStyle: 'normal'
                                  } : {})
                                }}
                              >
                                {commentText}
                              </Typography>
                              {commentText && (
                                <Tooltip title={copiedIndex === index ? "Copied to clipboard!" : "Copy revision prompt / comment"} arrow>
                                  <IconButton
                                    size="small"
                                    onClick={() => handleCopy(commentText, index)}
                                    sx={{
                                      color: copiedIndex === index ? '#16a34a' : '#64748b',
                                      flexShrink: 0,
                                      mt: 0.25,
                                      '&:hover': { color: '#0f172a', bgcolor: '#e2e8f0' }
                                    }}
                                  >
                                    {copiedIndex === index ? <CheckIcon fontSize="small" /> : <ContentCopyIcon fontSize="small" />}
                                  </IconButton>
                                </Tooltip>
                              )}
                            </Box>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  ) : (
                    <TableRow>
                      <TableCell colSpan={3} align="center" sx={{ py: 3, color: '#64748b' }}>
                        No requirements match the current filter or search criteria.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        )}
      </Stack>
    );
  }, [response, filterValue, searchQuery, copiedIndex, validDetectedLender]);

  return (
    <div id="client-requirement-check-section" className="card shadow mb-4">
      <div className="card-header CAR1 bg-primary text-white d-flex align-items-center justify-content-between">
        <strong style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <ClientIcon style={{ fontSize: '20px' }} /> Client Requirement Check
        </strong>
      </div>
      <div className="card-body">
        <Stack spacing={2}>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ xs: 'stretch', md: 'center' }}>
            <FormControl size="small" sx={{ minWidth: 320, flex: 1, bgcolor: '#ffffff' }}>
              <InputLabel id="client-select-label">Client / Lender (Auto-detect or Select)</InputLabel>
              <Select
                labelId="client-select-label"
                value={selectedClient}
                label="Client / Lender (Auto-detect or Select)"
                onChange={(e) => setSelectedClient(e.target.value)}
              >
                {CLIENT_OPTIONS.map((opt) => (
                  <MenuItem key={opt.value} value={opt.value}>
                    {opt.value === '' ? autoDetectLabel : opt.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <Button
              onClick={handleCheck}
              variant="contained"
              color="secondary"
              disabled={loading}
              sx={{ fontWeight: 600, height: 40, px: 3, whiteSpace: 'nowrap' }}
            >
              {loading ? <CircularProgress size={24} color="inherit" /> : 'Check Client Requirements'}
            </Button>
          </Stack>
          {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
          {response && renderResponse()}
        </Stack>
      </div>
    </div>
  );
};

export default ClientRequirementCheck;

