import google.generativeai as genai
from google.generativeai import caching
from google.api_core import exceptions as google_exceptions
import datetime
import json
import textwrap
import time
from bs4 import BeautifulSoup
import re
from PyPDF2 import PdfReader, PdfWriter
import io
from typing import Any, Dict, List, Optional

try:
    from api.pdf_extractor import (
        ACTIVE_API_KEY,
        _check_for_api_error_message,
        sanitize_extracted_data,
        make_flat_schema,
        INCOME_APPROACH_FIELDS,
        RENT_SCHEDULE_RECONCILIATION_FIELDS,
        PUD_INFO_FIELDS,
        SALES_TRANSFER_FIELDS,
        MARKET_CONDITIONS_FIELDS,
        INFO_OF_SALES_FIELDS,
        CONDO_FIELDS,
        Project_SITE_FIELDS,
        Project_Info_FIELDS,
        CONDO_FORECLOSURE_FIELDS,
        Project_Analysis_FIELDS,
        UNIT_DESCRIPTIONS_FIELDS,
        COMPARABLE_RENTAL_DATA_FIELDS,
        SUBJECT_RENT_SCHEDULE,
        custom_checklist_schema,
        RentSchedulesFIELDS2,
        GENERAL_INSTRUCTIONS,
        CATEGORY_SPECIFIC_INSTRUCTIONS,
    )
except (ImportError, ModuleNotFoundError):
    from .pdf_extractor import (  # type: ignore
        ACTIVE_API_KEY,
        _check_for_api_error_message,
        sanitize_extracted_data,
        make_flat_schema,
        INCOME_APPROACH_FIELDS,
        RENT_SCHEDULE_RECONCILIATION_FIELDS,
        PUD_INFO_FIELDS,
        SALES_TRANSFER_FIELDS,
        MARKET_CONDITIONS_FIELDS,
        INFO_OF_SALES_FIELDS,
        CONDO_FIELDS,
        Project_SITE_FIELDS,
        Project_Info_FIELDS,
        CONDO_FORECLOSURE_FIELDS,
        Project_Analysis_FIELDS,
        UNIT_DESCRIPTIONS_FIELDS,
        COMPARABLE_RENTAL_DATA_FIELDS,
        SUBJECT_RENT_SCHEDULE,
        custom_checklist_schema,
        RentSchedulesFIELDS2,
        GENERAL_INSTRUCTIONS,
        CATEGORY_SPECIFIC_INSTRUCTIONS,
    )

ADDENDUM_FIELDS = []
DATA_CONSISTENCY_FIELDS = []

SUMMARY_FIELDS = [
    'ADU File Check','From Type','Exposure comment','Prior service comment','ANSI','FHA Case No.','Opinion of Market Value', 'Market Value Condition', 'Effective Date of Appraisal', 'Assignment Reason',
    'Borrower Name', 'Current Owner of Public Record', 'Listing Status', 'Property Valuation Method',
    'Appraiser Name', 'Construction Method', 'Attachment Type', 'Overall Quality', 'Overall Condition',
    'Planned Unit Development (PUD)', 'Condominium', 'Cooperative', 'Condop', 'Subject Site Owned in Common',
    'Units Excluding ADUs', 'Accessory Dwelling Units (ADUs)', 'Property Rights Appraised',
    'Highest and Best Use as Present Use', 'Zoning Compliance', 'Apparent Defects, Damages, Deficiencies Requiring Action',
    'Appraisal Version', 'Appraiser Reference ID', 'Property Data Report Used in Lieu of Inspection',
    'Client/Lender Company Name', 'Client/Lender Company Address', 'Appraisal Management Company Name',
    'Appraisal Management Company Address', 'Appraiser Company Name', 'Appraiser Company Address',
    'Subject Property Inspection', 'Exterior Physical Inspection', 'Interior Physical Inspection', 'Inspection Date',
    'Appraiser Credential Level', 'Appraiser ID', 'Appraiser State', 'Appraiser License Expiration Date', 'Appraiser ASC Identifier',
    'Physical Address', 'County', 'Neighborhood Name', 'Property on Native American Lands',
    'Homeowner Responsible for All Exterior Maintenance of Dwelling(s)', 'New Construction',
    'Special Tax Assessments', 'All Rights Included in Appraisal', 'Legal Description', 'Subject Property Commentary','Indicated Value by Sales Comparison Approach Indicated'
]

