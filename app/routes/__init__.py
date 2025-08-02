from .client import router as client_router


list_of_routes = [
    client_router,
]


__all__ = [
    "list_of_routes",
]
