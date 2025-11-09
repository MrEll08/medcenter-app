from typing import Generic, TypeVar

from pydantic import BaseModel

from app.schemas import VisitResponse

T = TypeVar("T")


class PageResponse(BaseModel, Generic[T]):
    total: int
    limit: int
    offset: int
    items: list[T]


class PageVisitResponse(PageResponse[VisitResponse]):
    total_cost: float = 0
