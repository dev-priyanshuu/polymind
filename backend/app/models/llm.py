from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from enum import Enum
import time


class ModelProvider(str, Enum):
    OPENAI = "openai"
    ANTHROPIC = "anthropic"
    GOOGLE = "google"
    XAI = "xai"
    COHERE = "cohere"
    MISTRAL = "mistral"


class ModelInfo(BaseModel):
    provider: ModelProvider
    model_id: str
    display_name: str
    context_window: int
    cost_per_1m_output_tokens: float  # USD
    cost_per_1m_input_tokens: float   # USD


# Registry of all supported models (Aligned with frontend)
MODEL_REGISTRY: Dict[str, ModelInfo] = {
    # OpenAI
    "gpt-4o": ModelInfo(
        provider=ModelProvider.OPENAI,
        model_id="gpt-4o",
        display_name="GPT-4o",
        context_window=128000,
        cost_per_1m_output_tokens=15.0,
        cost_per_1m_input_tokens=5.0,
    ),
    "o1-preview": ModelInfo(
        provider=ModelProvider.OPENAI,
        model_id="o1-preview",
        display_name="o1 Preview",
        context_window=128000,
        cost_per_1m_output_tokens=60.0,
        cost_per_1m_input_tokens=15.0,
    ),

    # Anthropic
    "claude-3-5-sonnet-latest": ModelInfo(
        provider=ModelProvider.ANTHROPIC,
        model_id="claude-3-5-sonnet-latest",
        display_name="Claude 3.5 Sonnet",
        context_window=200000,
        cost_per_1m_output_tokens=15.0,
        cost_per_1m_input_tokens=3.0,
    ),
    "claude-3-opus-20240229": ModelInfo(
        provider=ModelProvider.ANTHROPIC,
        model_id="claude-3-opus-20240229",
        display_name="Claude 3 Opus",
        context_window=200000,
        cost_per_1m_output_tokens=75.0,
        cost_per_1m_input_tokens=15.0,
    ),

    # Google
    "gemini-1.5-flash": ModelInfo(
        provider=ModelProvider.GOOGLE,
        model_id="gemini-1.5-flash",
        display_name="Gemini 1.5 Flash",
        context_window=1000000,
        cost_per_1m_output_tokens=0.3,
        cost_per_1m_input_tokens=0.075,
    ),
    "gemini-1.5-pro": ModelInfo(
        provider=ModelProvider.GOOGLE,
        model_id="gemini-1.5-pro",
        display_name="Gemini 1.5 Pro",
        context_window=2000000,
        cost_per_1m_output_tokens=10.5,
        cost_per_1m_input_tokens=3.5,
    ),

    # xAI
    "grok-2-1212": ModelInfo(
        provider=ModelProvider.XAI,
        model_id="grok-2-1212",
        display_name="Grok 2",
        context_window=131072,
        cost_per_1m_output_tokens=10.0,
        cost_per_1m_input_tokens=2.0,
    ),

    # Cohere
    "command-r-plus-08-2024": ModelInfo(
        provider=ModelProvider.COHERE,
        model_id="command-r-plus-08-2024",
        display_name="Command R+",
        context_window=128000,
        cost_per_1m_output_tokens=10.0,
        cost_per_1m_input_tokens=3.0,
    ),
    "command-r": ModelInfo(
        provider=ModelProvider.COHERE,
        model_id="command-r",
        display_name="Command R",
        context_window=128000,
        cost_per_1m_output_tokens=1.5,
        cost_per_1m_input_tokens=0.5,
    ),

    # Mistral
    "mistral-large-latest": ModelInfo(
        provider=ModelProvider.MISTRAL,
        model_id="mistral-large-latest",
        display_name="Mistral Large",
        context_window=128000,
        cost_per_1m_output_tokens=6.0,
        cost_per_1m_input_tokens=2.0,
    ),
    "mistral-medium": ModelInfo(
        provider=ModelProvider.MISTRAL,
        model_id="mistral-medium",
        display_name="Mistral Medium",
        context_window=32000,
        cost_per_1m_output_tokens=8.1,
        cost_per_1m_input_tokens=2.7,
    ),
}


class LLMResponse(BaseModel):
    """Normalized response from any LLM provider."""
    model_id: str
    provider: str
    display_name: str
    content: str
    input_tokens: int = 0
    output_tokens: int = 0
    latency_ms: float = 0.0
    cost_usd: float = 0.0
    error: Optional[str] = None
    success: bool = True
    started_at: float = Field(default_factory=time.time)

    def calculate_cost(self) -> float:
        info = MODEL_REGISTRY.get(self.model_id)
        if not info:
            return 0.0
        input_cost = (self.input_tokens / 1_000_000) * info.cost_per_1m_input_tokens
        output_cost = (self.output_tokens / 1_000_000) * info.cost_per_1m_output_tokens
        return round(input_cost + output_cost, 6)


class StreamChunk(BaseModel):
    """A single streaming chunk from a model."""
    model_id: str
    provider: str
    display_name: str
    chunk: str
    is_final: bool = False
    error: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None


class CompletionRequest(BaseModel):
    prompt: str = Field(..., min_length=1, max_length=32000)
    models: List[str] = Field(default=["gpt-4o", "claude-3-5-sonnet-latest"])
    system_prompt: Optional[str] = None
    temperature: float = Field(default=0.7, ge=0.0, le=2.0)
    max_tokens: int = Field(default=2048, ge=1, le=8192)
    stream: bool = True
    user_keys: Optional[Dict[str, str]] = None  # {provider: api_key}
    provider_hints: Optional[Dict[str, str]] = None  # {model_id: provider}


class ChefRequest(BaseModel):
    original_prompt: str
    model_responses: List[LLMResponse]
    chef_model: str = "claude-3-5-sonnet-latest"
    user_keys: Optional[Dict[str, str]] = None  # forwarded to chef adapter
    chef_provider_hint: Optional[str] = None  # Explicit provider for chef model


class ChefResult(BaseModel):
    synthesis: str
    confidence_score: float  # 0.0 - 1.0
    verified_claims: List[str]
    disputed_claims: List[str]
    unverified_claims: List[str]
    chef_model: str
    raw_output: str
