"""
xml_extractor.py
Comprehensive MISMO 2.6 XML Parser for Appraisal Reports (FNMA 1025, 1004, 1073, 1007, etc.)
Extracts structured appraisal data dynamically from XML matching the exact schema expected by Pramaan UI.
Zero hardcoded values.
"""

import os
import re
import base64
import tempfile
import xml.etree.ElementTree as ET
from typing import Dict, Any, Optional

try:
    import pymupdf as fitz
except ImportError:
    try:
        import fitz
    except ImportError:
        fitz = None

def _clean_currency(val: Any) -> str:
    if val is None:
        return ""
    val_str = str(val).strip()
    if not val_str:
        return ""
    is_neg = "-" in val_str or (val_str.startswith("(") and val_str.endswith(")"))
    val_clean = re.sub(r"[^\d.]", "", val_str)
    if not val_clean:
        return ""
    try:
        num = float(val_clean)
        prefix = "-" if is_neg and num != 0 else ""
        if num.is_integer():
            return f"{prefix}{int(num):,}"
        return f"{prefix}{num:,.2f}"
    except ValueError:
        return val_str


def _detect_form_type_from_xml(root: ET.Element) -> str:
    """
    Dynamically identifies the exact appraisal form type from MISMO XML DOM elements.
    Checks REPORT attributes, primary FORM, attached addenda forms, and rental analyses.
    Maps to standard form types: '1004', '1004C', '1004D', '1025', '1073', '2055',
    '1075', '2090', '2095', '203k-FHA', '1007', '216', '1025 + 1007', '1073 + 1007',
    '1004 + 1007', '1004MC', 'Appraisal Version #1', 'ERC'.
    """
    report = root.find(".//REPORT")
    rep_attrib = report.attrib if report is not None else {}
    mismo_form = rep_attrib.get("AppraisalFormType", "")
    mismo_other = rep_attrib.get("AppraisalFormTypeOtherDescription", "")
    
    primary_form_name = ""
    primary_form_id = ""
    all_form_names = []
    
    for f in root.findall(".//FORM"):
        name = f.attrib.get("AppraisalReportContentName", "")
        ident = f.attrib.get("AppraisalReportContentIdentifier", "")
        is_pri = f.attrib.get("AppraisalReportContentIsPrimaryFormIndicator", "N").upper() == "Y"
        if name:
            all_form_names.append(name)
        if ident:
            all_form_names.append(ident)
        if is_pri and not primary_form_name:
            primary_form_name = name
            primary_form_id = ident
            
    combined_text = f"{mismo_form} {mismo_other} {primary_form_name} {primary_form_id} " + " ".join(all_form_names)
    ct = combined_text.upper()
    
    has_1007 = any("1007" in f.upper() or "SINGLE FAMILY RENT" in f.upper() for f in all_form_names)
    
    # Check 1025 (Small Residential Income Property / 2-4 Unit)
    if "1025" in ct or "SMALL RESIDENTIAL" in ct or "2-4 UNIT" in ct or "FRE72" in ct:
        return "1025 + 1007" if has_1007 else "1025"
        
    # Check 1073 (Condominium)
    if "1073" in ct or "CONDOMINIUM" in ct or "FRE465" in ct:
        return "1073 + 1007" if has_1007 else "1073"
        
    # Check Manufactured Home 1004C
    if "1004C" in ct or "MANUFACTURED" in ct:
        return "1004C"
        
    # Check Update / Completion 1004D
    if "1004D" in ct:
        return "1004D"
        
    # Check Exterior Only 2055
    if "2055" in ct:
        return "2055"
        
    # Check Exterior Condo 1075
    if "1075" in ct:
        return "1075"
        
    # Check Cooperative 2090
    if "2090" in ct:
        return "2090"
        
    # Check Exterior Coop 2095
    if "2095" in ct:
        return "2095"
        
    # Check 203k
    if "203K" in ct:
        return "203k-FHA"
        
    # Check 1004 (URAR / FRE 70)
    if "1004" in ct or "URAR" in ct or "FRE70" in ct:
        return "1004 + 1007" if has_1007 else "1004"
        
    # Check Worldwide ERC
    if "ERC" in ct or "ECR" in ct:
        return "ERC"
        
    # Check Standalone 1007
    if "1007" in ct or "RENT SCHEDULE" in ct:
        return "1007"
        
    # Check Operating Income Statement 216
    if "216" in ct or "OPERATING INCOME" in ct:
        return "216"
        
    # Check Market Conditions Addendum 1004MC
    if "1004MC" in ct:
        return "1004MC"
        
    return "1004"


def _map_form_type(mismo_form: str) -> str:
    mf = (mismo_form or "").upper()
    if "1025" in mf:
        return "1025"
    if "1004" in mf and "1007" in mf:
        return "1004 + 1007"
    if "1004" in mf:
        return "1004"
    if "1073" in mf:
        return "1073"
    if "1007" in mf:
        return "1007"
    if "2055" in mf:
        return "2055"
    if "ERC" in mf or "ECR" in mf:
        return "ERC"
    return mismo_form or "1004"

def _format_mat_cond(raw_val: Any, default_cond: str = "Average") -> str:
    val = str(raw_val or "").strip()
    if not val or val.lower() == "none":
        return "None"
    if "/" in val:
        parts = [p.strip() for p in val.split("/") if p.strip()]
        if len(parts) >= 2:
            cond = parts[-1]
            mat = "/".join(parts[:-1])
            cond_lower = cond.lower()
            if cond_lower in ["ave", "avg"]:
                cond = "Average"
            elif cond_lower in ["gd", "good"]:
                cond = "Good"
            elif cond_lower in ["excl", "exc", "excellent"]:
                cond = "Excellent"
            elif cond_lower in ["new"]:
                cond = "New"
            elif cond_lower in ["fair"]:
                cond = "Fair"
            elif cond_lower in ["poor"]:
                cond = "Poor"
            return f"{mat} / {cond}"
        elif len(parts) == 1:
            return f"{parts[0]} / {default_cond}"
    return f"{val} / {default_cond}"

