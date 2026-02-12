@echo off
REM AI Interview System v2.0 - Setup Script for Windows
REM This script helps set up the development environment

echo ========================================
echo AI Interview System v2.0 - Setup Script
echo ========================================
echo.

REM Check if Python is installed
echo Checking Python installation...
python --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Python 3 is not installed. Please install Python 3.9 or higher.
    pause
    exit /b 1
)

for /f "tokens=2" %%i in ('python --version 2^>^&1') do set PYTHON_VERSION=%%i
echo [OK] Python %PYTHON_VERSION% found
echo.

REM Check if Node.js is installed
echo Checking Node.js installation...
node --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js is not installed. Please install Node.js 18 or higher.
    pause
    exit /b 1
)

for /f %%i in ('node --version') do set NODE_VERSION=%%i
echo [OK] Node.js %NODE_VERSION% found
echo.

REM Check if .env file exists
echo Checking environment configuration...
if not exist .env (
    echo [WARNING] .env file not found. Creating from template...
    (
        echo # Grok ^(xAI^) Configuration
        echo XAI_API_KEY=your_xai_api_key_here
        echo XAI_MODEL=grok-2-latest
        echo.
        echo # Admin Credentials ^(CHANGE IN PRODUCTION!^)
        echo ADMIN_USER=admin
        echo ADMIN_PASS=admin123
        echo.
        echo # JWT Secret ^(CHANGE IN PRODUCTION!^)
        echo JWT_SECRET=change-this-to-a-random-secret-key-in-production
        echo.
        echo # Application
        echo DEBUG=True
        echo LOG_LEVEL=INFO
    ) > .env
    echo [OK] .env file created
    echo [WARNING] Please edit .env and add your XAI_API_KEY
) else (
    echo [OK] .env file exists
)
echo.

REM Setup backend
echo Setting up backend...
cd backend

REM Create virtual environment if it doesn't exist
if not exist "..\\.venv" (
    echo Creating Python virtual environment...
    python -m venv ..\.venv
    echo [OK] Virtual environment created
)

REM Activate virtual environment
echo Activating virtual environment...
call ..\.venv\Scripts\activate.bat

REM Install Python dependencies
echo Installing Python dependencies...
python -m pip install --upgrade pip >nul 2>&1
pip install -r requirements.txt
echo [OK] Python dependencies installed

REM Initialize database
echo Initializing database...
python -c "from utils.db_ops import init_db; from config import Config; init_db(Config.DATABASE)"
echo [OK] Database initialized

cd ..
echo.

REM Setup frontend
echo Setting up frontend...
cd frontend

REM Install Node dependencies
if not exist "node_modules" (
    echo Installing Node.js dependencies...
    call npm install
    echo [OK] Node.js dependencies installed
) else (
    echo [OK] Node.js dependencies already installed
)

cd ..
echo.

REM Create necessary directories
echo Creating necessary directories...
if not exist "instance" mkdir instance
if not exist "logs" mkdir logs
echo [OK] Directories created
echo.

REM Summary
echo ========================================
echo [OK] Setup Complete!
echo ========================================
echo.
echo Next Steps:
echo.
echo 1. Edit .env file and add your XAI_API_KEY:
echo    Get your API key from: https://console.x.ai/
echo.
echo 2. Start the backend:
echo    cd backend
echo    ..\\.venv\\Scripts\\activate
echo    uvicorn main:app --reload --port 8000
echo.
echo 3. In a new terminal, start the frontend:
echo    cd frontend
echo    npm run dev
echo.
echo 4. Access the application:
echo    Frontend: http://localhost:5173
echo    Backend API: http://localhost:8000
echo    API Docs: http://localhost:8000/docs
echo.
echo 5. Admin Login:
echo    Username: admin
echo    Password: admin123
echo    ^(Change these in .env for production!^)
echo.
echo Documentation:
echo    - README.md - Feature overview
echo    - API_DOCUMENTATION.md - API reference
echo    - DEPLOYMENT_GUIDE.md - Production deployment
echo    - UPGRADE_SUMMARY.md - What's new in v2.0
echo.
echo Happy interviewing!
echo.
pause
