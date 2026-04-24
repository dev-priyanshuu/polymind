"""
Chef Aggregator — synthesizes multiple LLM responses into one authoritative answer.
"""
import re
import logging
from typing import List, Optional

from app.adapters.base import LLMAdapter
from app.services.gateway import build_adapter
from app.models.llm import LLMResponse, ChefRequest, ChefResult

from langsmith import traceable

logger = logging.getLogger(__name__)

CHEF_SYSTEM_PROMPT = """You are an impartial expert synthesizer. You have received responses to the same question from multiple AI models. Your job is to:

1. Identify points all models agree on (mark as: ✅ Verified)
2. Identify points where models disagree (mark as: ⚠️ Disputed)
3. Flag any claim made by only one model that seems unsupported (mark as: ❌ Unverified)
4. Write a final, balanced answer that integrates the strongest points.

Do NOT favor the phrasing or structure of any one model's response.
Do NOT introduce information not present in the model responses.

Format your response as follows:

## Analysis

[Your claim-by-claim analysis using ✅ ⚠️ ❌ markers]

## Synthesis

[Your final integrated answer]

## Confidence Score

[A number from 0 to 100 representing the percentage of core claims that were verified across models]"""


def _build_chef_user_prompt(original_prompt: str, responses: List[LLMResponse]) -> str:
    parts = [f"**Original Question:** {original_prompt}\n\n---\n\n**Model Responses:**\n"]
    for r in responses:
        if r.success and r.content:
            parts.append(f"### {r.display_name}\n{r.content}\n")
        else:
            parts.append(f"### {r.display_name}\n*[Failed to respond: {r.error}]*\n")
    return "\n".join(parts)


def _parse_chef_output(raw: str) -> dict:
    """Parse structured output from chef model."""
    verified, disputed, unverified = [], [], []
    confidence = 0.5

    # Extract confidence score
    score_match = re.search(r"(?:Confidence Score[:\s]*)?(\d+(?:\.\d+)?)\s*(?:/\s*100|%)?", raw, re.IGNORECASE)
    if score_match:
        try:
            val = float(score_match.group(1))
            confidence = val / 100 if val > 1.0 else val
        except ValueError:
            pass

    # Extract claims by marker
    for line in raw.split("\n"):
        line = line.strip()
        if line.startswith("✅"):
            verified.append(line.lstrip("✅").strip())
        elif line.startswith("⚠️"):
            disputed.append(line.lstrip("⚠️").strip())
        elif line.startswith("❌"):
            unverified.append(line.lstrip("❌").strip())

    # Extract synthesis block
    synthesis = raw
    synthesis_match = re.search(r"## Synthesis\s*(.*?)(?:## |$)", raw, re.DOTALL)
    if synthesis_match:
        synthesis = synthesis_match.group(1).strip()

    return {
        "synthesis": synthesis,
        "confidence_score": round(confidence, 2),
        "verified_claims": verified,
        "disputed_claims": disputed,
        "unverified_claims": unverified,
    }


async def run_chef(
    request: ChefRequest,
    user_keys: Optional[dict] = None,
) -> ChefResult:
    """Run the chef aggregator and return structured results."""
    
    @traceable(run_type="chain", name="Chef Aggregator")
    async def _traced_chef(req: ChefRequest) -> ChefResult:
        adapter = build_adapter(req.chef_model, user_keys, provider_hint=req.chef_provider_hint)
        if not adapter:
            return ChefResult(
                synthesis="Chef model unavailable — no API key configured.",
                confidence_score=0.0,
                verified_claims=[],
                disputed_claims=[],
                unverified_claims=[],
                chef_model=req.chef_model,
                raw_output="",
            )

        user_prompt = _build_chef_user_prompt(req.original_prompt, req.model_responses)

        try:
            response = await adapter.complete(
                prompt=user_prompt,
                system_prompt=CHEF_SYSTEM_PROMPT,
                temperature=0.3,  # Lower temp for analysis
                max_tokens=4096,
            )
            raw = response.content or ""
            parsed = _parse_chef_output(raw)

            return ChefResult(
                synthesis=parsed["synthesis"],
                confidence_score=parsed["confidence_score"],
                verified_claims=parsed["verified_claims"],
                disputed_claims=parsed["disputed_claims"],
                unverified_claims=parsed["unverified_claims"],
                chef_model=req.chef_model,
                raw_output=raw,
            )
        except Exception as e:
            logger.error(f"Chef aggregator error: {e}")
            return ChefResult(
                synthesis=f"Chef synthesis failed: {str(e)}",
                confidence_score=0.0,
                verified_claims=[],
                disputed_claims=[],
                unverified_claims=[],
                chef_model=req.chef_model,
                raw_output="",
            )
            
    return await _traced_chef(request)
