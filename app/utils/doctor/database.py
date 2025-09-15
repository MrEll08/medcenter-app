import uuid

from sqlalchemy import Sequence, func, or_, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import Doctor
from app.schemas import DoctorCreateRequest
from app.schemas.doctor import DoctorUpdateRequest


async def get_doctor_by_id(
        session: AsyncSession,
        doctor_id: uuid.UUID,
) -> Doctor | None:
    doctor = await session.scalar(
        select(Doctor)
        .where(Doctor.id == doctor_id)
    )
    return doctor


async def create_new_doctor(
        session: AsyncSession,
        potential_doctor: DoctorCreateRequest,
) -> Doctor:
    doctor = Doctor(**potential_doctor.model_dump())
    session.add(doctor)
    await session.commit()
    await session.refresh(doctor)
    return doctor


async def update_doctor(
        session: AsyncSession,
        doctor_id: uuid.UUID,
        update_request: DoctorUpdateRequest,
) -> Doctor | None:
    values = update_request.model_dump(exclude_none=True)
    doctor = await session.scalar(
        update(Doctor)
        .where(Doctor.id == doctor_id)
        .values(**values)
        .returning(Doctor)
    )
    await session.commit()
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
