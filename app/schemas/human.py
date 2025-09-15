from datetime import date

from pydantic import BaseModel, model_validator

from app.schemas.base import BaseCreateRequest, BaseResponse, BaseUpdateRequest
from app.utils.common import split_full_name


class HumanCreateRequest(BaseCreateRequest):
    full_name: str

    name: str = ""
    surname: str = ""
    patronymic: str | None = ""

    @model_validator(mode="after")
    def split_name(self):
        self.surname, self.name, self.patronymic = split_full_name(self.full_name)
        return self


class HumanResponse(BaseResponse):
    name: str
    surname: str
    patronymic: str | None

    full_name: str


class HumanUpdateRequest(BaseModel):
    full_name: str | None = None

    name: str | None = None
    surname: str | None = None
    patronymic: str | None = None

    @model_validator(mode="after")
    def split_name(self):
        if self.full_name is not None:
            self.surname, self.name, self.patronymic = split_full_name(self.full_name)
        return self
