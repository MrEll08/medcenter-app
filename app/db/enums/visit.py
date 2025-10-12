from enum import Enum


class VisitStatusEnum(str, Enum):
    UNCONFIRMED = "UNCONFIRMED"
    CONFIRMED = "CONFIRMED"
    PAID = "PAID"
