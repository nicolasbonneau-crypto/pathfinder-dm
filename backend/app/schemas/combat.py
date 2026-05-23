from __future__ import annotations
from pydantic import BaseModel
from datetime import datetime
from typing import Optional, Literal


class CombatantCreate(BaseModel):
    name: str
    type: Literal["player", "monster"]
    max_hp: int
    current_hp: int
    initiative: Optional[int] = None
    ac: Optional[int] = None


class CombatantPatch(BaseModel):
    current_hp: Optional[int] = None
    initiative: Optional[int] = None
    conditions: Optional[list[str]] = None


class CombatantOut(BaseModel):
    id: str
    name: str
    type: str
    max_hp: int
    current_hp: int
    initiative: Optional[int]
    ac: Optional[int]
    conditions: list[str]
    is_active: bool

    model_config = {"from_attributes": True}


class EncounterCreate(BaseModel):
    name: str


class EncounterOut(BaseModel):
    id: str
    name: str
    round: int
    active_combatant_index: int
    is_running: bool
    combatants: list[CombatantOut]
    created_at: datetime

    model_config = {"from_attributes": True}


class PlayerTemplateCreate(BaseModel):
    name: str
    class_name: Optional[str] = None
    max_hp: int
    ac: Optional[int] = None


class PlayerTemplateOut(BaseModel):
    id: str
    name: str
    class_name: Optional[str]
    max_hp: int
    ac: Optional[int]
    created_at: datetime

    model_config = {"from_attributes": True}


class MonsterAbilities(BaseModel):
    str: int
    dex: int
    con: int
    int: int
    wis: int
    cha: int


class MonsterSaves(BaseModel):
    fort: int
    ref: int
    will: int


class MonsterAttack(BaseModel):
    name: str
    bonus: int
    damage: str


class MonsterSpecialAbility(BaseModel):
    name: str
    description: str


class MonsterCardOut(BaseModel):
    name: str
    level: int
    traits: list[str]
    ac: int
    hp: int
    speed: str
    perception: int
    skills: dict[str, int]
    abilities: MonsterAbilities
    saves: MonsterSaves
    attacks: list[MonsterAttack]
    abilities_special: list[MonsterSpecialAbility]
    source: Literal["rag", "web"]
