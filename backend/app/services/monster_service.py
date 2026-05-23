from __future__ import annotations
import json
import re
import anthropic

from llama_index.core import VectorStoreIndex, Settings as LISettings
from llama_index.vector_stores.chroma import ChromaVectorStore
from llama_index.llms.anthropic import Anthropic as AnthropicLLM
from llama_index.embeddings.huggingface import HuggingFaceEmbedding
import chromadb

from app.config import settings
from app.schemas.combat import MonsterCardOut

_SIMILARITY_CUTOFF = 0.4
_TOP_K = 8

_SYSTEM_PROMPT = """You are a Pathfinder 2e stat block extractor.

You will receive rulebook excerpts as context. Extract the stat block for the requested \
monster ONLY from that context. Do not use any Pathfinder knowledge from your training data.

If the monster's stat block is present in the context, return ONLY a valid JSON object \
with no markdown, no explanation:
{
  "name": string,
  "level": integer,
  "traits": [string],
  "ac": integer,
  "hp": integer,
  "speed": string,
  "perception": integer,
  "skills": {skill_name: modifier_integer},
  "abilities": {"str": int, "dex": int, "con": int, "int": int, "wis": int, "cha": int},
  "saves": {"fort": int, "ref": int, "will": int},
  "attacks": [{"name": string, "bonus": int, "damage": string}],
  "abilities_special": [{"name": string, "description": string}],
  "source": "rag"
}

If the stat block is NOT present in the context, return exactly: {"not_found": true}
Do not guess, estimate, or fill gaps from memory."""


def _configure_llamaindex() -> None:
    LISettings.llm = AnthropicLLM(model=settings.claude_model, api_key=settings.anthropic_api_key)
    LISettings.embed_model = HuggingFaceEmbedding(model_name="BAAI/bge-small-en-v1.5")


def _get_chroma_collection() -> chromadb.Collection:
    client = chromadb.PersistentClient(path=settings.chroma_persist_dir)
    return client.get_or_create_collection("rulebooks")


def get_monster_card(monster_name: str) -> MonsterCardOut:
    _configure_llamaindex()
    collection = _get_chroma_collection()

    if collection.count() == 0:
        raise LookupError("No rulebooks indexed. Upload a PDF first.")

    vector_store = ChromaVectorStore(chroma_collection=collection)
    index = VectorStoreIndex.from_vector_store(vector_store)

    nodes = index.as_retriever(similarity_top_k=_TOP_K).retrieve(monster_name)
    relevant = [n for n in nodes if (n.score or 0) >= _SIMILARITY_CUTOFF]

    if not relevant:
        raise LookupError(f"'{monster_name}' was not found in the uploaded rulebooks.")

    context = "\n\n---\n\n".join(n.get_content() for n in relevant)

    client = anthropic.Anthropic(api_key=settings.anthropic_api_key)
    message = client.messages.create(
        model=settings.claude_model_fast,
        max_tokens=1024,
        system=_SYSTEM_PROMPT,
        messages=[{
            "role": "user",
            "content": f"Monster: {monster_name}\n\nRulebook context:\n{context}",
        }],
    )

    raw = message.content[0].text.strip()
    raw = re.sub(r"^```(?:json)?\n?", "", raw)
    raw = re.sub(r"\n?```$", "", raw)

    data = json.loads(raw)

    if data.get("not_found"):
        raise LookupError(f"'{monster_name}' was not found in the uploaded rulebooks.")

    data["source"] = "rag"
    return MonsterCardOut.model_validate(data)
