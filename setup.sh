#!/bin/bash

# AI Interview System v2.0 - Setup Script
# This script helps set up the development environment

set -e

echo "🤖 AI Interview System v2.0 - Setup Script"
echo "=========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if Python is installed
echo "Checking Python installation..."
if ! command -v python3 &> /dev/null; then
    echo -e "${RED}❌ Python 3 is not installed. Please install Python 3.9 or higher.${NC}"
    exit 1
fi

PYTHON_VERSION=$(python3 --version | cut -d' ' -f2)
echo -e "${GREEN}✅ Python $PYTHON_VERSION found${NC}"
echo ""

# Check if Node.js is installed
echo "Checking Node.js installation..."
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js is not installed. Please install Node.js 18 or higher.${NC}"
    exit 1
fi

NODE_VERSION=$(node --version)
echo -e "${GREEN}✅ Node.js $NODE_VERSION found${NC}"
echo ""

# Check if .env file exists
echo "Checking environment configuration..."
if [ ! -f .env ]; then
    echo -e "${YELLOW}⚠️  .env file not found. Creating from template...${NC}"
    cat > .env << EOF
# Grok (xAI) Configuration
XAI_API_KEY=your_xai_api_key_here
XAI_MODEL=grok-2-latest

# Admin Credentials (CHANGE IN PRODUCTION!)
ADMIN_USER=admin
ADMIN_PASS=admin123

# JWT Secret (CHANGE IN PRODUCTION!)
JWT_SECRET=$(openssl rand -base64 32 2>/dev/null || python3 -c "import secrets; print(secrets.token_urlsafe(32))")

# Application
DEBUG=True
LOG_LEVEL=INFO
EOF
    echo -e "${GREEN}✅ .env file created${NC}"
    echo -e "${YELLOW}⚠️  Please edit .env and add your XAI_API_KEY${NC}"
else
    echo -e "${GREEN}✅ .env file exists${NC}"
fi
echo ""

# Setup backend
echo "Setting up backend..."
cd backend

# Create virtual environment if it doesn't exist
if [ ! -d "../.venv" ]; then
    echo "Creating Python virtual environment..."
    python3 -m venv ../.venv
    echo -e "${GREEN}✅ Virtual environment created${NC}"
fi

# Activate virtual environment
echo "Activating virtual environment..."
source ../.venv/bin/activate || source ../.venv/Scripts/activate

# Install Python dependencies
echo "Installing Python dependencies..."
pip install --upgrade pip > /dev/null
pip install -r requirements.txt
echo -e "${GREEN}✅ Python dependencies installed${NC}"

# Initialize database
echo "Initializing database..."
python3 -c "from utils.db_ops import init_db; from config import Config; init_db(Config.DATABASE)"
echo -e "${GREEN}✅ Database initialized${NC}"

cd ..
echo ""

# Setup frontend
echo "Setting up frontend..."
cd frontend

# Install Node dependencies
if [ ! -d "node_modules" ]; then
    echo "Installing Node.js dependencies..."
    npm install
    echo -e "${GREEN}✅ Node.js dependencies installed${NC}"
else
    echo -e "${GREEN}✅ Node.js dependencies already installed${NC}"
fi

cd ..
echo ""

# Create necessary directories
echo "Creating necessary directories..."
mkdir -p instance
mkdir -p logs
echo -e "${GREEN}✅ Directories created${NC}"
echo ""

# Summary
echo "=========================================="
echo -e "${GREEN}✅ Setup Complete!${NC}"
echo "=========================================="
echo ""
echo "📝 Next Steps:"
echo ""
echo "1. Edit .env file and add your XAI_API_KEY:"
echo "   Get your API key from: https://console.x.ai/"
echo ""
echo "2. Start the backend:"
echo "   cd backend"
echo "   source ../.venv/bin/activate  # On Windows: ..\.venv\Scripts\activate"
echo "   uvicorn main:app --reload --port 8000"
echo ""
echo "3. In a new terminal, start the frontend:"
echo "   cd frontend"
echo "   npm run dev"
echo ""
echo "4. Access the application:"
echo "   Frontend: http://localhost:5173"
echo "   Backend API: http://localhost:8000"
echo "   API Docs: http://localhost:8000/docs"
echo ""
echo "5. Admin Login:"
echo "   Username: admin"
echo "   Password: admin123"
echo "   (Change these in .env for production!)"
echo ""
echo "📚 Documentation:"
echo "   - README.md - Feature overview"
echo "   - API_DOCUMENTATION.md - API reference"
echo "   - DEPLOYMENT_GUIDE.md - Production deployment"
echo "   - UPGRADE_SUMMARY.md - What's new in v2.0"
echo ""
echo "🎉 Happy interviewing!"
