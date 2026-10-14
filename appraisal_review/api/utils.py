import os
import pathlib
import logging
import asyncio
import datetime
from pathlib import Path
from typing import List, Union, Optional, Any

import playwright.async_api as pw  # type: ignore
from playwright.sync_api import sync_playwright  # type: ignore

IS_PRODUCTION = os.environ.get('PYTHONANYWHERE_DOMAIN') is not None
BASE_DIR = Path(__file__).resolve().parent.parent

def get_browser_config():
    """Returns suitable Playwright launch arguments based on environment."""
    if IS_PRODUCTION:
        return {
            "headless": True,
            "args": ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"]
        }
    return {"headless": False}

_standard_logger = logging.getLogger("AutoFlow")
_standard_logger.setLevel(logging.INFO)

class CustomFormatter(logging.Formatter):
    def format(self, record):
        dt = datetime.datetime.fromtimestamp(record.created)
        return f"[{dt.strftime('%I:%M:%S %p')}] {record.getMessage()}"

DOWNLOAD_PATH = BASE_DIR / "Downloads"
LOG_FILES_PATH = DOWNLOAD_PATH / "logfiles"
LOG_FILES_PATH.mkdir(parents=True, exist_ok=True)

class LoguruCompatibilityWrapper:
    """A wrapper to allow standard logging to respond to Loguru-style calls."""
    def __init__(self, logger_obj: logging.Logger):
        self._logger = logger_obj
        self.current_log_file = None
        self.on_log_file_change = None

    def __getattr__(self, name: str) -> Any:
        return getattr(self._logger, name)

    def success(self, msg: str, *args: Any, **kwargs: Any) -> None:
        self._logger.info(f"✅ {msg}", *args, **kwargs)

    def log(self, level_or_msg: Any, msg: Optional[str] = None, *args: Any, **kwargs: Any) -> None:
        if isinstance(level_or_msg, str) and msg is None:
            self._logger.info(level_or_msg, *args, **kwargs)
        elif isinstance(level_or_msg, str) and isinstance(msg, str):
            lvl = getattr(logging, level_or_msg.upper(), logging.INFO)
            self._logger.log(lvl, msg, *args, **kwargs)
        else:
            self._logger.log(level_or_msg, msg or "", *args, **kwargs)

    def start_file_logging(self, name_prefix: str = "automation"):
        """Initialize a new log file for the session."""
        timestamp = datetime.datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
        filename = f"{name_prefix}_{timestamp}.log"
        log_path = LOG_FILES_PATH / filename
        
        for handler in self._logger.handlers[:]:
            if isinstance(handler, logging.FileHandler):
                self._logger.removeHandler(handler)
        
        fh = logging.FileHandler(log_path, encoding='utf-8')
        fh.setFormatter(CustomFormatter())
        self._logger.addHandler(fh)
        
        if not any(isinstance(h, logging.StreamHandler) for h in self._logger.handlers):
            sh = logging.StreamHandler()
            sh.setFormatter(CustomFormatter())
            self._logger.addHandler(sh)
            
        self.current_log_file = str(log_path)
        self._logger.info(f"Log session started: {filename}")

        if self.on_log_file_change:
            try:
                self.on_log_file_change(self.current_log_file)
            except Exception:
                pass

        return self.current_log_file

logger: Any = LoguruCompatibilityWrapper(_standard_logger)

from email.message import EmailMessage
try:
    import aiosmtplib  # type: ignore
except ImportError:  # pragma: no cover
    aiosmtplib = None

WEBSITE_B_URL = os.getenv("WEBSITE_B_URL", "https://qa-pramaan.vercel.app/")
WEBSITE_B_USERNAME = os.getenv("WEBSITE_B_USERNAME", "Abhi")
WEBSITE_B_PASSWORD = os.getenv("WEBSITE_B_PASSWORD", "Admin@2026")

