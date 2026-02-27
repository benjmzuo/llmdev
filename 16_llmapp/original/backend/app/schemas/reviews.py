from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, Field

FocusArea = Literal["security", "performance", "readability", "maintainability"]

Severity = Literal["info", "warning", "error"]
Strictness = Literal["lenient", "normal", "strict"]
DetailLevel = Literal["brief", "normal", "deep"]
OutputLanguage = Literal["en", "ja"]


class ReviewIssue(BaseModel):
    line: int | None = None
    severity: Severity = "info"
    message: str
    suggestion: str | None = None


class ReviewResult(BaseModel):
    summary: str
    issues: list[ReviewIssue] = Field(default_factory=list)
    suggestions: list[str] = Field(default_factory=list)
    corrected_code: str | None = None


class ExecutionResult(BaseModel):
    stdout: str = ""
    stderr: str = ""
    exit_code: int = 0
    duration_ms: int = 0


class ReviewSettings(BaseModel):
    strictness: Strictness = "normal"
    detail_level: DetailLevel = "normal"
    focus_areas: list[FocusArea] = Field(default_factory=list)
    output_language: OutputLanguage = "en"


_MAX_CODE_LENGTH = 500_000


class ReviewRequest(BaseModel):
    code: str = Field(max_length=_MAX_CODE_LENGTH)
    language: str
    settings: ReviewSettings = Field(default_factory=ReviewSettings)
    execution: ExecutionResult | None = None


class LocalReviewRequest(BaseModel):
    code: str = Field(max_length=_MAX_CODE_LENGTH)
    language: str
    result: ReviewResult
    settings: ReviewSettings | None = None
    execution: ExecutionResult | None = None


class ReviewMessageResponse(BaseModel):
    id: int
    role: str
    content_json: dict[str, Any]
    created_at: datetime

    model_config = {"from_attributes": True}


class ReviewSessionResponse(BaseModel):
    id: int
    code: str
    language: str
    provider: str
    settings_json: dict[str, Any] | None = None
    execution_json: dict[str, Any] | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class ReviewSessionDetailResponse(ReviewSessionResponse):
    messages: list[ReviewMessageResponse] = Field(default_factory=list)


class ReviewCreateResponse(BaseModel):
    session_id: int
    result: ReviewResult
