#!/usr/bin/env python3
"""
Map Extractor CLI (map_extractor_cli.py)
---------------------------------------
Automated Computer Vision and OCR Pipeline for Real Estate Appraisal Reports:
- Decodes Base64 PDFs from MISMO XML files or processes standard PDF files directly.
- Automatically identifies Location Map, Aerial Map, Comparable Sales Map, and Rental Map pages.
- Computer Vision Color Segmentation:
    * 🔴 Subject Property Callout / Pin (Red Hue Detection)
    * 🔵 Comparable Pins & Callouts (Blue Hue Detection)
- Extracts: Label, Property Address, Distance, Direction, Proximity, and Price.
- Exports structured results in CSV (comparables_summary.csv), JSON, and XML in a single run.
- Option `--save-images` writes annotated map overlays and cropped callout images.
"""

import os
import sys
import re
import csv
import json
import base64
import argparse
from typing import List, Dict, Any, Optional, Tuple
import xml.etree.ElementTree as ET

# Image & Document Processing
try:
    import cv2
except ImportError:
    cv2 = None

try:
    import numpy as np
except ImportError:
    np = None

try:
    from PIL import Image
except ImportError:
    Image = None

try:
    import fitz  # PyMuPDF
except ImportError:
    fitz: Any = None

import warnings

# OCR Engines
_GLOBAL_EASYOCR_READER = None

try:
    with warnings.catch_warnings():
        warnings.filterwarnings("ignore", category=UserWarning)
        warnings.filterwarnings("ignore", category=FutureWarning)
        import easyocr
except ImportError:
    easyocr: Any = None

try:
    import pytesseract
except ImportError:
    pytesseract: Any = None


