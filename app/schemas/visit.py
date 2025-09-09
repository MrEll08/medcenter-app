import datetime
import uuid

from app.db.enums import VisitStatusEnum
from app.schemas.base import BaseCreateRequest, BaseResponse


class VisitCreateRequest(BaseCreateRequest):
    client_id: uuid.UUID
    doctor_id: uuid.UUID

    start_date: datetime.datetime
    end_date: datetime.datetime | None = None

    procedure: str | None = ""
    cost: float | None = 0


class VisitResponse(BaseResponse):
    client_id: uuid.UUID
    doctor_id: uuid.UUID

    start_date: datetime.datetime
    end_date: datetime.datetime

    procedure: str | None
    status: VisitStatusEnum

    client_name: str
    doctor_name: str
