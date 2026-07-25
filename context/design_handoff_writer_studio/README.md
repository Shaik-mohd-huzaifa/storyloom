# Handoff: Writer Studio (Nightjar Signal)

## Overview
A writing studio for serialized **audio drama** production, built for a small writers' room. Three regions: a dark left sidebar (episodes + story bible), a light manuscript canvas in the middle, and a dark AI assistant panel on the right. The assistant generates prose, critiques pacing, and answers lore questions grounded in `@`-mentioned entities. Continuity problems surface as inline squiggles in the manuscript.

## About the Design Files
The files in this bundle are **design references created in HTML** — prototypes showing intended look and behavior, not production code to copy. Recreate them in your codebase's existing environment (React/Vue/etc.) using its established patterns, component library, and state management. If no environment exists yet, pick the framework that fits the product and implement there.

Files:
- `writer-studio-standalone.html` — self-contained, opens offline in any browser. **Start here.**
- `Writer Studio.dc.html` — authoring source (template markup + a logic class holding all data and state).

## Fidelity
**High fidelity.** Colors, typography, spacing, and interaction states are final-intent. Recreate pixel-close, substituting your design system's primitives where they already exist.

---

## Layout

Root: `100vh`, `display:flex; flex-direction:column`, page background `#e9e5dd`.

1. **Header** — 52px tall, `#f4f1ea`, bottom border `rgba(34,31,27,.09)`.
2. **Body row** — `flex:1; display:flex; position:relative` containing:
   - **Left sidebar** — 258px (226px < 1150px viewport; 52px icon rail < 980px), background `#141210`.
   - **Canvas** — `flex:1`, background `#e9e5dd`, scrolls vertically.
   - **Chat panel** — 352px (300px < 1150px), background `#141210`.

### Header
- Left: 18px ring logo (1.5px `#b4532a` border, 6px inner dot), series title `500 13.5px IBM Plex Sans`, meta pill `S2 · AUDIO DRAMA` (`400 10.5px IBM Plex Mono`, `#9a938a`, 1px border `rgba(34,31,27,.12)`, radius 4px).
- Center: segmented layout switch — track `rgba(34,31,27,.05)`, radius 7px, 3px padding. Active tab: `#fffdfa` fill, `#221f1b` text, `0 1px 2px rgba(34,31,27,.12)`. Inactive: transparent, `#8a837a`.
- Right: word count + runtime (mono, `#9a938a`), 24px overlapping avatars (`-7px` margin, 2px `#f4f1ea` ring), **Share** button (`#221f1b` / `#f7f5f1`, radius 6px, 7×12px padding; hover `#3a352e`).

### Left sidebar (dark)
Two stacked panes separated by a **draggable divider**.

- **Episodes pane** — height is a percentage held in state (default 46%, clamped 18–76%).
  - Header: `EPISODES` (`500 10px IBM Plex Mono`, `.9px` tracking, `#8f877c`) + 20px `+` button (1px `rgba(244,241,234,.16)`, `#a49b90`; hover border/text `#c9873a`).
  - Rows (7×8px padding, radius 6px, 8px gap): 5px status dot · episode number (mono 10px, 22px column) · title (12px sans, ellipsis) · runtime (mono 9.5px).
  - Status dot colors: done `#4f6b52`, review `#c9873a`, draft `#b4532a`, empty `rgba(34,31,27,.16)`.
  - Row states — default title `#ded8d0` (empty episodes `#6f675e`); hover `rgba(244,241,234,.07)`; **selected: light fill `#e9e5dd`, title `#141210` weight 500**, number/runtime `#6f675e`.
- **Divider** — 9px tall, `cursor:row-resize`, fill `#0f0d0b` (hover `#26231e`), 1px borders `rgba(244,241,234,.10)`, 26×2px grip `rgba(244,241,234,.26)`. Drag adjusts the episodes pane height live (mousemove/mouseup on window).
- **Story bible pane** — `flex:1`.
  - Header `STORY BIBLE` + total count.
  - Filter input: full width, `rgba(244,241,234,.06)` fill, 1px `rgba(244,241,234,.14)`, radius 6px, text `#f4f1ea`, placeholder `#7e766c`, focus border `#c9873a`. Filtering force-expands all groups.
  - Collapsible groups per entity type: rotating caret (0→90deg, .12s), 7px type swatch, label (`500 10.5px mono`, `#a49b90`), count.
  - Entity rows: 19px avatar (circle for characters, 5px radius otherwise; fill `<type>3d`, text `color-mix(in oklab, <type>, #fff 52%)`), name 12px, 5px amber dot `#c9873a` when the entity has an open continuity flag. Selected row: `#e0dbd2` fill, `#1a1815` text.

