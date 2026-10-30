import io
import re
import datetime
from typing import Dict, Any, Optional
import pymupdf
import numpy as np
from PIL import Image

_EASYOCR_READER = None

def get_easyocr_reader():
    global _EASYOCR_READER
    if _EASYOCR_READER is None:
        try:
            import easyocr
            _EASYOCR_READER = easyocr.Reader(['en'], gpu=False)
        except Exception as e:
            print(f"[eo_extractor] Error initializing EasyOCR: {e}")
            _EASYOCR_READER = False
    return _EASYOCR_READER if _EASYOCR_READER is not False else None


def normalize_date_str(raw: str) -> str:
    if not raw:
        return ""
    clean = raw.strip()
    # Match MM/DD/YYYY or MM-DD-YYYY or MM.DD.YYYY
    m = re.match(r'^([0-1]?\d)[/.-]([0-3]?\d)[/.-](\d{2,4})$', clean)
    if m:
        mo, da, yr = m.group(1), m.group(2), m.group(3)
        if len(yr) == 2:
            yr = "20" + yr
        return f"{int(mo):02d}/{int(da):02d}/{yr}"
    # Match Month DD, YYYY
    for fmt in ("%B %d, %Y", "%b %d, %Y", "%B %d %Y", "%b %d %Y", "%Y-%m-%d"):
        try:
            dt = datetime.datetime.strptime(clean, fmt)
            return dt.strftime("%m/%d/%Y")
        except ValueError:
            pass
    return clean


DISALLOWED_POLICY_WORDS = {
    'insurance', 'company', 'provided', 'declarations', 'policy', 'period',
    'effective', 'number', 'commercial', 'general', 'liability', 'coverage',
    'limits', 'errors', 'omissions', 'professional', 'standard', 'carrier',
    'surplus', 'lines', 'advantage', 'appraisers', 'acord', 'certificate',
    'information', 'confers', 'rights', 'holder', 'producer', 'insured',
    'revision', 'naic', 'subr', 'addl', 'type', 'claims', 'made', 'occurrence'
}


def is_valid_policy_number(cand: str) -> bool:
    if not cand:
        return False
    cand_clean = cand.strip(" :.-_#")
    if len(cand_clean) < 4 or len(cand_clean) > 35:
        return False
    lower_words = set(re.findall(r'[a-zA-Z]+', cand_clean.lower()))
    if lower_words and lower_words.issubset(DISALLOWED_POLICY_WORDS):
        return False
    # Must contain at least one digit or a hyphen/slash code
    if not re.search(r'\d', cand_clean) and not ('-' in cand_clean or '/' in cand_clean):
        return False
    return True


