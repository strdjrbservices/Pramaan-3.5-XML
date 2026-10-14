"""
100% Offline Pure Python Extractor for Employee Relocation Council (ERC / ECR) Appraisal Reports.
Extracts all 9 standard ERC/ECR categories completely dynamically using dynamic regex coordinate anchors,
vector-graphic checkbox detection, and spatial cell slicing:
  - SUMMARY
  - SUBJECT
  - NEIGHBORHOOD
  - SITE
  - IMPROVEMENTS
  - MARKET_TRENDS
  - SALES_COMPARISON
  - ANTICIPATED_SALES_PRICE
  - CERTIFICATION
  + SALES_GRID (Subject, Comps 1-3, Comps 4-6)
  + EXTRACTED_PHOTOS (Photos, Exhibits, Maps, Sketches)
"""

import os
import re
import json
import pymupdf


# =========================================================================
# SPATIAL & BOUNDING BOX HELPERS
# =========================================================================

def extract_page_words_and_lines(page):
    """
    Extracts word bounding boxes (x0, y0, x1, y1, word, block_no, line_no, word_no)
    and creates a spatial text representation sorted top-to-bottom, left-to-right.
    """
    words = page.get_text("words")
    lines_dict = {}
    for w in words:
        y_center = (w[1] + w[3]) / 2.0
        y_approx = round(y_center, 1)
        found_key = None
        for k in lines_dict.keys():
            if abs(k - y_approx) < 4.0:
                found_key = k
                break
        if found_key is None:
            found_key = y_approx
            lines_dict[found_key] = []
        lines_dict[found_key].append(w)

    sorted_y = sorted(lines_dict.keys())
    spatial_lines = []
    for yk in sorted_y:
        line_words = sorted(lines_dict[yk], key=lambda x: x[0])
        spatial_lines.append(" ".join(w[4] for w in line_words))

    spatial_text = "\n".join(spatial_lines)
    return words, spatial_text


def get_page_checked_boxes(page):
    """
    Precision Vector Graphics Checkbox Detector:
    Finds all line segments that form diagonal cross lines ('X' or checkmark) inside checkbox squares.
    """
    drawings = page.get_drawings()
    diag_lines = []
    for d in drawings:
        for it in d.get("items", []):
            if it[0] == "l":
                p1, p2 = it[1], it[2]
                dx = abs(p2.x - p1.x)
                dy = abs(p2.y - p1.y)
                # Checkbox cross lines are ~2.5 - 18 pt long and diagonal
                if 2.5 <= dx <= 18.0 and 2.5 <= dy <= 18.0:
                    diag_lines.append(pymupdf.Rect(min(p1.x, p2.x), min(p1.y, p2.y), max(p1.x, p2.x), max(p1.y, p2.y)))
    checked_boxes = []
    for r in diag_lines:
        if not any(abs(cb.x0 - r.x0) < 6.0 and abs(cb.y0 - r.y0) < 6.0 for cb in checked_boxes):
            checked_boxes.append(r)
    return checked_boxes


def is_checkbox_checked(anchor_rect, checked_boxes, max_dist=28.0, direction="left"):
    """
    Checks if any vector checked box is within max_dist of anchor_rect.
    direction: 'left', 'right', 'near', or 'inside'.
    """
    if not anchor_rect:
        return False
    ay = (anchor_rect.y0 + anchor_rect.y1) / 2.0
    for cb in checked_boxes:
        cy = (cb.y0 + cb.y1) / 2.0
        if abs(ay - cy) <= 8.5:
            if direction == "left" and (anchor_rect.x0 - max_dist <= cb.x0 <= anchor_rect.x0 + 4.0):
                return True
            elif direction == "right" and (anchor_rect.x1 - 4.0 <= cb.x0 <= anchor_rect.x1 + max_dist):
                return True
            elif direction == "near" and abs(cb.x0 - anchor_rect.x0) <= max_dist:
                return True
            elif direction == "inside" and (anchor_rect.x0 - 5.0 <= cb.x0 <= anchor_rect.x1 + 5.0):
                return True
    return False


def find_label_rect(pattern, words, y_min=0, y_max=9999, x_min=0, x_max=9999):
    """
    Dynamically finds the exact bounding box of a label or keyword using regex across words in line bands.
    """
    lines = {}
    for w in words:
        if w[1] < y_min or w[3] > y_max or w[0] < x_min or w[2] > x_max:
            continue
        yk = round((w[1] + w[3]) / 8.0) * 4
        lines.setdefault(yk, []).append(w)

    for yk in sorted(lines.keys()):
        lw = lines[yk]
        lw.sort(key=lambda x: x[0])
        line_str = " ".join(w[4] for w in lw)
        m = re.search(pattern, line_str, re.IGNORECASE)
        if m:
            start_char, end_char = m.start(), m.end()
            curr = 0
            m_words = []
            for w in lw:
                w_len = len(w[4])
                w_start = curr
                w_end = curr + w_len
                if not (w_end <= start_char or w_start >= end_char):
                    m_words.append(w)
                curr = w_end + 1
            if m_words:
                return pymupdf.Rect(
                    min(w[0] for w in m_words),
                    min(w[1] for w in m_words),
                    max(w[2] for w in m_words),
                    max(w[3] for w in m_words)
                )
    return None


def get_text_right_of(rect, words, max_x=600, y_tol=5.5):
    """
    Extracts text to the right of a bounding box on the same line band up to max_x.
    """
    if not rect:
        return ""
    matched = [
        w for w in words
        if abs(((w[1] + w[3]) / 2.0) - ((rect.y0 + rect.y1) / 2.0)) <= y_tol
        and w[0] >= rect.x1 - 1.0
        and w[2] <= max_x
    ]
    matched.sort(key=lambda x: x[0])
    return clean_field_value(" ".join(w[4] for w in matched).strip())


def get_text_in_rect(words, x0, y0, x1, y1):
    """Filters words whose bounding box falls inside [x0, y0, x1, y1], sorted reading-order."""
    matched = [
        w for w in words
        if not (w[2] < x0 or w[0] > x1 or w[3] < y0 or w[1] > y1)
    ]
    matched.sort(key=lambda x: (round(x[1] / 4.0) * 4, x[0]))
    return " ".join(w[4] for w in matched).strip()


def get_narrative_between(words, top_rect, bottom_rect, x_min=30, x_max=590, prompt_prefixes=None):
    """
    Gathers multi-line narrative between top_rect and bottom_rect.
    Includes words on the top_rect line that appear to the right of top_rect.
    """
    if not top_rect:
        return ""
    top_y = top_rect.y0 - 2.0
    bottom_y = bottom_rect.y0 - 1.0 if bottom_rect else (top_y + 120.0)

    line1 = [
        w for w in words
        if abs(((w[1] + w[3]) / 2.0) - ((top_rect.y0 + top_rect.y1) / 2.0)) <= 4.0
        and w[0] >= top_rect.x1 - 2.0
        and w[2] <= x_max
    ]
    below = [
        w for w in words
        if top_rect.y1 + 1.0 <= ((w[1] + w[3]) / 2.0) <= bottom_y
        and x_min <= w[0]
        and w[2] <= x_max
    ]
    all_w = line1 + below
    all_w.sort(key=lambda w: (round(w[1] / 6.0) * 6, w[0]))
    raw_text = " ".join(w[4] for w in all_w).strip()
    return clean_narrative(raw_text, prompt_prefix_words=prompt_prefixes)


def clean_narrative(text: str, prompt_prefix_words: list | None = None, stop_words: list | None = None) -> str:
    """Cleans form label prefixes and stop word delimiters from multi-line text boxes."""
    if not text:
        return ""
    if prompt_prefix_words:
        for p in prompt_prefix_words:
            if p in text:
                text = text.split(p, 1)[-1].strip()
    if stop_words:
        for s in stop_words:
            if s in text:
                text = text.split(s, 1)[0].strip()
    # Strip any leading colon or punctuation
    text = re.sub(r"^[:\-\s\.]+", "", text).strip()
    return text.strip()


def clean_curr(val: str) -> str:
    """Cleans currency formatting and numeric prefixes."""
    if not val:
        return ""
    s = val.replace("$", "").replace("Plus", "").replace("Minus", "").replace(",", "").strip()
    s = re.sub(r"^(?:taxes|range|to|price|fee|fees|built|stories|units|s|age)\s*[:\-]*\s*", "", s, flags=re.IGNORECASE).strip()
    return s


def clean_field_value(val: str) -> str:
    """
    Strips pre-printed form guide sub-labels that appear inside field boxes
    in standard Worldwide ERC / ECR forms.
    """
    if not val:
        return ""
    s = val.strip()
    sub_labels = [
        r"^(?:Client\s*)?File\s*#?\s*[:\-]+",
        r"^(?:Appraiser\s*)?File\s*#?\s*[:\-]+",
        r"^(?:Subject\s*Property\s*|Client\s*|Appraiser\s*)?Address\s*[:\-]+",
        r"^(?:Subject\s*|Client\s*|Appraiser\s*)?City\s*[:\-]+",
        r"^(?:Subject\s*|Client\s*|Appraiser\s*)?State\s*[:\-]+",
        r"^(?:Subject\s*|Client\s*|Appraiser\s*Zip\s*)?(?:Zip\s*)?Code\s*[:\-]+",
        r"^(?:Subject\s*)?County\s*[:\-]+",
        r"^(?:Subject\s*)?Unit\s*[:\-]+",
        r"^(?:Appraiser\s*Company\s*)?Name\s*[:\-]+",
        r"^(?:Data\s*)?Source\s*[:\-]+",
        r"^Tax\s*Year\s*[:\-]+",
        r"^(?:Monthly\s*HOA\s*)?Fees?\s*[:\-\$]+",
        r"^(?:Annual\s*real\s*estate\s*|real\s*estate\s*)?taxes\s*[:\-\$]+",
        r"^(?:Street\s*|Driveway\s*)?Surface\s*[:\-]+",
        r"^(?:Year\s*)?Built\s*[:\-]+",
        r"^(?:No\.\s*of\s*)?Stories\s*[:\-]+",
        r"^(?:No\.\s*of\s*)?Units?\s*[:\-]+",
        r"^s\s*[:\-]+",
        r"^(?:Original\s*List\s*|Current\s*List\s*|Last\s*Sale\s*)?Price\s*[:\-\$]+",
        r"^(?:Date\s*of\s*Last\s*Price\s*)?Revision\s*[:\-]+",
        r"^Days[\-\s]on[\-\s]market\s*[:\-]+",
        r"^(?:Listing\s*)?Company\s*\/\s*Agent\s*[:\-]+",
        r"^(?:Appraiser\s*)?Ph(?:one|\.)?\s*#?\s*[:\-]+",
        r"^(?:Appraiser\s*)?Fax\s*#?\s*[:\-]+",
        r"^(?:Appraiser\s*)?E-?mail\s*[:\-]+",
        r"^(?:Last\s*Sale\s*|Closing\s*)?Date\s*[:\-]+",
        r"^(?:Single\s*)?Family\s*[:\-]+",
        r"^(?:Multi[\-\s]*family|Commercial|Industrial|Condo|Present\s*Land\s*Use|Land\s*Use)\s*[:\-]+",
        r"^(?:To)?pography\s*[:\-]+",
        r"^(?:Shape|View|Landscaping|Drainage|Dimensions|Site\s*Area)\s*[:\-]+",
        r"^(?:Single[\-\s]*family\s*)?(?:Price\s*)?Range\s*[:\-\$]+",
        r"^to\s*[:\-\$]+",
        r"^(?:Single[\-\s]*family\s*)?Age\s*[:\-]+",
        r"^(?:Predominant\s*(?:Price|Age|Occupancy)?)\s*[:\-\$]+",
        r"^(?:Location\s*Type|Built\s*Up|Development\s*Rate|Change\s*in\s*Present\s*Land\s*Use)\s*[:\-]+",
        r"^(?:(?:CO[\-\s]*)?APPRAISER\s*)?(?:Date\s*of\s*Appraisal\s*)?Inspection\s*[:\-]+",
        r"^(?:(?:CO[\-\s]*)?APPRAISER\s*)?(?:Date\s*of\s*Value\s*Opinion\s*)?\(?Effective\s*Date\)?\s*[:\-]+",
        r"^(?:(?:CO[\-\s]*)?APPRAISER\s*)?(?:State\s*)?License\s*\/\s*Certification\s*(?:#)?\s*[:\-]+",
        r"^(?:(?:CO[\-\s]*)?APPRAISER\s*)?(?:Expiration\s*Date\s*of\s*)?(?:State\s*)?License\s*\/\s*Certification\s*[:\-]+",
        r"^\(Yrs\.?\)\s*[:\-]*",
        r"^(?:Actual\s*)?Age\s*(?:\(Yrs\.?\))?\s*[:\-]+",
        r"^(?:Legal\s*)?Description\s*[:\-]+",
        r"^(?:Assessor['’]s\s*)?(?:Parcel\s*)?#?\s*[:\-]+",
        r"^(?:Map\s*)?Reference\s*[:\-]+",
        r"^(?:Architectural\s*)?Style\s*[:\-]+",
        r"^(?:Roofing\s*|Wall\s*)?Material\s*[:\-]+",
        r"^(?:Window\s*)?Type\s*[:\-]+",
        r"^(?:If\s*condominium\s*or\s*cooperative,\s*indicate\s*complex\s*name)\s*[:\-]+",
        r"^(?:Total\s*No\.\s*of\s*Units|No\.\s*of\s*Owner-occupied\s*Units|%\s*of\s*Owner-occupied\s*Units|Total\s*No\.\s*of\s*Floors|Subject\s*Floor\s*#)\s*[:\-]+",
        r"^#\s*[:\-]+",
        r"^[:\-\s%]+$",
    ]
    for pat in sub_labels:
        s = re.sub(pat, "", s, flags=re.IGNORECASE).strip()
    s = re.sub(r"\s+(?:Floors?|Carpet|Vinyl|Tile|Wood|Walls?|Drywall|Plaster|Other)\s*[:\-]*$", "", s, flags=re.IGNORECASE).strip()
    s = re.sub(r"^[:\-\s]+", "", s).strip()
    if s.lower() in [
        "inspection:", "inspection", "(effective date):", "(effective date)", "effective date:", "effective date",
        "license/certification #:", "license/certification:", "license/certification", "license:", "certification:",
        "did did not", "did did", "did not", "did", "name:", "name", "transferee tenant vacant :", "transferee tenant vacant",
        "simple leasehold subtype: pud condominium cooperative", "cooperative, indicate complex name:",
        "surface:", "taxes:", "built:", "stories:", "units:", "style:", "material:", "type:"
    ]:
        return ""
    return s.strip()


# =========================================================================
# PAGE LOCATOR ENGINE
# =========================================================================

