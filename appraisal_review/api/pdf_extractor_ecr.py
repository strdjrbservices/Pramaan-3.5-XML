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
        custom_checklist_schema,
        GENERAL_INSTRUCTIONS,
    )
except (ImportError, ModuleNotFoundError):
    from .pdf_extractor import (  # type: ignore
        ACTIVE_API_KEY,
        _check_for_api_error_message,
        sanitize_extracted_data,
        make_flat_schema,
        custom_checklist_schema,
        GENERAL_INSTRUCTIONS,
    )


SUMMARY_FIELDS = [
    "Client:",
    "Client File #:",
    "Client Address:",
    "Client City:",
    "Client State:",
    "Client Zip Code:",
    "Transferee:",
    "Owner(s) of Record:",
    "Subject Property Address:",
    "Unit:",
    "Subject County:",
    "Subject City:",
    "Subject State:",
    "Subject Zip Code:",
    "Appraiser Company Name:",
    "Appraiser File #:",
    "Appraiser(s):",
    "Co-appraiser (if applicable)",
    "Appraiser Address",
    "Appraiser City:",
    "Appraiser State:",
    "Appraiser Zip Code:",
    "Appraiser Ph. #:",
    "Appraiser Fax #:",
    "Appraiser E-mail:",
    "Anticipated Sales Price: $",
    "Assignment Marketing Period:",
    "Appearance:",
    "Date of Value Opinion (Effective Date):",
    "Is the subject property currently listed?",
    "Current List Price: $",
    "days on market:",
    "Actual Age (Yrs.):",
    "Bedrooms:",
    "Baths:",
    "Gross Living Area:",
    "Overall Historic Price Trend",
    "Current Supply/Demand:",
    "Forecasted Price Trend:",
    "Mandatory Inspections",
    "Adverse Easements/Encroachments",
    "Adverse External Conditions",
    "Adverse Environmental Conditions",
    "Apparent Modifications to Dwelling",
    "Adverse Conditions Requiring Inspections",
    "Recommended Repairs and/or Improvements",
    "New Construction Competition",
    "Distressed Market Competition",
    "Prevalence of Seller Concessions",
    "Adverse Financing Conditions"
]


SUBJECT_FIELDS = [
    "Transferee:",
    "Occupant:",
    "Subject Property Address:",
    "Unit:",
    "County:",
    "City:",
    "State:",
    "Zip Code:",
    "Legal Description:",
    "Assessor's Parcel #:",
    "Map Reference:",
    "Property Rights Appraised:",
    "Subtype:",
    "If condominium or cooperative, indicate complex name:",
    "Total No. of Units",
    "No. of Owner-occupied Units:",
    "% of Owner-occupied Units:",
    "Total No. of Floors:",
    "Subject Floor #:",
    "Is the complex complete?",
    "Is market rate financing available?",
    "Is the developer/builder in control of the homeowners association?",
    "Are there any marketability issues?",
    "Comments:",
    "Annual real estate taxes: $",
    "Tax Year:",
    "Data Source:",
    "Are taxes typical?",
    "Monthly HOA Fees: $",
    "Discuss atypical taxes, homeowner association fees and known pending special assessments, and comment on their effect on marketability",
    "Is the subject property currently listed?",
    "Original List Price: $",
    "Current List Price: $",
    "Date of Last Price Revision:",
    "Days-on-market:",
    "Listing Company/Agent:",
    "Ph. #:",
    "Last Sale Date:",
    "Last Sale Price: $",
    "Analyze and discuss any current agreement of sale, option on or listing of the subject property as well as the last three years of sales history. Include complete marketing history, noting price changes and days on market.",
    "Are there any mandatory inspections required by a governmental institution to transfer title?"
]

NEIGHBORHOOD_FIELDS = [
    "Define neighborhood boundaries (may or may not be the same area used for the Market Trends Analysis on pages 4 and 5).",
    "Location Type:",
    "Built Up:",
    "Development Rate:",
    "Change in Present Land Use:",
    "Single Family:",
    "Multi-family:",
    "Commercial:",
    "Industrial:",
    "Condo:",
    "Present Land Use comment",
    "Single-family Price Range: $",
    "to: $",
    "Predominant Price: $",
    "Single-family Age",
    "years to",
    "Predominant Age:",
    "Predominant Occupancy:",
    "Discuss positive and negative neighborhood characteristics impacting the subject property’s marketability (e.g., employment, environmental conditions, external obsolescence, property compatibility, schools, vacancy rates, transportation, etc.).",
    "Overall Neighborhood Appeal Rating:"
]

