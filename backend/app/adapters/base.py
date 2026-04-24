"""
Base LLM Adapter — abstract interface every provider must implement.
"""
from abc import ABC, abstractmethod
from typing import AsyncIterator, Optional, List, Dict, Any
import time
import logging

from app.models.llm import LLMResponse, StreamChunk, MODEL_REGISTRY

logger = logging.getLogger(__name__)


class LLMAdapter(ABC):
    """Abstract base class for all LLM provider adapters."""

    def __init__(self, model_id: str, api_key: str, timeout: int = 30):
        self.model_id = model_id
        self.api_key = api_key
        self.timeout = timeout
        self.model_info = MODEL_REGISTRY.get(model_id)

    @property
    def display_name(self) -> str:
        return self.model_info.display_name if self.model_info else self.model_id

    @property
    def provider(self) -> str:
        return self.model_info.provider.value if self.model_info else "unknown"

    @abstractmethod
    async def complete(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: int = 2048,
    ) -> LLMResponse:
        """Return a complete response (non-streaming)."""
        ...

    @abstractmethod
    async def stream(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: int = 2048,
    ) -> AsyncIterator[StreamChunk]:
        """Yield streaming chunks as they arrive."""
        ...

    @abstractmethod
    async def list_models(self) -> List[Dict[str, Any]]:
        """Fetch available models from the provider API."""
        ...

    def _make_error_response(self, error: str) -> LLMResponse:
        return LLMResponse(
            model_id=self.model_id,
            provider=self.model_info.provider if self.model_info else "unknown",
            display_name=self.display_name,
            content="",
            error=error,
            success=False,
        )

    def _calc_cost(self, input_tokens: int, output_tokens: int) -> float:
        if not self.model_info:
            return 0.0
        return round(
            (input_tokens / 1_000_000) * self.model_info.cost_per_1m_input_tokens
            + (output_tokens / 1_000_000) * self.model_info.cost_per_1m_output_tokens,
            8,
        )
