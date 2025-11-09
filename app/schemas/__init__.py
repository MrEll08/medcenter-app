from .client import ClientCreateRequest, ClientResponse, ClientUpdateRequest
from .doctor import DoctorCreateRequest, DoctorResponse, DoctorUpdateRequest
from .visit import VisitCreateRequest, VisitResponse, VisitSearchRequest, VisitUpdateRequest
from .page import PageResponse, PageVisitResponse

__all__ = [
    "ClientCreateRequest",
    "ClientResponse",
    "ClientUpdateRequest",

    "DoctorCreateRequest",
    "DoctorResponse",
    "DoctorUpdateRequest",
    "VisitSearchRequest",

    "VisitCreateRequest",
    "VisitResponse",
    "VisitUpdateRequest",

    "PageResponse",
    "PageVisitResponse",
]