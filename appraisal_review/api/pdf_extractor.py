import google.generativeai as genai
from google.generativeai import caching
import datetime
import json
from bs4 import BeautifulSoup
import re
import time
import textwrap
from google.api_core import exceptions as google_exceptions
from PyPDF2 import PdfReader, PdfWriter
from typing import Any, Dict, List, Optional
import io
import os
from appraisal_review.settings import APIKEY
# Allow APIKEY from settings or environment variable
ACTIVE_API_KEY = os.environ.get("GEMINI_API_KEY") or os.environ.get("APIKEY") or APIKEY
if ACTIVE_API_KEY:
    try:
        genai.configure(api_key=ACTIVE_API_KEY)
    except Exception as e:
        print(f"Warning: Failed to configure genai with API key: {e}")

def _check_for_api_error_message(response_text, prompt_feedback):
    """Checks if the given text or prompt feedback indicates a Gemini API error."""
    if prompt_feedback and prompt_feedback.block_reason:
        return True
    return "Due to high traffic" in response_text or \
           "API quota exceeded" in response_text

def clean_sublabels(s: str) -> str:
    if not s:
        return ""
    sub_labels = [
        r"^(?:Client\s*)?File\s*#?\s*[:\-]?",
        r"^(?:Appraiser\s*)?File\s*#?\s*[:\-]?",
        r"^(?:Subject\s*Property\s*|Client\s*|Appraiser\s*)?Address\s*[:\-]?",
        r"^(?:Subject\s*|Client\s*|Appraiser\s*)?City\s*[:\-]?",
        r"^(?:Subject\s*|Client\s*|Appraiser\s*)?State\s*[:\-]?",
        r"^(?:Subject\s*|Client\s*|Appraiser\s*Zip\s*)?(?:Zip\s*)?Code\s*[:\-]?",
        r"^(?:Subject\s*)?County\s*[:\-]?",
        r"^(?:Subject\s*)?Unit\s*[:\-]?",
        r"^(?:Appraiser\s*Company\s*)?Name\s*[:\-]?",
        r"^(?:Data\s*)?Source\s*[:\-]?",
        r"^Tax\s*Year\s*[:\-]?",
        r"^(?:Monthly\s*HOA\s*)?Fees?\s*[:\-]?",
        r"^(?:Original\s*List\s*|Current\s*List\s*|Last\s*Sale\s*)?Price\s*[:\-]?",
        r"^(?:Date\s*of\s*Last\s*Price\s*)?Revision\s*[:\-]?",
        r"^Days[\-\s]on[\-\s]market\s*[:\-]?",
        r"^(?:Listing\s*)?Company\s*\/\s*Agent\s*[:\-]?",
        r"^(?:Appraiser\s*)?Ph(?:one|\.)?\s*#?\s*[:\-]?",
        r"^(?:Appraiser\s*)?Fax\s*#?\s*[:\-]?",
        r"^(?:Appraiser\s*)?E-?mail\s*[:\-]?",
        r"^(?:Last\s*Sale\s*|Closing\s*)?Date\s*[:\-]?",
    ]
    for pat in sub_labels:
        s = re.sub(pat, "", s, flags=re.IGNORECASE).strip()
    return s.strip()


def sanitize_extracted_data(data):
    """Recursively cleans up boolean mapping and removes checkbox/checkmark formatting prefixes (e.g. 'X One' -> 'One')."""
    if isinstance(data, dict):
        return {k: sanitize_extracted_data(v) for k, v in data.items()}
    elif isinstance(data, list):
        return [sanitize_extracted_data(item) for item in data]
    elif isinstance(data, bool):
        return "Yes" if data else "No"
    elif isinstance(data, str):
        cleaned = data.strip()
        if cleaned.lower().startswith(("x ", "[x] ", "[ ] ")):
            cleaned = cleaned.split(maxsplit=1)[-1]
        elif cleaned.startswith(("☒ ", "☑ ")):
            cleaned = cleaned.split(maxsplit=1)[-1]
        if len(cleaned) > 1 and cleaned[0].upper() == 'X' and cleaned[1].isupper():
            cleaned = cleaned[1:]
        cleaned = clean_sublabels(cleaned)
        return " ".join(cleaned.split())
    return data

SUBJECT_FIELDS = [
    'ADU File Check','From Type','Exposure comment','Prior service comment','ANSI','FHA Case No.','Full Address','Property Address', 'City', 'County', 'State', 'Zip Code', 'Borrower', 'Owner of Public Record',
    'Legal Description', "Assessor's Parcel #", 'Tax Year', 'R.E. Taxes $', 'Neighborhood Name', 'Map Reference',
    'Census Tract', 'Occupant','Occupant Comment', 'Special Assessments $', 'Special Assessments Comment', 'PUD', 'HOA $', 'HOA(per year)', 'HOA(per month)',
    'Property Rights Appraised', 'Assignment Type', 'Lender/Client', 'Address (Lender/Client)',
    'Offered for Sale in Last 12 Months', 'Report data source(s) used, offering price(s), and date(s)',"Appraiser's Fee","AMC License #","Smoke detector comment","CO detector comment","Water heater double-strapped comment"
]
CONTRACT_FIELDS = [
    'I did did not analyze the contract for sale for the subject purchase transaction. Explain the results of the analysis of the contract for sale or why the analysis was not performed.',
    'Contract Price $', 'Date of Contract', 'Is property seller owner of public record?', 'Data Source(s)',
    'Is there any financial assistance (loan charges, sale concessions, gift or downpayment assistance, etc.) to be paid by any party on behalf of the borrower?',
    'If Yes, report the total dollar amount and describe the items to be paid',
    'If Yes, report the total dollar amount and describe the items to be paid.',
]
NEIGHBORHOOD_FIELDS = [
    "Location", "Built-Up", "Growth", "Property Values", "Demand/Supply",
    "Marketing Time", "One-Unit", "2-4 Unit", "Multi-Family", "Commercial", "Other", "Present Land Use for other", "one unit housing price(high,low,pred)", "one unit housing age(high,low,pred)",
    "Neighborhood Boundaries", "Neighborhood Description", "Market Conditions:"
]
SITE_FIELDS = [
    "Dimensions", "Area", "Shape", "View", "Specific Zoning Classification", "Zoning Description",
    "Zoning Compliance", "Is the highest and best use of subject property as improved (or as proposed per plans and specifications) the present use?",
    "Electricity", "Electricity comment", "Gas", "Gas comment",  "Water", "Water comment", "Sanitary Sewer", "Sanitary Sewer comment", "Street","Street comment", "Alley","Alley comment", "FEMA Special Flood Hazard Area",
    "FEMA Flood Zone", "FEMA Map #", "FEMA Map Date", "Are the utilities and off-site improvements typical for the market area? If No, describe","Are the utilities and off-site improvements typical for the market area?",
    "Are there any adverse site conditions or external factors (easements, encroachments, environmental conditions, land uses, etc.)? If Yes, describe", "Legal Nonconforming (Grandfathered Use) comment"," No Zoning comment"
]
IMPROVEMENTS_FIELDS = [
    "One with Accessory Unit","Units", "# of Stories", "Type", "Existing/Proposed/Under Const.",
    "Design (Style)", "Year Built", "Effective Age (Yrs)", "Foundation Type",
    "Basement Area sq.ft.", "Basement Finish %",
    "Evidence of (Foundation)", "Foundation Walls (Material/Condition)",
    "Exterior Walls (Material/Condition)", "Roof Surface (Material/Condition)",
    "Gutters & Downspouts (Material/Condition)", "Window Type (Material/Condition)",
    "Storm Sash/Insulated", "Screens", "Floors (Material/Condition)", "Walls (Material/Condition)",
    "Trim/Finish (Material/Condition)", "Bath Floor (Material/Condition)", "Bath Wainscot (Material/Condition)",
    "Attic", "Heating Type", "Fuel", "Cooling Type",
    "Fireplace(s) #", "Patio/Deck", "Pool", "Woodstove(s) #", "Fence", "Porch", "Other in Amenities",
    "Car Storage", "Driveway # of Cars", "Driveway Surface", "Garage # of Cars", "Carport # of Cars","Att./Det./Built-in",
     "Appliances",
    "Finished area above grade Rooms", "Finished area above grade Bedrooms",
    "Finished area above grade Bath(s)", "Square Feet of Gross Living Area Above Grade",
    "Additional features", "Describe the condition of the property",
    "Are there any physical deficiencies or adverse conditions that affect the livability, soundness, or structural integrity of the property? If Yes, describe",
    "Does the property generally conform to the neighborhood (functional utility, style, condition, use, construction, etc.)?",
    "Does the property generally conform to the neighborhood (functional utility, style, condition, use, construction, etc.)?If Yes, describe",
    "Amenity Category"
]
RECONCILIATION_FIELDS = [
    'Indicated Value by: Sales Comparison Approach $',
    'Cost Approach (if developed)',
    'Income Approach (if developed) $',
    'Income Approach (if developed) $ Comment',
    'This appraisal is made "as is", subject to completion per plans and specifications on the basis of a hypothetical condition that the improvements have been completed, subject to the following repairs or alterations on the basis of a hypothetical condition that the repairs or alterations have been completed, or subject to the following required inspection based on the extraordinary assumption that the condition or deficiency does not require alteration or repair:',
    "opinion of the market value, as defined, of the real property that is the subject of this report is $",
    "as of"
]
COST_APPROACH_FIELDS = [
    "Provide adequate information for the lender/client to replicate the below cost figures and calculations.",
    "Support for the opinion of site value (summary of comparable land sales or other methods for estimating site value)",
    "Estimated",
    "Source of cost data",
    "Quality rating from cost service ",
    "Effective date of cost data ",
    "Comments on Cost Approach (gross living area calculations, depreciation, etc.)",
    "Estimated Remaining Economic Life (HUD and VA only)",
    "OPINION OF SITE VALUE = $ ................................................",
    "Dwelling",
    "Basement",
    "Deck",
    "Garage/Carport ",
    " Total Estimate of Cost-New  = $ ...................",
    "Depreciation ",
    "Depreciated Cost of Improvements......................................................=$ ",
    "“As-is” Value of Site Improvements......................................................=$",
    "Indicated Value By Cost Approach......................................................=$",
    "Indicated Value by Cost Approach",
    "Depreciated Cost of Dwellings",
    "As Is Value of Site Improvements",
    "Opinion of Site Value"
]
SUBJECT_RENT_SCHEDULE=["Unit # Lease Date  Begin Date 1","Unit # Lease Date  Begin Date 2","Unit # Lease Date  Begin Date 3","Unit # Lease Date  Begin Date 4",
    "Unit # Lease Date End Date 1","Unit # Lease Date End Date 2","Unit # Lease Date End Date 3","Unit # Lease Date End Date 4",
    "Actual Rents Unit # 1  Per Unit Unfurnished","Actual Rents Unit # 2  Per Unit Unfurnished","Actual Rents Unit # 3  Per Unit Unfurnished","Actual Rents Unit # 4  Per Unit Unfurnished",
    "Actual Rents Unit # 1  Per Unit Furnished","Actual Rents Unit # 2  Per Unit Furnished","Actual Rents Unit # 3  Per Unit Furnished","Actual Rents Unit # 4  Per Unit Furnished",
    "Actual Rents Unit # 1 Total Rents","Actual Rents Unit # 2 Total Rents","Actual Rents Unit # 3 Total Rents","Actual Rents Unit # 4 Total Rents",
    "Opinion Of Market Rent Unit # 1 Per Unit Unfurnished","Opinion Of Market Rent Unit # 2 Per Unit Unfurnished","Opinion Of Market Rent Unit # 3 Per Unit Unfurnished","Opinion Of Market Rent Unit # 4 Per Unit Unfurnished",
    "Opinion Of Market Rent Unit # 1 Per Unit Furnished","Opinion Of Market Rent Unit # 2 Per Unit Furnished","Opinion Of Market Rent Unit # 3 Per Unit Furnished","Opinion Of Market Rent Unit # 4 Per Unit Furnished",
    "Opinion Of Market Rent Unit # 1 Total Rents","Opinion Of Market Rent Unit # 2 Total Rents","Opinion Of Market Rent Unit # 3 Total Rents","Opinion Of Market Rent Unit # 4 Total Rents",
    "Comment on lease data","Total Actual Monthly Rent","Other Monthly Income (itemize)","Total Actual Monthly Income"," Total Gross Monthly Rent","Other Monthly Income (itemize)",
    "Total Estimated Monthly Income"," Utilities included in estimated rents","Comments on actual or estimated rents and other monthly income (including personal property)",
]

