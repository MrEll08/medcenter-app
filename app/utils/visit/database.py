import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import Visit
from app.schemas.visit import VisitCreateRequest


async def create_visit(
        session: AsyncSession,
        potential_visit: VisitCreateRequest
) -> Visit:
    visit = Visit(**potential_visit.model_dump())
    session.add(visit)
    await session.commit()
    await session.refresh(visit)
    return visit


async def delete_visit(
        session: AsyncSession,
        visit_id: uuid.UUID,
) -> None:
    visit = await session.scalar(
        select(Visit)
        .where(Visit.id == visit_id)
    )
    await session.delete(visit)


async def get_visit_by_id(
        session: AsyncSession,
        visit_id: uuid.UUID,
):
    visit = await session.scalar(
        select(Visit)
        .where(Visit.id == visit_id)
    )
    return visit
