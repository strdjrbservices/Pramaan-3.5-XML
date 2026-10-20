import os
import sys
import re
import tempfile
import traceback
import textwrap
from django.core.mail import send_mail
from django.conf import settings
from rest_framework.decorators import api_view, parser_classes, permission_classes
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.response import Response
from rest_framework import status, generics
from rest_framework.permissions import AllowAny, IsAuthenticated
from django.contrib.auth.models import User
from django.contrib.auth.decorators import login_required

from rest_framework.views import APIView
from .models import AppraisalReport, ContactMessage
from .serializers import AppraisalReportSerializer, ContactMessageSerializer, RegisterSerializer, AppraisalReportListSerializer

from .pdf_extractor import (
    extract_fields_from_pdf,
    extract_fields_from_html,
    compare_documents,
)
from .pdf_extractor_offline import extract_fields_from_pdf_offline
from .pdf_extractor_ecr_offline import extract_fields_from_pdf_ecr_offline
from .pdf_extractor_v1_offline import extract_fields_from_pdf_v1_offline
from .offline_requirement_checks import (
    evaluate_state_requirements,
    evaluate_unpaid_ok,
    evaluate_client_requirements,
    evaluate_adu_requirements,
    evaluate_escalation_check,
)
from .xml_extractor import extract_fields_from_xml, extract_photos_from_xml

import threading
import shutil
import time
from typing import Any, Dict, Optional
from django.shortcuts import render
from django.http import FileResponse
from .automation import run_automation
from .automation_revised import run_revised_automation
from .automation_fastapp import run_fastapp_automation
from .utils import (
    NEW_FILES_REVISED_PATH, OLD_FILES_REVISED_PATH, HTML_FILES_PATH, 
    LOG_FILES_PATH, DOWNLOAD_PATH, PROCESSED_FILES_PATH, ERROR_FILES_PATH, 
    FULL_FILE_PATH, FULL_FILE_LOGS_PATH, PAUSE_LOCK_FILE, TERMINATION_LOCK_FILE, logger
)

automation_status: Dict[str, Any] = {
    "is_running": False,
    "log_file": None,
    "error": None,
    "batch_total": 0,
    "batch_current": 0
}

def update_active_log(path):
    global automation_status
    automation_status["log_file"] = path

logger.on_log_file_change = update_active_log

FOLDER_MAP = {
    'new_revised': NEW_FILES_REVISED_PATH,
    'old_revised': OLD_FILES_REVISED_PATH,
    'html_ref': HTML_FILES_PATH,
    'logs': LOG_FILES_PATH,
    'processed': PROCESSED_FILES_PATH,
    'errors': ERROR_FILES_PATH,
    'full_file': FULL_FILE_PATH,
    'full_file_logs': FULL_FILE_LOGS_PATH
}

VALID_EXTENSIONS = {
    'html_ref': ['.html'],
    'new_revised': ['_revised.pdf'],
    'old_revised': ['.pdf'],
    'processed': ['.pdf', '.xlsx'],
    'logs': ['.log', '.xlsx', '.html'],
    'errors': ['.png', '.pdf'],
    'full_file': ['.pdf'],
    'full_file_logs': ['.log', '.xlsx', '.html']
}

def is_allowed_file(filename, folder_key):
    exts = VALID_EXTENSIONS.get(folder_key, ['.pdf'])
    filename_lower = filename.lower()
    for ext in exts:
        if filename_lower.endswith(ext.lower()):
            return True
    return False

def execute_playwright_background(file_path, username, password):
    global automation_status
    automation_status["is_running"] = True
    automation_status["error"] = None
    log_path = logger.start_file_logging(os.path.basename(file_path))
    automation_status["log_file"] = log_path
    if os.path.exists(TERMINATION_LOCK_FILE):
        os.remove(TERMINATION_LOCK_FILE)
    try:
        run_automation(file_path, username, password)
    except Exception as e:
        automation_status["error"] = str(e)
    finally:
        automation_status["is_running"] = False

def execute_fastapp_background(username, password, mode='full_file', download_pref='appr_id', headless=True, submitted_after=None):
    global automation_status
    automation_status["is_running"] = True
    automation_status["error"] = None
    automation_status["batch_total"] = 0
    automation_status["batch_current"] = 0
    log_path = logger.start_file_logging("automation_fastapp")
    automation_status["log_file"] = log_path
    if os.path.exists(TERMINATION_LOCK_FILE):
        os.remove(TERMINATION_LOCK_FILE)
    try:
        logger.info("--- Starting FastApp Independent Process ---")
        fa_mode = 'update_review' if mode == 'update_review' else 'full_file'
        run_fastapp_automation(
            username,
            password,
            mode=fa_mode,
            download_pref=download_pref,
            headless=headless,
            submitted_after=submitted_after
        )
        logger.success("--- FastApp Process Completed ---")
    except InterruptedError:
        logger.error("🛑 FastApp process aborted by user signal.")
        automation_status["error"] = "Process hard-terminated by user."
    except Exception as e:
        automation_status["error"] = str(e)
        logger.error(f"FastApp Process Failed: {str(e)}")
    finally:
        automation_status["is_running"] = False

