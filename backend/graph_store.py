import os
import re

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

        chars = tx.run("MATCH (ch:Character) RETURN ch.name as name, ch.traits as traits, ch.voice_tone as voice, ch.status as status")
        for record in chars:
            entities["characters"].append({
                "id": record["name"],
                "kind": "character",
                "name": record["name"],
                "blurb": record["traits"] or "Character",
                "summary": record["voice"] or "",
                "status": record["status"],
            })

        locs = tx.run("MATCH (l:Location) RETURN l.name as name")
        for record in locs:
            entities["locations"].append({
                "id": record["name"],
                "kind": "location",
                "name": record["name"],
                "blurb": "Location",
            })

        threads = tx.run("MATCH (pt:PlotThread) RETURN pt.name as name, pt.status as status")
        for record in threads:
            entities["plot_threads"].append({
                "id": record["name"],
                "kind": "plotThread",
                "name": record["name"],
                "blurb": "Plot Thread",
                "status": record["status"],
            })

        events = tx.run("MATCH (ev:Event) RETURN ev.id as id, ev.description as description, ev.episode as episode")
        for record in events:
            entities["events"].append({
                "id": record["id"],
                "kind": "event",
                "name": record["episode"] or "Event",
                "blurb": (record["description"][:100] if record["description"] else "") or "",
                "summary": record["description"] or "",
            })

        return entities

    def list_episodes(self):
        """Distinct episodes seen across ingested events, in a stable display order."""
        with self._driver.session() as session:
            return session.execute_read(self._read_episodes)

    @staticmethod
    def _read_episodes(tx):
        records = tx.run(
            """
            MATCH (ev:Event)
            WHERE ev.episode IS NOT NULL
            RETURN ev.episode AS episode, count(ev) AS event_count
            ORDER BY episode
            """
        )
        episodes = []
        for idx, record in enumerate(records):
            name = record["episode"]
            match = re.search(r"(\d+)", name)
            num = int(match.group(1)) if match else idx + 1
            episodes.append({
                "id": name,
                "num": num,
                "title": name,
                "mins": 0,
                "status": "draft",
                "event_count": record["event_count"],
            })
        return episodes

    def find_entity(self, name: str, fuzzy: bool = True):
        """Case-insensitive lookup of a Character/Location/PlotThread by name."""
        with self._driver.session() as session:
            return session.execute_read(self._read_find_entity, name, fuzzy)

    @staticmethod
    def _read_find_entity(tx, name: str, fuzzy: bool):
        clause = "toLower(n.name) CONTAINS toLower($name)" if fuzzy else "toLower(n.name) = toLower($name)"
        records = tx.run(
            f"""
            MATCH (n)
            WHERE (n:Character OR n:Location OR n:PlotThread) AND {clause}
            RETURN n.name AS name, labels(n) AS labels
            LIMIT 10
            """,
            name=name,
        )
        results = []
        for record in records:
            labels = record["labels"]
            kind = "character" if "Character" in labels else "location" if "Location" in labels else "plotThread"
            results.append({"name": record["name"], "kind": kind})
        return results

    def get_character_timeline(self, name: str, episode: str = None):
        """Events a character appears in, ordered by episode then FOLLOWS chain within episode."""
        with self._driver.session() as session:
            return session.execute_read(self._read_character_timeline, name, episode)

    @staticmethod
    def _read_character_timeline(tx, name: str, episode: str):
        query = """
            MATCH (ch:Character)-[:APPEARS_IN]->(ev:Event)
            WHERE toLower(ch.name) = toLower($name)
        """
        if episode:
            query += " AND ev.episode = $episode"
        query += """
            OPTIONAL MATCH (ev)-[:OCCURS_AT]->(loc:Location)
            OPTIONAL MATCH (ev)-[:PART_OF]->(pt:PlotThread)
            OPTIONAL MATCH (prev:Event)-[:FOLLOWS]->(ev)
            RETURN ev.id AS event_id, ev.description AS description, ev.episode AS episode,
                   loc.name AS location, pt.name AS plot_thread, prev.id AS prev_event_id
            ORDER BY ev.episode, prev_event_id
        """
        records = tx.run(query, name=name, episode=episode)
        return [
            {
                "event_id": r["event_id"],
                "description": r["description"],
                "episode": r["episode"],
                "location": r["location"],
                "plot_thread": r["plot_thread"],
            }
            for r in records
        ]

    def get_event_context(self, event_id: str):
        """Expand a single event into its full graph neighborhood (characters, location,
        plot thread, and chronologically adjacent events) — used to turn a vector-search
        hit into precise, citable structured facts."""
        with self._driver.session() as session:
            return session.execute_read(self._read_event_context, event_id)

    @staticmethod
    def _read_event_context(tx, event_id: str):
        record = tx.run(
            """
            MATCH (ev:Event {id: $event_id})
            OPTIONAL MATCH (ch:Character)-[:APPEARS_IN]->(ev)
            OPTIONAL MATCH (ev)-[:OCCURS_AT]->(loc:Location)
            OPTIONAL MATCH (ev)-[:PART_OF]->(pt:PlotThread)
            OPTIONAL MATCH (prev:Event)-[:FOLLOWS]->(ev)
            OPTIONAL MATCH (ev)-[:FOLLOWS]->(next:Event)
            RETURN ev.id AS event_id, ev.description AS description, ev.episode AS episode,
                   collect(DISTINCT ch.name) AS characters, loc.name AS location,
                   pt.name AS plot_thread, prev.id AS prev_event_id, prev.description AS prev_description,
                   next.id AS next_event_id, next.description AS next_description
            """,
            event_id=event_id,
        ).single()
        if not record:
            return None
        return {
            "event_id": record["event_id"],
            "description": record["description"],
            "episode": record["episode"],
            "characters": [c for c in record["characters"] if c],
            "location": record["location"],
            "plot_thread": record["plot_thread"],
            "previous_event": (
                {"event_id": record["prev_event_id"], "description": record["prev_description"]}
                if record["prev_event_id"] else None
            ),
            "next_event": (
                {"event_id": record["next_event_id"], "description": record["next_description"]}
                if record["next_event_id"] else None
            ),
        }

    def get_relationships(self, name: str):
        with self._driver.session() as session:
            return session.execute_read(self._read_relationships, name)

    @staticmethod
    def _read_relationships(tx, name: str):
        records = tx.run(
            """
            MATCH (a:Character)-[rel:RELATED_TO]-(b:Character)
            WHERE toLower(a.name) = toLower($name)
            RETURN b.name AS other, rel.type AS relation_type
            """,
            name=name,
        )
        return [{"other": r["other"], "relation_type": r["relation_type"]} for r in records]

    def get_plot_thread_events(self, name: str):
        with self._driver.session() as session:
            return session.execute_read(self._read_plot_thread_events, name)

    @staticmethod
    def _read_plot_thread_events(tx, name: str):
        records = tx.run(
            """
            MATCH (pt:PlotThread)<-[:PART_OF]-(ev:Event)
            WHERE toLower(pt.name) = toLower($name)
            OPTIONAL MATCH (prev:Event)-[:FOLLOWS]->(ev)
            RETURN ev.id AS event_id, ev.description AS description, ev.episode AS episode
            ORDER BY ev.episode
            """,
            name=name,
        )
        return [
            {"event_id": r["event_id"], "description": r["description"], "episode": r["episode"]}
            for r in records
        ]

    def store_extraction(self, result: ExtractionResult, episode: str, event_offset: int) -> list[str]:
        """Writes the extraction to Neo4j and returns the list of event IDs created, in the
        same order as result.events (used to align vector-store indexing in /ingest)."""
        with self._driver.session() as session:
            session.execute_write(self._write_extraction, result, episode, event_offset)
        return [f"{episode}::{event_offset + idx}" for idx in range(len(result.events))]

    @staticmethod
    def _write_extraction(tx, result: ExtractionResult, episode: str, event_offset: int):
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

        prev_event_id = None
        for idx, e in enumerate(result.events):
            event_id = f"{episode}::{event_offset + idx}"
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
