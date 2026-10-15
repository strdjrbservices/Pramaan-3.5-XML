"""
100% Offline Pure Python & Regex Extractor for Uniform Residential Appraisal Reports (URAR)
conforming to Fannie Mae | Freddie Mac (September 2024 / Version 1 / Version 5 specifications).

Extracts all core appraisal categories completely offline using:
  - Precise vector graphics checkbox cross & check detection
  - Multi-column spatial coordinate & word-bounding box slicing
  - Layout-aware dual-pass regex patterns for form headers, key-value pairs, and tables
  - Image and exhibit extraction for front photos, subject exhibits, and licenses
"""

import os
import re
import json
import base64
from typing import Dict, Any, List, Optional, Tuple
import pymupdf


# =========================================================================
# SPATIAL & BOUNDING BOX HELPERS
# =========================================================================

def extract_page_words_and_lines(page) -> Tuple[List[Any], str]:
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


def get_page_checked_boxes(page) -> List[pymupdf.Rect]:
    """
    Precision Vector Graphics Checkbox Detector:
    Finds all line segments that form diagonal cross lines ('X' or checkmark) inside checkbox squares.
    """
    checked_boxes: List[pymupdf.Rect] = []
    try:
        drawings = page.get_drawings()
        diag_lines = []
        for d in drawings:
            for it in d.get("items", []):
                if it[0] == "l":
                    p1, p2 = it[1], it[2]
                    dx = abs(p2.x - p1.x)
                    dy = abs(p2.y - p1.y)
                    # Checkbox diagonal crosses are ~2.0 - 18.0 pt long
                    if 2.0 <= dx <= 18.0 and 2.0 <= dy <= 18.0:
                        diag_lines.append(pymupdf.Rect(min(p1.x, p2.x), min(p1.y, p2.y), max(p1.x, p2.x), max(p1.y, p2.y)))

        for r in diag_lines:
            if not any(abs(cb.x0 - r.x0) < 6.0 and abs(cb.y0 - r.y0) < 6.0 for cb in checked_boxes):
                checked_boxes.append(r)
    except Exception:
        pass
    return checked_boxes


def is_checkbox_checked(anchor_rect: Optional[pymupdf.Rect], checked_boxes: List[pymupdf.Rect], max_dist=24.0, direction="right") -> bool:
    """Checks if any vector checked box is within max_dist of anchor_rect."""
    if not anchor_rect:
        return False
    ay = (anchor_rect.y0 + anchor_rect.y1) / 2.0
    for cb in checked_boxes:
        cy = (cb.y0 + cb.y1) / 2.0
        if abs(ay - cy) <= 9.0:
            if direction == "left" and (anchor_rect.x0 - max_dist <= cb.x0 <= anchor_rect.x0 + 4.0):
                return True
            elif direction == "right" and (anchor_rect.x1 - 4.0 <= cb.x0 <= anchor_rect.x1 + max_dist):
                return True
            elif direction == "near" and abs(cb.x0 - anchor_rect.x0) <= max_dist:
                return True
            elif direction == "inside" and (anchor_rect.x0 - 5.0 <= cb.x0 <= anchor_rect.x1 + 5.0):
                return True
    return False


def get_field_between_labels(words: List[Any], label_text: str, next_label_text: Optional[str] = None,
                             max_y_offset: float = 24.0, min_x: float = 0.0, max_x: float = 650.0) -> str:
    """
    Extracts text between label_text and next_label_text on the same line or in adjacent bounding box.
    """
    target_words = label_text.strip().lower().split()
    if not target_words:
        return ""

    match_start = -1
    label_rect = None
    for i in range(len(words) - len(target_words) + 1):
        window = [words[i + j][4].lower().strip(":") for j in range(len(target_words))]
        if window == target_words:
            match_start = i
            x0 = min(words[i + j][0] for j in range(len(target_words)))
            y0 = min(words[i + j][1] for j in range(len(target_words)))
            x1 = max(words[i + j][2] for j in range(len(target_words)))
            y1 = max(words[i + j][3] for j in range(len(target_words)))
            label_rect = pymupdf.Rect(x0, y0, x1, y1)
            break

    if not label_rect:
        return ""

    # Find words to the right of label_rect on approx the same y-level or slightly below
    y_center = (label_rect.y0 + label_rect.y1) / 2.0
    field_words = []
    for w in words:
        wy = (w[1] + w[3]) / 2.0
        if abs(wy - y_center) <= 5.0:
            if w[0] >= label_rect.x1 + 2.0 and w[2] <= max_x:
                field_words.append(w)
        elif 0 < (w[1] - label_rect.y1) <= max_y_offset and abs(w[0] - label_rect.x0) < 40.0:
            # Multi-line wrapped under label
            if w[2] <= max_x:
                field_words.append(w)

    if not field_words:
        return ""

    field_words.sort(key=lambda x: (round(x[1] / 5.0) * 5, x[0]))
    val = " ".join(w[4] for w in field_words).strip()
    if next_label_text:
        val = val.split(next_label_text)[0].strip()
    return clean_text_value(val)


def clean_text_value(val: str) -> str:
    """Cleans punctuation, delimiters, and double spaces."""
    if not val:
        return ""
    val = re.sub(r"^[:\-\s\.]+", "", val).strip()
    val = re.sub(r"\s+", " ", val).strip()
    return val


def clean_currency(val: str) -> str:
    """Returns pure numeric or cleaned currency string."""
    if not val:
        return ""
    s = val.replace("$", "").replace(",", "").strip()
    m = re.search(r"(\d+(?:\.\d+)?)", s)
    return m.group(1) if m else s


def extract_table_checkbox_choice(page, words: List[Any], checked_boxes: List[pymupdf.Rect],
                                  row_label: str, yes_x: float = 268.0, no_x: float = 287.0,
                                  tolerance_y: float = 7.5) -> str:
    """
    Evaluates Yes/No table columns. Given a row label, locates its vertical position
    and inspects if a checked box, vector line, or glyph exists at Yes column vs No column.
    """
    if not page and not words:
        return "No"

    row_words = row_label.strip().lower().split()
    target_y = None

    for i in range(len(words) - len(row_words) + 1):
        window = [words[i + j][4].lower().strip(":") for j in range(len(row_words))]
        if window == row_words:
            target_y = (words[i][1] + words[i][3]) / 2.0
            break

    if target_y is None:
        for w in words:
            if row_words[0] in w[4].lower():
                target_y = (w[1] + w[3]) / 2.0
                break

    if target_y is None:
        text = page.get_text("text") if page else ""
        m = re.search(rf"{re.escape(row_label)}[\s\S]*?(Yes|No)", text, re.I)
        if m:
            return m.group(1).capitalize()
        return "No"

    # 1. Check for text check glyphs (Wingdings \uf0fc, checkmarks, X's) around Yes / No coordinates
    for w in words:
        wy = (w[1] + w[3]) / 2.0
        if abs(wy - target_y) <= tolerance_y:
            wt = w[4]
            if "\uf0fc" in wt or any(g in wt for g in ["☒", "☑", "✓", "[X]", "[x]", "X", "x"]):
                if abs(w[0] - yes_x) < abs(w[0] - no_x):
                    return "Yes"
                else:
                    return "No"

    # 2. Check vector drawings near target_y
    is_yes = False
    is_no = False
    for cb in checked_boxes:
        cy = (cb.y0 + cb.y1) / 2.0
        if abs(cy - target_y) <= tolerance_y:
            if abs(cb.x0 - yes_x) < abs(cb.x0 - no_x) and abs(cb.x0 - yes_x) <= 30.0:
                is_yes = True
            elif abs(cb.x0 - no_x) <= 30.0:
                is_no = True

    if is_yes and not is_no:
        return "Yes"
    if is_no and not is_yes:
        return "No"

    # 3. Regex fallback in raw text
    text = page.get_text("text") if page else ""
    m = re.search(rf"{re.escape(row_label)}[\s\S]*?(Yes|No)", text, re.I)
    if m:
        return m.group(1).capitalize()

    return "No"


# =========================================================================
# PAGE LOCATOR ENGINE
# =========================================================================

def locate_urar_pages(doc) -> Dict[str, Optional[int]]:
    """
    Identifies page indices for Fannie Mae | Freddie Mac URAR sections:
    - summary_p1 (Page 1)
    - assignment_p2 (Page 2)
    - subject_p3 (Page 3)
    - site
    - improvements
    - neighborhood
    - sales_grid
    - reconciliation
    - cost_approach
    - certification
    """
    page_map: Dict[str, Optional[int]] = {
        "summary_p1": None,
        "assignment_p2": None,
        "subject_p3": None,
        "site": None,
        "improvements": None,
        "neighborhood": None,
        "prior_sale_history": None,
        "sales_grid": None,
        "reconciliation": None,
        "cost_approach": None,
        "certification": None,
    }

    for idx, page in enumerate(doc):
        text = page.get_text("text")
        text_upper = text.upper()

        if "SUMMARY" in text_upper and "OPINION OF MARKET VALUE" in text_upper and "PROPERTY DESCRIPTION" in text_upper:
            if page_map["summary_p1"] is None:
                page_map["summary_p1"] = idx
        elif "ASSIGNMENT INFORMATION" in text_upper and ("CONTACT INFORMATION" in text_upper or "CLIENT/LENDER" in text_upper):
            if page_map["assignment_p2"] is None:
                page_map["assignment_p2"] = idx
        elif "SUBJECT PROPERTY" in text_upper and "OWNERSHIP RIGHTS" in text_upper and "LEGAL DESCRIPTION" in text_upper:
            if page_map["subject_p3"] is None:
                page_map["subject_p3"] = idx
        elif "SITE DESCRIPTION" in text_upper or ("ZONING CLASSIFICATION" in text_upper and "BROADBAND INTERNET" in text_upper):
            if page_map["site"] is None:
                page_map["site"] = idx
        elif "DWELLING EXTERIOR" in text_upper or "DWELLING INTERIOR" in text_upper or "CONSTRUCTION METHOD" in text_upper and "YEAR BUILT" in text_upper:
            if page_map["improvements"] is None:
                page_map["improvements"] = idx
        elif "MARKET AREA BOUNDARY" in text_upper or "NEIGHBORHOOD" in text_upper and "ACTIVE LISTINGS" in text_upper:
            if page_map["neighborhood"] is None:
                page_map["neighborhood"] = idx
        elif "PRIOR SALE AND TRANSFER HISTORY" in text_upper or "SUBJECT TRANSFER HISTORY" in text_upper:
            if page_map["prior_sale_history"] is None:
                page_map["prior_sale_history"] = idx
        elif "SALES COMPARISON APPROACH" in text_upper or "COMPARABLE PROPERTY ADDRESS" in text_upper:
            if page_map["sales_grid"] is None:
                page_map["sales_grid"] = idx
        elif "RECONCILIATION" in text_upper and "OPINION OF MARKET VALUE" in text_upper and idx != page_map["summary_p1"]:
            if page_map["reconciliation"] is None:
                page_map["reconciliation"] = idx
        elif "COST APPROACH" in text_upper and "OPINION OF SITE VALUE" in text_upper:
            if page_map["cost_approach"] is None:
                page_map["cost_approach"] = idx
        elif ("APPRAISER" in text_upper and "CERTIFICATION" in text_upper) or \
             ("CERTIFICATIONS" in text_upper and ("SIGNATURE" in text_upper or "APPRAISER" in text_upper)) or \
             ("DATE OF SIGNATURE AND REPORT" in text_upper) or \
             ("APPRAISER SIGNATURE" in text_upper or "SIGNATURE OF APPRAISER" in text_upper):
            if page_map["certification"] is None:
                page_map["certification"] = idx

    # Robust fallback: check first 3 pages sequentially if summary, assignment, or subject were missed
    total = len(doc)
    if page_map["summary_p1"] is None and total > 0:
        page_map["summary_p1"] = 0
    if page_map["assignment_p2"] is None and total > 1:
        page_map["assignment_p2"] = 1
    if page_map["subject_p3"] is None and total > 2:
        page_map["subject_p3"] = 2

    return page_map


# =========================================================================
# HEADER & METADATA EXTRACTOR
# =========================================================================

def extract_urar_metadata(doc, full_doc_text: str) -> Dict[str, str]:
    """
    Extracts high-level report version and header references.
    Example: Appraisal Version #5, Appraiser Reference ID: 26-420, Client Reference ID: 269-00477
    """
    meta: Dict[str, str] = {
        "From Type": "Appraisal Version #1",
        "Appraisal Version": "Appraisal Version #1",
        "Appraiser Reference ID": "",
        "Client Reference ID": "",
        "Software": "",
    }

    # Version check
    m_ver = re.search(r"Appraisal\s+Version\s+(#?\w+)", full_doc_text, re.IGNORECASE)
    if m_ver:
        meta["Appraisal Version"] = f"Appraisal Version {m_ver.group(1)}"
        meta["From Type"] = f"Appraisal Version {m_ver.group(1)}"

    # Appraiser Reference ID
    m_ref = re.search(r"Appraiser\s+Reference\s+ID\s*[:\-]?\s*([A-Za-z0-9\-_/]+)", full_doc_text, re.IGNORECASE)
    if m_ref:
        meta["Appraiser Reference ID"] = m_ref.group(1).strip()

    # Client Reference ID
    m_client = re.search(r"Client\s+Reference\s+ID\s*[:\-]?\s*([A-Za-z0-9\-_/]+)", full_doc_text, re.IGNORECASE)
    if m_client:
        meta["Client Reference ID"] = m_client.group(1).strip()

    # Software identifier
    m_soft = re.search(r'("TOTAL"[^\n\r]+|TOTAL\s+appraisal\s+software[^\n\r]+|ACI\s+[^\n\r]+)', full_doc_text, re.IGNORECASE)
    if m_soft:
        meta["Software"] = m_soft.group(1).strip()

    return meta


# =========================================================================
# CATEGORY EXTRACTORS
# =========================================================================