SITE_FIELDS = [
    "Dimensions:",
    "Site Area:",
    "Corner Lot",
    "FEMA Special Flood Hazard Area?",
    "Specific Zoning Classification:",
    "Zoning Description:",
    "Is present use permitted by zoning regulations?",
    "Street Access:",
    "Street Maintenance:",
    "Gated",
    "Electric",
    "Gas",
    "Water",
    "San. Sewer:",
    "Topography:",
    "Shape:",
    "View",
    "Landscaping:",
    "Drainage:",
    "Adverse Easements/Encroachments:",
    "Adverse External Conditions:",
    "Adverse Environmental Conditions:",
    "Street Surface:",
    "Driveway Surface:",
    "Alley:",
    "Discuss positive and negative site characteristics impacting the subject property’s marketability (e.g., site utility, conformity, site improvements, leasehold, adverse conditions, etc)",
    "Overall Site Appeal Rating:"
]

IMPROVEMENTS_FIELDS = [
    "Existing Construction:",
    "New Construction:",
    "Completed",
    "Year Built",
    "Actual Age (Yrs.):",
    "Effective Age (Yrs.):",
    "Attached:",
    "Detached:",
    "No. of Units",
    "No. of Stories",
    "Manufact. Housing",
    "If yes, type:",
    "Architectural Style",
    "Roofing Material:",
    "Wall Material",
    "Window Type:",
    "Insulated:",
    "Screens:",
    "Storm Sash:",
    "Gutters/Downspouts:",
    "Exterior Amenities",
    "Floor",
    "Walls",
    "Bath Floors",
    "Bath Wainscot",
    "interior amenities",
    "Kitchen Built-ins",
    "Heating Type:",
    "Heating Fuel:",
    "Air Conditioning Central Air:",
    "Air Conditioning Other:",
    "Attic Scuttle:",
    "Attic Drop Stair:",
    "Attic Stairway:",
    "Attic Finished:",
    "Attic Other:",
    "Garage",
    "Garage (Attached, Detached, Built-in:)",
    "Carport",
    "Carport (Attached, Detached, Built-in:)",
    "Car Storage Other",
    "Foundation Material",
    "Slab:",
    "Crawl Space:",
    "Basement:",
    "Sq. Ft",
    "% Finished:",
    "Floor:",
    "Wall:",
    "Ceiling:",
    "Outside Entry:",
    "Sump:",
    "Other:",
    "Adequate:",
    "Relevant Characteristics/Significant Features: Describe and discuss features and improvements affecting marketability. (Only those relevant characteristics affecting the Anticipated Sales Price should be considered in the Significant Features fields on pages 5 and 6.)",
    "Personal Property: Is personal property included in the Anticipated Sales Price?",
    "Living",
    "Dining",
    "Kitchen",
    "Family",
    "Bedrooms",
    "Baths",
    "Other",
    "Rooms",
    "List of Other Rooms",
    "GLA",
    "Basement",
    "Attic",
    "Bedrooms:",
    "Baths:",
    "Gross Living Area: square feet",
    "Evidence of any apparent modifications to dwelling (e.g., additions, enclosures, etc.):",
    "Evidence of any adverse conditions requiring inspections (e.g., dampness, termites, settlement, etc.):",
    "Discuss evidence of any apparent modifications and/or adverse conditions and list any recommended inspections and why (e.g., structural, materials, mechanical, roof, code compliance, etc.).",
    "Subject Property’s Appearance:",
    "Comments:",
    "Are any repairs and/or improvements recommended?",
    "List recommended repairs and/or Improvements and provide a total estimated cost to cure. Comment on the impact on marketability.",
    "Total Estimated Cost to Cure: $",
    "Exterior Appeal",
    "Quality of Construction",
    "Condition",
    "Interior Appeal/Décor",
    "Functional Utility"
]

