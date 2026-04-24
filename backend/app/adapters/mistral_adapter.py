"""Mistral Large adapter — using mistralai v1+ SDK."""
from typing import AsyncIterator, Optional, List, Dict, Any
import time
import logging
from mistralai.client import Mistral as MistralClient

from app.adapters.base import LLMAdapter
from app.models.llm import LLMResponse, StreamChunk, ModelProvider

from langsmith import traceable

logger = logging.getLogger(__name__)


class MistralAdapter(LLMAdapter):
    def __init__(self, model_id: str = "mistral-large-latest", api_key: str = "", timeout: int = 30):
        super().__init__(model_id, api_key, timeout)
        self.client = MistralClient(api_key=api_key)

    @traceable(run_type="llm", name="Mistral Complete")
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
            response = await self.client.chat.complete_async(
                model=self.model_id,
                messages=messages,
                temperature=temperature,
                max_tokens=max_tokens,
            )
            latency_ms = (time.time() - start) * 1000
            input_tokens = response.usage.prompt_tokens if response.usage else 0
            output_tokens = response.usage.completion_tokens if response.usage else 0
            content = response.choices[0].message.content or "" if response.choices else ""

            return LLMResponse(
                model_id=self.model_id,
                provider=ModelProvider.MISTRAL,
                display_name=self.display_name,
                content=content,
                input_tokens=input_tokens,
                output_tokens=output_tokens,
                latency_ms=latency_ms,
                cost_usd=self._calc_cost(input_tokens, output_tokens),
                success=True,
            )
        except Exception as e:
            logger.error(f"Mistral error: {e}")
            return self._make_error_response(str(e))

    @traceable(run_type="llm", name="Mistral Stream")
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
            stream_response = await self.client.chat.stream_async(
                model=self.model_id,
                messages=messages,
                temperature=temperature,
                max_tokens=max_tokens,
            )
            async for event in stream_response:
                if event.data.choices:
                    delta = event.data.choices[0].delta.content
                    if delta:
                        yield StreamChunk(
                            model_id=self.model_id, provider=ModelProvider.MISTRAL,
                            display_name=self.display_name, chunk=delta, is_final=False,
                        )
            yield StreamChunk(
                model_id=self.model_id, provider=ModelProvider.MISTRAL,
                display_name=self.display_name, chunk="", is_final=True,
            )
        except Exception as e:
            logger.error(f"Mistral stream error: {e}")
            yield StreamChunk(
                model_id=self.model_id, provider=ModelProvider.MISTRAL,
                display_name=self.display_name, chunk="", error=str(e), is_final=True,
            )

    async def list_models(self) -> List[Dict[str, Any]]:
        """Fetch available models from Mistral."""
        try:
            # Note: mistralai models.list
            res = await self.client.models.list_async()
            models = [
                {"id": m.id, "name": m.id} 
                for m in res.data
            ]
            return sorted(models, key=lambda x: x["id"])
        except Exception as e:
            logger.error(f"Mistral list_models error: {e}")
            return []