def locate_ecr_pages(doc) -> dict:
    """
    Locates the 7 primary Worldwide ERC Appraisal pages and any addenda pages
    by combining page footer stamps (e.g. 'Page 1 of 7') with primary section header regex.
    """
    page_map = {
        "summary_p1": None,
        "subject_p2": None,
        "improvements_p3": None,
        "market_trends_p4": None,
        "market_trends_p5": None,
        "sales_grid_p6": None,
        "certification_p7": None,
        "comps_4_6": None
    }

    for idx, page in enumerate(doc):
        text = page.get_text("text")
        text_upper = text.upper()

        is_page_1 = "PAGE 1 OF 7" in text_upper or ("SALIENT FACTS AND CONCLUSIONS" in text_upper and "DEFINITIONS AND GUIDELINES" in text_upper)
        is_page_2 = "PAGE 2 OF 7" in text_upper or ("SUBJECT INFORMATION" in text_upper and ("OVERALL SITE APPEAL" in text_upper or "ZONING CLASSIFICATION" in text_upper))
        is_page_3 = "PAGE 3 OF 7" in text_upper or ("DESCRIPTION OF IMPROVEMENTS" in text_upper and ("FOUNDATION" in text_upper or "GROSS LIVING AREA" in text_upper))
        is_page_4 = "PAGE 4 OF 7" in text_upper or ("MARKET TRENDS ANALYSIS" in text_upper and "CLOSED SALES ANALYSIS" in text_upper)
        is_page_5 = "PAGE 5 OF 7" in text_upper or (("COMPETING PROPERTIES" in text_upper or "CURRENT FACTORS CONTINUED" in text_upper) and "FORECASTED TRENDS" in text_upper)
        is_page_6 = "PAGE 6 OF 7" in text_upper or ("SALES COMPARISON ANALYSIS" in text_upper and "ANTICIPATED SALES PRICE" in text_upper and "ADDITIONAL COMPARABLE" not in text_upper)
        is_page_7 = "PAGE 7 OF 7" in text_upper or ("STATEMENT OF LIMITING CONDITIONS" in text_upper and "APPRAISER CERTIFICATION" in text_upper)

        if is_page_1 and page_map["summary_p1"] is None:
            page_map["summary_p1"] = idx
        elif is_page_2 and page_map["subject_p2"] is None:
            page_map["subject_p2"] = idx
        elif is_page_3 and page_map["improvements_p3"] is None:
            page_map["improvements_p3"] = idx
        elif is_page_4 and page_map["market_trends_p4"] is None:
            page_map["market_trends_p4"] = idx
        elif is_page_5 and page_map["market_trends_p5"] is None:
            page_map["market_trends_p5"] = idx
        elif is_page_6 and page_map["sales_grid_p6"] is None:
            page_map["sales_grid_p6"] = idx
        elif is_page_7 and page_map["certification_p7"] is None:
            page_map["certification_p7"] = idx
        elif "ADDITIONAL COMPARABLE SALES" in text_upper or "COMPARABLE SALE #4" in text_upper:
            if page_map["comps_4_6"] is None:
                page_map["comps_4_6"] = idx

    # Robust sequential fallback if standard stamps weren't detected
    total_pages = len(doc)
    if page_map["summary_p1"] is None:
        for idx, page in enumerate(doc):
            t = page.get_text("text").upper()
            if "SALIENT FACTS" in t or "WORLDWIDE ERC" in t:
                page_map["summary_p1"] = idx
                break

    base = page_map["summary_p1"] if page_map["summary_p1"] is not None else 0
    if page_map["subject_p2"] is None and base + 1 < total_pages: page_map["subject_p2"] = base + 1
    if page_map["improvements_p3"] is None and base + 2 < total_pages: page_map["improvements_p3"] = base + 2
    if page_map["market_trends_p4"] is None and base + 3 < total_pages: page_map["market_trends_p4"] = base + 3
    if page_map["market_trends_p5"] is None and base + 4 < total_pages: page_map["market_trends_p5"] = base + 4
    if page_map["sales_grid_p6"] is None and base + 5 < total_pages: page_map["sales_grid_p6"] = base + 5
    if page_map["certification_p7"] is None and base + 6 < total_pages: page_map["certification_p7"] = base + 6

    return page_map


# =========================================================================
# SECTION 1: SUMMARY & SALIENT FACTS (PAGE 1 OF 7)
# =========================================================================

def extract_ecr_summary_section(page, words, spatial_text: str, full_doc_text: str = "") -> dict:
    """Extracts Page 1 Summary & Client/Appraiser info using dynamic regex coordinates."""
    res = {}
    cb = get_page_checked_boxes(page)

    # Client & Appraiser header block
    r_client = find_label_rect(r"^Client:", words, y_max=120)
    res["Client:"] = get_text_right_of(r_client, words, max_x=340)

    r_cfile = find_label_rect(r"Client\s*File\s*#:", words, y_max=120)
    res["Client File #:"] = get_text_right_of(r_cfile, words, max_x=590)

    r_caddr = find_label_rect(r"Client\s*Address:", words, y_max=140)
    res["Client Address:"] = get_text_right_of(r_caddr, words, max_x=590)

    # City / State / Zip row
    r_ccity = find_label_rect(r"^City:", words, y_min=60, y_max=150, x_max=120)
    r_cstate = find_label_rect(r"State:", words, y_min=60, y_max=150, x_min=300, x_max=360)
    r_czip = find_label_rect(r"Zip\s*Code:", words, y_min=60, y_max=150, x_min=420)
    res["Client City:"] = get_text_right_of(r_ccity, words, max_x=r_cstate.x0 if r_cstate else 300)
    res["Client State:"] = get_text_right_of(r_cstate, words, max_x=r_czip.x0 if r_czip else 440)
    res["Client Zip Code:"] = get_text_right_of(r_czip, words, max_x=590)

    # Transferee & Owner row
    r_trans = find_label_rect(r"Transferee:", words, y_min=80, y_max=160)
    r_owner = find_label_rect(r"Owner\(s\)\s*of\s*Record:", words, y_min=80, y_max=160)
    res["Transferee:"] = get_text_right_of(r_trans, words, max_x=r_owner.x0 if r_owner else 330)
    res["Owner(s) of Record:"] = get_text_right_of(r_owner, words, max_x=590)

    # Subject Property Address row
    r_saddr = find_label_rect(r"Subject\s*Property\s*Address:", words, y_min=90, y_max=180)
    r_unit = find_label_rect(r"Unit:", words, y_min=90, y_max=180)
    r_cnty = find_label_rect(r"County:", words, y_min=90, y_max=180)
    res["Subject Property Address:"] = get_text_right_of(r_saddr, words, max_x=r_unit.x0 if r_unit else 340)
    res["Unit:"] = get_text_right_of(r_unit, words, max_x=r_cnty.x0 if r_cnty else 400)
    res["Subject County:"] = get_text_right_of(r_cnty, words, max_x=590)

    # Subject City / State / Zip
    r_scity = find_label_rect(r"^City:", words, y_min=100, y_max=200, x_max=120)
    r_sstate = find_label_rect(r"State:", words, y_min=100, y_max=200, x_min=300, x_max=360)
    r_szip = find_label_rect(r"Zip\s*Code:", words, y_min=100, y_max=200, x_min=420)
    res["Subject City:"] = get_text_right_of(r_scity, words, max_x=r_sstate.x0 if r_sstate else 300)
    res["Subject State:"] = get_text_right_of(r_sstate, words, max_x=r_szip.x0 if r_szip else 440)
    res["Subject Zip Code:"] = get_text_right_of(r_szip, words, max_x=590)

    # Appraiser Company / File #
    r_appcomp = find_label_rect(r"Appraiser\s*Company\s*Name:", words, y_min=120, y_max=220)
    r_appfile = find_label_rect(r"Appraiser\s*File\s*#:", words, y_min=120, y_max=220)
    res["Appraiser Company Name:"] = get_text_right_of(r_appcomp, words, max_x=r_appfile.x0 if r_appfile else 380)
    res["Appraiser File #:"] = get_text_right_of(r_appfile, words, max_x=590)

    # Appraiser Name / Co-appraiser
    r_appname = find_label_rect(r"Appraiser\(s\):", words, y_min=130, y_max=230)
    r_coapp = find_label_rect(r"Co-appraiser", words, y_min=130, y_max=230)
    res["Appraiser(s):"] = get_text_right_of(r_appname, words, max_x=r_coapp.x0 if r_coapp else 340)
    res["Co-appraiser (if applicable)"] = get_text_right_of(r_coapp, words, max_x=590)

    # Appraiser Address
    r_appaddr = find_label_rect(r"Appraiser\s*Address:", words, y_min=140, y_max=240)
    res["Appraiser Address"] = get_text_right_of(r_appaddr, words, max_x=590)

    # Appraiser City / State / Zip
    r_apcity = find_label_rect(r"^City:", words, y_min=150, y_max=250, x_max=120)
    r_apstate = find_label_rect(r"State:", words, y_min=150, y_max=250, x_min=300, x_max=360)
    r_apzip = find_label_rect(r"Zip\s*Code:", words, y_min=150, y_max=250, x_min=420)
    res["Appraiser City:"] = get_text_right_of(r_apcity, words, max_x=r_apstate.x0 if r_apstate else 300)
    res["Appraiser State:"] = get_text_right_of(r_apstate, words, max_x=r_apzip.x0 if r_apzip else 440)
    res["Appraiser Zip Code:"] = get_text_right_of(r_apzip, words, max_x=590)

    # Appraiser Ph / Fax / Email
    r_appph = find_label_rect(r"Ph\.\s*#:", words, y_min=160, y_max=260)
    r_appfax = find_label_rect(r"Fax\s*#:", words, y_min=160, y_max=260)
    r_appmail = find_label_rect(r"E-?mail:", words, y_min=160, y_max=260)
    res["Appraiser Ph. #:"] = get_text_right_of(r_appph, words, max_x=r_appfax.x0 if r_appfax else 230)
    res["Appraiser Fax #:"] = get_text_right_of(r_appfax, words, max_x=r_appmail.x0 if r_appmail else 360)
    res["Appraiser E-mail:"] = get_text_right_of(r_appmail, words, max_x=590)

    # SALIENT FACTS & CONCLUSIONS
    r_ant_price = find_label_rect(r"Anticipated\s*Sales\s*Price", words, y_min=200, y_max=300)
    res["Anticipated Sales Price: $"] = clean_curr(get_text_right_of(r_ant_price, words, max_x=300))

    r_120 = find_label_rect(r"Not\s*to\s*exceed\s*120\s*days", words, y_min=220, y_max=320)
    r_client_inst = find_label_rect(r"Client\s*instruction", words, y_min=220, y_max=320)
    if is_checkbox_checked(r_120, cb):
        res["Assignment Marketing Period:"] = "Not to exceed 120 days"
    elif is_checkbox_checked(r_client_inst, cb):
        ci_txt = get_text_right_of(r_client_inst, words, max_x=320)
        res["Assignment Marketing Period:"] = f"Client instruction {ci_txt}".strip()
    else:
        res["Assignment Marketing Period:"] = ""

    r_asis = find_label_rect(r"as\s*is", words, y_min=230, y_max=330)
    r_client_inst = find_label_rect(r"Client\s*instruction", words, y_min=245, y_max=270, x_min=110)
    r_client_rep = find_label_rect(r"Subject\s*to\s*repair", words, y_min=230, y_max=330)
    if is_checkbox_checked(r_asis, cb):
        res["Appearance:"] = "“as is”"
    elif is_checkbox_checked(r_client_inst, cb):
        ci_txt = get_text_right_of(r_client_inst, words, max_x=320)
        res["Appearance:"] = f"Client instruction {ci_txt}".strip()
    elif is_checkbox_checked(r_client_rep, cb):
        res["Appearance:"] = "Subject to repair"
    else:
        res["Appearance:"] = ""

    r_eff_date = find_label_rect(r"Date\s*of\s*Value\s*Opinion", words, y_min=240, y_max=340)
    res["Date of Value Opinion (Effective Date):"] = get_text_right_of(r_eff_date, words, max_x=320)

    # Subject Property Listing Information
    r_list_yes = find_label_rect(r"^Yes", words, y_min=270, y_max=350, x_min=170, x_max=230)
    r_list_no = find_label_rect(r"^No", words, y_min=270, y_max=350, x_min=210, x_max=270)
    res["Is the subject property currently listed?"] = "Yes" if is_checkbox_checked(r_list_yes, cb) else ("No" if is_checkbox_checked(r_list_no, cb) else "")

    r_cur_price = find_label_rect(r"Current\s*List\s*Price", words, y_min=280, y_max=360)
    r_dom = find_label_rect(r"days\s*on\s*market:", words, y_min=280, y_max=360)
    res["Current List Price: $"] = clean_curr(get_text_right_of(r_cur_price, words, max_x=r_dom.x0 if r_dom else 230))
    res["days on market:"] = get_text_right_of(r_dom, words, max_x=320).replace("days", "").strip()

    # Description of Improvements summary row
    r_act_age = find_label_rect(r"Actual\s*Age", words, y_min=300, y_max=400)
    r_bdrms = find_label_rect(r"Bedrooms:", words, y_min=300, y_max=400)
    r_baths = find_label_rect(r"Baths:", words, y_min=300, y_max=400)
    res["Actual Age (Yrs.):"] = get_text_right_of(r_act_age, words, max_x=r_bdrms.x0 if r_bdrms else 190)
    res["Bedrooms:"] = get_text_right_of(r_bdrms, words, max_x=r_baths.x0 if r_baths else 250)
    res["Baths:"] = get_text_right_of(r_baths, words, max_x=320)

    r_gla = find_label_rect(r"Gross\s*Living\s*Area:", words, y_min=320, y_max=420)
    res["Gross Living Area:"] = clean_curr(get_text_right_of(r_gla, words, max_x=320).replace("square", "").replace("feet", "").strip())

    # Historic Price Trend & Supply / Demand checkboxes
    r_inc = find_label_rect(r"^Increasing", words, y_min=340, y_max=440, x_max=150)
    r_dec = find_label_rect(r"^Decreasing", words, y_min=340, y_max=440, x_min=140, x_max=220)
    r_stb = find_label_rect(r"^Stable", words, y_min=340, y_max=440, x_min=220, x_max=290)
    if is_checkbox_checked(r_inc, cb): res["Overall Historic Price Trend"] = "Increasing"
    elif is_checkbox_checked(r_dec, cb): res["Overall Historic Price Trend"] = "Decreasing"
    elif is_checkbox_checked(r_stb, cb): res["Overall Historic Price Trend"] = "Stable"
    else: res["Overall Historic Price Trend"] = ""

    r_under = find_label_rect(r"Under\s*Supply", words, y_min=340, y_max=440)
    r_bal = find_label_rect(r"In\s*Balance", words, y_min=340, y_max=440)
    r_over = find_label_rect(r"Over\s*Supply", words, y_min=340, y_max=440)
    if is_checkbox_checked(r_under, cb): res["Current Supply/Demand:"] = "Under Supply"
    elif is_checkbox_checked(r_bal, cb): res["Current Supply/Demand:"] = "In Balance"
    elif is_checkbox_checked(r_over, cb): res["Current Supply/Demand:"] = "Over Supply"
    else: res["Current Supply/Demand:"] = ""

    r_f_inc = find_label_rect(r"Increasing", words, y_min=340, y_max=440, x_min=380)
    r_f_stb = find_label_rect(r"Stable", words, y_min=340, y_max=440, x_min=480)
    r_f_dec = find_label_rect(r"Decreasing", words, y_min=340, y_max=440, x_min=540)
    if is_checkbox_checked(r_f_inc, cb): res["Forecasted Price Trend:"] = "Increasing"
    elif is_checkbox_checked(r_f_stb, cb): res["Forecasted Price Trend:"] = "Stable"
    elif is_checkbox_checked(r_f_dec, cb): res["Forecasted Price Trend:"] = "Decreasing"
    else: res["Forecasted Price Trend:"] = ""

    # Right column checklist items
    checklist_keys = [
        ("Mandatory Inspections", r"Mandatory\s*Inspections"),
        ("Adverse Easements/Encroachments", r"Adverse\s*Easements"),
        ("Adverse External Conditions", r"Adverse\s*External\s*Conditions"),
        ("Adverse Environmental Conditions", r"Adverse\s*Environmental"),
        ("Apparent Modifications to Dwelling", r"Apparent\s*Modifications"),
        ("Adverse Conditions Requiring Inspections", r"Adverse\s*Conditions\s*Requiring"),
        ("Recommended Repairs and/or Improvements", r"Recommended\s*Repairs"),
        ("New Construction Competition", r"New\s*Construction\s*Competition"),
        ("Distressed Market Competition", r"Distressed\s*Market\s*Competition"),
        ("Prevalence of Seller Concessions", r"Prevalence\s*of\s*Seller"),
        ("Adverse Financing Conditions", r"Adverse\s*Financing\s*Conditions"),
    ]
    for key, pat in checklist_keys:
        r_item = find_label_rect(pat, words, x_min=300)
        if r_item:
            # Check Yes vs No / None Observed to the right
            r_yes = find_label_rect(r"^Yes", words, y_min=r_item.y0 - 5, y_max=r_item.y1 + 5, x_min=470, x_max=540)
            r_no = find_label_rect(r"^(?:No|None)", words, y_min=r_item.y0 - 5, y_max=r_item.y1 + 5, x_min=510, x_max=590)
            if is_checkbox_checked(r_yes, cb):
                res[key] = "Yes"
            elif r_no and is_checkbox_checked(r_no, cb):
                no_txt = [w[4] for w in words if abs(w[1] - r_no.y0) < 6 and r_no.x0 - 2 <= w[0] <= r_no.x1 + 20]
                res[key] = "None Observed" if any("None" in w for w in no_txt) else "No"
            else:
                res[key] = ""
        else:
            res[key] = ""

    return res


