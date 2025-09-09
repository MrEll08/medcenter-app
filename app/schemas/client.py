from datetime import date

from app.schemas.human import HumanCreateRequest, HumanResponse


class ClientCreateRequest(HumanCreateRequest):
    phone_number: str
    date_of_birth: date


class ClientResponse(HumanResponse):
    phone_number: str
    date_of_birth: date
