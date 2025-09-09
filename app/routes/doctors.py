import uuid

from fastapi import APIRouter, Request, Body, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from starlette import status

from app.db.connection import get_session
from app.schemas import DoctorResponse, DoctorCreateRequest
from app.schemas.visit import VisitSearchRequest, VisitResponse
from app.utils.doctor import create_doctor, get_doctor_by_id, find_doctor_by_substr
from app.utils.visit import get_visits_by_filter

router = APIRouter(prefix="/doctors", tags=["doctor"])


@router.post(
    "/",
    status_code=status.HTTP_201_CREATED,
    response_model=DoctorResponse,
    responses={
        status.HTTP_422_UNPROCESSABLE_ENTITY: {"description": "Validation error"},
    }
)
async def create_new_doctor(
        _: Request,
        potential_doctor: DoctorCreateRequest = Body(...),
        session: AsyncSession = Depends(get_session)
):
    doctor = await create_doctor(session, potential_doctor)
    return doctor


@router.get(
    "/{doctor_id}",
    status_code=status.HTTP_200_OK,
    response_model=DoctorResponse,
    responses={
        status.HTTP_404_NOT_FOUND: {"description": "Doctor not found"},
    }
)
async def get_doctor(
        _: Request,
        doctor_id: uuid.UUID,
        session: AsyncSession = Depends(get_session)
):
    doctor = await get_doctor_by_id(session, doctor_id)
    if doctor is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
        )
    return doctor


@router.get(
    "/",
    response_model=list[DoctorResponse],
    status_code=status.HTTP_200_OK
)
async def find_doctors(
        _: Request,
        session: AsyncSession = Depends(get_session),
        search_substr: str = Query(default="", title="Search substr"),
):
    doctors = await find_doctor_by_substr(session, search_substr)
    return doctors


@router.get(
    "/{doctor_id}/visits",
    response_model=list[VisitResponse],
    status_code=status.HTTP_200_OK,
)
async def get_visits(
        _: Request,
        doctor_id: uuid.UUID,
        session: AsyncSession = Depends(get_session),
):
    search = VisitSearchRequest(doctor_id=doctor_id)
    visits = await get_visits_by_filter(session, search)
    return visits