### Canvas (light)
- Sub-header 38px: `EP 07 · DRAFT 3`, `saved 2m ago`, annotations toggle pill, `2 continuity flags` in `#c9873a`.
- Paper: `width:min(720px, 100% - 32px)`, `#fffdfa`, 1px `rgba(34,31,27,.08)`, radius 3px, shadows `0 1px 2px rgba(34,31,27,.04), 0 18px 44px rgba(34,31,27,.06)`, fluid padding `clamp(28px,4vw,56px) clamp(20px,4.5vw,64px) clamp(40px,6vw,72px)`.
- Type: eyebrow `400 10.5px mono` `#b5aea4` `1.4px` tracking · H1 `500 34px/1.15 IBM Plex Sans`, `-.5px` · byline `400 12.5px` `#8a837a` above a 1px rule · scene slugs `500 10.5px mono` `#b4532a` `1.2px` tracking · body `400 16.5px/1.75 IBM Plex Sans` `#2b2721`, `text-wrap:pretty`, 20px paragraph gap.
- Inline tokens: `SFX` chip (`500 12px mono`, `rgba(34,31,27,.05)` fill, radius 4px); character cue in `500` weight `#b4532a`.
- Trailing "Continue writing…" line with a 2px `#b4532a` caret blinking on a 1.1s step animation.

### Inline annotations (hover cards)
- **Continuity flag**: `text-decoration: underline wavy #c9873a`, 5px offset, 1.5px thickness, `rgba(201,135,58,.10)` wash. Hover → dark card (`#221f1b`, `#f4f1ea` text, radius 8px, `0 14px 34px rgba(0,0,0,.24)`, 290px, 10px below the span): mono label `CONTINUITY · TIMELINE` in `#c9873a`, explanation, two actions (filled amber + outlined).
- **Review note**: green wash `rgba(79,107,82,.13)` with `inset 0 -1px 0 rgba(79,107,82,.4)`. Hover → light card (`#fffdfa`, 1px `rgba(34,31,27,.12)`, 300px) with an `AI` avatar, `PACING NOTE` label, and Apply/Dismiss.
- Both cards fade+rise in (`opacity 0 / translateY(6px)` → none, .14s). The annotations toggle disables both the decoration and the hover cards.

### Entity detail drawer
Opens over the right of the canvas when a bible row is clicked: 340px, `#fffdfa`, left border, `-18px 0 40px rgba(34,31,27,.08)`, slides in .18s.
- Header: 38px type avatar, name `500 15.5px`, `TYPE · N episodes` mono, `×` close.
- Body: summary (13px/1.6), `VOICE`, `CANON FACTS` (episode tag column 34px + fact rows separated by 1px `rgba(34,31,27,.07)`), `RELATIONSHIPS` as 20px-radius pills.
- Footer: **Add to chat context** (dark fill, pins the entity as a chat chip and closes) + **Edit**.

### Chat panel (dark)
- Header: `STORY ASSISTANT` + `Ep 07 context`; a `×` appears only in floating layout.
- Messages, 18px gap:
  - User → right-aligned bubble, `#e9e5dd` on `#1a1815` text, radius `11px 11px 3px 11px`, max-width 88%.
  - Assistant → full width; 15px amber ring avatar + mono label (e.g. `LORE · 3 SOURCES`), body `400 13px/1.65` `#ded8d0`, `white-space:pre-wrap`; optional citation chips (mono 10px, 1px `rgba(244,241,234,.16)`); optional actions **Insert at cursor** (light fill) / **Rewrite** (outlined).
- Generating state: label `DRAFTING · READING EP 5–7`, three amber dots blinking at 0/.18/.36s, then three skeleton bars (`rgba(244,241,234,.09)`, 100%/86%/54%).
- Context chips above the composer: type-tinted (`<type>33` fill, `<type>59` border), 20px radius, `×` to remove.
- Composer: 1px `rgba(244,241,234,.14)`, radius 9px, `rgba(244,241,234,.05)` fill; 2-row textarea; below it two quick-action pills (`critique pacing`, `continue scene`) and a 28×28 amber send button (`#c9873a`, `flex:none`).
- **@mention popover**: anchored above the composer, `#1d1a16`, 1px `rgba(244,241,234,.16)`, radius 9px, `0 -12px 34px rgba(0,0,0,.4)`, max-height 230px. Header `MENTION AN ENTITY · "query"`. Rows: 26px avatar, name 12.5px `#f4f1ea`, blurb 10.5px `#8f877c`, type tag right-aligned.

---

