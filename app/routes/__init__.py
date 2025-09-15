from .clients import router as client_router
from .doctors import router as doctor_router
from .visits import router as visit_router

list_of_routes = [
    client_router,
    doctor_router,
    visit_router,
]


__all__ = [
    "list_of_routes",
]
