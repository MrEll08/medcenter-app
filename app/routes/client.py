from fastapi import APIRouter, Body, Depends, Request, HTTPException
from starlette import status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.connection import get_session
from app.schemas import ClientRequest, ClientResponse
from app.utils.client import create_client

router = APIRouter(prefix="/client", tags=["client"])

@router.post(
    "/",
    status_code=status.HTTP_201_CREATED,
    responses={
        status.HTTP_422_UNPROCESSABLE_ENTITY: {"description": "Validation error, invalid data"},
        status.HTTP_409_CONFLICT: {"description": "Client with this phone number already exists"},
    },
    summary="Create a new client",
    description="Create a new client by full name, phone number and date of birth",
)
async def create_new_client(
    _: Request,
    potential_client: ClientRequest = Body(...),
    session: AsyncSession = Depends(get_session),
):
    is_success, message = await create_client(session, potential_client)
    if is_success:
        return {"message": message}

    raise HTTPException(
        status_code=status.HTTP_409_CONFLICT,
        detail=message
    )