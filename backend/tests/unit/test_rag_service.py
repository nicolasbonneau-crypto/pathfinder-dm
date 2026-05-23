from __future__ import annotations
import pytest
from unittest.mock import MagicMock, patch

from app.services.rag_service import _build_chat_history, _format_source, _NO_CONTEXT_RESPONSE


class TestBuildChatHistory:
    def test_empty_history(self):
        assert _build_chat_history([]) == []

    def test_converts_user_and_assistant(self):
        history = [
            {"role": "user", "content": "What is flanking?"},
            {"role": "assistant", "content": "Flanking gives a +2 bonus."},
        ]
        result = _build_chat_history(history)
        assert len(result) == 2
        assert result[0].role.value == "user"
        assert result[1].role.value == "assistant"

    def test_skips_unknown_roles(self):
        history = [
            {"role": "system", "content": "ignored"},
            {"role": "user", "content": "kept"},
        ]
        result = _build_chat_history(history)
        assert len(result) == 1
        assert result[0].content == "kept"

    def test_skips_missing_content(self):
        history = [{"role": "user"}]
        result = _build_chat_history(history)
        assert result == []


class TestFormatSource:
    def test_with_page_label(self):
        assert _format_source({"source": "core.pdf", "page_label": "42"}) == "core.pdf p.42"

    def test_with_page_fallback(self):
        assert _format_source({"source": "core.pdf", "page": 7}) == "core.pdf p.7"

    def test_without_page(self):
        assert _format_source({"source": "core.pdf"}) == "core.pdf"

    def test_missing_source(self):
        assert _format_source({}) == "unknown"


class TestQueryRag:
    def _mock_response(self, text: str, nodes: list) -> MagicMock:
        resp = MagicMock()
        resp.__str__ = lambda self: text
        resp.source_nodes = nodes
        return resp

    def _mock_node(self, score: float, source: str, page: str | None = None) -> MagicMock:
        node = MagicMock()
        node.score = score
        node.metadata = {"source": source, **({"page_label": page} if page else {})}
        return node

    @patch("app.services.rag_service.VectorStoreIndex")
    @patch("app.services.rag_service.ChromaVectorStore")
    @patch("app.services.rag_service._get_chroma_collection")
    @patch("app.services.rag_service._configure_llamaindex")
    def test_returns_no_context_when_source_nodes_empty(self, mock_cfg, mock_coll, mock_vs, mock_idx):
        chat_engine = MagicMock()
        chat_engine.chat.return_value = self._mock_response("Some answer", [])
        mock_idx.from_vector_store.return_value.as_chat_engine.return_value = chat_engine

        from app.services.rag_service import query_rag
        answer, sources, has_context = query_rag("test", [])

        assert has_context is False
        assert sources == []
        assert answer == _NO_CONTEXT_RESPONSE

    @patch("app.services.rag_service.VectorStoreIndex")
    @patch("app.services.rag_service.ChromaVectorStore")
    @patch("app.services.rag_service._get_chroma_collection")
    @patch("app.services.rag_service._configure_llamaindex")
    def test_returns_answer_and_sources_when_nodes_present(self, mock_cfg, mock_coll, mock_vs, mock_idx):
        node = self._mock_node(0.9, "core.pdf", "55")
        chat_engine = MagicMock()
        chat_engine.chat.return_value = self._mock_response("Flanking gives +2.", [node])
        mock_idx.from_vector_store.return_value.as_chat_engine.return_value = chat_engine

        from app.services.rag_service import query_rag
        answer, sources, has_context = query_rag("What is flanking?", [])

        assert has_context is True
        assert answer == "Flanking gives +2."
        assert "core.pdf p.55" in sources

    @patch("app.services.rag_service.VectorStoreIndex")
    @patch("app.services.rag_service.ChromaVectorStore")
    @patch("app.services.rag_service._get_chroma_collection")
    @patch("app.services.rag_service._configure_llamaindex")
    def test_passes_chat_history_to_engine(self, mock_cfg, mock_coll, mock_vs, mock_idx):
        chat_engine = MagicMock()
        chat_engine.chat.return_value = self._mock_response("ok", [])
        mock_idx.from_vector_store.return_value.as_chat_engine.return_value = chat_engine

        from app.services.rag_service import query_rag
        query_rag("follow-up", [{"role": "user", "content": "hi"}, {"role": "assistant", "content": "hello"}])

        _, kwargs = chat_engine.chat.call_args
        assert kwargs.get("chat_history") is not None
        assert len(kwargs["chat_history"]) == 2
