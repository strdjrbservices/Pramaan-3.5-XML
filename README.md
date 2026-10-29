# Pramaan 3.5 — Full Stack Appraisal Review System

Unified Full-Stack Deployment: **React Frontend** + **Django REST Backend** + **Playwright Headless Browser** running inside a single container on **Hugging Face Spaces (Docker)** or any container platform.

---

## 🏗️ Architecture

- **Frontend**: React 19 SPA (`pramaan/`) with Material UI.
- **Backend**: Django 5.1 REST framework (`appraisal_review/`) with JWT authentication, PyMuPDF, and Google Generative AI.
- **Automation**: Playwright Chromium headless engine (`appraisal_review/api/automation*.py`).
- **Web Server & Reverse Proxy**: Nginx listening on port `7860`, reverse proxying `/api/*`, `/admin/*`, and `/token/*` to Gunicorn on internal port `8000`, while serving the React frontend from `/`.
- **Process Supervisor**: Supervisord managing both Gunicorn and Nginx in the container.

---

## 🚀 How to Deploy on Hugging Face Spaces (Free 16GB RAM + 2 vCPUs)

### Step 1: Create a Space on Hugging Face
1. Log in to [Hugging Face](https://huggingface.co/) and navigate to [huggingface.co/spaces](https://huggingface.co/spaces).
2. Click **Create new Space**.
3. Fill in:
   - **Space Name**: e.g., `pramaan-appraisal`
   - **License**: Apache 2.0 / MIT
   - **Space SDK**: Choose **Docker** -> **Blank**
   - **Space Hardware**: Free (2 vCPU, 16 GB RAM)
   - **Visibility**: **Private** (recommended for appraisal data) or Public.

### Step 2: Push Your Code to Hugging Face
In your terminal, add Hugging Face as a remote and push:

```bash
# Add your Hugging Face Space git remote (copy URL from your HF Space page)
git remote add hf https://huggingface.co/spaces/<YOUR_USERNAME>/<YOUR_SPACE_NAME>

# Commit the changes
git add .
git commit -m "Configure full-stack deployment for Hugging Face Docker Space"

# Push to Hugging Face
git push hf main
```

*(If your local branch is `master`, run `git push hf master:main`).*

### Step 3: Set Secrets / Environment Variables (Optional)
In your Space settings (**Settings > Variables and secrets**):
- `GEMINI_API_KEY`: Your Google Gemini API Key for AI report parsing.
- `SECRET_KEY`: A secure random string for Django.
- `DATABASE_URL`: (Optional) Connection string to an external PostgreSQL database (e.g. Supabase, Neon) if you want permanent database storage across Space restarts.

---

## 💻 Local Development

### 1. Run Backend:
```bash
cd appraisal_review
python manage.py migrate
python manage.py runserver 8000
```

### 2. Run Frontend:
```bash
cd pramaan
npm start
```
The frontend automatically proxies API calls to `http://localhost:8000` when running locally on port 3000.