WEBSITE_B_USERNAME_SELECTOR = "xpath=//label[contains(., 'Username')]/following-sibling::div/input | //input[@label='Username'] | //input[@name='username']"
WEBSITE_B_PASSWORD_SELECTOR = "xpath=//label[contains(., 'Password')]/following-sibling::div/input | //input[@type='password']"
WEBSITE_B_LOGIN_BUTTON_SELECTOR = 'button[type="submit"]'
PDF_UPLOAD_SELECTOR = "xpath=//div[contains(@class, 'MuiPaper-root') and .//*[contains(., 'PDF')]]//input[@type='file'] | //input[@type='file'][contains(@accept, '.pdf')]"
NEW_FILE_UPLOAD_SELECTOR_REVISED = "xpath=//label[contains(., 'Upload New PDF')]//input[@type='file'] | //button[contains(., 'Upload New PDF')]//input[@type='file'] | //label[normalize-space()='Upload New PDF']/..//input[@type='file']"
HTML_UPLOAD_SELECTOR_REVISED = "xpath=//label[contains(., 'Upload HTML')]//input[@type='file'] | //button[contains(., 'Upload HTML')]//input[@type='file'] | //label[normalize-space()='Upload HTML']/..//input[@type='file']"
SUBMIT_BUTTON_SELECTOR = '#submit-form-button'
MAIN_LOADING_INDICATOR_SELECTOR = "xpath=//*[contains(@class, 'MuiCircularProgress-root')]"
FULL_FILE_REVIEW_BUTTON_SELECTOR = "xpath=//a[contains(., 'Full File Review')] | //button[contains(., 'Full File Review')] | //div[contains(., 'Full File Review')]"
REVISED_FILE_REVIEW_BUTTON_SELECTOR = "xpath=//a[contains(., 'Revised File Review')] | //button[contains(., 'Revised File Review')] | //div[contains(., 'Revised File Review')]"
VERIFY_SUBJECT_ADDRESS_BUTTON_SELECTOR = "xpath=//button[contains(., 'Run Full Analysis')]"
VERIFY_state_requriment_seector = "xpath=//button[contains(., 'Check State Requirements')]"
verify_Check_Client_Requirements = "xpath=//button[contains(., 'Check Client Requirements')]"
verify_Run_Escalation_Check = "xpath=//button[contains(., 'Run Escalation Check')]"
REVISED_PROCESS_BUTTON_SELECTOR = "xpath=//button[contains(., 'Verify Revisions')]"
CONFIRMATION_CHECKLIST_BUTTON_SELECTOR = "xpath=//button[contains(., 'Confirmation Checklist')] | //*[contains(@class, 'MuiToggleButton-root') and contains(., 'Confirmation Checklist')]"
OLD_PDF_UPLOAD_SELECTOR = "xpath=//label[contains(., 'Upload Old PDF')]//input[@type='file'] | //button[contains(., 'Upload Old PDF')]//input[@type='file'] | //label[normalize-space()='Upload Old PDF']/..//input[@type='file']"
PIN_SIDEBAR_BUTTON_SELECTOR = "xpath=//button[contains(@class, 'sidebar-toggle-btn')] | //button[@aria-label='Pin Sidebar'] | //button[@title='Pin Sidebar']"
DOWNLOAD_PATH = BASE_DIR / "Downloads"

OLD_FILES_REVISED_PATH = DOWNLOAD_PATH / "old_files_revised"
NEW_FILES_REVISED_PATH = DOWNLOAD_PATH / "new_files_revised"
HTML_FILES_PATH = DOWNLOAD_PATH / "HTMLFiles"
LOG_FILES_PATH = DOWNLOAD_PATH / "logfiles"
ERROR_SCREENSHOTS_PATH = DOWNLOAD_PATH / "error_screenshots"
PROCESSED_FILES_PATH = DOWNLOAD_PATH / "Processed"
ERROR_FILES_PATH = DOWNLOAD_PATH / "Errors"
FULL_FILE_LOGS_PATH = DOWNLOAD_PATH / "full_file_logs"
FULL_FILE_PATH = DOWNLOAD_PATH / "Full File"

for folder in [DOWNLOAD_PATH, OLD_FILES_REVISED_PATH, NEW_FILES_REVISED_PATH, HTML_FILES_PATH, LOG_FILES_PATH, ERROR_SCREENSHOTS_PATH, PROCESSED_FILES_PATH, ERROR_FILES_PATH, FULL_FILE_PATH, FULL_FILE_LOGS_PATH]:
    folder.mkdir(parents=True, exist_ok=True)