CONTRACT_FIELDS = [
    'Assignment Reason', 'Borrower Name', 'Current Owner of Public Record', 'Property Valuation Method',
    'Property Data Report Used in Lieu of Inspection'
]

SUBJECT_FIELDS = [
    'Client/Lender Company Name', 'Client/Lender Company Address', 'Appraisal Management Company Name',
    'Appraisal Management Company Address', 'Appraiser Name', 'Appraiser Company Name', 'Appraiser Company Address',
    'Subject Property Inspection', 'Exterior Physical Inspection', 'Interior Physical Inspection', 'Inspection Date',
    'Appraiser Credential Level', 'Appraiser ID', 'Appraiser State', 'Appraiser License Expiration Date', 'Appraiser ASC Identifier',
    'Physical Address', 'County', 'Neighborhood Name', 'Planned Unit Development (PUD)', 'Condominium',
    'Cooperative', 'Condop', 'Property on Native American Lands', 'Subject Site Owned in Common',
    'Homeowner Responsible for All Exterior Maintenance of Dwelling(s)', 'New Construction', 'Attachment Type',
    'Units Excluding ADUs', 'Accessory Dwelling Units (ADUs)', 'Special Tax Assessments', 'Property Rights Appraised',
    'All Rights Included in Appraisal', 'Legal Description', 'Subject Property Commentary'
]

SITE_FIELDS = [
    'Total Site Size', 'Number of Parcels', 'Assessor Parcel Number (APN)', 'APN Description', 'Parcel Size',
    'Zoning Compliance', 'Zoning Classification Code', 'Zoning Classification Description', 'Primary Access',
    'Street Type and Surface', 'Typical for Market', 'Non-Residential Use',
    'Site Influence', 'Site Influence Proximity', 'Site Influence Detail', 'Site Influence Impact', 'Site Influence Comment',
    'View', 'Range of View', 'View Impact',
    'Site Feature', 'Site Feature Detail', 'Site Feature Impact', 'Site Feature Comment',
    'Broadband Internet Available',
    'Electricity', 'Electricity Detail', 'Electricity Private Utility Impact', 'Electricity Comment',
    'Sanitary Sewer', 'Sanitary Sewer Detail', 'Sanitary Sewer Private Utility Impact', 'Sanitary Sewer Comment',
    'Water', 'Water Detail', 'Water Private Utility Impact', 'Water Comment',
    'Utility Type (Public/Private)', 'Utility Detail', 'Utility Impact', 'Utility Comment',
    'Apparent Defects, Damages, Deficiencies (Site)', 'Site Influence Commentary', 'View Commentary', 'Site Features Commentary', 'Site Commentary',
    'Property Access (Street Scene)', 'Renewable Energy Components', 'Ownership', 'Financing Arrangement',
    'Known Building Certifications', 'Known Efficiency Ratings',
    'Energy Efficient and Green Features Impact to Value/Marketability', 'Energy Efficient and Green Features Exhibits',
    'Legally Permissible', 'Physically Possible', 'Financially Feasible', 'Maximally Productive',
    'Highest and Best Use as Improved (Present Use)', 'Highest and Best Use Commentary'
]

