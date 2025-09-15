from datetime import date

from app.schemas.human import HumanCreateRequest, HumanResponse, HumanUpdateRequest


class ClientCreateRequest(HumanCreateRequest):
    phone_number: str
    date_of_birth: date


class ClientResponse(HumanResponse):
    phone_number: str
    date_of_birth: date


class ClientUpdateRequest(HumanUpdateRequest):
    phone_number: str | None = None
    date_of_birth: date | None = None
