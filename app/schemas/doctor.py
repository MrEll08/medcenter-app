from app.schemas.human import HumanCreateRequest, HumanResponse, HumanUpdateRequest


class DoctorCreateRequest(HumanCreateRequest):
    speciality: str


class DoctorResponse(HumanResponse):
    speciality: str


class DoctorUpdateRequest(HumanUpdateRequest):
    speciality: str | None = None