IMPROVEMENTS_FIELDS = [
    'Units in Structure', 'Floors in Building', 'Dwelling Style', 'Front Door Elevation', 'Year Built',
    'Construction Method', 'Converted Area', 'Exterior Quality Rating', 'Exterior Condition Rating',
    'Exterior Walls and Trim', 'Exterior Walls and Trim Quality Comment', 'Exterior Walls and Trim Condition Status', 'Exterior Walls and Trim Condition Comment',
    'Foundation', 'Foundation Quality Comment', 'Foundation Condition Status', 'Foundation Condition Comment',
    'Roof', 'Roof Estimated Age', 'Roof Quality Comment', 'Roof Condition Status', 'Roof Condition Comment',
    'Windows', 'Windows Quality Comment', 'Windows Condition Status', 'Windows Condition Comment',
    'Heating System', 'Heating Fuel', 'Cooling System', 'Core Heating System Below Grade', 'Other Mechanical Systems', 'Exterior Features',
    'Apparent Defects, Damages, Deficiencies (Dwelling Exterior)', 'Dwelling Exterior Commentary', 'Dwelling Exterior Exhibits',
    'Amenity Category', 'Subject Property Amenity', 'Amenity Material', 'Amenity Detail',
    'Apparent Defects, Damages, Deficiencies (Subject Property Amenities)', 'Subject Property Amenities Exhibits',
    'Overall Quality', 'Exterior Quality', 'Overall Condition',
    'Exterior Condition', 'Reconciliation of Overall Quality and Condition',

    'Finished Above Grade', 'Unfinished Above Grade', 'Finished Below Grade', 'Unfinished Below Grade', 'Area Data Source',
    'Levels in Unit', 'Occupancy', 'Total Bedrooms', 'Total Bathrooms - Full', 'Total Bathrooms - Half',
    'Level in Unit Row 1', 'Grade Level Detail Row 1', 'Finish Row 1', 'Area Row 1', 'Room Summary Row 1',
    'Level in Unit Row 2', 'Grade Level Detail Row 2', 'Finish Row 2', 'Area Row 2', 'Room Summary Row 2',
    'Level in Unit Row 3', 'Grade Level Detail Row 3', 'Finish Row 3', 'Area Row 3', 'Room Summary Row 3',
    'Interior Quality Rating', 'Interior Condition Rating',

    'Kitchen/Bath Row 1 Room', 'Kitchen/Bath Row 1 Update Status', 'Kitchen/Bath Row 1 Time Frame', 'Kitchen/Bath Row 1 Quality Comment', 'Kitchen/Bath Row 1 Condition Status', 'Kitchen/Bath Row 1 Condition Comment',
    'Kitchen/Bath Row 2 Room', 'Kitchen/Bath Row 2 Update Status', 'Kitchen/Bath Row 2 Time Frame', 'Kitchen/Bath Row 2 Quality Comment', 'Kitchen/Bath Row 2 Condition Status', 'Kitchen/Bath Row 2 Condition Comment',
    'Kitchen/Bath Row 3 Room', 'Kitchen/Bath Row 3 Update Status', 'Kitchen/Bath Row 3 Time Frame', 'Kitchen/Bath Row 3 Quality Comment', 'Kitchen/Bath Row 3 Condition Status', 'Kitchen/Bath Row 3 Condition Comment',
    'Overall Update Status for Bathrooms',

    'Flooring Detail', 'Flooring Quality Comment', 'Flooring Condition Status', 'Flooring Condition Comment',
    'Walls and Ceiling Detail', 'Walls and Ceiling Quality Comment', 'Walls and Ceiling Condition Status', 'Walls and Ceiling Condition Comment',
    'Overall Update Status for Flooring',
    'Apparent Defects, Damages, Deficiencies (Unit Interior)'
]

NEIGHBORHOOD_FIELDS = [
    'Market Area Boundary', 'Active Listings', 'Median Days on Market', 'Lowest List Price',
    'Median List Price', 'Highest List Price', 'Pending Sales', 'Sales in Past 12 Months',
    'Lowest Sale Price', 'Median Sale Price', 'Highest Sale Price', 'Distressed Market Competition',
    'Price Trend Source', 'Demand / Supply', 'Marketing Time', 'Market Commentary',
    'Search Criteria Description', 'Price Trend Analysis Commentary',
    'Current or Relevant Listings', 'Data Source', 'Subject Listing Information Commentary',
    'Subject Listing Information Exhibits'
]