def execute_automation_batch(filenames, username, password, mode='revised'):
    global automation_status
    automation_status["is_running"] = True
    automation_status["batch_total"] = len(filenames)
    automation_status["batch_current"] = 0
    automation_status["error"] = None
    logger.start_file_logging(f"automation_{mode}")
    if os.path.exists(TERMINATION_LOCK_FILE):
        os.remove(TERMINATION_LOCK_FILE)
    try:
        processed_count = len([f for f in os.listdir(PROCESSED_FILES_PATH) if os.path.isfile(os.path.join(PROCESSED_FILES_PATH, f))])
        logger.info(f"Found {processed_count} processed files in log.")
        search_path = FULL_FILE_PATH if mode == 'full' else NEW_FILES_REVISED_PATH
        logger.info(f"Found {len(filenames)} PDF file(s) to process in '{search_path}': {', '.join(filenames)}")
    except Exception:
        pass
    for filename in filenames:
        current_idx = int(automation_status["batch_current"] or 0)
        automation_status["batch_current"] = current_idx + 1
        source_path = os.path.join(FULL_FILE_PATH if mode == 'full' else NEW_FILES_REVISED_PATH, filename)
        processed_path = os.path.join(PROCESSED_FILES_PATH, filename)
        if os.path.exists(processed_path):
            logger.info(f"Skipping already processed file: {filename}")
            continue
        if not os.path.exists(source_path):
            logger.warning(f"File not found: {filename}. It might have been moved or deleted.")
            continue
        success = False
        attempts = 2
        for i in range(attempts):
            try:
                attempt_num = i + 1
                if i > 0: logger.warning(f"RETRY ATTEMPT {attempt_num} for: {filename}")
                else: logger.info(f"\n--- Starting workflow for: {filename} ---")
                if mode == 'full':
                    run_automation(source_path, username, password)
                else:
                    new_pdf = source_path
                    base_name = os.path.splitext(filename)[0]
                    if base_name.lower().endswith("_revised"): base_name = base_name[:-8]
                    old_pdf_candidates = [f"{base_name}.pdf", filename]
                    old_pdf = next((os.path.join(OLD_FILES_REVISED_PATH, c) for c in old_pdf_candidates if os.path.exists(os.path.join(OLD_FILES_REVISED_PATH, c))), None)
                    html_candidates = [f"{base_name}.html", os.path.splitext(filename)[0] + ".html"]
                    html_path = next((os.path.join(HTML_FILES_PATH, c) for c in html_candidates if os.path.exists(os.path.join(HTML_FILES_PATH, c))), None)
                    run_revised_automation(new_pdf, old_pdf, html_path, username, password)
                success = True
                logger.success(f"Successfully processed: {filename}")
                break
            except InterruptedError:
                logger.error(f"🛑 Batch execution aborted by user signal during {filename}")
                automation_status["error"] = "Process hard-terminated by user."
                automation_status["is_running"] = False
                return
            except Exception as e:
                logger.error(f"Attempt {i+1} failed for {filename}: {str(e)}")
                if i < attempts - 1:
                    logger.info("Conditioning for retry (5.0s cool-down)...")
                    time.sleep(5)
                else:
                    automation_status["error"] = f"CRITICAL: Final failure for {filename} after {attempts} attempts."
        try:
            if success:
                shutil.move(source_path, processed_path)
                logger.info(f"Moved processed file to: {processed_path}")
            else:
                error_path = os.path.join(ERROR_FILES_PATH, filename)
                shutil.move(source_path, error_path)
                logger.warning(f"Moved failed file to: {error_path}")
        except InterruptedError:
            logger.error("🛑 Termination signal received during move operation.")
            automation_status["is_running"] = False
            return
        except Exception as move_err:
            logger.error(f"Failed to move file {filename}: {str(move_err)}")
    
    if os.path.exists(TERMINATION_LOCK_FILE):
        logger.error("🛑 Termination signal finalized batch.")
        automation_status["is_running"] = False
        return

    logger.info("\n✅ Batch processing cycle completed. Checking for new files...")
    automation_status["is_running"] = False
    automation_status["batch_total"] = 0
    automation_status["batch_current"] = 0