INCOME_APPROACH_FIELDS = [
    "Estimated Monthly Market Rent $",
    "X Gross Rent Multiplier  = $",
    "Indicated Value by Income Approach",
    "Summary of Income Approach (including support for market rent and GRM) ",
]
PUD_INFO_FIELDS = [
    "PUD Fees $",
    "PUD Fees (per month)",
    "PUD Fees (per year)",
    "Is the developer/builder in control of the Homeowners' Association (HOA)?", "Unit type(s)",
    "Provide the following information for PUDs ONLY if the developer/builder is in control of the HOA and the subject property is an attached dwelling unit.",
    "Legal Name of Project", "Total number of phases", "Total number of units", "Total number of units sold",
    "Total number of units rented", "Total number of units for sale", "Data source(s)", "Was the project created by the conversion of existing building(s) into a PUD?", " If Yes, date of conversion", "Does the project contain any multi-dwelling units? Yes No Data", "Are the units, common elements, and recreation facilities complete?", "If No, describe the status of completion.", "Are the common elements leased to or by the Homeowners' Association?",
    "If Yes, describe the rental terms and options.", "Describe common elements and recreational facilities."
]
CERTIFICATION_FIELDS = [
    "Signature", "Name", "Company Name", "Company Address", "Telephone Number", "Email Address", "Date of Signature and Report",
    "Effective Date of Appraisal","State Certification #","or State License #","or Other (describe)","State #", "State", "Expiration Date of Certification or License", "ADDRESS OF PROPERTY APPRAISED", "APPRAISED VALUE OF SUBJECT PROPERTY $",
    "LENDER/CLIENT Name",
    "Lender/Client Company Name",
    "Lender/Client Company Address",
    "Lender/Client Email Address","Appraiser License", "E&O Insurance","Policy Period From","License Valid To","LICENSE/REGISTRATION/CERTIFICATION #",
    "License # / Reg #:", "License # / Reg #",
    "Policy Period To",
    "Appraiser Certifications",
    "Appraiser Signature",
    "Appraiser Name",
    "Appraiser Credential Level",
    "Appraiser ID",
    "Appraiser State",
    "Appraiser License Expiration Date",
    "Appraiser's Fee", "AMC License #",
    "Supervisory Signature",
    "Supervisory Name",
    "Supervisory Company Name",
    "Supervisory Company Address",
    "Supervisory Telephone Number",
    "Supervisory Email Address",
    "Supervisory Date of Signature",
    "Supervisory State Certification #",
    "Supervisory or State License #",
    "Supervisory State",
    "Supervisory Expiration Date of Certification or License",
    "Did not inspect subject property",
    "Did inspect exterior of subject property from street",
    "Subject Property Date of Inspection (Exterior)",
    "Did inspect interior and exterior of subject property",
    "Subject Property Date of Inspection (Interior/Exterior)",
    "Did not inspect exterior of comparable sales from street",
    "Did inspect exterior of comparable sales from street",
    "Comparable Sales Date of Inspection"
]

