from __future__ import annotations
import io
import pytest
from unittest.mock import patch


def _upload_book(client):
    with patch("app.routers.knowledge._index_book"):
        return client.post(
            "/api/knowledge/books",
            files={"file": ("core_rulebook.pdf", io.BytesIO(b"%PDF-1.4"), "application/pdf")},
        ).json()


class TestBooksAPI:
    def test_list_books_empty(self, client):
        res = client.get("/api/knowledge/books")
        assert res.status_code == 200
        assert res.json() == []

    def test_upload_non_pdf_rejected(self, client):
        res = client.post(
            "/api/knowledge/books",
            files={"file": ("notes.txt", b"some text", "text/plain")},
        )
        assert res.status_code == 400

    def test_upload_pdf_creates_book(self, client):
        with patch("app.routers.knowledge._index_book"):
            res = client.post(
                "/api/knowledge/books",
                files={"file": ("core_rulebook.pdf", io.BytesIO(b"%PDF-1.4"), "application/pdf")},
            )
        assert res.status_code == 201
        data = res.json()
        assert data["filename"] == "core_rulebook.pdf"
        assert data["title"] == "Core Rulebook"
        assert "id" in data

    def test_upload_appears_in_list(self, client):
        book = _upload_book(client)
        books = client.get("/api/knowledge/books").json()
        assert any(b["id"] == book["id"] for b in books)

    def test_delete_book_removes_it(self, client):
        book = _upload_book(client)
        with patch("app.services.rag_service.delete_book_chunks"):
            res = client.delete(f"/api/knowledge/books/{book['id']}")
        assert res.status_code == 204
        books = client.get("/api/knowledge/books").json()
        assert all(b["id"] != book["id"] for b in books)

    def test_delete_nonexistent_book_returns_404(self, client):
        with patch("app.services.rag_service.delete_book_chunks"):
            res = client.delete("/api/knowledge/books/does-not-exist")
        assert res.status_code == 404


class TestChatAPI:
    def test_chat_without_books_returns_422(self, client):
        res = client.post("/api/knowledge/chat", json={"message": "What is flanking?"})
        assert res.status_code == 422

    def test_chat_with_books_returns_answer(self, client):
        _upload_book(client)
        with patch(
            "app.services.rag_service.query_rag",
            return_value=("Flanking gives a +2 circumstance bonus.", ["core_rulebook.pdf p.10"], True),
        ):
            res = client.post("/api/knowledge/chat", json={"message": "What is flanking?"})
        assert res.status_code == 200
        data = res.json()
        assert data["answer"] == "Flanking gives a +2 circumstance bonus."
        assert data["sources"] == ["core_rulebook.pdf p.10"]
        assert data["has_context"] is True

    def test_chat_no_context_returns_has_context_false(self, client):
        _upload_book(client)
        with patch(
            "app.services.rag_service.query_rag",
            return_value=("I couldn't find that in the uploaded rulebooks.", [], False),
        ):
            res = client.post("/api/knowledge/chat", json={"message": "unknown spell"})
        assert res.status_code == 200
        data = res.json()
        assert data["has_context"] is False
        assert data["sources"] == []

    def test_chat_passes_history_to_rag(self, client):
        _upload_book(client)
        captured = {}
        def fake_query(message, history):
            captured["history"] = history
            return ("ok", [], True)

        with patch("app.services.rag_service.query_rag", side_effect=fake_query):
            client.post("/api/knowledge/chat", json={
                "message": "follow-up",
                "history": [{"role": "user", "content": "hi"}, {"role": "assistant", "content": "hello"}],
            })
        assert len(captured["history"]) == 2
