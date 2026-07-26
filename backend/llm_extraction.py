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
  "relationships": [{{"character_a": str, "character_b": str, "relation_type": str}}],
  "chunks": [{{"text": str, "characters": [str], "locations": [str], "plot_threads": [str], "event_indices": [int]}}]
}}

Rules:
- Only extract entities/events explicitly present in the text below.
- Reuse the exact same character/location/plot_thread name string across events, relationships, and chunks so they can be linked.
- List events in the chronological order they occur in the text; keep each description to one sentence.
- If nothing of a given type is present, return an empty list for it.

For "chunks": split the full text below into contiguous, semantically meaningful passages (e.g. one chunk per scene or beat), in order, together covering the whole text. Each chunk is a unit we will embed for semantic search, so:
- "text" must be the verbatim excerpt from the source text (not a summary).
- Aim for roughly a paragraph to a scene per chunk (not the whole episode as one chunk, and not single sentences).
- "characters", "locations", "plot_threads" list the exact name strings (from the lists above) that are present/involved in that chunk.
- "event_indices" lists the 0-based indices into this response's "events" array for events that occur within that chunk.

Episode/source: {episode}

Text:
\"\"\"
{text}
\"\"\"
"""


def extract_entities(text: str, episode: str) -> ExtractionResult:
    client = get_client()
    response = client.chat.completions.create(
        model=os.getenv("OPENAI_EXTRACTION_MODEL", "gpt-4o-mini"),
        response_format={"type": "json_object"},
        temperature=0,
        # A whole-episode extraction (characters/events/relationships + verbatim chunk
        # text) is a large JSON response — without an explicit ceiling the API's default
        # falls short and truncates mid-string, producing invalid JSON. gpt-4o-mini's max
        # output is 16384 tokens; ask for the full budget.
        max_tokens=16384,
        messages=[
            {
                "role": "system",
                "content": "You extract structured story knowledge graphs as JSON.",
            },
            {
                "role": "user",
                "content": EXTRACTION_PROMPT.format(episode=episode, text=text),
            },
        ],
    )
    data = json.loads(response.choices[0].message.content)
    return ExtractionResult.model_validate(data)
