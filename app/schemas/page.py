from typing import Generic, TypeVar

from pydantic import BaseModel

T = TypeVar("T")


class PageResponse(BaseModel, Generic[T]):
    total: int
    limit: int
    offset: int
    items: list[T]