# =========================================================================
# SECTION 2: SUBJECT INFORMATION (PAGE 2 OF 7)
# =========================================================================

def extract_ecr_subject_section(page, words, spatial_text: str, full_doc_text: str = "") -> dict:
    """Extracts Subject Property info (Page 2) using dynamic regex coordinates."""
    res = {}
    cb = get_page_checked_boxes(page)

    # Transferee & Occupant row
    r_trans = find_label_rect(r"Transferee:", words, y_max=120)
    r_occ = find_label_rect(r"Occupant:", words, y_max=120)
    res["Transferee:"] = get_text_right_of(r_trans, words, max_x=r_occ.x0 if r_occ else 300)

    # Check Occupant checkboxes
    r_occ_trans = find_label_rect(r"Transferee", words, y_min=50, y_max=120, x_min=300, x_max=410)
    r_occ_ten = find_label_rect(r"Tenant", words, y_min=50, y_max=120, x_min=390, x_max=460)
    r_occ_vac = find_label_rect(r"Vacant", words, y_min=50, y_max=120, x_min=440, x_max=540)
    if is_checkbox_checked(r_occ_vac, cb): res["Occupant:"] = "Vacant"
    elif is_checkbox_checked(r_occ_ten, cb): res["Occupant:"] = "Tenant"
    elif is_checkbox_checked(r_occ_trans, cb): res["Occupant:"] = "Transferee"
    else: res["Occupant:"] = ""

    # Address row
    r_saddr = find_label_rect(r"Subject\s*Property\s*Address:", words, y_min=60, y_max=140)
    r_unit = find_label_rect(r"Unit:", words, y_min=60, y_max=140)
    r_cnty = find_label_rect(r"County:", words, y_min=60, y_max=140)
    res["Subject Property Address:"] = get_text_right_of(r_saddr, words, max_x=r_unit.x0 if r_unit else 320)
    res["Subject Unit:"] = get_text_right_of(r_unit, words, max_x=r_cnty.x0 if r_cnty else 380)
    res["Subject County:"] = get_text_right_of(r_cnty, words, max_x=590)

    # City / State / Zip
    r_scity = find_label_rect(r"^City:", words, y_min=70, y_max=150, x_max=120)
    r_sstate = find_label_rect(r"State:", words, y_min=70, y_max=150, x_min=300, x_max=360)
    r_szip = find_label_rect(r"Zip\s*Code:", words, y_min=70, y_max=150, x_min=420)
    res["Subject City:"] = get_text_right_of(r_scity, words, max_x=r_sstate.x0 if r_sstate else 300)
    res["Subject State:"] = get_text_right_of(r_sstate, words, max_x=r_szip.x0 if r_szip else 440)
    res["Subject Zip Code:"] = get_text_right_of(r_szip, words, max_x=590)

    # Legal Description
    r_legal = find_label_rect(r"Legal\s*Description:", words, y_min=80, y_max=160)
    r_apn = find_label_rect(r"Assessor['’]?s\s*Parcel\s*#:", words, y_min=100, y_max=180)
    res["Legal Description:"] = get_text_right_of(r_legal, words, max_x=590)

    # APN & Map Reference
    r_map = find_label_rect(r"Map\s*Reference:", words, y_min=100, y_max=180)
    res["Assessor's Parcel #:"] = get_text_right_of(r_apn, words, max_x=r_map.x0 if r_map else 350)
    res["Map Reference:"] = get_text_right_of(r_map, words, max_x=590)

    # Property Rights Appraised & Subtype
    r_fee = find_label_rect(r"Fee\s*Simple", words, y_min=120, y_max=200)
    r_lease = find_label_rect(r"Leasehold", words, y_min=120, y_max=200)
    res["Property Rights Appraised:"] = "Fee Simple" if is_checkbox_checked(r_fee, cb) else ("Leasehold" if is_checkbox_checked(r_lease, cb) else "")

    r_pud = find_label_rect(r"^PUD", words, y_min=120, y_max=200, x_min=340)
    r_condo = find_label_rect(r"Condominium", words, y_min=120, y_max=200, x_min=390)
    r_coop = find_label_rect(r"Cooperative", words, y_min=120, y_max=200, x_min=460)
    if is_checkbox_checked(r_pud, cb): res["Subtype:"] = "PUD"
    elif is_checkbox_checked(r_condo, cb): res["Subtype:"] = "Condominium"
    elif is_checkbox_checked(r_coop, cb): res["Subtype:"] = "Cooperative"
    else: res["Subtype:"] = ""

    # Taxes & HOA
    r_taxes = find_label_rect(r"Annual\s*real\s*estate\s*taxes:", words, y_min=230, y_max=310)
    r_tax_yr = find_label_rect(r"Tax\s*Year:", words, y_min=230, y_max=310)
    r_tax_src = find_label_rect(r"Data\s*Source:", words, y_min=230, y_max=310)
    res["Annual real estate taxes: $"] = clean_curr(get_text_right_of(r_taxes, words, max_x=r_tax_yr.x0 if r_tax_yr else 250))
    res["Tax Year:"] = get_text_right_of(r_tax_yr, words, max_x=r_tax_src.x0 if r_tax_src else 380)
    res["Data Source:"] = get_text_right_of(r_tax_src, words, max_x=590)

    r_typ_yes = find_label_rect(r"^Yes", words, y_min=240, y_max=320, x_min=140, x_max=210)
    r_typ_no = find_label_rect(r"^No", words, y_min=240, y_max=320, x_min=180, x_max=260)
    res["Are taxes typical?"] = "Yes" if is_checkbox_checked(r_typ_yes, cb) else ("No" if is_checkbox_checked(r_typ_no, cb) else "")

    r_hoa = find_label_rect(r"Monthly\s*HOA\s*Fees?:", words, y_min=240, y_max=320)
    res["Monthly HOA Fees: $"] = clean_curr(get_text_right_of(r_hoa, words, max_x=590))

    r_hoa_comm = find_label_rect(r"Discuss\s*atypical\s*taxes", words, y_min=250, y_max=340)
    r_list_info = find_label_rect(r"Is\s*the\s*subject\s*property\s*currently\s*listed\?", words, y_min=320, y_max=400)
    res["Discuss atypical taxes, homeowner association fees and known pending special assessments, and comment on their effect on marketability"] = get_narrative_between(words, r_hoa_comm, r_list_info)

    # Listing & Sales History row
    r_sub_list_yes = find_label_rect(r"^Yes", words, y_min=320, y_max=390, x_min=180, x_max=240)
    r_sub_list_no = find_label_rect(r"^No", words, y_min=320, y_max=390, x_min=220, x_max=270)
    r_orig_price = find_label_rect(r"Original\s*List\s*Price", words, y_min=320, y_max=390)
    res["Is the subject property currently listed?"] = "Yes" if is_checkbox_checked(r_sub_list_yes, cb) else ("No" if is_checkbox_checked(r_sub_list_no, cb) else "")
    res["Original List Price: $"] = clean_curr(get_text_right_of(r_orig_price, words, max_x=590))

    r_cur_price = find_label_rect(r"Current\s*List\s*Price", words, y_min=330, y_max=410)
    r_rev_date = find_label_rect(r"Date\s*of\s*Last\s*Price\s*Revision", words, y_min=330, y_max=410)
    res["Current List Price: $"] = clean_curr(get_text_right_of(r_cur_price, words, max_x=r_rev_date.x0 if r_rev_date else 340))
    res["Date of Last Price Revision:"] = get_text_right_of(r_rev_date, words, max_x=590)

    r_dom = find_label_rect(r"Days[\-\s]on[\-\s]market:", words, y_min=340, y_max=420)
    r_agent = find_label_rect(r"Listing\s*Company\/Agent:", words, y_min=340, y_max=420)
    r_aph = find_label_rect(r"Ph\.\s*#:", words, y_min=340, y_max=420)
    res["Days-on-market:"] = get_text_right_of(r_dom, words, max_x=r_agent.x0 if r_agent else 260)
    res["Listing Company/Agent:"] = get_text_right_of(r_agent, words, max_x=r_aph.x0 if r_aph else 450)
    res["Ph. #:"] = get_text_right_of(r_aph, words, max_x=590)

    r_last_dt = find_label_rect(r"Last\s*Sale\s*Date:", words, y_min=350, y_max=430)
    r_last_pr = find_label_rect(r"Last\s*Sale\s*Price:", words, y_min=350, y_max=430)
    res["Last Sale Date:"] = get_text_right_of(r_last_dt, words, max_x=r_last_pr.x0 if r_last_pr else 360)
    res["Last Sale Price: $"] = clean_curr(get_text_right_of(r_last_pr, words, max_x=590))

    # Prior sales narrative
    r_prior_sale = find_label_rect(r"Analyze\s*and\s*discuss\s*any\s*current\s*agreement", words, y_min=360, y_max=450)
    r_mand_insp = find_label_rect(r"Are\s*there\s*any\s*mandatory\s*inspections", words, y_min=440, y_max=520)
    res["Analyze and discuss any current agreement of sale, option on or listing of the subject property as well as the last three years of sales history. Include complete marketing history, noting price changes and days on market."] = get_narrative_between(
        words, r_prior_sale, r_mand_insp,
        prompt_prefixes=["Analyze and discuss any current agreement of sale, option on or listing of the subject property as well as the last three years of sales history. Include complete", "marketing history, noting price changes and days on market."]
    )

    r_mand_yes = find_label_rect(r"^Yes", words, y_min=450, y_max=520, x_min=400, x_max=460)
    r_mand_no = find_label_rect(r"^No", words, y_min=450, y_max=520, x_min=450, x_max=520)
    res["Are there any mandatory inspections required by a governmental institution to transfer title?"] = "Yes" if is_checkbox_checked(r_mand_yes, cb) else ("No" if is_checkbox_checked(r_mand_no, cb) else "")

    return res


# =========================================================================
# SECTION 3: NEIGHBORHOOD (PAGE 2 OF 7)
# =========================================================================

def extract_ecr_neighborhood_section(page, words, spatial_text: str, full_doc_text: str = "") -> dict:
    """Extracts Neighborhood characteristics (Page 2) using dynamic regex coordinates."""
    res = {}
    cb = get_page_checked_boxes(page)

    r_nb_label = find_label_rect(r"Define\s*neighborhood\s*boundaries", words, y_min=480, y_max=560)
    r_loc_type = find_label_rect(r"Location\s*Type:", words, y_min=520, y_max=590)

    res["Define neighborhood boundaries (may or may not be the same area used for the Market Trends Analysis on pages 4 and 5)."] = get_narrative_between(
        words, r_nb_label, r_loc_type,
        prompt_prefixes=["Define neighborhood boundaries (may or may not be the same area used for the Market Trends Analysis on pages 4 and 5).", "(may or may not be the same area used for the Market Trends Analysis on pages 4 and 5)."]
    )

    # Location Type: Urban / Suburban / Rural
    r_sub = find_label_rect(r"Suburban", words, y_min=520, y_max=580)
    r_urb = find_label_rect(r"Urban", words, y_min=520, y_max=580)
    r_rur = find_label_rect(r"Rural", words, y_min=520, y_max=580)
    if is_checkbox_checked(r_sub, cb): res["Location Type:"] = "Suburban"
    elif is_checkbox_checked(r_urb, cb): res["Location Type:"] = "Urban"
    elif is_checkbox_checked(r_rur, cb): res["Location Type:"] = "Rural"
    else: res["Location Type:"] = ""

    # Built Up: Over 75% / 25-75% / Under 25%
    r_b25 = find_label_rect(r"25\s*-\s*75%", words, y_min=535, y_max=595)
    r_bover = find_label_rect(r"Over\s*75%", words, y_min=535, y_max=595)
    r_bunder = find_label_rect(r"Under\s*25%", words, y_min=535, y_max=595)
    if is_checkbox_checked(r_b25, cb): res["Built Up:"] = "25 - 75%"
    elif is_checkbox_checked(r_bover, cb): res["Built Up:"] = "Over 75%"
    elif is_checkbox_checked(r_bunder, cb): res["Built Up:"] = "Under 25%"
    else: res["Built Up:"] = ""

    # Development Rate: Rapid / Stable / Slow
    r_dev_rap = find_label_rect(r"Rapid", words, y_min=550, y_max=610, x_min=160, x_max=220)
    r_dev_stb = find_label_rect(r"Stable", words, y_min=550, y_max=610, x_min=240, x_max=290)
    r_dev_slw = find_label_rect(r"Slow", words, y_min=550, y_max=610, x_min=310, x_max=360)
    if is_checkbox_checked(r_dev_rap, cb): res["Development Rate:"] = "Rapid"
    elif is_checkbox_checked(r_dev_stb, cb): res["Development Rate:"] = "Stable"
    elif is_checkbox_checked(r_dev_slw, cb): res["Development Rate:"] = "Slow"
    else: res["Development Rate:"] = ""

    # Change in Present Land Use
    r_not_likely = find_label_rect(r"Not\s*Likely", words, y_min=565, y_max=625, x_min=160, x_max=230)
    r_likely = find_label_rect(r"^Likely", words, y_min=565, y_max=625, x_min=240, x_max=290)
    r_taking = find_label_rect(r"Taking\s*Place", words, y_min=565, y_max=625, x_min=310, x_max=380)
    if is_checkbox_checked(r_not_likely, cb): res["Change in Present Land Use:"] = "Not Likely"
    elif is_checkbox_checked(r_likely, cb): res["Change in Present Land Use:"] = "Likely"
    elif is_checkbox_checked(r_taking, cb): res["Change in Present Land Use:"] = "Taking Place"
    else: res["Change in Present Land Use:"] = ""

    # Present Land Use %
    r_sf = find_label_rect(r"Single\s*Family:", words, y_min=535, y_max=590, x_min=350)
    r_mf = find_label_rect(r"Multi-family:", words, y_min=550, y_max=605, x_min=350)
    r_cond = find_label_rect(r"Condo:", words, y_min=565, y_max=620, x_min=350)
    r_comm = find_label_rect(r"Commercial:", words, y_min=535, y_max=590, x_min=460)
    r_ind = find_label_rect(r"Industrial:", words, y_min=550, y_max=605, x_min=460)

    res["Single Family:"] = clean_curr(get_text_right_of(r_sf, words, max_x=475))
    res["Multi-family:"] = clean_curr(get_text_right_of(r_mf, words, max_x=475))
    res["Condo:"] = clean_curr(get_text_right_of(r_cond, words, max_x=475))
    res["Commercial:"] = clean_curr(get_text_right_of(r_comm, words, max_x=590))
    res["Industrial:"] = clean_curr(get_text_right_of(r_ind, words, max_x=590))
    r_vac_lbl = find_label_rect(r"Vacant", words, y_min=570, y_max=600, x_min=470)
    vac_val = get_text_right_of(r_vac_lbl, words, max_x=590).strip() if r_vac_lbl else ""
    res["Present Land Use comment"] = f"Vacant: {vac_val}".strip() if vac_val else ""

    # Price Range & Age
    r_pr_range = find_label_rect(r"Single-family\s*Price\s*Range:", words, y_min=570, y_max=640)
    r_to_pr = find_label_rect(r"to:\s*\$", words, y_min=570, y_max=640)
    r_pred_pr = find_label_rect(r"Predominant\s*Price:", words, y_min=570, y_max=640)
    res["Single-family Price Range: $"] = clean_curr(get_text_right_of(r_pr_range, words, max_x=r_to_pr.x0 if r_to_pr else 280))
    res["to: $"] = clean_curr(get_text_right_of(r_to_pr, words, max_x=r_pred_pr.x0 if r_pred_pr else 420))
    res["Predominant Price: $"] = clean_curr(get_text_right_of(r_pred_pr, words, max_x=590))

    r_sf_age = find_label_rect(r"Single-family\s*Age:", words, y_min=580, y_max=650)
    r_to_age = find_label_rect(r"years\s*to", words, y_min=580, y_max=650)
    r_pred_age = find_label_rect(r"Predominant\s*Age:", words, y_min=580, y_max=650)
    r_pred_occ = find_label_rect(r"Predominant\s*Occupancy:", words, y_min=580, y_max=650)
    res["Single-family Age"] = clean_curr(get_text_right_of(r_sf_age, words, max_x=r_to_age.x0 if r_to_age else 142))
    res["years to"] = clean_curr(get_text_right_of(r_to_age, words, max_x=r_pred_age.x0 if r_pred_age else 247).replace("years", "").strip())
    res["Predominant Age:"] = clean_curr(get_text_right_of(r_pred_age, words, max_x=r_pred_occ.x0 if r_pred_occ else 390).replace("years", "").strip())

    r_occ_owner = find_label_rect(r"^Owner", words, y_min=590, y_max=630, x_min=490)
    r_occ_tenant = find_label_rect(r"^Tenant", words, y_min=590, y_max=630, x_min=530)
    r_occ_vacant = find_label_rect(r"^Vacant", words, y_min=590, y_max=630, x_min=560)
    if is_checkbox_checked(r_occ_owner, cb): res["Predominant Occupancy:"] = "Owner"
    elif is_checkbox_checked(r_occ_tenant, cb): res["Predominant Occupancy:"] = "Tenant"
    elif is_checkbox_checked(r_occ_vacant, cb): res["Predominant Occupancy:"] = "Vacant"
    else: res["Predominant Occupancy:"] = ""

    # Neighborhood characteristics narrative
    r_char_lbl = find_label_rect(r"Discuss\s*positive\s*and\s*negative\s*neighborhood", words, y_min=600, y_max=680)
    r_appeal_lbl = find_label_rect(r"Overall\s*Neighborhood\s*Appeal\s*Rating:", words, y_min=690, y_max=740)
    res["Discuss positive and negative neighborhood characteristics impacting the subject property’s marketability (e.g., employment, environmental conditions, external obsolescence, property compatibility, schools, vacancy rates, transportation, etc.)."] = get_narrative_between(
        words, r_char_lbl, r_appeal_lbl,
        prompt_prefixes=["obsolescence, property compatibility, schools, vacancy rates, transportation, etc.)."]
    )

    r_nb_exc = find_label_rect(r"^Excellent", words, y_min=695, y_max=740, x_min=170, x_max=250)
    r_nb_good = find_label_rect(r"^Good", words, y_min=695, y_max=740, x_min=240, x_max=330)
    r_nb_avg = find_label_rect(r"^Average", words, y_min=695, y_max=740, x_min=320, x_max=410)
    r_nb_fair = find_label_rect(r"^Fair", words, y_min=695, y_max=740, x_min=400, x_max=480)
    r_nb_poor = find_label_rect(r"^Poor", words, y_min=695, y_max=740, x_min=470, x_max=550)
    if is_checkbox_checked(r_nb_exc, cb): res["Overall Neighborhood Appeal Rating:"] = "Excellent"
    elif is_checkbox_checked(r_nb_good, cb): res["Overall Neighborhood Appeal Rating:"] = "Good"
    elif is_checkbox_checked(r_nb_avg, cb): res["Overall Neighborhood Appeal Rating:"] = "Average"
    elif is_checkbox_checked(r_nb_fair, cb): res["Overall Neighborhood Appeal Rating:"] = "Fair"
    elif is_checkbox_checked(r_nb_poor, cb): res["Overall Neighborhood Appeal Rating:"] = "Poor"
    else: res["Overall Neighborhood Appeal Rating:"] = ""

    return res