MARKET_TRENDS_FIELDS = [
    "Market Segment: Define the specific market segment (the area in which potential buyers for the subject property may look for substitute properties) and identify the data source used for the market trends data collection and analysis. Utilize geographic, economic or price range criteria to define your market segment. (In order to obtain a dependable quantity of data for analysis, the defined market segment may be different from the subject property’s neighborhood as defined on page 2)",
    "New Construction Competition:",
    "Adverse Financing Conditions:",
    "Distressed Market Competition:",
    "Mortgage Interest Rates:",
    "Prevalence of Seller Concessions:",
    "Comments",
    "Appraiser Defined Time Period",
    "No. of Months",
    "Total No. of Closed Sales",
    "Monthly Absorption Rate",
    "Sales Price",
    "Days on Market",
    "Historic Trends",
    "Analyze and discuss the above trends relevant to developing the Market Change Adjustment in the Sales Comparison Analysis grid on page 6. Discuss the relevance and reliability of the data and any other factors used to determine historic price trends – e.g., sale and resale data.",
    "Overall Historic Price Trend:",
    "CURRENT LISTINGS - Total No. of Active Listings",
    "CURRENT LISTINGS - List Price",
    "CURRENT LISTINGS - Days on Market",
    "CURRENT LISTINGS - Other:",
    "PENDING SALES - Total No. of Active Listings",
    "PENDING SALES - List Price",
    "PENDING SALES - Days on Market",
    "PENDING SALES - Other:",
    "Supply/Demand - Appraiser Defined Time Period",
    "Supply/Demand - No. of Months",
    "Supply/Demand - Total No. of Closed Sales",
    "Supply/Demand - Monthly Absorption Rate",
    "Supply/Demand - Total No. of Active Listings (exclude pending sales)",
    "Supply/Demand - No. of Months Supply of Inventory",
    "Analyze and discuss the above data (consider seasonal influences, pending sales, expired/withdrawn listings, relevance and reliability of data, etc.) that pertains to current supply/demand in the subject property’s market segment.",
    "Current Supply/Demand Status:",
    "Competing Property - Address",
    "Competing Property - Proximity to Subject",
    "Competing Property - Original List Price",
    "Competing Property - Current List Price",
    "Competing Property - Last Price Revision Date",
    "Competing Property - Days on Market",
    "Competing Property - Last Sale Date/Price",
    "Competing Property - Site Area",
    "Competing Property - Site Appeal",
    "Competing Property - Actual Age (Years)",
    "Competing Property - Condition",
    "Competing Property - Rooms",
    "Competing Property - Gross Living Area",
    "Competing Property - GLA Data Source",
    "Competing Property - Basement Area",
    "Competing Property - Car Storage",
    "Competing Property - Significant Features",
    "Competing Property - Comparative Rating to Subject",
    "For each Competing Property, specifically discuss the following: 1) Why was the property selected? 2) What are the major differences between the property and the subject? Comments should support the Comparative Rating to Subject above.",
    "Competing Property #1:",
    "Competing Property #2",
    "Competing Property #3:",
    "Is the subject property realistically priced to sell within the assignment marketing period?",
    "Identify which competing property is positioned to sell first and why. Include the subject property, if listed. Provide support for the competitive list price range below.",
    "Competitive List Price Range for Subject Property (to achieve a sale within the Assignment Marketing Period):",
    "Market Segment Normal Marketing Time:",
    "Subject Property’s Estimated Normal Marketing Time:",
    "Assignment Marketing Period:",
    "Market Segment – Forecasted Trends and Analysis",
    "Forecasted Price Trend",
    "If increasing or decreasing, the Forecasted Price Trend is anticipated to continue at:",
    "Forecasted Sales Activity (not to exceed 120 days or as instructed by client):",
    "Forecasting Adjustment Analysis: Discuss the Historic Trends and Current Factors from pages 4 and 5 and any additional pertinent data relevant to developing the Forecasting Adjustment on page 6. Analyze the anticipated trend of market conditions and prices during the subject property’s assignment marketing period (e.g., mood of the market, seasonal market trends, economic and employment shifts, demographic trends, buyer profile, etc.). This discussion should explain and support the Forecasting Adjustment on page 6",
    "Forecasting:"
]

SALES_COMPARISON_FIELDS = [
    "Address",
    "Proximity to Subject",
    "Original List Price",
    "Orig. Sales-to-list Price Ratio",
    "Current & Final List Price",
    "Final Sales-to-list Price Ratio",
    "Sales Price",
    "Closing Date",
    "Days on Market",
    "Last Sale Date/Price",
    "Data Verification Sources",
    "Financing Type",
    "Concessions",
    "Market Change Adjustment*",
    "Neighborhood Appeal",
    "Site Area",
    "Site Appeal",
    "Arch. Style/Exterior Appea",
    "Quality of Construction",
    "Actual Age (Years)",
    "Condition",
    "Interior Appeal/Décor",
    "Bdrms",
    "Baths",
    "Gross Living Area",
    "GLA Data Source",
    "Basement Area",
    "Basement Finish",
    "Functional Utility",
    "Heating/Cooling",
    "Car Storage",
    "Fireplace(s)",
    "Significant Features",
    "Forecasting Adjustment**",
    "Net Adjustment",
    "Adjusted Sales Price",
    "Discuss each comparable sale and explain subjective adjustments for which the rationale may not be readily apparent.",
    "Comparable Sale #1:",
    "Comparable Sale #2",
    "Comparable Sale #3:",
    "Comparable Sale #4:",
    "Comparable Sale #5",
    "Comparable Sale #6:",
    "Did the transferee provide any information for consideration?",
    "Reconciliation (discuss the specific reasoning supporting your opinion of Anticipated Sales Price)"
]

