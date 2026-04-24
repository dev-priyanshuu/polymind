"""
Gateway service — resolves adapters and orchestrates parallel fan-out.
"""
from typing import Optional, Dict, List
import asyncio
import logging

from app.adapters.base import LLMAdapter
from app.adapters.openai_adapter import OpenAIAdapter
from app.adapters.anthropic_adapter import AnthropicAdapter
from app.adapters.google_adapter import GoogleAdapter
from app.adapters.xai_adapter import XAIAdapter
from app.adapters.cohere_adapter import CohereAdapter
from app.adapters.mistral_adapter import MistralAdapter
from app.models.llm import LLMResponse, MODEL_REGISTRY, ModelProvider
from app.config import settings

logger = logging.getLogger(__name__)


def build_adapter(model_id: str, user_keys: Optional[Dict[str, str]] = None, provider_hint: Optional[str] = None) -> Optional[LLMAdapter]:
    """
    Build an adapter for the given model_id.
    user_keys: {provider: api_key}
    provider_hint: Explicit provider name if model_id is not in registry.
    """
    info = MODEL_REGISTRY.get(model_id)
    provider = None
    
    if info:
        provider = info.provider
    elif provider_hint:
        try:
            provider = ModelProvider(provider_hint)
        except ValueError:
            logger.warning(f"Invalid provider hint: {provider_hint}")
            return None
    else:
        logger.warning(f"Unknown model_id and no provider hint: {model_id}")
        return None

    timeout = settings.DEFAULT_PROVIDER_TIMEOUT

    def _key(provider_name: str, env_val: Optional[str]) -> str:
        if user_keys and provider_name in user_keys:
            return user_keys[provider_name]
        return env_val or ""

    if provider == ModelProvider.OPENAI:
        key = _key("openai", settings.OPENAI_API_KEY)
        return OpenAIAdapter(model_id=model_id, api_key=key, timeout=timeout) if key else None

    elif provider == ModelProvider.ANTHROPIC:
        key = _key("anthropic", settings.ANTHROPIC_API_KEY)
        return AnthropicAdapter(model_id=model_id, api_key=key, timeout=timeout) if key else None

    elif provider == ModelProvider.GOOGLE:
        key = _key("google", settings.GOOGLE_API_KEY)
        return GoogleAdapter(model_id=model_id, api_key=key, timeout=timeout) if key else None

    elif provider == ModelProvider.XAI:
        key = _key("xai", settings.XAI_API_KEY)
        return XAIAdapter(model_id=model_id, api_key=key, timeout=timeout) if key else None

    elif provider == ModelProvider.COHERE:
        key = _key("cohere", settings.COHERE_API_KEY)
        return CohereAdapter(model_id=model_id, api_key=key, timeout=timeout) if key else None

    elif provider == ModelProvider.MISTRAL:
        key = _key("mistral", settings.MISTRAL_API_KEY)
        return MistralAdapter(model_id=model_id, api_key=key, timeout=timeout) if key else None

    return None


async def run_parallel_complete(
    prompt: str,
    model_ids: List[str],
    system_prompt: Optional[str] = None,
    temperature: float = 0.7,
    max_tokens: int = 2048,
    user_keys: Optional[Dict[str, str]] = None,
) -> List[LLMResponse]:
    """Fire all models simultaneously and return all responses."""

    async def _call_one(model_id: str) -> LLMResponse:
        adapter = build_adapter(model_id, user_keys)
        if not adapter:
            return LLMResponse(
                model_id=model_id,
                provider=MODEL_REGISTRY[model_id].provider if model_id in MODEL_REGISTRY else "unknown",
                display_name=model_id,
                content="",
                error="No API key configured for this provider.",
                success=False,
            )
        try:
            return await asyncio.wait_for(
                adapter.complete(prompt, system_prompt, temperature, max_tokens),
                timeout=settings.DEFAULT_PROVIDER_TIMEOUT + 5,
            )
        except asyncio.TimeoutError:
            return adapter._make_error_response(f"Timeout after {settings.DEFAULT_PROVIDER_TIMEOUT}s")
        except Exception as e:
            logger.error(f"Unexpected error for {model_id}: {e}")
            return adapter._make_error_response(str(e))

    tasks = [_call_one(m) for m in model_ids]
    results = await asyncio.gather(*tasks, return_exceptions=False)
    return list(results)