PAUSE_LOCK_FILE = BASE_DIR / "pause.lock"
TERMINATION_LOCK_FILE = BASE_DIR / "stop.lock"

async def check_pause_state() -> None:
    """Block execution while a pause lock file exists or raise if killed."""
    if TERMINATION_LOCK_FILE.exists():
        logger.error('🛑 Automation termination signal detected. Halted.')
        raise InterruptedError("Automation terminated by user request.")

    if PAUSE_LOCK_FILE.exists():
        logger.warning('⏸ Automation paused. Waiting for resume...')
        while PAUSE_LOCK_FILE.exists():
            if TERMINATION_LOCK_FILE.exists():
                logger.error('🛑 Automation termination signal detected during pause. Halted.')
                raise InterruptedError("Automation terminated by user request.")
            await asyncio.sleep(0.5)
        logger.info('▶ Automation resumed.')

def check_pause_state_sync() -> None:
    """Synchronous version of check_pause_state."""
    import time
    if TERMINATION_LOCK_FILE.exists():
        logger.error('🛑 Automation termination signal detected. Halted.')
        raise InterruptedError("Automation terminated by user request.")

    if PAUSE_LOCK_FILE.exists():
        logger.warning('⏸ Automation paused. Waiting for resume...')
        while PAUSE_LOCK_FILE.exists():
            if TERMINATION_LOCK_FILE.exists():
                logger.error('🛑 Automation termination signal detected during pause. Halted.')
                raise InterruptedError("Automation terminated by user request.")
            time.sleep(0.5)
        logger.info('▶ Automation resumed.')

async def wait_for_download(
    context: pw.BrowserContext,
    expected_file_type: str,
    timeout_ms: int = 180_000,
) -> str:
    """Wait for a download to finish and return the file path.

    Playwright emits a ``download`` event on the ``Page`` object. Here we listen on
    the *context* level because the original JS listened to the CDP session.
    """
    logger.info(f"Waiting for {expected_file_type} download to complete…")
    try:
        download = await context.wait_for_event('download', timeout=timeout_ms)
        await download.save_as(download.path())
        logger.info(f"{expected_file_type} download completed: {download.path()}")
        return str(download.path())
    except Exception as e:
        raise TimeoutError(
            f"Timeout waiting for {expected_file_type} download (after {timeout_ms} ms)."
        ) from e

async def wait_and_click(
    page: pw.Page,
    selector: str,
    element_name: str,
    retries: int = 3,
) -> None:
    """Wait for an element, scroll into view, and click it.

    Retries are performed with a 5‑second back‑off, mirroring the original
    implementation. Sidebar items trigger an additional pin action.
    """
    await check_pause_state()
    logger.info(f'Waiting for and clicking "{element_name}"...')
    is_sidebar_item = 'sidebar item' in element_name.lower()

    for attempt in range(retries + 1):
        try:
            if is_sidebar_item:
                sidebar_container_selector = "xpath=//div[contains(@class, 'sidebar')]"
                sidebar = await page.wait_for_selector(sidebar_container_selector, timeout=5000)
                await sidebar.evaluate('el => el.scrollIntoView()')

            element = await page.wait_for_selector(selector, timeout=30_000)
            await element.evaluate('el => el.scrollIntoView()')
            await element.click()
            logger.info(f'"{element_name}" clicked successfully.')

            if is_sidebar_item:
                try:
                    pin_btn = await page.wait_for_selector(
                        PIN_SIDEBAR_BUTTON_SELECTOR, timeout=2000, state='visible'
                    )
                    logger.info('Pinning the sidebar…')
                    await pin_btn.click()
                    logger.info('Sidebar pinned.')
                except Exception:
                    logger.info('Sidebar pin button not found – assuming already pinned.')
            return
        except Exception as err:
            logger.warning(
                f'Attempt {attempt + 1} failed for "{element_name}". Error: {err}'
            )
            if attempt < retries:
                delay = 5
                logger.info(f'Retrying in {delay}s…')
                await asyncio.sleep(delay)
            else:
                raise RuntimeError(
                    f'Failed to click "{element_name}" after {retries + 1} attempts.'
                ) from err

