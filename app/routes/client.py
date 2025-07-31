import uuid

from fastapi import APIRouter, Body, Depends, Request, HTTPException
from starlette import status
from sqlalchemy.ext.asyncio import AsyncSession
from starlette.status import HTTP_404_NOT_FOUND

from app.db.connection import get_session
from app.schemas import ClientRequest, ClientResponse
from app.utils.client import create_client, get_client_by_id

router = APIRouter(prefix="/client", tags=["client"])


@router.post(
    "/",
    status_code=status.HTTP_201_CREATED,
    response_model=ClientResponse,
    responses={
        status.HTTP_422_UNPROCESSABLE_ENTITY: {"description": "Validation error, invalid data"},
        status.HTTP_409_CONFLICT: {"description": "Client with this phone number already exists"},
    },
)
async def create_new_client(
    _: Request,
    potential_client: ClientRequest = Body(...),
    session: AsyncSession = Depends(get_session),
):
    client, message = await create_client(session, potential_client)

    if not client:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=message
        )

    return ClientResponse.model_validate(client)


@router.get(
    "/{client_id}",
    response_model=ClientResponse,
    status_code=status.HTTP_200_OK,
    responses={
        status.HTTP_404_NOT_FOUND: {"description": "Client with this uuid not found"},
    }
)
async def get_client(
    _: Request,
    client_id: uuid.UUID,
    session: AsyncSession = Depends(get_session),
):
    client = await get_client_by_id(session, client_id)
    if not client:
        raise HTTPException(status_code=HTTP_404_NOT_FOUND, detail="Client with this id not found")
    return ClientResponse.model_validate(client)
