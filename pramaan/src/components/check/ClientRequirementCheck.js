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
- "requirement": A string describing the client-specific rule being checked.
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
  - Intended Use/User Verbiage: Verify the report contains the specific "Intended User" and "Intended Use" statements.
    - Intended User: "Equity Wave Lending, Inc. it's investors, assignees, and/or successors"
    - Intended Use: "The making, arranging, or selling of a private money/hard money loan"
    - If either is missing, status is "Not Fulfilled" with comment: "Please include the required Intended Use/User verbiage."
- Hometown equity:
  - Smoke/CO Detectors: Please confirm if smoke/co detectors are installed and ask for photos.
- FOUNDATION MORTGAGE:
  - Short Term Rental (STR) Form: If the product type includes "STR 1007", verify that the specific STR form is used, not a standard 1007 form.
- BPL Mortgage, LLC:
  - Smoke/CO Detectors: Ensure comments address whether detectors are present and required by law. Missing detectors alone do not require Subject-To status for BPL. Reject as: "Please address if smoke/CO detectors were present and required by law."
  - Value Difference: If final value is over 10% higher than listing/purchase price, check comments; if missing, escalate. For As-Is with ARV, compare with As-Is value. Reject as: "Can the appraiser address any potential reasons from the contract why the purchase price is significantly lower than market value?"
  - Prior Sale: Check prior sale history and improvements comments. Escalate if unexplained. Reject as: "Please address the increase in value since the subject's prior sale."
  - Cost Approach: Must be completed. Reject as: "This client requires the Cost Approach to be completed for internal lending purposes. Whether the appraiser chooses to weight this approach is solely up to the appraiser."
  - Freddie Mac: No need to review Freddie Mac unacceptable practices for BPL.
  - Repairs/Deferred Maintenance: Check photos and request cost-to-cure for repairs/deferred maintenance. No cost-to-cure request is needed for 1004D reports with outstanding repairs. Reject as: "Please provide cost to cure for the repairs/deferred maintenance."
  - Bedroom Photos: Label as Bedroom 1, Bedroom 2, etc. Reject as: "The bedroom photos need to be labeled as “Bedroom 1,” “Bedroom 2,” etc. Please revise accordingly."
  - Comparable Distance Guidelines: Urban <= 1 mile, Suburban <= 1 mile, Rural <= 5 miles. Check comments for comps exceeding limits; reject if no explanation is provided.
  - Multifamily Units: Subject and comparable unit counts should match. Request comments for differences.
  - Q/C Ratings: All reports must include Quality (Q) and Condition (C) ratings for the subject and comps, including 1025/2090. For 1007, include the subject and all rental comps.
  - Photo Limit: Maximum 6 subject photos per photo addendum page. Reject as: "Per client instructions, please include no more than 6 photos on each photo addendum page."
  - Two-Value Reports: ARV comps must be Comp 1–3 and As-Is comps 4–6. Do not use the same comps for both values; escalate if repeated.
  - Heating System: Must address whether the heating system works. “Mechanicals are functioning” is acceptable. Inability to test due to hot weather is also acceptable.
  - BPL Special Requirements: Check special assessment comments; include the 1004MC addendum; verify comments for zero adjustments when Q/C differs; use 3 comps from the same city (otherwise comments required); escalate unclear occupancy/staging concerns to the WhatsApp group; duplicate client names on the order page are acceptable if the report displays the correct client name.
  - BPL Retail: Escalate like VISIO if repairs exist, whether the report is As-Is or Subject-To (applies only when BPL Retail is the client).
  - BPL As-Is & Kitchen Photos: BPL requires As-Is reports; stop and escalate Subject-To reports. Kitchen photos must show the stove/appliances (separate photos acceptable); if no stove is visible, request confirmation or comments. Request cost-to-cure for applicable repairs in As-Is reports (no cost-to-cure required for two-value ARV/As-Is reports where the repair budget is included).
  - BPL & Coast2Coast Mortgage: Subject-To conditions permitted only for health and safety issues. Cosmetic repairs must be commented on, not made Subject-To. Escalate if unsure whether an item is cosmetic or health/safety related.
