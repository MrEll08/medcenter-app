import uuid

from fastapi import APIRouter, Request, Body, HTTPException
from fastapi.params import Depends
from sqlalchemy.ext.asyncio import AsyncSession
from starlette import status

from app.db.connection import get_session
from app.schemas.visit import VisitResponse, VisitCreateRequest, VisitSearchRequest
from app.utils.visit import create_visit, delete_visit, get_visit_by_id
from app.utils.visit.database import get_visits_by_filter

router = APIRouter(prefix="/visits", tags=["visits"])


@router.get(
    "/",
    status_code=status.HTTP_200_OK,
    response_model=list[VisitResponse],
)
async def get_visits(
        search: VisitSearchRequest = Depends(),
        session: AsyncSession = Depends(get_session),
):
    visits = await get_visits_by_filter(session, search)
    return visits


@router.post(
    "/",
    status_code=status.HTTP_201_CREATED,
    response_model=VisitResponse,
    responses={
        status.HTTP_422_UNPROCESSABLE_ENTITY: {"description": "Validation error"},
    }
)
async def create_new_visit(
        _: Request,
        potential_visit: VisitCreateRequest = Body(...),
        session: AsyncSession = Depends(get_session)
):
    visit = await create_visit(session, potential_visit)
    return visit


@router.delete(
    "/{visit_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_visit_by_id(
        _: Request,
        visit_id: uuid.UUID,
        session: AsyncSession = Depends(get_session)
):
    await delete_visit(session, visit_id)


@router.get(
    "/{visit_id}",
    status_code=status.HTTP_200_OK,
    response_model=VisitResponse,
    responses={
        status.HTTP_404_NOT_FOUND: {"description": "Not found"},
    }
)
async def get_visit(
        _: Request,
        visit_id: uuid.UUID,
        session: AsyncSession = Depends(get_session),
):
    visit = await get_visit_by_id(session, visit_id)
    if not visit:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
    return visit
