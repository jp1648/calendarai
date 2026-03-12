"""Symmetric encryption for sensitive fields (tokens, secrets)."""

from cryptography.fernet import Fernet

from app.config import get_settings

_fernet = None


def _get_fernet() -> Fernet:
    global _fernet
    if _fernet is None:
        key = get_settings().encryption_key
        if not key:
            raise RuntimeError("ENCRYPTION_KEY is not set")
        _fernet = Fernet(key.encode())
    return _fernet


def encrypt(plaintext: str) -> str:
    """Encrypt a string, return base64-encoded ciphertext."""
    return _get_fernet().encrypt(plaintext.encode()).decode()


def decrypt(ciphertext: str) -> str:
    """Decrypt a base64-encoded ciphertext back to string."""
    return _get_fernet().decrypt(ciphertext.encode()).decode()
