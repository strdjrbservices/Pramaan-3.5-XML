

import os
import re
import base64
import tempfile
import xml.etree.ElementTree as ET
from typing import Dict, Any, Optional, Tuple, List

try:
    import pymupdf as fitz
except ImportError:
    try:
        import fitz
    except ImportError:
        fitz = None

try:
    from api.eo_extractor import extract_eo_insurance_from_doc
except ImportError:
    try:
        from .eo_extractor import extract_eo_insurance_from_doc  # type: ignore
    except Exception:
        def extract_eo_insurance_from_doc(doc: Any) -> Dict[str, str]:  # type: ignore
            return {
                "E&O": "Absent",
                "E&O Present": "Absent",
                "E&O Insurance": "",
                "Policy Period From": "",
                "Policy Period To": "",
                "E&O Insured": "",
                "E&O Carrier": "",
                "E&O Limit": "",
                "E&O Deductible": "",
            }

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


def _format_date(val: Any) -> str:
    if val is None:
        return ""
    val_str = str(val).strip()
    if not val_str:
        return ""
    m = re.match(r"^(\d{4})-(\d{2})-(\d{2})$", val_str)
    if m:
        return f"{m.group(2)}/{m.group(3)}/{m.group(1)}"
    return val_str


def _extract_fha_case_number(root: ET.Element, report: Optional[ET.Element] = None, full_narrative: str = "") -> str:
    r"""
    Extracts the FHA Case Number from MISMO XML.
    FHA Case numbers follow standard HUD format: 3 digits, dash, 7 digits (e.g., '353-0891067').
    Checks:
    1. <REPORT> AppraiserAdditionalFileIdentifier and AppraiserAdditionalFileIdentifierName
    2. XML attributes mentioning FHA or matching \d{3}-\d{7}
    3. Narrative text / comments mentioning 'FHA Case' or matching \d{3}-\d{7}
    4. Base64 embedded PDF stream (if present)
    """
    if report is not None:
        add_id = report.attrib.get("AppraiserAdditionalFileIdentifier", "").strip()
        add_name = report.attrib.get("AppraiserAdditionalFileIdentifierName", "").strip()
        file_id = report.attrib.get("AppraiserFileIdentifier", "").strip()

        # Direct match: e.g. "353-0891067" (standard FHA 3 digits - 7 digits)
        m_fha = re.search(r'\b(\d{3}-\d{7})\b', add_id)
        if m_fha:
            return m_fha.group(1)

        if "fha" in add_name.lower():
            m = re.search(r'(\d{3}[-\s]?\d{7})', add_id)
            if m:
                return m.group(1).replace(" ", "-")

        m_fid = re.search(r'\b(\d{3}-\d{7})\b', file_id)
        if m_fid and any(term in (add_name + " " + full_narrative).lower() for term in ["fha", "hud"]):
            return m_fid.group(1)

    for elem in root.iter():
        for attr, val in elem.attrib.items():
            val_str = val.strip()
            if "fha" in attr.lower() or "case" in attr.lower():
                m = re.search(r'\b(\d{3}-\d{7})\b', val_str)
                if m:
                    return m.group(1)

    for elem in root.iter():
        if elem.tag.endswith("DOCUMENT"):
            continue
        txt = elem.text or ""
        if "fha" in txt.lower() or "hud" in txt.lower():
            m = re.search(r'(?:fha(?:\s*\/[A-Za-z]+)?\s*(?:case)?\s*(?:no\.?|number|#)?\s*[:\-]?\s*)(\d{3}-\d{7})', txt, re.I)
            if m:
                return m.group(1)

    if full_narrative:
        m = re.search(r'(?:fha(?:\s*\/[A-Za-z]+)?\s*(?:case)?\s*(?:no\.?|number|#)?\s*[:\-]?\s*)(\d{3}-\d{7})', full_narrative, re.I)
        if m:
            return m.group(1)

    # Embedded PDF fallback
    doc_elem = root.find(".//DOCUMENT")
    if doc_elem is not None and doc_elem.text and fitz is not None:
        try:
            pdf_bytes = base64.b64decode(doc_elem.text.strip())
            doc = fitz.open(stream=pdf_bytes, filetype="pdf")
            if len(doc) > 0:
                p1_text = doc[0].get_text("text") or ""
                m_pdf = re.search(r'(?:fha(?:\s*\/[A-Za-z]+)?\s*case\s*(?:no\.?|number|#)?\s*[:\-]?\s*)(\d{3}-\d{7})', p1_text, re.I)
                if m_pdf:
                    doc.close()
                    return m_pdf.group(1)
                if "fha" in p1_text.lower() or "hud" in p1_text.lower():
                    m_gen = re.search(r'\b(\d{3}-\d{7})\b', p1_text[:2500])
                    if m_gen:
                        doc.close()
                        return m_gen.group(1)
            doc.close()
        except Exception:
            pass

    return ""


def _extract_appraiser_fee(full_narrative: str = "", embedded_doc: Optional[ET.Element] = None) -> str:
    r"""
    Extracts the Appraiser's Fee across report narrative and embedded PDF pages.
    Searches for fee disclosure patterns such as:
    - 'Fee disclosures are $450.00'
    - 'Fee paid to the appraiser: $500.00'
    - 'Appraiser fee is $650'
    - 'Appraiser's fee is $510'
    - 'Total Appraiser Fee: $400'
    - 'Appraisal Fee is $600'
    - 'Appraiser Fee: $395.00'
    - 'SERVICE FEE $750'
    - 'Invoice Amount / Total: $...'
    Returns clean numeric value as a string (e.g. '450.00').
    """
    fee_patterns = [
        re.compile(r'(?:Fee\s+disclosures?(?:\s+are|\s+is|\s+was)?|Appraisal\s+Fee\s+disclosure)[^0-9$\n]{0,35}\$?\s*([0-9,]+(?:\.\d{2})?)', re.IGNORECASE),
        re.compile(r'Fee\s+paid\s+to\s+(?:the\s+)?appraiser[^0-9$\n]{0,35}\$?\s*([0-9,]+(?:\.\d{2})?)', re.IGNORECASE),
        re.compile(r'(?:Total\s+|Actual\s+|Agreed\s+)?(?:Appraiser(?:\'s)?\s*Fee|Appraisal\s*Fee)[^0-9$\n]{0,35}\$?\s*([0-9,]+(?:\.\d{2})?)', re.IGNORECASE),
        re.compile(r'(?:Appraisal\s*Service\s*Fee|Professional\s*Fee|Agreed\s*Fee|Fee\s*Charged|Fee\s*Amount)[^0-9$\n]{0,35}\$?\s*([0-9,]+(?:\.\d{2})?)', re.IGNORECASE),
        re.compile(r'\bSERVICE\s+FEE[^0-9$\n]{0,20}\$?\s*([0-9,]+(?:\.\d{2})?)', re.IGNORECASE),
        re.compile(r'(?:Invoice\s*Amount|Invoice\s*Total|Total\s*Amount\s*Due|TOTAL\s*DUE|Amount\s*Due)[^0-9$\n]{0,35}\$?\s*([0-9,]+(?:\.\d{2})?)', re.IGNORECASE),
        re.compile(r'\bFee\s+(?:for\s+(?:this|the)\s+appraisal\s+)?(?:is|was|of|:|=)\s*\$?\s*([0-9,]+(?:\.\d{2})?)', re.IGNORECASE)
    ]

    candidate_texts = []
    if full_narrative:
        candidate_texts.append(full_narrative)

    if embedded_doc is not None and embedded_doc.text:
        try:
            pdf_bytes = base64.b64decode(embedded_doc.text.strip())
            if fitz is not None:
                pdf_doc = fitz.open(stream=pdf_bytes, filetype="pdf")
                for page in pdf_doc:
                    txt = page.get_text() or ""
                    if txt:
                        candidate_texts.append(txt)
                pdf_doc.close()
        except Exception:
            pass

    for pat in fee_patterns:
        for txt in candidate_texts:
            for m in pat.finditer(txt):
                snippet = txt[max(0, m.start() - 30):min(len(txt), m.end() + 30)].lower()
                if any(bad in snippet for bad in ['hoa', 'pud', 'per month', 'per year', 'late fee', 'cancellation', 'simple', 'sf', 'sq ft']):
                    continue
                raw = m.group(1).replace(',', '').strip()
                try:
                    val = float(raw)
                    if 50.0 <= val <= 25000.0:
                        return f"{val:.2f}"
                except ValueError:
                    pass

    return ""


def _extract_nonconforming_rebuild_comment(
    full_narrative: str = "",
    dom_narratives: Optional[List[str]] = None,
    root: Optional[ET.Element] = None
) -> str:
    """
    If Zoning Compliance is nonconforming, finds and extracts commentary regarding
    whether the subject property/improvements can be rebuilt, rebuild, destroyed, or remoulded.
    Keywords: rebuilt, rebuild, destroy, remould.
    """
    search_texts = []
    if full_narrative:
        search_texts.append(full_narrative)
    if dom_narratives:
        search_texts.extend(dom_narratives)

    if root is not None:
        for elem in root.iter():
            for k, v in elem.attrib.items():
                if v and any(kw in v.lower() for kw in ["rebuilt", "rebuild", "destroy", "remould", "remodel", "reconstruct"]):
                    search_texts.append(v)
            if elem.text and any(kw in elem.text.lower() for kw in ["rebuilt", "rebuild", "destroy", "remould", "remodel", "reconstruct"]):
                search_texts.append(elem.text)

    combined_text = "\n\n".join(search_texts)
    if not combined_text:
        return ""

    kw_pattern = re.compile(
        r'\b(?:re-?built|re-?build(?:ing)?|destroy(?:ed)?|destruct(?:ion)?|re-?mould(?:ed)?|re-?model(?:ed|ing)?|re-?construct(?:ed|ion)?)\b',
        re.IGNORECASE
    )

    candidates = []

    # 1. Sentence-level and clean chunk checks
    chunks = [c.strip(" \t\r\n-•*\"'") for c in re.split(r'(?<=[.?!;])\s+|[\r\n]+', combined_text) if c.strip(" \t\r\n-•*\"'")]
    for idx, c_clean in enumerate(chunks):
        if len(c_clean) < 10 or len(c_clean) > 800:
            continue
        if kw_pattern.search(c_clean):
            score = 0
            c_lower = c_clean.lower()
            if any(term in c_lower for term in ["zoning", "nonconforming", "non-conforming", "grandfathered", "compliance"]):
                score += 30
            if "rebuilt" in c_lower or "rebuild" in c_lower:
                score += 10
            if "destroy" in c_lower or "destroyed" in c_lower:
                score += 10
            if "remould" in c_lower or "remodel" in c_lower:
                score += 8
            if any(term in c_lower for term in ["can be", "may be", "allowed", "permitted", "subject", "structure", "improvements"]):
                score += 5

            context_chunk = c_clean
            if idx > 0 and any(term in chunks[idx - 1].lower() for term in ["zoning", "nonconforming", "non-conforming", "grandfathered"]):
                context_chunk = f"{chunks[idx - 1]} {c_clean}"
                score += 20
            elif idx < len(chunks) - 1 and any(term in chunks[idx + 1].lower() for term in ["zoning", "nonconforming", "non-conforming", "grandfathered"]):
                context_chunk = f"{c_clean} {chunks[idx + 1]}"
                score += 20

            candidates.append((score, context_chunk))

    # 2. Paragraph-level checks fallback
    paragraphs = [p.strip(" \t\r\n-•*\"'") for p in re.split(r'(?:[\r\n]\s*){2,}', combined_text) if p.strip(" \t\r\n-•*\"'")]
    for p_clean in paragraphs:
        if len(p_clean) < 10 or len(p_clean) > 1200:
            continue
        if kw_pattern.search(p_clean):
            p_lower = p_clean.lower()
            score = 0
            if any(term in p_lower for term in ["zoning", "nonconforming", "non-conforming", "grandfathered", "compliance"]):
                score += 20
            if "rebuilt" in p_lower or "rebuild" in p_lower:
                score += 8
            if "destroy" in p_lower or "destroyed" in p_lower:
                score += 8
            if "remould" in p_lower or "remodel" in p_lower:
                score += 6
            if any(term in p_lower for term in ["can be", "may be", "allowed", "permitted", "subject", "structure", "improvements"]):
                score += 4
            candidates.append((score, p_clean))

    if candidates:
        candidates.sort(key=lambda x: x[0], reverse=True)
        return candidates[0][1]

    m = re.search(
        r'([^.?!;\n\r]{0,100}\b(?:rebuilt|rebuild|destroy(?:ed)?|remould)\b[^.?!;\n\r]{0,200}(?:[.?!]|$))',
        combined_text,
        re.IGNORECASE
    )
    if m:
        return m.group(0).strip(" \t\r\n-•*\"'")

    return ""


def _detect_1004mc_presence(root: ET.Element, embedded_doc: Optional[ET.Element] = None) -> Tuple[bool, str]:
    """
    Identifies whether 1004MC (Market Conditions Addendum) is present in MISMO XML.
    Checks:
    1. <FORM> addenda elements
    2. <MARKET> and <MARKET_INVENTORY> data elements
    3. Embedded PDF document text
    Returns (is_present: bool, reason: str)
    """
    for form in root.findall(".//FORM"):
        name = f"{form.attrib.get('AppraisalReportContentName', '')} {form.attrib.get('AppraisalReportContentIdentifier', '')}".upper()
        if "1004MC" in name or "MARKET CONDITIONS ADDENDUM" in name:
            return True, f"FORM Addendum Tag: {form.attrib.get('AppraisalReportContentName', '') or form.attrib.get('AppraisalReportContentIdentifier', '')}"

    market_elem = root.find(".//MARKET")
    inventory_items = root.findall(".//MARKET_INVENTORY")
    if market_elem is not None or len(inventory_items) > 0:
        return True, f"XML <MARKET> tag with {len(inventory_items)} inventory records"

    if embedded_doc is not None and embedded_doc.text:
        try:
            pdf_bytes = base64.b64decode(embedded_doc.text.strip())
            if fitz is not None:
                pdf = fitz.open(stream=pdf_bytes, filetype="pdf")
                for page_num, page in enumerate(pdf, 1):
                    txt = (page.get_text() or "").upper()
                    if "1004MC" in txt or "MARKET CONDITIONS ADDENDUM" in txt or ("INVENTORY ANALYSIS" in txt and ("PRIOR 7-12" in txt or "ABSORPTION RATE" in txt)):
                        pdf.close()
                        return True, f"Embedded PDF Page {page_num}"
                pdf.close()
        except Exception:
            pass

    return False, "Not Present"


def _detect_uspap_identification_presence(root: ET.Element, embedded_doc: Optional[ET.Element] = None) -> Tuple[bool, str]:
    """
    Identifies whether USPAP or Appraisal and Report Identification page is present in MISMO XML or embedded PDF.
    Checks:
    1. <FORM> elements for USPAP / Appraisal and Report Identification
    2. <FORM> AppraisalAddendumText attributes
    3. Embedded PDF document pages
    Returns (is_present: bool, reason: str)
    """
    for form in root.findall(".//FORM"):
        name = f"{form.attrib.get('AppraisalReportContentName', '')} {form.attrib.get('AppraisalReportContentIdentifier', '')} {form.attrib.get('AppraisalReportContentType', '')}".upper()
        if "APPRAISAL AND REPORT IDENTIFICATION" in name or "APPRAISAL & REPORT IDENTIFICATION" in name or "REPORT IDENTIFICATION" in name:
            return True, f"FORM Tag: {form.attrib.get('AppraisalReportContentName', '') or form.attrib.get('AppraisalReportContentIdentifier', '')}"
        if "USPAP" in name:
            return True, f"FORM Tag (USPAP): {form.attrib.get('AppraisalReportContentName', '') or form.attrib.get('AppraisalReportContentIdentifier', '')}"

        addendum_txt = (form.attrib.get("AppraisalAddendumText") or "").upper()
        if "APPRAISAL AND REPORT IDENTIFICATION" in addendum_txt or "APPRAISAL & REPORT IDENTIFICATION" in addendum_txt or "COMMENTS ON APPRAISAL AND REPORT IDENTIFICATION" in addendum_txt:
            return True, "FORM Addendum Text: Appraisal and Report Identification"
        if "USPAP ADDENDUM" in addendum_txt or "USPAP COMPLIANCE" in addendum_txt or "USPAP IDENTIFICATION" in addendum_txt:
            return True, "FORM Addendum Text: USPAP Addendum"

    if embedded_doc is not None and embedded_doc.text:
        try:
            pdf_bytes = base64.b64decode(embedded_doc.text.strip())
            if fitz is not None:
                pdf = fitz.open(stream=pdf_bytes, filetype="pdf")
                for page_num, page in enumerate(pdf, 1):
                    txt = (page.get_text() or "").upper()
                    if "APPRAISAL AND REPORT IDENTIFICATION" in txt or "APPRAISAL & REPORT IDENTIFICATION" in txt or "COMMENTS ON APPRAISAL AND REPORT IDENTIFICATION" in txt:
                        pdf.close()
                        return True, f"Embedded PDF Page {page_num} (Appraisal and Report Identification)"
                    if (
                        "USPAP ADDENDUM" in txt
                        or "USPAP COMPLIANCE" in txt
                        or "USPAP IDENTIFICATION" in txt
                        or ("USPAP" in txt and ("STANDARDS RULE" in txt or "REASONABLE EXPOSURE TIME" in txt or "REPORTING OPTION" in txt))
                    ):
                        pdf.close()
                        return True, f"Embedded PDF Page {page_num} (USPAP)"
                pdf.close()
        except Exception:
            pass

    return False, "Not Present"


def _detect_invoice_presence(root: ET.Element, embedded_doc: Optional[ET.Element] = None, full_narrative: str = "") -> Tuple[bool, str, Dict[str, Any]]:
    """
    Identifies whether an appraisal invoice page or invoice copy is present in MISMO XML or embedded PDF.
    Checks:
    1. <FORM> elements for INVOICE
    2. <FORM> AppraisalAddendumText attributes
    3. <DOCUMENT> or <EMBEDDED_FILE> elements
    4. Embedded PDF document pages
    5. Full narrative text
    Returns (is_present: bool, reason: str, invoice_details: Dict[str, Any])
    """
    inv_details: Dict[str, Any] = {
        "Invoice Attached": "No",
        "Invoice Present": "No",
        "Invoice Page": None,
        "Invoice Total": "",
        "has_invoice": False
    }

    # 1. Check <FORM> tags
    for form in root.findall(".//FORM"):
        name = f"{form.attrib.get('AppraisalReportContentName', '')} {form.attrib.get('AppraisalReportContentIdentifier', '')} {form.attrib.get('AppraisalReportContentType', '')}".upper()
        if "INVOICE" in name or "APPRAISAL INVOICE" in name or "FEE INVOICE" in name:
            inv_details["Invoice Attached"] = "Yes"
            inv_details["Invoice Present"] = "Yes"
            inv_details["has_invoice"] = True
            inv_details["Invoice Page"] = "FORM Tag"
            return True, f"FORM Tag: {form.attrib.get('AppraisalReportContentName', '') or form.attrib.get('AppraisalReportContentIdentifier', '')}", inv_details

        addendum_txt = (form.attrib.get("AppraisalAddendumText") or "").upper()
        if re.search(r'\bINVOICE\b|APPRAISAL\s+INVOICE|FEE\s+INVOICE', addendum_txt):
            inv_details["Invoice Attached"] = "Yes"
            inv_details["Invoice Present"] = "Yes"
            inv_details["has_invoice"] = True
            inv_details["Invoice Page"] = "FORM Addendum Text"
            return True, "FORM Addendum Text: Invoice", inv_details

    # 2. Check embedded PDF document
    if embedded_doc is not None and embedded_doc.text:
        try:
            pdf_bytes = base64.b64decode(embedded_doc.text.strip())
            if fitz is not None:
                pdf = fitz.open(stream=pdf_bytes, filetype="pdf")
                for page_num, page in enumerate(pdf, 1):
                    raw_t = page.get_text() or ""
                    t_upper = raw_t.upper()

                    # Skip standard Form primary body pages
                    is_primary = ("PAGE 1 OF 6" in t_upper or "PAGE 2 OF 6" in t_upper or "PAGE 3 OF 6" in t_upper or "PAGE 1 OF 5" in t_upper)
                    if is_primary:
                        continue

                    has_inv_heading = bool(re.search(
                        r'\bINVOICE\b|APPRAISAL\s+INVOICE|FEE\s+INVOICE|SERVICES\s+INVOICE|\*+\s*INVOICE\s*\*+',
                        t_upper
                    ))
                    has_inv_indicators = bool(re.search(
                        r'INVOICE\s*(?:#|NO|NUMBER|DATE|TOTAL|AMOUNT|DUE)|'
                        r'TOTAL\s*(?:DUE|FEE|AMOUNT\s*DUE)|AMOUNT\s*DUE|BALANCE\s*DUE|'
                        r'PLEASE\s*REMIT|REMIT\s*(?:TO|PAYMENT)|BILL\s*TO|BILLED\s*TO|'
                        r'FEES\s+AMOUNT\s+SUBTOTAL|INVOICE\s*TAX\s*ID',
                        t_upper
                    ))

                    if has_inv_heading and has_inv_indicators:
                        m_amt = re.search(
                            r'(?:TOTAL\s*DUE|AMOUNT\s*DUE|INVOICE\s*TOTAL|TOTAL\s*FEE|INVOICE\s*AMOUNT|TOTAL)[^0-9$\n]{0,35}\$?\s*([0-9]{1,3}(?:,[0-9]{3})*(?:\.\d{2})?|\d+(?:\.\d{2})?)',
                            raw_t,
                            re.IGNORECASE
                        )
                        amt = ""
                        if m_amt and any(c.isdigit() for c in m_amt.group(1)):
                            amt = f"${m_amt.group(1).strip()}"
                        pdf.close()
                        inv_details["Invoice Attached"] = "Yes"
                        inv_details["Invoice Present"] = "Yes"
                        inv_details["has_invoice"] = True
                        inv_details["Invoice Page"] = page_num
                        inv_details["Invoice Total"] = amt
                        return True, f"Embedded PDF Page {page_num} (Invoice)", inv_details
                pdf.close()
        except Exception:
            pass

    # 3. Check full narrative text
    if full_narrative:
        fn_upper = full_narrative.upper()
        if re.search(r'INVOICE\s*(?:COPY\s*)?ATTACHED|COPY\s*OF\s*INVOICE\s*ATTACHED|INVOICE\s*ATTACHED\s*TO\s*REPORT|INVOICE\s*IS\s*ATTACHED', fn_upper):
            inv_details["Invoice Attached"] = "Yes"
            inv_details["Invoice Present"] = "Yes"
            inv_details["has_invoice"] = True
            inv_details["Invoice Page"] = "Narrative"
            return True, "Narrative: Invoice Attached", inv_details

    return False, "Not Present", inv_details


