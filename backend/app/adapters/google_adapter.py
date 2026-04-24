"""Google Gemini adapter — using google-genai SDK."""
from typing import AsyncIterator, Optional, List, Dict, Any
import time
import logging

from app.adapters.base import LLMAdapter
from app.models.llm import LLMResponse, StreamChunk, ModelProvider

from langsmith import traceable

logger = logging.getLogger(__name__)


class GoogleAdapter(LLMAdapter):
    def __init__(self, model_id: str = "gemini-2.0-flash", api_key: str = "", timeout: int = 30):
        super().__init__(model_id, api_key, timeout)
        self.api_key = api_key

    def _get_client(self):
        try:
            from google import genai
            return genai.Client(api_key=self.api_key)
        except ImportError:
            return None

    @traceable(run_type="llm", name="Google Complete")
    async def complete(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: int = 2048,
    ) -> LLMResponse:
        start = time.time()
        client = self._get_client()
        if not client:
            return self._make_error_response("google-genai not installed. Run: pip install google-genai")

        full_prompt = f"{system_prompt}\n\n{prompt}" if system_prompt else prompt

        try:
            from google.genai import types
            response = await client.aio.models.generate_content(
                model=self.model_id,
                contents=full_prompt,
                config=types.GenerateContentConfig(
                    temperature=temperature,
                    max_output_tokens=max_tokens,
                ),
            )
            latency_ms = (time.time() - start) * 1000
            content = response.text or ""
            input_tokens = response.usage_metadata.prompt_token_count if response.usage_metadata else 0
            output_tokens = response.usage_metadata.candidates_token_count if response.usage_metadata else 0

            return LLMResponse(
                model_id=self.model_id,
                provider=ModelProvider.GOOGLE,
                display_name=self.display_name,
                content=content,
                input_tokens=input_tokens,
                output_tokens=output_tokens,
                latency_ms=latency_ms,
                cost_usd=self._calc_cost(input_tokens, output_tokens),
                success=True,
            )
        except Exception as e:
            logger.error(f"Google Gemini error: {e}")
            return self._make_error_response(str(e))

    @traceable(run_type="llm", name="Google Stream")
    async def stream(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: int = 2048,
    ) -> AsyncIterator[StreamChunk]:
        client = self._get_client()
        if not client:
            yield StreamChunk(
                model_id=self.model_id, provider=ModelProvider.GOOGLE,
                display_name=self.display_name, chunk="",
                error="google-genai not installed", is_final=True,
            )
            return

        full_prompt = f"{system_prompt}\n\n{prompt}" if system_prompt else prompt

        try:
            from google.genai import types
            async for chunk in await client.aio.models.generate_content_stream(
                model=self.model_id,
                contents=full_prompt,
                config=types.GenerateContentConfig(
                    temperature=temperature,
                    max_output_tokens=max_tokens,
                ),
            ):
                if chunk.text:
                    yield StreamChunk(
                        model_id=self.model_id,
                        provider=ModelProvider.GOOGLE,
                        display_name=self.display_name,
                        chunk=chunk.text,
                        is_final=False,
                    )
            yield StreamChunk(
                model_id=self.model_id, provider=ModelProvider.GOOGLE,
                display_name=self.display_name, chunk="", is_final=True,
            )
        except Exception as e:
            logger.error(f"Google stream error: {e}")
            yield StreamChunk(
                model_id=self.model_id, provider=ModelProvider.GOOGLE,
                display_name=self.display_name, chunk="", error=str(e), is_final=True,
            )

    async def list_models(self) -> List[Dict[str, Any]]:
        """Fetch available Gemini models from Google."""
        client = self._get_client()
        if not client:
            return []
        try:
            # Note: models.list is usually a generator in genai SDK
            res = await client.aio.models.list()
            models = []
            async for m in res:
                if "gemini" in m.name:
                    # m.name is usually "models/gemini-..."
                    short_id = m.name.replace("models/", "")
                    models.append({"id": short_id, "name": m.display_name or short_id})
            return sorted(models, key=lambda x: x["id"])
        except Exception as e:
            logger.error(f"Google list_models error: {e}")
            return []
