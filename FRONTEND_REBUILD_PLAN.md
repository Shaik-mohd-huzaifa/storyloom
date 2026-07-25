# Storyloom Frontend Rebuild Plan

## Overview
Rebuild the Next.js frontend using Claude Design's Writer Studio specs. This document maps:
- Design components & micro-interactions
- Backend API integration points
- Data flows (without implementing backend yet)

---

## Design Micro-Interactions & Backend Connections

### 1. **Layout Switching** (Header)
**Micro-interaction:** Segmented buttons switch between 3 layouts
- `Studio` (3-column: sidebar + canvas + chat)
- `Focus` (icon rail + floating chat overlay at 372px)
- `Table read` (bottom drawer 290px)

**Backend connection:** 
- Store user's layout preference via `POST /api/user/preferences`
- Persist across sessions: `GET /api/user/preferences`
- *State:* `layout: 'studio' | 'focus' | 'table-read'`

---

### 2. **Episode Selection (Left Sidebar)**
**Micro-interaction:**
- Click episode row → highlights with light fill, text becomes bold (#141210)
- Status dots update: done (green), review (amber), draft (rust), empty (faint)
- Episode runtime displays: "5m 23s"

**Backend connections:**
- `GET /api/episodes` — fetch all episodes with metadata
  - Response: `[{id, num, title, mins, status: 'draft'|'review'|'done'|'empty'}]`
- `POST /api/episodes` — create new episode (+ button)
- `GET /api/episodes/{id}` — fetch episode content when selected
- `PUT /api/episodes/{id}` — update status when user marks review/done
- *State:* `activeEp: Episode`, `episodes: Episode[]`

---

### 3. **Draggable Sidebar Divider**
**Micro-interaction:**
- 9px draggable zone with hover effect (#26231e)
- Grip visual (2px × 26px centered)
- Drag adjusts left pane height 18–76% (clamped)
- Live update as user drags

**Backend connection:**
- Store layout split % via `POST /api/user/ui-state`
- Recover on session reload: `GET /api/user/ui-state`
- *State:* `split: 0-100` (pane height %)

---

### 4. **Story Bible (Entity Explorer)**
**Micro-interaction:**
- Search input filters entities in real-time
- Collapsible groups by type (character, place, faction, thread, event, theme, object)
- Rotating caret for expand/collapse (0→90°, 0.12s)
- Type swatch + entity count
- Selected row: light fill (#e0dbd2), bold text, selected state persists

**Backend connections:**
- `GET /api/entities` — fetch all entities
  - Response: `[{id, kind: 'character'|'place'|..., name, blurb, flagged, avatar, appearance_count}]`
- `GET /api/entities?search=query` — filter entities by text search
- `GET /api/entities/{id}` — fetch full entity detail (opens drawer)
- `PUT /api/entities/{id}` — update entity (when editing in drawer)
- *State:* `selected: EntityId`, `query: string`, `openGroups: {[type]: boolean}`

---

### 5. **Manuscript Canvas (Center)**
**Micro-interaction:**
- Main textarea with syntax highlighting for inline tokens: `SFX`, character cues
- Character cue text in rust (#b4532a), weight 500
- Blinking caret at end (2px #b4532a, 1.1s step animation)
- Sub-header shows: "EP 07 · DRAFT 3", "saved 2m ago", continuity flag count
- Paper has shadow, centered, max-width 720px

**Backend connections:**
- `GET /api/episodes/{id}/content` — fetch manuscript text on episode select
- `PUT /api/episodes/{id}/content` — auto-save on textarea change (debounced 2s)
  - Include: text, updatedAt, wordCount
- `GET /api/episodes/{id}/continuity` — fetch inline annotations (squiggles)
  - Response: `[{offset, length, type: 'continuity'|'review', message}]`
- *State:* `manuscriptText: string`, `lastSaved: timestamp`, `saving: boolean`

---

### 6. **Inline Annotations (Hover Cards)**
**Micro-interaction:**
- **Continuity flags**: wavy underline (#c9873a), 5px offset, hover → dark card
  - Card: `CONTINUITY · TIMELINE`, explanation, 2 actions (filled amber, outlined)
  - Fade+rise in (opacity 0 / translateY(6px) → none, 0.14s)
- **Review notes**: green wash, hover → light card with `AI` avatar, `PACING NOTE` label
- Toggle annotation visibility via pill button in sub-header

**Backend connections:**
- `GET /api/episodes/{id}/annotations` — fetch all inline flags/notes
  - Response: `[{offset, length, type, label, message, actions}]`
- `POST /api/annotations/{id}/dismiss` — dismiss a flag
- `POST /api/annotations/{id}/apply` — apply a suggestion
- *State:* `annotations: Annotation[]`, `annotationsVisible: boolean`

---

### 7. **Entity Detail Drawer**
**Micro-interaction:**
- Slides in from right (340px width, 0.18s)
- Shows: type avatar (38px), name, type tag, episode count
- Sections: summary, VOICE, CANON FACTS, RELATIONSHIPS (pills)
- Close button (×) collapses drawer
- Two actions: "Add to chat context" (pins as chip) + "Edit"

**Backend connections:**
- Populated from `GET /api/entities/{id}` (triggered by entity row click)
  - Includes: summary, voice_description, canon_facts[], relationships[]
- `POST /api/chat/context/add` — add entity to chat context (with pin)
- *State:* `selectedEntity: Entity | null`, `contextChips: EntityId[]`

---

### 8. **Chat Panel (Right Sidebar)**
**Micro-interaction:**

#### 8a. Message Display
- **User bubble**: right-aligned, light background, radius 11px 11px 3px 11px
- **Assistant bubble**: full-width, amber ring avatar, mono label (e.g. `LORE · 3 SOURCES`)
- Messages fade in, scroll to latest on send
- Citation chips below message (mono 10px, outlined)
- Optional actions: "Insert at cursor" (light) / "Rewrite" (outlined)

#### 8b. Generating State
- Label: `DRAFTING · READING EP 5–7`
- Three amber dots blinking (0/.18/.36s offset)
- Three skeleton bars below (rgba 0.09, widths 100%/86%/54%)
- Takes ~1.7s before assistant response appears

#### 8c. @Mention Popover
- Triggered by regex: `/(^|\s)@([\w-]*)$/` in composer
- Anchor above composer, dark background (#1d1a16)
- Header: `MENTION AN ENTITY · "query"`
- Entity rows: 26px avatar, name, blurb, type tag
- Picking entity: appends context chip, closes popover, strips `@token` from input
- `Esc` closes, `Enter` sends, `Shift+Enter` newlines

#### 8d. Composer & Quick Actions
- 2-row textarea with 1px border, radius 9px, focus border #c9873a
- Two pills below: "critique pacing", "continue scene"
- Send button: 28×28px, #c9873a, amber

**Backend connections:**
- `GET /api/chat/messages` — fetch message history for episode
- `POST /api/chat/messages` — send user message
  - Payload: `{text, episodeId, contextChips: EntityId[]}`
  - Response: streaming → assistant response (mock ~1.7s delay)
- `POST /api/chat/generate` — trigger quick actions (prefill composer)
  - Payload: `{action: 'critique'|'continue', episodeId}`
- `GET /api/entities?search=...` — power @mention popover search
- *State:* `messages: Message[]`, `input: string`, `generating: boolean`, `mentionOpen: boolean`, `mentionQuery: string`, `chips: EntityId[]`

---

### 9. **Status Bar (Bottom)**
**Micro-interaction:**
- Displays: "Lines: X | Words: Y | Characters: Z" (left), "UTF-8" (right)
- Updates on every keystroke in textarea

**Backend connection:**
- Pure client-side calculation from `manuscriptText`
- *State:* derives from `manuscriptText.length`, `.split('\n').length`, etc.

---

## State Management Architecture

### Core State Object
```
{
  // Layout
  layout: 'studio' | 'focus' | 'table-read',
  split: 0-100,  // sidebar pane height %
  
  // Episodes
  episodes: Episode[],
  activeEp: Episode | null,
  
  // Manuscript
  manuscriptText: string,
  lastSaved: timestamp,
  saving: boolean,
  
  // Annotations
  annotations: Annotation[],
  annotationsVisible: boolean,
  hover: 'f1' | 'f2' | 'rev' | null,
  
  // Entities (Story Bible)
  entities: Entity[],
  selected: EntityId | null,
  query: string,
  openGroups: {[type]: boolean},
  forceExpand: boolean,
  
  // Chat
  messages: Message[],
  input: string,
  contextChips: EntityId[],
  generating: boolean,
  mentionOpen: boolean,
  mentionQuery: string,
  
  // UI
  vw: number,  // viewport width for responsive
}
```

---

## API Endpoints Needed (Backend)

### Episodes
- `GET /api/episodes` → `Episode[]`
- `POST /api/episodes` → `Episode`
- `GET /api/episodes/{id}` → `Episode`
- `GET /api/episodes/{id}/content` → `{text, wordCount, lastSaved}`
- `PUT /api/episodes/{id}/content` → `{success}`
- `PUT /api/episodes/{id}` (status update) → `Episode`

### Entities (Story Bible)
- `GET /api/entities` → `Entity[]`
- `GET /api/entities?search=query` → `Entity[]`
- `POST /api/entities` → `Entity`
- `GET /api/entities/{id}` → `Entity` (with full details)
- `PUT /api/entities/{id}` → `Entity`

### Annotations
- `GET /api/episodes/{id}/annotations` → `Annotation[]`
- `POST /api/annotations/{id}/dismiss` → `{success}`
- `POST /api/annotations/{id}/apply` → `{success}`

### Chat
- `GET /api/chat/messages?episodeId=...` → `Message[]`
- `POST /api/chat/messages` → `Message` (with streaming response)
- `POST /api/chat/generate` (quick actions) → `Message`

### User Preferences
- `GET /api/user/preferences` → `{layout, split, ...}`
- `POST /api/user/preferences` → `{success}`
- `GET /api/user/ui-state` → `{layout, split}`
- `POST /api/user/ui-state` → `{success}`

---

## Frontend Component Structure (React)

```
/pages/index.js (or /pages/studio.js)
  └─ Layout.jsx
      ├─ Header.jsx
      ├─ MainLayout.jsx
      │   ├─ LeftSidebar.jsx
      │   │   ├─ EpisodesPane.jsx
      │   │   │   ├─ EpisodeRow.jsx
      │   │   │   └─ DraggableDivider.jsx
      │   │   └─ StoryBiblePane.jsx
      │   │       ├─ EntityFilter.jsx
      │   │       ├─ EntityGroup.jsx
      │   │       └─ EntityRow.jsx
      │   ├─ Canvas.jsx
      │   │   ├─ CanvasSubheader.jsx
      │   │   ├─ Manuscript.jsx
      │   │   ├─ InlineAnnotation.jsx (conditionally rendered)
      │   │   └─ ContinuityHoverCard.jsx
      │   ├─ RightPanel.jsx (or floating in Focus mode)
      │   │   ├─ ChatMessages.jsx
      │   │   ├─ GeneratingState.jsx
      │   │   ├─ ContextChips.jsx
      │   │   ├─ Composer.jsx
      │   │   └─ MentionPopover.jsx
      │   └─ EntityDrawer.jsx (slides in over canvas)
      └─ StatusBar.jsx

/styles/
  ├─ design-tokens.css (colors, typography, spacing, shadows)
  ├─ layout.module.css
  └─ components.module.css

/hooks/
  ├─ useEpisodes.js (fetch, cache)
  ├─ useEntities.js
  ├─ useChat.js
  ├─ useAnnotations.js
  └─ useLayout.js

/lib/
  ├─ api-client.js (all backend calls)
  └─ debounce.js (for manuscript auto-save)
```

---

## Key Micro-Interactions to Implement

| Interaction | Duration | Easing | Notes |
|-------------|----------|--------|-------|
| Fade-up (annotations) | 0.12–0.18s | ease | opacity 0 → 1, translateY(6px) → 0 |
| Caret blink | 1.1s | steps | on/off at 50% |
| Dots blink | 1s | steps | 3 dots at 0/.18/.36s offset |
| Divider drag | live | N/A | mousemove updates % |
| Drawer slide-in | 0.18s | ease | translateX(+340px) → 0 |
| Caret rotate | 0.12s | ease | 0→90° on expand |
| Sidebar collapse | 0.18s | ease | width transition |

---

## Auto-Save Strategy

**Debounce:** 2 seconds after last keystroke
- User types → debounce timer resets
- After 2s of no typing → `PUT /api/episodes/{id}/content`
- Show "saving..." indicator during request
- Update "saved 2m ago" timestamp on success

---

## Error Handling Placeholders

- Network errors: toast notification (simple, non-intrusive)
- Failed save: keep "unsaved changes" indicator, retry button
- API timeouts: 5s timeout, retry once
- 404 on entity: remove from sidebar gracefully
- Chat failure: show error in message thread, allow retry

---

## Responsive Breakpoints (from spec)

| Breakpoint | Change |
|-----------|--------|
| < 1150px | Chat 300px, sidebar 226px |
| < 980px | Sidebar collapses to 52px icon rail; tap EP/EN buttons to overlay it |
| Mobile | Single column, stacked layout |

---

## Notes for Backend Implementation

1. **Session/Auth:** Assume user is authenticated; include in headers
2. **Real-time data:** Episode content may be edited elsewhere—consider WebSocket or polling
3. **Continuity checking:** Happens server-side; return annotations with episode content
4. **Chat context:** @mentions and context chips should persist for a session
5. **Streaming responses:** Chat might need Server-Sent Events (SSE) or chunked responses for "drafting" animation
6. **Neo4j integration:** Entities are graph nodes; relationships query the graph

---

## Design Tokens to Extract

See `writer-studio-standalone.html` or README.md for exact values:
- **Colors:** Surfaces (#e9e5dd, #f4f1ea, #fffdfa, #141210, etc.), accents (#b4532a, #c9873a, #4f6b52)
- **Typography:** IBM Plex Sans (300/400/500/600), IBM Plex Mono (400/500)
- **Spacing scale:** 4, 5, 6, 8, 9, 12, 14, 16, 18, 22, 34, 44px
- **Shadows:** Paper, drawer, dark card, popover (see README)
- **Radii:** 3–50% (various by component)

---

## To-Do Before Implementing

- [ ] Extract all colors/typography to CSS custom properties
- [ ] Build component library in isolation (Storybook optional)
- [ ] Mock all API responses with static data
- [ ] Implement micro-animations with CSS + React hooks
- [ ] Test dragging, focus states, responsive behavior
- [ ] Integrate with actual backend (FastAPI) once ready