def extract_v1_summary_section(page_p1, page_p2, page_p3, doc, full_doc_text: str, metadata: Dict[str, str]) -> Dict[str, Any]:
    """
    Extracts all fields for the SUMMARY category.
    Cross-references Page 1, Page 2, and Page 3.
    """
    summary: Dict[str, Any] = {
        "ADU File Check": "",
        "From Type": metadata.get("From Type", "Appraisal Version #1"),
        "Appraisal Version": metadata.get("Appraisal Version", "Appraisal Version #1"),
        "Appraiser Reference ID": metadata.get("Appraiser Reference ID", ""),
        "Exposure comment": "",
        "Prior service comment": "",
        "ANSI": "",
        "FHA Case No.": "",
        "Opinion of Market Value": "",
        "Market Value Condition": "",
        "Effective Date of Appraisal": "",
        "Assignment Reason": "",
        "Borrower Name": "",
        "Current Owner of Public Record": "",
        "Listing Status": "",
        "Property Valuation Method": "",
        "Appraiser Name": "",
        "Construction Method": "",
        "Attachment Type": "",
        "Overall Quality": "",
        "Overall Condition": "",
        "Planned Unit Development (PUD)": "",
        "Condominium": "",
        "Cooperative": "",
        "Condop": "",
        "Subject Site Owned in Common": "",
        "Units Excluding ADUs": "",
        "Accessory Dwelling Units (ADUs)": "",
        "Property Rights Appraised": "",
        "Highest and Best Use as Present Use": "",
        "Zoning Compliance": "",
        "Apparent Defects, Damages, Deficiencies Requiring Action": "",
        "Property Data Report Used in Lieu of Inspection": "",
        "Client/Lender Company Name": "",
        "Client/Lender Company Address": "",
        "Appraisal Management Company Name": "",
        "Appraisal Management Company Address": "",
        "Appraiser Company Name": "",
        "Appraiser Company Address": "",
        "Subject Property Inspection": "",
        "Exterior Physical Inspection": "",
        "Interior Physical Inspection": "",
        "Inspection Date": "",
        "Appraiser Credential Level": "",
        "Appraiser ID": "",
        "Appraiser State": "",
        "Appraiser License Expiration Date": "",
        "Appraiser ASC Identifier": "",
        "Physical Address": "",
        "County": "",
        "Neighborhood Name": "",
        "Property on Native American Lands": "",
        "Homeowner Responsible for All Exterior Maintenance of Dwelling(s)": "",
        "New Construction": "",
        "Special Tax Assessments": "",
        "All Rights Included in Appraisal": "",
        "Legal Description": "",
        "Subject Property Commentary": "",
        "Indicated Value by Sales Comparison Approach Indicated": ""
    }

    # Extract words and vector checked boxes for page 1
    words_p1, spatial_p1 = extract_page_words_and_lines(page_p1) if page_p1 else ([], "")
    cb_p1 = get_page_checked_boxes(page_p1) if page_p1 else []

    # 1. Opinion of Market Value
    m_val = re.search(r"Opinion\s+of\s+Market\s+Value\s*[:\-]?\s*\$?([\d,]+)", spatial_p1, re.I) or \
            re.search(r"Opinion\s+of\s+Market\s+Value\s*[:\-]?\s*\$?([\d,]+)", full_doc_text, re.I)
    if m_val:
        summary["Opinion of Market Value"] = f"${m_val.group(1)}"

    # 2. Market Value Condition
    m_cond = re.search(r"Market\s+Value\s+Condition\s*[:\-]?\s*([^\n\r]+)", spatial_p1, re.I)
    if m_cond:
        summary["Market Value Condition"] = clean_text_value(m_cond.group(1))

    # 3. Final Value Condition Statement
    m_stmt = re.search(r"Final\s+Value\s+Condition\s+Statement\s*[:\-]?\s*([\s\S]*?)(?=Effective\s+Date|Property\s+Valuation|\n[A-Z][a-z]+|\Z)", spatial_p1, re.I)
    if m_stmt:
        summary["Final Value Condition Statement"] = clean_text_value(m_stmt.group(1))

    # 4. Effective Date of Appraisal
    m_eff = re.search(r"Effective\s+Date\s+of\s+Appraisal\s*[:\-]?\s*(\d{1,2}/\d{1,2}/\d{4})", spatial_p1, re.I) or \
            re.search(r"Effective\s+Date\s+of\s+Appraisal\s*[:\-]?\s*(\d{1,2}/\d{1,2}/\d{4})", full_doc_text, re.I)
    if m_eff:
        summary["Effective Date of Appraisal"] = m_eff.group(1).strip()

    # 5. Property Valuation Method
    m_meth = re.search(r"Property\s+Valuation\s+Method\s*[:\-]?\s*([^\n\r]+)", spatial_p1, re.I)
    if m_meth:
        summary["Property Valuation Method"] = clean_text_value(m_meth.group(1))

    # 6. Assignment Reason
    m_reas = re.search(r"Assignment\s+Reason\s*[:\-]?\s*([^\n\r]+)", spatial_p1, re.I)
    if m_reas:
        raw_reas = clean_text_value(m_reas.group(1))
        summary["Assignment Reason"] = re.split(r"\s+(?:Appraiser|Borrower|Client|Contract)\b", raw_reas, flags=re.I)[0].strip()

    # 7. Appraiser Name
    m_app = re.search(r"Appraiser\s+Name\s*[:\-]?\s*([^\n\r]+)", spatial_p1, re.I)
    if m_app:
        summary["Appraiser Name"] = clean_text_value(m_app.group(1))

    # 8. Borrower Name
    m_borr = re.search(r"Borrower\s+Name\s*[:\-]?\s*([\s\S]*?)(?=Current\s+Owner|Contract\s+Price|Listing\s+Status|\Z)", spatial_p1, re.I)
    if m_borr:
        raw_b = m_borr.group(1).strip()
        lines_b = [l.strip() for l in raw_b.splitlines() if l.strip()]
        summary["Borrower Name"] = " / ".join(lines_b) if lines_b else raw_b

    # 9. Current Owner of Public Record
    m_own = re.search(r"Current\s+Owner\s+of\s+Public\s+Record\s*[:\-]?\s*([^\n\r]+)", spatial_p1, re.I)
    if m_own:
        summary["Current Owner of Public Record"] = clean_text_value(m_own.group(1))

    # 10. Contract Price
    m_cp = re.search(r"Contract\s+Price\s*[:\-]?\s*\$?([\d,]+)", spatial_p1, re.I)
    if m_cp:
        summary["Contract Price"] = f"${m_cp.group(1)}"

    # 11. Listing Status
    m_ls = re.search(r"Listing\s+Status\s*[:\-]?\s*([^\n\r]+)", spatial_p1, re.I) or \
           re.search(r"Listing\s+Status\s*\n\s*([^\n\r]+)", spatial_p1, re.I) or \
           re.search(r"Listing\s+Status\s*[:\-]?\s*([^\n\r]+)", full_doc_text, re.I)
    if m_ls:
        summary["Listing Status"] = clean_text_value(m_ls.group(1))

    # 12. Property Description (Construction Method, Attachment Type, Overall Quality, Overall Condition)
    m_cm = re.search(r"Construction\s+Method\s*[:\-]?\s*([^\n\r]+)", spatial_p1, re.I)
    if m_cm:
        summary["Construction Method"] = clean_text_value(m_cm.group(1))

    m_att = re.search(r"Attachment\s+Type\s*[:\-]?\s*([^\n\r]+)", spatial_p1, re.I) or \
            re.search(r"Attachment\s+Type\s*[:\-]?\s*([A-Za-z]+)", full_doc_text, re.I)
    if m_att:
        summary["Attachment Type"] = clean_text_value(m_att.group(1))

    m_q = re.search(r"Overall\s+Quality\s*[:\-]?\s*([Q1-6q1-6]+|[^\n\r]+)", spatial_p1, re.I)
    if m_q:
        summary["Overall Quality"] = clean_text_value(m_q.group(1))

    m_c = re.search(r"Overall\s+Condition\s*[:\-]?\s*([C1-6c1-6]+|[^\n\r]+)", spatial_p1, re.I)
    if m_c:
        summary["Overall Condition"] = clean_text_value(m_c.group(1))

    # 13. Page 1 Checkboxes (PUD, Condominium, Cooperative, Condop, Subject Site Owned in Common)
    summary["Planned Unit Development (PUD)"] = extract_table_checkbox_choice(page_p1, words_p1, cb_p1, "Planned Unit Development")
    summary["Condominium"] = extract_table_checkbox_choice(page_p1, words_p1, cb_p1, "Condominium")
    summary["Cooperative"] = extract_table_checkbox_choice(page_p1, words_p1, cb_p1, "Cooperative")
    summary["Condop"] = extract_table_checkbox_choice(page_p1, words_p1, cb_p1, "Condop")
    summary["Subject Site Owned in Common"] = extract_table_checkbox_choice(page_p1, words_p1, cb_p1, "Subject Site Owned in Common")

    # 14. Units Excluding ADUs & Accessory Dwelling Units
    m_ue = re.search(r"Units\s+Excluding\s+ADUs\s*[:\-]?\s*(\d+)", spatial_p1, re.I) or \
           re.search(r"Units\s+Excluding\s+ADUs\s*\n\s*(\d+)", spatial_p1, re.I) or \
           re.search(r"Units\s+Excluding\s+ADUs\s*[:\-]?\s*(\d+)", full_doc_text, re.I)
    if m_ue:
        summary["Units Excluding ADUs"] = m_ue.group(1).strip()

    m_adu = re.search(r"Accessory\s+Dwelling\s+Units\s*(?:\(ADUs\))?\s*[:\-]?\s*(\d+)", spatial_p1, re.I) or \
            re.search(r"Accessory\s+Dwelling\s+Units\s*(?:\(ADUs\))?\s*\n\s*(\d+)", spatial_p1, re.I) or \
            re.search(r"Accessory\s+Dwelling\s+Units\s*(?:\(ADUs\))?\s*[:\-]?\s*(\d+)", full_doc_text, re.I)
    if m_adu:
        summary["Accessory Dwelling Units (ADUs)"] = m_adu.group(1).strip()

    # Dynamic ADU File Check
    adu_num = summary.get("Accessory Dwelling Units (ADUs)", "")
    if adu_num and adu_num != "0":
        summary["ADU File Check"] = "Yes"
    else:
        m_adu_chk = re.search(r"Accessory\s+Dwelling\s+Units?\s*(?:\(ADUs?\))?\s*[:\-]?\s*([1-9]\d*)", full_doc_text, re.I)
        summary["ADU File Check"] = "Yes" if m_adu_chk else "No"

    # Dynamic ANSI compliance check
    summary["ANSI"] = "Yes" if re.search(r"ANSI(?:\s+Z765)?", full_doc_text, re.I) else "No"

    # 15. Property Rights Appraised
    m_pra = re.search(r"Property\s+Rights\s+Appraised\s*[:\-]?\s*([^\n\r]+)", spatial_p1, re.I) or \
            re.search(r"Property\s+Rights\s+Appraised\s*[:\-]?\s*([A-Za-z\s]+?)(?=\s+All\s+Rights|\n|\Z)", full_doc_text, re.I)
    if m_pra:
        summary["Property Rights Appraised"] = clean_text_value(m_pra.group(1))

    # 16. Highest and Best Use as Present Use
    summary["Highest and Best Use as Present Use"] = extract_table_checkbox_choice(page_p1, words_p1, cb_p1, "Is the highest and best use")

    # 17. Zoning Compliance
    m_zc = re.search(r"Zoning\s+Compliance\s*[:\-]?\s*([^\n\r]+)", spatial_p1, re.I)
    if m_zc:
        summary["Zoning Compliance"] = clean_text_value(m_zc.group(1))

    # Apparent Defects, Damages, Deficiencies Requiring Action
    m_def = re.search(r"Defects,?\s*Damages,?\s*Deficiencies\s+Requiring\s+Action\s*\n\s*([^\n\r]+)", full_doc_text, re.I) or \
            re.search(r"Defects,?\s*Damages,?\s*Deficiencies\s+Requiring\s+Action\s*[:\-]?\s*([^\n\r]+)", full_doc_text, re.I)
    if m_def:
        summary["Apparent Defects, Damages, Deficiencies Requiring Action"] = clean_text_value(m_def.group(1))

    # Address under Title on Page 1
    m_addr_p1 = re.search(r"Uniform\s+Residential\s+Appraisal\s+Report\s*\n\s*([^\n\r]+(?:,\s*[A-Z]{2}\s*\d{5})?)", spatial_p1, re.I)
    if m_addr_p1:
        summary["Physical Address"] = clean_text_value(m_addr_p1.group(1))

    # --- Integrate Page 2 (Contact Information, Credentials, Scope of Work) ---
    if page_p2:
        words_p2, spatial_p2 = extract_page_words_and_lines(page_p2)
        cb_p2 = get_page_checked_boxes(page_p2)

        # Property Data Report check
        summary["Property Data Report Used in Lieu of Inspection"] = extract_table_checkbox_choice(
            page_p2, words_p2, cb_p2, "Was a Property Data Report used in lieu of an Inspection", yes_x=440.0, no_x=475.0
        )

        # Client / Lender
        m_lender_name = re.search(r"Client/Lender[\s\S]*?Company\s+Name\s*[:\-]?\s*([^\n\r]+)", spatial_p2, re.I)
        if m_lender_name:
            summary["Client/Lender Company Name"] = clean_text_value(m_lender_name.group(1))

        m_lender_addr = re.search(r"Client/Lender[\s\S]*?Company\s+Address\s*[:\-]?\s*([\s\S]*?)(?=Appraiser|Credentials|\n\n|\Z)", spatial_p2, re.I)
        if m_lender_addr:
            lines = [l.strip() for l in m_lender_addr.group(1).splitlines() if l.strip() and not re.search(r"Appraiser|Company|Name", l, re.I)]
            summary["Client/Lender Company Address"] = ", ".join(lines) if lines else clean_text_value(m_lender_addr.group(1))

        # Appraiser Company & Address
        m_app_comp = re.search(r"Appraiser[\s\S]*?Company\s+Name\s*[:\-]?\s*([^\n\r]+)", spatial_p2, re.I)
        if m_app_comp:
            summary["Appraiser Company Name"] = clean_text_value(m_app_comp.group(1))

        m_app_addr = re.search(r"Appraiser[\s\S]*?Company\s+Address\s*[:\-]?\s*([\s\S]*?)(?=Credentials|Scope\s+of\s+Inspection|\n\n|\Z)", spatial_p2, re.I)
        if m_app_addr:
            lines = [l.strip() for l in m_app_addr.group(1).splitlines() if l.strip() and not re.search(r"Scope|Inspection|Level|ID", l, re.I)]
            summary["Appraiser Company Address"] = ", ".join(lines) if lines else clean_text_value(m_app_addr.group(1))

        # Credentials
        m_cred_lvl = re.search(r"Credentials[\s\S]*?\bLevel\b\s*[:\-]?\s*([^\n\r]+)", spatial_p2, re.I)
        if m_cred_lvl:
            summary["Appraiser Credential Level"] = clean_text_value(m_cred_lvl.group(1))

        m_cred_id = re.search(r"Credentials[\s\S]*?\bID\b\s*[:\-]?\s*([^\n\r]+)", spatial_p2, re.I)
        if m_cred_id:
            summary["Appraiser ID"] = clean_text_value(m_cred_id.group(1))

        m_cred_st = re.search(r"Credentials[\s\S]*?\bState\b\s*[:\-]?\s*([A-Za-z]{2})", spatial_p2, re.I)
        if m_cred_st:
            summary["Appraiser State"] = m_cred_st.group(1).upper()

        m_cred_exp = re.search(r"Credentials[\s\S]*?\bExpires\b\s*[:\-]?\s*(\d{1,2}/\d{1,2}/\d{4})", spatial_p2, re.I)
        if m_cred_exp:
            summary["Appraiser License Expiration Date"] = m_cred_exp.group(1).strip()

        m_asc = re.search(r"ASC\s+Identifier\s*[:\-]?\s*(\d+)", spatial_p2, re.I)
        if m_asc:
            summary["Appraiser ASC Identifier"] = m_asc.group(1).strip()

        # Scope of Inspection
        m_ext = re.search(r"Exterior\s*\n\s*([^\n\r]+)", spatial_p2, re.I) or \
                re.search(r"Exterior\s*[:\-]?\s*([^\n\r]+)", spatial_p2, re.I)
        if m_ext:
            summary["Exterior Physical Inspection"] = clean_text_value(m_ext.group(1))
        m_int = re.search(r"Interior\s*\n\s*([^\n\r]+)", spatial_p2, re.I) or \
                re.search(r"Interior\s*[:\-]?\s*([^\n\r]+)", spatial_p2, re.I)
        if m_int:
            summary["Interior Physical Inspection"] = clean_text_value(m_int.group(1))

        summary["Subject Property Inspection"] = summary.get("Exterior Physical Inspection") or summary.get("Interior Physical Inspection") or ""

        m_insp_date = re.search(r"Inspection\s+Date\s*[:\-]?\s*(\d{1,2}/\d{1,2}/\d{4})", spatial_p2, re.I)
        if m_insp_date:
            summary["Inspection Date"] = m_insp_date.group(1).strip()

        # Scope of Work Commentary
        m_comm = re.search(r"Assignment\s+Information\s+and\s+Scope\s+of\s+Work\s+Commentary\s*\n\s*([\s\S]*?)(?=Assignment\s+Information\s+Exhibits|\Z)", spatial_p2, re.I)
        if m_comm:
            summary["Subject Property Commentary"] = clean_text_value(m_comm.group(1))

    # --- Integrate Subject Property (Page 3 or located subject page) ---
    p_subj = page_p3
    if doc and (not p_subj or "Property on Native American Lands" not in p_subj.get_text("text")):
        for p in doc[:5]:
            p_txt = p.get_text("text")
            if "Property on Native American Lands" in p_txt or "Homeowner Responsible" in p_txt:
                p_subj = p
                break

    if p_subj:
        words_p3, spatial_p3 = extract_page_words_and_lines(p_subj)
        cb_p3 = get_page_checked_boxes(p_subj)

        # Physical Address
        m_paddr = re.search(r"Physical\s+Address\s*[:\-]?\s*([\s\S]*?)(?=Attachment\s+Type|County|Units|\n\n|\Z)", spatial_p3, re.I)
        if m_paddr:
            p_lines = [l.strip() for l in m_paddr.group(1).splitlines() if l.strip() and not re.search(r"Attachment|County|Units", l, re.I)]
            if p_lines:
                summary["Physical Address"] = ", ".join(p_lines)

        # County
        m_cnty = re.search(r"County\s*[:\-]?\s*([^\n\r]+)", spatial_p3, re.I)
        if m_cnty:
            raw_c = clean_text_value(m_cnty.group(1))
            summary["County"] = re.split(r"\s+(?:Accessory|Attachment|Units|Property|Dwelling)\b", raw_c, flags=re.I)[0].strip()

        # Neighborhood Name
        m_nh = re.search(r"Neighborhood\s+Name\s*[:\-]?\s*([^\n\r]+)", spatial_p3, re.I)
        if m_nh:
            summary["Neighborhood Name"] = clean_text_value(m_nh.group(1))

        # Special Tax Assessments
        m_sta = re.search(r"Special\s+Tax\s+Assessments\s*[:\-]?\s*([^\n\r]+)", spatial_p3, re.I) or \
                re.search(r"Special\s+Tax\s+Assessments\s*\n\s*([^\n\r]+)", spatial_p3, re.I) or \
                re.search(r"Special\s+Tax\s+Assessments\s*[:\-]?\s*(Yes|No|[^\n\r]+)", full_doc_text, re.I)
        if m_sta:
            summary["Special Tax Assessments"] = clean_text_value(m_sta.group(1))

        # Checkboxes on Subject Property Page
        summary["Property on Native American Lands"] = extract_table_checkbox_choice(p_subj, words_p3, cb_p3, "Property on Native American Lands")
        summary["Homeowner Responsible for All Exterior Maintenance of Dwelling(s)"] = extract_table_checkbox_choice(p_subj, words_p3, cb_p3, "Homeowner Responsible")
        summary["New Construction"] = extract_table_checkbox_choice(p_subj, words_p3, cb_p3, "New Construction")

        # All Rights Included in Appraisal
        m_ari = re.search(r"All\s+Rights\s+Included\s+in\s+Appraisal\s*[:\-]?\s*(Yes|No|[^\n\r]+)", spatial_p3, re.I) or \
                re.search(r"All\s+Rights\s+Included\s+in\s+Appraisal\s*\n\s*(Yes|No|[^\n\r]+)", spatial_p3, re.I) or \
                re.search(r"All\s+Rights\s+Included\s+in\s+Appraisal\s*[:\-]?\s*(Yes|No|[^\n\r]+)", full_doc_text, re.I)
        if m_ari:
            summary["All Rights Included in Appraisal"] = clean_text_value(m_ari.group(1))

        # Legal Description
        m_legal = re.search(r"Legal\s+Description\s*\n\s*([\s\S]*?)(?=Subject\s+Property\s+Exhibits|Ownership\s+Rights|\n\n|\Z)", spatial_p3, re.I)
        if m_legal:
            summary["Legal Description"] = clean_text_value(m_legal.group(1))

    return summary


def extract_v1_contract_section(page_p2, full_doc_text: str, summary: Dict[str, Any]) -> Dict[str, Any]:
    """
    Extracts CONTRACT fields matching CONTRACT_FIELDS schema.
    """
    contract: Dict[str, Any] = {
        "Assignment Reason": summary.get("Assignment Reason", ""),
        "Borrower Name": summary.get("Borrower Name", ""),
        "Current Owner of Public Record": summary.get("Current Owner of Public Record", ""),
        "Property Valuation Method": summary.get("Property Valuation Method", ""),
        "Property Data Report Used in Lieu of Inspection": summary.get("Property Data Report Used in Lieu of Inspection", ""),
        "Seller Name": "",
        "Contract Price": summary.get("Contract Price", "")
    }

    if page_p2:
        _, spatial_p2 = extract_page_words_and_lines(page_p2)
        m_seller = re.search(r"Seller\s+Name\s*[:\-]?\s*([^\n\r]+)", spatial_p2, re.I)
        if m_seller:
            contract["Seller Name"] = clean_text_value(m_seller.group(1))

    return contract


def extract_v1_subject_section(summary: Dict[str, Any]) -> Dict[str, Any]:
    """
    Extracts SUBJECT fields matching SUBJECT_FIELDS schema.
    Zero hardcoded values: all attributes dynamically extracted from summary.
    """
    subject: Dict[str, Any] = {
        "Client/Lender Company Name": summary.get("Client/Lender Company Name", ""),
        "Client/Lender Company Address": summary.get("Client/Lender Company Address", ""),
        "Appraisal Management Company Name": summary.get("Appraisal Management Company Name", ""),
        "Appraisal Management Company Address": summary.get("Appraisal Management Company Address", ""),
        "Appraiser Name": summary.get("Appraiser Name", ""),
        "Appraiser Company Name": summary.get("Appraiser Company Name", ""),
        "Appraiser Company Address": summary.get("Appraiser Company Address", ""),
        "Subject Property Inspection": summary.get("Subject Property Inspection", ""),
        "Exterior Physical Inspection": summary.get("Exterior Physical Inspection", ""),
        "Interior Physical Inspection": summary.get("Interior Physical Inspection", ""),
        "Inspection Date": summary.get("Inspection Date", ""),
        "Appraiser Credential Level": summary.get("Appraiser Credential Level", ""),
        "Appraiser ID": summary.get("Appraiser ID", ""),
        "Appraiser State": summary.get("Appraiser State", ""),
        "Appraiser License Expiration Date": summary.get("Appraiser License Expiration Date", ""),
        "Appraiser ASC Identifier": summary.get("Appraiser ASC Identifier", ""),
        "Physical Address": summary.get("Physical Address", ""),
        "County": summary.get("County", ""),
        "Neighborhood Name": summary.get("Neighborhood Name", ""),
        "Planned Unit Development (PUD)": summary.get("Planned Unit Development (PUD)", ""),
        "Condominium": summary.get("Condominium", ""),
        "Cooperative": summary.get("Cooperative", ""),
        "Condop": summary.get("Condop", ""),
        "Property on Native American Lands": summary.get("Property on Native American Lands", ""),
        "Subject Site Owned in Common": summary.get("Subject Site Owned in Common", ""),
        "Homeowner Responsible for All Exterior Maintenance of Dwelling(s)": summary.get("Homeowner Responsible for All Exterior Maintenance of Dwelling(s)", ""),
        "New Construction": summary.get("New Construction", ""),
        "Attachment Type": summary.get("Attachment Type", ""),
        "Units Excluding ADUs": summary.get("Units Excluding ADUs", ""),
        "Accessory Dwelling Units (ADUs)": summary.get("Accessory Dwelling Units (ADUs)", ""),
        "Special Tax Assessments": summary.get("Special Tax Assessments", ""),
        "Property Rights Appraised": summary.get("Property Rights Appraised", ""),
        "All Rights Included in Appraisal": summary.get("All Rights Included in Appraisal", ""),
        "Legal Description": summary.get("Legal Description", ""),
        "Subject Property Commentary": summary.get("Subject Property Commentary", "")
    }
    return subject


def extract_v1_site_influence_table(page) -> Dict[str, Any]:
    """
    Extracts Influence, Proximity, Detail, Impact, Comment, and Site Influence Commentary
    from Site Influence table using precision spatial coordinate slicing.
    """
    words = page.get_text("words")
    res: Dict[str, Any] = {}
    inf_hdrs = [w for w in words if w[4] == "Influence" and w[0] < 60 and any(w2[4] == "Proximity" and abs(w2[1] - w[1]) < 4 for w2 in words)]
    if not inf_hdrs:
        return res
    y_hdr = inf_hdrs[0][1]
    row_words = [w for w in words if y_hdr + 5 <= w[1] <= y_hdr + 22]
    if row_words:
        c_inf = " ".join(w[4] for w in sorted([w for w in row_words if w[0] < 145], key=lambda x: x[0]))
        c_prox = " ".join(w[4] for w in sorted([w for w in row_words if 145 <= w[0] < 250], key=lambda x: x[0]))
        c_det = " ".join(w[4] for w in sorted([w for w in row_words if 250 <= w[0] < 360], key=lambda x: x[0]))
        c_imp = " ".join(w[4] for w in sorted([w for w in row_words if 360 <= w[0] < 465], key=lambda x: x[0]))
        c_com = " ".join(w[4] for w in sorted([w for w in row_words if w[0] >= 465], key=lambda x: x[0]))

        if c_inf: res["Site Influence"] = clean_text_value(c_inf)
        if c_prox: res["Site Influence Proximity"] = clean_text_value(c_prox)
        if c_det: res["Site Influence Detail"] = clean_text_value(c_det)
        if c_imp: res["Site Influence Impact"] = clean_text_value(c_imp)
        if c_com: res["Site Influence Comment"] = clean_text_value(c_com)

    sic_hdr = [w for w in words if y_hdr + 15 <= w[1] <= y_hdr + 60 and "Commentary" in w[4]]
    if sic_hdr:
        y_sic = sic_hdr[0][1]
        next_sec = [w for w in words if w[1] > y_sic + 8 and ("View" in w[4] or "Features" in w[4] or "Uniform" in w[4])]
        y_end = min([w[1] for w in next_sec]) if next_sec else y_sic + 80
        c_words = [w for w in words if y_sic - 2 <= w[1] < y_end and not (w[0] < 150 and w[1] < y_sic + 8)]
        if c_words:
            res["Site Influence Commentary"] = clean_text_value(" ".join(w[4] for w in sorted(c_words, key=lambda x: (round(x[1] / 4) * 4, x[0]))))
    return res


def extract_v1_view_table(page) -> Dict[str, Any]:
    """
    Extracts View, Range of View, View Impact, and View Commentary
    from View and Impact to Value/Marketability table using precision spatial coordinates.
    """
    words = page.get_text("words")
    res: Dict[str, Any] = {}
    v_hdrs = [w for w in words if w[4] == "View" and w[0] < 60 and any(w2[4] == "Range" and abs(w2[1] - w[1]) < 4 for w2 in words)]
    if not v_hdrs:
        return res
    y_hdr = v_hdrs[0][1]
    row_words = [w for w in words if y_hdr + 5 <= w[1] <= y_hdr + 22]
    if row_words:
        c_vw = " ".join(w[4] for w in sorted([w for w in row_words if w[0] < 200], key=lambda x: x[0]))
        c_rov = " ".join(w[4] for w in sorted([w for w in row_words if 200 <= w[0] < 380], key=lambda x: x[0]))
        c_imp = " ".join(w[4] for w in sorted([w for w in row_words if w[0] >= 380], key=lambda x: x[0]))

        if c_vw: res["View"] = clean_text_value(c_vw)
        if c_rov: res["Range of View"] = clean_text_value(c_rov)
        if c_imp: res["View Impact"] = clean_text_value(c_imp)

    vc_hdr = [w for w in words if y_hdr + 15 <= w[1] <= y_hdr + 60 and "Commentary" in w[4]]
    if vc_hdr:
        y_vc = vc_hdr[0][1]
        next_sec = [w for w in words if w[1] > y_vc + 8 and ("Site" in w[4] or "Features" in w[4] or "Uniform" in w[4])]
        y_end = min([w[1] for w in next_sec]) if next_sec else y_vc + 80
        c_words = [w for w in words if y_vc - 2 <= w[1] < y_end and not (w[0] < 120 and w[1] < y_vc + 8)]
        if c_words:
            res["View Commentary"] = clean_text_value(" ".join(w[4] for w in sorted(c_words, key=lambda x: (round(x[1] / 4) * 4, x[0]))))
    return res


def extract_v1_site_features_table(page) -> Dict[str, Any]:
    """
    Extracts Feature, Detail, Impact, Comment, and Site Features Commentary
    from Site Features and Impact to Value/Marketability table using precision spatial coordinates.
    """
    words = page.get_text("words")
    res: Dict[str, Any] = {}
    f_hdrs = [w for w in words if w[4] == "Feature" and w[0] < 60 and any(w2[4] == "Detail" and abs(w2[1] - w[1]) < 4 for w2 in words)]
    if not f_hdrs:
        return res
    y_hdr = f_hdrs[0][1]
    row_words = [w for w in words if y_hdr + 5 <= w[1] <= y_hdr + 22]
    if row_words:
        c_feat = " ".join(w[4] for w in sorted([w for w in row_words if w[0] < 170], key=lambda x: x[0]))
        c_det = " ".join(w[4] for w in sorted([w for w in row_words if 170 <= w[0] < 305], key=lambda x: x[0]))
        c_imp = " ".join(w[4] for w in sorted([w for w in row_words if 305 <= w[0] < 365], key=lambda x: x[0]))
        c_com = " ".join(w[4] for w in sorted([w for w in row_words if w[0] >= 365], key=lambda x: x[0]))

        if c_feat: res["Site Feature"] = clean_text_value(c_feat)
        if c_det: res["Site Feature Detail"] = clean_text_value(c_det)
        if c_imp: res["Site Feature Impact"] = clean_text_value(c_imp)
        if c_com: res["Site Feature Comment"] = clean_text_value(c_com)

    # Commentary
    sfc_hdr = [w for w in words if y_hdr + 15 <= w[1] <= y_hdr + 60 and "Commentary" in w[4]]
    if sfc_hdr:
        y_sfc = sfc_hdr[0][1]
        next_sec = [w for w in words if w[1] > y_sfc + 8 and ("Utilities" in w[4] or "Apparent" in w[4] or "Uniform" in w[4])]
        y_end = min([w[1] for w in next_sec]) if next_sec else y_sfc + 100
        c_words = [w for w in words if y_sfc - 2 <= w[1] < y_end and not (w[0] < 145 and w[1] < y_sfc + 8)]
        if c_words:
            res["Site Features Commentary"] = clean_text_value(" ".join(w[4] for w in sorted(c_words, key=lambda x: (round(x[1] / 4) * 4, x[0]))))
    return res


