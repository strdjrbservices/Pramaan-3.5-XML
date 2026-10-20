@echo off
title Appraisal Map Extractor - Automated Pipeline
color 0A

echo ===============================================================================
echo                APPRAISAL MAP EXTRACTOR ^& OCR PIN EXTRACTION
echo ===============================================================================
echo.
echo Step 1: Checking and Installing Required Dependencies...
python -m pip install --quiet opencv-python numpy pillow pytesseract pymupdf easyocr
echo [OK] Dependencies verified.
echo.

echo Step 2: Running Automated Map and Comparable Pin Extraction...
echo Command: python map_extractor_cli.py --save-images
echo.
python map_extractor_cli.py --save-images

echo.
echo ===============================================================================
echo Extraction Complete!
echo.
echo Output files generated:
echo   - CSV Summary:  map_output\comparables_summary.csv
echo   - JSON Summary: map_output\comparables_summary.json
echo   - XML Summary:  map_output\comparables_summary.xml
echo   - Saved Images: map_output\images\
echo ===============================================================================
echo.
pause