- Rain City Capital:
  - Report Type: Client requires conventional reports.
  - Health and Safety: Any identified health and safety issues must make the report "subject to" that condition.
  - Two-Value Reports: Must be completed "Subject to," and include an additional grid for the "As Is" value.
  - Cost to Cure: Verify that no "cost to cure" is provided for cosmetic items. If a cost to cure for cosmetic items is found, status is "Not Fulfilled" with comment: "Please remove cost to cure for cosmetic items."
  - 1004MC Form: The 1004MC form is not required.
  - Payment Status: Verify the order is marked as PAID.
- TheLender:
  - Smoke/CO Detectors: Ensure photos of smoke and CO detectors are included if they are present and required to be installed. If not, status is "Not Fulfilled" with comment: "Please confirm if smoke/CO detectors are present/required and include photos."

- East Coast Capital Corp:
  - Cost Approach Completion: Verify that the cost approach is completed. If not, status is "Not Fulfilled" with comment: "This client requires the cost approach to be completed, even if it is not relevant to the development of value."
- Plaza home mortage:
  - Invoice (NY State Only): If the property state is NY, verify that an invoice is NOT included in the report. If an invoice is found, the status is "Needs Review" with the comment: "Can the appraiser please remove the invoice from the report? This will be delivered to the client as a separate document. Please also ask the appraiser to upload the invoice to the Supporting Documents section."
  - Client Email Address: Verify that the client's email address is present in the report. If it is missing, the status is "Needs Review" with the comment: "The report can be completed, but advise the team that we could not email the report to the client because there is no email address."
  - Invoice Upload (Non-NY): For states other than NY, if an invoice is required but not found in the report, the status is "Needs Review" with the comment: "Complete the order and advise the team that the appraiser needs to upload the invoice to the supporting documents."
- Lend with Aloha LLC ISAOA/ATIMA_x000a_Malama Funding LLC ISAOA/ATIMA
- CIVIC:
  - As-Is Value Order: For reports with two values (e.g., "As-Is" and "As-Repaired"), verify that the "As-Is" value is presented first.
  - Unacceptable Practices: No need to review for FREDDIE Unacceptable Practices.
- National Loan Funding LLC/ Easy Street Capital, LLC:
  - Prior Services: Check the prior services statement. If the appraiser indicates they 'did' or 'have' performed services on the subject property within the last 3 years, the status should be "Needs Review" with the comment: "The appraiser performed prior service on subject property within the three-year period, please refer the snap and advise".
- Capital Funding Financial:
  - As-Is Value First: On any 2-value reports (e.g., "As-Is" and "As-Repaired"), verify that the "As-Is" value is presented first in the reconciliation section. If the report is completed for the "As-Repaired Value" first, the status should be "Not Fulfilled" with the comment: "The client requires the report to be completed for the As-Is value. Please update the report to show the As-Is value in the Reconciliation section, with the As-Is comps included in the grid as comps #1-#3."
- Sierra Pacific Mortgage Company
  - 1004MC must needed
- Temple View:
  - Two-Value Report Requirements: For reports with two values ("As-Is" and "As-Repaired"):
    1. Report Condition: Verify the report is completed "subject to" the hypothetical condition that repairs have been completed.
    2. ARV Comps: Confirm at least 3 "As-Repaired Value" (ARV) comps are gridded in the sales comparison approach.
    3. As-Is Comps: Verify that 3 "As-Is" comps are referenced. They are not required to be gridded, but if they are not, there must be comments identifying the 3 comps used and explaining how the "As-Is" value was reconciled. If the appraiser chooses to grid them, that is also acceptable.
    4. Value Basis: The final value should be subject to the repair bid.
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
  - ENV File: An ENV file is required for now.
  - Payment Status: Verify the order is marked as PAID.
