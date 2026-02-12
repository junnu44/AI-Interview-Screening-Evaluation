import os
from dotenv import load_dotenv

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PARENT_DIR = os.path.dirname(BASE_DIR)

# Load .env from parent directory (project root)
dotenv_path = os.path.join(PARENT_DIR, ".env")
if os.path.exists(dotenv_path):
    load_dotenv(dotenv_path)

class Config:
    # AI API Configuration (Groq)
    XAI_API_KEY = os.getenv("XAI_API_KEY", "")
    XAI_BASE_URL = "https://api.groq.com/openai/v1"
    XAI_MODEL = os.getenv("XAI_MODEL", "llama-3.3-70b-versatile")
    
    # Database
    DATABASE = os.path.join(PARENT_DIR, "instance", "interview.db")
    
    # Admin credentials
    ADMIN_USER = os.getenv("ADMIN_USER", "admin")
    ADMIN_PASS = os.getenv("ADMIN_PASS", "admin123")
    
    # JWT Secret for admin authentication
    JWT_SECRET = os.getenv("JWT_SECRET", "your-secret-key-change-in-production")
    JWT_ALGORITHM = "HS256"
    JWT_EXPIRATION_HOURS = 24
    
    # Interview Configuration
    MIN_QUESTIONS = 5
    MAX_QUESTIONS = 25
    BASE_DIFFICULTY = 50  # 0-100 scale
    DIFFICULTY_ADJUSTMENT = 10
    
    # Proctoring Configuration
    MAX_VIOLATIONS = 3
    VIOLATION_TYPES = ["multiple_faces", "looking_away", "no_face"]
    
    # Ensure instance directory exists
    INSTANCE_DIR = os.path.join(PARENT_DIR, "instance")
    os.makedirs(INSTANCE_DIR, exist_ok=True)