ANTICIPATED_SALES_PRICE_FIELDS = [
    "Is the Subject Property currently listed?",
    "Current List Price: $",
    "Competitive List Price Range for Subject Property (to achieve a sale within the Assignment Marketing Period): $",
    "Assignment Marketing Period:",
    "Subject Property’s Appearance",
    "Opinion of Anticipated Sales Price as of ____ is $______________",
    "Transferee",
    "Appraiser"
]

CERTIFICATION_FIELDS = [
    "Subject Property Address",
    "Subject Unit:",
    "Subject County:",
    "Subject City:",
    "Subject State:",
    "Subject Zip Code:",
    "APPRAISER Signature:",
    "APPRAISER Name:",
    "Date of Appraisal Inspection:",
    "Date of Value Opinion (Effective Date):",
    "State License/Certification #:",
    "State of License/Certification",
    "Expiration Date of License/Certification:",
    "CO-APPRAISER (if applicable) Signature:",
    "CO-APPRAISER Name",
    "CO-APPRAISER Date of Appraisal Inspection:",
    "CO-APPRAISER Date of Value Opinion (Effective Date)",
    "CO-APPRAISER State License/Certification #:",
    "CO-APPRAISER State of License/Certification:",
    "CO-APPRAISER Expiration Date of License/Certification:",
    "Did Did Not personally inspect the subject property."
]

ECR_CATEGORIES = {
    "SUMMARY": SUMMARY_FIELDS,
    "SUBJECT": SUBJECT_FIELDS,
    "NEIGHBORHOOD": NEIGHBORHOOD_FIELDS,
    "SITE": SITE_FIELDS,
    "IMPROVEMENTS": IMPROVEMENTS_FIELDS,
    "MARKET_TRENDS": MARKET_TRENDS_FIELDS,
    "SALES_COMPARISON": SALES_COMPARISON_FIELDS,
    "ANTICIPATED_SALES_PRICE": ANTICIPATED_SALES_PRICE_FIELDS,
    "CERTIFICATION": CERTIFICATION_FIELDS
}

ECR_EXTRACTION_STEPS: list[dict[str, Any]] = [
    {
        "step_num": 1,
        "name": "General, Subject, Neighborhood & Site Info",
        "categories": ["SUMMARY", "SUBJECT", "NEIGHBORHOOD", "SITE"],
        "description": "Extract Header/Summary, Subject Property details, Legal/Tax/HOA info, Neighborhood characteristics, and Site utilities/zoning."
    },
    {
        "step_num": 2,
        "name": "Improvements, Condition & Market Trends",
        "categories": ["IMPROVEMENTS", "MARKET_TRENDS"],
        "description": "Extract Dwelling construction, GLA/Room counts, Condition/Repairs/Cost to Cure, Market Segment data, Competing properties, and Price forecasting."
    },
    {
        "step_num": 3,
        "name": "Sales Comparison Grid, Anticipated Sales Price & Certification",
        "categories": ["SALES_COMPARISON", "ANTICIPATED_SALES_PRICE", "CERTIFICATION"],
        "description": "Extract Sales Comparison Analysis grid (Comps 1-6), Adjustments, Opinion of Anticipated Sales Price, Reconciliation, and Appraiser Certifications."
    }
]


def _build_multi_category_schema(categories: list) -> dict:
    """Builds a JSON schema for a grouped extraction step containing multiple ECR categories."""
    properties = {}
    for cat in categories:
        if cat in ECR_CATEGORIES:
            properties[cat] = make_flat_schema(ECR_CATEGORIES[cat])
    return {
        "type": "object",
        "properties": properties,
        "required": categories
    }