SALES_TRANSFER_FIELDS = [
    "I did did not research the sale or transfer history of the subject property and comparable sales. If not, explain",
    "My research did did not reveal any prior sales or transfers of the subject property for the three years prior to the effective date of this appraisal.",
    "Data Source(s) for subject property research",
    "My research did did not reveal any prior sales or transfers of the comparable sales for the year prior to the date of sale of the comparable sale.",
    "Data Source(s) for comparable sales research",
    "Analysis of prior sale or transfer history of the subject property and comparable sales",
    "Summary of Sales Comparison Approach", "Indicated Value by Sales Comparison Approach $",
    "Indicated Value by Sales Comparison Approach",
    "Reconciliation of Sales Comparison Approach",
    "Sales Comparison Map",
    "Sales Comparison Approach Exhibits"
]
INFO_OF_SALES_FIELDS = [
    "There are ____ comparable properties currently offered for sale in the subject neighborhood ranging in price from$ ___to $___",
    "There are ___comparable sales in the subject neighborhoodwithin the past twelvemonths ranging in sale price from$___ to $____"
]
MARKET_CONDITIONS_FIELDS = [
    "Instructions:",
    "Inventory Analysis Total # of Comparable Sales (Settled)",
    "Inventory Analysis Total # of Comparable Sales (Settled) (Prior 7-12 Months)",
    "Inventory Analysis Total # of Comparable Sales (Settled) (Prior 4-6 Months)",
    "Inventory Analysis Total # of Comparable Sales (Settled) (Current-3 Months)",
    "Inventory Analysis Total # of Comparable Sales (Settled) (Overall Trend)",
    "Inventory Analysis Absorption Rate (Total Sales/Months)",
    "Inventory Analysis Absorption Rate (Total Sales/Months) (Prior 7-12 Months)",
    "Inventory Analysis Absorption Rate (Total Sales/Months) (Prior 4-6 Months)",
    "Inventory Analysis Absorption Rate (Total Sales/Months) (Current-3 Months)",
    "Inventory Analysis Absorption Rate (Total Sales/Months) (Overall Trend)",
    "Inventory Analysis Total # of Comparable Active Listings",
    "Inventory Analysis Total # of Comparable Active Listings (Prior 7-12 Months)",
    "Inventory Analysis Total # of Comparable Active Listings (Prior 4-6 Months)",
    "Inventory Analysis Total # of Comparable Active Listings (Current-3 Months)",
    "Inventory Analysis Total # of Comparable Active Listings (Overall Trend)",
    "Inventory Analysis Months of Housing Supply (Total Listings/Ab.Rate)",
    "Inventory Analysis Months of Housing Supply (Total Listings/Ab.Rate) (Prior 7-12 Months)",
    "Inventory Analysis Months of Housing Supply (Total Listings/Ab.Rate) (Prior 4-6 Months)",
    "Inventory Analysis Months of Housing Supply (Total Listings/Ab.Rate) (Current-3 Months)",
    "Inventory Analysis Months of Housing Supply (Total Listings/Ab.Rate) (Overall Trend)",
    "Median Sale & List Price, DOM, Sale/List % Median Comparable Sale Price (Prior 7-12 Months)",
    "Median Sale & List Price, DOM, Sale/List % Median Comparable Sale Price (Prior 4-6 Months)",
    "Median Sale & List Price, DOM, Sale/List % Median Comparable Sale Price (Current-3 Months)",
    "Median Sale & List Price, DOM, Sale/List % Median Comparable Sale Price (Overall Trend)",
    "Median Sale & List Price, DOM, Sale/List % Median Comparable Sales Days on Market (Prior 7-12 Months)",
    "Median Sale & List Price, DOM, Sale/List % Median Comparable Sales Days on Market (Prior 4-6 Months)",
    "Median Sale & List Price, DOM, Sale/List % Median Comparable Sales Days on Market (Current-3 Months)",
    "Median Sale & List Price, DOM, Sale/List % Median Comparable Sales Days on Market (Overall Trend)",
    "Median Sale & List Price, DOM, Sale/List % Median Comparable List Price (Prior 7-12 Months)",
    "Median Sale & List Price, DOM, Sale/List % Median Comparable List Price (Prior 4-6 Months)",
    "Median Sale & List Price, DOM, Sale/List % Median Comparable List Price (Current-3 Months)",
    "Median Sale & List Price, DOM, Sale/List % Median Comparable List Price (Overall Trend)",
    "Median Sale & List Price, DOM, Sale/List % Median Comparable Listings Days on Market (Prior 7-12 Months)",
    "Median Sale & List Price, DOM, Sale/List % Median Comparable Listings Days on Market (Prior 4-6 Months)",
    "Median Sale & List Price, DOM, Sale/List % Median Comparable Listings Days on Market (Current-3 Months)",
    "Median Sale & List Price, DOM, Sale/List % Median Comparable Listings Days on Market (Overall Trend)",
    "Median Sale & List Price, DOM, Sale/List % Median Sale Price as % of List Price (Prior 7-12 Months)",
    "Median Sale & List Price, DOM, Sale/List % Median Sale Price as % of List Price (Prior 4-6 Months)",
    "Median Sale & List Price, DOM, Sale/List % Median Sale Price as % of List Price (Current-3 Months)",
    "Median Sale & List Price, DOM, Sale/List % Median Sale Price as % of List Price (Overall Trend)",
    "Instructions:",
    "Seller-(developer, builder, etc.)paid financial assistance prevalent?",
    "Explain in detail the seller concessions trends for the past 12 months (e.g., seller contributions increased from 3% to 5%, increasing use of buydowns, closing costs, condo fees, options, etc.).",
    "Are foreclosure sales (REO sales) a factor in the market?", "If yes, explain (including the trends in listings and sales of foreclosed properties).",
    "Cite data sources for above information.", "Summarize the above information as support for your conclusions in the Neighborhood section of the appraisal report form. If you used any additional information, such as an analysis of pending sales and/or expired and withdrawn listings, to formulate your conclusions, provide both an explanation and support for your conclusions."
]
CONDO_FIELDS = [
    "Subject Project Data Total # of Comparable Sales (Settled) (Prior 7–12 Months)",
    "Subject Project Data Total # of Comparable Sales (Settled) (Prior 4–6 Months)",
    "Subject Project Data Total # of Comparable Sales (Settled) (Current – 3 Months)",
    "Subject Project Data Total # of Comparable Sales (Settled) (Overall Trend)",
    "Subject Project Data Absorption Rate (Total Sales/Months) (Prior 7–12 Months)",
    "Subject Project Data Absorption Rate (Total Sales/Months) (Prior 4–6 Months)",
    "Subject Project Data Absorption Rate (Total Sales/Months) (Current – 3 Months)",
    "Subject Project Data Absorption Rate (Total Sales/Months) (Overall Trend)",
    "Subject Project Data Total # of Comparable Active Listings (Prior 7–12 Months)",
    "Subject Project Data Total # of Comparable Active Listings (Prior 4–6 Months)",
    "Subject Project Data Total # of Comparable Active Listings (Current – 3 Months)",
    "Subject Project Data Total # of Comparable Active Listings (Overall Trend)",
    "Subject Project Data Months of Unit Supply (Total Listings/Ab.Rate) (Prior 7–12 Months)",
    "Subject Project Data Months of Unit Supply (Total Listings/Ab.Rate) (Prior 4–6 Months)",
    "Subject Project Data Months of Unit Supply (Total Listings/Ab.Rate) (Current – 3 Months)",
    "Subject Project Data Months of Unit Supply (Total Listings/Ab.Rate) (Overall Trend)",
]
CONDO_FORECLOSURE_FIELDS = [
    "Are foreclosure sales (REO sales) a factor in the project?",
    "If yes, indicate the number of REO listings and explain the trends in listings and sales of foreclosed properties.",
    "Summarize the above trends and address the impact on the subject unit and project.",
]
RENT_SCHEDULE_RECONCILIATION_FIELDS = [
    "Comments on market data, including the range of rents for single family properties, an estimate of vacancy for single family rental properties, the general trend of rents and vacancy, and support for the above adjustments. (Rent concessions should be adjusted to the market, not to the subject property.)",
    "Final Reconciliation of Market Rent:",
    "I (WE) ESTIMATE THE MONTHLY MARKET RENT OF THE SUBJECT AS OF",
    "TO BE $",
]
SalesGridFIELDS2 = [
        "Address",
        "Proximity to Subject",
        "Proximity to Subject comment",
        "Sale Price",
        "Sale Price/Gross Liv. Area",
        "Data Source(s)",
        "Verification Source(s)",
        "Sales or Financing Concessions",
        "Sales or Financing Concessions Adjustment",
        "Date of Sale/Time",
        "Date of Sale/Time Adjustment",
        "Location",
        "Location Adjustment",
        "Leasehold/Fee Simple",
        "Leasehold/Fee Simple Adjustment",
        "Site",
        "Site Adjustment",
        "View",
        "View Adjustment",
        "Design (Style)",
        "Design (Style) Adjustment",
        "Quality of Construction",
        "Quality of Construction Adjustment",
        "Actual Age",
        "Actual Age Adjustment",
        "Condition",
        "Condition Adjustment",
        "Total Rooms",
        "Bedrooms",
        "Bedrooms Adjustment",
        "Baths",
        "Baths Adjustment",
        "Above Grade Room Count Adjustment",
        "Gross Living Area",
        "Gross Living Area Adjustment",
        "Basement & Finished Rooms Below Grade",
        "Basement & Finished Rooms Below Grade Adjustment",
        "Functional Utility",
        "Functional Utility Adjustment",
        "Heating/Cooling",
        "Heating/Cooling Adjustment",
        "Energy Efficient Items",
        "Energy Efficient Items Adjustment",
        "Garage/Carport",
        "Garage/Carport Adjustment",
        "Porch/Patio/Deck",
        "Porch/Patio/Deck Adjustment",
        "Net Adjustment (Total)",
        "Adjusted Sale Price of Comparable",
        "Date of Prior Sale/Transfer",
        "Price of Prior Sale/Transfer",
        "Data Source(s) for prior sale",
        "Effective Date of Data Source(s) for prior sale",

]
RentSchedulesFIELDS2 = [
        "Address",
        "Proximity to Subject",
        "Date Lease Begins",
        "Date Lease Expires",
        "Monthly Rental",
        "Less: Utilities",
        "Furniture",
        "Adjusted Monthly Rent",
        "Data Source",
        "Rent",
        "Concessions",
        "Location/View",
        "Location/View Adjustment",
        "Design and Appeal",
        "Design and Appeal Adjustment",
        "Age",
        "Age Adjustment",
        "Condition",
        "Condition Adjustment",
        "Room Count Total",
        "Room Count Total Adjustment",
        "Room Count Bdrms",
        "Room Count Bdrms Adjustment",
        "Room Count Baths",
        "Room Count Baths Adjustment",
        "Gross Living Area",
        "Gross Living Area Adjustment",
        "Other (e.g., basement, etc.)",
        "Other (e.g., basement, etc.) Adjustment",
        "Other:",
        "Net Adj. (total)",
        "Indicated Monthly Market Rent",
]
Project_SITE_FIELDS = [
    "Topography", "Size", "Density", "View", "Specific Zoning Classification", "Zoning Description",
    "Zoning Compliance", "Is the highest and best use of subject property as improved (or as proposed per plans and specifications) the present use?",
    "Electricity", "Gas", "Water", "Sanitary Sewer", "Street", "Alley", "FEMA Special Flood Hazard Area","Are the utilities and off-site improvements typical for the market area?",
    "FEMA Flood Zone", "FEMA Map #", "FEMA Map Date", "Are the utilities and off-site improvements typical for the market area?",
    "Are there any adverse site conditions or external factors (easements, encroachments, environmental conditions, land uses, etc.)?",
    "Are there any adverse site conditions or external factors (easements, encroachments, environmental conditions, land uses, etc.)? If Yes, describe",
]
Project_Info_FIELDS = [
    "Data source(s) for project information", "Project Description", "# of Stories",
    "# of Elevators", "Existing/Proposed/Under Const.", "Year Built",
    "Effective Age", "Exterior Walls",
    "Roof Surface", "Total # Parking", "Ratio (spaces/units)", "Type", "Guest Parking", "# of Units", "# of Units Completed",
    "# of Units For Sale", "# of Units Sold", "# of Units Rented", "# of Owner Occupied Units",
    "# of Phases","# of Units","# of Units for Sale","# of Units Sold","# of Units Rented","# of Owner Occupied Units","# of Planned Phases",
    "# of Planned Units","# of Planned Units for Sale","# of Planned Units Sold","# of Planned Units Rented","# of Planned Owner Occupied Units",
    "Project Primary Occupancy","Is the developer/builder in control of the Homeowners' Association (HOA)?",
    "Management Group","Does any single entity (the same individual, investor group, corporation, etc.) own more than 10% of the total units in the project?"
    ,"Was the project created by the conversion of existing building(s) into a condominium?",
    "Was the project created by the conversion of existing building(s) into a condominium? If Yes,describe the original use and date of conversion",
    "Are the units, common elements, and recreation facilities complete (including any planned rehabilitation for a condominium conversion)?","If No, describe",
    "Is there any commercial space in the project?",
    "If Yes, describe and indicate the overall percentage of the commercial space.","Describe the condition of the project and quality of construction.",
    "Describe the common elements and recreational facilities.","Are any common elements leased to or by the Homeowners' Association?",
    "If Yes, describe the rental terms and options.","Is the project subject to a ground rent?",
    "If Yes, $ per year (describe terms and conditions)",
    "Are the parking facilities adequate for the project size and type?","If No, describe and comment on the effect on value and marketability."
]
Project_Analysis_FIELDS = [
    "I did did not analyze the condominium project budget for the current year. Explain the results of the analysis of the budget (adequacy of fees, reserves, etc.), or why the analysis was not performed.",
    "Are there any other fees (other than regular HOA charges) for the use of the project facilities?",
    "If Yes, report the charges and describe.",
    "Compared to other competitive projects of similar quality and design, the subject unit charge appears",
    "If High or Low, describe",
    "Are there any special or unusual characteristics of the project (based on the condominium documents, HOA meetings, or other information) known to the appraiser?",
    "If Yes, describe and explain the effect on value and marketability.",
]
UNIT_DESCRIPTIONS_FIELDS = [
    "Unit Charge$"," per month X 12 = $", "per year",
    "Annual assessment charge per year per square feet of gross living area = $",
    "Utilities included in the unit monthly assessment [None/Heat/Air/Conditioning/Electricity/Gas/Water/Sewer/Cable/Other (describe)]",
    "Floor #",
    "# of Levels",
    "Heating Type/Fuel",
    "Central AC/Individual AC/Other (describe)",
    "Fireplace(s) #/Woodstove(s) #/Deck/Patio/Porch/Balcony/Other",
    "Refrigerator/Range/Oven/Disp Microwave/Dishwasher/Washer/Dryer",
    "Floors",
    "Walls",
    "Trim/Finish",
    "Bath Wainscot",
    "Doors",
    "None/Garage/Covered/Open",
    "Assigned/Owned",
    "# of Cars",
    "Parking Space #",
    "Finished area above grade contains:",
    "Rooms",
    "Bedrooms",
    "Bath(s)",
    "Square Feet of Gross Living Area Above Grade",
    "Are the heating and cooling for the individual units separately metered?", "If No, describe and comment on compatibility to other projects in the market area.",
    "Additional features (special energy efficient items, etc.)",
    "Describe the condition of the property (including needed repairs, deterioration, renovations, remodeling, etc.)",
    "Are there any physical deficiencies or adverse conditions that affect the livability, soundness, or structural integrity of the property? If Yes, describe",
    "Does the property generally conform to the neighborhood (functional utility, style, condition, use, construction, etc.)? If No, describe"
]