def find_comparable_rent_schedule_pages(doc) -> List[int]:
    """
    Finds page index(es) containing the Form 1007 Comparable Rent Schedule table.
    A page is identified IF AND ONLY IF:
    1. Header/title contains 'COMPARABLE RENT SCHEDULE' or ('RENT SCHEDULE' and ('SINGLE FAMILY' or 'FORM 1007' or 'FORM 1000' or 'FNM 1007' or 'FRE 1000'))
    2. AND contains signature table markers:
       - 'ITEM' and ('SUBJECT' or 'COMPARABLE NO' or 'COMPARABLE')
       - AND at least 3 of: 'MONTHLY RENTAL', 'IF CURRENTLY RENTED', 'DATE LEASE', 'LEASE BEGINS', 'LEASE EXPIRES',
         'ADJUSTED MONTHLY RENT', 'DATA SOURCE', 'RENT ADJUSTMENTS', 'ABOVE GRADE', 'ROOM COUNT',
         'GROSS LIVING AREA', 'NET ADJ', 'INDICATED MONTHLY', 'MARKET RENT', 'LESS: UTILITIES'
    """
    pages = []
    if not doc:
        return pages
    for idx, page in enumerate(doc):
        txt = (page.get_text("text") or "").upper()
        is_rent_title = (
            "COMPARABLE RENT SCHEDULE" in txt
            or ("SINGLE FAMILY" in txt and "RENT SCHEDULE" in txt)
            or "FORM 1007" in txt
            or "FRE 1000" in txt
            or "FREDDIE MAC FORM 1000" in txt
            or "FANNIE MAE FORM 1007" in txt
            or "FANNIE MAE  FORM 1007" in txt
        )
        if not is_rent_title:
            continue
            
        has_table_header = "ITEM" in txt and ("SUBJECT" in txt or "COMPARABLE" in txt)
        markers = [
            "MONTHLY RENTAL", "IF CURRENTLY RENTED", "DATE LEASE", "LEASE BEGINS", "LEASE EXPIRES",
            "ADJUSTED MONTHLY RENT", "DATA SOURCE", "RENT ADJUSTMENTS", "ABOVE GRADE", "ROOM COUNT",
            "GROSS LIVING AREA", "NET ADJ", "INDICATED MONTHLY", "MARKET RENT", "LESS: UTILITIES"
        ]
        matched_markers = sum(1 for m in markers if m in txt)
        if has_table_header or matched_markers >= 3:
            pages.append(idx)
    return pages


def extract_rent_schedule_from_pdf_page(page, start_comp_num: int = 1) -> Dict[str, Any]:
    """
    Extracts all fields for Subject and Comparable No. X..Y from a Form 1007 PDF page.
    Dynamically identifies row anchors and column boundaries across diverse appraisal software
    (ACI, TOTAL / a la mode, ClickFORMS, SFREP, Bradford).
    """
    words = page.get_text("words")
    if not words:
        return {"Subject": {}, "comparables": {}, "reconciliation": {}}

    # 1. Determine layout variant: shifted-margin (e.g. 0000996) vs standard
    item_w = next((w for w in words if w[4] == "ITEM"), None)
    is_shifted = (item_w is not None and item_w[0] > 90)

    if is_shifted:
        c0_x0, c0_x1 = 50.0, 205.0
        subj_data_x0 = 135.0
        c1_x0, c1_adj, c1_x1 = 205.0, 275.0, 315.0
        c2_x0, c2_adj, c2_x1 = 315.0, 382.0, 422.0
        c3_x0, c3_adj, c3_x1 = 422.0, 490.0, 560.0
    else:
        c0_x0, c0_x1 = 35.0, 186.0
        subj_data_x0 = 105.0
        c1_x0, c1_adj, c1_x1 = 186.0, 268.0, 318.0
        c2_x0, c2_adj, c2_x1 = 318.0, 400.0, 450.0
        c3_x0, c3_adj, c3_x1 = 450.0, 532.0, 600.0

    cols_full = {
        "Subject": (c0_x0, c0_x1),
        f"COMPARABLE NO. {start_comp_num}": (c1_x0, c1_x1),
        f"COMPARABLE NO. {start_comp_num + 1}": (c2_x0, c2_x1),
        f"COMPARABLE NO. {start_comp_num + 2}": (c3_x0, c3_x1),
    }

    cols_adj = {
        "Subject": {"desc": (c0_x0, c0_x1), "adj": None},
        f"COMPARABLE NO. {start_comp_num}": {"desc": (c1_x0, c1_adj), "adj": (c1_adj, c1_x1)},
        f"COMPARABLE NO. {start_comp_num + 1}": {"desc": (c2_x0, c2_adj), "adj": (c2_adj, c2_x1)},
        f"COMPARABLE NO. {start_comp_num + 2}": {"desc": (c3_x0, c3_adj), "adj": (c3_adj, c3_x1)},
    }

    # 2. Row anchor detection
    row_specs = [
        ("header", [r"\bITEM\b"]),
        ("address", [r"\bAddress\b"]),
        ("proximity", [r"\bProximity\b"]),
        ("lease_begins", [r"\bLease\s+Begins\b", r"\bDate\s+Lease\s+Begins\b"]),
        ("lease_expires", [r"\bLease\s+Expires\b", r"\bDate\s+Lease\s+Expires\b"]),
        ("monthly_rental", [r"\bMonth[a-z]*\s+Rental\b", r"\bIf\s+Currently\s+Rented\b"]),
        ("utilities", [r"\bLess:\s*Utilities\b", r"\bUtilities\b"]),
        ("furniture", [r"\bFurniture\b"]),
        ("adjusted_monthly_rent", [r"\bAdjusted\s+Monthly\s+Rent\b", r"\bAdjusted\b"]),
        ("data_source", [r"\bData\s+Source\b"]),
        ("rent_adj_header", [r"\bRENT\s+ADJUSTMENTS\b"]),
        ("rent", [r"\bRent\b"]),
        ("concessions", [r"\bConcessions\b"]),
        ("location", [r"\bLocation(?:/View)?\b"]),
        ("design", [r"\bDesign\s+and\s+Appeal\b", r"\bDesign\b"]),
        ("age_condition", [r"\bAge(?:/Condition)?\b"]),
        ("rooms", [r"\bAbove\s+Grade\b", r"\bRoom\s+Count\b"]),
        ("gla", [r"\bGross\s+Living\s+Area\b"]),
        ("other_bsmt", [r"\bOther\s*\([^)]*base", r"\bOther\s*\(e\.g\."]),
        ("other_2", [r"\bOther\s*:"]),
        ("net_adj", [r"\bNet\s+Adj\b"]),
        ("indicated_rent", [r"\bIndicated\s+Monthly\b", r"\bMarket\s+Rent\b"]),
        ("comments", [r"\bComments\s+on\s+market\s+data\b"]),
        ("reconciliation", [r"\bFinal\s+Reconciliation\b"]),
    ]

    anchors = {}
    last_y = 0.0
    label_max_x = 160.0 if is_shifted else 120.0
    for key, patterns in row_specs:
        found_y = None
        for w in sorted(words, key=lambda x: (x[1], x[0])):
            if w[0] > label_max_x and key not in ["comments", "reconciliation"]:
                continue
            if w[1] > last_y - 2:
                line_words = [x for x in words if abs(x[1] - w[1]) < 6 and (x[0] < label_max_x or key in ["comments", "reconciliation"])]
                line_str = " ".join(x[4] for x in sorted(line_words, key=lambda x: x[0]))
                if any(re.search(p, line_str, re.I) for p in patterns):
                    found_y = w[1]
                    last_y = found_y
                    break
        if found_y is not None:
            anchors[key] = found_y

    ordered_keys = [k for k, _ in row_specs if k in anchors]
    row_intervals = {}
    y0_hdr = item_w[1] + 4 if item_w else 50
    for i, k in enumerate(ordered_keys):
        if k == "address":
            y0 = y0_hdr
        else:
            y0 = anchors[k] - 4.0
        y1 = anchors[ordered_keys[i + 1]] - 4.0 if i + 1 < len(ordered_keys) else anchors[k] + 35.0
        row_intervals[k] = (y0, y1)

    if "other_bsmt" in row_intervals and "other_2" in row_intervals:
        split_y = anchors["other_2"] - 1.0 if is_shifted else anchors["other_2"] - 6.0
        row_intervals["other_bsmt"] = (row_intervals["other_bsmt"][0], split_y)
        row_intervals["other_2"] = (split_y, row_intervals["other_2"][1])

    hdr_y_cutoff = (item_w[1] + 30) if item_w else 150
    header_nums = {'1', '2', '3', '4', '5', '6', '7', '8', '9'}

    def get_text_box(x0, x1, y0, y1):
        ex = {'ITEM', 'SUBJECT', 'COMPARABLE', 'NO.', 'NO',
              'DESCRIPTION', 'Sq.', 'Ft.', 'Sq. Ft.', ':', 'Total', 'Bdrms', 'Baths', 'RENT', 'ADJUSTMENTS',
              '+(-)$', '+(-)', '$', 'Adjustment', '+', '-', 'Address', 'Proximity', 'to', 'Subject',
              'Date', 'Lease', 'Begins', 'Expires', 'Monthly', 'Rental', 'Monthy', 'If', 'Currently', 'Rented:',
              'Rented', 'Less:', 'Utilities', 'Furniture', 'Adjusted', 'Rent', 'Data', 'Source',
              'Concessions', 'Location/View', 'Design', 'and', 'Appeal', 'Age/Condition', 'Age', 'Condition',
              'Above', 'Grade', 'Room', 'Count', 'Gross', 'Living', 'Area', 'Other', 'Other:', 'Net', 'Adj.',
              'Adj', '(total)', 'Indicated', 'Market', 'etc.)', '(e.g.,', 'basement,'}
        matched = [
            w for w in words
            if x0 <= ((w[0] + w[2]) / 2.0) <= x1 and y0 <= ((w[1] + w[3]) / 2.0) <= y1
            and (w[4] not in header_nums or w[1] > hdr_y_cutoff)
            and w[4] not in ex
        ]
        matched.sort(key=lambda w: (round(w[1] / 3.0) * 3.0, w[0]))
        return ' '.join(w[4] for w in matched).strip()

    subject_data: Dict[str, str] = {}
    comps_data: Dict[str, Dict[str, str]] = {c: {} for c in cols_full.keys() if c != "Subject"}

    top_rows = [
        ("address", "Address"),
        ("proximity", "Proximity to Subject"),
        ("lease_begins", "Date Lease Begins"),
        ("lease_expires", "Date Lease Expires"),
        ("monthly_rental", "Monthly Rental"),
        ("utilities", "Less: Utilities"),
        ("furniture", "Furniture"),
        ("adjusted_monthly_rent", "Adjusted Monthly Rent"),
        ("data_source", "Data Source"),
    ]

    for anchor_k, field_name in top_rows:
        if anchor_k not in row_intervals:
            continue
        y0, y1 = row_intervals[anchor_k]
        for cname, (x0, x1) in cols_full.items():
            eff_x0 = subj_data_x0 if (cname == "Subject" and field_name != "Address") else x0
            target = subject_data if cname == "Subject" else comps_data[cname]
            val = get_text_box(eff_x0, x1, y0, y1)
            if not val:
                continue
            if field_name == "Address":
                target["Address"] = val
            elif field_name == "Proximity to Subject":
                target["Proximity to Subject"] = val
            elif field_name == "Date Lease Begins":
                target["Date Lease Begins"] = val
            elif field_name == "Date Lease Expires":
                target["Date Lease Expires"] = val
            elif field_name == "Monthly Rental":
                clean_r = val.replace("If Currently Rented:", "").replace("If Currently Rented", "").replace("$", "").strip()
                m = re.search(r'([\d,]+(?:\.\d+)?)', clean_r)
                if m: target["Monthly Rental"] = _clean_currency(m.group(1))
                elif clean_r: target["Monthly Rental"] = clean_r
            elif field_name in ["Less: Utilities", "Furniture"]:
                target[field_name] = _clean_currency(val)
            elif field_name == "Adjusted Monthly Rent":
                m = re.search(r'([\d,]+(?:\.\d+)?)', val)
                if m: target["Adjusted Monthly Rent"] = _clean_currency(m.group(1))
                elif val: target["Adjusted Monthly Rent"] = val
            elif field_name == "Data Source":
                target["Data Source"] = val

    adj_rows = [
        ("rent", "Rent"),
        ("concessions", "Concessions"),
        ("location", "Location/View"),
        ("design", "Design and Appeal"),
        ("age_condition", "Age/Condition"),
        ("rooms", "Above Grade Room Count"),
        ("gla", "Gross Living Area"),
        ("other_bsmt", "Other (e.g., basement, etc.)"),
        ("other_2", "Other:"),
        ("net_adj", "Net Adj. (total)"),
        ("indicated_rent", "Indicated Monthly Market Rent"),
    ]

    for anchor_k, field_name in adj_rows:
        if anchor_k not in row_intervals:
            continue
        y0, y1 = row_intervals[anchor_k]
        for cname, cboxes in cols_adj.items():
            target = subject_data if cname == "Subject" else comps_data[cname]
            desc_box = cboxes.get("desc")
            if not desc_box:
                continue
            dx0, dx1 = desc_box
            eff_dx0 = subj_data_x0 if cname == "Subject" else dx0
            desc_val = get_text_box(eff_dx0, dx1, y0, y1)
            adj_val = ""
            adj_box = cboxes.get("adj")
            if adj_box:
                ax0, ax1 = adj_box
                adj_val = get_text_box(ax0, ax1, y0, y1)

            if field_name in ["Rent", "Concessions"]:
                if desc_val: target[field_name] = desc_val
            elif field_name == "Location/View":
                if desc_val: target["Location/View"] = desc_val
                if adj_val: target["Location/View Adjustment"] = _clean_currency(adj_val)
            elif field_name == "Design and Appeal":
                if desc_val: target["Design and Appeal"] = desc_val
                if adj_val: target["Design and Appeal Adjustment"] = _clean_currency(adj_val)
            elif field_name == "Age/Condition":
                nums = re.findall(r'\b\d+\b', desc_val)
                words_list = re.findall(r'[A-Za-z0-9~]+', desc_val)
                if nums: target["Age"] = nums[0]
                cond = [w for w in words_list if w.startswith(('C', 'Q', 'Good', 'Avg', 'Fair', 'Poor')) or w in ['C1','C2','C3','C4','C5','C6']]
                if cond: target["Condition"] = " ".join(cond)
                elif desc_val: target["Condition"] = desc_val
                if adj_val: target["Condition Adjustment"] = _clean_currency(adj_val)
            elif field_name == "Above Grade Room Count":
                matched_w = [w for w in words if dx0 <= ((w[0]+w[2])/2.0) <= dx1 and y0 <= ((w[1]+w[3])/2.0) <= y1 and re.match(r'^\d+(?:\.\d+)?$', w[4])]
                matched_w.sort(key=lambda w: w[0])
                nums = [w[4] for w in matched_w]
                if len(nums) >= 3:
                    target["Room Count Total"] = nums[0]
                    target["Room Count Bdrms"] = nums[1]
                    target["Room Count Baths"] = nums[2]
                elif len(nums) == 2:
                    target["Room Count Total"] = nums[0]
                    target["Room Count Bdrms"] = nums[1]
                elif len(nums) == 1:
                    target["Room Count Total"] = nums[0]
                if adj_val: target["Room Count Total Adjustment"] = _clean_currency(adj_val)
            elif field_name == "Gross Living Area":
                m = re.search(r'([\d,]+)', desc_val)
                if m: target["Gross Living Area"] = _clean_currency(m.group(1))
                elif desc_val: target["Gross Living Area"] = desc_val
                if adj_val: target["Gross Living Area Adjustment"] = _clean_currency(adj_val)
            elif field_name == "Other (e.g., basement, etc.)":
                if desc_val:
                    target["Other (e.g., basement, etc.)"] = desc_val
                    target["Other (e.g., basement)"] = desc_val
                    target["Other Basement"] = desc_val
                if adj_val:
                    c_adj = _clean_currency(adj_val)
                    target["Other (e.g., basement, etc.) Adjustment"] = c_adj
                    target["Other (e.g., basement) Adjustment"] = c_adj
                    target["Other Basement Adjustment"] = c_adj
            elif field_name == "Other:":
                if desc_val:
                    target["Other:"] = desc_val
                    target["Other"] = desc_val
                if adj_val:
                    c_adj = _clean_currency(adj_val)
                    target["Other: Adjustment"] = c_adj
                    target["Other Adjustment"] = c_adj
            elif field_name == "Net Adj. (total)":
                net = _clean_currency(adj_val or desc_val).lstrip("+-")
                if "-" in (adj_val + desc_val): target["Net Adj. (total)"] = f"- {net}" if net else "-"
                elif "+" in (adj_val + desc_val): target["Net Adj. (total)"] = f"+ {net}" if net else "+"
                else: target["Net Adj. (total)"] = net
            elif field_name == "Indicated Monthly Market Rent":
                m = re.search(r'([\d,]+(?:\.\d+)?)', adj_val or desc_val)
                if m: target["Indicated Monthly Market Rent"] = _clean_currency(m.group(1))
                elif desc_val: target["Indicated Monthly Market Rent"] = desc_val

    # Reconciliation
    rec_y0 = anchors.get("comments", 460)
    rec_y1 = anchors.get("reconciliation", 580)
    comments_txt = ' '.join(w[4] for w in sorted(
        [w for w in words if 25 <= ((w[0]+w[2])/2.0) <= 595 and rec_y0 <= ((w[1]+w[3])/2.0) <= rec_y1 and w[4] not in ['Comments', 'on', 'market', 'data,', 'including', 'the', 'range', 'of', 'rents', 'for', 'single', 'family', 'properties,', 'an', 'estimate', 'of', 'vacancy', 'for', 'single', 'family', 'rental', 'properties,', 'the', 'general', 'trend', 'of', 'rents', 'and', 'vacancy,', 'and', 'support', 'for', 'the', 'above', 'adjustments.', '(Rent', 'concessions', 'should', 'be', 'adjusted', 'to', 'the', 'market,', 'not', 'to', 'the', 'subject', 'property.)']],
        key=lambda w: (round(w[1] / 5.0) * 5.0, w[0])
    )).strip()

    final_rec_txt = ' '.join(w[4] for w in sorted(
        [w for w in words if 25 <= ((w[0]+w[2])/2.0) <= 595 and rec_y1 <= ((w[1]+w[3])/2.0) <= 800 and w[4] not in ['Final', 'Reconciliation', 'of', 'Market', 'Rent:', 'RECONCILIATION', 'I', '(WE)', 'ESTIMATE', 'THE', 'MONTHLY', 'MARKET', 'RENT', 'OF', 'THE', 'SUBJECT', 'AS', 'OF', 'TO', 'BE', '$']],
        key=lambda w: (round(w[1] / 5.0) * 5.0, w[0])
    )).strip()

    reconciliation: Dict[str, str] = {}
    if comments_txt:
        reconciliation["Comments on market data, including the range of rents for single family properties, an estimate of vacancy for single family rental properties, the general trend of rents and vacancy, and support for the above adjustments. (Rent concessions should be adjusted to the market, not to the subject property.)"] = comments_txt
    if final_rec_txt:
        reconciliation["Final Reconciliation of Market Rent:"] = final_rec_txt

    est_w = next((w for w in words if w[4] in ['ESTIMATE', 'MONTHLY'] and w[0] < 150 and w[1] > 400), None)
    if est_w:
        line_w = [w for w in words if abs(w[1] - est_w[1]) < 10]
        line_w.sort(key=lambda w: w[0])
        for w in line_w:
            if re.match(r'^\d{1,2}[/-]\d{1,2}[/-]\d{2,4}$', w[4]):
                reconciliation["I (WE) ESTIMATE THE MONTHLY MARKET RENT OF THE SUBJECT AS OF"] = w[4]
            elif re.match(r'^[\d,]+(?:\.\d+)?$', w[4]) and w[4] not in ['1007', '1000']:
                reconciliation["TO BE $"] = _clean_currency(w[4])

    return {
        "Subject": subject_data,
        "comparables": comps_data,
        "reconciliation": reconciliation
    }


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
    
    # Strict 1007 check: only true Form 1007 addendum (not basic page 3 income approach)
    has_1007 = any(
        re.search(r"\b(?:1007|FNM\s*1007|FRE\s*1000|SRX)\b", f, re.IGNORECASE) or
        re.search(r"\b(?:single\s*family\s*(?:comparable\s*)?rent\s*schedule)\b", f, re.IGNORECASE)
        for f in all_form_names
    )
    if not has_1007 and re.search(r"\b(?:1007|FNM\s*1007|FRE\s*1000)\b", f"{mismo_form} {mismo_other}", re.IGNORECASE):
        has_1007 = True

    if not has_1007 and any(re.search(r"\brent\s*schedule\b", f, re.IGNORECASE) for f in all_form_names):
        if not ("1025" in ct or "SMALL RESIDENTIAL" in ct):
            has_1007 = True

    # Check MISMO 2.6 RESIDENTIAL_RENT_SCHEDULE
    if not has_1007:
        res_rent_sched = root.find(".//RESIDENTIAL_RENT_SCHEDULE")
        if res_rent_sched is not None:
            rentals = res_rent_sched.findall(".//RESIDENTIAL_RENTAL")
            if rentals:
                def _rental_has_real_data(r):
                    rent_amt = (r.attrib.get("MonthlyRentAmount") or r.attrib.get("GrossMonthlyRentAmount") or "").strip()
                    if rent_amt and re.search(r"\d", rent_amt) and rent_amt not in ["0", "0.0", "0.00"]:
                        return True
                    seq = str(r.attrib.get("PropertySequenceIdentifier", "")).strip()
                    loc = r.find("LOCATION")
                    loc_has_addr = bool(loc is not None and (loc.attrib or list(loc) or (loc.text and loc.text.strip())))
                    if seq in ["1", "2", "3", "4"] and loc_has_addr:
                        return True
                    adj = r.find("RENT_ADJUSTMENT")
                    if adj is not None and (adj.attrib or list(adj)):
                        return True
                    return False

                if any(_rental_has_real_data(r) for r in rentals):
                    has_1007 = True

    if not has_1007:
        sfrs = root.find(".//SINGLE_FAMILY_RENT_SCHEDULE")
        if sfrs is not None and (sfrs.attrib or list(sfrs) or (sfrs.text and sfrs.text.strip())):
            has_1007 = True

    # Check embedded PDF if present
    if not has_1007 and fitz is not None:
        embedded_doc = root.find(".//DOCUMENT")
        if embedded_doc is not None and embedded_doc.text:
            try:
                pdf_bytes = base64.b64decode(embedded_doc.text.strip())
                emb_doc = fitz.open(stream=pdf_bytes, filetype="pdf")
                if find_comparable_rent_schedule_pages(emb_doc):
                    has_1007 = True
            except Exception:
                pass

    # Check 1025 (Small Residential Income Property / 2-4 Unit)
    if "1025" in ct or "SMALL RESIDENTIAL" in ct or "2-4 UNIT" in ct or "FRE72" in ct:
        return "1025"
        
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
    if "1004MC" in ct or "MARKET CONDITIONS ADDENDUM" in ct:
        return "1004MC"
        
    return "1004 + 1007" if has_1007 else "1004"


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


