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


def parse_eo_text(text: str) -> Dict[str, str]:
    """Extracts E&O fields from text string using regex patterns."""
    res = {
        'E&O Insurance': '',
        'Policy Period From': '',
        'Policy Period To': ''
    }
    if not text:
        return res

    # 1. Dates: Effective / Inception / Start
    m_inc = re.search(
        r'(?:Inception|Effective\s*Date|Policy\s*Period\s*From|Policy\s*From|Effective)[:\s]*([0-1]?\d[/.-][0-3]?\d[/.-]\d{2,4}|[A-Za-z]{3,9}\s+\d{1,2},?\s+\d{4})',
        text,
        re.I
    )
    if m_inc:
        res['Policy Period From'] = normalize_date_str(m_inc.group(1))

    # 2. Dates: Expiration / Expires / End
    m_exp = re.search(
        r'(?:Expiration\s*Date|Expiration|Policy\s*Period\s*To|Policy\s*To|Expires|End\s*Date)[:\s]*([0-1]?\d[/.-][0-3]?\d[/.-]\d{2,4}|[A-Za-z]{3,9}\s+\d{1,2},?\s+\d{4})',
        text,
        re.I
    )
    if m_exp:
        res['Policy Period To'] = normalize_date_str(m_exp.group(1))

    # Fallback date range: "Policy Period: 03/31/2026 to 03/31/2027" or "From 03/31/2026 to 03/31/2027"
    if not (res['Policy Period From'] and res['Policy Period To']):
        m_range = re.search(
            r'(?:Policy\s*Period|Period|Coverage\s*Period)[^:\n]*[:\s]*([0-1]?\d[/.-][0-3]?\d[/.-]\d{2,4})\s*(?:to|-|through)\s*([0-1]?\d[/.-][0-3]?\d[/.-]\d{2,4})',
            text,
            re.I
        )
        if m_range:
            if not res['Policy Period From']:
                res['Policy Period From'] = normalize_date_str(m_range.group(1))
            if not res['Policy Period To']:
                res['Policy Period To'] = normalize_date_str(m_range.group(2))

    # 3. Policy Number
    # Match "Policy Number: 27611374926" or "Policy No.: ..." or "Policy #: ..."
    m_pol = re.search(r'Policy\s*(?:Number|No\.?|#)\s*[:\-]?\s*([A-Za-z0-9\-_/]{5,30})', text, re.I)
    if m_pol:
        candidate = m_pol.group(1).strip()
        if candidate.lower() not in ['insurance', 'provided', 'declarations', 'period', 'effective']:
            res['E&O Insurance'] = candidate

    # Match "Certificate Number: 27611374926"
    if not res['E&O Insurance']:
        m_cert = re.search(r'Certificate\s*(?:Number|No\.?|#)\s*[:\-]?\s*([A-Za-z0-9\-_/]{5,30})', text, re.I)
        if m_cert:
            candidate = m_cert.group(1).strip()
            if candidate.lower() not in ['insurance', 'provided', 'declarations']:
                res['E&O Insurance'] = candidate

    return res


def extract_eo_insurance_from_doc(doc: pymupdf.Document) -> Dict[str, str]:
    """
    Locates the E&O (Errors & Omissions) Insurance page within a PDF Document
    and extracts:
      - 'E&O Insurance': Policy / Certificate Number
      - 'Policy Period From': Start / Inception / Effective Date
      - 'Policy Period To': Expiration / End Date
    Works seamlessly for both native text pages and scanned image exhibits.
    """
    result = {
        'E&O Insurance': '',
        'Policy Period From': '',
        'Policy Period To': ''
    }
    if doc is None or len(doc) == 0:
        return result

    eo_page_idx = None

    # Step 1: Find candidate E&O page index
    for idx in range(len(doc)):
        p = doc[idx]
        t = p.get_text('text')
        lines = [ln.strip() for ln in t.split('\n') if ln.strip()]
        header_lines = lines[:7]

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

        if not is_eo_page and re.search(r'Errors\s*(?:and|&)\s*Omissions', t, re.I):
            is_eo_page = True

        if is_eo_page:
            eo_page_idx = idx
            break

    if eo_page_idx is None:
        return result

    page = doc[eo_page_idx]
    native_text = page.get_text('text')

    # Step 2: Try native text first if present
    parsed = parse_eo_text(native_text)
    if parsed.get('E&O Insurance') and parsed.get('Policy Period From') and parsed.get('Policy Period To'):
        return parsed

    result.update({k: v for k, v in parsed.items() if v})

    # Step 3: If native text is incomplete and page has images, run OCR
    if len(page.get_images()) > 0:
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

                if not result['Policy Period From'] and ocr_parsed.get('Policy Period From'):
                    result['Policy Period From'] = ocr_parsed['Policy Period From']
                if not result['Policy Period To'] and ocr_parsed.get('Policy Period To'):
                    result['Policy Period To'] = ocr_parsed['Policy Period To']
                if not result['E&O Insurance'] and ocr_parsed.get('E&O Insurance'):
                    result['E&O Insurance'] = ocr_parsed['E&O Insurance']

                # If Policy Number was in a grid / table format (value in row below header)
                if not result['E&O Insurance'] and policy_num_box is not None:
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
                                if re.search(r'^[A-Za-z0-9\-]{5,25}$', t_val) and t_val.lower() not in ['insurance', 'company', 'provided']:
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

    return result
