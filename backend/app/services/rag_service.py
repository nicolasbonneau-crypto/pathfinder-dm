from __future__ import annotations
import uuid
from pathlib import Path
from typing import Optional

from llama_index.core import VectorStoreIndex, SimpleDirectoryReader, StorageContext, Settings as LISettings
from llama_index.vector_stores.chroma import ChromaVectorStore
from llama_index.llms.anthropic import Anthropic as AnthropicLLM
from llama_index.embeddings.huggingface import HuggingFaceEmbedding
import chromadb

from app.config import settings


def _get_chroma_collection() -> chromadb.Collection:
    client = chromadb.PersistentClient(path=settings.chroma_persist_dir)
    return client.get_or_create_collection("rulebooks")


def _configure_llamaindex() -> None:
    LISettings.llm = AnthropicLLM(
        model=settings.claude_model,
        api_key=settings.anthropic_api_key,
    )
    LISettings.embed_model = HuggingFaceEmbedding(model_name="BAAI/bge-small-en-v1.5")


def index_pdf(pdf_path: Path, book_id: str) -> int:
    _configure_llamaindex()
    collection = _get_chroma_collection()
    vector_store = ChromaVectorStore(chroma_collection=collection)
    storage_context = StorageContext.from_defaults(vector_store=vector_store)

    docs = SimpleDirectoryReader(input_files=[str(pdf_path)]).load_data()
    for doc in docs:
        doc.metadata["book_id"] = book_id
        doc.metadata["source"] = pdf_path.name

    VectorStoreIndex.from_documents(docs, storage_context=storage_context)
    return len(docs)


def delete_book_chunks(book_id: str) -> None:
    collection = _get_chroma_collection()
    collection.delete(where={"book_id": book_id})


def query_rag(message: str, history: list[dict[str, str]]) -> tuple[str, list[str]]:
    _configure_llamaindex()
    collection = _get_chroma_collection()
    vector_store = ChromaVectorStore(chroma_collection=collection)
    index = VectorStoreIndex.from_vector_store(vector_store)

    chat_engine = index.as_chat_engine(
        chat_mode="condense_plus_context",
        verbose=False,
        system_prompt=(
            "You are an expert Pathfinder 2e rules assistant. "
            "Answer concisely and accurately using the provided rulebook context. "
            "Cite the source book and page number when possible."
        ),
    )

    response = chat_engine.chat(message)
    sources = list({
        node.metadata.get("source", "")
        for node in response.source_nodes
        if node.metadata.get("source")
    })
    return str(response), sources
