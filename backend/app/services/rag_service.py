from __future__ import annotations
from pathlib import Path

# llama-index-llms-anthropic 0.3.5 has a hardcoded model list that predates
# claude-sonnet-4-6. Patch the lookup before any AnthropicLLM metadata is accessed.
import llama_index.llms.anthropic.utils as _li_utils
import llama_index.llms.anthropic.base as _li_base
_orig_ctx = _li_utils.anthropic_modelname_to_contextsize
_NEW_MODELS: dict[str, int] = {
    "claude-sonnet-4-6": 200_000,
    "claude-haiku-4-5-20251001": 200_000,
    "claude-opus-4-7": 200_000,
}
_patched_ctx = lambda m: _NEW_MODELS.get(m) or _orig_ctx(m)
# Patch both the utils module AND the direct import reference inside base.py
_li_utils.anthropic_modelname_to_contextsize = _patched_ctx
_li_base.anthropic_modelname_to_contextsize = _patched_ctx

# llama-index-vector-stores-chroma 0.2.1 passes where={} to ChromaDB 0.5.x which
# now rejects empty where dicts. Strip them before they reach the collection.
from llama_index.vector_stores.chroma import ChromaVectorStore as _ChromaVS
_orig__query = _ChromaVS._query
_orig__get = _ChromaVS._get

def _fixed__query(self, query_embeddings, n_results, where, **kwargs):  # type: ignore[override]
    return _orig__query(self, query_embeddings, n_results, where or None, **kwargs)

def _fixed__get(self, limit, where, **kwargs):  # type: ignore[override]
    return _orig__get(self, limit, where or None, **kwargs)

_ChromaVS._query = _fixed__query  # type: ignore[method-assign]
_ChromaVS._get = _fixed__get  # type: ignore[method-assign]

from llama_index.core import VectorStoreIndex, SimpleDirectoryReader, StorageContext, Settings as LISettings
from llama_index.core.llms import ChatMessage, MessageRole
from llama_index.core.postprocessor import SimilarityPostprocessor
from llama_index.vector_stores.chroma import ChromaVectorStore
from llama_index.llms.anthropic import Anthropic as AnthropicLLM
from llama_index.embeddings.huggingface import HuggingFaceEmbedding
import chromadb

from app.config import settings

_SIMILARITY_CUTOFF = 0.4
_TOP_K = 6
_llamaindex_ready = False

_SYSTEM_PROMPT = (
    "You are a Pathfinder 2e rules assistant. You may ONLY use the rulebook excerpts "
    "provided in the context below — never your general training knowledge about Pathfinder.\n\n"
    "Rules:\n"
    "1. If the context does not contain the answer, respond with exactly: "
    "\"I couldn't find that in the uploaded rulebooks.\"\n"
    "2. Do not infer, extrapolate, or fill gaps from memory.\n"
    "3. Always cite the source filename and page number for every rule you reference.\n"
    "4. If the context is ambiguous or contradictory, say so."
)

_NO_CONTEXT_RESPONSE = (
    "I couldn't find relevant information about that in the uploaded rulebooks. "
    "Try rephrasing your question, or check that the relevant book has been uploaded."
)


def _get_chroma_collection() -> chromadb.Collection:
    client = chromadb.PersistentClient(path=settings.chroma_persist_dir)
    return client.get_or_create_collection("rulebooks")


def _configure_llamaindex() -> None:
    global _llamaindex_ready
    if _llamaindex_ready:
        return
    LISettings.llm = AnthropicLLM(
        model=settings.claude_model,
        api_key=settings.anthropic_api_key,
    )
    LISettings.embed_model = HuggingFaceEmbedding(model_name="BAAI/bge-small-en-v1.5")
    _llamaindex_ready = True


def _build_chat_history(history: list[dict[str, str]]) -> list[ChatMessage]:
    role_map = {"user": MessageRole.USER, "assistant": MessageRole.ASSISTANT}
    return [
        ChatMessage(role=role_map[h["role"]], content=h["content"])
        for h in history
        if h.get("role") in role_map and h.get("content")
    ]


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


def query_rag(message: str, history: list[dict[str, str]]) -> tuple[str, list[str], bool]:
    _configure_llamaindex()
    collection = _get_chroma_collection()
    vector_store = ChromaVectorStore(chroma_collection=collection)
    index = VectorStoreIndex.from_vector_store(vector_store)

    chat_engine = index.as_chat_engine(
        chat_mode="condense_plus_context",
        similarity_top_k=_TOP_K,
        node_postprocessors=[SimilarityPostprocessor(similarity_cutoff=_SIMILARITY_CUTOFF)],
        verbose=False,
        system_prompt=_SYSTEM_PROMPT,
    )

    chat_history = _build_chat_history(history)
    response = chat_engine.chat(message, chat_history=chat_history or None)

    if not response.source_nodes:
        return _NO_CONTEXT_RESPONSE, [], False

    sources = list({
        _format_source(node.metadata)
        for node in response.source_nodes
        if node.metadata.get("source")
    })
    return str(response), sources, True


def _format_source(metadata: dict) -> str:
    filename = metadata.get("source", "unknown")
    page = metadata.get("page_label") or metadata.get("page")
    return f"{filename} p.{page}" if page else filename