PRIOR_SALE_HISTORY_FIELDS = [
    'Prior Sales or Transfers',
    'Subject Transfer History Data Source',
    'Comparable Number',
    'Comparable Transfer Terms',
    'Comparable Transfer Date',
    'Comparable Transfer Amount',
    'Comparable Transfer Data Source',
    'Analysis of Prior Sale and Transfer History of Subject Property',
    'Analysis of Prior Sale and Transfer History of Comparable Sales',

    'Comparable 1 Transfer Terms', 'Comparable 1 Transfer Date', 'Comparable 1 Transfer Amount', 'Comparable 1 Transfer Data Source',
    'Comparable 2 Transfer Terms', 'Comparable 2 Transfer Date', 'Comparable 2 Transfer Amount', 'Comparable 2 Transfer Data Source',
    'Comparable 3 Transfer Terms', 'Comparable 3 Transfer Date', 'Comparable 3 Transfer Amount', 'Comparable 3 Transfer Data Source'
]

SalesGridFIELDS2 = [
    'Subject Property Address', 'Photo', 'Comparable Property Address', 'Data Source',
    'Proximity to Subject', 'List Price', 'Listing Status', 'Sale Price', 'Transfer Terms',
    'Financing Type', 'Sales Concessions', 'Contract Date', 'Sale Date', 'Days on Market',
    'Attached / Detached', 'Property Rights Appraised', 'Site Size', 'Site Influence (Location)',
    'View', 'Range of View', 'Year Built', 'Construction Method', 'Heating', 'Amenities',
    'Bedrooms', 'Bathrooms - Full', 'Bathrooms - Half', 'Finished Area Above Grade',
    'Finished Area Below Grade', 'Unfinished Area Below Grade', 'Exterior Quality',
    'Exterior Condition', 'Interior Quality', 'Interior Condition', 'Overall Quality',
    'Overall Condition', 'Vehicle Storage Type', 'Vehicle Storage Spaces', 'Vehicle Storage Detail',
    'List Price Adjustment', 'Sale Price Adjustment', 'Transfer Terms Adjustment',
    'Financing Type Adjustment', 'Sales Concessions Adjustment', 'Contract Date Adjustment',
    'Sale Date Adjustment', 'Site Size Adjustment', 'Amenities Adjustment', 'Bedrooms Adjustment',
    'Finished Area Above Grade Adjustment', 'Vehicle Storage Adjustment', 'Net Adjustment Total',
    'Adjusted Price', 'Comparable Weight'
]

COST_APPROACH_FIELDS = [
    'Indicated Value by Cost Approach', 'Depreciated Cost of Dwellings', 'As Is Value of Site Improvements',
    'Opinion of Site Value', 'Above Grade Finished Area', 'Cost Per Square Foot', 'Depreciated Cost',
    'Physical Depreciation', 'Physical Depreciation Amount', 'Functional Depreciation', 'Functional Depreciation Amount',
    'External Depreciation', 'External Depreciation Amount', 'Total Depreciation',
    'Dwelling Cost Item 1 Description', 'Dwelling Cost Item 1 Size', 'Dwelling Cost Item 1 Rate', 'Dwelling Cost Item 1 Amount',
    'Dwelling Cost Item 2 Description', 'Dwelling Cost Item 2 Size', 'Dwelling Cost Item 2 Rate', 'Dwelling Cost Item 2 Amount',
    'Dwelling Cost Item 3 Description', 'Dwelling Cost Item 3 Size', 'Dwelling Cost Item 3 Rate', 'Dwelling Cost Item 3 Amount',
    'Dwelling Cost Item 4 Description', 'Dwelling Cost Item 4 Size', 'Dwelling Cost Item 4 Rate', 'Dwelling Cost Item 4 Amount',
    'Dwelling Cost Item 5 Description', 'Dwelling Cost Item 5 Size', 'Dwelling Cost Item 5 Rate', 'Dwelling Cost Item 5 Amount',
    'Dwelling Cost Item 6 Description', 'Dwelling Cost Item 6 Size', 'Dwelling Cost Item 6 Rate', 'Dwelling Cost Item 6 Amount',
    'Remaining Economic Life', 'Effective Age', 'Site Improvement Description', 'Site Improvement Amount',
    'Primary Site Valuation Method', 'Land Comparable Number', 'Land Comparable Address', 'Land Comparable County',
    'Land Comparable Data Source', 'Land Comparable Assessor Parcel Number (APN)', 'Land Comparable Site Size',
    'Land Comparable Sale Date', 'Land Comparable Sale Price', 'Commentary on Remaining Economic Life',
    'Commentary on Effective Age', 'Reconciliation of Site Value', 'General Description', 'Cost Type',
    'Cost Data Source', 'Quality Rating', 'Effective Date', 'Cost Method', 'Depreciation Method',
    'Cost Approach Commentary', 'Cost Approach Exhibits',

    'Land Comparable 1 Address', 'Land Comparable 1 County', 'Land Comparable 1 Data Source', 'Land Comparable 1 Assessor Parcel Number (APN)', 'Land Comparable 1 Site Size', 'Land Comparable 1 Sale Date', 'Land Comparable 1 Sale Price',
    'Land Comparable 2 Address', 'Land Comparable 2 County', 'Land Comparable 2 Data Source', 'Land Comparable 2 Assessor Parcel Number (APN)', 'Land Comparable 2 Site Size', 'Land Comparable 2 Sale Date', 'Land Comparable 2 Sale Price',
    'Land Comparable 3 Address', 'Land Comparable 3 County', 'Land Comparable 3 Data Source', 'Land Comparable 3 Assessor Parcel Number (APN)', 'Land Comparable 3 Site Size', 'Land Comparable 3 Sale Date', 'Land Comparable 3 Sale Price'
]

