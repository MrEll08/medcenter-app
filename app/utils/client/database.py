import uuid

from sqlalchemy import exc, func, or_, select, Sequence
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import Client
from app.schemas import ClientRequest


async def create_client(
    session: AsyncSession,
    potential_client: ClientRequest
) -> tuple[Client | None, str]:
    client = Client(**potential_client.model_dump())
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
        select(Client)
        .where(Client.id == client_id)
    )
    if not client:
        return None
    return client


async def find_client_by_substr(
    session: AsyncSession,
    client_substr: str
) -> Sequence[Client] | None:
    clients = await session.scalars(
        select(Client)
        .where(
            or_(
                func.lower(Client.full_name).ilike(f"%{client_substr.lower()}%"),
                Client.phone_number.ilike(f"%{client_substr}%")
            )
        )
        .order_by(Client.name.asc())
        .limit(20)
    )
    return clients.all()
