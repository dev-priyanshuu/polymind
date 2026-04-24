"""Anthropic Claude adapter."""
from typing import AsyncIterator, Optional, List, Dict, Any
import time
import logging
import anthropic

from app.adapters.base import LLMAdapter
from app.models.llm import LLMResponse, StreamChunk, ModelProvider

from langsmith import traceable

logger = logging.getLogger(__name__)


class AnthropicAdapter(LLMAdapter):
    def __init__(self, model_id: str = "claude-sonnet-4-5", api_key: str = "", timeout: int = 30):
        super().__init__(model_id, api_key, timeout)
        self.client = anthropic.AsyncAnthropic(api_key=api_key)

    @traceable(run_type="llm", name="Anthropic Complete")
    async def complete(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: int = 2048,
    ) -> LLMResponse:
        start = time.time()
        kwargs = dict(
            model=self.model_id,
            max_tokens=max_tokens,
            temperature=temperature,
            messages=[{"role": "user", "content": prompt}],
        )
        if system_prompt:
            kwargs["system"] = system_prompt

        try:
            response = await self.client.messages.create(**kwargs)
            latency_ms = (time.time() - start) * 1000
            input_tokens = response.usage.input_tokens
            output_tokens = response.usage.output_tokens
            content = response.content[0].text if response.content else ""

            return LLMResponse(
                model_id=self.model_id,
                provider=ModelProvider.ANTHROPIC,
                display_name=self.display_name,
                content=content,
                input_tokens=input_tokens,
                output_tokens=output_tokens,
                latency_ms=latency_ms,
                cost_usd=self._calc_cost(input_tokens, output_tokens),
                success=True,
            )
        except Exception as e:
            logger.error(f"Anthropic error: {e}")
            return self._make_error_response(str(e))

    @traceable(run_type="llm", name="Anthropic Stream")
    async def stream(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: int = 2048,
    ) -> AsyncIterator[StreamChunk]:
        kwargs = dict(
            model=self.model_id,
            max_tokens=max_tokens,
            temperature=temperature,
            messages=[{"role": "user", "content": prompt}],
        )
        if system_prompt:
            kwargs["system"] = system_prompt

        try:
            async with self.client.messages.stream(**kwargs) as stream:
                async for text in stream.text_stream:
                    yield StreamChunk(
                        model_id=self.model_id,
                        provider=ModelProvider.ANTHROPIC,
                        display_name=self.display_name,
                        chunk=text,
                        is_final=False,
                    )
            yield StreamChunk(
                model_id=self.model_id,
                provider=ModelProvider.ANTHROPIC,
                display_name=self.display_name,
                chunk="",
                is_final=True,
            )
        except Exception as e:
            logger.error(f"Anthropic stream error: {e}")
            yield StreamChunk(
                model_id=self.model_id,
                provider=ModelProvider.ANTHROPIC,
                display_name=self.display_name,
                chunk="",
                error=str(e),
                is_final=True,
            )

    async def list_models(self) -> List[Dict[str, Any]]:
        """Fetch available Claude models from Anthropic."""
        try:
            # Note: Anthropic models.list
            res = await self.client.models.list()
            models = [
                {"id": m.id, "name": m.display_name or m.id} 
                for m in res.data
            ]
            return sorted(models, key=lambda x: x["id"])
        except Exception as e:
            logger.error(f"Anthropic list_models error: {e}")
            # If API fails or older SDK, return an empty list 
            # (frontend will fall back to static defaults)
            return []
