import uuid

from sqlalchemy import select, Sequence
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import Visit
from app.schemas.visit import VisitCreateRequest, VisitSearchRequest


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
) -> Visit | None:
    visit = await session.scalar(
        select(Visit)
        .where(Visit.id == visit_id)
    )
    return visit


async def get_visits_by_filter(
        session: AsyncSession,
        search_visit: VisitSearchRequest
) -> Sequence[Visit]:
    query = select(Visit).limit(search_visit.search_limit)
    if search_visit.client_id:
        query = query.where(Visit.client_id == search_visit.client_id)
    if search_visit.doctor_id:
        query = query.where(Visit.doctor_id == search_visit.doctor_id)
    if search_visit.start_date:
        query = query.where(Visit.start_date >= search_visit.start_date)
    if search_visit.end_date:
        query = query.where(Visit.end_date <= search_visit.end_date)
    if search_visit.cabinet:
        query = query.where(Visit.cabinet == search_visit.cabinet)
    if search_visit.procedure:
        query = query.where(Visit.procedure == search_visit.procedure)
    if search_visit.status:
        query = query.where(Visit.status == search_visit.status)
    visits = await session.execute(query)
    return visits.scalars().all()
