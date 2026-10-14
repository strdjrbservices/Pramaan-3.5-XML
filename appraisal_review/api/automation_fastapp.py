import os
import re
import sys
import json
import time
import shutil
import base64
import difflib
import argparse
from datetime import datetime
from playwright.sync_api import sync_playwright
from .utils import logger, check_pause_state_sync, FULL_FILE_PATH, HTML_FILES_PATH, NEW_FILES_REVISED_PATH, OLD_FILES_REVISED_PATH, get_browser_config


BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PDF_DIR = str(FULL_FILE_PATH)
REVISED_DIR = str(NEW_FILES_REVISED_PATH)
OLD_DIR = str(OLD_FILES_REVISED_PATH)

for d in [PDF_DIR, REVISED_DIR, OLD_DIR, str(HTML_FILES_PATH)]:
    os.makedirs(d, exist_ok=True)

def update_status(status, message, progress=0, mode='full_file'):
    """Updates the automation status in a JSON file for monitoring."""
    data = {
        "status": status,
        "message": message,
        "progress": progress,
        "last_update": datetime.now().isoformat()
    }
    status_file = os.path.join(BASE_DIR, f"fastapp_status_{mode}.json")
    try:
        with open(status_file, 'w') as f:
            json.dump(data, f)
    except Exception as e:
        logger.error(f"Failed to update status file: {e}")

def download_pdfs_for_order(page, appr_id, mode='full_file', download_pref='appr_id', appraisal_no=None):
    """Navigates to the order detail page and downloads PDF reports."""
    name_id = appraisal_no if appraisal_no else appr_id

    if mode == 'update_review':
        revised_dest = os.path.join(REVISED_DIR, f"{name_id}_revised.pdf")
        old_dest = os.path.join(OLD_DIR, f"{name_id}.pdf")
        html_dest = os.path.join(str(HTML_FILES_PATH), f"{name_id}.html")

        if os.path.exists(revised_dest) and os.path.exists(old_dest) and os.path.exists(html_dest):
            logger.info(f"Order {name_id} already fully processed locally. Skipping.")
            return -1

    try:
        url = f"https://fastapp.spurams.com/ViewAppraisal.aspx?ApprID={appr_id}"
        page.goto(url)
        page.wait_for_load_state("networkidle")

        count = 0
        if mode == 'update_review':
            revised_base_name = ""
            table_selector = "div#lnkDivReports + div table.reportsTable"
            try:
                page.wait_for_selector(table_selector, timeout=5000)
                pdf_links = page.locator(f"{table_selector} a").filter(has_text=".pdf")
                if pdf_links.count() > 0:
                    latest_link = pdf_links.last
                    revised_file_text = latest_link.inner_text()
                    revised_base_name = revised_file_text.lower().replace('.pdf', '').replace('.xml', '').strip()
                    logger.info(f"Targeting revised file: {revised_base_name}")

                    dest = os.path.join(REVISED_DIR, f"{name_id}_revised.pdf")
                    if os.path.exists(dest):
                        logger.info(f"Revised report already exists: {dest}")
                    else:
                        with page.expect_download() as download_info:
                            latest_link.click()
                        download = download_info.value
                        download.save_as(dest)
                        logger.info(f"Saved revised report: {dest}")
                        count += 1
            except Exception as e:
                logger.warning(f"Failed to get revised report for {appr_id}: {e}")

            try:
                other_docs_table = page.locator("#ctl00_cphBody_grdDocs, table:has(th:has-text('Document Type')):visible").first
                links = other_docs_table.locator("a").filter(has_text=re.compile(r'\.pdf', re.IGNORECASE))
                link_count = links.count()

                logger.info(f"Found {link_count} potential PDF links in 'Other Supporting Documents' for {name_id}")

                for i in range(link_count - 1, -1, -1):
                    link = links.nth(i)
                    raw_text = link.inner_text().strip()
                    link_text = raw_text.lower().replace('.pdf', '').replace('.xml', '').strip()

                    if revised_base_name:
                        similarity = difflib.SequenceMatcher(None, revised_base_name, link_text).ratio()
                        logger.info(f"Checking link: '{raw_text}' (Similarity: {similarity:.2f})")
                        if similarity < 0.6 and revised_base_name not in link_text and link_text not in revised_base_name:
                            continue
                        logger.info(f"✅ Matched old file: {raw_text}")

                    dest = os.path.join(OLD_DIR, f"{name_id}.pdf")
                    if os.path.exists(dest):
                        logger.info(f"Old report already exists at: {dest}")
                    else:
                        with page.expect_download(timeout=20000) as download_info:
                            link.click()
                        download = download_info.value
                        download.save_as(dest)
                        logger.info(f"Successfully saved old report: {dest}")
                        count += 1
                    break 
            except Exception as e:
                logger.warning(f"Failed to get old report for {appr_id}: {e}")


            try:
                html_dest = os.path.join(str(HTML_FILES_PATH), f"{name_id}.html")
                if os.path.exists(html_dest):
                    logger.info(f"Order form HTML already exists: {html_dest}")
                else:
                    content = page.content()
                    with open(html_dest, "w", encoding="utf-8") as f:
                        f.write(content)
                    logger.info(f"Saved order form HTML: {html_dest}")
                    count += 1
            except Exception as e:
                logger.warning(f"Failed to save order form HTML for {appr_id}: {e}")
            return count
        else:
            table_selector = "div#lnkDivReports + div table.reportsTable"
            try:
                page.wait_for_selector(table_selector, timeout=5000)
                pdf_links = page.locator(f"{table_selector} a").filter(has_text=".pdf")
                link_count = pdf_links.count()
                for i in range(link_count):
                    link = pdf_links.nth(i)

                    if download_pref == 'appr_id':
                        filename = f"{name_id}.pdf" if i == 0 else f"{name_id}_{i}.pdf"
                    else:
                        filename = link.inner_text().strip()

                    dest = os.path.join(PDF_DIR, filename)

                    if os.path.exists(dest):
                        logger.info(f"File '{filename}' already exists. Skipping.")
                    else:
                        with page.expect_download() as download_info:
                            link.click()
                        download = download_info.value
                        download.save_as(dest)
                        logger.info(f"Saved report as {name_id}: {dest}")
                        count += 1
                return count
            except:
                return 0
    except Exception as e:
        logger.error(f"Error downloading for ApprID {appr_id}: {e}")
        return 0

