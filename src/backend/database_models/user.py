from typing import List, Optional
from uuid import uuid4
from sqlalchemy import Column, ForeignKey, Table, UniqueConstraint, String, JSON, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship
from datetime import datetime
from backend.database_models.base import Base


class UserOrganizationAssociation(Base):
    __tablename__ = "user_organization"

    user_id: Mapped[str] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), primary_key=True
    )
    organization_id: Mapped[str] = mapped_column(
        ForeignKey("organizations.id", ondelete="CASCADE"), primary_key=True
    )


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid4()))
    fullname: Mapped[str] = mapped_column(nullable=True)
    email: Mapped[Optional[str]] = mapped_column(nullable=True)
    date: Mapped[datetime] = mapped_column(DateTime, nullable=True, default=datetime.now)
    hashed_password: Mapped[Optional[bytes]] = mapped_column(nullable=True)
    ip_address: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    headers: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    # __table_args__ = (UniqueConstraint("email", name="unique_user_email"),)
