from __future__ import annotations
from sqlalchemy import String, Integer, Boolean, DateTime, ForeignKey, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from datetime import datetime, UTC
from typing import Optional
from app.database import Base


class PlayerTemplate(Base):
    __tablename__ = "player_templates"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    name: Mapped[str] = mapped_column(String, nullable=False)
    class_name: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    max_hp: Mapped[int] = mapped_column(Integer, nullable=False)
    ac: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(UTC))


class Encounter(Base):
    __tablename__ = "encounters"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    name: Mapped[str] = mapped_column(String, nullable=False)
    round: Mapped[int] = mapped_column(Integer, default=1)
    active_combatant_index: Mapped[int] = mapped_column(Integer, default=0)
    is_running: Mapped[bool] = mapped_column(Boolean, default=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(UTC))

    combatants: Mapped[list[Combatant]] = relationship(
        "Combatant", back_populates="encounter", cascade="all, delete-orphan"
    )


class Combatant(Base):
    __tablename__ = "combatants"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    encounter_id: Mapped[str] = mapped_column(String, ForeignKey("encounters.id"), nullable=False)
    name: Mapped[str] = mapped_column(String, nullable=False)
    type: Mapped[str] = mapped_column(String, nullable=False)
    max_hp: Mapped[int] = mapped_column(Integer, nullable=False)
    current_hp: Mapped[int] = mapped_column(Integer, nullable=False)
    initiative: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    ac: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    conditions: Mapped[list[str]] = mapped_column(JSON, default=list)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    encounter: Mapped[Encounter] = relationship("Encounter", back_populates="combatants")