def extract_fields_from_pdf_ecr(pdf_path, category: str | None = None, custom_prompt: str | None = None, prompt_type: str = "checklist"):
    """
    Extracts structured fields from an ECR appraisal PDF.
    - If no custom_prompt and no category: runs 100% regex-based offline extraction.
    - If custom_prompt is provided: executes custom query or checklist verification via Gemini.
    - If category is specified: executes single-category extraction via Gemini.
    """
    if not category and not custom_prompt:
        print("[ECR] Running 100% regex-based offline extraction for full ECR document...")
        try:
            from api.pdf_extractor_ecr_offline import extract_fields_from_pdf_ecr_offline
        except ImportError:
            from .pdf_extractor_ecr_offline import extract_fields_from_pdf_ecr_offline  # type: ignore
        offline_res = extract_fields_from_pdf_ecr_offline(pdf_path)
        if offline_res.get("status") == "success":
            return offline_res

    combined_result = {}
    raw_responses = []

    uploaded_file = None
    cache = None
    try:
        if not ACTIVE_API_KEY:
            return {'error': 'Configuration Error', 'message': 'Gemini API key is not configured.'}
        genai.configure(api_key=ACTIVE_API_KEY)

        print("[ECR] Uploading PDF to Gemini File API...")
        uploaded_file = genai.upload_file(pdf_path, mime_type="application/pdf")

        print("[ECR] Creating Gemini Cache with gemini-3.5-flash for ECR...")
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
                    print(f"[ECR] Cache creation failed ({cache_err}). Falling back to direct model execution.")
                    cache = None

        # 1. Custom Prompt / Checklist Handler
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
                    You are an expert appraisal data extractor for ECR (Exterior/Evaluation Condition Report) documents.
                    Analyze the document and answer the following query.
                    Query:
                    ---
                    {custom_prompt}
                    ---
                    Your response must be a single, clean JSON object without markdown formatting.
                """)
            else:
                final_prompt = textwrap.dedent(f"""\
                    You are an expert appraisal reviewer for ECR (Exterior/Evaluation Condition Report) documents.
                    Analyze the document according to the following Revision Checklist.
                    Revision Checklist:
                    ---
                    {custom_prompt}
                    ---
                    Your response must be a single, clean JSON object with 'summary' and 'comparison_summary' array.
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
                return {'fields': data, 'raw': f"--- ECR CUSTOM PROMPT SECTION ---\n{raw_text}"}
            except json.JSONDecodeError as e:
                return {'error': 'JSON Parsing Error', 'message': f"Failed to parse Gemini response: {e}. Raw response: {raw_text}", 'raw': raw_text}
            except Exception as e:
                return {'error': 'Processing Error', 'message': f"An unexpected error occurred during ECR custom prompt extraction: {e}", 'raw': raw_text}

        # 2. Single Category Extraction (1 Clean Call)
        if category:
            cat_upper = category.upper()
            if cat_upper in ECR_CATEGORIES:
                fields_list = ECR_CATEGORIES[cat_upper]
                response_schema = make_flat_schema(fields_list)
                generation_config = genai.GenerationConfig(
                    temperature=0.0,
                    response_mime_type="application/json",
                    response_schema=response_schema,
                )
                cat_prompt = textwrap.dedent(f"""\
                    You are an expert real estate appraisal data extractor for ECR (Exterior / Evaluation Condition Report) forms.
                    Task: Extract all structured information for section: {cat_upper}.

                    {GENERAL_INSTRUCTIONS}

                    <fields_to_extract>
                    {json.dumps(fields_list, indent=2)}
                    </fields_to_extract>

                    **CRITICAL INSTRUCTIONS:**
                    1. Return a single JSON object containing only the fields specified above.
                    2. Clean numeric fields (digits only for monetary values) and format dates as MM/DD/YYYY.
                    3. For checkboxes or selection options, return the selected choice text.
                    4. Do not include markdown code block formatting or explanations outside the JSON object.
                """)
                if cache:
                    model = genai.GenerativeModel.from_cached_content(
                        cached_content=cache,
                        generation_config=generation_config
                    )
                    contents_payload = [cat_prompt]
                else:
                    model = genai.GenerativeModel(
                        model_name='gemini-3.5-flash',
                        generation_config=generation_config
                    )
                    contents_payload = [uploaded_file, cat_prompt]
                response = model.generate_content(contents=contents_payload, request_options={"timeout": 600.0})
                raw_text = response.text
                raw_responses.append(f"--- ECR {cat_upper} SECTION ---\n{raw_text}")
                json_str = raw_text.strip().lstrip('```json').rstrip('```').strip()
                parsed_data = json.loads(json_str)
                parsed_data = sanitize_extracted_data(parsed_data)
                combined_result[cat_upper] = parsed_data
                combined_result.update(parsed_data)
                return {'fields': combined_result, 'raw': "\n\n".join(raw_responses)}

        # 3. Full Document Extraction via Deterministic Regex & Spatial Offline Engine
        if not category and not custom_prompt:
            print("[ECR] Running 100% regex-based offline extraction for full ECR document...")
            try:
                from api.pdf_extractor_ecr_offline import extract_fields_from_pdf_ecr_offline
            except ImportError:
                from .pdf_extractor_ecr_offline import extract_fields_from_pdf_ecr_offline  # type: ignore
            offline_res = extract_fields_from_pdf_ecr_offline(pdf_path)
            if offline_res.get("status") == "success":
                return offline_res

        # 3b. Fallback to Gemini 3-step structured extraction if offline extraction is not used/fails
        print("[ECR] Starting 3-step structured full document extraction...")
        for step_info in ECR_EXTRACTION_STEPS:
            step_num: int = int(step_info["step_num"])
            step_name: str = str(step_info["name"])
            step_categories: list[str] = list(step_info["categories"])
            step_desc: str = str(step_info["description"])

            print(f"[ECR] Executing Step {step_num}/3: {step_name} ({', '.join(step_categories)})...")
            response_schema = _build_multi_category_schema(step_categories)

            generation_config = genai.GenerationConfig(
                temperature=0.0,
                response_mime_type="application/json",
                response_schema=response_schema,
            )

            fields_spec = {}
            for cat in step_categories:
                fields_spec[cat] = ECR_CATEGORIES[cat]

            prompt = textwrap.dedent(f"""\
                You are an expert real estate appraisal data extractor for ECR (Exterior / Evaluation Condition Report) forms.
                Task: Extract all structured information for Step {step_num}: {step_name}.
                Description: {step_desc}

                {GENERAL_INSTRUCTIONS}

                <sections_and_fields_to_extract>
                {json.dumps(fields_spec, indent=2)}
                </sections_and_fields_to_extract>

                **CRITICAL INSTRUCTIONS:**
                1. Return a single JSON object where the top-level keys are EXACTLY: {json.dumps(step_categories)}.
                2. Under each section key, extract the exact fields listed with accurate values from the appraisal report.
                3. Clean numeric fields (digits only for monetary values) and format dates as MM/DD/YYYY.
                4. For checkboxes or selection options, return the selected choice text.
                5. Do not include markdown code block formatting or explanations outside the JSON object.
            """)

            if cache:
                model = genai.GenerativeModel.from_cached_content(
                    cached_content=cache,
                    generation_config=generation_config
                )
                contents_payload = [prompt]
            else:
                model = genai.GenerativeModel(
                    model_name='gemini-3.5-flash',
                    generation_config=generation_config
                )
                contents_payload = [uploaded_file, prompt]

            try:
                response = model.generate_content(
                    contents=contents_payload,
                    request_options={"timeout": 600.0}
                )
                raw_text = response.text
                raw_responses.append(f"--- ECR STEP {step_num}: {step_name} ---\n{raw_text}")

                if _check_for_api_error_message(raw_text, response.prompt_feedback):
                    for cat in step_categories:
                        combined_result[cat] = {'api_error': raw_text}
                    continue

                json_str = raw_text.strip().lstrip('```json').rstrip('```').strip()
                try:
                    step_data = json.loads(json_str)
                    step_data = sanitize_extracted_data(step_data)

                    for cat in step_categories:
                        cat_data = step_data.get(cat, {})
                        if isinstance(cat_data, dict):
                            combined_result[cat] = cat_data
                            combined_result.update(cat_data)
                        else:
                            combined_result[cat] = cat_data
                except json.JSONDecodeError as e:
                    error_msg = f"JSON Parsing Error in Step {step_num} ({step_name}): {e}"
                    print(error_msg)
                    for cat in step_categories:
                        combined_result[cat] = {'error': 'JSON Parsing Failed', 'message': error_msg}
            except Exception as e:
                error_msg = f"API call failed in Step {step_num} ({step_name}): {e}"
                print(error_msg)
                for cat in step_categories:
                    combined_result[cat] = {'error': 'API Call Failed', 'message': error_msg}

            time.sleep(1)

    except google_exceptions.ResourceExhausted as e:
        print(f"Gemini API Quota Exceeded for ECR: {e}")
        return {'error': 'Gemini API Quota Exceeded', 'message': f"API quota exceeded: {e}"}
    except Exception as e:
        print(f"Error during ECR document extraction: {e}")
        return {'error': 'Extraction Failed', 'message': f"Error during ECR document extraction: {e}"}
    finally:
        try:
            if cache: cache.delete()
        except: pass
        try:
            if uploaded_file: uploaded_file.delete()
        except: pass

    return {'fields': combined_result, 'raw': "\n\n".join(raw_responses)}