PRIOR_SALE_HISTORY_FIELDS =[
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
]
COMPARABLE_RENTAL_DATA_FIELDS = [
    "Address",
    "Proximity to Subject",
    "Current Monthly Rent",
    "Rent/Gross Bldg. Area",
    "Rent Control",
    "Data Source(s)",
    " Date of Lease(s)",
    "Location"," Actual Age",
    "Condition","Gross Building Area",
    "Unit Breakdown Rm Count Tot Unit # 1","Unit Breakdown Rm Count Br Unit # 1","Unit Breakdown Rm Count Ba Unit # 1","Unit Breakdown Size Unit # 1","Unit Breakdown Monthly Rent Unit # 1",
    "Unit Breakdown Rm Count Tot Unit # 2","Unit Breakdown Rm Count Br Unit # 2","Unit Breakdown Rm Count Ba Unit # 2","Unit Breakdown Size Unit # 2","Unit Breakdown Monthly Rent Unit # 2",
    "Unit Breakdown Rm Count Tot Unit # 3","Unit Breakdown Rm Count Br Unit # 3","Unit Breakdown Rm Count Ba Unit # 3","Unit Breakdown Size Unit # 3","Unit Breakdown Monthly Rent Unit # 3",
    "Unit Breakdown Rm Count Tot Unit # 4","Unit Breakdown Rm Count Br Unit # 4","Unit Breakdown Rm Count Ba Unit # 4","Unit Breakdown Size Unit # 4","Unit Breakdown Monthly Rent Unit # 4","Utilities Included"
]
FORM_TYPE_CATEGORIES = {
    "1004": [
        "SUBJECT", "CONTRACT", "NEIGHBORHOOD", "SITE", "IMPROVEMENTS", "SALES_GRID", "SALES_TRANSFER",
        "INFO_OF_SALES", "RECONCILIATION", "COST_APPROACH", "INCOME_APPROACH", "CONDO_FORECLOSURE",
        "PUD_INFO", "MARKET_CONDITIONS", "CONDO", "CERTIFICATION"
    ],
    "1073": [
        "SUBJECT", "CONTRACT", "NEIGHBORHOOD", "PROJECT_SITE", "PROJECT_INFO", "PROJECT_ANALYSIS",
        "UNIT_DESCRIPTIONS", "PRIOR_SALE_HISTORY", "SALES_GRID", "CONDO_FORECLOSURE", "SALES_TRANSFER",
        "INFO_OF_SALES", "RECONCILIATION", "COST_APPROACH", "INCOME_APPROACH", "CONDO",
        "CERTIFICATION"
        
    ],
    "1007": [
        "SUBJECT", "CONTRACT", "NEIGHBORHOOD", "SITE", "IMPROVEMENTS", "SALES_GRID", "SALES_TRANSFER",
        "INFO_OF_SALES", "RENT_SCHEDULE_GRID", "RENT_SCHEDULE_RECONCILIATION", "RECONCILIATION",
        "COST_APPROACH", "INCOME_APPROACH", "PUD_INFO", "CONDO_FORECLOSURE", "MARKET_CONDITIONS",
        "CONDO", "CERTIFICATION"
    ],
    "1025": [
        "SUBJECT", "CONTRACT", "NEIGHBORHOOD", "SITE", "IMPROVEMENTS", "SALES_GRID", "SALES_TRANSFER",
        "INFO_OF_SALES", "RECONCILIATION", "COST_APPROACH", "INCOME_APPROACH", "CONDO_FORECLOSURE",
        "PUD_INFO", "MARKET_CONDITIONS", "CONDO", "CERTIFICATION","COMPARABLE_RENTAL_DATA","SUBJECT_RENT_SCHEDULE"
    ],
    "ECR": [
        "SUMMARY", "SUBJECT", "NEIGHBORHOOD", "SITE", "IMPROVEMENTS",
        "MARKET_TRENDS", "SALES_COMPARISON", "ANTICIPATED_SALES_PRICE", "CERTIFICATION"
    ],
    "ERC": [
        "SUMMARY", "SUBJECT", "NEIGHBORHOOD", "SITE", "IMPROVEMENTS",
        "MARKET_TRENDS", "SALES_COMPARISON", "ANTICIPATED_SALES_PRICE", "CERTIFICATION"
    ]
}
DEFAULT_CATEGORIES = [
    "SUBJECT", "CONTRACT", "NEIGHBORHOOD", "SITE", "IMPROVEMENTS", "SALES_GRID",
    "SALES_TRANSFER", "RECONCILIATION", "COST_APPROACH", "INCOME_APPROACH", "CONDO_FORECLOSURE",
    "PUD_INFO", "MARKET_CONDITIONS", "CONDO", "CERTIFICATION","COMPARABLE_RENTAL_DATA","SUBJECT_RENT_SCHEDULE"
]
GENERAL_INSTRUCTIONS = (
    "\n--- General Instructions ---\n"
    """1.  **CHOICE FIELDS (e.g., "Yes/No", "did/did not")**: For fields with choices, you MUST determine which option is selected (e.g., by a checked box [X], [x], [•], [o], [v], ☒, ☑, or a plain 'x'/'X' next to or inside the option, e.g. "x did" or "did x not"). The returned value MUST start with the selected choice. If there is explanatory text immediately following the choice, append it with a colon.
        - **Example (did/did not):** For "I did did not research...", if 'did not' is checked and followed by "If not, explain: Not required", the value must be "did not: Not required".
        - **Example (Yes/No):** For "Is property seller owner of public record?", if 'Yes' is checked, the value must be "Yes".
        - **CRITICAL:**
            * Checkmarks can be represented in text as brackets containing characters (like `[X]`, `[x]`, `[o]`), unicode check boxes (☒, ☑, 🗹), or just a lone `x` / `X` positioned before, after, or between the choices (e.g., `x did did not` means `did` is checked, `did x did not` or `did did not x` means `did not` is checked).
            * If no checkbox character is visible in the raw text, look at the contextual sentences that follow. For example, if the subsequent text says "did not reveal any sales" or "no prior transfers found", the checkmark is "did not". If it says "prior sales are detailed below", then the checkmark is "did".
            * The response must begin with the selected option ("did" or "did not" or "Yes" or "No"). Do NOT return only the explanatory text. If you cannot determine the choice, return an empty string "".
    2.  **Monetary Values**: For all monetary fields (ending in '$' or 'price'), extract only the numeric value without currency symbols, commas, or decimals (e.g., '$1,250,000.50' becomes '1250000').
    3.  **Dates**: Extract all dates in 'MM/DD/YYYY' format.
    4.  **Empty Values**: If a field's value is not found or is not applicable, use an empty string `''`.
    5.  **Address Fields**: For 'Property Address', 'City', 'State', 'Zip Code', extract them as separate, distinct fields. Do not merge them.
    6.  **See attached addendum.**: for 'See attached addendum.'if the value is 'See attached addendum.' then find the comment for the relative fieldand extract it.
    7.  **Utilities**: if the Utilities like Electricity, Gas, Water, Sanitary Sewer, Street, Alley consist of the is clicked as Other (describe) or Private then find the related word and extract the value as the Private/value.
    8.  **'License Valid To'**: Check License Valid To / expiration date on the Appraiser License copy or certification page across all PDF pages (including scanned image attachments). Format as MM/DD/YYYY.
    9.  **'Policy Period From'**: Check Policy Period From (effective/start date) on the E&O Insurance policy document or certificate across all PDF pages (including scanned image attachments). Format as MM/DD/YYYY.
    10. **'Policy Period To'**: Check Policy Period To (expiration/end date) on the E&O Insurance policy document or certificate across all PDF pages (including scanned image attachments). Format as MM/DD/YYYY.
    11. **'Appraiser License'**: Check Appraiser License number on the License copy or certification page across all PDF pages (including scanned image attachments).
    12. **'E&O Insurance'**: Check E&O Insurance policy number on the E&O Insurance policy document, declaration page, or certificate across all PDF pages (including scanned image attachments).
    13. **'License # / Reg #:'**: Check Appraiser License / Registration Number on the License copy or certification page across all PDF pages (including scanned image attachments).
    """
)
CATEGORY_SPECIFIC_INSTRUCTIONS = {
    "SUBJECT": (
        "--- SUBJECT Section Instructions ---\n"
        "1. **'From Type'**: STRICTLY identify the primary appraisal form type and any additional forms present in all the pages the PDF. Scan ALL headers and footers for form numbers ON THE ALL PAGES OF THE REPORT. Combine multiple forms with ' + ' (e.g., '1004 + 1007'). Primary Types: 1004 (URAR), 1073 (Condo), 1025 (Multi-family), 2055 (Exterior), 1004C (Manufactured), 2090, 1075. Additional Types: 1007 (Rent Schedule), 1004D (Update/Completion), 92051, Compliance Inspection. Allowed Values: [1025, 1073, 1004, 1007, 1004D, 2090, 1007, 92051, 2055, As-is + ARV Reports, 203K FHA, 1075, 71A/71B, 1004C, ACE + PDR, Appraisal Version #1, ERC, ECR].\n"
        "2. **'ADU File Check'**: If the 'One with Accessory Unit' checkbox is checked, set this value to 'Yes', otherwise 'No'.\n"
        "2. **'Exposure comment'**: Please find out the comment from the report for the Exposure comment using the wording/keywords 'Exposure', 'expo days', 'exposure time', 'expo', 'time', 'marketing time'. If present extract the full sentence/narrative comment, otherwise 'Not Present'.\n"
        "2. **'Prior service comment'**: If the 'Prior service comment' is present the value , otherwise 'Not Present'.\n"
        "2. **'ANSI'**: If the 'ANSI' is present the value , otherwise 'Not Present'.\n"
        "3. **'Full Address'**: The Full Address validation verifies that the property address, city, state, and ZIP code are consistently present and identical across all pages of the report.If all values match, the system displays “Address verified on all pages.” If any inconsistency is detected, the system identifies and reports the specific page(s) and field(s) where the mismatch occurs. "
        "3. **'PUD'**: If the 'PUD' checkbox is checked, set this value to 'Yes', otherwise 'No'.\n"
        "4. **'HOA $'**: If the value is greater than 0, check if 'per year' or 'per month' is selected and include that in the response.\n"
        "5. **'FHA Case No.'**:plz confirm the Format as '000-0000000', otherwise 'Not Present'.\n"
        "6. **'Offered for Sale in Last 12 Months'**: The value must be ONLY 'Yes' or 'No'. Do not include any associated text.\n"
        "7. **'Smoke detector comment'**: Please find out the comment from the report for the Smoke detector comment using the wording/keywords 'Smoke', 'detector', 'detectors', 'alarm'. If the comment is not found in the narrative text, check if photos are present for the Smoke detector (e.g. 'Photo present: Smoke detector (Page X)').\n"
        "8. **'CO detector comment'**: Please find out the comment from the report for the CO detector comment using the wording/keywords 'carbon', 'co', 'detector', 'detectors', 'monoxide', 'alarm'. If the comment is not found in the narrative text, check if photos are present for the CO detector (e.g. 'Photo present: CO detector (Page X)').\n"
        "9. **'Water heater double-strapped comment'**: Please find out the comment from the report for the Water heater double-strapped comment using the wording/keywords 'water heater', 'double-strapped', 'strapped', 'strap', 'brace'. If the comment is not found, check if photos are present for the Water heater.\n"
        "10. **'Special Assessments Comment'**: Please find out the comment from the report for the Special Assessments Comment for finding the comment use word 'Assessment'\n"
        "11. **'Occupant Comment'**:Please find out the comment from the report for the Occupant Commentfor finding the comment use the words as Occupied, Owner, Tenant, Vacant, stages of construction, Rent, Rent-Ready, Uninhabitable\n"
        "12. **'Occupant'**: Strictly extract the checked option from ['Owner', 'Tenant', 'Vacant'].\n"
        "13. **'Property Rights Appraised'**: Strictly extract the checked option from ['Fee Simple', 'Leasehold', 'Other'].\n"
        "14. **'Assignment Type'**: Strictly extract the checked option from ['Purchase Transaction', 'Refinance Transaction', 'Other'].\n"
        "15. **'Appraiser\'s Fee'**: Search all pages of the report for the Appraiser Fee using keywords like 'Appraiser Fee', 'Appraiser\'s Fee', 'Appraisal Fee', 'Total Fee', 'Agreed Fee', 'Fee', 'Invoice Amount' (e.g., 'Appraiser Fee; $525.00 dollars', 'Appraiser Fee: $525.00', 'Fee: $525'). Extract the clean numeric or currency fee amount (e.g. '$525.00' or '525.00'). If not found, output 'Not Disclosed'.\n"
    ),
    "CONTRACT": (
        "--- CONTRACT Section Instructions ---\n"
        "1. **'I did did not analyze the contract for sale for the subject purchase transaction...'**: Meticulously inspect the check boxes visually next to 'did' and 'did not'. If 'did' has a mark/X, output 'did'. If 'did not' has a mark/X, output 'did not'. Append any analysis explanation that follows with a colon (e.g. 'did: Arms length sale; ...' or 'did not: Refinance; contract not applicable').\n"
        "2. **'If Yes, report the total dollar amount and describe the items to be paid'**: Extract the dollar amount and any descriptive comment (e.g., '$0; comment text')."
    ),
    "NEIGHBORHOOD": (
        "--- NEIGHBORHOOD Section Instructions ---\n"
        "1. **'one unit housing price(high,low,pred)'**: Format as a single string 'high / low / pred' (e.g., '500000 / 400000 / 450000').\n"
        "2. **'one unit housing age(high,low,pred)'**: Format as a single string 'high / low / pred' (e.g., '50 / 5 / 25').\n"
        "3. **'Present Land Use for other'**: If the 'Other' land use percentage is > 0, find the description for it and place it in this field.\n"
        "4. **'Market Conditions:'**: Strictly extract the comment associated with this field.\n"
        "5. **'Location'**: Strictly extract the checked option from ['Urban', 'Suburban', 'Rural'].\n"
        "6. **'Built-Up'**: Strictly extract the checked option from ['Over 75%', '25-75%', 'Under 25%'].\n"
        "7. **'Growth'**: Strictly extract the checked option from ['Rapid', 'Stable', 'Slow'].\n"
        "8. **'Property Values'**: Strictly extract the checked option from ['Increasing', 'Stable', 'Declining'].\n"
        "9. **'Demand/Supply'**: Strictly extract the checked option from ['Shortage', 'In Balance', 'Over Supply'].\n"
        "10. **'Marketing Time'**: Strictly extract the checked option from ['Under 3 mths', '3-6 mths', 'Over 6 mths']."
    ),
    "Improvements": (
        "--- Improvements Section Instructions ---\n"
        "1. **'Att./Det./Built-in'**: Strictly extract for field 'Att./Det./Built-in' the which one checked along 'Att./Det./Built-in'"
    ),
    "SITE": (
        "--- SITE Section Instructions ---\n"
        "1. **'Dimensions'**: Extract the dimensions value from the SITE section.\n"
        "2. **'Area'**: The value must include units like 'sf' or 'Ac' (e.g., '4353 sf').\n"
        "3. **'Zoning Compliance'**: Strictly extract the selected option ('Legal', 'Legal Nonconforming (Grandfathered Use)', 'No Zoning', or 'Illegal (describe)')."
    ),
    "PROJECT_INFO": (
        "--- PROJECT_INFO Section Instructions ---\n"
        "1. **'Project Description'**: Identify which option is checked from [Detached, Row or Townhouse, Garden, Mid-Rise, High-Rise, Other (describe)] and return that value."
        "2. **'Existing/Proposed/Under Const.'** : Identify which option is checked from 'Existing/Proposed/Under Const.' and return that value"
    ),
    "CERTIFICATION": (
        "--- CERTIFICATION Section Instructions ---\n"
        "1. **'Signature'**: Check only if a signature is present and return 'Present' or 'Not Present'.\n"
        "2. **'LENDER/CLIENT Name'**: In the certification section, find the LENDER/CLIENT Name on the signature page and also extract 'Lender/Client Company Name', 'Lender/Client Company Address', and 'Lender/Client Email Address'.\n"
        "3. **'Appraiser License' & 'License # / Reg #:' & 'LICENSE/REGISTRATION/CERTIFICATION #'**: Search the appraiser signature page and any attached state license document/certificate (including image/scanned pages) for the license/registration number (e.g., '30029137', 'RD8290', '45000054959'). Extract the exact license number.\n"
        "4. **'License Valid To'**: Search the appraiser certification section and any attached state license certificate for the license expiration date. Format as MM/DD/YYYY.\n"
        "5. **'E&O Insurance'**: Search any attached Errors & Omissions (E&O) insurance policy document, declaration page, or certificate image for the policy or certificate number.\n"
        "6. **'Policy Period From' & 'Policy Period To'**: Search any attached E&O insurance document or certificate for the policy start date ('Policy Period From') and expiration date ('Policy Period To'). Format dates as MM/DD/YYYY."

    ),"PROJECT_SITE": (
        "--- PROJECT_SITE Section Instructions ---\n"
        "1. **'Zoning Description'**: FOR THE FIELD Zoning Description PLEASE CHECK THE VALUE OF THE FIELD & return that value."
    ),
    "UNIT_DESCRIPTIONS":(
        "--- CERTIFICATION Section Instructions ---\n"
        "1. **'None/Garage/Covered/Open'**: Identify which option is checked from 'Existing/Proposed/Under Const.' and return that value "
    ),
    "SALES_TRANSFER": (
        "--- SALES_TRANSFER Section Instructions ---\n"
        "1. **'I did did not research the sale or transfer history of the subject property and comparable sales...'**: Locate the checkboxes next to 'did' and 'did not'. If 'did' has a mark/X, output 'did'. If 'did not' has a mark/X, output 'did not'. Append any comments or explanation with a colon.\n"
        "2. **'My research did did not reveal any prior sales or transfers of the subject property for the three years prior to the effective date of this appraisal.'**: Locate the checkboxes next to 'did' and 'did not'. If 'did' has a mark/X, output 'did'. If 'did not' has a mark/X, output 'did not'.\n"
        "3. **'My research did did not reveal any prior sales or transfers of the comparable sales for the year prior to the date of sale of the comparable sale.'**: Locate the checkboxes next to 'did' and 'did not'. If 'did' has a mark/X, output 'did'. If 'did not' has a mark/X, output 'did not'."
    ),
    "PRIOR_SALE_HISTORY": (
        "--- PRIOR_SALE_HISTORY Section Instructions ---\n"
        "1. **'Prior Sale History: I did did not research the sale or transfer history of the subject property and comparable sales'**: Locate the checkboxes next to 'did' and 'did not'. If 'did' has a mark/X, output 'did'. If 'did not' has a mark/X, output 'did not'. Append any comments or explanation with a colon.\n"
        "2. **'Prior Sale History: My research did did not reveal any prior sales or transfers of the subject property for the three years prior to the effective date of this appraisal'**: Locate the checkboxes next to 'did' and 'did not'. If 'did' has a mark/X, output 'did'. If 'did not' has a mark/X, output 'did not'.\n"
        "3. **'Prior Sale History: My research did did not reveal any prior sales or transfers of the comparable sales for the year prior to the date of sale of the comparable sale'**: Locate the checkboxes next to 'did' and 'did not'. If 'did' has a mark/X, output 'did'. If 'did not' has a mark/X, output 'did not'."
    ),
    "SUMMARY": (
        "--- SUMMARY Section Instructions ---\n"
        "1. Extract the overview fields of the appraisal report summary section.\n"
        "2. For choice fields (e.g. Condominium, Cooperative, PUD), return 'Yes' if checked/applicable, 'No' otherwise.\n"
        "3. **'Opinion of Market Value'**: Extract the numeric market value without currency symbols or commas.\n"
        "4. **'Effective Date of Appraisal'**: Format as MM/DD/YYYY."
    ),
    "PUD_INFO": (
        "--- PUD_INFO Section Instructions ---\n"
        "1. **PUD Information Extraction**: Look at the 'PROJECT INFORMATION FOR PUDs (if applicable)' section on Page 3 of the appraisal form (or Form 1004).\n"
        "2. **Checkboxes**: For questions like 'Is the developer/builder in control of the Homeowners\\' Association (HOA)?', 'Was the project created by the conversion of existing building(s) into a PUD?', 'Are the units, common elements, and recreation facilities complete?', and 'Are the common elements leased to or by the Homeowners\\' Association?', ONLY return 'Yes' or 'No' IF the corresponding checkbox has an actual mark/check/X inside it. If neither checkbox is checked, return \"\".\n"
        "3. **Non-PUD Properties**: If the property is NOT a PUD or the PUD section is left blank/unfilled by the appraiser, return empty strings \"\" for all PUD fields. Do NOT invent or default to Yes/No when checkboxes are empty."
    )
}

