import uuid

from sqlalchemy import exc, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import Client
from app.schemas import ClientRequest


async def create_client(
        session: AsyncSession,
        potential_client: ClientRequest
) -> tuple[Client | None, str]:
    client = Client(**potential_client.model_dump(exclude={"full_name"}))
    session.add(client)

    try:
        await session.commit()
        await session.refresh(client)
        return client, "Successful registration!"
    except exc.IntegrityError:
        await session.rollback()
        return None, "User with this phone number already exists"


async def get_client_by_id(
        session: AsyncSession,
        client_id: uuid.UUID,
) -> Client | None:
    client = await session.scalar(
        select(Client).
        where(Client.id == client_id)
    )
    if not client:
        return None
    return client
