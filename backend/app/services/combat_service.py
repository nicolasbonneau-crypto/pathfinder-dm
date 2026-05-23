from __future__ import annotations
import uuid
from sqlalchemy.orm import Session

from app.models.combat import Encounter, Combatant, PlayerTemplate
from app.schemas.combat import CombatantCreate, CombatantPatch, EncounterCreate, PlayerTemplateCreate


def get_active_encounter(db: Session) -> Encounter | None:
    return db.query(Encounter).filter(Encounter.is_active == True).order_by(Encounter.created_at.desc()).first()


def create_encounter(db: Session, data: EncounterCreate) -> Encounter:
    db.query(Encounter).filter(Encounter.is_active == True).update({"is_active": False})
    encounter = Encounter(id=str(uuid.uuid4()), name=data.name, is_running=True)
    db.add(encounter)
    db.commit()
    db.refresh(encounter)
    return encounter


def add_combatant(db: Session, encounter_id: str, data: CombatantCreate) -> Combatant:
    combatant = Combatant(
        id=str(uuid.uuid4()),
        encounter_id=encounter_id,
        **data.model_dump(),
    )
    db.add(combatant)
    db.commit()
    db.refresh(combatant)
    return combatant


def update_combatant(db: Session, encounter_id: str, combatant_id: str, patch: CombatantPatch) -> Combatant:
    combatant = db.query(Combatant).filter(
        Combatant.id == combatant_id,
        Combatant.encounter_id == encounter_id,
    ).first()
    if combatant is None:
        raise ValueError(f"Combatant {combatant_id} not found")

    for field, value in patch.model_dump(exclude_none=True).items():
        setattr(combatant, field, value)
    db.commit()
    db.refresh(combatant)
    return combatant


def remove_combatant(db: Session, encounter_id: str, combatant_id: str) -> None:
    combatant = db.query(Combatant).filter(
        Combatant.id == combatant_id,
        Combatant.encounter_id == encounter_id,
    ).first()
    if combatant:
        db.delete(combatant)
        db.commit()


def advance_turn(db: Session, encounter: Encounter) -> Encounter:
    sorted_combatants = sorted(
        [c for c in encounter.combatants if c.current_hp > 0],
        key=lambda c: -(c.initiative or -999),
    )
    if not sorted_combatants:
        return encounter

    next_idx = (encounter.active_combatant_index + 1) % len(sorted_combatants)
    if next_idx == 0:
        encounter.round += 1
    encounter.active_combatant_index = next_idx
    db.commit()
    db.refresh(encounter)
    return encounter


def end_encounter(db: Session, encounter: Encounter) -> None:
    encounter.is_active = False
    encounter.is_running = False
    db.commit()


def list_templates(db: Session) -> list[PlayerTemplate]:
    return db.query(PlayerTemplate).order_by(PlayerTemplate.created_at).all()


def create_template(db: Session, data: PlayerTemplateCreate) -> PlayerTemplate:
    template = PlayerTemplate(id=str(uuid.uuid4()), **data.model_dump())
    db.add(template)
    db.commit()
    db.refresh(template)
    return template


def delete_template(db: Session, template_id: str) -> None:
    template = db.query(PlayerTemplate).filter(PlayerTemplate.id == template_id).first()
    if template:
        db.delete(template)
        db.commit()


def add_combatant_from_template(db: Session, encounter_id: str, template_id: str) -> Combatant:
    template = db.query(PlayerTemplate).filter(PlayerTemplate.id == template_id).first()
    if template is None:
        raise ValueError(f"Template {template_id} not found")
    return add_combatant(db, encounter_id, CombatantCreate(
        name=template.name,
        type="player",
        max_hp=template.max_hp,
        current_hp=template.max_hp,
        ac=template.ac,
    ))
