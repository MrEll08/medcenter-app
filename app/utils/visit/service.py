from sqlalchemy.ext.asyncio import AsyncSession

from .database import dal_count_visits_by_filter, dal_get_visits_by_filter
from app.schemas import VisitSearchRequest, VisitResponse, PageResponse


async def svc_get_visits_by_filter(
        session: AsyncSession,
        search: VisitSearchRequest,
        limit: int = 10,
        offset: int = 0,
) -> PageResponse[VisitResponse]:
    visits_db = await dal_get_visits_by_filter(session, search, limit, offset)
    visits = [VisitResponse.model_validate(visit) for visit in visits_db]

    total = await dal_count_visits_by_filter(session, search)

    return PageResponse(
        total=total,
        limit=limit,
        offset=offset,
        items=visits,
    )
