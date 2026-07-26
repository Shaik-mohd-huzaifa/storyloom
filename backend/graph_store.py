import os
from typing import List

from neo4j import GraphDatabase

from schemas import ExtractionResult


class GraphStore:
    def __init__(self):
        self._driver = GraphDatabase.driver(
            os.getenv("NEO4J_URI", "bolt://neo4j:7687"),
            auth=(
                os.getenv("NEO4J_USER", "neo4j"),
                os.getenv("NEO4J_PASSWORD", "password"),
            ),
        )

    def close(self):
        self._driver.close()

    def verify_connectivity(self):
        self._driver.verify_connectivity()

    def get_all_entities(self):
        """Fetch all entities from Neo4j."""
        with self._driver.session() as session:
            return session.execute_read(self._read_all_entities)

    @staticmethod
    def _read_all_entities(tx):
        entities = {"characters": [], "locations": [], "plot_threads": [], "events": []}

        # Characters
        chars = tx.run("MATCH (ch:Character) RETURN ch.name as name, ch.traits as traits, ch.voice_tone as voice, ch.status as status, ch.chunk_ids as chunk_ids")
        for record in chars:
            entities["characters"].append({
                "id": record["name"],
                "kind": "character",
                "name": record["name"],
                "blurb": record["traits"] or "Character",
                "summary": record["voice"] or "",
                "status": record["status"],
                "chunk_ids": record["chunk_ids"] or [],
            })

        # Locations
        locs = tx.run("MATCH (l:Location) RETURN l.name as name, l.chunk_ids as chunk_ids")
        for record in locs:
            entities["locations"].append({
                "id": record["name"],
                "kind": "location",
                "name": record["name"],
                "blurb": "Location",
                "chunk_ids": record["chunk_ids"] or [],
            })

        # Plot Threads
        threads = tx.run("MATCH (pt:PlotThread) RETURN pt.name as name, pt.status as status, pt.chunk_ids as chunk_ids")
        for record in threads:
            entities["plot_threads"].append({
                "id": record["name"],
                "kind": "plotThread",
                "name": record["name"],
                "blurb": "Plot Thread",
                "status": record["status"],
                "chunk_ids": record["chunk_ids"] or [],
            })

        # Events
        events = tx.run("MATCH (ev:Event) RETURN ev.id as id, ev.description as description, ev.episode as episode, ev.chunk_ids as chunk_ids")
        for record in events:
            entities["events"].append({
                "id": record["id"],
                "kind": "event",
                "name": record["episode"] or "Event",
                "blurb": (record["description"][:100] if record["description"] else "") or "",
                "summary": record["description"] or "",
                "chunk_ids": record["chunk_ids"] or [],
            })

        return entities

    def store_extraction(self, result: ExtractionResult, episode: str, chunk_ids: List[str]) -> int:
        with self._driver.session() as session:
            session.execute_write(self._write_extraction, result, episode, chunk_ids)
        return len(result.events)

    @staticmethod
    def _merge_chunk_id(tx, label: str, match_key: str, match_value: str, chunk_id: str):
        tx.run(
            f"""
            MATCH (n:{label} {{{match_key}: $match_value}})
            SET n.chunk_ids = CASE
                WHEN n.chunk_ids IS NULL THEN [$chunk_id]
                WHEN NOT $chunk_id IN n.chunk_ids THEN n.chunk_ids + $chunk_id
                ELSE n.chunk_ids
            END
            """,
            match_value=match_value,
            chunk_id=chunk_id,
        )

    @staticmethod
    def _write_extraction(tx, result: ExtractionResult, episode: str, chunk_ids: List[str]):
        for c in result.characters:
            tx.run(
                """
                MERGE (ch:Character {name: $name})
                SET ch.traits = coalesce($traits, ch.traits),
                    ch.voice_tone = coalesce($voice_tone, ch.voice_tone),
                    ch.status = coalesce($status, ch.status)
                """,
                name=c.name,
                traits=c.traits,
                voice_tone=c.voice_tone,
                status=c.status,
            )

        for l in result.locations:
            tx.run("MERGE (:Location {name: $name})", name=l.name)

        for p in result.plot_threads:
            tx.run(
                """
                MERGE (pt:PlotThread {name: $name})
                SET pt.status = coalesce($status, pt.status)
                """,
                name=p.name,
                status=p.status,
            )

        event_ids = []
        prev_event_id = None
        for idx, e in enumerate(result.events):
            event_id = f"{episode}::{idx}"
            event_ids.append(event_id)
            tx.run(
                """
                MERGE (ev:Event {id: $id})
                SET ev.description = $description, ev.episode = $episode
                """,
                id=event_id,
                description=e.description,
                episode=episode,
            )

            for char_name in e.characters:
                tx.run(
                    """
                    MERGE (ch:Character {name: $cname})
                    WITH ch
                    MATCH (ev:Event {id: $eid})
                    MERGE (ch)-[:APPEARS_IN]->(ev)
                    """,
                    cname=char_name,
                    eid=event_id,
                )

            if e.location:
                tx.run(
                    """
                    MERGE (l:Location {name: $lname})
                    WITH l
                    MATCH (ev:Event {id: $eid})
                    MERGE (ev)-[:OCCURS_AT]->(l)
                    """,
                    lname=e.location,
                    eid=event_id,
                )

            if e.plot_thread:
                tx.run(
                    """
                    MERGE (pt:PlotThread {name: $pname})
                    WITH pt
                    MATCH (ev:Event {id: $eid})
                    MERGE (ev)-[:PART_OF]->(pt)
                    """,
                    pname=e.plot_thread,
                    eid=event_id,
                )

            if prev_event_id:
                tx.run(
                    """
                    MATCH (a:Event {id: $prev}), (b:Event {id: $curr})
                    MERGE (a)-[:FOLLOWS]->(b)
                    """,
                    prev=prev_event_id,
                    curr=event_id,
                )

            prev_event_id = event_id

        for r in result.relationships:
            tx.run(
                """
                MERGE (a:Character {name: $a})
                MERGE (b:Character {name: $b})
                MERGE (a)-[rel:RELATED_TO]->(b)
                SET rel.type = $rtype
                """,
                a=r.character_a,
                b=r.character_b,
                rtype=r.relation_type,
            )

        for chunk_idx, chunk in enumerate(result.chunks):
            if chunk_idx >= len(chunk_ids):
                continue
            chunk_id = chunk_ids[chunk_idx]

            for name in chunk.characters:
                GraphStore._merge_chunk_id(tx, "Character", "name", name, chunk_id)
            for name in chunk.locations:
                GraphStore._merge_chunk_id(tx, "Location", "name", name, chunk_id)
            for name in chunk.plot_threads:
                GraphStore._merge_chunk_id(tx, "PlotThread", "name", name, chunk_id)
            for event_idx in chunk.event_indices:
                if 0 <= event_idx < len(event_ids):
                    GraphStore._merge_chunk_id(tx, "Event", "id", event_ids[event_idx], chunk_id)
