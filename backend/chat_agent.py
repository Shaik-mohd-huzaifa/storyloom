import json
import os
import uuid

import vector_store
from openai_client import get_client

MAX_ITERATIONS = int(os.getenv("CHAT_AGENT_MAX_ITERATIONS", "6"))
CHAT_MODEL = os.getenv("OPENAI_CHAT_MODEL", "gpt-4o-mini")

TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "search_story_events",
            "description": "Semantic search over ingested story events (one-sentence, per-event summaries extracted during ingestion). Best for 'what happened' style questions.",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {"type": "string", "description": "Natural-language description of what you're looking for."},
                    "episode": {"type": "string", "description": "Optional episode name to restrict the search to."},
                },
                "required": ["query"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "search_story_chunks",
            "description": "Semantic search over raw ingested source text chunks (verbatim script/prose). Use when you need to quote or verify exact wording, or when search_story_events doesn't surface enough detail.",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {"type": "string", "description": "Natural-language description of what you're looking for."},
                    "episode": {"type": "string", "description": "Optional episode name to restrict the search to."},
                },
                "required": ["query"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "find_entity",
            "description": "Look up a Character, Location, or PlotThread by (fuzzy) name to resolve the exact canonical name stored in the graph.",
            "parameters": {
                "type": "object",
                "properties": {"name": {"type": "string"}},
                "required": ["name"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_character_timeline",
            "description": "Get every event a named character appears in, in story order, optionally restricted to one episode. Use for 'what happened to X' questions.",
            "parameters": {
                "type": "object",
                "properties": {
                    "name": {"type": "string"},
                    "episode": {"type": "string"},
                },
                "required": ["name"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_event_context",
            "description": "Expand a specific event_id (from a search hit) into its full structured context: characters present, location, plot thread, and the events immediately before/after it.",
            "parameters": {
                "type": "object",
                "properties": {"event_id": {"type": "string"}},
                "required": ["event_id"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_relationships",
            "description": "Get a character's known relationships to other characters.",
            "parameters": {
                "type": "object",
                "properties": {"name": {"type": "string"}},
                "required": ["name"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_plot_thread_events",
            "description": "Get every event belonging to a named plot thread, in story order.",
            "parameters": {
                "type": "object",
                "properties": {"name": {"type": "string"}},
                "required": ["name"],
            },
        },
    },
]

STEP_LABELS = {
    "search_story_events": "SEARCHING STORY EVENTS",
    "search_story_chunks": "READING SOURCE TEXT",
    "find_entity": "RESOLVING ENTITY",
    "get_character_timeline": "TRACING TIMELINE",
    "get_event_context": "EXPANDING EVENT CONTEXT",
    "get_relationships": "CHECKING RELATIONSHIPS",
    "get_plot_thread_events": "TRACING PLOT THREAD",
}

CLARIFICATION_INSTRUCTIONS = """Only rely on the user's own prompt for instructions — there are
no canned quick-actions to fall back on, so take their wording at face value. If the request is
genuinely ambiguous or missing something you need (which character/episode/scene they mean, an
unresolved pronoun, a request that could go multiple valid directions) and your tools can't
resolve it on their own, do NOT guess and do NOT fabricate an answer. Instead stop and ask,
using ONLY this JSON shape:
{"needs_clarification": true, "question": str}
Ask one focused question covering exactly what's blocking you. Only use this when genuinely
blocked — try resolving it yourself with tools first (e.g. find_entity for a fuzzy/ambiguous
name) before asking the user to spell it out."""

ASK_SYSTEM_PROMPT = """You are Storyloom's story assistant, embedded in a screenwriter's tool.
Answer the user's question about their ALREADY-INGESTED story using only grounded facts you
retrieve via your tools. You may call tools multiple times, refining your search as you learn
more (e.g. resolve a name with find_entity, then pull its timeline, then expand an interesting
event for detail). Do not invent events, characters, or relationships that your tools didn't
surface.

""" + CLARIFICATION_INSTRUCTIONS + """

Otherwise, once you have enough information, respond with ONLY a JSON object (no prose outside it):
{"answer_text": str, "citations": [{"text": str, "episode": str|null, "event_id": str|null, "chunk_id": str|null}]}

"text" in each citation should be a short human-readable grounding line, e.g.
"EP07 · Mara loses her badge to the collector at the Wharf". Include every citation your
retrieved evidence supports, even if you don't quote it verbatim in answer_text."""

IDEATE_SYSTEM_PROMPT = """You are Storyloom's story assistant, embedded in a screenwriter's tool,
in IDEATE mode. The user wants suggestions for how to continue their manuscript. Use your tools
to gather relevant grounding first: character timelines, relationships, recent events near the
requested scene/episode, open plot threads — whatever makes a continuation plausible and
consistent with what's already been established.

""" + CLARIFICATION_INSTRUCTIONS + """

Otherwise, produce exactly {{N_OPTIONS}} DISTINCT directions (differ in plot direction, tone, or
which character/thread they foreground — do not offer near-duplicates). Each must be justified
by specific retrieved facts, not just "this would be dramatic."

Respond with ONLY a JSON object (no prose outside it):
{"options": [{"label": str, "text": str, "rationale": str,
  "citations": [{"text": str, "episode": str|null, "event_id": str|null, "chunk_id": str|null}]}]}

"label" is a short 2-5 word title for the option. "text" is the actual suggested manuscript
continuation. "rationale" explains why it fits, referencing the citations."""


def _dispatch_tool(name: str, args: dict, graph_store) -> dict:
    if name == "search_story_events":
        where = {"episode": args["episode"]} if args.get("episode") else None
        return {"results": vector_store.query("story_events", args["query"], n_results=5, where=where)}
    if name == "search_story_chunks":
        where = {"episode": args["episode"]} if args.get("episode") else None
        return {"results": vector_store.query("story_chunks", args["query"], n_results=5, where=where)}
    if name == "find_entity":
        return {"results": graph_store.find_entity(args["name"])}
    if name == "get_character_timeline":
        return {"results": graph_store.get_character_timeline(args["name"], args.get("episode"))}
    if name == "get_event_context":
        return {"result": graph_store.get_event_context(args["event_id"])}
    if name == "get_relationships":
        return {"results": graph_store.get_relationships(args["name"])}
    if name == "get_plot_thread_events":
        return {"results": graph_store.get_plot_thread_events(args["name"])}
    return {"error": f"unknown tool {name}"}


def _collect_citations(tool_name: str, tool_result: dict) -> list[dict]:
    """Best-effort extraction of citation-shaped facts from a tool result, so the final
    answer's citation pool includes everything touched even if the model forgets to
    restate it explicitly."""
    citations = []
    if tool_name in ("search_story_events", "search_story_chunks"):
        for hit in tool_result.get("results", []):
            meta = hit.get("metadata", {})
            citations.append({
                "text": hit.get("document", "")[:160],
                "episode": meta.get("episode"),
                "event_id": meta.get("event_id") if tool_name == "search_story_events" else None,
                "chunk_id": hit.get("id") if tool_name == "search_story_chunks" else None,
            })
    elif tool_name in ("get_character_timeline", "get_plot_thread_events"):
        for ev in tool_result.get("results", []):
            citations.append({
                "text": f"{ev.get('episode')} · {ev.get('description')}",
                "episode": ev.get("episode"),
                "event_id": ev.get("event_id"),
                "chunk_id": None,
            })
    elif tool_name == "get_event_context":
        r = tool_result.get("result")
        if r:
            citations.append({
                "text": f"{r.get('episode')} · {r.get('description')}",
                "episode": r.get("episode"),
                "event_id": r.get("event_id"),
                "chunk_id": None,
            })
    return citations


def run(request, graph_store, on_step=None) -> dict:
    """Runs the multi-step tool-calling agent loop for a ChatRequest and returns a dict
    matching the ChatMessageResponse shape (ask: text+cites; ideate: options).
    `on_step(label: str)` is called before/after each tool dispatch for progress reporting."""
    client = get_client()
    n_options = request.n_options or 3

    if request.mode == "ideate":
        system_prompt = IDEATE_SYSTEM_PROMPT.replace("{{N_OPTIONS}}", str(n_options))
    else:
        system_prompt = ASK_SYSTEM_PROMPT

    user_content = request.message
    if request.context_chips:
        user_content += f"\n\n(User has explicitly flagged these entities as relevant: {', '.join(request.context_chips)})"
    if request.episode:
        user_content += f"\n\n(Active episode: {request.episode})"
    if request.cursor_context:
        user_content += f"\n\n(Text immediately surrounding the cursor in the manuscript:\n{request.cursor_context})"

    messages = [{"role": "system", "content": system_prompt}]
    # Prior turns (e.g. the agent's own earlier clarifying question and the user's reply)
    # so a clarification round-trip doesn't lose context. Capped to keep prompts bounded.
    for turn in request.history[-20:]:
        messages.append({"role": turn.role, "content": turn.content})
    messages.append({"role": "user", "content": user_content})

    citation_pool = []

    for _ in range(MAX_ITERATIONS):
        response = client.chat.completions.create(
            model=CHAT_MODEL,
            tools=TOOLS,
            tool_choice="auto",
            temperature=0.4 if request.mode == "ideate" else 0.1,
            messages=messages,
        )
        choice = response.choices[0]
        tool_calls = choice.message.tool_calls

        if not tool_calls:
            return _finalize(request, choice.message.content, citation_pool)

        messages.append({
            "role": "assistant",
            "content": choice.message.content,
            "tool_calls": [tc.model_dump() for tc in tool_calls],
        })

        for tc in tool_calls:
            name = tc.function.name
            try:
                args = json.loads(tc.function.arguments or "{}")
            except json.JSONDecodeError:
                args = {}

            if on_step:
                episode_hint = f" ({args['episode']})" if args.get("episode") else ""
                on_step(STEP_LABELS.get(name, name.upper()) + episode_hint)

            result = _dispatch_tool(name, args, graph_store)
            citation_pool.extend(_collect_citations(name, result))

            messages.append({
                "role": "tool",
                "tool_call_id": tc.id,
                "content": json.dumps(result)[:6000],
            })

    # Iteration cap hit: force a final answer with whatever context has been gathered.
    if on_step:
        on_step("FINALIZING ANSWER")
    messages.append({
        "role": "user",
        "content": "You've reached the tool-call limit. Answer now with what you have, in the required JSON format, noting any gaps.",
    })
    response = client.chat.completions.create(
        model=CHAT_MODEL,
        temperature=0.1,
        messages=messages,
        response_format={"type": "json_object"},
    )
    return _finalize(request, response.choices[0].message.content, citation_pool)


def _finalize(request, content: str, citation_pool: list[dict]) -> dict:
    try:
        data = json.loads(content) if content else {}
    except json.JSONDecodeError:
        data = {}

    if data.get("needs_clarification"):
        return {
            "label": "CLARIFYING QUESTION",
            "text": data.get("question", "Could you clarify what you mean?"),
            "cites": [],
            "actions": [],
            "options": [],
            "needs_clarification": True,
        }

    if request.mode == "ideate":
        options = []
        for opt in data.get("options", [])[: (request.n_options or 3)]:
            options.append({
                "id": f"opt-{uuid.uuid4().hex[:8]}",
                "label": opt.get("label", "Option"),
                "text": opt.get("text", ""),
                "rationale": opt.get("rationale", ""),
                "cites": opt.get("citations") or [],
                "action": {"type": "insert", "label": "Insert into scene", "text": opt.get("text", "")},
            })
        return {
            "label": "SUGGESTIONS",
            "text": f"Here are {len(options)} directions for this scene:" if options else "I couldn't generate grounded suggestions from the ingested story.",
            "cites": [],
            "actions": [],
            "options": options,
        }

    citations = data.get("citations")
    if not citations:
        citations = citation_pool[:8]
    return {
        "label": "ANALYSIS",
        "text": data.get("answer_text", "I couldn't find grounded information to answer that."),
        "cites": citations,
        "actions": [],
        "options": [],
    }
