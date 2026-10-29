---
title: Pramaan Appraisal
emoji: 🚀
colorFrom: blue
colorTo: indigo
sdk: gradio
app_file: app.py
suggested_hardware: cpu-basic
pinned: false
---

# Pramaan 3.5 — Full Stack Appraisal Review System

Unified Full-Stack Deployment: **React Frontend** + **Django REST Backend** + **Playwright Headless Browser** running inside a single **Hugging Face Space** using the **Free Gradio SDK** (16 GB RAM + 2 vCPUs).

---

## 🏗️ Architecture

- **Frontend**: React 19 SPA (`pramaan/build/`) with Material UI.
- **Backend**: Django 5.1 REST framework (`appraisal_review/`) with JWT authentication, PyMuPDF, and Google Generative AI.
- **Automation**: Playwright Chromium headless engine (`appraisal_review/api/automation*.py`).
- **Unified ASGI Server**: `app.py` running Uvicorn on port `7860`.
  - Routes `/api/*`, `/admin/*`, and `/token/*` directly to Django ASGI.
  - Serves static assets (`/static/*`) and media files (`/media/*`).
  - Serves the React single-page application at `/` and all client-side routes.
  - Mounts a status UI at `/gradio` for Hugging Face health-check compliance.

---

## 🚀 Deployment

Deployed on Hugging Face Spaces with 16 GB RAM and 2 vCPUs.
