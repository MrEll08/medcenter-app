from sqlalchemy.ext.asyncio import AsyncSession

from .database import dal_count_visits_by_filter, dal_get_visits_by_filter, dal_total_visits_cost_by_filter
from app.schemas import VisitSearchRequest, VisitResponse, PageVisitResponse


async def svc_get_visits_by_filter(
        session: AsyncSession,
        search: VisitSearchRequest,
        limit: int = 10,
        offset: int = 0,
) -> PageVisitResponse:
    visits_db = await dal_get_visits_by_filter(session, search, limit, offset)
    visits = [VisitResponse.model_validate(visit) for visit in visits_db]
    total_cost = await dal_total_visits_cost_by_filter(session, search)

    total = await dal_count_visits_by_filter(session, search)

    return PageVisitResponse(
        total=total,
        limit=limit,
        offset=offset,
        items=visits,
        total_cost=total_cost,
    )
