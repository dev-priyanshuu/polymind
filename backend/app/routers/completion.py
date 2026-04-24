"""
/complete and /stream routers — the core API for multi-LLM fan-out.
"""
import asyncio
import json
import uuid
import time
import logging
from typing import List, Optional, AsyncIterator

from fastapi import APIRouter, HTTPException, Depends, Request
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.llm import CompletionRequest, ChefRequest, LLMResponse, MODEL_REGISTRY, StreamChunk
from app.services.gateway import run_parallel_complete, build_adapter
from app.services.chef import run_chef
from app.models.db import get_db, Session, ModelResponse, ChefOutput
import datetime

router = APIRouter(prefix="/api/v1", tags=["completion"])
logger = logging.getLogger(__name__)


@router.get("/models/{provider}")
async def list_provider_models(provider: str, api_key: str):
    """Dynamically fetch models for a specific provider using a given API key."""
    # We use a dummy model_id because build_adapter needs one, 
    # but list_models doesn't depend on it for the API call usually.
    dummy_ids = {
        "openai": "gpt-4o",
        "anthropic": "claude-3-5-sonnet-latest",
        "google": "gemini-1.5-flash",
        "cohere": "command-r-plus-08-2024",
        "mistral": "mistral-large-latest",
        "xai": "grok-2-1212"
    }
    
    mid = dummy_ids.get(provider, "default")
    adapter = build_adapter(mid, {provider: api_key})
    
    if not adapter:
        raise HTTPException(400, f"Unsupported or misconfigured provider: {provider}")
        
    try:
        models = await adapter.list_models()
        return {"models": models}
    except Exception as e:
        raise HTTPException(500, str(e))


@router.post("/complete")
async def complete(
    request: CompletionRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Non-streaming: Fire all models in parallel, wait for all, return results.
    """
    # Validate model IDs
    invalid = [m for m in request.models if m not in MODEL_REGISTRY]
    if invalid:
        raise HTTPException(400, f"Unknown model IDs: {invalid}")

    responses = await run_parallel_complete(
        prompt=request.prompt,
        model_ids=request.models,
        system_prompt=request.system_prompt,
        temperature=request.temperature,
        max_tokens=request.max_tokens,
        user_keys=request.user_keys,
    )

    total_tokens = sum(r.input_tokens + r.output_tokens for r in responses)
    total_cost = sum(r.cost_usd for r in responses)

    # Persist session
    session_id = str(uuid.uuid4())
    share_token = str(uuid.uuid4()).replace("-", "")[:16]
    session = Session(
        id=session_id,
        prompt=request.prompt,
        models_used=request.models,
        total_tokens=total_tokens,
        total_cost_usd=total_cost,
        is_public=False,
        share_token=share_token,
    )
    db.add(session)

    for r in responses:
        mr = ModelResponse(
            session_id=session_id,
            model_id=r.model_id,
            provider=r.provider.value if hasattr(r.provider, 'value') else str(r.provider),
            content=r.content,
            input_tokens=r.input_tokens,
            output_tokens=r.output_tokens,
            latency_ms=r.latency_ms,
            cost_usd=r.cost_usd,
            error=r.error,
            success=r.success,
        )
        db.add(mr)

    await db.commit()

    return {
        "session_id": session_id,
        "share_token": share_token,
        "responses": [r.model_dump() for r in responses],
        "total_tokens": total_tokens,
        "total_cost_usd": total_cost,
    }


@router.post("/stream")
async def stream_complete(request: CompletionRequest):
    """
    SSE streaming: Fire all models in parallel, stream each chunk as it arrives.
    Each SSE event has: data: {model_id, chunk, is_final, error}
    """
    # Dynamic Validation: Allow if in registry OR if provider hint exists
    invalid = []
    for m in request.models:
        if m not in MODEL_REGISTRY:
            hint = request.provider_hints.get(m) if request.provider_hints else None
            if not hint:
                invalid.append(m)
    
    if invalid:
        raise HTTPException(400, f"Unknown model IDs and no provider hints: {invalid}")

    async def event_generator():
        # Build all adapters
        adapters = {}
        for model_id in request.models:
            hint = request.provider_hints.get(model_id) if request.provider_hints else None
            adapter = build_adapter(model_id, request.user_keys, provider_hint=hint)
            if adapter:
                adapters[model_id] = adapter
            else:
                # Immediately yield an error chunk
                chunk = StreamChunk(
                    model_id=model_id,
                    provider=hint or "unknown",
                    display_name=model_id,
                    chunk="",
                    error="Could not build adapter. Check provider and API key.",
                    is_final=True,
                )
                yield f"data: {chunk.model_dump_json()}\n\n"

        # Stream all adapters concurrently using asyncio queues
        queue: asyncio.Queue = asyncio.Queue()
        active = len(adapters)

        async def stream_one(model_id: str, adapter):
            try:
                async for chunk in adapter.stream(
                    prompt=request.prompt,
                    system_prompt=request.system_prompt,
                    temperature=request.temperature,
                    max_tokens=request.max_tokens,
                ):
                    await queue.put(chunk)
            except Exception as e:
                await queue.put(StreamChunk(
                    model_id=model_id,
                    provider=MODEL_REGISTRY[model_id].provider.value,
                    display_name=MODEL_REGISTRY[model_id].display_name,
                    chunk="", error=str(e), is_final=True,
                ))
            finally:
                await queue.put(None)  # sentinel

        # Launch all streams
        tasks = [asyncio.create_task(stream_one(mid, adp)) for mid, adp in adapters.items()]
        finished = 0

        while finished < active:
            item = await queue.get()
            if item is None:
                finished += 1
                continue
            yield f"data: {item.model_dump_json()}\n\n"

        yield "data: [DONE]\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )


@router.post("/chef")
async def chef_aggregate(
    request: ChefRequest,
    db: AsyncSession = Depends(get_db),
):
    """Run the chef synthesizer on completed model responses."""
    if request.chef_model not in MODEL_REGISTRY and not request.chef_provider_hint:
        raise HTTPException(400, f"Unknown chef model and no provider hint: {request.chef_model}")

    result = await run_chef(request, user_keys=request.user_keys)
    return result.model_dump()
