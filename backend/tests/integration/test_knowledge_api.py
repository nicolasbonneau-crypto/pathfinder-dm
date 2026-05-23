from __future__ import annotations
import io
import pytest
from unittest.mock import patch


class TestKnowledgeAPI:
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
        fake_pdf = b"%PDF-1.4 fake content"
        with patch("app.routers.knowledge._index_book"):
            res = client.post(
                "/api/knowledge/books",
                files={"file": ("core_rulebook.pdf", io.BytesIO(fake_pdf), "application/pdf")},
            )
        assert res.status_code == 201
        data = res.json()
        assert data["filename"] == "core_rulebook.pdf"
        assert data["title"] == "Core Rulebook"

    def test_chat_without_books_returns_422(self, client):
        res = client.post("/api/knowledge/chat", json={"message": "What is flanking?"})
        assert res.status_code == 422

    def test_delete_book(self, client):
        fake_pdf = b"%PDF-1.4"
        with patch("app.routers.knowledge._index_book"), \
             patch("app.services.rag_service.delete_book_chunks"):
            upload = client.post(
                "/api/knowledge/books",
                files={"file": ("book.pdf", io.BytesIO(fake_pdf), "application/pdf")},
            ).json()
            res = client.delete(f"/api/knowledge/books/{upload['id']}")
        assert res.status_code == 204

        books = client.get("/api/knowledge/books").json()
        assert all(b["id"] != upload["id"] for b in books)
