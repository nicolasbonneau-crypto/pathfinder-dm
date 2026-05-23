from __future__ import annotations
import pytest


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