class SaveReportView(APIView):
    """
    API endpoint to save appraisal report data.
    """
    permission_classes = (AllowAny,)
    authentication_classes = ()

    def post(self, request, *args, **kwargs):
        try:
            data = request.data

            if hasattr(data, 'dict'):
                data = data.dict()

            if not isinstance(data, dict):
                return Response(
                    {"detail": "Invalid data format. Expected a JSON object."},
                    status=status.HTTP_400_BAD_REQUEST
                )

            user_name = data.get('user_name')
            file_name = data.get('file_name')
            validation_log = data.get('validation_log')
            status_val = data.get('status', 'Completed')
            if 'report_data' in data:
                report_data = data['report_data']
            elif 'extracted_data' in data:
                report_data = data['extracted_data']
            elif 'data' in data and isinstance(data['data'], dict):
                report_data = data['data']
            else:
                report_data = data.copy()
                for key in ['user_name', 'file_name', 'validation_log', 'status', 'form_type']:
                    report_data.pop(key, None)

            if 'form_type' in data and isinstance(report_data, dict) and 'form_type' not in report_data:
                report_data['form_type'] = data['form_type']

            if not report_data:
                return Response(
                    {"detail": "No report data found to save."},
                    status=status.HTTP_400_BAD_REQUEST
                )
            AppraisalReport.objects.create(report_data=report_data, user_name=user_name, file_name=file_name, validation_log=validation_log, status=status_val)
            return Response(
                {"message": "Report data saved successfully!"},
                status=status.HTTP_201_CREATED
            )
        except Exception as e:
            print(f"Error saving report: {e}")
            traceback.print_exc()

            if "1054" in str(e) and "Unknown column" in str(e):
                return Response(
                    {"detail": "Database Error: Missing column. Please run 'python manage.py migrate' on the server."},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )

            return Response(
                {"detail": f"An internal error occurred while saving the report: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

class GetReportsView(APIView):
    """
    API endpoint to retrieve saved appraisal reports.
    """
    permission_classes = (AllowAny,)
    authentication_classes = ()

    def get(self, request, *args, **kwargs):
        try:
            reports = AppraisalReport.objects.defer('validation_log').all().order_by('-created_at')[:50]
            serializer = AppraisalReportListSerializer(reports, many=True)
            return Response(serializer.data, status=status.HTTP_200_OK)
        except Exception as e:
            print(f"Error fetching reports: {e}")
            return Response(
                {"detail": "An internal error occurred while fetching reports."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

class GetReportView(APIView):
    """
    API endpoint to retrieve a single appraisal report by ID.
    """
    permission_classes = (AllowAny,)
    authentication_classes = ()

    def get(self, request, pk, *args, **kwargs):
        try:
            report = AppraisalReport.objects.get(pk=pk)
            serializer = AppraisalReportSerializer(report)
            return Response(serializer.data, status=status.HTTP_200_OK)
        except AppraisalReport.DoesNotExist:
            return Response({"detail": "Report not found."}, status=status.HTTP_404_NOT_FOUND)

class DeleteReportView(APIView):
    """
    API endpoint to delete an appraisal report.
    """
    permission_classes = (AllowAny,)
    authentication_classes = ()

    def delete(self, request, pk, *args, **kwargs):
        try:
            report = AppraisalReport.objects.get(pk=pk)
            report.delete()
            return Response({"message": "Report deleted successfully."}, status=status.HTTP_204_NO_CONTENT)
        except AppraisalReport.DoesNotExist:
            return Response({"detail": "Report not found."}, status=status.HTTP_404_NOT_FOUND)

class UpdateReportView(APIView):
    """
    API endpoint to update an appraisal report's status or data.
    """
    permission_classes = (AllowAny,)
    authentication_classes = ()

    def post(self, request, pk, *args, **kwargs):
        try:
            report = AppraisalReport.objects.get(pk=pk)
            if 'status' in request.data:
                report.status = request.data.get('status')
            if 'report_data' in request.data:
                report.report_data = request.data.get('report_data')
            if 'validation_log' in request.data:
                report.validation_log = request.data.get('validation_log')
            
            report.save()
            return Response({"message": "Report updated successfully."}, status=status.HTTP_200_OK)
        except AppraisalReport.DoesNotExist:
            return Response({"detail": "Report not found."}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({"detail": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class ContactUsView(APIView):
    """
    API endpoint to handle contact form submissions.
    """
    permission_classes = (AllowAny,)
    authentication_classes = ()

    def post(self, request, *args, **kwargs):
        serializer = ContactMessageSerializer(data=request.data)
        if serializer.is_valid():
            try:
                contact_message = serializer.save()
            except Exception as e:
                print(f"Database Error saving contact message: {e}")
                return Response(
                    {"detail": "Internal error saving message. Please check database migrations."},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )


            try:
                subject = f"New Contact Message: {contact_message.subject}"
                message_body = (
                    f"Name: {contact_message.name}\n"
                    f"Email: {contact_message.email}\n\n"
                    f"Message:\n{contact_message.message}"
                )

                from_email = getattr(settings, 'DEFAULT_FROM_EMAIL', 'noreply@praman.com')
                recipient_list = ['strdjrbservices@gmail.com']

                send_mail(subject, message_body, from_email, recipient_list, fail_silently=True)

                if contact_message.send_copy:
                    user_subject = f"Copy of your message: {contact_message.subject}"
                    user_message = f"Hi {contact_message.name},\n\nWe have received your message:\n\n{contact_message.message}\n\nThank you for contacting us."
                    send_mail(user_subject, user_message, from_email, [contact_message.email], fail_silently=True)

            except Exception as e:
                print(f"Error sending contact email: {e}")

            return Response({"message": "Message sent successfully!"}, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    permission_classes = (AllowAny,)
    authentication_classes = ()
    serializer_class = RegisterSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        return Response({"message": "Registration successful. Please wait for admin approval."}, status=status.HTTP_201_CREATED, headers=headers)

@api_view(["GET"])
def health(request):
    """
    A simple health check endpoint.
    """
    return Response({"status": "ok"})


def _save_temp_file(file):
    """Helper function to save uploaded file."""
    suffix = os.path.splitext(file.name)[1] or ".tmp"
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        for chunk in file.chunks():
            tmp.write(chunk)
        return tmp.name


@api_view(["POST"])
@parser_classes([MultiPartParser, FormParser])
def compare_html_to_pdf_with_prompt(request):
    """
    Compares an HTML file to a new PDF file based on a custom prompt/checklist.
    This is designed to support the 1004D Confirmation feature's HTML vs. PDF mode.
    """
    html_file = request.data.get("html_file")
    pdf_file = request.data.get("pdf_file")
    comment = request.data.get(
        "comment"
    )  

    if not html_file or not pdf_file:
        return Response(
            {"detail": "Both HTML and PDF files must be provided."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if not comment:
        return Response(
            {"detail": "A prompt/checklist (comment) must be provided."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    pdf_tmp_path = ""
    try:
        pdf_tmp_path = _save_temp_file(pdf_file)
        
        pdf_data_response = extract_fields_from_pdf(
            pdf_tmp_path,
            form_type="1004D", 
            custom_prompt=comment,
        )

        if pdf_data_response.get("error"):
            return Response(
                {"detail": f"PDF check failed: {pdf_data_response.get('message')}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        pdf_results = pdf_data_response.get("fields", {})
        if "comparison_summary" in pdf_results:
            pdf_results["details"] = pdf_results.pop("comparison_summary")

        return Response(pdf_results)

    except Exception as exc:
        traceback.print_exc()
        return Response(
            {"detail": str(exc)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
    finally:
        if os.path.exists(pdf_tmp_path):
            os.remove(pdf_tmp_path)


@api_view(["POST"])
@parser_classes([MultiPartParser, FormParser])
def compare_contract_to_report(request):
    """
    Compares a main report PDF to a contract copy PDF to verify
    'Contract Price' and 'Contract Date'.
    """
    main_report_file = request.data.get("main_report_file")
    contract_copy_file = request.data.get("contract_copy_file")

    if not main_report_file or not contract_copy_file:
        return Response(
            {
                "detail": "Both main report and contract copy PDF files must be provided."
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    main_tmp_path = ""
    contract_tmp_path = ""
    try:
        main_tmp_path = _save_temp_file(main_report_file)
        contract_tmp_path = _save_temp_file(contract_copy_file)

        prompt = textwrap.dedent(
            """
            You are an expert appraisal data extractor. You are given two PDFs: an 'Original PDF' (the main appraisal report) and a 'Revised PDF' (the contract copy).

            Your task is to extract the 'Contract Price' and 'Date of Contract' from both documents and compare them.

            **CRITICAL INSTRUCTIONS:**
            1.  **JSON Output:** Your response MUST be a single, clean JSON object. Do not include any introductory text, explanations, or markdown formatting like ```json.
            2.  **JSON Structure:** The JSON object must be an array. Each item in the array represents a field you compared and must have the following keys:
                - 'field': The name of the field (either "Contract Price" or "Contract Date").
                - 'old_value': The value extracted from the 'Original PDF' (main report).
                - 'new_value': The value extracted from the 'Revised PDF' (contract copy).
                - 'status': A string, either 'Match' or 'Mismatch'.
            3.  **Data Cleaning:**
                - For 'Contract Price', extract only numeric digits. Remove dollar signs, commas, etc. (e.g., "$1,250,000" becomes "1250000").
                - For 'Contract Date', format it as MM/DD/YYYY.
            4.  **Not Found:** If a value cannot be found in a document, use "N/A".
            5.  **Comparison:** The 'status' should be 'Match' only if the cleaned values are identical.

            Example Response:
            [
              { "field": "Contract Price", "old_value": "550000", "new_value": "550000", "status": "Match" },
              { "field": "Contract Date", "old_value": "05/15/2024", "new_value": "05/16/2024", "status": "Mismatch" }
            ]
        """
        )

        data = compare_documents(
            main_tmp_path, contract_tmp_path, revision_request=prompt
        )

        return Response(data)

    except Exception as exc:
        traceback.print_exc()
        return Response(
            {"detail": str(exc)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
    finally:
        if os.path.exists(main_tmp_path):
            os.remove(main_tmp_path)
        if os.path.exists(contract_tmp_path):
            os.remove(contract_tmp_path)


@api_view(["POST"])
@parser_classes([MultiPartParser, FormParser])
def compare_engagement_letter(request):
    """
    Compares a main report PDF to an engagement letter PDF to verify
    'Property Address' and 'Vendor's Fee'.
    """
    main_report_file = request.data.get("main_report_file")
    engagement_letter_file = request.data.get("engagement_letter_file")

    if not main_report_file or not engagement_letter_file:
        return Response(
            {
                "detail": "Both main report and engagement letter PDF files must be provided."
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    main_tmp_path = ""
    engagement_tmp_path = ""
    try:
        main_tmp_path = _save_temp_file(main_report_file)
        engagement_tmp_path = _save_temp_file(engagement_letter_file)

        prompt = textwrap.dedent(
            """
            You are an expert appraisal data extractor. You are given two PDFs: an 'Original PDF' (the main appraisal report) and a 'Revised PDF' (the engagement letter).

            Your task is to extract the 'Property Address' and 'Vendor's Fee' (which might be labeled as 'Appraisal Fee', 'Fee', or similar) from both documents and compare them.

            **CRITICAL INSTRUCTIONS:**
            1.  **JSON Output:** Your response MUST be a single, clean JSON object. Do not include any introductory text, explanations, or markdown formatting like ```json.
            2.  **JSON Structure:** The JSON object must contain a key "comparison_results" which is an array. Each item in the array represents a field you compared and must have the following keys:
                - 'field': The name of the field (either "Property Address" or "Vendor's Fee").
                - 'main_report_value': The value extracted from the 'Original PDF' (main report).
                - 'engagement_letter_value': The value extracted from the 'Revised PDF' (engagement letter).
                - 'status': A string, either 'Match' or 'Mismatch'.
            3.  **Data Cleaning:**
                - For 'Vendor's Fee', extract only numeric digits. Remove dollar signs, commas, etc. (e.g., "$1,250.00" becomes "1250").
                - For 'Property Address', normalize whitespace and make it a single line.
            4.  **Not Found:** If a value cannot be found in a document, use "N/A".
            5.  **Comparison:** The 'status' should be 'Match' only if the cleaned values are identical.

            Example Response:
            {
              "comparison_results": [
                { "field": "Property Address", "main_report_value": "123 Main St, Anytown, USA", "engagement_letter_value": "123 Main St, Anytown, USA", "status": "Match" },
                { "field": "Vendor's Fee", "main_report_value": "650", "engagement_letter_value": "700", "status": "Mismatch" }
              ]
            }
        """
        )

        data = compare_documents(
            main_tmp_path, engagement_tmp_path, revision_request=prompt
        )

        return Response(data)

    except Exception as exc:
        traceback.print_exc()
        return Response(
            {"detail": str(exc)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
    finally:
        if os.path.exists(main_tmp_path):
            os.remove(main_tmp_path)
        if os.path.exists(engagement_tmp_path):
            os.remove(engagement_tmp_path)


def _run_requirement_check(request, prompt):
    """
    A helper function to run a specific check on a single PDF using a custom prompt.
    """
    file = request.data.get("file")
    if not file:
        return Response(
            {"detail": "No file uploaded"}, status=status.HTTP_400_BAD_REQUEST
        )
    if not file.name.lower().endswith(".pdf"):
        return Response(
            {"detail": "Only PDF files are supported"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    tmp_path = ""
    try:
        tmp_path = _save_temp_file(file)
        data = extract_fields_from_pdf(
            tmp_path, form_type="1004", custom_prompt=prompt, prompt_type="direct"
        )

        if data.get("error"):
            return Response(
                {"detail": data.get("message", "Requirement check failed")},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        return Response(data.get("fields", data))
    except Exception as exc:
        traceback.print_exc()
        return Response(
            {"detail": str(exc)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
    finally:
        if os.path.exists(tmp_path):
            os.remove(tmp_path)



@api_view(["POST"])
@parser_classes([MultiPartParser, FormParser])
def custom_query(request):
    """
    Handles custom queries on PDF files.
    """
    file = request.data.get("file")
    comment = request.data.get("comment")
    form_type = request.data.get("form_type", "1004")

    if not file or not comment:
        return Response(
            {"detail": "File and comment are required."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    tmp_path = ""
    try:
        tmp_path = _save_temp_file(file)
        data = extract_fields_from_pdf(
            tmp_path,
            form_type=form_type,
            custom_prompt=comment,
            prompt_type="general"
        )

        if data.get("error"):
            return Response(
                {"detail": data.get("message", "Extraction error")},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        return Response(data)

    except Exception as exc:
        traceback.print_exc()
        return Response(
            {"detail": str(exc)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
    finally:
        if os.path.exists(tmp_path):
            os.remove(tmp_path)


@api_view(["POST"])
@parser_classes([MultiPartParser, FormParser])
def extract_pdf(request):
    """
    Handles PDF extraction for /extract, /extract-by-category, and /verify-revision.
    """
    try:
        file = request.data.get("file")
        form_type = request.data.get("form_type")
        category = request.data.get("category")
        comment = request.data.get("comment")
        revision_request = request.data.get("revision_request")

        custom_prompt = comment or revision_request

        if not file:
            return Response(
                {"detail": "No file uploaded"}, status=status.HTTP_400_BAD_REQUEST
            )
        is_xml = file.name.lower().endswith(".xml")
        is_pdf = file.name.lower().endswith(".pdf")
        if not (is_pdf or is_xml):
            return Response(
                {"detail": "Only PDF and XML files are supported"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        tmp_path = _save_temp_file(file)

        try:
            # Parse extracted_data if provided by client
            extracted_data_raw = request.data.get("extracted_data")
            extracted_data_obj = None
            if extracted_data_raw:
                if isinstance(extracted_data_raw, dict):
                    extracted_data_obj = extracted_data_raw
                elif isinstance(extracted_data_raw, str):
                    try:
                        import json
                        extracted_data_obj = json.loads(extracted_data_raw)
                    except Exception:
                        pass

            category_clean = str(category or "").strip().upper()
            prompt_lower = str(custom_prompt or "").lower()

            # 1. State Requirement Check (Supports both PDF and XML)
            if category_clean in ["STATE_REQUIREMENT_CHECK", "STATE_REQUIREMENTS"] or any(
                term in prompt_lower for term in [
                    "state-specific", "state specific", "state requirement", "state req",
                    "appraiser’s fee disclosure", "appraiser's fee disclosure", "fee disclosure",
                    "amc license", "amc #", "1455.245"
                ]
            ):
                return Response(evaluate_state_requirements(tmp_path, extracted_data=extracted_data_obj))

            # 2. Client Requirement Check (Supports both PDF and XML)
            elif category_clean in ["CLIENT_REQUIREMENT_CHECK", "CLIENT_REQUIREMENTS"] or any(
                term in prompt_lower for term in [
                    "client requirement", "client-specific", "client specific", "lender/client",
                    "lenders/clients", "bpl mortgage", "visio lending", "ice lender", "equity wave",
                    "homebridge"
                ]
            ):
                return Response(evaluate_client_requirements(tmp_path, extracted_data=extracted_data_obj, custom_prompt=custom_prompt))

            # 3. Unpaid OK Lender Check (Supports both PDF and XML)
            elif category_clean == "UNPAID_OK_CHECK" or "unpaid ok" in prompt_lower or ("unpaid" in prompt_lower and "lender" in prompt_lower):
                return Response(evaluate_unpaid_ok(tmp_path, extracted_data=extracted_data_obj))

            # 4. ADU Check (Supports both PDF and XML)
            elif category_clean == "ADU_CHECK" or "accessory dwelling unit" in prompt_lower or "adu requirements" in prompt_lower or "adu" in prompt_lower:
                return Response(evaluate_adu_requirements(tmp_path, extracted_data=extracted_data_obj))

            # 5. Escalation Check (Supports both PDF and XML)
            elif category_clean == "ESCALATION_CHECK" or "escalation" in prompt_lower:
                return Response(evaluate_escalation_check(tmp_path, extracted_data=extracted_data_obj))

            # 6. XML Field Extraction (When not a specialized check request)
            if is_xml:
                xml_result = extract_fields_from_xml(tmp_path)
                if xml_result.get("status") == "success":
                    return Response(xml_result)
                return Response(
                    {"detail": xml_result.get("message", "XML extraction failed")},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR,
                )

            # 7. PDF Field Extraction (Offline & Model pipelines)
            form_type_str = str(form_type or "").strip().upper()
            if not custom_prompt:
                # 100% Offline Pure Python Extraction (Fast & $0.00 cost)
                if form_type_str in ["ECR", "ERC", "WORLDWIDE ERC"]:
                    offline_data = extract_fields_from_pdf_ecr_offline(tmp_path)
                    if offline_data.get("status") == "success":
                        return Response(offline_data)
                
                if "VERSION" in form_type_str or "URAR" in form_type_str or form_type_str in ["APPRAISAL VERSION #1", "APPRAISAL VERSION #5", "VERSION 1", "VERSION 5"]:
                    offline_data = extract_fields_from_pdf_v1_offline(tmp_path)
                    if offline_data.get("status") == "success":
                        return Response(offline_data)
                
                offline_data = extract_fields_from_pdf_offline(tmp_path)
                if offline_data.get("status") == "success":
                    return Response(offline_data)

                # Auto-fallback to Version 1 / 5 URAR offline if Form 1004 did not match
                offline_data = extract_fields_from_pdf_v1_offline(tmp_path)
                if offline_data.get("status") == "success":
                    return Response(offline_data)

                # Auto-fallback to ECR offline if other forms did not match
                offline_data = extract_fields_from_pdf_ecr_offline(tmp_path)
                if offline_data.get("status") == "success":
                    return Response(offline_data)

            prompt_type = "checklist" if revision_request else "direct"
            data = extract_fields_from_pdf(
                tmp_path,
                form_type,
                category=category,
                custom_prompt=custom_prompt,
                prompt_type=prompt_type,
            )

            if data.get("error"):
                offline_fallback = extract_fields_from_pdf_offline(tmp_path)
                if offline_fallback.get("status") == "success":
                    return Response(offline_fallback)
                return Response(
                    {"detail": data.get("message", "Extraction error")},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR,
                )

            if custom_prompt and data.get("fields"):
                return Response(data)

            return Response(data)

        except Exception as exc:
            traceback.print_exc()
            return Response(
                {"detail": str(exc)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        finally:
            if os.path.exists(tmp_path):
                os.remove(tmp_path)

    except Exception as e:
        return Response(
            {"detail": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(["POST"])
@parser_classes([MultiPartParser, FormParser])
def compare_pdf_to_html(request):
    """
    Compares a PDF file to an HTML file.
    """
    pdf_file = request.data.get("pdf_file")
    html_file = request.data.get("html_file")

    if not pdf_file or not html_file:
        return Response(
            {"detail": "Both PDF and HTML files must be provided."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    pdf_tmp_path = ""
    try:
        pdf_tmp_path = _save_temp_file(pdf_file)

        html_content_bytes = b"".join(chunk for chunk in html_file.chunks())
        html_content = html_content_bytes.decode("utf-8")

        fields_to_compare = [
            "Client/Lender on Report",
            "Client Address",
            "Transaction Type",
            "FHA Case Number",
            "Borrower (and Co-Borrower)",
            "Property Address",
            "Property County",
            "Property Type",
            "Assigned to Vendor(s)",
            "AMC Reg. Number",
            "Appraisal Type",
            "Unit Number",
            "UAD XML Report",
            "Appraiser's Fee",
        ]

        pdf_prompt = textwrap.dedent(f"""\
            You are an expert data extractor for appraisal reports. Your task is to analyze the provided PDF and extract the values for the fields listed below with high accuracy.

            **CRITICAL INSTRUCTIONS:**
            1.  **JSON Output:** Your response MUST be a single, clean JSON object. Do not include any introductory text, explanations, or markdown formatting like ```json.
            2.  **JSON Structure:** Each key in the JSON must be the field name from the list. The value for each key must be another JSON object with two keys: 'value' and 'page_no'.
                - 'value': The extracted text or finding.
                - 'page_no': The page number where the information was found.
                - Example: {{ "Client Name": {{ "value": "Example Bank", "page_no": 1 }} }}
            3.  **Not Found:** If a field's value cannot be found, use "N/A" for the 'value' and `null` for 'page_no'.
            4.  **Data Cleaning:**
                - For fields with choices (e.g., checkboxes, Yes/No), return only the selected option's text (e.g., "Purchase", "Yes").
                - Normalize addresses to a single line with standard spacing.

            **FIELD-SPECIFIC EXTRACTION RULES & HINTS:**
            - **'Client Name'**: Find the 'Lender/Client', usually on the first page in the Subject section or if not found then get Lender/Client Company Name in certification page don't take Appraisal Management Company as output.
            - **'Client Address'**: Find the full address associated with the 'Lender/Client', combining street, city, state, and zip into a single line.
            - **'Transaction Type'**: Look for a 'Transaction Type' or 'Assignment Type' section. It's often a checkbox with options like 'Purchase', 'Refinance', 'Construction', 'REO'. Extract only the selected option's text.
            - **'FHA Case Number'**: Find the 'FHA Case No.' or 'Case Number' field, typically in the header or top section of the first page. It usually has a format like 'XXX-XXXXXXX'. If not present, check for a 'VA Case Number'.
            - **'Borrower (and Co-Borrower)'**: Extract the name(s) from the 'Borrower' field. If there is a co-borrower, combine them with ' & '.
            - **'Property Address'**: Extract the full property address, usually found in the 'Subject' section. This should include street, city, state, and zip code.
            - **'Property County'**: Extract the county for the subject property, often found near the property address.
            - **'Property Type'**: Look for a 'Property Type' or similar field, often in the 'Improvements' section. It's often a checkbox with options like 'Single Family', 'Condo', 'PUD', '2-4 Unit'. Extract the selected option.
            - **'Assigned to Vendor(s)'**: This is the Appraiser's Name. Find it in the 'Appraiser' or 'Supervisory Appraiser' signature block in the 'Certification' section at the end of the report.
            - **'AMC Reg. Number'**: Search all pages of the report for a field labeled 'AMC License #', 'AMC Reg. Number', 'AMC Registration', or 'AMC Information'. This can appear on any page including the client section, appraiser certification page, state disclosure page, or addenda.
            - **'Appraisal Type'**: Identify the primary appraisal form type and any additional forms present in the PDF. Scan headers and footers for form numbers. Combine multiple forms with ' + ' (e.g., '1004 + 1007'). Primary Types: 1004 (URAR), 1073 (Condo), 1025 (Multi-family), 2055 (Exterior), 1004C (Manufactured), 2090, 1075. Additional Types: 1007 (Rent Schedule), 1004D (Update/Completion), 92051, Compliance Inspection. Allowed Values: [1025, 1073, 1004, 1007, 1004D, 2090, 1007, 92051, 2055, As-is + ARV Reports, 203K FHA, 1075, 71A/71B, 1004C, ACE + PDR, Appraisal Version #1, ERC, ECR].
            - **'Unit Number'**: If the property is part of a multi-unit building (like a condo or apartment), find the specific unit number, often part of the 'Property Address' or in a separate 'Unit #' field.
            - **'UAD XML Report'**: This is often not explicitly stated. Infer 'True' if you see "UAD" mentioned in relation to compliance or definitions, especially in an addendum titled "UNIFORM APPRAISAL DATASET (UAD) DEFINITIONS ADDENDUM". Otherwise, look for a checkbox. If no evidence, return 'False'.
            - **'Appraiser's Fee'**: Search all pages of the report for a field labeled 'Appraiser's Fee', 'Appraisal Fee', 'Fee', or 'Fee Disclosed'. This can appear on any page of the report including the main subject section, contract section, certification section, fee disclosure page, invoice page, or addendum.

            **Fields to Extract:** {', '.join(fields_to_compare)}
            """)

        pdf_data_response = extract_fields_from_pdf(
            pdf_tmp_path, form_type="1004", custom_prompt=pdf_prompt, prompt_type="direct"
        )

        if pdf_data_response.get("error"):
            return Response(
                {
                    "detail": f"PDF extraction failed: {pdf_data_response.get('message')}"
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        pdf_data = pdf_data_response.get("fields", {})
        html_data = extract_fields_from_html(html_content, fields_to_compare)

        comparison_results = []
        for field in fields_to_compare:
            pdf_field_data = pdf_data.get(field, {})
            pdf_value = (
                pdf_field_data.get("value")
                if isinstance(pdf_field_data, dict)
                else pdf_field_data
            )
            html_value = html_data.get(field)

            pdf_value_str = str(pdf_value).strip() if pdf_value is not None else "N/A"
            html_value_str = (
                str(html_value).strip() if html_value is not None else "N/A"
            )

            if not pdf_value_str:
                pdf_value_str = "N/A"
            if not html_value_str:
                html_value_str = "N/A"

            match_status = (
                "Match"
                if pdf_value_str.lower() == html_value_str.lower()
                else "Mismatch"
            )

            comparison_results.append(
                {
                    "field": field,
                    "html_value": html_value_str,
                    "pdf_value": pdf_value_str,
                    "status": match_status,
                }
            )

        return Response({"comparison_results": comparison_results})

    except Exception as exc:
        traceback.print_exc()
        return Response(
            {"detail": str(exc)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
    finally:
        if os.path.exists(pdf_tmp_path):
            os.remove(pdf_tmp_path)


@api_view(["POST"])
@parser_classes([MultiPartParser, FormParser])
def compare_pdf_to_xml(request):
    """
    Compares a PDF file to an XML file and returns field-by-field differences.
    """
    pdf_file = request.data.get("pdf_file")
    xml_file = request.data.get("xml_file")

    if not pdf_file or not xml_file:
        return Response(
            {"detail": "Both PDF and XML files must be provided."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    pdf_tmp_path = ""
    xml_tmp_path = ""
    try:
        pdf_tmp_path = _save_temp_file(pdf_file)
        xml_tmp_path = _save_temp_file(xml_file)

        pdf_data = extract_fields_from_pdf_offline(pdf_tmp_path)
        xml_data = extract_fields_from_xml(xml_tmp_path)

        pdf_fields = pdf_data.get("fields", {})
        xml_fields = xml_data.get("fields", {})

        fields_to_check = [
            ("Property Address", ("SUBJECT", "Property Address")),
            ("City", ("SUBJECT", "City")),
            ("State", ("SUBJECT", "State")),
            ("Zip Code", ("SUBJECT", "Zip Code")),
            ("County", ("SUBJECT", "County")),
            ("Borrower", ("SUBJECT", "Borrower")),
            ("Owner of Public Record", ("SUBJECT", "Owner of Public Record")),
            ("Assessor's Parcel #", ("SUBJECT", "Assessor's Parcel #")),
            ("Tax Year", ("SUBJECT", "Tax Year")),
            ("R.E. Taxes $", ("SUBJECT", "R.E. Taxes $")),
            ("Contract Price $", ("CONTRACT", "Contract Price $")),
            ("Date of Contract", ("CONTRACT", "Date of Contract")),
            ("Neighborhood Location", ("NEIGHBORHOOD", "Location")),
            ("Property Values", ("NEIGHBORHOOD", "Property Values")),
            ("Site Area", ("SITE", "Area")),
            ("Zoning Classification", ("SITE", "Specific Zoning Classification")),
            ("Units", ("IMPROVEMENTS", "Units")),
            ("Year Built", ("IMPROVEMENTS", "Year Built")),
            ("Gross Building Area", ("IMPROVEMENTS", "Gross Building Area")),
            ("Appraised Value $", ("RECONCILIATION", "opinion of the market value, as defined, of the real property that is the subject of this report is $")),
            ("Sales Comp Indicated Value $", ("RECONCILIATION", "Indicated Value by: Sales Comparison Approach $")),
            ("Effective Date", ("RECONCILIATION", "Appraisal Effective Date")),
            ("Appraiser Name", ("RECONCILIATION", "Appraiser Name")),
        ]

        def _get_val(data_dict, path):
            sec, key = path
            sec_dict = data_dict.get(sec, {})
            if isinstance(sec_dict, dict):
                return str(sec_dict.get(key, "")).strip()
            return str(data_dict.get(key, "")).strip()

        comparison_results = []
        for label, path in fields_to_check:
            pdf_v = _get_val(pdf_fields, path)
            xml_v = _get_val(xml_fields, path)

            norm_pdf = re.sub(r"[^\w]", "", pdf_v.lower())
            norm_xml = re.sub(r"[^\w]", "", xml_v.lower())

            status_val = "Match" if (norm_pdf and norm_xml and norm_pdf == norm_xml) or (not norm_pdf and not norm_xml) else "Mismatch"

            comparison_results.append({
                "field": label,
                "pdf_value": pdf_v or "N/A",
                "xml_value": xml_v or "N/A",
                "status": status_val,
            })

        return Response({
            "status": "success",
            "comparison_results": comparison_results,
            "pdf_data": pdf_fields,
            "xml_data": xml_fields,
        })
    except Exception as exc:
        traceback.print_exc()
        return Response({"detail": str(exc)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    finally:
        if pdf_tmp_path and os.path.exists(pdf_tmp_path):
            os.remove(pdf_tmp_path)
        if xml_tmp_path and os.path.exists(xml_tmp_path):
            os.remove(xml_tmp_path)


@api_view(["POST"])
@parser_classes([MultiPartParser, FormParser])
def compare_pdfs(request):
    """
    Compares two PDF files.
    """
    old_pdf_file = request.data.get("old_pdf_file")
    new_pdf_file = request.data.get("new_pdf_file")
    revision_request = request.data.get("revision_request")
    form_type = request.data.get("form_type")

    if not old_pdf_file or not new_pdf_file:
        return Response(
            {"detail": "Both old and new PDF files must be provided."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    old_tmp_path = ""
    new_tmp_path = ""
    try:
        old_tmp_path = _save_temp_file(old_pdf_file)
        new_tmp_path = _save_temp_file(new_pdf_file)

        data = compare_documents(
            old_tmp_path, new_tmp_path, revision_request=revision_request, form_type=form_type
        )

        if isinstance(data, dict) and data.get("error"):
            return Response(
                {"detail": data.get("message", "An unknown error occurred during comparison.")},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        return Response(data)
    except Exception as exc:
        traceback.print_exc()
        return Response(
            {"detail": str(exc)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
    finally:
        if os.path.exists(old_tmp_path):
            os.remove(old_tmp_path)
        if os.path.exists(new_tmp_path):
            os.remove(new_tmp_path)


@api_view(["POST"])
@parser_classes([MultiPartParser, FormParser])
def extract_from_html_view(request):
    """
    Extracts specific fields from an HTML file.
    """
    html_file = request.data.get("html_file")
    if not html_file:
        return Response(
            {"detail": "No file uploaded"}, status=status.HTTP_400_BAD_REQUEST
        )

    try:
        html_content_bytes = b"".join(chunk for chunk in html_file.chunks())
        html_content = html_content_bytes.decode("utf-8")

        fields_to_extract = [
            "Client/Lender on Report",
            "Client Name",
            "Client Address",
            "Transaction Type",
            "FHA Case Number",
            "Borrower (and Co-Borrower)",
            "Property Address",
            "Property County",
            "Property Type",
            "Assigned to Vendor(s)",
            "AMC Reg. Number",
            "Appraisal Type",
            "Unit Number",
            "UAD XML Report",
        ]

        extracted_data = extract_fields_from_html(html_content, fields_to_extract)

        return Response({"extracted_data": extracted_data})
    except Exception as exc:
        traceback.print_exc()
        return Response(
            {"detail": str(exc)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
@login_required(login_url='/api/login/')
def automation_dashboard(request):
    """View to serve the automation dashboard."""
    return render(request, 'api/index.html')

@api_view(['POST'])
@parser_classes([MultiPartParser, FormParser])
@permission_classes([IsAuthenticated])
def generic_upload_to_folder(request, folder_key):
    path = FOLDER_MAP.get(folder_key)
    if not path: return Response({"error": "Invalid folder destination"}, status=status.HTTP_400_BAD_REQUEST)
    file_obj = request.FILES.get('file')
    if not file_obj: return Response({"error": "No data stream found"}, status=status.HTTP_400_BAD_REQUEST)
    if not is_allowed_file(file_obj.name, folder_key):
        req = ", ".join(VALID_EXTENSIONS.get(folder_key, ['.pdf']))
        return Response({"error": f"Validation Failure: Destination {folder_key} requires {req} format"}, status=status.HTTP_400_BAD_REQUEST)
    save_path = os.path.join(path, file_obj.name)
    with open(save_path, 'wb+') as destination:
        for chunk in file_obj.chunks():
            destination.write(chunk)
    return Response({"message": f"Successfully stored {file_obj.name} in {folder_key.upper()} repository"})

@api_view(['GET', 'DELETE'])
@permission_classes([IsAuthenticated])
def list_generic_files(request, folder_key):
    path = FOLDER_MAP.get(folder_key)
    if not path or not os.path.exists(path):
        if request.method == 'GET': return Response([])
        return Response({"error": "Invalid folder"}, status=status.HTTP_400_BAD_REQUEST)
    
    if request.method == 'DELETE':
        for f in os.listdir(path):
            os.remove(os.path.join(path, f))
        return Response({"message": f"Purged all records in {folder_key}"})
        
    files = sorted([f for f in os.listdir(path) if os.path.isfile(os.path.join(path, f))])
    return Response(files)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def download_generic_file(request, folder_key, filename):
    path = FOLDER_MAP.get(folder_key)
    if not path: return Response({"error": "Invalid folder"}, status=status.HTTP_400_BAD_REQUEST)
    file_path = os.path.join(path, filename)
    if not os.path.exists(file_path): return Response({"error": "File not found"}, status=status.HTTP_404_NOT_FOUND)
    return FileResponse(open(file_path, 'rb'), as_attachment=True)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def toggle_pause(request):
    if PAUSE_LOCK_FILE.exists():
        os.remove(PAUSE_LOCK_FILE)
        return Response({"paused": False, "message": "Resumed"})
    else:
        PAUSE_LOCK_FILE.touch()
        return Response({"paused": True, "message": "Paused"})

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def kill_automation(request):
    global automation_status
    automation_status["is_running"] = False
    automation_status["error"] = "Process hard-terminated by user."
    with open(TERMINATION_LOCK_FILE, "w") as f: f.write("KILL")
    return Response({"message": "Engine sequence killed and termination signal sent."})

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_log_files(request):
    files = []
    if os.path.exists(LOG_FILES_PATH):
        files = sorted(
            [f for f in os.listdir(LOG_FILES_PATH) if os.path.isfile(os.path.join(LOG_FILES_PATH, f))],
            key=lambda x: os.path.getmtime(os.path.join(LOG_FILES_PATH, x)),
            reverse=True
        )
    return Response(files)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_active_log_content(request):
    global automation_status
    log_path = automation_status.get("log_file")
    if not log_path: return Response({"content": "", "filename": None})
    if not os.path.exists(log_path):
        log_path = os.path.join(LOG_FILES_PATH, os.path.basename(log_path))
    if not os.path.exists(log_path): return Response({"content": "", "filename": None})
    try:
        with open(log_path, 'r', encoding='utf-8') as f: content = f.read()
        return Response({"content": content, "filename": os.path.basename(log_path)})
    except Exception as e:
        return Response({"content": f"Error reading log: {str(e)}", "filename": os.path.basename(log_path)})

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_log_file_content(request, filename):
    log_path = os.path.join(LOG_FILES_PATH, filename)
    if not os.path.exists(log_path): return Response({"error": "File not found"}, status=status.HTTP_404_NOT_FOUND)
    try:
        with open(log_path, 'r', encoding='utf-8') as f: content = f.read()
        return Response({"content": content, "filename": filename})
    except Exception as e: return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['POST'])
@parser_classes([MultiPartParser, FormParser])
@permission_classes([IsAuthenticated])
def upload_file_automation(request):
    global automation_status
    if automation_status["is_running"]: return Response({"error": "An automation process is already running."}, status=status.HTTP_400_BAD_REQUEST)
    file_obj = request.FILES.get('pdf')
    if not file_obj: return Response({"error": "No file part"}, status=status.HTTP_400_BAD_REQUEST)
    if file_obj and file_obj.name.endswith('.pdf'):
        save_path = os.path.join(DOWNLOAD_PATH, 'uploads', file_obj.name)
        os.makedirs(os.path.dirname(save_path), exist_ok=True)
        with open(save_path, 'wb+') as dest:
            for chunk in file_obj.chunks(): dest.write(chunk)
        return Response({"message": f"File {file_obj.name} uploaded and stored. Ready for manual review launch."})
    return Response({"error": "Invalid file format. Please upload a PDF."}, status=status.HTTP_400_BAD_REQUEST)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def start_stored_revised_automation(request):
    global automation_status
    if automation_status["is_running"]: return Response({"error": "An automation process is already running."}, status=status.HTTP_400_BAD_REQUEST)
    filename = request.data.get('filename')
    username = request.data.get('username')
    password = request.data.get('password')
    mode = request.data.get('mode', 'revised')
    if not filename: return Response({"error": "No filename selected."}, status=status.HTTP_400_BAD_REQUEST)
    threading.Thread(target=execute_automation_batch, args=([filename], username, password, mode)).start()
    return Response({"message": f"Automation started for stored file: {filename}."})

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def start_batch_stored_revised_automation(request):
    global automation_status
    if automation_status["is_running"]: return Response({"error": "An automation process is already running."}, status=status.HTTP_400_BAD_REQUEST)
    filenames = request.data.get('filenames', [])
    username = request.data.get('username')
    password = request.data.get('password')
    mode = request.data.get('mode', 'revised')
    if not filenames: return Response({"error": "No filenames selected."}, status=status.HTTP_400_BAD_REQUEST)
    threading.Thread(target=execute_automation_batch, args=(filenames, username, password, mode)).start()
    return Response({"message": f"Batch automation started for {len(filenames)} files."})

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def start_fastapp_automation_view(request):
    global automation_status
    if automation_status["is_running"]: return Response({"error": "An automation process is already running."}, status=status.HTTP_400_BAD_REQUEST)
    username = request.data.get('username')
    password = request.data.get('password')
    mode = request.data.get('mode', 'full_file')
    download_pref = request.data.get('downloadPref', 'appr_id')
    headless = request.data.get('headless', True)
    submitted_after = request.data.get('submittedAfter')
    threading.Thread(
        target=execute_fastapp_background,
        args=(username, password, mode, download_pref, headless, submitted_after)
    ).start()
    return Response({"message": "FastApp Independent automation sequence started."})

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_automation_status(request):
    global automation_status
    return Response(automation_status)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_new_revised_files(request):
    path = NEW_FILES_REVISED_PATH
    if not os.path.exists(path): return Response([])
    files = sorted([f for f in os.listdir(path) if os.path.isfile(os.path.join(path, f))])
    return Response(files)

@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_new_revised_file(request, filename):
    file_path = os.path.join(NEW_FILES_REVISED_PATH, filename)
    if os.path.exists(file_path):
        os.remove(file_path)
        return Response({"message": f"File {filename} deleted."})
    return Response({"error": "File not found."}, status=status.HTTP_404_NOT_FOUND)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_old_revised_files(request):
    path = OLD_FILES_REVISED_PATH
    if not os.path.exists(path): return Response([])
    files = sorted([f for f in os.listdir(path) if os.path.isfile(os.path.join(path, f))])
    return Response(files)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_html_files(request):
    path = HTML_FILES_PATH
    if not os.path.exists(path): return Response([])
    files = sorted([f for f in os.listdir(path) if os.path.isfile(os.path.join(path, f))])
    return Response(files)


@api_view(["POST"])
@parser_classes([MultiPartParser, FormParser, JSONParser])
def extract_photos_view(request):
    """
    Extracts photos and their labels/captions from an uploaded XML or PDF file.
    Returns:
    {
        "status": "success",
        "total_photos": len(photos),
        "categories": ["Subject", "Interior", "Comparable", "Rental", "Sketch", "Map", "General"],
        "photos": photos
    }
    """
    uploaded_file = request.FILES.get("file") or request.FILES.get("pdf_file") or request.FILES.get("xml_file")
    file_path = request.data.get("file_path") or request.data.get("path")
    try:
        max_photos = int(request.data.get("max_photos", 60))
    except (TypeError, ValueError):
        max_photos = 60

    try:
        dpi = int(request.data.get("dpi", 120))
    except (TypeError, ValueError):
        dpi = 120

    include_images_val = request.data.get("include_images", "true")
    include_images = str(include_images_val).lower() in ["true", "1", "yes"]

    if not uploaded_file and not file_path:
        return Response(
            {"status": "error", "message": "No file or file_path provided"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    tmp_path = None
    if uploaded_file:
        suffix = os.path.splitext(uploaded_file.name)[1].lower() or ".xml"
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            for chunk in uploaded_file.chunks():
                tmp.write(chunk)
            tmp_path = tmp.name
    else:
        tmp_path = file_path

    try:
        photos = extract_photos_from_xml(
            tmp_path,
            max_photos=max_photos,
            dpi=dpi,
            include_images=include_images
        )
        cats = sorted(list(set(p.get("category", "General") for p in photos)))
        return Response({
            "status": "success",
            "total_photos": len(photos),
            "categories": cats,
            "photos": photos
        })
    except Exception as exc:
        traceback.print_exc()
        return Response(
            {"status": "error", "message": str(exc)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
    finally:
        if uploaded_file and tmp_path and os.path.exists(tmp_path):
            try:
                os.remove(tmp_path)
            except Exception:
                pass


@api_view(["POST"])
@parser_classes([MultiPartParser, FormParser, JSONParser])
def extract_maps_view(request):
    """
    Extracts Location & Aerial Map pins, subject property address (red boxes),
    and comparable pins (blue boxes) from uploaded MISMO XML or PDF appraisal report.
    Part of image data extraction pipeline in Pramaan.
    """
    uploaded_file = request.FILES.get("file") or request.FILES.get("pdf_file") or request.FILES.get("xml_file")
    file_path = request.data.get("file_path") or request.data.get("filePath") or request.data.get("path")
    save_images = str(request.data.get("save_images", "true")).lower() in ["true", "1", "yes"]

    if not uploaded_file and not file_path:
        return Response(
            {"status": "error", "message": "No file or file_path provided"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    tmp_path = None
    if uploaded_file:
        suffix = os.path.splitext(uploaded_file.name)[1].lower() or ".xml"
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            for chunk in uploaded_file.chunks():
                tmp.write(chunk)
            tmp_path = tmp.name
    else:
        curr_dir = os.path.dirname(os.path.abspath(__file__))
        workspace_root = os.path.dirname(os.path.dirname(curr_dir))
        if not os.path.isabs(file_path):
            file_path = os.path.join(workspace_root, file_path)
        tmp_path = file_path

    try:
        # Add workspace root to sys.path to import map_extractor_cli
        curr_dir = os.path.dirname(os.path.abspath(__file__))
        workspace_root = os.path.dirname(os.path.dirname(curr_dir))
        if workspace_root not in sys.path:
            sys.path.insert(0, workspace_root)

        from map_extractor_cli import MapExtractor
        out_dir = os.path.join(workspace_root, "map_output")
        extractor = MapExtractor(output_dir=out_dir, save_images=save_images)
        exhibits_result = extractor.extract_all_exhibits_data(tmp_path)
        return Response(exhibits_result)
    except Exception as exc:
        traceback.print_exc()
        return Response(
            {"status": "error", "message": str(exc)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
    finally:
        if uploaded_file and tmp_path and os.path.exists(tmp_path):
            try:
                os.remove(tmp_path)
            except Exception:
                pass


