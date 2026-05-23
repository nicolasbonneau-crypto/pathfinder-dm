from __future__ import annotations
import json
import re
import anthropic

from app.config import settings
from app.schemas.combat import MonsterCardOut

_MONSTER_PROMPT = """
You are a Pathfinder 2e game master assistant. The user wants the stat block for a monster.
Return ONLY a valid JSON object matching this schema (no markdown, no explanation):

{{
  "name": string,
  "level": integer,
  "traits": [string],
  "ac": integer,
  "hp": integer,
  "speed": string,
  "perception": integer,
  "skills": {{skill_name: modifier_integer}},
  "abilities": {{"str": int, "dex": int, "con": int, "int": int, "wis": int, "cha": int}},
  "saves": {{"fort": int, "ref": int, "will": int}},
  "attacks": [{{"name": string, "bonus": int, "damage": string}}],
  "abilities_special": [{{"name": string, "description": string}}],
  "source": "rag"
}}

Monster requested: {monster_name}

Use your Pathfinder 2e knowledge to fill in accurate stats.
If you are uncertain about exact values, use reasonable estimates for the creature level.
"""


def get_monster_card(monster_name: str) -> MonsterCardOut:
    client = anthropic.Anthropic(api_key=settings.anthropic_api_key)

    message = client.messages.create(
        model=settings.claude_model_fast,
        max_tokens=1024,
        messages=[
            {
                "role": "user",
                "content": _MONSTER_PROMPT.format(monster_name=monster_name),
            }
        ],
    )

    raw = message.content[0].text.strip()
    # Strip any accidental markdown fences
    raw = re.sub(r"^```(?:json)?\n?", "", raw)
    raw = re.sub(r"\n?```$", "", raw)

    data = json.loads(raw)
    data["source"] = "rag"
    return MonsterCardOut.model_validate(data)