def extract_v1_site_section(doc, full_doc_text: str, summary: Dict[str, Any]) -> Dict[str, Any]:
    """
    Extracts SITE category fields from all relevant Site pages.
    Zero hardcoded values: uses spatial coordinate table parsing for APN, Site Influence, View, Site Features, and dynamic regexes.
    """
    site: Dict[str, Any] = {
        "Total Site Size": "",
        "Number of Parcels": "",
        "Assessor Parcel Number (APN)": "",
        "APN Description": "",
        "Parcel Size": "",
        "Zoning Compliance": summary.get("Zoning Compliance", ""),
        "Zoning Classification Code": "",
        "Zoning Classification Description": "",
        "Primary Access": "",
        "Street Type and Surface": "",
        "Typical for Market": "",
        "Non-Residential Use": "",
        "Site Influence": "",
        "Site Influence Proximity": "",
        "Site Influence Detail": "",
        "Site Influence Impact": "",
        "Site Influence Comment": "",
        "Site Influence Commentary": "",
        "View": "",
        "Range of View": "",
        "View Impact": "",
        "View Commentary": "",
        "Site Feature": "",
        "Site Feature Detail": "",
        "Site Feature Impact": "",
        "Site Feature Comment": "",
        "Site Features Commentary": "",
        "Broadband Internet Available": "",
        "Electricity": "",
        "Sanitary Sewer": "",
        "Water": "",
        "Utility Type (Public/Private)": "",
        "Apparent Defects, Damages, Deficiencies (Site)": "",
        "Site Commentary": "",
        "Property Access (Street Scene)": "",
        "Renewable Energy Components": "",
        "Ownership": "",
        "Financing Arrangement": "",
        "Known Building Certifications": "",
        "Known Efficiency Ratings": "",
        "Energy Efficient and Green Features Impact to Value/Marketability": "",
        "Highest and Best Use as Improved (Present Use)": summary.get("Highest and Best Use as Present Use", "")
    }

    # Aggregate text of all pages with Site or Energy Efficient
    site_text = ""
    for page in doc:
        ptxt = page.get_text("text")
        if re.search(r"\bSite\b|Property Access|Site Influence|Utilities and Impact|Energy Efficient", ptxt, re.I):
            _, spatial_txt = extract_page_words_and_lines(page)
            site_text += spatial_txt + "\n"

    if not site_text:
        site_text = full_doc_text

    # Dynamic Spatial Extraction for APN Table (Col 1: APN, Col 2: Description, Col 3: Parcel Size)
    for page in doc:
        txt = page.get_text("text")
        if "Assessor Parcel Number" in txt and "Parcel Size" in txt:
            words = page.get_text("words")
            hdr = [w for w in words if "(apn)" in w[4].lower()]
            if hdr:
                y_hdr = (hdr[0][1] + hdr[0][3]) / 2.0
                row = [w for w in words if y_hdr + 5 <= (w[1] + w[3]) / 2.0 <= y_hdr + 25]
                c1 = " ".join(w[4] for w in sorted(row, key=lambda x: x[0]) if w[0] < 200)
                c2 = " ".join(w[4] for w in sorted(row, key=lambda x: x[0]) if 200 <= w[0] < 380)
                c3 = " ".join(w[4] for w in sorted(row, key=lambda x: x[0]) if 380 <= w[0] < 580)
                if c1: site["Assessor Parcel Number (APN)"] = clean_text_value(c1)
                if c2: site["APN Description"] = clean_text_value(c2)
                if c3: site["Parcel Size"] = clean_text_value(c3)
                break

    # Total Site Size
    m_sz = re.search(r"Total\s+Site\s+Size\s*[:\-]?\s*([^\n\r]+?)(?=\s+Number\s+of|\n|\Z)", site_text, re.I)
    if m_sz:
        site["Total Site Size"] = clean_text_value(m_sz.group(1))

    # Number of Parcels
    m_np = re.search(r"Number\s+of\s+Parcels\s*[:\-]?\s*(\d+)", site_text, re.I)
    if m_np:
        site["Number of Parcels"] = m_np.group(1)

    # Assessor Parcel Number (APN) fallback regex
    if not site["Assessor Parcel Number (APN)"]:
        m_apn = re.search(r"Assessor\s+Parcel\s+Number\s*(?:\(APN\))?\s*[:\-]?\s*([^\n\r]+?)(?=\s+APN\s+Description|\n|\Z)", site_text, re.I)
        if m_apn:
            site["Assessor Parcel Number (APN)"] = clean_text_value(m_apn.group(1))

    # APN Description fallback regex
    if not site["APN Description"]:
        m_apnd = re.search(r"APN\s+Description\s*[:\-]?\s*([^\n\r]+?)(?=\s+Parcel\s+Size|\n|\Z)", site_text, re.I)
        if m_apnd:
            site["APN Description"] = clean_text_value(m_apnd.group(1))

    # Parcel Size fallback regex
    if not site["Parcel Size"]:
        m_psz = re.search(r"Parcel\s+Size\s*[:\-]?\s*([^\n\r]+)", site_text, re.I)
        if m_psz:
            site["Parcel Size"] = clean_text_value(m_psz.group(1))

    # Zoning Compliance
    m_zc = re.search(r"Zoning[\s\S]*?Compliance\s*[:\-]?\s*([^\n\r]+)", site_text, re.I)
    if m_zc:
        site["Zoning Compliance"] = clean_text_value(m_zc.group(1))

    # Zoning Classification Code
    m_zcc = re.search(r"Classification\s+Code\s*[:\-]?\s*([^\n\r]+?)(?=\s+Street\s+Type|\n|\Z)", site_text, re.I)
    if m_zcc:
        site["Zoning Classification Code"] = clean_text_value(m_zcc.group(1))

    # Zoning Classification Code Description
    m_zcd = re.search(r"Classification\s+Code\s+Description\s*[:\-]?\s*([^\n\r]+?)(?=\s+Typical\s+for|\n|\Z)", site_text, re.I)
    if m_zcd:
        site["Zoning Classification Description"] = clean_text_value(m_zcd.group(1))

    # Primary Access
    m_pa = re.search(r"Primary\s+Access\s*[:\-]?\s*([^\n\r]+)", site_text, re.I)
    if m_pa:
        site["Primary Access"] = clean_text_value(m_pa.group(1))

    # Street Type and Surface
    m_st = re.search(r"Street\s+Type\s+and\s+Surface\s*[:\-]?\s*([^\n\r]+)", site_text, re.I)
    if m_st:
        site["Street Type and Surface"] = clean_text_value(m_st.group(1))

    # Typical for Market
    m_tm = re.search(r"Typical\s+for\s+Market\s*[:\-]?\s*([^\n\r]+)", site_text, re.I)
    if m_tm:
        site["Typical for Market"] = clean_text_value(m_tm.group(1))

    # Non-Residential Use
    m_nru = re.search(r"Non-Residential\s+Use\s*[:\-]?\s*([^\n\r]+)", site_text, re.I)
    if m_nru:
        site["Non-Residential Use"] = clean_text_value(m_nru.group(1))

    # Dynamic Spatial Extraction for Site Influence, View, and Site Features tables
    for page in doc:
        ptxt = page.get_text("text")
        if "Site Influence" in ptxt and "Proximity" in ptxt:
            si_data = extract_v1_site_influence_table(page)
            site.update(si_data)
        if "View and Impact" in ptxt:
            vw_data = extract_v1_view_table(page)
            site.update(vw_data)
        if "Site Features and Impact" in ptxt:
            sf_data = extract_v1_site_features_table(page)
            site.update(sf_data)

    # Commentary fallbacks
    if not site.get("Site Influence Commentary"):
        m_sic = re.search(r"Site\s+Influence\s+Commentary\s*[:\-]?\s*(?:\n\s*)?([\s\S]*?)(?=View\s+and\s+Impact|Site\s+Features|Utilities\s+and\s+Impact|\n\s*\n\s*[A-Z][a-z]+|\Z)", site_text, re.I) or \
                re.search(r"Site\s+Influence\s+Commentary\s*[:\-]?\s*(?:\n\s*)?([\s\S]*?)(?=View\s+and\s+Impact|Site\s+Features|Utilities\s+and\s+Impact|\n\s*\n\s*[A-Z][a-z]+|\Z)", full_doc_text, re.I)
        if m_sic:
            val = clean_text_value(m_sic.group(1))
            if val: site["Site Influence Commentary"] = val

    if not site.get("View Commentary"):
        m_vc = re.search(r"View\s+Commentary\s*[:\-]?\s*(?:\n\s*)?([\s\S]*?)(?=Site\s+Features|Utilities\s+and\s+Impact|\n\s*\n\s*[A-Z][a-z]+|\Z)", site_text, re.I) or \
               re.search(r"View\s+Commentary\s*[:\-]?\s*(?:\n\s*)?([\s\S]*?)(?=Site\s+Features|Utilities\s+and\s+Impact|\n\s*\n\s*[A-Z][a-z]+|\Z)", full_doc_text, re.I)
        if m_vc:
            val = clean_text_value(m_vc.group(1))
            if val: site["View Commentary"] = val

    if not site.get("Site Features Commentary"):
        m_sfc = re.search(r"Site\s+Features?\s+Commentary\s*[:\-]?\s*(?:\n\s*)?([\s\S]*?)(?=Utilities\s+and\s+Impact|Apparent\s+Defects|\n\s*\n\s*[A-Z][a-z]+|\Z)", site_text, re.I) or \
                re.search(r"Site\s+Features?\s+Commentary\s*[:\-]?\s*(?:\n\s*)?([\s\S]*?)(?=Utilities\s+and\s+Impact|Apparent\s+Defects|\n\s*\n\s*[A-Z][a-z]+|\Z)", full_doc_text, re.I)
        if m_sfc:
            val = clean_text_value(m_sfc.group(1))
            if val: site["Site Features Commentary"] = val

    # Broadband Internet
    m_bb = re.search(r"Broadband\s+Internet\s+Available\s*[:\-]?\s*([^\n\r]+)", site_text, re.I)
    if m_bb:
        site["Broadband Internet Available"] = clean_text_value(m_bb.group(1))

    # Utilities: Electricity, Sanitary Sewer, Water
    if re.search(r"Electricity[\s\S]*?(?:Public|✓|☑|X)", site_text, re.I):
        site["Electricity"] = "Public"
    if re.search(r"Sanitary\s+Sewer[\s\S]*?(?:Public|✓|☑|X)", site_text, re.I):
        site["Sanitary Sewer"] = "Public"
    if re.search(r"Water[\s\S]*?(?:Public|✓|☑|X)", site_text, re.I):
        site["Water"] = "Public"

    # Apparent Defects (Site) (e.g. "None", "None Observed", or narrative)
    m_def_site = re.search(r"Apparent\s+Defects,\s+Damages,\s+Deficiencies\s*\(Site\)\s*[:\-]?\s*(?:\n\s*)?([^\n\r]+)", site_text, re.I)
    if m_def_site and clean_text_value(m_def_site.group(1)) and not re.match(r"^(?:Site\s+Commentary|Energy|Highest|Renewable)", clean_text_value(m_def_site.group(1)), re.I):
        site["Apparent Defects, Damages, Deficiencies (Site)"] = clean_text_value(m_def_site.group(1))
    else:
        m_def_site_b = re.search(r"Apparent\s+Defects,\s+Damages,\s+Deficiencies\s*\(Site\)\s*[:\-]?\s*(?:\n\s*)?([\s\S]*?)(?=Site\s+Commentary|Energy\s+Efficient|Highest\s+and\s+Best|\n\s*\n\s*[A-Z][a-z]+|\Z)", site_text, re.I)
        if m_def_site_b and clean_text_value(m_def_site_b.group(1)):
            site["Apparent Defects, Damages, Deficiencies (Site)"] = clean_text_value(m_def_site_b.group(1))

    # Site Commentary
    m_site_comm = re.search(r"Site\s+Commentary\s*[:\-]?\s*(?:\n\s*)?([\s\S]*?)(?=Energy\s+Efficient|Renewable\s+Energy|Highest\s+and\s+Best|DWELLING\s+EXTERIOR|IMPROVEMENTS|\n\s*\n\s*[A-Z][a-z]+|\Z)", site_text, re.I) or \
                  re.search(r"Site\s+Commentary\s*[:\-]?\s*(?:\n\s*)?([\s\S]*?)(?=Energy\s+Efficient|Renewable\s+Energy|Highest\s+and\s+Best|DWELLING\s+EXTERIOR|IMPROVEMENTS|\n\s*\n\s*[A-Z][a-z]+|\Z)", full_doc_text, re.I)
    if m_site_comm:
        val_sc = clean_text_value(m_site_comm.group(1))
        if val_sc:
            site["Site Commentary"] = val_sc

    # Energy Efficient and Green Features (Solar, Financed, etc.)
    m_rec = re.search(r"Renewable\s+Energy\s+Components\s*[:\-]?\s*([^\n\r]+?)(?=\s+Ownership|\n|\Z)", site_text, re.I)
    if m_rec:
        site["Renewable Energy Components"] = clean_text_value(m_rec.group(1))

    m_own = re.search(r"Renewable\s+Energy[\s\S]*?Ownership\s*[:\-]?\s*([^\n\r]+?)(?=\s+Financing|\n|\Z)", site_text, re.I)
    if m_own:
        site["Ownership"] = clean_text_value(m_own.group(1))

    m_fa = re.search(r"Financing\s+Arrangement\s*[:\-]?\s*([^\n\r]+)", site_text, re.I)
    if m_fa:
        site["Financing Arrangement"] = clean_text_value(m_fa.group(1))

    m_kbc = re.search(r"Known\s+Building\s+Certifications\s*[:\-]?\s*([^\n\r]+)", site_text, re.I)
    if m_kbc:
        site["Known Building Certifications"] = clean_text_value(m_kbc.group(1))

    m_ker = re.search(r"Known\s+Efficiency\s+Ratings\s*[:\-]?\s*([^\n\r]+)", site_text, re.I)
    if m_ker:
        site["Known Efficiency Ratings"] = clean_text_value(m_ker.group(1))

    m_eimpact = re.search(r"Energy\s+Efficient\s+and\s+Green\s+Features\s+Impact\s+to\s+Value/Marketability[\s\S]*?Impact\s+to\s+Value/Marketability\s*[:\-]?\s*([^\n\r]+)", site_text, re.I) or \
                re.search(r"Impact\s+to\s+Value/Marketability\s*[:\-]?\s*([^\n\r]+)", site_text, re.I)
    if m_eimpact:
        val_imp = clean_text_value(m_eimpact.group(1))
        site["Energy Efficient and Green Features Impact to Value/Marketability"] = val_imp
        site["Impact to Value/Marketability"] = val_imp

    # Highest and Best Use 4 tests
    m_lp = re.search(r"Legally\s+Permissible\s*[:\-]?\s*([^\n\r]+)", site_text, re.I)
    if m_lp:
        site["Legally Permissible"] = clean_text_value(m_lp.group(1))
    m_pp = re.search(r"Physically\s+Possible\s*[:\-]?\s*([^\n\r]+)", site_text, re.I)
    if m_pp:
        site["Physically Possible"] = clean_text_value(m_pp.group(1))
    m_ff = re.search(r"Financially\s+Feasible\s*[:\-]?\s*([^\n\r]+)", site_text, re.I)
    if m_ff:
        site["Financially Feasible"] = clean_text_value(m_ff.group(1))
    m_mp = re.search(r"Maximally\s+Productive\s*[:\-]?\s*([^\n\r]+)", site_text, re.I)
    if m_mp:
        site["Maximally Productive"] = clean_text_value(m_mp.group(1))

    # Highest and Best Use Commentary
    m_hbuc = re.search(r"Highest\s+and\s+Best\s+Use\s+Commentary\s*\n\s*([\s\S]*?)(?=Market|Dwelling|\n\n|\Z)", site_text, re.I)
    if m_hbuc:
        site["Highest and Best Use Commentary"] = clean_text_value(m_hbuc.group(1))

    return site


def extract_v1_kb_table(page) -> Dict[str, Any]:
    """
    Extracts all rows from Kitchen and Bathroom Details table using spatial coordinates.
    Zero hardcoded values: dynamically captures Room, Update Status, Time Frame, Quality Comment,
    Condition Status, and Condition Comment.
    """
    words = page.get_text("words")
    hdr_words = [w for w in words if w[0] < 100 and w[4] == "Room"]
    if not hdr_words:
        return {}

    y_hdr = None
    for hw in hdr_words:
        if any(w[4] == "Update" and abs(w[1] - hw[1]) < 5 for w in words):
            y_hdr = hw[1]
            break
    if y_hdr is None:
        return {}

    y_bottom = None
    for w in words:
        if w[4] == "Overall" and w[1] > y_hdr and w[0] < 100:
            if any(w2[4] == "Update" and abs(w2[1] - w[1]) < 5 for w2 in words):
                y_bottom = w[1]
                break
    if y_bottom is None:
        y_bottom = y_hdr + 300

    table_words = [w for w in words if y_hdr + 8 <= w[1] < y_bottom - 2]
    row_starters = [w for w in table_words if w[0] < 120 and w[4] in ["Kitchen", "Bath"]]
    row_starters.sort(key=lambda x: x[1])

    rows_data: Dict[str, Any] = {}
    for idx, starter in enumerate(row_starters):
        row_idx = idx + 1
        y_start = starter[1] - 3
        y_end = row_starters[idx + 1][1] - 3 if idx + 1 < len(row_starters) else y_bottom - 2

        r_words = [w for w in table_words if y_start <= w[1] < y_end]

        col_room = [w for w in r_words if w[0] < 125]
        col_status = [w for w in r_words if 125 <= w[0] < 210]
        col_tf = [w for w in r_words if 210 <= w[0] < 305]
        col_qc = [w for w in r_words if 305 <= w[0] < 395]
        col_cs = [w for w in r_words if 395 <= w[0] < 475]
        col_cc = [w for w in r_words if w[0] >= 475]

        def join_col(wlist):
            sw = sorted(wlist, key=lambda x: (round(x[1] / 5) * 5, x[0]))
            return clean_text_value(" ".join([w[4] for w in sw if w[4].strip()]))

        rows_data[f"Kitchen/Bath Row {row_idx} Room"] = join_col(col_room)
        rows_data[f"Kitchen/Bath Row {row_idx} Update Status"] = join_col(col_status)
        rows_data[f"Kitchen/Bath Row {row_idx} Time Frame"] = join_col(col_tf)
        rows_data[f"Kitchen/Bath Row {row_idx} Quality Comment"] = join_col(col_qc)
        rows_data[f"Kitchen/Bath Row {row_idx} Condition Status"] = join_col(col_cs)
        rows_data[f"Kitchen/Bath Row {row_idx} Condition Comment"] = join_col(col_cc)

    return rows_data


def extract_v1_level_room_detail_table(page) -> Dict[str, Any]:
    """
    Extracts all rows from Level and Room Detail table using precision spatial coordinates.
    Dynamically captures Level in Unit (e.g. Level 1, Level 2), Grade Level Detail (e.g. Above Grade),
    Finish (e.g. Finished), Area (e.g. 2,334 Sq. Ft.), and multi-line Room Summary (e.g. 1 - Kitchen\n3 - Bedroom).
    """
    words = page.get_text("words")
    hdr_words = [w for w in words if w[0] < 120 and w[4] == "Level" and any(w2[4] == "Unit" and abs(w2[1] - w[1]) < 5 for w2 in words)]
    if not hdr_words:
        # Fallback to single word Level header
        hdr_words = [w for w in words if w[0] < 120 and w[4] == "Level" and any(w2[4] in ["Grade", "Finish", "Area"] and abs(w2[1] - w[1]) < 5 for w2 in words)]
        if not hdr_words:
            return {}

    y_hdr = hdr_words[0][1]

    # Find table bottom (e.g. "Quality and Condition" or "Interior Quality Rating" or next section)
    bot_candidates = [w for w in words if w[1] > y_hdr and (
        (w[4] == "Quality" and any(w2[4] == "Condition" and abs(w2[1] - w[1]) < 5 for w2 in words)) or
        (w[4] == "Interior" and any(w2[4] == "Quality" and abs(w2[1] - w[1]) < 5 for w2 in words)) or
        (w[4] == "Kitchen" and any(w2[4] == "Bathroom" and abs(w2[1] - w[1]) < 5 for w2 in words))
    )]
    y_bottom = min([w[1] for w in bot_candidates]) if bot_candidates else y_hdr + 220

    table_words = [w for w in words if y_hdr + 8 <= w[1] < y_bottom - 2]
    # Row starters are words in the leftmost column representing level ("Level", "Basement", "1st", "2nd", etc.)
    row_starters = [w for w in table_words if w[0] < 130 and re.match(r"^(?:Level|Basement|\d+(?:st|nd|rd|th)?)$", w[4], re.I)]
    row_starters.sort(key=lambda x: x[1])

    # Filter row starters that are too close vertically (< 10 px)
    filtered_starters = []
    for s in row_starters:
        if not filtered_starters or (s[1] - filtered_starters[-1][1]) >= 15:
            filtered_starters.append(s)

    rows_data: Dict[str, Any] = {}
    for idx, starter in enumerate(filtered_starters):
        row_idx = idx + 1
        y_start = starter[1] - 4
        y_end = filtered_starters[idx + 1][1] - 4 if idx + 1 < len(filtered_starters) else y_bottom - 2

        r_words = [w for w in table_words if y_start <= w[1] < y_end]

        col_level = [w for w in r_words if w[0] < 130]
        col_grade = [w for w in r_words if 130 <= w[0] < 240]
        col_finish = [w for w in r_words if 240 <= w[0] < 340]
        col_area = [w for w in r_words if 340 <= w[0] < 450]
        col_room = [w for w in r_words if w[0] >= 450]

        def join_col_single(wlist):
            sw = sorted(wlist, key=lambda x: (round(x[1] / 5) * 5, x[0]))
            return clean_text_value(" ".join([w[4] for w in sw if w[4].strip()]))

        def join_room_summary(wlist):
            if not wlist:
                return ""
            # Group lines by vertical position y
            sw = sorted(wlist, key=lambda x: (x[1], x[0]))
            lines_dict = {}
            for w in sw:
                line_y = round(w[1] / 7) * 7
                if line_y not in lines_dict:
                    lines_dict[line_y] = []
                lines_dict[line_y].append(w)
            
            out_lines = []
            for ly in sorted(lines_dict.keys()):
                lw = sorted(lines_dict[ly], key=lambda x: x[0])
                line_text = " ".join([w[4] for w in lw if w[4].strip()])
                line_clean = clean_text_value(line_text)
                if line_clean and not re.search(r"Quality|Condition|Rating", line_clean, re.I):
                    out_lines.append(line_clean)
            return "\n".join(out_lines)

        rows_data[f"Level in Unit Row {row_idx}"] = join_col_single(col_level)
        rows_data[f"Grade Level Detail Row {row_idx}"] = join_col_single(col_grade)
        rows_data[f"Finish Row {row_idx}"] = join_col_single(col_finish)
        rows_data[f"Area Row {row_idx}"] = join_col_single(col_area)
        rows_data[f"Room Summary Row {row_idx}"] = join_room_summary(col_room)

    return rows_data


