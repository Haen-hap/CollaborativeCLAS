"""Add assessment answer persistence and in-progress sessions.

Revision ID: 46ab19ce7c12
Revises: d866a5017df2
Create Date: 2026-10-23

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "46ab19ce7c12"
down_revision: Union[str, Sequence[str], None] = "d866a5017df2"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # PostgreSQL is the configured production database. Keep existing completion
    # values intact while adding the state required to accept an active session.
    op.execute("ALTER TYPE completionstatus ADD VALUE IF NOT EXISTS 'IN_PROGRESS'")

    op.create_table(
        "assessment_questions",
        sa.Column("question_id", sa.Integer(), nullable=False),
        sa.Column("choice_count", sa.Integer(), nullable=False),
        sa.CheckConstraint("choice_count > 0", name="ck_question_choice_count_positive"),
        sa.PrimaryKeyConstraint("question_id"),
    )
    op.create_table(
        "assessment_answers",
        sa.Column("session_id", sa.Integer(), nullable=False),
        sa.Column("question_id", sa.Integer(), nullable=False),
        sa.Column("answer_value", sa.Integer(), nullable=False),
        sa.CheckConstraint("answer_value >= 0", name="ck_answer_value_nonnegative"),
        sa.ForeignKeyConstraint(
            ["session_id"], ["assessment_sessions.session_id"], ondelete="CASCADE"
        ),
        sa.ForeignKeyConstraint(["question_id"], ["assessment_questions.question_id"]),
        sa.PrimaryKeyConstraint("session_id", "question_id"),
    )

    # These IDs and option counts match the six questions currently configured in
    # frontend/src/data/assessmentData.js. Text and scoring keys remain client-owned;
    # temporary frontend thresholds are not promoted to backend policy.
    questions = sa.table(
        "assessment_questions",
        sa.column("question_id", sa.Integer()),
        sa.column("choice_count", sa.Integer()),
    )
    op.bulk_insert(
        questions,
        [{"question_id": question_id, "choice_count": 4} for question_id in range(1, 7)],
    )


def downgrade() -> None:
    op.execute(
        "UPDATE assessment_sessions "
        "SET completion_status = 'ABANDONED' "
        "WHERE completion_status = 'IN_PROGRESS'"
    )
    op.drop_table("assessment_answers")
    op.drop_table("assessment_questions")
    # PostgreSQL cannot remove a single value from an enum type. IN_PROGRESS is
    # therefore retained in completionstatus after downgrade.