def parse_eo_text(text: str) -> Dict[str, str]:
    """
    Extracts E&O fields from text string using regex patterns.
    Handles ACORD 25 certificates, CNA declarations tables, Hanover / Surplus Lines layouts, etc.
    """
    res = {
        'E&O': 'Present',
        'E&O Present': 'Present',
        'E&O Insurance': '',
        'Policy Period From': '',
        'Policy Period To': '',
        'E&O Insured': '',
        'E&O Carrier': '',
        'E&O Limit': '',
        'E&O Deductible': ''
    }
    if not text or not text.strip():
        res['E&O'] = 'Absent'
        res['E&O Present'] = 'Absent'
        return res

    # 1. Dates: Inception / Effective
    m_inc = re.search(
        r'(?:Inception\s*Date|Inception|Effective\s*Date|Policy\s*Period\s*From|Policy\s*Eff(?:\s*\(MM/DD/YYYY\))?|Policy\s*From|Effective)[:\s]*([0-1]?\d[/.-][0-3]?\d[/.-]\d{2,4}|[A-Za-z]{3,9}\s+\d{1,2},?\s+\d{4})',
        text,
        re.I
    )
    if m_inc:
        res['Policy Period From'] = normalize_date_str(m_inc.group(1))

    # 2. Dates: Expiration / End
    m_exp = re.search(
        r'(?:Expiration\s*Date|Expiration|Policy\s*Period\s*To|Policy\s*Exp(?:\s*\(MM/DD/YYYY\))?|Policy\s*To|Expires|End\s*Date)[:\s]*([0-1]?\d[/.-][0-3]?\d[/.-]\d{2,4}|[A-Za-z]{3,9}\s+\d{1,2},?\s+\d{4})',
        text,
        re.I
    )
    if m_exp:
        res['Policy Period To'] = normalize_date_str(m_exp.group(1))

    # 3. ACORD / Multi-column Date Pattern: "<PolicyNumber> <DateFrom> <DateTo>"
    m_acord = re.search(
        r'(?:Professional\s*Liability|Errors\s*(?:and|&)\s*Omissions|Claims\s*made)[^\n\r]*?\b([A-Za-z0-9\-_]{5,25})\s+([0-1]?\d[/.-][0-3]?\d[/.-]\d{2,4})\s+([0-1]?\d[/.-][0-3]?\d[/.-]\d{2,4})',
        text,
        re.I
    )
    if m_acord:
        cand_pol, d_from, d_to = m_acord.group(1).strip(), m_acord.group(2).strip(), m_acord.group(3).strip()
        if is_valid_policy_number(cand_pol):
            res['E&O Insurance'] = cand_pol
        if not res['Policy Period From']:
            res['Policy Period From'] = normalize_date_str(d_from)
        if not res['Policy Period To']:
            res['Policy Period To'] = normalize_date_str(d_to)

    # 4. Fallback date range: "Policy Period: 03/31/2026 to 03/31/2027"
    if not (res['Policy Period From'] and res['Policy Period To']):
        m_range = re.search(
            r'(?:Policy\s*Period|Coverage\s*Period)[^:\n]*[:\s]*([0-1]?\d[/.-][0-3]?\d[/.-]\d{2,4})\s*(?:to|-|through)\s*([0-1]?\d[/.-][0-3]?\d[/.-]\d{2,4})',
            text,
            re.I
        )
        if m_range:
            if not res['Policy Period From']:
                res['Policy Period From'] = normalize_date_str(m_range.group(1))
            if not res['Policy Period To']:
                res['Policy Period To'] = normalize_date_str(m_range.group(2))

    # 5. Policy Number extraction
    # CNA Table header style: "Agency Branch Prefix Policy Number \n 078990 969 RFR 25415845525"
    if not res['E&O Insurance']:
        m_grid = re.search(
            r'(?:Agency\s+Branch\s+Prefix\s+Policy\s+Number|Prefix\s+Policy\s+Number)[^\n\r]*[\n\r]+(?:\d+\s+\d+\s+)?([A-Za-z]{2,5}\s+[A-Za-z0-9\-]{6,25}|[A-Za-z0-9\-]{7,25})',
            text,
            re.I
        )
        if m_grid:
            cand = re.sub(r'\s+', ' ', m_grid.group(1).strip())
            if is_valid_policy_number(cand):
                res['E&O Insurance'] = cand

    # Policy Number on same line or next line: "Policy Number: L3D-J571342-02" or "Policy Number\nL3D-J571342-02"
    if not res['E&O Insurance']:
        m_pol = re.search(r'Policy\s*(?:Number|No\.?|#)\s*[:\-]?\s*[\n\r\s]*([A-Za-z0-9\-_/]{5,30})', text, re.I)
        if m_pol:
            cand = m_pol.group(1).strip()
            if is_valid_policy_number(cand):
                res['E&O Insurance'] = cand

    # Certificate Number: "Certificate Number: N9PL096192"
    if not res['E&O Insurance']:
        m_cert = re.search(r'Certificate\s*(?:Number|No\.?|#)\s*[:\-]?\s*[\n\r\s]*([A-Za-z0-9\-_/]{5,30})', text, re.I)
        if m_cert:
            cand = m_cert.group(1).strip()
            if is_valid_policy_number(cand):
                res['E&O Insurance'] = cand

    # 6. E&O Insured Name
    m_ins = re.search(
        r'(?:NAMED\s*INSURED(?:\s*AND\s*MAILING\s*ADDRESS|\s*AND\s*ADDRESS)?|INSURED)\s*[:\-]?\s*[\n\r\s]*([^\n\r]{3,70})',
        text,
        re.I
    )
    if m_ins:
        cand_ins = m_ins.group(1).strip(" -:;,")
        if not re.search(r'(?:Certificate|Policy|Coverage|Limits|Item|Producer|Producer:|Date)', cand_ins, re.I):
            res['E&O Insured'] = cand_ins

    # 7. E&O Carrier / Insurance Company
    m_carrier = re.search(
        r'(?:Insurance\s*is\s*provided\s*by|INSURER\s*[A-Z]?|Insurance\s*Company|Carrier)\s*[:\-]?\s*([^\n\r,]{3,60})',
        text,
        re.I
    )
    if m_carrier:
        res['E&O Carrier'] = m_carrier.group(1).strip(" -:;,")
    elif "Hanover" in text:
        res['E&O Carrier'] = "The Hanover Insurance Group"
    elif "Continental Casualty" in text or "CNA" in text:
        res['E&O Carrier'] = "Continental Casualty Company / CNA"
    elif "BiBERK" in text or "National Liability" in text:
        res['E&O Carrier'] = "National Liability & Fire Insurance Company (BiBERK)"

    # 8. E&O Limit of Liability
    m_lim = re.search(
        r'(?:Limits\s*of\s*Liability|LIMIT\s*OF\s*LIABILITY|LIMITS|Each\s*Occurrence|Each\s*Claim)[^\$]{0,80}?(\$[0-9]{1,3}(?:,[0-9]{3})+)',
        text,
        re.I
    )
    if m_lim:
        res['E&O Limit'] = m_lim.group(1)

    # 9. E&O Deductible
    m_ded = re.search(
        r'(?:Deductible|DEDUCTIBLE)[^\$]{0,80}?(\$[0-9]{1,3}(?:,[0-9]{3})+)',
        text,
        re.I
    )
    if m_ded:
        res['E&O Deductible'] = m_ded.group(1)

    # Determine E&O Present vs Absent
    is_eo_doc = bool(re.search(
        r'\bE\s*&\s*O\b|Errors\s*(?:and|&)\s*Omissions|Certificate\s*of\s*(?:Liability\s*)?Insurance|Appraisers\s*Advantage|Professional\s*Liability',
        text,
        re.I
    ))
    if not is_eo_doc and not res['E&O Insurance'] and not (res['Policy Period From'] and res['Policy Period To']):
        res['E&O'] = 'Absent'
        res['E&O Present'] = 'Absent'
    else:
        res['E&O'] = 'Present'
        res['E&O Present'] = 'Present'

    return res


