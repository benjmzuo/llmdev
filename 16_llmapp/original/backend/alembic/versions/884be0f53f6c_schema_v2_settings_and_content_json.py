"""schema v2 settings and content json

Revision ID: 884be0f53f6c
Revises: 41ed7a57284c
Create Date: 2026-02-26 00:49:19.163563

"""

from typing import Sequence, Union

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "884be0f53f6c"
down_revision: Union[str, Sequence[str], None] = "41ed7a57284c"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

# Convention so Alembic can name reflected (unnamed) FK constraints for drop.
_naming = {"fk": "fk_%(table_name)s_%(column_0_name)s_%(referred_table_name)s"}


def upgrade() -> None:
    """Add settings_json, rename content→content_json (JSON), add CASCADE FKs."""
    # -- 1. review_sessions: add settings_json + CASCADE FK -------------------
    with op.batch_alter_table(
        "review_sessions", recreate="always", naming_convention=_naming
    ) as batch_op:
        batch_op.add_column(sa.Column("settings_json", sa.JSON(), nullable=True))
        batch_op.drop_constraint("fk_review_sessions_user_id_users", type_="foreignkey")
        batch_op.create_foreign_key(
            "fk_review_sessions_user_id_users",
            "users",
            ["user_id"],
            ["id"],
            ondelete="CASCADE",
        )

    # -- 2. review_messages: add content_json column --------------------------
    with op.batch_alter_table("review_messages") as batch_op:
        batch_op.add_column(sa.Column("content_json", sa.JSON(), nullable=True))

    # -- 3. Backfill content_json from content --------------------------------
    op.execute(
        "UPDATE review_messages "
        "SET content_json = json_object('type','user_code','code',content) "
        "WHERE role='user'"
    )
    op.execute(
        "UPDATE review_messages "
        "SET content_json = "
        "  CASE "
        "    WHEN json_valid(content) THEN json(content) "
        "    ELSE json_object('type','assistant_text','text',content) "
        "  END "
        "WHERE role='assistant'"
    )

    # -- 4. review_messages: drop content, enforce NOT NULL, CASCADE FK -------
    with op.batch_alter_table(
        "review_messages", recreate="always", naming_convention=_naming
    ) as batch_op:
        batch_op.drop_column("content")
        batch_op.alter_column(
            "content_json",
            existing_type=sa.JSON(),
            nullable=False,
        )
        batch_op.drop_constraint(
            "fk_review_messages_session_id_review_sessions", type_="foreignkey"
        )
        batch_op.create_foreign_key(
            "fk_review_messages_session_id_review_sessions",
            "review_sessions",
            ["session_id"],
            ["id"],
            ondelete="CASCADE",
        )


def downgrade() -> None:
    """Reverse: restore content (Text), drop settings_json, remove CASCADE."""
    # -- 1. review_messages: add back content column --------------------------
    with op.batch_alter_table("review_messages") as batch_op:
        batch_op.add_column(sa.Column("content", sa.Text(), nullable=True))

    # -- 2. Backfill content from content_json --------------------------------
    op.execute(
        "UPDATE review_messages "
        "SET content = json_extract(content_json, '$.code') "
        "WHERE role='user'"
    )
    op.execute(
        "UPDATE review_messages SET content = json(content_json) WHERE role='assistant'"
    )

    # -- 3. review_messages: drop content_json, restore original FK -----------
    with op.batch_alter_table(
        "review_messages", recreate="always", naming_convention=_naming
    ) as batch_op:
        batch_op.drop_column("content_json")
        batch_op.alter_column(
            "content",
            existing_type=sa.Text(),
            nullable=False,
        )
        batch_op.drop_constraint(
            "fk_review_messages_session_id_review_sessions", type_="foreignkey"
        )
        batch_op.create_foreign_key(
            "fk_review_messages_session_id_review_sessions",
            "review_sessions",
            ["session_id"],
            ["id"],
        )

    # -- 4. review_sessions: drop settings_json, restore original FK ----------
    with op.batch_alter_table(
        "review_sessions", recreate="always", naming_convention=_naming
    ) as batch_op:
        batch_op.drop_column("settings_json")
        batch_op.drop_constraint("fk_review_sessions_user_id_users", type_="foreignkey")
        batch_op.create_foreign_key(
            "fk_review_sessions_user_id_users",
            "users",
            ["user_id"],
            ["id"],
        )
