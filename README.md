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

## 🚀 How to Deploy on Hugging Face Spaces (100% Free)

### Step 1: Create a Space on Hugging Face
1. Log in to [Hugging Face](https://huggingface.co/) and navigate to [huggingface.co/spaces](https://huggingface.co/spaces).
2. Click **Create new Space**.
3. Fill in:
   - **Space Name**: e.g., `pramaan-appraisal`
   - **License**: Apache 2.0 / MIT
   - **Space SDK**: Select **Gradio** (choose the **Blank** template)
   - **Space Hardware**: Free (2 vCPU, 16 GB RAM)
   - **Visibility**: **Private** (recommended for appraisal data) or Public.

### Step 2: Push Your Code to Hugging Face
In your local terminal (inside `d:\Pramaan-3.5-regex-1`):

```bash
# 1. Add your Hugging Face Space git remote (copy URL from your Space page)
git remote add hf https://huggingface.co/spaces/<YOUR_USERNAME>/<YOUR_SPACE_NAME>

# 2. Stage and commit the files
git add .
git commit -m "Deploy full-stack React + Django app on Hugging Face Free Gradio SDK"

# 3. Push to Hugging Face
git push hf main
```
*(If your local branch is named `master`, run `git push hf master:main` or `git push -f hf main`).*

### Step 3: Set Secrets / Environment Variables (Optional)
In your Space settings (**Settings > Variables and secrets**):
- `GEMINI_API_KEY`: Your Google Gemini API Key for AI report parsing.
- `SECRET_KEY`: Any secure random string for Django.
- `DATABASE_URL`: (Optional) Connection string to an external PostgreSQL database (e.g. Supabase, Neon) if you want permanent database storage across Space restarts.
