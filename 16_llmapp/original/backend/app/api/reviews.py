import contextlib
import json
import logging

from fastapi import APIRouter, Depends, Query, Response
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from sse_starlette.sse import EventSourceResponse, ServerSentEvent

from app.core.database import async_session, get_db
from app.core.exceptions import NotFoundError, ProviderError
from app.core.security import get_current_user
from app.models.review import ReviewMessage, ReviewSession
from app.models.user import User
from app.schemas.reviews import (
    LocalReviewRequest,
    ReviewCreateResponse,
    ReviewRequest,
    ReviewSessionDetailResponse,
    ReviewSessionResponse,
)
from app.services.llm import OpenAIProvider, get_openai_provider, parse_stream_result

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/reviews", tags=["reviews"])

_MAX_STREAM_BUFFER = 2_000_000
_DEFAULT_PAGE_SIZE = 20
_MAX_PAGE_SIZE = 100


async def _create_session_and_user_message(
    db: AsyncSession,
    user: User,
    body: ReviewRequest | LocalReviewRequest,
    provider: str,
) -> ReviewSession:
    """Create a ReviewSession and user message. Flushes but does NOT commit."""
    session = ReviewSession(
        user_id=user.id,
        code=body.code,
        language=body.language,
        provider=provider,
        settings_json=body.settings.model_dump() if body.settings else None,
        execution_json=body.execution.model_dump() if body.execution else None,
    )
    db.add(session)
    await db.flush()

    user_msg = ReviewMessage(
        session_id=session.id,
        role="user",
        content_json={
            "type": "user_code",
            "code": body.code,
            "language": body.language,
        },
    )
    db.add(user_msg)
    await db.flush()

    return session


async def _persist_error_message(session_id: int, raw_buffer: str) -> None:
    """Persist an error message to the review session in a separate DB session."""
    try:
        async with async_session() as db_write:
            db_write.add(
                ReviewMessage(
                    session_id=session_id,
                    role="assistant",
                    content_json={
                        "type": "error",
                        "raw": raw_buffer[:2000],
                    },
                )
            )
            await db_write.commit()
    except Exception:
        logger.exception("Failed to persist error message")


@router.post("", response_model=ReviewCreateResponse)
async def create_review(
    body: ReviewRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    provider: OpenAIProvider = Depends(get_openai_provider),
):
    result = await provider.generate_review(body.code, body.language, body.settings)

    session = await _create_session_and_user_message(db, user, body, "openai")

    assistant_msg = ReviewMessage(
        session_id=session.id, role="assistant", content_json=result.model_dump()
    )
    db.add(assistant_msg)
    await db.flush()

    return ReviewCreateResponse(session_id=session.id, result=result)


@router.post("/local", response_model=ReviewCreateResponse)
async def create_local_review(
    body: LocalReviewRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    session = await _create_session_and_user_message(db, user, body, "local")

    assistant_msg = ReviewMessage(
        session_id=session.id,
        role="assistant",
        content_json=body.result.model_dump(),
    )
    db.add(assistant_msg)
    await db.flush()

    return ReviewCreateResponse(session_id=session.id, result=body.result)


@router.post("/stream")
async def stream_review(
    body: ReviewRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    provider: OpenAIProvider = Depends(get_openai_provider),
):
    session = await _create_session_and_user_message(db, user, body, "openai")
    await db.commit()
    session_id = session.id

    async def event_generator():
        full_buffer = ""
        line_buffer = ""

        try:
            yield ServerSentEvent(
                data=json.dumps({"session_id": session_id}), event="meta"
            )

            async for chunk in provider.generate_review_stream(
                body.code, body.language, body.settings
            ):
                full_buffer += chunk
                if len(full_buffer) > _MAX_STREAM_BUFFER:
                    raise ProviderError(
                        "Response exceeded maximum size",
                        details={"max_chars": _MAX_STREAM_BUFFER},
                    )

                line_buffer += chunk
                while "\n" in line_buffer:
                    line, line_buffer = line_buffer.split("\n", 1)
                    line = line.strip()
                    if line:
                        yield ServerSentEvent(
                            data=json.dumps({"chunk": line}), event="token"
                        )

            remaining = line_buffer.strip()
            if remaining:
                yield ServerSentEvent(
                    data=json.dumps({"chunk": remaining}), event="token"
                )

            result = parse_stream_result(full_buffer)

            async with async_session() as db_write:
                db_write.add(
                    ReviewMessage(
                        session_id=session_id,
                        role="assistant",
                        content_json=result.model_dump(),
                    )
                )
                await db_write.commit()

            yield ServerSentEvent(data=json.dumps(result.model_dump()), event="result")

        except ProviderError as e:
            await _persist_error_message(session_id, full_buffer)
            yield ServerSentEvent(
                data=json.dumps(
                    {
                        "code": e.code,
                        "message": e.message,
                        "details": e.details or {},
                    }
                ),
                event="error",
            )

        except Exception:
            logger.exception("Unexpected error during review stream")
            await _persist_error_message(session_id, full_buffer)
            yield ServerSentEvent(
                data=json.dumps(
                    {
                        "code": "internal_error",
                        "message": "An unexpected error occurred",
                    }
                ),
                event="error",
            )

        finally:
            with contextlib.suppress(Exception):
                yield ServerSentEvent(data="{}", event="done")

    return EventSourceResponse(event_generator())


@router.get("", response_model=list[ReviewSessionResponse])
async def list_reviews(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    limit: int = Query(default=_DEFAULT_PAGE_SIZE, ge=1, le=_MAX_PAGE_SIZE),
    offset: int = Query(default=0, ge=0),
):
    result = await db.execute(
        select(ReviewSession)
        .where(ReviewSession.user_id == user.id)
        .order_by(ReviewSession.created_at.desc())
        .limit(limit)
        .offset(offset)
    )
    sessions = result.scalars().all()

    return sessions


@router.delete("/{session_id}", status_code=204)
async def delete_review(
    session_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(ReviewSession)
        .where(ReviewSession.id == session_id, ReviewSession.user_id == user.id)
    )
    session = result.scalar_one_or_none()
    if session is None:
        raise NotFoundError("Review session not found")

    await db.delete(session)
    return Response(status_code=204)


@router.get("/{session_id}", response_model=ReviewSessionDetailResponse)
async def get_review(
    session_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(ReviewSession)
        .where(ReviewSession.id == session_id, ReviewSession.user_id == user.id)
        .options(selectinload(ReviewSession.messages))
    )
    session = result.scalar_one_or_none()
    if session is None:
        raise NotFoundError("Review session not found")
    return session
