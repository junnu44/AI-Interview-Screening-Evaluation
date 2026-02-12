"""
Admin Authentication & Authorization Module
"""
import jwt
import datetime
from typing import Optional, Dict
from fastapi import HTTPException, Security, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from config import Config

security = HTTPBearer()


def create_admin_token(username: str) -> str:
    """Create JWT token for admin user."""
    payload = {
        "username": username,
        "role": "admin",
        "exp": datetime.datetime.utcnow() + datetime.timedelta(hours=Config.JWT_EXPIRATION_HOURS),
        "iat": datetime.datetime.utcnow()
    }
    
    token = jwt.encode(payload, Config.JWT_SECRET, algorithm=Config.JWT_ALGORITHM)
    return token


def verify_admin_token(token: str) -> Optional[Dict]:
    """Verify JWT token and return payload if valid."""
    try:
        payload = jwt.decode(token, Config.JWT_SECRET, algorithms=[Config.JWT_ALGORITHM])
        
        # Check if token is expired
        if datetime.datetime.utcnow() > datetime.datetime.fromtimestamp(payload["exp"]):
            return None
        
        # Check if user is admin
        if payload.get("role") != "admin":
            return None
        
        return payload
    
    except jwt.InvalidTokenError:
        return None
    except Exception:
        return None


def verify_admin_credentials(username: str, password: str) -> bool:
    """Verify admin username and password."""
    return username == Config.ADMIN_USER and password == Config.ADMIN_PASS


async def get_current_admin(credentials: HTTPAuthorizationCredentials = Security(security)) -> Dict:
    """Dependency to verify admin authentication."""
    token = credentials.credentials
    payload = verify_admin_token(token)
    
    if not payload:
        raise HTTPException(
            status_code=401,
            detail="Invalid or expired authentication token",
            headers={"WWW-Authenticate": "Bearer"}
        )
    
    return payload


def require_admin(credentials: HTTPAuthorizationCredentials = Security(security)) -> Dict:
    """Dependency to require admin authentication (synchronous version)."""
    token = credentials.credentials
    payload = verify_admin_token(token)
    
    if not payload:
        raise HTTPException(
            status_code=401,
            detail="Invalid or expired authentication token",
            headers={"WWW-Authenticate": "Bearer"}
        )
    
    return payload
