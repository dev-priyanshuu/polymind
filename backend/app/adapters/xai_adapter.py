"""xAI Grok adapter (uses OpenAI-compatible API)."""
from typing import AsyncIterator, Optional, List, Dict, Any
import time
import logging
from openai import AsyncOpenAI

from app.adapters.base import LLMAdapter
from app.models.llm import LLMResponse, StreamChunk, ModelProvider

from langsmith import traceable

logger = logging.getLogger(__name__)

XAI_BASE_URL = "https://api.x.ai/v1"


class XAIAdapter(LLMAdapter):
    def __init__(self, model_id: str = "grok-3", api_key: str = "", timeout: int = 30):
        super().__init__(model_id, api_key, timeout)
        self.client = AsyncOpenAI(api_key=api_key, base_url=XAI_BASE_URL, timeout=timeout)

    @traceable(run_type="llm", name="xAI Complete")
    async def complete(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: int = 2048,
    ) -> LLMResponse:
        start = time.time()
        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})

        try:
            response = await self.client.chat.completions.create(
                model=self.model_id, messages=messages, temperature=temperature, max_tokens=max_tokens
            )
            latency_ms = (time.time() - start) * 1000
            input_tokens = response.usage.prompt_tokens
            output_tokens = response.usage.completion_tokens
            content = response.choices[0].message.content or ""

            return LLMResponse(
                model_id=self.model_id,
                provider=ModelProvider.XAI,
                display_name=self.display_name,
                content=content,
                input_tokens=input_tokens,
                output_tokens=output_tokens,
                latency_ms=latency_ms,
                cost_usd=self._calc_cost(input_tokens, output_tokens),
                success=True,
            )
        except Exception as e:
            logger.error(f"xAI Grok error: {e}")
            return self._make_error_response(str(e))

    @traceable(run_type="llm", name="xAI Stream")
    async def stream(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: int = 2048,
    ) -> AsyncIterator[StreamChunk]:
        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})

        try:
            stream = await self.client.chat.completions.create(
                model=self.model_id, messages=messages, temperature=temperature,
                max_tokens=max_tokens, stream=True,
            )
            async for chunk in stream:
                delta = chunk.choices[0].delta.content if chunk.choices else None
                if delta:
                    yield StreamChunk(
                        model_id=self.model_id, provider=ModelProvider.XAI,
                        display_name=self.display_name, chunk=delta, is_final=False,
                    )
            yield StreamChunk(
                model_id=self.model_id, provider=ModelProvider.XAI,
                display_name=self.display_name, chunk="", is_final=True,
            )
        except Exception as e:
            logger.error(f"xAI stream error: {e}")
            yield StreamChunk(
                model_id=self.model_id, provider=ModelProvider.XAI,
                display_name=self.display_name, chunk="", error=str(e), is_final=True,
            )

    async def list_models(self) -> List[Dict[str, Any]]:
        """Fetch available Grok models from xAI."""
        try:
            # xAI uses OpenAI compatible list endpoint
            res = await self.client.models.list()
            models = [
                {"id": m.id, "name": m.id} 
                for m in res.data
            ]
            return sorted(models, key=lambda x: x["id"])
        except Exception as e:
            logger.error(f"xAI list_models error: {e}")
            return []