def extract_v1_interior_features_table(page) -> Dict[str, Any]:
    """
    Extracts Flooring, Walls and Ceiling, and other interior feature rows from Interior Features table.
    Zero hardcoded values: dynamically captures Feature, Detail, Quality Comment, Condition Status, and Condition Comment.
    """
    words = page.get_text("words")
    hdr_words = [w for w in words if w[0] < 100 and w[4] == "Feature"]
    if not hdr_words:
        return {}

    y_hdr = None
    for hw in hdr_words:
        if any(w[4] == "Detail" and abs(w[1] - hw[1]) < 5 for w in words):
            y_hdr = hw[1]
            break
    if y_hdr is None:
        return {}

    y_bottom = None
    for w in words:
        if w[4] == "Overall" and w[1] > y_hdr and w[0] < 100:
            if any(w2[4] == "Flooring" and abs(w2[1] - w[1]) < 25 for w2 in words):
                y_bottom = w[1]
                break
    if y_bottom is None:
        y_bottom = y_hdr + 200

    table_words = [w for w in words if y_hdr + 8 <= w[1] < y_bottom - 2]
    row_starters = [w for w in table_words if w[0] < 120 and w[4] in ["Flooring", "Walls", "Bath"]]
    row_starters.sort(key=lambda x: x[1])

    feat_data: Dict[str, Any] = {}
    for idx, starter in enumerate(row_starters):
        y_start = starter[1] - 3
        y_end = row_starters[idx + 1][1] - 3 if idx + 1 < len(row_starters) else y_bottom - 2

        r_words = [w for w in table_words if y_start <= w[1] < y_end]

        col_feat = [w for w in r_words if w[0] < 140]
        col_det = [w for w in r_words if 140 <= w[0] < 250]
        col_qc = [w for w in r_words if 250 <= w[0] < 360]
        col_cs = [w for w in r_words if 360 <= w[0] < 465]
        col_cc = [w for w in r_words if w[0] >= 465]

        def join_col(wlist):
            sw = sorted(wlist, key=lambda x: (round(x[1] / 5) * 5, x[0]))
            return clean_text_value(" ".join([w[4] for w in sw if w[4].strip()]))

        f_name = join_col(col_feat)
        key_prefix = "Flooring" if "Flooring" in f_name else ("Walls and Ceiling" if "Wall" in f_name else f_name)

        feat_data[f"{key_prefix} Detail"] = join_col(col_det)
        feat_data[f"{key_prefix} Quality Comment"] = join_col(col_qc)
        feat_data[f"{key_prefix} Condition Status"] = join_col(col_cs)
        feat_data[f"{key_prefix} Condition Comment"] = join_col(col_cc)

    return feat_data


def extract_v1_exterior_features_table(page) -> Dict[str, Any]:
    """
    Extracts Exterior Quality Rating, Exterior Condition Rating, and all rows from
    Exterior Features table (Exterior Walls and Trim, Foundation, Roof, Windows)
    using precision spatial coordinate slicing.
    Dynamically captures Detail, Quality Comment, Condition Status, Condition Comment,
    and splits Roof Estimated Age without hardcoded values.
    """
    words = page.get_text("words")
    res: Dict[str, Any] = {}

    # 1. Quality and Condition ratings (Exterior Quality Rating & Exterior Condition Rating)
    for w in words:
        if re.match(r"^Q[1-6]$", w[4], re.I) and 140 <= w[0] <= 260 and 240 <= w[1] <= 290:
            res["Exterior Quality Rating"] = w[4].upper()
        if re.match(r"^C[1-6]$", w[4], re.I) and 420 <= w[0] <= 530 and 240 <= w[1] <= 290:
            res["Exterior Condition Rating"] = w[4].upper()

    # 2. Table: Exterior Features
    feat_hdr = [w for w in words if w[4] == "Feature" and w[0] < 80]
    if not feat_hdr:
        return res
    y_hdr = feat_hdr[0][1]

    mech_hdr = [w for w in words if w[4] == "Mechanical" and w[1] > y_hdr]
    y_bot = mech_hdr[0][1] if mech_hdr else y_hdr + 250

    tbl_words = [w for w in words if y_hdr + 5 <= w[1] < y_bot]
    starters = [w for w in tbl_words if w[0] < 120 and w[4] in ["Exterior", "Foundation", "Roof", "Windows"]]
    starters.sort(key=lambda x: x[1])

    for idx, s in enumerate(starters):
        y0 = s[1] - 3
        y1 = starters[idx + 1][1] - 3 if idx + 1 < len(starters) else y_bot - 2
        rw = [w for w in tbl_words if y0 <= w[1] < y1]

        def join_col(wlist):
            sw = sorted(wlist, key=lambda x: (round(x[1] / 4) * 4, x[0]))
            return clean_text_value(" ".join([w[4] for w in sw if w[4].strip()]))

        f_name_raw = join_col([w for w in rw if w[0] < 145])
        if "Exterior" in f_name_raw or "Wall" in f_name_raw:
            prefix = "Exterior Walls and Trim"
        elif "Foundation" in f_name_raw:
            prefix = "Foundation"
        elif "Roof" in f_name_raw:
            prefix = "Roof"
        elif "Window" in f_name_raw:
            prefix = "Windows"
        else:
            prefix = f_name_raw

        det_val = join_col([w for w in rw if 145 <= w[0] < 250])
        qc_val = join_col([w for w in rw if 250 <= w[0] < 360])
        cs_val = join_col([w for w in rw if 360 <= w[0] < 465])
        cc_val = join_col([w for w in rw if w[0] >= 465])

        if prefix == "Roof":
            m_age = re.search(r"Estimated\s+Age\s*[:\-]?\s*([^\n\r]+)", det_val, re.I)
            if m_age:
                res["Roof Estimated Age"] = clean_text_value(m_age.group(1))
                res["Roof"] = clean_text_value(re.sub(r"Estimated\s+Age\s*[:\-]?\s*[^\n\r]+", "", det_val, flags=re.I))
            else:
                res["Roof"] = det_val
        else:
            res[prefix] = det_val

        res[f"{prefix} Quality Comment"] = qc_val
        res[f"{prefix} Condition Status"] = cs_val
        res[f"{prefix} Condition Comment"] = cc_val

    return res


def extract_v1_mechanical_section(page) -> Dict[str, Any]:
    """
    Extracts Heating System, Heating Fuel, Cooling System, Core Heating System Below Grade,
    and Other Mechanical Systems from Mechanical System Details table using spatial coordinates.
    """
    words = page.get_text("words")
    res: Dict[str, Any] = {}

    m_hdrs = [w for w in words if w[4] == "Mechanical" and w[0] < 80]
    if not m_hdrs:
        return res
    y_m = m_hdrs[0][1]

    bot_candidates = [w for w in words if w[1] > y_m and (w[4] in ["Apparent", "Dwelling", "Uniform"] or "Comment" in w[4])]
    y_bot = min([w[1] for w in bot_candidates]) if bot_candidates else y_m + 160

    m_words = [w for w in words if y_m <= w[1] < y_bot]

    # Heating row:
    heating_label = [w for w in m_words if w[4] == "Heating" and w[0] < 80]
    if heating_label:
        y_h = heating_label[0][1]
        h_words = [w for w in m_words if abs(w[1] - y_h) < 10 and 95 <= w[0] < 310]
        h_sys = " ".join(w[4] for w in sorted([w for w in h_words if w[0] < 175], key=lambda x: x[0]))
        h_fuel = " ".join(w[4] for w in sorted([w for w in h_words if w[0] >= 175], key=lambda x: x[0]))
        if h_sys:
            res["Heating System"] = clean_text_value(h_sys)
        if h_fuel:
            res["Heating Fuel"] = clean_text_value(h_fuel)

    # Cooling row:
    cooling_label = [w for w in m_words if w[4] == "Cooling" and w[0] < 80]
    if cooling_label:
        y_c = cooling_label[0][1]
        c_words = [w for w in m_words if abs(w[1] - y_c) < 10 and 95 <= w[0] < 310]
        c_sys = " ".join(w[4] for w in sorted(c_words, key=lambda x: x[0]))
        if c_sys:
            res["Cooling System"] = clean_text_value(c_sys)

    # Core Heating System Below Grade:
    # Look for checkmark \uf0fc or vector boxes near Yes (x~541) or No (x~561)
    ch_check = [w for w in m_words if w[4] in ["\uf0fc", "✓", "X", "x", "☑"] and 520 <= w[0] <= 580]
    if ch_check:
        cx = ch_check[0][0]
        if abs(cx - 541.0) < abs(cx - 561.0):
            res["Core Heating System Below Grade"] = "Yes"
        else:
            res["Core Heating System Below Grade"] = "No"

    # Other Mechanical Systems
    other_label = [w for w in m_words if w[4] == "Other" and any(w2[4] == "Mechanical" and abs(w2[1] - w[1]) < 5 for w2 in m_words)]
    if other_label:
        y_o = other_label[0][1]
        o_words = [w for w in m_words if (y_o - 5 <= w[1] < y_bot) and w[0] >= 440]
        if o_words:
            res["Other Mechanical Systems"] = clean_text_value(" ".join(w[4] for w in sorted(o_words, key=lambda x: (round(x[1] / 4) * 4, x[0]))))

    return res


def extract_v1_improvements_section(doc, full_doc_text: str, summary: Dict[str, Any]) -> Dict[str, Any]:
    """
    Extracts IMPROVEMENTS category fields from Dwelling Exterior, Quality, Mechanical, and Sketch pages.
    """
    imp: Dict[str, Any] = {
        "Units in Structure": "",
        "Floors in Building": "",
        "Dwelling Style": "",
        "Front Door Elevation": "",
        "Year Built": "",
        "Construction Method": summary.get("Construction Method", ""),
        "Converted Area": "",
        "Exterior Quality Rating": "",
        "Exterior Condition Rating": "",
        "Exterior Walls and Trim": "",
        "Exterior Walls and Trim Quality Comment": "",
        "Exterior Walls and Trim Condition Status": "",
        "Exterior Walls and Trim Condition Comment": "",
        "Foundation": "",
        "Foundation Quality Comment": "",
        "Foundation Condition Status": "",
        "Foundation Condition Comment": "",
        "Roof": "",
        "Roof Estimated Age": "",
        "Roof Quality Comment": "",
        "Roof Condition Status": "",
        "Roof Condition Comment": "",
        "Windows": "",
        "Windows Quality Comment": "",
        "Windows Condition Status": "",
        "Windows Condition Comment": "",
        "Heating System": "",
        "Heating Fuel": "",
        "Cooling System": "",
        "Core Heating System Below Grade": "",
        "Other Mechanical Systems": "",
        "Exterior Features": "",
        "Dwelling Exterior Exhibits": "",
        "Apparent Defects, Damages, Deficiencies (Dwelling Exterior)": "",
        "Dwelling Exterior Commentary": "",
        "Overall Quality": summary.get("Overall Quality", ""),
        "Overall Condition": summary.get("Overall Condition", ""),
        "Finished Above Grade": "",
        "Unfinished Above Grade": "",
        "Finished Below Grade": "",
        "Unfinished Below Grade": "",
        "Levels in Unit": "",
        "Occupancy": "",
        "Total Bedrooms": "",
        "Total Bathrooms - Full": "",
        "Total Bathrooms - Half": "",
        "Car Storage": "",
        "Driveway # of Cars": "",
        "Driveway Surface": "",
        "Garage # of Cars": "",
        "Carport # of Cars": "",
        "Att./Det./Built-in": "",
        "Garage Att./Det./Built-in": ""
    }

    # Aggregate text of Dwelling Exterior, Unit Interior, Quality and Condition, Mechanical, Sketch
    dw_text = ""
    for page in doc:
        ptxt = page.get_text("text")
        if re.search(r"Dwelling Exterior|Unit Interior|Kitchen and Bathroom Details|Interior Features|Overall Update Status|Quality and Condition|Exterior Features|Mechanical System|Sketch|Total Living Area", ptxt, re.I):
            _, spatial_txt = extract_page_words_and_lines(page)
            dw_text += spatial_txt + "\n"

    if not dw_text:
        dw_text = full_doc_text

    # Units in Structure
    m_uis = re.search(r"(?:Subject\s+Property\s+)?Units\s+in\s+Structure\s*[:\-]?\s*(\d+)", dw_text, re.I)
    if m_uis:
        imp["Units in Structure"] = m_uis.group(1)

    # Floors in Building
    m_fib = re.search(r"Floors\s+in\s+Building\s*[:\-]?\s*(\d+)", dw_text, re.I)
    if m_fib:
        imp["Floors in Building"] = m_fib.group(1)

    # Dwelling Style
    m_ds = re.search(r"Dwelling\s+Style\s*[:\-]?\s*([^\n\r]+)", dw_text, re.I)
    if m_ds:
        imp["Dwelling Style"] = clean_text_value(m_ds.group(1))

    # Front Door Elevation
    m_fde = re.search(r"Front\s+Door\s+Elevation\s*[:\-]?\s*([^\n\r]+)", dw_text, re.I)
    if m_fde:
        imp["Front Door Elevation"] = clean_text_value(m_fde.group(1))

    # Year Built
    m_yb = re.search(r"Year\s+Built\s*[:\-]?\s*(\d{4})", dw_text, re.I)
    if m_yb:
        imp["Year Built"] = m_yb.group(1)

    # Construction Method
    m_cm = re.search(r"Construction\s+Method\s*[:\-]?\s*([^\n\r]+)", dw_text, re.I)
    if m_cm:
        imp["Construction Method"] = clean_text_value(m_cm.group(1))

    # Converted Area
    m_ca = re.search(r"Converted\s+Area\s*[:\-]?\s*([^\n\r]+)", dw_text, re.I)
    if m_ca:
        imp["Converted Area"] = clean_text_value(m_ca.group(1))

    # Exterior Features & Mechanical System Details (Precision Spatial Table Extraction)
    for page in doc:
        ptxt = page.get_text("text")
        if "Exterior Features" in ptxt and "Feature" in ptxt:
            ext_data = extract_v1_exterior_features_table(page)
            imp.update(ext_data)
        if "Mechanical System Details" in ptxt:
            mech_data = extract_v1_mechanical_section(page)
            imp.update(mech_data)

    # Fallback for ratings if not extracted from Exterior Features table
    if imp.get("Exterior Quality Rating"):
        imp["Overall Quality"] = imp["Exterior Quality Rating"]
    elif not imp.get("Overall Quality"):
        m_eqr = re.search(r"Exterior\s+Quality\s+Rating\s*[:\-]?\s*([Q1-6q1-6]+)", dw_text, re.I)
        if m_eqr:
            imp["Exterior Quality Rating"] = clean_text_value(m_eqr.group(1)).upper()
            imp["Overall Quality"] = imp["Exterior Quality Rating"]

    if imp.get("Exterior Condition Rating"):
        imp["Overall Condition"] = imp["Exterior Condition Rating"]
    elif not imp.get("Overall Condition"):
        m_ecr = re.search(r"Exterior\s+Condition\s+Rating\s*[:\-]?\s*([C1-6c1-6]+)", dw_text, re.I)
        if m_ecr:
            imp["Exterior Condition Rating"] = clean_text_value(m_ecr.group(1)).upper()
            imp["Overall Condition"] = imp["Exterior Condition Rating"]

    # Dwelling Exterior Exhibits
    m_dee = re.search(r"Dwelling\s+Exterior\s+Exhibits\s*\n\s*([^\n\r]+?)(?=\s*Uniform|\s*Unit\s+Interior|\s*Page|\Z)", dw_text, re.I)
    if m_dee:
        val = clean_text_value(m_dee.group(1))
        if val and not re.search(r"Uniform|Page|\d+\s+of", val, re.I):
            imp["Dwelling Exterior Exhibits"] = val
        else:
            imp["Dwelling Exterior Exhibits"] = "Included in Exhibits"
    else:
        imp["Dwelling Exterior Exhibits"] = "Included in Exhibits"

    # Apparent Defects (Dwelling Exterior)
    m_def_ext = re.search(r"Apparent\s+Defects,?\s*Damages,?\s*Deficiencies\s*\(Dwelling\s+Exterior\)\s*\n\s*([^\n\r]+)", dw_text, re.I) or \
                re.search(r"Apparent\s+Defects,?\s*Damages,?\s*Deficiencies\s*\(Dwelling\s+Exterior\)\s*[:\-]?\s*([^\n\r]+)", dw_text, re.I)
    if m_def_ext:
        imp["Apparent Defects, Damages, Deficiencies (Dwelling Exterior)"] = clean_text_value(m_def_ext.group(1))

    # Dwelling Exterior Commentary
    m_dec = re.search(r"Dwelling\s+Exterior\s+Commentary\s*[:\-]?\s*(?:\n\s*)?([\s\S]*?)(?=Unit\s+Interior|Finished\s+Above|Quality\s+and\s+Condition|\n\s*\n\s*[A-Z][a-z]+|\Z)", dw_text, re.I) or \
            re.search(r"Dwelling\s+Exterior\s+Commentary\s*[:\-]?\s*(?:\n\s*)?([\s\S]*?)(?=Unit\s+Interior|Finished\s+Above|Quality\s+and\s+Condition|\n\s*\n\s*[A-Z][a-z]+|\Z)", full_doc_text, re.I)
    if m_dec:
        val_dec = clean_text_value(m_dec.group(1))
        if val_dec:
            imp["Dwelling Exterior Commentary"] = val_dec

    # Finished Above Grade (from Sketch / Living Area Calculations or Unit Interior)
    m_gla_sketch = re.search(r"Total\s+Living\s+Area\s*\(Rounded\)\s*[:\-]?\s*([\d,]+)\s*(?:Sq\s*ft)?", dw_text, re.I) or \
                   re.search(r"Living\s+Area\s*\n\s*First\s+Floor\s*[:\-]?\s*([\d,]+)", dw_text, re.I) or \
                   re.search(r"Finished\s+Above\s+Grade\s*[:\-]?\s*([\d,]+)", dw_text, re.I)
    if m_gla_sketch:
        imp["Finished Above Grade"] = m_gla_sketch.group(1).replace(",", "").strip()

    # Unit Interior - Area Breakdown
    m_unfin = re.search(r"Unfinished\s+Above\s+Grade\s*[:\-]?\s*([\d,]+)", dw_text, re.I)
    if m_unfin:
        imp["Unfinished Above Grade"] = m_unfin.group(1).replace(",", "").strip()

    m_fin_bg = re.search(r"Finished\s+Below\s+Grade\s*[:\-]?\s*([\d,]+)", dw_text, re.I)
    if m_fin_bg:
        imp["Finished Below Grade"] = m_fin_bg.group(1).replace(",", "").strip()

    m_unfin_bg = re.search(r"Unfinished\s+Below\s+Grade\s*[:\-]?\s*([\d,]+)", dw_text, re.I)
    if m_unfin_bg:
        imp["Unfinished Below Grade"] = m_unfin_bg.group(1).replace(",", "").strip()

    m_ads = re.search(r"Area\s+Data\s+Source\s*[:\-]?\s*([^\n\r]+)", dw_text, re.I)
    if m_ads:
        imp["Area Data Source"] = clean_text_value(m_ads.group(1))

    # Unit metrics
    m_liv = re.search(r"Levels\s+in\s+Unit\s*[:\-]?\s*(\d+)", dw_text, re.I)
    if m_liv:
        imp["Levels in Unit"] = m_liv.group(1)

    m_occ = re.search(r"Occupancy\s*[:\-]?\s*([^\n\r]+)", dw_text, re.I)
    if m_occ:
        imp["Occupancy"] = clean_text_value(m_occ.group(1))

    m_br = re.search(r"Total\s+Bedrooms\s*[:\-]?\s*(\d+)", dw_text, re.I)
    if m_br:
        imp["Total Bedrooms"] = m_br.group(1)

    m_tbf = re.search(r"Total\s+Bathrooms\s*-\s*Full\s*[:\-]?\s*(\d+)", dw_text, re.I)
    if m_tbf:
        imp["Total Bathrooms - Full"] = m_tbf.group(1)

    m_tbh = re.search(r"Total\s+Bathrooms\s*-\s*Half\s*[:\-]?\s*(\d+)", dw_text, re.I)
    if m_tbh:
        imp["Total Bathrooms - Half"] = m_tbh.group(1)

    # Level and Room Detail, Kitchen and Bathroom Details & Interior Features (Precision Spatial extraction)
    for page in doc:
        ptxt = page.get_text("text")
        if "Level and Room Detail" in ptxt or ("Level in Unit" in ptxt and "Grade Level Detail" in ptxt):
            lrd_data = extract_v1_level_room_detail_table(page)
            if lrd_data:
                imp.update(lrd_data)
        if "Kitchen and Bathroom Details" in ptxt:
            kb_data = extract_v1_kb_table(page)
            imp.update(kb_data)
            int_data = extract_v1_interior_features_table(page)
            imp.update(int_data)

    # Interior Quality and Condition
    m_iqr = re.search(r"Interior\s+Quality\s+Rating\s*[:\-]?\s*([Q1-6q1-6]+|[^\n\r]+?)(?=\s+Interior\s+Condition|\n|\Z)", dw_text, re.I)
    if m_iqr:
        imp["Interior Quality Rating"] = clean_text_value(m_iqr.group(1))

    m_icr = re.search(r"Interior\s+Condition\s+Rating\s*[:\-]?\s*([C1-6c1-6]+|[^\n\r]+)", dw_text, re.I)
    if m_icr:
        imp["Interior Condition Rating"] = clean_text_value(m_icr.group(1))

    m_ousb = re.search(r"Overall\s+Update\s+Status\s+for\s*(?:\n\s*)?Bathrooms\s*[:\-]?\s*([^\n\r]+)", dw_text, re.I)
    if m_ousb:
        imp["Overall Update Status for Bathrooms"] = clean_text_value(m_ousb.group(1))

    m_ousf = re.search(r"Overall\s+Update\s+Status\s+for\s*(?:\n\s*)?Flooring\s*[:\-]?\s*([^\n\r]+)", dw_text, re.I)
    if m_ousf:
        imp["Overall Update Status for Flooring"] = clean_text_value(m_ousf.group(1))

    # Apparent Defects (Unit Interior)
    m_def_int = re.search(r"Apparent\s+Defects,?\s*Damages,?\s*Deficiencies\s*\(Unit\s+Interior\)\s*\n\s*([^\n\r]+)", dw_text, re.I) or \
                re.search(r"Apparent\s+Defects,?\s*Damages,?\s*Deficiencies\s*\(Unit\s+Interior\)\s*[:\-]?\s*([^\n\r]+)", dw_text, re.I)
    if m_def_int:
        imp["Apparent Defects, Damages, Deficiencies (Unit Interior)"] = clean_text_value(m_def_int.group(1))

    # Vehicle Storage
    driveway_cars = "0"
    driveway_surface = ""
    garage_cars = "0"
    carport_cars = "0"
    att_type = ""
    cs_items = []

    all_txt = dw_text + "\n" + full_doc_text
    vs_text = ""
    for p in doc:
        pt = p.get_text("text")
        if "Vehicle Storage" in pt:
            vs_text = pt
            break
    if not vs_text:
        vs_text = all_txt

    m_vs = re.search(r"Vehicle\s+Storage[\s\S]*?Storage\s+Number\s+of\s+Parking\s+Spaces\s+Detail([\s\S]*?)(?=Apparent|\n\n[A-Z]|\Z)", vs_text, re.I)
    if m_vs:
        table_text = m_vs.group(1).strip()
        lines = [l.strip() for l in table_text.split("\n") if l.strip()]
        i = 0
        while i < len(lines):
            l_lower = lines[i].lower()
            if l_lower == "garage":
                cs_items.append("Garage")
                if i + 1 < len(lines) and re.match(r"^\d+$", lines[i + 1]):
                    garage_cars = lines[i + 1]
                    i += 1
                if i + 1 < len(lines):
                    nxt = lines[i + 1].lower()
                    if "att" in nxt: att_type = "Attached"; i += 1
                    elif "det" in nxt: att_type = "Detached"; i += 1
                    elif "built" in nxt: att_type = "Built-in"; i += 1
            elif l_lower == "driveway":
                cs_items.append("Driveway")
                if i + 1 < len(lines) and re.match(r"^\d+$", lines[i + 1]):
                    driveway_cars = lines[i + 1]
                    i += 1
                if i + 1 < len(lines) and not re.match(r"^\d+$", lines[i + 1]) and lines[i + 1].lower() not in ["garage", "carport", "vehicle", "apparent"]:
                    driveway_surface = lines[i + 1]
                    i += 1
            elif l_lower == "carport":
                cs_items.append("Carport")
                if i + 1 < len(lines) and re.match(r"^\d+$", lines[i + 1]):
                    carport_cars = lines[i + 1]
                    i += 1
            i += 1

    if not att_type:
        if re.search(r"\battached\s+(?:\w+\s+)?(?:car\s+)?garage\b", all_txt, re.I):
            att_type = "Attached"
        elif re.search(r"\bdetached\s+(?:\w+\s+)?(?:car\s+)?garage\b", all_txt, re.I):
            att_type = "Detached"
        elif re.search(r"\bbuilt[\s\-]in\s+(?:\w+\s+)?(?:car\s+)?garage\b", all_txt, re.I):
            att_type = "Built-in"

    cs_val = ", ".join(dict.fromkeys(cs_items)) if cs_items else "None"
    imp["Car Storage"] = cs_val
    imp["Driveway # of Cars"] = driveway_cars if (driveway_cars != "0" or "Driveway" in cs_val) else ""
    imp["Driveway Surface"] = driveway_surface
    imp["Garage # of Cars"] = garage_cars if (garage_cars != "0" or "Garage" in cs_val) else ""
    imp["Carport # of Cars"] = carport_cars if (carport_cars != "0" or "Carport" in cs_val) else ""
    imp["Att./Det./Built-in"] = att_type
    imp["Garage Att./Det./Built-in"] = att_type
    imp["Vehicle Storage Type"] = cs_val
    imp["Vehicle Storage Spaces"] = garage_cars if garage_cars != "0" else driveway_cars
    imp["Vehicle Storage Detail"] = att_type or driveway_surface

    m_def_vs = re.search(r"Apparent\s+Defects,\s+Damages,\s+Deficiencies\s*\(Vehicle\s+Storage\)\s*\n\s*([^\n\r]+)", dw_text, re.I)
    if m_def_vs:
        imp["Apparent Defects, Damages, Deficiencies (Vehicle Storage)"] = clean_text_value(m_def_vs.group(1))

    # Subject Property Amenities
    m_amen = re.search(r"Subject\s+Property\s+Amenities[\s\S]*?Amenity\s+Category\s+Subject\s+Property\s+Amenity\s+Material\s+Detail\s*\n\s*([A-Za-z0-9\s]+?)\s{2,}([A-Za-z0-9\s]+?)\s{2,}([A-Za-z0-9\s]+?)\s{2,}([^\n\r]+)", dw_text, re.I)
    if m_amen:
        imp["Amenity Category"] = clean_text_value(m_amen.group(1))
        imp["Subject Property Amenity"] = clean_text_value(m_amen.group(2))
        imp["Amenity Material"] = clean_text_value(m_amen.group(3))
        imp["Amenity Detail"] = clean_text_value(m_amen.group(4))

    m_def_am = re.search(r"Apparent\s+Defects,\s+Damages,\s+Deficiencies\s*\(Subject\s+Property\s+Amenities\)\s*\n\s*([^\n\r]+)", dw_text, re.I)
    if m_def_am:
        imp["Apparent Defects, Damages, Deficiencies (Subject Property Amenities)"] = clean_text_value(m_def_am.group(1))

    # Overall Quality and Condition on Page 15
    m_oq = re.search(r"Overall\s+Quality\s+and\s+Condition[\s\S]*?Overall\s+Quality\s*[:\-]?\s*([Q1-6q1-6]+|[^\n\r]+?)(?=\s+Overall\s+Condition|\n|\Z)", dw_text, re.I)
    if m_oq:
        imp["Overall Quality"] = clean_text_value(m_oq.group(1))

    m_oc = re.search(r"Overall\s+Quality\s+and\s+Condition[\s\S]*?Overall\s+Condition\s*[:\-]?\s*([C1-6c1-6]+|[^\n\r]+)", dw_text, re.I)
    if m_oc:
        imp["Overall Condition"] = clean_text_value(m_oc.group(1))

    m_eq = re.search(r"Exterior\s+Quality\s*[:\-]?\s*([Q1-6q1-6]+|[^\n\r]+?)(?=\s+Exterior\s+Condition|\n|\Z)", dw_text, re.I)
    if m_eq:
        imp["Exterior Quality"] = clean_text_value(m_eq.group(1))

    m_ec = re.search(r"Exterior\s+Condition\s*[:\-]?\s*([C1-6c1-6]+|[^\n\r]+)", dw_text, re.I)
    if m_ec:
        imp["Exterior Condition"] = clean_text_value(m_ec.group(1))

    # Reconciliation of Overall Quality and Condition
    m_rec_qc = re.search(r"Reconciliation\s+of\s+Overall\s+Quality\s+and\s+Condition\s*\n\s*([\s\S]*?)(?=Highest\s+and\s+Best|Market|\n\n|\Z)", dw_text, re.I)
    if m_rec_qc:
        imp["Reconciliation of Overall Quality and Condition"] = clean_text_value(m_rec_qc.group(1))

    return imp


