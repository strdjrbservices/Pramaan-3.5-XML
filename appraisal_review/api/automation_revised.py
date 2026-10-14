import os
import pathlib
import logging
import asyncio
import datetime
from typing import Optional
from pathlib import Path

import playwright.async_api as pw  # type: ignore

try:
    import openpyxl  # type: ignore
    from openpyxl.styles import Font, PatternFill, Alignment, Border, Side  # type: ignore
except ImportError:
    openpyxl = None

from .utils import (  # type: ignore
    WEBSITE_B_URL,
    WEBSITE_B_USERNAME,
    WEBSITE_B_PASSWORD,
    WEBSITE_B_USERNAME_SELECTOR,
    WEBSITE_B_PASSWORD_SELECTOR,
    WEBSITE_B_LOGIN_BUTTON_SELECTOR,
    REVISED_FILE_REVIEW_BUTTON_SELECTOR,
    MAIN_LOADING_INDICATOR_SELECTOR,
    NEW_FILE_UPLOAD_SELECTOR_REVISED,
    OLD_PDF_UPLOAD_SELECTOR,
    HTML_UPLOAD_SELECTOR_REVISED,
    REVISED_PROCESS_BUTTON_SELECTOR,
    CONFIRMATION_CHECKLIST_BUTTON_SELECTOR,
    DOWNLOAD_PATH,
    OLD_FILES_REVISED_PATH,
    NEW_FILES_REVISED_PATH,
    HTML_FILES_PATH,
    LOG_FILES_PATH,
    ERROR_SCREENSHOTS_PATH,
    wait_and_click,
    click_and_wait_for_extraction,
    wait_for_download,
    send_email,
    perform_login,
    logger,
    check_pause_state,
    get_browser_config,
)