# =========================================================================
# SECTION 4: SITE ANALYSIS (PAGE 2 OF 7)
# =========================================================================

def extract_ecr_site_section(page, words, spatial_text: str, full_doc_text: str = "") -> dict:
    """Extracts Site details and utilities (Page 2) using dynamic regex coordinates."""
    res = {}
    cb = get_page_checked_boxes(page)

    r_dim = find_label_rect(r"^Dimensions:", words, y_min=700, y_max=760)
    r_site_area = find_label_rect(r"^Site\s*Area:", words, y_min=715, y_max=770)
    r_corner = find_label_rect(r"Corner\s*Lot:", words, y_min=715, y_max=770)
    r_st_acc = find_label_rect(r"Street\s*Access:", words, y_min=700, y_max=760)
    r_st_maint = find_label_rect(r"Street\s*Maintenance:", words, y_min=715, y_max=770)

    res["Dimensions:"] = get_text_right_of(r_dim, words, max_x=r_st_acc.x0 if r_st_acc else 320)
    raw_area = get_text_right_of(r_site_area, words, max_x=r_corner.x0 if r_corner else 280)
    res["Site Area:"] = re.sub(r"Corner\s*Lot.*", "", raw_area, flags=re.IGNORECASE).strip()

    r_corner = find_label_rect(r"Corner\s*Lot:", words, y_min=730, y_max=745)
    r_cor_yes = find_label_rect(r"^Yes", words, y_min=r_corner.y0 - 4 if r_corner else 730, y_max=r_corner.y1 + 4 if r_corner else 745, x_min=290, x_max=325)
    r_cor_no = find_label_rect(r"^No", words, y_min=r_corner.y0 - 4 if r_corner else 730, y_max=r_corner.y1 + 4 if r_corner else 745, x_min=325, x_max=360)
    if is_checkbox_checked(r_cor_yes, cb): res["Corner Lot"] = "Yes"
    elif is_checkbox_checked(r_cor_no, cb): res["Corner Lot"] = "No"
    else: res["Corner Lot"] = ""

    r_fema = find_label_rect(r"FEMA\s*Special\s*Flood", words, y_min=740, y_max=760)
    r_fema_yes = find_label_rect(r"^Yes", words, y_min=r_fema.y0 - 4 if r_fema else 740, y_max=r_fema.y1 + 4 if r_fema else 760, x_min=170, x_max=220)
    r_fema_no = find_label_rect(r"^No", words, y_min=r_fema.y0 - 4 if r_fema else 740, y_max=r_fema.y1 + 4 if r_fema else 760, x_min=270, x_max=330)
    if is_checkbox_checked(r_fema_yes, cb): res["FEMA Special Flood Hazard Area?"] = "Yes"
    elif is_checkbox_checked(r_fema_no, cb): res["FEMA Special Flood Hazard Area?"] = "No"
    else: res["FEMA Special Flood Hazard Area?"] = ""

    r_acc_pub = find_label_rect(r"^Public", words, y_min=715, y_max=735, x_min=500, x_max=550)
    r_acc_pvt = find_label_rect(r"^Private", words, y_min=715, y_max=735, x_min=540, x_max=590)
    if is_checkbox_checked(r_acc_pub, cb): res["Street Access:"] = "Public"
    elif is_checkbox_checked(r_acc_pvt, cb): res["Street Access:"] = "Private"
    else: res["Street Access:"] = ""

    r_maint_pub = find_label_rect(r"^Public", words, y_min=730, y_max=745, x_min=500, x_max=550)
    r_maint_pvt = find_label_rect(r"^Private", words, y_min=730, y_max=745, x_min=540, x_max=590)
    if is_checkbox_checked(r_maint_pub, cb): res["Street Maintenance:"] = "Public"
    elif is_checkbox_checked(r_maint_pvt, cb): res["Street Maintenance:"] = "Private"
    else: res["Street Maintenance:"] = ""

    r_gated_yes = find_label_rect(r"^Yes", words, y_min=740, y_max=760, x_min=510, x_max=550)
    r_gated_no = find_label_rect(r"^No", words, y_min=740, y_max=760, x_min=550, x_max=590)
    if is_checkbox_checked(r_gated_yes, cb): res["Gated"] = "Yes"
    elif is_checkbox_checked(r_gated_no, cb): res["Gated"] = "No"
    else: res["Gated"] = ""

    # Zoning
    r_zclass = find_label_rect(r"Specific\s*Zoning\s*Classification:", words, y_min=745, y_max=790)
    r_zdesc = find_label_rect(r"Zoning\s*Description:", words, y_min=745, y_max=790)
    r_zperm = find_label_rect(r"Is\s*present\s*use\s*permitted", words, y_min=755, y_max=805)
    res["Specific Zoning Classification:"] = get_text_right_of(r_zclass, words, max_x=r_zdesc.x0 if r_zdesc else 225)
    res["Zoning Description:"] = get_text_right_of(r_zdesc, words, max_x=590)

    r_zperm_yes = find_label_rect(r"^Yes", words, y_min=755, y_max=805, x_min=200, x_max=250)
    r_zperm_no = find_label_rect(r"^No", words, y_min=755, y_max=805, x_min=240, x_max=300)
    if is_checkbox_checked(r_zperm_yes, cb): res["Is present use permitted by zoning regulations?"] = "Yes"
    elif is_checkbox_checked(r_zperm_no, cb): res["Is present use permitted by zoning regulations?"] = "No"
    else: res["Is present use permitted by zoning regulations?"] = ""

    # Utilities: Dynamic detection by row coordinates and checked box position
    util_rows = [
        ("Electric", 812),
        ("Gas", 826),
        ("Water", 840),
        ("San. Sewer:", 855),
    ]
    for util_name, util_y in util_rows:
        u_cbs = [b for b in cb if abs(b.y0 - util_y) < 7 and b.x0 < 220]
        if u_cbs:
            b = u_cbs[0]
            if b.x0 < 125:
                res[util_name] = "Public"
            else:
                nearby = [w[4] for w in words if abs(w[1] - b.y0) < 6 and b.x1 <= w[0] <= b.x1 + 60]
                res[util_name] = nearby[0] if nearby else ""
        else:
            res[util_name] = ""

    # Topography / Shape / View / Landscaping / Drainage / Surfaces
    labels_site = [
        ("Topography:", r"^Topography:", 400),
        ("Shape:", r"^Shape:", 400),
        ("View", r"^View:", 400),
        ("Landscaping:", r"^Landscaping:", 400),
        ("Drainage:", r"^Drainage:", 400),
        ("Street Surface:", r"^Street\s*Surface:", 590),
        ("Driveway Surface:", r"^Driveway\s*Surface:", 590),
        ("Alley:", r"^Alley:", 590),
    ]
    for key, pat, mx in labels_site:
        r = find_label_rect(pat, words, y_min=780, y_max=875)
        res[key] = get_text_right_of(r, words, max_x=mx)

    adv_site_items = [
        ("Adverse Easements/Encroachments:", r"Adverse\s*Easements"),
        ("Adverse External Conditions:", r"Adverse\s*External\s*Conditions"),
        ("Adverse Environmental Conditions:", r"Adverse\s*Environmental"),
    ]
    for key, pat in adv_site_items:
        r_item = find_label_rect(pat, words, y_min=775, y_max=830, x_min=380)
        if r_item:
            r_yes = find_label_rect(r"^Yes", words, y_min=r_item.y0 - 5, y_max=r_item.y1 + 5, x_min=520, x_max=560)
            r_no = find_label_rect(r"^No", words, y_min=r_item.y0 - 5, y_max=r_item.y1 + 5, x_min=555, x_max=595)
            if is_checkbox_checked(r_yes, cb): res[key] = "Yes"
            elif is_checkbox_checked(r_no, cb): res[key] = "No"
            else: res[key] = ""
        else:
            res[key] = ""

    # Site narrative
    r_site_lbl = find_label_rect(r"Discuss\s*positive\s*and\s*negative\s*site", words, y_min=845, y_max=910)
    r_site_app = find_label_rect(r"Overall\s*Site\s*Appeal\s*Rating:", words, y_min=920, y_max=970)
    res["Discuss positive and negative site characteristics impacting the subject property’s marketability (e.g., site utility, conformity, site improvements, leasehold, adverse conditions, etc)"] = get_narrative_between(
        words, r_site_lbl, r_site_app,
        prompt_prefixes=["conditions, etc).", "conditions, etc."]
    )

    r_site_exc = find_label_rect(r"Excellent", words, y_min=930, y_max=950, x_min=150, x_max=200)
    r_site_good = find_label_rect(r"Good", words, y_min=930, y_max=950, x_min=220, x_max=260)
    r_site_avg = find_label_rect(r"Average", words, y_min=930, y_max=950, x_min=270, x_max=310)
    r_site_fair = find_label_rect(r"Fair", words, y_min=930, y_max=950, x_min=320, x_max=360)
    r_site_poor = find_label_rect(r"Poor", words, y_min=930, y_max=950, x_min=370, x_max=410)
    if is_checkbox_checked(r_site_exc, cb): res["Overall Site Appeal Rating:"] = "Excellent"
    elif is_checkbox_checked(r_site_good, cb): res["Overall Site Appeal Rating:"] = "Good"
    elif is_checkbox_checked(r_site_avg, cb): res["Overall Site Appeal Rating:"] = "Average"
    elif is_checkbox_checked(r_site_fair, cb): res["Overall Site Appeal Rating:"] = "Fair"
    elif is_checkbox_checked(r_site_poor, cb): res["Overall Site Appeal Rating:"] = "Poor"
    else: res["Overall Site Appeal Rating:"] = ""

    return res


# =========================================================================
# SECTION 5: IMPROVEMENTS (PAGE 3 OF 7)
# =========================================================================

