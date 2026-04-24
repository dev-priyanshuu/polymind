"""
Encryption service for user API keys using AES-256 (Fernet).
"""
from cryptography.fernet import Fernet
import base64
import hashlib
from app.config import settings


def _get_fernet() -> Fernet:
    """Derive a Fernet key from our AES_ENCRYPTION_KEY config."""
    key_bytes = settings.AES_ENCRYPTION_KEY.encode()[:32].ljust(32, b"0")
    b64_key = base64.urlsafe_b64encode(key_bytes)
    return Fernet(b64_key)


def encrypt_api_key(plain_key: str) -> str:
    """Encrypt a plain API key for DB storage."""
    f = _get_fernet()
    return f.encrypt(plain_key.encode()).decode()


def decrypt_api_key(encrypted_key: str) -> str:
    """Decrypt a stored API key."""
    f = _get_fernet()
    return f.decrypt(encrypted_key.encode()).decode()
