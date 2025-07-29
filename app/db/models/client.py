from datetime import datetime

from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import TEXT, DATE
from .human import Human


class Client(Human):
    __tablename__ = "client"

    phone_number: Mapped[str] = mapped_column(TEXT, nullable=False)
    date_of_birth: Mapped[datetime] = mapped_column(DATE, nullable=True)

    visits: Mapped[list["Visit"]] = relationship(back_populates="client")