def extract_ecr_improvements_section(page, words, spatial_text: str, full_doc_text: str = "") -> dict:
    """Extracts Description of Improvements (Page 3) using dynamic regex coordinates."""
    res = {}
    cb = get_page_checked_boxes(page)

    # General
    r_exist = find_label_rect(r"Existing\s*Construction:", words, y_max=120)
    res["Existing Construction:"] = "Yes" if is_checkbox_checked(r_exist, cb, max_dist=100, direction="right") else ""
    r_new = find_label_rect(r"New\s*Construction:", words, y_max=120)
    res["New Construction:"] = "Yes" if is_checkbox_checked(r_new, cb, max_dist=100, direction="right") else ""

    r_comp_y = find_label_rect(r"^Y\b", words, y_min=85, y_max=115, x_min=110, x_max=145)
    r_comp_n = find_label_rect(r"^N\b", words, y_min=85, y_max=115, x_min=145, x_max=175)
    if is_checkbox_checked(r_comp_y, cb): res["Completed"] = "Yes"
    elif is_checkbox_checked(r_comp_n, cb): res["Completed"] = "No"
    else: res["Completed"] = ""

    r_yr_built = find_label_rect(r"Year\s*Built:", words, y_min=90, y_max=140)
    r_act_age = find_label_rect(r"Actual\s*Age", words, y_min=100, y_max=150)
    r_eff_age = find_label_rect(r"Effective\s*Age", words, y_min=110, y_max=160)
    res["Year Built"] = get_text_right_of(r_yr_built, words, max_x=180)
    res["Actual Age (Yrs.):"] = get_text_right_of(r_act_age, words, max_x=180)
    res["Effective Age (Yrs.):"] = get_text_right_of(r_eff_age, words, max_x=180)

    r_att = find_label_rect(r"^Attached:", words, y_min=130, y_max=155, x_max=100)
    r_det = find_label_rect(r"^Detached:", words, y_min=145, y_max=165, x_max=100)
    res["Attached:"] = "Yes" if is_checkbox_checked(r_att, cb, max_dist=100, direction="right") else ""
    res["Detached:"] = "Yes" if is_checkbox_checked(r_det, cb, max_dist=100, direction="right") else ""

    r_units = find_label_rect(r"No\.\s*of\s*Units:", words, y_min=140, y_max=200)
    r_stories = find_label_rect(r"No\.\s*of\s*Stories:", words, y_min=150, y_max=210)
    res["No. of Units"] = get_text_right_of(r_units, words, max_x=180)
    res["No. of Stories"] = get_text_right_of(r_stories, words, max_x=180)

    r_mfg_y = find_label_rect(r"^Y\b", words, y_min=175, y_max=200, x_min=110, x_max=145)
    r_mfg_n = find_label_rect(r"^N\b", words, y_min=175, y_max=200, x_min=145, x_max=175)
    if is_checkbox_checked(r_mfg_y, cb): res["Manufact. Housing"] = "Yes"
    elif is_checkbox_checked(r_mfg_n, cb): res["Manufact. Housing"] = "No"
    else: res["Manufact. Housing"] = ""

    r_mfg_type = find_label_rect(r"type:", words, y_min=190, y_max=215, x_max=120)
    res["If yes, type:"] = get_text_right_of(r_mfg_type, words, max_x=180) if r_mfg_type else ""

    # Exterior
    r_style = find_label_rect(r"Architectural\s*Style:", words, y_min=60, y_max=110)
    r_roof = find_label_rect(r"Roofing\s*Material:", words, y_min=70, y_max=120)
    r_wall = find_label_rect(r"Wall\s*Material:", words, y_min=80, y_max=130)
    r_win = find_label_rect(r"Window\s*Type:", words, y_min=120, y_max=170)
    res["Architectural Style"] = get_text_right_of(r_style, words, max_x=320)
    res["Roofing Material:"] = get_text_right_of(r_roof, words, max_x=320)
    res["Wall Material"] = get_text_right_of(r_wall, words, max_x=320)
    res["Window Type:"] = get_text_right_of(r_win, words, max_x=320)

    r_ins = find_label_rect(r"Insulated:", words, y_min=140, y_max=165, x_min=180, x_max=250)
    r_scr = find_label_rect(r"Screens:", words, y_min=155, y_max=175, x_min=180, x_max=250)
    r_storm = find_label_rect(r"Storm\s*Sash:", words, y_min=165, y_max=185, x_min=180, x_max=250)
    r_gut = find_label_rect(r"Gutters\/Downspouts:", words, y_min=175, y_max=195, x_min=180, x_max=260)
    res["Insulated:"] = "Yes" if is_checkbox_checked(r_ins, cb, max_dist=120, direction="right") else ""
    res["Screens:"] = "Yes" if is_checkbox_checked(r_scr, cb, max_dist=120, direction="right") else ""
    res["Storm Sash:"] = "Yes" if is_checkbox_checked(r_storm, cb, max_dist=120, direction="right") else ""
    res["Gutters/Downspouts:"] = "Yes" if is_checkbox_checked(r_gut, cb, max_dist=120, direction="right") else ""

    # Exterior Amenities (Patio, Deck, Porch, Pool, Spa, Fence)
    amenities = []
    amenity_items = [
        ("Patio", r"Patio:", 200, 220),
        ("Deck", r"Deck:", 200, 220),
        ("Porch", r"Porch:", 200, 220),
        ("Pool", r"Pool:", 215, 230),
        ("Spa", r"Spa:", 215, 230),
        ("Fence", r"Fence:", 215, 230),
    ]
    for label, pat, ymin, ymax in amenity_items:
        r_am = find_label_rect(pat, words, y_min=ymin, y_max=ymax, x_max=320)
        if is_checkbox_checked(r_am, cb, max_dist=30, direction="right"):
            amenities.append(label)
    res["Exterior Amenities"] = ", ".join(amenities)

    # Foundation & Basement
    r_fmat = find_label_rect(r"^Material:", words, y_min=260, y_max=310, x_min=180, x_max=280)
    res["Foundation Material"] = get_text_right_of(r_fmat, words, max_x=320)

    r_slab = find_label_rect(r"Slab:", words, y_min=275, y_max=300)
    r_crawl = find_label_rect(r"Crawl\s*Space:", words, y_min=290, y_max=315)
    r_base = find_label_rect(r"Basement:", words, y_min=305, y_max=325)
    res["Slab:"] = "Yes" if is_checkbox_checked(r_slab, cb, max_dist=120, direction="right") else ""
    res["Crawl Space:"] = "Yes" if is_checkbox_checked(r_crawl, cb, max_dist=120, direction="right") else ""
    res["Basement:"] = "Yes" if is_checkbox_checked(r_base, cb, max_dist=120, direction="right") else ""

    r_sqft = find_label_rect(r"Sq\.\s*Ft\.", words, y_min=315, y_max=335, x_min=180, x_max=230)
    r_fin = find_label_rect(r"%\s*Finished:", words, y_min=325, y_max=345, x_min=180, x_max=240)
    res["Sq. Ft"] = clean_curr(get_text_right_of(r_sqft, words, max_x=280)) if r_sqft else ""
    res["% Finished:"] = clean_curr(get_text_right_of(r_fin, words, max_x=280)) if r_fin else ""

    r_bfloor = find_label_rect(r"Floor:", words, y_min=340, y_max=355, x_min=180, x_max=230)
    r_bwall = find_label_rect(r"Wall:", words, y_min=350, y_max=365, x_min=180, x_max=230)
    r_bceil = find_label_rect(r"Ceiling:", words, y_min=360, y_max=375, x_min=180, x_max=230)
    res["Floor:"] = get_text_right_of(r_bfloor, words, max_x=280) if r_bfloor else ""
    res["Wall:"] = get_text_right_of(r_bwall, words, max_x=280) if r_bwall else ""
    res["Ceiling:"] = get_text_right_of(r_bceil, words, max_x=280) if r_bceil else ""

    r_out_entry = find_label_rect(r"Outside\s*Entry:", words, y_min=370, y_max=390, x_min=180, x_max=260)
    r_sump = find_label_rect(r"Sump:", words, y_min=380, y_max=400, x_min=180, x_max=240)
    res["Outside Entry:"] = "Yes" if is_checkbox_checked(r_out_entry, cb, max_dist=30, direction="right") else ""
    res["Sump:"] = "Yes" if is_checkbox_checked(r_sump, cb, max_dist=30, direction="right") else ""
    r_fnd_oth = find_label_rect(r"^Other:", words, y_min=395, y_max=415, x_min=180, x_max=240)
    res["Other:"] = get_text_right_of(r_fnd_oth, words, max_x=320) if r_fnd_oth else ""

    # Interior & Amenities
    floors = []
    for name, pat, x1, x2 in [("Carpet", r"Carpet:", 310, 350), ("Vinyl", r"Vinyl:", 350, 390), ("Tile", r"Tile:", 380, 420), ("Wood", r"Wood:", 415, 455)]:
        r_f = find_label_rect(pat, words, y_min=75, y_max=90, x_min=x1, x_max=x2)
        if is_checkbox_checked(r_f, cb, max_dist=35, direction="right"): floors.append(name)
    res["Floor"] = ", ".join(floors)

    walls = []
    r_dry = find_label_rect(r"Drywall:", words, y_min=145, y_max=160, x_min=300, x_max=370)
    r_pls = find_label_rect(r"Plaster:", words, y_min=145, y_max=160, x_min=360, x_max=420)
    if is_checkbox_checked(r_dry, cb, max_dist=35, direction="right"): walls.append("Drywall")
    if is_checkbox_checked(r_pls, cb, max_dist=35, direction="right"): walls.append("Plaster")
    res["Walls"] = ", ".join(walls)

    bfloors = []
    for name, pat, x1, x2 in [("Carpet", r"Carpet:", 310, 350), ("Vinyl", r"Vinyl:", 350, 390), ("Tile", r"Tile:", 380, 420), ("Wood", r"Wood:", 415, 455)]:
        r_bf = find_label_rect(pat, words, y_min=212, y_max=226, x_min=x1, x_max=x2)
        if is_checkbox_checked(r_bf, cb, max_dist=35, direction="right"): bfloors.append(name)
    res["Bath Floors"] = ", ".join(bfloors)

    bwain = []
    r_wtile = find_label_rect(r"Tile:", words, y_min=280, y_max=295, x_min=310, x_max=360)
    r_wfiber = find_label_rect(r"Fiberglass:", words, y_min=280, y_max=295, x_min=360, x_max=430)
    if is_checkbox_checked(r_wtile, cb, max_dist=35, direction="right"): bwain.append("Tile")
    if is_checkbox_checked(r_wfiber, cb, max_dist=35, direction="right"): bwain.append("Fiberglass")
    res["Bath Wainscot"] = ", ".join(bwain)

    amen = []
    r_sec = find_label_rect(r"Security\s*System:", words, y_min=350, y_max=365, x_min=310, x_max=380)
    if is_checkbox_checked(r_sec, cb, max_dist=35, direction="right"): amen.append("Security System")
    r_jet = find_label_rect(r"Jetted\s*Tub:", words, y_min=350, y_max=365, x_min=390, x_max=450)
    if is_checkbox_checked(r_jet, cb, max_dist=35, direction="right"): amen.append("Jetted Tub")
    r_fp = find_label_rect(r"Fireplace\(s\):", words, y_min=360, y_max=375, x_min=310, x_max=370)
    fp_num = get_text_right_of(r_fp, words, max_x=400) if r_fp else ""
    if fp_num: amen.append(f"Fireplace(s): {fp_num}")
    res["interior amenities"] = ", ".join(amen)

    # Kitchen & HVAC
    builtins = []
    for name, pat, y in [("Refrigerator", r"Refrigerator:", 72), ("Range", r"Range:", 83), ("Oven", r"Oven:", 95), ("Cooktop", r"Cooktop:", 106), ("Microwave", r"Microwave:", 117), ("Dishwasher", r"Dishwasher:", 129), ("Disposal", r"Disposal:", 140)]:
        r_item = find_label_rect(pat, words, y_min=y-6, y_max=y+6, x_min=450)
        if is_checkbox_checked(r_item, cb, max_dist=120, direction="right"):
            builtins.append(name)
    r_cnt = find_label_rect(r"Counters:", words, y_min=145, y_max=160, x_min=450)
    cnt_val = get_text_right_of(r_cnt, words, max_x=590) if r_cnt else ""
    if cnt_val:
        builtins.append(f"Counters: {cnt_val}")
    res["Kitchen Built-ins"] = ", ".join(builtins)

    r_htype = find_label_rect(r"^Type:", words, y_min=205, y_max=250, x_min=440)
    r_hfuel = find_label_rect(r"^Fuel:", words, y_min=215, y_max=260, x_min=440)
    res["Heating Type:"] = get_text_right_of(r_htype, words, max_x=590)
    res["Heating Fuel:"] = get_text_right_of(r_hfuel, words, max_x=590)

    r_ac = find_label_rect(r"Central\s*Air:", words, y_min=255, y_max=275, x_min=450)
    res["Air Conditioning Central Air:"] = "Yes" if is_checkbox_checked(r_ac, cb, max_dist=120, direction="right") else ""
    r_ac_oth = find_label_rect(r"Other:", words, y_min=270, y_max=285, x_min=450)
    res["Air Conditioning Other:"] = get_text_right_of(r_ac_oth, words, max_x=590) if r_ac_oth else ""

    # Attic
    r_att_scut = find_label_rect(r"Scuttle:", words, y_min=325, y_max=340, x_min=460)
    r_att_drop = find_label_rect(r"Drop\s*Stair:", words, y_min=338, y_max=352, x_min=460)
    r_att_stair = find_label_rect(r"Stairway:", words, y_min=350, y_max=365, x_min=460)
    r_att_fin = find_label_rect(r"Finished:", words, y_min=360, y_max=375, x_min=460)
    res["Attic Scuttle:"] = "Yes" if is_checkbox_checked(r_att_scut, cb, max_dist=100, direction="right") else ""
    res["Attic Drop Stair:"] = "Yes" if is_checkbox_checked(r_att_drop, cb, max_dist=100, direction="right") else ""
    res["Attic Stairway:"] = "Yes" if is_checkbox_checked(r_att_stair, cb, max_dist=100, direction="right") else ""
    res["Attic Finished:"] = "Yes" if is_checkbox_checked(r_att_fin, cb, max_dist=100, direction="right") else ""
    r_att_oth = find_label_rect(r"^Other:", words, y_min=370, y_max=390, x_min=460, x_max=520)
    res["Attic Other:"] = get_text_right_of(r_att_oth, words, max_x=590) if r_att_oth else ""

    # Car Storage
    r_gar_att = find_label_rect(r"Attached:", words, y_min=290, y_max=310, x_min=90, x_max=160)
    r_gar_det = find_label_rect(r"Detached:", words, y_min=305, y_max=325, x_min=90, x_max=160)
    cars_att = get_text_right_of(r_gar_att, words, max_x=200) if r_gar_att else ""
    cars_det = get_text_right_of(r_gar_det, words, max_x=200) if r_gar_det else ""
    if cars_att:
        res["Garage"] = f"{cars_att} Car Attached"
        res["Garage (Attached, Detached, Built-in:)"] = f"Attached ({cars_att} Cars)"
    elif cars_det:
        res["Garage"] = f"{cars_det} Car Detached"
        res["Garage (Attached, Detached, Built-in:)"] = f"Detached ({cars_det} Cars)"
    else:
        res["Garage"] = ""
        res["Garage (Attached, Detached, Built-in:)"] = ""

    r_cp_att = find_label_rect(r"Attached:", words, y_min=338, y_max=355, x_min=90, x_max=160)
    cp_val = get_text_right_of(r_cp_att, words, max_x=200) if r_cp_att else ""
    res["Carport"] = f"{cp_val} Car Attached" if cp_val else ""
    res["Carport (Attached, Detached, Built-in:)"] = f"Attached ({cp_val} Cars)" if cp_val else ""
    r_car_oth = find_label_rect(r"^Other:", words, y_min=370, y_max=390, x_min=50, x_max=100)
    res["Car Storage Other"] = get_text_right_of(r_car_oth, words, max_x=180) if r_car_oth else ""

    r_adeq_y = find_label_rect(r"^Y\b", words, y_min=415, y_max=435, x_min=110, x_max=145)
    r_adeq_n = find_label_rect(r"^N\b", words, y_min=415, y_max=435, x_min=145, x_max=175)
    if is_checkbox_checked(r_adeq_y, cb): res["Adequate:"] = "Yes"
    elif is_checkbox_checked(r_adeq_n, cb): res["Adequate:"] = "No"
    else: res["Adequate:"] = ""

    # Significant Features
    r_feat_lbl = find_label_rect(r"Relevant\s*Characteristics\/Significant\s*Features", words, y_min=420, y_max=460)
    r_pers_prop = find_label_rect(r"Personal\s*Property:", words, y_min=500, y_max=550)
    res["Relevant Characteristics/Significant Features: Describe and discuss features and improvements affecting marketability. (Only those relevant characteristics affecting the Anticipated Sales Price should be considered in the Significant Features fields on pages 5 and 6.)"] = get_narrative_between(
        words, r_feat_lbl, r_pers_prop,
        prompt_prefixes=["Significant Features fields on pages 5 and 6.).", "pages 5 and 6.)."]
    )

    r_pers_yes = find_label_rect(r"^Yes", words, y_min=520, y_max=540, x_min=300, x_max=340)
    r_pers_no = find_label_rect(r"^No", words, y_min=520, y_max=540, x_min=340, x_max=380)
    if is_checkbox_checked(r_pers_yes, cb): res["Personal Property: Is personal property included in the Anticipated Sales Price?"] = "Yes"
    elif is_checkbox_checked(r_pers_no, cb): res["Personal Property: Is personal property included in the Anticipated Sales Price?"] = "No"
    else: res["Personal Property: Is personal property included in the Anticipated Sales Price?"] = ""

    # Room Count Grid (Level 1)
    lvl1_w = [w for w in words if 575 <= ((w[1] + w[3]) / 2.0) <= 595]
    def get_band_val(xmin, xmax):
        sub = [w[4] for w in lvl1_w if xmin <= w[0] and w[2] <= xmax]
        return " ".join(sub).strip()

    res["Living"] = get_band_val(170, 205)
    res["Dining"] = get_band_val(205, 235)
    res["Kitchen"] = get_band_val(235, 265)
    res["Family"] = get_band_val(265, 295)
    res["Bedrooms"] = get_band_val(295, 330)
    res["Baths"] = get_band_val(330, 365)
    res["Other"] = get_band_val(365, 395)
    res["List of Other Rooms"] = get_band_val(395, 540)
    res["GLA"] = clean_curr(get_band_val(540, 600))
    res["Rooms"] = get_band_val(80, 170)
    bsmt_w = [w[4] for w in words if 623 <= ((w[1] + w[3]) / 2.0) <= 635 and w[0] > 170]
    res["Basement"] = " ".join(bsmt_w).strip() if bsmt_w else ""
    att_w = [w[4] for w in words if 635 <= ((w[1] + w[3]) / 2.0) <= 647 and w[0] > 170]
    res["Attic"] = " ".join(att_w).strip() if att_w else ""

    # Summary row below grid at y ~ 653:
    r_sum_bdrms = find_label_rect(r"Bedrooms:", words, y_min=645, y_max=665, x_max=120)
    r_sum_baths = find_label_rect(r"Baths:", words, y_min=645, y_max=665, x_min=150, x_max=200)
    r_sum_gla = find_label_rect(r"Gross\s*Living\s*Area:", words, y_min=645, y_max=665, x_min=230, x_max=310)

    res["Bedrooms:"] = get_text_right_of(r_sum_bdrms, words, max_x=160) if r_sum_bdrms else res["Bedrooms"]
    res["Baths:"] = get_text_right_of(r_sum_baths, words, max_x=240) if r_sum_baths else res["Baths"]
    res["Gross Living Area: square feet"] = clean_curr(get_text_right_of(r_sum_gla, words, max_x=350)) if r_sum_gla else res["GLA"]

    # Conditions & Comments
    r_mod_no = find_label_rect(r"None\s*Observed", words, y_min=665, y_max=680, x_min=400)
    r_mod_yes = find_label_rect(r"^Yes", words, y_min=665, y_max=680, x_min=380, x_max=430)
    if is_checkbox_checked(r_mod_no, cb): res["Evidence of any apparent modifications to dwelling (e.g., additions, enclosures, etc.):"] = "None Observed"
    elif is_checkbox_checked(r_mod_yes, cb): res["Evidence of any apparent modifications to dwelling (e.g., additions, enclosures, etc.):"] = "Yes"
    else: res["Evidence of any apparent modifications to dwelling (e.g., additions, enclosures, etc.):"] = ""

    r_adv_no = find_label_rect(r"None\s*Observed", words, y_min=680, y_max=695, x_min=400)
    r_adv_yes = find_label_rect(r"^Yes", words, y_min=680, y_max=695, x_min=380, x_max=430)
    if is_checkbox_checked(r_adv_no, cb): res["Evidence of any adverse conditions requiring inspections (e.g., dampness, termites, settlement, etc.):"] = "None Observed"
    elif is_checkbox_checked(r_adv_yes, cb): res["Evidence of any adverse conditions requiring inspections (e.g., dampness, termites, settlement, etc.):"] = "Yes"
    else: res["Evidence of any adverse conditions requiring inspections (e.g., dampness, termites, settlement, etc.):"] = ""

    r_mod_lbl = find_label_rect(r"Discuss\s*evidence\s*of\s*any\s*apparent\s*modifications", words, y_min=680, y_max=730)
    r_comm_lbl = find_label_rect(r"^Comments:", words, y_min=740, y_max=780)
    res["Discuss evidence of any apparent modifications and/or adverse conditions and list any recommended inspections and why (e.g., structural, materials, mechanical, roof, code compliance, etc.)."] = get_narrative_between(
        words, r_mod_lbl, r_comm_lbl,
        prompt_prefixes=["code compliance, etc.)."]
    )

    r_asis_p3 = find_label_rect(r"as\s*is", words, y_min=745, y_max=765, x_min=170, x_max=240)
    r_ci_p3 = find_label_rect(r"Client\s*Instruction", words, y_min=745, y_max=765, x_min=210, x_max=300)
    if is_checkbox_checked(r_asis_p3, cb):
        res["Subject Property’s Appearance:"] = "“as is”"
    elif is_checkbox_checked(r_ci_p3, cb):
        res["Subject Property’s Appearance:"] = "Client Instruction"
    else:
        res["Subject Property’s Appearance:"] = ""

    r_rep_lbl = find_label_rect(r"Are\s*any\s*repairs\s*and\/or\s*improvements\s*recommended\?", words, y_min=780, y_max=820)
    res["Comments:"] = get_narrative_between(
        words, r_comm_lbl, r_rep_lbl,
        prompt_prefixes=["Comments:"]
    )

    r_rep_yes = find_label_rect(r"^Yes", words, y_min=790, y_max=810, x_min=230, x_max=270)
    r_rep_no = find_label_rect(r"^No", words, y_min=790, y_max=810, x_min=270, x_max=310)
    if is_checkbox_checked(r_rep_yes, cb): res["Are any repairs and/or improvements recommended?"] = "Yes"
    elif is_checkbox_checked(r_rep_no, cb): res["Are any repairs and/or improvements recommended?"] = "No"
    else: res["Are any repairs and/or improvements recommended?"] = ""

    r_rep_desc = find_label_rect(r"marketability\.", words, y_min=800, y_max=825)
    res["List recommended repairs and/or Improvements and provide a total estimated cost to cure. Comment on the impact on marketability."] = get_text_right_of(r_rep_desc, words, max_x=590) if r_rep_desc else ""

    r_cost = find_label_rect(r"Total\s*Estimated\s*Cost\s*to\s*Cure:\s*\$", words, y_min=860, y_max=880)
    res["Total Estimated Cost to Cure: $"] = clean_curr(get_text_right_of(r_cost, words, max_x=240)) if r_cost else ""

    # Overall Ratings
    ratings_headers = [("Excellent", 254), ("Good", 330), ("Average", 406), ("Fair", 482), ("Poor", 558)]
    rating_rows = [
        ("Exterior Appeal", 896),
        ("Quality of Construction", 907),
        ("Condition", 919),
        ("Interior Appeal/Décor", 930),
        ("Functional Utility", 941),
    ]
    for row_name, row_y in rating_rows:
        row_cbs = [b for b in cb if abs(b.y0 - row_y) < 6 and b.x0 >= 220]
        if row_cbs:
            b = row_cbs[0]
            closest = min(ratings_headers, key=lambda rh: abs(b.x0 - rh[1]))
            res[row_name] = closest[0]
        else:
            res[row_name] = ""

    return res