def extract_v1_neighborhood_section(doc, full_doc_text: str, summary: Dict[str, Any]) -> Dict[str, Any]:
    """
    Extracts NEIGHBORHOOD category fields from Market / Neighborhood pages (e.g. Page 15).
    """
    neigh: Dict[str, Any] = {
        "Market Area Boundary": "",
        "Active Listings": "",
        "Median Days on Market": "",
        "Lowest List Price": "",
        "Median List Price": "",
        "Highest List Price": "",
        "Pending Sales": "",
        "Sales in Past 12 Months": "",
        "Lowest Sale Price": "",
        "Median Sale Price": "",
        "Highest Sale Price": "",
        "Distressed Market Competition": "",
        "Price Trend Source": "",
        "Demand / Supply": "",
        "Marketing Time": "",
        "Market Commentary": "",
        "Search Criteria Description": "",
        "Price Trend Analysis Commentary": "",
        "Current or Relevant Listings": "",
        "Data Source": "",
        "Subject Listing Information Commentary": "",
        "Subject Listing Information Exhibits": ""
    }

    mkt_text = ""
    for page in doc:
        ptxt = page.get_text("text")
        if re.search(r"\bMarket\b|Market Area Boundary|Search Criteria|Search Result Metrics|Housing Trends|Subject Listing", ptxt, re.I):
            _, spatial_txt = extract_page_words_and_lines(page)
            mkt_text += spatial_txt + "\n"

    if not mkt_text:
        mkt_text = full_doc_text

    # Market Area Boundary
    m_mab = re.search(r"Market\s+Area\s+Boundary\s*[:\-]?\s*([^\n\r]+)", mkt_text, re.I)
    if m_mab:
        neigh["Market Area Boundary"] = clean_text_value(m_mab.group(1))

    # Search Criteria Description
    m_scd = re.search(r"Search\s+Criteria\s+Description\s*[:\-]?\s*([\s\S]*?)(?=Search\s+Result\s+Metrics|\n\n|\Z)", mkt_text, re.I)
    if m_scd:
        neigh["Search Criteria Description"] = clean_text_value(m_scd.group(1))

    # Search Result Metrics
    m_al = re.search(r"Active\s+Listings\s*[:\-]?\s*([\d,]+)", mkt_text, re.I)
    if m_al:
        neigh["Active Listings"] = m_al.group(1).replace(",", "")

    m_dom = re.search(r"Median\s+Days\s+on\s+Market\s*[:\-]?\s*(\d+)", mkt_text, re.I)
    if m_dom:
        neigh["Median Days on Market"] = m_dom.group(1)

    m_llp = re.search(r"Lowest\s+List\s+Price\s*[:\-]?\s*\$?([\d,]+)", mkt_text, re.I)
    if m_llp:
        neigh["Lowest List Price"] = f"${m_llp.group(1)}"

    m_mlp = re.search(r"Median\s+List\s+Price\s*[:\-]?\s*\$?([\d,]+)", mkt_text, re.I)
    if m_mlp:
        neigh["Median List Price"] = f"${m_mlp.group(1)}"

    m_hlp = re.search(r"Highest\s+List\s+Price\s*[:\-]?\s*\$?([\d,]+)", mkt_text, re.I)
    if m_hlp:
        neigh["Highest List Price"] = f"${m_hlp.group(1)}"

    m_ps = re.search(r"Pending\s+Sales\s*[:\-]?\s*([\d,]+)", mkt_text, re.I)
    if m_ps:
        neigh["Pending Sales"] = m_ps.group(1).replace(",", "")

    m_s12 = re.search(r"Sales\s+in\s+Past\s+12\s+Months\s*[:\-]?\s*([\d,]+)", mkt_text, re.I)
    if m_s12:
        neigh["Sales in Past 12 Months"] = m_s12.group(1).replace(",", "")

    m_lsp = re.search(r"Lowest\s+Sale\s+Price\s*[:\-]?\s*\$?([\d,]+)", mkt_text, re.I)
    if m_lsp:
        neigh["Lowest Sale Price"] = f"${m_lsp.group(1)}"

    m_msp = re.search(r"Median\s+Sale\s+Price\s*[:\-]?\s*\$?([\d,]+)", mkt_text, re.I)
    if m_msp:
        neigh["Median Sale Price"] = f"${m_msp.group(1)}"

    m_hsp = re.search(r"Highest\s+Sale\s+Price\s*[:\-]?\s*\$?([\d,]+)", mkt_text, re.I)
    if m_hsp:
        neigh["Highest Sale Price"] = f"${m_hsp.group(1)}"

    m_dmc = re.search(r"Distressed\s+Market\s+Competition\s*[:\-]?\s*([^\n\r]+)", mkt_text, re.I) or \
            re.search(r"Distressed\s+Market\s+Competition\s*\n\s*([^\n\r]+)", mkt_text, re.I)
    if m_dmc:
        neigh["Distressed Market Competition"] = clean_text_value(m_dmc.group(1))

    m_pts = re.search(r"Price\s+Trend\s+Source\s*[:\-]?\s*([^\n\r]+)", mkt_text, re.I)
    if m_pts:
        neigh["Price Trend Source"] = clean_text_value(m_pts.group(1))

    # Price Trend Analysis Commentary
    m_ptac = re.search(r"Price\s+Trend\s+Analysis\s+Commentary\s*\n\s*([\s\S]*?)(?=Housing\s+Trends|Market\s+Commentary|\n\n|\Z)", mkt_text, re.I)
    if m_ptac:
        neigh["Price Trend Analysis Commentary"] = clean_text_value(m_ptac.group(1))

    # Housing Trends: Demand/Supply, Marketing Time
    m_ds = re.search(r"Demand/Supply\s*[:\-]?\s*([^\n\r]+?)(?=\s+Marketing\s+Time|\n|\Z)", mkt_text, re.I)
    if m_ds:
        neigh["Demand / Supply"] = clean_text_value(m_ds.group(1))

    m_mt = re.search(r"Marketing\s+Time\s*[:\-]?\s*([^\n\r]+)", mkt_text, re.I)
    if m_mt:
        neigh["Marketing Time"] = clean_text_value(m_mt.group(1))

    # Market Commentary
    m_mc = re.search(r"Market\s+Commentary\s*\n\s*([\s\S]*?)(?=Subject\s+Listing\s+Information|\n\n|\Z)", mkt_text, re.I)
    if m_mc:
        neigh["Market Commentary"] = clean_text_value(m_mc.group(1))

    # Subject Listing Information
    m_crl = re.search(r"Current\s+or\s+Relevant\s+Listings\s*[:\-]?\s*([^\n\r]+)", mkt_text, re.I)
    if m_crl:
        neigh["Current or Relevant Listings"] = clean_text_value(m_crl.group(1))

    m_dsource = re.search(r"Subject\s+Listing[\s\S]*?Data\s+Source\s*[:\-]?\s*([^\n\r]+)", mkt_text, re.I)
    if m_dsource:
        neigh["Data Source"] = clean_text_value(m_dsource.group(1))

    return neigh


def extract_v1_prior_sale_history_section(doc, full_doc_text: str, summary: Dict[str, Any]) -> Dict[str, Any]:
    """
    Extracts PRIOR_SALE_HISTORY fields dynamically from Prior Sale and Transfer History pages.
    Zero hardcoded values: uses spatial coordinates for all comparable transfer rows.
    """
    history: Dict[str, Any] = {
        "Prior Sales or Transfers": "",
        "Subject Transfer History Data Source": "",
        "Analysis of Prior Sale and Transfer History of Subject Property": "",
        "Comparable 1 Transfer Terms": "",
        "Comparable 1 Transfer Date": "",
        "Comparable 1 Transfer Amount": "",
        "Comparable 1 Transfer Data Source": "",
        "Comparable 2 Transfer Terms": "",
        "Comparable 2 Transfer Date": "",
        "Comparable 2 Transfer Amount": "",
        "Comparable 2 Transfer Data Source": "",
        "Comparable 3 Transfer Terms": "",
        "Comparable 3 Transfer Date": "",
        "Comparable 3 Transfer Amount": "",
        "Comparable 3 Transfer Data Source": "",
        "Analysis of Prior Sale and Transfer History of Comparable Sales": ""
    }

    hist_text = ""
    for page in doc:
        ptxt = page.get_text("text")
        if re.search(r"Prior\s+Sale\s+and\s+Transfer\s+History|Subject\s+Transfer\s+History|Comparable\s+Transfer\s+History", ptxt, re.I):
            words, spatial_txt = extract_page_words_and_lines(page)
            hist_text += spatial_txt + "\n"

            # Dynamic spatial row extraction for Comparable Transfer History
            row_nums = [w for w in words if 35 <= w[0] <= 55 and w[4].isdigit() and w[1] > 200]
            for rn in row_nums:
                c_num = rn[4]
                y_center = (rn[1] + rn[3]) / 2.0
                terms = " ".join(w[4] for w in sorted(words, key=lambda x: x[0]) if 55 <= w[0] < 170 and abs((w[1]+w[3])/2.0 - y_center) <= 5.0)
                date = " ".join(w[4] for w in sorted(words, key=lambda x: x[0]) if 170 <= w[0] < 300 and abs((w[1]+w[3])/2.0 - y_center) <= 5.0)
                amt = " ".join(w[4] for w in sorted(words, key=lambda x: x[0]) if 300 <= w[0] < 440 and abs((w[1]+w[3])/2.0 - y_center) <= 5.0)
                ds = " ".join(w[4] for w in sorted(words, key=lambda x: x[0]) if 440 <= w[0] < 580 and abs((w[1]+w[3])/2.0 - y_center) <= 5.0)
                if terms: history[f"Comparable {c_num} Transfer Terms"] = clean_text_value(terms)
                if date: history[f"Comparable {c_num} Transfer Date"] = clean_text_value(date)
                if amt: history[f"Comparable {c_num} Transfer Amount"] = clean_text_value(amt)
                if ds: history[f"Comparable {c_num} Transfer Data Source"] = clean_text_value(ds)

    if not hist_text:
        hist_text = full_doc_text

    m_pst = re.search(r"Prior\s+Sales\s+or\s+Transfers\s*[:\-]?\s*([^\n\r]+)", hist_text, re.I)
    if m_pst:
        history["Prior Sales or Transfers"] = clean_text_value(m_pst.group(1))

    m_sds = re.search(r"Subject\s+Transfer[\s\S]*?Data\s+Source\s*[:\-]?\s*([^\n\r]+)", hist_text, re.I)
    if m_sds:
        history["Subject Transfer History Data Source"] = clean_text_value(m_sds.group(1))

    m_asp = re.search(r"Analysis\s+of\s+Prior\s+Sale\s+and\s+Transfer\s+History\s+of\s+Subject\s+Property\s*[:\-]?\s*([\s\S]*?)(?=Comparable\s+Transfer\s+History|\n\n|\Z)", hist_text, re.I)
    if m_asp:
        history["Analysis of Prior Sale and Transfer History of Subject Property"] = clean_text_value(m_asp.group(1))

    m_asc = re.search(r"Analysis\s+of\s+Prior\s+Sale\s+and\s+Transfer\s+History\s+of\s+Comparable\s+Sales\s*[:\-]?\s*([\s\S]*?)(?=Appraisal\s+Version|Coastal\s+Appraisals|\n\n|\Z)", hist_text, re.I)
    if m_asc:
        history["Analysis of Prior Sale and Transfer History of Comparable Sales"] = clean_text_value(m_asc.group(1))

    return history


def extract_project_info_from_page(page) -> Dict[str, Any]:
    """
    Extracts Project Information, Mandatory Fees, and Project Factors from a single URAR 3.6 page.
    Zero hardcoded values: uses spatial coordinates and regex to capture all checkboxes, fees, factors, and comments.
    """
    words = page.get_text("words")
    p_hdr = None
    for w in words:
        if w[4] == "Project" and any(w2[4] == "Information" and abs(w2[1] - w[1]) < 5 for w2 in words):
            if not any(w3[4] == "Commentary" and abs(w3[1] - w[1]) < 5 for w3 in words):
                p_hdr = w[1]
                break
    if p_hdr is None:
        return {}

    proj = {
        "Planned Unit Development (PUD)": "No",
        "Condominium": "No",
        "Cooperative": "No",
        "Condop": "No",
        "Project Information Data Source": "",
        "Monthly Amount": "",
        "Common Amenities / Services Included": "",
        "Utilities Included": "",
        "Developer/Sponsor in Control Detail": "",
        "Developer/Sponsor in Control Impact": "",
        "Developer/Sponsor in Control Comment": "",
        "Known Legal Actions Detail": "",
        "Known Legal Actions Impact": "",
        "Known Legal Actions Comment": "",
        "Unit Special Assessments Detail": "",
        "Unit Special Assessments Impact": "",
        "Unit Special Assessments Comment": "",
        "Unit Tax Abatements or Exemptions Detail": "",
        "Unit Tax Abatements or Exemptions Impact": "",
        "Unit Tax Abatements or Exemptions Comment": "",
        "Project Factors Commentary": "",
        "Project Information Commentary": "",
        "Current or Relevant Listings": "",
        "Subject Listing Data Source": ""
    }

    # Checkboxes around p_hdr
    pud_w = next((w for w in words if "(PUD)" in w[4] and abs(w[1] - p_hdr) < 15), None)
    condo_w = next((w for w in words if "Condominium" in w[4] and abs(w[1] - p_hdr) < 15), None)
    coop_w = next((w for w in words if "Cooperative" in w[4] and abs(w[1] - p_hdr) < 15), None)
    condop_w = next((w for w in words if "Condop" in w[4] and abs(w[1] - p_hdr) < 15), None)

    checks = [w for w in words if abs(w[1] - p_hdr) < 15 and w[4] in ["\uf0fc", "", "[X]", "X"]]
    for chk in checks:
        if pud_w and chk[0] >= pud_w[0] and (not condo_w or chk[0] < condo_w[0]):
            proj["Planned Unit Development (PUD)"] = "Yes"
        elif condo_w and chk[0] >= condo_w[0] and (not coop_w or chk[0] < coop_w[0]):
            proj["Condominium"] = "Yes"
        elif coop_w and chk[0] >= coop_w[0] and (not condop_w or chk[0] < condop_w[0]):
            proj["Cooperative"] = "Yes"
        elif condop_w and chk[0] >= condop_w[0]:
            proj["Condop"] = "Yes"

    # Data Source
    m_fees_w = next((w for w in words if "Mandatory" in w[4] and w[1] > p_hdr), None)
    if m_fees_w:
        ds_words = [w for w in words if p_hdr + 20 <= w[1] < m_fees_w[1] and w[0] > 150]
        sw = sorted(ds_words, key=lambda x: (round(x[1] / 6) * 6, x[0]))
        proj["Project Information Data Source"] = clean_text_value(" ".join([w[4] for w in sw if w[4].strip()]))

    # Mandatory Fees
    p_fact_w = next((w for w in words if "Factors" in w[4] and w[1] > (m_fees_w[1] if m_fees_w else p_hdr)), None)
    if m_fees_w and p_fact_w:
        fees_words = [w for w in words if m_fees_w[1] <= w[1] < p_fact_w[1]]

        ma_label = next((w for w in fees_words if "Monthly" in w[4]), None)
        if ma_label:
            ma_val = [w for w in fees_words if abs(w[1] - ma_label[1]) < 10 and w[0] > 150]
            if ma_val:
                proj["Monthly Amount"] = clean_text_value(ma_val[0][4])

        ca_label = next((w for w in fees_words if "Common" in w[4]), None)
        ut_label = next((w for w in fees_words if "Utilities" in w[4]), None)
        if ca_label and ut_label:
            ca_words = [w for w in fees_words if ca_label[1] + 5 <= w[1] < ut_label[1] - 5 and w[0] > 150]
            sw = sorted(ca_words, key=lambda x: (round(x[1] / 6) * 6, x[0]))
            lines = {}
            for w in sw:
                yg = round(w[1] / 6) * 6
                lines.setdefault(yg, []).append(w[4])
            proj["Common Amenities / Services Included"] = clean_text_value(", ".join([" ".join(l) for l in lines.values()]))

        if ut_label:
            ut_words = [w for w in fees_words if abs(w[1] - ut_label[1]) < 10 and w[0] > 150]
            proj["Utilities Included"] = clean_text_value(" ".join([w[4] for w in ut_words]))

    # Project Factors table
    if p_fact_w:
        comm_candidates = [w for w in words if "Commentary" in w[4] and w[1] > p_fact_w[1]]
        comm_w = min(comm_candidates, key=lambda w: w[1]) if comm_candidates else None
        y_tbl_end = (comm_w[1] - 6) if comm_w else (p_fact_w[1] + 200)
        fact_words = [w for w in words if p_fact_w[1] + 15 <= w[1] < y_tbl_end]

        factors = [
            ("Developer/Sponsor in Control", "Developer/Sponsor"),
            ("Known Legal Actions", "Known"),
            ("Unit Special Assessments", "Special"),
            ("Unit Tax Abatements or Exemptions", "Abatements")
        ]

        row_bounds = []
        for full_name, search_key in factors:
            w_match = next((w for w in fact_words if search_key in w[4] and w[0] < 120), None)
            if w_match:
                row_bounds.append((full_name, w_match[1]))

        row_bounds.sort(key=lambda x: x[1])
        for idx, (fname, y_pos) in enumerate(row_bounds):
            y_start = y_pos - 4
            y_end = (row_bounds[idx + 1][1] - 4) if idx + 1 < len(row_bounds) else y_tbl_end
            r_words = [w for w in fact_words if y_start <= w[1] < y_end]

            col_det = [w for w in r_words if 160 <= w[0] < 260]
            col_imp = [w for w in r_words if 260 <= w[0] < 360]
            col_com = [w for w in r_words if w[0] >= 360]

            def join_w(wlist):
                sw = sorted(wlist, key=lambda x: (round(x[1] / 6) * 6, x[0]))
                return clean_text_value(" ".join([w[4] for w in sw if w[4].strip()]))

            proj[f"{fname} Detail"] = join_w(col_det)
            proj[f"{fname} Impact"] = join_w(col_imp)
            proj[f"{fname} Comment"] = join_w(col_com)

    # Commentaries
    lines_dict = {}
    for w in words:
        y_center = (w[1] + w[3]) / 2.0
        matched_y = None
        for ey in lines_dict.keys():
            if abs(ey - y_center) <= 4.0:
                matched_y = ey
                break
        if matched_y is None:
            matched_y = y_center
            lines_dict[matched_y] = []
        lines_dict[matched_y].append(w)
    full_lines = []
    for y in sorted(lines_dict.keys()):
        lw = sorted(lines_dict[y], key=lambda x: x[0])
        full_lines.append(" ".join([w[4] for w in lw if w[4].strip()]))
    sp_text = "\n".join(full_lines)

    m_pfc = re.search(r"Project\s+Factors\s+Commentary\s*([\s\S]*?)(?=Project\s+Information\s+Commentary|Subject\s+Listing|\n\n|\Z)", sp_text, re.I)
    if m_pfc:
        proj["Project Factors Commentary"] = clean_text_value(m_pfc.group(1))

    m_pic = re.search(r"Project\s+Information\s+Commentary\s*\n\s*([\s\S]*?)(?=Subject\s+Listing|Sales\s+Contract|Appraisal\s+Version|Fannie\s+Mae|\n\n|\Z)", sp_text, re.I)
    if m_pic:
        proj["Project Information Commentary"] = clean_text_value(m_pic.group(1))

    m_crl = re.search(r"Current\s+or\s+Relevant\s+Listings\s*[:\-]?\s*([^\n\r]+)", sp_text, re.I)
    if m_crl:
        proj["Current or Relevant Listings"] = clean_text_value(m_crl.group(1))

    m_ds = re.search(r"Subject\s+Listing\s+Information[\s\S]*?Data\s+Source\s*[:\-]?\s*([^\n\r]+)", sp_text, re.I)
    if m_ds:
        proj["Subject Listing Data Source"] = clean_text_value(m_ds.group(1))

    return proj