def parse_datetime(val):
    if not val:
        return None
    if isinstance(val, datetime):
        return val
    val = str(val).strip()
    if not val:
        return None
    try:
        return datetime.fromisoformat(val.replace("Z", "+00:00"))
    except ValueError:
        pass

    formats = [
        "%m/%d/%Y %I:%M:%S %p",
        "%m/%d/%Y %I:%M %p",
        "%m/%d/%y %I:%M:%S %p",
        "%m/%d/%y %I:%M %p",
        "%m/%d/%Y %H:%M:%S",
        "%m/%d/%Y %H:%M",
        "%m/%d/%Y",
        "%m/%d/%y",
    ]
    for fmt in formats:
        try:
            return datetime.strptime(val, fmt)
        except ValueError:
            continue
    return None

def find_date_column_index(headers=None, rows=None):
    if headers:
        date_keywords = ["date", "time", "submitted", "received", "created"]
        for idx, h in enumerate(headers):
            h_lower = str(h).lower()
            if any(kw in h_lower for kw in date_keywords):
                return idx

    if rows:
        try:
            row_count = rows.count() if callable(getattr(rows, 'count', None)) else len(rows)
            start_idx = 1 if row_count > 1 else 0
            for r_idx in range(start_idx, row_count):
                row = rows.nth(r_idx) if callable(getattr(rows, 'nth', None)) else rows[r_idx]
                locator = getattr(row, 'locator', None)
                if locator and callable(locator):
                    cols = row.locator("td")
                else:
                    cols = getattr(row, 'cols', None)

                if cols is not None:
                    col_count = cols.count() if callable(getattr(cols, 'count', None)) else len(cols)
                    for c_idx in range(col_count):
                        col_elem = cols.nth(c_idx) if callable(getattr(cols, 'nth', None)) else cols[c_idx]
                        if callable(getattr(col_elem, 'inner_text', None)):
                            col_text = col_elem.inner_text().strip()
                        else:
                            col_text = str(col_elem).strip()
                        if parse_datetime(col_text):
                            return c_idx
        except Exception as e:
            logger.warning(f"Error finding date column in rows: {e}")

    return -1

