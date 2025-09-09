import uuid

from pydantic import BaseModel, ConfigDict


class BaseCreateRequest(BaseModel):
    pass


class BaseResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID

    dt_created: datetime
    dt_updated: datetime