def make_flat_schema(fields_list):
    return {
        "type": "object",
        "properties": {
            field: {"type": "string"} for field in fields_list
        },
        "required": fields_list
    }

sales_grid_item_schema = {
    "type": "object",
    "properties": {
        field: {"type": "string"} for field in SalesGridFIELDS2
    },
    "required": SalesGridFIELDS2
}

sales_grid_schema = {
    "type": "object",
    "properties": {
        "Subject": sales_grid_item_schema,
        "COMPARABLE SALE #1": sales_grid_item_schema,
        "COMPARABLE SALE #2": sales_grid_item_schema,
        "COMPARABLE SALE #3": sales_grid_item_schema,
        "COMPARABLE SALE #4": sales_grid_item_schema,
        "COMPARABLE SALE #5": sales_grid_item_schema,
        "COMPARABLE SALE #6": sales_grid_item_schema,
        "COMPARABLE SALE #7": sales_grid_item_schema,
        "COMPARABLE SALE #8": sales_grid_item_schema,
        "COMPARABLE SALE #9": sales_grid_item_schema,
    },
    "required": ["Subject", "COMPARABLE SALE #1", "COMPARABLE SALE #2", "COMPARABLE SALE #3"]
}

rent_grid_item_schema = {
    "type": "object",
    "properties": {
        field: {"type": "string"} for field in RentSchedulesFIELDS2
    },
    "required": RentSchedulesFIELDS2
}

rent_grid_schema = {
    "type": "object",
    "properties": {
        "Subject": rent_grid_item_schema,
        "COMPARABLE Rental #1": rent_grid_item_schema,
        "COMPARABLE Rental #2": rent_grid_item_schema,
        "COMPARABLE Rental #3": rent_grid_item_schema,
        "COMPARABLE Rental #4": rent_grid_item_schema,
        "COMPARABLE Rental #5": rent_grid_item_schema,
    },
    "required": ["Subject", "COMPARABLE Rental #1"]
}

comp_rental_item_schema = {
    "type": "object",
    "properties": {
        field: {"type": "string"} for field in COMPARABLE_RENTAL_DATA_FIELDS
    },
    "required": COMPARABLE_RENTAL_DATA_FIELDS
}

comparable_rental_data_schema = {
    "type": "object",
    "properties": {
        "Subject": comp_rental_item_schema,
        "COMPARABLE Rental No #1": comp_rental_item_schema,
        "COMPARABLE Rental No #2": comp_rental_item_schema,
        "COMPARABLE Rental No #3": comp_rental_item_schema,
        "COMPARABLE Rental No #4": comp_rental_item_schema,
    },
    "required": ["Subject", "COMPARABLE Rental No #1"]
}

