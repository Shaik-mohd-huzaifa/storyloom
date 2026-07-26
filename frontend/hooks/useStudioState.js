import { useState, useCallback, useEffect, useRef } from 'react';
import { mockManuscript, mockAnnotations } from '../lib/mock-data';
import { getChatStatus, getEntities, getEpisodes, startChat } from '../lib/api';

const EMPTY_EPISODE = { id: null, num: 0, title: 'Untitled', mins: 0, status: 'empty' };

export function useStudioState() {
  // Layout
  const [layout, setLayout] = useState('studio'); // 'studio' | 'focus' | 'table-read'
  const [split, setSplit] = useState(46); // sidebar divider height %
  const [vw, setVw] = useState(typeof window !== 'undefined' ? window.innerWidth : 1280);

  // Episodes (real, fetched from ingested story data)
  const [episodes, setEpisodes] = useState([]);
  const [activeEp, setActiveEp] = useState(EMPTY_EPISODE);

  // Manuscript
  const [manuscriptText, setManuscriptText] = useState(mockManuscript);
  const [lastSaved, setLastSaved] = useState(new Date(Date.now() - 2 * 60000));
  const [saving, setSaving] = useState(false);
  const [wordCount, setWordCount] = useState(0);
  const [lineCount, setLineCount] = useState(0);
  const [charCount, setCharCount] = useState(0);

  // Annotations
  const [annotations, setAnnotations] = useState(mockAnnotations);
  const [annotationsVisible, setAnnotationsVisible] = useState(true);
  const [hoverAnnotation, setHoverAnnotation] = useState(null);

  // Entities (Story Bible)
  const [entities, setEntities] = useState([]);
  const [entitiesLoading, setEntitiesLoading] = useState(true);
  const [selectedEntity, setSelectedEntity] = useState(null);
  const [query, setQuery] = useState('');
  const [openGroups, setOpenGroups] = useState({
    character: true,
    location: true,
    plotThread: true,
    event: false,
  });
  const [forceExpand, setForceExpand] = useState(false);

  // Chat
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [generating, setGenerating] = useState(false);
  const [progressLabel, setProgressLabel] = useState(null);
  const [mode, setMode] = useState('ask'); // 'ask' | 'ideate'
  const [mentionOpen, setMentionOpen] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const pollTimerRef = useRef(null);

  // Fetch entities from backend
  useEffect(() => {
    getEntities()
      .then(setEntities)
      .catch((err) => console.warn('Failed to fetch entities:', err))
      .finally(() => setEntitiesLoading(false));
  }, []);

  // Fetch episodes from backend (derived from ingested events)
  useEffect(() => {
    getEpisodes()
      .then((eps) => {
        setEpisodes(eps);
        if (eps.length > 0) setActiveEp(eps[0]);
      })
      .catch((err) => console.warn('Failed to fetch episodes:', err));
  }, []);

  // Stop any in-flight chat poll on unmount
  useEffect(() => {
    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, []);

  // Window resize listener
  useEffect(() => {
    const handleResize = () => {
      setVw(window.innerWidth);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Calculate manuscript stats on change
  useEffect(() => {
    const lines = manuscriptText.split('\n').length;
    const words = manuscriptText.trim().split(/\s+/).filter(Boolean).length;
    const chars = manuscriptText.length;
    setLineCount(lines);
    setWordCount(words);
    setCharCount(chars);
  }, [manuscriptText]);

  // Handle @mention detection
  const handleInputChange = useCallback((text) => {
    setInput(text);

    // Detect @mention pattern: (^|\s)@([\w-]*)$
    const mentionMatch = text.match(/(^|\s)@([\w-]*)$/);
    if (mentionMatch) {
      setMentionQuery(mentionMatch[2]);
      setMentionOpen(true);
    } else {
      setMentionOpen(false);
      setMentionQuery('');
    }
  }, []);

  // Filter entities by search query
  const filteredEntities = query
    ? entities.filter(
        (e) =>
          e.name.toLowerCase().includes(query.toLowerCase()) ||
          e.blurb.toLowerCase().includes(query.toLowerCase())
      )
    : entities;

  // Filter entities for @mention popover
  const mentionMatches = mentionQuery
    ? entities.filter(
        (e) =>
          e.name.toLowerCase().includes(mentionQuery.toLowerCase()) ||
          e.blurb.toLowerCase().includes(mentionQuery.toLowerCase())
      )
    : [];

  // Handle entity selection from @mention — replaces the in-progress "@query" text with
  // "@EntityName " (Cursor/Claude-style visible mention). No separate chip state is kept —
  // whichever entities are @mentioned in the message text ARE the context, derived fresh
  // at send time (see deriveMentionedEntityIds below), so there's nothing stale to display
  // or remove separately.
  const selectEntityFromMention = useCallback(
    (entity) => {
      const lastAtIndex = input.lastIndexOf('@');
      const newInput = `${input.substring(0, lastAtIndex)}@${entity.name} `;
      setInput(newInput);
      setMentionOpen(false);
      setMentionQuery('');
    },
    [input]
  );

  // Insert an "@EntityName " mention at the end of the composer (used by "Add to chat
  // context" in the entity drawer — same mechanism as picking from the @ popover).
  const addEntityMention = useCallback(
    (entityId) => {
      const entity = entities.find((e) => e.id === entityId);
      if (!entity) return;
      setInput((prev) => `${prev}${prev && !prev.endsWith(' ') ? ' ' : ''}@${entity.name} `);
    },
    [entities]
  );

  // Derive which known entities are @mentioned in a piece of message text, so context
  // sent to the backend always matches exactly what's visibly written in the message.
  const deriveMentionedEntityIds = useCallback(
    (text) => {
      if (!text) return [];
      return entities.filter((e) => e.name && text.toLowerCase().includes(`@${e.name.toLowerCase()}`)).map((e) => e.id);
    },
    [entities]
  );

  // Send chat message — kicks off a backend agent run, then polls its status until done
  const sendMessage = useCallback(async () => {
    if (!input.trim() || generating) return;

    const userMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      text: input,
      timestamp: new Date(),
    };

    // Prior turns, so the agent remembers its own earlier clarifying question (if any)
    // and the user's reply — a clarification round-trip needs conversation continuity.
    const history = messages
      .filter((m) => m.role === 'user' || m.role === 'assistant')
      .map((m) => ({ role: m.role, content: m.text }));

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setGenerating(true);
    setProgressLabel('STARTING');

    try {
      const { run_id } = await startChat({
        message: userMessage.text,
        mode,
        contextChips: deriveMentionedEntityIds(userMessage.text),
        episode: activeEp?.id,
        history,
      });

      // Guards against overlapping ticks: setInterval fires on a fixed clock regardless
      // of whether the previous tick's fetch has resolved, so if a status check is ever
      // slower than the interval, two ticks can both observe status:"done" and both try
      // to append the final message. `settled` makes the first one to see it win.
      let settled = false;

      pollTimerRef.current = setInterval(async () => {
        try {
          const status = await getChatStatus(run_id);
          if (settled) return;
          if (status.current_step) setProgressLabel(status.current_step);

          if (status.status === 'done' || status.status === 'error') {
            settled = true;
            clearInterval(pollTimerRef.current);
            pollTimerRef.current = null;
            setGenerating(false);
            setProgressLabel(null);

            if (status.status === 'done' && status.message) {
              setMessages((prev) => [...prev, { ...status.message, timestamp: new Date(status.message.timestamp) }]);
            } else {
              setMessages((prev) => [
                ...prev,
                {
                  id: `msg-${Date.now()}`,
                  role: 'assistant',
                  label: 'ERROR',
                  text: `Something went wrong while thinking about that: ${status.error || 'unknown error'}`,
                  cites: [],
                  timestamp: new Date(),
                },
              ]);
            }
          }
        } catch (err) {
          if (settled) return;
          settled = true;
          clearInterval(pollTimerRef.current);
          pollTimerRef.current = null;
          setGenerating(false);
          setProgressLabel(null);
          setMessages((prev) => [
            ...prev,
            {
              id: `msg-${Date.now()}`,
              role: 'assistant',
              label: 'ERROR',
              text: 'Lost connection while waiting for a response.',
              cites: [],
              timestamp: new Date(),
            },
          ]);
        }
      }, 1000);
    } catch (err) {
      setGenerating(false);
      setProgressLabel(null);
      setMessages((prev) => [
        ...prev,
        {
          id: `msg-${Date.now()}`,
          role: 'assistant',
          label: 'ERROR',
          text: 'Could not reach the story assistant backend.',
          cites: [],
          timestamp: new Date(),
        },
      ]);
    }
  }, [input, generating, mode, activeEp, messages, deriveMentionedEntityIds]);

  // Insert AI-suggested text into the manuscript (Ideate mode "Insert into scene")
  const insertIntoManuscript = useCallback(
    (text) => {
      setManuscriptText((prev) => (prev ? `${prev}\n\n${text}` : text));
    },
    []
  );

  // Toggle group expansion
  const toggleGroup = useCallback(
    (type) => {
      setOpenGroups((prev) => ({
        ...prev,
        [type]: !prev[type],
      }));
    },
    []
  );

  // Force expand all groups when searching
  useEffect(() => {
    if (query) {
      setForceExpand(true);
    }
  }, [query]);

  return {
    // Layout
    layout,
    setLayout,
    split,
    setSplit,
    vw,

    // Episodes
    episodes,
    activeEp,
    setActiveEp,

    // Manuscript
    manuscriptText,
    setManuscriptText,
    lastSaved,
    setLastSaved,
    saving,
    setSaving,
    wordCount,
    lineCount,
    charCount,

    // Annotations
    annotations,
    annotationsVisible,
    setAnnotationsVisible,
    hoverAnnotation,
    setHoverAnnotation,

    // Entities
    entities,
    entitiesLoading,
    selectedEntity,
    setSelectedEntity,
    query,
    setQuery,
    filteredEntities,
    openGroups,
    toggleGroup,
    forceExpand,
    setForceExpand,

    // Chat
    messages,
    setMessages,
    input,
    handleInputChange,
    generating,
    setGenerating,
    progressLabel,
    mode,
    setMode,
    mentionOpen,
    setMentionOpen,
    mentionQuery,
    mentionMatches,
    selectEntityFromMention,
    addEntityMention,
    sendMessage,
    insertIntoManuscript,
  };
}