async def process_sidebar_item(
    page: pw.Page,
    section_name: str,
    timeout_ms: int,
) -> None:
    """Select a sidebar entry and wait for its processing spinner to finish."""
    await check_pause_state()
    logger.info(
        f'--- Processing Sidebar Item: {section_name} (Timeout: {timeout_ms / 1000}s) ---'
    )
    start = asyncio.get_event_loop().time()

    sidebar_selector = (
        f"xpath=//div[contains(@class, 'sidebar')]//a[.//span["
        f"contains(translate(text(), 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), '{section_name.lower()}')]]"
    )
    await wait_and_click(page, sidebar_selector, f'{section_name} sidebar item')

    spinner_selector = (
        f"xpath=//div[contains(@class, 'sidebar')]//a[.//span[contains(text(), '{section_name}')]]"
        f"//*[contains(@class, 'MuiCircularProgress-root')]"
    )
    try:
        await page.wait_for_selector(spinner_selector, state='visible', timeout=5_000)
        logger.info(f'Spinner for {section_name} appeared.')
    except Exception:
        logger.warning(
            f'Spinner for {section_name} did not appear. Clicking again to ensure extraction starts.'
        )
        await wait_and_click(page, sidebar_selector, f'{section_name} sidebar item (2nd attempt)', retries=0)

    logger.info(f'Waiting for {section_name} processing to complete…')
    await page.wait_for_selector(spinner_selector, state='hidden', timeout=timeout_ms)
    await page.wait_for_selector(MAIN_LOADING_INDICATOR_SELECTOR, state='hidden', timeout=timeout_ms)

    duration = (asyncio.get_event_loop().time() - start) / 1
    logger.info(
        f'Extraction of {section_name} section completed in {duration:.2f}s.'
    )

async def perform_login(page: pw.Page, is_first_run: bool, username: Optional[str] = None, password: Optional[str] = None) -> None:
    """Log in to the application on the first run, otherwise verify the session."""
    user = username or WEBSITE_B_USERNAME
    pwd = password or WEBSITE_B_PASSWORD

    if is_first_run:
        if not (user and pwd):
            raise RuntimeError(
                'Username and password not set in environment variables.'
            )
        logger.info('Attempting to log in…')
        try:
            login_title_selector = "xpath=//*[normalize-space(.)='DJRB Review']"
            await page.wait_for_selector(login_title_selector, timeout=10_000)
            logger.info('Login page title "DJRB Review" found.')

            await page.wait_for_selector(WEBSITE_B_USERNAME_SELECTOR, timeout=30_000)
            logger.info('Login form found. Entering credentials…')
            await page.fill(WEBSITE_B_USERNAME_SELECTOR, user)
            await page.fill(WEBSITE_B_PASSWORD_SELECTOR, pwd)
            await page.click(WEBSITE_B_LOGIN_BUTTON_SELECTOR)
            logger.info('Login button clicked. Waiting for response…')

            welcome_selector = "xpath=//body//*[self::h1 or self::h2 or self::h3 or self::p or self::span][contains(text(), 'DJRB') or contains(text(), 'Review')]"
            error_selector = "xpath=//body//*[contains(@class, 'MuiAlert-root') and (contains(., 'Invalid') or contains(., 'failed'))]"
            
            welcome_task = asyncio.create_task(page.wait_for_selector(welcome_selector, timeout=60000))
            error_task = asyncio.create_task(page.wait_for_selector(error_selector, timeout=60000))
            
            done, pending = await asyncio.wait(
                [welcome_task, error_task],
                return_when=asyncio.FIRST_COMPLETED,
            )
            
            for task in pending:
                task.cancel()
                try:
                    await task
                except asyncio.CancelledError:
                    pass
                except Exception:
                    pass

            if error_task in done:
                raise RuntimeError('Login failed – invalid credentials.')
            
            if welcome_task in done:
                logger.info('Login successful! Welcome text found.')
            else:
                raise RuntimeError('Login failed: Neither welcome nor error message appeared.')
        except Exception as exc:
            raise RuntimeError(f'Login failed: {exc}') from exc
    else:
        logger.info('Skipping login for subsequent run – assuming session is active.')
        try:
            welcome_selector = "xpath=//*[contains(text(), 'DJRB') or contains(text(), 'Review')]"
            await page.wait_for_selector(welcome_selector, timeout=30_000)
            logger.info('Dashboard loaded, session is active.')
        except Exception as exc:
            raise RuntimeError(
                'Could not verify active session on subsequent run.'
            ) from exc

