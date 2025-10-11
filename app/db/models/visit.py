import uuid
from datetime import datetime

from sqlalchemy import ForeignKey, text
from sqlalchemy.dialects.postgresql import ENUM, FLOAT, TEXT, TIMESTAMP, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.enums import VisitStatusEnum

from .base import Base
from .client import Client
from .doctor import Doctor


class Visit(Base):
    __tablename__ = "visit"

    client_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("client.id", ondelete="CASCADE", onupdate="CASCADE"),
        nullable=False,
    )
    doctor_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("doctor.id", ondelete="CASCADE", onupdate="CASCADE"),
        nullable=False,
    )

    start_date: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True),
        nullable=False,
        server_default=text("CURRENT_TIMESTAMP"),
    )

    end_date: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True),
        nullable=False,
        server_default=text("CURRENT_TIMESTAMP + interval '1 hour'"),
    )

    cabinet: Mapped[str] = mapped_column(
        TEXT,
        nullable=True,
    )
    procedure: Mapped[str] = mapped_column(
        TEXT,
        nullable=True,
    )
    cost: Mapped[float] = mapped_column(
        FLOAT,
        nullable=True,
    )

    status: Mapped[VisitStatusEnum] = mapped_column(
        ENUM(VisitStatusEnum, name="visit_status", create_type=True),
        nullable=False,
        default=VisitStatusEnum.UNCONFIRMED,
        server_default=text("'UNCONFIRMED'::visit_status"),
    )

    client: Mapped[Client] = relationship(
        "Client", back_populates="visits", lazy="selectin"
    )
    doctor: Mapped[Doctor] = relationship(
        "Doctor", back_populates="visits", lazy="selectin"
    )

    @property
    def client_name(self) -> str | None:
        return self.client.full_name if self.client else None

    @property
    def client_phone_number(self) -> str | None:
        return self.client.phone_number if self.client else None

    @property
    def doctor_name(self) -> str | None:
        return self.doctor.full_name if self.doctor else None
