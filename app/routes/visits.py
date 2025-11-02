import uuid

from fastapi import APIRouter, Body, HTTPException, Request
from fastapi.params import Depends
from sqlalchemy.ext.asyncio import AsyncSession
from starlette import status

from app.db.connection import get_session
from app.schemas import VisitCreateRequest, VisitResponse, VisitSearchRequest, VisitUpdateRequest, PageResponse
from app.utils.visit import (
    create_new_visit,
    delete_visit_by_id,
    get_visit_by_id,
    svc_get_visits_by_filter,
    update_visit,
)

router = APIRouter(prefix="/visits", tags=["visits"])


@router.get(
    "/",
    status_code=status.HTTP_200_OK,
    response_model=PageResponse[VisitResponse],
)
async def get_visits(
        search: VisitSearchRequest = Depends(),
        limit: int = 10,
        offset: int = 0,
        session: AsyncSession = Depends(get_session),
):
    visits = await svc_get_visits_by_filter(session, search, limit, offset)
    return visits


@router.post(
    "/",
    status_code=status.HTTP_201_CREATED,
    response_model=VisitResponse,
    responses={
        status.HTTP_422_UNPROCESSABLE_ENTITY: {"description": "Validation error"},
    }
)
async def create_visit(
        _: Request,
        potential_visit: VisitCreateRequest = Body(...),
        session: AsyncSession = Depends(get_session)
):
    visit = await create_new_visit(session, potential_visit)
    return visit


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


@router.patch(
    "/{visit_id}",
    status_code=status.HTTP_200_OK,
    response_model=VisitResponse,
    responses={
        status.HTTP_404_NOT_FOUND: {"description": "Not found"},
    }
)
async def patch_visit(
        _: Request,
        visit_id: uuid.UUID,
        update_request: VisitUpdateRequest = Body(...),
        session: AsyncSession = Depends(get_session),
):
    visit = await update_visit(session, visit_id, update_request)
    if not visit:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
    return visit


@router.delete(
    "/{visit_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_visit(
        _: Request,
        visit_id: uuid.UUID,
        session: AsyncSession = Depends(get_session)
):
    await delete_visit_by_id(session, visit_id)