async def send_email(
    subject: str,
    body_text: str,
    attachment_paths: Union[str, List[str], None] = None,
    recipients: Optional[str] = None,
    html_body: Optional[str] = None,
    cc: Optional[Union[str, List[str]]] = None,
) -> None:
    """Send an email with optional attachments.

    If ``aiosmtplib`` is unavailable, the function logs a warning and returns.
    Note: For Gmail, you likely need to use an 'App Password' if 2FA is enabled.
    See: https://support.google.com/mail/answer/185833
    """
    if aiosmtplib is None:
        logger.warning('Email library not available – skipping email sending.')
        return

    email_user = os.getenv('EMAIL_USER', 'strdjrbservices@gmail.com')
    email_to = recipients or os.getenv('EMAIL_TO', 'strdjrbservices2@gmail.com')
    email_pass = os.getenv('EMAIL_PASS','dqmt jfav iaes ujul')
    
    raw_cc = cc or os.getenv('EMAIL_CC', 'Kevin@djrbservices.com,Kedar@djrbservices.com')
    if isinstance(raw_cc, list):
        email_cc = ", ".join(raw_cc)
    else:
        email_cc = raw_cc
    
    if not email_pass:
        logger.warning('EMAIL_PASS not set in environment – skipping email sending.')
        return

    allowed_attachments = []
    omitted_files = []
    if attachment_paths:
        if isinstance(attachment_paths, str):
            attachment_paths = [attachment_paths]
        
        valid_attachments = []
        for path_str in attachment_paths:
            p = Path(path_str)
            if p.is_file():
                valid_attachments.append((p, p.stat().st_size))
            else:
                logger.warning(f"Attachment file not found: {path_str}")
        
        valid_attachments.sort(key=lambda x: x[1])
        max_total_size = 18 * 1024 * 1024
        total_size = 0
        
        for p, size in valid_attachments:
            if total_size + size <= max_total_size:
                allowed_attachments.append(p)
                total_size += size
            else:
                omitted_files.append((p, size))
                logger.warning(
                    f"Email attachment {p.name} ({size / (1024 * 1024):.2f} MB) omitted "
                    f"to prevent exceeding Gmail size limit."
                )

    if omitted_files:
        omitted_note = (
            "\n\n---\n"
            "⚠️ Note: The following attachment(s) were omitted because they exceeded Google's message size limits:\n"
        )
        for p, size in omitted_files:
            omitted_note += f"- {p.name} ({size / (1024 * 1024):.2f} MB)\n"
        omitted_note += "You can retrieve these files directly from the server or app workspace."
        body_text += omitted_note
        
        if html_body:
            omitted_html = omitted_note.replace('\n', '<br>')
            html_body += f"<br><br><div style='padding: 10px; border: 1px solid #ffcc00; background-color: #fff9e6; color: #665200;'>{omitted_html}</div>"

    msg = EmailMessage()
    msg['From'] = email_user
    msg['To'] = email_to
    if email_cc:
        msg['Cc'] = email_cc
    msg['Subject'] = subject
    msg.set_content(body_text)
    if html_body:
        msg.add_alternative(html_body, subtype='html')

    for p in allowed_attachments:
        with p.open('rb') as f:
            data = f.read()
        msg.add_attachment(
            data,
            maintype='application',
            subtype='octet-stream',
            filename=p.name,
        )

    clean_email_pass = email_pass.replace(" ", "").strip()

    try:
        await aiosmtplib.send(msg, hostname='smtp.gmail.com', port=587, start_tls=True, username=email_user, password=clean_email_pass)
        if email_cc:
            logger.info(f'Email sent to {email_to} (CC: {email_cc}).')
        else:
            logger.info(f'Email sent to {email_to}.')
    except Exception as e:
        err_msg = str(e)
        if '535' in err_msg or 'BadCredentials' in err_msg:
            logger.error(
                f'Failed to send email due to invalid Gmail credentials (535 Bad Credentials).\n'
                f'To fix this, generate a new 16-character Gmail App Password at:\n'
                f'  https://myaccount.google.com/apppasswords\n'
                f'and set the environment variable EMAIL_PASS="<your-new-app-password>".'
            )
        else:
            logger.error(f'Failed to send email: {err_msg}')

