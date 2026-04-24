"""
User & API key management router.
"""
import logging
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.db import get_db, User, APIKey
from app.services.encryption import encrypt_api_key, decrypt_api_key

router = APIRouter(prefix="/api/v1/users", tags=["users"])
logger = logging.getLogger(__name__)


class APIKeyCreate(BaseModel):
    provider: str  # openai, anthropic, google, xai, cohere, mistral
    api_key: str


class APIKeyResponse(BaseModel):
    provider: str
    masked_key: str  # sk-...****


VALID_PROVIDERS = {"openai", "anthropic", "google", "xai", "cohere", "mistral"}


@router.post("/{user_id}/api-keys")
async def save_api_key(
    user_id: str,
    body: APIKeyCreate,
    db: AsyncSession = Depends(get_db),
):
    """Store an encrypted API key for a user."""
    if body.provider not in VALID_PROVIDERS:
        raise HTTPException(400, f"Invalid provider: {body.provider}. Must be one of {VALID_PROVIDERS}")

    encrypted = encrypt_api_key(body.api_key)

    # Check if key already exists
    result = await db.execute(
        select(APIKey).where(APIKey.user_id == user_id, APIKey.provider == body.provider)
    )
    existing = result.scalar_one_or_none()

    if existing:
        existing.encrypted_key = encrypted
    else:
        db.add(APIKey(user_id=user_id, provider=body.provider, encrypted_key=encrypted))

    await db.commit()
    return {"status": "saved", "provider": body.provider}


@router.get("/{user_id}/api-keys")
async def get_api_keys(user_id: str, db: AsyncSession = Depends(get_db)):
    """List stored API keys (masked) for a user."""
    result = await db.execute(select(APIKey).where(APIKey.user_id == user_id))
    keys = result.scalars().all()

    def mask(encrypted: str) -> str:
        try:
            plain = decrypt_api_key(encrypted)
            return plain[:8] + "****" + plain[-4:] if len(plain) > 12 else "****"
        except Exception:
            return "****"

    return {
        "api_keys": [
            {"provider": k.provider, "masked_key": mask(k.encrypted_key)}
            for k in keys
        ]
    }


@router.delete("/{user_id}/api-keys/{provider}")
async def delete_api_key(user_id: str, provider: str, db: AsyncSession = Depends(get_db)):
    """Delete a stored API key."""
    result = await db.execute(
        select(APIKey).where(APIKey.user_id == user_id, APIKey.provider == provider)
    )
    key = result.scalar_one_or_none()
    if not key:
        raise HTTPException(404, "Key not found")
    await db.delete(key)
    await db.commit()
    return {"status": "deleted", "provider": provider}
