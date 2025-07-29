from datetime import datetime

from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.dialects.postgresql import TEXT, DATE
from .base import Base


class Human(Base):
    __abstract__ = True

    name: Mapped[str] = mapped_column(TEXT, nullable=False)
    surname: Mapped[str] = mapped_column(TEXT, nullable=False)
    patronymic: Mapped[str] = mapped_column(TEXT, nullable=True)