async def click_and_wait_for_extraction(
    page: pw.Page,
    selector: str,
    element_name: str,
    timeout_ms: int,
) -> None:
    """Click a button and wait for the global loading indicator to disappear."""
    await check_pause_state()
    await wait_and_click(page, selector, element_name)
    logger.info(f'Waiting for "{element_name}" extraction to complete…')
    try:
        await page.wait_for_selector(MAIN_LOADING_INDICATOR_SELECTOR, state='visible', timeout=5_000)
        logger.info(f'Loading indicator appeared for "{element_name}".')
    except Exception:
        logger.warning(
            f'Loading indicator for "{element_name}" did not appear. Clicking again.'
        )
        await wait_and_click(page, selector, f'{element_name} (2nd attempt)')
        try:
            await page.wait_for_selector(MAIN_LOADING_INDICATOR_SELECTOR, state='visible', timeout=5_000)
            logger.info(
                f'Loading indicator appeared for "{element_name}" on 2nd attempt.'
            )
        except Exception:
            logger.warning(
                f'Loading indicator still not visible after retry – proceeding to wait for hidden state.'
            )
    await page.wait_for_selector(MAIN_LOADING_INDICATOR_SELECTOR, state='hidden', timeout=timeout_ms)
    logger.info(f'"{element_name}" operation completed.')

__all__ = [
    'WEBSITE_B_URL',
    'WEBSITE_B_USERNAME',
    'WEBSITE_B_PASSWORD',
    'WEBSITE_B_USERNAME_SELECTOR',
    'WEBSITE_B_PASSWORD_SELECTOR',
    'WEBSITE_B_LOGIN_BUTTON_SELECTOR',
    'PDF_UPLOAD_SELECTOR',
    'NEW_FILE_UPLOAD_SELECTOR_REVISED',
    'HTML_UPLOAD_SELECTOR_REVISED',
    'SUBMIT_BUTTON_SELECTOR',
    'MAIN_LOADING_INDICATOR_SELECTOR',
    'FULL_FILE_REVIEW_BUTTON_SELECTOR',
    'REVISED_FILE_REVIEW_BUTTON_SELECTOR',
    'VERIFY_SUBJECT_ADDRESS_BUTTON_SELECTOR',
    'VERIFY_state_requriment_seector',
    'verify_Check_Client_Requirements',
    'verify_Run_Escalation_Check',
    'REVISED_PROCESS_BUTTON_SELECTOR',
    'CONFIRMATION_CHECKLIST_BUTTON_SELECTOR',
    'OLD_PDF_UPLOAD_SELECTOR',
    'PIN_SIDEBAR_BUTTON_SELECTOR',
    'DOWNLOAD_PATH',
    'OLD_FILES_REVISED_PATH',
    'NEW_FILES_REVISED_PATH',
    'HTML_FILES_PATH',
    'LOG_FILES_PATH',
    'ERROR_SCREENSHOTS_PATH',
    'PROCESSED_FILES_PATH',
    'ERROR_FILES_PATH',
    'FULL_FILE_PATH',
    'FULL_FILE_LOGS_PATH',
    'PAUSE_LOCK_FILE',
    'wait_for_download',
    'wait_and_click',
    'process_sidebar_item',
    'click_and_wait_for_extraction',
    'send_email',
    'perform_login',
    'check_pause_state',
    'check_pause_state_sync',
    'TERMINATION_LOCK_FILE',
    'IS_PRODUCTION',
    'get_browser_config',
    'BASE_DIR',
]
