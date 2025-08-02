import uuid
from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, model_validator


class ClientRequest(BaseModel):
    full_name: str
    phone_number: str
    date_of_birth: date

    name: str = ""
    surname: str = ""
    patronymic: str | None = ""

    @model_validator(mode="after")
    def split_full_name(self) -> "ClientRequest":
        parts = self.full_name.split(" ")

        match len(parts):
            case 3:
                self.surname, self.name, self.patronymic = parts
            case 2:
                self.surname, self.name = parts
            case _:
                raise ValueError(f"Invalid full name. It must have 2 or 3 parts, got: {self.full_name}")

        return self


class ClientResponse(BaseModel):
    id: uuid.UUID

    name: str
    surname: str
    patronymic: str | None

    phone_number: str
    date_of_birth: date

    dt_created: datetime
    dt_updated: datetime

    model_config = ConfigDict(from_attributes=True)