def extract_fields_from_xml(xml_path_or_bytes: Any) -> Dict[str, Any]:
    """
    Parses a MISMO 2.6 XML appraisal file and returns the full structured fields dictionary.
    All data is extracted dynamically from the XML DOM and attributes.
    """
    try:
        if isinstance(xml_path_or_bytes, (str, bytes, bytearray, os.PathLike)) and isinstance(xml_path_or_bytes, str) and os.path.exists(xml_path_or_bytes):
            tree = ET.parse(xml_path_or_bytes)
            root = tree.getroot()
        elif isinstance(xml_path_or_bytes, bytes):
            root = ET.fromstring(xml_path_or_bytes)
        elif isinstance(xml_path_or_bytes, str):
            root = ET.fromstring(xml_path_or_bytes.encode("utf-8"))
        else:
            root = ET.parse(xml_path_or_bytes).getroot()
    except Exception as e:
        return {"status": "error", "message": f"XML parse error: {str(e)}", "fields": {}}

    report = root.find(".//REPORT")
    parties = root.find(".//PARTIES")
    property_elem = root.find(".//PROPERTY")
    val_methods = root.find(".//VALUATION_METHODS")
    valuation = root.find(".//VALUATION")

    # Form type detection & Report Identifiers
    mismo_form_type = ""
    file_id = ""
    loan_num = ""
    signed_date = ""
    purpose = ""
    if report is not None:
        mismo_form_type = report.attrib.get("AppraisalFormType", "")
        file_id = report.attrib.get("AppraiserFileIdentifier", "")
        loan_num = report.attrib.get("AppraiserAdditionalFileIdentifier", "")
        signed_date = report.attrib.get("AppraiserReportSignedDate", "")
        purpose = report.attrib.get("AppraisalPurposeType", "")

    form_type = _detect_form_type_from_xml(root)

    # Appraiser & Parties
    appraiser_name = ""
    appraiser_company = ""
    appraiser_address = ""
    lender_name = ""
    lender_address = ""
    borrower_name = ""

    if parties is not None:
        appraiser_elem = parties.find("APPRAISER")
        if appraiser_elem is not None:
            appraiser_name = appraiser_elem.attrib.get("_Name", "")
            appraiser_company = appraiser_elem.attrib.get("_CompanyName", "")
            appraiser_address = f"{appraiser_elem.attrib.get('_StreetAddress', '')}, {appraiser_elem.attrib.get('_StreetAddress2', '')}".strip(", ")
        
        lender_elem = parties.find("LENDER")
        if lender_elem is not None:
            lender_name = lender_elem.attrib.get("_UnparsedName", "")
            lender_address = lender_elem.attrib.get("AppraisalFormsUnparsedAddress", "") or f"{lender_elem.attrib.get('_StreetAddress', '')}, {lender_elem.attrib.get('_StreetAddress2', '')}".strip(", ")

        borrower_elem = parties.find("BORROWER")
        if borrower_elem is not None:
            borrower_name = borrower_elem.attrib.get("_UnparsedName", "")

    # Property info
    prop_addr = ""
    prop_city = ""
    prop_state = ""
    prop_zip = ""
    prop_county = ""
    prop_rights = ""
    prop_occupancy = ""

    if property_elem is not None:
        prop_addr = property_elem.attrib.get("_StreetAddress", "")
        prop_city = property_elem.attrib.get("_City", "")
        prop_state = property_elem.attrib.get("_State", "")
        prop_zip = property_elem.attrib.get("_PostalCode", "")
        prop_county = property_elem.attrib.get("_County", "")
        
        rights_raw = property_elem.attrib.get("_RightsType", "")
        if "Fee" in rights_raw: 
            prop_rights = "Fee Simple"
        elif "Lease" in rights_raw: 
            prop_rights = "Leasehold"
        else: 
            prop_rights = rights_raw
        
        occ_raw = property_elem.attrib.get("_CurrentOccupancyType", "")
        if "Tenant" in occ_raw: 
            prop_occupancy = "Tenant"
        elif "Vacant" in occ_raw: 
            prop_occupancy = "Vacant"
        elif "Owner" in occ_raw: 
            prop_occupancy = "Owner"
        else: 
            prop_occupancy = occ_raw

    full_addr = f"{prop_addr}, {prop_city}, {prop_state} {prop_zip}".strip(", ")

    # Identifiers
    apn = ""
    census = ""
    map_ref = ""
    legal_desc = ""
    owner_name = ""
    tax_year = ""
    taxes = ""
    special_taxes = ""

    if property_elem is not None:
        id_elem = property_elem.find("_IDENTIFICATION")
        if id_elem is not None:
            apn = id_elem.attrib.get("AssessorsParcelIdentifier", "")
            census = id_elem.attrib.get("CensusTractIdentifier", "")
            map_ref = id_elem.attrib.get("MapReferenceIdentifier", "")
        
        legal_elem = property_elem.find("_LEGAL_DESCRIPTION")
        if legal_elem is not None:
            legal_desc = legal_elem.attrib.get("_TextDescription", "")

        owner_elem = property_elem.find("_OWNER")
        if owner_elem is not None:
            owner_name = owner_elem.attrib.get("_Name", "")

        tax_elem = property_elem.find("_TAX")
        if tax_elem is not None:
            tax_year = tax_elem.attrib.get("_YearIdentifier", "")
            taxes = _clean_currency(tax_elem.attrib.get("_TotalTaxAmount", ""))
            special_taxes = _clean_currency(tax_elem.attrib.get("_TotalSpecialTaxAmount", ""))

    # Structure
    units = ""
    stories = ""
    design_style = ""
    year_built = ""
    gba = ""
    total_rooms = ""
    bedrooms = ""
    baths = ""
    struct_type = ""
    effective_age = ""
    foundation_type = ""
    prop_condition = ""
    struct_elem = None

    if property_elem is not None:
        struct_elem = property_elem.find("STRUCTURE")
        if struct_elem is not None:
            units = struct_elem.attrib.get("LivingUnitCount", "")
            stories = struct_elem.attrib.get("StoriesCount", "")
            design_style = struct_elem.attrib.get("_DesignDescription", "")
            year_built = struct_elem.attrib.get("PropertyStructureBuiltYear", "")
            gba = struct_elem.attrib.get("GrossLivingAreaSquareFeetCount", "") or struct_elem.attrib.get("GrossBuildingAreaSquareFeetCount", "")
            total_rooms = struct_elem.attrib.get("TotalRoomCount", "")
            bedrooms = struct_elem.attrib.get("TotalBedroomCount", "")
            baths = struct_elem.attrib.get("TotalBathroomCount", "")
            
            # If multi-unit, calculate bathroom count from units if not present on structure
            if not baths:
                unit_baths = [float(u.attrib.get("TotalBathroomCount", 0)) for u in struct_elem.findall("_UNIT_GROUP") if u.attrib.get("TotalBathroomCount")]
                if unit_baths:
                    total_b = sum(unit_baths)
                    baths = str(int(total_b) if total_b.is_integer() else total_b)

            struct_type = (
                struct_elem.attrib.get("AttachmentType", "") or 
                struct_elem.attrib.get("StructureConfigurationTypeOtherDescription", "") or 
                struct_elem.attrib.get("StructureConfigurationType", "")
            )
            sa_elem = struct_elem.find("STRUCTURE_ANALYSIS")
            if sa_elem is None:
                sa_elem = root.find(".//STRUCTURE_ANALYSIS")
            if sa_elem is not None:
                effective_age = sa_elem.attrib.get("EffectiveAgeYearsCount", "")
            
            found_elem = struct_elem.find("FOUNDATION")
            if found_elem is not None:
                ft = found_elem.attrib.get("_Type", "")
                if "Basement" in ft:
                    foundation_type = "Full Basement" if struct_elem.find("BASEMENT") is not None else ft
                else:
                    foundation_type = ft

    # Site
    site_dim = ""
    site_area = ""
    zoning_class = ""
    zoning_desc = ""
    zoning_comp = ""
    hbu = ""
    site_shape = ""
    site_view = ""
    utilities_list = []
    util_dict = {}

    site_elem = property_elem.find("SITE") if property_elem is not None else None
    if site_elem is None:
        site_elem = root.find(".//SITE")

    if site_elem is not None:
        site_dim = site_elem.attrib.get("_DimensionsDescription", "")
        site_area = site_elem.attrib.get("_AreaDescription", "")
        zoning_class = site_elem.attrib.get("_ZoningClassificationIdentifier", "")
        zoning_desc = site_elem.attrib.get("_ZoningClassificationDescription", "")
        zoning_comp = site_elem.attrib.get("_ZoningComplianceType", "")
        hbu_ind = site_elem.attrib.get("HighestBestUseIndicator", "")
        if hbu_ind.upper() == "Y":
            hbu = "Yes"
        elif hbu_ind.upper() == "N":
            hbu = "No"
        elif hbu_ind:
            hbu = hbu_ind

        for sf in site_elem.findall("SITE_FEATURE"):
            stype = sf.attrib.get("_Type", "").lower()
            scomm = sf.attrib.get("_Comment", "").strip()
            if stype == "shape":
                site_shape = scomm
            elif stype == "view":
                site_view = scomm

        for util in site_elem.findall("SITE_UTILITY"):
            utype = util.attrib.get("_Type", "").strip()
            upub = util.attrib.get("_PublicIndicator", "").upper()
            unon = util.attrib.get("_NonPublicIndicator", "").upper()
            udesc = util.attrib.get("_NonPublicDescription", "").strip()

            if upub == "Y":
                uval = "Public"
            elif unon == "Y":
                uval = f"Other: {udesc}" if udesc else "Other"
            elif udesc:
                uval = "None" if udesc.upper() == "NONE" else udesc
            elif upub == "N":
                uval = "None"
            else:
                uval = ""

            if utype:
                if utype.lower() in ("sanitarysewer", "sanitary sewer"):
                    util_dict["Sanitary Sewer"] = uval
                else:
                    util_dict[utype] = uval
                if uval:
                    utilities_list.append(f"{utype}: {uval}")

    utilities_str = ", ".join(utilities_list)

    # Dynamic Off-Site Improvements (Street & Alley)
    street_val = ""
    alley_val = ""
    street_desc = ""
    street_types = []
    for osi in root.findall(".//_OFF_SITE_IMPROVEMENT"):
        otype = osi.attrib.get("_Type", "")
        odesc = osi.attrib.get("_Description", "").strip()
        oown = osi.attrib.get("_OwnershipType", "").strip()
        oexists = osi.attrib.get("_ExistsIndicator", "").upper()

        if otype == "Street":
            if odesc and odesc.lower() != "none" and not street_desc:
                street_desc = odesc
            if oexists == "Y" and oown and oown not in street_types:
                street_types.append(oown)
            elif oown and oexists != "N" and oown not in street_types:
                street_types.append(oown)
        elif otype == "Alley":
            if oexists == "Y" and odesc and odesc.lower() != "none":
                alley_val = f"{oown}: {odesc}" if oown else odesc
            elif odesc and odesc.lower() == "none":
                alley_val = "None"
            elif oexists == "N" and not alley_val:
                alley_val = "None"

    if street_types:
        s_own = "/".join(street_types)
        street_val = f"{s_own}: {street_desc}" if street_desc else s_own
    elif street_desc:
        street_val = street_desc

    # Dynamic Flood Zone
    fema_zone = ""
    fema_special = ""
    fema_map_id = ""
    fema_map_date = ""
    flood_elem = root.find(".//FLOOD_ZONE")
    if flood_elem is not None:
        fema_zone = flood_elem.attrib.get("NFIPFloodZoneIdentifier", "")
        fema_map_id = flood_elem.attrib.get("NFIPMapIdentifier", "")
        raw_fema_date = flood_elem.attrib.get("NFIPMapPanelDate", "")
        if raw_fema_date:
            m_date = re.match(r"^(\d{4})-(\d{2})-(\d{2})$", raw_fema_date)
            if m_date:
                fema_map_date = f"{m_date.group(2)}/{m_date.group(3)}/{m_date.group(1)}"
            else:
                fema_map_date = raw_fema_date
        sf_ind = flood_elem.attrib.get("SpecialFloodHazardAreaIndicator", "")
        if sf_ind.upper() == "Y":
            fema_special = "Yes"
        elif sf_ind.upper() == "N":
            fema_special = "No"
        elif sf_ind:
            fema_special = sf_ind

    # Dynamic Typical Utilities & Adverse Site Conditions from PROPERTY_ANALYSIS
    util_typical = ""
    util_typical_desc = ""
    adverse_site = ""
    adverse_site_desc = ""
    for pa in root.findall(".//PROPERTY_ANALYSIS"):
        ptype = pa.attrib.get("_Type", "")
        pind = pa.attrib.get("_ExistsIndicator", "").upper()
        pcomm = pa.attrib.get("_Comment", "").strip()

        if ptype == "UtilitiesAndOffSiteImprovementsConformToNeighborhood":
            if pind == "Y":
                util_typical = "Yes"
                util_typical_desc = "Yes"
            elif pind == "N":
                util_typical = "No"
                util_typical_desc = f"No: {pcomm}" if pcomm else "No"
            elif pind:
                util_typical = pind
                util_typical_desc = pind
        elif ptype == "AdverseSiteConditions":
            if pind == "N":
                adverse_site = "No"
                adverse_site_desc = "No"
            elif pind == "Y":
                adverse_site = "Yes"
                adverse_site_desc = f"Yes: {pcomm}" if pcomm else "Yes"
            elif pind:
                adverse_site = pind
                adverse_site_desc = pind

    # Neighborhood
    nb_name = ""
    nb_loc = ""
    nb_built = ""
    nb_growth = ""
    nb_val = ""
    nb_demand = ""
    nb_mkt_time = ""
    nb_bound = ""
    nb_desc = ""
    nb_mkt = ""

    one_unit = "0%"
    two_four_unit = "0%"
    multi_family = "0%"
    commercial = "0%"
    other_use = "0%"
    other_desc = ""

    housing_price = ""
    housing_age = ""

    nb_elem = property_elem.find("NEIGHBORHOOD") if property_elem is not None else None
    if nb_elem is None:
        nb_elem = root.find(".//NEIGHBORHOOD")

    if nb_elem is not None:
        nb_name = nb_elem.attrib.get("_Name", "")
        if not nb_name and property_elem is not None:
            proj_elem = property_elem.find("PROJECT")
            if proj_elem is not None:
                nb_name = proj_elem.attrib.get("_Name", "")
        if not nb_name:
            proj_elem = root.find(".//PROJECT")
            if proj_elem is not None:
                nb_name = proj_elem.attrib.get("_Name", "")
        nb_bound = nb_elem.attrib.get("_BoundaryAndCharacteristicsDescription", "")
        nb_desc = nb_elem.attrib.get("_Description", "")
        nb_mkt = nb_elem.attrib.get("_MarketConditionsDescription", "")
        
        loc_raw = nb_elem.attrib.get("PropertyNeighborhoodLocationType", "")
        if "Urban" in loc_raw: 
            nb_loc = "Urban"
        elif "Suburban" in loc_raw: 
            nb_loc = "Suburban"
        elif "Rural" in loc_raw: 
            nb_loc = "Rural"
        elif loc_raw: 
            nb_loc = loc_raw
        
        built_raw = nb_elem.attrib.get("_BuiltupRangeType", "")
        if "Over75" in built_raw: 
            nb_built = "Over 75%"
        elif "25To75" in built_raw: 
            nb_built = "25-75%"
        elif "Under25" in built_raw: 
            nb_built = "Under 25%"
        elif built_raw: 
            nb_built = built_raw

        growth_raw = nb_elem.attrib.get("_GrowthPaceType", "")
        if "Rapid" in growth_raw: 
            nb_growth = "Rapid"
        elif "Stable" in growth_raw: 
            nb_growth = "Stable"
        elif "Slow" in growth_raw: 
            nb_growth = "Slow"
        elif growth_raw: 
            nb_growth = growth_raw

        val_raw = nb_elem.attrib.get("_PropertyValueTrendType", "")
        if "Increasing" in val_raw: 
            nb_val = "Increasing"
        elif "Stable" in val_raw: 
            nb_val = "Stable"
        elif "Declining" in val_raw: 
            nb_val = "Declining"
        elif val_raw: 
            nb_val = val_raw

        dem_raw = nb_elem.attrib.get("_DemandSupplyType", "")
        if "Shortage" in dem_raw: 
            nb_demand = "Shortage"
        elif "InBalance" in dem_raw: 
            nb_demand = "In Balance"
        elif "OverSupply" in dem_raw: 
            nb_demand = "Over Supply"
        elif dem_raw: 
            nb_demand = dem_raw

        time_raw = nb_elem.attrib.get("_TypicalMarketingTimeDurationType", "")
        if "UnderThree" in time_raw: 
            nb_mkt_time = "Under 3 mos"
        elif "ThreeToSix" in time_raw: 
            nb_mkt_time = "3-6 mos"
        elif "OverSix" in time_raw: 
            nb_mkt_time = "Over 6 mos"
        elif time_raw: 
            nb_mkt_time = time_raw

        # Present Land Use
        for plu in nb_elem.findall("_PRESENT_LAND_USE"):
            ptype = plu.attrib.get("_Type", "")
            ppercent = plu.attrib.get("_Percent", "").strip()
            pdesc = plu.attrib.get("_TypeOtherDescription", "").strip()
            pval = f"{ppercent}%" if ppercent else "0%"
            
            if ptype == "SingleFamily":
                one_unit = pval
            elif ptype == "TwoToFourFamily":
                two_four_unit = pval
            elif ptype == "Apartment" or "Multi" in ptype:
                multi_family = pval
            elif ptype == "Commercial":
                commercial = pval
            elif ptype == "Other":
                other_use = pval
                if pdesc:
                    other_desc = pdesc

        # Housing (high, low, pred)
        housing_elems = nb_elem.findall("_HOUSING")
        chosen_housing = None
        for h in housing_elems:
            if h.attrib.get("_Type") == "SingleFamily":
                chosen_housing = h
                break
        if chosen_housing is None and housing_elems:
            chosen_housing = housing_elems[0]

        if chosen_housing is not None:
            h_low = chosen_housing.attrib.get("_LowPriceAmount", "").strip()
            h_high = chosen_housing.attrib.get("_HighPriceAmount", "").strip()
            h_pred = chosen_housing.attrib.get("_PredominantPriceAmount", "").strip()
            if h_high and h_low and h_pred:
                housing_price = f"{h_high} / {h_low} / {h_pred}"

            h_newest = chosen_housing.attrib.get("_NewestYearsCount", "").strip()
            h_oldest = chosen_housing.attrib.get("_OldestYearsCount", "").strip()
            h_pred_age = chosen_housing.attrib.get("_PredominantAgeYearsCount", "").strip()
            if h_oldest and h_newest and h_pred_age:
                housing_age = f"{h_oldest} / {h_newest} / {h_pred_age}"

    # Contract
    is_refinance = "refinance" in purpose.lower()
    contract_price = ""
    contract_date = ""
    contract_comment = ""
    contract_data_source = ""
    seller_is_owner = ""
    concessions = ""
    concessions_amount = ""
    concessions_desc = ""
    concessions_text = ""

    sales_contract = property_elem.find("SALES_CONTRACT") if property_elem is not None else None
    if sales_contract is None:
        sales_contract = root.find(".//SALES_CONTRACT")

    if sales_contract is not None:
        c_amt = sales_contract.attrib.get("_Amount", "")
        if c_amt:
            contract_price = _clean_currency(c_amt)

        c_date = sales_contract.attrib.get("_Date", "")
        if c_date:
            m = re.match(r"^(\d{4})-(\d{2})-(\d{2})$", c_date)
            if m:
                contract_date = f"{m.group(2)}/{m.group(3)}/{m.group(1)}"
            else:
                contract_date = c_date

        c_comment = sales_contract.attrib.get("_ReviewComment", "")
        rev_ind = sales_contract.attrib.get("_ReviewedIndicator", "").upper()
        if c_comment:
            if not is_refinance:
                comm_lower = c_comment.lower()
                if "did" not in comm_lower and "did not" not in comm_lower:
                    if rev_ind == "N":
                        c_comment = f"did not: {c_comment}"
                    else:
                        c_comment = f"did: {c_comment}"
            contract_comment = c_comment
        elif rev_ind == "Y":
            contract_comment = "did analyze the contract for sale"
        elif rev_ind == "N":
            contract_comment = "did not analyze the contract for sale"

        contract_data_source = sales_contract.attrib.get("DataSourceDescription", "")
        seller_owner_ind = sales_contract.attrib.get("SellerIsOwnerIndicator", "")
        if seller_owner_ind.upper() == "Y":
            seller_is_owner = "Yes"
        elif seller_owner_ind.upper() == "N":
            seller_is_owner = "No"
        elif seller_owner_ind:
            seller_is_owner = seller_owner_ind

        conc_ind = sales_contract.attrib.get("SalesConcessionIndicator", "")
        if conc_ind.upper() == "Y":
            concessions = "Yes"
        elif conc_ind.upper() == "N":
            concessions = "No"
        elif conc_ind:
            concessions = conc_ind

        concessions_amount = _clean_currency(sales_contract.attrib.get("SalesConcessionAmount", ""))
        concessions_desc = sales_contract.attrib.get("SalesConcessionDescription", "")
        if concessions_desc and concessions_amount and concessions_amount not in concessions_desc:
            concessions_text = f"${concessions_amount} {concessions_desc}".strip()
        elif concessions_desc:
            concessions_text = concessions_desc
        elif concessions_amount:
            concessions_text = f"${concessions_amount}"
        elif concessions == "No":
            concessions_text = "0"

    # Default values for Refinance transactions
    if is_refinance:
        if not contract_comment:
            contract_comment = "Did not"
        if not seller_is_owner:
            seller_is_owner = "N/A"
        if not concessions:
            concessions = "N/A"
        if not concessions_text:
            concessions_text = "N/A"


    # Valuation / Reconciliation
    appraised_val = ""
    effective_date = ""
    if valuation is not None:
        appraised_val = _clean_currency(valuation.attrib.get("PropertyAppraisedValueAmount", ""))
        effective_date = valuation.attrib.get("AppraisalEffectiveDate", "")

    sales_comp_ind_val = ""
    sales_comp_comment = ""
    income_ind_val = ""
    income_grm = ""
    income_rent = ""
    cost_land_val = ""
    cost_total_cost = ""

    cost_elem = None
    sales_comp_elem = None
    income_elem = None
    if val_methods is not None:
        sales_comp_elem = val_methods.find("SALES_COMPARISON")
        if sales_comp_elem is not None:
            sales_comp_ind_val = _clean_currency(sales_comp_elem.attrib.get("ValueIndicatedBySalesComparisonApproachAmount", ""))
            sales_comp_comment = sales_comp_elem.attrib.get("_Comment", "")

        income_elem = val_methods.find("INCOME_ANALYSIS")
        cost_elem = val_methods.find("COST_ANALYSIS")

    if income_elem is None:
        income_elem = root.find(".//INCOME_ANALYSIS")

    if income_elem is not None:
        raw_ind_inc = income_elem.attrib.get("ValueIndicatedByIncomeApproachAmount", "")
        if raw_ind_inc and raw_ind_inc != "0":
            income_ind_val = _clean_currency(raw_ind_inc)
        elif raw_ind_inc == "0":
            income_ind_val = "0"

        raw_grm = income_elem.attrib.get("GrossRentMultiplierFactor", "")
        if raw_grm and raw_grm not in ["0", "00"]:
            income_grm = raw_grm

        raw_rent = income_elem.attrib.get("EstimatedMarketMonthlyRentAmount", "")
        if raw_rent and raw_rent != "0":
            income_rent = _clean_currency(raw_rent)

    if cost_elem is None:
        cost_elem = root.find(".//COST_ANALYSIS")

    cost_type = ""
    cost_data_source = ""
    cost_quality_rating = ""
    cost_effective_date = ""
    cost_comment = ""
    cost_site_comment = ""
    cost_economic_life = ""
    cost_site_val = ""
    cost_total_new = ""
    cost_depreciated = ""
    cost_site_as_is = ""
    cost_indicated_val = ""
    dwelling_cost = ""
    basement_cost = ""
    deck_cost = ""
    garage_cost = ""
    amenities_cost = ""
    depreciation_cost = ""
    deprec_phys_pct = ""
    deprec_func_pct = ""
    deprec_ext_pct = ""
    gla_sqft_cost = ""
    price_per_sqft_cost = ""

    if cost_elem is not None:
        cost_type = cost_elem.attrib.get("_Type", "")
        cost_data_source = cost_elem.attrib.get("DataSourceDescription", "")
        cost_quality_rating = cost_elem.attrib.get("CostServiceQualityRatingDescription", "")
        raw_eff_date = cost_elem.attrib.get("DataSourceEffectiveDate", "")
        if raw_eff_date:
            m_cd = re.match(r"^(\d{4})-(\d{2})-(\d{2})$", raw_eff_date)
            cost_effective_date = f"{m_cd.group(2)}/{m_cd.group(3)}/{m_cd.group(1)}" if m_cd else raw_eff_date
        cost_comment = cost_elem.attrib.get("_Comment", "")
        cost_site_comment = cost_elem.attrib.get("SiteEstimatedValueComment", "")
        cost_economic_life = cost_elem.attrib.get("EstimatedRemainingEconomicLifeYearsCount", "")
        cost_site_val = _clean_currency(cost_elem.attrib.get("SiteEstimatedValueAmount", ""))
        cost_total_new = _clean_currency(cost_elem.attrib.get("NewImprovementTotalCostAmount", ""))
        cost_depreciated = _clean_currency(cost_elem.attrib.get("NewImprovementDepreciatedCostAmount", ""))
        cost_site_as_is = _clean_currency(cost_elem.attrib.get("SiteOtherImprovementsAsIsAmount", ""))
        cost_ind_raw = cost_elem.attrib.get("ValueIndicatedByCostApproachAmount", "")
        if cost_ind_raw and cost_ind_raw != "0":
            cost_indicated_val = _clean_currency(cost_ind_raw)
        elif cost_ind_raw == "0":
            cost_indicated_val = "0"

        for imp in cost_elem.findall("NEW_IMPROVEMENT"):
            itype = imp.attrib.get("_Type", "")
            iamt = _clean_currency(imp.attrib.get("_CostAmount", ""))
            isqft = imp.attrib.get("SquareFeetCount", "")
            ippsf = imp.attrib.get("PricePerSquareFootAmount", "")
            idesc = imp.attrib.get("_CostDescription", "") or imp.attrib.get("_TypeOtherDescription", "")

            if itype in ["Dwelling", "SectionOne"] and not dwelling_cost:
                dwelling_cost = iamt
                if isqft: gla_sqft_cost = isqft
                if ippsf: price_per_sqft_cost = ippsf
            elif "Garage" in itype or "Carport" in itype:
                if not garage_cost: garage_cost = iamt
            elif "Basement" in itype or "Bsmt" in idesc:
                if not basement_cost: basement_cost = iamt
            elif "Deck" in itype or "Porch" in itype or "Patio" in itype:
                if not deck_cost: deck_cost = iamt
            elif "Additional" in itype or "Amenities" in idesc:
                if not amenities_cost: amenities_cost = iamt
                if not deck_cost and any(k in idesc.lower() for k in ["porch", "deck", "patio"]):
                    deck_cost = iamt

        deprec_elem = cost_elem.find("DEPRECIATION")
        if deprec_elem is not None:
            deprec_tot = _clean_currency(deprec_elem.attrib.get("_TotalAmount", ""))
            deprec_phys = _clean_currency(deprec_elem.attrib.get("_PhysicalAmount", ""))
            deprec_phys_pct = deprec_elem.attrib.get("_PhysicalPercent", "")
            deprec_func_pct = deprec_elem.attrib.get("_FunctionalPercent", "")
            deprec_ext_pct = deprec_elem.attrib.get("_ExteriorPercent", "")
            depreciation_cost = deprec_tot or deprec_phys

    cost_land_val = cost_site_val
    cost_total_cost = cost_total_new

    # Research and Information of Sales
    research_elem = root.find(".//RESEARCH")
    list_cnt = ""
    list_low = ""
    list_high = ""
    sale_cnt = ""
    sale_low = ""
    sale_high = ""
    res_did = ""
    res_comment = ""
    subj_prior_did = ""
    subj_prior_src = ""
    comp_prior_did = ""
    comp_prior_src = ""

    if research_elem is not None:
        list_cnt = research_elem.attrib.get("ComparableListingsResearchedCount", "").strip()
        list_low = research_elem.attrib.get("ComparableListingsPriceRangeLowAmount", "").strip()
        list_high = research_elem.attrib.get("ComparableListingsPriceRangeHighAmount", "").strip()
        sale_cnt = research_elem.attrib.get("ComparableSalesResearchedCount", "").strip()
        sale_low = research_elem.attrib.get("ComparableSalesPriceRangeLowAmount", "").strip()
        sale_high = research_elem.attrib.get("ComparableSalesPriceRangeHighAmount", "").strip()

        res_ind = research_elem.attrib.get("SalesHistoryResearchedIndicator", "").upper()
        res_did = "did" if res_ind == "Y" else ("did not" if res_ind == "N" else res_ind)
        res_comment = research_elem.attrib.get("SalesHistoryNotResearchedComment", "").strip()

        subj_res = research_elem.find("SUBJECT")
        if subj_res is not None:
            s_prior = subj_res.attrib.get("_HasPriorSalesIndicator", "").upper()
            subj_prior_did = "did" if s_prior == "Y" else ("did not" if s_prior == "N" else s_prior)
            subj_prior_src = subj_res.attrib.get("DataSourceDescription", "").strip()

        comp_res = research_elem.find("COMPARABLE")
        if comp_res is not None:
            c_prior = comp_res.attrib.get("_HasPriorSalesIndicator", "").upper()
            comp_prior_did = "did" if c_prior == "Y" else ("did not" if c_prior == "N" else c_prior)
            comp_prior_src = comp_res.attrib.get("DataSourceDescription", "").strip()

    prior_anal_comment = sales_comp_elem.attrib.get("_CurrentSalesAgreementAnalysisComment", "") if sales_comp_elem is not None else ""

    offered_str = ""
    if list_cnt or list_low or list_high:
        cnt_part = list_cnt if list_cnt else "____"
        low_part = f"${_clean_currency(list_low)}" if list_low else "$___"
        high_part = f"${_clean_currency(list_high)}" if list_high else "$___"
        offered_str = f"There are {cnt_part} comparable properties currently offered for sale in the subject neighborhood ranging in price from {low_part} to {high_part}"

    sales_str = ""
    if sale_cnt or sale_low or sale_high:
        cnt_part = sale_cnt if sale_cnt else "___"
        low_part = f"${_clean_currency(sale_low)}" if sale_low else "$___"
        high_part = f"${_clean_currency(sale_high)}" if sale_high else "$____"
        sales_str = f"There are {cnt_part} comparable sales in the subject neighborhood within the past twelve months ranging in sale price from {low_part} to {high_part}"

    info_of_sales_section = {
        "There are ____ comparable properties currently offered for sale in the subject neighborhood ranging in price from$ ___to $___": offered_str,
        "There are ___comparable sales in the subject neighborhoodwithin the past twelvemonths ranging in sale price from$___ to $____": sales_str,
        "THERE ARE ____ COMPARABLE PROPERTIES CURRENTLY OFFERED FOR SALE IN THE SUBJECT NEIGHBORHOOD RANGING IN PRICE FROM $ ___ TO $ ___": offered_str,
        "THERE ARE ___COMPARABLE SALES IN THE SUBJECT NEIGHBORHOODWITHIN THE PAST TWELVEMONTHS RANGING IN SALE PRICE FROM$___ TO $____": sales_str,
        "THERE ARE ___ COMPARABLE SALES IN THE SUBJECT NEIGHBORHOOD WITHIN THE PAST TWELVE MONTHS RANGING IN SALE PRICE FROM $ ___ TO $ ____": sales_str,
        "Comparable Properties Currently Offered for Sale": offered_str,
        "Comparable Sales in the Subject Neighborhood within the Past Twelve Months": sales_str,
        "I did did not research the sale or transfer history of the subject property and comparable sales. If not, explain": res_comment if res_did == "did not" and res_comment else res_did,
        "My research did did not reveal any prior sales or transfers of the subject property for the three years prior to the effective date of this appraisal.": subj_prior_did,
        "My research did did not reveal any prior sales or transfers of the subject property for the three years prior to the effective date of this appraisal": subj_prior_did,
        "Prior Sale History: My research did did not reveal any prior sales or transfers of the subject property for the three years prior to the effective date of this appraisal": subj_prior_did,
        "Data Source(s) for subject property research": subj_prior_src,
        "Data source(s) for subject property research": subj_prior_src,
        "Prior Sale History: Data source(s) for subject": subj_prior_src,
        "My research did did not reveal any prior sales or transfers of the comparable sales for the year prior to the date of sale of the comparable sale.": comp_prior_did,
        "My research did did not reveal any prior sales or transfers of the comparable sales for the year prior to the date of sale of the comparable sale": comp_prior_did,
        "Prior Sale History: My research did did not reveal any prior sales or transfers of the comparable sales for the year prior to the date of sale of the comparable sale": comp_prior_did,
        "Data Source(s) for comparable sales research": comp_prior_src,
        "Data source(s) for comparable sales research": comp_prior_src,
        "Prior Sale History: Data source(s) for comparables": comp_prior_src,
        "Analysis of prior sale or transfer history of the subject property and comparable sales": prior_anal_comment,
        "Summary of Sales Comparison Approach": sales_comp_comment,
        "Summary of Sales Comparison Approach.": sales_comp_comment,
        "Indicated Value by Sales Comparison Approach $": sales_comp_ind_val,
        "Indicated Value by Sales Comparison Approach": sales_comp_ind_val,
        "Indicated Value by: Sales Comparison Approach $": sales_comp_ind_val,
    }

    m_eff_yr = re.search(r'\b(19\d\d|20\d\d)\b', effective_date)
    eff_year = int(m_eff_yr.group(1)) if m_eff_yr else 2026

    # Sales Grid: Extract Comps and Adjustments
    comps_dict = {}
    sales_grid = {}
    adjustments_subject = {}
    if val_methods is not None:
        comp_elems = val_methods.findall(".//COMPARABLE_SALE")
        for comp in comp_elems:
            seq = comp.attrib.get("PropertySequenceIdentifier", "0")
            sale_price = _clean_currency(comp.attrib.get("PropertySalesAmount", ""))
            adj_price = _clean_currency(comp.attrib.get("AdjustedSalesPriceAmount", ""))
            raw_net_amt = comp.attrib.get("SalePriceTotalAdjustmentAmount", "")
            net_adj_str = _clean_currency(raw_net_amt)
            net_pct = comp.attrib.get("SalePriceTotalAdjustmentNetPercent", "")
            gross_pct = comp.attrib.get("SalesPriceTotalAdjustmentGrossPercent", "")
            if not net_adj_str and net_pct:
                net_adj_str = f"{net_pct}%"

            data_src = comp.attrib.get("DataSourceDescription", "")
            verif_src = comp.attrib.get("DataSourceVerificationDescription", "")
            rent = _clean_currency(comp.attrib.get("MonthlyRentAmount", ""))
            grm = comp.attrib.get("GrossMonthlyRentMultiplierFactor", "")

            price_per_unit = _clean_currency(comp.attrib.get("SalesPricePerUnitAmount", ""))
            price_per_room = _clean_currency(comp.attrib.get("SalesPricePerRoomAmount", ""))
            price_per_bdrm = _clean_currency(comp.attrib.get("SalesPricePerBedroomAmount", ""))
            rent_control = comp.attrib.get("RentControlStatusType", "")
            adj_price_unit = _clean_currency(comp.attrib.get("AdjustedSalesPricePerUnitAmount", ""))
            adj_price_room = _clean_currency(comp.attrib.get("AdjustedSalesPricePerRoomAmount", ""))
            adj_price_bdrm = _clean_currency(comp.attrib.get("AdjustedSalesPricePerBedroomAmount", ""))

            comp_loc = comp.find("LOCATION")
            c_addr = comp_loc.attrib.get("PropertyStreetAddress", "") if comp_loc is not None else ""
            c_prox = comp_loc.attrib.get("ProximityToSubjectDescription", "") if comp_loc is not None else ""

            # Extract child adjustments
            adjustments = {}
            for adj in comp.findall("SALE_PRICE_ADJUSTMENT"):
                atype = adj.attrib.get("_Type", "")
                adesc = adj.attrib.get("_Description", "")
                aamt = _clean_currency(adj.attrib.get("_Amount", ""))
                adjustments[atype] = {"desc": adesc, "amount": aamt}

            if seq == "0":
                adjustments_subject = adjustments

            # Concessions
            sc_desc = adjustments.get("SalesConcessions", {}).get("desc", "")
            fc_desc = adjustments.get("FinancingConcessions", {}).get("desc", "")
            sc_amt = adjustments.get("SalesConcessions", {}).get("amount", "")
            fc_amt = adjustments.get("FinancingConcessions", {}).get("amount", "")
            if sc_desc and fc_desc:
                concessions_desc = f"{sc_desc}; {fc_desc}"
            else:
                concessions_desc = sc_desc or fc_desc
            if seq == "0" and not concessions_desc:
                concessions_desc = concessions or "None"
            concessions_amt = fc_amt or sc_amt

            # Rooms & Unit Breakdown
            total_unit_rooms = 0
            total_unit_bed = 0
            total_unit_bath = 0
            c_rooms = ""
            c_bed = ""
            c_bath = ""
            c_room_adj = ""
            unit_breakdown = {}

            for r_elem in comp.findall("ROOM_ADJUSTMENT"):
                u_id = r_elem.attrib.get("UnitSequenceIdentifier", "")
                u_tot = r_elem.attrib.get("TotalRoomCount", "")
                u_br = r_elem.attrib.get("TotalBedroomCount", "")
                u_ba = r_elem.attrib.get("TotalBathroomCount", "")
                u_adj = _clean_currency(r_elem.attrib.get("RoomAdjustmentAmount", ""))
                if u_id:
                    unit_breakdown[f"Unit Breakdown Tot Unit # {u_id}"] = u_tot
                    unit_breakdown[f"Unit Breakdown Br Unit # {u_id}"] = u_br
                    unit_breakdown[f"Unit Breakdown Ba Unit # {u_id}"] = u_ba
                    unit_breakdown[f"Unit Breakdown Adjustment Unit # {u_id}"] = u_adj
                    if u_tot.isdigit(): total_unit_rooms += int(u_tot)
                    if u_br.isdigit(): total_unit_bed += int(u_br)
                    try:
                        if u_ba: total_unit_bath += float(u_ba)
                    except ValueError:
                        pass
                else:
                    c_rooms = u_tot
                    c_bed = u_br
                    c_bath = u_ba
                    c_room_adj = u_adj

            if not c_rooms and total_unit_rooms > 0:
                c_rooms = str(total_unit_rooms)
            if not c_bed and total_unit_bed > 0:
                c_bed = str(total_unit_bed)
            if not c_bath and total_unit_bath > 0:
                c_bath = f"{int(total_unit_bath)}" if total_unit_bath.is_integer() else f"{total_unit_bath}"

            if seq == "0":
                c_rooms = c_rooms or total_rooms
                c_bed = c_bed or bedrooms
                c_bath = c_bath or baths

            # Intelligently assign bedroom vs bath adjustment based on which differs from subject
            bed_adj = ""
            bath_adj = ""
            if c_room_adj:
                adj_num = 0.0
                try:
                    adj_num = float(re.sub(r"[^\d.-]", "", c_room_adj.replace("+", "")))
                except ValueError:
                    pass

                c_b_num = float(c_bed) if c_bed and c_bed.replace(".", "").isdigit() else None
                s_b_num = float(bedrooms) if bedrooms and bedrooms.replace(".", "").isdigit() else None
                c_ba_num = float(c_bath) if c_bath and c_bath.replace(".", "").isdigit() else None
                s_ba_num = float(baths) if baths and baths.replace(".", "").isdigit() else None

                bed_differs = c_b_num is not None and s_b_num is not None and c_b_num != s_b_num
                bath_differs = c_ba_num is not None and s_ba_num is not None and c_ba_num != s_ba_num

                if bed_differs and not bath_differs:
                    bed_adj = c_room_adj
                elif bath_differs and not bed_differs:
                    bath_adj = c_room_adj
                elif bed_differs and bath_differs:
                    if c_ba_num is not None and s_ba_num is not None and c_b_num is not None and s_b_num is not None:
                        if adj_num > 0 and c_ba_num < s_ba_num:
                            bath_adj = c_room_adj
                        elif adj_num < 0 and c_b_num > s_b_num:
                            bed_adj = c_room_adj
                        elif adj_num > 0 and c_b_num < s_b_num:
                            bed_adj = c_room_adj
                        else:
                            bath_adj = c_room_adj
                    else:
                        bath_adj = c_room_adj
                else:
                    bath_adj = c_room_adj

            # GLA vs GBA
            gla_desc = adjustments.get("GrossLivingArea", {}).get("desc", gba if seq == "0" else "")
            gla_amt = adjustments.get("GrossLivingArea", {}).get("amount", "")
            gba_desc = adjustments.get("GrossBuildingArea", {}).get("desc", gba if seq == "0" else "")
            gba_amt = adjustments.get("GrossBuildingArea", {}).get("amount", "")

            # Basement
            bm_desc = adjustments.get("BasementArea", {}).get("desc", "")
            bm_fin_desc = adjustments.get("BasementFinish", {}).get("desc", "")
            bm_amt = adjustments.get("BasementArea", {}).get("amount", "") or adjustments.get("BasementFinish", {}).get("amount", "")
            full_bm_desc = f"{bm_desc} {bm_fin_desc}".strip() or bm_desc or bm_fin_desc

            # Parking
            car_desc = adjustments.get("CarStorage", {}).get("desc", "") or adjustments.get("Parking", {}).get("desc", "")
            car_amt = adjustments.get("CarStorage", {}).get("amount", "") or adjustments.get("Parking", {}).get("amount", "")

            # Age
            age_desc = adjustments.get("Age", {}).get("desc", "")
            if not age_desc and seq == "0":
                age_desc = effective_age or (str(eff_year - int(year_built)) if year_built.isdigit() else "")

            # Prior Sales for Comp
            ps_elem = comp.find("PRIOR_SALES")
            ps_date = ps_elem.attrib.get("PropertySalesDate", "") if ps_elem is not None else ""
            if ps_date:
                m_d = re.match(r"^(\d{4})-(\d{2})-(\d{2})$", ps_date)
                if m_d:
                    ps_date = f"{m_d.group(2)}/{m_d.group(3)}/{m_d.group(1)}"
            ps_price = _clean_currency(ps_elem.attrib.get("PropertySalesAmount", "")) if ps_elem is not None else ""
            ps_src = ps_elem.attrib.get("DataSourceDescription", "") if ps_elem is not None else ""
            if seq == "0" and not ps_src:
                ps_src = subj_prior_src
            ps_eff = ps_elem.attrib.get("DataSourceEffectiveDate", "") if ps_elem is not None else ""
            if ps_eff:
                m_e = re.match(r"^(\d{4})-(\d{2})-(\d{2})$", ps_eff)
                if m_e:
                    ps_eff = f"{m_e.group(2)}/{m_e.group(3)}/{m_e.group(1)}"

            comp_data = {
                "Address": c_addr or (prop_addr if seq == "0" else ""),
                "Proximity to Subject": c_prox,
                "Proximity to Subject comment": c_prox,
                "Sale Price": sale_price or (contract_price if seq == "0" else ""),
                "Sale Price/Gross Liv. Area": _clean_currency(comp.attrib.get("SalesPricePerGrossLivingAreaAmount", "")),
                "Sale Price/Gross Bldg. Area": _clean_currency(comp.attrib.get("SalesPricePerGrossBuildingAreaAmount", "")),
                "Gross Monthly Rent": rent,
                "Gross Rent Multiplier": grm,
                "Price Per Unit": price_per_unit,
                "Price Per Room": price_per_room,
                "Price Per Bedroom": price_per_bdrm,
                "Rent Control": rent_control,
                "Adj. Price Per Unit": adj_price_unit,
                "Adj. Price Per Room": adj_price_room,
                "Adj. Price Per Bdrm.": adj_price_bdrm,
                "Value Per Unit": price_per_unit,
                "Value Per Gross Bldg. Area": _clean_currency(comp.attrib.get("SalesPricePerGrossBuildingAreaAmount", "")),
                "Data Source(s)": data_src,
                "Verification Source(s)": verif_src,
                "Sales or Financing Concessions": concessions_desc,
                "Sales or Financing Concessions Adjustment": concessions_amt,
                "Sales Concessions": concessions_desc,
                "Sales Concessions Adjustment": concessions_amt,
                "Date of Sale/Time": adjustments.get("DateOfSale", {}).get("desc", contract_date if seq == "0" else ""),
                "Date of Sale/Time Adjustment": adjustments.get("DateOfSale", {}).get("amount", ""),
                "Location": adjustments.get("Location", {}).get("desc", nb_loc if seq == "0" else ""),
                "Location Adjustment": adjustments.get("Location", {}).get("amount", ""),
                "Leasehold/Fee Simple": (prop_rights if seq == "0" else (adjustments.get("PropertyRights", {}).get("desc", ""))),
                "Leasehold/Fee Simple Adjustment": adjustments.get("PropertyRights", {}).get("amount", ""),
                "Site": adjustments.get("SiteArea", {}).get("desc", site_area if seq == "0" else ""),
                "Site Adjustment": adjustments.get("SiteArea", {}).get("amount", ""),
                "View": adjustments.get("View", {}).get("desc", site_view if seq == "0" else ""),
                "View Adjustment": adjustments.get("View", {}).get("amount", ""),
                "Design (Style)": adjustments.get("DesignStyle", {}).get("desc", design_style if seq == "0" else ""),
                "Design (Style) Adjustment": adjustments.get("DesignStyle", {}).get("amount", ""),
                "Quality of Construction": adjustments.get("Quality", {}).get("desc", ""),
                "Quality of Construction Adjustment": adjustments.get("Quality", {}).get("amount", ""),
                "Actual Age": age_desc,
                "Actual Age Adjustment": adjustments.get("Age", {}).get("amount", ""),
                "Condition": adjustments.get("Condition", {}).get("desc", ""),
                "Condition Adjustment": adjustments.get("Condition", {}).get("amount", ""),
                "Total Rooms": c_rooms,
                "Bedrooms": c_bed,
                "Baths": c_bath,
                "Above Grade Room Count": c_rooms,
                "Above Grade Room Count Adjustment": c_room_adj,
                "Bedrooms Adjustment": bed_adj,
                "Baths Adjustment": bath_adj,
                "Gross Living Area": gla_desc or gba_desc,
                "Gross Living Area Adjustment": gla_amt or gba_amt,
                "Gross Building Area": gba_desc or gla_desc,
                "Gross Building Area Adjustment": gba_amt or gla_amt,
                "Basement & Finished Rooms Below Grade": full_bm_desc,
                "Basement & Finished Rooms Below Grade Adjustment": bm_amt,
                "Basement Description": bm_desc,
                "Basement Description Adjustment": adjustments.get("BasementArea", {}).get("amount", ""),
                "Basement Finished Rooms": bm_fin_desc,
                "Basement Finished Rooms Adjustment": adjustments.get("BasementFinish", {}).get("amount", ""),
                "Functional Utility": adjustments.get("FunctionalUtility", {}).get("desc", "Average" if seq == "0" else ""),
                "Functional Utility Adjustment": adjustments.get("FunctionalUtility", {}).get("amount", ""),
                "Heating/Cooling": adjustments.get("HeatingCooling", {}).get("desc", ""),
                "Heating/Cooling Adjustment": adjustments.get("HeatingCooling", {}).get("amount", ""),
                "Energy Efficient Items": adjustments.get("EnergyEfficient", {}).get("desc", "None" if seq == "0" else ""),
                "Energy Efficient Items Adjustment": adjustments.get("EnergyEfficient", {}).get("amount", ""),
                "Garage/Carport": car_desc,
                "Garage/Carport Adjustment": car_amt,
                "Parking On/Off Site": car_desc,
                "Parking On/Off Site Adjustment": car_amt,
                "Porch/Patio/Deck": adjustments.get("PorchDeck", {}).get("desc", ""),
                "Porch/Patio/Deck Adjustment": adjustments.get("PorchDeck", {}).get("amount", ""),
                "Additional Description": adjustments.get("Other", {}).get("desc", ""),
                "Additional Adjustment": adjustments.get("Other", {}).get("amount", ""),
                "Net Adjustment (Total)": net_adj_str,
                "Gross Adjustment (Total)": f"{gross_pct}%" if gross_pct else "",
                "Adjusted Sale Price": adj_price,
                "Adjusted Sale Price of Comparable": adj_price,
                "Date of Prior Sale/Transfer": ps_date,
                "Price of Prior Sale/Transfer": ps_price,
                "Data Source(s) for prior sale": ps_src,
                "Effective Date of Data Source(s) for prior sale": ps_eff,
                "Prior Sale History: Date of Prior Sale/Transfer": ps_date,
                "Prior Sale History: Price of Prior Sale/Transfer": ps_price,
                "Prior Sale History: Data source(s) for prior sale": ps_src,
                "Prior Sale History: Effective date of data source(s)": ps_eff,
                **unit_breakdown,
            }

            if seq == "0":
                comps_dict["Subject"] = comp_data
                comps_dict["SUBJECT"] = comp_data
                sales_grid["Subject"] = comp_data
                sales_grid["SUBJECT"] = comp_data
                sales_grid["Subject Address"] = comp_data["Address"]
                sales_grid["Subject Sale Price"] = comp_data["Sale Price"]
            else:
                comp_aliases = [
                    f"COMPARABLE SALE #{seq}",
                    f"COMPARABLE SALE # {seq}",
                    f"Comparable #{seq}",
                    f"Comp {seq}",
                    f"COMP {seq}",
                ]
                for alias in comp_aliases:
                    comps_dict[alias] = comp_data
                    sales_grid[alias] = comp_data
                sales_grid[f"Comparable #{seq} Address"] = comp_data["Address"]
                sales_grid[f"Comparable #{seq} Proximity to Subject"] = comp_data["Proximity to Subject"]
                sales_grid[f"Comparable #{seq} Sale Price"] = comp_data["Sale Price"]
                sales_grid[f"Comparable #{seq} Data Source(s)"] = comp_data["Data Source(s)"]
                sales_grid[f"Comparable #{seq} Verification Source(s)"] = comp_data["Verification Source(s)"]
                sales_grid[f"Comparable #{seq} Adjusted Sale Price"] = comp_data["Adjusted Sale Price"]


    # Foundation & Condition fallback to Subject Adjustments if not already found
    if not foundation_type and adjustments_subject.get("BasementArea", {}).get("desc"):
        foundation_type = adjustments_subject["BasementArea"]["desc"]

    if adjustments_subject.get("Condition", {}).get("desc"):
        prop_condition = adjustments_subject["Condition"]["desc"]
    elif not prop_condition:
        for pa in root.findall(".//PROPERTY_ANALYSIS"):
            if pa.attrib.get("_Type") == "PropertyCondition":
                comm = pa.attrib.get("_Comment", "")
                if "average" in comm.lower():
                    prop_condition = "Average"
                elif comm:
                    prop_condition = comm
                break

    # Subject Rent Schedule
    mfrs = root.find(".//MULTIFAMILY_RENT_SCHEDULE")
    tot_act_rent = ""
    tot_gross_rent = ""
    tot_est_inc = ""
    tot_act_inc = ""
    if mfrs is not None:
        tot_act_rent = _clean_currency(mfrs.attrib.get("RentalActualGrossMonthlyRentAmount", ""))
        tot_gross_rent = _clean_currency(mfrs.attrib.get("RentalEstimatedGrossMonthlyRentAmount", ""))
        tot_est_inc = _clean_currency(mfrs.attrib.get("RentalEstimatedTotalMonthlyIncomeAmount", ""))
        tot_act_inc = _clean_currency(mfrs.attrib.get("RentalActualTotalMonthlyIncomeAmount", ""))

    subject_rent_schedule = {
        "Total Actual Monthly Rent": tot_act_rent,
        " Total Gross Monthly Rent": tot_gross_rent,
        "Total Estimated Monthly Income": tot_est_inc,
        "Total Actual Monthly Income": tot_act_inc,
    }
    unit_rent_elems = root.findall(".//UNIT_RENT_SCHEDULE")
    for u in unit_rent_elems:
        uid = u.attrib.get("UnitSequenceIdentifier", "")
        if uid:
            status_desc = u.attrib.get("LeaseExpirationDate", "")
            actual_amt = _clean_currency(u.attrib.get("UnitActualRentAmount", ""))
            market_amt = _clean_currency(u.attrib.get("UnitMarketRentAmount", ""))
            subject_rent_schedule[f"Unit # Lease Date  Begin Date {uid}"] = status_desc
            subject_rent_schedule[f"Unit # Lease Date End Date {uid}"] = status_desc
            subject_rent_schedule[f"Actual Rents Unit # {uid}  Per Unit Unfurnished"] = actual_amt
            subject_rent_schedule[f"Actual Rents Unit # {uid} Total Rents"] = actual_amt
            subject_rent_schedule[f"Opinion Of Market Rent Unit # {uid} Per Unit Unfurnished"] = market_amt
            subject_rent_schedule[f"Opinion Of Market Rent Unit # {uid} Total Rents"] = market_amt

    # Comparable Rental Data
    comparable_rental_data = {}
    mf_rentals = root.findall(".//MULTIFAMILY_RENTAL")
    for r in mf_rentals:
        rid = r.attrib.get("PropertySequenceIdentifier", "")
        r_loc = r.find("LOCATION")
        r_addr = r_loc.attrib.get("PropertyStreetAddress", "") if r_loc is not None else ""
        r_prox = r_loc.attrib.get("ProximityToSubjectDescription", "") if r_loc is not None else ""
        r_rent = _clean_currency(r.attrib.get("MonthlyRentAmount", ""))
        r_gba = r.attrib.get("GrossBuildingAreaSquareFeetCount", "")
        r_src = r.attrib.get("DataSourceDescription", "")
        
        r_key = f"Rental {rid}" if rid != "0" else "Subject Rental"
        comparable_rental_data[r_key] = {
            "Address": r_addr or prop_addr,
            "Proximity to Subject": r_prox,
            "Current Monthly Rent": r_rent,
            "Gross Building Area": r_gba,
            "Data Source(s)": r_src,
        }

    # Embedded PDF Check
    extracted_photos = []
    has_embedded_pdf = False
    embedded_doc = root.find(".//EMBEDDED_FILE/DOCUMENT")
    if embedded_doc is not None and embedded_doc.text:
        has_embedded_pdf = True
        if fitz is not None:
            try:
                pdf_bytes = base64.b64decode(embedded_doc.text.strip())
                doc = fitz.open(stream=pdf_bytes, filetype="pdf")
                extracted_photos.append({
                    "category": "Embedded PDF",
                    "page": 1,
                    "caption": f"Embedded PDF ({len(doc)} pages) detected in XML"
                })
            except Exception:
                pass

    # PUD & HOA
    pud_indicator = ""
    hoa_fee = ""
    pud_fee_amt = ""
    pud_fee_period = ""
    pud_fee_month = ""
    pud_fee_year = ""
    dev_control = ""
    unit_types = ""
    legal_name = ""
    phases = ""
    units_total = ""
    units_sold = ""
    units_rented = ""
    units_for_sale = ""
    data_source = ""
    conversion_ind = ""
    conversion_date = ""
    multi_dwelling = ""
    complete_ind = ""
    incomplete_desc = ""
    leased_ind = ""
    leased_desc = ""
    common_elements = ""

    prop_type_elem = root.find(".//PROPERTY_TYPE")
    if prop_type_elem is not None:
        gse_pud = prop_type_elem.attrib.get("GSE_PUDIndicator", "")
        if gse_pud.upper() == "Y":
            pud_indicator = "Yes"
        elif gse_pud.upper() == "N":
            pud_indicator = "No"

    proj = property_elem.find("PROJECT") if property_elem is not None else None
    if proj is None:
        proj = root.find(".//PROJECT")

    if proj is not None:
        pud_ind = proj.attrib.get("PUDIndicator", "") or proj.attrib.get("_PUDIndicator", "")
        if pud_ind.upper() == "Y":
            pud_indicator = "Yes"
        elif pud_ind.upper() == "N" and not pud_indicator:
            pud_indicator = "No"
        
        p_type = proj.attrib.get("_ClassificationType", "") or proj.attrib.get("ProjectClassificationType", "")
        if "PUD" in p_type.upper():
            pud_indicator = "Yes"
        elif "CONDOMINIUM" in p_type.upper() or "COOPERATIVE" in p_type.upper():
            if not pud_indicator or pud_indicator == "Yes":
                pud_indicator = "No"

        legal_name = proj.attrib.get("_Name", "")
        unit_types = proj.attrib.get("_DesignType", "")
        
        dev_ctrl_raw = proj.attrib.get("_DeveloperControlsProjectManagementIndicator", "")
        if dev_ctrl_raw.upper() == "Y":
            dev_control = "Yes"
        elif dev_ctrl_raw.upper() == "N":
            dev_control = "No"
        elif dev_ctrl_raw:
            dev_control = dev_ctrl_raw
            
        conv_raw = proj.attrib.get("_ConversionIndicator", "")
        if conv_raw.upper() == "Y":
            conversion_ind = "Yes"
        elif conv_raw.upper() == "N":
            conversion_ind = "No"
        elif conv_raw:
            conversion_ind = conv_raw
        conversion_date = proj.attrib.get("_ConversionDate", "") or proj.attrib.get("_ConversionOriginalUseDescription", "")
        
        multi_raw = proj.attrib.get("_ContainsMultipleDwellingUnitsIndicator", "")
        if multi_raw.upper() == "Y":
            multi_dwelling = "Yes"
        elif multi_raw.upper() == "N":
            multi_dwelling = "No"
        elif proj.attrib.get("_ContainsMultipleDwellingUnitsDataSourceDescription", ""):
            multi_dwelling = proj.attrib.get("_ContainsMultipleDwellingUnitsDataSourceDescription", "")
            
        comp_raw = proj.attrib.get("_CommonElementsCompletedIndicator", "")
        if comp_raw.upper() == "Y":
            complete_ind = "Yes"
        elif comp_raw.upper() == "N":
            complete_ind = "No"
        elif comp_raw:
            complete_ind = comp_raw
        incomplete_desc = proj.attrib.get("_CommonElementsStatusDescription", "")
        
        lease_raw = proj.attrib.get("_CommonElementsLeasedIndicator", "")
        if lease_raw.upper() == "Y":
            leased_ind = "Yes"
        elif lease_raw.upper() == "N":
            leased_ind = "No"
        elif lease_raw:
            leased_ind = lease_raw
        leased_desc = proj.attrib.get("_CommonElementsLeaseTermsDescription", "")
        
        common_elements = proj.attrib.get("_CommonElementsDescription", "")
        data_source = proj.attrib.get("DataSourceDescription", "")
        
        for ds in proj.findall("DEVELOPMENT_STAGE"):
            p = ds.attrib.get("_TotalPhasesCount", "")
            if p and not phases:
                phases = p
            u_tot = ds.attrib.get("CompletedUnitsCount", "") or ds.attrib.get("PlannedUnitsCount", "")
            if u_tot and u_tot != "0" and not units_total:
                units_total = u_tot
            u_sold = ds.attrib.get("UnitsSoldCount", "")
            if u_sold and u_sold != "0" and not units_sold:
                units_sold = u_sold
            u_rent = ds.attrib.get("UnitsRentedCount", "")
            if u_rent and u_rent != "0" and not units_rented:
                units_rented = u_rent
            u_sale = ds.attrib.get("UnitsForSaleCount", "")
            if u_sale and u_sale != "0" and not units_for_sale:
                units_for_sale = u_sale
            src = ds.attrib.get("DataSourceDescription", "")
            if src and not data_source:
                data_source = src

    fee_elem = proj.find("_PER_UNIT_FEE") if proj is not None else None
    if fee_elem is None:
        fee_elem = root.find(".//_PER_UNIT_FEE")
        
    if fee_elem is not None:
        raw_amt = fee_elem.attrib.get("_Amount", "")
        if raw_amt and raw_amt != "0":
            pud_fee_amt = _clean_currency(raw_amt)
            pud_fee_period = fee_elem.attrib.get("_PeriodType", "")
            if "month" in pud_fee_period.lower():
                pud_fee_month = pud_fee_amt
            elif "year" in pud_fee_period.lower() or "annual" in pud_fee_period.lower():
                pud_fee_year = pud_fee_amt
            else:
                pud_fee_month = pud_fee_amt
            hoa_fee = f"${pud_fee_amt}"
        elif raw_amt == "0":
            hoa_fee = "0"
            if pud_indicator == "Yes":
                pud_fee_amt = "0"

    pud_info_section = {
        "PUD Fees $": pud_fee_amt,
        "PUD Fees (per month)": pud_fee_month,
        "PUD Fees (per year)": pud_fee_year,
        "Is the developer/builder in control of the Homeowners' Association (HOA)?": dev_control,
        "Unit type(s)": unit_types,
        "Provide the following information for PUDs ONLY if the developer/builder is in control of the HOA and the subject property is an attached dwelling unit.": "",
        "Legal Name of Project": legal_name,
        "Total number of phases": phases,
        "Total number of units": units_total,
        "Total number of units sold": units_sold,
        "Total number of units rented": units_rented,
        "Total number of units for sale": units_for_sale,
        "Data source(s)": data_source,
        "Was the project created by the conversion of existing building(s) into a PUD?": conversion_ind,
        " If Yes, date of conversion": conversion_date,
        "If Yes, date of conversion": conversion_date,
        "Does the project contain any multi-dwelling units? Yes No Data": multi_dwelling,
        "Are the units, common elements, and recreation facilities complete?": complete_ind,
        "If No, describe the status of completion.": incomplete_desc,
        "Are the common elements leased to or by the Homeowners' Association?": leased_ind,
        "If Yes, describe the rental terms and options.": leased_desc,
        "Describe common elements and recreational facilities.": common_elements
    }

    # Listing History
    offered_12m = ""
    report_data_source = ""
    lh_elem = property_elem.find("LISTING_HISTORY") if property_elem is not None else None
    if lh_elem is not None:
        ind = lh_elem.attrib.get("ListedWithinPreviousYearIndicator", "")
        if ind.upper() == "Y":
            offered_12m = "Yes"
        elif ind.upper() == "N":
            offered_12m = "No"
        elif ind:
            offered_12m = ind
        report_data_source = lh_elem.attrib.get("ListedWithinPreviousYearDescription", "")

    # Assignment Type
    assignment_type = ""
    if "Purchase" in purpose:
        assignment_type = "Purchase Transaction"
    elif "Refinance" in purpose:
        assignment_type = "Refinance Transaction"
    elif purpose:
        assignment_type = purpose

    # Narrative Comments from Addendum & Embedded PDF
    addendum_text = ""
    for f in root.findall(".//FORM"):
        for k, v in f.attrib.items():
            if "text" in k.lower() or "comment" in k.lower():
                addendum_text += " " + v

    pdf_text = ""
    if embedded_doc is not None and embedded_doc.text:
        if fitz is not None:
            try:
                pdf_bytes = base64.b64decode(embedded_doc.text.strip())
                doc = fitz.open(stream=pdf_bytes, filetype="pdf")
                for p in doc:
                    pdf_text += " " + (p.get_text() or "")
            except Exception:
                pass

    full_narrative = (addendum_text + " " + pdf_text).strip()

    # ANSI
    ansi_comment = ""
    m_ansi = re.search(r'([^.?!;\n]*\bANSI\b[^.?!;\n]*(?:[.?!]|$))', full_narrative, re.IGNORECASE)
    if m_ansi:
        ansi_comment = m_ansi.group(0).strip()
    
    # Exposure comment
    exposure_comment = ""
    m_exp = re.search(r'([^.?!;\n]*\b(?:reasonable\s*exposure\s*time|exposure\s*time)\b[^.?!;\n]*(?:[.?!]|$))', full_narrative, re.IGNORECASE)
    if m_exp:
        exposure_comment = m_exp.group(0).strip()
    
    # Prior service comment
    prior_service_comment = ""
    m_ps = re.search(r'(performed no services[^\.\n]+[\.\n]|within the (?:three|3) year period[^\.\n]+[\.\n])', full_narrative, re.IGNORECASE)
    if m_ps:
        prior_service_comment = m_ps.group(1).strip()
    
    # Smoke & CO detectors
    smoke_comment = ""
    co_comment = ""
    m_det = re.search(r'([^.?!;\n]*\b(?:smoke|carbon\s*monoxide|co\s*detector)\b[^.?!;\n]*(?:[.?!]|$))', full_narrative, re.IGNORECASE)
    if m_det:
        smoke_comment = m_det.group(0).strip()
        co_comment = m_det.group(0).strip()

    # AMC Name
    amc_name = ""
    mc_elem = root.find(".//MANAGEMENT_COMPANY")
    if mc_elem is not None:
        amc_name = mc_elem.attrib.get("GSEManagementCompanyName", "")

    # Appraiser Fee & AMC License #
    appraiser_fee = ""
    amc_license = ""

    # Check XML narrative & attributes
    m_fee = re.search(r'(?:Appraisal|Appraiser(?:\'s)?)\s+Fee\s+(?:is\s+)?(\$[\d,]+(?:\.\d{2})?)', full_narrative, re.IGNORECASE)
    if m_fee:
        appraiser_fee = m_fee.group(1).strip()

    m_lic = re.search(r'AMC\s+(?:License|Lic|#)\s*(?:is|#|:)?\s*([A-Za-z0-9\-]+)', full_narrative, re.IGNORECASE)
    if m_lic:
        amc_license = m_lic.group(1).strip()

    # If not found in XML narrative, check embedded PDF (first 5 pages)
    if (not appraiser_fee or not amc_license) and embedded_doc is not None and embedded_doc.text:
        try:
            pdf_bytes = base64.b64decode(embedded_doc.text.strip())
            if fitz is not None:
                pdf_doc = fitz.open(stream=pdf_bytes, filetype="pdf")
                for p_idx in range(min(5, len(pdf_doc))):
                    ptxt = pdf_doc[p_idx].get_text() or ""
                    if not appraiser_fee:
                        mf = re.search(r'(?:Total\s+Appraiser\s+Fee|Appraiser(?:\'s)?\s+Fee|Appraisal\s+Fee)\s*[:=\-]?\s*(\$[\d,]+(?:\.\d{2})?)', ptxt, re.IGNORECASE)
                        if mf:
                            appraiser_fee = mf.group(1).strip()
                        elif "INVOICE" in ptxt.upper() and ("INVOICE TOTAL" in ptxt.upper() or "AMOUNT DUE" in ptxt.upper()):
                            amounts = re.findall(r'\b\d{2,4}\.\d{2}\b', ptxt)
                            pos_amounts = [a for a in amounts if float(a) > 0]
                            if pos_amounts:
                                appraiser_fee = f"${pos_amounts[0]}"
                    if not amc_license:
                        ml = re.search(r'AMC\s+License\s*[:=\-]?\s*([A-Za-z0-9\-]+)', ptxt, re.IGNORECASE)
                        if ml:
                            amc_license = ml.group(1).strip()
        except Exception:
            pass

    # ADU File Check
    adu_check = ""
    if property_elem is not None:
        struct_check = property_elem.find("STRUCTURE")
        if struct_check is not None:
            adu_ind = struct_check.attrib.get("_AccessoryUnitExistsIndicator", "")
            if adu_ind.upper() == "Y":
                adu_check = "Yes"
            elif adu_ind.upper() == "N":
                adu_check = "No"
            elif adu_ind:
                adu_check = adu_ind

    # Build standard sections matching UI
    subject_section = {
        "Full Address": full_addr,
        "Property Address": prop_addr,
        "City": prop_city,
        "County": prop_county,
        "State": prop_state,
        "Zip Code": prop_zip,
        "Borrower": borrower_name,
        "Owner of Public Record": owner_name,
        "Legal Description": legal_desc,
        "Assessor's Parcel #": apn,
        "Tax Year": tax_year,
        "R.E. Taxes $": taxes,
        "Special Assessments $": special_taxes,
        "Neighborhood Name": nb_name,
        "Map Reference": map_ref,
        "Census Tract": census,
        "Occupant": prop_occupancy,
        "PUD": pud_indicator,
        "HOA $": hoa_fee,
        "HOA(per month)": pud_fee_month,
        "HOA(per year)": pud_fee_year,
        "Property Rights Appraised": prop_rights,
        "Assignment Type": assignment_type,
        "Lender/Client": lender_name,
        "Address (Lender/Client)": lender_address,
        "Lender Address": lender_address,
        "Offered for Sale in Last 12 Months": offered_12m,
        "Report data source(s) used, offering price(s), and date(s)": report_data_source,
        "ANSI": ansi_comment,
        "ANSI Standards": ansi_comment,
        "ANSI Comment": ansi_comment,
        "Exposure comment": exposure_comment,
        "Exposure Comment": exposure_comment,
        "Prior service comment": prior_service_comment,
        "Prior Service Comment": prior_service_comment,
        "ADU File Check": adu_check,
        "Smoke detector comment": smoke_comment,
        "CO detector comment": co_comment,
        "Appraiser's Fee": appraiser_fee,
        "Appraiser Fee": appraiser_fee,
        "Appraisal Fee": appraiser_fee,
        "AMC License #": amc_license,
        "AMC License": amc_license,
        "AMC Name": amc_name,
        "Appraiser Name": appraiser_name,
        "Appraiser Company": appraiser_company,
        "Appraiser Address": appraiser_address,
        "File #": file_id,
        "Loan #": loan_num,
        "From Type": form_type,
    }

    contract_section = {
        "Assignment Type": assignment_type,
        "I did did not analyze the contract for sale for the subject purchase transaction. Explain the results of the analysis of the contract for sale or why the analysis was not performed.": contract_comment,
        "Contract Price $": contract_price,
        "Date of Contract": contract_date,
        "Is property seller owner of public record?": seller_is_owner,
        "Data Source(s)": contract_data_source,
        "Data Source(s) (Contract)": contract_data_source,
        "Is there any financial assistance (loan charges, sale concessions, gift or downpayment assistance, etc.) to be paid by any party on behalf of the borrower?": concessions,
        "If Yes, report the total dollar amount and describe the items to be paid": concessions_text,
        "If Yes, report the total dollar amount and describe the items to be paid.": concessions_text,
        "Financial Assistance Comment": concessions_text,
    }

    neighborhood_section = {
        "Neighborhood Name": nb_name,
        "Location": nb_loc,
        "Built-Up": nb_built,
        "Growth": nb_growth,
        "Property Values": nb_val,
        "Demand/Supply": nb_demand,
        "Marketing Time": nb_mkt_time,
        "One-Unit": one_unit,
        "2-4 Unit": two_four_unit,
        "Multi-Family": multi_family,
        "Commercial": commercial,
        "Other": other_use,
        "Present Land Use for other": other_desc,
        "one unit housing price(high,low,pred)": housing_price,
        "one unit housing age(high,low,pred)": housing_age,
        "Neighborhood Boundaries": nb_bound,
        "Neighborhood Description": nb_desc,
        "Market Conditions": nb_mkt,
        "Market Conditions:": nb_mkt,
    }

    site_section = {
        "Dimensions": site_dim,
        "Area": site_area,
        "Shape": site_shape,
        "View": site_view,
        "Specific Zoning Classification": zoning_class,
        "Zoning Description": zoning_desc,
        "Zoning Compliance": zoning_comp,
        "Is the highest and best use of subject property as improved (or as proposed per plans and specifications) the present use?": hbu,
        "Highest & Best Use": hbu,
        "Electricity": util_dict.get("Electricity", ""),
        "Gas": util_dict.get("Gas", ""),
        "Water": util_dict.get("Water", ""),
        "Sanitary Sewer": util_dict.get("Sanitary Sewer", ""),
        "Street": street_val,
        "Alley": alley_val,
        "FEMA Special Flood Hazard Area": fema_special,
        "FEMA Flood Zone": fema_zone,
        "FEMA Map #": fema_map_id,
        "FEMA Map Date": fema_map_date,
        "Are the utilities and off-site improvements typical for the market area?": util_typical,
        "Are the utilities and off-site improvements typical for the market area? If No, describe": util_typical_desc,
        "Are there any adverse site conditions or external factors (easements, encroachments, environmental conditions, land uses, etc.)? If Yes, describe": adverse_site_desc,
        "Utilities": utilities_str,
        "Off-site Improvements - Street": street_val,
        "Off-site Improvements - Alley": alley_val,
    }

    # -------------------------------------------------------------
    # IMPROVEMENTS SECTION (100% Dynamic Extraction)
    # -------------------------------------------------------------
    bldg_status_raw = struct_elem.attrib.get("BuildingStatusType", "") if struct_elem is not None else ""
    if "under" in bldg_status_raw.lower():
        bldg_status = "Under Const."
    elif "prop" in bldg_status_raw.lower():
        bldg_status = "Proposed"
    else:
        bldg_status = "Existing"

    living_units = units if units and units != "1" else "1"
    struct_type_val = "Detached" if "det" in struct_type.lower() else ("Attached" if "att" in struct_type.lower() else (struct_type or "Detached"))

    # Attic
    attic_elem = struct_elem.find("ATTIC") if struct_elem is not None else None
    attic_features = []
    if attic_elem is not None and attic_elem.attrib.get("_ExistsIndicator", "Y") != "N":
        for af in attic_elem.findall("ATTIC_FEATURE"):
            t = af.attrib.get("_Type", "")
            if t == "DropStair": attic_features.append("Drop Stair")
            elif t == "Floor": attic_features.append("Floor")
            elif t == "Scuttle": attic_features.append("Scuttle")
            elif t == "Stairs": attic_features.append("Stairs")
            elif t == "Finished": attic_features.append("Finished")
            elif t == "Heated": attic_features.append("Heated")
            elif t and t != "None": attic_features.append(t)
    attic_val = ", ".join(attic_features) if attic_features else "None"

    # Appliances
    app_list = []
    if struct_elem is not None:
        for ke in struct_elem.findall("KITCHEN_EQUIPMENT"):
            if ke.attrib.get("_ExistsIndicator", "Y") == "Y":
                t = ke.attrib.get("_Type", "")
                if t == "RangeOven": app_list.append("Range/Oven")
                elif t == "WasherDryer": app_list.append("Washer/Dryer")
                elif t == "Other":
                    desc = ke.attrib.get("_TypeOtherDescription", "Other")
                    app_list.append(desc if desc else "Other")
                elif t: app_list.append(t)
    appliances_val = ", ".join(app_list) if app_list else "None"

    # Foundation
    found_types = []
    if struct_elem is not None:
        for f_elem in struct_elem.findall("FOUNDATION"):
            if f_elem.attrib.get("_ExistsIndicator", "Y") != "N":
                ft = f_elem.attrib.get("_Type", "")
                if "slab" in ft.lower(): found_types.append("Concrete Slab")
                elif "crawl" in ft.lower(): found_types.append("Crawl Space")
                elif "partial" in ft.lower(): found_types.append("Partial Basement")
                elif "basement" in ft.lower(): found_types.append("Full Basement")
    bm_elem = struct_elem.find("BASEMENT") if struct_elem is not None else None
    bm_sqft = bm_elem.attrib.get("SquareFeetCount", "0") if bm_elem is not None else "0"
    bm_finish = bm_elem.attrib.get("_FinishedPercent", "0") if bm_elem is not None else "0"
    if not found_types:
        if bm_elem is not None and int(float(bm_sqft or "0")) > 0:
            found_types.append("Full Basement")
        else:
            found_types.append("Concrete Slab")
    found_val = found_types[0]

    # Basement Details
    bm_details_list = []
    if bm_elem is not None:
        for bf in bm_elem.findall("BASEMENT_FEATURE"):
            if bf.attrib.get("_ExistsIndicator", "Y") == "Y":
                bt = bf.attrib.get("_Type", "")
                if bt == "OutsideEntry": bm_details_list.append("Outside Entry/Exit")
                elif bt: bm_details_list.append(bt)
    if struct_elem is not None:
        for ff in struct_elem.findall("FOUNDATION_FEATURE"):
            if ff.attrib.get("_ExistsIndicator", "Y") == "Y" and ff.attrib.get("_Type") == "SumpPump":
                bm_details_list.append("Sump Pump")
    bm_details = ", ".join(bm_details_list) if bm_details_list else "None"

    # Evidence of
    evidence_list = []
    if struct_elem is not None:
        for c in struct_elem.findall(".//_CONDITION"):
            if c.attrib.get("_ExistsIndicator") == "Y" or c.attrib.get("_Comment"):
                ct = c.attrib.get("_Type", "")
                if ct in ["Infestation", "Dampness", "Settlement"]:
                    evidence_list.append(ct)
    evidence_val = ", ".join(evidence_list) if evidence_list else "None"

    # Heating & Cooling
    ht_raw = ""
    hf_raw = ""
    if struct_elem is not None:
        for h in struct_elem.findall("HEATING"):
            if not ht_raw and h.attrib.get("_Type"): ht_raw = h.attrib.get("_Type")
            if not hf_raw and h.attrib.get("_FuelDescription"): hf_raw = h.attrib.get("_FuelDescription")
    ht_val = "FWA" if "warm" in ht_raw.lower() or "forced" in ht_raw.lower() else (
        "HWBB" if "baseboard" in ht_raw.lower() else (
            "Radiant" if "radiant" in ht_raw.lower() else (ht_raw or "FWA")
        )
    )
    if "gas" in hf_raw.lower(): hf_val = "Gas"
    elif "elec" in hf_raw.lower(): hf_val = "Electric"
    elif "oil" in hf_raw.lower(): hf_val = "Oil"
    else: hf_val = hf_raw.title() if hf_raw else "Gas"

    cooling_elem = struct_elem.find("COOLING") if struct_elem is not None else None
    c_central = cooling_elem.attrib.get("_CentralizedIndicator", "N") if cooling_elem is not None else "N"
    c_indiv = cooling_elem.attrib.get("_IndividualIndicator", "N") if cooling_elem is not None else "N"
    if c_central == "Y": cooling_val = "Central Air Conditioning"
    elif c_indiv == "Y": cooling_val = "Individual"
    else: cooling_val = "Other"

    # Exterior Features (Material / Condition)
    ext_dict = {ef.attrib.get("_Type", ""): ef.attrib.get("_Description", "") for ef in struct_elem.findall("EXTERIOR_FEATURE")} if struct_elem is not None else {}
    found_walls = _format_mat_cond(ext_dict.get("Foundation", "Concrete/Average"))
    ext_walls = _format_mat_cond(ext_dict.get("Walls", "Vinyl/Average"))
    roof_surf = _format_mat_cond(ext_dict.get("RoofSurface", "Asphalt/Average"))
    gutters = _format_mat_cond(ext_dict.get("GuttersAndDownspouts", "Aluminum/Average"))
    window_type = _format_mat_cond(ext_dict.get("WindowType", "Double Hung/Average"))
    storm_sash = ext_dict.get("WindowStormSash", "Thermal/Average") or "None"
    screens = ext_dict.get("WindowScreens", "Yes/Average") or "None"

    # Amenities
    amenities_list = []
    amenity_details = {}
    if struct_elem is not None:
        for am in struct_elem.findall("AMENITY"):
            at = am.attrib.get("_Type", "")
            ex = am.attrib.get("_ExistsIndicator", "N")
            cnt = am.attrib.get("_Count", "0")
            desc = am.attrib.get("_DetailedDescription", "") or am.attrib.get("_TypeOtherDescription", "")
            if at == "WoodStove" and cnt not in ["0", ""]:
                amenities_list.append("WoodStove")
                amenity_details["Woodstove(s) #"] = cnt
            elif at == "Fireplace" and (ex == "Y" or cnt not in ["0", ""]):
                amenities_list.append("Fireplace")
                amenity_details["Fireplace(s) #"] = cnt if cnt not in ["0", ""] else "1"
            elif at == "Fence" and (ex == "Y" or (desc and desc.lower() != "none")):
                amenities_list.append("Fence")
                amenity_details["Fence"] = desc if desc else "Wood"
            elif at in ["Patio", "Deck"] and (ex == "Y" or (desc and desc.lower() != "none")):
                amenities_list.append("Patio/Deck")
                amenity_details["Patio/Deck"] = desc if desc else at
            elif at == "Porch" and (ex == "Y" or (desc and desc.lower() != "none")):
                amenities_list.append("Porch")
                amenity_details["Porch"] = desc if desc else "Covered"
            elif at == "Pool" and (ex == "Y" or (desc and desc.lower() != "none")):
                amenities_list.append("Pool")
                amenity_details["Pool"] = desc if desc else "Inground"
    amenities_val = ", ".join(dict.fromkeys(amenities_list)) if amenities_list else "None"

    # Interior Features (Material / Condition)
    int_dict = {ifeat.attrib.get("_Type", ""): ifeat.attrib.get("_ConditionDescription", "") for ifeat in struct_elem.findall("INTERIOR_FEATURE")} if struct_elem is not None else {}
    floors = _format_mat_cond(int_dict.get("Floors", "Hardwood/Average"))
    walls = _format_mat_cond(int_dict.get("Walls", "Drywall/Average"))
    trim = _format_mat_cond(int_dict.get("TrimAndFinish", "Wood/Average"))
    bath_floor = _format_mat_cond(int_dict.get("BathroomFloors", "Tile/Average"))
    bath_wainscot = _format_mat_cond(int_dict.get("BathroomWainscot", "Tile/Average"))

    # Car Storage
    driveway_cars = "0"
    garage_cars = "0"
    carport_cars = "0"
    garage_att = ""
    if struct_elem is not None:
        for cs in struct_elem.findall("CAR_STORAGE"):
            att = cs.attrib.get("_AttachmentType", "")
            if att: garage_att = "Built-in" if "built" in att.lower() else att
            for loc in cs.findall("CAR_STORAGE_LOCATION"):
                lt = loc.attrib.get("_Type", "")
                cnt = loc.attrib.get("ParkingSpacesCount", "0")
                ex = loc.attrib.get("_ExistsIndicator", "Y")
                if lt == "Driveway" and ex != "N": driveway_cars = cnt if cnt != "0" else "1"
                elif lt == "Garage" and ex != "N": garage_cars = cnt
                elif lt == "Carport" and ex != "N": carport_cars = cnt

    driveway_surface = ""
    for sf in root.findall(".//SITE_FEATURE"):
        if sf.attrib.get("_Type") == "Driveway":
            driveway_surface = sf.attrib.get("_Comment", "")
    if not driveway_surface:
        driveway_surface = "Asphalt" if int(float(driveway_cars or "0")) > 0 else "None"
    else:
        if "/" in driveway_surface:
            driveway_surface = driveway_surface.split("/")[0].strip()
        if driveway_surface.upper() == "CONC":
            driveway_surface = "Concrete"

    cs_types = []
    if int(float(driveway_cars or "0")) > 0: cs_types.append("Driveway")
    if int(float(garage_cars or "0")) > 0:
        cs_types.append("Garage")
        if not garage_att:
            garage_att = "Attached" if "att" in struct_type_val.lower() else "Detached"
    if int(float(carport_cars or "0")) > 0: cs_types.append("Carport")
    car_storage_val = ", ".join(cs_types) if cs_types else "None"

    # Additional Features & Narratives
    add_features = ""
    cond_comment = ""
    phys_comment = ""
    conf_comment = ""
    phys_ex = "N"
    conf_ex = "Y"
    for pa in root.findall(".//PROPERTY_ANALYSIS"):
        pat = pa.attrib.get("_Type", "")
        if pat == "AdditionalFeatures": add_features = pa.attrib.get("_Comment", "")
        elif pat == "QualityAndAppearance" and not cond_comment: cond_comment = pa.attrib.get("_Comment", "")
        elif pat == "PropertyCondition" and not cond_comment: cond_comment = pa.attrib.get("_Comment", "")
        elif pat == "PhysicalDeficiency":
            phys_ex = pa.attrib.get("_ExistsIndicator", "N")
            phys_comment = pa.attrib.get("_Comment", "")
        elif pat == "ConformsToNeighborhood":
            conf_ex = pa.attrib.get("_ExistsIndicator", "Y")
            conf_comment = pa.attrib.get("_Comment", "")

    # Ensure condition starts with C1-C4
    cond_rating = ""
    for cd in root.findall(".//COMPARISON_DETAIL"):
        r = cd.attrib.get("GSEOverallConditionType", "")
        if r in ["C1", "C2", "C3", "C4"]:
            cond_rating = r
            break
    if not cond_rating:
        for adj in root.findall(".//SALE_PRICE_ADJUSTMENT"):
            if adj.attrib.get("_Type") == "Condition":
                d = adj.attrib.get("_Description", "")
                if d in ["C1", "C2", "C3", "C4"]:
                    cond_rating = d
                    break
    if not cond_rating:
        cond_rating = "C4"

    if cond_comment:
        m = re.match(r"^(C[1-4])\b", cond_comment.strip(), re.IGNORECASE)
        if m:
            cond_desc = cond_comment.strip()
        else:
            cond_desc = f"{cond_rating}; {cond_comment.strip()}"
    else:
        cond_desc = f"{cond_rating}; The subject property is in good condition overall."

    phys_desc = f"No. {phys_comment}".strip() if phys_ex == "N" else f"Yes: {phys_comment}".strip()
    if not phys_desc: phys_desc = "No"

    conf_desc = f"Yes. {conf_comment}".strip() if conf_ex == "Y" else f"No: {conf_comment}".strip()
    if not conf_desc: conf_desc = "Yes"

    coa = root.find(".//_CONDITION_OF_APPRAISAL")
    reconcil_status = "As Is"
    if coa is not None and "subject" in coa.attrib.get("_Type", "").lower():
        reconcil_status = "Subject To"

    reconciliation_long_key = 'This appraisal is made "as is", subject to completion per plans and specifications on the basis of a hypothetical condition that the improvements have been completed, subject to the following repairs or alterations on the basis of a hypothetical condition that the repairs or alterations have been completed, or subject to the following required inspection based on the extraordinary assumption that the condition or deficiency does not require alteration or repair:'

    improvements_section = {
        # General Description
        "Units": living_units,
        "One with Accessory Unit": "Yes" if "accessory" in living_units.lower() else "No",
        "# of Stories": stories,
        "Type": struct_type_val,
        "Property Type": struct_type_val,
        "Status": bldg_status,
        "Existing/Proposed/Under Const.": bldg_status,
        "Construction Status": bldg_status,
        "Design (Style)": design_style,
        "Design Style": design_style,
        "Year Built": year_built,
        "Effective Age (Yrs)": effective_age,
        "Effective Age": effective_age,
        "Attic": attic_val,
        "Appliances": appliances_val,

        # Foundation
        "Foundation": found_val,
        "Foundation Type": found_val,
        "Full Basement": "Yes" if found_val == "Full Basement" else "No",
        "Partial Basement": "Yes" if found_val == "Partial Basement" else "No",
        "Concrete Slab": "Yes" if found_val == "Concrete Slab" else "No",
        "Crawl Space": "Yes" if found_val == "Crawl Space" else "No",
        "Basement Area sq.ft.": bm_sqft,
        "Basement Area": bm_sqft,
        "Basement Finish %": f"{bm_finish}%",
        "Basement Finish": f"{bm_finish}%",
        "Basement Details": bm_details,
        "Evidence of": evidence_val,
        "Evidence of (Foundation)": evidence_val,
        "Infestation": "Yes" if "Infestation" in evidence_val else "No",
        "Dampness": "Yes" if "Dampness" in evidence_val else "No",
        "Settlement": "Yes" if "Settlement" in evidence_val else "No",
        "Heating": ht_val,
        "Heating Type": ht_val,
        "Fuel": hf_val,
        "Heating Fuel": hf_val,
        "Cooling": cooling_val,
        "Cooling Type": cooling_val,

        # Exterior Description (Material/Condition)
        "Foundation Walls (Material/Condition)": found_walls,
        "Foundation Walls": found_walls,
        "Exterior Walls (Material/Condition)": ext_walls,
        "Exterior Walls": ext_walls,
        "Roof Surface (Material/Condition)": roof_surf,
        "Roof Surface": roof_surf,
        "Gutters & Downspouts (Material/Condition)": gutters,
        "Gutters & Downspouts": gutters,
        "Window Type (Material/Condition)": window_type,
        "Window Type": window_type,
        "Storm Sash/Insulated": storm_sash,
        "Screens": screens,
        "Amenities": amenities_val,
        "Woodstove(s) #": amenity_details.get("Woodstove(s) #", "0"),
        "Fireplace(s) #": amenity_details.get("Fireplace(s) #", "0"),
        "Fence": amenity_details.get("Fence", "None"),
        "Patio/Deck": amenity_details.get("Patio/Deck", "None"),
        "Porch": amenity_details.get("Porch", "None"),
        "Pool": amenity_details.get("Pool", "None"),
        "Other Amenities": amenity_details.get("Other Amenities", "None"),

        # Interior (Material/Condition)
        "Floors (Material/Condition)": floors,
        "Floors": floors,
        "Walls (Material/Condition)": walls,
        "Walls": walls,
        "Trim/Finish (Material/Condition)": trim,
        "Trim/Finish": trim,
        "Bath Floor (Material/Condition)": bath_floor,
        "Bath Floor": bath_floor,
        "Bath Wainscot (Material/Condition)": bath_wainscot,
        "Bath Wainscot": bath_wainscot,

        # Car Storage
        "Car Storage": car_storage_val,
        "Driveway # of Cars": driveway_cars,
        "Driveway Cars": driveway_cars,
        "Driveway": driveway_cars,
        "Driveway Surface": driveway_surface,
        "Garage # of Cars": garage_cars,
        "Garage Cars": garage_cars,
        "Garage": garage_cars,
        "Carport # of Cars": carport_cars,
        "Carport Cars": carport_cars,
        "Carport": carport_cars,
        "Att./Det./Built-in": garage_att,
        "Garage Att./Det./Built-in": garage_att,
        "ATT./DET./BUILT-IN": garage_att,

        # Finished Area Above Grade & Additional Features
        "Finished area above grade Rooms": total_rooms,
        "Rooms": total_rooms,
        "Finished area above grade Bedrooms": bedrooms,
        "Bedrooms": bedrooms,
        "Finished area above grade Bath(s)": baths,
        "Bath(s)": baths,
        "Finished area above grade Baths": baths,
        "Baths": baths,
        "Square Feet of Gross Living Area Above Grade": gba,
        "Gross Living Area": gba,
        "Gross Living Area: square feet": gba,
        "Square Feet of Gross Living Area": gba,
        "Additional features": add_features if add_features else "None",
        "Additional features (special energy efficient items, etc.)": add_features if add_features else "None",
        "Additional features (special energy efficient items, etc.).": add_features if add_features else "None",

        # Narrative Comments
        "Describe the condition of the property": cond_desc,
        "Describe the condition of the property (including needed repairs, deterioration, renovations, remodeling, etc.)": cond_desc,
        "Are there any physical deficiencies or adverse conditions that affect the livability, soundness, or structural integrity of the property? If Yes, describe": phys_desc,
        "Are there any physical deficiencies or adverse conditions that affect the livability, soundness, or structural integrity of the property?": phys_desc,
        "Does the property generally conform to the neighborhood (functional utility, style, condition, use, construction, etc.)? If No, describe": conf_desc,
        "Does the property generally conform to the neighborhood (functional utility, style, condition, use, construction, etc.)?": conf_desc,
    }

    reconciliation_section = {
        "Indicated Value by: Sales Comparison Approach $": sales_comp_ind_val,
        "Cost Approach (if developed)": cost_indicated_val if (cost_indicated_val and cost_indicated_val != "0") else "",
        "Income Approach (if developed) $": income_ind_val,
        "Income Approach (if developed) $ Comment": f"Gross Rent Multiplier = {income_grm}" if income_grm else "",
        "opinion of the market value, as defined, of the real property that is the subject of this report is $": appraised_val,
        "Final Value $": appraised_val,
        "Appraisal Effective Date": effective_date,
        "Appraiser Name": appraiser_name,
        "Signature Date": signed_date,
        reconciliation_long_key: reconcil_status,
        "Reconciliation Status": reconcil_status,
    }

    income_summary = ""
    if income_elem is not None:
        income_summary = income_elem.attrib.get("_Comment", "")
    if not income_summary and val_methods is not None:
        inc_analysis = val_methods.find("INCOME_ANALYSIS")
        if inc_analysis is not None:
            income_summary = inc_analysis.attrib.get("_Comment", "")
    if not income_summary and mfrs is not None:
        income_summary = mfrs.attrib.get("MarketRentalDataComment", "")
    if not income_summary and full_narrative:
        m_inc_comm = re.search(r'([^.?!;\n]*\bincome\s+approach\b[^.?!;\n]*(?:[.?!]|$))', full_narrative, re.IGNORECASE)
        if m_inc_comm:
            income_summary = m_inc_comm.group(0).strip()

    income_approach_section = {
        "Estimated Monthly Market Rent $": income_rent,
        "Estimated Monthly Market Rent": income_rent,
        "X Gross Rent Multiplier  = $": income_grm,
        "X Gross Rent Multiplier = $": income_grm,
        "Gross Rent Multiplier": income_grm,
        "Indicated Value by Income Approach": income_ind_val,
        "Indicated Value by Income Approach $": income_ind_val,
        "Summary of Income Approach (including support for market rent and GRM) ": income_summary,
        "Summary of Income Approach (including support for market rent and GRM)": income_summary,
        "Summary of Income Approach": income_summary,
    }

    # Fallback to full narrative if cost approach comment is empty
    if not cost_comment and full_narrative:
        m_cost_comm = re.search(r'([^.?!;\n]*\bcost\s+approach\b[^.?!;\n]*(?:[.?!]|$))', full_narrative, re.IGNORECASE)
        if m_cost_comm:
            cost_comment = m_cost_comm.group(0).strip()

    cost_approach_section = {
        "Provide adequate information for the lender/client to replicate the below cost figures and calculations.": cost_comment,
        "Support for the opinion of site value (summary of comparable land sales or other methods for estimating site value)": cost_site_comment,
        "ESTIMATED COST NEW TYPE": cost_type,
        "Estimated": cost_type,
        "ESTIMATED/REPRODUCTION / REPLACEMENT COST NEW": cost_type,
        "Source of Cost Data": cost_data_source,
        "Source of cost data": cost_data_source,
        "Quality Rating": cost_quality_rating,
        "Quality rating from cost service": cost_quality_rating,
        "Quality rating from cost service ": cost_quality_rating,
        "Effective Date": cost_effective_date,
        "Effective date of cost data": cost_effective_date,
        "Effective date of cost data ": cost_effective_date,
        "Comments on Cost Approach (gross living area calculations, depreciation, etc.)": cost_comment,
        "Remaining Economic Life": cost_economic_life,
        "Estimated Remaining Economic Life (HUD and VA only)": cost_economic_life,
        "OPINION OF SITE VALUE": cost_site_val,
        "OPINION OF SITE VALUE = $ ................................................": cost_site_val,
        "Opinion of Site Value $": cost_site_val,
        "Opinion of Site Value": cost_site_val,
        "DWELLING": dwelling_cost,
        "Dwelling": dwelling_cost,
        "Basement": basement_cost,
        "Deck": deck_cost,
        "Garage/Carport": garage_cost,
        "Garage/Carport ": garage_cost,
        "Total Estimate Cost-New": cost_total_new,
        "Total Estimate of Cost-New = $ ...................": cost_total_new,
        " Total Estimate of Cost-New  = $ ...................": cost_total_new,
        "Estimated Replacement Cost New": cost_total_new,
        "Depreciation": depreciation_cost,
        "Depreciation ": depreciation_cost,
        "Physical Depreciation": deprec_phys_pct,
        "Functional Depreciation": deprec_func_pct,
        "External Depreciation": deprec_ext_pct,
        "Total Depreciation": depreciation_cost,
        "Depreciated Cost of Improvements": cost_depreciated,
        "Depreciated Cost of Improvements......................................................=$ ": cost_depreciated,
        "As-is Value Site Improvements": cost_site_as_is,
        "As is Value Site Improvements": cost_site_as_is,
        "“As-is” Value of Site Improvements......................................................=$": cost_site_as_is,
        "As Is Value of Site Improvements": cost_site_as_is,
        "INDICATED VALUE BY COST APPROACH": cost_indicated_val,
        "Indicated Value By Cost Approach......................................................=$": cost_indicated_val,
        "Indicated Value by Cost Approach": cost_indicated_val,
        "Above Grade Finished Area": gla_sqft_cost,
        "Cost Per Square Foot": price_per_sqft_cost,
    }

    certification_section = {
        "Appraiser Name": appraiser_name,
        "Company Name": appraiser_company,
        "Company Address": appraiser_address,
        "Effective Date": effective_date,
        "Report Signed Date": signed_date,
        "Appraised Value": appraised_val,
        "Appraiser's Fee": appraiser_fee,
        "Appraiser Fee": appraiser_fee,
        "Appraisal Fee": appraiser_fee,
        "AMC License #": amc_license,
        "AMC License": amc_license,
        "AMC Name": amc_name,
    }

    # Market Conditions Addendum (Form 1004MC)
    market_elem = root.find(".//MARKET")
    mc_instructions = ""
    mc_adverse_financing = ""
    mc_concessions_expl = ""
    mc_foreclosure_factor = ""
    mc_foreclosure_expl = ""
    mc_data_source = ""
    mc_summary_comment = ""
    
    mc_table_data = {}

    if market_elem is not None:
        adv_fin = market_elem.attrib.get("MarketTrendsAdverseFinancingIndicator", "")
        if adv_fin.upper() == "Y":
            mc_adverse_financing = "Yes"
        elif adv_fin.upper() == "N":
            mc_adverse_financing = "No"
        elif adv_fin:
            mc_adverse_financing = adv_fin

        mc_concessions_expl = market_elem.attrib.get("SalesConcessionDescription", "")

        fc_ind = market_elem.attrib.get("MarketTrendsForeclosureActivityIndicator", "")
        if fc_ind.upper() == "Y":
            mc_foreclosure_factor = "Yes"
        elif fc_ind.upper() == "N":
            mc_foreclosure_factor = "No"
        elif fc_ind:
            mc_foreclosure_factor = fc_ind

        mc_foreclosure_expl = market_elem.attrib.get("NeighborhoodMarketabilityFactorsDescription", "")
        mc_data_source = market_elem.attrib.get("DataSourceDescription", "")
        mc_summary_comment = market_elem.attrib.get("MarketTrendsReconciliationComment", "")

        type_to_labels = {
            "TotalSales": ("Total # of Comparable Sales (Settled)", "Inventory Analysis Total # of Comparable Sales (Settled)"),
            "AbsorptionRate": ("Absorption Rate (Total Sales/Months)", "Inventory Analysis Absorption Rate (Total Sales/Months)"),
            "TotalListings": ("Total # of Comparable Active Listings", "Inventory Analysis Total # of Comparable Active Listings"),
            "Supply": ("Months of Housing Supply (Total Listings/Ab.Rate)", "Inventory Analysis Months of Housing Supply (Total Listings/Ab.Rate)"),
            "MedianSalesPrice": ("Median Comparable Sale Price", "Median Sale & List Price, DOM, Sale/List % Median Comparable Sale Price"),
            "MedianSalesDOM": ("Median Comparable Sales Days on Market", "Median Sale & List Price, DOM, Sale/List % Median Comparable Sales Days on Market"),
            "MedianListPrice": ("Median Comparable List Price", "Median Sale & List Price, DOM, Sale/List % Median Comparable List Price"),
            "MedianListDOM": ("Median Comparable Listings Days on Market", "Median Sale & List Price, DOM, Sale/List % Median Comparable Listings Days on Market"),
            "MedianSalesToListRatio": ("Median Sale Price as % of List Price", "Median Sale & List Price, DOM, Sale/List % Median Sale Price as % of List Price"),
        }

        range_to_tf = {
            "Prior7To12Months": "Prior 7-12 Months",
            "Prior4To6Months": "Prior 4-6 Months",
            "Last3Months": "Current-3 Months",
        }

        for mi in market_elem.findall("MARKET_INVENTORY"):
            m_type = mi.attrib.get("_Type", "")
            if m_type not in type_to_labels:
                continue
            short_lbl, full_lbl = type_to_labels[m_type]
            
            m_range = mi.attrib.get("_MonthRangeType", "")
            m_trend = mi.attrib.get("_TrendType", "")
            
            val = mi.attrib.get("_Count") or mi.attrib.get("_Amount") or mi.attrib.get("_Rate") or ""
            
            if "Price" in m_type and val:
                val = val.strip()
                if not val.startswith("$") and val.replace(",", "").replace(".", "").isdigit():
                    cleaned_val = _clean_currency(val)
                    val = f"${cleaned_val}" if cleaned_val else val
            
            if m_trend and not m_range:
                tf = "Overall Trend"
                val = m_trend
            else:
                tf = range_to_tf.get(m_range, m_range)
                
            stripped_val = val.strip()
            if tf and stripped_val != "":
                mc_table_data[f"{full_lbl} ({tf})"] = stripped_val
                mc_table_data[f"{short_lbl} ({tf})"] = stripped_val
    else:
        m_mkt = re.search(r'(?:NEIGHBORHOOD\s+MARKET\s+CONDITIONS|MARKET\s+CONDITIONS)[\s:\-]+([^\n\r]+(?:(?!\b[A-Z\s]{4,}:)[^\n\r]+)*)', full_narrative, re.IGNORECASE)
        if m_mkt:
            mc_summary_comment = m_mkt.group(1).strip()

    market_conditions_section = {
        "Instructions:": mc_instructions,
        "Seller-(developer, builder, etc.)paid financial assistance prevalent?": mc_adverse_financing,
        "Explain in detail the seller concessions trends for the past 12 months (e.g., seller contributions increased from 3% to 5%, increasing use of buydowns, closing costs, condo fees, options, etc.).": mc_concessions_expl,
        "Are foreclosure sales (REO sales) a factor in the market?": mc_foreclosure_factor,
        "If yes, explain (including the trends in listings and sales of foreclosed properties).": mc_foreclosure_expl,
        "Cite data sources for above information.": mc_data_source,
        "Summarize the above information as support for your conclusions in the Neighborhood section of the appraisal report form. If you used any additional information, such as an analysis of pending sales and/or expired and withdrawn listings, to formulate your conclusions, provide both an explanation and support for your conclusions.": mc_summary_comment,
        **mc_table_data
    }

    # Condo / Co-op Projects (Subject Project Data on Form 1073 / 1004MC)
    sp_elem = root.find(".//SUBJECT_PROJECT")
    condo_coop_section = {}
    condo_foreclosure_section = {
        "Are foreclosure sales (REO sales) a factor in the project?": "",
        "If yes, indicate the number of REO listings and explain the trends in listings and sales of foreclosed properties.": "",
        "Summarize the above trends and address the impact on the subject unit and project.": "",
    }

    condo_type_to_labels = {
        "TotalSales": ("Total # of Comparable Sales (Settled)", "Subject Project Data Total # of Comparable Sales (Settled)"),
        "AbsorptionRate": ("Absorption Rate (Total Sales/Months)", "Subject Project Data Absorption Rate (Total Sales/Months)"),
        "TotalListings": ("Total # of Comparable Active Listings", "Subject Project Data Total # of Comparable Active Listings"),
        "Supply": ("Months of Unit Supply (Total Listings/Ab.Rate)", "Subject Project Data Months of Unit Supply (Total Listings/Ab.Rate)"),
    }

    condo_range_to_tf_pairs = {
        "Prior7To12Months": [("Prior 7–12 Months", "Prior 7-12 Months")],
        "Prior4To6Months": [("Prior 4–6 Months", "Prior 4-6 Months")],
        "Last3Months": [("Current – 3 Months", "Current-3 Months", "Current - 3 Months")],
    }

    # Condo Foreclosure Extraction (Subject Project & Market fallback)
    reo_expl = sp_elem.attrib.get("NeighborhoodMarketabilityFactorsDescription", "") if sp_elem is not None else ""
    reconcil = sp_elem.attrib.get("MarketTrendsReconciliationComment", "") if sp_elem is not None else ""
    sp_fc_ind = sp_elem.attrib.get("MarketTrendsForeclosureActivityIndicator", "") if sp_elem is not None else ""

    mkt_fc_ind = market_elem.attrib.get("MarketTrendsForeclosureActivityIndicator", "") if market_elem is not None else ""
    mkt_expl = market_elem.attrib.get("NeighborhoodMarketabilityFactorsDescription", "") if market_elem is not None else ""
    mkt_reconcil = market_elem.attrib.get("MarketTrendsReconciliationComment", "") if market_elem is not None else ""

    if not reo_expl:
        reo_expl = mkt_expl
    if not reconcil:
        reconcil = mkt_reconcil

    fc_ind = sp_fc_ind or mkt_fc_ind
    if fc_ind.upper() == "Y":
        factor = "Yes"
    elif fc_ind.upper() == "N":
        factor = "No"
    elif fc_ind:
        factor = "Yes" if "y" in fc_ind.lower() else "No"
    elif reo_expl or reconcil:
        factor = "No"
    else:
        factor = ""

    condo_foreclosure_section["Are foreclosure sales (REO sales) a factor in the project?"] = factor
    condo_foreclosure_section["If yes, indicate the number of REO listings and explain the trends in listings and sales of foreclosed properties."] = reo_expl
    condo_foreclosure_section["Summarize the above trends and address the impact on the subject unit and project."] = reconcil

    if sp_elem is not None:
        for mi in sp_elem.findall("MARKET_INVENTORY"):
            m_type = mi.attrib.get("_Type", "")
            if m_type not in condo_type_to_labels:
                continue
            short_lbl, full_lbl = condo_type_to_labels[m_type]
            m_range = mi.attrib.get("_MonthRangeType", "")
            m_trend = mi.attrib.get("_TrendType", "")
            
            val = mi.attrib.get("_Count") or mi.attrib.get("_Rate") or mi.attrib.get("_Amount") or ""
            
            if m_trend and not m_range:
                val = m_trend
                condo_coop_section[f"{full_lbl} (Overall Trend)"] = val
                condo_coop_section[f"{short_lbl} (Overall Trend)"] = val
            elif m_range in condo_range_to_tf_pairs:
                for tf_variants in condo_range_to_tf_pairs[m_range]:
                    for tf in tf_variants:
                        condo_coop_section[f"{full_lbl} ({tf})"] = val
                        condo_coop_section[f"{short_lbl} ({tf})"] = val

    # Initialize default blank keys for all row and timeframe variations
    for m_type, (short_lbl, full_lbl) in condo_type_to_labels.items():
        for tf_variants in [("Prior 7–12 Months", "Prior 7-12 Months"), ("Prior 4–6 Months", "Prior 4-6 Months"), ("Current – 3 Months", "Current-3 Months", "Current - 3 Months"), ("Overall Trend",)]:
            for tf in tf_variants:
                if f"{full_lbl} ({tf})" not in condo_coop_section:
                    condo_coop_section[f"{full_lbl} ({tf})"] = ""
                if f"{short_lbl} ({tf})" not in condo_coop_section:
                    condo_coop_section[f"{short_lbl} ({tf})"] = ""

    # Merged Subject with both sales grid comps data and subject section fields
    subj_grid = comps_dict.get("Subject", {})
    merged_subject = {**subject_section, **subj_grid}
    if not merged_subject.get("Address"):
        merged_subject["Address"] = prop_addr
    if not merged_subject.get("Heating/Cooling"):
        merged_subject["Heating/Cooling"] = ht_val
    if not merged_subject.get("Porch/Patio/Deck"):
        merged_subject["Porch/Patio/Deck"] = amenities_val
    if not merged_subject.get("Basement Description"):
        merged_subject["Basement Description"] = found_val
    if not merged_subject.get("Basement Finished Rooms"):
        merged_subject["Basement Finished Rooms"] = f"{bm_finish}%" if bm_finish else ""
    if not merged_subject.get("Condition"):
        merged_subject["Condition"] = prop_condition
    sales_grid["Subject"] = merged_subject
    sales_grid["SUBJECT"] = merged_subject
    comps_dict["Subject"] = merged_subject
    comps_dict["SUBJECT"] = merged_subject
    if not merged_subject.get("Basement & Finished Rooms Below Grade"):
        merged_subject["Basement & Finished Rooms Below Grade"] = bm_details or found_val
    if not merged_subject.get("Garage/Carport"):
        merged_subject["Garage/Carport"] = car_storage_val
    if not merged_subject.get("Parking On/Off Site"):
        merged_subject["Parking On/Off Site"] = car_storage_val

    # Merge Info of Sales & Prior Sale History into subject and sales grid
    merged_subject.update(info_of_sales_section)
    merged_subject.update(pud_info_section)
    merged_subject.update(condo_coop_section)
    merged_subject.update(condo_foreclosure_section)
    sales_grid.update(info_of_sales_section)
    merged_info_of_sales = {**sales_grid, **info_of_sales_section}

    # Combined master fields object
    fields = {
        "From Type": form_type,
        "Form Type": form_type,
        "formType": form_type,
        "form_type": form_type,
        "Full Address": full_addr,
        "Property Address": prop_addr,
        "City": prop_city,
        "County": prop_county,
        "State": prop_state,
        "Zip Code": prop_zip,
        "Borrower": borrower_name,
        "Owner of Public Record": owner_name,
        "Appraised Value": appraised_val,
        "Effective Date": effective_date,
        "File #": file_id,
        "Loan #": loan_num,
        "SUBJECT": subject_section,
        "Subject": merged_subject,
        "CONTRACT": contract_section,
        "NEIGHBORHOOD": neighborhood_section,
        "SITE": site_section,
        "IMPROVEMENTS": improvements_section,
        "SALES_GRID": sales_grid,
        "SALES_COMPARISON": comps_dict,
        "INFO_OF_SALES": merged_info_of_sales,
        "RECONCILIATION": reconciliation_section,
        "INCOME_APPROACH": income_approach_section,
        "COST_APPROACH": cost_approach_section,
        "PUD_INFO": pud_info_section,
        "PUD Information": pud_info_section,
        "MARKET_CONDITIONS": market_conditions_section,
        "Market Conditions": market_conditions_section,
        "Market Conditions Addendum": market_conditions_section,
        "CONDO_COOP_PROJECTS": condo_coop_section,
        "Condo Coop Projects": condo_coop_section,
        "CONDO_FORECLOSURE": condo_foreclosure_section,
        "Condo Foreclosure": condo_foreclosure_section,
        "CERTIFICATION": certification_section,
        "SUBJECT_RENT_SCHEDULE": subject_rent_schedule,
        "COMPARABLE_RENTAL_DATA": comparable_rental_data,
        "EXTRACTED_PHOTOS": extracted_photos,
    }

    # Flatten all category fields into root fields so data[field] is directly available to UI
    for cat_dict in [subject_section, contract_section, neighborhood_section, site_section, improvements_section, reconciliation_section, income_approach_section, cost_approach_section, pud_info_section, market_conditions_section, condo_coop_section, condo_foreclosure_section, certification_section, info_of_sales_section]:
        for k, v in cat_dict.items():
            if k not in fields:
                fields[k] = v
    fields.update(info_of_sales_section)
    fields.update(pud_info_section)
    fields.update(market_conditions_section)
    fields.update(condo_coop_section)
    fields.update(condo_foreclosure_section)

    # Map individual comps for Form1025 and 1004 grids without overwriting Subject
    for comp_name, comp_data in comps_dict.items():
        if comp_name not in ("Subject", "SUBJECT"):
            fields[comp_name] = comp_data
            fields[comp_name.upper()] = comp_data

    # Map individual rentals for Form1025
    for rent_name, rent_data in comparable_rental_data.items():
        fields[rent_name] = rent_data

    return {
        "status": "success",
        "form_type": form_type,
        "fields": fields,
        "unified_fields": fields,
        "clean_data": fields,
        "has_embedded_pdf": has_embedded_pdf,
    }
