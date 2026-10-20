# Appraisal Map Extractor: CLI Usage Guide & Documentation

Automated Computer Vision and OCR Pipeline for extracting Subject Property and Comparable pins/callouts from Real Estate Appraisal Location & Aerial Maps.

---

## 🚀 Quick Start

### 1. Install Dependencies
Run the following in PowerShell or Command Prompt:
```powershell
pip install opencv-python numpy pillow pytesseract pymupdf easyocr
```

### 2. Double-Click Execution (Windows)
Double-click **`run_all.bat`** in the project directory. It automatically:
- Checks and installs all required dependencies.
- Runs extraction across available appraisal XML/PDF files with `--save-images`.
- Displays results and pauses when completed.

---

## 💻 CLI Commands & Usage

### Basic Usage
Process all XML and PDF files in the current directory and save annotated images:
```powershell
python map_extractor_cli.py --save-images
```

### Process a Specific XML or PDF File
```powershell
# MISMO XML with embedded Base64 PDF
python map_extractor_cli.py -i "C:\Users\INTEL\Downloads\30 Susquehanna Dr_Revised.xml" --save-images

# Standalone PDF Appraisal Report
python map_extractor_cli.py -i "26-043.XML" --save-images
```

### Process an Entire Folder of Reports (Batch Mode)
```powershell
python map_extractor_cli.py -i "C:\AppraisalReports" -o "batch_map_output" --save-images
```

### Command-Line Arguments Reference

| Option | Short | Default | Description |
|---|---|---|---|
| `--input` | `-i` | `.` (Current Dir) | Path to XML or PDF file, or folder containing appraisal files |
| `--output` | `-o` | `map_output` | Destination directory for CSV, JSON, XML, and images |
| `--save-images` | | `False` | Saves annotated map images with bounding boxes & cropped callouts |
| `--ocr-engine` | | `auto` | OCR engine to use: `auto`, `easyocr`, or `pytesseract` |
| `--dpi` | | `200` | Resolution DPI for PDF page rendering (150-300 recommended) |

---

## 📂 Output Artifacts & Directory Structure

All extracted data and images are organized in the output folder (`map_output/` by default):

```text
map_output/
├── comparables_summary.csv    <-- Master spreadsheet with all pins & callouts
├── comparables_summary.json   <-- JSON data format for API / web integration
├── comparables_summary.xml    <-- XML summary format
└── images/                    <-- Generated when --save-images is passed
    ├── 30 Susquehanna Dr_Revised_pg27_annotated.png   (Overlay with colored boxes)
    ├── 30 Susquehanna Dr_Revised_pg27_subject_1.png   (Cropped Red Subject Pin)
    ├── 30 Susquehanna Dr_Revised_pg27_comp_1.png      (Cropped Blue Comp Pin)
    ├── 30 Susquehanna Dr_Revised_pg27_comp_2.png      (Cropped Blue Comp Pin)
    └── ...
```

---

## 📊 Sample CSV Output (`comparables_summary.csv`)

| Source File | Map Type | Page | Item Type | Label | Address | Distance | Direction | Proximity | Price | Raw OCR Text | Image Path |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 30 Susquehanna Dr_Revised.xml | Location Map | 27 | Subject | Subject | 30 Susquehanna Dr | | | | | SUBJECT 30 Susquehanna Dr | images/..._subject_1.png |
| 30 Susquehanna Dr_Revised.xml | Location Map | 27 | Comparable | Comparable #2 | 70 Caedman Dr | 4.23 miles | E | 4.23 miles E | | 2 70 Caedman Dr 4.23 miles E | images/..._comp_1.png |
| 30 Susquehanna Dr_Revised.xml | Location Map | 27 | Comparable | Comparable #4 | 76 Delaware Dr | 0.33 miles | SE | 0.33 miles SE | | 4 76 Delaware Dr 0.33 miles SE | images/..._comp_2.png |

---

## 🔍 How the Computer Vision Pipeline Works

1. **Embedded PDF Decoding**:
   Extracts and decodes `<DOCUMENT>` or `<EMBEDDED_FILE>` Base64 stream directly in memory from MISMO XML files, avoiding external converters.
2. **Intelligent Page Classification**:
   Scans text stream for Map headers:
   - `Location Map` / `Location Map Addendum`
   - `Aerial Map` / `Aerial View` / `Satellite Map`
   - `Comparable Sales Map` / `Comp Map`
   - `Rentals Map` / `Rental Location Map`
3. **OpenCV HSV Color Segmentation**:
   - 🔴 **Subject Property**: Detects Red callout boxes (`HSV [0, 50, 50]` to `[12, 255, 255]` + `[168, 50, 50]` to `[180, 255, 255]`)
   - 🔵 **Comparable Properties**: Detects Blue callout boxes (`HSV [95, 50, 50]` to `[135, 255, 255]`)
4. **Morphological Contour Filtering**:
   Filters noise and finds bounding boxes of actual pin labels and address callouts.
5. **High-Accuracy OCR**:
   Performs OCR on each cropped region (using `easyocr` or `pytesseract`) with upscaled cubic interpolation for crisp text recognition.
6. **Regex Parsing**:
   Extracts:
   - Pin Label (`Subject`, `Comparable #1`, `Comparable #2`, etc.)
   - Property Address (e.g. `76 Delaware Dr`)
   - Proximity / Distance (`0.33 miles`) and Compass Direction (`SE`)
   - Price (if present)
