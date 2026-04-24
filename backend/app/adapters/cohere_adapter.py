"""Cohere Command R+ adapter."""
from typing import AsyncIterator, Optional, List, Dict, Any
import time
import logging
import cohere

from app.adapters.base import LLMAdapter
from app.models.llm import LLMResponse, StreamChunk, ModelProvider

from langsmith import traceable

logger = logging.getLogger(__name__)


class CohereAdapter(LLMAdapter):
    def __init__(self, model_id: str = "command-r-plus", api_key: str = "", timeout: int = 30):
        super().__init__(model_id, api_key, timeout)
        self.client = cohere.AsyncClientV2(api_key=api_key)

    @traceable(run_type="llm", name="Cohere Complete")
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
            response = await self.client.chat(
                model=self.model_id,
                messages=messages,
                temperature=temperature,
                max_tokens=max_tokens,
            )
            latency_ms = (time.time() - start) * 1000
            content = response.message.content[0].text if response.message.content else ""
            input_tokens = response.usage.billed_units.input_tokens if response.usage else 0
            output_tokens = response.usage.billed_units.output_tokens if response.usage else 0

            return LLMResponse(
                model_id=self.model_id,
                provider=ModelProvider.COHERE,
                display_name=self.display_name,
                content=content,
                input_tokens=int(input_tokens),
                output_tokens=int(output_tokens),
                latency_ms=latency_ms,
                cost_usd=self._calc_cost(int(input_tokens), int(output_tokens)),
                success=True,
            )
        except Exception as e:
            logger.error(f"Cohere error: {e}")
            return self._make_error_response(str(e))

    @traceable(run_type="llm", name="Cohere Stream")
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
            async for event in self.client.chat_stream(
                model=self.model_id,
                messages=messages,
                temperature=temperature,
                max_tokens=max_tokens,
            ):
                if hasattr(event, "type"):
                    if event.type == "content-delta" and hasattr(event, "delta"):
                        text = event.delta.message.content.text if event.delta.message.content else ""
                        if text:
                            yield StreamChunk(
                                model_id=self.model_id, provider=ModelProvider.COHERE,
                                display_name=self.display_name, chunk=text, is_final=False,
                            )
            yield StreamChunk(
                model_id=self.model_id, provider=ModelProvider.COHERE,
                display_name=self.display_name, chunk="", is_final=True,
            )
        except Exception as e:
            logger.error(f"Cohere stream error: {e}")
            yield StreamChunk(
                model_id=self.model_id, provider=ModelProvider.COHERE,
                display_name=self.display_name, chunk="", error=str(e), is_final=True,
            )

    async def list_models(self) -> List[Dict[str, Any]]:
        """Fetch available Command models from Cohere."""
        try:
            # Note: Cohere V2 SDK models.list
            res = await self.client.models.list()
            # Filter for relevant chat models
            models = [
                {"id": m.name, "name": m.name} 
                for m in res.models 
                if m.endpoints and "chat" in m.endpoints
            ]
            return sorted(models, key=lambda x: x["id"])
        except Exception as e:
            logger.error(f"Cohere list_models error: {e}")
            return []
