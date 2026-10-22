import os
import unittest
from unittest.mock import AsyncMock, patch
import tempfile
from pathlib import Path

from api.utils import send_email

class SendEmailTests(unittest.IsolatedAsyncioTestCase):
    @patch('api.utils.aiosmtplib')
    async def test_send_email_attachment_limits(self, mock_aiosmtplib):
        mock_aiosmtplib.send = AsyncMock()
        
        with tempfile.TemporaryDirectory() as tmpdir:
            file_small = Path(tmpdir) / "small.txt"
            file_small.write_text("small file content")
            
            file_large = Path(tmpdir) / "large.pdf"
            with open(file_large, "wb") as f:
                f.write(b"x" * (19 * 1024 * 1024))
                
            attachments = [str(file_small), str(file_large)]
            
            with patch.dict(os.environ, {"EMAIL_PASS": "test_pass", "EMAIL_USER": "test@gmail.com"}):
                await send_email(
                    subject="Test Subject",
                    body_text="Initial body text.",
                    attachment_paths=attachments,
                )
                
                self.assertTrue(mock_aiosmtplib.send.called)
                sent_msg = mock_aiosmtplib.send.call_args[0][0]
                
                body_content = ""
                for part in sent_msg.walk():
                    if part.get_content_type() == "text/plain":
                        body_content = part.get_content()
                        break
                body_content = body_content.strip()
                self.assertIn("Initial body text.", body_content)
                self.assertIn("⚠️ Note: The following attachment(s) were omitted", body_content)
                self.assertIn("large.pdf", body_content)
                
                attachments_list = list(sent_msg.iter_attachments())
                self.assertEqual(len(attachments_list), 1)
                self.assertEqual(attachments_list[0].get_filename(), "small.txt")


class FastAppFilterTests(unittest.TestCase):
    def test_parse_datetime_various_formats(self):
        from api.automation_fastapp import parse_datetime
        from datetime import datetime
        
        self.assertEqual(parse_datetime("2026-07-10T15:04:03"), datetime(2026, 7, 10, 15, 4, 3))
        self.assertEqual(parse_datetime("2026-07-10T15:04"), datetime(2026, 7, 10, 15, 4))
        self.assertEqual(parse_datetime("2026-07-10"), datetime(2026, 7, 10))
        
        self.assertEqual(parse_datetime("07/10/2026 03:04:03 PM"), datetime(2026, 7, 10, 15, 4, 3))
        self.assertEqual(parse_datetime("07/10/2026 3:04 PM"), datetime(2026, 7, 10, 15, 4))
        self.assertEqual(parse_datetime("7/10/26 3:04 PM"), datetime(2026, 7, 10, 15, 4))
        
        self.assertIsNone(parse_datetime(""))
        self.assertIsNone(parse_datetime(None))
        self.assertIsNone(parse_datetime("invalid date"))

    def test_find_date_column_index_from_headers(self):
        from api.automation_fastapp import find_date_column_index
        
        headers = ["order id", "appraiser", "date submitted", "status"]
        self.assertEqual(find_date_column_index(headers, None), 2)
        
        headers2 = ["order id", "received time", "status"]
        self.assertEqual(find_date_column_index(headers2, None), 1)

    def test_find_date_column_index_from_rows_fallback(self):
        from api.automation_fastapp import find_date_column_index
        from unittest.mock import MagicMock
        
        mock_rows = MagicMock()
        mock_rows.count.return_value = 3
        
        mock_row1 = MagicMock()
        mock_row1.count.return_value = 3
        mock_col1_0 = MagicMock()
        mock_col1_0.inner_text.return_value = "001-2345"
        mock_col1_1 = MagicMock()
        mock_col1_1.inner_text.return_value = "File in review"
        mock_col1_2 = MagicMock()
        mock_col1_2.inner_text.return_value = "07/10/2026 03:04 PM"
        
        def nth_col(idx):
            return [mock_col1_0, mock_col1_1, mock_col1_2][idx]
            
        mock_row1.locator.return_value.nth = nth_col
        mock_row1.locator.return_value.count.return_value = 3
        
        mock_row2 = MagicMock()
        mock_row2.count.return_value = 3
        mock_col2_0 = MagicMock()
        mock_col2_0.inner_text.return_value = "001-2346"
        mock_col2_1 = MagicMock()
        mock_col2_1.inner_text.return_value = "File in review"
        mock_col2_2 = MagicMock()
        mock_col2_2.inner_text.return_value = "07/09/2026 01:15 AM"
        
        def nth_col2(idx):
            return [mock_col2_0, mock_col2_1, mock_col2_2][idx]
            
        mock_row2.locator.return_value.nth = nth_col2
        mock_row2.locator.return_value.count.return_value = 3
        
        def nth_row(idx):
            return [None, mock_row1, mock_row2][idx]
            
        mock_rows.nth = nth_row
        
        self.assertEqual(find_date_column_index([], mock_rows), 2)