def extract_eo_insurance_from_doc(doc: pymupdf.Document, allow_ocr: bool = True) -> Dict[str, str]:
    """
    Locates the E&O (Errors & Omissions) Insurance page within a PDF Document
    and extracts:
      - 'E&O': 'Present' or 'Absent'
      - 'E&O Present': 'Present' or 'Absent'
      - 'E&O Insurance': Policy / Certificate Number
      - 'Policy Period From': Start / Inception / Effective Date
      - 'Policy Period To': Expiration / End Date
      - 'E&O Insured': Named Insured
      - 'E&O Carrier': Insurance Company
      - 'E&O Limit': Limit of Liability
      - 'E&O Deductible': Deductible
    Works seamlessly for both native text pages and scanned image exhibits.
    """
    result = {
        'E&O': 'Absent',
        'E&O Present': 'Absent',
        'E&O Insurance': '',
        'Policy Period From': '',
        'Policy Period To': '',
        'E&O Insured': '',
        'E&O Carrier': '',
        'E&O Limit': '',
        'E&O Deductible': ''
    }
    if doc is None or len(doc) == 0:
        return result

    eo_page_idx = None

    # Step 1: Find candidate E&O page index
    for idx in range(len(doc)):
        p = doc[idx]
        t = p.get_text('text')
        lines = [ln.strip() for ln in t.split('\n') if ln.strip()]
        header_lines = lines[:10]

        is_eo_page = False
        for hl in header_lines:
            hl_upper = hl.upper()
            if re.search(r'^\s*(?:E\s*&\s*O|ERRORS\s*(?:AND|&)\s*OMISSIONS)\s*$', hl, re.I):
                is_eo_page = True
                break
            if 'E&O' in hl_upper or 'ERRORS & OMISSIONS' in hl_upper or 'ERRORS AND OMISSIONS' in hl_upper:
                is_eo_page = True
                break
            if 'CERTIFICATE OF' in hl_upper and 'INSURANCE' in hl_upper:
                is_eo_page = True
                break
            if 'APPRAISERS ADVANTAGE' in hl_upper:
                is_eo_page = True
                break

        if not is_eo_page and re.search(r'Errors\s*(?:and|&)\s*Omissions', t, re.I):
            is_eo_page = True
        if not is_eo_page and re.search(r'Certificate\s+of\s+(?:Liability\s+)?Insurance', t, re.I):
            is_eo_page = True
        if not is_eo_page and re.search(r'Appraisers\s+Advantage|Professional\s+Liability\s+Insurance', t, re.I):
            is_eo_page = True

        if is_eo_page:
            eo_page_idx = idx
            break

    # Second pass: check full text of all pages for E&O keywords
    if eo_page_idx is None:
        for idx in range(len(doc)):
            p = doc[idx]
            t = p.get_text('text')
            if re.search(r'\bE&O\b|\bErrors\s*(?:and|&)\s*Omissions\b|Certificate\s+of\s+Liability\s+Insurance', t, re.I):
                eo_page_idx = idx
                break

    if eo_page_idx is None:
        result['E&O'] = 'Absent'
        result['E&O Present'] = 'Absent'
        return result

    # An E&O page was found!
    result['E&O'] = 'Present'
    result['E&O Present'] = 'Present'

    page = doc[eo_page_idx]
    native_text = page.get_text('text')

    # Step 2: Try native text first if present
    parsed = parse_eo_text(native_text)
    for k, v in parsed.items():
        if v:
            result[k] = v

    # If all primary fields found, return
    if result.get('E&O Insurance') and result.get('Policy Period From') and result.get('Policy Period To'):
        return result

    # Step 3: If native text is incomplete and page has images, run OCR
    if allow_ocr and len(page.get_images()) > 0:
        reader = get_easyocr_reader()
        if reader is not None:
            try:
                pix = page.get_pixmap(dpi=150)
                img = Image.open(io.BytesIO(pix.tobytes('png')))
                ocr_boxes = reader.readtext(np.array(img))

                ocr_text_lines = []
                policy_num_box = None
                prefix_box = None

                for bbox, box_text, prob in ocr_boxes:
                    t_clean = box_text.strip()
                    ocr_text_lines.append(t_clean)

                    if re.search(r'Policy\s*Number', t_clean, re.I):
                        policy_num_box = bbox
                    elif re.search(r'^Prefix$', t_clean, re.I):
                        prefix_box = bbox

                full_ocr_text = '\n'.join(ocr_text_lines)
                ocr_parsed = parse_eo_text(full_ocr_text)

                for k, v in ocr_parsed.items():
                    if not result.get(k) and v:
                        result[k] = v

                # If Policy Number was in a grid / table format (value in row below header)
                if not result.get('E&O Insurance') and policy_num_box is not None:
                    p_x0 = policy_num_box[0][0]
                    p_x1 = policy_num_box[1][0]
                    p_y1 = policy_num_box[2][1]

                    best_val = ''
                    prefix_val = ''

                    for bbox, box_text, prob in ocr_boxes:
                        t_val = box_text.strip()
                        b_x0, b_y0 = bbox[0][0], bbox[0][1]
                        b_x1, b_y1 = bbox[1][0], bbox[2][1]

                        # Value directly below 'Policy Number' header
                        if 0 <= (b_y0 - p_y1) <= 70:
                            if max(p_x0, b_x0) <= min(p_x1, b_x1) + 40:
                                if is_valid_policy_number(t_val):
                                    best_val = t_val

                        # Prefix directly below 'Prefix' header
                        if prefix_box is not None:
                            pref_y1 = prefix_box[2][1]
                            pref_x0 = prefix_box[0][0]
                            pref_x1 = prefix_box[1][0]
                            if 0 <= (b_y0 - pref_y1) <= 70:
                                if max(pref_x0, b_x0) <= min(pref_x1, b_x1) + 20:
                                    if re.match(r'^[A-Za-z]{2,6}$', t_val):
                                        prefix_val = t_val

                    if best_val:
                        result['E&O Insurance'] = f"{prefix_val} {best_val}".strip() if prefix_val else best_val

            except Exception as e:
                print(f"[eo_extractor] OCR extraction error: {e}")

    # Ensure E&O is marked Present if we found an E&O page or an E&O Insurance policy number
    if result.get('E&O Insurance') or eo_page_idx is not None:
        result['E&O'] = 'Present'
        result['E&O Present'] = 'Present'
    else:
        result['E&O'] = 'Absent'
        result['E&O Present'] = 'Absent'

    return result
