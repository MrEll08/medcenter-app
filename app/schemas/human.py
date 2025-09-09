from pydantic import BaseModel, model_validator

from app.schemas.base import BaseCreateRequest, BaseResponse


class HumanCreateRequest(BaseCreateRequest):
    full_name: str

    name: str = ""
    surname: str = ""
    patronymic: str | None = ""

    @model_validator(mode="after")
    def split_full_name(self):
        parts = self.full_name.split(" ")

        match len(parts):
            case 3:
                self.surname, self.name, self.patronymic = parts
            case 2:
                self.surname, self.name = parts
            case _:
                raise ValueError(f"Invalid full name. It must have 2 or 3 parts, got: {self.full_name}")

        return self


class HumanResponse(BaseResponse):
    name: str
    surname: str
    patronymic: str | None

    full_name: str