- The Loan Store:
  - 1004MC Form: Verify the 1004MC form is included and completed.
  - Double-Strapped Water Heaters (UT Only): If the property state is UT, verify the report includes a comment on whether the water heater is double-strapped.
  - Environmental Addendum (Commercial Only): For commercial reports, verify that an "Environmental Addendum" or "Form 69F2" is included. If not, status is "Not Fulfilled" with comment: "The client requires Environmental Addendum Form 69F2 to be included in all commercial appraisals. Please include."
  - General Instructions:
    - For 1007 Rent Schedule reports, an ENV file is not required; a PDF is acceptable.
    - An ENV file is not generally required for this client.
    - When creating revisions, do not mention page numbers, especially for ENV files.
- Champions funding:
  - E&O Insurance: Verify that the appraiser's E&O (Errors and Omissions) insurance document is attached to the report. If not attached, status is "Not Fulfilled" with comment: "Per client instructions for their assignments, please attach appraiser's E&O to the report."
  - Value vs. Predominant Value: Check if the appraised value is more than 10% higher or lower than the 'predominant value' from the neighborhood section. If it is, and no explanatory comment exists, the status is "Not Fulfilled".
    - If value is lower, comment: "Appraised value is lower than Predominant value. Appraiser to comment whether it is an under improvement and if there is any impact on the value and marketability of the subject property".
    - If value is higher, comment: "Appraised value is higher than Predominant value. Appraiser to comment whether it is an over improvement and if there is any impact on the value and marketability of the subject property."
- GFL Capital Mortgage:
  - Value vs. Purchase Price: If the final appraised value is lower than the purchase price, the status should be "Needs Review" with the comment: "Final value is lower than purchase price, please advise".
 
- Futures Financial:
  - Reviewer Level: Only senior members should review these reports.
  - Borrower "FRANCIS, Richel":
    - If product type is "Desktop", verify the report is a desktop ARV and the reconciliation section is "subject-to plans and specs".
    - If product type is "As-is with ARV", verify the report is "as-is" and includes two values.
- Cardinal financial company:
  - No 1004MC is OK
- Deephaven Mortgage LLC:
  - Built-Up Status: If "Built Up" in the neighborhood section is "Over 75%", the status should be "Needs Review" with the comment: "Please confirm if 75% built-up status impacts marketability of the subject property."
- OCMBC:
  - Smoke/CO Detectors: Verify the report comments on whether smoke/CO detectors were present. If not mentioned, status is "Not Fulfilled" with comment: "Please comment if smoke/CO detectors were or were not present."
  - Water Heater Strapping: Verify the report comments on whether the hot water heater is properly double strapped and if this is required by law. If not mentioned, status is "Not Fulfilled" with comment: "Please comment if the hot water heater is properly double strapped and if these are required by law."
- Loanguys.com inc:
  - Quality and Condition Ratings: Verify that all reports (including 1025 and 2090) use "Q" and "C" ratings for "Quality" and "Condition" for the subject and all comparables. If not, status is "Not Fulfilled" with comment: "Per client requirement, please include 'Q' and 'C' ratings for 'Quality' and 'Condition' for the subject and all comps."
- Paramount Residential Mortgage Group:
  - Lender Name Formatting: Verify if the lender name "Paramount Residential Mortgage Group" includes "INC". If it does, the status should be "Needs Review" with the comment: "Lender name includes 'INC'. Per client, if this is the only revision needed, it can be disregarded and the report submitted."
- Arc Home:
  - Short Term Rental (STR) Requirements: If the product type is "Short term rental" or "STR", verify the appraiser has addressed local short-term rental regulations (zoning allowances, licensing). If not addressed, status is "Needs Review" with comment: "This is an STR order, please escalate for review. Appraiser must address short term rental regulations, such as whether the local jurisdiction allows short term rentals per the zoning requirements or if they require the owners to obtain a license."
- CV3 Financial:
  - Borrower Name: Verify that the 'Borrower' field contains the entity name (e.g., an LLC) and that a comment in an addendum mentions the individual borrower's name. If the borrower is an entity and the individual's name is not commented, the status is "Not Fulfilled" with a comment like "Please comment that the individual borrower is [Individual's Name]."
  - Unacceptable Practices: No need to review for FREDDIE Unacceptable Practices.