## Interactions & Behavior
- **Layout switch** — `Studio` (three columns) / `Focus` (icon rail + assistant floating over the canvas, 372px, radius 12px, inset 22px) / `Table read` (assistant docked as a 290px bottom drawer).
- **Divider drag** — mousedown on the divider attaches window mousemove/mouseup; pane height = cursor Y as a % of the sidebar, clamped 18–76.
- **@mention** — regex `/(^|\s)@([\w-]*)$/` against the composer value opens the popover and drives the query. Picking an entity appends a context chip, closes the popover, and strips the `@token` from the input. `Esc` closes; `Enter` sends, `Shift+Enter` newlines.
- **Send** — pushes the user message, shows the generating state, resolves to an assistant draft after ~1.7s.
- **Quick actions** — prefill the composer rather than sending.
- **Entity click** — opens the detail drawer and highlights the row.
- **Annotations toggle** — turns squiggles/highlights and their hover cards on and off.
- **Responsive** — <1150px: chat 300px, sidebar 226px. <980px: sidebar collapses to a 52px rail; EP/EN buttons open it as a 258px overlay (z-index 38, `22px 0 48px rgba(20,18,16,.34)`), `‹` collapses it.

## State
`layout` `'A'|'B'|'C'` · `split` (0–100 pane %) · `activeEp` · `query` · `openGroups` (per type) · `selected` (entity id) · `input` · `mentionOpen` / `mentionQuery` · `chips[]` · `messages[]` · `generating` · `hover` (`'f1'|'f2'|'rev'|null`) · `annotations` · `forceExpand` · `vw` (window width).

Data models: `Episode {num, title, mins, status}`; `Entity {id, kind, name, blurb, flagged, summary, voice, appearances, facts[{ep,text}], rels[]}`; `Message {role, label?, text, cites?[], actions?}`.

## Design Tokens
**Surfaces** — page `#e9e5dd` · header/light panel `#f4f1ea` · paper `#fffdfa` · dark panel `#141210` · dark elevated `#1d1a16` · divider `#0f0d0b` · ink block `#221f1b`.
**Text** — ink `#221f1b` · body `#2b2721` · secondary `#3a352e` · muted light `#8a837a` / `#9a938a` · faint light `#b5aea4` · on-dark primary `#f4f1ea` · on-dark body `#ded8d0` · on-dark muted `#a49b90` / `#8f877c` · on-dark faint `#6f675e` / `#5f584f`.
**Accents** — rust `#b4532a` (hover `#8e3f1f`) · amber `#c9873a` (dark-mode accent + continuity) · green `#4f6b52` (review).
**Entity types** — character `#b4532a` · place `#4f6b52` · faction `#4a5b7a` · thread `#7a4a6b` · event `#8a6a2a` · theme `#6b4a7a` · object `#7a5a4a`. Avatars: light `<c>1f` fill / `<c>` text; dark `<c>3d` fill / `color-mix(in oklab, <c>, #fff 52%)`.
**Borders** — light `rgba(34,31,27,.07 / .09 / .12 / .14)` · dark `rgba(244,241,234,.10 / .14 / .16 / .18)`. Hover washes: light `rgba(34,31,27,.045–.05)`, dark `rgba(244,241,234,.06–.08)`.
**Radii** — 3px paper · 4–5px chips/tags · 6px rows/inputs/buttons · 7px send/segmented · 9px composer/popover · 11px bubbles · 12px floating panel · 20px pills · 50% avatars.
**Shadows** — paper `0 1px 2px rgba(34,31,27,.04), 0 18px 44px rgba(34,31,27,.06)` · drawer `-18px 0 40px rgba(34,31,27,.08)` · dark card `0 14px 34px rgba(0,0,0,.24)` · popover `0 -12px 34px rgba(0,0,0,.4)` · floating panel `0 24px 60px rgba(20,18,16,.42)`.
**Spacing** — 4/5/6/8/9/12/14/16/18/22/34/44px.
**Type** — UI & prose `IBM Plex Sans` 300/400/500/600; labels, numerals, metadata `IBM Plex Mono` 400/500. Scale: 9–10.5px mono labels (.6–1.4px tracking) · 11–13px UI · 16.5px/1.75 prose · 34px H1.
**Motion** — `fu` fade-up .12–.18s ease · caret/dots blink 1.1s / 1s steps · sidebar width .18s ease · caret rotate .12s.

## Assets
No image assets. The logo is a CSS ring + dot; avatars are initials; the fonts load from Google Fonts (IBM Plex Sans, IBM Plex Mono). Swap in your own icon set for `+`, `×`, `‹`, `↑` — the prototype uses text glyphs as placeholders.

## Files
- `writer-studio-standalone.html` — runnable prototype (all states reachable by interaction).
- `Writer Studio.dc.html` — source; entity/episode/message fixtures live in the logic class at the bottom.