# =========================================================================
# SECTION 6: MARKET TRENDS ANALYSIS (PAGES 4 & 5 OF 7)
# =========================================================================

def extract_ecr_market_trends_section(page_p4, page_p5, words_p4, words_p5, spatial_text: str, full_doc_text: str = "") -> dict:
    """Extracts Market Trends, Closed Sales Analysis, and Competing Properties dynamically without hardcoding."""
    res = {}
    cb4 = get_page_checked_boxes(page_p4) if page_p4 else []
    cb5 = get_page_checked_boxes(page_p5) if page_p5 else []

    # PAGE 4: Market Segment Narrative
    r_mkt_lbl = find_label_rect(r"Market\s*Segment:\s*Define", words_p4, y_min=60, y_max=120)
    r_new_comp = find_label_rect(r"New\s*Construction\s*Competition:", words_p4, y_min=130, y_max=190)
    res["Market Segment: Define the specific market segment (the area in which potential buyers for the subject property may look for substitute properties) and identify the data source used for the market trends data collection and analysis. Utilize geographic, economic or price range criteria to define your market segment. (In order to obtain a dependable quantity of data for analysis, the defined market segment may be different from the subject property’s neighborhood as defined on page 2)"] = get_narrative_between(
        words_p4, r_mkt_lbl, r_new_comp,
        prompt_prefixes=["as defined on page 2).", "neighborhood as defined on page 2)."]
    )

    # PAGE 4: Competitive Factors Checkboxes (Dynamic detection)
    def get_choice(lbl_x0, lbl_x1, y0, y1, options):
        row_words = [w for w in words_p4 if y0 <= w[1] <= y1 and lbl_x0 <= w[0] <= lbl_x1]
        for opt in options:
            opt_words = [w for w in row_words if w[4] == opt]
            for w in opt_words:
                for b in cb4:
                    if abs(b.y0 - w[1]) < 6 and b.x0 <= w[0] <= b.x1 + 12:
                        return opt
        return ""

    res["New Construction Competition:"] = get_choice(50, 230, 150, 166, ["Yes", "No"])
    res["Distressed Market Competition:"] = get_choice(230, 410, 150, 166, ["Yes", "No"])
    res["Prevalence of Seller Concessions:"] = get_choice(410, 590, 150, 166, ["Yes", "No"])
    res["Adverse Financing Conditions:"] = get_choice(50, 230, 166, 178, ["Yes", "No"])
    res["Mortgage Interest Rates:"] = get_choice(230, 590, 166, 178, ["Decreasing", "Stable", "Increasing"])

    r_comm = find_label_rect(r"^Comments:", words_p4, y_min=160, y_max=220)
    r_hist = find_label_rect(r"Market\s*Segment\s*[–\-]\s*Historic\s*Price\s*Trends:", words_p4, y_min=240, y_max=300)
    res["Comments"] = get_narrative_between(words_p4, r_comm, r_hist, prompt_prefixes=["Comments:"])

    # CLOSED SALES ANALYSIS TABLE (Dynamic parsing)
    cs_blocks = [b for b in page_p4.get_text("blocks") if "0-3 Months" in b[4] or "Closed Sales" in b[4]]
    if cs_blocks:
        target_b = [b for b in cs_blocks if "0-3 Months" in b[4]]
        if target_b:
            cs_lines = [l.strip() for l in target_b[0][4].split("\n") if l.strip()]
            for r_idx in range(1, 7):
                start = (r_idx - 1) * 8
                if start + 8 <= len(cs_lines):
                    row_items = cs_lines[start:start + 8]
                    res[f"ClosedSales_Row{r_idx}_TimePeriod"] = row_items[0]
                    res[f"ClosedSales_Row{r_idx}_Months"] = row_items[1]
                    res[f"ClosedSales_Row{r_idx}_ClosedSales"] = row_items[2]
                    res[f"ClosedSales_Row{r_idx}_AbsorptionRate"] = row_items[3]
                    res[f"ClosedSales_Row{r_idx}_SalesPrice"] = row_items[4]
                    res[f"ClosedSales_Row{r_idx}_DOM"] = row_items[5]
                    res[f"ClosedSales_Row{r_idx}_Other1"] = row_items[6]
                    res[f"ClosedSales_Row{r_idx}_Other2"] = row_items[7]

    res["Appraiser Defined Time Period"] = res.get("ClosedSales_Row1_TimePeriod", "")
    res["No. of Months"] = res.get("ClosedSales_Row1_Months", "")
    res["Total No. of Closed Sales"] = res.get("ClosedSales_Row1_ClosedSales", "")
    res["Monthly Absorption Rate"] = res.get("ClosedSales_Row1_AbsorptionRate", "")
    res["Sales Price"] = res.get("ClosedSales_Row1_SalesPrice", "")
    res["Days on Market"] = res.get("ClosedSales_Row1_DOM", "")

    # Historic Trends Checkbox
    ht_val = ""
    ht_words = [w for w in words_p4 if 485 <= w[1] <= 515]
    for opt in ["Increasing", "Decreasing", "Stable", "Unstable"]:
        for w in [rw for rw in ht_words if rw[4] == opt]:
            for b in cb4:
                if abs(b.y0 - w[1]) < 6 and b.x0 <= w[0] <= b.x1 + 12:
                    ht_val = opt
                    break
            if ht_val: break
        if ht_val: break
    res["Historic Trends"] = ht_val

    r_ana_lbl = find_label_rect(r"Analyze\s*and\s*discuss\s*the\s*above\s*trends", words_p4, y_min=480, y_max=550)
    r_curr_lbl = find_label_rect(r"CURRENT\s*FACTORS", words_p4, y_min=640, y_max=700)
    res["Analyze and discuss the above trends relevant to developing the Market Change Adjustment in the Sales Comparison Analysis grid on page 6. Discuss the relevance and reliability of the data and any other factors used to determine historic price trends – e.g., sale and resale data."] = get_narrative_between(
        words_p4, r_ana_lbl, r_curr_lbl,
        prompt_prefixes=["e.g., sale and resale data."]
    )

    # Overall Historic Price Trend Checkbox
    ov_val = ""
    ov_words = [w for w in words_p4 if 640 <= w[1] <= 655]
    for opt in ["Increasing", "Decreasing", "Stable", "Unstable"]:
        for w in [rw for rw in ov_words if rw[4] == opt]:
            for b in cb4:
                if abs(b.y0 - w[1]) < 6 and b.x0 <= w[0] <= b.x1 + 12:
                    ov_val = opt
                    break
            if ov_val: break
        if ov_val: break
    res["Overall Historic Price Trend:"] = ov_val

    # CURRENT LISTINGS & PENDING SALES (Dynamic x-band parsing)
    cl_words = [w for w in words_p4 if 725 <= w[1] <= 745 and w[4] not in ["$", "/$", "Mean", "Median"]]
    def get_cl_in_xband(xmin, xmax):
        w_in = [w for w in cl_words if xmin <= w[0] <= xmax]
        w_in.sort(key=lambda w: w[0])
        return " ".join(w[4] for w in w_in).strip()

    res["CURRENT LISTINGS - Total No. of Active Listings"] = get_cl_in_xband(60, 115)
    res["CURRENT LISTINGS - List Price"] = get_cl_in_xband(125, 200)
    res["CURRENT LISTINGS - Days on Market"] = get_cl_in_xband(200, 275)
    res["CURRENT LISTINGS - Other:"] = get_cl_in_xband(275, 330)

    res["PENDING SALES - Total No. of Active Listings"] = get_cl_in_xband(330, 385)
    res["PENDING SALES - List Price"] = get_cl_in_xband(395, 470)
    res["PENDING SALES - Days on Market"] = get_cl_in_xband(470, 530)
    res["PENDING SALES - Other:"] = get_cl_in_xband(530, 590)

    # Supply/Demand (Dynamic x-band parsing)
    sd_num_words = [w for w in words_p4 if 793 <= w[1] <= 808 and re.match(r"^[\d\.]+$", w[4])]
    def get_sd_in_xband(xmin, xmax):
        w_in = [w for w in sd_num_words if xmin <= w[0] <= xmax]
        return w_in[0][4] if w_in else ""

    res["Supply/Demand - Appraiser Defined Time Period"] = get_sd_in_xband(45, 120)
    res["Supply/Demand - No. of Months"] = get_sd_in_xband(180, 230)
    res["Supply/Demand - Total No. of Closed Sales"] = get_sd_in_xband(230, 280)
    res["Supply/Demand - Monthly Absorption Rate"] = get_sd_in_xband(290, 360)
    res["Supply/Demand - Total No. of Active Listings (exclude pending sales)"] = get_sd_in_xband(390, 460)
    res["Supply/Demand - No. of Months Supply of Inventory"] = get_sd_in_xband(500, 570)

    r_abs_ana = find_label_rect(r"Analyze\s*and\s*discuss\s*the\s*above\s*data", words_p4, y_min=790, y_max=840)
    r_supp_stat = find_label_rect(r"Current\s*Supply\/Demand\s*Status:", words_p4, y_min=910, y_max=960)
    res["Analyze and discuss the above data (consider seasonal influences, pending sales, expired/withdrawn listings, relevance and reliability of data, etc.) that pertains to current supply/demand in the subject property’s market segment."] = get_narrative_between(
        words_p4, r_abs_ana, r_supp_stat,
        prompt_prefixes=["market segment."]
    )

    # Current Supply/Demand Status Checkbox
    csd_val = ""
    csd_words = [w for w in words_p4 if 930 <= w[1] <= 950]
    for opt in ["Under Supply", "In Balance", "Over Supply"]:
        opt_first = opt.split()[0]
        for w in [rw for rw in csd_words if rw[4] == opt_first]:
            for b in cb4:
                if abs(b.y0 - w[1]) < 6 and b.x0 <= w[0] <= b.x1 + 12:
                    csd_val = opt
                    break
            if csd_val: break
        if csd_val: break
    res["Current Supply/Demand Status:"] = csd_val

    # PAGE 5: Competing Properties Table (Dynamic Multi-Column Extraction)
    cols = [
        {"name": "Subject Property", "col_key": "Subject Property", "p_idx": None, "x0": 145, "x1": 258},
        {"name": "Competing Property #1", "col_key": "Competing Property #1", "p_idx": 1, "x0": 258, "x1": 368},
        {"name": "Competing Property #2", "col_key": "Competing Property #2", "p_idx": 2, "x0": 368, "x1": 478},
        {"name": "Competing Property #3", "col_key": "Competing Property #3", "p_idx": 3, "x0": 478, "x1": 595},
    ]

    row_defs = [
        ("Address", 115, 142),
        ("Proximity to Subject", 142, 153),
        ("Original List Price", 153, 164),
        ("Current List Price", 164, 175),
        ("Last Price Revision Date", 175, 186),
        ("Days on Market", 186, 198),
        ("Last Sale Date/Price", 198, 210),
        ("Site Area", 210, 221),
        ("Site Appeal", 221, 232),
        ("Actual Age (Years)", 232, 243),
        ("Condition", 243, 255),
        ("Rooms", 255, 266),
        ("Gross Living Area", 266, 277),
        ("GLA Data Source", 277, 289),
        ("Basement Area", 289, 300),
        ("Car Storage", 300, 312),
        ("Significant Features", 312, 350),
        ("Comparative Rating to Subject", 350, 370),
    ]

    rating_cb = [cb for cb in cb5 if 350 <= cb.y0 <= 370]

    grid_rows = []
    for col in cols:
        col_dict = {"Property Name": col["name"]}
        for attr_name, y0, y1 in row_defs:
            if attr_name == "Comparative Rating to Subject":
                val = ""
                if col["p_idx"] is not None:
                    for cb in rating_cb:
                        if col["x0"] <= cb.x0 <= col["x1"]:
                            r_words = [w for w in words_p5 if 355 <= w[1] <= 370 and cb.x1 <= w[0] <= cb.x1 + 45]
                            r_words.sort(key=lambda x: x[0])
                            if r_words:
                                val = r_words[0][4]
                                break
            elif attr_name == "Proximity to Subject" and col["p_idx"] is None:
                val = ""
            else:
                cell_words = [
                    w for w in words_p5
                    if col["x0"] <= w[0] <= col["x1"] and y0 <= w[1] <= y1
                ]
                cell_words.sort(key=lambda w: (round(w[1] / 5.0) * 5.0, w[0]))
                
                if attr_name in ["Original List Price", "Current List Price"]:
                    nums = [w[4] for w in cell_words if w[4] not in ["$", "/$", "Unknown", "unknown"]]
                    val = ("$" + nums[-1]) if nums else ("Unknown" if any("unknown" in w[4].lower() for w in cell_words) else "")
                elif attr_name == "Rooms":
                    bdrm_val = ""
                    bath_val = ""
                    for idx_w, w in enumerate(cell_words):
                        if "Bdrm" in w[4]:
                            if idx_w + 1 < len(cell_words) and re.match(r"^\d+$", cell_words[idx_w + 1][4]):
                                bdrm_val = cell_words[idx_w + 1][4]
                            elif idx_w - 1 >= 0 and re.match(r"^\d+$", cell_words[idx_w - 1][4]):
                                bdrm_val = cell_words[idx_w - 1][4]
                        if "Bath" in w[4]:
                            if idx_w + 1 < len(cell_words) and re.match(r"^[\d\.]+$", cell_words[idx_w + 1][4]):
                                bath_val = cell_words[idx_w + 1][4]
                            elif idx_w - 1 >= 0 and re.match(r"^[\d\.]+$", cell_words[idx_w - 1][4]):
                                bath_val = cell_words[idx_w - 1][4]
                    if bdrm_val or bath_val:
                        val = f"Bdrms. {bdrm_val} Baths {bath_val}".strip()
                    else:
                        val = " ".join(w[4] for w in cell_words).strip()
                elif attr_name == "Gross Living Area":
                    nums = [w[4] for w in cell_words if re.match(r"^[\d,]+$", w[4])]
                    val = f"{nums[0]} sq. ft." if nums else " ".join(w[4] for w in cell_words).strip()
                elif attr_name == "Significant Features":
                    lines_w = []
                    for w in cell_words:
                        if w[4] not in lines_w:
                            lines_w.append(w[4])
                    val = ", ".join(lines_w)
                elif attr_name == "Last Sale Date/Price":
                    val = " ".join(w[4] for w in cell_words).strip()
                    val = re.sub(r"\s*/\s*\$\s*", " / $", val)
                else:
                    val = " ".join(w[4] for w in cell_words).strip()

            col_dict[attr_name] = val
            if col["p_idx"] is not None:
                res[f"Competing Property #{col['p_idx']} - {attr_name}"] = val
                if col["p_idx"] == 1:
                    res[f"Competing Property - {attr_name}"] = val
            else:
                res[f"Subject Property - {attr_name}"] = val
                res[f"Competing Property - Subject - {attr_name}"] = val

        grid_rows.append(col_dict)

    res["COMPETING_PROPERTIES_GRID"] = grid_rows

    # Competing Properties Narratives (Dynamic extraction without hardcoded fallbacks)
    r_cp1_lbl = find_label_rect(r"Competing\s*Property\s*#1:", words_p5, y_min=370, y_max=430)
    r_cp2_lbl = find_label_rect(r"Competing\s*Property\s*#2:", words_p5, y_min=410, y_max=460)
    r_cp3_lbl = find_label_rect(r"Competing\s*Property\s*#3:", words_p5, y_min=450, y_max=500)
    r_real_lbl = find_label_rect(r"Is\s*the\s*subject\s*property\s*realistically\s*priced", words_p5, y_min=490, y_max=540)

    res["Competing Property #1:"] = get_narrative_between(words_p5, r_cp1_lbl, r_cp2_lbl, prompt_prefixes=["Competing Property #1:"])
    res["Competing Property #2"] = get_narrative_between(words_p5, r_cp2_lbl, r_cp3_lbl, prompt_prefixes=["Competing Property #2:"])
    res["Competing Property #3:"] = get_narrative_between(words_p5, r_cp3_lbl, r_real_lbl, prompt_prefixes=["Competing Property #3:"])

    # Realistically priced checkbox (Dynamic)
    real_val = ""
    real_words = [w for w in words_p5 if 490 <= w[1] <= 515]
    for opt in ["Yes", "No", "Not listed"]:
        opt_first = opt.split()[0]
        for w in [rw for rw in real_words if rw[4] == opt_first]:
            for b in cb5:
                if abs(b.y0 - w[1]) < 6 and b.x0 <= w[0] <= b.x1 + 12:
                    real_val = opt
                    break
            if real_val: break
        if real_val: break
    res["Is the subject property realistically priced to sell within the assignment marketing period?"] = real_val

    # Sell first narrative (Dynamic)
    r_first_lbl = find_label_rect(r"Identify\s*which\s*competing\s*property\s*is\s*positioned", words_p5, y_min=500, y_max=550)
    r_range_lbl = find_label_rect(r"Competitive\s*List\s*Price\s*Range", words_p5, y_min=550, y_max=600)
    res["Identify which competing property is positioned to sell first and why. Include the subject property, if listed. Provide support for the competitive list price range below."] = get_narrative_between(
        words_p5, r_first_lbl, r_range_lbl,
        prompt_prefixes=["competitive list price range below."]
    )

    # Competitive List Price Range (Dynamic)
    range_words = [w[4] for w in words_p5 if 550 <= w[1] <= 570 and 420 <= w[0] <= 575 and re.match(r"^[\d,]+$", w[4])]
    if len(range_words) >= 2:
        res["Competitive List Price Range for Subject Property (to achieve a sale within the Assignment Marketing Period):"] = f"{range_words[0]} to {range_words[1]}"
    elif len(range_words) == 1:
        res["Competitive List Price Range for Subject Property (to achieve a sale within the Assignment Marketing Period):"] = range_words[0]
    else:
        res["Competitive List Price Range for Subject Property (to achieve a sale within the Assignment Marketing Period):"] = ""

    # Forecasted Trends (Dynamic checkboxes)
    def match_p5_cb(y_min, y_max, options):
        region_words = [w for w in words_p5 if y_min <= w[1] <= y_max]
        for opt in options:
            opt_first = opt.split()[0]
            for w in [rw for rw in region_words if rw[4] == opt_first]:
                for b in cb5:
                    if abs(b.y0 - w[1]) < 6 and b.x0 <= w[0] <= b.x1 + 12:
                        return opt
        return ""

    res["Market Segment Normal Marketing Time:"] = match_p5_cb(695, 715, ["0 to 120 days", "Over 120 days"])
    res["Subject Property’s Estimated Normal Marketing Time:"] = match_p5_cb(710, 725, ["0 to 120 days", "Over 120 days"])
    res["Assignment Marketing Period:"] = match_p5_cb(725, 740, ["Not to exceed 120 days", "Client Instruction"])

    # Forecasted Price Trend: check both 't' indicator and cb5
    fpt_val = ""
    fpt_words = [w for w in words_p5 if 750 <= w[1] <= 765]
    for opt in ["Increasing", "Stable", "Decreasing"]:
        w_opt = [w for w in fpt_words if w[4] == opt]
        if w_opt:
            opt_x = w_opt[0][0]
            t_word = [w for w in fpt_words if w[4] == "t" and opt_x - 15 <= w[0] <= opt_x]
            if t_word:
                fpt_val = opt
                break
    if not fpt_val:
        fpt_val = match_p5_cb(748, 765, ["Increasing", "Stable", "Decreasing"])
    res["Forecasted Price Trend"] = fpt_val

    res["If increasing or decreasing, the Forecasted Price Trend is anticipated to continue at:"] = match_p5_cb(760, 775, ["Current Pace", "Decelerated Pace", "Accelerated Pace"])
    res["Forecasted Sales Activity (not to exceed 120 days or as instructed by client):"] = match_p5_cb(770, 785, ["Increasing", "Stable", "Decreasing"])

    # Forecasting Adjustment Analysis narrative (Dynamic)
    r_fore_ana = find_label_rect(r"Forecasting\s*Adjustment\s*Analysis:", words_p5, y_min=770, y_max=820)
    r_fore_chk = find_label_rect(r"^Forecasting:", words_p5, y_min=910, y_max=970)
    res["Forecasting Adjustment Analysis: Discuss the Historic Trends and Current Factors from pages 4 and 5 and any additional pertinent data relevant to developing the Forecasting Adjustment on page 6. Analyze the anticipated trend of market conditions and prices during the subject property’s assignment marketing period (e.g., mood of the market, seasonal market trends, economic and employment shifts, demographic trends, buyer profile, etc.). This discussion should explain and support the Forecasting Adjustment on page 6"] = get_narrative_between(
        words_p5, r_fore_ana, r_fore_chk,
        prompt_prefixes=["Forecasting Adjustment on page 6.", "Forecasting Adjustment on page 6"]
    )

    # Forecasting checkbox (Dynamic)
    res["Forecasting:"] = match_p5_cb(930, 955, ["Positive Adjustment", "Zero Adjustment", "Negative Adjustment"])

    return res


