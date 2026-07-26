import json
import os

from openai_client import get_client
from schemas import ExtractionResult

EXTRACTION_PROMPT = """You are extracting a story knowledge graph from a script/episode excerpt.
Return ONLY valid JSON matching this exact structure:
{{
  "characters": [{{"name": str, "traits": str|null, "voice_tone": str|null, "status": "alive"|"dead"|"missing"|null}}],
  "locations": [{{"name": str}}],
  "plot_threads": [{{"name": str, "status": "open"|"resolved"|null}}],
  "events": [{{"description": str, "characters": [str], "location": str|null, "plot_thread": str|null}}],
  "relationships": [{{"character_a": str, "character_b": str, "relation_type": str}}]
}}

Rules:
- Only extract entities/events explicitly present in the text below.
- Reuse the exact same character/location/plot_thread name string across events and relationships so they can be linked.
- List events in the chronological order they occur in the text; keep each description to one sentence.
- If nothing of a given type is present, return an empty list for it.

Episode/source: {episode}

Text:
\"\"\"
{chunk}
\"\"\"
"""


def extract_entities(chunk: str, episode: str) -> ExtractionResult:
    client = get_client()
    response = client.chat.completions.create(
        model=os.getenv("OPENAI_EXTRACTION_MODEL", "gpt-4o-mini"),
        response_format={"type": "json_object"},
        temperature=0,
        messages=[
            {
                "role": "system",
                "content": "You extract structured story knowledge graphs as JSON.",
            },
            {
                "role": "user",
                "content": EXTRACTION_PROMPT.format(episode=episode, chunk=chunk),
            },
        ],
    )
    data = json.loads(response.choices[0].message.content)
    return ExtractionResult.model_validate(data)