RECONCILIATION_FIELDS = [
    'Sales Comparison Approach Indicated Value', 'Income Approach Indicated Value', 'Cost Approach Indicated Value',
    'Reason for Exclusion (Sales Comparison Approach)', 'Reason for Exclusion (Income Approach)', 'Reason for Exclusion (Cost Approach)',
    'Opinion of Market Value', 'Market Value Condition',
    'Reasonable Exposure Time', 'Effective Date of Appraisal', 'Reconciliation of Market Value',
    'Apparent Defects, Damages, Deficiencies'
]

CERTIFICATION_FIELDS = [
    'Appraiser Certifications',
    'Appraiser Signature',
    'Date of Signature and Report',
    'Appraiser Name',
    'Appraiser Credential Level',
    'Appraiser ID',
    'Appraiser State',
    'Appraiser License Expiration Date'
]


def extract_fields_from_pdf_v1(pdf_path, category: str | None = None, custom_prompt: str | None = None, prompt_type: str = "checklist"):
    """
    Pure Python & Regex-based Offline Extractor for Appraisal Version #1.
    - If no custom_prompt: runs 100% offline regex extraction with zero external API calls.
    - If custom_prompt is provided: routes to Gemini for checklist/query processing.
    """
    if not custom_prompt:
        try:
            try:
                from api.pdf_extractor_v1_offline import extract_fields_from_pdf_v1_offline
            except ImportError:
                from .pdf_extractor_v1_offline import extract_fields_from_pdf_v1_offline  # type: ignore
            
            res: Any = extract_fields_from_pdf_v1_offline(pdf_path)
            if isinstance(res, dict) and res.get("status") == "success":
                fields = res.get("fields", {})
                if category and isinstance(fields, dict):
                    cat_upper = category.upper()
                    # Return category dictionary along with flat keys if available
                    cat_data = fields.get(cat_upper, {})
                    if isinstance(cat_data, dict) and cat_data:
                        cat_res = {cat_upper: cat_data, **cat_data}
                        return {
                            "fields": cat_res,
                            "raw": json.dumps(cat_res, indent=2, default=str),
                            "status": "success"
                        }
                    # Check in case it's in clean_data
                    clean_d = res.get("clean_data", {})
                    if isinstance(clean_d, dict) and cat_upper in clean_d:
                        return {
                            "fields": clean_d[cat_upper],
                            "raw": json.dumps(clean_d[cat_upper], indent=2, default=str),
                            "status": "success"
                        }
                return res
        except Exception as e:
            print(f"[Version #1] Offline extraction error: {e}")
            try:
                try:
                    from api.pdf_extractor_offline import extract_fields_from_pdf_offline
                except ImportError:
                    from .pdf_extractor_offline import extract_fields_from_pdf_offline  # type: ignore
                res_fallback = extract_fields_from_pdf_offline(pdf_path)
                if isinstance(res_fallback, dict) and res_fallback.get("status") == "success":
                    return res_fallback
            except Exception:
                pass

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

        print("Uploading PDF to Gemini File API for caching (v1)...")
        uploaded_file = genai.upload_file(pdf_path, mime_type="application/pdf")
        
        print("Creating Gemini Cache with gemini-3.5-flash (v1)...")
        try:
            cache = caching.CachedContent.create(
                model='models/gemini-3.5-flash',
                contents=[uploaded_file],
                ttl=datetime.timedelta(minutes=15)
            )
        except Exception as err:
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
            "SUMMARY": SUMMARY_FIELDS,
            "SUBJECT": SUBJECT_FIELDS, "CONTRACT": CONTRACT_FIELDS, "NEIGHBORHOOD": NEIGHBORHOOD_FIELDS,
            "SITE": SITE_FIELDS, "IMPROVEMENTS": IMPROVEMENTS_FIELDS, "RECONCILIATION": RECONCILIATION_FIELDS,
            "COST_APPROACH": COST_APPROACH_FIELDS, "INCOME_APPROACH": INCOME_APPROACH_FIELDS,
            "RENT_SCHEDULE_RECONCILIATION": RENT_SCHEDULE_RECONCILIATION_FIELDS, "PUD_INFO": PUD_INFO_FIELDS,
            "CERTIFICATION": CERTIFICATION_FIELDS, "ADDENDUM": ADDENDUM_FIELDS, "SALES_TRANSFER": SALES_TRANSFER_FIELDS,
            "MARKET_CONDITIONS": MARKET_CONDITIONS_FIELDS, "INFO_OF_SALES": INFO_OF_SALES_FIELDS,
            "CONDO": CONDO_FIELDS,
            "PRIOR_SALE_HISTORY": PRIOR_SALE_HISTORY_FIELDS, "PROJECT_SITE": Project_SITE_FIELDS, "PROJECT_INFO": Project_Info_FIELDS,
            "CONDO_FORECLOSURE": CONDO_FORECLOSURE_FIELDS,
            "PROJECT_ANALYSIS": Project_Analysis_FIELDS, "UNIT_DESCRIPTIONS": UNIT_DESCRIPTIONS_FIELDS,
            "DATA_CONSISTENCY": DATA_CONSISTENCY_FIELDS,"COMPARABLE_RENTAL_DATA": COMPARABLE_RENTAL_DATA_FIELDS,"SUBJECT_RENT_SCHEDULE": SUBJECT_RENT_SCHEDULE
        }

        categories_to_process = [
            "SUMMARY", "SUBJECT", "CONTRACT", "NEIGHBORHOOD", "SITE", "IMPROVEMENTS", "SALES_GRID", "SALES_TRANSFER",
            "INFO_OF_SALES", "RECONCILIATION", "COST_APPROACH", "INCOME_APPROACH", "CONDO_FORECLOSURE",
            "PUD_INFO", "MARKET_CONDITIONS", "CONDO", "CERTIFICATION", "ADDENDUM", "UNIFORM_REPORT",
            "APPRAISAL_ID", "IMAGE_ANALYSIS", "DATA_CONSISTENCY", "ADDENDUM_FIELDS"
        ]

        if category:
            categories_to_process = [category.upper()]

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
                7. For Unit Breakdown: Extract counts and adjustments for each unit into 'Unit Breakdown Tot Unit # [1-4]', 'Unit Breakdown Br Unit # [1-4]', 'Unit Breakdown Ba Unit # [1-4]', and 'Unit Breakdown Adjustment Unit # [1-4]'.
                8. For Prior Sales: Extract the bottom grid into prior sale keys (Date, Price, Data Source, Effective Date).
                9. Clean monetary values (digits only) and format dates (MM/DD/YYYY).
                10.check subject property and every comparable have its own Photo present in sales Grid.
                10. For empty cells/missing data, use "".
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
            print(f"[Version #1] Processed category {category_name}, sleeping for 2 seconds...")
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