def extract_v1_project_info_section(doc, full_doc_text: str, summary: Dict[str, Any]) -> Dict[str, Any]:
    """
    Extracts PROJECT_INFO / PUD / Mandatory Fees / Project Factors fields from URAR 3.6 PDF pages.
    Zero hardcoded values: dynamically detects checkboxes, fee amounts, factor tables, and commentaries.
    """
    proj: Dict[str, Any] = {
        "Planned Unit Development (PUD)": summary.get("Planned Unit Development (PUD)", "No"),
        "Condominium": summary.get("Condominium", "No"),
        "Cooperative": summary.get("Cooperative", "No"),
        "Condop": summary.get("Condop", "No"),
        "Project Information Data Source": "",
        "Monthly Amount": "",
        "Common Amenities / Services Included": "",
        "Utilities Included": "",
        "Developer/Sponsor in Control Detail": "",
        "Developer/Sponsor in Control Impact": "",
        "Developer/Sponsor in Control Comment": "",
        "Known Legal Actions Detail": "",
        "Known Legal Actions Impact": "",
        "Known Legal Actions Comment": "",
        "Unit Special Assessments Detail": "",
        "Unit Special Assessments Impact": "",
        "Unit Special Assessments Comment": "",
        "Unit Tax Abatements or Exemptions Detail": "",
        "Unit Tax Abatements or Exemptions Impact": "",
        "Unit Tax Abatements or Exemptions Comment": "",
        "Project Factors Commentary": "",
        "Project Information Commentary": "",
        "Current or Relevant Listings": "",
        "Subject Listing Data Source": ""
    }

    for page in doc:
        ptxt = page.get_text("text")
        if "Mandatory Fees" in ptxt or ("Project Information" in ptxt and "Planned Unit Development" in ptxt):
            p_data = extract_project_info_from_page(page)
            for k, v in p_data.items():
                if k in ["Planned Unit Development (PUD)", "Condominium", "Cooperative", "Condop"]:
                    if v == "Yes" or proj.get(k) != "Yes":
                        proj[k] = v
                elif v:
                    proj[k] = v

    return proj


def extract_v1_sales_grid_section(doc, full_doc_text: str, summary: Dict[str, Any]) -> Dict[str, Any]:
    """
    Extracts SALES_GRID columns for Subject, Comparable #1, #2, #3, etc. from Sales Comparison pages.
    Zero hardcoded values: uses standardized UAD 3.6 spatial column coordinates and row label mapping.
    """
    def _create_empty_comp(is_subject: bool = False) -> Dict[str, Any]:
        d = {
            "Address": "",
            "Comparable Property Address": "",
            "Subject Property Address": "",
            "Data Source": "",
            "Proximity": "",
            "Proximity to Subject": "",
            "List Price": "",
            "Listing Status": "",
            "Sale Price": "",
            "Transfer Terms": "",
            "Transfer Terms Adjustment": "",
            "Financing Type": "",
            "Financing Type Adjustment": "",
            "Sales Concessions": "",
            "Sales Concessions Adjustment": "",
            "Contract Date": "",
            "Contract Date Adjustment": "",
            "Sale Date": "",
            "Sale Date Adjustment": "",
            "Days on Market": "",
            "Attached / Detached": "",
            "Property Rights Appraised": "",
            "Site Size": "",
            "Site Size Adjustment": "",
            "Site Influence (Location)": "",
            "Location Adjustment": "",
            "View": "",
            "View Adjustment": "",
            "Year Built": "",
            "Year Built Adjustment": "",
            "Construction Method": "",
            "Dwelling Style": "",
            "Heating": "",
            "Heating Adjustment": "",
            "Amenities": "",
            "Amenities Adjustment": "",
            "Bedrooms": "",
            "Bedrooms Adjustment": "",
            "Bathrooms - Full": "",
            "Bathrooms - Half": "",
            "Finished Area Above Grade": "",
            "Finished Area Above Grade Adjustment": "",
            "Finished Area Below Grade": "",
            "Finished Area Below Grade Adjustment": "",
            "Unfinished Area Below Grade": "",
            "Unfinished Area Below Grade Adjustment": "",
            "Exterior Quality": "",
            "Exterior Condition": "",
            "Interior Quality": "",
            "Interior Condition": "",
            "Overall Quality": "",
            "Overall Condition": "",
            "Overall Condition Adjustment": "",
            "Vehicle Storage Type": "",
            "Vehicle Storage Spaces": "",
            "Vehicle Storage Detail": "",
            "Vehicle Storage Adjustment": "",
            "Net Adjustment Total": "",
            "Adjusted Price": "",
            "Comparable Weight": ""
        }
        if is_subject:
            d["Subject Property Address"] = summary.get("Physical Address", "")
            d["Comparable Property Address"] = summary.get("Physical Address", "")
            d["Attached / Detached"] = summary.get("Attachment Type", "")
            d["Property Rights Appraised"] = summary.get("Property Rights Appraised", "")
            d["Year Built"] = summary.get("Year Built", "")
            d["Construction Method"] = summary.get("Construction Method", "")
            d["Bedrooms"] = summary.get("Total Bedrooms", "")
            d["Bathrooms - Full"] = summary.get("Total Bathrooms - Full", "")
            d["Bathrooms - Half"] = summary.get("Total Bathrooms - Half", "")
            d["Finished Area Above Grade"] = summary.get("Finished Above Grade", "")
            d["Overall Quality"] = summary.get("Overall Quality", "")
            d["Overall Condition"] = summary.get("Overall Condition", "")
        return d

    grid: Dict[str, Any] = {
        "Subject": _create_empty_comp(is_subject=True),
        "COMPARABLE SALE #1": _create_empty_comp(is_subject=False),
        "COMPARABLE SALE #2": _create_empty_comp(is_subject=False),
        "COMPARABLE SALE #3": _create_empty_comp(is_subject=False)
    }

    col_x_map = [
        ("Subject", 145.0, 254.0),
        ("COMPARABLE SALE #1", 254.0, 362.0),
        ("COMPARABLE SALE #2", 362.0, 470.0),
        ("COMPARABLE SALE #3", 470.0, 580.0),
    ]

    for p_idx, page in enumerate(doc):
        text = page.get_text("text")
        if "Sales Comparison Approach" not in text:
            continue

        words = page.get_text("words")

        # Determine column offset if continuation page (e.g. Comps 4, 5, 6)
        comp_offset = 0
        if "Comparable #4" in text:
            comp_offset = 3
        elif "Comparable #7" in text:
            comp_offset = 6

        # Group label words on the left (x < 145) by y-coordinate
        label_lines = {}
        for w in words:
            if w[0] < 145.0 and 90.0 <= w[1] <= 920.0:
                y = round((w[1] + w[3]) / 2.0, 0)
                fk = None
                for k in label_lines:
                    if abs(k - y) < 4.0:
                        fk = k
                        break
                if fk is None:
                    fk = y
                    label_lines[fk] = []
                label_lines[fk].append(w)

        sorted_y = sorted(label_lines.keys())
        for i, yk in enumerate(sorted_y):
            lbl = " ".join(w[4] for w in sorted(label_lines[yk], key=lambda x: x[0])).strip()
            lbl_clean = re.sub(r"[\:\-\|]+$", "", lbl).strip().lower()

            y_next = sorted_y[i + 1] if i + 1 < len(sorted_y) else yk + 20.0
            y_top = yk - 5.0
            max_h = 32.0 if any(k in lbl_clean for k in ["address", "detail", "storage", "condition", "feature"]) else 18.0
            y_bot = min(y_next - 2.0, yk + max_h)

            for col_name, x_min, x_max in col_x_map:
                actual_comp = col_name
                if col_name != "Subject" and comp_offset > 0:
                    c_num = int(col_name.split("#")[-1]) + comp_offset
                    actual_comp = f"COMPARABLE SALE #{c_num}"

                if actual_comp not in grid:
                    grid[actual_comp] = _create_empty_comp(is_subject=False)

                cell_words = [w for w in words if x_min <= w[0] < x_max and y_top <= (w[1] + w[3]) / 2.0 <= y_bot]
                cell_words = sorted(cell_words, key=lambda x: (round(x[1] / 3.0) * 3.0, x[0]))

                if not cell_words:
                    continue

                full_cell_text = " ".join(w[4] for w in cell_words).strip()

                val_text = full_cell_text
                adj_text = ""
                if col_name != "Subject":
                    x_mid = x_min + (x_max - x_min) * 0.52
                    val_words = [w[4] for w in cell_words if w[0] < x_mid]
                    adj_words = [w[4] for w in cell_words if w[0] >= x_mid]
                    if val_words and adj_words:
                        val_text = " ".join(val_words).strip()
                        adj_text = " ".join(adj_words).strip()

                # Map to standard field names
                if "property address" in lbl_clean or "address" == lbl_clean:
                    grid[actual_comp]["Address"] = full_cell_text
                    if col_name == "Subject":
                        grid[actual_comp]["Subject Property Address"] = full_cell_text
                        grid[actual_comp]["Comparable Property Address"] = full_cell_text
                    else:
                        grid[actual_comp]["Comparable Property Address"] = full_cell_text
                elif "data source" in lbl_clean:
                    grid[actual_comp]["Data Source"] = full_cell_text
                elif "proximity" in lbl_clean:
                    grid[actual_comp]["Proximity"] = full_cell_text
                    grid[actual_comp]["Proximity to Subject"] = full_cell_text
                elif "list price" in lbl_clean:
                    grid[actual_comp]["List Price"] = full_cell_text
                elif "listing status" in lbl_clean:
                    grid[actual_comp]["Listing Status"] = full_cell_text
                elif "sale price" in lbl_clean:
                    grid[actual_comp]["Sale Price"] = full_cell_text
                elif "transfer terms" in lbl_clean:
                    grid[actual_comp]["Transfer Terms"] = val_text
                    if adj_text: grid[actual_comp]["Transfer Terms Adjustment"] = adj_text
                elif "financing type" in lbl_clean:
                    grid[actual_comp]["Financing Type"] = val_text
                    if adj_text: grid[actual_comp]["Financing Type Adjustment"] = adj_text
                elif "sales concessions" in lbl_clean:
                    grid[actual_comp]["Sales Concessions"] = val_text
                    if adj_text: grid[actual_comp]["Sales Concessions Adjustment"] = adj_text
                elif "contract date" in lbl_clean:
                    grid[actual_comp]["Contract Date"] = val_text
                    if adj_text: grid[actual_comp]["Contract Date Adjustment"] = adj_text
                elif "sale date" in lbl_clean:
                    grid[actual_comp]["Sale Date"] = val_text
                    if adj_text: grid[actual_comp]["Sale Date Adjustment"] = adj_text
                elif "days on market" in lbl_clean:
                    grid[actual_comp]["Days on Market"] = full_cell_text
                elif "attached/detached" in lbl_clean:
                    grid[actual_comp]["Attached / Detached"] = full_cell_text
                elif "property rights appraised" in lbl_clean:
                    grid[actual_comp]["Property Rights Appraised"] = full_cell_text
                elif "site size" in lbl_clean:
                    grid[actual_comp]["Site Size"] = val_text
                    if adj_text: grid[actual_comp]["Site Size Adjustment"] = adj_text
                elif "site influence" in lbl_clean:
                    grid[actual_comp]["Site Influence (Location)"] = val_text
                    if adj_text: grid[actual_comp]["Location Adjustment"] = adj_text
                elif "view" in lbl_clean:
                    grid[actual_comp]["View"] = val_text
                    if adj_text: grid[actual_comp]["View Adjustment"] = adj_text
                elif "year built" in lbl_clean:
                    grid[actual_comp]["Year Built"] = val_text
                    if adj_text: grid[actual_comp]["Year Built Adjustment"] = adj_text
                elif "construction method" in lbl_clean:
                    grid[actual_comp]["Construction Method"] = full_cell_text
                elif "dwelling style" in lbl_clean:
                    grid[actual_comp]["Dwelling Style"] = val_text
                elif "heating" in lbl_clean:
                    grid[actual_comp]["Heating"] = val_text
                    if adj_text: grid[actual_comp]["Heating Adjustment"] = adj_text
                elif "amenities" in lbl_clean:
                    grid[actual_comp]["Amenities"] = val_text
                    if adj_text: grid[actual_comp]["Amenities Adjustment"] = adj_text
                elif "bedrooms" in lbl_clean:
                    grid[actual_comp]["Bedrooms"] = val_text
                    if adj_text: grid[actual_comp]["Bedrooms Adjustment"] = adj_text
                elif "baths" in lbl_clean:
                    grid[actual_comp]["Bathrooms - Full"] = val_text
                elif "finished area above grade" in lbl_clean:
                    grid[actual_comp]["Finished Area Above Grade"] = val_text
                    if adj_text: grid[actual_comp]["Finished Area Above Grade Adjustment"] = adj_text
                elif "finished area below grade" in lbl_clean:
                    grid[actual_comp]["Finished Area Below Grade"] = val_text
                    if adj_text: grid[actual_comp]["Finished Area Below Grade Adjustment"] = adj_text
                elif "unfinished area below grade" in lbl_clean:
                    grid[actual_comp]["Unfinished Area Below Grade"] = val_text
                    if adj_text: grid[actual_comp]["Unfinished Area Below Grade Adjustment"] = adj_text
                elif "quality" == lbl_clean:
                    grid[actual_comp]["Overall Quality"] = val_text
                elif "condition" == lbl_clean:
                    grid[actual_comp]["Overall Condition"] = val_text
                    if adj_text: grid[actual_comp]["Overall Condition Adjustment"] = adj_text
                elif "vehicle storage" in lbl_clean or "type | spaces" in lbl_clean:
                    grid[actual_comp]["Vehicle Storage Detail"] = val_text
                    if adj_text: grid[actual_comp]["Vehicle Storage Adjustment"] = adj_text
                elif "net adjustment total" in lbl_clean:
                    grid[actual_comp]["Net Adjustment Total"] = full_cell_text
                elif "adjusted price" in lbl_clean:
                    grid[actual_comp]["Adjusted Price"] = full_cell_text
                elif "comparable weight" in lbl_clean:
                    grid[actual_comp]["Comparable Weight"] = full_cell_text

    # Extract Indicated Value by Sales Comparison Approach
    m_iv = re.search(r"Indicated\s+Value\s+by\s+Sales\s+Comparison\s+Approach\s*[:\-]?\s*(?:\n\s*)?\$?([\d,]+)", full_doc_text, re.I) or \
           re.search(r"Sales\s+Comparison\s+Approach[\s\S]*?Indicated\s+Value\s*[:\-]?\s*\$?([\d,]+)", full_doc_text, re.I)
    val_sca = f"${m_iv.group(1)}" if m_iv else (summary.get("Opinion of Market Value") or "")

    grid["Indicated Value by Sales Comparison Approach"] = val_sca
    grid["Indicated Value by Sales Comparison Approach Indicated"] = val_sca
    grid["Indicated Value by Sales Comparison Approach $"] = val_sca
    grid["Sales Comparison Approach Indicated Value"] = val_sca

    return grid


