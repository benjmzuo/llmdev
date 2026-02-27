import json
import logging
from abc import ABC, abstractmethod
from collections.abc import AsyncGenerator

from openai import APIError, APITimeoutError, AsyncOpenAI, RateLimitError

from app.core.config import get_settings
from app.core.exceptions import ProviderError
from app.schemas.reviews import ReviewResult, ReviewSettings
from app.services.prompts import (
    REVIEW_STREAM_SYSTEM_PROMPT,
    REVIEW_SYSTEM_PROMPT,
    build_user_prompt,
)

logger = logging.getLogger(__name__)


def _extract_json_object(text: str) -> str | None:
    """Extract the first top-level JSON object from text using depth tracking."""
    start = text.find("{")
    if start == -1:
        return None
    depth = 0
    in_string = False
    escape = False
    for i in range(start, len(text)):
        ch = text[i]
        if escape:
            escape = False
            continue
        if ch == "\\":
            escape = True
            continue
        if ch == '"':
            in_string = not in_string
            continue
        if in_string:
            continue
        if ch == "{":
            depth += 1
        elif ch == "}":
            depth -= 1
            if depth == 0:
                return text[start : i + 1]
    return None


def parse_review_result(raw_text: str) -> ReviewResult:
    try:
        data = json.loads(raw_text)
        return ReviewResult.model_validate(data)
    except (json.JSONDecodeError, ValueError):
        pass

    # Try extracting JSON object with proper depth tracking
    extracted = _extract_json_object(raw_text)
    if extracted is not None:
        try:
            data = json.loads(extracted)
            return ReviewResult.model_validate(data)
        except (json.JSONDecodeError, ValueError):
            pass

    raise ProviderError(
        message="Failed to parse LLM response as ReviewResult",
        details={"raw_output": raw_text[:1000]},
    )


def parse_stream_result(raw_text: str) -> ReviewResult:
    for line in reversed(raw_text.strip().splitlines()):
        line = line.strip()
        if not line:
            continue
        try:
            obj = json.loads(line)
        except json.JSONDecodeError:
            continue
        if isinstance(obj, dict) and obj.get("type") == "result" and "result" in obj:
            return ReviewResult.model_validate(obj["result"])
    # Fallback: entire text as single JSON
    return parse_review_result(raw_text)


class BaseProvider(ABC):
    @abstractmethod
    async def generate_review(
        self, code: str, language: str, settings: ReviewSettings
    ) -> ReviewResult: ...

    async def generate_review_stream(
        self, code: str, language: str, settings: ReviewSettings
    ) -> AsyncGenerator[str]:
        raise NotImplementedError("Streaming not supported by this provider")
        yield  # pragma: no cover


class OpenAIProvider(BaseProvider):
    def __init__(self, client: AsyncOpenAI, model: str):
        self.client = client
        self.model = model

    async def generate_review(
        self, code: str, language: str, settings: ReviewSettings
    ) -> ReviewResult:
        user_prompt = build_user_prompt(code, language, settings)
        messages = [
            {"role": "system", "content": REVIEW_SYSTEM_PROMPT},
            {"role": "user", "content": user_prompt},
        ]

        raw_text = await self._call_api(messages)
        return parse_review_result(raw_text)

    async def generate_review_stream(
        self, code: str, language: str, settings: ReviewSettings
    ) -> AsyncGenerator[str]:
        user_prompt = build_user_prompt(code, language, settings)
        messages = [
            {"role": "system", "content": REVIEW_STREAM_SYSTEM_PROMPT},
            {"role": "user", "content": user_prompt},
        ]
        try:
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=messages,
                stream=True,
            )
            async for chunk in response:
                delta = chunk.choices[0].delta if chunk.choices else None
                if delta and delta.content:
                    yield delta.content
        except (RateLimitError, APITimeoutError, APIError) as e:
            raise ProviderError(
                message=f"OpenAI API error: {e}",
                details={"provider": "openai", "error_type": type(e).__name__},
            ) from e

    async def _call_api(self, messages: list[dict]) -> str:
        try:
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=messages,
                response_format={"type": "json_object"},
            )
            return response.choices[0].message.content or ""
        except (RateLimitError, APITimeoutError, APIError) as e:
            if isinstance(e, APIError) and e.status_code == 400:
                return await self._call_api_plain(messages)
            raise ProviderError(
                message=f"OpenAI API error: {e}",
                details={"provider": "openai", "error_type": type(e).__name__},
            ) from e

    async def _call_api_plain(self, messages: list[dict]) -> str:
        try:
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=messages,
            )
            return response.choices[0].message.content or ""
        except (RateLimitError, APITimeoutError, APIError) as e:
            raise ProviderError(
                message=f"OpenAI API error: {e}",
                details={"provider": "openai", "error_type": type(e).__name__},
            ) from e


_openai_provider: OpenAIProvider | None = None


def get_openai_provider() -> OpenAIProvider:
    global _openai_provider  # noqa: PLW0603
    if _openai_provider is not None:
        return _openai_provider
    settings = get_settings()
    if not settings.openai_api_key:
        raise ProviderError(
            message="OpenAI API key not configured",
            details={"provider": "openai"},
        )
    client = AsyncOpenAI(api_key=settings.openai_api_key)
    _openai_provider = OpenAIProvider(client=client, model=settings.openai_model)
    return _openai_provider
