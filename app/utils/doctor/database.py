import uuid
from typing import Sequence

from sqlalchemy import select, or_, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import Doctor
from app.schemas import VisitCreateRequest, DoctorCreateRequest


async def create_doctor(
        session: AsyncSession,
        potential_doctor: DoctorCreateRequest,
) -> Doctor:
    doctor = Doctor(**potential_doctor.model_dump())
    session.add(doctor)
    await session.commit()
    await session.refresh(doctor)
    return doctor


async def get_doctor_by_id(
        session: AsyncSession,
        doctor_id: uuid.UUID,
) -> Doctor | None:
    doctor = await session.scalar(
        select(Doctor)
        .where(Doctor.id == doctor_id)
    )
    return doctor


async def find_doctor_by_substr(
        session: AsyncSession,
        doctor_substr: str
) -> Sequence[Doctor] | None:
    doctors = await session.scalars(
        select(Doctor)
        .where(
            or_(
                func.lower(Doctor.full_name).ilike(f"%{doctor_substr.lower()}%"),
                func.lower(Doctor.speciality).ilike(f"%{doctor_substr.lower()}%")
            )
        )
        .order_by(Doctor.name.asc())
        .limit(20)
    )
    return doctors.all()