class RevisionVerificationTests(unittest.TestCase):
    def test_parse_revision_request_items_numbered(self):
        from api.offline_comparison import _parse_revision_request_items
        raw_req = """
        Report Rejection Reason:
        1. Borrower name as per order form: Robert J. Smith. Please update.
        2. Outside Entry/Exit is checked in Sales Grid but not reflected in Improvements.
        3. Form 1007: Please add Comparable Rent Schedule.
        Thank you.
        """
        items = _parse_revision_request_items(raw_req)
        self.assertEqual(len(items), 3)
        self.assertIn("Borrower name as per order form: Robert J. Smith", items[0])
        self.assertIn("Outside Entry/Exit", items[1])
        self.assertIn("Form 1007", items[2])

    def test_parse_revision_request_items_html(self):
        from api.offline_comparison import _parse_revision_request_items
        raw_html = (
            "<span id='lblFileRejectReason'>• Update appraised value to $450,000.<br/>"
            "• Please confirm that the contract price is $440,000.<br/>"
            "• Provide explanation for comp 2 distance over 1 mile.</span>"
        )
        items = _parse_revision_request_items(raw_html)
        self.assertEqual(len(items), 3)
        self.assertIn("appraised value", items[0].lower())
        self.assertIn("contract price", items[1].lower())
        self.assertIn("comp 2 distance", items[2].lower())

    @patch("api.offline_comparison.extract_report_data_offline")
    def test_verify_revision_request_offline_fulfilled_and_unfulfilled(self, mock_extract):
        from api.offline_comparison import verify_revision_request_offline

        mock_extract.return_value = {
            "status": "success",
            "market_value": "$525,000",
            "fields": {
                "SUBJECT": {
                    "Borrower": "Robert J. Smith",
                    "Property Address": "123 Main St",
                    "County": "Harris",
                },
                "CONTRACT": {
                    "Contract Price $": "$520,000",
                    "Date of Contract": "05/10/2026",
                },
                "IMPROVEMENTS": {
                    "Total Rooms": "8",
                    "Bedrooms": "4",
                    "Finished area above grade Bath(s)": "3.0",
                    "Gross Living Area": "2,450",
                    "Basement Details": "Outside Entry / Exit, Full Unfinished",
                },
                "SALES_COMPARISON": {
                    "Subject Total Rooms": "8",
                    "Subject Bedrooms": "4",
                    "Subject Bathrooms": "3.0",
                    "Subject Gross Living Area": "2,450",
                    "Subject Basement & Finished Rooms Below Grade": "Outside Entry / 1000sf0sfwu",
                },
                "SITE": {
                    "FEMA Flood Zone": "Zone X",
                    "FEMA Map #": "48201C0450L",
                    "FEMA Map Date": "06/18/2007",
                },
            },
            "pages_text": [
                {"page_no": 1, "text": "subject property address 123 main st borrower robert j. smith contract price $520,000 flood zone x"},
                {"page_no": 2, "text": "improvements 8 rooms 4 bedrooms 3.0 baths 2,450 gla outside entry"},
                {"page_no": 3, "text": "sales comparison indicated value $525,000 opinion of market value $525,000"},
            ],
            "page_count": 3,
        }

        revision_prompt = """
        1. Borrower name should be Robert J. Smith.
        2. Contract price should be $600,000.
        3. Outside Entry/Exit should be verified in Improvements and Sales Grid.
        4. Reconcile GLA between Improvements and Sales Grid.
        5. Form 1007 Comparable Rent Schedule must be attached.
        """

        res = verify_revision_request_offline("fake_revised.pdf", revision_prompt)
        self.assertIn("comparison_summary", res)
        summary = res["comparison_summary"]
        self.assertEqual(len(summary), 5)

        # 1. Borrower: should be Fulfilled (matches Robert J. Smith)
        self.assertEqual(summary[0]["status"], "Fulfilled")
        self.assertIn("Robert J. Smith", summary[0]["revised_finding"])

        # 2. Contract Price: should be Not Fulfilled (report has $520,000 vs requested $600,000)
        self.assertEqual(summary[1]["status"], "Not Fulfilled")
        self.assertIn("520,000", summary[1]["revised_finding"])

        # 3. Basement outside entry: should be Fulfilled
        self.assertEqual(summary[2]["status"], "Fulfilled")

        # 4. GLA: should be Fulfilled (2,450 vs 2,450)
        self.assertEqual(summary[3]["status"], "Fulfilled")

        # 5. Form 1007: should be Not Fulfilled (not present in report)
        self.assertEqual(summary[4]["status"], "Not Fulfilled")

        # Summary text verification
        self.assertIn("3 of 5 requested revision items verified as fulfilled", res["summary"])
        self.assertIn("2 item(s) unfulfilled", res["summary"])

    @patch("api.offline_comparison.extract_report_data_offline")
    def test_verify_revision_request_advanced_checks(self, mock_extract):
        from api.offline_comparison import verify_revision_request_offline

        mock_extract.return_value = {
            "status": "success",
            "market_value": "$450,000",
            "fields": {
                "SUBJECT": {
                    "Borrower": "Jane Doe",
                    "Assessor's Parcel #": "123-456-789",
                    "County": "Orange",
                },
                "CONTRACT": {
                    "Contract Price $": "$450,000",
                    "Date of Contract": "04/15/2026",
                },
                "IMPROVEMENTS": {
                    "Total Rooms": "7",
                    "Bedrooms": "3",
                    "Finished area above grade Bath(s)": "2.5",
                    "Gross Living Area": "2,100",
                },
                "SALES_COMPARISON": {
                    "Subject Bathrooms": "2.5",
                    "Subject Bedrooms": "3",
                    "Subject Gross Living Area": "2,100",
                },
                "RECONCILIATION": {
                    "Effective Date of Appraisal": "04/20/2026",
                },
            },
            "pages_text": [
                {"page_no": 1, "text": "subject apn 123-456-789 date of contract 04/15/2026 orange county"},
                {"page_no": 2, "text": "improvements 2.5 baths 3 bedrooms 2,100 gla effective date 04/20/2026 environmental"},
            ],
            "page_count": 2,
        }

        revision_prompt = """
        Item 1: Date of contract should be 04/15/2026.
        Item 2: Bathroom count should be 2.5 baths.
        Item 3: Effective date of appraisal should be 04/20/2026.
        Item 4: APN should be 123-456-789.
        Item 5: Bathroom count should be 3.5 baths.
        Item 6: Environmental condition explanation needed.
        """

        res = verify_revision_request_offline("fake_revised.pdf", revision_prompt)
        summary = res["comparison_summary"]
        self.assertEqual(len(summary), 6)

        # 1. Date of contract: Fulfilled (matches 04/15/2026)
        self.assertEqual(summary[0]["status"], "Fulfilled")

        # 2. Bathroom count: Fulfilled (matches 2.5)
        self.assertEqual(summary[1]["status"], "Fulfilled")

        # 3. Effective date: Fulfilled (matches 04/20/2026)
        self.assertEqual(summary[2]["status"], "Fulfilled")

        # 4. APN: Fulfilled (matches 123-456-789)
        self.assertEqual(summary[3]["status"], "Fulfilled")

        # 5. Bathroom count mismatch: Not Fulfilled (report has 2.5, requested 3.5)
        self.assertEqual(summary[4]["status"], "Not Fulfilled")

        # 6. Environmental: Needs Review (only 1 keyword 'environmental' matched on page 2)
        self.assertEqual(summary[5]["status"], "Needs Review")

    @patch("api.offline_comparison.extract_report_data_offline")
    def test_confirmation_checklist_form_1007_and_216_absence(self, mock_extract):
        from api.offline_comparison import evaluate_confirmation_checklist_offline

        # Report without Form 1007 and without Form 216
        mock_extract.return_value = {
            "status": "success",
            "market_value": "$675,000",
            "fields": {
                "SUBJECT": {"Property Address": "5654 N 88th Ln"},
                "SALES_COMPARISON": {
                    "Comparable #1": {"Sale Price": "649,900", "Adjusted Sale Price": "654,900"},
                    "Comparable #2": {"Sale Price": "630,000", "Adjusted Sale Price": "689,500", "Sale Price/Gross Liv. Area": "216.64"},
                },
                "IMPROVEMENTS": {"Gross Living Area": "2,450", "Total Rooms": "8", "Bedrooms": "4", "Bathrooms": "3.0"},
                "RECONCILIATION": {"Appraised Value": "$675,000"},
            },
            "pages_text": [
                {"page_no": 1, "text": "appraisal report 1004 urar subject 5654 n 88th ln appraised value $675,000"},
                {"page_no": 2, "text": "sales comparison comp 1 $649,900 comp 2 $630,000 at $216/psf"},
            ],
            "page_count": 32,
        }

        res = evaluate_confirmation_checklist_offline("dummy_old.pdf", "dummy_new.pdf")
        details = res.get("details", [])
        self.assertEqual(len(details), 8)

        # Check item 6 (1007 form): Must be 'Form 1007 Not Present' and final_output 'No'
        item_6 = details[5]
        self.assertEqual(item_6["sr_no"], 6)
        self.assertEqual(item_6["old_pdf"], "Form 1007 Not Present")
        self.assertEqual(item_6["new_pdf"], "Form 1007 Not Present")
        self.assertEqual(item_6["final_output"], "No")

        # Check item 7 (216 form): Must be 'Form 216 Not Present' and final_output 'No'
        item_7 = details[6]
        self.assertEqual(item_7["sr_no"], 7)
        self.assertEqual(item_7["old_pdf"], "Form 216 Not Present")
        self.assertEqual(item_7["new_pdf"], "Form 216 Not Present")
        self.assertEqual(item_7["final_output"], "No")




