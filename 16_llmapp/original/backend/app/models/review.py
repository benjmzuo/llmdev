from datetime import UTC, datetime
from typing import Any

from sqlalchemy import JSON as SA_JSON
from sqlalchemy import ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base


class ReviewSession(Base):
    __tablename__ = "review_sessions"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    code: Mapped[str] = mapped_column(Text)
    language: Mapped[str] = mapped_column(String(50))
    provider: Mapped[str] = mapped_column(String(20))
    settings_json: Mapped[dict[str, Any] | None] = mapped_column(SA_JSON, nullable=True)
    execution_json: Mapped[dict[str, Any] | None] = mapped_column(
        SA_JSON, nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(default=lambda: datetime.now(UTC))

    user: Mapped["User"] = relationship(back_populates="review_sessions")  # noqa: F821
    messages: Mapped[list["ReviewMessage"]] = relationship(
        back_populates="session",
        order_by="ReviewMessage.id",
        cascade="all, delete-orphan",
    )


class ReviewMessage(Base):
    __tablename__ = "review_messages"

    id: Mapped[int] = mapped_column(primary_key=True)
    session_id: Mapped[int] = mapped_column(
        ForeignKey("review_sessions.id", ondelete="CASCADE"), index=True
    )
    role: Mapped[str] = mapped_column(String(20))
    content_json: Mapped[dict[str, Any]] = mapped_column(SA_JSON)
    created_at: Mapped[datetime] = mapped_column(default=lambda: datetime.now(UTC))

    session: Mapped["ReviewSession"] = relationship(back_populates="messages")