# =========================================================================
# SECTION 7: SALES COMPARISON & SALES GRID (PAGE 6 OF 7)
# =========================================================================

def parse_dynamic_sales_grid(page, comp_names, is_addendum=False):
    """
    Parses Sales Comparison Grid dynamically using row label anchors found on the left column.
    """
    words = page.get_text("words")
    cols = [
        ("Subject", 150, 260),
        (comp_names[0], 260, 370),
        (comp_names[1], 370, 480),
        (comp_names[2], 480, 590)
    ]
    if is_addendum:
        cols = cols[1:]  # No subject on addendum

    def get_band(y_c, x0, x1, y_tol=5.5):
        matched = [w for w in words if abs(((w[1] + w[3]) / 2.0) - y_c) <= y_tol and not (w[2] < x0 or w[0] > x1)]
        matched.sort(key=lambda x: x[0])
        return " ".join(w[4] for w in matched).strip()

    # Discover row label y-centers in left column (x < 155)
    row_patterns = [
        ("Address", r"^Address", 120.4),
        ("Proximity to Subject", r"Proximity\s*to\s*Subject", 138.4),
        ("Original List Price", r"Original\s*List\s*Price", 149.8),
        ("Orig. Sales-to-list Price Ratio", r"Orig\.\s*Sales-to-list", 161.2),
        ("Current & Final List Price", r"Current\s*&\s*Final\s*List\s*Price", 172.6),
        ("Final Sales-to-list Price Ratio", r"Final\s*Sales-to-list", 184.0),
        ("Sales Price", r"Sales\s*Price", 195.4),
        ("Closing Date", r"Closing\s*Date", 206.8),
        ("Days on Market", r"Days\s*on\s*Market", 218.2),
        ("Last Sale Date/Price", r"Last\s*Sale\s*Date\/Price", 229.6),
        ("Data Verification Sources", r"Data\s*Verification\s*Sources", 241.0),
        ("Financing Type", r"Financing\s*Type", 269.5),
        ("Concessions", r"^Concessions", 280.9),
        ("Market Change Adjustment*", r"Market\s*Change\s*Adjustment", 303.7),
        ("Neighborhood Appeal", r"Neighborhood\s*Appeal", 315.1),
        ("Site Area", r"Site\s*Area", 326.5),
        ("Site Appeal", r"Site\s*Appeal", 337.9),
        ("Arch. Style/Exterior Appea", r"Arch\.\s*Style", 349.3),
        ("Quality of Construction", r"Quality\s*of\s*Construction", 360.7),
        ("Actual Age (Years)", r"Actual\s*Age", 372.1),
        ("Condition", r"^Condition", 383.5),
        ("Interior Appeal/Décor", r"Interior\s*Appeal", 394.9),
        ("Rooms", r"^Rooms", 406.3),
        ("Gross Living Area", r"Gross\s*Living\s*Area", 429.1),
        ("GLA Data Source", r"GLA\s*Data\s*Source", 440.5),
        ("Basement Area", r"Basement\s*Area", 451.9),
        ("Basement Finish", r"Basement\s*Finish", 463.3),
        ("Functional Utility", r"Functional\s*Utility", 474.7),
        ("Heating/Cooling", r"Heating\/Cooling", 486.1),
        ("Car Storage", r"Car\s*Storage", 497.5),
        ("Fireplace(s)", r"Fireplace\(s\)", 508.9),
        ("Significant Features", r"Significant\s*Features", 520.3),
        ("Forecasting Adjustment**", r"Forecasting\s*Adjustment", 577.3),
        ("Net Adjustment", r"Net\s*Adjustment", 588.7),
        ("Adjusted Sales Price", r"Adjusted\s*Sales\s*Price", 600.1),
    ]

    row_y_map = {}
    for attr, pat, fallback_y in row_patterns:
        r = find_label_rect(pat, words, x_max=155)
        row_y_map[attr] = (r.y0 + r.y1) / 2.0 if r else fallback_y

    grid_data = {}
    for c_name, x0, x1 in cols:
        c_dict = {}
        for attr, _, _ in row_patterns:
            yc = row_y_map[attr]
            val = get_band(yc, x0, x1)
            # Clean currency where applicable
            if any(k in attr for k in ["Price", "Adjustment", "Gross Living Area"]):
                c_dict[attr] = clean_curr(val)
            else:
                c_dict[attr] = clean_field_value(val)
        
        # Split Bdrms and Baths from Rooms
        rooms_val = c_dict.get("Rooms", "")
        m_rm = re.findall(r"\d+(?:\.\d+)?", rooms_val)
        if len(m_rm) >= 2:
            c_dict["Bdrms"] = m_rm[0]
            c_dict["Baths"] = m_rm[1]
        elif len(m_rm) == 1:
            c_dict["Bdrms"] = m_rm[0]
            c_dict["Baths"] = ""
        else:
            c_dict["Bdrms"] = ""
            c_dict["Baths"] = ""

        grid_data[c_name] = c_dict

    return grid_data


def extract_ecr_sales_comparison_section(page, words, spatial_text: str, full_doc_text: str = "", addendum_page=None) -> dict:
    """Extracts Sales Comparison Grid and narrative analysis using dynamic regex coordinates."""
    res = {}
    g1 = parse_dynamic_sales_grid(page, ["COMPARABLE SALE #1", "COMPARABLE SALE #2", "COMPARABLE SALE #3"], is_addendum=False)
    if addendum_page:
        g2 = parse_dynamic_sales_grid(addendum_page, ["COMPARABLE SALE #4", "COMPARABLE SALE #5", "COMPARABLE SALE #6"], is_addendum=True)
        comps_dict = {**g1, **g2}
    else:
        comps_dict = g1

    res["SALES_GRID"] = comps_dict
    for c_name, c_fields in comps_dict.items():
        res[c_name] = c_fields

    # Narrative fields
    r_c1 = find_label_rect(r"Comparable\s*Sale\s*#1:", words, y_min=640, y_max=720)
    r_c2 = find_label_rect(r"Comparable\s*Sale\s*#2:", words, y_min=690, y_max=760)
    r_c3 = find_label_rect(r"Comparable\s*Sale\s*#3:", words, y_min=720, y_max=800)
    r_trans_info = find_label_rect(r"Did\s*the\s*transferee\s*provide\s*any\s*information", words, y_min=770, y_max=840)
    r_recon = find_label_rect(r"^Reconciliation", words, y_min=810, y_max=870)
    r_sub_list = find_label_rect(r"Is\s*the\s*Subject\s*Property\s*currently\s*listed\?", words, y_min=860, y_max=910)

    res["Comparable Sale #1:"] = get_narrative_between(words, r_c1, r_c2, prompt_prefixes=["Comparable Sale #1:"])
    res["Comparable Sale #2"] = get_narrative_between(words, r_c2, r_c3, prompt_prefixes=["Comparable Sale #2:"])
    res["Comparable Sale #3:"] = get_narrative_between(words, r_c3, r_trans_info, prompt_prefixes=["Comparable Sale #3:"])

    # Transferee info checkbox (Dynamic)
    cb6 = get_page_checked_boxes(page)
    trans_cb = [b for b in cb6 if 770 <= b.y0 <= 785]
    if trans_cb:
        nearby_trans = [w[4] for w in words if abs(w[1] - trans_cb[0].y0) < 6 and trans_cb[0].x1 <= w[0] <= trans_cb[0].x1 + 30]
        res["Did the transferee provide any information for consideration?"] = nearby_trans[0] if nearby_trans else ""
    else:
        res["Did the transferee provide any information for consideration?"] = ""

    res["Reconciliation (discuss the specific reasoning supporting your opinion of Anticipated Sales Price)"] = get_narrative_between(
        words, r_recon, r_sub_list,
        prompt_prefixes=["opinion of Anticipated Sales Price):"]
    )

    return res


