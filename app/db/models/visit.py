import uuid
from datetime import date, time

from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import ForeignKey, text
from sqlalchemy.dialects.postgresql import DATE, TEXT, TIME, ENUM, UUID, FLOAT

from .base import Base
from .doctor import Doctor
from .client import Client
from app.db.enums import VisitStatus


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

    date: Mapped[date] = mapped_column(
        DATE,
        nullable=False,
        server_default=text("CURRENT_DATE"),
    )
    start_time: Mapped[time] = mapped_column(
        TIME,
        nullable=False,
        server_default=text("CURRENT_TIME"),
    )
    end_time: Mapped[time] = mapped_column(
        TIME,
        nullable=False,
    )

    procedure: Mapped[str] = mapped_column(
        TEXT,
        nullable=True,
    )
    cost: Mapped[float] = mapped_column(
        FLOAT,
        nullable=True,
    )

    status: Mapped[VisitStatus] = mapped_column(
        ENUM(VisitStatus, name="visit_status", create_type=True),
        nullable=False,
        default=VisitStatus.UNCONFIRMED,
        server_default=text("'UNCONFIRMED'::visit_status"),
    )

    client: Mapped[Client] = relationship("Client", back_populates="visits")
    doctor: Mapped[Doctor] = relationship("Doctor", back_populates="visits")