custom_checklist_schema = {
    "type": "object",
    "properties": {
        "summary": {"type": "string"},
        "comparison_summary": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "status": {"type": "string", "enum": ["Fulfilled", "Not Fulfilled"]},
                    "section": {"type": "string"},
                    "comment": {"type": "string"}
                },
                "required": ["status", "section", "comment"]
            }
        }
    },
    "required": ["summary", "comparison_summary"]
}


def extract_fields_from_pdf(pdf_path, form_type: str, category: str | None = None, custom_prompt: str | None = None, prompt_type: str = "checklist"):
    # If custom_prompt is not provided, perform 100% offline extraction
    if not custom_prompt:
        form_type_clean = (form_type or "").strip()
        if form_type_clean in ["Appraisal Version #1", "Appraisal Version #5", "Version 1", "Version 5", "URAR"] or "Appraisal Version" in form_type_clean or "VERSION" in form_type_clean.upper():
            from api.pdf_extractor_v1 import extract_fields_from_pdf_v1
            return extract_fields_from_pdf_v1(pdf_path, category=category, custom_prompt=None, prompt_type=prompt_type)
        if (form_type or "").strip().upper() in ["ECR", "ERC", "WORLDWIDE ERC"]:
            from api.pdf_extractor_ecr_offline import extract_fields_from_pdf_ecr_offline
            return extract_fields_from_pdf_ecr_offline(pdf_path)
        from api.pdf_extractor_offline import extract_fields_from_pdf_offline
        res = extract_fields_from_pdf_offline(pdf_path)
        if res.get("status") == "success":
            return res

    combined_result = {}
    raw_responses = []
    
    uploaded_file = None
    cache = None
    try:
        if not ACTIVE_API_KEY:
            return {'error': 'Configuration Error', 'message': 'Gemini API key is not configured.'}
        genai.configure(api_key=ACTIVE_API_KEY)

        with open(pdf_path, "rb") as f:
            pdf_bytes = f.read()

        print("Uploading PDF to Gemini File API for caching...")
        uploaded_file = genai.upload_file(pdf_path, mime_type="application/pdf")
        
        print("Creating Gemini Cache with gemini-3.5-flash...")
        try:
            cache = caching.CachedContent.create(
                model='models/gemini-3.5-flash',
                contents=[uploaded_file],
                ttl=datetime.timedelta(minutes=15)
            )
        except Exception as err:
            print(f"Cache create with gemini-3.5-flash failed ({err}), trying gemini-2.5-flash...")
            try:
                cache = caching.CachedContent.create(
                    model='models/gemini-2.5-flash',
                    contents=[uploaded_file],
                    ttl=datetime.timedelta(minutes=15)
                )
            except Exception:
                try:
                    cache = caching.CachedContent.create(
                        model='models/gemini-1.5-flash',
                        contents=[uploaded_file],
                        ttl=datetime.timedelta(minutes=15)
                    )
                except Exception as cache_err:
                    print(f"Cache creation failed ({cache_err}). Falling back to direct model execution.")
                    cache = None

        if custom_prompt:
            response_schema = None
            if prompt_type == "checklist":
                response_schema = custom_checklist_schema
            elif prompt_type == "general":
                response_schema = None

            if response_schema:
                generation_config = genai.GenerationConfig(
                    temperature=0.0,
                    response_mime_type="application/json",
                    response_schema=response_schema,
                )
            else:
                generation_config = genai.GenerationConfig(
                    temperature=0.0,
                    response_mime_type="application/json",
                )

            if prompt_type == "direct":
                final_prompt = custom_prompt
            elif prompt_type == "general":
                final_prompt = textwrap.dedent(f"""\
                    You are an expert appraisal data extractor. You are given an appraisal report PDF and a 'Query' to answer.
                    Your task is to analyze the document and provide a detailed answer to the query.
                    Query:
                    ---
                    {custom_prompt}
                    ---
                    Your response must be a single, clean JSON object.
                    If the query asks for specific fields, return them as key-value pairs.
                    If the query asks a question, return a JSON with a 'answer' key and the text response, and optionally 'page_no' if relevant.
                    Do not include any introductory text, explanations, or markdown formatting like ```json.
                """)
            else:
                final_prompt = textwrap.dedent(f"""\
                    You are an expert appraisal reviewer. You are given an appraisal report PDF and a 'Revision Checklist' of items to verify.
                    Your task is to meticulously follow the instructions in the 'Revision Checklist' and analyze the document to determine if the requested changes have been made.
                    Revision Checklist:
                    ---
                    {custom_prompt}
                    ---
                    Your response must be a single, clean JSON object with two keys: 'summary' and 'comparison_summary'.
                    The 'summary' value should be a concise, 2-3 line summary of your findings.
                    The 'comparison_summary' value must be an array of objects. For each item in the checklist, create an object with three keys: 'status' ('Fulfilled' or 'Not Fulfilled'), 'section' (the relevant section from the checklist), and 'comment' (a brief explanation of your finding).
                    Do not include any introductory text, explanations, or markdown formatting like ```json.
                """)

            if cache:
                model = genai.GenerativeModel.from_cached_content(
                    cached_content=cache,
                    generation_config=generation_config
                )
                contents_payload = [final_prompt]
            else:
                model = genai.GenerativeModel(
                    model_name='gemini-3.5-flash',
                    generation_config=generation_config
                )
                contents_payload = [uploaded_file, final_prompt]
            raw_text = ""
            try:
                response = model.generate_content(contents=contents_payload, request_options={"timeout": 600.0})
                raw_text = response.text
                if _check_for_api_error_message(raw_text, response.prompt_feedback):
                    return {'error': 'Gemini API Error', 'message': raw_text, 'raw': raw_text}
                json_str = raw_text.strip().lstrip('```json').rstrip('```').strip()
                data = json.loads(json_str) if json_str else {}
                return {'fields': data, 'raw': f"--- CUSTOM PROMPT SECTION ---\n{raw_text}"}
            except json.JSONDecodeError as e:
                return {'error': 'JSON Parsing Error', 'message': f"Failed to parse Gemini response: {e}. Raw response: {raw_text}", 'raw': raw_text}
            except Exception as e:
                return {'error': 'Processing Error', 'message': f"An unexpected error occurred during custom prompt extraction: {e}", 'raw': raw_text}

        field_categories = {
            "SUBJECT": SUBJECT_FIELDS, "CONTRACT": CONTRACT_FIELDS, "NEIGHBORHOOD": NEIGHBORHOOD_FIELDS,
            "SITE": SITE_FIELDS, "IMPROVEMENTS": IMPROVEMENTS_FIELDS, "RECONCILIATION": RECONCILIATION_FIELDS,
            "COST_APPROACH": COST_APPROACH_FIELDS, "INCOME_APPROACH": INCOME_APPROACH_FIELDS,
            "RENT_SCHEDULE_RECONCILIATION": RENT_SCHEDULE_RECONCILIATION_FIELDS, "PUD_INFO": PUD_INFO_FIELDS,
            "CERTIFICATION": CERTIFICATION_FIELDS, "SALES_TRANSFER": SALES_TRANSFER_FIELDS,
            "MARKET_CONDITIONS": MARKET_CONDITIONS_FIELDS, "INFO_OF_SALES": INFO_OF_SALES_FIELDS,
            "CONDO": CONDO_FIELDS,
            "PRIOR_SALE_HISTORY": PRIOR_SALE_HISTORY_FIELDS, "PROJECT_SITE": Project_SITE_FIELDS, "PROJECT_INFO": Project_Info_FIELDS,
            "CONDO_FORECLOSURE": CONDO_FORECLOSURE_FIELDS,
            "PROJECT_ANALYSIS": Project_Analysis_FIELDS, "UNIT_DESCRIPTIONS": UNIT_DESCRIPTIONS_FIELDS,
            "COMPARABLE_RENTAL_DATA": COMPARABLE_RENTAL_DATA_FIELDS,"SUBJECT_RENT_SCHEDULE": SUBJECT_RENT_SCHEDULE
        }
        if category:
            categories_to_process = [category.upper()]
        else:
            categories_to_process = FORM_TYPE_CATEGORIES.get(form_type, DEFAULT_CATEGORIES)

        for category_name in categories_to_process:
            response_schema = None
            if category_name in ["SALES_GRID", "RENT_SCHEDULE_GRID", "COMPARABLE_RENTAL_DATA", "MARKET_CONDITIONS"]:
                response_schema = None
            elif category_name in field_categories:
                response_schema = make_flat_schema(field_categories[category_name])

            if response_schema:
                generation_config = genai.GenerationConfig(
                    temperature=0.0,
                    response_mime_type="application/json",
                    response_schema=response_schema,
                )
            else:
                generation_config = genai.GenerationConfig(
                    temperature=0.0,
                    response_mime_type="application/json",
                )

            if cache:
                model = genai.GenerativeModel.from_cached_content(
                    cached_content=cache,
                    generation_config=generation_config
                )
            else:
                model = genai.GenerativeModel(
                    model_name='gemini-3.5-flash',
                    generation_config=generation_config
                )

            prompt = ""
            if category_name == "SALES_GRID":
                prompt = textwrap.dedent(f"""
                You are a specialized AI for digitizing appraisal report PDFs. Extract the 'SALES COMPARISON APPROACH' grid.

                <instructions>
                1. Output a single JSON object with keys: "Subject", "COMPARABLE SALE #1", "COMPARABLE SALE #2", etc.
                2. Value for each key must contain the fields listed in <fields_to_extract>.
                3. Extract each column independently. Match rows exactly with labels on the left of the grid.
                4. Extract the description (unsigned values, e.g. "Q4", "C3") into the primary key and the signed adjustment (e.g. "+5000", "-1500") into the corresponding "* Adjustment" key. If no signed value is present, use "".
                5. For Room Counts: Extract sub-columns under "Above Grade Room Count" into 'Total Rooms', 'Bedrooms', and 'Baths'. Adjustments for Bdrms and Baths go into 'Bedrooms Adjustment' and 'Baths Adjustment' respectively.
                6. For GLA/GBA: Extract area into 'Gross Living Area'/'Gross Building Area' and its adjustment into 'Gross Living Area Adjustment'/'Gross Building Area Adjustment'.
                7. For Proximity to Subject comment find out the comment from the all the pages of the report.
                8. For Unit Breakdown: Extract counts and adjustments for each unit into 'Unit Breakdown Tot Unit # [1-4]', 'Unit Breakdown Br Unit # [1-4]', 'Unit Breakdown Ba Unit # [1-4]', and 'Unit Breakdown Adjustment Unit # [1-4]'.
                9. For Prior Sales: Extract the bottom grid into prior sale keys (Date, Price, Data Source, Effective Date).
                10. Clean monetary values (digits only) and format dates (MM/DD/YYYY).
                11. For empty cells/missing data, use "".
                </instructions>

                <fields_to_extract>
                {SalesGridFIELDS2}
                </fields_to_extract>

                Now, process the entire PDF, review every page, identify all SALES COMPARISON APPROACH grids, and generate the JSON output containing the Subject property and ALL Comparable Sale columns found in the document.
                """)

            elif category_name == "RENT_SCHEDULE_GRID":
                prompt = textwrap.dedent(f"""
                    You are a specialized AI for extracting structured data from appraisal report PDFs. Your task is to extract data from the 'COMPARABLE RENT SCHEDULE' grid.

                    <instructions>
                    1.  **Primary Goal**: Digitize the grid for the 'Subject' property and all 'Comparable' rental columns.
                    2.  **Output Format**: Your entire response MUST be a single, valid JSON object. Do not include any text, explanations, or markdown (like ```json) before or after the JSON.
                    3.  **JSON Structure**:
                        - The root of the JSON object will have keys: "Subject", "COMPARABLE NO. 1", "COMPARABLE NO. 2", etc.
                        - The value for each key will be another JSON object containing the fields listed in `<fields_to_extract>`.
                    4.  **Extraction Rules**:
                        -   **Column Integrity**: Data for one comparable must not leak into another.
                        -   **Row Alignment**: Match data precisely with the row labels on the left side of the grid.
                        -   **Adjustments**: Some fields may have adjustment strickly check values belong to that fields the main value. Capture both if present don't mismatch the adjustments. and '0' adjustment is present then that is valid adjustment please extract that also.
                        -   **Data Cleaning**: Remove '$' and commas from monetary values. Format dates as MM/DD/YYYY.
                        -   **Missing Data**: If a cell is empty or a value cannot be found, use an empty string `""`. Do not invent data.
                    </instructions>

                    <fields_to_extract>
                    {RentSchedulesFIELDS2}
                    </fields_to_extract>

                    Now, process the provided PDF and generate the JSON output based on the 'COMPARABLE RENT SCHEDULE' grid.
                """)
            elif category_name == "COMPARABLE_RENTAL_DATA":
                prompt = textwrap.dedent(f"""
                    You are a specialized AI for extracting structured data from appraisal report PDFs. Your task is to extract data from the 'COMPARABLE RENTAL DATA' grid (often found in Form 1025).

                    <instructions>
                    1.  **Primary Goal**: Digitize the grid for the 'Subject' property and all 'Comparable' rental columns.
                    2.  **Output Format**: Your entire response MUST be a single, valid JSON object. Do not include any text, explanations, or markdown (like ```json) before or after the JSON.
                    3.  **JSON Structure**:
                        - The root of the JSON object will have keys: "Subject", "COMPARABLE Rental No #1", "COMPARABLE Rental No #2", etc.
                        - The value for each key will be another JSON object containing the fields listed in `<fields_to_extract>`.
                    4.  **Extraction Rules**:
                        -   **Column Integrity**: Data for one comparable must not leak into another.
                        -   **Row Alignment**: Match data precisely with the row labels on the left side of the grid.
                        -   **Unit Breakdown**: Pay close attention to the 'Unit Breakdown' section and extract room counts (Tot, Br, Ba), size (Sq. Ft.), and monthly rent for each unit number (Unit #1, Unit #2, etc.).
                        -   **Data Cleaning**: Remove '$' and commas from monetary values. Format dates as MM/DD/YYYY.
                        -   **Missing Data**: If a cell is empty or a value cannot be found, use an empty string `""`. Do not invent data.
                    </instructions>

                    <fields_to_extract>
                    {COMPARABLE_RENTAL_DATA_FIELDS}
                    </fields_to_extract>

                    Now, process the provided PDF and generate the JSON output based on the 'COMPARABLE RENTAL DATA' grid.
                """)
            elif category_name in field_categories:
                fields_list = field_categories[category_name]

                instruction_details = GENERAL_INSTRUCTIONS
                if category_name in CATEGORY_SPECIFIC_INSTRUCTIONS:
                    instruction_details += "\n" + CATEGORY_SPECIFIC_INSTRUCTIONS[category_name]

                base_prompt = (
                    "From the provided appraisal report, extract the values for the fields listed below. "
                    "Your response must be a single, clean JSON object with the field names as keys and their extracted values. "
                    "Pay close attention to all instructions provided. "
                    "Do not include any introductory text, explanations, or markdown formatting like ```json. "
                    "The field names in the JSON must exactly match the list provided. "
                    "Ensure all string values are properly escaped and the JSON is valid."
                )
                prompt = f"{base_prompt}\n{instruction_details}\n--- Fields for {category_name} ---\n{fields_list}"
            else:
                continue
            try:
                contents_payload = [prompt] if cache else [uploaded_file, prompt]
                response = model.generate_content(contents=contents_payload, request_options={"timeout": 600.0})
                raw_text = ""
                try:
                    if not response.parts:
                        reason = "Unknown"
                        if response.prompt_feedback.block_reason:
                            reason = response.prompt_feedback.block_reason.name
                        raw_text = f"Response blocked for '{category_name}'. Reason: {reason}"
                        combined_result[category_name] = {'api_error': True, 'message': raw_text, 'raw': raw_text}
                        raw_responses.append(f"--- {category_name} SECTION (API ERROR) ---\n{raw_text}")
                        continue

                    raw_text = response.text

                except ValueError as ve:
                    reason = "Unknown"
                    if response.prompt_feedback.block_reason:
                        reason = response.prompt_feedback.block_reason.name
                    raw_text = f"Response blocked for '{category_name}'. Reason: {reason}. Error: {ve}"
                    combined_result[category_name] = {'api_error': True, 'message': raw_text, 'raw': raw_text}
                    raw_responses.append(f"--- {category_name} SECTION (API ERROR) ---\n{raw_text}")
                    continue

                if _check_for_api_error_message(raw_text, response.prompt_feedback):
                    combined_result[category_name] = {'api_error': True, 'message': raw_text, 'raw': raw_text}
                    raw_responses.append(f"--- {category_name} SECTION (API ERROR) ---\n{raw_text}")
                    continue

                truncated_raw_text = (raw_text[:2000] + '...' if len(raw_text) > 2000 else raw_text)
                raw_responses.append(f"--- {category_name} SECTION ---\n{truncated_raw_text}")

                json_str = raw_text.strip().lstrip('```json').rstrip('```').strip()
                json_str = json_str.replace('"This appraisal is made "as is",', '"This appraisal is made \\"as is\\",')
                json_str = json_str.replace('made "as is",', 'made \\"as is\\",')
                parsed_data = {}
                try:
                    parsed_data = json.loads(json_str)

                    parsed_data = sanitize_extracted_data(parsed_data)

                    if category_name in ["SALES_GRID", "RENT_SCHEDULE_GRID", "COMPARABLE_RENTAL_DATA"]:
                        if "Subject" in parsed_data:
                            if "Subject" not in combined_result:
                                combined_result["Subject"] = {}
                            combined_result["Subject"].update(parsed_data["Subject"])
                            del parsed_data["Subject"]
                        combined_result.update(parsed_data)
                    elif category_name not in ["SALES_GRID", "RENT_SCHEDULE_GRID", "COMPARABLE_RENTAL_DATA"]:
                        combined_result.update(parsed_data)

                    if category_name not in ["SALES_GRID", "RENT_SCHEDULE_GRID", "COMPARABLE_RENTAL_DATA"]:
                        if 'api_error' not in combined_result.get(category_name, {}):
                            combined_result.setdefault(category_name, {}).update(parsed_data)

                except json.JSONDecodeError as e:
                    error_message = f"JSON Parsing Error for {category_name}: {e}. Raw response snippet: {json_str[:500]}..."
                    print(error_message)
                    combined_result[category_name] = {'error': 'JSON Parsing Failed', 'message': error_message, 'raw_snippet': json_str[:500]}
                except Exception as e:
                    error_message = f"An unexpected error occurred during data processing for {category_name}: {e}. Raw response snippet: {json_str[:500]}..."
                    print(error_message)
                    combined_result[category_name] = {'error': 'Processing Error', 'message': error_message, 'raw_snippet': json_str[:500]}

            except Exception as e:
                error_message = f"API call failed for {category_name}: {e}"
                print(error_message)
                combined_result[category_name] = {'error': 'API Call Failed', 'message': error_message}
                raw_responses.append(f"--- {category_name} SECTION (API CALL FAILED) ---\n{error_message}")
            print(f"Processed category {category_name}, sleeping for 2 seconds...")
            time.sleep(2)

    except google_exceptions.ResourceExhausted as e:
        print(f"Gemini API Quota Exceeded: {e}")
        return {'error': 'Gemini API Quota Exceeded', 'message': f"API quota exceeded. Please check your plan and billing details. Original error: {e}"}
    except Exception as e:
        print(f"Error during overall document extraction: {e}")
        return {'error': 'Extraction Failed', 'message': f"An unexpected error occurred during document extraction: {e}"}
    finally:
        try:
            if cache: cache.delete()
        except: pass
        try:
            if uploaded_file: uploaded_file.delete()
        except: pass

    return {'fields': combined_result, 'raw': "\n\n".join(raw_responses)}


