import os
import asyncio
from datetime import datetime
from pathlib import Path
from playwright.sync_api import sync_playwright  # pyre-ignore
import shutil
from .utils import logger, check_pause_state_sync, get_browser_config, FULL_FILE_LOGS_PATH, send_email, HTML_UPLOAD_SELECTOR_REVISED, ERROR_FILES_PATH  # pyre-ignore

def run_automation(pdf_path="1423 Country Club Cir.pdf", username=None, password=None):
    save_path = None
    with sync_playwright() as p:
        browser = p.chromium.launch(**get_browser_config())
        context = browser.new_context()
        page = context.new_page()

        logger.info("Navigating to https://qa-pramaan.vercel.app/...")
        page.goto("https://qa-pramaan.vercel.app/")

        page.wait_for_load_state("networkidle")

        logger.info(f"Page loaded successfully! Title is: '{page.title()}'")

        logger.info("Filling in login credentials...")
        page.get_by_label("Username").fill(username or "strdjrbservices")
        page.get_by_label("Password", exact=False).fill(password or "Djrb@2025")

        logger.info("Clicking Log In button...")
        check_pause_state_sync()
        page.get_by_role("button", name="Log In").click()

        logger.info("Initiating step-by-step execution for Full File Review...")

        def move_to_error_dir(file_path):
            try:
                if os.path.exists(file_path):
                    filename = Path(file_path).name
                    dest = os.path.join(str(ERROR_FILES_PATH), filename)
                    shutil.move(file_path, dest)
                    logger.info(f"Moved {filename} to {dest}")
                html_path = Path(file_path).with_suffix('.html')
                if html_path.exists():
                    html_dest = os.path.join(str(ERROR_FILES_PATH), html_path.name)
                    shutil.move(str(html_path), html_dest)
                    logger.info(f"Moved {html_path.name} to {html_dest}")
            except Exception as e:
                logger.error(f"Failed to move files to error directory: {e}")

        def wait_for_spinner(action_name):
            logger.info(f"     Waiting up to 4 mins for spinner to disappear for {action_name}...")
            spinner = page.locator(".MuiCircularProgress-root, [role='progressbar'], .spinner, .loader").first
            try:
                check_pause_state_sync()
                spinner.wait_for(state="visible", timeout=2000)
            except Exception:
                pass
            try:
                check_pause_state_sync()
                spinner.wait_for(state="hidden", timeout=240000)
            except Exception:
                logger.info(f"     (Timeout or no spinner found for {action_name}, proceeding...)")
            page.wait_for_timeout(1000)

        steps = []

        def step_nav_full_file():
            logger.info("Waiting for Dashboard to load...")
            page.get_by_text("Full File Review").wait_for(state="visible", timeout=30000)
            logger.info("Navigating to Full File Review...")
            check_pause_state_sync()
            page.get_by_text("Full File Review").click()
            logger.info("Waiting for Full File Review page to load...")
            page.wait_for_load_state("networkidle")
            page.wait_for_timeout(2000)
        steps.append(("Navigate Full File Review", step_nav_full_file))

        def step_upload_pdf():
            logger.info(f"Uploading PDF file '{pdf_path}'...")
            check_pause_state_sync()
            page.locator('input[type="file"][accept=".pdf"]').first.set_input_files(pdf_path)
            page.wait_for_timeout(3000)
        steps.append(("Upload PDF", step_upload_pdf))

        def step_upload_html():
            html_path = Path(pdf_path).with_suffix('.html')
            if html_path.exists():
                logger.info(f"Uploading corresponding HTML file '{html_path}'...")
                check_pause_state_sync()
                page.locator(HTML_UPLOAD_SELECTOR_REVISED).first.set_input_files(str(html_path))
                page.wait_for_timeout(3000)
            else:
                logger.info(f"No corresponding HTML file found at '{html_path}'. Skipping HTML upload.")
        steps.append(("Upload HTML", step_upload_html))

        def step_pin_sidebar():
            logger.info("Pinning the sidebar...")
            try:
                page.locator(".sidebar-toggle-btn, [title='Pin Sidebar'], button[aria-label='Pin Sidebar']").first.click(timeout=5000)
            except Exception:
                page.get_by_label("Pin Sidebar").click(timeout=5000)
        steps.append(("Pin Sidebar", step_pin_sidebar))

        def step_click_subject():
            logger.info("Clicking 'Subject' first to determine Form Type...")
            page.locator(".sidebar").get_by_text("Subject", exact=True).click(force=True)
            wait_for_spinner("Subject")
        steps.append(("Click Subject", step_click_subject))

        step_index = 0

        def step_read_sidebar():
            nonlocal step_index
            logger.info("Reading dynamically populated sidebar items for this specific Form Type...")
            page.wait_for_timeout(2000)
            dynamic_elements = page.locator(".sidebar a.sidebar-link span").all_inner_texts()
            dynamic_sidebar_items = [text.strip() for text in dynamic_elements if text.strip() and text.strip() != "Subject"]
            logger.info(f"Found {len(dynamic_sidebar_items)} targeted sections for this form: {dynamic_sidebar_items}")
            
            for idx, item in enumerate(dynamic_sidebar_items):
                def make_click_func(sidebar_item):
                    def _func():
                        check_pause_state_sync()
                        logger.info(f"  -> Clicking {sidebar_item}")
                        page.locator(".sidebar").get_by_text(sidebar_item, exact=True).click(force=True)
                        wait_for_spinner(sidebar_item)
                    return _func
                steps.insert(step_index + 1 + idx, (f"Click Sidebar: {item}", make_click_func(item)))
        steps.append(("Read Dynamic Sidebar", step_read_sidebar))

        def step_check_state():
            logger.info("Clicking Check State Requirements...")
            page.get_by_role("button", name="Check State Requirements").click()
            wait_for_spinner("Check State Requirements")
        steps.append(("Check State Requirements", step_check_state))

        def step_check_client():
            logger.info("Clicking Check Client Requirements...")
            page.get_by_role("button", name="Check Client Requirements").click()
            wait_for_spinner("Check Client Requirements")
        steps.append(("Check Client Requirements", step_check_client))

        def step_run_escalation():
            logger.info("Clicking Run Escalation Check...")
            page.get_by_role("button", name="Run Escalation Check").click()
            wait_for_spinner("Run Escalation Check")
        steps.append(("Run Escalation Check", step_run_escalation))

        def step_run_full_analysis():
            logger.info("Clicking Run Full Analysis...")
            page.get_by_role("button", name="Run Full Analysis").click()
            wait_for_spinner("Run Full Analysis")
        steps.append(("Run Full Analysis", step_run_full_analysis))

        def step_save():
            logger.info("Clicking Save...")
            save_btn = page.locator("button:has-text('Save'), button:has-text('SAVE')").first
            save_btn.click()
            page.wait_for_timeout(1000)
        steps.append(("Save", step_save))

        def step_download_log():
            nonlocal save_path
            logger.info("Clicking Log and waiting for download...")
            with page.expect_download() as download_info:
                log_btn = page.locator("button:has-text('Log'), button:has-text('LOG')").first
                log_btn.click()
            download = download_info.value
            save_path = os.path.join(str(FULL_FILE_LOGS_PATH), download.suggested_filename)
            download.save_as(save_path)
            logger.info(f"Log file successfully saved to: {save_path}")
        steps.append(("Download Log", step_download_log))

        while step_index < len(steps):
            step_name, step_func = steps[step_index]
            attempts = 0
            success = False
            while attempts <= 1:
                try:
                    step_func()
                    success = True
                    break
                except Exception as e:
                    attempts += 1
                    if attempts > 1:
                        logger.error(f"Step '{step_name}' failed after 2 attempts. Error: {e}")
                        move_to_error_dir(pdf_path)
                        browser.close()
                        return None
                    logger.warning(f"Step '{step_name}' failed. Waiting 1.5 minutes before retrying (Attempt {attempts + 1})... Error: {e}")
                    page.wait_for_timeout(90000)
            if not success:
                break
            step_index += 1

        logger.info("Initiating site logout sequence...")
        try:
            check_pause_state_sync()
            logout_btn = page.get_by_role("button", name="Log Out").first
            if logout_btn.is_visible():
                logout_btn.click()
                page.wait_for_load_state("networkidle")
                logger.success("Securely logged out from the portal.")
        except Exception as e:
            logger.warning(f"Portal logout skipped/failed: {str(e)}")

        page.wait_for_timeout(2000)
        browser.close()

    try:
        status = "Analysis Completed"
        terminal_log = logger.current_log_file
        attachments = []
        if save_path and os.path.exists(save_path):
            attachments.append(str(save_path))
        if os.path.exists(pdf_path):
            attachments.append(pdf_path)

        if terminal_log and os.path.exists(terminal_log):
            attachments.append(str(terminal_log))

        logger.info(f"Sending completion email for {Path(pdf_path).name}...")

        asyncio.run(send_email(
            subject=f"PRAMAAN Output: {status} - {Path(pdf_path).name} - {datetime.now().strftime('%c')}",
            body_text=f"The Full File Review for {Path(pdf_path).name} has completed successfully.\n\nAttached:\n1. Downloaded Site Log\n2. Original PDF\n3. Terminal execution log",
            attachment_paths=attachments
        ))
        logger.success("Completion email sent successfully.")
    except Exception as e:
        logger.error(f"Failed to send completion email: {str(e)}")

    return save_path if 'save_path' in locals() else None

if __name__ == "__main__":
    run_automation()