async def process_revised_file_review(
    browser: pw.Browser,
    new_pdf_path: str,
    old_pdf_path: Optional[str] = None,
    html_file_path: Optional[str] = None,
    is_first_run: bool = False,
    username: Optional[str] = None,
    password: Optional[str] = None
):
    """Python equivalent of the JavaScript `processRevisedFileReview`.

    Args:
        browser: An instance of Playwright Browser (e.g., Chromium).
        new_pdf_path: Path to the new PDF file.
        old_pdf_path: Path to the old PDF file.
        html_file_path: Path to the HTML file.
        is_first_run: Flag for login state.
        username: Optional username from UI.
        password: Optional password from UI.
    """
    logger.info("\n--- Starting Revised File Review ---")
    start_time = asyncio.get_event_loop().time()
    page = await browser.new_page()
    await page.set_viewport_size({"width": 1920, "height": 1080})

    try:
        logger.info(f"Navigating to {WEBSITE_B_URL}...")
        await page.goto(WEBSITE_B_URL, wait_until="networkidle")

        await perform_login(page, is_first_run, username=username, password=password)
        await check_pause_state()
        await page.wait_for_load_state("networkidle")

        if not await page.query_selector("xpath=//h1[contains(text(), 'REVISED FILE REVIEW')]"):
            await wait_and_click(page, REVISED_FILE_REVIEW_BUTTON_SELECTOR, "Revised File Review")
        else:
            logger.info("Already on Revised File Review page, skipping navigation click.")

        logger.info("Waiting for the revised review page to load...")
        try:
            await page.wait_for_selector(MAIN_LOADING_INDICATOR_SELECTOR, state="visible", timeout=5000)
            await page.wait_for_selector(MAIN_LOADING_INDICATOR_SELECTOR, state="hidden", timeout=60000)
        except Exception:
            pass

        await page.wait_for_selector(NEW_FILE_UPLOAD_SELECTOR_REVISED, state="attached", timeout=60000)
        try:
            await page.wait_for_selector(HTML_UPLOAD_SELECTOR_REVISED, state="attached", timeout=5000)
        except Exception:
            pass
        logger.info("Revised review page loaded with upload inputs.")

        file_name = Path(new_pdf_path).name

        logger.info("Uploading old file (PDF)...")
        try:
            old_file_input = await page.wait_for_selector(OLD_PDF_UPLOAD_SELECTOR, state="attached", timeout=5000)
            target_old_pdf = Path(old_pdf_path) if old_pdf_path else OLD_FILES_REVISED_PATH / file_name
            if target_old_pdf.exists():
                await old_file_input.set_input_files(str(target_old_pdf))
                logger.info(f"Old file (PDF) selected from: {target_old_pdf}")
            else:
                logger.warning(f"Old PDF file not found. Skipping Old PDF upload.")
        except Exception:
            logger.warning("Old PDF upload input not found or timed out. Skipping.")

        logger.info("Uploading new file (PDF)...")
        new_file_input = await page.wait_for_selector(NEW_FILE_UPLOAD_SELECTOR_REVISED, state="attached")
        revised_pdf_path = Path(new_pdf_path)
        if not revised_pdf_path.exists():
            ext = Path(file_name).suffix
            base_name = Path(file_name).stem
            candidates = [
                f"{base_name}_revised{ext}",
                f"{base_name} Revised{ext}",
                f"{base_name}_Revised{ext}",
            ]
            for candidate in candidates:
                candidate_path = NEW_FILES_REVISED_PATH / candidate
                if candidate_path.exists():
                    revised_pdf_path = candidate_path
                    break
        if revised_pdf_path.exists():
            await new_file_input.set_input_files(str(revised_pdf_path))
            logger.info(f"New file (PDF) selected from: {revised_pdf_path}")
        else:
            raise FileNotFoundError(
                f"File not found in 'new_files_revised': {file_name} (or variations). Please ensure the file exists in the New Files (Revised Input) folder."
            )

        target_html_path = Path(html_file_path) if html_file_path else HTML_FILES_PATH / Path(new_pdf_path).with_suffix('.html').name
        if target_html_path.exists():
            logger.info(f"Found corresponding HTML file: {target_html_path}")
            html_input = await page.wait_for_selector(HTML_UPLOAD_SELECTOR_REVISED, state="attached")
            await html_input.set_input_files(str(target_html_path))
            logger.info("HTML file selected.")
        else:
            logger.warning("HTML file not found. Skipping HTML upload.")

        logger.info("Waiting for initial file processing to complete...")
        await page.wait_for_selector(MAIN_LOADING_INDICATOR_SELECTOR, state="hidden", timeout=180000)
        logger.info("Waiting for 5 seconds...")
        await asyncio.sleep(5)

        TIMEOUTS = {
            "INITIAL": 900000,  # 15 minutes
            "LONG": 600000,     # 10 minutes
            "NORMAL": 180000,   # 3 minutes
        }

        extraction_steps = [
            {"selector": REVISED_PROCESS_BUTTON_SELECTOR, "name": "Verify Revisions"
            },]
        for step in extraction_steps:
            await check_pause_state()
            await click_and_wait_for_extraction(page, step["selector"], step["name"], TIMEOUTS["LONG"])

        capture_tables_script = r"""
        () => {
            const tables = document.querySelectorAll('table');
            const allTablesData = [];
            tables.forEach(table => {
                const rows = Array.from(table.querySelectorAll('tr'));
                if (rows.length === 0) return;
                const headerRow = rows[0];
                const headers = Array.from(headerRow.querySelectorAll('th, td')).map(c => c.innerText.replace(/\n/g, ' ').trim());
                const dataRows = rows.slice(1);
                const finalRows = [headers, ...dataRows.map(r => Array.from(r.querySelectorAll('th, td')).map(c => c.innerText.replace(/\n/g, ' ').trim()))];
                if (finalRows.length > 1) allTablesData.push(finalRows);
            });
            return allTablesData;
        }
        """
        workbook_data = []
        has_mismatch = False
        logger.info("Capturing analysis output...")
        await asyncio.sleep(2)
        revision_tables = await page.evaluate(capture_tables_script)
        if revision_tables:
            workbook_data.append({"name": "Revision Verification", "tables": revision_tables})
            has_mismatch = True
            logger.info("Captured data for 'Revision Verification'.")

        logger.info("Waiting for 5 seconds...")
        await asyncio.sleep(5)
        await wait_and_click(page, CONFIRMATION_CHECKLIST_BUTTON_SELECTOR, "Confirmation Checklist")
        logger.info("Waiting for 5 seconds...")
        await asyncio.sleep(5)

        logger.info("Uploading old PDF again after checklist...")
        try:
            old_file_input = await page.wait_for_selector(OLD_PDF_UPLOAD_SELECTOR, state="attached", timeout=5000)
            target_old_pdf = Path(old_pdf_path) if old_pdf_path else OLD_FILES_REVISED_PATH / file_name
            if target_old_pdf.exists():
                await old_file_input.set_input_files(str(target_old_pdf))
                logger.info(f"Old file (PDF) re‑uploaded from: {target_old_pdf}")
            else:
                logger.warning("Old PDF file not found for re‑upload. Skipping.")
        except Exception:
            logger.warning("Old PDF upload input not found or timed out for re‑upload. Skipping.")

        logger.info("Waiting for 15 seconds...")
        await asyncio.sleep(15)
        confirmation_check_selector = "xpath=//button[normalize-space()='Run Confirmation Check']"
        await wait_and_click(page, confirmation_check_selector, "Run Confirmation Check")

        try:
            await page.wait_for_selector(MAIN_LOADING_INDICATOR_SELECTOR, state="visible", timeout=5000)
            logger.info('Loading indicator appeared for "Run Confirmation Check".')
        except Exception:
            logger.warning('Loading indicator for "Run Confirmation Check" did not appear. Clicking again.')
            await wait_and_click(page, confirmation_check_selector, "Run Confirmation Check (2nd attempt)")
            try:
                await page.wait_for_selector(MAIN_LOADING_INDICATOR_SELECTOR, state="visible", timeout=5000)
                logger.info('Loading indicator appeared for "Run Confirmation Check" on 2nd attempt.')
            except Exception:
                logger.warning('Loading indicator did not appear after 2nd attempt. Continuing to wait for it to be hidden.')
        await page.wait_for_selector(MAIN_LOADING_INDICATOR_SELECTOR, state="hidden", timeout=300000)
        logger.info("Waiting for 5 seconds...")
        await asyncio.sleep(5)
        logger.info("Capturing and appending Confirmation Check output...")
        await asyncio.sleep(2)
        confirmation_tables = await page.evaluate(capture_tables_script)
        if confirmation_tables:
            workbook_data.append({"name": "Confirmation Check", "tables": confirmation_tables})
            has_mismatch = True
            logger.info("Captured data for 'Confirmation Check'.")
        await asyncio.sleep(5)

        await wait_and_click(page, "xpath=//button[normalize-space()='PDF/HTML']", "PDF/HTML Button")
        try:
            await page.wait_for_selector(MAIN_LOADING_INDICATOR_SELECTOR, state="visible", timeout=5000)
        except Exception:
            pass
        await page.wait_for_selector(MAIN_LOADING_INDICATOR_SELECTOR, state="hidden", timeout=300000)
        logger.info("Waiting for 5 seconds...")
        await asyncio.sleep(5)
        logger.info("Capturing and appending PDF/HTML output...")
        await asyncio.sleep(2)
        pdf_html_tables = await page.evaluate(capture_tables_script)
        if pdf_html_tables:
            workbook_data.append({"name": "PDF_HTML Output", "tables": pdf_html_tables})
            has_mismatch = True
            logger.info("Captured data for 'PDF/HTML Output'.")
        await asyncio.sleep(5)

        await wait_and_click(page, "xpath=//button[normalize-space()='PDF/PDF']", "PDF/PDF Button")
        try:
            await page.wait_for_selector(MAIN_LOADING_INDICATOR_SELECTOR, state="visible", timeout=5000)
        except Exception:
            pass
        await page.wait_for_selector(MAIN_LOADING_INDICATOR_SELECTOR, state="hidden", timeout=300000)
        logger.info("Waiting for 5 seconds...")
        await asyncio.sleep(5)
        logger.info("Capturing and appending PDF/PDF output...")
        await asyncio.sleep(2)
        pdf_pdf_tables = await page.evaluate(capture_tables_script)
        if pdf_pdf_tables:
            workbook_data.append({"name": "PDF_PDF Output", "tables": pdf_pdf_tables})
            has_mismatch = True
            logger.info("Captured data for 'PDF/PDF Output'.")

        output_file_name = f"{Path(new_pdf_path).stem}_Output.xlsx"
        output_file_path = LOG_FILES_PATH / output_file_name

        if workbook_data:
            if openpyxl:
                wb = openpyxl.Workbook()
                ws = wb.active
                ws.title = "Analysis Output"
                for sheet in workbook_data:
                    ws.append([f"--- {sheet['name']} ---"])
                    ws.append([])
                    for table in sheet['tables']:
                        for row in table:
                            ws.append(row)
                        ws.append([])
                wb.save(output_file_path)
                logger.info(f"Analysis output saved to: {output_file_path}")
            else:
                logger.warning("openpyxl not installed – skipping Excel generation. Install with `pip install openpyxl`.")

        logger.info("Waiting for 10 seconds after saving to DB...")
        await asyncio.sleep(10)

        logger.info("Initiating site logout sequence...")
        try:
            await check_pause_state()
            logout_btn = page.get_by_role("button", name="Log Out").first
            if await logout_btn.is_visible():
                await logout_btn.click()
                await page.wait_for_load_state("networkidle")
                logger.success("Securely logged out from the portal.")
        except Exception as e:
            logger.warning(f"Portal logout skipped/failed: {str(e)}")

        if output_file_path.exists():
            status = "Action Required" if has_mismatch else "Review Completed"
            terminal_log = logger.current_log_file

            attachments = [str(output_file_path), new_pdf_path]
            if terminal_log and os.path.exists(terminal_log):
                attachments.append(str(terminal_log))

            logger.info(f"Sending completion email for {Path(new_pdf_path).name}...")
            await send_email(
                f"PRAMAAN Output: {status} - {Path(new_pdf_path).name} - {datetime.datetime.now().strftime('%c')}",
                f"The Revised File Review for {Path(new_pdf_path).name} has completed successfully.\n\nStatus: {status}\n\nAttached:\n1. Analysis Result (_Output.xlsx)\n2. Original PDF\n3. Terminal execution log",
                attachments,
            )
            logger.success("Completion email sent successfully.")

        end_time = asyncio.get_event_loop().time()
        duration_minutes = (end_time - start_time) / 60
        logger.info(f"\n✅ Revised File Review processing completed in {duration_minutes:.2f} minutes.")
        logger.info("--- Finished Revised File Review ---")
        await asyncio.sleep(2)
        return str(output_file_path)
    except Exception as e:
        logger.error(f"❌ Error during Revised File Review: {e}")
        terminal_log = logger.current_log_file
        screenshot_path = ERROR_SCREENSHOTS_PATH / f"error_screenshot_{int(datetime.datetime.now().timestamp())}.png"
        if not page.is_closed():
            await page.screenshot(path=str(screenshot_path), full_page=True)
            logger.info(f"Error screenshot saved to: {screenshot_path}")

        attachments = [new_pdf_path, str(screenshot_path)]
        if terminal_log and os.path.exists(terminal_log):
            attachments.append(str(terminal_log))

        await send_email(
            f"PRAMAAN Output: Failure - Revised File Review - {Path(new_pdf_path).name} - {datetime.datetime.now().strftime('%c')}",
            f"The automation process for {Path(new_pdf_path).name} failed.\n\nError: {e}\n\nAttached:\n- Uploaded PDF\n- Terminal Execution Log\n- Error Screenshot",
            attachments,
        )
        raise
    finally:
        if not page.is_closed():
            await page.close()

def run_revised_automation(new_pdf_path, old_pdf_path=None, html_path=None, username=None, password=None):
    """Synchronous wrapper for Flask thread."""
    from playwright.async_api import async_playwright  # type: ignore
    async def _internal():
        async with async_playwright() as p:
            browser = await p.chromium.launch(**get_browser_config())
            try:
                result = await process_revised_file_review(browser, new_pdf_path, old_pdf_path, html_path, is_first_run=True, username=username, password=password)
                return result
            finally:
                await browser.close()
    return asyncio.run(_internal())

if __name__ == "__main__":
    import sys
    from playwright.async_api import async_playwright  # type: ignore
    if len(sys.argv) < 2:
        print("Usage: python automation_revised.py <pdf_file_path>")
        sys.exit(1)
    pdf_path = sys.argv[1]
    async def run():
        async with async_playwright() as p:
            browser = await p.chromium.launch(**get_browser_config())
            await process_revised_file_review(browser, pdf_path)
            await browser.close()
    asyncio.run(run())
