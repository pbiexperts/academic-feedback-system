"""Add student name and phone number fields.

Revision ID: 7b1d2c3e4f5a
Revises: 239b13d794d3
Create Date: 2026-08-19
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "7b1d2c3e4f5a"
down_revision: Union[str, Sequence[str], None] = "239b13d794d3"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("students", sa.Column("name", sa.String(length=150), nullable=True))
    op.add_column("students", sa.Column("phone_no", sa.String(length=20), nullable=True))
    op.create_index(op.f("ix_students_phone_no"), "students", ["phone_no"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_students_phone_no"), table_name="students")
    op.drop_column("students", "phone_no")
    op.drop_column("students", "name")