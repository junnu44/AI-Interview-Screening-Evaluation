
# Deployment Guide

## Prerequisites
- Docker and Docker Compose installed.
- xAI API Key (Grok).

## Quick Start (Docker)

1.  **Configure Environment**:
    Ensure your `.env` file or environment variables are set with your xAI API key:
    ```
    XAI_API_KEY=your_key_here
    XAI_BASE_URL=https://api.x.ai/v1
    XAI_MODEL=grok-2-latest
    ```

2.  **Build and Run**:
    Navigate to the project root and run:
    ```bash
    docker-compose up --build
    ```

3.  **Access the App**:
    - Frontend: `http://localhost:3000`
    - Backend API: `http://localhost:8000`
    - Admin Panel: Accessible via the "For Recruiters" link on the landing page or `http://localhost:3000/admin`.

## Manual Deployment

### Backend
1.  Navigate to `backend/`.
2.  Install dependencies: `pip install -r requirements.txt`.
3.  Run server: `uvicorn main:app --host 0.0.0.0 --port 8000`.

### Frontend
1.  Navigate to `frontend/`.
2.  Install dependencies: `npm install`.
3.  Build: `npm run build`.
4.  Serve the `dist` folder using any static file server (e.g., `serve -s dist`).
