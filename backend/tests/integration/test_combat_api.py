from __future__ import annotations
import pytest
from unittest.mock import patch, MagicMock

from app.schemas.combat import MonsterCardOut, MonsterAbilities, MonsterSaves


def _valid_card_out() -> MonsterCardOut:
    return MonsterCardOut(
        name="Goblin", level=1, traits=["goblin"], ac=16, hp=6,
        speed="25 feet", perception=3, skills={"stealth": 7},
        abilities=MonsterAbilities(str=-1, dex=3, con=0, **{"int": 0}, wis=-1, cha=1),
        saves=MonsterSaves(fort=5, ref=7, will=3),
        attacks=[], abilities_special=[], source="rag",
    )


class TestMonsterAPI:
    def test_monster_not_found_returns_404(self, client):
        with patch(
            "app.services.monster_service.get_monster_card",
            side_effect=LookupError("'Goblin' was not found in the uploaded rulebooks."),
        ):
            res = client.get("/api/combat/monsters/Goblin")
        assert res.status_code == 404
        assert "Goblin" in res.json()["detail"]

    def test_monster_no_books_returns_404(self, client):
        with patch(
            "app.services.monster_service.get_monster_card",
            side_effect=LookupError("No rulebooks indexed. Upload a PDF first."),
        ):
            res = client.get("/api/combat/monsters/Goblin")
        assert res.status_code == 404

    def test_monster_found_returns_card(self, client):
        with patch(
            "app.services.monster_service.get_monster_card",
            return_value=_valid_card_out(),
        ):
            res = client.get("/api/combat/monsters/Goblin")
        assert res.status_code == 200
        data = res.json()
        assert data["name"] == "Goblin"
        assert data["source"] == "rag"
        assert data["ac"] == 16

    def test_monster_lookup_error_returns_502(self, client):
        with patch(
            "app.services.monster_service.get_monster_card",
            side_effect=RuntimeError("ChromaDB connection failed"),
        ):
            res = client.get("/api/combat/monsters/Goblin")
        assert res.status_code == 502


class TestPlayerTemplatesAPI:
    def test_list_templates_empty(self, client):
        res = client.get("/api/combat/templates")
        assert res.status_code == 200
        assert res.json() == []

    def test_create_template(self, client):
        res = client.post("/api/combat/templates", json={
            "name": "Thorin", "class_name": "Fighter", "max_hp": 85, "ac": 20,
        })
        assert res.status_code == 201
        data = res.json()
        assert data["name"] == "Thorin"
        assert data["class_name"] == "Fighter"
        assert data["max_hp"] == 85
        assert data["ac"] == 20
        assert "id" in data

    def test_create_template_minimal(self, client):
        res = client.post("/api/combat/templates", json={"name": "Aria", "max_hp": 50})
        assert res.status_code == 201
        data = res.json()
        assert data["class_name"] is None
        assert data["ac"] is None

    def test_template_appears_in_list(self, client):
        t = client.post("/api/combat/templates", json={"name": "Bard", "max_hp": 60}).json()
        templates = client.get("/api/combat/templates").json()
        assert any(tmpl["id"] == t["id"] for tmpl in templates)

    def test_delete_template(self, client):
        t = client.post("/api/combat/templates", json={"name": "Wizard", "max_hp": 40}).json()
        res = client.delete(f"/api/combat/templates/{t['id']}")
        assert res.status_code == 204
        templates = client.get("/api/combat/templates").json()
        assert all(tmpl["id"] != t["id"] for tmpl in templates)

    def test_add_combatant_from_template(self, client):
        enc = client.post("/api/combat/encounter", json={"name": "Session 1"}).json()
        t = client.post("/api/combat/templates", json={
            "name": "Thorin", "class_name": "Fighter", "max_hp": 85, "ac": 20,
        }).json()

        res = client.post(f"/api/combat/encounter/{enc['id']}/combatants/from-template/{t['id']}")
        assert res.status_code == 201
        c = res.json()
        assert c["name"] == "Thorin"
        assert c["type"] == "player"
        assert c["max_hp"] == 85
        assert c["current_hp"] == 85
        assert c["ac"] == 20

    def test_add_from_template_invalid_template_returns_404(self, client):
        enc = client.post("/api/combat/encounter", json={"name": "Test"}).json()
        res = client.post(f"/api/combat/encounter/{enc['id']}/combatants/from-template/bad-id")
        assert res.status_code == 404


class TestEncounterAPI:
    def test_no_active_encounter_returns_null(self, client):
        res = client.get("/api/combat/encounter/active")
        assert res.status_code == 200
        assert res.json() is None

    def test_create_encounter(self, client):
        res = client.post("/api/combat/encounter", json={"name": "Dragon Lair"})
        assert res.status_code == 201
        data = res.json()
        assert data["name"] == "Dragon Lair"
        assert data["is_running"] is True
        assert data["combatants"] == []

    def test_active_encounter_after_create(self, client):
        client.post("/api/combat/encounter", json={"name": "Battle"})
        res = client.get("/api/combat/encounter/active")
        assert res.status_code == 200
        assert res.json()["name"] == "Battle"

    def test_add_combatant(self, client):
        enc = client.post("/api/combat/encounter", json={"name": "Fight"}).json()
        res = client.post(
            f"/api/combat/encounter/{enc['id']}/combatants",
            json={"name": "Goblin", "type": "monster", "max_hp": 15, "current_hp": 15, "initiative": 12},
        )
        assert res.status_code == 201
        assert res.json()["name"] == "Goblin"

    def test_patch_combatant_hp(self, client):
        enc = client.post("/api/combat/encounter", json={"name": "Fight"}).json()
        c = client.post(
            f"/api/combat/encounter/{enc['id']}/combatants",
            json={"name": "Orc", "type": "monster", "max_hp": 30, "current_hp": 30},
        ).json()
        res = client.patch(
            f"/api/combat/encounter/{enc['id']}/combatants/{c['id']}",
            json={"current_hp": 10},
        )
        assert res.status_code == 200
        assert res.json()["current_hp"] == 10

    def test_end_encounter(self, client):
        enc = client.post("/api/combat/encounter", json={"name": "End Test"}).json()
        res = client.post(f"/api/combat/encounter/{enc['id']}/end")
        assert res.status_code == 204
        active = client.get("/api/combat/encounter/active").json()
        assert active is None

    def test_next_turn_advances_index(self, client):
        enc = client.post("/api/combat/encounter", json={"name": "Turn Test"}).json()
        client.post(f"/api/combat/encounter/{enc['id']}/combatants",
                    json={"name": "A", "type": "monster", "max_hp": 10, "current_hp": 10, "initiative": 20})
        client.post(f"/api/combat/encounter/{enc['id']}/combatants",
                    json={"name": "B", "type": "player", "max_hp": 50, "current_hp": 50, "initiative": 10})
        res = client.post(f"/api/combat/encounter/{enc['id']}/next-turn")
        assert res.status_code == 200
        assert res.json()["active_combatant_index"] == 1

    def test_health_endpoint(self, client):
        res = client.get("/health")
        assert res.status_code == 200
        assert res.json() == {"status": "ok"}
