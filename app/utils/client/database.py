from sqlalchemy import exc
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import Client
from app.schemas import ClientRequest


async def create_client(
    session: AsyncSession,
    potential_client: ClientRequest
) -> tuple[bool, str]:
    client = Client(**potential_client.model_dump(exclude={"full_name"}))
    session.add(client)
    try:
        await session.commit()
    except exc.IntegrityError:
        return False, "User with this phone number already exists"
    return True, "Successful registration!"