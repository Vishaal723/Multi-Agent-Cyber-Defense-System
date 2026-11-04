"""
MACDS Authentication and Role-Based Access Control (RBAC) Module
Implements JWT tokens, password hashing, and role-based permissions.
"""
import hashlib
import hmac
import os
from datetime import datetime, timedelta, timezone
from typing import Optional, List
from fastapi import Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
import bcrypt
from database import get_db

ALGORITHM = "HS256"
TOKEN_ISSUER = "MACDS"
ACCESS_TOKEN_EXPIRE_MINUTES = 60

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login", auto_error=False)

def get_jwt_secret() -> str:
    secret = os.getenv("JWT_SECRET_KEY", "")
    if len(secret.encode("utf-8")) < 32:
        raise RuntimeError("JWT_SECRET_KEY must contain at least 32 bytes. Configure it in the environment.")
    return secret


def validate_jwt_configuration() -> None:
    get_jwt_secret()


def hash_password(password: str) -> str:
    encoded = password.encode("utf-8")
    if len(encoded) > 72:
        raise ValueError("Password must be at most 72 UTF-8 bytes for bcrypt.")
    return bcrypt.hashpw(encoded, bcrypt.gensalt(rounds=12)).decode("ascii")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    encoded = plain_password.encode("utf-8")
    if hashed_password.startswith(("$2a$", "$2b$", "$2y$")):
        if len(encoded) > 72:
            return False
        try:
            return bcrypt.checkpw(encoded, hashed_password.encode("ascii"))
        except (ValueError, TypeError):
            return False
    # Compatibility for existing SHA-256 user rows. Successful logins are rehashed.
    if len(hashed_password) == 64:
        legacy = hashlib.sha256(encoded).hexdigest()
        return hmac.compare_digest(legacy, hashed_password.lower())
    return False

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    now = datetime.now(timezone.utc)
    to_encode.update({"exp": expire, "iat": now, "iss": TOKEN_ISSUER})
    encoded_jwt = jwt.encode(to_encode, get_jwt_secret(), algorithm=ALGORITHM)
    return encoded_jwt

def authenticate_token(token: Optional[str]):
    if not token:
        # Protected callers never fall back to an anonymous guest session.
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication credentials were not provided",
            headers={"WWW-Authenticate": "Bearer"},
        )
    try:
        payload = jwt.decode(
            token,
            get_jwt_secret(),
            algorithms=[ALGORITHM],
            issuer=TOKEN_ISSUER,
            options={"require_exp": True, "require_iat": True, "require_iss": True},
        )
        username = payload.get("sub")
        if not isinstance(username, str) or not username:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication token payload",
            )
        issued_at = payload.get("iat")
        if not isinstance(issued_at, (int, float)) or issued_at > datetime.now(timezone.utc).timestamp() + 30:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid authentication token payload")
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
        )
    
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT user_id, username, email, role, created_at FROM users WHERE username = ?", (username,))
    row = cursor.fetchone()
    conn.close()
    
    if row is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Could not validate credentials")
    
    return {
        "user_id": row["user_id"],
        "username": row["username"],
        "email": row["email"],
        "role": row["role"],
        "created_at": row["created_at"]
    }


def get_current_user(
    request: Request,
    token: Optional[str] = Depends(oauth2_scheme),
):
    if getattr(request.state, "current_user", None):
        return request.state.current_user
    cookie_token = request.cookies.get("macds_session")
    return authenticate_token(token or cookie_token)

def require_roles(allowed_roles: List[str]):
    def role_checker(current_user: dict = Depends(get_current_user)):
        user_role = current_user.get("role")
        # Administrator has access to all roles
        if user_role == "Administrator" or user_role in allowed_roles:
            return current_user
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Access denied: Requires one of roles {allowed_roles}, but user has '{user_role}'"
        )
    return role_checker