def extract_comp_photo_metadata(
    page: Any,
    frame: Any,
    body_blocks: Optional[List[Any]] = None,
    reference_records: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    Extracts structured metadata for a comparable, rental, or subject photograph from photo addendum pages.
    Handles TOTAL by a la mode, ACI, ClickFORMS, Bradford, SFREP, etc.
    Extracts: comp_num, street, address, proximity, sale_price, monthly_rent, gla,
             total_rooms, bedrooms, bathrooms, location, view, site, quality, age, and raw metadata dictionary.
    Cross-references with document reference records (Sales Grid, Rent Schedule, Subject) for 100% address accuracy.
    """
    if body_blocks is None:
        blocks = page.get_text("blocks")
        body_blocks = [b for b in blocks if b[1] >= 82 and b[3] <= page.rect.height - 35]

    # Find blocks to the right of the photo frame
    right_blocks = [
        b for b in body_blocks
        if b[0] >= frame.x1 - 35 and b[1] >= frame.y0 - 25 and b[3] <= frame.y1 + 45
    ]

    def is_street_address_line(text: str) -> bool:
        t = text.strip()
        if not t:
            return False
        if not re.match(r'^\d{1,6}\s+[A-Za-z0-9#\.\'\-]', t):
            return False
        if re.match(r'^\$?[\d,]+(?:\.\d+)?$', t):
            return False
        t_lower = t.lower()
        if any(w in t_lower for w in [
            "mile", "sq ft", "sq.ft", "sf", "gla", "room", "bed", "bath",
            "res;", "q1", "q2", "q3", "q4", "q5", "q6",
            "c1", "c2", "c3", "c4", "c5", "c6", "total", "form", "alamode", "page"
        ]):
            return False
        words = re.findall(r'[A-Za-z]{2,}', t)
        return len(words) >= 1

    def is_city_state_zip_line(text: str) -> bool:
        t = text.strip()
        return bool(re.search(r'^[A-Za-z\s\.\-]+,\s*[A-Z]{2}(?:\s*\d{5}(?:-\d{4})?)?$', t))

    title = ""
    comp_num = None
    category = "General"
    is_subject = False
    is_rental = False
    is_comp = False

    # Check title across all right blocks
    for b in right_blocks:
        txt = b[4].strip()
        for line in txt.split('\n'):
            line = line.strip()
            m_sub = re.search(r'^(Subject\s+(?:Front|Rear|Street|Side|Garage|Exterior|Entry|Property))\b', line, re.I)
            if m_sub:
                title = m_sub.group(1).title()
                category = "Subject"
                is_subject = True
                break
            m_rent = re.search(r'^(?:Rental|Comparable\s+Rental)\s*#?\s*(\d+)', line, re.I)
            if m_rent:
                comp_num = int(m_rent.group(1))
                title = f"Rental {comp_num}"
                category = "Rental"
                is_rental = True
                break
            m_comp = re.search(r'^(?:Comparable(?:\s*Sale)?|Comp)\s*#?\s*(\d+)', line, re.I)
            if m_comp:
                comp_num = int(m_comp.group(1))
                title = f"Comparable {comp_num}"
                category = "Comparable"
                is_comp = True
                break
        if title:
            break

    page_header_sample = ""
    try:
        page_header_sample = (page.get_text()[:400] or "").upper()
    except Exception:
        pass

    if not category or category == "General":
        if any(k in page_header_sample for k in ["SUBJECT PROPERTY PHOTO", "SUBJECT PHOTO"]):
            category = "Subject"
            is_subject = True
        elif any(k in page_header_sample for k in ["RENTAL PHOTO", "FORM DLSTRNT", "RENTALS PHOTO"]):
            category = "Rental"
            is_rental = True
        elif any(k in page_header_sample for k in ["COMPARABLE PHOTO", "COMPARABLE PROPERTY", "FORM PICPIX.CR"]):
            category = "Comparable"
            is_comp = True

    # Identify street address lines
    street = ""
    city_state_zip = ""
    all_lines = []
    for b in right_blocks:
        lines = [l.strip() for l in b[4].split('\n') if l.strip()]
        all_lines.extend(lines)
        for i, l in enumerate(lines):
            if not street and is_street_address_line(l):
                street = l
                if i + 1 < len(lines) and is_city_state_zip_line(lines[i+1]):
                    city_state_zip = lines[i+1]

    known_keys = [
        "prox. to subject", "proximity to subject", "proximity", "sale price", "sales price",
        "list price", "rental price", "adj. monthly rent", "monthly rent",
        "gross living area", "gla", "total rooms", "total bedrooms", "total bathrooms",
        "location", "view", "site", "quality", "age", "actual age", "condition", "age/year built"
    ]

    key_block = None
    val_block = None
    for b in right_blocks:
        b_lines = [l.strip() for l in b[4].split('\n') if l.strip()]
        matched_keys = sum(1 for l in b_lines if l.lower() in known_keys or any(k in l.lower() for k in ["prox", "sale price", "living area", "bathrooms", "monthly rent"]))
        if matched_keys >= 3:
            key_block = b_lines
        elif len(b_lines) >= 3 and not any(l.lower() in known_keys for l in b_lines[:3]):
            val_block = b_lines

    meta_dict = {}
    proximity = ""
    sale_price = ""
    gla = ""
    bedrooms = ""
    bathrooms = ""
    total_rooms = ""
    location = ""
    view = ""
    site = ""
    quality = ""
    age = ""

    if key_block and val_block:
        # Determine value offset
        offset = 0
        if is_subject and any("sale price" in k.lower() for k in key_block[:2]) and len(val_block) < len(key_block):
            # In Subject photo cards, Sales Price is blank; values align starting at GLA
            sp_idx = next(i for i, k in enumerate(key_block) if "sale price" in k.lower())
            key_block = key_block[sp_idx + 1:]
            offset = 0
        elif any(k.lower() in ["address", "property address"] for k in key_block[:2]):
            offset = 0
        else:
            if len(val_block) > 0 and is_street_address_line(val_block[0]):
                offset += 1
                if not street:
                    street = val_block[0]
            if len(val_block) > 1 and is_city_state_zip_line(val_block[1]):
                offset += 1
                if not city_state_zip:
                    city_state_zip = val_block[1]

        for idx, k in enumerate(key_block):
            val_idx = idx + offset
            if val_idx < len(val_block):
                v = val_block[val_idx].strip()
                k_clean = k.strip()
                meta_dict[k_clean] = v
                k_lower = k_clean.lower()
                if "prox" in k_lower: proximity = v
                elif "price" in k_lower or "rent" in k_lower: sale_price = v
                elif "living" in k_lower or "gla" in k_lower: gla = v
                elif "room" in k_lower and "bed" not in k_lower and "bath" not in k_lower: total_rooms = v
                elif "bed" in k_lower: bedrooms = v
                elif "bath" in k_lower: bathrooms = v
                elif "location" in k_lower: location = v
                elif "view" in k_lower: view = v
                elif "site" in k_lower: site = v
                elif "quality" in k_lower or "condition" in k_lower: quality = v
                elif "age" in k_lower: age = v

    # Fallback to key: value regex
    if not proximity and not sale_price:
        for line in all_lines:
            m_kv = re.match(r'^([^:\-]+)[:\-]\s*(.+)$', line)
            if m_kv:
                k, v = m_kv.group(1).strip(), m_kv.group(2).strip()
                meta_dict[k] = v
                k_lower = k.lower()
                if "prox" in k_lower and not proximity: proximity = v
                elif "price" in k_lower and not sale_price: sale_price = v
                elif "rent" in k_lower and not sale_price: sale_price = v
                elif ("living" in k_lower or "gla" in k_lower) and not gla: gla = v
                elif "bed" in k_lower and not bedrooms: bedrooms = v
                elif "bath" in k_lower and not bathrooms: bathrooms = v

    # Build full address
    full_address = f"{street}, {city_state_zip}".strip(", ") if (street and city_state_zip) else street

    # Cross-reference enrichment with Document Baseline Records
    if reference_records:
        if is_subject or category == "Subject":
            sub_ref = reference_records.get("subject") or {}
            if sub_ref:
                if not street:
                    street = sub_ref.get("street") or ""
                if not full_address or full_address == street:
                    full_address = sub_ref.get("address") or f"{street}, {sub_ref.get('city','')}, {sub_ref.get('state','')} {sub_ref.get('zipcode','')}".strip(", ")
        elif is_comp and comp_num:
            sc = next((c for c in reference_records.get("sales_comps", []) if c.get("comp_num") == comp_num), None)
            if sc:
                if not street:
                    street = sc.get("street") or ""
                if not full_address or full_address == street:
                    full_address = sc.get("address") or f"{street}, {sc.get('city','')}, {sc.get('state','')} {sc.get('zipcode','')}".strip(", ")
                if not proximity: proximity = sc.get("proximity") or ""
                if not sale_price: sale_price = sc.get("sale_price") or ""
        elif is_rental and comp_num:
            rc = next((r for r in reference_records.get("rental_comps", []) if r.get("comp_num") == comp_num), None)
            if rc:
                if not street:
                    street = rc.get("street") or ""
                if not full_address or full_address == street:
                    full_address = rc.get("address") or f"{street}, {rc.get('city','')}, {rc.get('state','')} {rc.get('zipcode','')}".strip(", ")
                if not proximity: proximity = rc.get("proximity") or ""
                if not sale_price: sale_price = rc.get("monthly_rent") or ""

    return {
        "title": title or (f"{category} {comp_num}" if comp_num else f"{category} Photo"),
        "comp_num": comp_num,
        "category": category,
        "is_rental": is_rental,
        "street": street,
        "address": full_address,
        "proximity": proximity,
        "sale_price": sale_price if not is_subject else "",
        "monthly_rent": sale_price if is_rental else "",
        "rent_amount": sale_price if is_rental else "",
        "gla": gla,
        "total_rooms": total_rooms,
        "bedrooms": bedrooms,
        "bathrooms": bathrooms,
        "location": location,
        "view": view,
        "site": site,
        "quality": quality,
        "age": age,
        "metadata": meta_dict
    }



def extract_photos_from_xml(
    xml_path_or_bytes: Any,
    max_photos: int = 100,
    dpi: int = 72,
    include_images: bool = True,
    reference_records: Optional[Dict[str, Any]] = None
) -> List[Dict[str, Any]]:
    """
    Dynamically extracts all photos and their labels/captions from any MISMO 2.6 XML file.
    Supports all appraisal software platforms (ACI, TOTAL by a la mode, ClickFORMS, Bradford, etc.).
    Extracts high-resolution images, pairs them with intelligent spatial labels, and categorizes them:
    'Subject', 'Interior', 'Comparable', 'Rental', 'Sketch', 'Map', and 'General'.
    """
    if fitz is None:
        return []

    # 1. Read XML string
    xml_text = ""
    try:
        if isinstance(xml_path_or_bytes, (str, os.PathLike)) and os.path.exists(str(xml_path_or_bytes)):
            with open(str(xml_path_or_bytes), "r", encoding="utf-8", errors="ignore") as f:
                xml_text = f.read()
        elif isinstance(xml_path_or_bytes, bytes):
            xml_text = xml_path_or_bytes.decode("utf-8", errors="ignore")
        elif isinstance(xml_path_or_bytes, str):
            xml_text = xml_path_or_bytes
    except Exception:
        return []

    if not xml_text:
        return []

    # 2. Extract base64 encoded PDF from <DOCUMENT> or <EMBEDDED_FILE>
    pdf_bytes = None
    m_doc = re.search(r"<DOCUMENT[^>]*>([^<]{1000,})</DOCUMENT>", xml_text)
    if m_doc:
        try:
            pdf_bytes = base64.b64decode(m_doc.group(1).strip())
        except Exception:
            pass

    if not pdf_bytes:
        m_emb = re.search(r"<EMBEDDED_FILE[^>]*>([^<]{1000,})</EMBEDDED_FILE>", xml_text)
        if m_emb:
            try:
                pdf_bytes = base64.b64decode(m_emb.group(1).strip())
            except Exception:
                pass

    if not pdf_bytes:
        return []

    try:
        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    except Exception:
        return []

    if reference_records is None:
        reference_records = {"subject": None, "sales_comps": [], "rental_comps": []}
        try:
            # 1. Subject from XML tags
            m_prop = re.search(r'<(?:_|PROPERTY_)?StreetAddress>([^<]+)', xml_text, re.I)
            if not m_prop:
                m_prop = re.search(r'StreetAddress=["\']([^"\']+)["\']', xml_text, re.I)
            m_city = re.search(r'<(?:_|PROPERTY_)?City>([^<]+)', xml_text, re.I) or re.search(r'City=["\']([^"\']+)["\']', xml_text, re.I)
            m_state = re.search(r'<(?:_|PROPERTY_)?State>([^<]+)', xml_text, re.I) or re.search(r'State=["\']([^"\']+)["\']', xml_text, re.I)
            m_zip = re.search(r'<(?:_|PROPERTY_)?PostalCode>([^<]+)', xml_text, re.I) or re.search(r'PostalCode=["\']([^"\']+)["\']', xml_text, re.I)
            if m_prop:
                st = m_prop.group(1).strip()
                city = m_city.group(1).strip() if m_city else ""
                state = m_state.group(1).strip() if m_state else ""
                zipc = m_zip.group(1).strip() if m_zip else ""
                full = f"{st}, {city}, {state} {zipc}".strip(", ")
                reference_records["subject"] = {"street": st, "city": city, "state": state, "zipcode": zipc, "address": full}

            # 2. Extract from PDF text if doc is available
            if doc:
                for pno in range(len(doc)):
                    txt = doc[pno].get_text()
                    if not reference_records["subject"] and any(k in txt.upper() for k in ["SUBJECT PROPERTY", "UNIFORM RESIDENTIAL"]):
                        m_addr = re.search(r'Property\s+Address\s*[:\n]\s*([^\n]+)', txt, re.I)
                        if m_addr:
                            reference_records["subject"] = {"street": m_addr.group(1).strip(), "address": m_addr.group(1).strip()}
                    if ("RENTAL PHOTO PAGE" in txt.upper() or "DLSTRNT" in txt.upper()):
                        for m in re.finditer(r'Rental\s+(\d+)\s*\n(?:[^\n]*\n){1,15}?(\d+\s+[^\n]+)\s*\n([0-9.]+\s*miles?[^\n]*)', txt, re.I):
                            r_num = int(m.group(1))
                            r_addr = m.group(2).strip()
                            r_prox = m.group(3).strip()
                            if not any(r["comp_num"] == r_num for r in reference_records["rental_comps"]):
                                reference_records["rental_comps"].append({
                                    "comp_num": r_num, "street": r_addr, "address": r_addr, "proximity": r_prox, "monthly_rent": ""
                                })
        except Exception:
            pass

    photos = []
    photo_count = 0

    # 3. Iterate through pages and extract photos using ultra-fast page.get_image_info
    skip_form_headers = [
        "UNIFORM RESIDENTIAL APPRAISAL REPORT",
        "SMALL RESIDENTIAL INCOME PROPERTY",
        "INDIVIDUAL CONDOMINIUM UNIT",
        "APPRAISER'S CERTIFICATION",
        "SUPERVISORY APPRAISER'S CERTIFICATION",
        "APPRAISER INDEPENDENCE CERTIFICATION",
        "INVOICE",
        "ENGAGEMENT LETTER",
        "SCOPE OF WORK",
        "PRIVACY NOTICE",
        "STATEMENTS OF FACT"
    ]
    photo_override_headers = [
        "PHOTO ADDENDUM", "SUBJECT PROPERTY PHOTO", "COMPARABLE PROPERTY PHOTO", 
        "COMPARABLE RENTALS PHOTO", "ADDITIONAL PHOTOS", "BUILDING SKETCH", "LOCATION MAP", "FLOOR PLAN"
    ]

    for p_idx in range(len(doc)):
        if photo_count >= max_photos:
            break
        page = doc[p_idx]
        p_no = p_idx + 1
        raw_text = page.get_text() or ""
        raw_upper = raw_text.upper()

        # Skip standard form report pages where images are only digital signatures or company headers
        is_form_report_page = (
            any(h in raw_upper for h in skip_form_headers) and 
            not any(k in raw_upper for k in photo_override_headers)
        )
        if is_form_report_page:
            continue

        img_infos = page.get_image_info()
        if not img_infos:
            continue

        # Collect placed image rectangles (keep strips with height >= 6 for merging)
        rects = []
        for item in img_infos:
            bbox = item.get("bbox")
            if bbox:
                r = fitz.Rect(bbox)
                if r.width >= 50 and r.height >= 6:
                    rects.append(r)

        if not rects:
            continue

        # Merge horizontal strips (ACI / ClickFORMS style strip tiling)
        clusters = []
        rects.sort(key=lambda r: (round(r.x0 / 20), r.y0))
        for r in rects:
            merged = False
            for c in clusters:
                is_slice = (c.height < 60 or r.height < 60)
                overlaps = (r.y0 < c.y1 - 5)
                if abs(c.x0 - r.x0) < 18 and abs(c.x1 - r.x1) < 18 and (overlaps or (is_slice and r.y0 <= c.y1 + 12)):
                    c.y1 = max(c.y1, r.y1)
                    merged = True
                    break
            if not merged:
                clusters.append(fitz.Rect(r))

        # Filter out thin dividers or tiny graphics (< 70 pt in width or < 60 pt in height)
        photo_frames = [c for c in clusters if (c.width >= 70 and c.height >= 60 and (c.width * c.height) >= 5000)]
        if not photo_frames:
            continue

        # Filter out full-page form background images on text addenda pages
        if len(photo_frames) == 1:
            f = photo_frames[0]
            if f.height > 600 and any(h in raw_upper for h in ["TEXT ADDENDUM", "APPRAISAL ADDENDUM", "INVOICE", "ENGAGEMENT"]):
                continue

        # Sort frames: top-to-bottom, left-to-right
        photo_frames.sort(key=lambda r: (round(r.y0 / 50), r.x0))

        blocks = page.get_text("blocks")
        body_blocks = [b for b in blocks if b[1] >= 82] # Ignore page top header metadata

        for frame in photo_frames:
            if photo_count >= max_photos:
                break

            best_label = ""
            unit_str = ""

            # Check Layout A: Text to the right of photo (TOTAL & ACI 3-photo layouts)
            right_blocks = [
                b for b in body_blocks 
                if b[0] >= frame.x1 - 35 and abs(b[1] - frame.y0) < 65
            ]
            if right_blocks:
                right_blocks.sort(key=lambda b: (abs(b[1] - frame.y0), b[0]))
                for b in right_blocks:
                    txt = b[4].strip()
                    for line in txt.split("\n"):
                        line = line.strip()
                        if line and not any(skip in line.lower() for skip in [
                            "appraised date", "appraised value", "sale date", "sale price",
                            "form 1004", "total appraisal", "1-800-alamode", "page #", "aciweb", "int6ar"
                        ]):
                            if re.match(r"^[\d,\.\$\s\/]+$", line) and len(line) < 15:
                                continue
                            if not best_label and len(line) < 40:
                                best_label = line
                                break
                    if best_label:
                        break

            # Check Layout B: Text directly below photo (ACI 6-photo interior grid layout)
            if not best_label:
                below_blocks = [
                    b for b in body_blocks 
                    if (0 <= b[1] - frame.y1 < 65) and (abs(b[0] - frame.x0) < 85 or abs(b[2] - frame.x1) < 85)
                ]
                if below_blocks:
                    label_parts = []
                    for b in below_blocks:
                        for line in b[4].strip().split("\n"):
                            line = line.strip()
                            if line and len(line) < 40 and not any(skip in line.lower() for skip in [
                                "aciweb", "int6ar", "page", "appraisal"
                            ]):
                                if "UNIT" in line.upper():
                                    unit_str = line
                                elif line not in label_parts:
                                    label_parts.append(line)
                    if unit_str and unit_str not in label_parts:
                        best_label = f"{unit_str} - " + " ".join(label_parts[:2])
                    elif label_parts:
                        best_label = " ".join(label_parts[:2])

            # Check Layout C: Text directly above photo
            if not best_label:
                above_blocks = [
                    b for b in body_blocks 
                    if (0 <= frame.y0 - b[3] < 35) and (abs(b[0] - frame.x0) < 85 or abs(b[2] - frame.x1) < 85)
                ]
                if above_blocks:
                    for b in above_blocks:
                        for line in b[4].strip().split("\n"):
                            line = line.strip()
                            if line and len(line) < 40 and not any(skip in line.lower() for skip in ["aciweb", "page"]):
                                best_label = line
                                break

            # Skip digital signature labels
            if any(sig_w in (best_label or "").lower() for sig_w in [
                "signature", "appraiser signature", "supervisory appraiser", "review appraiser"
            ]):
                continue

            # Category detection based on label and page context
            category = "General"
            lbl_upper = (best_label or "").upper()
            if any(k in lbl_upper for k in ["FRONT", "REAR", "STREET", "SIDE", "YARD", "EXTERIOR", "DRIVEWAY"]):
                category = "Subject"
            elif any(k in lbl_upper for k in ["LIVING", "KITCHEN", "BATH", "BED", "DINING", "FAMILY", "BASEMENT", "ROOM", "DEN", "OFFICE", "NOOK", "LAUNDRY", "ALARM", "FURNACE", "HEATER", "GARAGE"]):
                category = "Interior"
            elif any(k in lbl_upper for k in ["COMPARABLE", "COMP"]):
                category = "Comparable"
            elif any(k in lbl_upper for k in ["RENTAL", "LEASE"]):
                category = "Rental"
            elif any(k in lbl_upper or k in raw_upper for k in ["SKETCH", "FLOORPLAN"]):
                category = "Sketch"
            elif any(k in lbl_upper or k in raw_upper for k in ["MAP", "PLAT", "AERIAL", "FLOOD"]):
                category = "Map"
            elif any(k in raw_upper for k in ["SUBJECT PROPERTY PHOTO", "SUBJECT PHOTO"]):
                category = "Subject"
            elif any(k in raw_upper for k in ["INTERIOR PHOTO"]):
                category = "Interior"

            if not best_label:
                if category == "Sketch":
                    best_label = "Building Floorplan Sketch"
                elif category == "Map":
                    for m_term in ["PLAT MAP", "FLOOD MAP", "AERIAL MAP", "LOCATION MAP", "TAX MAP"]:
                        if m_term in raw_upper:
                            best_label = m_term.title()
                            break
                    if not best_label:
                        best_label = "Map Exhibit"
                else:
                    best_label = f"{category} Photo"

            # Render image if requested
            base64_preview = ""
            w_px, h_px = round(frame.width), round(frame.height)
            if include_images:
                try:
                    pix = page.get_pixmap(clip=frame, dpi=dpi)
                    w_px, h_px = pix.width, pix.height
                    img_bytes = pix.tobytes("jpeg", jpg_quality=70)
                    b64_enc = base64.b64encode(img_bytes).decode("ascii")
                    base64_preview = f"data:image/jpeg;base64,{b64_enc}"
                except Exception:
                    pass

            # Extract photo metadata (Subject, Comparable, Rental)
            comp_meta = {}
            if category in ["Comparable", "Rental", "Subject"] or any(k in raw_upper for k in [
                "COMPARABLE PHOTO", "COMPARABLE PROPERTY", "FORM PICPIX",
                "RENTAL PHOTO", "FORM DLSTRNT", "RENTALS PHOTO",
                "SUBJECT PROPERTY PHOTO", "SUBJECT PHOTO"
            ]):
                comp_meta = extract_comp_photo_metadata(page, frame, body_blocks, reference_records=reference_records)
                if comp_meta.get("category") and comp_meta.get("category") != "General":
                    category = comp_meta["category"]
                if comp_meta.get("title"):
                    best_label = comp_meta["title"]

            photo_count += 1
            photo_item = {
                "id": f"photo_{photo_count}",
                "caption": best_label,
                "title": best_label,
                "category": category,
                "page": p_no,
                "base64_preview": base64_preview,
                "image_data": base64_preview,
                "width": w_px,
                "height": h_px,
                "rect": {
                    "x0": round(frame.x0),
                    "y0": round(frame.y0),
                    "x1": round(frame.x1),
                    "y1": round(frame.y1)
                }
            }

            if comp_meta:
                is_rent = (category == "Rental") or comp_meta.get("is_rental", False)
                photo_item.update({
                    "is_rental": is_rent,
                    "comp_number": comp_meta.get("comp_num"),
                    "comp_num": comp_meta.get("comp_num"),
                    "street": comp_meta.get("street", ""),
                    "address": comp_meta.get("address", ""),
                    "proximity": comp_meta.get("proximity", ""),
                    "sale_price": comp_meta.get("sale_price", "") if not (category == "Subject") else "",
                    "rent_amount": comp_meta.get("rent_amount", "") or (comp_meta.get("sale_price", "") if is_rent else ""),
                    "monthly_rent": comp_meta.get("monthly_rent", "") or (comp_meta.get("sale_price", "") if is_rent else ""),
                    "gla": comp_meta.get("gla", ""),
                    "total_rooms": comp_meta.get("total_rooms", ""),
                    "bedrooms": comp_meta.get("bedrooms", ""),
                    "bathrooms": comp_meta.get("bathrooms", ""),
                    "location": comp_meta.get("location", ""),
                    "view": comp_meta.get("view", ""),
                    "site": comp_meta.get("site", ""),
                    "quality": comp_meta.get("quality", ""),
                    "age": comp_meta.get("age", ""),
                    "metadata": comp_meta.get("metadata", {})
                })
                display_addr = comp_meta.get("street") or comp_meta.get("address")
                if display_addr and not any(display_addr in best_label for _ in [1]):
                    photo_item["caption"] = f"{best_label} - {display_addr}"

            photos.append(photo_item)

    # Final pass to ensure all Subject and Interior photos have the verified Subject property address
    sub_ref = (reference_records.get("subject") or {}) if reference_records else {}
    sub_addr = sub_ref.get("address") or f"{sub_ref.get('street', '')}, {sub_ref.get('city', '')}, {sub_ref.get('state', '')} {sub_ref.get('zipcode', '')}".strip(", ")
    sub_st = sub_ref.get("street") or ""
    if sub_addr or sub_st:
        for p in photos:
            if p.get("category") in ["Subject", "Interior"]:
                if not p.get("address"):
                    p["address"] = sub_addr
                if not p.get("street"):
                    p["street"] = sub_st

    return photos


def extract_fields_from_xml(xml_path_or_bytes: Any, extract_images: bool = True) -> Dict[str, Any]:
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
        signed_date = _format_date(report.attrib.get("AppraiserReportSignedDate", ""))
        purpose = report.attrib.get("AppraisalPurposeType", "")

    form_type = _detect_form_type_from_xml(root)

    # Appraiser & Parties
    appraiser_name = ""
    appraiser_company = ""
    appraiser_address = ""
    appraiser_phone = ""
    appraiser_email = ""
    lic_type = ""
    lic_id = ""
    lic_state = ""
    lic_exp = ""
    appr_state = ""
    state_cert_no = ""
    state_lic_no = ""
    
    lender_name = ""
    lender_client_name = ""
    lender_address = ""
    lender_email = ""
    borrower_name = ""

    appraiser_elem = parties.find("APPRAISER") if parties is not None else None
    if appraiser_elem is None:
        appraiser_elem = root.find(".//APPRAISER")

    if appraiser_elem is not None:
        appraiser_name = appraiser_elem.attrib.get("_Name", "")
        appraiser_company = appraiser_elem.attrib.get("_CompanyName", "")
        appr_st = appraiser_elem.attrib.get("_StreetAddress", "")
        appr_st2 = appraiser_elem.attrib.get("_StreetAddress2", "")
        appr_city = appraiser_elem.attrib.get("_City", "")
        appr_state = appraiser_elem.attrib.get("_State", "")
        appr_zip = appraiser_elem.attrib.get("_PostalCode", "")
        st_full = ", ".join([p for p in [appr_st, appr_st2] if p])
        cz_full = f"{appr_city}, {appr_state} {appr_zip}".strip(", ")
        appraiser_address = f"{st_full}, {cz_full}".strip(", ") if st_full and cz_full else (st_full or cz_full)

        for cp in appraiser_elem.findall(".//CONTACT_POINT"):
            t = cp.attrib.get("_Type", "").lower()
            val = cp.attrib.get("_Value", "")
            if ("phone" in t or "tel" in t) and not appraiser_phone:
                appraiser_phone = val
            elif "email" in t and not appraiser_email:
                appraiser_email = val

        appr_lic_elem = appraiser_elem.find("APPRAISER_LICENSE")
        if appr_lic_elem is None:
            appr_lic_elem = root.find(".//APPRAISER/APPRAISER_LICENSE")

        if appr_lic_elem is not None:
            lic_type = appr_lic_elem.attrib.get("_Type", "")
            lic_id = appr_lic_elem.attrib.get("_Identifier", "")
            lic_state = appr_lic_elem.attrib.get("_State", "") or appr_state
            lic_exp = _format_date(appr_lic_elem.attrib.get("_ExpirationDate", ""))

            if "lic" in lic_type.lower():
                state_lic_no = lic_id
            elif "cert" in lic_type.lower():
                state_cert_no = lic_id
            elif "lic" in lic_id.lower():
                state_lic_no = lic_id
            else:
                state_cert_no = lic_id

    # Supervisory Appraiser
    supervisor_elem = parties.find("SUPERVISOR") if parties is not None else None
    if supervisor_elem is None and parties is not None:
        supervisor_elem = parties.find("SUPERVISORY_APPRAISER")
    if supervisor_elem is None:
        supervisor_elem = root.find(".//SUPERVISOR")
    if supervisor_elem is None:
        supervisor_elem = root.find(".//SUPERVISORY_APPRAISER")

    sup_name = supervisor_elem.attrib.get("_Name", "") if supervisor_elem is not None else ""
    sup_company = supervisor_elem.attrib.get("_CompanyName", "") if supervisor_elem is not None else ""
    sup_st = supervisor_elem.attrib.get("_StreetAddress", "") if supervisor_elem is not None else ""
    sup_city = supervisor_elem.attrib.get("_City", "") if supervisor_elem is not None else ""
    sup_st_code = supervisor_elem.attrib.get("_State", "") if supervisor_elem is not None else ""
    sup_zip = supervisor_elem.attrib.get("_PostalCode", "") if supervisor_elem is not None else ""
    sup_address = f"{sup_st}, {sup_city}, {sup_st_code} {sup_zip}".strip(", ") if sup_st or sup_city else ""

    sup_phone = ""
    sup_email = ""
    if supervisor_elem is not None:
        for cp in supervisor_elem.findall(".//CONTACT_POINT"):
            t = cp.attrib.get("_Type", "").lower()
            val = cp.attrib.get("_Value", "")
            if ("phone" in t or "tel" in t) and not sup_phone:
                sup_phone = val
            elif "email" in t and not sup_email:
                sup_email = val

    sup_lic_elem = supervisor_elem.find("APPRAISER_LICENSE") if supervisor_elem is not None else None
    sup_lic_type = sup_lic_elem.attrib.get("_Type", "") if sup_lic_elem is not None else ""
    sup_lic_id = sup_lic_elem.attrib.get("_Identifier", "") if sup_lic_elem is not None else ""
    sup_lic_state = sup_lic_elem.attrib.get("_State", "") if sup_lic_elem is not None else ""
    sup_lic_exp = _format_date(sup_lic_elem.attrib.get("_ExpirationDate", "")) if sup_lic_elem is not None else ""

    sup_cert_no = ""
    sup_lic_no = ""
    if "cert" in sup_lic_type.lower():
        sup_cert_no = sup_lic_id
    elif "lic" in sup_lic_type.lower():
        sup_lic_no = sup_lic_id
    elif sup_lic_id:
        sup_cert_no = sup_lic_id

    # Lender & Borrower
    if parties is not None:
        lender_elem = parties.find("LENDER")
        if lender_elem is not None:
            lender_name = lender_elem.attrib.get("_UnparsedName", "") or lender_elem.attrib.get("_Name", "") or lender_elem.attrib.get("_CompanyName", "")
            lender_address = lender_elem.attrib.get("AppraisalFormsUnparsedAddress", "") or f"{lender_elem.attrib.get('_StreetAddress', '')}, {lender_elem.attrib.get('_StreetAddress2', '')}".strip(", ")
            for cp in lender_elem.findall(".//CONTACT_POINT"):
                if "email" in cp.attrib.get("_Type", "").lower() and not lender_email:
                    lender_email = cp.attrib.get("_Value", "")

            # Check contact detail name under LENDER (e.g. FastApp)
            cd_elem = lender_elem.find(".//CONTACT_DETAIL")
            if cd_elem is not None:
                lender_client_name = cd_elem.attrib.get("_Name", "").strip()

        borrower_elem = parties.find("BORROWER")
        if borrower_elem is not None:
            borrower_name = borrower_elem.attrib.get("_UnparsedName", "")

    # Fallback if lender_name is placeholder like 'SEE ADDENDUM' or missing
    if not lender_name or re.match(r"^(?:see\s+(?:addendum|attached|text|addenda)|refer\s+to|n/?a|none|undefined|null)\b", lender_name.strip(), re.I):
        early_narrative = " ".join(
            v for f in root.findall(".//FORM") for k, v in f.attrib.items()
            if ("text" in k.lower() or "comment" in k.lower() or "addendum" in k.lower()) and v
        )
        m_lender_add = re.search(r"(?:LENDER\s*[/]\s*CLIENT|LENDER\s+NAME|CLIENT\s+NAME)\s*[:\-]\s*([^\n\r<]{2,80})", early_narrative, re.I)
        if m_lender_add:
            cand_l = m_lender_add.group(1).strip()
            cand_l = re.split(r"\s+[-:]+", cand_l)[0].strip(" -:;,")
            if cand_l and not re.match(r"^(?:see\s+(?:addendum|attached)|n/?a|none)\b", cand_l, re.I):
                lender_name = cand_l

    # Priority 1: MANAGEMENT_COMPANY (AMC / Ordering Client Name for Certificate Page)
    mc_elem = root.find(".//MANAGEMENT_COMPANY")
    if mc_elem is not None:
        gse_amc = (mc_elem.attrib.get("GSEManagementCompanyName", "") or mc_elem.attrib.get("_Name", "") or mc_elem.attrib.get("_UnparsedName", "")).strip()
        if gse_amc:
            lender_client_name = gse_amc

    # Priority 2: Check <LENDER><NAME> if still empty
    if not lender_client_name and parties is not None:
        lender_elem = parties.find("LENDER")
        if lender_elem is not None:
            name_elem = lender_elem.find(".//NAME")
            if name_elem is not None:
                first = name_elem.attrib.get("_First", "").strip()
                last = name_elem.attrib.get("_Last", "").strip()
                if first or last:
                    lender_client_name = f"{first} {last}".strip()

    # Priority 3: Fallback to lender_name if no separate ordering client/AMC exists
    if not lender_client_name:
        lender_client_name = lender_name

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
    sa_elem = None

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
        zcomp_raw = site_elem.attrib.get("_ZoningComplianceType", "")
        if "nonconforming" in zcomp_raw.lower() or "grandfathered" in zcomp_raw.lower():
            zoning_comp = "Legal Nonconforming (Grandfathered Use)"
        elif "no zoning" in zcomp_raw.lower() or zcomp_raw.lower() == "nozoning":
            zoning_comp = "No Zoning"
        elif "illegal" in zcomp_raw.lower():
            zoning_comp = "Illegal (describe)"
        elif zcomp_raw.lower() == "legal":
            zoning_comp = "Legal"
        else:
            zoning_comp = zcomp_raw

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

    if not zoning_comp:
        z_elem = root.find(".//*[@_ZoningComplianceType]")
        if z_elem is not None:
            zcomp_raw = z_elem.attrib.get("_ZoningComplianceType", "")
            if "nonconforming" in zcomp_raw.lower() or "grandfathered" in zcomp_raw.lower():
                zoning_comp = "Legal Nonconforming (Grandfathered Use)"
            elif "no zoning" in zcomp_raw.lower() or zcomp_raw.lower() == "nozoning":
                zoning_comp = "No Zoning"
            elif "illegal" in zcomp_raw.lower():
                zoning_comp = "Illegal (describe)"
            elif zcomp_raw.lower() == "legal":
                zoning_comp = "Legal"
            else:
                zoning_comp = zcomp_raw

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

    one_unit = ""
    two_four_unit = ""
    multi_family = ""
    commercial = ""
    other_use = ""
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
            pval = f"{ppercent}%" if ppercent else ""
            
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



    # Valuation / Reconciliation
    appraised_val = ""
    effective_date = ""
    if valuation is not None:
        appraised_val = _clean_currency(valuation.attrib.get("PropertyAppraisedValueAmount", ""))
        effective_date = _format_date(valuation.attrib.get("AppraisalEffectiveDate", ""))

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
            c_addr_street = comp_loc.attrib.get("PropertyStreetAddress", "") if comp_loc is not None else ""
            c_addr_csz = comp_loc.attrib.get("PropertyStreetAddress2", "") if comp_loc is not None else ""
            c_city = comp_loc.attrib.get("PropertyCity", "") or comp_loc.attrib.get("_City", "") if comp_loc is not None else ""
            if not c_city and c_addr_csz:
                parts_csz = [p.strip() for p in c_addr_csz.split(",") if p.strip()]
                if parts_csz:
                    c_city = parts_csz[0]
            c_addr = f"{c_addr_street}, {c_addr_csz}".strip(", ") if (c_addr_street and c_addr_csz) else (c_addr_street or c_addr_csz)
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
                "Address": c_addr or (full_addr if seq == "0" else ""),
                "Street Address": c_addr_street or (prop_addr if seq == "0" else ""),
                "City": c_city or (prop_city if seq == "0" else ""),
                "City State Zip": c_addr_csz or (f"{prop_city}, {prop_state} {prop_zip}".strip(", ") if seq == "0" else ""),
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
                    f"Comparable #{seq}",
                    f"COMPARABLE SALE #{seq}",
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

    # Comparable Rental Data (Form 1025 Multifamily + Form 1007 Single Family)
    comparable_rental_data: Dict[str, Any] = {}
    single_family_rent_schedule: Dict[str, Any] = {}
    sf_rent_comps: Dict[str, Dict[str, Any]] = {}
    rent_reconciliation: Dict[str, Any] = {}

    # 1. Form 1025 Multifamily Rental Data
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

    # 2. Form 1007 Single Family Comparable Rent Schedule (MISMO 2.6 XML DOM)
    res_rent_sched = root.find(".//RESIDENTIAL_RENT_SCHEDULE")
    if res_rent_sched is None:
        res_rent_sched = root.find(".//SINGLE_FAMILY_RENT_SCHEDULE")

    if res_rent_sched is not None:
        for r in res_rent_sched.findall(".//RESIDENTIAL_RENTAL"):
            seq = r.attrib.get("PropertySequenceIdentifier", "")
            loc = r.find("LOCATION")
            st1 = loc.attrib.get("PropertyStreetAddress", "") if loc is not None else ""
            st2 = loc.attrib.get("PropertyStreetAddress2", "") if loc is not None else ""
            rental_full_addr = ", ".join([p for p in [st1, st2] if p]) if (st1 or st2) else ""
            prox = loc.attrib.get("ProximityToSubjectDescription", "") if loc is not None else ""
            
            l_start = r.attrib.get("LeaseStartDate", "")
            l_exp = r.attrib.get("LeaseExpirationDate", "")
            rent = _clean_currency(r.attrib.get("MonthlyRentAmount", ""))
            adj_rent = _clean_currency(r.attrib.get("ExpenseAdjustedMonthlyRentAmount", ""))
            src = r.attrib.get("DataSourceDescription", "")
            
            net_adj_amt = r.attrib.get("RentTotalAdjustmentAmount", "")
            net_pos = r.attrib.get("RentTotalAdjustmentPositiveIndicator", "Y")
            net_adj = ""
            if net_adj_amt:
                sign = "+" if net_pos == "Y" else "-"
                net_adj = f"{sign} {_clean_currency(net_adj_amt)}"
                
            mkt_rent = _clean_currency(r.attrib.get("MarketAdjustedMonthlyRentAmount", ""))
            
            c_dict = {
                "Address": rental_full_addr,
                "Proximity to Subject": prox,
                "Date Lease Begins": l_start,
                "Date Lease Expires": l_exp,
                "Monthly Rental": rent,
                "Adjusted Monthly Rent": adj_rent,
                "Data Source": src,
                "Net Adj. (total)": net_adj,
                "Indicated Monthly Market Rent": mkt_rent,
            }
            
            for ra in r.findall("RENT_ADJUSTMENT"):
                t = ra.attrib.get("_Type", "")
                desc = ra.attrib.get("_Description", "")
                amt = _clean_currency(ra.attrib.get("_Amount", ""))
                if t == "RentConcessions":
                    c_dict["Concessions"] = desc
                elif t == "Location":
                    c_dict["Location/View"] = desc
                    if amt: c_dict["Location/View Adjustment"] = amt
                elif t == "View":
                    if c_dict.get("Location/View"):
                        c_dict["Location/View"] += f" {desc}"
                    else:
                        c_dict["Location/View"] = desc
                    if amt: c_dict["Location/View Adjustment"] = amt
                elif t == "Design":
                    c_dict["Design and Appeal"] = desc
                    if amt: c_dict["Design and Appeal Adjustment"] = amt
                elif t == "Appeal":
                    if c_dict.get("Design and Appeal"):
                        c_dict["Design and Appeal"] += f" {desc}"
                    else:
                        c_dict["Design and Appeal"] = desc
                    if amt: c_dict["Design and Appeal Adjustment"] = amt
                elif t == "Age":
                    c_dict["Age"] = desc
                    if amt: c_dict["Age Adjustment"] = amt
                elif t == "Condition":
                    c_dict["Condition"] = desc
                    if amt: c_dict["Condition Adjustment"] = amt
                elif t == "GrossLivingArea":
                    c_dict["Gross Living Area"] = desc
                    if amt: c_dict["Gross Living Area Adjustment"] = amt
                elif t in ["Basement", "OtherBasement"]:
                    c_dict["Other (e.g., basement, etc.)"] = desc
                    c_dict["Other (e.g., basement)"] = desc
                    c_dict["Other Basement"] = desc
                    if amt:
                        c_dict["Other (e.g., basement, etc.) Adjustment"] = amt
                        c_dict["Other (e.g., basement) Adjustment"] = amt
                        c_dict["Other Basement Adjustment"] = amt
                elif t in ["Other", "Other2"]:
                    c_dict["Other:"] = desc
                    c_dict["Other"] = desc
                    if amt:
                        c_dict["Other: Adjustment"] = amt
                        c_dict["Other Adjustment"] = amt

            if seq == "0":
                single_family_rent_schedule = c_dict
            else:
                comp_key = f"COMPARABLE NO. {seq}"
                sf_rent_comps[comp_key] = c_dict

        # Parse OTHER_FEATURE_ADJUSTMENT under RESIDENTIAL_RENT_SCHEDULE
        all_ofa = res_rent_sched.findall("OTHER_FEATURE_ADJUSTMENT")
        if all_ofa:
            for seq_id, field_name in [("1", "Other (e.g., basement, etc.)"), ("2", "Other:")]:
                feat_items = [el for el in all_ofa if el.attrib.get("PropertyFeatureSequenceIdentifier") == seq_id]
                unkeyed = [el for el in all_ofa if not el.attrib.get("PropertyFeatureSequenceIdentifier")]
                subj_idx = int(seq_id) - 1
                if len(unkeyed) > subj_idx:
                    s_desc = unkeyed[subj_idx].attrib.get("PropertyFeatureDescription", "")
                    if s_desc:
                        single_family_rent_schedule[field_name] = s_desc
                        if field_name == "Other:":
                            single_family_rent_schedule["Other"] = s_desc
                        elif field_name == "Other (e.g., basement, etc.)":
                            single_family_rent_schedule["Other (e.g., basement)"] = s_desc
                elif feat_items:
                    s_desc = feat_items[0].attrib.get("PropertyFeatureDescription", "")
                    if s_desc and len(feat_items) > len(sf_rent_comps):
                        single_family_rent_schedule[field_name] = s_desc
                        if field_name == "Other:":
                            single_family_rent_schedule["Other"] = s_desc
                        elif field_name == "Other (e.g., basement, etc.)":
                            single_family_rent_schedule["Other (e.g., basement)"] = s_desc

                for comp_idx, el in enumerate(feat_items, start=1):
                    c_key = f"COMPARABLE NO. {comp_idx}"
                    if c_key in sf_rent_comps:
                        c_desc = el.attrib.get("PropertyFeatureDescription", "")
                        c_amt = _clean_currency(el.attrib.get("PropertyFeatureAdjustmentAmount", ""))
                        if c_desc:
                            sf_rent_comps[c_key][field_name] = c_desc
                            if field_name == "Other:":
                                sf_rent_comps[c_key]["Other"] = c_desc
                            elif field_name == "Other (e.g., basement, etc.)":
                                sf_rent_comps[c_key]["Other (e.g., basement)"] = c_desc
                        if c_amt:
                            sf_rent_comps[c_key][f"{field_name} Adjustment"] = c_amt
                            if field_name == "Other:":
                                sf_rent_comps[c_key]["Other Adjustment"] = c_amt
                            elif field_name == "Other (e.g., basement, etc.)":
                                sf_rent_comps[c_key]["Other (e.g., basement) Adjustment"] = c_amt

    # Embedded PDF Check & Form 1007 Rent Schedule Page Extraction
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

                # Check for Form 1007 Comparable Rent Schedule in embedded PDF
                rent_pages = find_comparable_rent_schedule_pages(doc)
                if rent_pages:
                    for page_offset, p_idx in enumerate(rent_pages):
                        start_comp = 1 + (page_offset * 3)
                        pdf_rent_data = extract_rent_schedule_from_pdf_page(doc[p_idx], start_comp_num=start_comp)
                        # Merge Subject rent fields
                        for sk, sv in pdf_rent_data.get("Subject", {}).items():
                            if sv and (sk not in single_family_rent_schedule or not single_family_rent_schedule[sk]):
                                single_family_rent_schedule[sk] = sv
                        # Merge Comps
                        for ck, cv in pdf_rent_data.get("comparables", {}).items():
                            if ck not in sf_rent_comps:
                                sf_rent_comps[ck] = cv
                            else:
                                for fk, fv in cv.items():
                                    if fv and (fk not in sf_rent_comps[ck] or not sf_rent_comps[ck][fk]):
                                        sf_rent_comps[ck][fk] = fv
                        # Merge Reconciliation
                        for rk, rv in pdf_rent_data.get("reconciliation", {}).items():
                            if rv:
                                rent_reconciliation[rk] = rv
            except Exception:
                pass

    # Populate comparable_rental_data with Form 1007 Comps
    for comp_name, comp_dict in sf_rent_comps.items():
        comparable_rental_data[comp_name] = comp_dict
        m_cnum = re.search(r'\d+', comp_name)
        if m_cnum:
            c_num = m_cnum.group(0)
            comparable_rental_data[f"Rental {c_num}"] = comp_dict
            comparable_rental_data[f"Comparable Rental #{c_num}"] = comp_dict
            comparable_rental_data[f"COMPARABLE RENTAL #{c_num}"] = comp_dict
            comparable_rental_data[f"Comparable Rental No #{c_num}"] = comp_dict
            comparable_rental_data[f"COMPARABLE Rental No #{c_num}"] = comp_dict

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
                pud_fee_month = "Yes"
                pud_fee_year = ""
            elif "year" in pud_fee_period.lower() or "annual" in pud_fee_period.lower():
                pud_fee_year = "Yes"
                pud_fee_month = ""
            else:
                pud_fee_month = "Yes"
                pud_fee_year = ""
            hoa_fee = f"${pud_fee_amt}"
            if not pud_indicator:
                pud_indicator = "Yes"
        elif raw_amt == "0":
            hoa_fee = "0"
            if pud_indicator == "Yes":
                pud_fee_amt = "0"

    pud_info_section = {
        "PUD Fees $": pud_fee_amt,
        "PUD Fees (per month)": pud_fee_amt if pud_fee_month == "Yes" else "",
        "PUD Fees (per year)": pud_fee_amt if pud_fee_year == "Yes" else "",
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

    # Narrative Comments from Addendum, XML DOM attributes, and Embedded PDF
    addendum_text = ""
    for f in root.findall(".//FORM"):
        for k, v in f.attrib.items():
            if "text" in k.lower() or "comment" in k.lower():
                addendum_text += " " + v

    # Collect all narrative attributes and text across the entire MISMO XML DOM
    dom_narratives = []
    for elem in root.iter():
        for attr_k, attr_v in elem.attrib.items():
            if any(k in attr_k.lower() for k in ["description", "comment", "narrative", "statement", "marketconditions", "uspap"]):
                dom_narratives.append(attr_v)
        if elem.text and not elem.text.startswith("JVBERi"):
            elem_t = elem.text.strip()
            if len(elem_t) > 10 and not elem_t.startswith("<?xml"):
                dom_narratives.append(elem_t)

    pdf_text = ""
    pdf_doc = None
    if embedded_doc is not None and embedded_doc.text:
        if fitz is not None:
            try:
                pdf_bytes = base64.b64decode(embedded_doc.text.strip())
                pdf_doc = fitz.open(stream=pdf_bytes, filetype="pdf")
                for p in pdf_doc:
                    pdf_text += " " + (p.get_text() or "")
            except Exception:
                pass

    full_narrative = "\n\n".join(t for t in [addendum_text] + dom_narratives + [pdf_text] if t).strip()

    # Second-pass fallback for lender_name if still placeholder or empty
    if not lender_name or re.match(r"^(?:see\s+(?:addendum|attached|text|addenda)|refer\s+to|n/?a|none|undefined|null)\b", lender_name.strip(), re.I):
        m_lender_add = re.search(r"(?:LENDER\s*[/]\s*CLIENT|LENDER\s+NAME|CLIENT\s+NAME)\s*[:\-]\s*([^\n\r<]{2,80})", full_narrative, re.I)
        if m_lender_add:
            cand_l = m_lender_add.group(1).strip()
            cand_l = re.split(r"\s+[-:]+", cand_l)[0].strip(" -:;,")
            if cand_l and not re.match(r"^(?:see\s+(?:addendum|attached)|n/?a|none)\b", cand_l, re.I):
                lender_name = cand_l
                if not lender_client_name or re.match(r"^(?:see\s+(?:addendum|attached|text|addenda)|refer\s+to|n/?a|none|undefined|null)\b", lender_client_name.strip(), re.I):
                    lender_client_name = lender_name


    # ANSI (compulsory field)
    ansi_comment = "Not Present"
    ansi_candidates = []
    for s in re.split(r'(?<=[.?!;])\s+|[\r\n]+', full_narrative):
        s_clean = s.strip(" \t\r\n-•*")
        if re.search(r'\b(?:ANSI(?:[-\s]+Z765(?:[-\s]*\d{4})?)?|American\s+National\s+Standards\s+Institute)\b', s_clean, re.IGNORECASE):
            if len(s_clean) > 15 and not s_clean.endswith(':'):
                score = 0
                if re.search(r'Z765', s_clean, re.IGNORECASE): score += 5
                if re.search(r'standard', s_clean, re.IGNORECASE): score += 3
                if re.search(r'measure|calculat|accordance|complian|adher', s_clean, re.IGNORECASE): score += 4
                if len(s_clean) > 30: score += 2
                ansi_candidates.append((score, s_clean))
    if ansi_candidates:
        ansi_candidates.sort(key=lambda x: x[0], reverse=True)
        ansi_comment = ansi_candidates[0][1]
    elif ansi_comment == "Not Present":
        m_ansi = re.search(r'([^.?!;\n]*\b(?:ANSI(?:[-\s]+Z765(?:[-\s]*\d{4})?)?|American\s+National\s+Standards\s+Institute)\b[^.?!;\n]*(?:[.?!]|$))', full_narrative, re.IGNORECASE)
        if m_ansi:
            ansi_comment = m_ansi.group(0).strip(" \t\r\n-•*")
    
    # Exposure comment (compulsory field - checks USPAP Addendum page in embedded PDF first)
    exposure_comment = "Not Present"
    if pdf_doc is not None:
        try:
            for page in pdf_doc:
                pt = page.get_text() or ""
                if ("USPAP" in pt.upper() or "EXPOSURE" in pt.upper()) and ("REASONABLE EXPOSURE TIME" in pt.upper() or "EXPOSURE TIME" in pt.upper()):
                    blocks = page.get_text("blocks")
                    words = page.get_text("words")
                    for b in blocks:
                        b_text = b[4].strip()
                        if "my opinion of a reasonable exposure time" in b_text.lower():
                            prompt_bbox = b[:4]
                            cand_vals = [w[4] for w in words if w[0] >= prompt_bbox[2] - 15 and abs(w[1] - prompt_bbox[1]) < 25 and w[4].lower() not in ["is:", "is", "the", ":"]]
                            if cand_vals:
                                val = " ".join(cand_vals).strip()
                                for b2 in blocks:
                                    b2_t = " ".join(b2[4].split()).strip()
                                    if "reasonable exposure time" in b2_t.lower() and ("estimated to be" in b2_t.lower() or "typical exposure" in b2_t.lower() or "opinion of value" in b2_t.lower()):
                                        if len(b2_t) > 30 and "my opinion of a reasonable" not in b2_t.lower():
                                            exposure_comment = f"{val} ({b2_t})"
                                            break
                                if exposure_comment == "Not Present" and val:
                                    exposure_comment = val
                                break
                    if exposure_comment != "Not Present":
                        break
        except Exception:
            pass

    if exposure_comment == "Not Present":
        # Comprehensive scan across XML narrative and embedded document text
        exp_patterns = [
            re.compile(r'([^.?!;\n]*\b(?:reasonable\s+exposure\s+time\s+for\s+the\s+subject|exposure\s*(?:and\s*|or\s*|\/\s*|marketing\s*)?time\s+(?:for\s+the\s+subject\s+property\s+)?is\s+determined|exposure\s+marketing\s+time|estimated\s+exposure\s+time\s+is|opinion\s+of\s+(?:a\s+)?reasonable\s+exposure|opinion\s+of\s+exposure\s+time)\b[^.?!;\n]*[.?!]?)', re.IGNORECASE),
            re.compile(r'([^.?!;\n]*\b(?:market\s+value\s+stated\s+(?:within|in)\s+this\s+report\s+reflects\s+an\s+exposure\s+time)\b[^.?!;\n]*[.?!]?)', re.IGNORECASE),
            re.compile(r'([^.?!;\n]*\b(?:reasonable\s+exposure\s+time\s+(?:is|was|developed))\b[^.?!;\n]*[.?!]?)', re.IGNORECASE),
            re.compile(r'([^.?!;\n]*\b(?:exposure\s+time\s+is\s+estimated\s+at|exposure\s+time\s+of\s+\d+|exposure\s+time\s+under\s+\d+)\b[^.?!;\n]*[.?!]?)', re.IGNORECASE),
            re.compile(r'([^.?!;\n]*\b(?:reasonable\s*exposure\s*time|exposure\s*(?:and\s*|or\s*|\/\s*|marketing\s*)?time|expo\s*days|exposure\s*period|marketing\s*and\s*exposure)\b[^.?!;\n]*(?:[.?!]|$))', re.IGNORECASE),
        ]
        for pat in exp_patterns:
            m = pat.search(full_narrative)
            if m:
                cand_exp = m.group(0).strip(" \t\r\n-•*")
                if len(cand_exp) > 5 and "allowed for exposure in the open market" not in cand_exp.lower():
                    exposure_comment = cand_exp
                    break

    # Prior service comment (compulsory field - checks USPAP Addendum checkboxes first)
    prior_service_comment = "Not Present"
    if pdf_doc is not None:
        try:
            for page in pdf_doc:
                pt = page.get_text() or ""
                if ("USPAP" in pt.upper() or "CERTIFICATION" in pt.upper()) and ("THREE-YEAR PERIOD" in pt.upper() or "SERVICES" in pt.upper()):
                    blocks = page.get_text("blocks")
                    words = page.get_text("words")
                    opt_no_bbox = None
                    opt_have_bbox = None
                    for b in blocks:
                        b_text = " ".join(b[4].split()).strip()
                        if "no services, as an appraiser" in b_text.lower() or "not performed services, as an appraiser" in b_text.lower() or "performed no services" in b_text.lower():
                            opt_no_bbox = b[:4]
                        elif "have performed services" in b_text.lower() and "no services" not in b_text.lower():
                            opt_have_bbox = b[:4]

                    if opt_no_bbox or opt_have_bbox:
                        for w in words:
                            w_text = w[4].strip().upper()
                            if w_text in ["X", "[X]", "8", "[8]", "☒", "☑", "✓"] and w[0] < 50:
                                if opt_no_bbox and abs(w[1] - opt_no_bbox[1]) < 30:
                                    prior_service_comment = "I have NOT performed services, as an appraiser or in any other capacity, regarding the property that is the subject of this report within the three-year period immediately preceding acceptance of this assignment."
                                    break
                                elif opt_have_bbox and abs(w[1] - opt_have_bbox[1]) < 30:
                                    prior_service_comment = "I HAVE performed services, as an appraiser or in another capacity, regarding the property that is the subject of this report within the three-year period immediately preceding acceptance of this assignment."
                                    break
                    if prior_service_comment != "Not Present":
                        break
        except Exception:
            pass

    if prior_service_comment == "Not Present":
        prior_patterns = [
            re.compile(r'([^.?!;\n]*\b(?:performed\s+no\s+services|have\s+not\s+performed\s+(?:any\s+)?services|no\s+prior\s+services\s+performed|performed\s+any\s+prior\s+services)\b[^.?!;\n]*[.?!]?)', re.IGNORECASE),
            re.compile(r'([^.?!;\n]*\b(?:prior\s+services?)\s*[:\-]\s*[^.?!;\n]+[.?!]?)', re.IGNORECASE),
            re.compile(r'([^.?!;\n]*\bwithin\s+the\s+(?:three|3)\s*(?:-| )year\s*period\s*immediately\s*preceding[^.?!;\n]*[.?!]?)', re.IGNORECASE),
            re.compile(r'([^.?!;\n]*\b(?:have|has)\s+(?:not\s+)?appraised\s+(?:or\s+provided\s+services\s+for\s+)?the\s+subject\s+property\s+within\b[^.?!;\n]*[.?!]?)', re.IGNORECASE),
            re.compile(r'([^.?!;\n]*\b(?:not\s+appraised\s+the\s+subject\s+property\s+or\s+performed\s+any\s+prior\s+services)\b[^.?!;\n]*[.?!]?)', re.IGNORECASE),
        ]
        for pat in prior_patterns:
            m = pat.search(full_narrative)
            if m:
                cand_ps = m.group(0).strip(" \t\r\n-•*")
                if len(cand_ps) > 10:
                    prior_service_comment = cand_ps
                    break

    # USPAP Reporting Option (Appraisal Report vs Restricted Appraisal Report)
    uspap_reporting_option = "Appraisal Report"
    uspap_long_key = (
        "This report was prepared under the following USPAP reporting option:\n"
        "Appraisal Report A written report prepared under Standards Rule 2-2(a).\n"
        "Restricted Appraisal Report A written report prepared under Standards Rule 2-2(b)."
    )
    uspap_comment = ""
    if pdf_doc is not None:
        try:
            for page in pdf_doc:
                pt = page.get_text() or ""
                if "USPAP REPORTING OPTION" in pt.upper() or "STANDARDS RULE 2-2" in pt.upper() or "APPRAISAL AND REPORT IDENTIFICATION" in pt.upper():
                    blocks = page.get_text("blocks")
                    words = page.get_text("words")
                    rep_appr_bbox = None
                    rep_restr_bbox = None
                    for b in blocks:
                        bt = " ".join(b[4].split()).strip().lower()
                        if "standards rule 2-2(a)" in bt or "appraisal report this report was prepared" in bt:
                            rep_appr_bbox = b[:4]
                        elif "standards rule 2-2(b)" in bt or "restricted appraisal report" in bt:
                            rep_restr_bbox = b[:4]
                    if rep_appr_bbox or rep_restr_bbox:
                        for w in words:
                            wt = w[4].strip().upper()
                            if wt in ["X", "[X]", "8", "[8]", "☒", "☑", "✓"] and w[0] < 50:
                                if rep_appr_bbox and abs(w[1] - rep_appr_bbox[1]) < 30:
                                    uspap_reporting_option = "Appraisal Report (USPAP Standards Rule 2-2(a))"
                                    break
                                elif rep_restr_bbox and abs(w[1] - rep_restr_bbox[1]) < 30:
                                    uspap_reporting_option = "Restricted Appraisal Report (USPAP Standards Rule 2-2(b))"
                                    break

                    # Extract comments from USPAP page if present
                    comments_start_y = None
                    appraiser_sig_y = None
                    for b in blocks:
                        bt = " ".join(b[4].split()).strip().lower()
                        if "additional comments" in bt or "comments on appraisal and report identification" in bt:
                            comments_start_y = b[3]
                        if "appraiser:" in bt or "supervisory appraiser" in bt:
                            if appraiser_sig_y is None or b[1] < appraiser_sig_y:
                                appraiser_sig_y = b[1]
                    if comments_start_y:
                        limit_y = appraiser_sig_y if appraiser_sig_y and appraiser_sig_y > comments_start_y else (comments_start_y + 200.0)
                        c_words = [w for w in words if comments_start_y <= w[1] <= limit_y and w[0] >= 20 and w[2] <= 580]
                        c_words = [w for w in c_words if w[4].lower() not in ["additional", "comments", "appraiser:", "supervisory", "produced", "using", "aci", "software", "uspap_14"]]
                        if c_words:
                            c_words.sort(key=lambda w: (round(w[1] / 5.0) * 5.0, w[0]))
                            uspap_comment = " ".join(w[4] for w in c_words).strip()

                    if uspap_reporting_option != "Appraisal Report":
                        break
        except Exception:
            pass

    if not uspap_comment and full_narrative:
        m_comm = re.search(
            r'(?:Comments\s+on\s+Appraisal\s+and\s+Report\s+Identification|Restricted\s+Appraisal\s+Report(?:\s+Comments)?)\s*[:\n]\s*([^\n]+(?:\n[^\n]+){1,8})',
            full_narrative,
            re.IGNORECASE
        )
        if m_comm:
            c_cand = m_comm.group(1).strip()
            c_cand = re.split(r'(?:\n\s*(?:APPRAISER|SUPERVISORY|SIGNATURE|CERTIFICATION|Produce)|\Z)', c_cand, flags=re.IGNORECASE)[0].strip()
            if len(c_cand) > 5:
                uspap_comment = c_cand
    
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
    appraiser_fee = _extract_appraiser_fee(full_narrative=full_narrative, embedded_doc=embedded_doc)
    amc_license = ""

    # Check AMC license in narrative & attributes
    m_lic = re.search(r'AMC\s+(?:License|Lic|Reg|Registration)(?:\.|\s)*#?\s*(?:is|#|:)?\s*([A-Za-z0-9\-]+)', full_narrative, re.IGNORECASE)
    if m_lic:
        amc_license = m_lic.group(1).strip()

    if not amc_license and embedded_doc is not None and embedded_doc.text:
        try:
            pdf_bytes = base64.b64decode(embedded_doc.text.strip())
            if fitz is not None:
                pdf_doc = fitz.open(stream=pdf_bytes, filetype="pdf")
                for page in pdf_doc:
                    ptxt = page.get_text() or ""
                    ml = re.search(r'AMC\s+(?:License|Lic|Reg|Registration)(?:\.|\s)*#?\s*[:=\-]?\s*([A-Za-z0-9\-]+)', ptxt, re.IGNORECASE)
                    if ml:
                        amc_license = ml.group(1).strip()
                        break
                pdf_doc.close()
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

    # FHA Case Number
    fha_case_no = _extract_fha_case_number(root, report, full_narrative=full_narrative)

    # 1004MC Presence Detection
    has_1004mc, mc_source = _detect_1004mc_presence(root, embedded_doc=embedded_doc)
    mc_present_str = "Present" if has_1004mc else "Not Present"

    # USPAP / Appraisal and Report Identification Presence Detection
    has_uspap_ident, uspap_source = _detect_uspap_identification_presence(root, embedded_doc=embedded_doc)
    uspap_ident_str = "Present" if has_uspap_ident else "Not Present"

    # Invoice Presence Detection
    has_invoice, inv_source, inv_details = _detect_invoice_presence(root, embedded_doc=embedded_doc, full_narrative=full_narrative)
    inv_present_str = "Yes" if has_invoice else "No"

    # Build standard sections matching UI
    subject_section = {
        "1004MC Addendum": mc_present_str,
        "1004MC Present": "Yes" if has_1004mc else "No",
        "has_1004mc": has_1004mc,
        "USPAP / Appraisal and Report Identification": uspap_ident_str,
        "Appraisal and Report Identification": uspap_ident_str,
        "USPAP Addendum": uspap_ident_str,
        "has_uspap_identification": has_uspap_ident,
        "Invoice Attached": inv_present_str,
        "Invoice Present": inv_present_str,
        "has_invoice": has_invoice,
        "FHA Case No.": fha_case_no,
        "FHA Case #": fha_case_no,
        "FHA Case Number": fha_case_no,
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
        "HOA (per month)": pud_fee_month,
        "HOA(per year)": pud_fee_year,
        "HOA (per year)": pud_fee_year,
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
        "Reasonable Exposure Time": exposure_comment,
        "Reasonable Exposure Time Comment": exposure_comment,
        "Prior service comment": prior_service_comment,
        "Prior Service Comment": prior_service_comment,
        "USPAP Reporting Option": uspap_reporting_option,
        "USPAP Reporting Options": uspap_reporting_option,
        uspap_long_key: uspap_reporting_option,
        "This report was prepared under the following USPAP reporting option:": uspap_reporting_option,
        "Comments on Appraisal and Report Identification": uspap_comment,
        "Restricted Appraisal Report Comment": uspap_comment,
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

    nonconforming_comment = ""
    is_nonconforming = "nonconforming" in (zoning_comp or "").lower() or "grandfathered" in (zoning_comp or "").lower()
    if is_nonconforming:
        nonconforming_comment = _extract_nonconforming_rebuild_comment(
            full_narrative=full_narrative,
            dom_narratives=dom_narratives,
            root=root
        )

    site_section = {
        "Dimensions": site_dim,
        "Area": site_area,
        "Shape": site_shape,
        "View": site_view,
        "Specific Zoning Classification": zoning_class,
        "Zoning Description": zoning_desc,
        "Zoning Compliance": zoning_comp,
        "Legal Nonconforming (Grandfathered Use) comment": nonconforming_comment,
        "Legal Nonconforming comment": nonconforming_comment,
        "Nonconforming comment": nonconforming_comment,
        "Zoning Compliance comment": nonconforming_comment,
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
    ht_val = ""
    if ht_raw:
        if "warm" in ht_raw.lower() or "forced" in ht_raw.lower():
            ht_val = "FWA"
        elif "baseboard" in ht_raw.lower():
            ht_val = "HWBB"
        elif "radiant" in ht_raw.lower():
            ht_val = "Radiant"
        else:
            ht_val = ht_raw

    hf_val = ""
    if hf_raw:
        if "gas" in hf_raw.lower():
            hf_val = "Gas"
        elif "elec" in hf_raw.lower():
            hf_val = "Electric"
        elif "oil" in hf_raw.lower():
            hf_val = "Oil"
        else:
            hf_val = hf_raw.title()

    cooling_elem = struct_elem.find("COOLING") if struct_elem is not None else None
    cooling_val = ""
    if cooling_elem is not None:
        c_central = cooling_elem.attrib.get("_CentralizedIndicator", "N")
        c_indiv = cooling_elem.attrib.get("_IndividualIndicator", "N")
        c_desc = cooling_elem.attrib.get("_Description", "") or cooling_elem.attrib.get("_Type", "")
        if c_central == "Y":
            cooling_val = "Central Air Conditioning"
        elif c_indiv == "Y":
            cooling_val = "Individual"
        elif c_desc:
            cooling_val = c_desc

    # Exterior Features (Material / Condition)
    ext_dict = {ef.attrib.get("_Type", ""): ef.attrib.get("_Description", "") for ef in struct_elem.findall("EXTERIOR_FEATURE")} if struct_elem is not None else {}
    found_walls = _format_mat_cond(ext_dict.get("Foundation", ""))
    ext_walls = _format_mat_cond(ext_dict.get("Walls", ""))
    roof_surf = _format_mat_cond(ext_dict.get("RoofSurface", ""))
    gutters = _format_mat_cond(ext_dict.get("GuttersAndDownspouts", ""))
    window_type = _format_mat_cond(ext_dict.get("WindowType", ""))
    storm_sash = ext_dict.get("WindowStormSash", "") or "None"
    screens = ext_dict.get("WindowScreens", "") or "None"

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
                amenity_details["Fence"] = desc if desc else "Yes"
            elif at in ["Patio", "Deck"] and (ex == "Y" or (desc and desc.lower() != "none")):
                amenities_list.append("Patio/Deck")
                amenity_details["Patio/Deck"] = desc if desc else at
            elif at == "Porch" and (ex == "Y" or (desc and desc.lower() != "none")):
                amenities_list.append("Porch")
                amenity_details["Porch"] = desc if desc else at
            elif at == "Pool" and (ex == "Y" or (desc and desc.lower() != "none")):
                amenities_list.append("Pool")
                amenity_details["Pool"] = desc if desc else "Yes"
    amenities_val = ", ".join(dict.fromkeys(amenities_list)) if amenities_list else "None"

    # Interior Features (Material / Condition)
    int_dict = {ifeat.attrib.get("_Type", ""): ifeat.attrib.get("_ConditionDescription", "") for ifeat in struct_elem.findall("INTERIOR_FEATURE")} if struct_elem is not None else {}
    floors = _format_mat_cond(int_dict.get("Floors", ""))
    walls = _format_mat_cond(int_dict.get("Walls", ""))
    trim = _format_mat_cond(int_dict.get("TrimAndFinish", ""))
    bath_floor = _format_mat_cond(int_dict.get("BathroomFloors", ""))
    bath_wainscot = _format_mat_cond(int_dict.get("BathroomWainscot", ""))

    # Car Storage
    driveway_cars = "0"
    garage_cars = "0"
    carport_cars = "0"
    garage_att = ""

    # Check all CAR_STORAGE elements in the entire XML tree
    for cs in root.findall(".//CAR_STORAGE"):
        att = cs.attrib.get("_AttachmentType", "") or cs.attrib.get("AttachmentType", "")
        if att and not garage_att:
            a_low = att.lower()
            if "built" in a_low:
                garage_att = "Built-in"
            elif "att" in a_low:
                garage_att = "Attached"
            elif "det" in a_low:
                garage_att = "Detached"
            else:
                garage_att = att

        for loc in cs.findall("CAR_STORAGE_LOCATION"):
            lt = loc.attrib.get("_Type", "")
            cnt = loc.attrib.get("ParkingSpacesCount", "0")
            ex = loc.attrib.get("_ExistsIndicator", "Y")
            loc_att = loc.attrib.get("_AttachmentType", "") or loc.attrib.get("AttachmentType", "")
            if loc_att and not garage_att:
                la_low = loc_att.lower()
                if "built" in la_low:
                    garage_att = "Built-in"
                elif "att" in la_low:
                    garage_att = "Attached"
                elif "det" in la_low:
                    garage_att = "Detached"
            if lt == "Driveway" and ex != "N":
                driveway_cars = cnt if cnt != "0" else "1"
            elif lt == "Garage" and ex != "N":
                garage_cars = cnt
            elif lt == "Carport" and ex != "N":
                carport_cars = cnt

    # If garage_att still empty, check STRUCTURE AttachmentType
    if not garage_att:
        for st in root.findall(".//STRUCTURE"):
            st_att = st.attrib.get("AttachmentType", "") or st.attrib.get("_AttachmentType", "")
            if st_att:
                sa_low = st_att.lower()
                if "built" in sa_low:
                    garage_att = "Built-in"
                    break
                elif "att" in sa_low:
                    garage_att = "Attached"
                    break
                elif "det" in sa_low:
                    garage_att = "Detached"
                    break

    # If garage_att still empty, check sales grid subject car storage feature adjustment
    if not garage_att:
        for feat in root.findall(".//_FEATURE_ADJUSTMENT"):
            ft = (feat.attrib.get("_Type", "") or "").lower()
            if "carstorage" in ft or "garage" in ft:
                desc = (feat.attrib.get("_Description", "") or "").lower()
                if "att" in desc or re.search(r'\d+ga\b', desc):
                    garage_att = "Attached"
                    break
                elif "det" in desc or re.search(r'\d+gd\b', desc):
                    garage_att = "Detached"
                    break
                elif "built" in desc or re.search(r'\d+gbi\b', desc):
                    garage_att = "Built-in"
                    break

    driveway_surface = ""
    for sf in root.findall(".//SITE_FEATURE"):
        if sf.attrib.get("_Type") == "Driveway":
            driveway_surface = sf.attrib.get("_Comment", "")
    if not driveway_surface:
        driveway_surface = "None"
    else:
        if "/" in driveway_surface:
            driveway_surface = driveway_surface.split("/")[0].strip()
        if driveway_surface.upper() == "CONC":
            driveway_surface = "Concrete"

    cs_types = []
    try:
        d_cnt = int(float(driveway_cars or "0"))
    except Exception:
        d_cnt = 0
    try:
        g_cnt = int(float(garage_cars or "0"))
    except Exception:
        g_cnt = 0
    try:
        c_cnt = int(float(carport_cars or "0"))
    except Exception:
        c_cnt = 0

    if d_cnt > 0:
        cs_types.append("Driveway")
    if g_cnt > 0:
        cs_types.append("Garage")
    if c_cnt > 0:
        cs_types.append("Carport")
    car_storage_val = ", ".join(cs_types) if cs_types else "None"

    # Additional Features & Narratives
    add_features = ""
    cond_comment = ""
    phys_comment = ""
    conf_comment = ""
    phys_ex = ""
    conf_ex = ""
    for pa in root.findall(".//PROPERTY_ANALYSIS"):
        pat = pa.attrib.get("_Type", "")
        if pat == "AdditionalFeatures": add_features = pa.attrib.get("_Comment", "")
        elif pat == "QualityAndAppearance" and not cond_comment: cond_comment = pa.attrib.get("_Comment", "")
        elif pat == "PropertyCondition" and not cond_comment: cond_comment = pa.attrib.get("_Comment", "")
        elif pat == "PhysicalDeficiency":
            phys_ex = pa.attrib.get("_ExistsIndicator", "")
            phys_comment = pa.attrib.get("_Comment", "")
        elif pat == "ConformsToNeighborhood":
            conf_ex = pa.attrib.get("_ExistsIndicator", "")
            conf_comment = pa.attrib.get("_Comment", "")

    # Condition rating for Subject from sales comparison grid
    cond_rating = ""
    for cs in root.findall(".//COMPARABLE_SALE"):
        if cs.attrib.get("PropertySequenceIdentifier") == "0":
            cd = cs.find(".//COMPARISON_DETAIL")
            if cd is not None:
                r = cd.attrib.get("GSEOverallConditionType", "")
                if re.match(r"^C[1-6]$", r, re.IGNORECASE):
                    cond_rating = r.upper()
            break
    if not cond_rating and cond_comment:
        m = re.match(r"^(C[1-6])\b", cond_comment.strip(), re.IGNORECASE)
        if m:
            cond_rating = m.group(1).upper()

    if cond_comment:
        m = re.match(r"^(C[1-6])\b", cond_comment.strip(), re.IGNORECASE)
        if m:
            cond_desc = cond_comment.strip()
        elif cond_rating:
            cond_desc = f"{cond_rating}; {cond_comment.strip()}"
        else:
            cond_desc = cond_comment.strip()
    elif cond_rating:
        cond_desc = cond_rating
    else:
        cond_desc = ""

    phys_desc = ""
    if phys_ex == "N":
        phys_desc = f"No. {phys_comment}".strip(". ") if phys_comment else "No"
    elif phys_ex == "Y":
        phys_desc = f"Yes: {phys_comment}".strip(". ") if phys_comment else "Yes"
    elif phys_comment:
        phys_desc = phys_comment

    conf_desc = ""
    if conf_ex == "Y":
        conf_desc = f"Yes. {conf_comment}".strip(". ") if conf_comment else "Yes"
    elif conf_ex == "N":
        conf_desc = f"No: {conf_comment}".strip(". ") if conf_comment else "No"
    elif conf_comment:
        conf_desc = conf_comment

    recon_elem = root.find(".//_RECONCILIATION")
    coa = root.find(".//_CONDITION_OF_APPRAISAL")
    reconcil_status = "As Is"
    if coa is not None and "subject" in coa.attrib.get("_Type", "").lower():
        coa_type_str = coa.attrib.get("_Type", "")
        if "repair" in coa_type_str.lower():
            reconcil_status = "Subject to repairs"
        elif "completion" in coa_type_str.lower():
            reconcil_status = "Subject to completion"
        elif "inspection" in coa_type_str.lower():
            reconcil_status = "Subject to inspection"
        else:
            reconcil_status = "Subject To"
    elif recon_elem is not None and "subject" in recon_elem.attrib.get("_ConditionsComment", "").lower() and not ("as is" in recon_elem.attrib.get("_ConditionsComment", "").lower() or "as-is" in recon_elem.attrib.get("_ConditionsComment", "").lower()):
        reconcil_status = "Subject To"

    conditions_comment = ""
    if recon_elem is not None:
        conditions_comment = recon_elem.attrib.get("_ConditionsComment", "").strip()
        conditions_comment = re.sub(r'^[:\s]+', '', conditions_comment).strip()
    if not conditions_comment and coa is not None:
        conditions_comment = coa.attrib.get("_Comment", "").strip()

    reconciliation_long_key = 'This appraisal is made "as is", subject to completion per plans and specifications on the basis of a hypothetical condition that the improvements have been completed, subject to the following repairs or alterations on the basis of a hypothetical condition that the repairs or alterations have been completed, or subject to the following required inspection based on the extraordinary assumption that the condition or deficiency does not require alteration or repair:'

    improvements_section = {
        # General Description
        "Units": "One with Accessory Unit" if adu_check == "Yes" else living_units,
        "One with Accessory Unit": adu_check if adu_check else "No",
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
        "as of": effective_date,
        "as of date": effective_date,
        "Appraisal Effective Date": effective_date,
        "Effective Date of Appraisal": effective_date,
        "Effective Date": effective_date,
        "Appraiser Name": appraiser_name,
        "Signature Date": signed_date,
        reconciliation_long_key: reconcil_status,
        "Reconciliation Status": reconcil_status,
        "Conditions Comment": conditions_comment,
        "Subject To Comment": conditions_comment,
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

    insp_elem = appraiser_elem.find("INSPECTION") if appraiser_elem is not None else root.find(".//INSPECTION")
    insp_date = insp_elem.attrib.get("InspectionDate", "") if insp_elem is not None else effective_date

    # Supervisory inspection details (strictly from XML)
    sup_insp_none = ""
    sup_insp_ext = ""
    sup_insp_ext_date = ""
    sup_insp_int_ext = ""
    sup_insp_int_ext_date = ""
    sup_comp_none = ""
    sup_comp_yes = ""
    sup_comp_date = ""

    if sup_name.strip() and supervisor_elem is not None:
        for insp in supervisor_elem.findall(".//INSPECTION"):
            pt = insp.attrib.get("AppraisalInspectionPropertyType", "")
            idate = insp.attrib.get("InspectionDate", "")
            if pt == "Subject":
                if idate:
                    sup_insp_int_ext = "Yes"
                    sup_insp_int_ext_date = idate
                    sup_insp_none = "No"
                    sup_insp_ext = "No"
                else:
                    sup_insp_none = "Yes"
                    sup_insp_ext = "No"
                    sup_insp_int_ext = "No"
            elif pt == "Comparable":
                sup_comp_yes = "Yes"
                sup_comp_none = "No"
                if idate:
                    sup_comp_date = idate

    certification_section = {
        # Appraiser Fields
        "Signature": appraiser_name,
        "Name": appraiser_name,
        "Appraiser Name": appraiser_name,
        "Company Name": appraiser_company,
        "Company Address": appraiser_address,
        "Telephone Number": appraiser_phone,
        "Email Address": appraiser_email,
        "Date of Signature": signed_date,
        "Date of Signature and Report": signed_date,
        "Report Signed Date": signed_date,
        "Effective Date": effective_date,
        "Effective Date of Appraisal": effective_date,
        "State Certification #": state_cert_no,
        "or State License #": state_lic_no,
        "or Other (describe)": "",
        "State #": "",
        "State": lic_state or appr_state,
        "Expiration Date": lic_exp,
        "Expiration Date of Certification or License": lic_exp,
        
        # Supervisory Appraiser Fields
        "Supervisory Signature": sup_name if sup_name.strip() else "",
        "Supervisory Name": sup_name,
        "Supervisory Company Name": sup_company,
        "Supervisory Company Address": sup_address,
        "Supervisory Telephone Number": sup_phone,
        "Supervisory Email Address": sup_email,
        "Supervisory Date of Signature": signed_date if sup_name.strip() else "",
        "Supervisory State Certification #": sup_cert_no,
        "Supervisory or State License #": sup_lic_no,
        "Supervisory State": sup_lic_state,
        "Supervisory Expiration Date of Certification or License": sup_lic_exp,

        # Property Appraised & Appraised Value
        "Address": full_addr,
        "ADDRESS OF PROPERTY APPRAISED": full_addr,
        "Appraised Value $": appraised_val,
        "APPRAISED VALUE OF SUBJECT PROPERTY $": appraised_val,
        "Appraised Value": appraised_val,

        # Lender / Client
        "LENDER/CLIENT Name": lender_client_name,
        "Lender/Client Name": lender_client_name,
        "Lender/Client": lender_name,
        "Client Name": lender_client_name,
        "Lender Name": lender_name,
        "Lender/Client Company Name": lender_name,
        "Lender/Client Company Address": lender_address,
        "Lender/Client Email Address": lender_email,

        # Subject Property Inspection (Supervisory Appraiser)
        "Did not inspect subject property": sup_insp_none,
        "Did inspect exterior of subject property from street": sup_insp_ext,
        "Subject Property Date of Inspection (Exterior)": sup_insp_ext_date,
        "Did inspect interior and exterior of subject property": sup_insp_int_ext,
        "Subject Property Date of Inspection (Interior/Exterior)": sup_insp_int_ext_date,

        # Comparable Sales Inspection (Supervisory Appraiser)
        "Did not inspect exterior of comparable sales from street": sup_comp_none,
        "Did inspect exterior of comparable sales from street": sup_comp_yes,
        "Comparable Sales Date of Inspection": sup_comp_date,

        # Additional Info & E&O Insurance
        "Appraiser License": lic_id,
        "E&O": "Absent",
        "E&O Present": "Absent",
        "E&O Insurance": "",
        "Policy Period From": "",
        "Policy Period To": "",
        "E&O Insured": "",
        "E&O Carrier": "",
        "E&O Limit": "",
        "E&O Deductible": "",
        "Invoice Attached": inv_present_str,
        "Invoice Present": inv_present_str,
        "has_invoice": has_invoice,
        "License Valid To": lic_exp,
        "LICENSE/REGISTRATION/CERTIFICATION #": lic_id,

        # Fees & AMC
        "Appraiser's Fee": appraiser_fee,
        "Appraiser Fee": appraiser_fee,
        "Appraisal Fee": appraiser_fee,
        "AMC License #": amc_license,
        "AMC License": amc_license,
        "AMC Name": amc_name,
    }

    # Extract E&O Insurance details from embedded PDF document if present
    emb_doc_elem = root.find(".//DOCUMENT")
    if emb_doc_elem is None:
        emb_doc_elem = root.find(".//EMBEDDED_FILE/DOCUMENT")
    if emb_doc_elem is None:
        emb_doc_elem = root.find(".//EMBEDDED_FILE")

    if emb_doc_elem is not None and emb_doc_elem.text and fitz is not None:
        try:
            pdf_bytes = base64.b64decode(emb_doc_elem.text.strip())
            emb_pdf = fitz.open(stream=pdf_bytes, filetype="pdf")
            eo_info = extract_eo_insurance_from_doc(emb_pdf)
            if eo_info.get("E&O"):
                certification_section["E&O"] = eo_info["E&O"]
                certification_section["E&O Present"] = eo_info.get("E&O Present", eo_info["E&O"])
            if eo_info.get("E&O Insurance"):
                certification_section["E&O Insurance"] = eo_info["E&O Insurance"]
            if eo_info.get("Policy Period From"):
                certification_section["Policy Period From"] = eo_info["Policy Period From"]
            if eo_info.get("Policy Period To"):
                certification_section["Policy Period To"] = eo_info["Policy Period To"]
            if eo_info.get("E&O Insured"):
                certification_section["E&O Insured"] = eo_info["E&O Insured"]
            if eo_info.get("E&O Carrier"):
                certification_section["E&O Carrier"] = eo_info["E&O Carrier"]
            if eo_info.get("E&O Limit"):
                certification_section["E&O Limit"] = eo_info["E&O Limit"]
            if eo_info.get("E&O Deductible"):
                certification_section["E&O Deductible"] = eo_info["E&O Deductible"]
        except Exception as e:
            pass

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

    # Subject property's column in the Sales Grid (strictly sales comparison grid fields)
    subj_grid = dict(comps_dict.get("Subject", {}))
    if not subj_grid.get("Address"):
        subj_grid["Address"] = prop_addr
    if not subj_grid.get("Heating/Cooling"):
        subj_grid["Heating/Cooling"] = ht_val
    if not subj_grid.get("Porch/Patio/Deck"):
        subj_grid["Porch/Patio/Deck"] = amenities_val
    if not subj_grid.get("Basement Description"):
        subj_grid["Basement Description"] = found_val
    if not subj_grid.get("Basement Finished Rooms"):
        subj_grid["Basement Finished Rooms"] = f"{bm_finish}%" if bm_finish else ""
    if not subj_grid.get("Condition"):
        subj_grid["Condition"] = prop_condition
    if not subj_grid.get("Basement & Finished Rooms Below Grade"):
        subj_grid["Basement & Finished Rooms Below Grade"] = bm_details or found_val
    if not subj_grid.get("Garage/Carport"):
        subj_grid["Garage/Carport"] = car_storage_val
    if not subj_grid.get("Parking On/Off Site"):
        subj_grid["Parking On/Off Site"] = car_storage_val

    # Sales Grid Subject column is strictly the sales comparison data for subject
    sales_grid["Subject"] = subj_grid
    sales_grid["SUBJECT"] = subj_grid
    comps_dict["Subject"] = subj_grid
    comps_dict["SUBJECT"] = subj_grid

    # Subject Section is strictly Page 1 subject property identification (separate from Sales Grid)
    clean_subject = dict(subject_section)
    if not clean_subject.get("Property Address"):
        clean_subject["Property Address"] = prop_addr
    if not clean_subject.get("Full Address"):
        clean_subject["Full Address"] = full_addr
    if not clean_subject.get("City"):
        clean_subject["City"] = prop_city
    if not clean_subject.get("State"):
        clean_subject["State"] = prop_state
    if not clean_subject.get("Zip Code"):
        clean_subject["Zip Code"] = prop_zip
    if not clean_subject.get("County"):
        clean_subject["County"] = prop_county

    # Ensure prior sale history and sales comparison subject fields are populated in clean_subject
    for k, v in subj_grid.items():
        if k not in clean_subject or not clean_subject[k]:
            clean_subject[k] = v

    # Subject rent fields for Form 1007 stay strictly in single_family_rent_schedule (keep Subject and Rent Schedule separate)
    subj_addr_str = str(clean_subject.get("Full Address") or clean_subject.get("Property Address") or prop_addr or "")
    if single_family_rent_schedule:
        if not single_family_rent_schedule.get("Address") or len(str(single_family_rent_schedule.get("Address", ""))) < 8:
            single_family_rent_schedule["Address"] = subj_addr_str
    if not clean_subject.get("Address"):
        clean_subject["Address"] = subj_addr_str

    sales_grid.update(info_of_sales_section)
    merged_info_of_sales = {**sales_grid, **info_of_sales_section}

    # Clean structured Sales Grid containing Subject column and Comps 1..N
    clean_sales_grid = {}
    if "Subject" in sales_grid and isinstance(sales_grid["Subject"], dict):
        clean_sales_grid["Subject"] = subj_grid
    detected_comps = set()
    for k in sales_grid.keys():
        m_c = re.search(r'(?:Comparable\s*#?|COMPARABLE\s+SALE\s*#?)\s*(\d+)', k, re.I)
        if m_c:
            detected_comps.add(int(m_c.group(1)))
    max_comp_num = max(detected_comps) if detected_comps else 9
    for i in range(1, max_comp_num + 1):
        c_val = sales_grid.get(f"Comparable #{i}") or sales_grid.get(f"COMPARABLE SALE #{i}")
        if isinstance(c_val, dict):
            clean_sales_grid[f"Comparable Sale {i}"] = c_val

    # 10. Extract Photo Exhibits & Visual Addenda
    extracted_photos = []
    try:
        refs_for_photos = {
            "subject": {
                "street": clean_subject.get("Property Address") or prop_addr or "",
                "city": clean_subject.get("City") or prop_city or "",
                "state": clean_subject.get("State") or prop_state or "",
                "zipcode": clean_subject.get("Zip Code") or prop_zip or "",
                "address": clean_subject.get("Full Address") or full_addr or prop_addr or ""
            },
            "sales_comps": [],
            "rental_comps": []
        }
        for k, v in clean_sales_grid.items():
            if k != "Subject" and isinstance(v, dict):
                m = re.search(r'\d+', k)
                cnum = int(m.group(0)) if m else len(refs_for_photos["sales_comps"]) + 1
                st = v.get("Street Address") or v.get("Address") or ""
                refs_for_photos["sales_comps"].append({
                    "comp_num": cnum,
                    "street": st,
                    "address": v.get("Address") or st,
                    "proximity": v.get("Proximity to Subject") or "",
                    "sale_price": v.get("Sale Price") or ""
                })
        rgrid = comparable_rental_data or single_family_rent_schedule or {}
        for k, v in rgrid.items():
            if isinstance(v, dict) and any(x in k.upper() for x in ["RENTAL", "COMPARABLE NO"]):
                m = re.search(r'\d+', k)
                cnum = int(m.group(0)) if m else len(refs_for_photos["rental_comps"]) + 1
                if not any(r["comp_num"] == cnum for r in refs_for_photos["rental_comps"]):
                    addr = v.get("Address") or ""
                    m_st = re.match(r'^([^,]+)', addr)
                    st = m_st.group(1).strip() if m_st else addr
                    refs_for_photos["rental_comps"].append({
                        "comp_num": cnum,
                        "street": st,
                        "address": addr,
                        "proximity": v.get("Proximity to Subject") or v.get("Proximity") or "",
                        "monthly_rent": v.get("Monthly Rental") or v.get("Adjusted Monthly Rent") or ""
                    })

        extracted_photos = extract_photos_from_xml(
            xml_path_or_bytes,
            max_photos=100,
            dpi=72,
            include_images=extract_images,
            reference_records=refs_for_photos
        )
    except Exception:
        pass

    # -------------------------------------------------------------
    # Form 1073 (Condominium) Project Information & Analysis
    # -------------------------------------------------------------
    project_car_storage = root.find(".//PROJECT_CAR_STORAGE")
    if project_car_storage is None:
        project_car_storage = root.find(".//CAR_STORAGE")

    project_analysis_elem = root.find(".//PROJECT_ANALYSIS")

    # Data source
    proj_data_source = ""
    if proj is not None:
        proj_data_source = proj.attrib.get("DataSourceDescription", "")
        if not proj_data_source:
            for ds in proj.findall("DEVELOPMENT_STAGE"):
                src = ds.attrib.get("DataSourceDescription", "")
                if src:
                    proj_data_source = src
                    break

    # Project Description
    proj_desc = ""
    if proj is not None:
        design_raw = proj.attrib.get("_DesignType", "") or proj.attrib.get("_DesignTypeOtherDescription", "")
        dt_map = {
            "GardenProject": "Garden",
            "Garden": "Garden",
            "Townhouse": "Row or Townhouse",
            "RowOrTownhouse": "Row or Townhouse",
            "Detached": "Detached",
            "MidRise": "Mid-Rise",
            "HighRise": "High-Rise",
        }
        proj_desc = dt_map.get(design_raw, design_raw)
    if not proj_desc and struct_elem is not None:
        proj_desc = struct_elem.attrib.get("StructureConfigurationType", "")

    # Stories
    proj_stories = ""
    if struct_elem is not None:
        proj_stories = struct_elem.attrib.get("StoriesCount", "")
    if not proj_stories:
        st_info = root.find(".//STRUCTURE_INFORMATION")
        if st_info is not None:
            proj_stories = st_info.attrib.get("GSEStoriesCount", "")
    if not proj_stories and proj is not None:
        proj_stories = proj.attrib.get("StoriesCount", "")

    # Elevators
    proj_elevators = ""
    if struct_elem is not None:
        proj_elevators = struct_elem.attrib.get("ElevatorCount", "")
    if not proj_elevators and proj is not None:
        proj_elevators = proj.attrib.get("ElevatorCount", "")

    # Status
    proj_status = ""
    if struct_elem is not None:
        proj_status = struct_elem.attrib.get("BuildingStatusType", "")
    if not proj_status and proj is not None:
        proj_status = proj.attrib.get("PropertyStructureStatusType", "") or proj.attrib.get("_StatusType", "")

    # Year Built
    proj_year_built = ""
    if struct_elem is not None:
        proj_year_built = struct_elem.attrib.get("PropertyStructureBuiltYear", "")
    if not proj_year_built:
        st_info = root.find(".//STRUCTURE_INFORMATION")
        if st_info is not None:
            proj_year_built = st_info.attrib.get("GSEPropertyStructureBuiltYear", "")

    # Effective Age
    proj_eff_age = ""
    if sa_elem is not None:
        proj_eff_age = sa_elem.attrib.get("EffectiveAgeYearsCount", "")
    if not proj_eff_age:
        eff_node = root.find(".//EFFECTIVE_AGE")
        if eff_node is not None:
            proj_eff_age = eff_node.attrib.get("GSEEffectiveAgeDescription", "")

    # Exterior Walls & Roof Surface
    proj_ext_walls = ext_walls
    if not proj_ext_walls:
        for ef in root.findall(".//EXTERIOR_FEATURE"):
            if ef.attrib.get("_Type", "") == "Walls":
                proj_ext_walls = _format_mat_cond(ef.attrib.get("_Description", ""))
                break

    proj_roof_surf = roof_surf
    if not proj_roof_surf:
        for ef in root.findall(".//EXTERIOR_FEATURE"):
            if ef.attrib.get("_Type", "") == "RoofSurface":
                proj_roof_surf = _format_mat_cond(ef.attrib.get("_Description", ""))
                break

    # Parking
    proj_total_parking = ""
    proj_ratio_parking = ""
    proj_parking_type = ""
    proj_guest_parking = ""
    proj_parking_adequate = ""
    proj_parking_inadequate_desc = ""
    if project_car_storage is not None:
        proj_total_parking = project_car_storage.attrib.get("ParkingSpacesCount", "") or project_car_storage.attrib.get("TotalParkingSpacesCount", "")
        proj_ratio_parking = project_car_storage.attrib.get("_SpacesToUnitsRatioNumber", "") or project_car_storage.attrib.get("RatioDescription", "")
        proj_parking_type = project_car_storage.attrib.get("_Description", "") or project_car_storage.attrib.get("_Type", "")
        proj_guest_parking = project_car_storage.attrib.get("GuestParkingSpacesCount", "")
        ad_ind = project_car_storage.attrib.get("AdequateIndicator", "")
        proj_parking_adequate = "Yes" if ad_ind.upper() == "Y" else ("No" if ad_ind.upper() == "N" else ad_ind)
        proj_parking_inadequate_desc = project_car_storage.attrib.get("_AdequacyEffectOnMarketabilityDescription", "")

    # Amenities
    proj_amenities = ""
    if struct_elem is not None:
        proj_amenities = struct_elem.attrib.get("StructureConfigurationTypeOtherDescription", "")
    if not proj_amenities:
        for pa in root.findall(".//PROPERTY_ANALYSIS"):
            if pa.attrib.get("_Type", "") == "AdditionalFeatures":
                proj_amenities = pa.attrib.get("_Comment", "")
                break
            elif not proj_amenities and pa.attrib.get("_Comment", "") and "amenit" in pa.attrib.get("_Comment", "").lower():
                proj_amenities = pa.attrib.get("_Comment", "")
    if not proj_amenities and amenities_val:
        proj_amenities = amenities_val

    # Development Stages (Unit counts across Subject Phase, Project Complete, Project Incomplete)
    ds_subj = None
    ds_comp = None
    ds_incomp = None
    if proj is not None:
        for ds in proj.findall("DEVELOPMENT_STAGE"):
            t = ds.attrib.get("_Type", "")
            if t in ("SubjectPhase", "Subject"):
                ds_subj = ds
            elif t in ("Complete", "Completed", "TotalProject"):
                ds_comp = ds
            elif t in ("Incomplete", "Planned"):
                ds_incomp = ds

    def _get_ds_field(elem, *attrib_keys):
        if elem is None:
            return ""
        for k in attrib_keys:
            v = elem.attrib.get(k, "")
            if v != "":
                return v
        return ""

    u_subj = _get_ds_field(ds_subj, "CompletedUnitsCount", "PlannedUnitsCount")
    u_subj_comp = _get_ds_field(ds_subj, "CompletedUnitsCount")
    u_subj_sale = _get_ds_field(ds_subj, "UnitsForSaleCount")
    u_subj_sold = _get_ds_field(ds_subj, "UnitsSoldCount")
    u_subj_rent = _get_ds_field(ds_subj, "UnitsRentedCount")
    u_subj_owner = _get_ds_field(ds_subj, "OwnerOccupiedUnitCount")

    ph_comp = _get_ds_field(ds_comp, "_TotalPhasesCount")
    u_comp = _get_ds_field(ds_comp, "CompletedUnitsCount", "PlannedUnitsCount")
    u_comp_sale = _get_ds_field(ds_comp, "UnitsForSaleCount")
    u_comp_sold = _get_ds_field(ds_comp, "UnitsSoldCount")
    u_comp_rent = _get_ds_field(ds_comp, "UnitsRentedCount")
    u_comp_owner = _get_ds_field(ds_comp, "OwnerOccupiedUnitCount")

    ph_incomp = _get_ds_field(ds_incomp, "_TotalPhasesCount")
    u_incomp = _get_ds_field(ds_incomp, "PlannedUnitsCount")
    u_incomp_sale = _get_ds_field(ds_incomp, "UnitsForSaleCount")
    u_incomp_sold = _get_ds_field(ds_incomp, "UnitsSoldCount")
    u_incomp_rent = _get_ds_field(ds_incomp, "UnitsRentedCount")
    u_incomp_owner = _get_ds_field(ds_incomp, "OwnerOccupiedUnitCount")

    # Primary Occupancy
    proj_occ_raw = (proj.attrib.get("_PrimaryOccupancyType", "") or proj.attrib.get("PropertyCurrentUsageType", "")) if proj is not None else ""
    occ_map = {
        "PrincipleResidence": "Principal Residence",
        "PrimaryResidence": "Principal Residence",
        "SecondHome": "Second Home or Recreational",
        "Tenant": "Tenant"
    }
    proj_primary_occ = occ_map.get(proj_occ_raw, proj_occ_raw)

    # Developer Control
    proj_dev_ctrl_raw = proj.attrib.get("_DeveloperControlsProjectManagementIndicator", "") if proj is not None else ""
    proj_dev_ctrl = "Yes" if proj_dev_ctrl_raw.upper() == "Y" else ("No" if proj_dev_ctrl_raw.upper() == "N" else proj_dev_ctrl_raw)

    # Management Group
    proj_mgmt_type = proj.attrib.get("_ManagementType", "") if proj is not None else ""
    proj_mgmt_agent = proj.attrib.get("_ManagementAgentName", "") if proj is not None else ""
    if proj_mgmt_agent:
        proj_mgmt_group = f"Management Agent - {proj_mgmt_agent}" if "Management" in proj_mgmt_type else f"{proj_mgmt_type} - {proj_mgmt_agent}"
    else:
        proj_mgmt_group = proj_mgmt_type

    # Single entity owns > 10%
    proj_entity_ind_raw = proj.attrib.get("_ConcentratedOwnershipIndicator", "") if proj is not None else ""
    proj_entity_ind = "Yes" if proj_entity_ind_raw.upper() == "Y" else ("No" if proj_entity_ind_raw.upper() == "N" else proj_entity_ind_raw)
    proj_entity_desc = proj.attrib.get("_ConcentratedOwnershipDescription", "") if proj is not None else ""

    # Conversion
    proj_conv_raw = proj.attrib.get("_ConversionIndicator", "") if proj is not None else ""
    proj_conv_ind = "Yes" if proj_conv_raw.upper() == "Y" else ("No" if proj_conv_raw.upper() == "N" else proj_conv_raw)
    proj_conv_desc = proj.attrib.get("_ConversionOriginalUseDescription", "") if proj is not None else ""
    proj_conv_date = proj.attrib.get("_ConversionDate", "") if proj is not None else ""
    proj_conv_full = f"{proj_conv_desc} {proj_conv_date}".strip()

    # Common elements complete
    proj_comp_raw = proj.attrib.get("_CommonElementsCompletedIndicator", "") if proj is not None else ""
    proj_comp_ind = "Yes" if proj_comp_raw.upper() == "Y" else ("No" if proj_comp_raw.upper() == "N" else proj_comp_raw)
    proj_comp_no_desc = proj.attrib.get("_CommonElementsStatusDescription", "") if proj is not None else ""

    # Commercial space
    proj_comm_raw = proj.attrib.get("_CommercialSpaceIndicator", "") if proj is not None else ""
    proj_comm_ind = "Yes" if proj_comm_raw.upper() == "Y" else ("No" if proj_comm_raw.upper() == "N" else proj_comm_raw)
    proj_comm_desc = proj.attrib.get("CommercialSpaceDescription", "") if proj is not None else ""
    comm_elem = root.find(".//PROJECT_COMMERCIAL")
    proj_comm_pct = comm_elem.attrib.get("GSEProjectCommercialSpacePercent", "") if comm_elem is not None else ""
    proj_comm_full = f"{proj_comm_desc} ({proj_comm_pct}%)".strip(" ()") if proj_comm_pct else proj_comm_desc

    # Condition & Quality
    proj_cond_qual = proj.attrib.get("_ConditionAndQualityDescription", "") if proj is not None else ""

    # Common elements
    proj_comm_elems_desc = proj.attrib.get("_CommonElementsDescription", "") if proj is not None else ""

    # Leased common elements
    proj_leased_raw = proj.attrib.get("_CommonElementsLeasedIndicator", "") if proj is not None else ""
    proj_leased_ind = "Yes" if proj_leased_raw.upper() == "Y" else ("No" if proj_leased_raw.upper() == "N" else proj_leased_raw)
    proj_leased_terms = proj.attrib.get("_CommonElementsLeaseTermsDescription", "") if proj is not None else ""

    # Ground rent
    proj_ground_rent_raw = project_analysis_elem.attrib.get("_GroundRentIndicator", "") if project_analysis_elem is not None else ""
    proj_ground_rent = "Yes" if proj_ground_rent_raw.upper() == "Y" else ("No" if proj_ground_rent_raw.upper() == "N" else proj_ground_rent_raw)
    proj_ground_rent_amt = project_analysis_elem.attrib.get("_GroundRentAmount", "") if project_analysis_elem is not None else ""
    proj_ground_rent_desc = project_analysis_elem.attrib.get("_GroundRentDescription", "") if project_analysis_elem is not None else ""
    proj_ground_rent_full = f"${proj_ground_rent_amt} {proj_ground_rent_desc}".strip() if proj_ground_rent_amt else proj_ground_rent_desc

    project_info_section: Dict[str, Any] = {
        "Data source(s) for project information": proj_data_source,
        "Project Description": proj_desc,
        "# of Stories": proj_stories,
        "# of Elevators": proj_elevators,
        "Existing/Proposed/Under Const.": proj_status,
        "Existing/Proposed/Under Construction": proj_status,
        "Year Built": proj_year_built,
        "Effective Age": proj_eff_age,
        "Exterior Walls": proj_ext_walls,
        "Roof Surface": proj_roof_surf,
        "Total # Parking": proj_total_parking,
        "Ratio (spaces/units)": proj_ratio_parking,
        "Type": proj_parking_type,
        "Guest Parking": proj_guest_parking,
        "Amenities include: deck, central air conditioning and thermal windows.": proj_amenities,
        "Amenities": proj_amenities,
        "Amenities include:": proj_amenities,
        "# of Units": u_subj or u_comp,
        "# of Units Completed": u_subj_comp or u_comp,
        "# of Units For Sale": u_subj_sale,
        "# of Units Sold": u_subj_sold or u_comp_sold,
        "# of Units Rented": u_subj_rent or u_comp_rent,
        "# of Owner Occupied Units": u_subj_owner or u_comp_owner,
        "# of Phases": ph_comp,
        "# of Units for Sale": u_comp_sale or u_subj_sale,
        "# of Planned Phases": ph_incomp,
        "# of Planned Units": u_incomp,
        "# of Planned Units for Sale": u_incomp_sale,
        "# of Planned Units Sold": u_incomp_sold,
        "# of Planned Units Rented": u_incomp_rent,
        "# of Planned Owner Occupied Units": u_incomp_owner,
        "Project Primary Occupancy": proj_primary_occ,
        "Is the developer/builder in control of the Homeowners' Association (HOA)?": proj_dev_ctrl,
        "Management Group": proj_mgmt_group,
        "Does any single entity (the same individual, investor group, corporation, etc.) own more than 10% of the total units in the project?": proj_entity_ind,
        "Does any single entity (the same individual, investor group, corporation, etc.) own more than 10% of the total units in the project? If Yes, describe": proj_entity_desc,
        "If Yes, describe (10% ownership)": proj_entity_desc,
        "Was the project created by the conversion of existing building(s) into a condominium?": proj_conv_ind,
        "Was the project created by the conversion of existing building(s) into a condominium? If Yes,describe the original use and date of conversion": proj_conv_full,
        "If Yes,describe the original use and date of conversion": proj_conv_full,
        "Are the units, common elements, and recreation facilities complete (including any planned rehabilitation for a condominium conversion)?": proj_comp_ind,
        "If No, describe": proj_comp_no_desc,
        "Is there any commercial space in the project?": proj_comm_ind,
        "If Yes, describe and indicate the overall percentage of the commercial space.": proj_comm_full,
        "Describe the condition of the project and quality of construction.": proj_cond_qual,
        "Describe the common elements and recreational facilities.": proj_comm_elems_desc,
        "Are any common elements leased to or by the Homeowners' Association?": proj_leased_ind,
        "If Yes, describe the rental terms and options.": proj_leased_terms,
        "Is the project subject to a ground rent?": proj_ground_rent,
        "If Yes, $ per year (describe terms and conditions)": proj_ground_rent_full,
        "Are the parking facilities adequate for the project size and type?": proj_parking_adequate,
        "If No, describe and comment on the effect on value and marketability.": proj_parking_inadequate_desc,
    }

    # Project Analysis (Form 1073 Page 2)
    proj_budget_comment = project_analysis_elem.attrib.get("_BudgetAnalysisComment", "") if project_analysis_elem is not None else ""
    proj_add_fees_raw = project_analysis_elem.attrib.get("_AdditionalFacilitiesFeeIndicator", "") if project_analysis_elem is not None else ""
    proj_add_fees = "Yes" if proj_add_fees_raw.upper() == "Y" else ("No" if proj_add_fees_raw.upper() == "N" else proj_add_fees_raw)
    proj_add_fees_desc = project_analysis_elem.attrib.get("_AdditionalFacilitiesFeeDescription", "") if project_analysis_elem is not None else ""
    proj_comp_type = project_analysis_elem.attrib.get("_CompetitiveProjectComparisonType", "") if project_analysis_elem is not None else ""
    proj_comp_desc = project_analysis_elem.attrib.get("_CompetitiveProjectComparisonDescription", "") if project_analysis_elem is not None else ""
    proj_spec_raw = project_analysis_elem.attrib.get("_SpecialCharacteristicsIndicator", "") if project_analysis_elem is not None else ""
    proj_spec_ind = "Yes" if proj_spec_raw.upper() == "Y" else ("No" if proj_spec_raw.upper() == "N" else proj_spec_raw)
    proj_spec_desc = project_analysis_elem.attrib.get("_SpecialCharacteristicsDescription", "") if project_analysis_elem is not None else ""

    project_analysis_section: Dict[str, Any] = {
        "I did did not analyze the condominium project budget for the current year. Explain the results of the analysis of the budget (adequacy of fees, reserves, etc.), or why the analysis was not performed.": proj_budget_comment,
        "Are there any other fees (other than regular HOA charges) for the use of the project facilities?": proj_add_fees,
        "If Yes, report the charges and describe.": proj_add_fees_desc,
        "Compared to other competitive projects of similar quality and design, the subject unit charge appears": proj_comp_type,
        "If High or Low, describe": proj_comp_desc,
        "Are there any special or unusual characteristics of the project (based on the condominium documents, HOA meetings, or other information) known to the appraiser?": proj_spec_ind,
        "If Yes, describe and explain the effect on value and marketability.": proj_spec_desc,
    }

    # Combined master fields object
    fields: Dict[str, Any] = {
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
        "opinion of the market value, as defined, of the real property that is the subject of this report is $": appraised_val,
        "as of": effective_date,
        "as of date": effective_date,
        "File #": file_id,
        "Loan #": loan_num,
        "FHA Case No.": fha_case_no,
        "FHA Case #": fha_case_no,
        "FHA Case Number": fha_case_no,
        "Appraiser's Fee": appraiser_fee,
        "Appraiser Fee": appraiser_fee,
        "Appraisal Fee": appraiser_fee,
        "AMC License #": amc_license,
        "AMC License": amc_license,
        "AMC Name": amc_name,
        "LENDER/CLIENT Name": lender_client_name,
        "Lender/Client Name": lender_client_name,
        "Lender Name": lender_name,
        "Lender/Client Company Name": lender_name,
        "Lender/Client Company Address": lender_address,
        "Lender/Client Email Address": lender_email,
        "Lender/Client": lender_name,
        "1004MC Addendum": mc_present_str,
        "1004MC Present": "Yes" if has_1004mc else "No",
        "has_1004mc": has_1004mc,
        "USPAP / Appraisal and Report Identification": uspap_ident_str,
        "Appraisal and Report Identification": uspap_ident_str,
        "USPAP Addendum": uspap_ident_str,
        "has_uspap_identification": has_uspap_ident,
        "ANSI": ansi_comment,
        "ANSI Standards": ansi_comment,
        "ANSI Comment": ansi_comment,
        "Exposure comment": exposure_comment,
        "Exposure Comment": exposure_comment,
        "Reasonable Exposure Time": exposure_comment,
        "Prior service comment": prior_service_comment,
        "USPAP Reporting Option": uspap_reporting_option,
        uspap_long_key: uspap_reporting_option,
        "This report was prepared under the following USPAP reporting option:": uspap_reporting_option,
        "Comments on Appraisal and Report Identification": uspap_comment,
        "Restricted Appraisal Report Comment": uspap_comment,
        "Subject": clean_subject,
        "SUBJECT": clean_subject,
        "CONTRACT": contract_section,
        "NEIGHBORHOOD": neighborhood_section,
        "Legal Nonconforming (Grandfathered Use) comment": nonconforming_comment,
        "Legal Nonconforming comment": nonconforming_comment,
        "Nonconforming comment": nonconforming_comment,
        "Zoning Compliance comment": nonconforming_comment,
        "SITE": site_section,
        "PROJECT_SITE": site_section,
        "Project Site": site_section,
        "IMPROVEMENTS": improvements_section,
        "SALES_GRID": sales_grid,
        "Sales Grid": clean_sales_grid,
        "INFO_OF_SALES": merged_info_of_sales,
        "SALES_TRANSFER": merged_info_of_sales,
        "RECONCILIATION": reconciliation_section,
        "INCOME_APPROACH": income_approach_section,
        "COST_APPROACH": cost_approach_section,
        "PUD_INFO": pud_info_section,
        "PROJECT_INFO": project_info_section,
        "Project Information": project_info_section,
        "PROJECT_ANALYSIS": project_analysis_section,
        "Project Analysis": project_analysis_section,
        "MARKET_CONDITIONS": market_conditions_section,
        "CONDO_COOP_PROJECTS": condo_coop_section,
        "CONDO_FORECLOSURE": condo_foreclosure_section,
        "CERTIFICATION": certification_section,
        "SUBJECT_RENT_SCHEDULE": subject_rent_schedule,
        "Single Family Rent Schedule": single_family_rent_schedule,
        "SINGLE_FAMILY_RENT_SCHEDULE": single_family_rent_schedule,
        "Comparable Rental Data": comparable_rental_data,
        "COMPARABLE_RENTAL_DATA": comparable_rental_data,
        "Comparable Rent Schedule Reconciliation": rent_reconciliation,
        "EXTRACTED_PHOTOS": extracted_photos,
        "E&O": certification_section.get("E&O", "Absent"),
        "E&O Present": certification_section.get("E&O Present", "Absent"),
        "Invoice Attached": certification_section.get("Invoice Attached", inv_present_str),
        "Invoice Present": certification_section.get("Invoice Present", inv_present_str),
        "has_invoice": has_invoice,
    }

    if has_invoice:
        fields.setdefault("INVOICE", {})
        fields["INVOICE"]["Invoice Attached"] = "Yes"
        fields["INVOICE"]["Invoice Present"] = "Yes"
        if inv_details.get("Invoice Page"):
            fields["INVOICE"]["Invoice Page"] = inv_details["Invoice Page"]
        if inv_details.get("Invoice Total"):
            fields["INVOICE"]["Invoice Total"] = inv_details["Invoice Total"]
            fields["INVOICE"]["Total Fee"] = inv_details["Invoice Total"]
        fields["Invoice"] = fields["INVOICE"]

    # Flatten category fields into root fields so data[field] is directly available to UI
    for cat_dict in [clean_subject, contract_section, neighborhood_section, site_section, improvements_section, reconciliation_section, income_approach_section, cost_approach_section, pud_info_section, project_info_section, project_analysis_section, market_conditions_section, condo_coop_section, condo_foreclosure_section, certification_section, info_of_sales_section]:
        for k, v in cat_dict.items():
            if k not in fields:
                fields[k] = v

    # Map individual comps for Form1025 and 1004 grids without overwriting Subject
    for comp_name, comp_data in comps_dict.items():
        if comp_name not in ("Subject", "SUBJECT") and comp_name not in fields:
            fields[comp_name] = comp_data

    # Map individual rentals for Form1025 and Form 1007
    for rent_name, rent_data in comparable_rental_data.items():
        fields[rent_name] = rent_data

    # Map Form 1007 Rent Reconciliation fields
    for rk, rv in rent_reconciliation.items():
        fields[rk] = rv

    # Clean structured appraisal data dictionary (single clean section hierarchy where Subject and Sales Grid are distinct)
    clean_data: Dict[str, Any] = {
        "Form Type": form_type,
        "has_1004mc": has_1004mc,
        "1004MC Addendum": mc_present_str,
        "has_uspap_identification": has_uspap_ident,
        "USPAP / Appraisal and Report Identification": uspap_ident_str,
        "Appraisal and Report Identification": uspap_ident_str,
        "USPAP Addendum": uspap_ident_str,
        "Invoice Attached": inv_present_str,
        "Invoice Present": inv_present_str,
        "has_invoice": has_invoice,
        "Subject": clean_subject,
        "Contract": contract_section,
        "Neighborhood": neighborhood_section,
        "Site": site_section,
        "Improvements": improvements_section,
        "Sales Grid": clean_sales_grid,
        "Reconciliation": reconciliation_section,
    }
    if cost_approach_section and any(cost_approach_section.values()):
        clean_data["Cost Approach"] = cost_approach_section
    if income_approach_section and any(income_approach_section.values()):
        clean_data["Income Approach"] = income_approach_section
    if pud_info_section and any(pud_info_section.values()):
        clean_data["PUD Information"] = pud_info_section
    if project_info_section and any(project_info_section.values()):
        clean_data["Project Information"] = project_info_section
    if project_analysis_section and any(project_analysis_section.values()):
        clean_data["Project Analysis"] = project_analysis_section
    if market_conditions_section and any(market_conditions_section.values()):
        clean_data["Market Conditions Addendum"] = market_conditions_section
    if condo_coop_section and any(condo_coop_section.values()):
        clean_data["Condo / Coop Projects"] = condo_coop_section
    if condo_foreclosure_section and any(condo_foreclosure_section.values()):
        clean_data["Condo Foreclosure"] = condo_foreclosure_section
    if subject_rent_schedule and any(subject_rent_schedule.values()):
        clean_data["Subject Rent Schedule"] = subject_rent_schedule
    if comparable_rental_data and any(comparable_rental_data.values()):
        clean_data["Comparable Rental Data"] = comparable_rental_data
    if rent_reconciliation and any(rent_reconciliation.values()):
        clean_data["Comparable Rent Schedule Reconciliation"] = rent_reconciliation
    if single_family_rent_schedule and any(single_family_rent_schedule.values()):
        clean_data["Single Family Rent Schedule"] = single_family_rent_schedule
    if certification_section and any(certification_section.values()):
        clean_data["Certification"] = certification_section
    if has_invoice and "INVOICE" in fields:
        clean_data["Invoice"] = fields["INVOICE"]

    fields["Form Type"] = form_type
    fields["From Type"] = form_type
    fields["formType"] = form_type
    fields["selectedFormType"] = form_type

    if extracted_photos:
        clean_data["EXTRACTED_PHOTOS"] = extracted_photos
        clean_data["extracted_photos"] = extracted_photos

    return {
        "status": "success",
        "form_type": form_type,
        "has_1004mc": has_1004mc,
        "1004mc_presence": mc_present_str,
        "fields": fields,
        "unified_fields": fields,
        "clean_data": clean_data,
        "has_embedded_pdf": has_embedded_pdf,
        "extracted_photos": extracted_photos,
        "EXTRACTED_PHOTOS": extracted_photos,
    }