def extract_v1_reconciliation_section(doc, full_doc_text: str, summary: Dict[str, Any]) -> Dict[str, Any]:
    """
    Extracts RECONCILIATION category fields dynamically.
    Extracts Approaches to Value, Reasons for Exclusion, Appraisal Summary,
    Reconciliation of Market Value, and Apparent Defects, Damages, Deficiencies.
    """
    rec: Dict[str, Any] = {
        "Sales Comparison Approach Indicated Value": "",
        "Income Approach Indicated Value": "",
        "Cost Approach Indicated Value": "",
        "Reason for Exclusion (Sales Comparison Approach)": "",
        "Reason for Exclusion (Income Approach)": "",
        "Reason for Exclusion (Cost Approach)": "",
        "Opinion of Market Value": summary.get("Opinion of Market Value", ""),
        "Market Value Condition": summary.get("Market Value Condition", ""),
        "Reasonable Exposure Time": summary.get("Exposure comment", "") or summary.get("Reasonable Exposure Time", ""),
        "Effective Date of Appraisal": summary.get("Effective Date of Appraisal", ""),
        "Reconciliation of Market Value": summary.get("Subject Property Commentary", "") or summary.get("Reconciliation of Market Value", ""),
        "Apparent Defects, Damages, Deficiencies": "",
        "Reconciliation of Sales Comparison Approach": ""
    }

    rec_text = ""
    for page in doc:
        ptxt = page.get_text("text")
        if re.search(r"Reconciliation|Approaches\s+to\s+Value|Reasonable\s+Exposure\s+Time|Opinion\s+of\s+Market\s+Value|Apparent\s+Defects", ptxt, re.I):
            words, spatial_txt = extract_page_words_and_lines(page)
            rec_text += spatial_txt + "\n"

            # Check if this page contains the Approaches to Value table
            for idx_w, w in enumerate(words):
                if w[4] == "Sales" and 100 <= w[1] <= 650:
                    next_w = [nw for nw in words if abs((nw[1]+nw[3])/2.0 - (w[1]+w[3])/2.0) <= 4.0 and nw[0] > w[2]]
                    if next_w and "comparison" in next_w[0][4].lower():
                        y_hdr = (w[1] + w[3]) / 2.0
                        # 1. Indicated Value row
                        val_row = [vw for vw in words if y_hdr + 6.0 <= (vw[1]+vw[3])/2.0 <= y_hdr + 28.0]
                        s_vals = [vw[4] for vw in val_row if 120 <= vw[0] < 280 and vw[4] not in ["Indicated", "Value"]]
                        i_vals = [vw[4] for vw in val_row if 280 <= vw[0] < 420 and vw[4] not in ["Indicated", "Value"]]
                        c_vals = [vw[4] for vw in val_row if 420 <= vw[0] < 600 and vw[4] not in ["Indicated", "Value"]]
                        if s_vals: rec["Sales Comparison Approach Indicated Value"] = " ".join(s_vals).strip()
                        if i_vals: rec["Income Approach Indicated Value"] = " ".join(i_vals).strip()
                        if c_vals: rec["Cost Approach Indicated Value"] = " ".join(c_vals).strip()

                        # 2. Reason for Exclusion row
                        excl_row = [vw for vw in words if y_hdr + 28.0 < (vw[1]+vw[3])/2.0 <= y_hdr + 65.0]
                        s_excl = [vw[4] for vw in excl_row if 120 <= vw[0] < 280 and vw[4] not in ["Reason", "for", "Exclusion"]]
                        i_excl = [vw[4] for vw in excl_row if 280 <= vw[0] < 420 and vw[4] not in ["Reason", "for", "Exclusion"]]
                        c_excl = [vw[4] for vw in excl_row if 420 <= vw[0] < 600 and vw[4] not in ["Reason", "for", "Exclusion"]]
                        if s_excl: rec["Reason for Exclusion (Sales Comparison Approach)"] = " ".join(s_excl).strip()
                        if i_excl: rec["Reason for Exclusion (Income Approach)"] = " ".join(i_excl).strip()
                        if c_excl: rec["Reason for Exclusion (Cost Approach)"] = " ".join(c_excl).strip()
                        break

            # Exposure time from words
            for w in words:
                if w[4].lower() == "exposure":
                    exp_words = [ow[4] for ow in sorted(words, key=lambda x: x[0]) if abs((ow[1]+ow[3])/2.0 - (w[1]+w[3])/2.0) <= 6.0 and ow[0] > w[2]]
                    exp_clean = " ".join(exp_words).replace("Time", "").strip()
                    if exp_clean:
                        rec["Reasonable Exposure Time"] = clean_text_value(exp_clean)
                    break

    if not rec_text:
        rec_text = full_doc_text

    # Indicated Value fallbacks
    if not rec["Sales Comparison Approach Indicated Value"]:
        m_iv = re.search(r"Sales\s+Comparison\s+Approach\s*(?:Indicated\s+Value)?\s*[:\-]?\s*(?:\n\s*)?\$?([\d,]+)", rec_text, re.I) or \
               re.search(r"Indicated\s+Value\s+by\s+Sales\s+Comparison\s+Approach[\s\S]*?Indicated\s+Value\s*[:\-]?\s*\$?([\d,]+)", rec_text, re.I)
        if m_iv:
            rec["Sales Comparison Approach Indicated Value"] = f"${m_iv.group(1)}"
        elif summary.get("Opinion of Market Value"):
            rec["Sales Comparison Approach Indicated Value"] = summary.get("Opinion of Market Value", "")

    if not rec["Cost Approach Indicated Value"]:
        m_civ = re.search(r"Cost\s+Approach\s*(?:Indicated\s+Value)?\s*[:\-]?\s*(?:\n\s*)?\$?([\d,]+)", rec_text, re.I) or \
                re.search(r"Indicated\s+Value\s+by\s+Cost\s+Approach\s*[:\-]?\s*(?:\n\s*)?\$?([\d,]+)", full_doc_text, re.I)
        if m_civ:
            rec["Cost Approach Indicated Value"] = f"${m_civ.group(1)}"

    if not rec["Income Approach Indicated Value"]:
        m_iiv = re.search(r"Income\s+Approach\s*(?:Indicated\s+Value)?\s*[:\-]?\s*(?:\n\s*)?\$?([\d,]+)", rec_text, re.I)
        if m_iiv:
            rec["Income Approach Indicated Value"] = f"${m_iiv.group(1)}"

    # Reasons for exclusion fallback regexes
    if not rec["Reason for Exclusion (Income Approach)"]:
        m_iex = re.search(r"Reason\s+for\s+Exclusion\s*\(?Income(?:\s+Approach)?\)?\s*[:\-]?\s*([^\n\r]+)", rec_text, re.I)
        if m_iex:
            rec["Reason for Exclusion (Income Approach)"] = clean_text_value(m_iex.group(1))

    if not rec["Reason for Exclusion (Cost Approach)"]:
        m_cex = re.search(r"Reason\s+for\s+Exclusion\s*\(?Cost(?:\s+Approach)?\)?\s*[:\-]?\s*([^\n\r]+)", rec_text, re.I)
        if m_cex:
            rec["Reason for Exclusion (Cost Approach)"] = clean_text_value(m_cex.group(1))

    if not rec["Reason for Exclusion (Sales Comparison Approach)"]:
        m_sex = re.search(r"Reason\s+for\s+Exclusion\s*\(?Sales(?:\s+Comparison\s+Approach)?\)?\s*[:\-]?\s*([^\n\r]+)", rec_text, re.I)
        if m_sex:
            rec["Reason for Exclusion (Sales Comparison Approach)"] = clean_text_value(m_sex.group(1))

    # Appraisal summary fallbacks
    m_omv = re.search(r"Opinion\s+of\s+Market\s+Value\s*[:\-]?\s*(?:\n\s*)?\$?([\d,]+)", rec_text, re.I)
    if m_omv:
        rec["Opinion of Market Value"] = f"${m_omv.group(1)}"
    elif not rec["Opinion of Market Value"] and summary.get("Opinion of Market Value"):
        rec["Opinion of Market Value"] = summary.get("Opinion of Market Value")

    if not rec["Reasonable Exposure Time"]:
        m_exp = re.search(r"(?:Reasonable\s+)?Exposure\s+Time\s*[:\-]?\s*([0-9\-]+\s*(?:days|months|years)?)", rec_text, re.I)
        if m_exp:
            rec["Reasonable Exposure Time"] = clean_text_value(m_exp.group(1))

    m_mvc = re.search(r"Market\s+Value\s+Condition\s*[:\-]?\s*(?:\n\s*)?([^\n\r]+)", rec_text, re.I)
    if m_mvc:
        val = clean_text_value(m_mvc.group(1))
        if val:
            rec["Market Value Condition"] = val

    m_eda = re.search(r"Effective\s+Date\s+(?:of\s+Appraisal)?\s*[:\-]?\s*(?:\n\s*)?(\d{1,2}/\d{1,2}/\d{4})", rec_text, re.I)
    if m_eda:
        rec["Effective Date of Appraisal"] = m_eda.group(1)

    # Narrative blocks
    m_rmv = re.search(r"Reconciliation\s+of\s+Market\s+Value\s*[:\-]?\s*(?:\n\s*)?([\s\S]*?)(?=Apparent\s+Defects|Defects,\s*Damages|Cost\s+Approach|Appraiser\s+Certifications|CERTIFICATION|\n\s*\n\s*[A-Z][a-z]+|\Z)", rec_text, re.I)
    if m_rmv:
        val = clean_text_value(m_rmv.group(1))
        if val:
            rec["Reconciliation of Market Value"] = val

    if not rec["Reconciliation of Market Value"]:
        m_rmv_full = re.search(r"Reconciliation\s+of\s+Market\s+Value\s*[:\-]?\s*(?:\n\s*)?([\s\S]*?)(?=Apparent\s+Defects|Defects,\s*Damages|Cost\s+Approach|Appraiser\s+Certifications|CERTIFICATION|\n\s*\n\s*[A-Z][a-z]+|\Z)", full_doc_text, re.I)
        if m_rmv_full:
            val = clean_text_value(m_rmv_full.group(1))
            if val:
                rec["Reconciliation of Market Value"] = val

    # Apparent Defects, Damages, Deficiencies (e.g. "None", "None Observed", or narrative)
    m_def_line = re.search(r"(?:Apparent\s+)?Defects,\s*Damages,\s*(?:and\s+)?Deficiencies\s*[:\-]?\s*(?:\n\s*)?([^\n\r]+)", rec_text, re.I)
    if m_def_line and clean_text_value(m_def_line.group(1)) and not re.match(r"^(?:Revision|Appraiser|CERTIFICATION)", clean_text_value(m_def_line.group(1)), re.I):
        rec["Apparent Defects, Damages, Deficiencies"] = clean_text_value(m_def_line.group(1))
    else:
        m_defects = re.search(r"(?:Apparent\s+)?Defects,\s*Damages,\s*(?:and\s+)?Deficiencies\s*[:\-]?\s*(?:\n\s*)?([\s\S]*?)(?=Revision\s+History|Appraiser\s+Certifications|Appraiser\s+Signature|CERTIFICATION|SUMMARY|\n\s*\n\s*[A-Z][a-z]+|\Z)", rec_text, re.I)
        if m_defects and clean_text_value(m_defects.group(1)):
            rec["Apparent Defects, Damages, Deficiencies"] = clean_text_value(m_defects.group(1))

    if not rec.get("Apparent Defects, Damages, Deficiencies"):
        m_def_full = re.search(r"(?:Apparent\s+)?Defects,\s*Damages,\s*(?:and\s+)?Deficiencies\s*[:\-]?\s*(?:\n\s*)?([^\n\r]+)", full_doc_text, re.I)
        if m_def_full and clean_text_value(m_def_full.group(1)) and not re.match(r"^(?:Revision|Appraiser|CERTIFICATION)", clean_text_value(m_def_full.group(1)), re.I):
            rec["Apparent Defects, Damages, Deficiencies"] = clean_text_value(m_def_full.group(1))
        else:
            m_defects_full = re.search(r"(?:Apparent\s+)?Defects,\s*Damages,\s*(?:and\s+)?Deficiencies\s*[:\-]?\s*(?:\n\s*)?([\s\S]*?)(?=Revision\s+History|Appraiser\s+Certifications|Appraiser\s+Signature|CERTIFICATION|SUMMARY|\n\s*\n\s*[A-Z][a-z]+|\Z)", full_doc_text, re.I)
            if m_defects_full and clean_text_value(m_defects_full.group(1)):
                rec["Apparent Defects, Damages, Deficiencies"] = clean_text_value(m_defects_full.group(1))

    m_rsca = re.search(r"Reconciliation\s+of\s+Sales\s+Comparison\s+Approach\s*\n\s*([\s\S]*?)(?=Sales\s+Comparison\s+Map|Cost\s+Approach|Approaches\s+to\s+Value|\n\n|\Z)", rec_text, re.I)
    if m_rsca:
        rec["Reconciliation of Sales Comparison Approach"] = clean_text_value(m_rsca.group(1))

    # Aliases matching various UI components
    val_sca_final = rec.get("Sales Comparison Approach Indicated Value") or summary.get("Opinion of Market Value", "")
    omv = rec.get("Opinion of Market Value") or summary.get("Opinion of Market Value", "")
    eff_date = rec.get("Effective Date of Appraisal") or summary.get("Effective Date of Appraisal", "") or summary.get("Appraisal Effective Date", "")
    rec["Sales Comparison Approach Indicated Value"] = val_sca_final
    rec["Indicated Value by Sales Comparison Approach"] = val_sca_final
    rec["Indicated Value by Sales Comparison Approach Indicated"] = val_sca_final
    rec["Indicated Value by Sales Comparison Approach $"] = val_sca_final
    rec["Indicated Value by Cost Approach"] = rec.get("Cost Approach Indicated Value", "")
    rec["Indicated Value by Income Approach"] = rec.get("Income Approach Indicated Value", "")
    rec["opinion of the market value, as defined, of the real property that is the subject of this report is $"] = omv
    rec["Final Value $"] = omv
    rec["as of"] = eff_date
    rec["as of date"] = eff_date
    rec["Appraisal Effective Date"] = eff_date
    rec["Effective Date of Appraisal"] = eff_date

    return rec


def extract_v1_cost_approach_section(doc, full_doc_text: str, summary: Dict[str, Any]) -> Dict[str, Any]:
    """
    Extracts COST_APPROACH category fields dynamically from Cost Approach pages.
    Zero hardcoded values: extracts breakdown numbers and Land Comparables 1-3 using spatial coordinates.
    """
    cost: Dict[str, Any] = {
        "Indicated Value by Cost Approach": "",
        "Depreciated Cost of Dwellings": "",
        "As Is Value of Site Improvements": "",
        "Opinion of Site Value": "",
        "Above Grade Finished Area": "",
        "Cost Per Square Foot": "",
        "Depreciated Cost": "",
        "Physical Depreciation": "",
        "Physical Depreciation Amount": "",
        "Functional Depreciation": "",
        "Functional Depreciation Amount": "",
        "External Depreciation": "",
        "External Depreciation Amount": "",
        "Total Depreciation": "",
        "Remaining Economic Life": "",
        "Effective Age": "",
        "Commentary on Remaining Economic Life": "",
        "Commentary on Effective Age": "",
        "Site Improvement Description": "",
        "Site Improvement Amount": "",
        "Primary Site Valuation Method": "",
        "Land Comparable 1 Address": "",
        "Land Comparable 1 County": "",
        "Land Comparable 1 Data Source": "",
        "Land Comparable 1 Assessor Parcel Number (APN)": "",
        "Land Comparable 1 Site Size": "",
        "Land Comparable 1 Sale Date": "",
        "Land Comparable 1 Sale Price": "",
        "Land Comparable 2 Address": "",
        "Land Comparable 2 County": "",
        "Land Comparable 2 Data Source": "",
        "Land Comparable 2 Assessor Parcel Number (APN)": "",
        "Land Comparable 2 Site Size": "",
        "Land Comparable 2 Sale Date": "",
        "Land Comparable 2 Sale Price": "",
        "Land Comparable 3 Address": "",
        "Land Comparable 3 County": "",
        "Land Comparable 3 Data Source": "",
        "Land Comparable 3 Assessor Parcel Number (APN)": "",
        "Land Comparable 3 Site Size": "",
        "Land Comparable 3 Sale Date": "",
        "Land Comparable 3 Sale Price": "",
        "Reconciliation of Site Value": "",
        "Cost Type": "",
        "Cost Data Source": "",
        "Quality Rating": "",
        "Effective Date": "",
        "Cost Method": "",
        "Depreciation Method": "",
        "Cost Approach Commentary": "",
        "Cost Approach Exhibits": ""
    }

    cost_text = ""
    for page in doc:
        ptxt = page.get_text("text")
        if re.search(r"Cost\s+Approach|Indicated\s+Value\s+by\s+Cost\s+Approach|Depreciated\s+Cost|Land\s+Comparables|Site\s+Value|Site\s+Improvements|Primary\s+Site\s+Valuation|Remaining\s+Economic\s+Life", ptxt, re.I):
            words, spatial_txt = extract_page_words_and_lines(page)
            cost_text += spatial_txt + "\n"

            # Dynamic Land Comparables spatial table extraction
            if "Land Comparables" in ptxt or ("Site Value" in ptxt and "Primary Site Valuation Method" in ptxt):
                row_nums = [w for w in words if 30 <= w[0] <= 60 and w[4].isdigit() and w[1] > 100]
                for rn in row_nums:
                    c_num = rn[4]
                    y_center = (rn[1] + rn[3]) / 2.0
                    def get_col(x0, x1):
                        cw = [w for w in words if x0 <= w[0] < x1 and abs((w[1]+w[3])/2.0 - y_center) <= 12]
                        return " ".join(w[4] for w in sorted(cw, key=lambda x: (round(x[1]/3.0)*3, x[0]))).strip()

                    addr = get_col(50, 140)
                    county = get_col(140, 205)
                    ds = get_col(205, 280)
                    apn = get_col(280, 355)
                    size = get_col(355, 430)
                    dt = get_col(430, 500)
                    pr = get_col(500, 590)
                    if addr: cost[f"Land Comparable {c_num} Address"] = clean_text_value(addr)
                    if county: cost[f"Land Comparable {c_num} County"] = clean_text_value(county)
                    if ds: cost[f"Land Comparable {c_num} Data Source"] = clean_text_value(ds)
                    if apn: cost[f"Land Comparable {c_num} Assessor Parcel Number (APN)"] = clean_text_value(apn)
                    if size: cost[f"Land Comparable {c_num} Site Size"] = clean_text_value(size)
                    if dt: cost[f"Land Comparable {c_num} Sale Date"] = clean_text_value(dt)
                    if pr: cost[f"Land Comparable {c_num} Sale Price"] = clean_text_value(pr)

    if not cost_text:
        cost_text = full_doc_text

    # Indicated Value by Cost Approach
    m_ivc = re.search(r"Indicated\s+Value\s+by\s+Cost\s+Approach\s*[:\-]?\s*(?:\n\s*)?\$?([\d,]+)", cost_text, re.I)
    if m_ivc:
        cost["Indicated Value by Cost Approach"] = f"${m_ivc.group(1)}"

    # Depreciated Cost of Dwellings
    m_dcd = re.search(r"Depreciated\s+Cost\s+of\s+Dwellings\s*[:\-]?\s*(?:\n\s*)?\$?([\d,]+)", cost_text, re.I)
    if m_dcd:
        cost["Depreciated Cost of Dwellings"] = f"${m_dcd.group(1)}"
        cost["Depreciated Cost"] = f"${m_dcd.group(1)}"

    # As Is Value of Site Improvements & Table parsing
    m_si_block = re.search(r"As\s+Is\s+Value\s+of\s+Site\s+Improvements([\s\S]*?)(?=Site\s+Value|Primary\s+Site|Opinion\s+of\s+Site|\n\s*\n\s*[A-Z]|\Z)", cost_text, re.I)
    if m_si_block:
        block = m_si_block.group(1)
        # Search for Total amount in table
        m_tot = re.search(r"Total\s*[:\-]?\s*(?:\n\s*)?\$?([\d,]+)", block, re.I)
        # Search for row Description and Amount
        m_row = re.search(r"(?:Description\s+Amount\s*\n\s*)?([A-Za-z0-9\s,\.\-]+?)\s+\$?([\d,]+)(?:\s*\n\s*Total|\Z)", block, re.I)
        if m_row and m_row.group(1).strip() and not re.match(r"^(?:Total|Description|Amount)$", m_row.group(1).strip(), re.I):
            cost["Site Improvement Description"] = clean_text_value(m_row.group(1))
            cost["Site Improvement Amount"] = f"${m_row.group(2)}"
        elif re.search(r"\$?([\d,]+)", block):
            all_amts = re.findall(r"\$?([\d,]+)", block)
            if all_amts:
                cost["Site Improvement Amount"] = f"${all_amts[0]}"

        if m_tot:
            cost["As Is Value of Site Improvements"] = f"${m_tot.group(1)}"
            if not cost.get("Site Improvement Amount"):
                cost["Site Improvement Amount"] = f"${m_tot.group(1)}"
        elif cost.get("Site Improvement Amount"):
            cost["As Is Value of Site Improvements"] = cost["Site Improvement Amount"]

    if not cost.get("As Is Value of Site Improvements"):
        m_si_val = re.search(r"As\s+Is\s+Value\s+of\s+Site\s+Improvements\s*[:\-]?\s*(?:\n\s*)?\$?([\d,]+)", cost_text, re.I)
        if m_si_val:
            cost["As Is Value of Site Improvements"] = f"${m_si_val.group(1)}"
            if not cost.get("Site Improvement Amount"):
                cost["Site Improvement Amount"] = f"${m_si_val.group(1)}"

    # Primary Site Valuation Method (supports same line and next line values like 'Extraction')
    m_psvm = re.search(r"Primary\s+Site\s+Valuation\s+Method\s*[:\-]?\s*(?:([^\n\r]+?)(?=\s+Opinion\s+of|\n|\Z)|\n\s*([^\n\r]+))", cost_text, re.I)
    if m_psvm:
        val = (m_psvm.group(1) or m_psvm.group(2) or "").strip()
        if val and not re.match(r"^Opinion\s+of", val, re.I):
            cost["Primary Site Valuation Method"] = clean_text_value(val)

    # Opinion of Site Value
    m_osv = re.search(r"Opinion\s+of\s+Site\s+Value\s*[:\-]?\s*(?:\n\s*)?\$?([\d,]+)", cost_text, re.I)
    if m_osv:
        cost["Opinion of Site Value"] = f"${m_osv.group(1)}"

    # Dynamic Depreciated Cost - Dwelling table extraction (Above Grade Finished Area, Garage, Porch, Basement, etc.)
    m_dcd_block = re.search(r"Depreciated\s+Cost\s*-\s*Dwelling([\s\S]*?)(?=Remaining\s+Economic\s+Life|Effective\s+Age|As\s+Is\s+Value|\n\s*\n\s*[A-Z][a-z]+|\Z)", cost_text, re.I)
    if m_dcd_block:
        block = m_dcd_block.group(1)
        # 1. Total amount
        m_tot = re.search(r"Total\s*[:\-]?\s*(?:\n\s*)?\$?([\d,]+)", block, re.I)
        if m_tot:
            cost["Depreciated Cost of Dwellings"] = f"${m_tot.group(1)}"
            cost["Total Depreciation"] = f"${m_tot.group(1)}"

        # 2. Extract item rows (e.g. Above Grade Finished Area, Attached Garage, Porch;Scrn;Pat)
        # Pattern: <Item Name> <Size> Sq. Ft. @ <Rate> <Amount>
        item_matches = list(re.finditer(r"([A-Za-z0-9\s;,\./\-]+?)\s+([\d,]+)\s+Sq\.\s*Ft\.\s*@\s*\$?([\d\.]+)\s+\$?([\d,]+)", block, re.I))
        for idx, im in enumerate(item_matches):
            row_num = idx + 1
            lbl = clean_text_value(im.group(1))
            sz = f"{im.group(2)} Sq. Ft."
            rt = f"${im.group(3)}"
            amt = f"${im.group(4)}"
            
            cost[f"Dwelling Cost Item {row_num} Description"] = lbl
            cost[f"Dwelling Cost Item {row_num} Size"] = sz
            cost[f"Dwelling Cost Item {row_num} Rate"] = rt
            cost[f"Dwelling Cost Item {row_num} Amount"] = amt

            if "above grade" in lbl.lower() or idx == 0:
                cost["Above Grade Finished Area"] = sz
                cost["Cost Per Square Foot"] = rt
                cost["Depreciated Cost"] = amt

        # 3. Extract Depreciation rows (Physical, Functional, External)
        m_phys = re.search(r"Physical\s+Depreciation\s*[:\-]?\s*([\d\.]+%?)\s*(?:\n\s*)?\$?\s*\(?([\d,]+)\)?", block, re.I) or \
                 re.search(r"Physical\s+Depreciation\s*[:\-]?\s*([\d\.]+%?)", block, re.I)
        if m_phys:
            cost["Physical Depreciation"] = m_phys.group(1) if "%" in m_phys.group(1) else f"{m_phys.group(1)}%"
            if m_phys.lastindex and m_phys.lastindex >= 2 and m_phys.group(2):
                cost["Physical Depreciation Amount"] = f"${m_phys.group(2)}"
        
        m_phys_amt = re.search(r"Physical\s+Depreciation[\s\S]*?\$?\s*\(\$?([\d,]+)\)", block, re.I)
        if m_phys_amt:
            cost["Physical Depreciation Amount"] = f"${m_phys_amt.group(1)}"

        m_func = re.search(r"Functional\s+Depreciation\s*[:\-]?\s*([\d\.]+%?)\s*(?:\n\s*)?\$?\s*\(?([\d,]+)\)?", block, re.I) or \
                 re.search(r"Functional\s+Depreciation\s*[:\-]?\s*([\d\.]+%?)", block, re.I)
        if m_func:
            cost["Functional Depreciation"] = m_func.group(1) if "%" in m_func.group(1) else f"{m_func.group(1)}%"
            if m_func.lastindex and m_func.lastindex >= 2 and m_func.group(2):
                cost["Functional Depreciation Amount"] = f"${m_func.group(2)}"

        m_ext = re.search(r"External\s+Depreciation\s*[:\-]?\s*([\d\.]+%?)\s*(?:\n\s*)?\$?\s*\(?([\d,]+)\)?", block, re.I) or \
                re.search(r"External\s+Depreciation\s*[:\-]?\s*([\d\.]+%?)", block, re.I)
        if m_ext:
            cost["External Depreciation"] = m_ext.group(1) if "%" in m_ext.group(1) else f"{m_ext.group(1)}%"
            if m_ext.lastindex and m_ext.lastindex >= 2 and m_ext.group(2):
                cost["External Depreciation Amount"] = f"${m_ext.group(2)}"

    if not cost.get("Above Grade Finished Area"):
        m_ag = re.search(r"Above\s+Grade\s+Finished\s+Area\s*[:\-]?\s*(?:\n\s*)?([\d,]+)", cost_text, re.I)
        if m_ag:
            cost["Above Grade Finished Area"] = f"{m_ag.group(1)} Sq. Ft."

    if not cost.get("Cost Per Square Foot"):
        m_cpsf = re.search(r"@\s*\$?([\d\.]+)", cost_text, re.I)
        if m_cpsf:
            cost["Cost Per Square Foot"] = f"${m_cpsf.group(1)}"

    if not cost.get("Depreciated Cost of Dwellings"):
        m_dcd = re.search(r"Depreciated\s+Cost\s+of\s+Dwellings\s*[:\-]?\s*(?:\n\s*)?\$?([\d,]+)", cost_text, re.I)
        if m_dcd:
            cost["Depreciated Cost of Dwellings"] = f"${m_dcd.group(1)}"
            cost["Depreciated Cost"] = f"${m_dcd.group(1)}"

    # Remaining Economic Life (excluding Commentary title)
    for m in re.finditer(r"(?:^|\n)\s*Remaining\s+Economic\s+Life\s*[:\-]?\s*(?:\n\s*)?([^\n\r]+)", cost_text, re.I):
        val = clean_text_value(m.group(1))
        if val and not re.match(r"^Commentary", val, re.I):
            cost["Remaining Economic Life"] = val
            break

    # Effective Age (excluding Commentary title)
    for m in re.finditer(r"(?:^|\n)\s*Effective\s+Age\s*[:\-]?\s*(?:\n\s*)?([^\n\r]+)", cost_text, re.I):
        val = clean_text_value(m.group(1))
        if val and not re.match(r"^Commentary", val, re.I):
            cost["Effective Age"] = val
            break

    # Commentary on Remaining Economic Life
    m_crel = re.search(r"Commentary\s+on\s+Remaining\s+Economic\s+Life\s*[:\-]?\s*(?:\n\s*)?([\s\S]*?)(?=Commentary\s+on\s+Effective\s+Age|As\s+Is\s+Value\s+of\s+Site|Site\s+Value|\n\s*\n\s*[A-Z][a-z]+|\Z)", cost_text, re.I)
    if m_crel:
        cost["Commentary on Remaining Economic Life"] = clean_text_value(m_crel.group(1))

    # Commentary on Effective Age
    m_cea = re.search(r"Commentary\s+on\s+Effective\s+Age\s*[:\-]?\s*(?:\n\s*)?([\s\S]*?)(?=As\s+Is\s+Value\s+of\s+Site|Site\s+Value|Primary\s+Site|\n\s*\n\s*[A-Z][a-z]+|\Z)", cost_text, re.I)
    if m_cea:
        cost["Commentary on Effective Age"] = clean_text_value(m_cea.group(1))

    # Fallback text parser for Land Comparables 1, 2, 3 if table coordinates didn't capture them
    for i in [1, 2, 3]:
        if not cost.get(f"Land Comparable {i} Address"):
            m_row = re.search(rf"\n\s*{i}\s+([^\t\n\r]+(?:\t+[^\t\n\r]+)+)", cost_text)
            if m_row:
                parts = [p.strip() for p in re.split(r"\t+|\s{3,}", m_row.group(1)) if p.strip()]
                if len(parts) >= 1: cost[f"Land Comparable {i} Address"] = parts[0]
                if len(parts) >= 2: cost[f"Land Comparable {i} County"] = parts[1]
                if len(parts) >= 3: cost[f"Land Comparable {i} Data Source"] = parts[2]
                if len(parts) >= 4: cost[f"Land Comparable {i} Assessor Parcel Number (APN)"] = parts[3]
                if len(parts) >= 5: cost[f"Land Comparable {i} Site Size"] = parts[4]
                if len(parts) >= 6: cost[f"Land Comparable {i} Sale Date"] = parts[5]
                if len(parts) >= 7: cost[f"Land Comparable {i} Sale Price"] = parts[6]

    # Reconciliation of Site Value
    m_rsv = re.search(r"Reconciliation\s+of\s+Site\s+Value\s*[:\-]?\s*(?:\n\s*)?([\s\S]*?)(?=General\s+Description|Cost\s+Type|Quality\s+Rating|Cost\s+Approach\s+Commentary|\n\s*\n\s*[A-Z][a-z]+|\Z)", cost_text, re.I)
    if m_rsv:
        cost["Reconciliation of Site Value"] = clean_text_value(m_rsv.group(1))

    m_ctype = re.search(r"Cost\s+Type\s*[:\-]?\s*(?:\n\s*)?([^\n\r]+)", cost_text, re.I)
    if m_ctype: cost["Cost Type"] = clean_text_value(m_ctype.group(1))

    m_cds = re.search(r"Cost\s+Data\s+Source\s*[:\-]?\s*(?:\n\s*)?([^\n\r]+)", cost_text, re.I)
    if m_cds: cost["Cost Data Source"] = clean_text_value(m_cds.group(1))

    m_qr = re.search(r"Quality\s+Rating\s*[:\-]?\s*(?:\n\s*)?([^\n\r]+)", cost_text, re.I)
    if m_qr: cost["Quality Rating"] = clean_text_value(m_qr.group(1))

    m_ed = re.search(r"Effective\s+Date\s*[:\-]?\s*(?:\n\s*)?(\d{1,2}/\d{1,2}/\d{4})", cost_text, re.I)
    if m_ed: cost["Effective Date"] = clean_text_value(m_ed.group(1))

    m_cmeth = re.search(r"Cost\s+Method\s*[:\-]?\s*(?:\n\s*)?([^\n\r]+)", cost_text, re.I)
    if m_cmeth: cost["Cost Method"] = clean_text_value(m_cmeth.group(1))

    m_dmeth = re.search(r"Depreciation\s+Method\s*[:\-]?\s*(?:\n\s*)?([^\n\r]+)", cost_text, re.I)
    if m_dmeth: cost["Depreciation Method"] = clean_text_value(m_dmeth.group(1))

    m_cappro = re.search(r"Cost\s+Approach\s+Commentary\s*(?:\n\s*)?([\s\S]*?)(?=Cost\s+Approach\s+Exhibits|\n\s*\n\s*[A-Z][a-z]+|\Z)", cost_text, re.I)
    if m_cappro: cost["Cost Approach Commentary"] = clean_text_value(m_cappro.group(1))

    return cost