def extract_orders_from_tab(page, tab_name, submitted_after=None):
    """Extracts ApprIDs from the specified tab."""
    submitted_after_dt = parse_datetime(submitted_after) if submitted_after else None
    try:
        tab = page.locator(f"strong:has-text('{tab_name}')").first
        tab.click()
        page.wait_for_load_state("networkidle")
        page.wait_for_timeout(3000)
        table = page.locator("table").filter(has=page.locator("tr:has-text('Order Details')")).filter(has=page.locator("visible=true")).first
        if not table.is_visible():
            return []

        headers = []
        try:
            header_cells = table.locator("tr").first.locator("th, td")
            for h_idx in range(header_cells.count()):
                headers.append(header_cells.nth(h_idx).inner_text().strip())
        except Exception:
            headers = []

        rows = table.locator("tr")
        date_col_idx = find_date_column_index(headers, rows) if submitted_after_dt else -1

        count = rows.count()
        appr_ids = []
        for i in range(1, count):
            cols = rows.nth(i).locator("td")
            if cols.count() >= 5:
                status_text = cols.nth(4).inner_text().strip()
                if "file in review" not in status_text.lower():
                    logger.info(f"Skipping row {i} - status is '{status_text}' (not containing 'File In Review')")
                    continue
            if cols.count() >= 1:
                link = cols.first.locator("a")
                href = link.get_attribute("href")
                link_text = link.inner_text().strip()
                if href and "ApprID=" in href:
                    internal_id = href.split("ApprID=")[1].split("&")[0]
                    match = re.search(r'\d+-\d+', link_text)
                    appraisal_no = match.group(0) if match else link_text

                    if submitted_after_dt and date_col_idx != -1 and cols.count() > date_col_idx:
                        date_text = cols.nth(date_col_idx).inner_text().strip()
                        row_dt = parse_datetime(date_text)
                        if row_dt and row_dt < submitted_after_dt:
                            logger.info(f"Skipping row {i} (ID: {appraisal_no}) - submitted date {row_dt} is before cutoff {submitted_after_dt}")
                            continue

                    if internal_id:
                        appr_ids.append((internal_id, appraisal_no))
        return list(set(appr_ids))
    except Exception as e:
        logger.error(f"Error extracting from {tab_name}: {e}")
        return []

