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
import cv2
import numpy as np
from PIL import Image

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
            # Common Windows Tesseract paths
            common_tesseract_paths = [
                r"C:\Program Files\Tesseract-OCR\tesseract.exe",
                r"C:\Program Files (x86)\Tesseract-OCR\tesseract.exe",
                os.path.expanduser(r"~\AppData\Local\Programs\Tesseract-OCR\tesseract.exe")
            ]
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
                if results:
                    return results
            except Exception:
                pass

        # 2. Try PyTesseract
        if pytesseract is not None:
            try:
                gray = cv2.cvtColor(resized, cv2.COLOR_BGR2GRAY)
                # Otsu thresholding
                _, thresh = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY | cv2.THRESH_OTSU)
                raw_text = pytesseract.image_to_string(thresh)
                lines = [l.strip() for l in raw_text.split("\n") if l.strip()]
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

        # Otherwise open as standard PDF
        return fitz.open(file_path), False

    def detect_map_pages(self, doc) -> List[Dict[str, Any]]:
        """Identifies pages containing Location, Aerial, Comparable Sales, or Rental Maps."""
        map_pages = []
        map_keywords = [
            ("Location Map", [
                r"\b(?:COMPARABLE\s+(?:SALES\s+)?)?LOCATION\s+MAP(?:\s+ADDENDUM)?\b",
                r"\bCOMPARABLE\s+SALES\s+MAP\b",
                r"\bSALES\s+COMPARABLES?\s+MAP\b",
                r"\bCOMP\s+MAP\b",
                r"\bLOCATION\s+MAP\b"
            ]),
            ("Aerial Map", [
                r"\bAERIAL\s+(?:MAP|VIEW|PHOTO)(?:\s+ADDENDUM)?\b",
                r"\bSATELLITE\s+(?:MAP|VIEW|PHOTO)(?:\s+ADDENDUM)?\b",
                r"\bAERIAL\s+LOCATION\s+MAP\b"
            ]),
            ("Rentals Map", [
                r"\bRENTALS?\s+(?:LOCATION\s+)?MAP(?:\s+ADDENDUM)?\b",
                r"\bCOMPARABLE\s+RENTALS?\s+MAP\b"
            ]),
            ("Plat Map", [
                r"\bPLAT\s+MAP\b",
                r"\bPARCEL\s+MAP\b",
                r"\bTAX\s+MAP\b"
            ]),
            ("Flood Map", [
                r"\bFLOOD\s+(?:HAZARD\s+)?(?:MAP|ADDENDUM)\b",
                r"\bFEMA\s+FLOOD\s+MAP\b"
            ])
        ]

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

        summary = {
            'bedroom_count': bed_count,
            'bathroom_count': bath_count,
            'bathroom_display': bath_display,
            'full_baths': full_baths,
            'half_baths': half_baths,
            'living_rooms_count': len(by_category['living']),
            'has_kitchen': len(by_category['kitchen_dining']) > 0 and any('kitchen' in k['standard_name'].lower() for k in by_category['kitchen_dining']),
            'has_dining': any('dining' in k['standard_name'].lower() or 'nook' in k['standard_name'].lower() for k in by_category['kitchen_dining']),
            'has_laundry': len(by_category['utility_laundry']) > 0 and any('laundry' in u['standard_name'].lower() for u in by_category['utility_laundry']),
            'garage': garage_labels[0] if garage_labels else None,
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

        # 4. Render base64 image preview
        clip_rect = fitz.Rect(10, 60, page.rect.width - 10, page.rect.height - 25) if fitz is not None else None
        pix = page.get_pixmap(clip=clip_rect, dpi=150) if clip_rect is not None else page.get_pixmap(dpi=150)
        b64_img = base64.b64encode(pix.tobytes("jpeg")).decode("utf-8")

        return {
            "page_number": page_num,
            "sketch_type": sketch_type,
            "areas": areas,
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
        # Fix comma decimals in miles: e.g. "0,16 miles" -> "0.16 miles"
        t = re.sub(r'([0-9]+)[,.]\s*([0-9]{2})\s*(?:miles?|m[li]{2,}es?|mi)\b', r'\1.\2 miles', t, flags=re.I)
        t = re.sub(r'\b[LI]\.([0-9]{2})\s*(?:miles?|m[li]{2,}es?|mi)\b', r'1.\1 miles', t, flags=re.I)
        t = re.sub(r'\b[LIl1][0o]\s*([0-9]{1,2})\s*(?:miles?|m[li]{2,}es?|mi)\b', r'1.0\1 miles', t, flags=re.I)
        t = re.sub(r'\bm[li]{2,}es?\b', 'miles', t, flags=re.I)
        t = re.sub(r'[\'"]\s*([0-9]{2})\s*miles\b', r'0.\1 miles', t, flags=re.I)
        # Fix common misread of direction 'S' as '$' or '§'
        t = re.sub(r'(?:miles?|mi)\s*[\$§]\b', 'miles S', t, flags=re.I)
        # Fix misread rental headers: e.g. "RENIAL No:1" -> "RENTAL No:1"
        t = re.sub(r'\bREN[I|T]AL\b', 'RENTAL', t, flags=re.I)
        # Fix misread comparable headers: e.g. "COMPARABIE" -> "COMPARABLE"
        t = re.sub(r'\bCOM[P|R|B|I]+AR?AB[L|I]+E\b', 'COMPARABLE', t, flags=re.I)
        # Fix OCR '! ' as '1 ' for comp number: e.g. 'COMPARABLENo !' -> 'COMPARABLE No. 1'
        t = re.sub(r'\b(COMPARABLE|RENTAL)\s*(?:No\.?|#)?\s*!\b', r'\1 No. 1', t, flags=re.I)
        # Fix no space between header and No: e.g. 'COMPARABLENo 2' -> 'COMPARABLE No 2'
        t = re.sub(r'\b(COMPARABLE|RENTAL)No\b', r'\1 No', t, flags=re.I)
        t = re.sub(r'\b([A-Za-z]+)[;,.\s]+N[J\)\]\s]+([0-9]{5})\b', r'\1, NJ \2', t, flags=re.I)
        t = re.sub(r'\b([0-9]{1,6})\s+5\s+([A-Za-z]+)', r'\1 S \2', t)
        t = re.sub(r'\bGriggs\s+l\b', 'Griggs Pl', t, flags=re.I)
        t = re.sub(r'\bMain\s+SL\b', 'Main St', t, flags=re.I)
        return t

    def parse_pin_text(self, lines: List[str], pin_color: str, subject_csz: Optional[Dict[str, str]] = None) -> List[Dict[str, Any]]:
        """
        Parses raw OCR lines into structured pin records with clean whole address
        (street, city, state, zipcode) and miles / proximity for Subject, Comparables, and Rentals.
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
            r'|Ra|Ro|Fd|In|Lm|Lin|Un|S1|SL|Dt|Or'
            r')'
        )

        def extract_single_record(hdr_text: str, content_text: str) -> Optional[Dict[str, Any]]:
            combined = f"{hdr_text} {content_text}".strip()
            is_sub = bool(re.search(r'\bSUBJECT\b', hdr_text, re.I)) or (pin_color == "red" and not re.search(r'\b(?:COM|RENT)', hdr_text, re.I))
            is_rental = bool(re.search(r'\bRENTAL\b', combined, re.I)) or pin_color == "green"

            # Comp / Rental number: must be 1 to 12
            m_comp_digit = re.search(r'\b(?:COMPARABLE|COMP|RENTAL)\b[^\d\n]*?([1-9]|1[0-2])\b', combined, re.I)
            comp_num = m_comp_digit.group(1) if m_comp_digit else ""

            if is_sub:
                item_type = "Subject"
                label = "Subject"
            elif is_rental:
                item_type = "Rental"
                label = f"Rental #{comp_num}" if comp_num else "Rental"
            elif comp_num:
                item_type = "Comparable"
                label = f"Comparable #{comp_num}"
            else:
                item_type = "Comparable"
                label = "Comparable"

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

            # Remove header and distance from text to leave pure address
            hdr_pat_inner = r'\b(?:SUBJECT|COM[P|R|B|I]+AR?AB[L|I]+E(?:\s*(?:NO\.?|#|:)\s*)*[0-9A-Za-z]*|RENTAL(?:\s*(?:NO\.?|#|:)\s*)*[0-9A-Za-z]*)\b'
            text_clean = re.sub(hdr_pat_inner, '', combined, flags=re.I).strip()
            text_clean = re.sub(r'[0-9]+(?:\.[0-9]+)?\s*(?:miles?|mi|mlles?)\b(?:\s*[NSEWnsew]{1,2}|North|South|East|West)?', '', text_clean, flags=re.I).strip()
            text_clean = re.sub(r'[;,.\s]+\b(?:[NSEW]{1,2}|North|South|East|West)\b\s*$', '', text_clean, flags=re.I).strip()
            text_clean = re.sub(r'^[;,.\s:=-]+|[;,.\s:=-]+$', '', text_clean).strip()

            street = ""
            city = ""
            state = ""
            zipcode = ""

            # Check individual lines first if available
            for l in lines:
                l_str = l.strip()
                if re.search(r'^(?:SUBJECT|COM[P|R|B|I]+AR?AB[L|I]+E(?:\s*(?:NO\.?|#|:)\s*)*[0-9A-Za-z]*|RENTAL(?:\s*(?:NO\.?|#|:)\s*)*[0-9A-Za-z]*)\s*$', l_str, re.I):
                    continue
                if re.search(r'^[0-9]+(?:\.[0-9]+)?\s*(?:miles?|mi|mlles?)\b(?:\s*[NSEWnsew]{1,2}|North|South|East|West)?$', l_str, re.I):
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

            # Match street with suffix from text_clean
            if not street:
                m_st = re.search(r'\b([0-9]{1,6}(?:-[0-9]{1,6})?\s+[A-Za-z0-9#\s.,\'-]+?' + STREET_SUFFIX + r')\b', text_clean, re.I)
                if m_st:
                    street = m_st.group(1).strip()

            # Fallback: match any house number followed by street words (e.g. "12462 E Summerlin", "10228 Little T")
            if not street:
                m_num = re.search(r'\b([0-9]{1,6}(?:-[0-9]{1,6})?\s+[A-Za-z0-9#\s.,\'-]+)', text_clean)
                if m_num:
                    cand = m_num.group(1).strip()
                    cand = re.sub(r'[;,.\s]+\b(?:[NSEW]{1,2}|North|South|East|West)\b\s*$', '', cand, flags=re.I)
                    cand = re.sub(r'^[;,.\s:=-]+|[;,.\s:=-]+$', '', cand).strip()
                    cand = re.sub(r'\s+[~_].*$', '', cand).strip()
                    if len(cand.split()) >= 2:
                        street = cand

            # Clean comp digit prepended to house number (e.g. "1 345 N 6th Ave" -> "345 N 6th Ave")
            if comp_num and street.startswith(f"{comp_num} "):
                m_sub = re.search(r'^[1-9]\s+([0-9]{1,6}(?:-[0-9]{1,6})?\s+.*)', street)
                if m_sub:
                    street = m_sub.group(1).strip()

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
                "price": "",
                "raw_text": combined
            }

        header_pat = r'(\b(?:SUBJECT|COM[P|R|B|I]+AR?AB[L|I]+E(?:\s*(?:NO\.?|#|:)\s*)*[0-9A-Za-z]*|RENTAL(?:\s*(?:NO\.?|#|:)\s*)*[0-9A-Za-z]*)\b)'
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

        # Red Color Masks (Subject Callouts / Pins)
        red_mask1 = cv2.inRange(hsv, np.array([0, 100, 70]), np.array([12, 255, 255]))
        red_mask2 = cv2.inRange(hsv, np.array([168, 100, 70]), np.array([180, 255, 255]))
        red_mask = cv2.bitwise_or(red_mask1, red_mask2)

        # Blue Color Mask (Comparable Pins / Callouts)
        blue_mask = cv2.inRange(hsv, np.array([95, 80, 60]), np.array([135, 255, 255]))

        # Green Color Mask (Rental Pins / Callouts)
        green_mask = cv2.inRange(hsv, np.array([35, 60, 50]), np.array([85, 255, 255]))

        color_configs = [
            ("red", red_mask, (0, 0, 255)),     # BGR Red (Subject)
            ("blue", blue_mask, (255, 0, 0)),   # BGR Blue (Comparable Sales)
            ("green", green_mask, (0, 180, 0))  # BGR Green (Rental Comparables)
        ]

        pin_counter = 0
        base_name = os.path.splitext(os.path.basename(source_filename))[0]

        for color_name, mask, draw_color in color_configs:
            # RETR_CCOMP detects both external boundaries and internal holes
            # (crucial for callouts surrounded by water or connected road networks)
            contours, _ = cv2.findContours(mask, cv2.RETR_CCOMP, cv2.CHAIN_APPROX_SIMPLE)

            cand_boxes = []
            for c in contours:
                x, y, w, h = cv2.boundingRect(c)
                # Callout box geometry: width 180..750, height 35..380, max area 220,000
                if 180 <= w <= 750 and 35 <= h <= 380 and (w * h) <= 220000:
                    cand_boxes.append((x, y, w, h))

            # Deduplicate concentric/overlapping boxes (e.g. inner hole and outer stroke of same box)
            merged_boxes = []
            for b in sorted(cand_boxes, key=lambda b: (b[1], b[0])):
                x, y, w, h = b
                if not any(abs(x - ex[0]) < 80 and abs(y - ex[1]) < 60 for ex in merged_boxes):
                    merged_boxes.append(b)

            for x, y, w, h in merged_boxes:
                # Add padding around callout to capture borders & adjacent labels
                pad = 8
                y0, y1 = max(0, y - pad), min(img.shape[0], y + h + pad)
                x0, x1 = max(0, x - pad), min(img.shape[1], x + w + pad)
                crop = img[y0:y1, x0:x1]

                # 1.5x upscaling for high OCR legibility
                crop_scaled = cv2.resize(crop, (0, 0), fx=1.5, fy=1.5, interpolation=cv2.INTER_CUBIC)
                ocr_results = self.run_ocr(crop_scaled)
                lines = [t for t, _ in ocr_results]
                if not lines:
                    continue

                parsed_items = self.parse_pin_text(lines, color_name)
                if not parsed_items:
                    continue

                for parsed in parsed_items:
                    # Enforce color category:
                    if color_name == "red" and parsed.get("item_type") != "Subject":
                        continue
                    if color_name == "blue" and parsed.get("item_type") == "Rental":
                        continue
                    if color_name == "green" and parsed.get("item_type") != "Rental":
                        continue

                    # Filter out noise that lacks address and distance
                    if not parsed.get("address") and not parsed.get("distance") and not parsed.get("street"):
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
                if p.get("item_type") in ("Comparable", "Rental"):
                    if not p.get("city") and sub_city:
                        p["city"] = sub_city
                        p["state"] = sub_state
                        p["zipcode"] = sub_zip
                        if p.get("street"):
                            p["address"] = f"{p['street']}, {sub_city}, {sub_state} {sub_zip}".strip()

        # Deduplicate pins by (label, street, page_number)
        seen = set()
        deduped_pins = []
        for p in extracted_pins:
            key = (p.get("label"), p.get("street") or p.get("address"), p.get("page_number"))
            if key not in seen:
                seen.add(key)
                deduped_pins.append(p)
            else:
                existing = next((x for x in deduped_pins if (x.get("label"), x.get("street") or x.get("address"), x.get("page_number")) == key), None)
                if existing:
                    if not existing.get("distance") and p.get("distance"):
                        existing["distance"] = p.get("distance")
                        existing["miles"] = p.get("miles")
                        existing["proximity"] = p.get("proximity")
                    if not existing.get("city") and p.get("city"):
                        existing["city"] = p.get("city")
                        existing["state"] = p.get("state")
                        existing["zipcode"] = p.get("zipcode")
                        existing["address"] = p.get("address")

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

        # Sort: Subject first, then Comparables in numerical order, then Rentals in numerical order
        def comp_sort_key(p):
            if p.get("item_type") == "Subject":
                return (0, 0)
            it_rank = 1 if p.get("item_type") == "Comparable" else 2
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
        Extracts structured metadata for a comparable photo frame on an appraisal photo page.
        Extracts: title, comp_num, address, proximity, sale_price, gla, total_rooms, bedrooms,
        bathrooms, location, view, site, quality, age, and raw metadata dictionary.
        """
        if body_blocks is None:
            blocks = page.get_text("blocks")
            body_blocks = [b for b in blocks if b[1] >= 82 and b[3] <= page.rect.height - 35]

        right_blocks = [
            b for b in body_blocks
            if b[0] >= frame.x1 - 35 and b[1] >= frame.y0 - 25 and b[3] <= frame.y1 + 45
        ]

        title = ""
        comp_num = None
        for b in right_blocks:
            txt = b[4].strip()
            m_comp = re.search(r'^(?:COMPARABLE\s*(?:SALE|RENTAL)?|RENTAL|LISTING)?\s*#?\s*(\d+)$', txt, re.IGNORECASE)
            if not m_comp:
                m_comp = re.search(r'^(?:Comparable|Rental|Listing)\s*#?\s*(\d+)', txt, re.IGNORECASE)
            if m_comp:
                title = txt.split('\n')[0].strip()
                comp_num = int(m_comp.group(1))
                break

        known_keys = [
            "prox. to subject", "proximity", "sale price", "list price", "rental price", "monthly rent",
            "gross living area", "gla", "total rooms", "total bedrooms", "total bathrooms",
            "location", "view", "site", "quality", "age", "actual age", "condition"
        ]

        key_block = None
        val_block = None
        for b in right_blocks:
            b_lines = [l.strip() for l in b[4].split('\n') if l.strip()]
            matched_keys = sum(1 for l in b_lines if l.lower() in known_keys or any(k in l.lower() for k in ["prox", "sale price", "living area", "bathrooms"]))
            if matched_keys >= 3:
                key_block = b_lines
            elif len(b_lines) >= 3 and not any(l.lower() in known_keys for l in b_lines[:3]):
                val_block = b_lines

        meta_dict = {}
        address = ""
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
            address = val_block[0]
            meta_dict["Address"] = address
            for idx, k in enumerate(key_block):
                val_idx = idx + 1
                if val_idx < len(val_block):
                    v = val_block[val_idx]
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
                    elif "quality" in k_lower: quality = v
                    elif "age" in k_lower: age = v
        else:
            for b in right_blocks:
                lines = [l.strip() for l in b[4].split('\n') if l.strip()]
                for line in lines:
                    m_kv = re.match(r'^([^:\-]+)[:\-]\s*(.+)$', line)
                    if m_kv:
                        k, v = m_kv.group(1).strip(), m_kv.group(2).strip()
                        meta_dict[k] = v
                        k_lower = k.lower()
                        if "prox" in k_lower: proximity = v
                        elif "price" in k_lower: sale_price = v
                        elif "gla" in k_lower or "living" in k_lower: gla = v
                        elif "bed" in k_lower: bedrooms = v
                        elif "bath" in k_lower: bathrooms = v
                        elif "location" in k_lower: location = v
                        elif "view" in k_lower: view = v
                        elif "site" in k_lower: site = v
                        elif "quality" in k_lower: quality = v
                        elif "age" in k_lower: age = v
                    elif not address and not any(k in line.lower() for k in ["comparable", "photo", "total", "alamode", "form", "page"]):
                        if re.match(r'^\d+\s+[A-Za-z]', line):
                            address = line
                            meta_dict["Address"] = address

        page_header_sample = (page.get_text()[:400] or "").upper()
        is_rental = "RENTAL" in title.upper() or "RENTAL" in page_header_sample

        return {
            "title": title or (f"{'Rental' if is_rental else 'Comparable'} {comp_num}" if comp_num else ("Rental" if is_rental else "Comparable")),
            "comp_num": comp_num,
            "category": "Rental" if is_rental else "Comparable",
            "is_rental": is_rental,
            "address": address,
            "proximity": proximity,
            "sale_price": sale_price,
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

        return None

    def extract_all_exhibits_data(self, file_path: str) -> Dict[str, Any]:
        """
        Extracts structured data from all visual exhibits:
        - Location Map & Comparables (Subject in red, Comps in blue)
        - Aerial Map
        - Building Sketch / Floor Plan (Area calculations, room labels & exterior dimensions)
        - Comparable Photos Addenda (Address, price, proximity, specs & photo thumbnails)
        - Rentals Map
        - Plat / Parcel / Flood Maps
        Returns unified dictionary suitable for UI and API consumption.
        """
        doc, is_xml_embedded = self.get_pdf_doc(file_path)
        map_pages = self.detect_map_pages(doc)
        sketch_pages = self.detect_sketch_pages(doc)
        comp_photo_pages = self.detect_comp_photo_pages(doc)

        comp_photos = []
        for cpp in comp_photo_pages:
            photos_on_page = self.process_comp_photo_page(cpp["page_obj"], cpp["page_number"])
            comp_photos.extend(photos_on_page)

        maps_data = []
        all_pins = []
        for mp in map_pages:
            pins = self.process_map_page(mp["page_obj"], mp["page_number"], mp["map_type"], file_path)
            all_pins.extend(pins)

            # High-res preview of the map page
            pix = mp["page_obj"].get_pixmap(dpi=150)
            b64_str = base64.b64encode(pix.tobytes("jpeg")).decode("utf-8")

            sub = next((p for p in pins if p.get("item_type") == "Subject"), None)
            comps = [p for p in pins if p.get("item_type") in ("Comparable", "Rental")]
            comps_only = [p for p in pins if p.get("item_type") == "Comparable"]
            rentals_only = [p for p in pins if p.get("item_type") == "Rental"]

            # Pair each comparable / rental pin with its matching Photo Addendum record
            for c in comps:
                matched_photo = self.match_pin_to_comp_photo(c, comp_photos)
                if matched_photo:
                    c["photo_data"] = matched_photo
                    cp_num = matched_photo.get("comp_num")
                    if cp_num and not re.search(r'\d+', c.get("label", "")):
                        prefix = "Rental" if c.get("item_type") == "Rental" else "Comparable"
                        c["label"] = f"{prefix} #{cp_num}"
                    photo_addr = matched_photo.get("address") or ""
                    # Only backfill address if pin had no street detected from OCR
                    if photo_addr and not c.get("street"):
                        c["street"] = photo_addr
                        if c.get("city") and c.get("state"):
                            c["address"] = f"{photo_addr}, {c['city']}, {c['state']} {c.get('zipcode', '')}".strip()
                        else:
                            c["address"] = photo_addr

            # Sort all lists strictly in ascending order: Subject (0), Comparables 1..N (1), Rentals 1..N (2)
            def pin_asc_key(p):
                if p.get("item_type") == "Subject":
                    return (0, 0, 0.0)
                it_rank = 1 if p.get("item_type") == "Comparable" else 2
                m = re.search(r'\d+', p.get("label", ""))
                num = int(m.group(0)) if m else 99
                mMiles = re.search(r'([0-9]+(?:\.[0-9]+)?)', p.get("distance", "") or p.get("proximity", ""))
                miles = float(mMiles.group(1)) if mMiles else 999.0
                return (it_rank, num, miles)

            comps.sort(key=pin_asc_key)
            comps_only.sort(key=pin_asc_key)
            rentals_only.sort(key=pin_asc_key)
            pins.sort(key=pin_asc_key)

            maps_data.append({
                "page_number": mp["page_number"],
                "map_type": mp["map_type"],
                "subject": sub,
                "comparables": comps,
                "rentals": rentals_only,
                "comparables_only": comps_only,
                "pins": pins,
                "image_preview": f"data:image/jpeg;base64,{b64_str}"
            })

        sketches_data = []
        for sp in sketch_pages:
            sketch_info = self.process_sketch_page(sp["page_obj"], sp["page_number"], sp["sketch_type"], file_path)
            sketches_data.append(sketch_info)

        return {
            "status": "success",
            "file_name": os.path.basename(file_path),
            "total_maps": len(maps_data),
            "total_sketches": len(sketches_data),
            "total_comparable_photos": len(comp_photos),
            "maps": maps_data,
            "sketches": sketches_data,
            "comparable_photos": comp_photos,
            "all_pins": all_pins
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
