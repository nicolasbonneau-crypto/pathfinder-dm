from __future__ import annotations
import json
import pytest
from unittest.mock import MagicMock, patch


def _make_valid_card() -> dict:
    return {
        "name": "Goblin",
        "level": 1,
        "traits": ["goblin", "humanoid"],
        "ac": 16,
        "hp": 6,
        "speed": "25 feet",
        "perception": 3,
        "skills": {"stealth": 7},
        "abilities": {"str": -1, "dex": 3, "con": 0, "int": 0, "wis": -1, "cha": 1},
        "saves": {"fort": 5, "ref": 7, "will": 3},
        "attacks": [{"name": "Jaws", "bonus": 7, "damage": "1d6-1 piercing"}],
        "abilities_special": [],
        "source": "rag",
    }


class TestGetMonsterCard:
    @patch("app.services.monster_service._configure_llamaindex")
    @patch("app.services.monster_service._get_chroma_collection")
    def test_raises_when_no_books(self, mock_coll, mock_cfg):
        mock_coll.return_value.count.return_value = 0

        from app.services.monster_service import get_monster_card
        with pytest.raises(LookupError, match="No rulebooks indexed"):
            get_monster_card("Goblin")

    @patch("app.services.monster_service.VectorStoreIndex")
    @patch("app.services.monster_service.ChromaVectorStore")
    @patch("app.services.monster_service._configure_llamaindex")
    @patch("app.services.monster_service._get_chroma_collection")
    def test_raises_when_no_relevant_nodes(self, mock_coll, mock_cfg, mock_vs, mock_idx):
        mock_coll.return_value.count.return_value = 5
        retriever = MagicMock()
        retriever.retrieve.return_value = []
        mock_idx.from_vector_store.return_value.as_retriever.return_value = retriever

        from app.services.monster_service import get_monster_card
        with pytest.raises(LookupError, match="not found in the uploaded rulebooks"):
            get_monster_card("Goblin")

    @patch("app.services.monster_service.anthropic.Anthropic")
    @patch("app.services.monster_service.VectorStoreIndex")
    @patch("app.services.monster_service.ChromaVectorStore")
    @patch("app.services.monster_service._configure_llamaindex")
    @patch("app.services.monster_service._get_chroma_collection")
    def test_raises_when_claude_returns_not_found(self, mock_coll, mock_cfg, mock_vs, mock_idx, mock_anthropic):
        mock_coll.return_value.count.return_value = 5
        node = MagicMock()
        node.score = 0.9
        node.get_content.return_value = "some rulebook text"
        mock_idx.from_vector_store.return_value.as_retriever.return_value.retrieve.return_value = [node]

        msg = MagicMock()
        msg.content = [MagicMock(text=json.dumps({"not_found": True}))]
        mock_anthropic.return_value.messages.create.return_value = msg

        from app.services.monster_service import get_monster_card
        with pytest.raises(LookupError, match="not found in the uploaded rulebooks"):
            get_monster_card("Goblin")

    @patch("app.services.monster_service.anthropic.Anthropic")
    @patch("app.services.monster_service.VectorStoreIndex")
    @patch("app.services.monster_service.ChromaVectorStore")
    @patch("app.services.monster_service._configure_llamaindex")
    @patch("app.services.monster_service._get_chroma_collection")
    def test_returns_monster_card_on_success(self, mock_coll, mock_cfg, mock_vs, mock_idx, mock_anthropic):
        mock_coll.return_value.count.return_value = 5
        node = MagicMock()
        node.score = 0.9
        node.get_content.return_value = "Goblin stat block text"
        mock_idx.from_vector_store.return_value.as_retriever.return_value.retrieve.return_value = [node]

        msg = MagicMock()
        msg.content = [MagicMock(text=json.dumps(_make_valid_card()))]
        mock_anthropic.return_value.messages.create.return_value = msg

        from app.services.monster_service import get_monster_card
        card = get_monster_card("Goblin")

        assert card.name == "Goblin"
        assert card.level == 1
        assert card.source == "rag"
        assert card.ac == 16
