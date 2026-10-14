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