# =========================================================================
# SECTION 8: ANTICIPATED SALES PRICE (PAGE 6 OF 7)
# =========================================================================

def extract_ecr_anticipated_sales_price_section(page, words, spatial_text: str, full_doc_text: str = "") -> dict:
    """Extracts Anticipated Sales Price conclusion dynamically without hardcoding."""
    res = {}
    cb = get_page_checked_boxes(page)

    # Is Subject Property currently listed? (Dynamic checkbox)
    list_cb = [b for b in cb if 860 <= b.y0 <= 875]
    if list_cb:
        nearby = [w[4] for w in words if abs(w[1] - list_cb[0].y0) < 6 and list_cb[0].x1 <= w[0] <= list_cb[0].x1 + 30]
        res["Is the Subject Property currently listed?"] = nearby[0] if nearby else ""
    else:
        res["Is the Subject Property currently listed?"] = ""

    r_cprice = find_label_rect(r"Current\s*List\s*Price:\s*\$", words, y_min=860, y_max=880)
    res["Current List Price: $"] = clean_curr(get_text_right_of(r_cprice, words, max_x=590))

    r_crange = find_label_rect(r"Competitive\s*List\s*Price\s*Range", words, y_min=870, y_max=895)
    res["Competitive List Price Range for Subject Property (to achieve a sale within the Assignment Marketing Period): $"] = clean_curr(get_text_right_of(r_crange, words, max_x=590))

    # Assignment Marketing Period (Dynamic checkbox)
    amp_cb = [b for b in cb if 885 <= b.y0 <= 898]
    if amp_cb:
        nearby = [w[4] for w in words if abs(w[1] - amp_cb[0].y0) < 6 and amp_cb[0].x1 <= w[0] <= amp_cb[0].x1 + 80]
        res["Assignment Marketing Period:"] = " ".join(nearby[:5]) if nearby else ""
    else:
        res["Assignment Marketing Period:"] = ""

    # Subject Property's Appearance (Dynamic checkbox)
    app_cb = [b for b in cb if 898 <= b.y0 <= 912]
    if app_cb:
        nearby = [w[4] for w in words if abs(w[1] - app_cb[0].y0) < 6 and app_cb[0].x1 <= w[0] <= app_cb[0].x1 + 50]
        res["Subject Property’s Appearance"] = " ".join(nearby[:2]) if nearby else ""
    else:
        res["Subject Property’s Appearance"] = ""

    r_is_dollar = find_label_rect(r"is\s*\$", words, y_min=910, y_max=930)
    op_price = get_text_right_of(r_is_dollar, words, max_x=590) if r_is_dollar else ""
    res["Opinion of Anticipated Sales Price as of ____ is $______________"] = clean_curr(op_price)

    r_as_of = find_label_rect(r"as\s*of", words, y_min=910, y_max=930)
    res["Date of Value Opinion"] = get_text_right_of(r_as_of, words, max_x=r_is_dollar.x0 if r_is_dollar else 340)

    r_trans = find_label_rect(r"Transferee:", words, y_min=935)
    r_app = find_label_rect(r"Appraiser:", words, y_min=935)
    res["Transferee"] = get_text_right_of(r_trans, words, max_x=r_app.x0 if r_app else 340)
    res["Appraiser"] = get_text_right_of(r_app, words, max_x=590)

    return res


# =========================================================================
# SECTION 9: CERTIFICATION (PAGE 7 OF 7)
# =========================================================================

def extract_ecr_certification_section(page, words, spatial_text: str, full_doc_text: str = "") -> dict:
    """Extracts Appraiser & Co-appraiser Certifications (Page 7) using dynamic regex coordinates."""
    res = {}

    r_cond_lbl = find_label_rect(r"ADDITIONAL\s*CONTINGENT\s*AND\s*LIMITING\s*CONDITIONS", words, y_min=550, y_max=620)
    r_addr_lbl = find_label_rect(r"Subject\s*Property\s*Address:", words, y_min=810, y_max=860)

    res["Additional Contingent and Limiting Conditions..."] = get_narrative_between(
        words, r_cond_lbl, r_addr_lbl,
        prompt_prefixes=["ADDITIONAL CONTINGENT AND LIMITING CONDITIONS, CERTIFICATIONS AND COMMENTS"]
    )

    r_unit = find_label_rect(r"Unit:", words, y_min=810, y_max=860)
    r_county = find_label_rect(r"County:", words, y_min=810, y_max=860)
    res["Subject Property Address"] = get_text_right_of(r_addr_lbl, words, max_x=r_unit.x0 if r_unit else 320)
    res["Subject Unit:"] = get_text_right_of(r_unit, words, max_x=r_county.x0 if r_county else 400)
    res["Subject County:"] = get_text_right_of(r_county, words, max_x=590)

    r_city = find_label_rect(r"^City:", words, y_min=825, y_max=875, x_max=120)
    r_state = find_label_rect(r"State:", words, y_min=825, y_max=875, x_min=300, x_max=360)
    r_zip = find_label_rect(r"Zip\s*Code:", words, y_min=825, y_max=875, x_min=420)
    res["Subject City:"] = get_text_right_of(r_city, words, max_x=r_state.x0 if r_state else 300)
    res["Subject State:"] = get_text_right_of(r_state, words, max_x=r_zip.x0 if r_zip else 440)
    res["Subject Zip Code:"] = get_text_right_of(r_zip, words, max_x=590)

    # Appraiser Signature Block (y > 850, x < 280)
    r_app_sig = find_label_rect(r"^Signature:", words, y_min=855, y_max=875, x_max=100)
    res["APPRAISER Signature:"] = get_text_right_of(r_app_sig, words, max_x=280) if r_app_sig else ""
    r_app_name = find_label_rect(r"^Name:", words, y_min=865, y_max=900, x_max=100)
    res["APPRAISER Name:"] = get_text_right_of(r_app_name, words, max_x=280)

    r_app_insp = find_label_rect(r"Date\s*of\s*Appraisal\s*Inspection:", words, y_min=875, y_max=915, x_max=150)
    res["Date of Appraisal Inspection:"] = get_text_right_of(r_app_insp, words, max_x=280)

    r_app_eff = find_label_rect(r"Date\s*of\s*Value\s*Opinion", words, y_min=890, y_max=930, x_max=160)
    res["Date of Value Opinion (Effective Date):"] = get_text_right_of(r_app_eff, words, max_x=280)

    r_app_lic = find_label_rect(r"State\s*License\s*\/\s*Certification\s*#:", words, y_min=900, y_max=940, x_max=160)
    res["State License/Certification #:"] = get_text_right_of(r_app_lic, words, max_x=280)

    r_app_st = find_label_rect(r"State\s*of\s*License\s*\/\s*Certification:", words, y_min=915, y_max=955, x_max=160)
    res["State of License/Certification"] = get_text_right_of(r_app_st, words, max_x=280)

    r_app_exp = find_label_rect(r"Expiration\s*Date\s*of\s*License", words, y_min=925, y_max=970, x_max=180)
    res["Expiration Date of License/Certification:"] = get_text_right_of(r_app_exp, words, max_x=280)

    # Co-Appraiser Block (x > 280)
    r_co_sig = find_label_rect(r"^Signature:", words, y_min=855, y_max=875, x_min=280)
    res["CO-APPRAISER (if applicable) Signature:"] = get_text_right_of(r_co_sig, words, max_x=590) if r_co_sig else ""
    r_co_name = find_label_rect(r"^Name:", words, y_min=865, y_max=900, x_min=280)
    res["CO-APPRAISER Name"] = get_text_right_of(r_co_name, words, max_x=590) if r_co_name else ""
    r_co_insp = find_label_rect(r"Date\s*of\s*Appraisal\s*Inspection:", words, y_min=875, y_max=915, x_min=280)
    res["CO-APPRAISER Date of Appraisal Inspection:"] = get_text_right_of(r_co_insp, words, max_x=590) if r_co_insp else ""
    r_co_eff = find_label_rect(r"Date\s*of\s*Value\s*Opinion", words, y_min=890, y_max=930, x_min=280)
    res["CO-APPRAISER Date of Value Opinion (Effective Date)"] = get_text_right_of(r_co_eff, words, max_x=590) if r_co_eff else ""
    r_co_lic = find_label_rect(r"State\s*License\s*\/\s*Certification\s*#:", words, y_min=900, y_max=940, x_min=280)
    res["CO-APPRAISER State License/Certification #:"] = get_text_right_of(r_co_lic, words, max_x=590) if r_co_lic else ""
    r_co_st = find_label_rect(r"State\s*of\s*License\s*\/\s*Certification:", words, y_min=915, y_max=955, x_min=280)
    res["CO-APPRAISER State of License/Certification:"] = get_text_right_of(r_co_st, words, max_x=590) if r_co_st else ""
    r_co_exp = find_label_rect(r"Expiration\s*Date\s*of\s*License", words, y_min=925, y_max=970, x_min=280)
    res["CO-APPRAISER Expiration Date of License/Certification:"] = get_text_right_of(r_co_exp, words, max_x=590) if r_co_exp else ""

    cb7 = get_page_checked_boxes(page)
    r_did = find_label_rect(r"^Did\b", words, y_min=935, y_max=960, x_min=280, x_max=360)
    r_did_not = find_label_rect(r"Did\s*Not", words, y_min=935, y_max=960, x_min=320, x_max=420)
    if is_checkbox_checked(r_did, cb7):
        res["Did Did Not personally inspect the subject property."] = "Did"
    elif is_checkbox_checked(r_did_not, cb7):
        res["Did Did Not personally inspect the subject property."] = "Did Not"
    else:
        res["Did Did Not personally inspect the subject property."] = ""

    return res


# =========================================================================
# MAIN ENTRY POINT
# =========================================================================

def extract_fields_from_pdf_ecr_offline(pdf_path: str) -> dict:
    """
    100% Offline Pure Python Extractor for Employee Relocation Council (ERC / ECR) Appraisal Reports.
    Extracts all 9 standard ERC/ECR categories using dynamic regex coordinate anchors:
      - SUMMARY
      - SUBJECT
      - NEIGHBORHOOD
      - SITE
      - IMPROVEMENTS
      - MARKET_TRENDS
      - SALES_COMPARISON
      - ANTICIPATED_SALES_PRICE
      - CERTIFICATION
      + SALES_GRID
      + EXTRACTED_PHOTOS
    """
    doc = None
    try:
        if isinstance(pdf_path, (bytes, bytearray)):
            doc = pymupdf.open(stream=pdf_path, filetype="pdf")
        else:
            doc = pymupdf.open(pdf_path)

        full_doc_text = "\n".join(p.get_text("text") for p in doc)
        page_indices = locate_ecr_pages(doc)

        def get_page_info(idx):
            if idx is not None and idx < len(doc):
                page = doc[idx]
                words, st = extract_page_words_and_lines(page)
                return page, words, st
            return None, [], ""

        p1_page, p1_words, p1_st = get_page_info(page_indices["summary_p1"])
        p2_page, p2_words, p2_st = get_page_info(page_indices["subject_p2"])
        p3_page, p3_words, p3_st = get_page_info(page_indices["improvements_p3"])
        p4_page, p4_words, p4_st = get_page_info(page_indices["market_trends_p4"])
        p5_page, p5_words, p5_st = get_page_info(page_indices["market_trends_p5"])
        p6_page, p6_words, p6_st = get_page_info(page_indices["sales_grid_p6"])
        p7_page, p7_words, p7_st = get_page_info(page_indices["certification_p7"])
        p8_page, p8_words, p8_st = get_page_info(page_indices["comps_4_6"])

        # Section-by-section dynamic extraction
        summary_data = extract_ecr_summary_section(p1_page, p1_words, p1_st, full_doc_text)
        subject_data = extract_ecr_subject_section(p2_page, p2_words, p2_st, full_doc_text)
        neighborhood_data = extract_ecr_neighborhood_section(p2_page, p2_words, p2_st, full_doc_text)
        site_data = extract_ecr_site_section(p2_page, p2_words, p2_st, full_doc_text)
        improvements_data = extract_ecr_improvements_section(p3_page, p3_words, p3_st, full_doc_text)
        market_trends_data = extract_ecr_market_trends_section(p4_page, p5_page, p4_words, p5_words, p4_st, full_doc_text)
        sales_comparison_data = extract_ecr_sales_comparison_section(p6_page, p6_words, p6_st, full_doc_text, addendum_page=p8_page)
        anticipated_price_data = extract_ecr_anticipated_sales_price_section(p6_page, p6_words, p6_st, full_doc_text)
        certification_data = extract_ecr_certification_section(p7_page, p7_words, p7_st, full_doc_text)

        sections = {
            "SUMMARY": summary_data,
            "SUBJECT": subject_data,
            "NEIGHBORHOOD": neighborhood_data,
            "SITE": site_data,
            "IMPROVEMENTS": improvements_data,
            "MARKET_TRENDS": market_trends_data,
            "SALES_COMPARISON": sales_comparison_data,
            "ANTICIPATED_SALES_PRICE": anticipated_price_data,
            "CERTIFICATION": certification_data
        }

        # Clean all extracted field strings
        for sec_name, sec_dict in sections.items():
            if isinstance(sec_dict, dict):
                for k, v in list(sec_dict.items()):
                    if isinstance(v, str):
                        sec_dict[k] = clean_field_value(v)
                    elif isinstance(v, dict):
                        for sub_k, sub_v in list(v.items()):
                            if isinstance(sub_v, str):
                                v[sub_k] = clean_field_value(sub_v)

        # Build unified dictionary
        unified_fields = {}
        for sec_name, sec_dict in sections.items():
            unified_fields[sec_name] = sec_dict
            if isinstance(sec_dict, dict):
                for k, v in sec_dict.items():
                    unified_fields[k] = v

        if "SALES_GRID" in sales_comparison_data:
            unified_fields["SALES_GRID"] = sales_comparison_data["SALES_GRID"]
        if "COMPETING_PROPERTIES_GRID" in market_trends_data:
            unified_fields["COMPETING_PROPERTIES_GRID"] = market_trends_data["COMPETING_PROPERTIES_GRID"]

        # Photos & Exhibits Extraction
        try:
            try:
                from .pdf_extractor_offline import extract_photos_and_captions
            except (ImportError, ValueError):
                from api.pdf_extractor_offline import extract_photos_and_captions
            if isinstance(pdf_path, str) and os.path.exists(pdf_path):
                extracted_photos = extract_photos_and_captions(doc, pdf_path)
                unified_fields["EXTRACTED_PHOTOS"] = extracted_photos
        except Exception as e:
            print(f"[ERC] Photos extraction note: {e}")

        unified_fields["formType"] = "ERC"
        unified_fields["form_type"] = "ERC"

        raw_json_str = json.dumps(unified_fields, indent=2, default=str)
        unified_fields["raw"] = raw_json_str

        return {
            "fields": unified_fields,
            "raw": raw_json_str,
            "pages_detected": page_indices,
            "status": "success"
        }

    except Exception as e:
        import traceback
        traceback.print_exc()
        return {
            "error": "Extraction Error",
            "message": str(e)
        }
    finally:
        if doc:
            try:
                doc.close()
            except Exception:
                pass
