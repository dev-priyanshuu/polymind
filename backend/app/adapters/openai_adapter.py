"""OpenAI GPT adapter."""
from typing import AsyncIterator, Optional, List, Dict, Any
import time
import logging
import httpx
from openai import AsyncOpenAI, APIError, APITimeoutError

from app.adapters.base import LLMAdapter
from app.models.llm import LLMResponse, StreamChunk, ModelProvider

from langsmith import traceable

logger = logging.getLogger(__name__)


class OpenAIAdapter(LLMAdapter):
    def __init__(self, model_id: str = "gpt-4o", api_key: str = "", timeout: int = 30):
        super().__init__(model_id, api_key, timeout)
        self.client = AsyncOpenAI(api_key=api_key, timeout=timeout)

    @traceable(run_type="llm", name="OpenAI Complete")
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
                model=self.model_id,
                messages=messages,
                temperature=temperature,
                max_tokens=max_tokens,
            )
            latency_ms = (time.time() - start) * 1000
            input_tokens = response.usage.prompt_tokens
            output_tokens = response.usage.completion_tokens
            content = response.choices[0].message.content or ""

            return LLMResponse(
                model_id=self.model_id,
                provider=ModelProvider.OPENAI,
                display_name=self.display_name,
                content=content,
                input_tokens=input_tokens,
                output_tokens=output_tokens,
                latency_ms=latency_ms,
                cost_usd=self._calc_cost(input_tokens, output_tokens),
                success=True,
            )
        except Exception as e:
            logger.error(f"OpenAI error: {e}")
            return self._make_error_response(str(e))

    @traceable(run_type="llm", name="OpenAI Stream")
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
            async with self.client.chat.completions.stream(
                model=self.model_id,
                messages=messages,
                temperature=temperature,
                max_tokens=max_tokens,
            ) as stream:
                async for event in stream:
                    if event.choices and event.choices[0].delta.content:
                        yield StreamChunk(
                            model_id=self.model_id,
                            provider=ModelProvider.OPENAI,
                            display_name=self.display_name,
                            chunk=event.choices[0].delta.content,
                            is_final=False,
                        )
            yield StreamChunk(
                model_id=self.model_id,
                provider=ModelProvider.OPENAI,
                display_name=self.display_name,
                chunk="",
                is_final=True,
            )
        except Exception as e:
            logger.error(f"OpenAI stream error: {e}")
            yield StreamChunk(
                model_id=self.model_id,
                provider=ModelProvider.OPENAI,
                display_name=self.display_name,
                chunk="",
                error=str(e),
                is_final=True,
            )

    async def list_models(self) -> List[Dict[str, Any]]:
        """Fetch available GPT models from OpenAI."""
        try:
            res = await self.client.models.list()
            # Filter for relevant chat models to avoid clutter (gpt and o1 series)
            models = [
                {"id": m.id, "name": m.id} 
                for m in res.data 
                if any(x in m.id for x in ["gpt", "o1"])
            ]
            return sorted(models, key=lambda x: x["id"])
        except Exception as e:
            logger.error(f"OpenAI list_models error: {e}")
            return []