def compare_documents(original_path: str, revised_path: str, revision_request: str | None = None, form_type: str | None = None) -> dict:
    if form_type in ["ECR", "ERC", "WORLDWIDE ERC"]:
        from api.pdf_extractor_ecr import compare_documents_ecr
        return compare_documents_ecr(original_path, revised_path, revision_request=revision_request) 
    """
    Compares two documents (PDFs) and identifies differences using a generative model.
    """
    try:
        with open(original_path, "rb") as f:
            original_bytes = f.read()
        with open(revised_path, "rb") as f:
            revised_bytes = f.read()

        old_pdf_reader = PdfReader(original_path)
        new_pdf_reader = PdfReader(revised_path)
        old_pdf_page_count = len(old_pdf_reader.pages)
        new_pdf_page_count = len(new_pdf_reader.pages)

        original_file_part = {"mime_type": "application/pdf", "data": original_bytes}
        revised_file_part = {"mime_type": "application/pdf", "data": revised_bytes}

        model = genai.GenerativeModel(
            model_name="gemini-3.5-flash",
            generation_config={"temperature": 0.0, "response_mime_type": "application/json"}
        )

        if revision_request:
            prompt = textwrap.dedent(f"""\
                You are an expert appraisal reviewer. You are given an 'Original PDF', a 'Revised PDF', and a 'Checklist' of items to verify.
                Your task is to meticulously follow the instructions in the 'Checklist' and analyze both documents to answer each point.
                Checklist:
                ---
                {revision_request}
                ---
                Your response must be a single, clean JSON object as specified in the checklist instructions.
                Do not include any introductory text, explanations, or markdown formatting like ```json.
            """)
        else:
            prompt = textwrap.dedent("""\
                You are an expert appraisal reviewer specializing in identifying discrepancies between report versions.
                Your primary goal is to meticulously compare an 'Original' and a 'Revised' appraisal report and identify all substantive changes.

                **INSTRUCTIONS:**
                1.  **Focus on Substantive Changes:** Ignore minor formatting, punctuation, or insignificant wording changes unless they alter the meaning. Focus on changes in values, facts, and appraiser comments.
                2.  **Key Areas to Compare:** Pay special attention to changes in these areas:
                    - **Subject & Contract:** Property Address, Borrower, Appraised Value, Effective Date, Contract Price, Concessions.
                    - **Sales Comparison Grid:** Any changes to the Subject or Comparables, including Sale Price, GLA, Adjustments (especially for Condition, Location, View), and final Adjusted Sale Price.
                    - **Reconciliation:** The final "Indicated Value" or "Market Value".
                    - **Cost & Income Approaches:** If present, check for changes in site value, cost estimates, or GRM.
                    - **Addenda & Comments:** Note any significant changes in text, especially in addenda or comment sections related to property condition, market analysis, or required repairs.
                3.  **Output Format:** Your response must be a single, clean JSON object with two keys: 'summary' and 'comparison_summary'. Do not include any introductory text or markdown.
                    - **`summary`**: A concise, 3-4 line executive summary of the most critical changes, such as changes in value, risk, or major property characteristics.
                    - **`comparison_summary`**: An array of objects. Each object represents a single changed field and MUST have these keys:
                        - `field`: The specific field name. For grid changes, use a format like "Comparable 1: Sale Price" or "Subject: GLA".
                        - `original_value`: The value from the 'Original' PDF. If the field was added, use "Not Present".
                        - `revised_value`: The value from the 'Revised' PDF. If the field was removed, use "Not Present".
                        - `page_no`: The page number in the 'Revised' PDF where the change is located.
                        - `comment`: A brief, insightful comment on the change. Examples: "Appraised value increased by $5,000.", "Corrected typo in borrower name.", "Comp 2 adjustment for condition changed from -$500 to $0."
                4.  **Data Cleaning:**
                    - **Monetary Values:** For all monetary fields, extract only the numeric value (e.g., '$1,250,000.50' becomes '1250000').
                    - **Dates:** Extract all dates in 'MM/DD/YYYY' format.
            """)

        market_value_prompt = textwrap.dedent("""
            From the 'Original PDF' and the 'Revised PDF', extract only the "opinion of the market value, as defined, of the real property that is the subject of this report is $" from the RECONCILIATION section of each document.
            Your response must be a single, clean JSON object with two keys: 'old_market_value' and 'new_market_value'.
            Example: { "old_market_value": "123000", "new_market_value": "125000" }.
            Do not include any introductory text, explanations, or markdown formatting like ```json.
        """)

        comparison_response = model.generate_content(contents=[prompt, original_file_part, revised_file_part], request_options={"timeout": 600.0})

        print("Starting market value extraction task...")
        market_value_response = model.generate_content(contents=[market_value_prompt, original_file_part, revised_file_part], request_options={"timeout": 600.0})
        raw_comparison_text = comparison_response.text
        if _check_for_api_error_message(raw_comparison_text, comparison_response.prompt_feedback):
            return {'error': 'Gemini API Error', 'message': raw_comparison_text, 'raw': raw_comparison_text}

        if revision_request:
            json_str = raw_comparison_text.strip().lstrip('```json').rstrip('```').strip()
            return json.loads(json_str) if json_str else {}
        raw_market_value_text = market_value_response.text
        if _check_for_api_error_message(raw_market_value_text, market_value_response.prompt_feedback):
            return {'error': 'Gemini API Error', 'message': f"Failed to extract market values: {raw_market_value_text}", 'raw': raw_market_value_text}

        try:
            comparison_json: dict = json.loads(raw_comparison_text.strip().lstrip('```json').rstrip('```').strip()) if raw_comparison_text else {"comparison_summary": []}
            market_value_json: dict = json.loads(raw_market_value_text.strip().lstrip('```json').rstrip('```').strip()) if raw_market_value_text else {}
        except json.JSONDecodeError as e:
            return {'error': 'JSON Parsing Error', 'message': f"Failed to parse Gemini comparison response: {e}. Raw response: {raw_comparison_text}", 'raw': raw_comparison_text}
        except Exception as e:
            return {'error': 'Processing Error', 'message': f"An unexpected error occurred during comparison processing: {e}. Raw response: {raw_comparison_text}", 'raw': raw_comparison_text}

        comparison_json['old_market_value'] = market_value_json.get('old_market_value', 'Not Found')
        comparison_json['new_market_value'] = market_value_json.get('new_market_value', 'Not Found')
        comparison_json['old_pdf_page_count'] = old_pdf_page_count
        comparison_json['new_pdf_page_count'] = new_pdf_page_count

        if old_pdf_page_count != new_pdf_page_count:
            if 'comparison_summary' not in comparison_json or not isinstance(comparison_json['comparison_summary'], list):
                comparison_json['comparison_summary'] = []

            page_count_comment = f"Page count changed from {old_pdf_page_count} to {new_pdf_page_count}."

            comparison_json['comparison_summary'].insert(0, {
                'field': 'Page Count',
                'original_value': str(old_pdf_page_count),
                'revised_value': str(new_pdf_page_count),
                'page_no': 'N/A',
                'comment': page_count_comment
            })

        return comparison_json

    except google_exceptions.ResourceExhausted as e:
        raise Exception(f"API quota exceeded. Please check your plan and billing details. Original error: {e}")
    except Exception as e:
        print(f"Error during document comparison: {e}")
        raise

