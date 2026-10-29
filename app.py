import os
import sys

# Critical: Prevent Gradio from claiming port 7860 for internal SSR proxy
os.environ["GRADIO_SERVER_PORT"] = "7861"
os.environ["GRADIO_SSR_MODE"] = "false"

# Production flags for container / Hugging Face execution
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "appraisal_review.settings")
os.environ.setdefault("SPACE_ID", "hf-space")
os.environ.setdefault("HEADLESS", "true")
os.environ.setdefault("DOCKER_CONTAINER", "true")
os.environ.setdefault("ENVIRONMENT", "production")

import shutil
import subprocess
from pathlib import Path

# Release any lingering process on port 7860
try:
    subprocess.run(["fuser", "-k", "7860/tcp"], capture_output=True)
except Exception:
    pass

# Paths
ROOT_DIR = Path(__file__).resolve().parent
BACKEND_DIR = ROOT_DIR / "appraisal_review"
BUILD_DIR = ROOT_DIR / "pramaan" / "build"
STATIC_DIR = BACKEND_DIR / "staticfiles"
MEDIA_DIR = BACKEND_DIR / "media"
DOWNLOADS_DIR = BACKEND_DIR / "Downloads"

# Add backend directory to sys.path
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

# Ensure required directories exist
STATIC_DIR.mkdir(parents=True, exist_ok=True)
MEDIA_DIR.mkdir(parents=True, exist_ok=True)
DOWNLOADS_DIR.mkdir(parents=True, exist_ok=True)
(DOWNLOADS_DIR / "logfiles").mkdir(parents=True, exist_ok=True)

# Production flags for container / Hugging Face execution
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "appraisal_review.settings")
os.environ.setdefault("SPACE_ID", "hf-space")
os.environ.setdefault("HEADLESS", "true")
os.environ.setdefault("DOCKER_CONTAINER", "true")
os.environ.setdefault("ENVIRONMENT", "production")

# Ensure Playwright Chromium is available
print("==> Checking Playwright Chromium...")
try:
    subprocess.run(["playwright", "install", "chromium"], check=False)
except Exception as e:
    print(f"Playwright installation note: {e}")

# Initialize Django
print("==> Initializing Django...")
import django
django.setup()

from django.core.management import call_command
from appraisal_review.asgi import application as django_asgi_app

try:
    print("==> Running database migrations...")
    call_command("migrate", interactive=False)
    print("==> Collecting Django static assets...")
    call_command("collectstatic", interactive=False)
except Exception as e:
    print(f"Django setup exception: {e}")

# Merge frontend static assets into staticfiles
if (BUILD_DIR / "static").exists():
    print("==> Merging React static assets into staticfiles...")
    for item in (BUILD_DIR / "static").iterdir():
        dest = STATIC_DIR / item.name
        if item.is_dir():
            shutil.copytree(item, dest, dirs_exist_ok=True)
        else:
            shutil.copy2(item, dest)

# Setup FastAPI App for Static Assets and React SPA
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

fastapi_app = FastAPI(title="Pramaan Appraisal App", docs_url=None, redoc_url=None)

fastapi_app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 1. Mount static & media directories
if STATIC_DIR.exists():
    fastapi_app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")

if MEDIA_DIR.exists():
    fastapi_app.mount("/media", StaticFiles(directory=str(MEDIA_DIR)), name="media")

# 2. Status endpoint
@fastapi_app.get("/status")
async def status():
    return {"status": "running", "service": "Pramaan Full-Stack"}

# 3. Catch-all router for React SPA
@fastapi_app.get("/{full_path:path}")
async def serve_frontend(full_path: str):
    target = BUILD_DIR / full_path
    if full_path and target.is_file():
        return FileResponse(str(target))
    index_file = BUILD_DIR / "index.html"
    if index_file.exists():
        return FileResponse(str(index_file))
    return {"message": "Pramaan frontend build not found."}

# Master ASGI Dispatcher: routes /api, /admin, and /token directly to Django ASGI
async def app(scope, receive, send):
    if scope["type"] == "lifespan":
        while True:
            message = await receive()
            if message["type"] == "lifespan.startup":
                await send({"type": "lifespan.startup.complete"})
            elif message["type"] == "lifespan.shutdown":
                await send({"type": "lifespan.shutdown.complete"})
                return
    if scope["type"] in ("http", "websocket"):
        path = scope.get("path", "")
        if path.startswith("/api/") or path.startswith("/admin/") or path.startswith("/token/"):
            await django_asgi_app(scope, receive, send)
            return
    await fastapi_app(scope, receive, send)

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 7860))
    print(f"==> Launching server on http://0.0.0.0:{port}...")
    uvicorn.run(app, host="0.0.0.0", port=port, log_level="info", lifespan="off")

