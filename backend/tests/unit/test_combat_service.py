from __future__ import annotations
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.database import Base
from app.models.combat import Encounter, Combatant
from app.schemas.combat import CombatantCreate, CombatantPatch, EncounterCreate
from app.services.combat_service import (
    create_encounter, add_combatant, update_combatant,
    remove_combatant, advance_turn, end_encounter, get_active_encounter,
)

engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})
Session = sessionmaker(bind=engine)


@pytest.fixture(autouse=True)
def setup_db():
    Base.metadata.create_all(engine)
    yield
    Base.metadata.drop_all(engine)


@pytest.fixture()
def db():
    with Session() as session:
        yield session


def _make_combatant(db, encounter_id: str, name: str, hp: int = 20, initiative: int = 10) -> Combatant:
    return add_combatant(db, encounter_id, CombatantCreate(
        name=name, type="monster", max_hp=hp, current_hp=hp, initiative=initiative,
    ))


class TestCreateEncounter:
    def test_creates_encounter(self, db):
        enc = create_encounter(db, EncounterCreate(name="Forest Ambush"))
        assert enc.name == "Forest Ambush"
        assert enc.is_running is True
        assert enc.is_active is True

    def test_deactivates_previous_encounter(self, db):
        enc1 = create_encounter(db, EncounterCreate(name="First"))
        enc2 = create_encounter(db, EncounterCreate(name="Second"))
        db.refresh(enc1)
        assert enc1.is_active is False
        assert enc2.is_active is True


class TestCombatants:
    def test_add_combatant(self, db):
        enc = create_encounter(db, EncounterCreate(name="Test"))
        c = _make_combatant(db, enc.id, "Goblin")
        assert c.name == "Goblin"
        assert c.encounter_id == enc.id

    def test_update_hp(self, db):
        enc = create_encounter(db, EncounterCreate(name="Test"))
        c = _make_combatant(db, enc.id, "Orc", hp=30)
        updated = update_combatant(db, enc.id, c.id, CombatantPatch(current_hp=15))
        assert updated.current_hp == 15

    def test_remove_combatant(self, db):
        enc = create_encounter(db, EncounterCreate(name="Test"))
        c = _make_combatant(db, enc.id, "Goblin")
        remove_combatant(db, enc.id, c.id)
        db.refresh(enc)
        assert len(enc.combatants) == 0

    def test_update_nonexistent_combatant_raises(self, db):
        enc = create_encounter(db, EncounterCreate(name="Test"))
        with pytest.raises(ValueError):
            update_combatant(db, enc.id, "nonexistent-id", CombatantPatch(current_hp=5))


class TestAdvanceTurn:
    def test_advances_turn_index(self, db):
        enc = create_encounter(db, EncounterCreate(name="Test"))
        _make_combatant(db, enc.id, "A", initiative=20)
        _make_combatant(db, enc.id, "B", initiative=10)
        db.refresh(enc)
        updated = advance_turn(db, enc)
        assert updated.active_combatant_index == 1

    def test_wraps_and_increments_round(self, db):
        enc = create_encounter(db, EncounterCreate(name="Test"))
        _make_combatant(db, enc.id, "A", initiative=20)
        db.refresh(enc)
        updated = advance_turn(db, enc)
        assert updated.round == 2
        assert updated.active_combatant_index == 0


class TestEndEncounter:
    def test_end_encounter(self, db):
        enc = create_encounter(db, EncounterCreate(name="Test"))
        end_encounter(db, enc)
        db.refresh(enc)
        assert enc.is_active is False
        assert enc.is_running is False
