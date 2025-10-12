"""change_visit_status_enum

Revision ID: V6
Revises: V5
Create Date: 2025-10-13 02:14:57.291499

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'V6'
down_revision: Union[str, None] = 'V5'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

old_options = ('UNCONFIRMED', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'PAID')
new_options = ('UNCONFIRMED', 'CONFIRMED', 'PAID')


def upgrade():
    op.execute("ALTER TABLE visit ALTER COLUMN status DROP DEFAULT")
    op.execute("ALTER TYPE visit_status RENAME TO visit_status_old;")
    sa.Enum(*new_options, name='visit_status').create(op.get_bind())
    op.execute("""
               ALTER TABLE visit
                   ALTER COLUMN status TYPE visit_status
                       USING status::text::visit_status;
               """)
    op.execute("ALTER TABLE visit ALTER COLUMN status SET DEFAULT 'UNCONFIRMED'::visit_status")
    op.execute("DROP TYPE visit_status_old;")


def downgrade():
    op.execute("ALTER TABLE visit ALTER COLUMN status DROP DEFAULT")
    op.execute("ALTER TYPE visit_status RENAME TO visit_status_new;")
    sa.Enum(*old_options, name='visit_status').create(op.get_bind())
    op.execute("""
               ALTER TABLE visit
                   ALTER COLUMN status TYPE visit_status
                       USING status::text::visit_status;
               """)
    op.execute("ALTER TABLE visit ALTER COLUMN status SET DEFAULT 'UNCONFIRMED'::visit_status")
    op.execute("DROP TYPE visit_status_new;")
