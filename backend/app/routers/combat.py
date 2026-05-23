from __future__ import annotations
from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.combat import (
    CombatantCreate, CombatantPatch, CombatantOut,
    EncounterCreate, EncounterOut, MonsterCardOut,
)
from app.services import combat_service, monster_service

router = APIRouter(prefix="/api/combat", tags=["combat"])


@router.get("/encounter/active", response_model=EncounterOut | None)
def get_active_encounter(db: Session = Depends(get_db)):
    return combat_service.get_active_encounter(db)


@router.post("/encounter", response_model=EncounterOut, status_code=201)
def create_encounter(data: EncounterCreate, db: Session = Depends(get_db)):
    return combat_service.create_encounter(db, data)


@router.post("/encounter/{encounter_id}/combatants", response_model=CombatantOut, status_code=201)
def add_combatant(encounter_id: str, data: CombatantCreate, db: Session = Depends(get_db)):
    return combat_service.add_combatant(db, encounter_id, data)


@router.patch("/encounter/{encounter_id}/combatants/{combatant_id}", response_model=CombatantOut)
def update_combatant(
    encounter_id: str, combatant_id: str, patch: CombatantPatch, db: Session = Depends(get_db)
):
    try:
        return combat_service.update_combatant(db, encounter_id, combatant_id, patch)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.delete("/encounter/{encounter_id}/combatants/{combatant_id}", status_code=204)
def remove_combatant(encounter_id: str, combatant_id: str, db: Session = Depends(get_db)):
    combat_service.remove_combatant(db, encounter_id, combatant_id)


@router.post("/encounter/{encounter_id}/next-turn", response_model=EncounterOut)
def next_turn(encounter_id: str, db: Session = Depends(get_db)):
    encounter = _get_encounter_or_404(encounter_id, db)
    return combat_service.advance_turn(db, encounter)


@router.post("/encounter/{encounter_id}/end", status_code=204)
def end_encounter(encounter_id: str, db: Session = Depends(get_db)):
    encounter = _get_encounter_or_404(encounter_id, db)
    combat_service.end_encounter(db, encounter)


@router.get("/monsters/{name}", response_model=MonsterCardOut)
def get_monster(name: str):
    try:
        return monster_service.get_monster_card(name)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Monster lookup failed: {e}")


def _get_encounter_or_404(encounter_id: str, db: Session):
    from app.models.combat import Encounter
    encounter = db.query(Encounter).filter(Encounter.id == encounter_id).first()
    if not encounter:
        raise HTTPException(status_code=404, detail="Encounter not found")
    return encounter