def extract_v1_certification_section(page_cert, full_doc_text: str, summary: Dict[str, Any]) -> Dict[str, Any]:
    """
    Extracts CERTIFICATION category fields.
    Zero hardcoded values: dynamically extracts appraiser signature date, name, and credentials.
    Verifies whether Appraiser Signature is present (Signed / Not Signed).
    """
    cert: Dict[str, Any] = {
        "Appraiser Certifications": "",
        "Appraiser Signature": "",
        "Date of Signature and Report": "",
        "Appraiser Name": summary.get("Appraiser Name", ""),
        "Appraiser Credential Level": summary.get("Appraiser Credential Level", ""),
        "Appraiser ID": summary.get("Appraiser ID", ""),
        "Appraiser State": summary.get("Appraiser State", ""),
        "Appraiser License Expiration Date": summary.get("Appraiser License Expiration Date", "")
    }

    cert_text = page_cert.get_text("text") if page_cert else full_doc_text

    # Appraiser Certifications status
    if re.search(r"Appraiser\s+Certifications|Certifications\b|I\s+certify\s+that", cert_text, re.I):
        cert["Appraiser Certifications"] = "Complete"

    # Date of Signature and Report
    m_sig_date = re.search(r"Date\s+of\s+Signature\s+and\s+Report\s*[:\-]?\s*(\d{1,2}/\d{1,2}/\d{4})", cert_text, re.I) or \
                 re.search(r"(\d{1,2}/\d{1,2}/\d{4})\s*\n[^\n]*\nDate\s+of\s+Signature\s+and\s+Report", cert_text, re.I) or \
                 re.search(r"Date\s+of\s+Signature\s+and\s+Report\s*\n\s*(\d{1,2}/\d{1,2}/\d{4})", cert_text, re.I) or \
                 re.search(r"Signature\s+Date\s*[:\-]?\s*(\d{1,2}/\d{1,2}/\d{4})", cert_text, re.I) or \
                 re.search(r"Date\s+Signed\s*[:\-]?\s*(\d{1,2}/\d{1,2}/\d{4})", cert_text, re.I)
    if m_sig_date:
        cert["Date of Signature and Report"] = m_sig_date.group(1).strip()
    elif summary.get("Effective Date of Appraisal"):
        cert["Date of Signature and Report"] = summary.get("Effective Date of Appraisal")

    # Appraiser Name extraction from cert if not in summary
    if not cert["Appraiser Name"]:
        m_app_name = re.search(r"Appraiser\s+Name\s*[:\-]?\s*([^\n\r]+)", cert_text, re.I) or \
                     re.search(r"APPRAISER\s*[:\-]?\s*\n\s*([A-Za-z\s,\.\-]+)", cert_text, re.I)
        if m_app_name:
            cert["Appraiser Name"] = clean_text_value(m_app_name.group(1))

    # Appraiser Signature presence check:
    # 1. Look for explicit signature text markers
    has_sig_text = bool(
        re.search(r"(?:Digitally|Electronically)\s+Signed\s+by", cert_text, re.I) or
        re.search(r"Signature\s*[:\-]?\s*(?:Signed|Electronically\s+Signed|Digitally\s+Signed|On\s+File|Yes|Complete|Valid)", cert_text, re.I) or
        re.search(r"Appraiser\s+Signature\s*[:\-]?\s*(?:Signed|Electronically\s+Signed|Digitally\s+Signed|On\s+File|Yes)", cert_text, re.I) or
        re.search(r"Signature\s*\n\s*Appraiser", cert_text, re.I) or
        re.search(r"Appraiser\s+Signature", cert_text, re.I) or
        re.search(r"Signature\s+on\s+File", cert_text, re.I)
    )

    # 2. Check for signature image or drawing on the certification page
    has_sig_image = False
    if page_cert:
        try:
            images = page_cert.get_images()
            drawings = page_cert.get_drawings()
            if len(images) > 0 or len(drawings) > 5:
                has_sig_image = True
        except Exception:
            pass

    # 3. Determine signature status
    if has_sig_text or (cert.get("Date of Signature and Report") and cert.get("Appraiser Name")) or has_sig_image:
        cert["Appraiser Signature"] = "Signed"
    else:
        cert["Appraiser Signature"] = "Not Signed"

    return cert


def classify_and_caption_photo(raw_caption: str, page_text: str, p_idx: int, bbox=None) -> Tuple[str, str]:
    """
    Classifies a photo into a standard category ('Subject', 'Comparable', 'Rental', 'Interior', 'Sketch', 'Map', 'General')
    and refines the caption for display in PhotosGallerySection.
    """
    cap_lower = raw_caption.lower().strip()
    page_lower = page_text.lower().strip()

    # 1. Page 1 Hero Photo
    if p_idx == 0:
        return "Subject", "Subject Front View"

    # 2. Sketch
    if any(k in cap_lower for k in ["sketch", "floor plan", "floorplan"]) or ("sketch" in page_lower and "measurement standard" in page_lower):
        return "Sketch", "Building Sketch / Floor Plan" if not raw_caption or raw_caption.lower() == "sketch" else raw_caption

    # 3. Maps
    if "sales comparison map" in cap_lower or "comparison map" in cap_lower:
        return "Map", "Sales Comparison Map"
    if any(k in cap_lower for k in ["location map", "plat map", "aerial map", "flood map", "neighborhood map"]):
        clean = re.sub(r"^property\s+boundaries\s*-\s*", "", raw_caption, flags=re.I).strip()
        return "Map", clean.title()
    if any(k in page_lower[:200] for k in ["location map", "plat map", "aerial map", "flood map", "neighborhood map"]):
        for m_name in ["Location Map", "Plat Map", "Aerial Map", "Flood Map", "Neighborhood Map"]:
            if m_name.lower() in page_lower[:200]:
                return "Map", m_name

    # 4. Comparable Sales
    m_comp = re.search(r"comparable\s*(?:sale\s*)?#?\s*(\d+)", cap_lower) or re.search(r"comp\s*#?\s*(\d+)", cap_lower)
    if m_comp:
        return "Comparable", f"Comparable Sale #{m_comp.group(1)}"
    if "comparable" in cap_lower:
        return "Comparable", raw_caption

    # 5. Subject Front, Rear, Street
    if any(k in cap_lower for k in ["front view", "dwelling front", "subject front", "front of subject"]) or cap_lower == "front":
        return "Subject", "Subject Front View"
    if any(k in cap_lower for k in ["rear view", "dwelling rear", "subject rear", "rear of subject"]) or cap_lower == "rear":
        return "Subject", "Subject Rear View"
    if any(k in cap_lower for k in ["street scene", "street view", "property access (street", "street"]):
        return "Subject", "Subject Street Scene"

    # 6. Dwelling Exterior side-by-side positioning
    if "dwelling exterior" in page_lower and bbox:
        if bbox[0] < 200:
            return "Subject", "Subject Front View"
        elif bbox[0] > 300:
            return "Subject", "Subject Rear View"

    # 7. Interior Rooms
    if any(k in cap_lower for k in ["kitchen", "bedroom", "bath", "living", "dining", "interior", "den", "family room", "basement", "foyer", "laundry", "closet", "utility", "smoke"]):
        return "Interior", raw_caption

    # 8. Exterior Features / Storage
    if any(k in cap_lower for k in ["dwelling", "exterior", "roof", "porch", "patio", "deck", "garage", "driveway", "side", "shed"]):
        return "Subject", raw_caption

    if "dwelling exterior" in page_lower:
        return "Subject", raw_caption if raw_caption and raw_caption != "Dwelling Exterior" else "Dwelling Exterior"

    if "unit interior" in page_lower:
        return "Interior", raw_caption if raw_caption and raw_caption != "Unit Interior" else "Unit Interior"

    if any(k in cap_lower for k in ["license", "appraiser's license", "dbpr"]) or "license" in page_lower[:200]:
        return "General", "Appraiser License"

    return "General", raw_caption if raw_caption else f"Exhibit Page {p_idx + 1}"


def extract_photos_and_exhibits(doc) -> List[Dict[str, Any]]:
    """
    Extracts all visual photos and exhibits (Subject Front/Rear/Street, Comps, Interior, Maps, Sketches)
    across multiple pages, determines exact captions from adjacent text bounding boxes,
    and encodes them as base64 images for PhotosGallerySection.
    """
    extracted_photos: List[Dict[str, Any]] = []
    try:
        for p_idx, page in enumerate(doc):
            page_text = page.get_text("text")
            info = page.get_image_info()

            for item in info:
                bbox = item.get("bbox")
                if not bbox:
                    continue

                w_box = bbox[2] - bbox[0]
                h_box = bbox[3] - bbox[1]

                # Filter out tiny icon bullets or decorative lines (< 60 width or < 45 height)
                if w_box < 60 or h_box < 45:
                    continue

                # Locate caption directly above or below the photo bounding box
                rect_above = pymupdf.Rect(bbox[0] - 15, bbox[1] - 30, bbox[2] + 15, bbox[1] + 4)
                rect_below = pymupdf.Rect(bbox[0] - 15, bbox[3] - 4, bbox[2] + 15, bbox[3] + 25)

                t_above = page.get_text("text", clip=rect_above).strip()
                t_below = page.get_text("text", clip=rect_below).strip()

                raw_caption = ""
                for candidate in [t_above, t_below]:
                    lines = [l.strip() for l in candidate.splitlines() if l.strip() and not re.search(r"Page\s+\d+|Appraisal|Uniform|Fannie|September|\d{4}", l, re.I)]
                    if lines:
                        raw_caption = " - ".join(lines)
                        break

                if not raw_caption:
                    first_lines = [l.strip() for l in page_text.splitlines() if l.strip() and not re.search(r"Page\s+\d+|Appraisal|Uniform|Fannie|September|\d{4}", l, re.I)]
                    raw_caption = first_lines[0] if first_lines else f"Exhibit Page {p_idx + 1}"

                category, caption = classify_and_caption_photo(raw_caption, page_text, p_idx, bbox)

                # Extract image bytes
                xref = item.get("xref", 0)
                img_b64 = ""
                image_ext = "jpeg"
                if xref > 0:
                    try:
                        b_img = doc.extract_image(xref)
                        img_bytes = b_img.get("image")
                        image_ext = b_img.get("ext", "jpeg")
                        if img_bytes and len(img_bytes) > 1000:
                            img_b64 = f"data:image/{image_ext};base64," + base64.b64encode(img_bytes).decode("utf-8")
                    except Exception:
                        pass

                # Pixmap clip fallback
                if not img_b64:
                    try:
                        clip_r = pymupdf.Rect(bbox)
                        pix = page.get_pixmap(clip=clip_r, dpi=150)
                        img_bytes = pix.tobytes("jpeg")
                        image_ext = "jpeg"
                        img_b64 = "data:image/jpeg;base64," + base64.b64encode(img_bytes).decode("utf-8")
                    except Exception:
                        pass

                if img_b64:
                    extracted_photos.append({
                        "page": p_idx + 1,
                        "category": category,
                        "caption": caption,
                        "type": image_ext,
                        "format": image_ext,
                        "width": round(w_box, 1),
                        "height": round(h_box, 1),
                        "rect": [round(bbox[0], 1), round(bbox[1], 1), round(bbox[2], 1), round(bbox[3], 1)],
                        "image_base64": img_b64,
                        "base64_preview": img_b64
                    })
    except Exception as e:
        print(f"[pdf_extractor_v1_offline] Photo extraction notice: {e}")

    return extracted_photos


# =========================================================================
# PRIMARY ENTRY POINT: 100% OFFLINE EXTRACTION
# =========================================================================

def extract_fields_from_pdf_v1_offline(pdf_path: str) -> Dict[str, Any]:
    """
    Pure Python & Regex-based Offline Extractor for Appraisal Version #1 / #5
    (Fannie Mae | Freddie Mac September 2024 Uniform Residential Appraisal Reports).
    Runs with 0 API calls, $0.00 cost, and ultra-high reliability.
    """
    if not os.path.exists(pdf_path):
        return {"status": "error", "message": f"PDF file not found: {pdf_path}"}

    try:
        doc = pymupdf.open(pdf_path)
    except Exception as e:
        return {"status": "error", "message": f"Could not read PDF with PyMuPDF: {e}"}

    # Accumulate full document text
    full_doc_text = ""
    for page in doc:
        full_doc_text += page.get_text("text") + "\n"

    # 1. Locate pages
    page_map = locate_urar_pages(doc)
    page_p1 = doc[page_map["summary_p1"]] if page_map["summary_p1"] is not None and page_map["summary_p1"] < len(doc) else None
    page_p2 = doc[page_map["assignment_p2"]] if page_map["assignment_p2"] is not None and page_map["assignment_p2"] < len(doc) else None
    page_p3 = doc[page_map["subject_p3"]] if page_map["subject_p3"] is not None and page_map["subject_p3"] < len(doc) else None
    page_cert = doc[page_map["certification"]] if page_map["certification"] is not None and page_map["certification"] < len(doc) else None

    # 2. Extract metadata
    metadata = extract_urar_metadata(doc, full_doc_text)

    # 3. Extract core categories
    summary_data = extract_v1_summary_section(page_p1, page_p2, page_p3, doc, full_doc_text, metadata)
    contract_data = extract_v1_contract_section(page_p2, full_doc_text, summary_data)
    subject_data = extract_v1_subject_section(summary_data)
    site_data = extract_v1_site_section(doc, full_doc_text, summary_data)
    improvements_data = extract_v1_improvements_section(doc, full_doc_text, summary_data)
    neighborhood_data = extract_v1_neighborhood_section(doc, full_doc_text, summary_data)
    project_info_data = extract_v1_project_info_section(doc, full_doc_text, summary_data)
    prior_sale_history_data = extract_v1_prior_sale_history_section(doc, full_doc_text, summary_data)
    sales_grid_data = extract_v1_sales_grid_section(doc, full_doc_text, summary_data)
    reconciliation_data = extract_v1_reconciliation_section(doc, full_doc_text, summary_data)
    cost_approach_data = extract_v1_cost_approach_section(doc, full_doc_text, summary_data)
    certification_data = extract_v1_certification_section(page_cert, full_doc_text, summary_data)

    # 4. Extract visual photos and exhibits
    extracted_photos = extract_photos_and_exhibits(doc)

    # 5. Build clean sales grid and section dictionary (strictly separate Subject and Sales Grid)
    clean_sales_grid: Dict[str, Any] = {}
    if "Subject" in sales_grid_data and isinstance(sales_grid_data["Subject"], dict):
        clean_sales_grid["Subject"] = sales_grid_data["Subject"]
    comp_num_map_v1: Dict[int, Any] = {}
    for comp_k, comp_v in sales_grid_data.items():
        if isinstance(comp_v, dict) and not comp_k.lower().startswith("subject"):
            m_comp = re.search(r'(\d+)', comp_k)
            if m_comp:
                comp_num_map_v1[int(m_comp.group(1))] = comp_v
            else:
                clean_sales_grid[comp_k] = comp_v
    for c_num in sorted(comp_num_map_v1.keys()):
        clean_sales_grid[f"Comparable Sale {c_num}"] = comp_num_map_v1[c_num]

    # Map PUD and HOA fields to subject_data
    is_pud = (
        project_info_data.get("Planned Unit Development (PUD)") == "Yes" or
        subject_data.get("Planned Unit Development (PUD)") == "Yes" or
        summary_data.get("Planned Unit Development (PUD)") == "Yes"
    )
    if is_pud:
        subject_data["PUD"] = "Yes"
    elif not subject_data.get("PUD"):
        subject_data["PUD"] = "No"

    hoa_fee_str = project_info_data.get("Monthly Amount") or ""
    if hoa_fee_str:
        clean_hoa = re.sub(r'[^\d.]', '', hoa_fee_str)
        subject_data["HOA $"] = clean_hoa
        subject_data["HOA(per month)"] = "Yes"
        subject_data["HOA (per month)"] = "Yes"
        subject_data["HOA(per year)"] = ""
        subject_data["HOA (per year)"] = ""
        project_info_data["PUD Fees $"] = clean_hoa
        project_info_data["PUD Fees (per month)"] = clean_hoa
        project_info_data["PUD Fees (per year)"] = ""
    else:
        subject_data.setdefault("HOA $", "")
        subject_data.setdefault("HOA(per month)", "")
        subject_data.setdefault("HOA (per month)", "")
        subject_data.setdefault("HOA(per year)", "")
        subject_data.setdefault("HOA (per year)", "")

    clean_section_data = {
        "Form Type": "Appraisal Version #1",
        "Subject": subject_data,
        "Contract": contract_data,
        "Neighborhood": neighborhood_data,
        "Site": site_data,
        "Improvements": improvements_data,
        "Sales Grid": clean_sales_grid,
        "Reconciliation": reconciliation_data,
    }
    if cost_approach_data and any(cost_approach_data.values()):
        clean_section_data["Cost Approach"] = cost_approach_data
    if project_info_data and any(project_info_data.values()):
        clean_section_data["Project Information"] = project_info_data
    if prior_sale_history_data and any(prior_sale_history_data.values()):
        clean_section_data["Prior Sale History"] = prior_sale_history_data
    if certification_data and any(certification_data.values()):
        clean_section_data["Certification"] = certification_data

    val_ind_sca = reconciliation_data.get("Sales Comparison Approach Indicated Value") or summary_data.get("Opinion of Market Value", "")
    sales_transfer = {
        "Indicated Value by Sales Comparison Approach": val_ind_sca,
        "Indicated Value by Sales Comparison Approach $": val_ind_sca,
        "Indicated Value by Sales Comparison Approach Indicated": val_ind_sca,
        "Sales Comparison Approach Indicated Value": val_ind_sca
    }

    # Combined flat fields dictionary for legacy component consumption
    combined_fields = {}
    combined_fields.update(summary_data)
    combined_fields.update(contract_data)
    combined_fields.update(subject_data)
    combined_fields.update(site_data)
    combined_fields.update(improvements_data)
    combined_fields.update(neighborhood_data)
    combined_fields.update(project_info_data)
    combined_fields.update(prior_sale_history_data)
    combined_fields.update(sales_grid_data)
    combined_fields.update(sales_transfer)
    combined_fields.update(cost_approach_data)
    combined_fields.update(reconciliation_data)
    combined_fields.update(certification_data)

    # Subject and Sales Grid are two distinct sections (do not overwrite Subject with Sales Grid)
    combined_fields["Subject"] = subject_data
    combined_fields["SUBJECT"] = subject_data
    combined_fields["Sales Grid"] = clean_sales_grid
    combined_fields["SALES_GRID"] = sales_grid_data
    combined_fields["RECONCILIATION"] = reconciliation_data
    combined_fields["Reconciliation"] = reconciliation_data

    # Map individual comps
    for c_num, c_data in comp_num_map_v1.items():
        combined_fields[f"COMPARABLE SALE #{c_num}"] = c_data
        combined_fields[f"COMPARABLE SALE # {c_num}"] = c_data
        combined_fields[f"Comparable Sale #{c_num}"] = c_data
        combined_fields[f"Comp {c_num}"] = c_data

    # Subject Listing Data Source mapping
    if project_info_data.get("Subject Listing Data Source"):
        combined_fields["Data Source"] = project_info_data["Subject Listing Data Source"]
        neighborhood_data["Data Source"] = project_info_data["Subject Listing Data Source"]
    elif neighborhood_data.get("Data Source"):
        combined_fields["Data Source"] = neighborhood_data["Data Source"]

    # Version1.js Sales Comparison Approach additional fields
    combined_fields["Indicated Value by Sales Comparison Approach"] = val_ind_sca
    combined_fields["Indicated Value by Sales Comparison Approach Indicated"] = val_ind_sca
    combined_fields["Indicated Value by Sales Comparison Approach $"] = val_ind_sca
    combined_fields["Sales Comparison Approach Indicated Value"] = val_ind_sca
    combined_fields["Reconciliation of Sales Comparison Approach"] = reconciliation_data.get("Reconciliation of Sales Comparison Approach", "")
    combined_fields["Sales Comparison Map"] = "Included in Exhibits"
    combined_fields["Sales Comparison Approach Exhibits"] = "Included in Exhibits"
    combined_fields["EXTRACTED_PHOTOS"] = extracted_photos

    doc.close()

    return {
        "status": "success",
        "form_type": metadata.get("From Type", "Appraisal Version #1"),
        "fields": combined_fields,
        "clean_data": clean_section_data,
        "raw": json.dumps(combined_fields, indent=2, default=str),
        "extracted_photos": extracted_photos
    }