def run_fastapp_automation(username=None, password=None, mode='full_file', headless=False, download_pref='appr_id', submitted_after=None):
    """
    Automates login to FastApp (https://fastapp.spurams.com/login.aspx)
    and processes report downloads for available orders.
    """
    update_status("running", "Initializing browser...", 5, mode)

    with sync_playwright() as p:

        launch_config = get_browser_config()
        launch_config["headless"] = headless
        browser = p.chromium.launch(**launch_config)
        context = browser.new_context()
        page = context.new_page()

        target_url = "https://fastapp.spurams.com/login.aspx?ReturnUrl=%2f"
        logger.info(f"Navigating to {target_url}...")
        page.goto(target_url)

        page.wait_for_load_state("networkidle")

        logger.info(f"Page loaded successfully! Title is: '{page.title()}'")

        # -------------------------------------------------------------------
        update_status("running", "Logging into FastApp...", 10, mode)
        logger.info("Filling in FastApp login credentials...")

        username_field = page.locator("input#ctl00_cphBody_Login1_UserName")
        password_field = page.locator("input#ctl00_cphBody_Login1_Password")
        login_button = page.locator("input#ctl00_cphBody_Login1_LoginButton")


        user = username or "DJRBREVIEW"
        pwd = password or "DJRB2605!#"

        username_field.fill(user)
        password_field.fill(pwd)

        logger.info(f"Clicking FastApp Log In button as '{user}'...")
        check_pause_state_sync()
        login_button.click()


        logger.info("Waiting for FastApp Dashboard to load...")
        try:
            page.wait_for_url("**/AppraiserDashboard.aspx", timeout=15000)
        except Exception as e:
            logger.warning(f"Timeout waiting for dashboard URL redirection: {e}")
        page.wait_for_load_state("networkidle")

        if "AppraiserDashboard.aspx" in page.url:
             logger.success("Successfully logged into FastApp Dashboard.")


             logger.info("Checking for file counts in 'REVIEW ORDERS' section...")

             categories = [
                 ("#ctl00_cphBody_lnkShowNewReviewOrders", "New Review Orders"),
                 ("#ctl00_cphBody_lnkShowReviewInProgress", "Review Orders In Progress"),
                 ("#ctl00_cphBody_lnkShowReviewRevised", "Revised Review Orders")
             ]


             results = {}
             for selector, label in categories:
                 try:

                     element = page.locator(selector).first

                     count_text = element.locator("span").inner_text().strip()
                     logger.info(f"     -> {label}: {count_text}")
                     results[label] = count_text
                 except Exception as e:
                     logger.warning(f"     -> Could not extract count for {label}: {str(e)}")
                     results[label] = "N/A"

             logger.success(f"Final Count Report - New: {results['New Review Orders']}, In Progress: {results['Review Orders In Progress']}, Revised: {results['Revised Review Orders']}")

             tabs = ["Revised Review Orders"] if mode == 'update_review' else ["New Review Orders"]
             all_appr_ids = []

             for i, tab in enumerate(tabs):
                 update_status("running", f"Scanning {tab}...", 20 + i*10, mode)
                 appr_ids = extract_orders_from_tab(page, tab, submitted_after=submitted_after)
                 all_appr_ids.extend(appr_ids)
                 logger.info(f"Found {len(appr_ids)} orders in {tab}")

             unique_ids = list(set(all_appr_ids))
             total = len(unique_ids)
             added_count = 0
             skipped_count = 0
             downloaded_files_total = 0

             update_status("running", f"Found {total} unique orders. Processing...", 50, mode)

             for idx, (internal_id, appraisal_no) in enumerate(unique_ids):
                 progress = 50 + int((idx / total) * 45)

                 update_status("running", f"Processing Order {idx+1}/{total} (ID: {appraisal_no})", progress, mode)
                 count = download_pdfs_for_order(page, internal_id, mode, download_pref=download_pref, appraisal_no=appraisal_no)
                 if count == -1:
                     skipped_count += 1
                 else:
                     downloaded_files_total += count
                     added_count += 1

             update_status("completed", f"Import finished. Added: {added_count}, Skipped: {skipped_count}, Files: {downloaded_files_total}", 100, mode)
             logger.success(f"TOTAL: Added {added_count}, Skipped {skipped_count}, Files {downloaded_files_total}")

             logger.info("Initiating FastApp logout sequence...")
             try:
                 check_pause_state_sync()

                 dropdown_toggle = page.locator("a.dropdown-toggle").filter(has=page.locator("img[src='NavResources/Images/icn-nav-settings.png']")).first

                 if dropdown_toggle.is_visible():
                     logger.info("Opening user profile dropdown...")
                     dropdown_toggle.click()
                     page.wait_for_timeout(500)

                 logout_btn = page.locator("#ctl00_TopMenu1_LoginView1_LoginStatus1")

                 if logout_btn.is_visible():
                     logger.info("Clicking visible Sign Out button...")
                     logout_btn.click()
                 else:
                     logger.warning("Logout button not visible in UI, triggering direct JavaScript click...")
                     page.evaluate("document.querySelector('#ctl00_TopMenu1_LoginView1_LoginStatus1')?.click()")

                 page.wait_for_url("**/login.aspx*", timeout=10000)
                 logger.success("FastApp session securely terminated and redirected to login.")

             except Exception as e:
                 logger.warning(f"UI Logout failed: {str(e)}. Attempting direct endpoint logout...")
                 try:
                     page.goto("https://fastapp.spurams.com/login.aspx?mode=logout", timeout=5000)
                     logger.success("Securely force-navigated to logout endpoint.")
                 except Exception as final_err:
                     logger.error(f"Final logout attempt failed: {str(final_err)}")
        else:
             logger.warning(f"Login might have failed. Current URL: {page.url}")
             error_msg = "Unknown login error"
             if page.locator(".error, .failure-text, #ctl00_cphBody_Login1_FailureText").is_visible():
                 error_msg = page.locator("#ctl00_cphBody_Login1_FailureText").inner_text().strip()
                 logger.error(f"Login Error Message: {error_msg}")
             raise RuntimeError(f"Login failed: {error_msg}")

        page.wait_for_timeout(2000)
        browser.close()

        return str(logger.current_log_file)

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument('--mode', default='full_file', choices=['full_file', 'update_review'])
    parser.add_argument('--headless', type=bool, default=False)
    parser.add_argument('--download_pref', default='appr_id', choices=['appr_id', 'original'])
    parser.add_argument('--submitted_after', default=None)
    args = parser.parse_args()

    run_fastapp_automation(mode=args.mode, headless=args.headless, download_pref=args.download_pref, submitted_after=args.submitted_after)