def extract_fields_from_html(html_content: str, fields_to_extract: list[str], custom_prompt: str | None = None) -> dict:
    """
    Extracts specified fields from HTML content using a primary (Gemini) and fallback (parsing) strategy.
    (This function was already synchronous and correct)
    """
    data = {}
    field_map = {field.lower(): field for field in fields_to_extract}
    try:
        model = genai.GenerativeModel(
            model_name="gemini-3.5-flash",
            generation_config={"temperature": 0.0, "response_mime_type": "application/json"}
        )
        prompt = custom_prompt
        if not prompt:
            prompt = textwrap.dedent(f"""\
                You are an expert data extractor for HTML content from appraisal management systems.
                Your task is to analyze the provided HTML and extract the values for the fields listed below.
                The HTML can be messy and use tables, divs, or simple text layouts.
                Find the most likely value for each field by looking for its label.
                Return a single, clean JSON object where keys are the field names and values are the extracted text.
                If a field is not found, use an empty string `''`. Do not include markdown formatting.

                **GENERAL HTML STRUCTURE HINTS:**
                - Values often follow their labels in the next `<td>`, `<span>`, or `<div>`.
                - The label might be in a `<th>`, `<b>`, or `<strong>` tag.
                - For `<select>` elements, find the `<option>` that has the `selected` attribute and return its text content.
                - For `<input>` elements, get the `value` attribute.

                **FIELD-SPECIFIC EXTRACTION RULES:**
                - **'Client Name'**: Look for labels like 'Client/Lender on Report', 'Lender', or 'Client'. The value might be inside an `<a>` tag.
                - **'Client Address'**: Look for the address text immediately following the client name or an 'Address' label. It might be a block of text with `<br>` tags; combine it into a single line.
                - **'Transaction Type'**: Find 'Transaction Type' or 'Loan Type'. If it's a `<select>` element, get the text of the selected option.
                - **'FHA Case Number'**: Look for 'FHA Case Number' or 'FHA/VA Case #'. The value is often in an `<input>` tag.
                - **'Borrower (and Co-Borrower)'**: Find 'Borrower' or 'Applicant'. If 'Co-Borrower' is a separate field, combine them with ' & '.
                - **'Property Address'**: Find 'Property Address' or 'Subject Address'. It might be broken into multiple fields (Street, City, State, Zip); combine them into a single address string.
                - **'Property County'**: Look for 'County' or 'Property County'.
                - **'Property Type'**: Find 'Property Type'. This could be a `<select>` element or plain text.
                - **'Assigned to Vendor(s)'**: Look for 'Vendor', 'Appraiser', or 'Assigned To'. The value might be in a table with vendor details.
                - **'AMC Reg. Number'**: Find 'AMC Reg. Number' or 'AMC License #'.
                - **'Appraisal Type'**: Find 'Appraisal Type', 'Product', or 'Form'. This is often a `<select>` element.
                - **'Unit Number'**: Find 'Unit #' or 'Unit Number'. This might be part of the property address or a separate input field.
                - **'UAD XML Report'**: Look for 'UAD Compliant', 'UAD Report', or 'XML Delivery'. The value is often 'Yes', 'No', or a selected radio button/checkbox.

                **Fields to Extract:** {', '.join(fields_to_extract)}""")
        response = model.generate_content([prompt, html_content], request_options={"timeout": 600.0}) # This is already sync
        json_str = response.text.strip().lstrip('```json').rstrip('```').strip()
        data = json.loads(json_str)

        for field in fields_to_extract:
            if field not in data:
                data[field] = ""
        return data
    except Exception as e:
        print(f"HTML extraction with Gemini failed, falling back to parsing. Error: {e}")
        data = {}

    soup = BeautifulSoup(html_content, 'lxml')

    for field_lower, field_original in field_map.items():
        if field_original in data and data[field_original]: continue

        if field_original == 'Appraisal Type':
            appraisal_type_span = soup.find('span', id='AppraisalType')
            if appraisal_type_span and appraisal_type_span.get_text(strip=True):
                data[field_original] = appraisal_type_span.get_text(strip=True)
                continue
            select_appraisal = soup.find('select', {'name': re.compile('AppraisalType', re.I)})
            if select_appraisal:
                selected_option = select_appraisal.find('option', selected=True)
                if selected_option and selected_option.get_text(strip=True) not in ('', '-- Select One --'):
                    data[field_original] = selected_option.get_text(strip=True)
                    continue

        select_element = soup.find('select', attrs={'name': re.compile(field_lower, re.IGNORECASE)})
        if select_element:
            selected_option = select_element.find('option', selected=True)
            if selected_option and selected_option.get_text(strip=True) and selected_option.get_text(strip=True) != '-- Select One --':
                data[field_original] = selected_option.get_text(strip=True)
                continue

            select_value = select_element.get('value')
            if select_value:
                option_by_value = select_element.find('option', attrs={'value': select_value})
                if option_by_value and option_by_value.get_text(strip=True):
                    data[field_original] = option_by_value.get_text(strip=True)
                    continue

        label_elements = soup.find_all(
            lambda tag: tag.name in ['div', 'td', 'th', 'span', 'b', 'strong'] and
                        tag.get_text(strip=True).lower().rstrip(':') == field_lower
        )
        for label_element in label_elements:
            next_element = label_element.find_next(['div', 'td', 'th', 'span', 'dd'])
            if next_element and next_element.get_text(strip=True):
                value_text = next_element.get_text(strip=True)
                if value_text.lower() not in field_map:
                    data[field_original] = value_text
                    break
        if field_original in data and data[field_original]: continue

    remaining_fields = {f.lower(): f for f in fields_to_extract if f not in data or not data[f]}
    if remaining_fields:
        lines = [line.strip() for line in soup.get_text().splitlines() if line.strip()]
        for i, line in enumerate(lines):
            line_lower = line.lower().rstrip(':')
            if line_lower in remaining_fields and i + 1 < len(lines):
                original_field_name = remaining_fields[line_lower]
                next_line = lines[i + 1]
                if next_line.lower().rstrip(':') not in remaining_fields:
                    data[original_field_name] = next_line

    return data