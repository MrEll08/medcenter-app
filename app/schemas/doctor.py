from app.schemas.human import HumanResponse, HumanCreateRequest


class DoctorCreateRequest(HumanCreateRequest):
    speciality: str


class DoctorResponse(HumanResponse):
    speciality: str