- Nationwide Mortgage Bankers:
  - Hurricane Damage Statement (FL): If the property state is Florida (FL), verify the report addresses any potential damage from "Hurricane Helene" and "Hurricane Milton". If not addressed, status is "Not Fulfilled" with comment: "Please address if the subject has suffered any damage from the recent hurricanes Helene and Milton."
  - Hurricane Damage Statement (GA, NC, SC, TN, VA): If the property state is Georgia (GA), North Carolina (NC), South Carolina (SC), Tennessee (TN), or Virginia (VA), verify the report addresses any potential damage from "Hurricane Helene". If not addressed, status is "Not Fulfilled" with comment: "Please address if the subject has suffered any damage from the recent hurricane Helene."
- Logan Financial / Logan Finance:
  - Smoke/CO Detectors: Verify the report includes commentary on the presence of smoke/CO detectors and includes photos. If not, status is "Not Fulfilled" with comment: "Please confirm if smoke/CO detectors are present/required and include photos."

- New American Funding:
  - Health and Safety Repairs: Verify that any identified health and safety issues (including required smoke/CO detectors and water heater straps) are made "subject to repair". If not, status is "Not Fulfilled".
  - 1004MC Form: The 1004MC form is not required.
  - ROV Review (C2C/Fastapp orders): For "Coast to Coast" or "Fastapp" orders, if the report is a revision from an ROV, it should be reviewed and then escalated for completion approval. Status should be "Needs Review" with comment: "ROV is good to go. Escalate to team before completing."
- Haus Capital:
  - Report Condition: If the appraisal is made "Subject To", the status should be "Needs Review" with the comment: "Report is 'Subject To'. Please advise."
- Homebridge Financial Services:
  - MLS Comparables: At least 2 sold MLS comparables are required within the subject’s town/municipality and market area. If unavailable, provide detailed commentary explaining why nearby towns are comparable. Rental comps do not require MLS sources. If fewer than 2 sold MLS comparables are found in the subject's town/municipality and detailed commentary is missing, status is "Not Fulfilled" with comment: "Per Homebridge requirements: At least 2 sold MLS comparables are required within the subject's town/municipality and market area. Please provide detailed commentary explaining why nearby towns are comparable."
  - Homebridge Supervisory Appraiser: The assigned appraiser may sign as the Supervisory Appraiser without inspecting the property. The only exception is when a trainee signs as the original appraiser on an FHA assignment. If a trainee signs as original appraiser on an FHA assignment and the supervisory appraiser did not inspect, status is "Not Fulfilled" with comment: "Per Homebridge requirements: Trainee signed as original appraiser on an FHA assignment, so the Supervisory Appraiser is required to inspect the property."
`;

const ClientRequirementCheck = ({ onPromptSubmit, loading, response, error }) => {
  const [filterValue, setFilterValue] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedIndex, setCopiedIndex] = useState(null);

  const handleCheck = () => {
    onPromptSubmit(CLIENT_REQUIREMENT_PROMPT);
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
  }, [response, filterValue, searchQuery, copiedIndex]);

  return (
    <div id="client-requirement-check-section" className="card shadow mb-4">
      <div className="card-header CAR1 bg-primary text-white d-flex align-items-center justify-content-between">
        <strong style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <ClientIcon style={{ fontSize: '20px' }} /> Client Requirement Check
        </strong>
      </div>
      <div className="card-body">
        <Stack spacing={2}>
          <Button
            onClick={handleCheck}
            variant="contained"
            color="secondary"
            disabled={loading}
            sx={{ fontWeight: 600 }}
          >
            {loading ? <CircularProgress size={24} color="inherit" /> : 'Check Client Requirements'}
          </Button>
          {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
          {response && renderResponse()}
        </Stack>
      </div>
    </div>
  );
};

export default ClientRequirementCheck;

