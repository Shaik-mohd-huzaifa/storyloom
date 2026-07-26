import { useState, useCallback, useEffect } from 'react';
import {
  mockEpisodes,
  mockManuscript,
  mockChatMessages,
  mockAnnotations,
} from '../lib/mock-data';

export function useStudioState() {
  // Layout
  const [layout, setLayout] = useState('studio'); // 'studio' | 'focus' | 'table-read'
  const [split, setSplit] = useState(46); // sidebar divider height %
  const [vw, setVw] = useState(typeof window !== 'undefined' ? window.innerWidth : 1280);

  // Episodes
  const [episodes, setEpisodes] = useState(mockEpisodes);
  const [activeEp, setActiveEp] = useState(mockEpisodes[6]); // EP 07 by default

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
  const [messages, setMessages] = useState(mockChatMessages);
  const [input, setInput] = useState('');
  const [contextChips, setContextChips] = useState([]);
  const [generating, setGenerating] = useState(false);
  const [mentionOpen, setMentionOpen] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');

  // Fetch entities from backend
  useEffect(() => {
    const fetchEntities = async () => {
      try {
        // Use backend service name for Docker, localhost for development
        const backendUrl = 'http://backend:8000';
        const response = await fetch(`${backendUrl}/api/entities`);
        if (response.ok) {
          const data = await response.json();
          setEntities(data.entities || []);
          console.log('Loaded', data.entities?.length || 0, 'entities');
        }
      } catch (err) {
        console.warn('Failed to fetch entities:', err);
        // Fallback: try localhost (for dev)
        try {
          const response = await fetch('http://localhost:8000/api/entities');
          if (response.ok) {
            const data = await response.json();
            setEntities(data.entities || []);
          }
        } catch (err2) {
          console.warn('Fallback fetch also failed:', err2);
        }
      } finally {
        setEntitiesLoading(false);
      }
    };
    fetchEntities();
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

  // Handle entity selection from @mention
  const selectEntityFromMention = useCallback(
    (entityId) => {
      setContextChips([...contextChips, entityId]);
      // Remove @mention from input
      const lastAtIndex = input.lastIndexOf('@');
      const newInput = input.substring(0, lastAtIndex).trimEnd();
      setInput(newInput);
      setMentionOpen(false);
      setMentionQuery('');
    },
    [input, contextChips]
  );

  // Remove context chip
  const removeContextChip = useCallback(
    (entityId) => {
      setContextChips(contextChips.filter((id) => id !== entityId));
    },
    [contextChips]
  );

  // Send chat message
  const sendMessage = useCallback(async () => {
    if (!input.trim()) return;

    const userMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      text: input,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setGenerating(true);

    // Simulate API call with delay
    setTimeout(() => {
      const assistantMessage = {
        id: `msg-${Date.now()}`,
        role: 'assistant',
        label: 'ANALYSIS',
        text: `This is an automated response based on your question. In a real system, this would be powered by the backend AI that can search your story\'s context and entity relationships.`,
        cites: [],
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMessage]);
      setGenerating(false);
    }, 1700);
  }, [input]);

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
    contextChips,
    setContextChips,
    generating,
    setGenerating,
    mentionOpen,
    setMentionOpen,
    mentionQuery,
    mentionMatches,
    selectEntityFromMention,
    removeContextChip,
    sendMessage,
  };
}