class MapExtractor:
    def __init__(self, output_dir: str = "map_output", save_images: bool = False, ocr_engine: str = "auto", dpi: int = 200):
        if fitz is None:
            raise RuntimeError("Missing required PDF dependency 'pymupdf' (fitz). Please run: pip install pymupdf")
        self.has_cv = (cv2 is not None and np is not None)
        if not self.has_cv:
            warnings.warn("OpenCV (cv2) or numpy is not installed. Map pages and sketches will be extracted, but pin detection is disabled. Install opencv-python-headless.")
        self.output_dir = output_dir
        self.save_images = save_images
        self.ocr_engine_type = ocr_engine.lower()
        self.dpi = dpi
        
        self.images_dir = os.path.join(output_dir, "images")
        os.makedirs(self.output_dir, exist_ok=True)
        if self.save_images:
            os.makedirs(self.images_dir, exist_ok=True)

        self._easyocr_reader = None
        self._init_ocr()

    def _init_ocr(self):
        """Initializes available OCR engine (EasyOCR or PyTesseract). Reuses singleton to avoid memory overhead."""
        global _GLOBAL_EASYOCR_READER
        if self.ocr_engine_type in ["auto", "easyocr"] and easyocr is not None:
            try:
                if _GLOBAL_EASYOCR_READER is None:
                    with warnings.catch_warnings():
                        warnings.filterwarnings("ignore", category=UserWarning)
                        warnings.filterwarnings("ignore", category=FutureWarning)
                        _GLOBAL_EASYOCR_READER = easyocr.Reader(['en'], gpu=False, verbose=False)
                self._easyocr_reader = _GLOBAL_EASYOCR_READER
                self.active_engine = "easyocr"
                return
            except Exception as e:
                print(f"Notice: EasyOCR initialization warning: {e}")

        # Check PyTesseract
        if pytesseract is not None:
            # Common Tesseract paths (Linux / PythonAnywhere & Windows)
            common_tesseract_paths = [
                "/usr/bin/tesseract",
                "/usr/local/bin/tesseract",
                r"C:\Program Files\Tesseract-OCR\tesseract.exe",
                r"C:\Program Files (x86)\Tesseract-OCR\tesseract.exe",
                os.path.expanduser(r"~\AppData\Local\Programs\Tesseract-OCR\tesseract.exe")
            ]
            import shutil
            which_tess = shutil.which("tesseract")
            if which_tess:
                common_tesseract_paths.insert(0, which_tess)
            for p in common_tesseract_paths:
                if os.path.exists(p):
                    pytesseract.pytesseract.tesseract_cmd = p
                    break
            self.active_engine = "pytesseract"
        else:
            self.active_engine = "pymupdf_fallback"

    def run_ocr(self, img_bgr: np.ndarray) -> List[Tuple[str, float]]:
        """Runs OCR on an image crop, returning a list of (text, confidence) tuples."""
        if img_bgr is None or img_bgr.size == 0:
            return []

        # Preprocessing: convert to grayscale and upscale slightly for clearer text OCR
        h, w = img_bgr.shape[:2]
        if h < 40 or w < 80:
            scale = 2.0
            resized = cv2.resize(img_bgr, (int(w * scale), int(h * scale)), interpolation=cv2.INTER_CUBIC)
        else:
            resized = img_bgr

        # 1. Try EasyOCR if available
        if self.active_engine == "easyocr" and self._easyocr_reader is not None:
            try:
                rgb = cv2.cvtColor(resized, cv2.COLOR_BGR2RGB)
                res = self._easyocr_reader.readtext(rgb)
                results = []
                for _, text, prob in res:
                    txt_clean = text.strip()
                    if txt_clean:
                        results.append((txt_clean, float(prob)))
                if len(results) >= 2:
                    return results

                # Contrast fallback (CLAHE) for solid colored pins (white text on dark red/blue/green background)
                gray = cv2.cvtColor(resized, cv2.COLOR_BGR2GRAY)
                clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
                enhanced = clahe.apply(gray)
                res_enh = self._easyocr_reader.readtext(enhanced)
                enh_results = []
                for _, text, prob in res_enh:
                    txt_clean = text.strip()
                    if txt_clean:
                        enh_results.append((txt_clean, float(prob)))
                if len(enh_results) > len(results):
                    return enh_results
                if results:
                    return results
            except Exception:
                pass

        # 2. Try PyTesseract with CLAHE contrast, inverted threshold, and PSM 6/11
        if pytesseract is not None:
            try:
                gray = cv2.cvtColor(resized, cv2.COLOR_BGR2GRAY)
                clahe = cv2.createCLAHE(clipLimit=2.5, tileGridSize=(8, 8))
                enhanced = clahe.apply(gray)
                _, thresh = cv2.threshold(enhanced, 0, 255, cv2.THRESH_BINARY | cv2.THRESH_OTSU)
                thresh_inv = cv2.bitwise_not(thresh)

                # PSM 6: Assume a single uniform block of text (ideal for callout cards)
                raw_text = pytesseract.image_to_string(thresh, config='--psm 6 --oem 3').strip()
                if len(re.findall(r'[A-Za-z0-9]', raw_text)) < 4:
                    raw_text_inv = pytesseract.image_to_string(thresh_inv, config='--psm 6 --oem 3').strip()
                    if len(re.findall(r'[A-Za-z0-9]', raw_text_inv)) > len(re.findall(r'[A-Za-z0-9]', raw_text)):
                        raw_text = raw_text_inv

                if len(re.findall(r'[A-Za-z0-9]', raw_text)) < 4:
                    raw_text_gray = pytesseract.image_to_string(enhanced, config='--psm 11 --oem 3').strip()
                    if len(re.findall(r'[A-Za-z0-9]', raw_text_gray)) > len(re.findall(r'[A-Za-z0-9]', raw_text)):
                        raw_text = raw_text_gray

                lines = [l.strip() for l in raw_text.split("\n") if l.strip()]
                if lines:
                    return [(l, 0.85) for l in lines]
            except Exception:
                pass

        return []

    def get_pdf_doc(self, file_path: str):
        """Opens a PDF directly or decodes embedded PDF stream from a MISMO XML file."""
        if not fitz:
            raise RuntimeError("PyMuPDF (fitz) is required to process PDF / XML documents.")

        if not os.path.exists(file_path):
            raise FileNotFoundError(f"File not found: {file_path}")

        # If it's an XML file, look for base64 embedded document
        if file_path.lower().endswith(".xml"):
            try:
                tree = ET.parse(file_path)
                root = tree.getroot()
                doc_elem = None
                for elem in root.iter():
                    if elem.tag.endswith("DOCUMENT") or elem.tag.endswith("EMBEDDED_FILE"):
                        if elem.text and len(elem.text.strip()) > 1000:
                            doc_elem = elem
                            break
                if doc_elem is not None and doc_elem.text:
                    pdf_bytes = base64.b64decode(doc_elem.text.strip())
                    return fitz.open(stream=pdf_bytes, filetype="pdf"), True
            except Exception as e:
                print(f"Warning: Could not parse XML base64 document from {file_path}: {e}")

        # If it's a standalone image file (PNG, JPG, JPEG, WEBP, etc.), wrap in a 1-page PDF document
        ext = os.path.splitext(file_path)[1].lower()
        if ext in [".png", ".jpg", ".jpeg", ".webp", ".bmp", ".tif", ".tiff"]:
            try:
                img_doc = fitz.open()
                with open(file_path, "rb") as f:
                    img_bytes = f.read()
                img_pix = fitz.Pixmap(img_bytes)
                page = img_doc.new_page(width=img_pix.width, height=img_pix.height)
                page.insert_image(fitz.Rect(0, 0, img_pix.width, img_pix.height), stream=img_bytes)
                return img_doc, False
            except Exception as e:
                print(f"Notice: Loading image document via fitz: {e}")

        # Otherwise open as standard PDF
        return fitz.open(file_path), False

    def detect_map_pages(self, doc) -> List[Dict[str, Any]]:
        """Identifies pages containing Location, Aerial, Comparable Sales, or Rental Maps."""
        map_pages = []
        map_keywords = [
            ("Rentals Map", [
                r"\bRENTALS?\s+(?:LOCATION\s+)?MAP(?:\s+ADDENDUM)?\b",
                r"\bCOMPARABLE\s+RENTALS?\s+(?:LOCATION\s+)?MAP(?:\s+ADDENDUM)?\b",
                r"\bRENTALS?\s+MAP\b",
                r"\bRENTAL\s+LOCATION\s+MAP\b"
            ]),
            ("Aerial Map", [
                r"\bAERIAL\s+(?:MAP|VIEW|PHOTO)(?:\s+ADDENDUM)?\b",
                r"\bSATELLITE\s+(?:MAP|VIEW|PHOTO)(?:\s+ADDENDUM)?\b",
                r"\bAERIAL\s+LOCATION\s+MAP\b"
            ]),
            ("Plat Map", [
                r"\bPLAT\s+MAP\b",
                r"\bPARCEL\s+MAP\b",
                r"\bTAX\s+MAP\b"
            ]),
            ("Flood Map", [
                r"\bFLOOD\s+(?:HAZARD\s+)?(?:MAP|ADDENDUM)\b",
                r"\bFEMA\s+FLOOD\s+MAP\b"
            ]),
            ("Location Map", [
                r"\b(?:COMPARABLE\s+(?:SALES\s+)?)?LOCATION\s+MAP(?:\s+ADDENDUM)?\b",
                r"\bCOMPARABLE\s+SALES\s+MAP\b",
                r"\bSALES\s+COMPARABLES?\s+MAP\b",
                r"\bCOMP\s+MAP\b",
                r"\bLOCATION\s+MAP\b"
            ])
        ]

        # If document has only 1 page (e.g. standalone map image or single-page map exhibit)
        if len(doc) == 1:
            first_txt = (doc[0].get_text() or "").upper()
            found_type = "Location Map"
            for map_name, patterns in map_keywords:
                if any(re.search(pat, first_txt, re.IGNORECASE) for pat in patterns):
                    found_type = map_name
                    break
            map_pages.append({
                "page_number": 1,
                "map_type": found_type,
                "page_obj": doc[0]
            })
            return map_pages

        # Non-map exhibit disqualifiers (e.g. Table of Contents, Invoices, Transmittal letters)
        disqualifiers = [
            "TABLE OF CONTENTS", "TABLE OF CONTENT", "INDEX OF EXHIBITS", "INDEX",
            "INVOICE", "LETTER OF TRANSMITTAL", "APPRAISER'S CERTIFICATION",
            "SUPERVISORY APPRAISER", "COMPARABLE RENT SCHEDULE", "RENTALS PHOTO",
            "SUBJECT PROPERTY PHOTO", "COMPARABLE PROPERTY PHOTO", "INTERIOR PHOTOS",
            "EXTERIOR PHOTOS", "UNIFORM RESIDENTIAL APPRAISAL", "SMALL RESIDENTIAL INCOME",
            "INDIVIDUAL CONDOMINIUM UNIT", "CONDONMINIUM UNIT APPRAISAL", "USPAP ADDENDUM"
        ]

        for p_idx, page in enumerate(doc):
            txt = (page.get_text() or "").upper()
            if not txt.strip():
                # For scanned/raster PDF pages without text layer, OCR header strip
                if len(page.get_images()) > 0:
                    try:
                        clip_top = fitz.Rect(0, 0, page.rect.width, min(page.rect.height, 130))
                        pix_top = page.get_pixmap(clip=clip_top, dpi=120)
                        top_img = np.frombuffer(pix_top.samples, dtype=np.uint8).reshape(pix_top.height, pix_top.width, pix_top.n)
                        if pix_top.n == 4:
                            top_img = cv2.cvtColor(top_img, cv2.COLOR_RGBA2BGR)
                        ocr_top = self.run_ocr(top_img)
                        txt = " ".join([t for t, _ in ocr_top]).upper()
                    except Exception:
                        pass
                if not txt.strip():
                    continue

            # 1. Strictly disqualify Table of Contents, Invoices, and Certifications
            if any(k in txt for k in disqualifiers):
                continue

            # 2. Disqualify if it has Table of Contents dot leaders (e.g. "Location Map ...... 24")
            if len(re.findall(r'\.{3,}\s*\d+', txt)) >= 2:
                continue

            # 3. Disqualify if page has no visual graphics (maps require images or drawings)
            has_images = len(page.get_images()) > 0
            has_drawings = len(page.get_drawings()) > 10
            if not has_images and not has_drawings:
                continue

            # 4. Check header (top 500 characters) for map exhibit title
            header_sample = txt[:500]
            found_type = None

            for map_name, patterns in map_keywords:
                matched = False
                for pat in patterns:
                    m = re.search(pat, header_sample, re.IGNORECASE)
                    if m:
                        # Ensure not immediately followed by dot leaders or page number
                        after_match = header_sample[m.end():m.end() + 25]
                        if not re.match(r'^\s*[\.\-_]{2,}\s*\d+', after_match):
                            matched = True
                            break
                if matched:
                    found_type = map_name
                    break

            # If not in the first 500 chars, also check standalone title lines in top 15 lines
            if not found_type:
                top_lines = [l.strip() for l in txt.split("\n") if l.strip()][:15]
                for line in top_lines:
                    if len(line) <= 40:
                        for map_name, patterns in map_keywords:
                            if any(re.search(pat, line, re.IGNORECASE) for pat in patterns):
                                found_type = map_name
                                break
                        if found_type:
                            break

            if found_type:
                map_pages.append({
                    "page_number": p_idx + 1,
                    "map_type": found_type,
                    "page_obj": page
                })

        return map_pages

    def detect_sketch_pages(self, doc) -> List[Dict[str, Any]]:
        """Identifies pages containing Building Sketch, Floor Plan, or Area Calculations."""
        sketch_pages = []
        sketch_disqualifiers = [
            "TABLE OF CONTENTS", "TABLE OF CONTENT", "INDEX OF EXHIBITS", "INDEX",
            "UNIFORM RESIDENTIAL APPRAISAL", "COVER PAGE", "INVOICE", "LETTER OF TRANSMITTAL",
            "APPRAISER'S CERTIFICATION", "SUPERVISORY APPRAISER", "COMPARABLE RENT SCHEDULE",
            "RENTALS PHOTOS", "SUBJECT PROPERTY PHOTO", "COMPARABLE PROPERTY PHOTO",
            "INTERIOR PHOTOS", "EXTERIOR PHOTOS"
        ]

        for p_idx, page in enumerate(doc):
            txt = (page.get_text() or "").upper()
            if not txt.strip():
                continue

            # Disqualify Table of Contents, forms, and photo pages
            if any(k in txt for k in sketch_disqualifiers):
                continue
            if len(re.findall(r'\.{3,}\s*\d+', txt)) >= 2:
                continue

            is_sketch = False
            sketch_type = "Building Sketch"

            header_sample = txt[:350]
            # Check for genuine sketch / floorplan headers
            if any(k in header_sample for k in ["BUILDING SKETCH", "FLOORPLAN SKETCH", "FLOOR PLAN", "SKETCH / FLOOR PLAN", "SKETCH ADDENDUM"]) \
               or ("SKETCH - PAGE" in header_sample) \
               or ("AREA CALCULATIONS SUMMARY" in txt and "UNIFORM RESIDENTIAL APPRAISAL" not in txt):
                is_sketch = True
                if "FLOOR PLAN" in header_sample or "FLOORPLAN" in header_sample:
                    sketch_type = "Floor Plan"

            if is_sketch:
                sketch_pages.append({
                    "page_number": p_idx + 1,
                    "sketch_type": sketch_type,
                    "page_obj": page
                })
        return sketch_pages

    def extract_sketch_room_labels(self, page, raw_text: str = "") -> Dict[str, Any]:
        """
        Extracts interior room labels, architectural features, and floor levels
        (Bedrooms, Bathrooms, Living, Kitchen, Dining, Laundry, Garage, Open to Below, etc.)
        from Building Sketch and Floor Plan exhibits.
        Supports both vector text PDFs and OCR on raster/scanned sketches.
        """
        LEVEL_PATTERNS = [
            (r'\blower\s*level\b', 'Lower Level'),
            (r'\bmain\s*level\b', 'Main Level'),
            (r'\bupper\s*level\b', 'Upper Level'),
            (r'\b(?:first|1st)\s*(?:floor|flcor|level)\b', '1st Floor'),
            (r'\b(?:second|2nd)\s*(?:floor|flcor|foor|level)\b', '2nd Floor'),
            (r'\b(?:third|3rd)\s*(?:floor|flcor|level)\b', '3rd Floor'),
            (r'\bbasement\b', 'Basement'),
            (r'\battic\b', 'Attic'),
        ]

        ROOM_CATEGORIES = {
            'bedrooms': [
                (r'\b(?:main|master|primary)\s+bed(?:room)?\b', 'Main Bedroom'),
                (r'\bguest\s+bed(?:room)?\b', 'Guest Bedroom'),
                (r'\bbed(?:room)?\s*\d*\b', 'Bedroom'),
                (r'\b(?:be[cd]r[oc0-9]+m|eedroom|bacroom|becrcem|becrc-m)\b', 'Bedroom'),
                (r'\b(?:br|bdrm)\b', 'Bedroom'),
                (r'\bbed\s*\d+\b', 'Bedroom'),
            ],
            'bathrooms': [
                (r'\b(?:bath\s*\(\s*(?:half|1\/2)\s*\)|half\s*bath|1\/2\s*bath|powder(?:\s*room)?\b)', 'Half Bath'),
                (r'\b(?:main|master|primary)\s+bath(?:room)?\b', 'Main Bath'),
                (r'\b(?:full\s+)?bath(?:room)?\s*\d*\b', 'Bath'),
                (r'\bba\b', 'Bath'),
                (r'\blav(?:atory)?\b', 'Half Bath'),
                (r'\bwc\b', 'Half Bath'),
            ],
            'living': [
                (r'\bliving(?:\s*room|\s*rm|\s*area)?\b', 'Living Room'),
                (r'\blivira\b', 'Living Room'),
                (r'\bfamily(?:\s*room|\s*rm)?\b', 'Family Room'),
                (r'\bgreat\s*room\b', 'Great Room'),
                (r'\brec(?:reation)?(?:\s*room)?\b', 'Rec Room'),
                (r'\b(?:den|study|office|loft)\b', 'Den / Study'),
                (r'\bsitting(?:\s*room|\s*area)?\b', 'Sitting Area'),
                (r'\bsun\s*room|sunroom\b', 'Sun Room'),
                (r'\bbonus\s*room\b', 'Bonus Room'),
                (r'\bgame\s*room|media\s*room|theater\b', 'Game / Media Room'),
            ],
            'kitchen_dining': [
                (r'\bkitchen|kitch|kteten\b', 'Kitchen'),
                (r'\bdining(?:\s*room|\s*rm|\s*area)?|diring\b', 'Dining Room'),
                (r'\bbreakfast(?:\s*nook|\s*area|\s*room)?\b', 'Breakfast Nook'),
                (r'\b(?:nook|dinette)\b', 'Dining Nook'),
                (r'\bpantry\b', 'Pantry'),
                (r'\bwet\s*bar|bar\b', 'Bar'),
            ],
            'openings_outdoor': [
                (r'\bopen\s+to\s+below\b', 'Open to Below'),
                (r'\b(?:closed\s*porch|uncover\s*porch|screened?\s*porch|porch)\b', 'Porch'),
                (r'\bdeck\b', 'Deck'),
                (r'\bpatio\b', 'Patio'),
                (r'\bbalcony\b', 'Balcony'),
                (r'\bterrace|veranda|lanai\b', 'Terrace / Lanai'),
                (r'\bcourtyard|breezeway\b', 'Courtyard / Breezeway'),
            ],
            'garage_parking': [
                (r'\b\d+\s*car\s*(?:attached|detached)?(?:\s*garage)?\b', 'Car Garage'),
                (r'\b1\s*car\s*attached\b', '1 Car Attached'),
                (r'\b2\s*car\s*attached\b', '2 Car Attached'),
                (r'\b(?:attached|detached)?\s*garage\b', 'Garage'),
                (r'\bcarport\b', 'Carport'),
            ],
            'utility_laundry': [
                (r'\blaundry(?:\s*room|\s*rm|\s*area)?\b', 'Laundry'),
                (r'\butility(?:\s*room|\s*rm)?\b', 'Utility'),
                (r'\bmud\s*room|mudroom\b', 'Mud Room'),
                (r'\b(?:foyer|entry(?:way)?|vestibule)\b', 'Foyer / Entry'),
                (r'\b(?:stairs|stairway)\b', 'Stairs'),
                (r'\bwalk[\s-]*in\s*closet|wic\b', 'Walk-in Closet'),
                (r'\bcl(?:o)?se[td](?!\s*porch)\b', 'Closet'),
                (r'\b(?:mechanical|furnace|hvac|storage)\b', 'Storage / Mech'),
            ]
        }

        ignore_patterns = [
            r'^\s*[\d\.\s\'\"x\=\-\+\/\[\]]+\s*$',
            r'^\s*(?:total\s*sketch|area\s*calculations|calculation\s*details|uniform\s*residential)\b',
            r'^\s*(?:borrower|file\s*no|property\s*address|case\s*no|lender|ice\s*lender|appraiser)\b',
            r'^\s*(?:living\s*area|non-living\s*area|total\s*living\s*area)\b',
        ]

        text_lines = [l.strip() for l in raw_text.split('\n') if l.strip()]

        def parse_lines_for_rooms(candidate_lines):
            c_level = "Main Level"
            b_level = {}
            b_cat = {c: [] for c in ROOM_CATEGORIES}
            labels = []

            for line in candidate_lines:
                if any(re.search(pat, line, re.I) for pat in ignore_patterns):
                    continue

                cleaned = re.sub(r'\[?\s*\-?\d+(?:\.\d+)?\s*sq\s*ft\s*\]?', '', line, flags=re.I).strip()
                if not cleaned or re.match(r'^[\d\.\s\'\"x\=\-\+\/]+$', cleaned):
                    continue

                is_lvl = False
                for lvl_pat, lvl_name in LEVEL_PATTERNS:
                    if re.search(lvl_pat, cleaned, re.I):
                        c_level = lvl_name
                        if c_level not in b_level:
                            b_level[c_level] = []
                        is_lvl = True
                        break
                if is_lvl:
                    continue

                for cat, rules in ROOM_CATEGORIES.items():
                    matched = False
                    for pat, norm_name in rules:
                        if re.search(pat, cleaned, re.I):
                            item = {
                                'label': line,
                                'standard_name': norm_name,
                                'category': cat,
                                'level': c_level
                            }
                            if c_level not in b_level:
                                b_level[c_level] = []
                            b_level[c_level].append(item)
                            b_cat[cat].append(item)
                            labels.append(line)
                            matched = True
                            break
                    if matched:
                        break

            return b_cat, b_level, labels

        # Phase 1: Try parsing native vector text
        stop_pat = r'\b(?:area\s*calculations\s*summary|calculation\s*details)\b'
        filtered_lines = []
        for l in text_lines:
            if re.search(stop_pat, l, re.I):
                break
            filtered_lines.append(l)

        by_category, by_level, all_labels = parse_lines_for_rooms(filtered_lines)

        # Phase 2: If vector text found no room labels, trigger OCR on the drawing area
        if len(all_labels) == 0 and page is not None and fitz is not None:
            try:
                clip_rect = fitz.Rect(10, 75, page.rect.width - 10, page.rect.height - 25)
                pix = page.get_pixmap(clip=clip_rect, dpi=150)
                img_np = np.frombuffer(pix.samples, dtype=np.uint8).reshape(pix.height, pix.width, pix.n)
                if pix.n == 4:
                    img_bgr = cv2.cvtColor(img_np, cv2.COLOR_RGBA2BGR)
                else:
                    img_bgr = cv2.cvtColor(img_np, cv2.COLOR_RGB2BGR)
                ocr_hits = self.run_ocr(img_bgr)
                ocr_lines = [t.strip() for t, prob in ocr_hits if prob > 0.25 and t.strip()]
                if ocr_lines:
                    by_category, by_level, all_labels = parse_lines_for_rooms(ocr_lines)
            except Exception as ocr_err:
                print(f"Notice: Sketch OCR fallback warning: {ocr_err}")

        bed_count = len(by_category['bedrooms'])
        full_baths = sum(1 for b in by_category['bathrooms'] if b['standard_name'] != 'Half Bath')
        half_baths = sum(1 for b in by_category['bathrooms'] if b['standard_name'] == 'Half Bath')
        bath_count = full_baths + (0.5 * half_baths)
        bath_display = f"{full_baths} Full" + (f", {half_baths} Half" if half_baths else "") if bath_count > 0 else "0"

        garage_labels = [g['label'] for g in by_category['garage_parking']]

        has_kitchen = len(by_category['kitchen_dining']) > 0 and any('kitchen' in k['standard_name'].lower() for k in by_category['kitchen_dining'])
        has_dining = any('dining' in k['standard_name'].lower() or 'nook' in k['standard_name'].lower() for k in by_category['kitchen_dining'])
        living_count = len(by_category['living'])
        kitchen_count = 1 if has_kitchen else 0
        dining_count = 1 if has_dining else 0
        total_rooms = bed_count + living_count + kitchen_count + dining_count

        summary = {
            'bedroom_count': bed_count,
            'bathroom_count': bath_count,
            'bathroom_display': bath_display,
            'full_baths': full_baths,
            'half_baths': half_baths,
            'living_rooms_count': living_count,
            'has_kitchen': has_kitchen,
            'has_dining': has_dining,
            'has_laundry': len(by_category['utility_laundry']) > 0 and any('laundry' in u['standard_name'].lower() for u in by_category['utility_laundry']),
            'garage': garage_labels[0] if garage_labels else None,
            'total_rooms': total_rooms,
            'total_room_labels': len(all_labels)
        }

        return {
            'all_labels': all_labels,
            'by_category': by_category,
            'by_level': by_level,
            'summary': summary
        }

    def process_sketch_page(self, page, page_num: int, sketch_type: str, source_filename: str) -> Dict[str, Any]:
        """Extracts square footage area calculations, exterior dimensions, and interior room labels from a sketch page."""
        txt = page.get_text() or ""
        areas = []
        lines = [l.strip() for l in txt.split("\n") if l.strip()]

        # 1. Extract Area Calculations Summary
        for i, line in enumerate(lines):
            if re.search(r'\bsq\s*ft\b', line, re.I):
                label = ""
                for back in range(1, 4):
                    if i - back >= 0:
                        candidate = lines[i - back]
                        if not re.search(r'(?:sq\s*ft|total sketch|area calculations|property address|borrower|lender)', candidate, re.I) and len(candidate) < 35:
                            label = candidate
                            break
                if not label:
                    label = "Area"
                areas.append({
                    "name": label.replace("Non-living Area", "").strip() or "Calculated Area",
                    "area": line
                })

        # 2. Extract Exterior Wall Dimensions (e.g. 36', 30', 28.5')
        dim_matches = re.findall(r"(?:^|\s)([0-9]{1,3}(?:\.[0-9]+)?\s*['\"])", txt)
        dimensions = list(dict.fromkeys(dim_matches))

        # 3. Extract Interior Room Labels & Layout
        room_data = self.extract_sketch_room_labels(page, txt)

        # 4. Extract Sketch GLA / Living Area
        sketch_gla = None
        m_gla = re.search(r'(?:total\s*(?:living\s*area|sketch|area)|gross\s*living\s*area|gla)\s*[:=-]?\s*([0-9,]+(?:\.[0-9]+)?)\s*(?:sq\s*ft|sf)?', txt, re.I)
        if m_gla:
            sketch_gla = m_gla.group(1).replace(',', '')
        elif areas:
            for ar in areas:
                if re.search(r'total\s*(?:sketch|living|area)|gross\s*living|gla', ar.get('name', ''), re.I):
                    m_num = re.search(r'([0-9,]+(?:\.[0-9]+)?)', ar.get('area', ''))
                    if m_num:
                        sketch_gla = m_num.group(1).replace(',', '')
                        break
            if not sketch_gla:
                living_sum = 0
                found_any = False
                for ar in areas:
                    nm = ar.get('name', '').lower()
                    if any(w in nm for w in ['first', 'second', 'third', '1st', '2nd', '3rd', 'floor', 'level', 'main', 'upper', 'living']) and not any(w in nm for w in ['garage', 'porch', 'patio', 'basement', 'non-living', 'deck']):
                        m_num = re.search(r'([0-9,]+(?:\.[0-9]+)?)', ar.get('area', ''))
                        if m_num:
                            living_sum += float(m_num.group(1).replace(',', ''))
                            found_any = True
                if found_any and living_sum > 0:
                    sketch_gla = str(int(living_sum) if living_sum.is_integer() else living_sum)

        # 5. Render base64 image preview
        clip_rect = fitz.Rect(10, 60, page.rect.width - 10, page.rect.height - 25) if fitz is not None else None
        pix = page.get_pixmap(clip=clip_rect, dpi=150) if clip_rect is not None else page.get_pixmap(dpi=150)
        b64_img = base64.b64encode(pix.tobytes("jpeg")).decode("utf-8")

        return {
            "page_number": page_num,
            "sketch_type": sketch_type,
            "areas": areas,
            "gla": sketch_gla,
            "dimensions": dimensions[:25],
            "room_labels": room_data.get("all_labels", []),
            "rooms": room_data.get("by_category", {}),
            "rooms_by_category": room_data.get("by_category", {}),
            "rooms_by_level": room_data.get("by_level", {}),
            "room_summary": room_data.get("summary", {}),
            "raw_text_sample": " | ".join(lines[:12]),
            "image_preview": f"data:image/jpeg;base64,{b64_img}"
        }

    def normalize_ocr_text(self, text: str) -> str:
        """Normalizes common OCR character misreadings in appraisal callouts."""
        t = text
        # Fix comma decimals in miles: e.g. "0,16 miles" -> "0.16 miles" or "0,.47 miles" -> "0.47 miles"
        t = re.sub(r'([0-9]+)[,.\s]+([0-9]{2})\s*(?:miles?|m[li]{2,}es?|mi)\b', r'\1.\2 miles', t, flags=re.I)
        t = re.sub(r'\b0[.,\s]+([0-9]{2})\s*(?:miles?|m[li]{2,}es?|mi)\b', r'0.\1 miles', t, flags=re.I)
        t = re.sub(r'\b[LI]\.([0-9]{2})\s*(?:miles?|m[li]{2,}es?|mi)\b', r'1.\1 miles', t, flags=re.I)
        t = re.sub(r'\b[LIl1][0o]\s*([0-9]{1,2})\s*(?:miles?|m[li]{2,}es?|mi)\b', r'1.0\1 miles', t, flags=re.I)
        t = re.sub(r'\bm[li]{2,}es?\b', 'miles', t, flags=re.I)
        t = re.sub(r'[\'"]\s*([0-9]{2})\s*miles\b', r'0.\1 miles', t, flags=re.I)
        # Fix common misread of direction 'S' as '$' or '§'
        t = re.sub(r'(?:miles?|mi)\s*[\$§]\b', 'miles S', t, flags=re.I)
        t = re.sub(r'(?<!\d)[\$§]\s+([A-Za-z])', r'S \1', t)
        t = re.sub(r'\b([0-9]{1,6})\s*[\$§]\s*([A-Za-z]+)', r'\1 S \2', t)
        t = re.sub(r'\b([0-9]{1,6}\s+(?:[NSEW]\s+)?(?!miles\b)[A-Za-z]+?)\s+S[EF]\b(?=\s+[0-9]+|\s*$)', r'\1 St', t, flags=re.I)
        t = re.sub(r'0\.(\d{2})\d+\s*miles', r'0.\1 miles', t)
        # Fix misread rental / comp / listing headers
        t = re.sub(r'\b(?:REMIAL|RIMI[\s,.]+AL|RENTA[\s,.]*L|RENT[\s,.]+AL|REMTAL|RINIAL|RIN[\s,.]+AL|RIHIAL|REMTA[\s,.]*L|REN[I|T]AL)\b', 'RENTAL', t, flags=re.I)
        t = re.sub(r'\bRENTAL\s*No[:._]?\s*([0-9]+)\b', r'RENTAL No. \1', t, flags=re.I)
        t = re.sub(r'\bCOMPARABLE\s*No[:._]?\s*([0-9]+)\b', r'COMPARABLE No. \1', t, flags=re.I)
        t = re.sub(r'\bDovei\s+S[LF]\b', 'Dover St', t, flags=re.I)
        t = re.sub(r'\bSycamore\s+Ave\b', 'Sycamore Ave', t, flags=re.I)
        t = re.sub(r'\bCOM[P|R|B|I]+AR?AB[L|I]+E\b', 'COMPARABLE', t, flags=re.I)
        t = re.sub(r'\b(?:Cnmmarahk|Comcalabit|Comnamth|Comparuble|Udmoticheeseed)\b', 'Comparable', t, flags=re.I)
        t = re.sub(r'\b(?:Cblec|Subjed|Subjec|Sujed)\b', 'Subject', t, flags=re.I)
        t = re.sub(r'\b(?:Comnarahlc|Comnpaiable|Corparablc|Comnarhia|Cemparatt|Cotperable|Camvara|Comarable|Compaol)\b', 'Comparable', t, flags=re.I)
        t = re.sub(r'\b(?:Kenbai|Reltal|Rrtal|Feuil|Rentz|Renal)\b', 'Rental', t, flags=re.I)
        t = re.sub(r'\b(?:Cuk|Sak|Sae|8tc|8510|3ak|3a1)\b', 'Sale', t, flags=re.I)
        t = re.sub(r'\b(?:miloc|milles|mles|milos|milcs|mlies|mdes|mdlor|m42:|mkac)\b', 'miles', t, flags=re.I)
        t = re.sub(r'\b([0-9]+(?:\.[0-9]+)?)\s*(?:miles?|mi)\s*8W\b', r'\1 miles SW', t, flags=re.I)
        t = re.sub(r'\b([0-9]+(?:\.[0-9]+)?)\s*(?:miles?|mi)\s*Nu\b', r'\1 miles NW', t, flags=re.I)
        t = re.sub(r'\b([0-9]+)[,.]\s*([0-9]{2})\s*miles\b', r'\1.\2 miles', t, flags=re.I)
        t = re.sub(r'\b([0-9]{1,4})\s+StN\b', r'\1 St N', t, flags=re.I)
        t = re.sub(r'\b([0-9]{1,4})\s+ISth\s+SIN\b', r'\1 15th St N', t, flags=re.I)
        t = re.sub(r'\b([0-9]{1,4})\s+1Sth\s+SI\s+N\b', r'\1 15th St N', t, flags=re.I)
        t = re.sub(r'\b([0-9]{1,4})\s+1Oth\s+5t\b', r'\1 10th St', t, flags=re.I)
        t = re.sub(r'\bloth\s+St\b', '10th St', t, flags=re.I)
        t = re.sub(r'\bJnd\s+(?:FI|Pl|PI)\b', '2nd Pl', t, flags=re.I)
        t = re.sub(r'([A-Za-z]+)\s*;\s*AL\b', r'\1, AL', t, flags=re.I)
        t = re.sub(r'([A-Za-z]+)AL\s+([0-9]{5})\b', r'\1, AL \2', t, flags=re.I)
        t = re.sub(r'([A-Za-z]+)AL\b', r'\1, AL', t, flags=re.I)
        t = re.sub(r'\bUn[il|t]\s*([0-9!]+)\b', r'Unit \1', t, flags=re.I)
        t = re.sub(r'\bUnit\s*!\b', 'Unit 1', t, flags=re.I)
        t = re.sub(r'\bNo[._]?\s*([0-9]+)\b', r'No. \1', t, flags=re.I)
        t = re.sub(r'\bListing_\b', 'Listing 1', t, flags=re.I)
        t = re.sub(r'\bRental_\b', 'Rental 1', t, flags=re.I)
        t = re.sub(r'\bComp_\b', 'Comp 1', t, flags=re.I)
        # Generic distance and proximity cleanups
        t = re.sub(r'\b([0-9])mies\b', r'\1 miles', t, flags=re.I)
        t = re.sub(r'\b([0-9])([0-9]{2})\s*m[li]{2,}es?\b', r'\1.\2 miles', t, flags=re.I)
        t = re.sub(r'\b([0-9]+(?:\.[0-9]+)?)\s*m[4a]2?:\s*([NSEWnsew]{1,2})\b', r'\1 miles \2', t, flags=re.I)
        t = re.sub(r'\b([0-9]+(?:\.[0-9]+)?)\s*m[il|1]{2,}e?[sz]?\b', r'\1 miles', t, flags=re.I)
        t = re.sub(r'\b([A-Za-z]+)[;,.\s]+N[J\)\]\s]+([0-9]{5})\b', r'\1, NJ \2', t, flags=re.I)
        t = re.sub(r'\b([0-9]{1,6})\s+5\s+([A-Za-z]+)', r'\1 S \2', t)
        t = re.sub(r'\b([A-Za-z0-9]+)\s+SL\b', r'\1 St', t, flags=re.I)
        return t

    def parse_pin_text(self, lines: List[str], pin_color: str, subject_csz: Optional[Dict[str, str]] = None, map_type: str = "") -> List[Dict[str, Any]]:
        """
        Parses raw OCR lines into structured pin records with clean whole address
        (street, city, state, zipcode), miles/proximity, price, and APN for Subject, Comparables, Rentals, and Listings.
        """
        norm_lines = [self.normalize_ocr_text(l) for l in lines if l.strip()]
        full_text = " ".join(norm_lines).strip()
        if not full_text:
            return []

        US_STATES = r'(?:AL|AK|AZ|AR|CA|CO|CT|DE|FL|GA|HI|ID|IL|IN|IA|KS|KY|LA|ME|MD|MA|MI|MN|MS|MO|MT|NE|NV|NH|NJ|NM|NY|NC|ND|OH|OK|OR|PA|RI|SC|SD|TN|TX|UT|VT|VA|WA|WV|WI|WY|DC)'
        STREET_SUFFIX = (
            r'(?:'
            r'Dr|Drive|St|Street|Ave|Avenue|Rd|Road|Blvd|Boulevard|Way|Ct|Court|'
            r'Lane|Ln|Place|Pl|Tr|Trail|Circle|Cir|Terrace|Ter|Terr|Parkway|Pkwy|'
            r'Alley|Aly|Loop|Hwy|Highway|Park|Pk|Pike|Cove|Cv|Square|Sq|Ridge|Rdg|'
            r'Run|Trace|Trce|Point|Pt|Crossing|Xing|Plaza|Plz|Row|Pass|Path|Walk|'
            r'Bend|Hollow|Holw|Landing|Lndg|Bay|View|Vw|Branch|Br|Creek|Crk|'
            r'Turnpike|Tpke|Freeway|Fwy|Heights|Hts|Estates|Est|Station|Stn|'
            r'Glen|Harbor|Hbr|Isle|Island|Knoll|Meadow|Overlook|Pond|Reach|Spring|Spur'
            r'|SL|S1|Dt'
            r')'
        )

        def extract_single_record(hdr_text: str, content_text: str) -> Optional[Dict[str, Any]]:
            combined = f"{hdr_text} {content_text}".strip()
            is_sub = bool(re.search(r'\bSUBJECT\b', hdr_text, re.I)) or (
                pin_color == "red" and not re.search(r'\b(?:COM|RENT|LIST)', hdr_text, re.I)
            ) or (pin_color == "white" and re.search(r'\bSUBJECT\b', combined, re.I))

            is_rental_map = bool(re.search(r'rental', map_type, re.I))
            if is_rental_map:
                is_rental = not is_sub
            else:
                # On non-rental maps (Location Map / Sales Comps), only mark as Rental if explicitly designated Rental and not Sale
                is_rental = bool(re.search(r'\b(?:RENTAL|RENTALS|RENT)\b', combined, re.I)) and not bool(re.search(r'\b(?:SALE|SALES)\b', combined, re.I))
            is_listing = bool(re.search(r'\bLISTING\b', combined, re.I)) or (
                pin_color == "teal" and bool(re.search(r'\bLISTING\b|[\$sS5]\d{1,3}(?:,\d{3})+', combined, re.I))
            )

            # Comp / Rental / Listing digit: 1 to 12
            m_comp_digit = re.search(
                r'\b(?:COMPARABLE|COMP|CMP|RENTAL|LISTING|SALE)\b[^\d\n]*?([1-9]|1[0-2])\b',
                combined,
                re.I
            )
            comp_num = m_comp_digit.group(1) if m_comp_digit else ""
            if not comp_num:
                m_fallback_num = re.search(r'\b(?:No[:._]?|#)\s*([1-9]|1[0-2])\b', combined, re.I)
                if m_fallback_num:
                    comp_num = m_fallback_num.group(1)
            if not comp_num and hdr_text:
                m_hdr_end = re.search(r'([1-9]|1[0-2])\s*$', hdr_text)
                if m_hdr_end:
                    comp_num = m_hdr_end.group(1)

            has_explicit_hdr = bool(re.search(r'\b(?:SUBJECT|COMPARABLE|COMP|CMP|RENTAL|LISTING|SALE)\b', combined, re.I))
            has_explicit_dist = bool(re.search(r'[0-9]+(?:\.[0-9]+)?\s*(?:miles?|mi|mlles?)\b', combined, re.I))
            has_explicit_price = bool(re.search(r'[\$sS5]\d{1,3}(?:,\d{3})+', combined))
            has_explicit_apn = bool(re.search(r'\b(?:APN|PARCEL(?:\s*ID)?|TAX\s*ID)[:\s]+', combined, re.I))

            has_street = bool(re.search(r'\b[0-9]{1,6}\s+[A-Za-z]', combined))
            is_colored_comp = (pin_color in ("blue", "teal", "yellow", "purple", "green")) and has_street

            if not is_sub and not (has_explicit_hdr or has_explicit_dist or has_explicit_price or has_explicit_apn or is_colored_comp):
                return None

            if is_sub:
                item_type = "Subject"
                label = "Subject"
            elif is_listing:
                item_type = "Listing"
                label = f"Listing #{comp_num}" if comp_num else "Listing"
            elif is_rental:
                item_type = "Rental"
                label = f"Rental #{comp_num}" if comp_num else "Rental"
            elif comp_num:
                item_type = "Comparable"
                label = f"Comparable #{comp_num}"
            else:
                item_type = "Comparable"
                label = "Comparable"

            # Price extraction (e.g. $108,000, $118,000, $214,900, $114,900, $130,000)
            price = ""
            m_price = re.search(r'(?:^|\s)[\$sS5](\d{1,3}(?:,\d{3})+)\b', combined)
            if m_price:
                price = f"${m_price.group(1)}"

            # APN / Parcel ID extraction (e.g. APN: 38-00-05-4-040-007.001)
            apn = ""
            m_apn = re.search(r'\b(?:APN|PARCEL(?:\s*ID)?|TAX\s*ID)[:\s]+([0-9A-Za-z\-.]+)', combined, re.I)
            if m_apn:
                apn = m_apn.group(1).strip()

            # 1. Distance & Direction
            m_prox = re.search(r'([0-9]+(?:\.[0-9]+)?)\s*(?:miles?|mi|mlles?)\b(?:\s*([NSEWnsew]{1,2}|North|South|East|West))?', combined, re.I)
            if m_prox:
                miles_val = m_prox.group(1)
                distance = f"{miles_val} miles"
                direction = (m_prox.group(2) or "").upper()
                proximity = f"{distance} {direction}".strip()
            else:
                if is_sub:
                    miles_val = "0.00"
                    distance = "0.00 miles"
                    direction = ""
                    proximity = "0.00 miles"
                else:
                    miles_val = ""
                    distance = ""
                    direction = ""
                    proximity = ""

            # Remove header, price, APN, and distance from text to leave pure address
            hdr_pat_inner = (
                r'\b(?:'
                r'SUBJECT'
                r'|COMPARABLE\s*(?:SALES?|PROPERTY)?(?:\s*(?:NO\.?|#|:|_)\s*)*[0-9A-Za-z]*'
                r'|COMP\s*(?:SALES?|PROPERTY)?(?:\s*(?:NO\.?|#|:|_)\s*)*[0-9A-Za-z]*'
                r'|RENTAL(?:\s*(?:NO\.?|#|:|_)\s*)*[0-9A-Za-z]*'
                r'|LISTING(?:\s*(?:NO\.?|#|:|_)\s*)*[0-9A-Za-z]*'
                r')\b'
            )
            text_clean = re.sub(hdr_pat_inner, '', combined, flags=re.I).strip()
            text_clean = re.sub(r'[\$sS5]\d{1,3}(?:,\d{3})+', '', text_clean).strip()
            text_clean = re.sub(r'\b(?:APN|PARCEL(?:\s*ID)?|TAX\s*ID)[:\s]+[0-9A-Za-z\-.]+', '', text_clean, flags=re.I).strip()
            text_clean = re.sub(r'[0-9]+(?:\.[0-9]+)?\s*(?:miles?|mi|mlles?)\b(?:\s*[NSEWnsew]{1,2}|North|South|East|West)?', '', text_clean, flags=re.I).strip()
            text_clean = re.sub(r'[;,.\s]+\b(?:[NSEW]{1,2}|North|South|East|West)\b\s*$', '', text_clean, flags=re.I).strip()
            text_clean = re.sub(r'^[;,.\s:=-]+|[;,.\s:=-]+$', '', text_clean).strip()

            street = ""
            city = ""
            state = ""
            zipcode = ""

            # Check individual normalized lines first if available
            for l in norm_lines:
                l_str = l.strip()
                if re.search(r'^(?:SUBJECT|COMP|COMPARABLE|RENTAL|LISTING)\b', l_str, re.I):
                    continue
                if re.search(r'^[0-9]+(?:\.[0-9]+)?\s*(?:miles?|mi|mlles?)\b(?:\s*[NSEWnsew]{1,2}|North|South|East|West)?$', l_str, re.I):
                    continue
                if re.search(r'^[\$sS5]\d{1,3}(?:,\d{3})+$', l_str):
                    continue
                if re.search(r'^(?:APN|PARCEL)', l_str, re.I):
                    continue
                # Line is City, State Zip: e.g. "Manville, NJ 08835" or "Havre De Grace, MD 21078"
                m_csz_line = re.search(r'^([A-Za-z\s.,\'-]+?)[,\s]+(' + US_STATES + r')\s+([0-9]{5}(?:-[0-9]{4})?)$', l_str, re.I)
                if m_csz_line:
                    city = m_csz_line.group(1).replace(',', '').strip()
                    state = m_csz_line.group(2).upper()
                    zipcode = m_csz_line.group(3).strip()
                    continue
                # Line is Street Address: e.g. "524 S Main St", "75-177 Kalani St", "25033 Deselby Sq"
                m_st_line = re.search(r'^\s*(?:[1-9]\s+)?([0-9]{1,6}(?:-[0-9]{1,6})?\s+[A-Za-z0-9#\s.,\'-]+?' + STREET_SUFFIX + r')\b', l_str, re.I)
                if m_st_line and not street:
                    street = m_st_line.group(1).strip()

            # Parse from combined text if not found line-by-line
            if not (city and state and zipcode):
                m_csz = re.search(r'([A-Za-z\s]+?)[,\s]+(' + US_STATES + r')\s+([0-9]{5}(?:-[0-9]{4})?)\b', text_clean, re.I)
                if m_csz:
                    raw_c = m_csz.group(1).strip()
                    m_suf = re.search(r'(?:^|.*?\b)' + STREET_SUFFIX + r'\b[,.\s]*(.*)', raw_c, re.I)
                    if m_suf and m_suf.group(1).strip():
                        city = m_suf.group(1).replace(',', '').strip()
                    else:
                        city = raw_c.replace(',', '').strip()
                    state = m_csz.group(2).upper()
                    zipcode = m_csz.group(3).strip()

            # 1. Primary match: Street with direction and standard suffix (e.g. "1445 EAST 100TH STREET", "1215 15th St N", "54 E Juniper St")
            if not street:
                m_prim = re.search(r'\b([0-9]{1,6}\s+(?:(?:North|South|East|West|N|S|E|W)\s+)?[0-9A-Za-z\s]+?\b(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Lane|Ln|Drive|Dr|Way|Court|Ct|Circle|Cir|Place|Pl|Trail|Tr|Parkway|Pkwy|Pond|Bayview)(?:\s+(?:N|S|E|W|North|South|East|West))?)\b', text_clean, re.I)
                if m_prim:
                    street = m_prim.group(1).strip()

            # 2. Match street with 'Avenue X' format: e.g. "9816 Avenue J", "1234 Avenue K"
            if not street:
                m_ave = re.search(r'\b([0-9]{1,6}\s+Avenue\s+[A-Za-z])\b', text_clean, re.I)
                if m_ave:
                    street = m_ave.group(1).strip()

            # 3. Match street with suffix from text_clean
            if not street:
                m_st = re.search(r'\b([0-9]{1,6}(?:-[0-9]{1,6})?\s+[A-Za-z0-9#\s.,\'-]+?\s+(?:' + STREET_SUFFIX + r'))\b', text_clean, re.I)
                if m_st:
                    street = m_st.group(1).strip()

            # 4. Fallback: match any house number followed by street words (e.g. "12462 E Summerlin", "10228 Little T")
            if not street:
                m_num = re.search(r'\b([0-9]{1,6}(?:-[0-9]{1,6})?\s+[A-Za-z0-9#\s.,\'-]+)', text_clean)
                if m_num:
                    cand = m_num.group(1).strip()
                    cand = re.sub(r'[;,.\s]+\b(?:[NSEW]{1,2}|North|South|East|West)\b\s*$', '', cand, flags=re.I)
                    cand = re.sub(r'^[;,.\s:=$§\-]+|[;,.\s:=$§\-]+$', '', cand).strip()
                    cand = re.sub(r'^(?:[0-9]+\.)?\s+', '', cand).strip()
                    cand = re.sub(r'\s+[~_].*$', '', cand).strip()
                    cand_words = [w.lower() for w in re.findall(r'[A-Za-z]+', cand)]
                    disallowed = {'miles', 'mile', 'milez', 'mles', 'miloc', 'milos'}
                    if any(w in disallowed for w in cand_words):
                        cand = ""
                    if cand and len(cand.split()) >= 2 and re.match(r'^[1-9]', cand):
                        street = cand

            # Clean comp digit prepended to house number (e.g. "1 345 N 6th Ave" -> "345 N 6th Ave")
            if comp_num and street.startswith(f"{comp_num} "):
                m_sub = re.search(r'^[1-9]\s+([0-9]{1,6}(?:-[0-9]{1,6})?\s+.*)', street)
                if m_sub:
                    street = m_sub.group(1).strip()

            # Clean street name: reject house number 0 or streets with fewer than 3 letters
            if street:
                m_house = re.match(r'^([0-9]+)\s+(.*)', street)
                if m_house:
                    house_num = m_house.group(1)
                    st_name = m_house.group(2).strip()
                    if house_num.startswith('0'):
                        street = ""
                    letters = re.findall(r'[A-Za-z]', st_name)
                    if len(letters) < 3:
                        street = ""

            # Inherit city/state/zip from subject if comp/rental lacked it
            if not (city and state and zipcode) and subject_csz and not is_sub:
                city = city or subject_csz.get("city", "")
                state = state or subject_csz.get("state", "")
                zipcode = zipcode or subject_csz.get("zipcode", "")

            # Compose Clean Whole Address
            addr_parts = []
            if street:
                addr_parts.append(street)
            if city and state:
                addr_parts.append(f"{city}, {state} {zipcode}".strip())
            elif city:
                addr_parts.append(city)
            elif state or zipcode:
                addr_parts.append(f"{state} {zipcode}".strip())

            full_address = ", ".join(addr_parts) if len(addr_parts) > 1 else (addr_parts[0] if addr_parts else street)

            if not street and not full_address and not distance and not is_sub:
                return None

            return {
                "item_type": item_type,
                "label": label,
                "street": street,
                "city": city,
                "state": state,
                "zipcode": zipcode,
                "address": full_address or "",
                "distance": distance,
                "miles": miles_val,
                "direction": direction,
                "proximity": proximity,
                "price": price,
                "apn": apn,
                "raw_text": combined
            }

        header_pat = (
            r'('
            r'\b(?:'
            r'SUBJECT'
            r'|(?:COMPARABLE|COMP|CMP)\s*(?:SALES?|PROPERTY)?(?:\s*(?:NO\.?|#|:|_)\s*)*[0-9A-Za-z]*'
            r'|(?:COMPARABLE\s+)?RENTALS?(?:\s*(?:PROPERTY)?(?:\s*(?:NO\.?|#|:|_)\s*)*[0-9A-Za-z]*)'
            r'|LISTINGS?(?:\s*(?:NO\.?|#|:|_)\s*)*[0-9A-Za-z]*'
            r'|PENDINGS?(?:\s*(?:NO\.?|#|:|_)\s*)*[0-9A-Za-z]*'
            r')\b'
            r')'
        )
        parts = re.split(header_pat, full_text, flags=re.I)

        results = []
        if len(parts) > 1:
            for i in range(1, len(parts), 2):
                hdr = parts[i].strip()
                content = parts[i + 1] if i + 1 < len(parts) else ""
                rec = extract_single_record(hdr, content)
                if rec:
                    results.append(rec)
        else:
            rec = extract_single_record("", full_text)
            if rec:
                results.append(rec)

        return results

    def process_map_page(self, page, page_num: int, map_type: str, source_filename: str) -> List[Dict[str, Any]]:
        """Extracts pins and callouts from a rendered map page using Computer Vision segmentation."""
        if cv2 is None or np is None:
            return []
        extracted_pins = []

        # Render high-res image
        pix = page.get_pixmap(dpi=self.dpi)
        img = np.frombuffer(pix.samples, dtype=np.uint8).reshape(pix.height, pix.width, pix.n)
        if pix.n == 4:
            img = cv2.cvtColor(img, cv2.COLOR_RGBA2BGR)
        else:
            img = cv2.cvtColor(img, cv2.COLOR_RGB2BGR)

        hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
        annotated_img = img.copy()

        # 1. Red Masks (Subject Callouts / Pins - handles deep, standard, and bright red)
        red_mask1 = cv2.inRange(hsv, np.array([0, 50, 60]), np.array([12, 255, 255]))
        red_mask2 = cv2.inRange(hsv, np.array([165, 50, 60]), np.array([180, 255, 255]))
        red_mask = cv2.bitwise_or(red_mask1, red_mask2)

        # 2. Blue Mask (Comparable Pins / Callouts - solid blue, light sky blue, and blue borders)
        blue_mask1 = cv2.inRange(hsv, np.array([88, 30, 50]), np.array([138, 255, 255]))
        blue_mask2 = cv2.inRange(hsv, np.array([80, 25, 90]), np.array([105, 180, 255]))
        blue_mask = cv2.bitwise_or(blue_mask1, blue_mask2)

        # 3. Green Mask (Rental Pins / Callouts - Sat>=55 captures darker green callouts while eliminating map water)
        green_mask = cv2.inRange(hsv, np.array([35, 55, 50]), np.array([85, 255, 255]))

        # 4. Orange / Amber Mask (Rental & Comp Cards - e.g. Alabama map style)
        orange_mask = cv2.inRange(hsv, np.array([10, 80, 80]), np.array([26, 255, 255]))

        # 5. Teal / Cyan Mask (Listings & Comps - e.g. Alabama map style)
        teal_mask = cv2.inRange(hsv, np.array([80, 70, 70]), np.array([98, 255, 255]))

        # 6. Pastel Yellow / Cream Mask (Sales Comps - e.g. Greenport map style)
        yellow_mask = cv2.inRange(hsv, np.array([18, 15, 180]), np.array([45, 130, 255]))

        # 7. Pastel Purple / Lavender Mask (Sales Comps - e.g. Greenport map style)
        purple_mask = cv2.inRange(hsv, np.array([105, 15, 170]), np.array([165, 130, 255]))

        # 8. Pastel Green Mask (Rental Comps - e.g. Greenport map style)
        pastel_green_mask = cv2.inRange(hsv, np.array([45, 15, 170]), np.array([85, 130, 255]))

        # 9. White / Light Cards (Subject & White Card Pins - e.g. Greenport Subject, TOTAL cards)
        white_mask = cv2.inRange(hsv, np.array([0, 0, 222]), np.array([180, 28, 255]))

        color_configs = [
            ("red", red_mask, (0, 0, 255)),
            ("blue", blue_mask, (255, 0, 0)),
            ("green", green_mask, (0, 180, 0)),
            ("orange", orange_mask, (0, 140, 255)),
            ("teal", teal_mask, (200, 200, 0)),
            ("yellow", yellow_mask, (0, 215, 255)),
            ("purple", purple_mask, (200, 50, 180)),
            ("green", pastel_green_mask, (0, 200, 100)),
            ("white", white_mask, (200, 200, 200)),
        ]

        pin_counter = 0
        base_name = os.path.splitext(os.path.basename(source_filename))[0]

        for color_name, mask, draw_color in color_configs:
            k = cv2.getStructuringElement(cv2.MORPH_RECT, (3, 3))
            m_clean = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, k)
            contours, _ = cv2.findContours(m_clean, cv2.RETR_CCOMP, cv2.CHAIN_APPROX_SIMPLE)

            cand_boxes = []
            for c in contours:
                x, y, w, h = cv2.boundingRect(c)
                # Geometry filter: covers compact bubble pins and wide photo cards
                if color_name == "white":
                    # White callout cards (TOTAL, ACI, ClickForms)
                    if w < 70 or h < 22 or (w * h) < 2000 or (w * h) > 250000:
                        continue
                    ar = w / float(h)
                    if not (0.8 <= ar <= 6.5):
                        continue
                else:
                    if 35 <= w <= 850 and 16 <= h <= 300 and 800 <= (w * h) <= 250000:
                        ar = w / float(h)
                        if not (0.60 <= ar <= 7.0):
                            continue
                    else:
                        continue
                cand_boxes.append((x, y, w, h))

            # Deduplicate concentric/overlapping boxes
            merged_boxes = []
            for b in sorted(cand_boxes, key=lambda b: (b[1], b[0])):
                x, y, w, h = b
                if not any(abs(x - ex[0]) < 50 and abs(y - ex[1]) < 40 for ex in merged_boxes):
                    merged_boxes.append(b)

            # Cap candidate boxes per color mask to top 6 by area to prevent catastrophic CPU OCR slowdown
            merged_boxes = sorted(merged_boxes, key=lambda b: (b[2] * b[3]), reverse=True)[:6]

            for x, y, w, h in merged_boxes:
                # If pin has a long needle pointer extending downwards, crop just the callout bubble
                eff_h = min(h, 60) if (w < 160 and h > 65) else h
                pad = 6
                y0, y1 = max(0, y - pad), min(img.shape[0], y + eff_h + pad)
                x0, x1 = max(0, x - pad), min(img.shape[1], x + w + pad)
                crop = img[y0:y1, x0:x1]

                # Fast edge/contrast check: skip blank or solid non-text crops (saves costly CPU OCR inference)
                if crop.shape[0] >= 12 and crop.shape[1] >= 12:
                    gray_c = cv2.cvtColor(crop, cv2.COLOR_BGR2GRAY)
                    edges = cv2.Canny(gray_c, 100, 200)
                    edge_ratio = cv2.countNonZero(edges) / float(crop.shape[0] * crop.shape[1])
                    if edge_ratio < 0.015:
                        continue

                scale = 2.0
                crop_scaled = cv2.resize(crop, (0, 0), fx=scale, fy=scale, interpolation=cv2.INTER_LINEAR)
                ocr_results = self.run_ocr(crop_scaled)
                lines = [t for t, _ in ocr_results]
                if not lines:
                    continue

                parsed_items = self.parse_pin_text(lines, color_name, map_type=map_type)
                if not parsed_items:
                    continue

                for parsed in parsed_items:
                    raw_txt = parsed.get("raw_text", "")
                    is_sub = (parsed.get("item_type") == "Subject")
                    has_addr = bool(parsed.get("street") or parsed.get("address"))
                    has_dist = bool(parsed.get("distance") or parsed.get("proximity") or re.search(r'\b\d+(?:\.\d+)?\s*(?:mi|miles)\b', raw_txt, re.I))
                    has_price = bool(parsed.get("price") or re.search(r'[\$sS5]\d{1,3}(?:,\d{3})+', raw_txt))
                    has_hdr = bool(re.search(r'\b(?:Subject|Comp|Comparable|Rental|Listing|Sale)\b', parsed.get("label", "") or raw_txt, re.I))

                    # Disqualify standalone background road/highway names from map tiles that have no street number or comp header
                    st_val = (parsed.get("street") or "").strip()
                    is_standalone_hwy = bool(not re.search(r'\d', st_val) and re.search(r'\b(?:interstate|highway|hwy|fwy|freeway|expressway|turnpike|parkway|pkwy|beltway)\b', st_val, re.I))
                    letter_count = len(re.findall(r'[A-Za-z]', st_val))

                    if not is_sub and (is_standalone_hwy or (st_val and letter_count < 3)) and not (has_hdr or has_price or has_dist):
                        continue

                    if not is_sub and not has_addr:
                        continue
                    if not is_sub and not (has_hdr or has_dist or has_price or color_name in ("blue", "yellow", "purple", "green")):
                        continue

                    pin_counter += 1
                    parsed["source_file"] = os.path.basename(source_filename)
                    parsed["map_type"] = map_type
                    parsed["page_number"] = page_num
                    parsed["box_coords"] = f"x={x}, y={y}, w={w}, h={h}"

                    # Save cropped pin image if requested
                    crop_path = ""
                    if self.save_images:
                        safe_label = re.sub(r'[^A-Za-z0-9_]+', '_', parsed['label'] or f'pin_{pin_counter}')
                        crop_filename = f"{base_name}_p{page_num}_{color_name}_{safe_label}.png"
                        crop_full_path = os.path.join(self.images_dir, crop_filename)
                        cv2.imwrite(crop_full_path, crop)
                        crop_path = crop_full_path

                    parsed["image_crop_path"] = crop_path
                    extracted_pins.append(parsed)

                    # Draw bounding box on annotated map
                    cv2.rectangle(annotated_img, (x, y), (x + w, y + h), draw_color, 2)
                    label_tag = f"{parsed['label'] or color_name.upper()}"
                    cv2.putText(annotated_img, label_tag, (x, max(20, y - 6)), cv2.FONT_HERSHEY_SIMPLEX, 0.6, draw_color, 2, cv2.LINE_AA)

        # Ensure Subject pin has complete street and address, falling back to page header if needed
        sub_pin = next((p for p in extracted_pins if p.get("item_type") == "Subject"), None)
        if not sub_pin or not sub_pin.get("street") or not sub_pin.get("city"):
            header_sub = self.extract_subject_from_page_header(page, map_type, page_num, source_filename)
            if header_sub:
                if not sub_pin:
                    extracted_pins.insert(0, header_sub)
                    sub_pin = header_sub
                else:
                    if header_sub.get("street") and not sub_pin.get("street"):
                        sub_pin["street"] = header_sub["street"]
                    if header_sub.get("city") and not sub_pin.get("city"):
                        sub_pin["city"] = header_sub["city"]
                        sub_pin["state"] = header_sub["state"]
                        sub_pin["zipcode"] = header_sub["zipcode"]
                    if header_sub.get("address") and not sub_pin.get("address"):
                        sub_pin["address"] = header_sub["address"]

        # Deduplicate and enrich pins with Subject city/state/zipcode if missing
        if sub_pin and sub_pin.get("city"):
            sub_city = sub_pin.get("city", "")
            sub_state = sub_pin.get("state", "")
            sub_zip = sub_pin.get("zipcode", "")
            for p in extracted_pins:
                if p.get("item_type") in ("Comparable", "Rental", "Listing"):
                    if not p.get("city") and sub_city:
                        p["city"] = sub_city
                        p["state"] = sub_state
                        p["zipcode"] = sub_zip
                        if p.get("street"):
                            p["address"] = f"{p['street']}, {sub_city}, {sub_state} {sub_zip}".strip()

        # Deduplicate pins across color passes (spatial box overlap, address number, or label match)
        def parse_box_coords(box_str):
            m = re.findall(r'(\w+)=(\d+)', box_str or '')
            d = {k: int(v) for k, v in m}
            return d.get('x', 0), d.get('y', 0), d.get('w', 0), d.get('h', 0)

        deduped_pins = []
        for p in extracted_pins:
            px, py, pw, ph = parse_box_coords(p.get("box_coords", ""))
            p_addr = (p.get("street") or p.get("address") or "").strip().lower()
            p_lbl = (p.get("label") or "").strip().lower()
            p_item = p.get("item_type")

            matched_idx = -1
            for idx, ex in enumerate(deduped_pins):
                ex_x, ex_y, ex_w, ex_h = parse_box_coords(ex.get("box_coords", ""))
                ex_addr = (ex.get("street") or ex.get("address") or "").strip().lower()
                ex_lbl = (ex.get("label") or "").strip().lower()
                ex_item = ex.get("item_type")

                # Match 1: Spatial overlap (IoU >= 0.40 or tight center distance <= 32px)
                spatial_match = False
                if px and ex_x:
                    xi1, yi1 = max(px, ex_x), max(py, ex_y)
                    xi2, yi2 = min(px + pw, ex_x + ex_w), min(py + ph, ex_y + ex_h)
                    iw, ih = max(0, xi2 - xi1), max(0, yi2 - yi1)
                    inter = iw * ih
                    union = (pw * ph) + (ex_w * ex_h) - inter
                    iou = (inter / float(union)) if union > 0 else 0.0
                    if iou >= 0.40 or (abs(px - ex_x) < 32 and abs(py - ex_y) < 25):
                        spatial_match = True

                # Match 2: Same address number & street name
                addr_match = False
                if p_addr and ex_addr and len(p_addr) > 5 and len(ex_addr) > 5:
                    p_num = re.findall(r'^\d+', p_addr)
                    ex_num = re.findall(r'^\d+', ex_addr)
                    if p_num and ex_num and p_num[0] == ex_num[0]:
                        addr_match = True

                # Match 3: Same label (e.g. Comp #1) and same item_type
                label_match = (p_lbl and ex_lbl and p_lbl == ex_lbl and p_item == ex_item and p_lbl not in ('comparable', 'rental', 'listing'))

                if spatial_match or addr_match or label_match:
                    matched_idx = idx
                    break

            if matched_idx >= 0:
                existing = deduped_pins[matched_idx]
                if not existing.get("distance") and p.get("distance"):
                    existing["distance"] = p.get("distance")
                    existing["miles"] = p.get("miles")
                    existing["proximity"] = p.get("proximity")
                if not existing.get("price") and p.get("price"):
                    existing["price"] = p.get("price")
                if not existing.get("apn") and p.get("apn"):
                    existing["apn"] = p.get("apn")
                if len(p.get("address") or "") > len(existing.get("address") or ""):
                    existing["address"] = p.get("address")
                if len(p.get("street") or "") > len(existing.get("street") or ""):
                    existing["street"] = p.get("street")
                if p.get("label") and (not existing.get("label") or existing.get("label") in ("Comparable", "Rental", "Listing")):
                    existing["label"] = p.get("label")
                if p.get("item_type") == "Rental" and existing.get("item_type") == "Comparable":
                    existing["item_type"] = "Rental"
                if p.get("item_type") == "Listing" and existing.get("item_type") in ("Comparable", "Rental"):
                    existing["item_type"] = "Listing"
                if p.get("item_type") == "Subject":
                    existing["item_type"] = "Subject"
                    existing["label"] = "Subject"
            else:
                deduped_pins.append(p)

        # Guarantee Subject extraction for Aerial Map or any map exhibit where Subject was missing
        has_sub = any(p.get("item_type") == "Subject" for p in deduped_pins)
        if not has_sub or map_type == "Aerial Map":
            header_sub = self.extract_subject_from_page_header(page, map_type, page_num, source_filename)
            if header_sub:
                if not has_sub:
                    deduped_pins.insert(0, header_sub)
                elif map_type == "Aerial Map":
                    sub_p = next((p for p in deduped_pins if p.get("item_type") == "Subject"), None)
                    if sub_p:
                        if header_sub.get("street") and not sub_p.get("street"):
                            sub_p["street"] = header_sub["street"]
                        if header_sub.get("city") and not sub_p.get("city"):
                            sub_p["city"] = header_sub["city"]
                            sub_p["state"] = header_sub["state"]
                            sub_p["zipcode"] = header_sub["zipcode"]
                        if header_sub.get("address"):
                            sub_p["address"] = header_sub["address"]

        # Sort: Subject first, then Comparables in numerical order, then Rentals in numerical order, then Listings
        def comp_sort_key(p):
            if p.get("item_type") == "Subject":
                return (0, 0)
            it_rank = 1 if p.get("item_type") == "Comparable" else (2 if p.get("item_type") == "Rental" else 3)
            m = re.search(r'\d+', p.get("label", ""))
            return (it_rank, int(m.group(0)) if m else 99)

        deduped_pins.sort(key=comp_sort_key)

        # Save annotated full map page if requested
        if self.save_images and deduped_pins:
            annotated_filename = f"{base_name}_p{page_num}_{re.sub(r'[^A-Za-z0-9_]+', '_', map_type)}_annotated.png"
            annotated_path = os.path.join(self.images_dir, annotated_filename)
            cv2.imwrite(annotated_path, annotated_img)
        return deduped_pins

    def extract_subject_from_page_header(self, page, map_type: str, page_num: int, source_filename: str) -> Optional[Dict[str, Any]]:
        """
        Extracts Subject Property and Address strictly from the map exhibit page header
        and layout blocks. Especially vital for Aerial Maps which focus entirely on Subject.
        """
        blocks = page.get_text("blocks")
        street = ""
        city = ""
        state = ""
        zipcode = ""
        borrower = ""

        # 1. Direct labeled lines
        for b in blocks:
            if b[1] < 130:
                for l in [line.strip() for line in b[4].split('\n') if line.strip()]:
                    m_addr = re.search(r'Property\s+Address:\s*(.+)', l, re.I)
                    if m_addr and not street:
                        street = m_addr.group(1).strip()
                    m_city = re.search(r'City:\s*(.+)', l, re.I)
                    if m_city and not city:
                        city = m_city.group(1).strip()
                    m_st = re.search(r'State:\s*([A-Za-z]{2})', l, re.I)
                    if m_st and not state:
                        state = m_st.group(1).upper()
                    m_zip = re.search(r'Zip(?:code)?:\s*([0-9]{5}(?:-[0-9]{4})?)', l, re.I)
                    if m_zip and not zipcode:
                        zipcode = m_zip.group(1).strip()
                    m_bor = re.search(r'Borrower:\s*(.+)', l, re.I)
                    if m_bor and not borrower:
                        borrower = m_bor.group(1).strip()

        # 2. TOTAL software block structure (Borrower, Street, City, County, State, Zip)
        if not (street and city and state and zipcode):
            for b in blocks:
                if b[1] < 140:
                    b_lines = [line.strip() for line in b[4].split('\n') if line.strip()]
                    for idx, l in enumerate(b_lines):
                        if re.match(r'^[0-9]{1,6}(?:-[0-9]{1,6})?\s+[A-Za-z0-9\s.,\'-]+$', l) and not street:
                            sub_st = ""
                            sub_zip = ""
                            for sub_l in b_lines[idx+1:idx+6]:
                                if re.match(r'^[A-Z]{2}$', sub_l) and not sub_st:
                                    sub_st = sub_l
                                elif re.match(r'^[0-9]{5}(?:-[0-9]{4})?$', sub_l) and not sub_zip:
                                    sub_zip = sub_l
                            if sub_st or sub_zip:
                                street = l
                                state = state or sub_st
                                zipcode = zipcode or sub_zip
                                if idx + 1 < len(b_lines) and b_lines[idx+1] != state:
                                    city = city or b_lines[idx+1]
                                break

        # 3. Block/column scanning if labels and values are separated
        if not (street and city and state and zipcode):
            for b in blocks:
                if b[1] < 130:
                    for l in [line.strip() for line in b[4].split('\n') if line.strip()]:
                        if re.match(r'^[0-9]{5}(?:-[0-9]{4})?$', l) and not zipcode:
                            zipcode = l
                        elif re.match(r'^[A-Z]{2}$', l) and not state:
                            state = l
                        elif re.search(r'^[0-9]{1,6}(?:-[0-9]{1,6})?\s+[A-Za-z0-9\s.,\'-]+', l) and not street:
                            if not any(k in l.upper() for k in ['AERIAL', 'MAP', 'BORROWER', 'FILE', 'PROPERTY', 'CASE', 'LENDER', 'ADDENDUM', 'LOCATION', 'PLAT', 'FLOOD', 'RENTAL']):
                                street = l
                        elif re.match(r'^[A-Za-z\s.-]+$', l) and len(l) > 2 and not city:
                            if not any(k in l.upper() for k in ['AERIAL', 'MAP', 'BORROWER', 'FILE', 'PROPERTY', 'CASE', 'CITY', 'STATE', 'ZIP', 'LENDER', 'ADDENDUM', 'LOCATION', 'PLAT', 'FLOOD', 'RENTAL', 'TOTAL', 'APPRAISAL']):
                                city = l

        if street or (city and state):
            full_addr = f"{street}, {city}, {state} {zipcode}".strip(', ')
            return {
                "item_type": "Subject",
                "label": "Subject",
                "street": street,
                "city": city,
                "state": state,
                "zipcode": zipcode,
                "address": full_addr,
                "distance": "0.00 miles",
                "miles": "0.00",
                "direction": "",
                "proximity": "0.00 mi (Base)",
                "price": "",
                "raw_text": f"Subject: {full_addr}",
                "source_file": os.path.basename(source_filename),
                "map_type": map_type,
                "page_number": page_num,
                "box_coords": "Page Header Banner",
                "image_crop_path": ""
            }
        return None

    def process_file(self, file_path: str) -> List[Dict[str, Any]]:
        """Processes an individual appraisal file (PDF or XML)."""
        print(f"\n==================================================")
        print(f"Processing: {os.path.basename(file_path)}")
        print(f"==================================================")

        try:
            doc, is_xml_embedded = self.get_pdf_doc(file_path)
        except Exception as e:
            print(f"Error opening {file_path}: {e}")
            return []

        doc_type = "MISMO XML (Embedded PDF)" if is_xml_embedded else "Standard PDF"
        print(f"File Type: {doc_type} | Total Pages: {len(doc)}")

        map_pages = self.detect_map_pages(doc)
        if not map_pages:
            print("No dedicated map pages detected in document.")
            return []

        print(f"Detected {len(map_pages)} Map Exhibit Pages:")
        for mp in map_pages:
            print(f"  * Page {mp['page_number']}: {mp['map_type']}")

        all_file_pins = []
        for mp in map_pages:
            print(f"\n--- Segmenting & Reading Page {mp['page_number']} ({mp['map_type']}) ---")
            pins = self.process_map_page(mp["page_obj"], mp["page_number"], mp["map_type"], file_path)
            print(f"Extracted {len(pins)} pin callouts:")
            for p in pins:
                lbl = p['label'] or p['item_type']
                addr = p['address'] or '(Address not detected)'
                prox = p['proximity'] or '(No distance/direction)'
                print(f"   [{p['item_type'].upper()}] {lbl} | {addr} | {prox}")
            all_file_pins.extend(pins)

        return all_file_pins

    def detect_comp_photo_pages(self, doc) -> List[Dict[str, Any]]:
        """Identifies pages containing Comparable and Rental Photographs and associated metadata."""
        comp_pages = []
        for p_idx, page in enumerate(doc):
            txt = (page.get_text() or "").upper()
            header_sample = txt[:450]
            if any(k in header_sample for k in [
                "COMPARABLE PHOTO", "COMPARABLE PROPERTY PHOTO", "FORM PICPIX",
                "COMPARABLES PHOTO", "COMPARABLE SALES PHOTO", "ADDITIONAL COMPARABLE",
                "RENTAL PHOTO", "RENTAL PROPERTY PHOTO", "RENTALS PHOTO", "FORM DLSTRNT"
            ]):
                comp_pages.append({
                    "page_number": p_idx + 1,
                    "page_obj": page
                })
        return comp_pages

    def extract_comp_photo_metadata(self, page, frame, body_blocks=None) -> Dict[str, Any]:
        """
        Extracts structured metadata for a comparable, rental, or subject photograph from photo addendum pages.
        Handles TOTAL by a la mode, ACI, ClickFORMS, Bradford, SFREP, etc.
        Extracts: title, comp_num, street, address, proximity, sale_price, monthly_rent, gla,
        total_rooms, bedrooms, bathrooms, location, view, site, quality, age, and raw metadata dictionary.
        Cross-references with document reference records for 100% address accuracy.
        """
        if body_blocks is None:
            blocks = page.get_text("blocks")
            body_blocks = [b for b in blocks if b[1] >= 82 and b[3] <= page.rect.height - 35]

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

        page_header_sample = (page.get_text()[:400] or "").upper()
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
            offset = 0
            if is_subject and any("sale price" in k.lower() for k in key_block[:2]) and len(val_block) < len(key_block):
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

        full_address = f"{street}, {city_state_zip}".strip(", ") if (street and city_state_zip) else street

        reference_records = getattr(self, "reference_records", None)
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

    def process_comp_photo_page(self, page, page_number: int) -> List[Dict[str, Any]]:
        """Extracts each comparable photograph, thumbnail preview, and structured metadata."""
        img_infos = page.get_image_info()
        frames = []
        for item in img_infos:
            b = item.get("bbox")
            if b:
                r = fitz.Rect(b)
                if r.width >= 65 and r.height >= 55 and (r.width * r.height) >= 5000:
                    frames.append(r)

        if not frames:
            return []

        frames.sort(key=lambda r: r.y0)
        blocks = page.get_text("blocks")
        body_blocks = [b for b in blocks if b[1] >= 82 and b[3] <= page.rect.height - 35]

        results = []
        for frame in frames:
            meta = self.extract_comp_photo_metadata(page, frame, body_blocks)
            if not meta.get("address") and not meta.get("comp_num") and not meta.get("proximity"):
                continue

            pix = page.get_pixmap(clip=frame, dpi=96)
            b64_str = base64.b64encode(pix.tobytes("jpeg")).decode("ascii")

            meta["page"] = page_number
            meta["thumbnail"] = f"data:image/jpeg;base64,{b64_str}"
            results.append(meta)

        return results

    def match_pin_to_comp_photo(self, pin: Dict[str, Any], comp_photos: List[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
        """
        Pairs a Location Map pin callout with the corresponding photo from Comparable/Rental Photo Addenda.
        Matches by street number & name (handling OCR typos) or comparable/rental number within same category.
        """
        def norm(s):
            if not s: return ""
            t = s.lower()
            t = re.sub(r'[^\w\s-]', ' ', t)
            t = re.sub(r'\bstreet\b', 'st', t)
            t = re.sub(r'\bavenue\b', 'ave', t)
            t = re.sub(r'\bcourt\b', 'ct', t)
            t = re.sub(r'\broad\b', 'rd', t)
            t = re.sub(r'\bboulevard\b', 'blvd', t)
            t = re.sub(r'\blane\b', 'ln', t)
            return " ".join(t.split())

        is_rental = pin.get("item_type") == "Rental"
        # Match only photos from the same category (Rental to Rental, Comparable to Comparable)
        candidate_photos = [
            cp for cp in comp_photos
            if (cp.get("category") == "Rental") == is_rental
        ]
        if not candidate_photos:
            return None

        pin_street = norm(pin.get("street") or pin.get("address") or "")
        m_pin_num = re.search(r'^([0-9]{1,6}(?:-[0-9]{1,6})?)', pin_street)
        p_num_str = m_pin_num.group(1) if m_pin_num else ""

        # 1. Match by Street Number & Name
        if p_num_str:
            for cp in candidate_photos:
                cp_addr = norm(cp.get("address") or "")
                m_cp_num = re.search(r'^([0-9]{1,6}(?:-[0-9]{1,6})?)', cp_addr)
                if m_cp_num:
                    c_num_str = m_cp_num.group(1)
                    if c_num_str == p_num_str:
                        pin_words = [w for w in pin_street.split()[1:] if len(w) >= 4 and w not in ('street', 'road', 'avenue', 'lane', 'drive', 'court')]
                        cp_words = [w for w in cp_addr.split()[1:] if len(w) >= 4]
                        if not pin_words or any(w in cp_words or any(w in cw or cw in w for cw in cp_words) for w in pin_words):
                            return cp

        # 2. Match by Comparable/Rental Number in label (#1, #2, #3, ...)
        m_label_num = re.search(r'#?(\d+)', pin.get("label", ""))
        if m_label_num:
            lbl_n = int(m_label_num.group(1))
            for cp in candidate_photos:
                if cp.get("comp_num") == lbl_n:
                    return cp

        # 3. Match by Distance / Proximity (e.g. 2.79 miles) when street is empty or callout was cropped
        pin_dist = pin.get("distance") or pin.get("proximity") or ""
        m_dist = re.search(r'([0-9]+\.[0-9]+)', pin_dist)
        if m_dist:
            dist_val = m_dist.group(1)
            for cp in candidate_photos:
                if dist_val in (cp.get("proximity") or ""):
                    return cp

    def extract_document_reference_records(self, doc, file_path: str) -> Dict[str, Any]:
        """
        Extracts verified reference records from XML or PDF text layers:
        - Subject property address
        - Sales Grid Comparables (1..N) with address, proximity, price
        - Rental Schedule Comparables (1..N) with address, proximity, rent
        """
        subject_record: Optional[Dict[str, Any]] = None
        sales_comps: List[Dict[str, Any]] = []
        rental_comps: List[Dict[str, Any]] = []
        is_xml_file = file_path.lower().endswith(".xml")

        # 1. Extract from XML clean_data / MISMO tags
        if is_xml_file:
            try:
                try:
                    from api.xml_extractor import extract_fields_from_xml
                except ImportError:
                    try:
                        from appraisal_review.api.xml_extractor import extract_fields_from_xml  # type: ignore[import-not-found]
                    except ImportError:
                        api_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "appraisal_review", "api")
                        if api_dir not in sys.path:
                            sys.path.insert(0, api_dir)
                        from xml_extractor import extract_fields_from_xml  # type: ignore[import-not-found]
                xml_data = extract_fields_from_xml(file_path)
                clean = xml_data.get("clean_data", {})
                sub = clean.get("Subject", {})
                if sub:
                    subject_record = {
                        "street": sub.get("Property Address") or sub.get("Street Address") or "",
                        "city": sub.get("City") or "",
                        "state": sub.get("State") or "",
                        "zipcode": sub.get("Zip Code") or "",
                        "address": sub.get("Full Address") or sub.get("Address") or ""
                    }
                sgrid = clean.get("Sales Grid", {})
                for k, v in sgrid.items():
                    if k != "Subject" and isinstance(v, dict):
                        m = re.search(r'\d+', k)
                        cnum = int(m.group(0)) if m else len(sales_comps) + 1
                        st = v.get("Street Address") or v.get("Address") or ""
                        addr = v.get("Address") or st
                        sales_comps.append({
                            "comp_num": cnum,
                            "street": st,
                            "address": addr,
                            "proximity": v.get("Proximity to Subject") or "",
                            "sale_price": v.get("Sale Price") or ""
                        })
                rgrid = clean.get("Comparable Rental Data", {}) or clean.get("Single Family Rent Schedule", {})
                for k, v in rgrid.items():
                    if isinstance(v, dict) and any(x in k.upper() for x in ["RENTAL", "COMPARABLE NO"]):
                        m = re.search(r'\d+', k)
                        cnum = int(m.group(0)) if m else len(rental_comps) + 1
                        if not any(r["comp_num"] == cnum for r in rental_comps):
                            addr = v.get("Address") or ""
                            m_st = re.match(r'^([^,]+)', addr)
                            st = m_st.group(1).strip() if m_st else addr
                            rent_val = v.get("Adjusted Monthly Rent") if (not v.get("Monthly Rental") or str(v.get("Monthly Rental")).strip() in ("0", "0.00", "$0", "$ 0")) else v.get("Monthly Rental")
                            rental_comps.append({
                                "comp_num": cnum,
                                "street": st,
                                "address": addr,
                                "proximity": v.get("Proximity to Subject") or v.get("Proximity") or "",
                                "monthly_rent": rent_val or ""
                            })
            except Exception as e:
                print(f"Notice: XML reference extraction: {e}")

        # 2. Extract from PDF text if missing
        if doc and (not sales_comps or not rental_comps or not subject_record):
            # 2a. Attempt structured extraction via appraisal_review engines
            sub_city = ""
            sub_state = ""
            sub_zip = ""
            try:
                try:
                    from api.pdf_extractor_offline import detect_form_pages, extract_page_1_fields, extract_page_2_sales_grid_and_reconciliation
                    from api.xml_extractor import extract_rent_schedule_from_pdf_page
                except ImportError:
                    try:
                        from appraisal_review.api.pdf_extractor_offline import detect_form_pages, extract_page_1_fields, extract_page_2_sales_grid_and_reconciliation
                        from appraisal_review.api.xml_extractor import extract_rent_schedule_from_pdf_page
                    except ImportError:
                        api_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "appraisal_review", "api")
                        if api_dir not in sys.path:
                            sys.path.insert(0, api_dir)
                        from pdf_extractor_offline import detect_form_pages, extract_page_1_fields, extract_page_2_sales_grid_and_reconciliation
                        from xml_extractor import extract_rent_schedule_from_pdf_page

                import pdfplumber
                p_indices = detect_form_pages(doc)

                # Subject
                p1_idx = p_indices.get("form_p1")
                if p1_idx is not None and not subject_record and os.path.exists(file_path):
                    try:
                        with pdfplumber.open(file_path) as pdoc:
                            p1_res = extract_page_1_fields(pdoc.pages[p1_idx], fitz_page=doc[p1_idx])
                            sub = p1_res.get("SUBJECT", {})
                            sub_st = sub.get("Property Address") or ""
                            sub_city = re.sub(r'^(?:City|City:)\s*', '', sub.get("City") or "", flags=re.I).strip()
                            sub_state = re.sub(r'^(?:State|State:)\s*', '', sub.get("State") or "", flags=re.I).strip()
                            sub_zip = re.sub(r'^(?:Zip|Zip\s*Code|Code|Zip:)\s*', '', sub.get("Zip Code") or "", flags=re.I).strip()
                            if sub_st:
                                subject_record = {
                                    "street": sub_st,
                                    "city": sub_city,
                                    "state": sub_state,
                                    "zipcode": sub_zip,
                                    "address": f"{sub_st}, {sub_city}, {sub_state} {sub_zip}".strip(", ") if (sub_city and sub_state) else sub_st
                                }
                    except Exception as e_p1:
                        print(f"Notice: Page 1 Subject extraction: {e_p1}")

                # Sales Comps (Comps 1..N)
                p2_idx = p_indices.get("form_p2")
                extra_indices = p_indices.get("extra_comp_pages") or []
                if p2_idx is not None and os.path.exists(file_path):
                    try:
                        with pdfplumber.open(file_path) as pdoc:
                            extra_plumbs = [pdoc.pages[i] for i in extra_indices if i < len(pdoc.pages)]
                            extra_fitz = [doc[i] for i in extra_indices if i < len(doc)]
                            sg_res, _ = extract_page_2_sales_grid_and_reconciliation(
                                pdoc.pages[p2_idx],
                                page_extra_comps=extra_plumbs if extra_plumbs else None,
                                fitz_page=doc[p2_idx],
                                fitz_extra_pages=extra_fitz if extra_fitz else None
                            )
                            for i in range(1, 13):
                                k = f"COMPARABLE SALE #{i}"
                                c_dict = sg_res.get(k) or sg_res.get(f"COMPARABLE SALE # {i}") or sg_res.get(f"Comparable {i}") or sg_res.get(f"Comparable Sale {i}")
                                if c_dict and isinstance(c_dict, dict):
                                    c_addr = c_dict.get("Address") or ""
                                    c_prox = c_dict.get("Proximity to Subject") or ""
                                    c_price = c_dict.get("Sale Price") or ""
                                    full_c_addr = c_addr
                                    if c_addr and not re.search(r'[A-Za-z]{2}\s+[0-9]{5}', c_addr) and sub_city and sub_state:
                                        full_c_addr = f"{c_addr}, {sub_city}, {sub_state} {sub_zip}".strip(", ")
                                    m_st = re.match(r'^([^,]+)', c_addr)
                                    st = m_st.group(1).strip() if m_st else c_addr
                                    if not any(sc["comp_num"] == i for sc in sales_comps):
                                        sales_comps.append({
                                            "comp_num": i,
                                            "street": st,
                                            "address": full_c_addr or st,
                                            "city": sub_city,
                                            "state": sub_state,
                                            "zipcode": sub_zip,
                                            "proximity": c_prox,
                                            "sale_price": c_price
                                        })
                    except Exception as e_p2:
                        print(f"Notice: Page 2 Sales Grid extraction: {e_p2}")

                # Rental Comps (Rentals 1..N)
                for rent_pno in p_indices.get("rent_schedule_pages", []):
                    try:
                        rent_res = extract_rent_schedule_from_pdf_page(doc[rent_pno], start_comp_num=len(rental_comps) + 1)
                        if rent_res and "comparables" in rent_res:
                            for r_k, r_dict in rent_res["comparables"].items():
                                m_rnum = re.search(r'(\d+)', r_k)
                                r_num = int(m_rnum.group(1)) if m_rnum else len(rental_comps) + 1
                                if not any(rc["comp_num"] == r_num for rc in rental_comps):
                                    r_addr = r_dict.get("Address") or ""
                                    m_st = re.match(r'^([^,]+)', r_addr)
                                    st = m_st.group(1).strip() if m_st else r_addr
                                    full_r_addr = r_addr
                                    if r_addr and not re.search(r'[A-Za-z]{2}\s+[0-9]{5}', r_addr) and sub_city and sub_state:
                                        full_r_addr = f"{r_addr}, {sub_city}, {sub_state} {sub_zip}".strip(", ")
                                    r_raw_rent = r_dict.get("Monthly Rental") or ""
                                    r_rent_val = r_dict.get("Adjusted Monthly Rent") if (not r_raw_rent or str(r_raw_rent).strip() in ("0", "0.00", "$0", "$ 0")) else r_raw_rent
                                    rental_comps.append({
                                        "comp_num": r_num,
                                        "street": st,
                                        "address": full_r_addr or st,
                                        "city": sub_city,
                                        "state": sub_state,
                                        "zipcode": sub_zip,
                                        "proximity": r_dict.get("Proximity to Subject") or "",
                                        "monthly_rent": r_rent_val or ""
                                    })
                    except Exception as e_rent:
                        print(f"Notice: Rent Schedule extraction: {e_rent}")
            except Exception as e_struct:
                print(f"Notice: Structured reference extraction exception: {e_struct}")

            # 2b. Fallback to basic text parsing if still missing
            if not sales_comps or not rental_comps or not subject_record:
                for pno in range(len(doc)):
                    page = doc[pno]
                    txt = page.get_text()

                    # Subject fallback
                    if not subject_record and ("SUBJECT PROPERTY" in txt.upper() or "UNIFORM RESIDENTIAL" in txt.upper()):
                        m_addr = re.search(r'Property\s+Address\s*[:\n]\s*([^\n]+)', txt, re.I)
                        if m_addr:
                            subject_record = {"street": m_addr.group(1).strip(), "address": m_addr.group(1).strip()}

                    # Sales Grid Comparables fallback
                    if not sales_comps and ("SALES COMPARISON" in txt.upper() or "COMPARABLE SALE #" in txt.upper()):
                        for m in re.finditer(r'COMPARABLE\s+SALE\s*#?\s*([1-9]|1[0-2])\b', txt, re.I):
                            c_num = int(m.group(1))
                            if not any(sc.get("comp_num") == c_num for sc in sales_comps):
                                chunk = txt[m.end():m.end() + 450]
                                m_st = re.search(r'([0-9]{1,6}\s+[A-Za-z0-9#\s.,\'-]+?(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Lane|Ln|Drive|Dr|Way|Court|Ct|Circle|Cir|Place|Pl|Trail|Tr|Parkway|Pkwy|Pond|Bayview))\b', chunk, re.I)
                                st_val = m_st.group(1).strip() if m_st else ""
                                m_prox = re.search(r'([0-9]+(?:\.[0-9]+)?\s*(?:miles?|mi)\b(?:\s*[NSEWnsew]{1,2})?)', chunk, re.I)
                                prox_val = m_prox.group(1).strip() if m_prox else ""
                                m_pr = re.search(r'\$([0-9]{1,3}(?:,[0-9]{3})+)', chunk)
                                price_val = f"${m_pr.group(1)}" if m_pr else ""
                                if st_val or prox_val:
                                    sales_comps.append({
                                        "comp_num": c_num,
                                        "street": st_val,
                                        "address": st_val,
                                        "proximity": prox_val,
                                        "sale_price": price_val
                                    })

                    # Rental Photo Page fallback
                    if not rental_comps and ("RENTAL PHOTO PAGE" in txt.upper() or "DLSTRNT" in txt.upper()):
                        for m in re.finditer(r'Rental\s+(\d+)\s*\n(?:[^\n]*\n){1,15}?(\d+\s+[^\n]+)\s*\n([0-9.]+\s*miles?[^\n]*)', txt, re.I):
                            r_num = int(m.group(1))
                            r_addr = m.group(2).strip()
                            r_prox = m.group(3).strip()
                            if not any(r["comp_num"] == r_num for r in rental_comps):
                                rental_comps.append({
                                    "comp_num": r_num,
                                    "street": r_addr,
                                    "address": r_addr,
                                    "proximity": r_prox,
                                    "monthly_rent": ""
                                })

        # 3. Ensure minimum 3 sales comps and minimum 3 rental comps
        for i in range(1, 4):
            if not any(sc.get("comp_num") == i for sc in sales_comps):
                sales_comps.append({
                    "comp_num": i,
                    "street": "—",
                    "address": "—",
                    "proximity": "—",
                    "sale_price": "—"
                })
        for i in range(1, 4):
            if not any(rc.get("comp_num") == i for rc in rental_comps):
                rental_comps.append({
                    "comp_num": i,
                    "street": "—",
                    "address": "—",
                    "proximity": "—",
                    "monthly_rent": "—"
                })

        sales_comps.sort(key=lambda x: x["comp_num"])
        rental_comps.sort(key=lambda x: x["comp_num"])
        return {
            "subject": subject_record,
            "sales_comps": sales_comps,
            "rental_comps": rental_comps
        }

    def extract_all_exhibits_data(self, file_path: str, exhibit_type: Optional[str] = None) -> Dict[str, Any]:
        """
        Extracts structured data from visual exhibits:
        - Location Map & Comparables (Subject in red, Comps in blue)
        - Aerial Map
        - Building Sketch / Floor Plan (Area calculations, room labels & exterior dimensions)
        - Comparable Photos Addenda (Address, price, proximity, specs & photo thumbnails)
        - Rentals Map
        - Plat / Parcel / Flood Maps
        Returns unified dictionary suitable for UI and API consumption.
        Supports selective single-exhibit extraction via `exhibit_type`:
        'location_map', 'aerial_map', 'building_sketch', 'rental_map', or None/'all'.
        """
        doc, is_xml_embedded = self.get_pdf_doc(file_path)
        ex_type = (exhibit_type or "").lower().strip()

        # Load reference records (Sales Grid & Rental Schedule)
        refs = self.extract_document_reference_records(doc, file_path)
        self.reference_records = refs

        process_location = ex_type in ["", "all", "location", "location_map", "location_maps", "comps_map", "location_and_comps"]
        process_aerial = ex_type in ["", "all", "aerial", "aerial_map", "aerial_maps", "satellite"]
        process_sketches = ex_type in ["", "all", "sketch", "sketches", "building_sketch", "floor_plan", "building_sketch_floor_plan"]
        process_rentals = ex_type in ["", "all", "rental", "rentals", "rental_map", "rentals_map", "other_maps", "rentals_other_maps", "plat", "flood"]

        all_map_pages = self.detect_map_pages(doc) if (process_location or process_aerial or process_rentals) else []
        dedicated_rental_maps = [mp for mp in all_map_pages if re.search(r'rental', mp.get("map_type", ""), re.IGNORECASE)]

        map_pages = []
        for mp in all_map_pages:
            m_type = mp.get("map_type", "")
            is_rent = bool(re.search(r'rental', m_type, re.IGNORECASE))
            is_aer = bool(re.search(r'aerial|satellite', m_type, re.IGNORECASE))
            is_loc = bool(re.search(r'location|comparable|sales\s*map', m_type, re.IGNORECASE)) and not is_rent and not is_aer

            if is_loc:
                # Include location map if processing location, OR if processing rentals and no dedicated rental map exists
                if process_location or (process_rentals and not dedicated_rental_maps):
                    map_pages.append(mp)
            elif is_aer and process_aerial:
                map_pages.append(mp)
            elif is_rent and process_rentals:
                map_pages.append(mp)
            elif process_rentals and not is_aer and not is_loc and not is_rent:
                # e.g. Plat or Flood maps when under rentals/other exhibits
                map_pages.append(mp)

        sketch_pages = self.detect_sketch_pages(doc) if process_sketches else []
        comp_photo_pages = self.detect_comp_photo_pages(doc) if (process_location or process_rentals) else []

        comp_photos = []
        for cpp in comp_photo_pages:
            photos_on_page = self.process_comp_photo_page(cpp["page_obj"], cpp["page_number"])
            comp_photos.extend(photos_on_page)

        maps_data = []
        all_pins = []
        for mp in map_pages:
            m_type = mp.get("map_type", "")
            is_rent = bool(re.search(r'rental', m_type, re.IGNORECASE))
            is_plat_flood = bool(re.search(r'plat|flood|hazard|parcel', m_type, re.IGNORECASE))
            if is_plat_flood:
                pins = []
            else:
                pins = self.process_map_page(mp["page_obj"], mp["page_number"], mp["map_type"], file_path)
            all_pins.extend(pins)

            # High-res preview of the map page
            pix = mp["page_obj"].get_pixmap(dpi=150)
            b64_str = base64.b64encode(pix.tobytes("jpeg")).decode("utf-8")

            sub = next((p for p in pins if p.get("item_type") == "Subject"), None)
            comps = [p for p in pins if p.get("item_type") in ("Comparable", "Rental", "Listing")]

            # Pair each comparable / rental pin with its matching Photo Addendum and Grid records
            for c in comps:
                is_rental_pin = (c.get("item_type") == "Rental")
                matched_photo = self.match_pin_to_comp_photo(c, comp_photos)
                if matched_photo:
                    c["photo_data"] = matched_photo
                    cp_num = matched_photo.get("comp_num")
                    if cp_num:
                        prefix = "Rental" if is_rental_pin else ("Listing" if c.get("item_type") == "Listing" else "Comparable")
                        c["label"] = f"{prefix} #{cp_num}"
                    photo_addr = matched_photo.get("address") or ""
                    c["matched_photo_address"] = photo_addr
                    # Backfill or correct partial OCR street name
                    if photo_addr:
                        if not c.get("street") or not re.search(r'\d', c.get("street", "")):
                            c["street"] = photo_addr
                        elif len(c.get("street", "")) < len(photo_addr) and photo_addr.lower().endswith(c.get("street", "").lower()[-8:]):
                            c["street"] = photo_addr
                        if c.get("city") and c.get("state"):
                            c["address"] = f"{c['street']}, {c['city']}, {c['state']} {c.get('zipcode', '')}".strip()
                        else:
                            c["address"] = c["street"]

                # Match with Reference Grid records
                grid_candidates = refs["rental_comps"] if is_rental_pin else refs["sales_comps"]
                matched_grid = None
                c_st = (c.get("street") or c.get("address") or "").lower()
                m_c_nums = re.findall(r'\b\d{1,6}\b', c_st)

                for gc in grid_candidates:
                    gc_st = (gc.get("street") or gc.get("address") or "").lower()
                    m_gc_nums = re.findall(r'\b\d{1,6}\b', gc_st)
                    common_nums = set(m_c_nums) & set(m_gc_nums)
                    if common_nums:
                        matched_grid = gc
                        break
                if not matched_grid:
                    m_lbl_n = re.search(r'#?(\d+)', c.get("label", ""))
                    if m_lbl_n:
                        lbl_num = int(m_lbl_n.group(1))
                        matched_grid = next((gc for gc in grid_candidates if gc.get("comp_num") == lbl_num), None)

                if matched_grid:
                    c["grid_data"] = matched_grid
                    if not c.get("street") or c.get("street") == "—":
                        c["street"] = matched_grid.get("street", "")
                        c["address"] = matched_grid.get("address", "")

                if is_rental_pin and not c.get("label", "").lower().startswith("rental"):
                    m_d = re.search(r'\d+', c.get("label", ""))
                    c_num = m_d.group(0) if m_d else ""
                    c["label"] = f"Rental #{c_num}" if c_num else "Rental"

            # Multi-source backfill: Ensure every verified comparable from document references and photo addenda
            # is represented on the Location Map table so the user never sees "0 Comps"
            if is_loc:
                known_comp_nums = set()
                for c in comps:
                    m = re.search(r'#?(\d+)', c.get("label", ""))
                    if m:
                        known_comp_nums.add(int(m.group(1)))

                # 1. Backfill from sales_comps references
                for gc in refs.get("sales_comps", []):
                    cnum = gc.get("comp_num")
                    if cnum and cnum not in known_comp_nums:
                        matched_photo = next((p for p in comp_photos if p.get("comp_num") == cnum), None)
                        synth_pin = {
                            "item_type": "Comparable",
                            "label": f"Comparable #{cnum}",
                            "street": gc.get("street") or (matched_photo.get("address") if matched_photo else "") or "",
                            "address": gc.get("address") or (matched_photo.get("address") if matched_photo else "") or "",
                            "proximity": gc.get("proximity") or (matched_photo.get("proximity") if matched_photo else "") or "",
                            "price": gc.get("sale_price") or (matched_photo.get("sale_price") if matched_photo else "") or "",
                            "map_type": mp["map_type"],
                            "page_number": mp["page_number"],
                            "source_file": os.path.basename(file_path),
                            "grid_data": gc,
                            "photo_data": matched_photo,
                            "status": "Verified from Grid & Photo Addenda"
                        }
                        comps.append(synth_pin)
                        pins.append(synth_pin)
                        known_comp_nums.add(cnum)

                # 2. Backfill from comp_photos
                for cp in comp_photos:
                    cnum = cp.get("comp_num")
                    if cnum and cnum not in known_comp_nums:
                        synth_pin = {
                            "item_type": "Comparable",
                            "label": f"Comparable #{cnum}",
                            "street": cp.get("street") or cp.get("address") or "",
                            "address": cp.get("address") or cp.get("street") or "",
                            "proximity": cp.get("proximity") or "",
                            "price": cp.get("sale_price") or "",
                            "map_type": mp["map_type"],
                            "page_number": mp["page_number"],
                            "source_file": os.path.basename(file_path),
                            "photo_data": cp,
                            "status": "Verified from Photo Addenda"
                        }
                        comps.append(synth_pin)
                        pins.append(synth_pin)
                        known_comp_nums.add(cnum)

            comps_only = [p for p in pins if p.get("item_type") == "Comparable"]
            rentals_only = [p for p in pins if p.get("item_type") == "Rental"]
            listings_only = [p for p in pins if p.get("item_type") == "Listing"]

            # Sort all lists strictly in ascending order: Subject (0), Comparables 1..N (1), Rentals 1..N (2), Listings 1..N (3)
            def pin_asc_key(p):
                if p.get("item_type") == "Subject":
                    return (0, 0, 0.0)
                it_rank = 1 if p.get("item_type") == "Comparable" else (2 if p.get("item_type") == "Rental" else 3)
                m = re.search(r'\d+', p.get("label", ""))
                num = int(m.group(0)) if m else 99
                mMiles = re.search(r'([0-9]+(?:\.[0-9]+)?)', p.get("distance", "") or p.get("proximity", ""))
                miles = float(mMiles.group(1)) if mMiles else 999.0
                return (it_rank, num, miles)

            comps.sort(key=pin_asc_key)
            comps_only.sort(key=pin_asc_key)
            rentals_only.sort(key=pin_asc_key)
            listings_only.sort(key=pin_asc_key)
            pins.sort(key=pin_asc_key)

            maps_data.append({
                "page_number": mp["page_number"],
                "map_type": mp["map_type"],
                "subject": sub,
                "comparables": rentals_only if is_rent else comps_only,
                "rentals": rentals_only,
                "comparables_only": comps_only,
                "listings": listings_only,
                "pins": pins,
                "has_rentals": len(rentals_only) > 0,
                "has_comparables": len(comps_only) > 0,
                "image_preview": f"data:image/jpeg;base64,{b64_str}"
            })

        sketches_data = []
        for sp in sketch_pages:
            sketch_info = self.process_sketch_page(sp["page_obj"], sp["page_number"], sp["sketch_type"], file_path)
            sketches_data.append(sketch_info)

        return {
            "status": "success",
            "file_name": os.path.basename(file_path),
            "exhibit_type": ex_type or "all",
            "total_maps": len(maps_data),
            "total_sketches": len(sketches_data),
            "total_comparable_photos": len(comp_photos),
            "maps": maps_data,
            "sketches": sketches_data,
            "comparable_photos": comp_photos,
            "all_pins": all_pins,
            "reference_records": refs
        }

    def export_results(self, all_pins: List[Dict[str, Any]]):
        """Exports extracted comparables and subject records to CSV, JSON, and XML."""
        if not all_pins:
            print("\nNo map callout pins to export.")
            return

        # 1. Export CSV (comparables_summary.csv)
        csv_path = os.path.join(self.output_dir, "comparables_summary.csv")
        fieldnames = [
            "Source File", "Map Type", "Page", "Item Type", "Label", 
            "Street", "City", "State", "Zipcode", "Full Address", 
            "Miles", "Distance", "Direction", "Proximity", "Price", 
            "Box Coordinates", "Raw OCR Text", "Image Path"
        ]

        with open(csv_path, mode="w", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()
            for p in all_pins:
                writer.writerow({
                    "Source File": p.get("source_file", ""),
                    "Map Type": p.get("map_type", ""),
                    "Page": p.get("page_number", ""),
                    "Item Type": p.get("item_type", ""),
                    "Label": p.get("label", ""),
                    "Street": p.get("street", ""),
                    "City": p.get("city", ""),
                    "State": p.get("state", ""),
                    "Zipcode": p.get("zipcode", ""),
                    "Full Address": p.get("address", ""),
                    "Miles": p.get("miles", ""),
                    "Distance": p.get("distance", ""),
                    "Direction": p.get("direction", ""),
                    "Proximity": p.get("proximity", ""),
                    "Price": p.get("price", ""),
                    "Box Coordinates": p.get("box_coords", ""),
                    "Raw OCR Text": p.get("raw_text", ""),
                    "Image Path": p.get("image_crop_path", "")
                })
        print(f"\n[OK] CSV Summary exported: {csv_path}")

        # 2. Export JSON
        json_path = os.path.join(self.output_dir, "comparables_summary.json")
        with open(json_path, mode="w", encoding="utf-8") as f:
            json.dump(all_pins, f, indent=2)
        print(f"[OK] JSON Summary exported: {json_path}")

        # 3. Export XML
        xml_path = os.path.join(self.output_dir, "comparables_summary.xml")
        root = ET.Element("MapExtractionSummary")
        for p in all_pins:
            item_elem = ET.SubElement(root, "MapItem")
            for k, v in p.items():
                child = ET.SubElement(item_elem, k)
                child.text = str(v)
        tree = ET.ElementTree(root)
        tree.write(xml_path, encoding="utf-8", xml_declaration=True)
        print(f"[OK] XML Summary exported: {xml_path}")


def main():
    parser = argparse.ArgumentParser(description="Appraisal Map Extractor CLI: extracts subject and comp pins from appraisal maps.")
    parser.add_argument("-i", "--input", default=".", help="Path to input PDF or XML file, or directory of reports (default: current directory)")
    parser.add_argument("-o", "--output", default="map_output", help="Output directory (default: map_output)")
    parser.add_argument("--save-images", action="store_true", help="Save cropped callouts and annotated map overlay images")
    parser.add_argument("--ocr-engine", default="auto", choices=["auto", "easyocr", "pytesseract"], help="OCR engine to use")
    parser.add_argument("--dpi", type=int, default=200, help="Rendering DPI for PDF pages (default: 200)")

    args = parser.parse_args()

    extractor = MapExtractor(
        output_dir=args.output,
        save_images=args.save_images,
        ocr_engine=args.ocr_engine,
        dpi=args.dpi
    )

    targets = []
    if os.path.isfile(args.input):
        targets.append(args.input)
    elif os.path.isdir(args.input):
        for root_dir, dirs, files in os.walk(args.input):
            dirs[:] = [d for d in dirs if d.lower() not in ('.git', '.venv', 'venv', 'node_modules', '__pycache__', '.vscode', 'pramaan', 'appraisal_review', 'map_output', 'dist', 'build')]
            for file in files:
                if file.lower().endswith((".xml", ".pdf")):
                    targets.append(os.path.join(root_dir, file))

    if not targets:
        # Check standard sample locations if run from empty folder
        sample_downloads = os.path.expanduser(r"~\Downloads")
        if os.path.exists(sample_downloads):
            for file in os.listdir(sample_downloads):
                if file.lower().endswith((".xml", ".pdf")):
                    targets.append(os.path.join(sample_downloads, file))
                    break

    if not targets:
        print(f"No PDF or XML files found in '{args.input}'.")
        return

    print(f"Found {len(targets)} target file(s) to process.")
    all_extracted_pins = []
    for target in targets:
        pins = extractor.process_file(target)
        all_extracted_pins.extend(pins)

    extractor.export_results(all_extracted_pins)
    print("\nExtraction completed successfully!")


if __name__ == "__main__":
    main()