def compare_documents_ecr(original_path: str, revised_path: str, revision_request: str | None = None) -> dict:
    """
    Compares an Original ECR PDF and a Revised ECR PDF in 3 structured, high-accuracy steps:
      Step 1: Subject, Location, Legal/Tax & Site Information Diff
      Step 2: Improvements, Physical Condition, Repairs & Market Trends Diff
      Step 3: Sales Comparison Grid, Comps 1-6 Adjustments, Anticipated Sales Price & Certification Diff
    Consolidates discrepancies, calculates page difference, and extracts opinion of market value/anticipated sales price.
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
            generation_config=genai.GenerationConfig(temperature=0.0, response_mime_type="application/json")
        )

        # Handle custom revision request / checklist
        if revision_request:
            prompt = textwrap.dedent(f"""\
                You are an expert ECR appraisal reviewer. You are given an 'Original PDF', a 'Revised PDF', and a 'Checklist' of items to verify.
                Your task is to meticulously follow the instructions in the 'Checklist' and analyze both documents to answer each point.
                Checklist:
                ---
                {revision_request}
                ---
                Your response must be a single, clean JSON object as specified in the checklist instructions with 'summary' and 'comparison_summary'.
                Do not include markdown code block formatting or explanations outside the JSON object.
            """)
            response = model.generate_content(contents=[prompt, original_file_part, revised_file_part], request_options={"timeout": 600.0})
            raw_text = response.text
            if _check_for_api_error_message(raw_text, response.prompt_feedback):
                return {'error': 'Gemini API Error', 'message': raw_text}
            json_str = raw_text.strip().lstrip('```json').rstrip('```').strip()
            return json.loads(json_str) if json_str else {}

        # 3-Step Diff Extraction for ECR
        diff_steps = [
            {
                "step_num": 1,
                "section_name": "Subject, Site, Neighborhood & Property Identification",
                "focus_areas": [
                    "Client Name & File #", "Transferee", "Owner(s) of Record", "Subject Property Address, City, State, Zip",
                    "Legal Description", "Assessor's Parcel #", "Annual Real Estate Taxes & Tax Year", "HOA Fees & Assessments",
                    "Listing Status, Original List Price, Current List Price, Days on Market",
                    "Neighborhood Boundaries, Land Use %, Single-family Price Range, Neighborhood Appeal Rating",
                    "Site Dimensions, Site Area, Zoning Classification & Description, Flood Hazard Area, Utilities (Electric, Gas, Water, Sewer), Topography, Site Appeal Rating"
                ]
            },
            {
                "step_num": 2,
                "section_name": "Improvements, Physical Condition & Market Trends",
                "focus_areas": [
                    "Year Built, Actual Age, Effective Age", "Construction Method, Architectural Style",
                    "Exterior Walls, Foundation, Roof Surface, Windows, Heating & Cooling",
                    "Total Rooms, Bedrooms, Baths, Gross Living Area (GLA), Basement Area & Finish %",
                    "Evidence of Apparent Modifications to Dwelling",
                    "Evidence of Adverse Conditions Requiring Inspections",
                    "Recommended Repairs and/or Improvements & Total Estimated Cost to Cure",
                    "Overall Quality of Construction, Condition, Appeal Ratings",
                    "Market Segment Definition, New Construction / Distressed Market Competition, Seller Concessions",
                    "Historic Trends, Absorption Rates, Active Listings, Competing Properties (#1-#3), Forecasted Price Trends"
                ]
            },
            {
                "step_num": 3,
                "section_name": "Sales Comparison Grid, Anticipated Sales Price & Certification",
                "focus_areas": [
                    "Sales Comparison Grid: Subject and Comparable Sales #1 through #6 (Address, Proximity, Sale Price, Sale Date, Days on Market, Data Sources, Financing/Concessions)",
                    "Grid Adjustments: Market Change, Neighborhood Appeal, Site Area/Appeal, Quality, Age, Condition, Room Counts, GLA, Basement, Features, Forecasting Adjustment, Net Adjustment, Adjusted Sales Price",
                    "Comparable Sales Narrative & Reconciliation Comments",
                    "Anticipated Sales Price Opinion & Assignment Marketing Period",
                    "Competitive List Price Range for Subject Property",
                    "Appraiser & Co-Appraiser Names, Signature Dates, Inspection Dates, License/Certification Numbers, Expiration Dates, and Inspection Attestation"
                ]
            }
        ]

        all_comparison_rows = []
        step_summaries = []

        diff_item_schema = {
            "type": "object",
            "properties": {
                "summary": {"type": "string"},
                "comparison_summary": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "field": {"type": "string"},
                            "section": {"type": "string"},
                            "original_value": {"type": "string"},
                            "revised_value": {"type": "string"},
                            "page_no": {"type": "string"},
                            "comment": {"type": "string"}
                        },
                        "required": ["field", "original_value", "revised_value", "page_no", "comment"]
                    }
                }
            },
            "required": ["summary", "comparison_summary"]
        }

        diff_model = genai.GenerativeModel(
            model_name="gemini-3.5-flash",
            generation_config=genai.GenerationConfig(
                temperature=0.0,
                response_mime_type="application/json",
                response_schema=diff_item_schema
            )
        )

        for d_step in diff_steps:
            step_num = d_step["step_num"]
            section_name = d_step["section_name"]
            focus_areas = d_step["focus_areas"]

            print(f"[ECR Diff] Running Step {step_num}/3: {section_name}...")
            step_prompt = textwrap.dedent(f"""\
                You are an expert appraisal reviewer specializing in identifying discrepancies between ECR (Exterior / Evaluation Condition Report) document versions.
                Your task is to meticulously compare the 'Original PDF' and the 'Revised PDF' for Step {step_num}: {section_name}.

                **FOCUS AREAS FOR THIS STEP:**
                {json.dumps(focus_areas, indent=2)}

                **INSTRUCTIONS:**
                1. Identify all substantive changes and revisions between the Original and Revised reports for the focus areas above.
                2. If a field value changed, was added, or was corrected, record it.
                3. For 'comparison_summary':
                   - 'field': The specific field name (e.g. "Subject: Gross Living Area", "Comp 1: Sale Price", "Recommended Repairs").
                   - 'section': "{section_name}".
                   - 'original_value': The value from the Original PDF (or "Not Present" if added).
                   - 'revised_value': The value from the Revised PDF (or "Not Present" if removed).
                   - 'page_no': The page number in the Revised PDF where this appears.
                   - 'comment': A brief, concise explanation of the change.
                4. For 'summary': A concise 1-2 sentence summary of changes in this step (or state 'No changes detected' if identical).
                5. Clean monetary values to digits and dates to MM/DD/YYYY.
            """)

            try:
                step_resp = diff_model.generate_content(
                    contents=[step_prompt, original_file_part, revised_file_part],
                    request_options={"timeout": 600.0}
                )
                raw_step_text = step_resp.text
                if not _check_for_api_error_message(raw_step_text, step_resp.prompt_feedback):
                    json_str = raw_step_text.strip().lstrip('```json').rstrip('```').strip()
                    parsed = json.loads(json_str) if json_str else {}
                    if parsed.get("summary") and parsed.get("summary") != "No changes detected":
                        step_summaries.append(parsed["summary"])
                    for item in parsed.get("comparison_summary", []):
                        if "section" not in item:
                            item["section"] = section_name
                        all_comparison_rows.append(item)
            except Exception as step_err:
                print(f"[ECR Diff] Step {step_num} error: {step_err}")

            time.sleep(1)

        # Market Value / Anticipated Sales Price extraction
        value_prompt = textwrap.dedent("""\
            From the 'Original PDF' and the 'Revised PDF', extract the Anticipated Sales Price / Opinion of Value from the ECR report.
            Your response must be a single clean JSON object with keys: 'old_market_value' and 'new_market_value'.
            Example: { "old_market_value": "350000", "new_market_value": "355000" }.
        """)
        old_val = "Not Found"
        new_val = "Not Found"
        try:
            val_resp = model.generate_content(contents=[value_prompt, original_file_part, revised_file_part], request_options={"timeout": 600.0})
            val_json_str = val_resp.text.strip().lstrip('```json').rstrip('```').strip()
            val_data = json.loads(val_json_str) if val_json_str else {}
            old_val = val_data.get('old_market_value', 'Not Found')
            new_val = val_data.get('new_market_value', 'Not Found')
        except Exception as val_err:
            print(f"[ECR Diff] Value extraction error: {val_err}")

        # Page count difference tracking
        if old_pdf_page_count != new_pdf_page_count:
            page_count_comment = f"Page count changed from {old_pdf_page_count} to {new_pdf_page_count}."
            all_comparison_rows.insert(0, {
                'field': 'Page Count',
                'section': 'Document Properties',
                'original_value': str(old_pdf_page_count),
                'revised_value': str(new_pdf_page_count),
                'page_no': 'N/A',
                'comment': page_count_comment
            })

        consolidated_summary = " ".join(step_summaries) if step_summaries else "ECR 3-step comparison completed. No major discrepancies found."

        return {
            'summary': consolidated_summary,
            'comparison_summary': all_comparison_rows,
            'old_market_value': old_val,
            'new_market_value': new_val,
            'old_anticipated_sales_price': old_val,
            'new_anticipated_sales_price': new_val,
            'old_pdf_page_count': old_pdf_page_count,
            'new_pdf_page_count': new_pdf_page_count
        }

    except google_exceptions.ResourceExhausted as e:
        raise Exception(f"API quota exceeded during ECR comparison. Original error: {e}")
    except Exception as e:
        print(f"Error during ECR document comparison: {e}")
        raise
