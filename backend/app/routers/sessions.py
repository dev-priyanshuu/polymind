"""
Session management router — history, shareable links, usage dashboard.
"""
import uuid
import logging
from typing import Optional

from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.db import get_db, Session, ModelResponse, ChefOutput

router = APIRouter(prefix="/api/v1/sessions", tags=["sessions"])
logger = logging.getLogger(__name__)


@router.get("/{session_id}")
async def get_session(session_id: str, db: AsyncSession = Depends(get_db)):
    """Get a session by ID (requires auth in production)."""
    result = await db.execute(select(Session).where(Session.id == session_id))
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(404, "Session not found")

    responses_result = await db.execute(
        select(ModelResponse).where(ModelResponse.session_id == session_id)
    )
    responses = responses_result.scalars().all()

    chef_result = await db.execute(
        select(ChefOutput).where(ChefOutput.session_id == session_id)
    )
    chef = chef_result.scalar_one_or_none()

    return {
        "session": {
            "id": session.id,
            "prompt": session.prompt,
            "models_used": session.models_used,
            "total_tokens": session.total_tokens,
            "total_cost_usd": session.total_cost_usd,
            "created_at": session.created_at.isoformat(),
            "share_token": session.share_token,
        },
        "responses": [
            {
                "model_id": r.model_id,
                "provider": r.provider,
                "content": r.content,
                "input_tokens": r.input_tokens,
                "output_tokens": r.output_tokens,
                "latency_ms": r.latency_ms,
                "cost_usd": r.cost_usd,
                "error": r.error,
                "success": r.success,
            }
            for r in responses
        ],
        "chef": {
            "synthesis": chef.synthesis,
            "confidence_score": chef.confidence_score,
            "verified_claims": chef.verified_claims,
            "disputed_claims": chef.disputed_claims,
            "unverified_claims": chef.unverified_claims,
            "chef_model": chef.chef_model,
        } if chef else None,
    }


@router.get("/share/{share_token}")
async def get_shared_session(share_token: str, db: AsyncSession = Depends(get_db)):
    """Public read-only view of a shared session."""
    result = await db.execute(select(Session).where(Session.share_token == share_token))
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(404, "Shared session not found")

    return await get_session(session.id, db)
